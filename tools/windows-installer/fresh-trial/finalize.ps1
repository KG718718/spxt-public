param([Parameter(Mandatory=$true)][string]$ControlRoot,[ValidateSet('success','failure','cancelled','skipped')][string]$SourceOutcome='failure',[ValidateSet('success','failure','cancelled','skipped')][string]$ExecutionOutcome='failure',[switch]$BuildSmoke,[switch]$InstallCandidate)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/memory-process.ps1')
. (Join-Path $PSScriptRoot '../../tests/lan-host/node-test-environment.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/install-r2/physical-work.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/supervisor-entry.ps1')
$taskControlNode=(Get-Command node).Source
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
$taskIdentity=$null;$taskSupervisor=$null;$taskSupervisorClass='REPORT_INVALID';$taskWorkBinding=$null;$taskReadWork=$taskWork
if($InstallCandidate){
 try{
  $taskGit=Invoke-KSessionMemoryProcess (Get-Command git).Source @('-C',$taskRepo,'rev-parse','HEAD') 15
  if($taskGit.ExitCode -ne 0 -or $taskGit.Stderr.Length -ne 0 -or $taskGit.Stdout.Trim() -cnotmatch '^[a-f0-9]{40}$'){throw 'DIAGNOSTIC_SOURCE_UNKNOWN'}
  $taskIdentity=@{sourceCommit=$taskGit.Stdout.Trim();controlCommit=$env:GITHUB_SHA;run=@{id=$env:GITHUB_RUN_ID;attempt=1}}
  $taskRawDiagnostic=Read-FreshSupervisorDiagnostic $ControlRoot $taskIdentity
  if($null -ne $taskRawDiagnostic){
   $taskValidated=Invoke-KSessionMemoryNode $taskControlNode @((Join-Path $taskRepo 'tools/tests/fresh-lan-trial/supervisor-diagnostic.cjs'),$taskIdentity.sourceCommit,$taskIdentity.controlCommit,$taskIdentity.run.id) $taskRawDiagnostic
   if($taskValidated.ExitCode -ne 0 -or $taskValidated.Stderr.Length -ne 0){throw 'DIAGNOSTIC_INVALID'}
   $taskSupervisor=$taskValidated.Stdout|ConvertFrom-Json;$taskSupervisorClass=$taskSupervisor.diagnostic.classification
   if(!$taskSupervisor.workObserved -or !$taskSupervisor.workMatched -or $taskSupervisorClass -eq 'WORK_BINDING_REJECTED'){$taskMayReadWork=$false}
   if($taskMayReadWork){
    $taskOwnerRaw=Read-FreshSupervisorWorkOwner $ControlRoot $taskIdentity
    $taskOwnerValidated=Invoke-KSessionMemoryNode $taskControlNode @((Join-Path $taskRepo 'tools/tests/fresh-lan-trial/supervisor-diagnostic.cjs'),'OWNER',$taskIdentity.sourceCommit,$taskIdentity.controlCommit,$taskIdentity.run.id) $taskOwnerRaw
    if($taskOwnerValidated.ExitCode -ne 0 -or $taskOwnerValidated.Stdout -cne 'OWNER_VALID' -or $taskOwnerValidated.Stderr.Length -ne 0){throw 'WORK_OWNER_CHANGED'}
    $taskOwner=$taskOwnerRaw|ConvertFrom-Json;$taskWorkBinding=Read-FreshPhysicalWorkBinding $taskWork;if($taskWorkBinding.identity -cne $taskOwner.identity){throw 'WORK_OWNER_CHANGED'};$taskReadWork=$taskWorkBinding.physical
   }
  }elseif($SourceOutcome -eq 'success'){$taskMayReadWork=$false;$taskSupervisorClass='SUPERVISOR_DIAGNOSTIC_INVALID'}
 }catch{
  $taskMayReadWork=$false;$taskSupervisorClass='SUPERVISOR_DIAGNOSTIC_INVALID'
  if($null -ne $taskWorkBinding){Close-FreshPhysicalWorkBinding $taskWorkBinding;$taskWorkBinding=$null}
  if($null -ne $taskIdentity){$taskSupervisor=[ordered]@{schema=1;kind='FRESH_SUPERVISOR_ENTRY';sourceCommit=$taskIdentity.sourceCommit;controlCommit=$taskIdentity.controlCommit;run=$taskIdentity.run;diagnostic=[ordered]@{stage='SUPERVISOR_REPORT';classification='SUPERVISOR_DIAGNOSTIC_INVALID';script=$null;line=$null};scope=$null;workObserved=$false;workMatched=$false}}
 }
 if($null -ne $taskSupervisor){[IO.File]::WriteAllText((Join-Path $taskPublish 'supervisor-entry-private.json'),($taskSupervisor|ConvertTo-Json -Depth 10 -Compress),[Text.UTF8Encoding]::new($false))}
}
try{
  if($taskMayReadWork){
    $taskNewContextValid=$true
    if($InstallCandidate){
      if($BuildSmoke){throw 'Install candidate cannot finalize smoke'}
      $taskContextCheck=Invoke-KSessionMemoryNode $taskControlNode @((Join-Path $PSScriptRoot 'install-candidate/context.cjs'),$taskReadWork)
      $taskNewContextValid=$taskContextCheck.ExitCode -eq 0 -and !$taskContextCheck.TimedOut -and !$taskContextCheck.ForcedTermination -and $taskContextCheck.Stderr.Length -eq 0
    }
    if($taskNewContextValid){$taskControl=Invoke-KSessionMemoryNode $taskControlNode @($taskEntry,'CHECK',$taskReadWork,$taskPublish,'false');$taskValid=$taskControl.ExitCode -eq 0}
  }
  if($taskValid){
    Copy-Item -LiteralPath (Join-Path $taskReadWork 'context.json') -Destination (Join-Path $taskPublish 'context-private.json')
    Copy-Item -LiteralPath (Join-Path $taskReadWork 'fresh-report.json') -Destination (Join-Path $taskPublish 'report-private.json')
    if(Test-Path -LiteralPath (Join-Path $taskReadWork 'completion.json')){Copy-Item -LiteralPath (Join-Path $taskReadWork 'completion.json') -Destination (Join-Path $taskPublish 'completion-private.json')}
    if($BuildSmoke -and (Test-Path -LiteralPath (Join-Path $taskReadWork 'smoke-ready-private.json'))){Copy-Item -LiteralPath (Join-Path $taskReadWork 'smoke-ready-private.json') -Destination (Join-Path $taskPublish 'smoke-ready-private.json')}
    $taskReport=Get-Content -Raw -LiteralPath (Join-Path $taskReadWork 'fresh-report.json')|ConvertFrom-Json
    if($taskReport.checks.Count -eq 9){Copy-Item -LiteralPath (Join-Path $taskReadWork 'artifact') -Destination (Join-Path $taskPublish 'artifact') -Recurse}
  }
}finally{
  if($null -ne $taskWorkBinding){if(!(Test-FreshPinnedWorkDirectory $taskWorkBinding)){$taskValid=$false;$taskSupervisorClass='WORK_BINDING_REJECTED'};Close-FreshPhysicalWorkBinding $taskWorkBinding}
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
  $taskControl=Invoke-KSessionMemoryNode $taskControlNode @($taskEntry,'FINAL',$taskFinalizeWork,$taskPublish,$taskDriveRestored.ToString().ToLowerInvariant(),$taskOuterFailure.ToString().ToLowerInvariant())
  $taskPass=$taskControl.ExitCode -eq 0
}
if(!$taskValid -or !(Test-Path -LiteralPath (Join-Path $taskPublish $taskFinalReportName))){
  New-Item -ItemType Directory -Path (Join-Path $taskPublish 'failure') -Force|Out-Null
  # A newly constructed fixed early record, never an unchecked copy of failed JSON.
  $taskEarly=[ordered]@{schema=1;kind='FRESH_TRIAL_EARLY_FAILURE';controlCommit=$env:GITHUB_SHA;runId=$env:GITHUB_RUN_ID;runAttempt=1;stage='SOURCE';reason='REPORT_INVALID';status='FAIL';cleanup='UNKNOWN'}
  if($InstallCandidate){
    $taskRecovery=[ordered]@{};foreach($taskKey in @('productRegistration','binding','startup','desktop','programs','programFiles','compilerOwnedFiles','compilerSettings','globalRegistry','rules')){$taskRecovery[$taskKey]='NOT_OBSERVED'}
    $taskEarly=[ordered]@{schema=1;kind='FRESH_INSTALL_CANDIDATE_EARLY_FAILURE';controlCommit=$env:GITHUB_SHA;runId=$env:GITHUB_RUN_ID;runAttempt=1;stage='SOURCE';classification=$(if($taskSupervisorClass -cin @('PASS','NOT_STARTED')){'REPORT_INVALID'}else{$taskSupervisorClass});status='FAIL';isolation=$(if($taskDriveRestored){'RESTORED'}else{'UNKNOWN'});recovery=$taskRecovery}
  }
  [IO.File]::WriteAllText((Join-Path $taskPublish 'failure/early.json'),($taskEarly|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
}
('publish='+$taskPublish)|Out-File -LiteralPath $env:GITHUB_OUTPUT -Append -Encoding utf8
if(!$taskPass){exit 1}
