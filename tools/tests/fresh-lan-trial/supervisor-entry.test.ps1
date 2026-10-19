param([Parameter(Mandatory=$true)][string]$Node,[Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'fast-delivery/job-scope.ps1')
. (Join-Path $PSScriptRoot '../../windows-firewall/test-environment.ps1')
. (Join-Path $PSScriptRoot 'install-r2/physical-work.ps1')
. (Join-Path $PSScriptRoot 'supervisor-entry.ps1')
if(Test-Path -LiteralPath $Root){throw 'NEW_OWNED_ROOT_REQUIRED'}
New-Item -ItemType Directory -Path $Root|Out-Null
$pass=0;$cases=@();$pwsh=(Get-Command pwsh).Source
function Must([bool]$v){if(!$v){throw 'SUPERVISOR_ACTUAL_ASSERT_FAILED'};$script:pass++}
function Reject([scriptblock]$f){$r=$false;try{& $f|Out-Null}catch{$r=$true};Must $r}
function Run([string]$name,[string]$code,[int]$seconds=10,[scriptblock]$assign=$null,[scriptblock]$resume=$null){
 $f=Join-Path $Root ($name+'.cjs');[IO.File]::WriteAllText($f,$code)
 $r=Invoke-FastOwnedProcess $Node @($f) (Join-Path $Root ($name+'.gate')) $seconds -Detail -AssignOperation $assign -ResumeOperation $resume
 Must $r.scope.handlesClosed;Assert-FreshSupervisorScope $r.scope
 $script:cases+=@{name=$name;classification=$r.classification;proof=$r.scope;resumed=$r.childResumed}
 return $r
}
try{
 Must ((ConvertTo-FreshSupervisorWork 'E:/fresh-trial') -ceq 'E:\fresh-trial')
 foreach($p in @('E:/fresh-trial/../other','F:/fresh-trial','E:/fresh-trial/child')){Reject {ConvertTo-FreshSupervisorWork $p}}
 $r=Run 'normal' "require('node:fs').readFileSync(process.env.KSESSION_FAST_JOB_GATE,'utf8')==='ASSIGNED'||process.exit(7)";Must ($r.scope.status -ceq 'PASS' -and $r.childResumed)
 $marker=Join-Path $Root 'before-resume-marker';$markerCode="require('node:fs').writeFileSync("+($marker|ConvertTo-Json -Compress)+",'executed')"
 $r=Run 'assign-noop' $markerCode 2 {};Must ($r.classification -ceq 'JOB_ASSIGNMENT_FAILED' -and !$r.scope.assigned -and !$r.childResumed -and !(Test-Path $marker))
 $r=Run 'assign-invalid' $markerCode 2 {param($j,$p)[FirewallR3Job]::Assign([IntPtr]::Zero,$p)};Must ($r.classification -ceq 'JOB_ASSIGNMENT_FAILED' -and !$r.childResumed -and !(Test-Path $marker))
 $r=Run 'resume-fail' $markerCode 2 $null {throw 'CONTROLLED_RESUME_FAILURE'};Must ($r.classification -ceq 'JOB_HANDSHAKE_FAILED' -and $r.scope.jobEmpty -and !$r.childResumed -and !(Test-Path $marker))
 $r=Run 'gate-race' $markerCode 2 {param($j,$p)[FirewallR3Job]::Assign($j,$p);[IO.File]::WriteAllText((Join-Path $Root 'gate-race.gate'),'foreign')};Must ($r.classification -ceq 'JOB_HANDSHAKE_FAILED' -and !$r.childResumed -and !(Test-Path $marker));Must (([IO.File]::ReadAllText((Join-Path $Root 'gate-race.gate'))) -ceq 'foreign')
 foreach($c in @(@('stderr',"process.stderr.write('controlled')",'CHILD_EXIT_FAILED'),@('exit',"process.exit(8)",'CHILD_EXIT_FAILED'),@('ci',"process.stderr.write('FRESH_CI_ENTRY_REJECTED\n');process.exit(1)",'CI_ENTRY_REJECTED'),@('env',"process.stderr.write('FRESH_ENV_PRECHECK_FAILED\n');process.exit(1)",'ENV_PRECHECK_FAILED'),@('utf8',"process.stdout.write(Buffer.from([255]))",'CHILD_EXIT_FAILED'))){$r=Run $c[0] $c[1];Must ($r.scope.status -ceq 'FAIL' -and $r.scope.jobEmpty -and $r.classification -ceq $c[2])}
 $r=Run 'timeout' "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit',windowsHide:true})" 1;Must ($r.scope.status -ceq 'FAIL' -and $r.scope.jobEmpty -and $r.scope.forcedTermination -and $r.classification -ceq 'SUPERVISOR_TIMEOUT')
 $r=Invoke-FastOwnedProcess (Join-Path $Root 'missing.exe') @() (Join-Path $Root 'missing.gate') 1 -Detail;Must ($r.classification -ceq 'SUPERVISOR_START_FAILED' -and $r.scope.handlesClosed -and !$r.childResumed)
 # Exercise native Windows argv quoting, Unicode environment/cwd, and parent env restoration.
 $argsFile=Join-Path $Root 'args.cjs';$argsResult=Join-Path $Root 'args-result.json';$expected=@('','a b','中文','a"b','tail\','a\\"b','&|<>$()')
 [IO.File]::WriteAllText($argsFile,"require('node:fs').writeFileSync(process.argv[2],JSON.stringify({args:JSON.stringify(process.argv.slice(3))===process.env.FRESH_EXPECTED_ARGS,cwd:process.cwd()===process.env.FRESH_EXPECTED_CWD,env:process.env.FRESH_SUPERVISOR_UNICODE==='受控环境',options:process.env.NODE_OPTIONS==='',path:process.env.NODE_PATH===''}))")
 $saved=@{};foreach($k in @('NODE_OPTIONS','NODE_PATH','FRESH_SUPERVISOR_UNICODE','FRESH_EXPECTED_ARGS','FRESH_EXPECTED_CWD')){$saved[$k]=[Environment]::GetEnvironmentVariable($k,'Process')}
 try{$env:NODE_OPTIONS='--invalid-parent-sentinel';$env:NODE_PATH='parent-sentinel';$env:FRESH_SUPERVISOR_UNICODE='受控环境';$env:FRESH_EXPECTED_ARGS=$expected|ConvertTo-Json -Compress;$env:FRESH_EXPECTED_CWD=(Get-Location).ProviderPath;$r=Invoke-FastOwnedProcess $Node (@($argsFile,$argsResult)+$expected) (Join-Path $Root 'args.gate') 10 -Detail;Must ($r.scope.status -ceq 'PASS');$a=Get-Content $argsResult -Raw|ConvertFrom-Json;Must ($a.args -eq $true -and $a.cwd -eq $true -and $a.env -eq $true -and $a.options -eq $true -and $a.path -eq $true);Must ($env:NODE_OPTIONS -ceq '--invalid-parent-sentinel' -and $env:NODE_PATH -ceq 'parent-sentinel')}finally{foreach($k in $saved.Keys){[Environment]::SetEnvironmentVariable($k,$saved[$k],'Process')}}
 # A genuinely inheritable unrelated parent event must remain unsignaled by the child.
 Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class FreshInheritanceTest{[DllImport("kernel32.dll")]public static extern bool SetHandleInformation(IntPtr h,uint mask,uint flags);}'
 $event=[Threading.EventWaitHandle]::new($false,[Threading.EventResetMode]::ManualReset);$eventHandle=$event.SafeWaitHandle.DangerousGetHandle();$oldEvent=[Environment]::GetEnvironmentVariable('FRESH_PARENT_EVENT','Process')
 $inheritFixture=Join-Path $Root 'inherit.ps1'
 [IO.File]::WriteAllText($inheritFixture,'Add-Type -TypeDefinition ''using System;using System.Runtime.InteropServices;public static class ChildEvent{[DllImport("kernel32.dll")]public static extern bool SetEvent(IntPtr h);}'';[void][ChildEvent]::SetEvent([IntPtr]::new([long]$env:FRESH_PARENT_EVENT))')
 try{Must ([FreshInheritanceTest]::SetHandleInformation($eventHandle,1,1));$env:FRESH_PARENT_EVENT=$eventHandle.ToInt64().ToString();$r=Invoke-FastOwnedProcess $pwsh @('-NoProfile','-File',$inheritFixture) (Join-Path $Root 'inherit.gate') 10 -Detail;Must ($r.scope.status -ceq 'PASS' -and !$event.WaitOne(0))}finally{[void][FreshInheritanceTest]::SetHandleInformation($eventHandle,1,0);$event.Dispose();[Environment]::SetEnvironmentVariable('FRESH_PARENT_EVENT',$oldEvent,'Process')}
 # Warm runtime before measuring repeated native ownership/close paths.
 $baseline=[Diagnostics.Process]::GetCurrentProcess().HandleCount
 for($i=0;$i -lt 20;$i++){$r=Invoke-FastOwnedProcess $Node @('-e','') (Join-Path $Root ('repeat-'+$i+'.gate')) 10;Must ($r.status -ceq 'PASS' -and $r.handlesClosed -and $r.jobEmpty)}
 [GC]::Collect();[GC]::WaitForPendingFinalizers();$after=[Diagnostics.Process]::GetCurrentProcess().HandleCount;Must ($after -le $baseline+4)
 # Actual held sink, exclusive foreign file rejection, bounded no-follow read, source-private owner.
 $id=@{sourceCommit='a'*40;controlCommit='b'*40;run=@{id='123';attempt=1}}
 $sinkRoot=Join-Path $Root 'sink';New-Item -ItemType Directory $sinkRoot|Out-Null
 [IO.File]::WriteAllText((Join-Path $sinkRoot 'isolation-private.json'),'{"schema":1,"runId":"123","drive":"E:","created":false,"target":null}')
 $sink=New-FreshSupervisorSink $sinkRoot $id
 try{Set-FreshSupervisorDiagnostic $sink 'SUPERVISOR_CONTEXT' 'NOT_STARTED';Reject {[IO.File]::WriteAllText((Join-Path $sinkRoot 'supervisor-entry-private.json'),'foreign')};Set-FreshSupervisorDiagnostic $sink 'CI_ENTRY' 'CI_ENTRY_REJECTED';Set-FreshSupervisorDiagnostic $sink 'SUPERVISOR_JOB' 'PASS';Must ($sink.last.diagnostic.classification -ceq 'CI_ENTRY_REJECTED')}finally{Close-FreshSupervisorSink $sink}
 $raw=Read-FreshSupervisorDiagnostic $sinkRoot $id;Must (($raw|ConvertFrom-Json).diagnostic.classification -ceq 'CI_ENTRY_REJECTED')
 $sink=New-FreshSupervisorSink $sinkRoot $id;try{Reject {Set-FreshSupervisorDiagnostic $sink 'SUPERVISOR_CONTEXT' 'NOT_STARTED'};Must ((Read-FreshSupervisorDiagnostic $sinkRoot $id) -ceq $raw)}finally{Close-FreshSupervisorSink $sink}
 $large=Join-Path $Root 'large.json';[IO.File]::WriteAllText($large,('x'*16385));Reject {[FreshWorkDirectoryNative]::ReadFixedFile($large)}
 $products=@{};foreach($k in @('binding','desktop','productRegistration','programFiles','programs','startup')){$products[$k]=@{known=$true}}
 Assert-FreshEnvPrecheck @{known=$true} @{known=$true} @{known=$true;absent=$true} $products;Must $true
 Reject {Assert-FreshEnvPrecheck @{known=$false} @{known=$true} @{known=$true;absent=$true} $products}
 $result=@{schema=1;kind='SUPERVISOR_ENTRY_ACTUAL_WINDOWS';pass=$pass;fail=0;skipped=0;cases=$cases;handleRepeatCount=20;handleGrowthWithinBound=($after -le $baseline+4);unrelatedHandleNotInherited=$true;productExecuted=$false;rawOutputStored=$false}
 [IO.File]::WriteAllText((Join-Path $Root 'result.json'),($result|ConvertTo-Json -Depth 10 -Compress));Write-Output ('SUPERVISOR_ENTRY_ACTUAL_PASS '+$pass)
}catch{[IO.File]::WriteAllText((Join-Path $Root 'result.json'),(@{schema=1;kind='SUPERVISOR_ENTRY_ACTUAL_WINDOWS';pass=$pass;fail=1;skipped=0;cases=$cases;productExecuted=$false;rawOutputStored=$false}|ConvertTo-Json -Depth 10 -Compress));throw}
