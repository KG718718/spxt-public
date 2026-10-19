param([Parameter(Mandatory=$true)][string]$Node,[Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'fast-delivery/job-scope.ps1')
. (Join-Path $PSScriptRoot '../../windows-firewall/test-environment.ps1')
. (Join-Path $PSScriptRoot 'install-r2/physical-work.ps1')
. (Join-Path $PSScriptRoot 'supervisor-entry.ps1')
if(Test-Path -LiteralPath $Root){throw 'NEW_OWNED_ROOT_REQUIRED'}
New-Item -ItemType Directory $Root|Out-Null
$pass=0;$cases=@();$entry=Join-Path $PSScriptRoot 'supervisor-entry.ps1';$pwsh=(Get-Command pwsh).Source
function Must([bool]$v){if(!$v){throw 'SUPERVISOR_CORE_ASSERT_FAILED'};$script:pass++}
$fixture=Join-Path $Root 'ci-fixture.ps1'
[IO.File]::WriteAllText($fixture,@'
param([string]$Entry,[string]$Mode)
$ErrorActionPreference='Stop';. $Entry
try{Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE 2}catch{[Console]::Error.WriteLine('FRESH_CI_ENTRY_REJECTED');exit 1}
if($Mode -eq 'env'){
 $products=@{};foreach($k in @('binding','desktop','productRegistration','programFiles','programs','startup')){$products[$k]=@{known=$true}}
 try{Assert-FreshEnvPrecheck @{known=$false} @{known=$true} @{known=$true;absent=$true} $products}catch{[Console]::Error.WriteLine('FRESH_ENV_PRECHECK_FAILED');exit 1}
}
if($Mode -eq 'ci'){[Console]::Error.WriteLine('FRESH_CI_ENTRY_REJECTED');exit 1}
'@)
foreach($mode in @('normal','context','binding-denied','env','ci','report-collision','mapping-invalid','sink-foreign')){
 $case=Join-Path $Root $mode;New-Item -ItemType Directory $case|Out-Null
 $control=Join-Path $case 'control';$physical=Join-Path $case 'work';New-Item -ItemType Directory $control,$physical|Out-Null
 [IO.File]::WriteAllText((Join-Path $control 'isolation-private.json'),'{"schema":1,"runId":"123","drive":"E:","created":false,"target":null}')
 $id=@{sourceCommit='a'*40;controlCommit='b'*40;run=@{id='123';attempt=1}}
 $sink=New-FreshSupervisorSink $control $id
 if($mode -eq 'report-collision'){[IO.File]::WriteAllText((Join-Path $physical 'scope-job-proof.json'),'foreign')}
 if($mode -eq 'sink-foreign'){[IO.File]::WriteAllText((Join-Path $control 'supervisor-entry-private.json'),'foreign')}
 try{
  $verify={param($p)
   if($mode -eq 'context'){throw 'CONTROLLED_CONTEXT_REJECTION'}
   $s=Invoke-FastOwnedProcess $Node @('-e','') (Join-Path $control 'context.gate') 10 -Detail
   return [pscustomobject]@{scope=$s.scope}
  }
  $open={param($p)
   if($mode -eq 'binding-denied'){throw [UnauthorizedAccessException]::new('CONTROLLED_DENIED')}
   $receipt=[pscustomobject]@{schema=1;runId='123';drive=[IO.Path]::GetPathRoot($p).TrimEnd('\');created=$false;target=$null}
   New-FreshPhysicalWorkBinding $p $receipt '123' $Root
  }
  $execute={param($p,$physicalPath)
   $d=Invoke-FastOwnedProcess $pwsh @('-NoProfile','-File',$fixture,'-Entry',$entry,'-Mode',$mode) (Join-Path $physicalPath 'child.gate') 10 -Detail
   if($mode -eq 'mapping-invalid'){$binding.device='CONTROLLED_CHANGED'}
   return $d
  }
  $ok=Invoke-FreshSupervisorCore $physical $sink $verify $open $execute {param($p)$p}
  Must ($ok -eq ($mode -eq 'normal'))
 }finally{Close-FreshSupervisorSink $sink}
 $raw=Read-FreshSupervisorDiagnostic $control $id;$r=$raw|ConvertFrom-Json
 $wanted=switch($mode){'normal'{'PASS'}'context'{'SUPERVISOR_CONTEXT_REJECTED'}'binding-denied'{'WORK_BINDING_REJECTED'}'env'{'ENV_PRECHECK_FAILED'}'ci'{'CI_ENTRY_REJECTED'}'mapping-invalid'{'WORK_BINDING_REJECTED'}default{'REPORT_WRITE_FAILED'}}
 Must ($r.diagnostic.classification -ceq $wanted)
 Must ($raw -notmatch 'identity|CONTROLLED|foreign|[A-Z]:\\')
 if($mode -eq 'normal'){
  $owner=Read-FreshSupervisorWorkOwner $control $id|ConvertFrom-Json
  Must ($owner.identity -cmatch '^[A-F0-9]{24}$' -and $r.workObserved -and $r.workMatched)
 }
 if($mode -eq 'mapping-invalid'){Must (!$r.workMatched)}
 if($mode -eq 'report-collision'){Must ((Get-Content (Join-Path $physical 'scope-job-proof.json') -Raw) -ceq 'foreign')}
 if($mode -eq 'sink-foreign'){Must ((Get-Content (Join-Path $control 'supervisor-entry-private.json') -Raw) -ceq 'foreign')}
 $cases+=@{mode=$mode;classification=$wanted;workObserved=$r.workObserved;workMatched=$r.workMatched}
}
[IO.File]::WriteAllText((Join-Path $Root 'result.json'),(@{schema=1;kind='SUPERVISOR_SHARED_CORE_ACTUAL';pass=$pass;fail=0;skipped=0;cases=$cases;contextAndCi='CONTROLLED_FIXTURES_NOT_HOSTED_MAIN';productExecuted=$false;rawOutputStored=$false}|ConvertTo-Json -Depth 5 -Compress))
Write-Output ('SUPERVISOR_CORE_ACTUAL_PASS '+$pass)
