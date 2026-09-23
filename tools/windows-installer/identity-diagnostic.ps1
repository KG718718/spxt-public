param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Beta1Setup,
  [Parameter(Mandatory=$true)][string]$Bundle,
  [Parameter(Mandatory=$true)][string]$Node
)
$ErrorActionPreference='Stop'
$taskWork=[IO.Path]::GetFullPath($Work)
$taskSetup=[IO.Path]::GetFullPath($Beta1Setup)
$taskBundle=[IO.Path]::GetFullPath($Bundle)
$taskNode=[IO.Path]::GetFullPath($Node)
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted'){throw 'HOSTED_IDENTITY_DIAGNOSTIC_REQUIRED'}
foreach($taskPath in @($taskWork,$taskSetup,$taskBundle,$taskNode)){if($taskPath -notmatch '^E:\\'){throw 'FIXED_E_VOLUME_REQUIRED'}}
if((Test-Path -LiteralPath $taskWork) -or !(Test-Path -LiteralPath $taskSetup -PathType Leaf) -or
   !(Test-Path -LiteralPath $taskBundle -PathType Leaf) -or !(Test-Path -LiteralPath $taskNode -PathType Leaf)){throw 'IDENTITY_DIAGNOSTIC_INPUT_INVALID'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskInstall=Join-Path $taskWork 'installed-program'
$taskInstance=Join-Path $taskWork 'synthetic-instance'
$taskLog=Join-Path $taskWork 'private-setup.log'
$taskRequest=Join-Path $taskWork 'private-request.json'
$taskReport=Join-Path $taskWork 'IDENTITY-DIAGNOSTIC.json'
$taskProduct='Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1'
$taskBinding='Software\KSESSION\Beta\InstallerBinding'
try{
  $taskArgs=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',('/LOG='+$taskLog),('/DIR='+$taskInstall),('/INSTANCE='+$taskInstance),'/CONFIRMDATACHANGE=1')
  $taskProcess=Start-Process -FilePath $taskSetup -ArgumentList $taskArgs -Wait -PassThru -WindowStyle Hidden
  if($taskProcess.ExitCode -ne 0){throw 'BETA1_INSTALL_FAILED'}
  $taskBase=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,[Microsoft.Win32.RegistryView]::Registry64)
  try{
    $taskRegistration=$taskBase.OpenSubKey($taskProduct,$false);$taskBound=$taskBase.OpenSubKey($taskBinding,$false)
    if($null -eq $taskRegistration -or $null -eq $taskBound){throw 'BETA1_IDENTITY_MISSING'}
    try{
      $taskSnapshot=@{registrations=@(@{view='64';key=$taskProduct;displayName=[string]$taskRegistration.GetValue('DisplayName');displayVersion=[string]$taskRegistration.GetValue('DisplayVersion');installLocation=[string]$taskRegistration.GetValue('InstallLocation');uninstallString=[string]$taskRegistration.GetValue('UninstallString')});bindings=@(@{view='64';key=$taskBinding;installRoot=[string]$taskBound.GetValue('InstallRoot');instance=[string]$taskBound.GetValue('Instance')})}
    }finally{$taskRegistration.Dispose();$taskBound.Dispose()}
  }finally{$taskBase.Dispose()}
  $taskRoot=([string]$taskSnapshot.registrations[0].installLocation).TrimEnd('\')
  $taskInstanceRoot=([string]$taskSnapshot.bindings[0].instance).TrimEnd('\')
  @{schema=1;snapshot=$taskSnapshot;preflight=@{installRoot=$taskRoot;instancePath=$taskInstanceRoot}}|
    ConvertTo-Json -Depth 8 -Compress|Set-Content -LiteralPath $taskRequest -Encoding utf8NoBOM
  $taskReason=(& $taskNode (Join-Path $PSScriptRoot 'identity-diagnostic.cjs') $taskRequest $taskBundle $taskReport).Trim()
  if($LASTEXITCODE -ne 0 -or $taskReason -notmatch '^IDENTITY_(ACCEPTED|REGISTRATION|BINDING|PATH|MANIFEST|PROGRAM|BUILD|RUNTIME|LAUNCHER|INTERNAL)$'){throw 'IDENTITY_DIAGNOSTIC_FAILED'}
  Write-Output $taskReason
}finally{
  Remove-Item -LiteralPath $taskRequest,$taskLog -Force -ErrorAction SilentlyContinue
}
