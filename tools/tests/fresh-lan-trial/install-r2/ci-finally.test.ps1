param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop';. (Join-Path $PSScriptRoot '../../lan-host/node-test-environment.ps1');. (Join-Path $PSScriptRoot 'hosted-recovery.ps1')
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$taskTokens=$null;$taskErrors=$null;$taskAST=[Management.Automation.Language.Parser]::ParseFile((Join-Path $taskRepo 'tools/windows-installer/fresh-trial/ci.ps1'),[ref]$taskTokens,[ref]$taskErrors)
$taskTry=@($taskAST.EndBlock.Statements|Where-Object{$_ -is [Management.Automation.Language.TryStatementAst]});if($taskErrors.Count -ne 0 -or $taskTry.Count -ne 1){throw 'ACTUAL_CI_FINALLY_REQUIRED'}
$taskBody=$taskTry[0].Finally.Extent.Text;$taskFinally=[ScriptBlock]::Create($taskBody.Substring(1,$taskBody.Length-2))
$taskNames=@('productRegistration','binding','startup','desktop','programs','programFiles','compilerOwnedFiles','compilerSettings','globalRegistry','rules');$taskPass=0
function Checked {param($Exe,$Arguments)if($script:taskFault -eq 'compiler'){throw 'CONTROLLED'}}
function Get-FreshProductObservations {param($Work)if($script:taskFault -eq 'products'){throw 'CONTROLLED'};return @{productRegistration=(New-FreshObservation $true $true);binding=(New-FreshObservation $true $true);startup=(New-FreshObservation $true $true);desktop=(New-FreshObservation $true $true);programs=(New-FreshObservation $true $true);programFiles=(New-FreshObservation $true $true)}}
function Get-FreshPathObservation {param($Path)if($script:taskFault -eq 'files'){throw 'CONTROLLED'};return (New-FreshObservation $true $true)}
function Get-FreshCompilerObservation {param($Binding)return (Get-FreshPathObservation 'CONTROLLED')}
function Test-FreshPhysicalWorkBinding {param($Binding)return $true}
function Test-FreshPinnedWorkDirectory {param($Binding)return $true}
function Get-FreshPhysicalNode {param($Binding,$Node)return $Node}
function Close-FreshPhysicalWorkBinding {param($Binding)}
function Inno-Environment-Snapshot {if($script:taskFault -eq 'settings'){throw 'CONTROLLED'};return @{fixed='same'}}
function Get-FreshRegistryObservation {param($Paths)if($script:taskFault -eq 'registry'){throw 'CONTROLLED'};return (New-FreshObservation $true $false 'same')}
function Get-FreshRulesObservation {if($script:taskFault -eq 'rules'){throw 'CONTROLLED'};return (New-FreshObservation $true $false 'same')}
function Invoke-KSessionMemoryNode {param($Node,$Arguments,$InputText)$script:taskCaptured=ConvertFrom-Json -InputObject $InputText -AsHashtable;return @{ExitCode=0;TimedOut=$false;ForcedTermination=$false;Stderr=''}}
foreach($script:taskFault in @('none','products','files','settings','registry','rules','compiler')){
 $taskProductBefore=@{};foreach($taskName in $taskNames){$taskProductBefore[$taskName]=New-FreshObservation $true $true}
 $taskCompilerFilesBefore=New-FreshObservation $true $true;$taskRegistryBefore=New-FreshObservation $true $false 'same';$taskRulesBefore=New-FreshObservation $true $false 'same';$taskSettingsBefore=New-FreshObservation $true $false (@{fixed='same'}|ConvertTo-Json -Depth 60 -Compress)
 $taskWork=$Root;$taskPhysicalBinding=[pscustomobject]@{physical=$Root};$taskNode=Join-Path $Root 'node.exe';$taskToolchainStarted=$true;$taskToolchainOwned=$true;$taskToolchainRestored=$false;$taskFinalStarted=$false;$script:taskFailed=$false;$script:taskCaptured=$null
 $taskPrevious=Save-KSessionProcessEnvironment @('NODE_OPTIONS','NODE_PATH','KSESSION_FRESH_PHYSICAL_WORK');$env:KSESSION_FRESH_PHYSICAL_WORK=$Root;$env:NODE_OPTIONS='CONTROLLED_CHANGED';$env:NODE_PATH='CONTROLLED_CHANGED'
 & $taskFinally
 if(!(Test-KSessionProcessEnvironmentRestored $taskPrevious) -or !$script:taskCaptured -or !$script:taskCaptured.environmentRestored -or $script:taskCaptured.recovery.Count -ne 10){throw 'CI_FINALLY_DID_NOT_RESTORE_AND_REPORT'}
 $key=switch($script:taskFault){'products'{'startup'}'files'{'compilerOwnedFiles'}'settings'{'compilerSettings'}'registry'{'globalRegistry'}'rules'{'rules'}default{$null}}
 if($key -and $script:taskCaptured.recovery[$key] -ne 'OBSERVATION_FAILED'){throw 'CI_FINALLY_UNKNOWN_MASKED'}
 if($script:taskFault -ne 'settings' -and $script:taskCaptured.recovery.compilerSettings -ne 'SNAPSHOT_UNCHANGED'){throw 'CI_FINALLY_UNRELATED_COMPONENT_MASKED'}
 $taskPass++
}
$r=@{schema=1;kind='INSTALL_R2_ACTUAL_CI_FINALLY_COUNTERS';pass=$taskPass;fail=0;skipped=0;realInstallation=$false;realRegistryWritten=$false;realRulesWritten=$false;environmentRestored=$true};if(!(Test-Path -LiteralPath $Root)){New-Item -ItemType Directory -Path $Root|Out-Null};[IO.File]::WriteAllText((Join-Path $Root 'report.json'),($r|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false));$r|ConvertTo-Json -Compress
