param([Parameter(Mandatory=$true)][string]$Work,[switch]$BuildOnly)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/memory-process.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/supervisor-entry.ps1')
try{
$taskGateAlreadyChecked=$false
if($env:GITHUB_WORKFLOW_REF -ceq 'KG718718/spxt-public/.github/workflows/fresh-install-candidate.yml@refs/heads/codex/lan-fresh-trial-v1.1' -or $env:KSESSION_FAST_JOB_GATE){Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE;$taskGateAlreadyChecked=$true}
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
$taskContext=Get-Content -Raw -LiteralPath (Join-Path $taskWork 'context.json')|ConvertFrom-Json
$taskInstallCandidate=$env:GITHUB_WORKFLOW_REF -ceq 'KG718718/spxt-public/.github/workflows/fresh-install-candidate.yml@refs/heads/codex/lan-fresh-trial-v1.1' -or $null -ne $taskContext.PSObject.Properties['installCandidate']
if($taskInstallCandidate -or ($null -ne $taskContext.PSObject.Properties['r1'] -and $null -ne $taskContext.r1.PSObject.Properties['fastDelivery'])){
 if(!$taskGateAlreadyChecked){Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE}
}
if($taskInstallCandidate){
  if($BuildOnly){throw 'Install candidate cannot use build-only smoke'}
  $taskContextCheck=Invoke-KSessionMemoryNode (Get-Command node).Source @((Join-Path $PSScriptRoot 'install-candidate/context.cjs'),$taskWork)
  if($taskContextCheck.ExitCode -ne 0 -or $taskContextCheck.TimedOut -or $taskContextCheck.ForcedTermination -or $taskContextCheck.Stderr.Length -ne 0){throw 'Install candidate context required'}
}
if($BuildOnly -and ($taskContext.r1.schema -ne 1 -or $taskContext.r1.mode -ne 'SMOKE' -or $taskContext.r1.slot -ne 'R1S1' -or $taskContext.mode -ne 'CANDIDATE')){throw 'Build-only R1 smoke context required'}
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public' -or
   $taskContext.controlCommit -cne $env:GITHUB_SHA -or $env:GITHUB_RUN_ATTEMPT -ne '1' -or $taskContext.run.id -ne $env:GITHUB_RUN_ID -or
   $taskWork -notmatch '^E:\\' -or (git -C $taskRepo rev-parse HEAD).Trim() -cne $taskContext.sourceCommit){throw 'Fresh source context rejected'}
