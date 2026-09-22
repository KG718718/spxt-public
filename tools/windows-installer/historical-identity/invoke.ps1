[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$RepositoryRoot,
  [Parameter(Mandatory=$true)][string]$OutputFile
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
Set-StrictMode -Version Latest

$taskAllowedPhases=@(
  'HOSTED_PREFLIGHT',
  'API_METADATA',
  'ARTIFACT_DOWNLOAD',
  'ARCHIVE_HASH',
  'EXTRACT',
  'SETUP_IDENTITY',
  'INSTALL',
  'INSTALL_FOOTPRINT_MANIFEST',
  'INSTALL_FOOTPRINT_BUILD_INFO',
  'INSTALL_FOOTPRINT_BINDING',
  'INSTALL_FOOTPRINT_RUNTIME',
  'INSTALL_FOOTPRINT_LAUNCHER',
  'INSTALL_FOOTPRINT_INVENTORY',
  'INSTALL_FOOTPRINT_RUNTIME_HASH',
  'INSTALL_FOOTPRINT_LAUNCHER_HASH',
  'INSTALL_FOOTPRINT_PAYLOAD_COUNT',
  'INSTALL_FOOTPRINT_PAYLOAD_PATH',
  'INSTALL_FOOTPRINT_PAYLOAD_BYTES',
  'INSTALL_FOOTPRINT_PAYLOAD_HASH',
  'INSTALL_FOOTPRINT_PAYLOAD_SCHEMA',
  'INSTALL_FOOTPRINT_USAGE',
  'INSTALL_FOOTPRINT_OTHER',
  'INSTALL_LOG_INPUT',
  'INSTALL_LOG_FAILURE',
  'INSTALL_LOG_NO_PREINSTALL',
  'INSTALL_LOG_NO_POSTINSTALL',
  'INSTALL_LOG_USAGE',
  'INSTALL_LOG_OTHER',
  'REGISTRY_HKLM',
  'REGISTRY_HKCU_READ',
  'REGISTRY_SNAPSHOT_WRITE',
  'REGISTRY_NORMALIZE_INPUT',
  'REGISTRY_NORMALIZE_MISSING_REGISTRATION',
  'REGISTRY_NORMALIZE_MISSING_BINDING',
  'REGISTRY_NORMALIZE_MISSING_BOTH',
  'REGISTRY_NORMALIZE_CONFLICT',
  'REGISTRY_NORMALIZE_USAGE',
  'REGISTRY_NORMALIZE_OUTPUT',
  'REGISTRY_NORMALIZE_OTHER',
  'REGISTRY_RESULT_READ',
  'REGISTRY_UNIQUENESS',
  'COLLECT',
  'UNINSTALL',
  'CLEANUP',
  'FINALIZE'
)
$taskPhase='HOSTED_PREFLIGHT'
$taskWork='E:\KSESSION-B4-T1A-WORK'
$taskExtract=Join-Path $taskWork 'artifact'
$taskInstall=Join-Path $taskWork 'installed'
$taskInstance=Join-Path $taskWork 'instance'
$taskZip=Join-Path $taskWork 'artifact.zip'
$taskMetadata=Join-Path $taskWork 'metadata.json'
$taskRawSnapshot=Join-Path $taskWork 'registry-observations.json'
$taskSnapshot=Join-Path $taskWork 'snapshot.json'
$taskDraft=Join-Path $taskWork 'draft.json'
$taskCleanup=Join-Path $taskWork 'cleanup.json'
$taskLog=Join-Path $taskWork 'setup.log'
$taskSetupStdout=Join-Path $taskWork 'setup.stdout'
$taskSetupStderr=Join-Path $taskWork 'setup.stderr'
$taskNode=$null
$taskCli=Join-Path $RepositoryRoot 'tools\windows-installer\historical-identity\cli.cjs'
$taskToken=$env:GITHUB_TOKEN
$taskDesktop=[Environment]::GetFolderPath('Desktop','DoNotVerify')
$taskPrograms=[Environment]::GetFolderPath('Programs','DoNotVerify')
$taskDesktopLink=Join-Path $taskDesktop 'K⁺-SESSION.lnk'
$taskProgramsLink=Join-Path $taskPrograms 'K⁺-SESSION.lnk'
$taskProductSubkey='Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1'
$taskBindingSubkey='Software\KSESSION\Beta\InstallerBinding'
$taskInstalled=$false
$taskUninstallExit=-1
$taskFinalized=$false
$taskWorkCreated=$false
$taskOutputWasPresent=Test-Path -LiteralPath $OutputFile
$taskDesktopWasPresent=Test-Path -LiteralPath $taskDesktopLink
$taskProgramsWasPresent=Test-Path -LiteralPath $taskProgramsLink

function Set-TaskPhase([string]$Phase) {
  if($taskAllowedPhases -notcontains $Phase){throw 'PHASE_NOT_ALLOWED'}
  $script:taskPhase=$Phase
}
function Assert-TaskPath([string]$Path) {
  $full=[IO.Path]::GetFullPath($Path)
  if (!$full.StartsWith('E:\KSESSION-B4-T1A-WORK\',[StringComparison]::OrdinalIgnoreCase) -and
      !$full.Equals('E:\KSESSION-B4-T1A-WORK',[StringComparison]::OrdinalIgnoreCase)) { throw 'PATH_SCOPE' }
}
function Write-PrivateJson([string]$Path,$Value) {
  Assert-TaskPath $Path
  [IO.File]::WriteAllText($Path,($Value|ConvertTo-Json -Depth 20 -Compress),[Text.UTF8Encoding]::new($false))
}
function Open-Hkcu([string]$View) {
  $registryView=if($View -eq '64'){[Microsoft.Win32.RegistryView]::Registry64}else{[Microsoft.Win32.RegistryView]::Registry32}
  [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$registryView)
}
function Open-Hklm([string]$View) {
  $registryView=if($View -eq '64'){[Microsoft.Win32.RegistryView]::Registry64}else{[Microsoft.Win32.RegistryView]::Registry32}
  [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine,$registryView)
}
function Read-StringValue($Key,[string]$Name) {
  if($Key.GetValueKind($Name) -ne [Microsoft.Win32.RegistryValueKind]::String){throw 'REGISTRY_TYPE'}
  $value=$Key.GetValue($Name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  if($value -isnot [string] -or $value.Length -eq 0){throw 'REGISTRY_VALUE'}
  $value
}
function Read-Snapshot {
  $registrations=@();$bindings=@()
  foreach($view in @('64','32')){
    $base=Open-Hkcu $view
    try{
      $key=$base.OpenSubKey($taskProductSubkey,$false)
      if($null -ne $key){try{$registrations+=@{view=$view;key=$taskProductSubkey;displayName=(Read-StringValue $key 'DisplayName');displayVersion=(Read-StringValue $key 'DisplayVersion');installLocation=(Read-StringValue $key 'InstallLocation');uninstallString=(Read-StringValue $key 'UninstallString')}}finally{$key.Dispose()}}
      $key=$base.OpenSubKey($taskBindingSubkey,$false)
      if($null -ne $key){try{$bindings+=@{view=$view;key=$taskBindingSubkey;installRoot=(Read-StringValue $key 'InstallRoot');instance=(Read-StringValue $key 'Instance')}}finally{$key.Dispose()}}
    }finally{$base.Dispose()}
  }
  @{registrations=$registrations;bindings=$bindings}
}
function Count-Subkey([string]$Subkey) {
  $present=$false
  foreach($view in @('64','32')){$base=Open-Hkcu $view;try{$key=$base.OpenSubKey($Subkey,$false);if($null-ne$key){$present=$true;$key.Dispose()}}finally{$base.Dispose()}}
  if($present){1}else{0}
}
function Count-MachineSubkey([string]$Subkey) {
  $count=0
  foreach($view in @('64','32')){$base=Open-Hklm $view;try{$key=$base.OpenSubKey($Subkey,$false);if($null-ne$key){$count++;$key.Dispose()}}finally{$base.Dispose()}}
  $count
}
function Remove-OwnedBinding {
  foreach($view in @('64','32')){
    $base=Open-Hkcu $view
    try{
      $key=$base.OpenSubKey($taskBindingSubkey,$false)
      if($null-ne$key){
        try{$root=Read-StringValue $key 'InstallRoot';$instance=Read-StringValue $key 'Instance'}finally{$key.Dispose()}
        if(!$root.Equals($taskInstall,[StringComparison]::OrdinalIgnoreCase) -or !$instance.Equals($taskInstance,[StringComparison]::OrdinalIgnoreCase)){throw 'BINDING_NOT_OWNED'}
        $base.DeleteSubKeyTree($taskBindingSubkey,$false)
      }
    }finally{$base.Dispose()}
  }
}
function Invoke-Node([string[]]$Arguments) {
  & $taskNode $taskCli @Arguments
  if($LASTEXITCODE -ne 0){throw 'NODE_GATE'}
}
function Assert-SetupLaunchPath([string]$Path) {
  $full=[IO.Path]::GetFullPath($Path)
  if(!$full.Equals($Path,[StringComparison]::Ordinal) -or $full -cnotmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$'){
    throw 'SETUP_PATH_UNSAFE'
  }
  $full
}
function Invoke-SetupTreeAndWait([string]$FileName,[string]$InstallRoot,[string]$Instance,[string]$Log,
    [string]$StandardOutput,[string]$StandardError) {
  $trustedFile=Assert-SetupLaunchPath $FileName
  $trustedRoot=Assert-SetupLaunchPath $InstallRoot
  $trustedInstance=Assert-SetupLaunchPath $Instance
  $trustedLog=Assert-SetupLaunchPath $Log
  $trustedStdout=Assert-SetupLaunchPath $StandardOutput
  $trustedStderr=Assert-SetupLaunchPath $StandardError
  $arguments=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',('/DIR='+$trustedRoot),
    ('/INSTANCE='+$trustedInstance),'/CONFIRMDATACHANGE=1',('/LOG='+$trustedLog))
  $process=Start-Process -FilePath $trustedFile -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $trustedStdout -RedirectStandardError $trustedStderr
  try{$process.ExitCode}finally{$process.Dispose()}
}
function Invoke-Normalize {
  & $taskNode $taskCli 'normalize-snapshot' '--input' $taskRawSnapshot '--output' $taskSnapshot
  $normalizeExit=$LASTEXITCODE
  if($normalizeExit -eq 0){return}
  switch($normalizeExit){
    20 {Set-TaskPhase 'REGISTRY_NORMALIZE_INPUT'}
    21 {Set-TaskPhase 'REGISTRY_NORMALIZE_MISSING_REGISTRATION'}
    22 {Set-TaskPhase 'REGISTRY_NORMALIZE_MISSING_BINDING'}
    23 {Set-TaskPhase 'REGISTRY_NORMALIZE_MISSING_BOTH'}
    24 {Set-TaskPhase 'REGISTRY_NORMALIZE_CONFLICT'}
    25 {Set-TaskPhase 'REGISTRY_NORMALIZE_USAGE'}
    26 {Set-TaskPhase 'REGISTRY_NORMALIZE_OUTPUT'}
    default {Set-TaskPhase 'REGISTRY_NORMALIZE_OTHER'}
  }
  throw 'NORMALIZE_GATE'
}
function Invoke-InstalledFootprint {
  & $taskNode $taskCli 'installed-footprint' '--install-root' $taskInstall '--instance' $taskInstance
  $footprintExit=$LASTEXITCODE
  if($footprintExit -eq 0){return}
  switch($footprintExit){
    30 {Set-TaskPhase 'INSTALL_FOOTPRINT_MANIFEST'}
    31 {Set-TaskPhase 'INSTALL_FOOTPRINT_BUILD_INFO'}
    32 {Set-TaskPhase 'INSTALL_FOOTPRINT_BINDING'}
    33 {Set-TaskPhase 'INSTALL_FOOTPRINT_RUNTIME'}
    34 {Set-TaskPhase 'INSTALL_FOOTPRINT_LAUNCHER'}
    35 {Set-TaskPhase 'INSTALL_FOOTPRINT_INVENTORY'}
    36 {Set-TaskPhase 'INSTALL_FOOTPRINT_RUNTIME_HASH'}
    37 {Set-TaskPhase 'INSTALL_FOOTPRINT_LAUNCHER_HASH'}
    38 {Set-TaskPhase 'INSTALL_FOOTPRINT_PAYLOAD_COUNT'}
    39 {Set-TaskPhase 'INSTALL_FOOTPRINT_PAYLOAD_PATH'}
    40 {Set-TaskPhase 'INSTALL_FOOTPRINT_PAYLOAD_BYTES'}
    41 {Set-TaskPhase 'INSTALL_FOOTPRINT_PAYLOAD_HASH'}
    42 {Set-TaskPhase 'INSTALL_FOOTPRINT_PAYLOAD_SCHEMA'}
    43 {Set-TaskPhase 'INSTALL_FOOTPRINT_USAGE'}
    default {Set-TaskPhase 'INSTALL_FOOTPRINT_OTHER'}
  }
  throw 'FOOTPRINT_GATE'
}
function Invoke-InstallLogCheck {
  & $taskNode $taskCli 'install-log' '--input' $taskLog
  $logExit=$LASTEXITCODE
  if($logExit -eq 0){return}
  switch($logExit){
    40 {Set-TaskPhase 'INSTALL_LOG_INPUT'}
    41 {Set-TaskPhase 'INSTALL_LOG_FAILURE'}
    42 {Set-TaskPhase 'INSTALL_LOG_NO_PREINSTALL'}
    43 {Set-TaskPhase 'INSTALL_LOG_NO_POSTINSTALL'}
    44 {Set-TaskPhase 'INSTALL_LOG_USAGE'}
    default {Set-TaskPhase 'INSTALL_LOG_OTHER'}
  }
  throw 'INSTALL_LOG_GATE'
}

try{
  Set-TaskPhase 'HOSTED_PREFLIGHT'
  $taskNode=(Get-Command node.exe -ErrorAction Stop).Source
  if($env:GITHUB_ACTIONS -ne 'true' -or [string]::IsNullOrWhiteSpace($taskToken)){throw 'HOSTED_RUNNER_REQUIRED'}
  if(Test-Path -LiteralPath $taskWork){throw 'WORK_ALREADY_EXISTS'}
  if(Test-Path -LiteralPath $OutputFile){throw 'OUTPUT_ALREADY_EXISTS'}
  if((Count-Subkey $taskProductSubkey) -ne 0 -or (Count-Subkey $taskBindingSubkey) -ne 0 -or
     (Count-MachineSubkey $taskProductSubkey) -ne 0 -or (Count-MachineSubkey $taskBindingSubkey) -ne 0 -or
     $taskDesktopWasPresent -or $taskProgramsWasPresent){throw 'PREEXISTING_INSTALLATION'}
  [IO.Directory]::CreateDirectory($taskWork)|Out-Null
  $taskWorkCreated=$true
  [IO.Directory]::CreateDirectory($taskExtract)|Out-Null
  $headers=@{Authorization="Bearer $taskToken";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}

  Set-TaskPhase 'API_METADATA'
  $run=Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/repos/KG718718/spxt-public/actions/runs/35514357007'
  $artifact=Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/repos/KG718718/spxt-public/actions/artifacts/10606870944'
  $metadata=@{run=@{id=[Int64]$run.id;attempt=[int]$run.run_attempt;repository=[string]$run.repository.full_name;headSha=[string]$run.head_sha;status=[string]$run.status;conclusion=[string]$run.conclusion};artifact=@{id=[Int64]$artifact.id;name=[string]$artifact.name;sizeInBytes=[Int64]$artifact.size_in_bytes;digest=[string]$artifact.digest;expired=[bool]$artifact.expired;expiresAt=([DateTimeOffset]$artifact.expires_at).ToUniversalTime().ToString('o');archiveDownloadUrl=[string]$artifact.archive_download_url;workflowRunId=[Int64]$artifact.workflow_run.id}}
  Write-PrivateJson $taskMetadata $metadata
  Invoke-Node @('metadata','--input',$taskMetadata)

  Set-TaskPhase 'ARTIFACT_DOWNLOAD'
  Invoke-WebRequest -Headers $headers -Uri 'https://api.github.com/repos/KG718718/spxt-public/actions/artifacts/10606870944/zip' -OutFile $taskZip -MaximumRedirection 5

  Set-TaskPhase 'ARCHIVE_HASH'
  if(('sha256:'+(Get-FileHash -LiteralPath $taskZip -Algorithm SHA256).Hash.ToLowerInvariant()) -ne 'sha256:4d88dd071fb9c14e85c2f2b0c5aab26f425ae25765c564ea275bc21483043f7f'){throw 'ARTIFACT_DIGEST'}

  Set-TaskPhase 'EXTRACT'
  Expand-Archive -LiteralPath $taskZip -DestinationPath $taskExtract

  Set-TaskPhase 'SETUP_IDENTITY'
  Invoke-Node @('setup','--root',$taskExtract)
  $setups=@(Get-ChildItem -LiteralPath $taskExtract -Recurse -File | Where-Object Name -eq 'K-SESSION-Setup-1.1.0-beta.1.exe')
  if($setups.Count -ne 1){throw 'SETUP_NOT_UNIQUE'}
  $setup=$setups[0].FullName

  Set-TaskPhase 'INSTALL'
  $setupExit=Invoke-SetupTreeAndWait -FileName $setup -InstallRoot $taskInstall -Instance $taskInstance `
    -Log $taskLog -StandardOutput $taskSetupStdout -StandardError $taskSetupStderr
  if($setupExit -ne 0){throw 'SETUP_FAILED'}
  $taskInstalled=$true

  Set-TaskPhase 'INSTALL_FOOTPRINT_OTHER'
  Invoke-InstalledFootprint
  Set-TaskPhase 'INSTALL_LOG_OTHER'
  Invoke-InstallLogCheck

  Set-TaskPhase 'REGISTRY_HKLM'
  if((Count-MachineSubkey $taskProductSubkey) -ne 0 -or (Count-MachineSubkey $taskBindingSubkey) -ne 0){throw 'REGISTRY_SCOPE_CONFLICT'}
  Set-TaskPhase 'REGISTRY_HKCU_READ'
  $snapshot=Read-Snapshot
  Set-TaskPhase 'REGISTRY_SNAPSHOT_WRITE'
  Write-PrivateJson $taskRawSnapshot $snapshot
  Set-TaskPhase 'REGISTRY_NORMALIZE_OTHER'
  Invoke-Normalize
  Set-TaskPhase 'REGISTRY_RESULT_READ'
  $snapshot=Get-Content -LiteralPath $taskSnapshot -Raw|ConvertFrom-Json
  Set-TaskPhase 'REGISTRY_UNIQUENESS'
  if($snapshot.registrations.Count -ne 1 -or $snapshot.bindings.Count -ne 1 -or $snapshot.registrations[0].view -ne $snapshot.bindings[0].view){throw 'REGISTRY_NOT_UNIQUE'}

  Set-TaskPhase 'COLLECT'
  Invoke-Node @('collect','--metadata',$taskMetadata,'--snapshot',$taskSnapshot,'--install-root',$taskInstall,'--output',$taskDraft)

  Set-TaskPhase 'UNINSTALL'
  $uninstaller=Join-Path $taskInstall 'uninstall\unins000.exe'
  & $uninstaller '/VERYSILENT' '/SUPPRESSMSGBOXES' '/NORESTART'
  $taskUninstallExit=$LASTEXITCODE
  if($taskUninstallExit -ne 0){throw 'UNINSTALL_FAILED'}
  $taskInstalled=$false

  Set-TaskPhase 'CLEANUP'
  $programAfter=Test-Path -LiteralPath $taskInstall
  $uninstallCount=Count-Subkey $taskProductSubkey
  $desktopAfter=Test-Path -LiteralPath $taskDesktopLink
  $programsAfter=Test-Path -LiteralPath $taskProgramsLink
  $bindingAfter=Count-Subkey $taskBindingSubkey
  $instanceAfter=Test-Path -LiteralPath $taskInstance
  if($programAfter -or $uninstallCount -ne 0 -or $desktopAfter -or $programsAfter -or $bindingAfter -ne 1 -or !$instanceAfter){throw 'UNINSTALL_CONTRACT'}
  Remove-OwnedBinding
  Assert-TaskPath $taskInstance
  Remove-Item -LiteralPath $taskInstance -Recurse -Force
  foreach($payloadPath in @($taskExtract,$taskZip,$taskInstall,$taskLog,$taskSetupStdout,$taskSetupStderr,$taskRawSnapshot,$taskSnapshot)){
    if(Test-Path -LiteralPath $payloadPath){Assert-TaskPath $payloadPath;Remove-Item -LiteralPath $payloadPath -Recurse -Force}
  }
  $payloadRemoved=(@($taskExtract,$taskZip,$taskInstall,$taskLog,$taskSetupStdout,$taskSetupStderr,$taskRawSnapshot,$taskSnapshot)|Where-Object{Test-Path -LiteralPath $_}).Count -eq 0
  $cleanup=@{uninstallerExitCode=$taskUninstallExit;programRootExistsAfterUninstall=$programAfter;uninstallRegistrationCountAfterUninstall=$uninstallCount;desktopShortcutExistsAfterUninstall=$desktopAfter;startMenuShortcutExistsAfterUninstall=$programsAfter;bindingRetainedAfterUninstall=($bindingAfter -eq 1);instanceRetainedAfterUninstall=$instanceAfter;bindingRegistrationCountAfterHarnessCleanup=(Count-Subkey $taskBindingSubkey);instanceExistsAfterHarnessCleanup=(Test-Path -LiteralPath $taskInstance);temporaryPayloadRemoved=$true}
  $cleanup.temporaryPayloadRemoved=$payloadRemoved
  Write-PrivateJson $taskCleanup $cleanup

  Set-TaskPhase 'FINALIZE'
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($OutputFile)))|Out-Null
  Invoke-Node @('finalize','--draft',$taskDraft,'--cleanup',$taskCleanup,'--output',$OutputFile)
  Invoke-Node @('verify','--input',$OutputFile)
  $taskFinalized=$true
  Write-Output 'HISTORICAL_IDENTITY_PASS'
} catch {
  if($taskAllowedPhases -notcontains $taskPhase){$taskPhase='HOSTED_PREFLIGHT'}
  [Console]::Error.WriteLine('HISTORICAL_IDENTITY_BLOCKED_'+$taskPhase)
  exit 1
} finally {
  $env:GITHUB_TOKEN=$null;$taskToken=$null
  if($taskInstalled -and (Test-Path -LiteralPath (Join-Path $taskInstall 'uninstall\unins000.exe'))){& (Join-Path $taskInstall 'uninstall\unins000.exe') '/VERYSILENT' '/SUPPRESSMSGBOXES' '/NORESTART' 2>$null | Out-Null}
  try{Remove-OwnedBinding}catch{}
  if(!$taskDesktopWasPresent -and (Test-Path -LiteralPath $taskDesktopLink)){Remove-Item -LiteralPath $taskDesktopLink -Force -ErrorAction SilentlyContinue}
  if(!$taskProgramsWasPresent -and (Test-Path -LiteralPath $taskProgramsLink)){Remove-Item -LiteralPath $taskProgramsLink -Force -ErrorAction SilentlyContinue}
  if($taskWorkCreated -and (Test-Path -LiteralPath $taskWork)){Assert-TaskPath $taskWork;Remove-Item -LiteralPath $taskWork -Recurse -Force -ErrorAction SilentlyContinue}
  if(!$taskOutputWasPresent -and !$taskFinalized -and (Test-Path -LiteralPath $OutputFile)){Remove-Item -LiteralPath $OutputFile -Force -ErrorAction SilentlyContinue}
}
