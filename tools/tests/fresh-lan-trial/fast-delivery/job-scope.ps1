. (Join-Path $PSScriptRoot '../firewall-r3/job.ps1')
function Invoke-FastOwnedProcess([string]$Executable,[string[]]$Arguments,[string]$Gate,[int]$TimeoutSeconds=1800){
  if(Test-Path -LiteralPath $Gate){throw 'Unknown scope gate'}
  $taskJob=[FirewallR3Job]::Create();$taskChild=$null;$taskStarted=$false;$taskEmpty=$false;$taskForced=$false;$taskAssigned=$false;$taskNatural=$null;$taskStderr=$null;$taskPipes=$false;$taskHandles=$false
  try{
    $taskInfo=[Diagnostics.ProcessStartInfo]::new();$taskInfo.FileName=$Executable;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true;$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true
    $taskInfo.Environment['KSESSION_FAST_JOB_GATE']=$Gate;$taskInfo.Environment['NODE_OPTIONS']='';$taskInfo.Environment['NODE_PATH']=''
    foreach($taskArg in $Arguments){$taskInfo.ArgumentList.Add($taskArg)}
    $taskChild=[Diagnostics.Process]::new();$taskChild.StartInfo=$taskInfo
    if(!$taskChild.Start()){throw 'Scope start failed'};$taskStarted=$true
    $taskOut=$taskChild.StandardOutput.ReadToEndAsync();$taskErr=$taskChild.StandardError.ReadToEndAsync()
    [FirewallR3Job]::Assign($taskJob,$taskChild.Handle);$taskAssigned=$true
    [IO.File]::WriteAllText($Gate,'ASSIGNED',[Text.UTF8Encoding]::new($false))
    $taskDeadline=[DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while(!$taskChild.HasExited -and [DateTime]::UtcNow -lt $taskDeadline){$null=$taskChild.WaitForExit(100)}
    while(($taskChild.HasExited -and ([FirewallR3Job]::Active($taskJob) -ne 0 -or !$taskOut.IsCompleted -or !$taskErr.IsCompleted)) -and [DateTime]::UtcNow -lt $taskDeadline){Start-Sleep -Milliseconds 20}
    if(!$taskChild.HasExited -or [FirewallR3Job]::Active($taskJob) -ne 0 -or !$taskOut.IsCompleted -or !$taskErr.IsCompleted){$taskForced=$true;[FirewallR3Job]::Stop($taskJob)}
    $taskEmpty=Wait-FirewallR3JobEmpty $taskJob
    $taskChild.Refresh();if($taskChild.HasExited){$taskNatural=!$taskForced -and $taskChild.ExitCode -eq 0}
    $taskPipes=$taskOut.IsCompleted -and $taskErr.IsCompleted
    if($taskPipes){$taskStderr=$taskErr.GetAwaiter().GetResult().Length -eq 0}
  }catch{
    if($taskStarted -and !$taskChild.HasExited){$taskForced=$true;if($taskAssigned){[FirewallR3Job]::Stop($taskJob)}else{$taskChild.Kill($true)}}
    if($taskAssigned){$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}
  }finally{
    if($taskAssigned -and !$taskEmpty){$taskForced=$true;try{[FirewallR3Job]::Stop($taskJob);$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}catch{}}
    try{if($taskStarted){$taskChild.StandardOutput.Close();$taskChild.StandardError.Close()};if($null-ne$taskChild){$taskChild.Dispose()};$taskHandles=[FirewallR3Job]::CloseHandle($taskJob)}catch{$taskHandles=$false}
  }
  return [pscustomobject]@{schema=1;kind='FAST_OWNED_PROCESS_SCOPE';assigned=$taskAssigned;naturalExit=$taskNatural;stderrEmpty=$taskStderr;pipesClosed=$taskPipes;handlesClosed=$taskHandles;jobEmpty=$(if($taskAssigned -and $taskEmpty){$true}else{$null});forcedTermination=$taskForced;status=$(if($taskAssigned -and $taskNatural -eq $true -and $taskStderr -eq $true -and $taskPipes -and $taskHandles -and $taskEmpty -and !$taskForced){'PASS'}else{'FAIL'})}
}
