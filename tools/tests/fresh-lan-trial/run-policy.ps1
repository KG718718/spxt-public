param([string]$Repo,[string]$Work,[string]$Go,[string]$Node,[ValidateSet('FIREWALL','LAUNCHER')][string]$Package,[string]$Commit)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){throw 'Hosted policy context required'}
if(Test-Path -LiteralPath $Work){throw 'Fresh policy evidence required'}
New-Item -ItemType Directory -Path $Work|Out-Null
. (Join-Path $Repo 'tools/windows-firewall/test-environment.ps1')
$taskNames=if($Package -eq 'FIREWALL'){@('TestFreshStrictBindingAndStandardSchemaIsolation','TestFreshFirewallBindingBeforeAnyMutation')}else{@('TestFreshLogonPlanIsCurrentUserInstalledOnly','TestFreshEnvironmentAndNetworkBindingFailClosed')}
$taskEnv=Enter-KSessionFirewallTestEnvironment (Resolve-KSessionFirewallPhysicalPath $Work) ('firewall-fresh-policy-'+$Package.ToLowerInvariant()+'-env')
try{
  $taskOverlay=Join-Path $Work 'overlay.json'
  & $Node (Join-Path $Repo 'tools/tests/fresh-lan-trial/prepare-policy-overlay.cjs') $Package $taskOverlay|Out-Null
  if($LASTEXITCODE -ne 0){throw 'Policy overlay failed'}
  $taskRaw=Join-Path $Work 'private-go.jsonl'
  Push-Location (Join-Path $Repo ('tools/windows-'+$Package.ToLowerInvariant()))
  try{& $Go test -overlay $taskOverlay -tags fresh_trial_tests -json -count=1 -run ('^('+($taskNames -join '|')+')$') . *> $taskRaw;$taskExit=$LASTEXITCODE}finally{Pop-Location}
  $taskSummary=Read-KSessionGoTestSummary $taskRaw
  if($taskExit -ne 0 -or $taskSummary.JSONInvalid -or $taskSummary.PackagePass -ne 1 -or $taskSummary.PackageFail -ne 0 -or @($taskSummary.FailedNames).Count -ne 0 -or @($taskSummary.SkippedNames).Count -ne 0 -or (Compare-Object @($taskNames|Sort-Object) @($taskSummary.Passed|Sort-Object))){throw 'Fresh policy test failure'}
}finally{Exit-KSessionFirewallTestEnvironment $taskEnv}
[ordered]@{schema=1;kind=('FRESH_'+$Package+'_POLICY');sourceCommit=$Commit;status='PASS';expectedTests=$taskNames;pass=2;fail=0;skipped=0}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $Work 'report.json') -Encoding utf8
