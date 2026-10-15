param([Parameter(Mandatory=$true)][string]$Node)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'memory-process.ps1')
$taskText='中文 Ω 🚀 literal $ quote'
$taskResult=Invoke-KSessionMemoryProcess $Node @('-e',"process.stdin.setEncoding('utf8');let s='';process.stdin.on('data',v=>s+=v);process.stdin.on('end',()=>{process.stdout.write(s);process.stderr.write('fixed-error')})") 10 $taskText
if($taskResult.ExitCode -ne 0 -or $taskResult.Stdout -cne $taskText -or $taskResult.Stderr -cne 'fixed-error' -or $taskResult.ForcedTermination){throw 'Memory Unicode/stream gate failed'}
$taskClock=[Diagnostics.Stopwatch]::StartNew()
$taskResult=Invoke-KSessionMemoryProcess $Node @('-e','setInterval(()=>{},1000)') 1 ('x'*2000000)
if($taskResult.ExitCode -ne 124 -or !$taskResult.TimedOut -or !$taskResult.ForcedTermination -or !$taskResult.RootExited -or $taskClock.Elapsed.TotalSeconds -gt 8){throw 'Bounded blocked-input rejection failed'}
$taskResult=Invoke-KSessionMemoryProcess $Node @('-e','process.exit(7)') 10
if($taskResult.ExitCode -ne 7 -or $taskResult.TimedOut){throw 'Nonzero rejection failed'}
Write-Output 'MEMORY_PROCESS_3_GATES_PASS'