$taskReportPath=Join-Path $taskWork 'fresh-report.json'
$taskReport=Get-Content -Raw -LiteralPath $taskReportPath|ConvertFrom-Json
if($taskContext.reportSchema -ne 2 -or $taskReport.schema -ne 2){throw 'Current schema2 report context required'}
}catch{[Console]::Error.WriteLine('FRESH_CI_ENTRY_REJECTED');exit 1}
. (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/install-r2/hosted-recovery.ps1')
. (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/install-r2/physical-work.ps1')
. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1')
$taskVariables=@('TEMP','TMP','GOCACHE','GOTMPDIR','GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','NODE_PATH','NODE_OPTIONS','PLAYWRIGHT_BROWSERS_PATH','KSESSION_FRESH_TESTED_SOURCE','KSESSION_FRESH_BUILD_NODE','KSESSION_FRESH_PHYSICAL_WORK','PSModulePath')
$taskPrevious=Save-KSessionProcessEnvironment $taskVariables
$taskFinalStarted=$false
$script:taskFailed=$false
$taskToolchainStarted=$false;$taskToolchainOwned=$false;$taskToolchainRestored=$true
$taskProductBefore=@{};$taskRegistryBefore=$null;$taskRulesBefore=$null;$taskCompilerFilesBefore=$null;$taskSettingsBefore=$null
$taskPhysicalBinding=$null
$taskBuildDiagnostic=Join-Path $taskWork 'build-diagnostic.json'
function Stage([string]$Reason){
  $taskReport.stage='BUILD';$taskReport.reason=$Reason
  $taskPhase=switch($Reason){'BUILD_PORTABLE_FAILED'{'RUNTIME'}'BUILD_TOOLCHAIN_FAILED'{'TOOLCHAIN'}'BUILD_COMPILER_FAILED'{'ISCC'}'BROWSER_TOOL_FAILED'{'BROWSER_TOOL'}default{'ASSEMBLY'}}
  $taskReport.buildDiagnostic=[pscustomobject]@{stage=$taskPhase;classification='COMMAND_FAILED';script=$null;line=$null}
  [IO.File]::WriteAllText($taskBuildDiagnostic,($taskReport.buildDiagnostic|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($taskReportPath,($taskReport|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
}
function User-Uninstall-Snapshot {
  $taskMap=[ordered]@{}
  foreach($taskView in @([Microsoft.Win32.RegistryView]::Registry64,[Microsoft.Win32.RegistryView]::Registry32)){
    $taskHive=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$taskView)
    try{
      $taskParent=$taskHive.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Uninstall')
      if($null -eq $taskParent){continue}
      try{foreach($taskName in @($taskParent.GetSubKeyNames()|Sort-Object)){
        $taskKey=$taskParent.OpenSubKey($taskName);if($null -eq $taskKey){throw 'User registration unknown'}
        try{$taskValues=[ordered]@{};foreach($taskValue in @($taskKey.GetValueNames()|Sort-Object)){$taskValues[$taskValue]=$taskKey.GetValue($taskValue)};if($taskKey.GetSubKeyNames().Count -ne 0){$taskValues['_nested']=$true};$taskMap[([string]$taskView+':'+$taskName)]=$taskValues}finally{$taskKey.Dispose()}
      }}finally{$taskParent.Dispose()}
    }finally{$taskHive.Dispose()}
  }
  return $taskMap
}
function Registry-Tree($Key,[int]$Depth=0){
  if($Depth -gt 16){throw 'Registry snapshot bound exceeded'}
  $taskTree=[ordered]@{values=[ordered]@{};children=[ordered]@{}}
  foreach($taskName in @($Key.GetValueNames()|Sort-Object)){if([string]$Key.GetValueKind($taskName) -eq 'Unknown'){throw 'Registry value type unproven'};$taskTree.values[$taskName]=[ordered]@{kind=[string]$Key.GetValueKind($taskName);value=$Key.GetValue($taskName,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)}}
  foreach($taskName in @($Key.GetSubKeyNames()|Sort-Object)){$taskChild=$Key.OpenSubKey($taskName);if($null -eq $taskChild){throw 'Registry subtree unknown'};try{$taskTree.children[$taskName]=Registry-Tree $taskChild ($Depth+1)}finally{$taskChild.Dispose()}}
  return $taskTree
}
function Inno-Environment-Snapshot {
  $taskState=[ordered]@{}
  foreach($taskView in @([Microsoft.Win32.RegistryView]::Registry64,[Microsoft.Win32.RegistryView]::Registry32)){
    $taskHive=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$taskView)
    try{foreach($taskPath in @('Software\Classes\.iss','Software\Classes\InnoSetupScriptFile','Software\Classes\Applications\Compil32.exe','Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.iss')){
      $taskKey=$taskHive.OpenSubKey($taskPath)
      if($null -eq $taskKey){$taskState[([string]$taskView+':'+$taskPath)]=$null}else{try{$taskState[([string]$taskView+':'+$taskPath)]=Registry-Tree $taskKey}finally{$taskKey.Dispose()}}
    }}finally{$taskHive.Dispose()}
  }
  foreach($taskFolder in @('Desktop','Programs')){
    $taskBase=[Environment]::GetFolderPath($taskFolder,'DoNotVerify')
    foreach($taskPath in @((Join-Path $taskBase 'Inno Setup Compiler.lnk'),(Join-Path $taskBase 'Inno Setup 6'))){
      try{
        $taskAttributes=[IO.File]::GetAttributes($taskPath)
        if(($taskAttributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Shortcut snapshot path unknown'}
        if(($taskAttributes -band [IO.FileAttributes]::Directory) -ne 0){$taskState[$taskPath]=@(Get-ChildItem -LiteralPath $taskPath -Recurse -File -ErrorAction Stop|Sort-Object FullName|ForEach-Object{if(($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Compiler shortcut tree unknown'};[ordered]@{path=$_.FullName;hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}})}else{$taskState[$taskPath]=(Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash}
      }catch [IO.FileNotFoundException]{$taskState[$taskPath]=$null}catch [IO.DirectoryNotFoundException]{$taskState[$taskPath]=$null}
    }
  }
  return $taskState
}
function Checked([string]$Exe,[string[]]$Arguments){$taskChecked=Invoke-KSessionMemoryProcess $Exe $Arguments;if($taskChecked.ExitCode -ne 0){throw 'Fresh checked command failed'}}
function Pinned([string]$Uri,[string]$Hash,[string]$Zip,[string]$Output){Invoke-WebRequest -Uri $Uri -OutFile $Zip -TimeoutSec 240;if((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Hash){throw 'Pinned tool identity rejected'};Expand-Archive -LiteralPath $Zip -DestinationPath $Output}
$taskEnvPhase='CI_ENTRY'
try {
  $taskEnter=Invoke-KSessionMemoryNode (Get-Command node).Source @((Join-Path $taskRepo 'tools/tests/fresh-lan-trial/install-r2/final-ci-report.cjs'),'ENV',$taskWork)
  if($taskEnter.ExitCode -ne 0 -or $taskEnter.TimedOut -or $taskEnter.ForcedTermination -or $taskEnter.Stderr.Length -ne 0){throw 'Fresh ENV report entry unproven'}
  $taskReport=Get-Content -Raw -LiteralPath $taskReportPath|ConvertFrom-Json
  $taskEnvPhase='ENV_PRECHECK'
  $env:NODE_OPTIONS='';$env:GOWORK='off';$env:KSESSION_FRESH_TESTED_SOURCE=$taskContext.sourceCommit
  $taskPhysicalBinding=Read-FreshPhysicalWorkBinding $taskWork
  $env:KSESSION_FRESH_PHYSICAL_WORK=$taskPhysicalBinding.physical
  $env:PSModulePath=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/Modules'
  $taskProductBefore=Get-FreshProductObservations $env:KSESSION_FRESH_PHYSICAL_WORK
  $taskRegistryBefore=Get-FreshRegistryObservation @('Software\Microsoft\Windows\CurrentVersion\Uninstall','Software\KSESSION\Beta\InstallerBinding')
  $taskRulesBefore=Get-FreshRulesObservation
  $taskCompilerFilesBefore=Get-FreshCompilerObservation $taskPhysicalBinding
  $taskInnoBefore=Inno-Environment-Snapshot
  $taskSettingsBefore=New-FreshObservation $true $false ($taskInnoBefore|ConvertTo-Json -Depth 60 -Compress)
  Assert-FreshEnvPrecheck $taskRegistryBefore $taskRulesBefore $taskCompilerFilesBefore $taskProductBefore
  $taskEnvPhase='BUILD'
  if($taskContext.mode -eq 'CANDIDATE'){
    Stage 'BUILD_PORTABLE_FAILED'
    $taskPortable=Join-Path $taskWork 'portable'
    & (Join-Path $PSScriptRoot 'build-payload.ps1') -Work $taskPortable -Commit $taskContext.sourceCommit -BuildDiagnostic $taskBuildDiagnostic
    if($LASTEXITCODE -ne 0){throw 'Fresh portable build failed'}
    $taskNode=Join-Path $taskPortable 'node-tool/node-v24.21.0-win-x64/node.exe'
    $taskGo=Join-Path $taskPortable 'go-tool/go/bin/go.exe'
    Stage 'BUILD_TOOLCHAIN_FAILED'
    $taskUserBefore=User-Uninstall-Snapshot
    $taskToolchainStarted=$true;$taskToolchainRestored=$false
    & (Join-Path $PSScriptRoot 'toolchain.ps1') -Work (Join-Path $taskWork 'inno')
    if($LASTEXITCODE -ne 0){throw 'Fresh compiler toolchain failed'}
    $taskUserAfter=User-Uninstall-Snapshot
    if(($taskUserAfter|ConvertTo-Json -Depth 8 -Compress) -cne ($taskUserBefore|ConvertTo-Json -Depth 8 -Compress) -or ((Inno-Environment-Snapshot)|ConvertTo-Json -Depth 60 -Compress) -cne ($taskInnoBefore|ConvertTo-Json -Depth 60 -Compress)){throw 'Portable compiler changed existing environment'}
    if(!(Test-FreshPhysicalWorkBinding $taskPhysicalBinding)){throw 'Compiler mapping changed'}
    Checked (Get-FreshPhysicalNode $taskPhysicalBinding $taskNode) @((Join-Path $PSScriptRoot 'owned-tool-files.cjs'),'snapshot',$taskPhysicalBinding.physical)
    $taskToolchainOwned=$true
    Stage 'BUILD_COMPILER_FAILED'
    Checked $taskNode @((Join-Path $PSScriptRoot 'build.cjs'),$taskPortable,(Join-Path $taskWork 'inno/compiler'),(Join-Path $taskWork 'setup'),$taskContext.sourceCommit)
    Copy-Item -LiteralPath (Join-Path $taskWork 'setup/artifact') -Destination (Join-Path $taskWork 'artifact') -Recurse
  }elseif($taskContext.mode -eq 'QA'){
    Stage 'BUILD_TOOLCHAIN_FAILED'
    $taskDistribution=Get-Content -Raw -LiteralPath (Join-Path $taskRepo 'tools/installer/distribution.json')|ConvertFrom-Json
    $taskGoPin=Get-Content -Raw -LiteralPath (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json')|ConvertFrom-Json
    Pinned $taskDistribution.nodeUrl $taskDistribution.nodeArchiveSha256 (Join-Path $taskWork 'node.zip') (Join-Path $taskWork 'node-tool')
    Pinned $taskGoPin.goWindowsZip $taskGoPin.sha256 (Join-Path $taskWork 'go.zip') (Join-Path $taskWork 'go-tool')
    $taskNode=Join-Path $taskWork 'node-tool/node-v24.21.0-win-x64/node.exe';$taskGo=Join-Path $taskWork 'go-tool/go/bin/go.exe'
    if((Get-FileHash -LiteralPath $taskNode -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskDistribution.nodeExeSha256){throw 'QA Node identity failed'}
    # Only immutable artifact extraction. No Runtime/Launcher/helper/Setup rebuild in QA.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $taskZip=[IO.Compression.ZipFile]::OpenRead((Join-Path $taskWork 'candidate.zip'))
    try{
      $taskNames=@('K-SESSION-Fresh-Trial-1.1.0-beta.4.exe','K-SESSION-Fresh-Trial-1.1.0-beta.4.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','fresh-report.json')
      if($taskZip.Entries.Count -ne $taskNames.Count -or (Compare-Object ($taskNames|Sort-Object) @($taskZip.Entries.FullName|Sort-Object))){throw 'QA artifact allowlist failed'}
      if(@($taskZip.Entries|Where-Object{$_.Length -lt 1 -or $_.Length -gt 512MB}).Count -ne 0){throw 'QA artifact bound failed'}
      New-Item -ItemType Directory -Path (Join-Path $taskWork 'artifact')|Out-Null
      foreach($taskEntry in $taskZip.Entries){[IO.Compression.ZipFileExtensions]::ExtractToFile($taskEntry,(Join-Path $taskWork "artifact/$($taskEntry.FullName)"),$false)}
    }finally{$taskZip.Dispose()}
  }else{throw 'Fresh mode rejected'}
  if($BuildOnly){
    [IO.File]::WriteAllText($taskBuildDiagnostic,(@{stage='SMOKE_IDENTITY';classification='COMMAND_FAILED';script=$null;line=$null}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
    Checked $taskNode @((Join-Path $PSScriptRoot 'recovery-r1/smoke.cjs'),'READY',$taskRepo,$taskWork)
    [IO.File]::WriteAllText($taskBuildDiagnostic,(@{stage='COMPLETE';classification='PASS';script=$null;line=$null}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  }else{
  Stage 'BROWSER_TOOL_FAILED'
  $taskBrowser=Join-Path $taskWork 'browser-tool';Copy-Item -LiteralPath (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/browser-tool') -Destination $taskBrowser -Recurse
  $taskNpm=Join-Path (Split-Path $taskNode) 'node_modules/npm/bin/npm-cli.js'
  Push-Location $taskBrowser
  try{Checked $taskNode @($taskNpm,'ci','--logs-max=0','--loglevel=silent','--ignore-scripts','--omit=optional','--bin-links=false','--no-audit','--no-fund','--cache',(Join-Path $taskWork 'browser-cache'))}finally{Pop-Location}
  $env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $taskWork 'browser-binaries';$env:NODE_PATH=Join-Path $taskBrowser 'node_modules'
  Checked $taskNode @((Join-Path $taskBrowser 'node_modules/playwright-core/cli.js'),'install','chromium')
  [IO.File]::WriteAllText($taskBuildDiagnostic,(@{stage='COMPLETE';classification='PASS';script=$null;line=$null}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  $env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOWORK='off';$env:CGO_ENABLED='0';$env:GOOS='windows';$env:GOARCH='amd64';$env:GOFLAGS='';$env:GOEXPERIMENT=''
  $env:GOCACHE=Join-Path $taskWork 'test-go-cache';$env:GOTMPDIR=Join-Path $taskWork 'test-go-temp';New-Item -ItemType Directory -Force -Path $env:GOCACHE,$env:GOTMPDIR|Out-Null
  $env:TEMP=Resolve-KSessionFirewallPhysicalPath $env:GOTMPDIR;$env:TMP=$env:TEMP
  $taskFinalStarted=$true
  Checked $taskNode @((Join-Path $PSScriptRoot 'hosted-run.cjs'),$taskRepo,$taskWork,$taskNode,$taskGo)
  }
}catch{
  if($taskEnvPhase -eq 'CI_ENTRY'){[Console]::Error.WriteLine('FRESH_CI_ENTRY_REJECTED')}elseif($taskEnvPhase -eq 'ENV_PRECHECK'){[Console]::Error.WriteLine('FRESH_ENV_PRECHECK_FAILED')}
  if(!$taskFinalStarted){$taskReport.status='FAIL';[IO.File]::WriteAllText($taskReportPath,($taskReport|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
  $script:taskFailed=$true
}finally{
  $taskRecovery=@{};foreach($taskKey in @('productRegistration','binding','startup','desktop','programs','programFiles','compilerOwnedFiles','compilerSettings','globalRegistry','rules')){$taskRecovery[$taskKey]='NOT_OBSERVED'}
  try {
  if($taskToolchainStarted){
    try{
      if(!$taskToolchainOwned){throw 'Compiler cleanup unproven'}
      if(!(Test-FreshPhysicalWorkBinding $taskPhysicalBinding)){throw 'Compiler cleanup mapping changed'}
      Checked (Get-FreshPhysicalNode $taskPhysicalBinding $taskNode) @((Join-Path $PSScriptRoot 'owned-tool-files.cjs'),'remove',$taskPhysicalBinding.physical)
      $taskToolchainRestored=$true
    }catch{$taskToolchainRestored=$false;$script:taskFailed=$true}
  }
  try{$taskProductAfter=Get-FreshProductObservations $env:KSESSION_FRESH_PHYSICAL_WORK}catch{$taskProductAfter=@{}}
  if($null -eq $taskProductBefore){$taskProductBefore=@{}};if($null -eq $taskProductAfter){$taskProductAfter=@{}}
  foreach($taskKey in @('productRegistration','binding','startup','desktop','programs','programFiles')){$taskRecovery[$taskKey]=Get-FreshRecoveryState $taskProductBefore[$taskKey] $taskProductAfter[$taskKey]}
  $taskCompilerFilesAfter=Invoke-FreshObservation {Get-FreshCompilerObservation $taskPhysicalBinding}
  $taskRecovery.compilerOwnedFiles=Get-FreshRecoveryState $taskCompilerFilesBefore $taskCompilerFilesAfter ($taskToolchainStarted -and $taskToolchainRestored)
  try{$taskSettingsAfter=New-FreshObservation $true $false ((Inno-Environment-Snapshot)|ConvertTo-Json -Depth 60 -Compress)}catch{$taskSettingsAfter=New-FreshObservation $false $false}
  $taskRecovery.compilerSettings=Get-FreshRecoveryState $taskSettingsBefore $taskSettingsAfter
  $taskRecovery.globalRegistry=Get-FreshRecoveryState $taskRegistryBefore (Invoke-FreshObservation {Get-FreshRegistryObservation @('Software\Microsoft\Windows\CurrentVersion\Uninstall','Software\KSESSION\Beta\InstallerBinding')})
  $taskRecovery.rules=Get-FreshRecoveryState $taskRulesBefore (Invoke-FreshObservation {Get-FreshRulesObservation})
  }catch{$script:taskFailed=$true}finally{
  $taskEnvironmentRestored=$false;try{Restore-KSessionProcessEnvironment $taskPrevious;$taskEnvironmentRestored=Test-KSessionProcessEnvironmentRestored $taskPrevious}catch{$script:taskFailed=$true}
  $taskEvidence=[ordered]@{recovery=$taskRecovery;environmentRestored=$taskEnvironmentRestored;productPhaseStarted=$taskFinalStarted}
  $taskFinalNode=(Get-Command node).Source
  try{
    if(!(Test-FreshPinnedWorkDirectory $taskPhysicalBinding)){throw 'WORK_FINAL_ROOT_UNKNOWN'}
    $taskFinalWrite=Invoke-KSessionMemoryNode $taskFinalNode @((Join-Path $taskRepo 'tools/tests/fresh-lan-trial/install-r2/final-ci-report.cjs'),$taskPhysicalBinding.physical) ($taskEvidence|ConvertTo-Json -Depth 8 -Compress)
    if($taskFinalWrite.ExitCode -ne 0 -or $taskFinalWrite.TimedOut -or $taskFinalWrite.ForcedTermination -or $taskFinalWrite.Stderr.Length -ne 0){$script:taskFailed=$true}
  }catch{$script:taskFailed=$true}finally{Close-FreshPhysicalWorkBinding $taskPhysicalBinding}
  }
}
if($script:taskFailed){exit 1}
