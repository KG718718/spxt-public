param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Commit,
  [Parameter(Mandatory=$true)][string]$Report,
  [Parameter(Mandatory=$true)][string]$Beta2Setup
)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
$taskReport=[IO.Path]::GetFullPath($Report)
$taskBeta2=[IO.Path]::GetFullPath($Beta2Setup)
$taskCli=Join-Path $PSScriptRoot 'u27-specialty-report.cjs'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){throw 'U27 specialty requires the approved disposable GitHub-hosted runner'}
if($env:GITHUB_SHA -ne $Commit -or (git -C $taskRepo rev-parse HEAD).Trim() -ne $Commit){throw 'U27 specialty source mismatch'}
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh E U27 specialty build required'}
if(!(Test-Path -LiteralPath $taskBeta2 -PathType Leaf) -or (Get-Item -LiteralPath $taskBeta2).Length -ne 33018840 -or
    (Get-FileHash -LiteralPath $taskBeta2 -Algorithm SHA256).Hash.ToLower() -ne '877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6'){
  throw 'Exact accepted F3 beta2 Setup identity required'
}
New-Item -ItemType Directory -Path (Split-Path $taskReport) -Force|Out-Null
& node $taskCli verify $taskReport $Commit *> $null
if($LASTEXITCODE -ne 0 -or (Get-Content -Raw -LiteralPath $taskReport|ConvertFrom-Json).classification -cne 'NOT_OBSERVED'){throw 'Fresh initialized U27 specialty report required'}
$taskPrivateBuildLog=Join-Path $env:RUNNER_TEMP 'u27-specialty-build-private.log'
$taskStage=Join-Path $env:RUNNER_TEMP 'u27-specialty-build-stage.json'
try{
  & (Join-Path $PSScriptRoot 'ci-beta4.ps1') -Work $taskWork -Commit $Commit -StageReport $taskStage *> $taskPrivateBuildLog
  if($LASTEXITCODE -ne 0){throw 'U27 specialty dependency build failed'}
}catch{
  & node $taskCli prefix-failed $taskReport $Commit ENVIRONMENT_FAILED *> $null
  throw
}
$taskNode=Join-Path $taskWork 'portable/node-tool/node-v24.21.0-win-x64/node.exe'
$taskGo=Join-Path $taskWork 'portable/go-tool/go/bin/go.exe'
$env:KSESSION_BETA2_SETUP=$taskBeta2
$env:KSESSION_SETUP_BUILD=$taskWork
$env:KSESSION_SETUP_ARTIFACT=(Join-Path $taskWork 'candidate/artifact')
$env:KSESSION_SETUP_EVIDENCE=(Join-Path $taskWork 'installer-tests')
$env:KSESSION_PORTABLE_REPO=$taskRepo
$taskPrivateLifecycleLog=Join-Path $env:RUNNER_TEMP 'u27-specialty-lifecycle-private.log'
& (Join-Path $PSScriptRoot 'u27-specialty-offline.ps1') -Work (Join-Path $taskWork 'u27-offline') -Go $taskGo -Node $taskNode `
  -LauncherSource (Join-Path $taskRepo 'tools/windows-launcher') -Report $taskReport *> $taskPrivateLifecycleLog
if($LASTEXITCODE -ne 0){throw 'U27 specialty lifecycle failed'}
& $taskNode $taskCli verify-final $taskReport $Commit *> $null
if($LASTEXITCODE -ne 0){throw 'U27 specialty final report failed validation'}
$taskOutcome=Get-Content -Raw -LiteralPath $taskReport|ConvertFrom-Json
if($taskOutcome.status -cne 'UNKNOWN' -or $taskOutcome.classification -cne 'SETUP_SUCCEEDED_CLONE_UNKNOWN'){throw 'U27_SPECIALTY_OUTCOME_NOT_SAFE_UNKNOWN'}

