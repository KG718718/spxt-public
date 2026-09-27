param([Parameter(Mandatory=$true)][string]$RepositoryRoot,[Parameter(Mandatory=$true)][string]$Work,[Parameter(Mandatory=$true)][string]$Report,[string]$NodeExe='node',[string]$NodePath='')
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repo=(Resolve-Path -LiteralPath $RepositoryRoot).Path;$work=[IO.Path]::GetFullPath($Work);$reportPath=[IO.Path]::GetFullPath($Report)
if(Test-Path -LiteralPath $work){throw 'NODE_CONTRACT_WORK_EXISTS'};if(Test-Path -LiteralPath $reportPath){throw 'NODE_CONTRACT_REPORT_EXISTS'}
New-Item -ItemType Directory -Path $work|Out-Null
. (Join-Path $repo 'tools/tests/lan-host/node-test-environment.ps1')
$result=[ordered]@{schema=1;kind='k-session-lan-node-test-environment';qualification='TEST_ONLY';status='RUNNING';stage='ENVIRONMENT';reason='RUNNING';checksPass=0;physicalPass=0;aliasPass=0;aliasFail=0;skipped=0;environmentRestored=$false}
function Write-Report(){[IO.File]::WriteAllText($reportPath,($result|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
function Require($condition,[string]$code){if(!$condition){throw $code};$result.checksPass++}
Write-Report;$failed=$false;$outer=Save-KSessionProcessEnvironment @('TEMP','TMP','GOTMPDIR','GOCACHE','NODE_PATH')
try{
  Invoke-KSessionWithRestoredEnvironment @('TEMP','TMP','GOTMPDIR','GOCACHE','NODE_PATH') {
    $env:TEMP=Join-Path $work 'synthetic-leak';$env:TMP=$env:TEMP;$env:GOTMPDIR=$env:TEMP;$env:GOCACHE=$env:TEMP;$env:NODE_PATH=$env:TEMP;New-Item -ItemType Directory -Path $env:TEMP|Out-Null
  }
  Require (Test-KSessionProcessEnvironmentRestored $outer) 'BUILD_ENV_RESTORE'
  $bad=Save-KSessionProcessEnvironment @('TEMP');$bad.Values['TEMP']='X:\synthetic-restore-mismatch'
  $restoreRejected=$false;try{Assert-KSessionProcessEnvironmentRestored $bad}catch{$restoreRejected=$_.Exception.Message-eq'TEST_ENVIRONMENT_RESTORE_FAILED'}
  Require $restoreRejected 'RESTORE_FAILURE_REJECTED'
  $physical=Join-Path $work 'physical';New-Item -ItemType Directory -Path $physical|Out-Null
  $junction=Join-Path $work 'alias';New-Item -ItemType Junction -Path $junction -Target $physical|Out-Null
  $tests=@('config.test.cjs','network.test.cjs','server.test.cjs','server-startup.test.cjs','server-runtime.test.cjs')|ForEach-Object {Join-Path $repo ('tools/tests/lan-host/'+$_)}
  $tests+=@(Get-ChildItem -LiteralPath (Join-Path $repo 'tools/tests/lan-host') -Filter 'launcher*.test.cjs' -File|ForEach-Object FullName)
  Require ($tests.Count-eq6) 'TEST_FILE_POLICY'
  $aliasRaw=Join-Path $work 'alias.tap';$env:TEMP=$junction;$env:TMP=$junction;if($NodePath){$env:NODE_PATH=$NodePath}
  & $NodeExe --test --test-concurrency=1 --test-reporter=tap @tests *> $aliasRaw;$aliasExit=$LASTEXITCODE
  $alias=Read-KSessionNodeTestSummary $aliasRaw
  Require ($aliasExit-ne0-and$alias.Valid-and$alias.Tests-eq37-and$alias.Pass-eq31-and$alias.Fail-eq6-and$alias.Skipped-eq0) 'ALIAS_COUNTEREXAMPLE'
  $result.aliasPass=$alias.Pass;$result.aliasFail=$alias.Fail
  Restore-KSessionProcessEnvironment $outer
  $candidate=Enter-KSessionLanCandidateTestEnvironment $work ('candidate-contract-'+$PID+'-env')
  try{
    $candidateState=Save-KSessionProcessEnvironment @('TEMP','TMP','GOTMPDIR','GOCACHE')
    Invoke-KSessionWithRestoredEnvironment @('TEMP','TMP','GOTMPDIR','GOCACHE') {$env:TEMP=$junction;$env:TMP=$junction;$env:GOTMPDIR=$junction;$env:GOCACHE=$junction}
    Require (Test-KSessionProcessEnvironmentRestored $candidateState) 'CANDIDATE_BUILD_ENV_RESTORE'
    $state=Enter-KSessionLanNodeTestEnvironment (Resolve-KSessionFirewallPhysicalPath $env:TEMP) ('node-contract-'+$PID+'-env')
    try{
      if($NodePath){$env:NODE_PATH=$NodePath}
      $physicalRaw=Join-Path $state.Root 'physical.tap'
      & $NodeExe --test --test-concurrency=1 --test-reporter=tap @tests *> $physicalRaw;$physicalExit=$LASTEXITCODE
      $summary=Read-KSessionNodeTestSummary $physicalRaw
      Require ($physicalExit-eq0-and$summary.Valid-and$summary.Tests-eq37-and$summary.Pass-eq37-and$summary.Fail-eq0-and$summary.Skipped-eq0) 'PHYSICAL_FIXTURE_PASS'
      $result.physicalPass=$summary.Pass;$result.skipped=$summary.Skipped
    }finally{Exit-KSessionLanNodeTestEnvironment $state}
  }finally{Exit-KSessionLanCandidateTestEnvironment $candidate;Restore-KSessionProcessEnvironment $outer}
  Require (Test-KSessionProcessEnvironmentRestored $outer) 'FINAL_ENV_RESTORE'
  $result.environmentRestored=$true;$result.status='PASS';$result.stage='COMPLETE';$result.reason='PASS';Write-Report
}catch{
  Restore-KSessionProcessEnvironment $outer
  $allowed=@('BUILD_ENV_RESTORE','RESTORE_FAILURE_REJECTED','TEST_FILE_POLICY','ALIAS_COUNTEREXAMPLE','CANDIDATE_BUILD_ENV_RESTORE','PHYSICAL_FIXTURE_PASS','FINAL_ENV_RESTORE');$reason=[string]$_.Exception.Message;if($reason-notin$allowed){$reason='INTERNAL'}
  $result.status='FAIL';$result.reason=$reason;$result.environmentRestored=(Test-KSessionProcessEnvironmentRestored $outer);Write-Report;$failed=$true
}
if($failed){Write-Output ('LAN_NODE_TEST_ENVIRONMENT_FAILED stage='+$result.stage+' reason='+$result.reason);exit 71}
Write-Output 'LAN_NODE_TEST_ENVIRONMENT_PASS'
