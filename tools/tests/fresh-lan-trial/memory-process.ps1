# Raw child output stays in memory. Callers may persist only validated fixed reports.
function Invoke-KSessionMemoryProcess([string]$Executable,[string[]]$Arguments,[int]$TimeoutSeconds=900,[string]$InputText='') {
  $taskInfo=[Diagnostics.ProcessStartInfo]::new()
  $taskInfo.WorkingDirectory=(Get-Location).ProviderPath
  $taskInfo.FileName=$Executable;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true
  $taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true;$taskInfo.RedirectStandardInput=$true
  $taskInfo.StandardInputEncoding=[Text.UTF8Encoding]::new($false);$taskInfo.StandardOutputEncoding=[Text.UTF8Encoding]::new($false);$taskInfo.StandardErrorEncoding=[Text.UTF8Encoding]::new($false)
  foreach($taskArg in $Arguments){$taskInfo.ArgumentList.Add($taskArg)}
  $taskStarted=$false
  $taskChild=[Diagnostics.Process]::new();$taskChild.StartInfo=$taskInfo
  try{
    if(!$taskChild.Start()){throw 'MEMORY_PROCESS_START_FAILED'};$taskStarted=$true
    $taskClock=[Diagnostics.Stopwatch]::StartNew()
    $taskOut=$taskChild.StandardOutput.ReadToEndAsync();$taskErr=$taskChild.StandardError.ReadToEndAsync()
    $taskInput=$taskChild.StandardInput.WriteAsync($InputText)
    while(!$taskInput.IsCompleted -and $taskClock.Elapsed.TotalSeconds -lt $TimeoutSeconds){Start-Sleep -Milliseconds 10}
    if($taskInput.IsCompleted){$null=$taskInput.GetAwaiter().GetResult();$taskInput=$taskChild.StandardInput.FlushAsync()}
    while(!$taskInput.IsCompleted -and $taskClock.Elapsed.TotalSeconds -lt $TimeoutSeconds){Start-Sleep -Milliseconds 10}
    if($taskInput.IsCompleted){$null=$taskInput.GetAwaiter().GetResult();$taskChild.StandardInput.Close()}
    while((!$taskInput.IsCompleted -or !$taskChild.HasExited -or !$taskOut.IsCompleted -or !$taskErr.IsCompleted) -and $taskClock.Elapsed.TotalSeconds -lt $TimeoutSeconds){Start-Sleep -Milliseconds 10}
    if(!$taskInput.IsCompleted -or !$taskChild.HasExited -or !$taskOut.IsCompleted -or !$taskErr.IsCompleted){
      if(!$taskChild.HasExited){$taskChild.Kill($true);$null=$taskChild.WaitForExit(5000)}
      return [pscustomobject]@{ExitCode=124;Stdout='';Stderr='';TimedOut=$true;ForcedTermination=$true;RootExited=$taskChild.HasExited;DescendantsEmpty='UNKNOWN'}
    }
    return [pscustomobject]@{ExitCode=$taskChild.ExitCode;Stdout=$taskOut.GetAwaiter().GetResult();Stderr=$taskErr.GetAwaiter().GetResult();TimedOut=$false;ForcedTermination=$false;RootExited=$true;DescendantsEmpty='UNKNOWN'}
  }finally{if($taskStarted -and !$taskChild.HasExited){$taskChild.Kill($true);$null=$taskChild.WaitForExit(5000)};$taskChild.Dispose()}
}
function Invoke-KSessionMemoryNode([string]$Node,[string[]]$Arguments,[string]$InputText='') {
  $taskNodeBefore=@{NODE_OPTIONS=[Environment]::GetEnvironmentVariable('NODE_OPTIONS','Process');NODE_PATH=[Environment]::GetEnvironmentVariable('NODE_PATH','Process')}
  try{
    $env:NODE_OPTIONS='';$env:NODE_PATH=''
    Invoke-KSessionMemoryProcess $Node $Arguments 900 $InputText
  }finally{foreach($taskName in $taskNodeBefore.Keys){[Environment]::SetEnvironmentVariable($taskName,$taskNodeBefore[$taskName],'Process')}}
}
