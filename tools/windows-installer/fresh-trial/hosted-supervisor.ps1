param([Parameter(Mandatory=$true)][string]$Work)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'ab/credentials.ps1')
Clear-FreshExecutionCredentials
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/fast-delivery/job-scope.ps1')
. (Join-Path $PSScriptRoot '../../tests/lan-host/node-test-environment.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/memory-process.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/install-r2/physical-work.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/supervisor-entry.ps1')
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){throw 'Hosted scope required'}
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskHead=Invoke-KSessionMemoryProcess (Get-Command git).Source @('-C',$taskRepo,'rev-parse','HEAD') 15
if($taskHead.ExitCode -ne 0 -or $taskHead.Stderr.Length -ne 0 -or $taskHead.Stdout.Trim() -cnotmatch '^[a-f0-9]{40}$'){throw 'Supervisor source unknown'}
$taskIdentity=@{sourceCommit=$taskHead.Stdout.Trim();controlCommit=$env:GITHUB_SHA;run=@{id=$env:GITHUB_RUN_ID;attempt=1}}
$taskSink=New-FreshSupervisorSink $env:FRESH_CONTROL_ROOT $taskIdentity
try{
 $taskVerify={param($NormalizedWork)
  $taskContext=Get-Content -Raw -LiteralPath (Join-Path $NormalizedWork 'context.json')|ConvertFrom-Json
  if($taskContext.kind -ceq 'FRESH_AB_CONTEXT' -and $taskContext.schema -eq 3){
   $taskContextCheck=Invoke-FastOwnedProcess (Get-Command node).Source @((Join-Path $PSScriptRoot 'ab/context.cjs'),$NormalizedWork) (Join-Path $taskSink.root 'context-job-ready') 120 -Detail
   return [pscustomobject]@{scope=$taskContextCheck.scope}
  }
  if($env:GITHUB_WORKFLOW_REF -ceq 'KG718718/spxt-public/.github/workflows/fresh-install-candidate.yml@refs/heads/codex/lan-fresh-trial-v1.1' -or $null -ne $taskContext.PSObject.Properties['installCandidate']){
   $taskContextCheck=Invoke-FastOwnedProcess (Get-Command node).Source @((Join-Path $PSScriptRoot 'install-candidate/context.cjs'),$NormalizedWork) (Join-Path $taskSink.root 'context-job-ready') 120 -Detail
   return [pscustomobject]@{scope=$taskContextCheck.scope}
  }elseif($taskContext.r1.fastDelivery.schema -ne 1 -or $taskContext.controlCommit -cne $env:GITHUB_SHA -or $taskContext.run.id -cne $env:GITHUB_RUN_ID -or $env:GITHUB_RUN_ATTEMPT -cne '1'){throw 'Fast source context required'}
 }
 $taskOpen={param($NormalizedWork)Read-FreshPhysicalWorkBinding $NormalizedWork}
 $taskExecute={param($NormalizedWork,$Physical)
  Invoke-FastOwnedProcess (Get-Command pwsh).Source @('-NoProfile','-File',(Join-Path $PSScriptRoot 'ci.ps1'),'-Work',$NormalizedWork) (Join-Path $Physical 'scope-job-ready') 1800 -Detail
 }
 if(!(Invoke-FreshSupervisorCore $Work $taskSink $taskVerify $taskOpen $taskExecute)){exit 1}
}finally{Close-FreshSupervisorSink $taskSink}
