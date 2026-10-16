param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop';. (Join-Path $PSScriptRoot '../../lan-host/node-test-environment.ps1');. (Join-Path $PSScriptRoot 'hosted-recovery.ps1')
$taskPass=0
function Assert-Local([bool]$Value){if(!$Value){throw 'RECOVERY_COUNTEREXAMPLE_FAILED'};$script:taskPass++}
$unknown=New-FreshObservation $false $false;$absent=New-FreshObservation $true $true;$present=New-FreshObservation $true $false 'owned';$changed=New-FreshObservation $true $false 'changed';$directory=New-FreshObservation $true $false
Assert-Local ((Get-FreshRecoveryState $absent $absent) -eq 'ABSENT_UNCHANGED')
Assert-Local ((Get-FreshRecoveryState $present $present) -eq 'SNAPSHOT_UNCHANGED')
Assert-Local ((Get-FreshRecoveryState $unknown $absent) -eq 'OBSERVATION_FAILED')
Assert-Local ((Get-FreshRecoveryState $null $absent) -eq 'OBSERVATION_FAILED')
Assert-Local ((Get-FreshRecoveryState $present $changed) -eq 'STATE_CHANGED')
Assert-Local ((Get-FreshRecoveryState $directory $directory) -eq 'OBSERVATION_FAILED')
Assert-Local ((Get-FreshRecoveryState $absent $changed) -eq 'OWNERSHIP_UNKNOWN')
foreach($taskCount in @(0,1,3)){$taskStates=@{startup='ABSENT_UNCHANGED';desktop='ABSENT_UNCHANGED';programs='ABSENT_UNCHANGED'};foreach($taskKey in @('startup','desktop','programs')|Select-Object -First $taskCount){$taskStates[$taskKey]='OBSERVATION_FAILED'};Assert-Local ((@(@('startup','desktop','programs')|Where-Object{$taskStates[$_] -ne 'ABSENT_UNCHANGED'}).Count) -eq $taskCount)}
# Actual filesystem observation on a new owned fixture; no real-user mutation.
if(Test-Path -LiteralPath $Root){throw 'New owned fixture required'};New-Item -ItemType Directory -Path $Root|Out-Null
$taskFile=Join-Path $Root 'receipt-fixture.txt';$taskBefore=Get-FreshPathObservation $taskFile;[IO.File]::WriteAllText($taskFile,'OWNED_EXPECTED');$taskAfter=Get-FreshPathObservation $taskFile
Assert-Local ($taskBefore.known -and $taskBefore.absent -and $taskAfter.known -and !$taskAfter.absent)
Assert-Local ((Get-FreshRecoveryState $taskBefore $taskAfter) -eq 'OWNERSHIP_UNKNOWN')
[IO.File]::WriteAllText($taskFile,'OWNED_CHANGED');Assert-Local ((Get-FreshRecoveryState $taskAfter (Get-FreshPathObservation $taskFile)) -eq 'STATE_CHANGED')
$taskInitial=Get-FreshProgramObservation (Join-Path $Root 'program');New-Item -ItemType Directory -Path (Join-Path $Root 'program')|Out-Null;Assert-Local ($taskInitial.known -and $taskInitial.absent -and (Get-FreshProgramObservation (Join-Path $Root 'program')).absent)
# Rules protocol faults are injected at the shared memory-process boundary.
$script:taskStub=@{ExitCode=0;TimedOut=$false;ForcedTermination=$false;Stderr='';Stdout=''}
function Invoke-KSessionMemoryProcess {param($Executable,$Arguments,$TimeoutSeconds) return $script:taskStub}
function Empty-Store([string]$Store){return [ordered]@{store=$Store;rules=@();port=@();app=@();address=@();interface=@();interfaceType=@();service=@();security=@()}}
$script:taskStub.Stdout=ConvertTo-Json -InputObject @((Empty-Store 'PersistentStore'),(Empty-Store 'ActiveStore')) -Depth 10 -Compress
Assert-Local ((Get-FreshRulesObservation).known)
foreach($taskFault in @('missing-store','duplicate-store','stderr','timeout','exit','bad-json','bad-part')){
 $script:taskStub=@{ExitCode=0;TimedOut=$false;ForcedTermination=$false;Stderr='';Stdout=(ConvertTo-Json -InputObject @((Empty-Store 'PersistentStore'),(Empty-Store 'ActiveStore')) -Depth 10 -Compress)}
 switch($taskFault){'missing-store'{$script:taskStub.Stdout=ConvertTo-Json -InputObject @((Empty-Store 'PersistentStore')) -Depth 10 -Compress};'duplicate-store'{$script:taskStub.Stdout=ConvertTo-Json -InputObject @((Empty-Store 'PersistentStore'),(Empty-Store 'PersistentStore')) -Depth 10 -Compress};'stderr'{$script:taskStub.Stderr='CONTROLLED'};'timeout'{$script:taskStub.TimedOut=$true};'exit'{$script:taskStub.ExitCode=1};'bad-json'{$script:taskStub.Stdout='INVALID'};'bad-part'{$p=Empty-Store 'PersistentStore';$p.rules=$null;$script:taskStub.Stdout=ConvertTo-Json -InputObject @($p,(Empty-Store 'ActiveStore')) -Depth 10 -Compress}}
 Assert-Local (!(Get-FreshRulesObservation).known)
}
$r=@{schema=1;kind='INSTALL_R2_PS_RECOVERY_COUNTERS';pass=$taskPass;fail=0;skipped=0;realRegistryWritten=$false;realRulesWritten=$false;rawOutputStored=$false};[IO.File]::WriteAllText((Join-Path $Root 'report.json'),($r|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false));$r|ConvertTo-Json -Compress