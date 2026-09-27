param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Commit,
  [string]$NodeDir,
  [string]$GoRoot
)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh isolated E output required'}
$taskGit=(Get-Command git).Source
if((& $taskGit -C $taskRepo rev-parse HEAD).Trim() -ne $Commit){throw 'Must build checkout HEAD'}
if((& $taskGit -C $taskRepo status --porcelain --untracked-files=no)){throw 'Tracked changes cannot enter LAN candidate'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskPin=Get-Content -Raw (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json')|ConvertFrom-Json
$taskDist=Get-Content -Raw (Join-Path $taskRepo 'tools/installer/distribution.json')|ConvertFrom-Json
function Run-Checked([string]$exe,[string[]]$arguments){
  & $exe @arguments
  if($LASTEXITCODE -ne 0){throw "Command failed: $exe (exit $LASTEXITCODE)"}
}
function Get-Pinned($url,$hash,$zip,$destination){
  Invoke-WebRequest -Uri $url -OutFile $zip -TimeoutSec 240
  if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLower() -ne $hash){throw 'Tool archive hash mismatch'}
  Expand-Archive -LiteralPath $zip -DestinationPath $destination
}
if(!$GoRoot){
  Get-Pinned $taskPin.goWindowsZip $taskPin.sha256 (Join-Path $taskWork 'go.zip') (Join-Path $taskWork 'go-tool')
  $GoRoot=Join-Path $taskWork 'go-tool/go'
}
if(!$NodeDir){
  Get-Pinned $taskDist.nodeUrl $taskDist.nodeArchiveSha256 (Join-Path $taskWork 'node.zip') (Join-Path $taskWork 'node-tool')
  $NodeDir=Join-Path $taskWork "node-tool/node-v$($taskDist.nodeVersion)-win-x64"
}
$taskGo=Join-Path $GoRoot 'bin/go.exe'
$taskNode=Join-Path $NodeDir 'node.exe'
$taskBuild=Join-Path $taskWork 'runtime-build';New-Item -ItemType Directory -Path $taskBuild|Out-Null
Run-Checked $taskNode @((Join-Path $taskRepo 'tools/windows-runtime/build.cjs'),$Commit,$taskBuild,$NodeDir,$taskGit)
$taskRoot=Join-Path $taskWork '暂存程序 中文 with spaces'
Copy-Item -LiteralPath (Join-Path $taskBuild 'KSESSION-RUNTIME') -Destination $taskRoot -Recurse
$taskPackageScript=Join-Path $PSScriptRoot 'package-lan.cjs'
Run-Checked $taskNode @($taskPackageScript,'prepare',$taskRoot,$GoRoot)
$taskManifest=Join-Path $taskRoot 'manifest/runtime-manifest.json'
$taskRuntimeHash=(Get-FileHash -LiteralPath $taskManifest -Algorithm SHA256).Hash.ToLower()
$taskNodeHash=(Get-FileHash -LiteralPath (Join-Path $taskRoot 'runtime/node.exe') -Algorithm SHA256).Hash.ToLower()
$taskHelper=Join-Path $taskWork 'firewall-helper-output'
$taskFirewallBuildReport=Join-Path $taskWork 'firewall-build-diagnostic.json'
$taskFirewallBuildLog=Join-Path $taskWork 'firewall-build-entry.log'
& pwsh -NoLogo -NoProfile -File (Join-Path $taskRepo 'tools/windows-firewall/build.ps1') -OutputDir $taskHelper -SourceCommit $Commit `
  -RuntimeManifestSha256 $taskRuntimeHash -NodeSha256 $taskNodeHash -InstallerVersion '1.1.0-beta.3' -GoExe $taskGo -DiagnosticReport $taskFirewallBuildReport *> $taskFirewallBuildLog
if($LASTEXITCODE -ne 0){throw 'Firewall helper build failed'}
$taskGoTestPolicy=Join-Path $taskRepo 'tools/tests/lan-host/expected-go-tests.cjs'
$taskFirewallTests=@(& $taskNode $taskGoTestPolicy 'FIREWALL'|ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Fixed firewall test policy failed'}
$taskFirewallRaw=Join-Path $taskWork 'firewall-tests.jsonl';$taskFirewallReport=Join-Path $taskWork 'firewall-unit-report.json'
$taskFirewallEnvironment=$null
. (Join-Path $taskRepo 'tools/windows-firewall/test-environment.ps1')
try{
  $taskFirewallEnvironment=Enter-KSessionFirewallTestEnvironment (Resolve-KSessionFirewallPhysicalPath $env:TEMP) ('firewall-unit-'+$PID+'-'+[guid]::NewGuid().ToString('N')+'-env')
  Push-Location (Join-Path $taskRepo 'tools/windows-firewall')
  try{
    & $taskGo test -json -count=1 -run ('^(' + ($taskFirewallTests -join '|') + ')$') . | Set-Content -Encoding utf8 -LiteralPath $taskFirewallRaw
    if($LASTEXITCODE -ne 0){throw 'Explicit firewall unit and isolated cmdlet tests failed'}
  }finally{Pop-Location}
}finally{if($null-ne$taskFirewallEnvironment){Exit-KSessionFirewallTestEnvironment $taskFirewallEnvironment}}
Run-Checked $taskNode (@((Join-Path $taskRepo 'tools/tests/lan-host/go-test-report.cjs'),$taskFirewallRaw,$taskFirewallReport,'FIREWALL')+$taskFirewallTests)
$taskHelperHash=(Get-FileHash -LiteralPath (Join-Path $taskHelper 'K-SESSION-Firewall.exe') -Algorithm SHA256).Hash.ToLower()
$taskLauncher=Join-Path $taskWork 'launcher-output'
& (Join-Path $taskRepo 'tools/windows-launcher/build.ps1') -RuntimeRoot $taskRoot -OutputDir $taskLauncher `
  -SourceCommit $Commit -FirewallHelperSha256 $taskHelperHash -GoExe $taskGo
if($LASTEXITCODE -ne 0){throw 'LAN Launcher build failed'}
$taskLauncherUnitTests=@(& $taskNode $taskGoTestPolicy 'LAUNCHER'|ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Fixed Launcher test policy failed'}
$taskLauncherRaw=Join-Path $taskWork 'launcher-tests.jsonl';$taskLauncherReport=Join-Path $taskWork 'launcher-unit-report.json'
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try{
  & $taskGo test -json -count=1 -run ('^(' + ($taskLauncherUnitTests -join '|') + ')$') . | Set-Content -Encoding utf8 -LiteralPath $taskLauncherRaw
  if($LASTEXITCODE -ne 0){throw 'Explicit Launcher unit tests failed'}
}finally{Pop-Location}
Run-Checked $taskNode (@((Join-Path $taskRepo 'tools/tests/lan-host/go-test-report.cjs'),$taskLauncherRaw,$taskLauncherReport,'LAUNCHER')+$taskLauncherUnitTests)
Run-Checked $taskNode @($taskPackageScript,'finish',$taskRoot,$taskLauncher,$taskHelper,$taskGit,$taskRepo,$Commit)
$taskLanTests=@(
  'tools/tests/lan-host/config.test.cjs','tools/tests/lan-host/network.test.cjs',
  'tools/tests/lan-host/server.test.cjs','tools/tests/lan-host/server-startup.test.cjs',
  'tools/tests/lan-host/server-runtime.test.cjs'
) | ForEach-Object {Join-Path $taskRepo $_}
$taskLauncherTests=@(Get-ChildItem -LiteralPath (Join-Path $taskRepo 'tools/tests/lan-host') -Filter 'launcher*.test.cjs' -File|ForEach-Object FullName)
if($taskLauncherTests.Count -eq 0){throw 'LAN Launcher contract tests missing'}
$taskRuntimeModules=Join-Path $taskRoot 'app/node_modules'
if(!(Test-Path -LiteralPath (Join-Path $taskRuntimeModules 'multer') -PathType Container)){throw 'Built Runtime dependency tree is incomplete'}
$taskPreviousNodePath=$env:NODE_PATH
$env:NODE_PATH=$taskRuntimeModules
try{
  Run-Checked $taskNode @('-e',"const p=require.resolve('multer');if(!p.startsWith(process.env.NODE_PATH))process.exit(23)")
  Run-Checked $taskNode (@('--test')+$taskLanTests+$taskLauncherTests)
}finally{
  if($null -eq $taskPreviousNodePath){Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue}else{$env:NODE_PATH=$taskPreviousNodePath}
}
$taskArtifact=Join-Path $taskWork 'artifact';New-Item -ItemType Directory -Path $taskArtifact|Out-Null
$env:KSESSION_TEST_LAUNCHER=Join-Path $taskRoot 'K-SESSION.exe'
$env:KSESSION_TEST_EVIDENCE=Join-Path $taskWork 'launcher-integration'
$env:KSESSION_PORTABLE_REPO=$taskRepo
$taskHarness=Join-Path $taskWork 'lan-go-harness'
Run-Checked $taskNode @((Join-Path $taskRepo 'tools/tests/windows-installer/beta3-upgrade/prepare-hosted-harness.cjs'),(Join-Path $taskRepo 'tools/windows-launcher'),$taskHarness)
$taskOverlay=Join-Path $taskWork 'lan-go-overlay.json'
@{Replace=@{
  ([IO.Path]::GetFullPath((Join-Path $taskRepo 'tools/windows-launcher/integration_windows_test.go')))=[IO.Path]::GetFullPath((Join-Path $taskHarness 'integration_windows_test.go'))
  ([IO.Path]::GetFullPath((Join-Path $taskRepo 'tools/windows-launcher/portable_windows_test.go')))=[IO.Path]::GetFullPath((Join-Path $taskHarness 'portable_windows_test.go'))
}}|ConvertTo-Json -Depth 4|Set-Content -Encoding utf8 -LiteralPath $taskOverlay
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try{
  Run-Checked $taskGo @('vet','./...')
  Run-Checked $taskGo @('test',('-overlay='+$taskOverlay),'-count=1','-v','-run','^TestLauncherIntegration$','.')
  $env:KSESSION_PORTABLE_ROOT=$taskRoot
  $env:KSESSION_PORTABLE_EVIDENCE=Join-Path $taskWork 'portable-staging'
  Run-Checked $taskGo @('test',('-overlay='+$taskOverlay),'-count=1','-v','-run','^TestPortable$','.')
  Run-Checked $taskNode @($taskPackageScript,'archive',$taskRoot,$taskArtifact,(Join-Path $env:KSESSION_PORTABLE_EVIDENCE 'portable-test-report.json'))
  $taskExtract=Join-Path $taskWork '解包程序 中文 with spaces'
  Expand-Archive -LiteralPath (Join-Path $taskArtifact 'K-SESSION-portable-lan-beta-win-x64.zip') -DestinationPath $taskExtract
  $env:KSESSION_PORTABLE_ROOT=Join-Path $taskExtract 'K-SESSION'
  $env:KSESSION_PORTABLE_EVIDENCE=Join-Path $taskWork 'portable-extracted'
  Run-Checked $taskNode @($taskPackageScript,'verify',$env:KSESSION_PORTABLE_ROOT)
  Run-Checked $taskGo @('test',('-overlay='+$taskOverlay),'-count=1','-v','-run','^TestPortable$','.')
}finally{Pop-Location}
$taskStaging=Get-Content -Raw (Join-Path $taskWork 'portable-staging/portable-test-report.json')|ConvertFrom-Json
$taskExtracted=Get-Content -Raw (Join-Path $taskWork 'portable-extracted/portable-test-report.json')|ConvertFrom-Json
$taskIdentity=Get-Content -Raw (Join-Path $taskArtifact 'zip-identity.json')|ConvertFrom-Json
$taskFirewallUnit=Get-Content -Raw $taskFirewallReport|ConvertFrom-Json
$taskFirewallBuild=Get-Content -Raw $taskFirewallBuildReport|ConvertFrom-Json
$taskLauncherUnit=Get-Content -Raw $taskLauncherReport|ConvertFrom-Json
$taskLauncherIntegration=Get-Content -Raw (Join-Path $taskWork 'launcher-integration/integration.json')|ConvertFrom-Json
$taskIntegrationExpected=@(& $taskNode $taskGoTestPolicy 'INTEGRATION_IDS'|ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Fixed Launcher integration policy failed'}
$taskIntegrationActual=@($taskLauncherIntegration.checks|ForEach-Object {($_ -split ' ',2)[0]})
if($taskLauncherIntegration.status -ne 'PASS' -or
   (Compare-Object -SyncWindow 0 $taskIntegrationExpected $taskIntegrationActual)){throw 'Launcher integration evidence is incomplete'}
$taskIntegrationSummary=[ordered]@{status='PASS';expectedChecks=$taskIntegrationExpected;pass=$taskIntegrationActual.Count;fail=0;skipped=0}
@{status='PASS';sourceCommit=$Commit;zipSha256=$taskIdentity.zipSha256;firewallHelperSha256=$taskHelperHash;
  staging=$taskStaging;extracted=$taskExtracted;firewallBuild=$taskFirewallBuild;firewallUnit=$taskFirewallUnit;launcherUnit=$taskLauncherUnit;launcherIntegration=$taskIntegrationSummary;
  humanWin10='PENDING; no real LAN or browser claim'}|ConvertTo-Json -Depth 30|
  Set-Content -Encoding utf8 (Join-Path $taskArtifact 'portable-test-report.json')
Copy-Item -LiteralPath (Join-Path $taskRoot 'build-info.json') -Destination $taskArtifact
Copy-Item -LiteralPath $taskManifest -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskWork 'launcher-integration/integration.json') -Destination $taskArtifact
(Get-Content -Raw $taskManifest|ConvertFrom-Json).licenses|ConvertTo-Json -Depth 20|Set-Content -Encoding utf8 (Join-Path $taskArtifact 'license-summary.json')
foreach($taskEntry in Get-ChildItem -LiteralPath $taskArtifact){
  if($taskEntry.PSIsContainer -or $taskEntry.Name -notin @('K-SESSION-portable-lan-beta-win-x64.zip','SHA256SUMS.txt','zip-identity.json','portable-test-report.json','build-info.json','runtime-manifest.json','integration.json','license-summary.json')){throw 'Unexpected LAN portable artifact content'}
}
Write-Output 'LAN PORTABLE AUTOMATED GATES PASS; real Win10 LAN acceptance remains required'
