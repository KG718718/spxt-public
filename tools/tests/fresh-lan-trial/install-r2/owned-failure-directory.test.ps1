param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
trap{[Console]::Error.WriteLine('OWNED_FAILURE_DIRECTORY_COUNTER_FAILED');exit 1}
. (Join-Path $PSScriptRoot '../supervisor-entry.ps1')
Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE 5
if(Test-Path -LiteralPath $Root){throw 'NEW_OWNED_ROOT_REQUIRED'}
New-Item -ItemType Directory -Path $Root|Out-Null
[IO.File]::WriteAllText((Join-Path $Root '.owned.json'),'{"kind":"AB_PRIVATE_FAILURE_DIRECTORY_TEST"}')
Add-Type -Path (Join-Path $PSScriptRoot 'owned-failure-directory.cs')
$taskPass=0;$taskRestored=$true
function Assert-FailureFixture([bool]$Value){if(!$Value){throw 'FIXTURE_COUNTER_FAILED'};$script:taskPass++}
foreach($taskScene in @('normal','collision','foreign-child','external-acl','retired-replaced','after-create','after-acl')){
 $taskName='ab-failure-'+[guid]::NewGuid().ToString('N')
 $taskReceipt=if($taskScene -ceq 'after-create'){[FreshFailureDirectory]::ControlledInterruptedCreate($Root,$taskName,1)}elseif($taskScene -ceq 'after-acl'){[FreshFailureDirectory]::ControlledInterruptedCreate($Root,$taskName,2)}else{[FreshFailureDirectory]::Create($Root,$taskName)}
 try{
  Assert-FailureFixture $taskReceipt.CreatedNew
  if($taskScene -in @('after-create','after-acl')){Assert-FailureFixture (!$taskReceipt.Ready);Assert-FailureFixture ($taskReceipt.CreationFailure -ceq 'CREATION_INCOMPLETE');Assert-FailureFixture ($taskReceipt.Restore() -ceq 'OWNED_REMOVED');Assert-FailureFixture (!(Test-Path -LiteralPath $taskReceipt.Path));continue}
  Assert-FailureFixture $taskReceipt.Ready
  Assert-FailureFixture ($taskReceipt.FileProbe())
  Assert-FailureFixture ($taskReceipt.ChildCreateDenied())
  Assert-FailureFixture (@(Get-ChildItem -LiteralPath $taskReceipt.Path -Force).Count -eq 0)
  switch($taskScene){
   'collision'{$taskCollision=$false;try{$taskOther=[FreshFailureDirectory]::Create($Root,$taskName);$taskOther.Dispose()}catch{$taskCollision=$true};Assert-FailureFixture $taskCollision}
   'foreign-child'{
    $taskActor=[IO.FileStream]::new((Join-Path $taskReceipt.Path 'actor-private.txt'),[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::Read,4096,[IO.FileOptions]::DeleteOnClose)
    try{$taskActor.WriteByte(73);$taskActor.Flush();Assert-FailureFixture ($taskReceipt.Restore() -ceq 'UNOWNED_CHILDREN_PRESENT');$taskActor.Position=0;Assert-FailureFixture ($taskActor.ReadByte() -eq 73)}finally{$taskActor.Dispose()}
   }
   'external-acl'{$taskReceipt.ControlledAclChange();Assert-FailureFixture ($taskReceipt.Restore() -ceq 'ACL_CHANGED');$taskReceipt.ControlledActorUndo()}
  }
  Assert-FailureFixture ($taskReceipt.Restore() -ceq 'OWNED_REMOVED')
  Assert-FailureFixture (!(Test-Path -LiteralPath $taskReceipt.Path))
  if($taskScene -ceq 'retired-replaced'){
   $taskOther=[FreshFailureDirectory]::Create($Root,$taskName)
   try{Assert-FailureFixture ($taskReceipt.Restore() -ceq 'RETIRED_CHANGED');Assert-FailureFixture ($taskOther.FileProbe());Assert-FailureFixture ($taskOther.Restore() -ceq 'OWNED_REMOVED')}finally{$taskOther.Dispose()}
  }
 }finally{$taskReceipt.Dispose()}
}
$taskReport=@{schema=1;kind='AB_PRIVATE_FAILURE_DIRECTORY_COUNTERS';pass=$taskPass;fail=0;skip=0;fileProbePassed=$true;childMkdirDenied=$true;privateAclIdentityRestored=$taskRestored;productSetupExecuted=$false;productRegistryTouched=$false;globalAclChanged=$false;rawOutputStored=$false}
[IO.File]::WriteAllText((Join-Path $Root 'result.json'),($taskReport|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
$taskReport|ConvertTo-Json -Compress
