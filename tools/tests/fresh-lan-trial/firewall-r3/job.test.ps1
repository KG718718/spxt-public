param([Parameter(Mandatory=$true)][string]$Node,[Parameter(Mandatory=$true)][string]$Evidence)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'job.ps1')
if(Test-Path -LiteralPath $Evidence){throw 'Unknown evidence directory'}
New-Item -ItemType Directory -Path $Evidence|Out-Null
$taskResults=@()
foreach($taskMode in @('normal','forced')){
  $taskGate=Join-Path $Evidence ($taskMode+'.gate')
  $taskScript=Join-Path $Evidence ($taskMode+'.cjs')
  $taskChild=if($taskMode -eq 'normal'){'setTimeout(()=>{},500)'}else{'setInterval(()=>{},1000)'}
  $taskCode='const fs=require("node:fs"),cp=require("node:child_process");const gate=process.argv[2];function ready(){if(!fs.existsSync(gate)){setTimeout(ready,20);return;}cp.spawn(process.execPath,["-e",'+($taskChild|ConvertTo-Json -Compress)+'],{stdio:"ignore",windowsHide:true});'+$(if($taskMode -eq 'forced'){'setInterval(()=>{},1000);'}else{''})+'}ready();'
  [IO.File]::WriteAllText($taskScript,$taskCode,[Text.UTF8Encoding]::new($false))
  $taskJob=[FirewallR3Job]::Create();$taskProcess=$null;$taskKilled=$false
  try{
    $taskProcess=Start-Process -FilePath $Node -ArgumentList ('"'+$taskScript+'" "'+$taskGate+'"') -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Evidence ($taskMode+'.out')) -RedirectStandardError (Join-Path $Evidence ($taskMode+'.err'))
    [FirewallR3Job]::Assign($taskJob,$taskProcess.Handle)
    if([FirewallR3Job]::Active($taskJob) -ne 1){throw 'Root job ownership not proven'}
    [IO.File]::WriteAllText($taskGate,'ASSIGNED')
    $taskDeadline=[DateTime]::UtcNow.AddSeconds(10)
    while([FirewallR3Job]::Active($taskJob) -lt 2 -and [DateTime]::UtcNow -lt $taskDeadline){Start-Sleep -Milliseconds 10}
    if([FirewallR3Job]::Active($taskJob) -lt 2){throw 'Descendant job ownership not proven'}
    if($taskMode -eq 'forced'){$taskKilled=$true;[FirewallR3Job]::Stop($taskJob)}
    if(!$taskProcess.WaitForExit(10000)){throw 'Bounded job exit not proven'}
    if(!(Wait-FirewallR3JobEmpty $taskJob)){throw 'Job empty not proven'}
    $taskProcess.Refresh()
    if($taskMode -eq 'normal' -and ($taskKilled -or $taskProcess.ExitCode -ne 0)){throw 'Natural success not proven'}
    if($taskMode -eq 'forced' -and $taskProcess.ExitCode -eq 0){throw 'Forced termination hidden'}
    $taskResults+=@{mode=$taskMode;descendantOwned=$true;jobEmpty=$true;forcedTermination=$taskKilled;naturalSuccess=($taskMode -eq 'normal')}
  }finally{
    if($null-ne$taskProcess -and !$taskProcess.HasExited){[FirewallR3Job]::Stop($taskJob);$taskProcess.WaitForExit(10000)|Out-Null}
    [FirewallR3Job]::CloseHandle($taskJob)|Out-Null
  }
}
[IO.File]::WriteAllText((Join-Path $Evidence 'result.json'),($taskResults|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
Write-Output 'FIREWALL_R3_JOB_NORMAL_AND_FORCED_PASS'
