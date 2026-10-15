param([Parameter(Mandatory=$true)][string]$ControlRoot,[string]$Node='', [string]$Go='', [switch]$Local)
$ErrorActionPreference='Stop'
$taskBootstrapNode=(Get-Command node).Source
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$taskContext=Get-Content -Raw -LiteralPath (Join-Path $ControlRoot 'context.json')|ConvertFrom-Json
if($Local){if($taskContext.execution -ne 'LOCAL'){throw 'Local context required'}}else{if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $taskContext.execution -ne 'HOSTED' -or $taskContext.controlCommit -cne $env:GITHUB_SHA -or $taskContext.run.id -ne $env:GITHUB_RUN_ID -or $env:GITHUB_RUN_ATTEMPT -ne '1'){throw 'Hosted context rejected'}}
if((git -C $taskRepo rev-parse HEAD).Trim() -cne $taskContext.sourceCommit){throw 'Tested source mismatch'}
. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1')
. (Join-Path $PSScriptRoot 'job.ps1')
function Invoke-R3ControlNode([string[]]$Arguments){
  $taskNodeState=Save-KSessionProcessEnvironment @('NODE_OPTIONS','NODE_PATH')
  try{
    $env:NODE_OPTIONS='';$env:NODE_PATH=''
    & $taskBootstrapNode @Arguments
    $script:taskControlExit=$LASTEXITCODE
  }finally{Restore-KSessionProcessEnvironment $taskNodeState}
}
$taskWork=Join-Path $ControlRoot 'owned-work'
if(Test-Path -LiteralPath $taskWork){throw 'Unknown work directory'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskWork=Resolve-KSessionFirewallPhysicalPath $taskWork
$taskReport=Join-Path $ControlRoot 'firewall-r3-report.json'
$taskData=[ordered]@{repo=$taskRepo;work=$taskWork;control=$ControlRoot;report=$taskReport;gate=(Join-Path $taskWork 'job-ready');go=$Go;execution=$taskContext.execution;sourceCommit=$taskContext.sourceCommit;controlCommit=$taskContext.controlCommit;codeFingerprint=$taskContext.codeFingerprint;run=$taskContext.run}
[IO.File]::WriteAllText((Join-Path $taskWork '.r3-owned.json'),(@{schema=1;sourceCommit=$taskContext.sourceCommit;run=$taskContext.run}|ConvertTo-Json -Depth 4 -Compress),[Text.UTF8Encoding]::new($false))
function Encoded-Context{return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($taskData|ConvertTo-Json -Depth 8 -Compress)))}
Invoke-R3ControlNode @((Join-Path $PSScriptRoot 'runner.cjs'),'INIT',(Encoded-Context))
if($script:taskControlExit -ne 0){throw 'Report initialization failed'}
$taskNames=@('GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','TEMP','TMP','GOTMPDIR','GOCACHE','NODE_OPTIONS','NODE_PATH','KSESSION_FIREWALL_TEST_ROOT','KSESSION_R3_GUARD_FILE','KSESSION_R3_REGISTER_FILE')
$taskBefore=Save-KSessionProcessEnvironment $taskNames
$taskJob=[IntPtr]::Zero;$taskProcess=$null;$taskEmpty=$false;$taskForced=$false;$taskRestore=$false;$taskRemoved=$false;$taskNatural=$false;$taskStderr=$false
try{
  $r=Get-Content -Raw -LiteralPath $taskReport|ConvertFrom-Json;$r.stage='TOOLS';$r.reason='TOOLCHAIN_REJECTED';[IO.File]::WriteAllText($taskReport,($r|ConvertTo-Json -Depth 12 -Compress),[Text.UTF8Encoding]::new($false))
  $env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOWORK='off';$env:GOFLAGS='';$env:GOEXPERIMENT='';$env:NODE_OPTIONS='';$env:NODE_PATH=''
  $taskTool=Join-Path $taskWork 'tools';New-Item -ItemType Directory -Path $taskTool|Out-Null
  function Pinned([string]$Uri,[string]$Hash,[string]$Name){$zip=Join-Path $taskTool ($Name+'.zip');Invoke-WebRequest -Uri $Uri -OutFile $zip -TimeoutSec 240;if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Hash){throw 'Tool hash rejected'};Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $taskTool $Name)}
  if(!$Node){$pin=Get-Content -Raw (Join-Path $taskRepo 'tools/installer/distribution.json')|ConvertFrom-Json;Pinned $pin.nodeUrl $pin.nodeArchiveSha256 'node';$Node=Join-Path $taskTool 'node/node-v24.21.0-win-x64/node.exe'}
  if(!$Go){$pin=Get-Content -Raw (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json')|ConvertFrom-Json;Pinned $pin.goWindowsZip $pin.sha256 'go';$Go=Join-Path $taskTool 'go/go/bin/go.exe'}
  $taskEnvironment=Enter-KSessionFirewallTestEnvironment $taskWork ('firewall-r3-'+[guid]::NewGuid().ToString('N')+'-env')
  $env:KSESSION_R3_GUARD_FILE=Join-Path $taskWork 'original13-guard.txt'
  $env:KSESSION_R3_REGISTER_FILE=Join-Path $taskWork 'original13-register.txt'
  $taskData.go=$Go
  $taskJob=[FirewallR3Job]::Create()
  $taskArgs='"'+(Join-Path $PSScriptRoot 'runner.cjs')+'" RUN '+(Encoded-Context)
  $taskInfo=[Diagnostics.ProcessStartInfo]::new();$taskInfo.FileName=$Node;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true;$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true
  foreach($taskArg in @((Join-Path $PSScriptRoot 'runner.cjs'),'RUN',(Encoded-Context))){$taskInfo.ArgumentList.Add($taskArg)}
  $taskProcess=[Diagnostics.Process]::new();$taskProcess.StartInfo=$taskInfo;if(!$taskProcess.Start()){throw 'Runner start failed'}
  $taskOut=$taskProcess.StandardOutput.ReadToEndAsync();$taskErr=$taskProcess.StandardError.ReadToEndAsync()
  [FirewallR3Job]::Assign($taskJob,$taskProcess.Handle)
  [IO.File]::WriteAllText($taskData.gate,'ASSIGNED',[Text.UTF8Encoding]::new($false))
  if(!$taskProcess.WaitForExit(30*60*1000)){$taskForced=$true;[FirewallR3Job]::Stop($taskJob)}
  $taskEmpty=Wait-FirewallR3JobEmpty $taskJob
  if(!$taskEmpty){$taskForced=$true;[FirewallR3Job]::Stop($taskJob);$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}
  $taskProcess.Refresh();$taskNatural=!$taskForced -and $taskProcess.HasExited -and $taskProcess.ExitCode -eq 0
  $taskStderr=$taskErr.IsCompleted -and $taskOut.IsCompleted -and $taskErr.GetAwaiter().GetResult().Length -eq 0 -and $taskOut.GetAwaiter().GetResult().Length -eq 0
}catch{
  if($null-ne$taskProcess -and !$taskProcess.HasExited){$taskForced=$true;if($taskJob -ne [IntPtr]::Zero){try{[FirewallR3Job]::Stop($taskJob)}catch{}};if(!$taskProcess.HasExited){$taskProcess.Kill();$taskProcess.WaitForExit()}}
  if($taskJob -ne [IntPtr]::Zero){try{$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}catch{}}
}finally{
  if($taskJob -ne [IntPtr]::Zero){[FirewallR3Job]::CloseHandle($taskJob)|Out-Null}
  Restore-KSessionProcessEnvironment $taskBefore
  $taskRestore=Test-KSessionProcessEnvironmentRestored $taskBefore
  if($taskEmpty){Invoke-R3ControlNode @((Join-Path $PSScriptRoot 'runner.cjs'),'CLEAN',(Encoded-Context)) | Out-Null;$taskRemoved=$script:taskControlExit -eq 0}
  $r=Get-Content -Raw -LiteralPath $taskReport|ConvertFrom-Json
  $r.supervisor.runnerNaturalExit=$taskNatural;$r.supervisor.runnerStderrEmpty=$taskStderr
  $r.cleanup.jobEmpty=if($taskEmpty){$true}else{'UNKNOWN'};$r.cleanup.forcedTermination=$taskForced;$r.cleanup.environmentRestored=if($taskRestore){$true}else{'UNKNOWN'}
  foreach($k in @('ownedTempRemoved','ownedFixturesRemoved','ownedCacheRemoved','ownedToolchainRemoved')){$r.cleanup.$k=if($taskRemoved){$true}else{'UNKNOWN'}}
  [IO.File]::WriteAllText($taskReport,($r|ConvertTo-Json -Depth 12 -Compress),[Text.UTF8Encoding]::new($false))
}
$taskOuterFailure=(!$taskNatural -or !$taskStderr)
Invoke-R3ControlNode @((Join-Path $PSScriptRoot 'finalize.cjs'),$ControlRoot,$taskContext.sourceCommit,$taskContext.controlCommit,$taskContext.run.id,$taskContext.execution,$taskOuterFailure.ToString().ToLowerInvariant())
if($script:taskControlExit -ne 0){exit 1}
