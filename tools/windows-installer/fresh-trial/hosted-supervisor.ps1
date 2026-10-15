param([Parameter(Mandatory=$true)][string]$Work)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/fast-delivery/job-scope.ps1')
. (Join-Path $PSScriptRoot '../../tests/lan-host/node-test-environment.ps1')
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){throw 'Hosted scope required'}
$taskContext=Get-Content -Raw -LiteralPath (Join-Path $Work 'context.json')|ConvertFrom-Json
if($taskContext.r1.fastDelivery.schema -ne 1 -or $taskContext.controlCommit -cne $env:GITHUB_SHA -or $taskContext.run.id -cne $env:GITHUB_RUN_ID -or $env:GITHUB_RUN_ATTEMPT -cne '1'){throw 'Fast source context required'}
$taskPhysical=Resolve-KSessionFirewallPhysicalPath $Work
$taskScope=Invoke-FastOwnedProcess (Get-Command pwsh).Source @('-NoProfile','-File',(Join-Path $PSScriptRoot 'ci.ps1'),'-Work',$Work) (Join-Path $taskPhysical 'scope-job-ready')
[IO.File]::WriteAllText((Join-Path $taskPhysical 'scope-job-proof.json'),($taskScope|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
$taskReport=Get-Content -Raw -LiteralPath (Join-Path $taskPhysical 'fresh-report.json')|ConvertFrom-Json
# handlesClosed now also requires the actual complete CI Job/process/pipe scope.
if($taskScope.jobEmpty -ne $true -or !$taskScope.pipesClosed -or !$taskScope.handlesClosed -or $taskScope.forcedTermination){$taskReport.cleanup.handlesClosed=$null}
if($taskScope.status -ne 'PASS'){
  $taskReport.status='FAIL';if($taskReport.stage -eq 'COMPLETE'){$taskReport.stage='F09'}
  if($taskReport.cleanup.handlesClosed -ne $true){$taskReport.reason='CLEANUP_UNPROVEN'}elseif($taskReport.reason -eq 'PASS'){$taskReport.reason='GATE_FAILED'}
}
[IO.File]::WriteAllText((Join-Path $taskPhysical 'fresh-report.json'),($taskReport|ConvertTo-Json -Depth 12 -Compress),[Text.UTF8Encoding]::new($false))
if($taskScope.status -ne 'PASS'){exit 1}
