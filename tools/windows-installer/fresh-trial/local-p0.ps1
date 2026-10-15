param([Parameter(Mandatory=$true)][string]$Root,[Parameter(Mandatory=$true)][string]$Node,[Parameter(Mandatory=$true)][string]$GoRoot,[Parameter(Mandatory=$true)][string]$Compiler)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/firewall-r3/job.ps1')
. (Join-Path $PSScriptRoot '../../windows-firewall/test-environment.ps1')
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$Root=[IO.Path]::GetFullPath($Root)
if($Root -notmatch '^E:\\' -or (Test-Path -LiteralPath $Root) -or (Get-KSessionFirewallTestPathClass (Split-Path $Root)) -ne 'CANONICAL'){throw 'New physical owned E output required'}
$taskSource=(git -C $taskRepo rev-parse HEAD).Trim()
if(git -C $taskRepo status --porcelain --untracked-files=no){throw 'Clean source required'}
$taskPin=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '../toolchain.json')|ConvertFrom-Json
$taskArchive=Join-Path (Split-Path $Compiler) 'innosetup-6.7.3.exe'
if((Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskPin.sha256){throw 'Pinned compiler archive required'}
$taskSig=Get-AuthenticodeSignature -LiteralPath (Join-Path $Compiler 'ISCC.exe')
if($taskSig.Status -ne 'Valid' -or $taskSig.SignerCertificate.Subject -notmatch 'CN=Pyrsys B\.V\.'){throw 'Compiler publisher rejected'}
New-Item -ItemType Directory -Path $Root|Out-Null
[IO.File]::WriteAllText((Join-Path $Root '.fast-p0-owned.json'),(@{schema=1;sourceCommit=$taskSource}|ConvertTo-Json -Compress))
$taskJob=[FirewallR3Job]::Create();$taskProcess=$null;$taskEmpty=$false;$taskForced=$false;$taskExit=$null;$taskErrEmpty=$false
try{
  $taskInfo=[Diagnostics.ProcessStartInfo]::new();$taskInfo.FileName=(Get-Command pwsh).Source;$taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true;$taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true
  foreach($taskArg in @('-NoProfile','-File',(Join-Path $PSScriptRoot 'local-p0-worker.ps1'),'-Root',$Root,'-Source',$taskSource,'-Node',$Node,'-GoRoot',$GoRoot,'-Compiler',$Compiler)){$taskInfo.ArgumentList.Add($taskArg)}
  $taskProcess=[Diagnostics.Process]::new();$taskProcess.StartInfo=$taskInfo
  if(!$taskProcess.Start()){throw 'P0 start failed'}
  $taskOut=$taskProcess.StandardOutput.ReadToEndAsync();$taskErr=$taskProcess.StandardError.ReadToEndAsync()
  [FirewallR3Job]::Assign($taskJob,$taskProcess.Handle)
  [IO.File]::WriteAllText((Join-Path $Root 'job-ready'),'ASSIGNED')
  if(!$taskProcess.WaitForExit(30*60*1000)){$taskForced=$true;[FirewallR3Job]::Stop($taskJob)}
  $taskEmpty=Wait-FirewallR3JobEmpty $taskJob
  if(!$taskEmpty){$taskForced=$true;[FirewallR3Job]::Stop($taskJob);$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}
  $taskProcess.Refresh();$taskExit=$taskProcess.ExitCode
  $taskErrEmpty=$taskErr.IsCompleted -and $taskOut.IsCompleted -and $taskErr.GetAwaiter().GetResult().Length -eq 0
}finally{
  if($null-ne$taskProcess -and !$taskProcess.HasExited){$taskForced=$true;[FirewallR3Job]::Stop($taskJob);$taskEmpty=Wait-FirewallR3JobEmpty $taskJob}
  [FirewallR3Job]::CloseHandle($taskJob)|Out-Null
}
$taskWorker=Get-Content -Raw -LiteralPath (Join-Path $Root 'worker-state.json')|ConvertFrom-Json
$taskPass=$taskWorker.sourceCommit -ceq $taskSource -and $taskWorker.status -ceq 'PASS' -and $taskWorker.environmentRestored -and $taskExit -eq 0 -and $taskErrEmpty -and $taskEmpty -and !$taskForced
$taskResult=@{schema=1;kind='FAST_P0_LOCAL_BUILD';qualification='BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE';sourceCommit=$taskSource;status=$(if($taskPass){'PASS'}else{'FAIL'});stage=$taskWorker.stage;jobEmpty=$(if($taskEmpty){$true}else{'UNKNOWN'});forcedTermination=$taskForced;naturalExit=(!$taskForced -and $taskExit -eq 0);stderrEmpty=$taskErrEmpty;environmentRestored=$taskWorker.environmentRestored;productionInstalled=$false;productionExeRun=$false}
if($taskPass){$taskBuild=Get-Content -Raw -LiteralPath (Join-Path $Root 'setup/artifact/build-info.json')|ConvertFrom-Json;$taskResult.setupSha256=$taskBuild.setupSha256;$taskResult.setupBytes=$taskBuild.setupBytes}
[IO.File]::WriteAllText((Join-Path $Root 'p0-result.json'),($taskResult|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
$taskResult|ConvertTo-Json -Compress
if(!$taskPass){exit 1}
