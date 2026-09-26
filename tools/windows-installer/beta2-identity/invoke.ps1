[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$RepositoryRoot,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [Parameter(Mandatory=$true)][string]$TestedCommit
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
Set-StrictMode -Version Latest

$taskAllowedPhases=@('STATIC_GATE','HOSTED_PREFLIGHT','API_METADATA','ARTIFACT_DOWNLOAD','ARCHIVE_IDENTITY','EXTRACT',
  'SETUP_IDENTITY','INSTALL','INSTALL_LOG','OWNED_PROCESS_QUIESCE','INSTALLED_FOOTPRINT','REGISTRY_READ','REGISTRY_NORMALIZE',
  'COLLECT','RETENTION_PROBE','UNINSTALL','CLEANUP_VERIFY','FINALIZE')
$taskPhase='HOSTED_PREFLIGHT'
$taskWork='C:\KSESSION-B45-BETA2-IDENTITY-WORK'
$taskExtract=Join-Path $taskWork 'artifact'
$taskInstall=Join-Path $taskWork 'installed'
$taskInstance=Join-Path $taskWork 'instance'
$taskZip=Join-Path $taskWork 'artifact.zip'
$taskMetadata=Join-Path $taskWork 'metadata.json'
$taskSnapshotRaw=Join-Path $taskWork 'snapshot-raw.json'
$taskSnapshot=Join-Path $taskWork 'snapshot.json'
$taskDraft=Join-Path $taskWork 'draft.json'
$taskCleanup=Join-Path $taskWork 'cleanup.json'
$taskLog=Join-Path $taskWork 'setup.log'
$taskStdout=Join-Path $taskWork 'setup.stdout'
$taskStderr=Join-Path $taskWork 'setup.stderr'
$taskProbe=Join-Path $taskInstance 'identity-retention-probe.bin'
$taskReport=Join-Path $OutputDirectory 'BETA2-IDENTITY-REPORT.json'
$taskEvidence=Join-Path $OutputDirectory 'beta2-identity-evidence.json'
$taskCli=Join-Path $RepositoryRoot 'tools\windows-installer\beta2-identity\cli.cjs'
$taskNode=$null
$taskToken=$env:GITHUB_TOKEN
$taskInstalled=$false
$taskFinalized=$false
$taskWorkCreated=$false
$taskDesktop=[Environment]::GetFolderPath('Desktop','DoNotVerify')
$taskPrograms=[Environment]::GetFolderPath('Programs','DoNotVerify')
$taskDesktopLink=Join-Path $taskDesktop 'K⁺-SESSION.lnk'
$taskProgramsLink=Join-Path $taskPrograms 'K⁺-SESSION.lnk'
$taskDesktopWasPresent=Test-Path -LiteralPath $taskDesktopLink
$taskProgramsWasPresent=Test-Path -LiteralPath $taskProgramsLink
$taskProductSubkey='Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1'
$taskBindingSubkey='Software\KSESSION\Beta\InstallerBinding'

function Set-TaskPhase([string]$Phase){if($taskAllowedPhases -notcontains $Phase){throw 'PHASE_NOT_ALLOWED'};$script:taskPhase=$Phase}
function Assert-TaskPath([string]$Path){
  $full=[IO.Path]::GetFullPath($Path);$scope=[IO.Path]::GetFullPath($taskWork).TrimEnd('\')
  if(!$full.Equals($scope,[StringComparison]::OrdinalIgnoreCase) -and
     !$full.StartsWith(($scope+'\'),[StringComparison]::OrdinalIgnoreCase)){throw 'PATH_SCOPE'}
}
function Assert-SafeAsciiPath([string]$Path){
  $full=[IO.Path]::GetFullPath($Path)
  if(!$full.Equals($Path,[StringComparison]::Ordinal) -or $full -cnotmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$'){throw 'PATH_UNSAFE'}
  $full
}
function Write-PrivateJson([string]$Path,$Value){
  Assert-TaskPath $Path
  [IO.File]::WriteAllText($Path,($Value|ConvertTo-Json -Depth 20 -Compress),[Text.UTF8Encoding]::new($false))
}
function Invoke-Node([string[]]$Arguments){& $taskNode $taskCli @Arguments;if($LASTEXITCODE -ne 0){throw 'NODE_GATE_FAILED'}}
function Write-RunReport([string]$Status){
  if(Test-Path -LiteralPath $taskReport){Remove-Item -LiteralPath $taskReport -Force}
  if($Status -cnotin @('PASS','BLOCKED') -or $taskAllowedPhases -notcontains $taskPhase -or
     $TestedCommit -cnotmatch '^[a-f0-9]{40}$'){throw 'REPORT_INPUT_INVALID'}
  $reason=if($Status -ceq 'PASS'){'CAPTURED'}else{'BLOCKED_'+$taskPhase}
  $report=[ordered]@{schema=1;kind='k-session-beta2-identity-run';status=$Status;stage=$taskPhase;reason=$reason;
    source=[ordered]@{repository='KG718718/spxt-public';runId=[Int64]36246132535;artifactId=[Int64]10907910968;headSha='c8886e6b6d413c2fd73d6716621d07a80b337e58'};testedCommit=$TestedCommit}
  [IO.File]::WriteAllText($taskReport,($report|ConvertTo-Json -Depth 4 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
  if($taskNode){& $taskNode $taskCli verify-report --input $taskReport;if($LASTEXITCODE -ne 0){throw 'REPORT_VERIFY_FAILED'}}
}
function Open-Hkcu([string]$View){
  $registryView=if($View -eq '64'){[Microsoft.Win32.RegistryView]::Registry64}else{[Microsoft.Win32.RegistryView]::Registry32}
  [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$registryView)
}
function Open-Hklm([string]$View){
  $registryView=if($View -eq '64'){[Microsoft.Win32.RegistryView]::Registry64}else{[Microsoft.Win32.RegistryView]::Registry32}
  [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine,$registryView)
}
function Read-StringValue($Key,[string]$Name){
  if($Key.GetValueKind($Name) -ne [Microsoft.Win32.RegistryValueKind]::String){throw 'REGISTRY_TYPE'}
  $value=$Key.GetValue($Name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  if($value -isnot [string] -or $value.Length -eq 0){throw 'REGISTRY_VALUE'}
  $value
}
function Read-Snapshot{
  $registrations=@();$bindings=@()
  foreach($view in @('64','32')){
    $base=Open-Hkcu $view
    try{
      $key=$base.OpenSubKey($taskProductSubkey,$false)
      if($null-ne$key){try{$registrations+=@{view=$view;key=$taskProductSubkey;displayName=(Read-StringValue $key 'DisplayName');displayVersion=(Read-StringValue $key 'DisplayVersion');installLocation=(Read-StringValue $key 'InstallLocation');uninstallString=(Read-StringValue $key 'UninstallString')}}finally{$key.Dispose()}}
      $key=$base.OpenSubKey($taskBindingSubkey,$false)
      if($null-ne$key){try{$bindings+=@{view=$view;key=$taskBindingSubkey;installRoot=(Read-StringValue $key 'InstallRoot');instance=(Read-StringValue $key 'Instance')}}finally{$key.Dispose()}}
    }finally{$base.Dispose()}
  }
  @{registrations=$registrations;bindings=$bindings}
}
function Count-Subkey([string]$Subkey){
  $present=$false
  foreach($view in @('64','32')){$base=Open-Hkcu $view;try{$key=$base.OpenSubKey($Subkey,$false);if($null-ne$key){$present=$true;$key.Dispose()}}finally{$base.Dispose()}}
  if($present){1}else{0}
}
function Count-MachineSubkey([string]$Subkey){
  $count=0
  foreach($view in @('64','32')){$base=Open-Hklm $view;try{$key=$base.OpenSubKey($Subkey,$false);if($null-ne$key){$count++;$key.Dispose()}}finally{$base.Dispose()}}
  $count
}
function Remove-OwnedBinding{
  foreach($view in @('64','32')){
    $base=Open-Hkcu $view
    try{
      $key=$base.OpenSubKey($taskBindingSubkey,$false)
      if($null-ne$key){
        try{$root=Read-StringValue $key 'InstallRoot';$instance=Read-StringValue $key 'Instance'}finally{$key.Dispose()}
        if(!$root.Equals($taskInstall,[StringComparison]::OrdinalIgnoreCase) -or
           !$instance.Equals($taskInstance,[StringComparison]::OrdinalIgnoreCase)){throw 'BINDING_NOT_OWNED'}
        $base.DeleteSubKeyTree($taskBindingSubkey,$false)
      }
    }finally{$base.Dispose()}
  }
}
function Remove-OwnedRegistration{
  foreach($view in @('64','32')){
    $base=Open-Hkcu $view
    try{
      $key=$base.OpenSubKey($taskProductSubkey,$false)
      if($null-ne$key){
        try{$root=Read-StringValue $key 'InstallLocation'}finally{$key.Dispose()}
        if(!$root.Equals($taskInstall,[StringComparison]::OrdinalIgnoreCase)){throw 'REGISTRATION_NOT_OWNED'}
        $base.DeleteSubKeyTree($taskProductSubkey,$false)
      }
    }finally{$base.Dispose()}
  }
}
function Invoke-SetupAndWait([string]$FileName,[string]$InstallRoot,[string]$Instance,[string]$Log,
    [string]$StandardOutput,[string]$StandardError){
  $trustedFile=Assert-SafeAsciiPath $FileName;$trustedRoot=Assert-SafeAsciiPath $InstallRoot
  $trustedInstance=Assert-SafeAsciiPath $Instance;$trustedLog=Assert-SafeAsciiPath $Log
  $trustedStdout=Assert-SafeAsciiPath $StandardOutput;$trustedStderr=Assert-SafeAsciiPath $StandardError
  $arguments=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',('/DIR='+$trustedRoot),
    ('/INSTANCE='+$trustedInstance),'/CONFIRMDATACHANGE=1',('/LOG='+$trustedLog))
  $process=Start-Process -FilePath $trustedFile -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $trustedStdout -RedirectStandardError $trustedStderr
  try{$process.ExitCode}finally{$process.Dispose()}
}
function Wait-UninstallerCleanup([string]$Path){
  $expected=[IO.Path]::GetFullPath((Join-Path $taskInstall 'uninstall\unins000.exe'))
  if(![IO.Path]::GetFullPath($Path).Equals($expected,[StringComparison]::OrdinalIgnoreCase)){throw 'UNINSTALLER_SCOPE'}
  $deadline=[DateTime]::UtcNow.AddSeconds(25)
  while(Test-Path -LiteralPath $Path){if([DateTime]::UtcNow-ge$deadline){return $false};Start-Sleep -Milliseconds 100}
  $true
}
function Clear-ChildAuthenticationEnvironment{
  foreach($name in @('GITHUB_TOKEN','GH_TOKEN','GITHUB_PAT','ACTIONS_RUNTIME_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','SYSTEM_ACCESSTOKEN')){
    if(Test-Path -LiteralPath ('Env:'+ $name)){Remove-Item -LiteralPath ('Env:'+ $name) -Force}
  }
  $script:taskToken=$null
}
function Stop-OwnedProcesses{
  $allowed=@((Join-Path $taskInstall 'program\K-SESSION.exe'),(Join-Path $taskInstall 'program\runtime\node.exe'))
  $owned=@(Get-CimInstance Win32_Process|Where-Object{$path=[string]$_.ExecutablePath;$path -and
    ($allowed|Where-Object{$_.Equals($path,[StringComparison]::OrdinalIgnoreCase)})})
  foreach($process in $owned){Stop-Process -Id ([int]$process.ProcessId) -Force -ErrorAction Stop}
  if($owned.Count-gt 0){Start-Sleep -Milliseconds 500}
  $remaining=@(Get-CimInstance Win32_Process|Where-Object{$path=[string]$_.ExecutablePath;$path -and
    ($allowed|Where-Object{$_.Equals($path,[StringComparison]::OrdinalIgnoreCase)})})
  if($remaining.Count-ne 0){throw 'OWNED_PROCESS_REMAINS'}
}

try{
  $taskNode=(Get-Command node.exe -ErrorAction Stop).Source
  if($env:GITHUB_ACTIONS -ne 'true' -or [string]::IsNullOrWhiteSpace($taskToken)){throw 'HOSTED_REQUIRED'}
  if($TestedCommit -cnotmatch '^[a-f0-9]{40}$' -or ![IO.Path]::IsPathFullyQualified($RepositoryRoot) -or
     ![IO.Path]::IsPathFullyQualified($OutputDirectory) -or !(Test-Path -LiteralPath $RepositoryRoot -PathType Container) -or
     !(Test-Path -LiteralPath $OutputDirectory -PathType Container) -or (Test-Path -LiteralPath $taskWork)){throw 'PREFLIGHT_INVALID'}
  $outputEntries=@(Get-ChildItem -LiteralPath $OutputDirectory -Force)
  if($outputEntries.Count-ne 1 -or !$outputEntries[0].FullName.Equals($taskReport,[StringComparison]::OrdinalIgnoreCase)){
    throw 'OUTPUT_ALLOWLIST_INVALID'
  }
  Invoke-Node @('verify-report','--input',$taskReport)
  if((Count-Subkey $taskProductSubkey)-ne 0 -or (Count-Subkey $taskBindingSubkey)-ne 0 -or
     (Count-MachineSubkey $taskProductSubkey)-ne 0 -or (Count-MachineSubkey $taskBindingSubkey)-ne 0 -or
     (Test-Path -LiteralPath $taskDesktopLink) -or (Test-Path -LiteralPath $taskProgramsLink)){throw 'PREEXISTING_INSTALLATION'}
  [IO.Directory]::CreateDirectory($taskWork)|Out-Null;$taskWorkCreated=$true
  [IO.Directory]::CreateDirectory($taskExtract)|Out-Null
  $headers=@{Authorization="Bearer $taskToken";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}

  Set-TaskPhase 'API_METADATA'
  $run=Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/repos/KG718718/spxt-public/actions/runs/36246132535'
  $artifact=Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/repos/KG718718/spxt-public/actions/artifacts/10907910968'
  $metadata=@{run=@{id=[Int64]$run.id;attempt=[int]$run.run_attempt;repository=[string]$run.repository.full_name;headSha=[string]$run.head_sha;status=[string]$run.status;conclusion=[string]$run.conclusion};artifact=@{id=[Int64]$artifact.id;name=[string]$artifact.name;sizeInBytes=[Int64]$artifact.size_in_bytes;digest=[string]$artifact.digest;expired=[bool]$artifact.expired;expiresAt=([DateTimeOffset]$artifact.expires_at).ToUniversalTime().ToString('o');archiveDownloadUrl=[string]$artifact.archive_download_url;workflowRunId=[Int64]$artifact.workflow_run.id}}
  Write-PrivateJson $taskMetadata $metadata
  Invoke-Node @('metadata','--input',$taskMetadata)

  Set-TaskPhase 'ARTIFACT_DOWNLOAD'
  Invoke-WebRequest -Headers $headers -Uri 'https://api.github.com/repos/KG718718/spxt-public/actions/artifacts/10907910968/zip' -OutFile $taskZip -MaximumRedirection 5|Out-Null
  Set-TaskPhase 'ARCHIVE_IDENTITY'
  if((Get-Item -LiteralPath $taskZip).Length -ne 32538249 -or
     ('sha256:'+(Get-FileHash -LiteralPath $taskZip -Algorithm SHA256).Hash.ToLowerInvariant()) -cne 'sha256:e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6'){throw 'ARCHIVE_IDENTITY_MISMATCH'}
  Set-TaskPhase 'EXTRACT';Expand-Archive -LiteralPath $taskZip -DestinationPath $taskExtract
  Set-TaskPhase 'SETUP_IDENTITY';Invoke-Node @('setup','--root',$taskExtract)
  $setups=@(Get-ChildItem -LiteralPath $taskExtract -Recurse -File|Where-Object Name -eq 'K-SESSION-Setup-1.1.0-beta.2.exe')
  if($setups.Count-ne 1){throw 'SETUP_NOT_UNIQUE'}
  Clear-ChildAuthenticationEnvironment

  Set-TaskPhase 'INSTALL'
  $setupExit=Invoke-SetupAndWait -FileName $setups[0].FullName -InstallRoot $taskInstall -Instance $taskInstance `
    -Log $taskLog -StandardOutput $taskStdout -StandardError $taskStderr
  if($setupExit-ne 0){throw 'SETUP_FAILED'};$taskInstalled=$true
  Set-TaskPhase 'INSTALL_LOG'
  $logText=Get-Content -LiteralPath $taskLog -Raw
  if(!$logText.Contains('KSESSION_PREINSTALL_READY') -or !$logText.Contains('KSESSION_INSTALLED_PAYLOAD_VERIFIED') -or
     $logText.Contains('KSESSION_REJECT_')){throw 'INSTALL_LOG_REJECTED'}
  Set-TaskPhase 'OWNED_PROCESS_QUIESCE';Stop-OwnedProcesses
  Set-TaskPhase 'INSTALLED_FOOTPRINT'
  Invoke-Node @('installed-footprint','--install-root',$taskInstall,'--instance',$taskInstance)
  if((Count-MachineSubkey $taskProductSubkey)-ne 0 -or (Count-MachineSubkey $taskBindingSubkey)-ne 0){throw 'HKLM_SCOPE_CONFLICT'}
  Set-TaskPhase 'REGISTRY_READ';Write-PrivateJson $taskSnapshotRaw (Read-Snapshot)
  Set-TaskPhase 'REGISTRY_NORMALIZE';Invoke-Node @('normalize-snapshot','--input',$taskSnapshotRaw,'--output',$taskSnapshot)
  Set-TaskPhase 'COLLECT'
  Invoke-Node @('collect','--metadata',$taskMetadata,'--snapshot',$taskSnapshot,'--install-root',$taskInstall,
    '--instance',$taskInstance,'--output',$taskDraft)

  Set-TaskPhase 'RETENTION_PROBE'
  $probeBytes=[Text.UTF8Encoding]::new($false).GetBytes('KSESSION-B45-SYNTHETIC-RETENTION-PROBE')
  [IO.File]::WriteAllBytes($taskProbe,$probeBytes);$probeHash=(Get-FileHash -LiteralPath $taskProbe -Algorithm SHA256).Hash
  Set-TaskPhase 'UNINSTALL'
  $uninstaller=Join-Path $taskInstall 'uninstall\unins000.exe'
  $process=Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -Wait -PassThru -WindowStyle Hidden
  try{$uninstallExit=$process.ExitCode}finally{$process.Dispose()}
  if($uninstallExit-ne 0 -or !(Wait-UninstallerCleanup $uninstaller)){throw 'UNINSTALL_FAILED'};$taskInstalled=$false
  Set-TaskPhase 'CLEANUP_VERIFY'
  $programAfter=Test-Path -LiteralPath $taskInstall;$registrationAfter=Count-Subkey $taskProductSubkey
  $desktopAfter=Test-Path -LiteralPath $taskDesktopLink;$programsAfter=Test-Path -LiteralPath $taskProgramsLink
  $bindingAfter=Count-Subkey $taskBindingSubkey;$instanceAfter=Test-Path -LiteralPath $taskInstance
  $probeAfter=$instanceAfter -and (Test-Path -LiteralPath $taskProbe) -and
    ((Get-FileHash -LiteralPath $taskProbe -Algorithm SHA256).Hash -ceq $probeHash)
  if($programAfter -or $registrationAfter-ne 0 -or $desktopAfter -or $programsAfter -or
     $bindingAfter-ne 1 -or !$instanceAfter -or !$probeAfter){throw 'UNINSTALL_CONTRACT_FAILED'}
  Remove-OwnedBinding
  Assert-TaskPath $taskInstance;Remove-Item -LiteralPath $taskInstance -Recurse -Force
  foreach($owned in @($taskExtract,$taskZip,$taskInstall,$taskLog,$taskStdout,$taskStderr,$taskSnapshotRaw,$taskSnapshot)){
    if(Test-Path -LiteralPath $owned){Assert-TaskPath $owned;Remove-Item -LiteralPath $owned -Recurse -Force}
  }
  $cleanup=@{uninstallerExitCode=$uninstallExit;programRootExistsAfterUninstall=$programAfter;uninstallRegistrationCountAfterUninstall=$registrationAfter;desktopShortcutExistsAfterUninstall=$desktopAfter;startMenuShortcutExistsAfterUninstall=$programsAfter;bindingRetainedAfterUninstall=($bindingAfter -eq 1);instanceRetainedAfterUninstall=$instanceAfter;retentionProbeUnchangedAfterUninstall=$probeAfter;bindingRegistrationCountAfterHarnessCleanup=(Count-Subkey $taskBindingSubkey);instanceExistsAfterHarnessCleanup=(Test-Path -LiteralPath $taskInstance);temporaryPayloadRemoved=(@($taskExtract,$taskZip,$taskInstall,$taskLog,$taskStdout,$taskStderr,$taskSnapshotRaw,$taskSnapshot)|Where-Object{Test-Path -LiteralPath $_}).Count -eq 0}
  Write-PrivateJson $taskCleanup $cleanup
  Set-TaskPhase 'FINALIZE'
  Invoke-Node @('finalize','--draft',$taskDraft,'--cleanup',$taskCleanup,'--output',$taskEvidence)
  Invoke-Node @('verify','--input',$taskEvidence)
  Write-RunReport 'PASS';$taskFinalized=$true
  Write-Output 'BETA2_IDENTITY_HOSTED_PASS'
}catch{
  if($taskAllowedPhases -notcontains $taskPhase){$taskPhase='HOSTED_PREFLIGHT'}
  try{if(Test-Path -LiteralPath $OutputDirectory -PathType Container){Write-RunReport 'BLOCKED'}}catch{}
  [Console]::Error.WriteLine('BETA2_IDENTITY_BLOCKED_'+$taskPhase)
  exit 1
}finally{
  $env:GITHUB_TOKEN=$null;$taskToken=$null
  if($taskInstalled){try{$uninstaller=Join-Path $taskInstall 'uninstall\unins000.exe';if(Test-Path -LiteralPath $uninstaller){$p=Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -Wait -PassThru -WindowStyle Hidden;$p.Dispose()}}catch{}}
  if($taskWorkCreated){
    try{Remove-OwnedRegistration}catch{}
    try{Remove-OwnedBinding}catch{}
    if(!$taskDesktopWasPresent -and (Test-Path -LiteralPath $taskDesktopLink)){Remove-Item -LiteralPath $taskDesktopLink -Force -ErrorAction SilentlyContinue}
    if(!$taskProgramsWasPresent -and (Test-Path -LiteralPath $taskProgramsLink)){Remove-Item -LiteralPath $taskProgramsLink -Force -ErrorAction SilentlyContinue}
    if(Test-Path -LiteralPath $taskWork){Assert-TaskPath $taskWork;Remove-Item -LiteralPath $taskWork -Recurse -Force -ErrorAction SilentlyContinue}
  }
  if(!$taskFinalized -and (Test-Path -LiteralPath $taskEvidence)){Remove-Item -LiteralPath $taskEvidence -Force -ErrorAction SilentlyContinue}
}
