param(
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [Parameter(Mandatory=$true)][string]$SourceCommit,
  [Parameter(Mandatory=$true)][string]$RuntimeManifestSha256,
  [Parameter(Mandatory=$true)][string]$NodeSha256,
  [Parameter(Mandatory=$true)][string]$InstallerVersion,
  [string]$GoExe='go',
  [string]$DiagnosticReport='',
  [switch]$FreshTrial,
  [string]$FreshBuildDiagnostic=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../tests/fresh-lan-trial/memory-process.ps1')
function Write-FreshStage([string]$Stage,[string]$Classification='COMMAND_FAILED'){
  if($FreshTrial -and $FreshBuildDiagnostic){[IO.File]::WriteAllText($FreshBuildDiagnostic,(@{stage=$Stage;classification=$Classification;script=$null;line=$null}|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
}
function Write-FreshGoResult([string]$Raw,[int]$Exit,[string]$Kind){
  if($FreshTrial -and $FreshBuildDiagnostic){
    $taskDiagnostic=Invoke-KSessionMemoryNode $env:KSESSION_FRESH_BUILD_NODE @((Join-Path $PSScriptRoot '../tests/fresh-lan-trial/helper-go-diagnostic.cjs'),'-',$FreshBuildDiagnostic,[string]$Exit,$Kind) $Raw
    if($taskDiagnostic.ExitCode -ne 0){throw 'Fresh helper test evidence rejected'}
  }
}
Write-FreshStage 'HELPER_INPUT'
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
if($FreshTrial){$env:GOWORK='off'}
$flags="-H windowsgui -s -w -buildid= -X main.buildSourceCommit=$SourceCommit -X main.buildRuntimeManifestSHA256=$RuntimeManifestSha256 -X main.buildNodeSHA256=$NodeSha256 -X main.buildInstallerVersion=$InstallerVersion"
if($FreshTrial){$flags+=' -X main.buildFreshTrial=1'}
function Complete-BuildIdentity {
$exe=Join-Path $taskOutput 'K-SESSION-Firewall.exe'
$taskBuildInfo=[ordered]@{product='K⁺-SESSION';component='firewall-helper';qualification='UNSIGNED DEVELOPMENT ARTIFACT';sourceCommit=$SourceCommit;runtimeManifestSha256=$RuntimeManifestSha256;nodeSha256=$NodeSha256;installerVersion=$InstallerVersion;toolchain=(& $GoExe version);GOOS='windows';GOARCH='amd64';CGO_ENABLED='0';windowsSubsystem='gui';bytes=(Get-Item -LiteralPath $exe).Length;sha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLower()}
if($FreshTrial){$taskBuildInfo['deriveProfile']='fresh-trial';$taskBuildInfo['freshTrialMarker']='1'}
$taskBuildInfo | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'build-info.json')
if($FreshTrial){[ordered]@{schema=1;kind='FRESH_FIREWALL_POLICY';sourceCommit=$SourceCommit;status='PASS';expectedTests=$taskFreshTests;pass=2;fail=0;skipped=0} | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'fresh-policy-report.json')}
}

$taskEnvironment=$null
$taskFailed=$false
try {
  Write-FreshStage 'HELPER_ENVIRONMENT'
  $taskEnvironment=Enter-KSessionFirewallTestEnvironment $taskPhysicalParent ('firewall-build-'+$PID+'-'+[guid]::NewGuid().ToString('N')+'-env')
  $taskReport.stage='TESTS';$taskReport.reason='RUNNING';Write-FixedReport
  $taskRaw=''
  Push-Location $PSScriptRoot
  Write-FreshStage 'HELPER_STANDARD_TESTS'
  try{$taskResult=Invoke-KSessionMemoryProcess $GoExe @('test','-json','-count=1','-run',('^(' + ($taskExpectedTests -join '|') + ')$'),'./...');$taskRaw=$taskResult.Stdout+$taskResult.Stderr;$taskTestExit=$taskResult.ExitCode}finally{Pop-Location}
  Write-FreshGoResult $taskRaw $taskTestExit 'ORIGINAL'
  $taskSummary=Read-KSessionGoTestSummary $taskRaw -FromText;$taskJSONInvalid=$taskSummary.JSONInvalid
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
  if($FreshTrial){
    Write-FreshStage 'HELPER_FRESH_OVERLAY'
    $taskFreshTests=@('TestFreshStrictBindingAndStandardSchemaIsolation','TestFreshFirewallBindingBeforeAnyMutation')
    $taskFreshRaw=''
    $taskFreshOverlay=Join-Path $taskEnvironment.Root 'fresh-firewall-overlay.json'
    $taskOverlayBuilder=Join-Path $PSScriptRoot '../tests/fresh-lan-trial/prepare-policy-overlay.cjs'
    # Use the pinned Node executable from the caller's private toolchain.
    & $env:KSESSION_FRESH_BUILD_NODE $taskOverlayBuilder FIREWALL $taskFreshOverlay|Out-Null
    if($LASTEXITCODE -ne 0){throw 'Fresh Firewall overlay source rejected'}
    Push-Location $PSScriptRoot
    Write-FreshStage 'HELPER_FRESH_TESTS'
    try{$taskResult=Invoke-KSessionMemoryProcess $GoExe @('test','-overlay',$taskFreshOverlay,'-tags','fresh_trial_tests','-json','-count=1','-run',('^(' + ($taskFreshTests -join '|') + ')$'),'.');$taskFreshRaw=$taskResult.Stdout+$taskResult.Stderr;$taskFreshExit=$taskResult.ExitCode}finally{Pop-Location}
    Write-FreshGoResult $taskFreshRaw $taskFreshExit 'FRESH'
    $taskFreshSummary=Read-KSessionGoTestSummary $taskFreshRaw -FromText
    if($taskFreshExit -ne 0 -or $taskFreshSummary.JSONInvalid -or $taskFreshSummary.PackagePass -ne 1 -or $taskFreshSummary.PackageFail -ne 0 -or @($taskFreshSummary.FailedNames).Count -ne 0 -or @($taskFreshSummary.SkippedNames).Count -ne 0 -or (Compare-Object @($taskFreshTests|Sort-Object) @($taskFreshSummary.Passed|Sort-Object))){throw 'Fresh Firewall policy gate failed'}
  }
  if($FreshTrial){
    Write-FreshStage 'HELPER_FRESH_TESTS'
    Push-Location $PSScriptRoot
    try{$taskCounter=Invoke-KSessionMemoryProcess $GoExe @('test','-overlay',$taskFreshOverlay,'-tags','fresh_trial_tests','-json','-count=1','-run','^TestFreshFirewallHarnessCannotMaskInfrastructureFailure$', '.')}finally{Pop-Location}
    $taskCounterSummary=Read-KSessionGoTestSummary ($taskCounter.Stdout+$taskCounter.Stderr) -FromText
    if($taskCounter.ExitCode -ne 0 -or $taskCounterSummary.JSONInvalid -or $taskCounterSummary.PackagePass -ne 1 -or $taskCounterSummary.PackageFail -ne 0 -or @($taskCounterSummary.FailedNames).Count -ne 0 -or @($taskCounterSummary.SkippedNames).Count -ne 0 -or @($taskCounterSummary.Passed).Count -ne 1 -or $taskCounterSummary.Passed[0] -ne 'TestFreshFirewallHarnessCannotMaskInfrastructureFailure'){throw 'Fresh failure oracle gate failed'}
  }
  New-Item -ItemType Directory -Path $taskOutput | Out-Null
  $taskBuildRaw=''
  Push-Location $PSScriptRoot
  Write-FreshStage 'HELPER_COMPILE'
  try{$taskResult=Invoke-KSessionMemoryProcess $GoExe @('build','-trimpath','-buildvcs=false','-ldflags',$flags,'-o',(Join-Path $taskOutput 'K-SESSION-Firewall.exe'),'.');$taskBuildExit=$taskResult.ExitCode}finally{Pop-Location}
  if($taskBuildExit -ne 0){$taskReport.status='FAIL';$taskReport.reason='COMPILE_FAILED';Write-FixedReport;throw 'Firewall helper build failed'}
  Write-FreshStage 'HELPER_IDENTITY'
  Complete-BuildIdentity
  $taskReport.status='PASS';$taskReport.stage='COMPLETE';$taskReport.reason='PASS';Write-FixedReport
} catch {
  if($taskReport.status -eq 'RUNNING'){$taskReport.status='FAIL';$taskReport.reason='INTERNAL';Write-FixedReport}
  $taskFailed=$true
} finally {
  if($null-ne$taskEnvironment){
    try{
      if(!$taskFailed){Write-FreshStage 'HELPER_ENVIRONMENT'}
      Exit-KSessionFirewallTestEnvironment $taskEnvironment
      foreach($taskName in @('TEMP','TMP','GOTMPDIR','GOCACHE')){if([Environment]::GetEnvironmentVariable($taskName,'Process') -cne $taskEnvironment.$taskName){throw 'Helper environment restoration mismatch'}}
      if([Environment]::GetEnvironmentVariable('KSESSION_FIREWALL_TEST_ROOT','Process') -cne $taskEnvironment.Fixture){throw 'Helper fixture restoration mismatch'}
    }catch{
      $taskFailed=$true;$taskReport.status='FAIL';$taskReport.stage='ENVIRONMENT';$taskReport.reason='ENV_RESTORE_FAILED';Write-FixedReport
      Write-FreshStage 'HELPER_ENVIRONMENT' 'ENV_RESTORE_FAILED'
    }
  }
}
if($taskFailed){Write-Output ('FIREWALL_BUILD_FAILED stage='+$taskReport.stage+' reason='+$taskReport.reason);exit 71}
Write-FreshStage 'HELPER_COMPLETE' 'PASS'
