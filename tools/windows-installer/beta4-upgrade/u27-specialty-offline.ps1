param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Go,
  [Parameter(Mandatory=$true)][string]$Node,
  [Parameter(Mandatory=$true)][string]$LauncherSource,
  [Parameter(Mandatory=$true)][string]$Report,
  [switch]$RestoreWatchdog
)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){throw 'U27_SPECIALTY_HOSTED_ENVIRONMENT_REQUIRED'}
$taskWork=[IO.Path]::GetFullPath($Work);$taskReport=[IO.Path]::GetFullPath($Report)
$taskStateFile=Join-Path $taskWork 'adapter-state.json';$taskDone=Join-Path $taskWork 'restored.flag'
$taskReady=Join-Path $taskWork 'watchdog-ready.flag';$taskFired=Join-Path $taskWork 'watchdog-fired.flag'
function Restore-ExactAdapters($ids){
  $selected=@(Get-NetAdapter -IncludeHidden|Where-Object{$ids -contains [string]$_.InterfaceGuid})
  if($selected.Count -ne $ids.Count){throw 'RESTORE_IDENTITY_FAILED'}
  $selected|Enable-NetAdapter -Confirm:$false|Out-Null
  $after=@(Get-NetAdapter -IncludeHidden|Where-Object{$ids -contains [string]$_.InterfaceGuid})
  if($after.Count -ne $ids.Count -or @($after|Where-Object Status -ne 'Up').Count -ne 0){throw 'RESTORE_STATE_FAILED'}
}
if($RestoreWatchdog){
  $state=Get-Content -Raw -LiteralPath $taskStateFile|ConvertFrom-Json
  [IO.File]::WriteAllText($taskReady,'ready')
  for($tick=0;$tick -lt 600;$tick++){if(Test-Path -LiteralPath $taskDone){exit 0};Start-Sleep -Seconds 1}
  [IO.File]::WriteAllText($taskFired,'fired');Restore-ExactAdapters @($state.ids);exit 0
}
$taskCli=Join-Path $PSScriptRoot 'u27-specialty-report.cjs';$taskCommit=$env:GITHUB_SHA
$taskActualRoot=Join-Path $taskWork 'upgrade-evidence';$taskActualReport=Join-Path $taskActualRoot 'U27-SPECIALTY-REPORT.json'
$taskLifecycleStarted=$false;$taskPrefixClassified=$false;$taskRestoreRequired=$false;$taskWatchdog=$null;$taskIds=@()
$taskExecutionFailed=$false;$taskDriverFault=$false;$taskIsolationFault=$false;$taskEvidenceInvalid=$false;$taskRestored=$false;$taskWatchdogExitVerified=$false;$taskIp=$null
try{
  if($env:KSESSION_BETA4_DIAGNOSTIC -or $env:KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC){throw 'DIAGNOSTIC_MODE_FORBIDDEN'}
  if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork) -or !(Test-Path -LiteralPath $Go -PathType Leaf) -or !(Test-Path -LiteralPath $Node -PathType Leaf) -or !(Test-Path -LiteralPath $LauncherSource -PathType Container)){throw 'FRESH_FIXED_INPUT_REQUIRED'}
  New-Item -ItemType Directory -Path $taskWork|Out-Null
  $taskHarness=Join-Path $taskWork 'harness'
  & $Node (Join-Path $PSScriptRoot '../../tests/windows-installer/beta4-upgrade/prepare-u27-specialty.cjs') $LauncherSource $taskHarness *> (Join-Path $env:RUNNER_TEMP 'u27-specialty-generator-private.log')
  if($LASTEXITCODE -ne 0){throw 'HARNESS_GENERATION_FAILED'}
  $taskOverlay=Join-Path $taskWork 'go-overlay.json'
  @{Replace=@{([IO.Path]::GetFullPath((Join-Path $LauncherSource 'setup_windows_test.go')))=[IO.Path]::GetFullPath((Join-Path $taskHarness 'setup_windows_test.go'));([IO.Path]::GetFullPath((Join-Path $LauncherSource 'upgrade_windows_test.go')))=[IO.Path]::GetFullPath((Join-Path $taskHarness 'upgrade_windows_test.go'))}}|ConvertTo-Json -Depth 4|Set-Content -Encoding utf8 -LiteralPath $taskOverlay
  $env:KSESSION_SETUP_UPGRADE_EVIDENCE=$taskActualRoot
  if(Test-Path -LiteralPath $taskActualRoot){throw 'FRESH_GO_EVIDENCE_ROOT_REQUIRED'}
  $taskAdapters=@(Get-NetAdapter -IncludeHidden|Where-Object Status -eq 'Up');if($taskAdapters.Count -eq 0){throw 'NO_ADAPTER_TO_ISOLATE'}
  $taskIds=@($taskAdapters|ForEach-Object{[string]$_.InterfaceGuid});[IO.File]::WriteAllText($taskStateFile,(@{ids=$taskIds}|ConvertTo-Json -Compress))
  $taskIp=[Net.Dns]::GetHostAddresses('github.com')|Where-Object AddressFamily -eq 'InterNetwork'|Select-Object -First 1;if(!$taskIp){throw 'BASELINE_PROBE_UNAVAILABLE'}
  function Test-ExternalSocket{$socket=[Net.Sockets.TcpClient]::new();try{$connect=$socket.ConnectAsync($taskIp,443);if(!$connect.Wait(3000)){return $false};return $socket.Connected}catch{return $false}finally{$socket.Dispose()}}
  if(!(Test-ExternalSocket)){throw 'BASELINE_CONNECTIVITY_MISSING'}
  $taskWatchdog=Start-Process -FilePath (Join-Path $PSHOME 'pwsh.exe') -ArgumentList @('-NoProfile','-NonInteractive','-File',('"{0}"' -f $PSCommandPath),'-Work',('"{0}"' -f $taskWork),'-Go',('"{0}"' -f $Go),'-Node',('"{0}"' -f $Node),'-LauncherSource',('"{0}"' -f $LauncherSource),'-Report',('"{0}"' -f $taskReport),'-RestoreWatchdog') -WindowStyle Hidden -PassThru
  for($try=0;$try -lt 100 -and !(Test-Path -LiteralPath $taskReady);$try++){Start-Sleep -Milliseconds 100};if(!(Test-Path -LiteralPath $taskReady)){throw 'RESTORE_WATCHDOG_NOT_READY'}
  $taskRestoreRequired=$true
  $taskAdapters|Disable-NetAdapter -Confirm:$false|Out-Null
  if(@(Get-NetAdapter -IncludeHidden|Where-Object Status -eq 'Up').Count -ne 0 -or (Test-ExternalSocket)){throw 'OFFLINE_ISOLATION_FAILED'}
  $env:KSESSION_EXTERNAL_NETWORK_DISABLED='1'
  Push-Location $LauncherSource
  try{
    & $Go test ('-overlay='+$taskOverlay) -count=1 -timeout=3m -run '^TestSetup$' . *> (Join-Path $env:RUNNER_TEMP 'u27-specialty-testsetup-private.log')
    if($LASTEXITCODE -ne 0){& $Node $taskCli prefix-failed $taskReport $taskCommit PREFIX_TEST_SETUP_FAILED *> $null;$taskPrefixClassified=$true;& $Node $taskCli network $taskReport $taskCommit ISOLATED *> $null;throw 'TEST_SETUP_FAILED'}
    & $Node $taskCli lifecycle-start $taskReport $taskCommit *> $null;if($LASTEXITCODE -ne 0){throw 'LIFECYCLE_PLACEHOLDER_FAILED'};$taskLifecycleStarted=$true
    & $Node $taskCli network $taskReport $taskCommit ISOLATED *> $null;if($LASTEXITCODE -ne 0){throw 'ISOLATION_EVIDENCE_FAILED'}
    & $Go test ('-overlay='+$taskOverlay) -count=1 -timeout=5m -run '^TestU27Specialty$' . *> (Join-Path $env:RUNNER_TEMP 'u27-specialty-u27-private.log')
    if($LASTEXITCODE -ne 0){$taskExecutionFailed=$true}
  }finally{Pop-Location}
  if((Test-Path -LiteralPath $taskFired) -or @(Get-NetAdapter -IncludeHidden|Where-Object Status -eq 'Up').Count -ne 0 -or (Test-ExternalSocket)){$taskDriverFault=$true;$taskIsolationFault=$true;throw 'OFFLINE_INTERVAL_INVALID'}
}catch{
  $taskExecutionFailed=$true
  if($_.Exception.Message -eq 'OFFLINE_INTERVAL_INVALID'){$taskDriverFault=$true}
  if(!$taskLifecycleStarted -and !$taskPrefixClassified){try{& $Node $taskCli prefix-failed $taskReport $taskCommit ENVIRONMENT_FAILED *> $null;$taskPrefixClassified=$true}catch{$taskEvidenceInvalid=$true}}
}finally{
  Remove-Item Env:KSESSION_EXTERNAL_NETWORK_DISABLED -ErrorAction SilentlyContinue
  if($taskRestoreRequired){try{Restore-ExactAdapters $taskIds;for($try=0;$try -lt 30;$try++){if(Test-ExternalSocket){$taskRestored=$true;break};Start-Sleep -Milliseconds 500}}catch{$taskRestored=$false}}else{$taskRestored=$true}
  if($null-ne$taskWatchdog){try{[IO.File]::WriteAllText($taskDone,'restored by parent');$waited=$taskWatchdog.WaitForExit(5000);if(!$waited -or !$taskWatchdog.HasExited -or $taskWatchdog.ExitCode -ne 0){$taskDriverFault=$true}else{$taskWatchdogExitVerified=$true};$taskWatchdog.Dispose()}catch{$taskDriverFault=$true}}
  else{$taskWatchdogExitVerified=$true}
  if(Test-Path -LiteralPath $taskFired){$taskExecutionFailed=$true;$taskDriverFault=$true}
  if(Test-Path -LiteralPath $taskActualReport){& $Node $taskCli export $taskActualReport $taskCommit $taskReport *> $null;if($LASTEXITCODE -ne 0){$taskEvidenceInvalid=$true}}
  if(!$taskEvidenceInvalid){$networkState=if($taskRestored){'RESTORED'}else{'FAILED'};& $Node $taskCli network $taskReport $taskCommit $networkState *> $null;if($LASTEXITCODE -ne 0){$taskEvidenceInvalid=$true}}
  if(!$taskEvidenceInvalid -and $taskLifecycleStarted -and ($taskExecutionFailed -or $taskDriverFault)){$driverClass=if($taskIsolationFault){'ISOLATION_INVALID'}else{'EXECUTION_FAILURE'};& $Node $taskCli driver-failed $taskReport $taskCommit $driverClass *> $null;if($LASTEXITCODE -ne 0){$taskEvidenceInvalid=$true}}
}
if($taskEvidenceInvalid){throw 'U27_SPECIALTY_EVIDENCE_INVALID'}
& $Node $taskCli verify-final $taskReport $taskCommit *> $null
if($LASTEXITCODE -ne 0){throw 'U27_SPECIALTY_FINAL_EVIDENCE_INVALID'}
if($taskDriverFault -or !$taskWatchdogExitVerified){throw 'U27_SPECIALTY_DRIVER_STATE_UNPROVEN'}
