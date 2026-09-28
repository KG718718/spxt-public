param(
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [Parameter(Mandatory=$true)][string]$SourceCommit,
  [Parameter(Mandatory=$true)][string]$RuntimeManifestSha256,
  [Parameter(Mandatory=$true)][string]$NodeSha256,
  [Parameter(Mandatory=$true)][string]$InstallerVersion,
  [string]$GoExe='go',
  [string]$DiagnosticReport=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($SourceCommit -notmatch '^[a-f0-9]{40}$'){throw 'Exact source commit required'}
if($RuntimeManifestSha256 -notmatch '^[a-f0-9]{64}$'){throw 'Exact runtime manifest SHA256 required'}
if($NodeSha256 -ne 'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32'){throw 'Pinned Node SHA256 required'}
if($InstallerVersion -ne '1.1.0-beta.4'){throw 'Batch LAN-2 beta.4 installer version required'}
$taskOutput=[IO.Path]::GetFullPath($OutputDir)
if(Test-Path -LiteralPath $taskOutput){throw 'Output must be new'}
if((& $GoExe version) -ne 'go version go1.27.1 windows/amd64'){throw 'Pinned Go 1.27.1 Windows amd64 required'}
. (Join-Path $PSScriptRoot 'test-environment.ps1')
$taskInputTempClass=Get-KSessionFirewallTestPathClass $env:TEMP
$taskInputTmpClass=Get-KSessionFirewallTestPathClass $env:TMP
$taskInputGoTmpClass=Get-KSessionFirewallTestPathClass $env:GOTMPDIR
$taskPhysicalParent=Resolve-KSessionFirewallPhysicalPath $env:TEMP
$taskReportPath=''
if($DiagnosticReport){
  $taskReportPath=[IO.Path]::GetFullPath($DiagnosticReport)
  if(Test-Path -LiteralPath $taskReportPath){throw 'Diagnostic report must be new'}
  if(!(Test-Path -LiteralPath (Split-Path $taskReportPath -Parent) -PathType Container)){throw 'Diagnostic report parent missing'}
}
$taskExpectedTests=@('TestRequestWhitelistAndInterfaceName','TestStrictDeploymentConfig','TestStrictDeploymentConfigExactKeyCorpus','TestInstallIdentityAndTampering','TestReparseResolutionMismatchIsRejected','TestCleanPathComparisonRejectsLexicalAliases','TestBoundConfigMustMatchRequest','TestRegistrationAndINIContracts','TestRuleOwnershipAndIdempotencyPolicy','TestEmbeddedFirewallScriptIsClosed','TestEmbeddedFirewallScriptParses','TestStatusOutputAllowlist','TestFirewallScriptBehaviorWithIsolatedCmdletHarness')
$taskReport=[ordered]@{schema=1;kind='k-session-firewall-build-diagnostic';qualification='TEST_BUILD_ONLY';status='RUNNING';stage='PREFLIGHT';reason='INPUT_ENV_CAPTURED';sourceCommit=$SourceCommit;inputTempClass=$taskInputTempClass;inputTmpClass=$taskInputTmpClass;inputGoTmpClass=$taskInputGoTmpClass;fixtureRootSource='OWNED_PHYSICAL';testsPass=0;testsFail=0;testsSkipped=0;packagePass=$false;compileReached=$false}
function Write-FixedReport(){if($taskReportPath){[IO.File]::WriteAllText($taskReportPath,($taskReport|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}}
Write-FixedReport
$env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOFLAGS='';$env:GOEXPERIMENT=''
$flags="-H windowsgui -s -w -buildid= -X main.buildSourceCommit=$SourceCommit -X main.buildRuntimeManifestSHA256=$RuntimeManifestSha256 -X main.buildNodeSHA256=$NodeSha256 -X main.buildInstallerVersion=$InstallerVersion"
$taskEnvironment=$null
$taskFailed=$false
try {
  $taskEnvironment=Enter-KSessionFirewallTestEnvironment $taskPhysicalParent ('firewall-build-'+$PID+'-'+[guid]::NewGuid().ToString('N')+'-env')
  $taskReport.stage='TESTS';$taskReport.reason='RUNNING';Write-FixedReport
  $taskRaw=Join-Path $taskEnvironment.Root 'go-test.jsonl'
  [IO.File]::WriteAllText($taskRaw,'',[Text.UTF8Encoding]::new($false))
  Push-Location $PSScriptRoot
  try{& $GoExe test -json -count=1 ./... *> $taskRaw;$taskTestExit=$LASTEXITCODE}finally{Pop-Location}
  $taskSummary=Read-KSessionGoTestSummary $taskRaw;$taskJSONInvalid=$taskSummary.JSONInvalid
  $taskFailedNames=@($taskSummary.FailedNames);$taskSkippedNames=@($taskSummary.SkippedNames);$taskPassed=@($taskSummary.Passed)
  $taskExpectedSorted=@($taskExpectedTests|Sort-Object);$taskPassedSorted=@($taskPassed|Sort-Object)
  $taskExactTests=!(Compare-Object -ReferenceObject $taskExpectedSorted -DifferenceObject $taskPassedSorted)
  $taskReport.testsPass=$taskPassed.Count;$taskReport.testsFail=$taskFailedNames.Count;$taskReport.testsSkipped=$taskSkippedNames.Count;$taskReport.packagePass=($taskSummary.PackagePass-eq1-and$taskSummary.PackageFail-eq0)
  if($taskTestExit -ne 0 -or $taskJSONInvalid -or !$taskExactTests -or !$taskReport.packagePass -or $taskFailedNames.Count -ne 0 -or $taskSkippedNames.Count -ne 0){
    $taskReport.status='FAIL'
    if($taskFailedNames -contains 'TestInstallIdentityAndTampering'){$taskReport.reason='FIXTURE_INSTALL_PATH'}
    elseif($taskFailedNames -contains 'TestBoundConfigMustMatchRequest'){$taskReport.reason='FIXTURE_INSTANCE_PATH'}
    elseif($taskFailedNames -contains 'TestRegistrationAndINIContracts'){$taskReport.reason='FIXTURE_REGISTRATION'}
    else{$taskReport.reason='TESTS_FAILED'}
    Write-FixedReport;throw 'Firewall helper tests failed'
  }
  $taskReport.stage='COMPILE';$taskReport.reason='RUNNING';$taskReport.compileReached=$true;Write-FixedReport
  New-Item -ItemType Directory -Path $taskOutput | Out-Null
  $taskBuildRaw=Join-Path $taskEnvironment.Root 'go-build.log'
  [IO.File]::WriteAllText($taskBuildRaw,'',[Text.UTF8Encoding]::new($false))
  Push-Location $PSScriptRoot
  try{& $GoExe build -trimpath -buildvcs=false -ldflags $flags -o (Join-Path $taskOutput 'K-SESSION-Firewall.exe') . *> $taskBuildRaw;$taskBuildExit=$LASTEXITCODE}finally{Pop-Location}
  if($taskBuildExit -ne 0){$taskReport.status='FAIL';$taskReport.reason='COMPILE_FAILED';Write-FixedReport;throw 'Firewall helper build failed'}
  $taskReport.status='PASS';$taskReport.stage='COMPLETE';$taskReport.reason='PASS';Write-FixedReport
} catch {
  if($taskReport.status -eq 'RUNNING'){$taskReport.status='FAIL';$taskReport.reason='INTERNAL';Write-FixedReport}
  $taskFailed=$true
} finally {if($null-ne$taskEnvironment){Exit-KSessionFirewallTestEnvironment $taskEnvironment}}
if($taskFailed){Write-Output ('FIREWALL_BUILD_FAILED stage='+$taskReport.stage+' reason='+$taskReport.reason);exit 71}
$exe=Join-Path $taskOutput 'K-SESSION-Firewall.exe'
[ordered]@{product='K⁺-SESSION';component='firewall-helper';qualification='UNSIGNED DEVELOPMENT ARTIFACT';sourceCommit=$SourceCommit;runtimeManifestSha256=$RuntimeManifestSha256;nodeSha256=$NodeSha256;installerVersion=$InstallerVersion;toolchain=(& $GoExe version);GOOS='windows';GOARCH='amd64';CGO_ENABLED='0';windowsSubsystem='gui';bytes=(Get-Item -LiteralPath $exe).Length;sha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLower()} | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'build-info.json')
