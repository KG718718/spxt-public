param([Parameter(Mandatory=$true)][string]$ControlRoot,[ValidateSet('success','failure','cancelled','skipped')][string]$SourceOutcome='failure',[ValidateSet('success','failure','cancelled','skipped')][string]$ExecutionOutcome='failure',[switch]$BuildSmoke)
$ErrorActionPreference='Stop'
$taskRepo=$env:GITHUB_WORKSPACE
$taskEntry=if($BuildSmoke){Join-Path $PSScriptRoot 'recovery-r1/smoke.cjs'}else{Join-Path $PSScriptRoot 'finalize-entry.cjs'}
$taskFinalReportName=if($BuildSmoke){'smoke-report.json'}else{'fresh-report.json'}
$taskPublish=Join-Path $ControlRoot 'publish'
if(Test-Path -LiteralPath $taskPublish){throw 'Unknown publish destination'}
New-Item -ItemType Directory -Path $taskPublish|Out-Null
$taskState=Get-Content -Raw -LiteralPath (Join-Path $ControlRoot 'isolation-private.json')|ConvertFrom-Json
if($taskState.schema -ne 1 -or $taskState.runId -ne $env:GITHUB_RUN_ID -or $taskState.drive -ne 'E:'){throw 'Isolation state unknown'}
$taskWork='E:\fresh-trial';$taskValid=$false;$taskDriveRestored=$false
$taskMayReadWork=$true
if($taskState.created){
  $taskExpected=Join-Path $env:RUNNER_TEMP ('fresh-drive-'+$env:GITHUB_RUN_ID)
  $taskCurrent=@(& (Join-Path $env:SystemRoot 'System32/subst.exe'))
  $taskOwn=@($taskCurrent|Where-Object{$_ -match '^E:\\: => '})
  $taskMayReadWork=$LASTEXITCODE -eq 0 -and $taskOwn.Count -eq 1 -and $taskState.target -ieq $taskExpected -and ($taskOwn[0] -replace '^E:\\: => ','').TrimEnd('\') -ieq $taskExpected.TrimEnd('\')
}
try{
  if($taskMayReadWork){& node $taskEntry CHECK $taskWork $taskPublish false *> (Join-Path $ControlRoot 'final-check-private.log');$taskValid=$LASTEXITCODE -eq 0}
  if($taskValid){
    Copy-Item -LiteralPath (Join-Path $taskWork 'context.json') -Destination (Join-Path $taskPublish 'context-private.json')
    Copy-Item -LiteralPath (Join-Path $taskWork 'fresh-report.json') -Destination (Join-Path $taskPublish 'report-private.json')
    if(Test-Path -LiteralPath (Join-Path $taskWork 'completion.json')){Copy-Item -LiteralPath (Join-Path $taskWork 'completion.json') -Destination (Join-Path $taskPublish 'completion-private.json')}
    if($BuildSmoke -and (Test-Path -LiteralPath (Join-Path $taskWork 'smoke-ready-private.json'))){Copy-Item -LiteralPath (Join-Path $taskWork 'smoke-ready-private.json') -Destination (Join-Path $taskPublish 'smoke-ready-private.json')}
    $taskReport=Get-Content -Raw -LiteralPath (Join-Path $taskWork 'fresh-report.json')|ConvertFrom-Json
    if($taskReport.checks.Count -eq 9){Copy-Item -LiteralPath (Join-Path $taskWork 'artifact') -Destination (Join-Path $taskPublish 'artifact') -Recurse}
  }
}finally{
  if(!$taskState.created){$taskDriveRestored=$true}else{
    $taskExpected=Join-Path $env:RUNNER_TEMP ('fresh-drive-'+$env:GITHUB_RUN_ID)
    if([IO.Path]::GetFullPath($taskState.target).TrimEnd('\') -ine [IO.Path]::GetFullPath($taskExpected).TrimEnd('\')){$taskDriveRestored=$false}else{
      $taskRows=@(& (Join-Path $env:SystemRoot 'System32/subst.exe'))
      $taskMappings=@($taskRows|Where-Object{$_ -match '^E:\\: => '})
      if($LASTEXITCODE -eq 0 -and $taskMappings.Count -eq 1 -and ($taskMappings[0] -replace '^E:\\: => ','').TrimEnd('\') -ieq $taskExpected.TrimEnd('\')){
        & (Join-Path $env:SystemRoot 'System32/subst.exe') E: /D|Out-Null
        if($LASTEXITCODE -eq 0){$taskAfter=@(& (Join-Path $env:SystemRoot 'System32/subst.exe'));$taskDriveRestored=$LASTEXITCODE -eq 0 -and @($taskAfter|Where-Object{$_ -match '^E:\\: => '}).Count -eq 0}
      }
    }
  }
}
$taskPass=$false
if($taskValid){
  # All further reads use the physical copy; E may already be unmapped.
  $taskFinalizeWork=Join-Path $taskPublish 'final-context'
  New-Item -ItemType Directory -Path $taskFinalizeWork|Out-Null
  Copy-Item -LiteralPath (Join-Path $taskPublish 'context-private.json') -Destination (Join-Path $taskFinalizeWork 'context.json')
  Copy-Item -LiteralPath (Join-Path $taskPublish 'report-private.json') -Destination (Join-Path $taskFinalizeWork 'fresh-report.json')
  if($BuildSmoke -and (Test-Path -LiteralPath (Join-Path $taskPublish 'smoke-ready-private.json'))){Copy-Item -LiteralPath (Join-Path $taskPublish 'smoke-ready-private.json') -Destination (Join-Path $taskFinalizeWork 'smoke-ready-private.json')}
  $taskOuterFailure=$SourceOutcome -ne 'success' -or $ExecutionOutcome -ne 'success'
  & node $taskEntry FINAL $taskFinalizeWork $taskPublish $taskDriveRestored.ToString().ToLowerInvariant() $taskOuterFailure.ToString().ToLowerInvariant() *> (Join-Path $ControlRoot 'final-report-private.log')
  $taskPass=$LASTEXITCODE -eq 0
}
if(!$taskValid -or !(Test-Path -LiteralPath (Join-Path $taskPublish $taskFinalReportName))){
  New-Item -ItemType Directory -Path (Join-Path $taskPublish 'failure') -Force|Out-Null
  # A newly constructed fixed early record, never an unchecked copy of failed JSON.
  $taskEarly=[ordered]@{schema=1;kind='FRESH_TRIAL_EARLY_FAILURE';controlCommit=$env:GITHUB_SHA;runId=$env:GITHUB_RUN_ID;runAttempt=1;stage='SOURCE';reason='REPORT_INVALID';status='FAIL';cleanup='UNKNOWN'}
  [IO.File]::WriteAllText((Join-Path $taskPublish 'failure/early.json'),($taskEarly|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
}
('publish='+$taskPublish)|Out-File -LiteralPath $env:GITHUB_OUTPUT -Append -Encoding utf8
if(!$taskPass){exit 1}
