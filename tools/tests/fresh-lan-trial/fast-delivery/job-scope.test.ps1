param([Parameter(Mandatory=$true)][string]$Node,[Parameter(Mandatory=$true)][string]$Evidence)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'job-scope.ps1')
if(Test-Path -LiteralPath $Evidence){throw 'Unknown scope test root'}
New-Item -ItemType Directory -Path $Evidence|Out-Null
$taskResults=@()
foreach($taskMode in @('normal','stderr','nonzero','descendant-timeout')){
  $taskScript=Join-Path $Evidence ($taskMode+'.cjs')
  $taskWork=switch($taskMode){'normal'{"require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},100)'],{stdio:'inherit',windowsHide:true});"}'stderr'{"process.stderr.write('synthetic private sentinel');"}'nonzero'{"process.exitCode=7;"}'descendant-timeout'{"require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit',windowsHide:true});"}}
  $taskCode="const fs=require('node:fs');function go(){if(!fs.existsSync(process.env.KSESSION_FAST_JOB_GATE)){setTimeout(go,10);return;}"+$taskWork+'}go();'
  [IO.File]::WriteAllText($taskScript,$taskCode,[Text.UTF8Encoding]::new($false))
  $taskTimeout=if($taskMode -eq 'descendant-timeout'){1}else{10}
  $taskResult=Invoke-FastOwnedProcess $Node @($taskScript) (Join-Path $Evidence ($taskMode+'.gate')) $taskTimeout
  if($taskResult.status -cne $(if($taskMode -eq 'normal'){'PASS'}else{'FAIL'}) -or $taskResult.jobEmpty -ne $true -or !$taskResult.handlesClosed){throw 'Owned process proof gate failed'}
  if($taskResult.forcedTermination -ne ($taskMode -eq 'descendant-timeout')){throw 'Forced cleanup was hidden'}
  $taskResults+=@{mode=$taskMode;proof=$taskResult}
}
$taskResult=Invoke-FastOwnedProcess (Join-Path $Evidence 'missing.exe') @() (Join-Path $Evidence 'start.gate') 1
if($taskResult.status -cne 'FAIL' -or $taskResult.jobEmpty -ne $null){throw 'Start failure became proof'}
$taskResults+=@{mode='start-failed';proof=$taskResult}
[IO.File]::WriteAllText((Join-Path $Evidence 'proof.json'),($taskResults|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
Write-Output 'FAST_SCOPE_5_REAL_GATES_PASS'
