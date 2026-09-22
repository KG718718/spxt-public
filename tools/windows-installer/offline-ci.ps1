param(
 [Parameter(Mandatory=$true)][string]$Work,
 [string]$Go,
 [string]$LauncherSource,
 [switch]$RestoreWatchdog
)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){
 throw 'Network isolation is allowed only on this public repository disposable GitHub-hosted runner'
}
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\'){throw 'Explicit E evidence required'}
$taskStateFile=Join-Path $taskWork 'adapter-state.json'
$taskDone=Join-Path $taskWork 'restored.flag'
$taskReady=Join-Path $taskWork 'watchdog-ready.flag'
$taskFired=Join-Path $taskWork 'watchdog-fired.flag'
function Restore-ExactAdapters($ids){
 $taskSelected=@(Get-NetAdapter -IncludeHidden | Where-Object { $ids -contains [string]$_.InterfaceGuid })
 if($taskSelected.Count -ne $ids.Count){throw 'Adapter identity changed'}
 $taskSelected | Enable-NetAdapter -Confirm:$false | Out-Null
}
if($RestoreWatchdog){
 $taskState=Get-Content -Raw -LiteralPath $taskStateFile | ConvertFrom-Json
 [IO.File]::WriteAllText($taskReady,'ready')
 for($taskTick=0;$taskTick -lt 600;$taskTick++){
  if(Test-Path -LiteralPath $taskDone){exit 0}
  Start-Sleep -Seconds 1
 }
 [IO.File]::WriteAllText($taskFired,'time limit exceeded; result invalid')
 Restore-ExactAdapters @($taskState.ids)
 exit 0
}
if((Test-Path -LiteralPath $taskWork) -or !(Test-Path -LiteralPath $Go) -or !(Test-Path -LiteralPath $LauncherSource)){
 throw 'Fresh evidence, fixed Go and existing Launcher test source required'
}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskAdapters=@(Get-NetAdapter -IncludeHidden | Where-Object Status -eq 'Up')
if($taskAdapters.Count -eq 0){throw 'No up adapters to isolate'}
$taskIds=@($taskAdapters | ForEach-Object { [string]$_.InterfaceGuid })
[IO.File]::WriteAllText($taskStateFile,(@{ids=$taskIds}|ConvertTo-Json -Compress))
$taskIp=[Net.Dns]::GetHostAddresses('github.com') | Where-Object AddressFamily -eq 'InterNetwork' | Select-Object -First 1
if(!$taskIp){throw 'Cannot establish fixed external connectivity probe'}
function Test-ExternalSocket {
 $taskSocket=[Net.Sockets.TcpClient]::new()
 try {
  $taskConnect=$taskSocket.ConnectAsync($taskIp,443)
  if(!$taskConnect.Wait(3000)){return $false}
  return $taskSocket.Connected
 } catch {return $false} finally {$taskSocket.Dispose()}
}
if(!(Test-ExternalSocket)){throw 'Baseline external connectivity missing'}
$taskWatchdog=Start-Process -FilePath (Join-Path $PSHOME 'pwsh.exe') -ArgumentList @('-NoProfile','-NonInteractive','-File',('"{0}"' -f $PSCommandPath),'-Work',('"{0}"' -f $taskWork),'-RestoreWatchdog') -WindowStyle Hidden -PassThru
for($taskTry=0;$taskTry -lt 100 -and !(Test-Path -LiteralPath $taskReady);$taskTry++){Start-Sleep -Milliseconds 100}
if(!(Test-Path -LiteralPath $taskReady)){throw 'Restoration watchdog not ready; no adapter disabled'}
$taskReport=@{status='FAIL';sourceCommit=$env:GITHUB_SHA;method='all initially-up hosted-runner adapters disabled; loopback retained';adapterCount=$taskIds.Count;firewallChanged=$false;externalBefore=$true;restored=$false}
try {
 $taskAdapters | Disable-NetAdapter -Confirm:$false | Out-Null
 if(@(Get-NetAdapter -IncludeHidden | Where-Object Status -eq 'Up').Count -ne 0){throw 'An external adapter remains up'}
 if(Test-ExternalSocket){throw 'External connection unexpectedly available'}
 $taskReport.externalDuring=$false
 $taskReport.offlineStarted=[DateTime]::UtcNow.ToString('o')
 $env:KSESSION_EXTERNAL_NETWORK_DISABLED='1'
 Push-Location $LauncherSource
 try {
  & $Go test -count=1 -timeout=3m -v -run '^TestSetup$' .
  if($LASTEXITCODE -ne 0){throw 'Offline actual Setup/core/uninstall/reinstall test failed'}
  & $Go test -count=1 -timeout=5m -v -run '^TestUpgradeLifecycle$' .
  if($LASTEXITCODE -ne 0){throw 'Offline beta.1 to beta.2 lifecycle/fault test failed'}
 } finally {Pop-Location}
 if((Test-Path -LiteralPath $taskFired) -or @(Get-NetAdapter -IncludeHidden | Where-Object Status -eq 'Up').Count -ne 0 -or (Test-ExternalSocket)){
  throw 'Isolation ended before tests completed'
 }
 $taskReport.offlineEnded=[DateTime]::UtcNow.ToString('o')
 $taskReport.status='PASS'
} finally {
 Remove-Item Env:KSESSION_EXTERNAL_NETWORK_DISABLED -ErrorAction SilentlyContinue
 Restore-ExactAdapters $taskIds
 [IO.File]::WriteAllText($taskDone,'restored by parent')
 $null=$taskWatchdog.WaitForExit(5000)
 for($taskTry=0;$taskTry -lt 30;$taskTry++){
  if(Test-ExternalSocket){$taskReport.restored=$true;break}
  Start-Sleep -Milliseconds 500
 }
 if(!$taskReport.restored){$taskReport.status='FAIL'}
 [IO.File]::WriteAllText((Join-Path $taskWork 'offline-network.json'),($taskReport|ConvertTo-Json -Depth 5))
}
if($taskReport.status -ne 'PASS'){throw 'Offline gate or restoration failed'}
