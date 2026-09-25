param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Beta1Build,
  [Parameter(Mandatory=$true)][string]$Bundle,
  [Parameter(Mandatory=$true)][string]$Node,
  [Parameter(Mandatory=$true)][string]$Commit
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'sequence-diagnostic-path.ps1')
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){
  throw 'HOSTED_SEQUENCE_DIAGNOSTIC_REQUIRED'
}
foreach($taskPath in @($Work,$Beta1Build,$Bundle,$Node)){if(!(Test-KSessionFixedEPath $taskPath)){throw 'FIXED_E_VOLUME_REQUIRED'}}
$taskWork=[IO.Path]::GetFullPath($Work)
$taskBeta1=[IO.Path]::GetFullPath($Beta1Build)
$taskBundle=[IO.Path]::GetFullPath($Bundle)
$taskNode=[IO.Path]::GetFullPath($Node)
if($Commit -notmatch '^[a-f0-9]{40}$' -or (Test-Path -LiteralPath $taskWork) -or
   !(Test-Path -LiteralPath $taskBundle -PathType Leaf) -or !(Test-Path -LiteralPath $taskNode -PathType Leaf)){
  throw 'SEQUENCE_DIAGNOSTIC_INPUT_INVALID'
}
$taskPortable=Join-Path $taskBeta1 'portable'
$taskCompiler=Join-Path $taskBeta1 'toolchain/compiler'
$taskBeta1Setup=Join-Path $taskBeta1 'candidate/artifact/K-SESSION-Setup-1.1.0-beta.1.exe'
$taskGo=Join-Path $taskPortable 'go-tool/go/bin/go.exe'
foreach($taskFile in @($taskBeta1Setup,$taskGo,(Join-Path $taskCompiler 'ISCC.exe'))){if(!(Test-Path -LiteralPath $taskFile -PathType Leaf)){throw 'BETA1_DIAGNOSTIC_TOOLCHAIN_INCOMPLETE'}}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskBuild=Join-Path $taskWork 'setup-build'
$taskEvidence=Join-Path $taskWork 'private-evidence'
try{
  & $taskNode (Join-Path $PSScriptRoot 'build.cjs') $taskPortable $taskCompiler (Join-Path $taskBuild 'candidate') $Commit sequence-gate $taskBundle *> $null
  if($LASTEXITCODE -ne 0){throw 'SEQUENCE_GATE_BUILD_FAILED'}
  & $taskNode (Join-Path $PSScriptRoot 'build.cjs') $taskPortable $taskCompiler (Join-Path $taskBuild 'fault-space') $Commit sequence-space $taskBundle *> $null
  if($LASTEXITCODE -ne 0){throw 'SEQUENCE_SPACE_BUILD_FAILED'}
  $env:KSESSION_BETA1_SETUP=$taskBeta1Setup
  $env:KSESSION_SETUP_BUILD=$taskBuild
  $env:KSESSION_SETUP_ARTIFACT=Join-Path $taskBuild 'candidate/artifact'
  $env:KSESSION_SETUP_EVIDENCE=Join-Path $taskWork 'unused-setup-evidence'
  $env:KSESSION_SETUP_UPGRADE_EVIDENCE=$taskEvidence
  $env:KSESSION_PORTABLE_REPO=$taskRepo
  $env:KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC='1'
  Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
  try{
    & $taskGo test -count=1 -timeout=5m -run '^TestUpgradeLifecycle$' . *> $null
    $taskTestExit=$LASTEXITCODE
  }finally{Pop-Location}
  $taskSource=Join-Path $taskEvidence 'SEQUENCE-DIAGNOSTIC.json'
  if(!(Test-Path -LiteralPath $taskSource -PathType Leaf)){throw 'SEQUENCE_REPORT_MISSING'}
  $taskReport=Get-Content -LiteralPath $taskSource -Raw|ConvertFrom-Json
  $taskKeys=@($taskReport.PSObject.Properties.Name|Sort-Object)
  if(($taskKeys -join ',') -ne 'phases,schema,status' -or $taskReport.schema -ne 1 -or $taskReport.status -notin @('PASS','FAIL')){throw 'SEQUENCE_REPORT_SCHEMA'}
  $taskExpected=@('BASELINE','U15','AFTER_U15','U16','AFTER_U16','U17','AFTER_U17','U18','U20_PRECOPY')
  $taskPhaseCount=@($taskReport.phases).Count
  if($taskPhaseCount -gt $taskExpected.Count -or ($taskReport.status -eq 'PASS' -and $taskPhaseCount -ne $taskExpected.Count)){throw 'SEQUENCE_REPORT_PHASE_COUNT'}
  for($taskIndex=0;$taskIndex -lt $taskPhaseCount;$taskIndex++){
    $taskPhase=$taskReport.phases[$taskIndex]
    if((@($taskPhase.PSObject.Properties.Name|Sort-Object)-join ',') -ne 'phase,result,state' -or $taskPhase.phase -ne $taskExpected[$taskIndex] -or
       $taskPhase.result -notmatch '^(IDENTITY_(ACCEPTED|REGISTRATION(_(COUNT|VERSION|SNAPSHOT|CONFLICT|UNINSTALL|AMBIGUOUS|INCONSISTENT))?|BINDING|PATH|MANIFEST|PROGRAM|BUILD|RUNTIME|LAUNCHER|INTERNAL)|PREFLIGHT_REJECTED|SPACE_REJECTED)$' -or
       $taskPhase.state -notin @('UNCHANGED','CONTROLLED_MUTATION')){throw 'SEQUENCE_REPORT_UNSAFE'}
  }
  Copy-Item -LiteralPath $taskSource -Destination (Join-Path $taskWork 'SEQUENCE-DIAGNOSTIC.json')
  if($taskTestExit -ne 0){throw 'SEQUENCE_LIFECYCLE_FAILED'}
}finally{
  Remove-Item Env:KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC,Env:KSESSION_BETA1_SETUP,Env:KSESSION_SETUP_BUILD,Env:KSESSION_SETUP_ARTIFACT,Env:KSESSION_SETUP_EVIDENCE,Env:KSESSION_SETUP_UPGRADE_EVIDENCE,Env:KSESSION_PORTABLE_REPO -ErrorAction SilentlyContinue
}
