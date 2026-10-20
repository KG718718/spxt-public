param([Parameter(Mandatory=$true)][string]$Root,[Parameter(Mandatory=$true)][string]$Node,[Parameter(Mandatory=$true)][string]$Compiler,[Parameter(Mandatory=$true)][string]$Launcher)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
trap { [Console]::Error.WriteLine('OWNED_LINK_DRIVER_FAILED'); exit 1 }
# The caller assigns this pwsh process to the real Job before releasing this gate.
$taskDeadline=[DateTime]::UtcNow.AddSeconds(30)
if(!$env:KSESSION_FAST_JOB_GATE){throw 'Owned Job gate required'}
while(!(Test-Path -LiteralPath $env:KSESSION_FAST_JOB_GATE)){if([DateTime]::UtcNow -gt $taskDeadline){throw 'Owned Job assignment unavailable'};Start-Sleep -Milliseconds 20}
if((Get-Content -LiteralPath $env:KSESSION_FAST_JOB_GATE -Raw) -cne 'ASSIGNED'){throw 'Owned Job gate invalid'}
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
. (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/memory-process.ps1')
. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1')
. (Join-Path $taskRepo 'tools/windows-firewall/test-environment.ps1')
$Root=[IO.Path]::GetFullPath($Root)
if($Root -notmatch '^E:\\CodexWorkspace\\outputs\\fresh-install-r2-link-[a-f0-9]{32}$' -or (Test-Path -LiteralPath $Root) -or (Get-KSessionFirewallTestPathClass (Split-Path $Root)) -ne 'CANONICAL'){throw 'New physical owned output required'}
$taskPin=Get-Content (Join-Path $taskRepo 'tools/windows-installer/toolchain.json') -Raw|ConvertFrom-Json
$taskArchive=Join-Path (Split-Path $Compiler) 'innosetup-6.7.3.exe'
if((Get-FileHash $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskPin.sha256){throw 'Pinned compiler archive required'}
$taskSig=Get-AuthenticodeSignature (Join-Path $Compiler 'ISCC.exe')
if($taskSig.Status -ne 'Valid' -or $taskSig.SignerCertificate.Subject -notmatch 'CN=Pyrsys B\.V\.'){throw 'Pinned compiler publisher required'}
$taskNodePin=Get-Content (Join-Path $taskRepo 'tools/installer/distribution.json') -Raw|ConvertFrom-Json
if((Get-FileHash $Node -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskNodePin.nodeExeSha256){throw 'Pinned Node required'}
function Read-DriverRegistryTree($Key,[int]$Depth=0){
 if($Depth -gt 20){throw 'Read-only registry snapshot bound exceeded'}
 $taskTree=[ordered]@{values=[ordered]@{};children=[ordered]@{}}
 foreach($taskName in @($Key.GetValueNames()|Sort-Object)){$taskTree.values[$taskName]=@([string]$Key.GetValueKind($taskName),$Key.GetValue($taskName,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames))}
 foreach($taskName in @($Key.GetSubKeyNames()|Sort-Object)){$taskChild=$Key.OpenSubKey($taskName);if(!$taskChild){throw 'Read-only registry observation unknown'};try{$taskTree.children[$taskName]=Read-DriverRegistryTree $taskChild ($Depth+1)}finally{$taskChild.Dispose()}}
 return $taskTree
}
function Read-DriverWorld {
 $taskState=[ordered]@{folders=[ordered]@{};registry=[ordered]@{}}
 foreach($taskFolder in @('Startup','Desktop','Programs')){
  $taskPath=[Environment]::GetFolderPath($taskFolder,'DoNotVerify')
  if((Get-KSessionFirewallTestPathClass $taskPath) -ne 'CANONICAL'){throw 'Real folder observation unknown'}
  $taskState.folders[$taskFolder]=@(Get-ChildItem -LiteralPath $taskPath -Force -ErrorAction Stop|Sort-Object Name|ForEach-Object{
   $taskValue=[ordered]@{name=$_.Name;attributes=[string]$_.Attributes;length=$(if($_.PSIsContainer){$null}else{$_.Length})}
   if(!($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -and !$_.PSIsContainer -and $_.Extension -ieq '.lnk'){$taskValue.hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
   $taskValue
  })
 }
 foreach($taskHiveName in @([Microsoft.Win32.RegistryHive]::CurrentUser,[Microsoft.Win32.RegistryHive]::LocalMachine)){
  foreach($taskView in @([Microsoft.Win32.RegistryView]::Registry64,[Microsoft.Win32.RegistryView]::Registry32)){
   $taskHive=[Microsoft.Win32.RegistryKey]::OpenBaseKey($taskHiveName,$taskView)
   try{foreach($taskPath in @('Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1','Software\KSESSION\Beta\InstallerBinding')){
    $taskKey=$taskHive.OpenSubKey($taskPath);$taskID=[string]$taskHiveName+':'+[string]$taskView+':'+$taskPath
    if($null -eq $taskKey){$taskState.registry[$taskID]=$null}else{try{$taskState.registry[$taskID]=Read-DriverRegistryTree $taskKey}finally{$taskKey.Dispose()}}
   }}finally{$taskHive.Dispose()}
  }
 }
 return ($taskState|ConvertTo-Json -Depth 60 -Compress)
}
# All real paths, link hashes and registry contents remain RAM-only.
if((Get-FileHash -LiteralPath $Launcher -Algorithm SHA256).Hash.ToLowerInvariant() -cne '762ed3eafcb6bf5b3bb6b176094771c21e8308f9bd86476a9f395e006482c96c'){throw 'Trusted 57b7 Launcher PE required'}
$taskWorldBefore=Read-DriverWorld
$taskSaved=Save-KSessionProcessEnvironment @('TEMP','TMP','NODE_OPTIONS','NODE_PATH')
$taskResult=[ordered]@{schema=1;kind='OWNED_INNO_LINK_DRIVER';qualification='LINK_ONLY_NOT_INSTALLATION';status='FAIL';compiled=$false;matrixPassed=$null;stage='GENERATE';driverExit='NOT_RUN';stdioEmpty=$false;worldUnchanged=$null;environmentRestored=$false;mappingRestored=$null;productInstalled=$false;productExecuted=$false}
if(-not ('FreshLinkMapNative' -as [type])){Add-Type -TypeDefinition 'using System;using System.Text;using System.Runtime.InteropServices;public static class FreshLinkMapNative{[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]public static extern uint QueryDosDevice(string name,StringBuilder value,int size);}' }
$taskAliases=@();$taskMapped=@()
New-Item -ItemType Directory -Path $Root|Out-Null
try{
 foreach($taskCandidate in @('R:','S:','T:','U:','V:','W:','X:','Y:','Z:')){
  $taskBuffer=[Text.StringBuilder]::new(32768);$taskCount=[FreshLinkMapNative]::QueryDosDevice($taskCandidate,$taskBuffer,$taskBuffer.Capacity);$taskError=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  if($taskCount -eq 0 -and $taskError -eq 2 -and !(Test-Path ($taskCandidate+'\'))){$taskAliases+=,$taskCandidate;if($taskAliases.Count -eq 2){break}}
 }
 if($taskAliases.Count -ne 2){throw 'Two absent fixture mappings required'}
 foreach($taskAlias in $taskAliases){
  $taskMap=Invoke-KSessionMemoryProcess (Join-Path $env:SystemRoot 'System32/subst.exe') @($taskAlias,$Root) 10
  if($taskMap.ExitCode -ne 0 -or $taskMap.TimedOut -or $taskMap.ForcedTermination){throw 'Fixture mapping creation failed'}
  $taskMapped+=,$taskAlias
  $taskBuffer=[Text.StringBuilder]::new(32768);$taskCount=[FreshLinkMapNative]::QueryDosDevice($taskAlias,$taskBuffer,$taskBuffer.Capacity)
  if($taskCount -eq 0 -or $taskBuffer.ToString() -cne ('\??\'+$Root)){throw 'Fixture mapping identity unknown'}
 }
 [IO.File]::WriteAllText((Join-Path $Root '.owned-link-driver.json'),(@{kind='OWNED_LINK_DRIVER';aliases=$taskAliases}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
 $taskJunctionTarget=Join-Path $Root 'target-directory_reparse 中文 with spaces/app/program'
 New-Item -ItemType Directory -Path $taskJunctionTarget|Out-Null
 New-Item -ItemType Junction -Path (Join-Path $Root 'owned-junction') -Target $taskJunctionTarget|Out-Null
 if(!((Get-Item -LiteralPath (Join-Path $Root 'owned-junction')).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Owned junction required'}
 [IO.File]::Copy($Launcher,(Join-Path $Root 'trusted-launcher.exe'),$false)
 foreach($taskLeaf in @('environment','driver')){New-Item -ItemType Directory -Path (Join-Path $Root $taskLeaf)|Out-Null}
 $env:TEMP=Join-Path $Root 'environment';$env:TMP=$env:TEMP;$env:NODE_OPTIONS='';$env:NODE_PATH=''
 $taskGenerate=Invoke-KSessionMemoryNode $Node @((Join-Path $PSScriptRoot 'link-harness.cjs'),$Root)
 if($taskGenerate.ExitCode -ne 0 -or $taskGenerate.TimedOut -or $taskGenerate.ForcedTermination -or $taskGenerate.Stderr.Length -ne 0){throw 'Owned source generation failed'}
 $taskResult.stage='COMPILE'
 $taskCompile=Invoke-KSessionMemoryProcess (Join-Path $Compiler 'ISCC.exe') @('/Qp',(Join-Path $Root 'source.iss')) 120
 if($taskCompile.ExitCode -ne 0 -or $taskCompile.TimedOut -or $taskCompile.ForcedTermination -or $taskCompile.Stderr.Length -ne 0){throw 'Owned Inno compilation failed'}
 $taskResult.compiled=$true
 $taskResult.stage='DRIVER'
 $taskRun=Invoke-KSessionMemoryProcess (Join-Path $Root 'driver/owned-link-contract.exe') @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER') 90
 $taskResult.driverExit=$(if($taskRun.TimedOut){'TIMEOUT'}elseif($taskRun.ExitCode -eq 1){'CONTROLLED_INITIALIZE_STOP'}else{'UNEXPECTED'})
 $taskResult.stdioEmpty=$taskRun.Stdout.Length -eq 0 -and $taskRun.Stderr.Length -eq 0
 $taskBaseline=Get-Content (Join-Path $Root 'baseline.json') -Raw|ConvertFrom-Json
 if((@($taskBaseline.PSObject.Properties.Name|Sort-Object) -join ',') -cne 'argsMatch,comRead,created,hashMatch,iniMatch,kind,productionMatches,schema,targetMatch,workDirMatch' -or $taskBaseline.schema -ne 1 -or $taskBaseline.kind -cne 'OWNED_INNO_COM_BASELINE'){throw 'Owned observation schema invalid'}
 foreach($taskName in @('created','productionMatches','hashMatch','comRead','targetMatch','argsMatch','workDirMatch','iniMatch')){if($taskBaseline.$taskName -isnot [bool]){throw 'Owned observation type invalid'}}
 $taskResult.stage='MATRIX'
 $taskMatrix=Get-Content (Join-Path $Root 'matrix.json') -Raw|ConvertFrom-Json
 if($taskMatrix.schema -ne 3 -or $taskMatrix.cases.Count -ne 15){throw 'Current owned matrix required'}
 $taskValidate=Invoke-KSessionMemoryNode $Node @((Join-Path $PSScriptRoot 'link-matrix.cjs'),(Join-Path $Root 'matrix.json'))
 if($taskValidate.ExitCode -ne 0 -or $taskValidate.TimedOut -or $taskValidate.ForcedTermination -or $taskValidate.Stderr.Length -ne 0){throw 'Owned matrix schema invalid'}
 $taskResult.matrixPassed=$taskMatrix.allPassed -eq $true
 $taskTargetMatrix=Get-Content (Join-Path $Root 'target-matrix.json') -Raw|ConvertFrom-Json
 $taskTargetValidate=Invoke-KSessionMemoryNode $Node @((Join-Path $PSScriptRoot 'target-matrix.cjs'),(Join-Path $Root 'target-matrix.json'))
 if($taskTargetValidate.ExitCode -ne 0 -or $taskTargetValidate.TimedOut -or $taskTargetValidate.ForcedTermination -or $taskTargetValidate.Stderr.Length -ne 0){throw 'Owned target matrix schema invalid'}
 $taskResult.matrixPassed=$taskResult.matrixPassed -and $taskTargetMatrix.allPassed -eq $true
 $taskOracle=Invoke-KSessionMemoryProcess (Get-Process -Id $PID).Path @('-NoProfile','-NonInteractive','-File',(Join-Path $PSScriptRoot 'shortcut-target.test.ps1'),'-Root',$Root,'-LauncherSha256','762ed3eafcb6bf5b3bb6b176094771c21e8308f9bd86476a9f395e006482c96c') 90
 if($taskOracle.ExitCode -ne 0 -or $taskOracle.TimedOut -or $taskOracle.ForcedTermination -or $taskOracle.Stderr.Length -ne 0 -or $taskOracle.Stdout.Length -ne 0){throw 'Owned oracle matrix failed'}
 # A failing production comparison is evidence, not installation qualification.
 if($taskResult.driverExit -eq 'CONTROLLED_INITIALIZE_STOP' -and $taskResult.stdioEmpty -and $taskResult.matrixPassed -and !$taskRun.ForcedTermination){$taskResult.status='OBSERVED';$taskResult.stage='FINAL'}
}finally{
 $taskResult.mappingRestored=$true
 foreach($taskAlias in $taskMapped){
  try{
   $taskBuffer=[Text.StringBuilder]::new(32768);$taskCount=[FreshLinkMapNative]::QueryDosDevice($taskAlias,$taskBuffer,$taskBuffer.Capacity)
   if($taskCount -eq 0 -or $taskBuffer.ToString() -cne ('\??\'+$Root)){throw 'Unknown mapping cannot be removed'}
   $taskUnmap=Invoke-KSessionMemoryProcess (Join-Path $env:SystemRoot 'System32/subst.exe') @($taskAlias,'/D') 10
   $taskBuffer=[Text.StringBuilder]::new(32768);$taskCount=[FreshLinkMapNative]::QueryDosDevice($taskAlias,$taskBuffer,$taskBuffer.Capacity);$taskError=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
   if($taskUnmap.ExitCode -ne 0 -or $taskUnmap.TimedOut -or $taskUnmap.ForcedTermination -or $taskCount -ne 0 -or $taskError -ne 2 -or (Test-Path ($taskAlias+'\'))){throw 'Fixture mapping restoration unproven'}
  }catch{$taskResult.mappingRestored=$false}
 }
 try{$taskResult.worldUnchanged=(Read-DriverWorld) -ceq $taskWorldBefore}catch{$taskResult.worldUnchanged=$null}
 Restore-KSessionProcessEnvironment $taskSaved
 $taskResult.environmentRestored=Test-KSessionProcessEnvironmentRestored $taskSaved
 if($taskResult.worldUnchanged -ne $true -or !$taskResult.environmentRestored -or !$taskResult.mappingRestored){$taskResult.status='FAIL'}
 [IO.File]::WriteAllText((Join-Path $Root 'driver-result.json'),($taskResult|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
}
$taskResult|ConvertTo-Json -Compress
if($taskResult.status -ne 'OBSERVED'){exit 1}
