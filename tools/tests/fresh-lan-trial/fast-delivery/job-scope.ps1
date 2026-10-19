. (Join-Path $PSScriptRoot '../firewall-r3/job.ps1')
. (Join-Path $PSScriptRoot 'suspended-process.ps1')
function Invoke-FastOwnedProcess([string]$Executable,[string[]]$Arguments,[string]$Gate,[int]$TimeoutSeconds=1800,[switch]$Detail,[scriptblock]$AssignOperation=$null,[scriptblock]$ResumeOperation=$null){
 if($PSVersionTable.PSVersion.Major -lt 7){throw 'PS7_REQUIRED'}
 $taskJob=[IntPtr]::Zero;$taskChild=$null;$taskStarted=$false;$taskStartAttempted=$false;$taskEmpty=$false;$taskForced=$false;$taskAssigned=$false;$taskNatural=$null;$taskStderr=$null;$taskPipes=$false;$taskHandles=$false;$taskExited=$false;$taskResumed=$false;$taskDiagnostic='CI_ENTRY_REJECTED'
 try{
  if(Test-Path -LiteralPath $Gate){throw 'Unknown scope gate'}
  $taskDiagnostic='SUPERVISOR_START_FAILED';$taskJob=[FirewallR3Job]::Create();$taskEnv=[Environment]::GetEnvironmentVariables();$taskEnv['KSESSION_FAST_JOB_GATE']=$Gate;$taskEnv['NODE_OPTIONS']='';$taskEnv['NODE_PATH']=''
  $taskStartAttempted=$true;$taskChild=[FreshSuspendedProcess]::Start($Executable,$Arguments,$taskEnv,(Get-Location).ProviderPath);$taskStarted=$true
  $taskOut=$taskChild.Out.ReadToEndAsync();$taskErr=$taskChild.Err.ReadToEndAsync();$taskDiagnostic='JOB_ASSIGNMENT_FAILED'
  if($null -ne $AssignOperation){& $AssignOperation $taskJob $taskChild.Handle}else{[FirewallR3Job]::Assign($taskJob,$taskChild.Handle)}
  if(!$taskChild.InJob($taskJob)){throw 'Job membership not proven'}
  $taskAssigned=$true;$taskDiagnostic='JOB_HANDSHAKE_FAILED'
  $taskGateFile=[IO.File]::Open($Gate,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$taskGateBytes=[Text.Encoding]::UTF8.GetBytes('ASSIGNED');$taskGateFile.Write($taskGateBytes,0,$taskGateBytes.Length)}finally{$taskGateFile.Dispose()}
  if($null -ne $ResumeOperation){& $ResumeOperation $taskChild}else{$taskChild.Resume()};$taskResumed=$taskChild.Resumed;$taskDiagnostic='CHILD_EXIT_FAILED'
  $taskDeadline=[DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while(!$taskChild.HasExited -and [DateTime]::UtcNow -lt $taskDeadline){Start-Sleep -Milliseconds 20}
  while(($taskChild.HasExited -and ([FirewallR3Job]::Active($taskJob) -ne 0 -or !$taskOut.IsCompleted -or !$taskErr.IsCompleted)) -and [DateTime]::UtcNow -lt $taskDeadline){Start-Sleep -Milliseconds 20}
  if(!$taskChild.HasExited -or [FirewallR3Job]::Active($taskJob) -ne 0 -or !$taskOut.IsCompleted -or !$taskErr.IsCompleted){$taskDiagnostic='SUPERVISOR_TIMEOUT';$taskForced=$true;[FirewallR3Job]::Stop($taskJob)}
  $taskEmpty=Wait-FirewallR3JobEmpty $taskJob;$taskExited=$taskChild.HasExited
  $taskDrain=[DateTime]::UtcNow.AddSeconds(5);while((!$taskOut.IsCompleted -or !$taskErr.IsCompleted) -and [DateTime]::UtcNow -lt $taskDrain){Start-Sleep -Milliseconds 10}
  if($taskExited){$taskNatural=!$taskForced -and $taskChild.ExitCode -eq 0};$taskPipes=$taskOut.IsCompleted -and $taskErr.IsCompleted -and !$taskOut.IsFaulted -and !$taskErr.IsFaulted
  if($taskPipes){$taskRawErr=$taskErr.GetAwaiter().GetResult();$taskStderr=$taskRawErr.Length -eq 0;if(!$taskForced){if($taskRawErr -match '(?m)^FRESH_CI_ENTRY_REJECTED\r?$'){$taskDiagnostic='CI_ENTRY_REJECTED'}elseif($taskRawErr -match '(?m)^FRESH_ENV_PRECHECK_FAILED\r?$'){$taskDiagnostic='ENV_PRECHECK_FAILED'}elseif($taskNatural -eq $true -and $taskStderr){$taskDiagnostic='PASS'}else{$taskDiagnostic='CHILD_EXIT_FAILED'}}}
 }catch{
  if($taskStarted -and !$taskChild.HasExited){$taskForced=$true;if($taskAssigned){[FirewallR3Job]::Stop($taskJob)}else{$taskChild.StopSuspendedRoot()}}
  if($taskAssigned){$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}
  if($taskStarted){
   $taskExited=$taskChild.HasExited
   $taskDrain=[DateTime]::UtcNow.AddSeconds(5);while((!$taskOut.IsCompleted -or !$taskErr.IsCompleted) -and [DateTime]::UtcNow -lt $taskDrain){Start-Sleep -Milliseconds 10}
   $taskPipes=$taskOut.IsCompleted -and $taskErr.IsCompleted -and !$taskOut.IsFaulted -and !$taskErr.IsFaulted
   if($taskPipes){$taskStderr=$taskErr.GetAwaiter().GetResult().Length -eq 0}
  }
 }finally{
  if($taskAssigned -and !$taskEmpty){$taskForced=$true;try{[FirewallR3Job]::Stop($taskJob);$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}catch{}}
  $taskProcessClosed=$true;if($null -ne $taskChild){$taskProcessClosed=$taskChild.Dispose()}elseif($taskStartAttempted){$taskProcessClosed=[FreshSuspendedProcess]::LastStartHandlesClosed}
  $taskJobClosed=$true;if($taskJob -ne [IntPtr]::Zero){$taskJobClosed=[FirewallR3Job]::CloseHandle($taskJob)};$taskHandles=$taskProcessClosed -and $taskJobClosed
 }
 $taskScope=[pscustomobject]@{schema=1;kind='FAST_OWNED_PROCESS_SCOPE';assigned=$taskAssigned;naturalExit=$taskNatural;stderrEmpty=$taskStderr;pipesClosed=$taskPipes;handlesClosed=$taskHandles;jobEmpty=$(if($taskAssigned -and $taskEmpty){$true}else{$null});forcedTermination=$taskForced;status=$(if($taskAssigned -and $taskResumed -and $taskDiagnostic -eq 'PASS' -and $taskNatural -eq $true -and $taskStderr -eq $true -and $taskPipes -and $taskHandles -and $taskEmpty -and !$taskForced){'PASS'}else{'FAIL'})}
 if($Detail){return [pscustomobject]@{scope=$taskScope;classification=$taskDiagnostic;rootExited=$taskExited;startedSuspended=$taskStarted;childResumed=$taskResumed}}
 return $taskScope
}
