$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'firewall-state.ps1')
$script:FastFixtureValue=$true;$script:FastFixtureMissing=$false;$script:FastFixtureUnknown=$false
function Get-NetFirewallProfile {
  param($PolicyStore,$ErrorAction)
  $taskNames=if($script:FastFixtureMissing){@('Private')}else{@('Public','Domain','Private')}
  foreach($taskName in $taskNames){[pscustomobject]@{Name=$taskName;CimInstanceProperties=@([pscustomobject]@{Name='Enabled';Value=$(if($script:FastFixtureUnknown){[pscustomobject]@{unknown=$true}}else{$script:FastFixtureValue})},[pscustomobject]@{Name='ProfileName';Value=$taskName})}}
}
function Get-NetConnectionProfile {param($ErrorAction) [pscustomobject]@{InterfaceIndex=7;NetworkCategory='Private';Name='synthetic'}}
$taskBefore=Read-FastFirewallState
if($taskBefore -cne (Read-FastFirewallState)){throw 'Stable profile state mismatch'}
$script:FastFixtureValue=$false
if($taskBefore -ceq (Read-FastFirewallState)){throw 'Changed profile state was hidden'}
foreach($taskMode in @('missing','unknown')){
  $script:FastFixtureMissing=$taskMode -eq 'missing';$script:FastFixtureUnknown=$taskMode -eq 'unknown';$taskRejected=$false
  try{$null=Read-FastFirewallState}catch{$taskRejected=$true}
  if(!$taskRejected){throw 'Unknown profile state was accepted'}
}
Write-Output 'FIREWALL_READ_ONLY_STATE_4_GATES_PASS'
