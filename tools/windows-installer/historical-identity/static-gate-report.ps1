function Test-KSessionHistoricalStaticGateReport {
  param(
    [Parameter(Mandatory=$true)]$Report,
    [Parameter(Mandatory=$true)][string]$ExpectedCommit
  )
  if(!($Report -is [Management.Automation.PSCustomObject])){throw 'HISTORICAL_STATIC_REPORT_SCHEMA'}
  $taskKeys=@($Report.PSObject.Properties.Name|Sort-Object)
  if(($taskKeys -join ',') -cne 'gate,schema,sourceCommit,status' -or
     !($Report.schema -is [long]) -or $Report.schema -ne 1 -or
     !($Report.gate -is [string]) -or $Report.gate -cne 'HISTORICAL_IDENTITY_STATIC' -or
     !($Report.status -is [string]) -or @('PASS','FAIL') -cnotcontains $Report.status -or
     !($Report.sourceCommit -is [string]) -or $Report.sourceCommit -cnotmatch '^[a-f0-9]{40}$' -or
     $ExpectedCommit -cnotmatch '^[a-f0-9]{40}$' -or $Report.sourceCommit -cne $ExpectedCommit){
    throw 'HISTORICAL_STATIC_REPORT_SCHEMA'
  }
}
