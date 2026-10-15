param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Commit,
  [string]$NodeDir,
  [string]$GoRoot,
  [switch]$FreshTrial,
  [string]$BuildDiagnostic=''
)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$FreshTrial=$true
function Build-Stage([string]$Stage){if($BuildDiagnostic){[IO.File]::WriteAllText($BuildDiagnostic,(@{stage=$Stage;classification='COMMAND_FAILED';script=$null;line=$null}|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}}
Build-Stage 'RUNTIME'
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
. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1')
$taskBuildVariables=@('GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','TEMP','TMP','GOTMPDIR','GOCACHE','KSESSION_FRESH_BUILD_NODE','KSESSION_FIREWALL_TEST_ROOT')
$taskBuildSnapshot=Save-KSessionProcessEnvironment $taskBuildVariables
try{
$env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOWORK='off';$env:GOFLAGS='';$env:GOEXPERIMENT=''
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
$env:KSESSION_FRESH_BUILD_NODE=$taskNode
$taskBuild=Join-Path $taskWork 'runtime-build';New-Item -ItemType Directory -Path $taskBuild|Out-Null
$taskDeriveProfile=if($FreshTrial){'fresh-trial'}else{'standard'}
Run-Checked $taskNode @((Join-Path $taskRepo 'tools/windows-runtime/build.cjs'),$Commit,$taskBuild,$NodeDir,$taskGit,$taskDeriveProfile)
$taskRoot=Join-Path $taskWork '暂存程序 中文 with spaces'
Copy-Item -LiteralPath (Join-Path $taskBuild 'KSESSION-RUNTIME') -Destination $taskRoot -Recurse
$taskPackageScript=Join-Path $taskRepo 'tools/windows-portable/package-lan.cjs'
Run-Checked $taskNode @($taskPackageScript,'prepare',$taskRoot,$GoRoot)
$taskManifest=Join-Path $taskRoot 'manifest/runtime-manifest.json'
$taskRuntimeHash=(Get-FileHash -LiteralPath $taskManifest -Algorithm SHA256).Hash.ToLower()
$taskNodeHash=(Get-FileHash -LiteralPath (Join-Path $taskRoot 'runtime/node.exe') -Algorithm SHA256).Hash.ToLower()
$taskHelper=Join-Path $taskWork 'firewall-helper-output'
$taskFirewallBuildReport=Join-Path $taskWork 'firewall-build-diagnostic.json'
$taskFirewallBuildLog=Join-Path $taskWork 'firewall-build-entry.log'
Build-Stage 'HELPER'
& pwsh -NoLogo -NoProfile -File (Join-Path $taskRepo 'tools/windows-firewall/build.ps1') -OutputDir $taskHelper -SourceCommit $Commit `
  -RuntimeManifestSha256 $taskRuntimeHash -NodeSha256 $taskNodeHash -InstallerVersion '1.1.0-beta.4' -GoExe $taskGo -DiagnosticReport $taskFirewallBuildReport -FreshTrial:$FreshTrial -FreshBuildDiagnostic $BuildDiagnostic *> $taskFirewallBuildLog
if($LASTEXITCODE -ne 0){throw 'Firewall helper build failed'}
$taskGoTestPolicy=Join-Path $taskRepo 'tools/tests/lan-host/expected-go-tests.cjs'
Build-Stage 'HELPER_UNIT_POLICY'
$taskFirewallTests=@(& $taskNode $taskGoTestPolicy 'FIREWALL'|ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Fixed firewall test policy failed'}
$taskFirewallRaw=Join-Path $taskWork 'firewall-tests.jsonl';$taskFirewallReport=Join-Path $taskWork 'firewall-unit-report.json'
$taskFirewallEnvironment=$null
try{
  Build-Stage 'HELPER_UNIT_GO_JSON'
  $taskFirewallEnvironment=Enter-KSessionFirewallTestEnvironment (Resolve-KSessionFirewallPhysicalPath $env:TEMP) ('firewall-unit-'+$PID+'-'+[guid]::NewGuid().ToString('N')+'-env')
  Push-Location (Join-Path $taskRepo 'tools/windows-firewall')
  try{
    & $taskGo test -json -count=1 -run ('^(' + ($taskFirewallTests -join '|') + ')$') . | Set-Content -Encoding utf8 -LiteralPath $taskFirewallRaw
    $taskFirewallUnitExit=$LASTEXITCODE
  }finally{Pop-Location}
}finally{if($null-ne$taskFirewallEnvironment){Exit-KSessionFirewallTestEnvironment $taskFirewallEnvironment}}
if($BuildDiagnostic){
  & $taskNode (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/helper-go-diagnostic.cjs') $taskFirewallRaw $BuildDiagnostic $taskFirewallUnitExit UNIT
  if($LASTEXITCODE -ne 0){throw 'Explicit helper unit evidence failed'}
}
if($taskFirewallUnitExit -ne 0){throw 'Explicit firewall unit and isolated cmdlet tests failed'}
Build-Stage 'HELPER_UNIT_REPORT'
Run-Checked $taskNode (@((Join-Path $taskRepo 'tools/tests/lan-host/go-test-report.cjs'),$taskFirewallRaw,$taskFirewallReport,'FIREWALL')+$taskFirewallTests)
$taskHelperHash=(Get-FileHash -LiteralPath (Join-Path $taskHelper 'K-SESSION-Firewall.exe') -Algorithm SHA256).Hash.ToLower()
$taskLauncher=Join-Path $taskWork 'launcher-output'
Build-Stage 'LAUNCHER'
$taskLauncherBuildVariables=@('GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOCACHE','GOTMPDIR','TEMP','TMP','GOPROXY','GOSUMDB','GOENV','GOFLAGS','GOEXPERIMENT')
Invoke-KSessionWithRestoredEnvironment $taskLauncherBuildVariables {
  & (Join-Path $taskRepo 'tools/windows-launcher/build.ps1') -RuntimeRoot $taskRoot -OutputDir $taskLauncher `
    -SourceCommit $Commit -FirewallHelperSha256 $taskHelperHash -GoExe $taskGo -FreshTrial:$FreshTrial -BuildDiagnostic $BuildDiagnostic
  if($LASTEXITCODE -ne 0){throw 'LAN Launcher build failed'}
}
Build-Stage 'LAUNCHER_UNIT'
$taskLauncherUnitVariables=@('GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','TEMP','TMP','GOTMPDIR','GOCACHE')
$taskLauncherUnitSnapshot=Save-KSessionProcessEnvironment $taskLauncherUnitVariables
$taskLauncherUnitEnvironment=$null
try{
Build-Stage 'LAUNCHER_UNIT_ENVIRONMENT'
$taskLauncherUnitEnvironment=Enter-KSessionLanCandidateTestEnvironment (Resolve-KSessionFirewallPhysicalPath $taskWork) ('candidate-launcher-unit-'+$PID+'-'+[guid]::NewGuid().ToString('N')+'-env')
$env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOWORK='off';$env:GOFLAGS='';$env:GOEXPERIMENT=''
Build-Stage 'LAUNCHER_UNIT_POLICY'
$taskLauncherUnitTests=@(& $taskNode $taskGoTestPolicy 'LAUNCHER'|ConvertFrom-Json)
if($LASTEXITCODE -ne 0){throw 'Fixed Launcher test policy failed'}
$taskLauncherRaw=Join-Path $taskWork 'launcher-tests.jsonl';$taskLauncherReport=Join-Path $taskWork 'launcher-unit-report.json'
Build-Stage 'LAUNCHER_UNIT_GO_JSON'
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try{
  & $taskGo test -json -count=1 -run ('^(' + ($taskLauncherUnitTests -join '|') + ')$') . | Set-Content -Encoding utf8 -LiteralPath $taskLauncherRaw
  $taskLauncherUnitExit=$LASTEXITCODE
}finally{Pop-Location}
if($BuildDiagnostic){
  & $taskNode (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/unit-diagnostic.cjs') $taskLauncherRaw $BuildDiagnostic $taskLauncherUnitExit
  if($LASTEXITCODE -ne 0){throw 'Explicit Launcher unit evidence failed'}
}
if($taskLauncherUnitExit -ne 0){throw 'Explicit Launcher unit tests failed'}
Build-Stage 'LAUNCHER_UNIT_REPORT'
Run-Checked $taskNode (@((Join-Path $taskRepo 'tools/tests/lan-host/go-test-report.cjs'),$taskLauncherRaw,$taskLauncherReport,'LAUNCHER')+$taskLauncherUnitTests)
}finally{
  try{if($null-ne$taskLauncherUnitEnvironment){Exit-KSessionLanCandidateTestEnvironment $taskLauncherUnitEnvironment}}finally{
  Restore-KSessionProcessEnvironment $taskLauncherUnitSnapshot
  if(!(Test-KSessionProcessEnvironmentRestored $taskLauncherUnitSnapshot)){
    Build-Stage 'LAUNCHER_UNIT_ENVIRONMENT'
    if($BuildDiagnostic){[IO.File]::WriteAllText($BuildDiagnostic,(@{stage='LAUNCHER_UNIT_ENVIRONMENT';classification='ENV_RESTORE_FAILED';script=$null;line=$null}|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
    throw 'Launcher unit environment restoration failed'
  }
  }
}
Build-Stage 'PAYLOAD_ASSEMBLY'
Run-Checked $taskNode @($taskPackageScript,'finish',$taskRoot,$taskLauncher,$taskHelper,$taskGit,$taskRepo,$Commit)
Build-Stage 'LAN_NODE'
$taskLanTests=@(
  'tools/tests/lan-host/config.test.cjs','tools/tests/lan-host/network.test.cjs','tools/tests/lan-host/lan2-network.test.cjs',
  'tools/tests/lan-host/server.test.cjs','tools/tests/lan-host/server-startup.test.cjs',
  'tools/tests/lan-host/server-runtime.test.cjs'
) | ForEach-Object {Join-Path $taskRepo $_}
$taskLauncherTests=@(Get-ChildItem -LiteralPath (Join-Path $taskRepo 'tools/tests/lan-host') -Filter 'launcher*.test.cjs' -File|ForEach-Object FullName)
if($taskLauncherTests.Count -eq 0){throw 'LAN Launcher contract tests missing'}
$taskRuntimeModules=Join-Path $taskRoot 'app/node_modules'
if(!(Test-Path -LiteralPath (Join-Path $taskRuntimeModules 'multer') -PathType Container)){throw 'Built Runtime dependency tree is incomplete'}
$taskRuntimeModules=Resolve-KSessionFirewallPhysicalPath $taskRuntimeModules
if((Get-KSessionFirewallTestPathClass $taskRuntimeModules) -ne 'CANONICAL'){throw 'Built Runtime dependency root is not canonical'}
$taskNodeTestReportPath=Join-Path $taskWork 'lan-node-test-environment.json'
$taskNodeTestReport=[ordered]@{schema=1;kind='k-session-lan-node-test-environment';qualification='TEST_ONLY';status='RUNNING';stage='ENVIRONMENT';reason='RUNNING';inputTempClass=(Get-KSessionFirewallTestPathClass $env:TEMP);selectedRootClass='PENDING';tests=0;pass=0;fail=0;skipped=0;environmentRestored=$false}
function Write-Node-Test-Report(){[IO.File]::WriteAllText($taskNodeTestReportPath,($taskNodeTestReport|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
Write-Node-Test-Report
$taskNodePathState=Save-KSessionProcessEnvironment @('NODE_PATH')
$taskNodeEnvironment=$null;$taskNodeTestsFailed=$false
try{
  $taskNodeEnvironment=Enter-KSessionLanNodeTestEnvironment (Resolve-KSessionFirewallPhysicalPath $env:TEMP) ('node-full-'+$PID+'-'+[guid]::NewGuid().ToString('N')+'-env')
  $taskNodeTestReport.selectedRootClass=$taskNodeEnvironment.SelectedRootClass;$taskNodeTestReport.stage='TESTS';Write-Node-Test-Report
  $env:NODE_PATH=$taskRuntimeModules
  Run-Checked $taskNode @((Join-Path $taskRepo 'tools/tests/fresh-lan-trial/runtime-dependency.cjs'),$taskRuntimeModules)
  $taskNodeRaw=Join-Path $taskNodeEnvironment.Root 'node-tests.tap'
  $taskNodeArguments=@('--test','--test-concurrency=1','--test-reporter=tap')+$taskLanTests+$taskLauncherTests
  & $taskNode @taskNodeArguments *> $taskNodeRaw
  $taskNodeExit=$LASTEXITCODE;$taskNodeSummary=Read-KSessionNodeTestSummary $taskNodeRaw
  $taskNodeTestReport.tests=$taskNodeSummary.Tests;$taskNodeTestReport.pass=$taskNodeSummary.Pass;$taskNodeTestReport.fail=$taskNodeSummary.Fail;$taskNodeTestReport.skipped=$taskNodeSummary.Skipped
  if(!$taskNodeSummary.Valid){$taskNodeTestReport.reason='NODE_TEST_REPORT_INVALID';throw 'NODE_TEST_REPORT_INVALID'}
  if($taskNodeExit-ne0-or$taskNodeSummary.Tests-ne44-or$taskNodeSummary.Pass-ne44-or$taskNodeSummary.Fail-ne0-or$taskNodeSummary.Skipped-ne0){$taskNodeTestReport.reason='NODE_TESTS_FAILED';throw 'NODE_TESTS_FAILED'}
  $taskNodeTestReport.status='PASS';$taskNodeTestReport.stage='COMPLETE';$taskNodeTestReport.reason='PASS'
}catch{
  if($taskNodeTestReport.reason-eq'RUNNING'){$taskNodeTestReport.reason='INTERNAL'}
  $taskNodeTestReport.status='FAIL';$taskNodeTestsFailed=$true
}finally{
  if($null-ne$taskNodeEnvironment){Exit-KSessionLanNodeTestEnvironment $taskNodeEnvironment}
  Restore-KSessionProcessEnvironment $taskNodePathState
  $taskNodeTestReport.environmentRestored=(Test-KSessionProcessEnvironmentRestored $taskNodePathState)-and($null-eq$taskNodeEnvironment-or(Test-KSessionProcessEnvironmentRestored $taskNodeEnvironment.Snapshot))
  if(!$taskNodeTestReport.environmentRestored){$taskNodeTestReport.status='FAIL';$taskNodeTestReport.stage='ENVIRONMENT';$taskNodeTestReport.reason='ENV_RESTORE_FAILED';$taskNodeTestsFailed=$true}
  Write-Node-Test-Report
}
if($taskNodeTestsFailed){Write-Output ('LAN_NODE_TESTS_FAILED stage='+$taskNodeTestReport.stage+' reason='+$taskNodeTestReport.reason);throw 'LAN Node contract tests failed'}
Build-Stage 'PAYLOAD_REPORT'
$taskArtifact=Join-Path $taskWork 'artifact';New-Item -ItemType Directory -Path $taskArtifact|Out-Null
$taskIdentityRaw=& $taskNode $taskPackageScript verify $taskRoot
if($LASTEXITCODE -ne 0){throw 'Fresh payload identity failed'}
$taskIdentity=$taskIdentityRaw|ConvertFrom-Json
$taskPayloadReport=[ordered]@{schema=1;kind='FRESH_PAYLOAD_IDENTITY';qualification='BUILD_AND_PURE_TESTS_ONLY';status='PASS';sourceCommit=$Commit;
  identity=$taskIdentity;productionExeRun=$false;
  firewallBuild=(Get-Content -Raw -LiteralPath $taskFirewallBuildReport|ConvertFrom-Json);
  firewallUnit=(Get-Content -Raw -LiteralPath $taskFirewallReport|ConvertFrom-Json);
  launcherUnit=(Get-Content -Raw -LiteralPath $taskLauncherReport|ConvertFrom-Json);
  nodeTestEnvironment=(Get-Content -Raw -LiteralPath $taskNodeTestReportPath|ConvertFrom-Json);
  firewallFreshPolicy=(Get-Content -Raw -LiteralPath (Join-Path $taskHelper 'fresh-policy-report.json')|ConvertFrom-Json);
  launcherFreshPolicy=(Get-Content -Raw -LiteralPath (Join-Path $taskLauncher 'fresh-policy-report.json')|ConvertFrom-Json)}
$taskPayloadReport|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (Join-Path $taskArtifact 'fresh-payload-report.json') -Encoding utf8
}finally{
  Restore-KSessionProcessEnvironment $taskBuildSnapshot
  if(!(Test-KSessionProcessEnvironmentRestored $taskBuildSnapshot)){
    if($BuildDiagnostic){[IO.File]::WriteAllText($BuildDiagnostic,(@{stage='BUILD_ENVIRONMENT';classification='ENV_RESTORE_FAILED';script=$null;line=$null}|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
    throw 'Fresh payload environment restoration failed'
  }
}
