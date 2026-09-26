$script:KSessionSequenceExpectedPhases=@(
  'PRE_ENV_READY',
  'PRE_BETA1_INSTALL',
  'PRE_REGISTRATION_ASSERT',
  'PRE_LAUNCH_READY',
  'PRE_BETA1_CORE_PROBE',
  'PRE_U02_RUNNING_GUARD',
  'PRE_BETA1_STOP',
  'PRE_OWNED_STATE_SNAPSHOT',
  'BASELINE',
  'U15',
  'AFTER_U15',
  'U16',
  'AFTER_U16',
  'U17',
  'AFTER_U17',
  'U18',
  'U20_PRECOPY',
  'U22'
)

function Test-KSessionSequenceReport {
  param([Parameter(Mandatory=$true)]$Report)

  if(!($Report -is [System.Management.Automation.PSCustomObject])){throw 'SEQUENCE_REPORT_SCHEMA'}
  $taskReportKeys=@($Report.PSObject.Properties.Name|Sort-Object)
  if(($taskReportKeys -join ',') -cne 'phases,schema,status' -or !($Report.schema -is [long]) -or $Report.schema -ne 1 -or
     !($Report.status -is [string]) -or !(@('PASS','FAIL') -ccontains $Report.status) -or !($Report.phases -is [System.Array])){
    throw 'SEQUENCE_REPORT_SCHEMA'
  }

  $taskPhases=@($Report.phases)
  if($taskPhases.Count -lt 1 -or $taskPhases.Count -gt $script:KSessionSequenceExpectedPhases.Count -or
     ($Report.status -ceq 'PASS' -and $taskPhases.Count -ne $script:KSessionSequenceExpectedPhases.Count)){
    throw 'SEQUENCE_REPORT_PHASE_COUNT'
  }

  for($taskIndex=0;$taskIndex -lt $taskPhases.Count;$taskIndex++){
    $taskPhase=$taskPhases[$taskIndex]
    if(!($taskPhase -is [System.Management.Automation.PSCustomObject])){throw 'SEQUENCE_REPORT_PHASE_ORDER'}
    $taskPhaseKeys=@($taskPhase.PSObject.Properties.Name|Sort-Object)
    $taskExpectedPhase=$script:KSessionSequenceExpectedPhases[$taskIndex]
    if(($taskPhaseKeys -join ',') -cne 'phase,result,state' -or !($taskPhase.phase -is [string]) -or
       !($taskPhase.result -is [string]) -or !($taskPhase.state -is [string]) -or $taskPhase.phase -cne $taskExpectedPhase){
      throw 'SEQUENCE_REPORT_PHASE_ORDER'
    }

    $taskExpectedResult='STAGE_COMPLETE'
    $taskExpectedState='COMPLETE'
    switch($taskExpectedPhase){
      {$_ -in @('BASELINE','AFTER_U15','AFTER_U16','AFTER_U17','U20_PRECOPY')} {
        $taskExpectedResult='IDENTITY_ACCEPTED';$taskExpectedState='UNCHANGED';break
      }
      'U15' {$taskExpectedResult='PREFLIGHT_REJECTED';$taskExpectedState='CONTROLLED_MUTATION';break}
      'U16' {$taskExpectedResult='IDENTITY_BINDING';$taskExpectedState='CONTROLLED_MUTATION';break}
      'U17' {$taskExpectedResult='IDENTITY_PROGRAM';$taskExpectedState='CONTROLLED_MUTATION';break}
      'U18' {$taskExpectedResult='SPACE_REJECTED';$taskExpectedState='UNCHANGED';break}
      'U22' {$taskExpectedResult='PAYLOAD_HASH_REJECTED';$taskExpectedState='UNCHANGED';break}
    }

    $taskSuccess=($taskPhase.result -ceq $taskExpectedResult -and $taskPhase.state -ceq $taskExpectedState)
    $taskStopped=($taskPhase.result -ceq 'STAGE_FAILED' -and $taskPhase.state -ceq 'STOPPED')
    $taskIdentityFailure=(@('BASELINE','AFTER_U15','AFTER_U16','AFTER_U17','U20_PRECOPY') -ccontains $taskExpectedPhase -and
      $taskPhase.result -cmatch '^(IDENTITY_(ACCEPTED|REGISTRATION(_(COUNT|NAME|VERSION|NAME_VERSION|SNAPSHOT|CONFLICT|UNINSTALL|AMBIGUOUS|INCONSISTENT))?|BINDING|PATH|MANIFEST|PROGRAM|BUILD|RUNTIME|LAUNCHER|INTERNAL))$' -and
      @('UNCHANGED','CHANGED') -ccontains $taskPhase.state -and -not $taskSuccess)
    $taskFaultFailure=(
      ($taskExpectedPhase -ceq 'U22' -and @(
        'PAYLOAD_HASH_UNEXPECTED_SUCCESS','PAYLOAD_HASH_GATE_NOT_ACCEPTED','PAYLOAD_HASH_PREPARE_NOT_REACHED',
        'PAYLOAD_HASH_NATIVE_COPY_NOT_REACHED','PAYLOAD_HASH_UNEXPECTED_SWAP','PAYLOAD_HASH_UNEXPECTED_VERIFY',
        'PAYLOAD_HASH_UNEXPECTED_FINALIZE','PAYLOAD_HASH_REASON_MISSING','PAYLOAD_HASH_FAILURE_HANDLER_MISSING',
        'PAYLOAD_HASH_REASON_CONFLICT','PAYLOAD_HASH_ROLLBACK_FAILED','PAYLOAD_HASH_ROLLBACK_MARKER_MISSING','PAYLOAD_HASH_STATE_CHANGED') -ccontains $taskPhase.result)
    ) -and (@('UNCHANGED','CHANGED') -ccontains $taskPhase.state) -and -not $taskSuccess
    $taskLast=($taskIndex -eq $taskPhases.Count-1)

    if((!$taskLast -and !$taskSuccess) -or
       ($taskLast -and $Report.status -ceq 'PASS' -and !$taskSuccess) -or
       ($taskLast -and $Report.status -ceq 'FAIL' -and !($taskStopped -or $taskIdentityFailure -or $taskFaultFailure))){
      throw 'SEQUENCE_REPORT_UNSAFE'
    }
  }
}
