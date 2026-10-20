# Definitions only. CI imports this after the Hosted identity guard.
function New-FreshObservation([bool]$Known,[bool]$Absent,$Value=$null){return @{known=$Known;absent=$Absent;value=$Value}}
function Invoke-FreshObservation([scriptblock]$Read){
 try{return (& $Read)}catch{return (New-FreshObservation $false $false)}
}
function Test-FreshObservationParent([string]$Path){
 try{
  $taskParent=Split-Path ([IO.Path]::GetFullPath($Path))
  while($taskParent){
   try{$taskAttr=[IO.File]::GetAttributes($taskParent);return (($taskAttr -band [IO.FileAttributes]::Directory) -ne 0 -and (Get-KSessionFirewallTestPathClass $taskParent) -eq 'CANONICAL')}
   catch [IO.FileNotFoundException]{}catch [IO.DirectoryNotFoundException]{}
   $taskNext=Split-Path $taskParent;if($taskNext -eq $taskParent){break};$taskParent=$taskNext
  }
 }catch{}
 return $false
}
function Get-FreshRecoveryState($Before,$After,[bool]$OwnedRemoved=$false){
 foreach($taskObservation in @($Before,$After)){
  if($null -eq $taskObservation -or $taskObservation -isnot [Collections.IDictionary]){return 'OBSERVATION_FAILED'}
  if((($taskObservation.get_Keys()|Sort-Object) -join ',') -cne 'absent,known,value' -or $taskObservation.known -isnot [bool] -or $taskObservation.absent -isnot [bool]){return 'OBSERVATION_FAILED'}
 }
 if(!$Before.known -or !$After.known){return 'OBSERVATION_FAILED'}
 if($Before.absent -and $After.absent){if($OwnedRemoved){return 'OWNED_REMOVED'};return 'ABSENT_UNCHANGED'}
 if($Before.absent -and !$After.absent){return 'OWNERSHIP_UNKNOWN'}
 if(!$Before.absent -and !$After.absent){if($null -eq $Before.value -or $null -eq $After.value){return 'OBSERVATION_FAILED'};if($Before.value -ceq $After.value -and !$OwnedRemoved){return 'SNAPSHOT_UNCHANGED'}}
 return 'STATE_CHANGED'
}
function Get-FreshPathObservation([string]$Path){
 try{
  if(!$Path -or !(Test-FreshObservationParent $Path)){return (New-FreshObservation $false $false)}
  $taskA=[IO.File]::GetAttributes($Path)
  if(($taskA -band [IO.FileAttributes]::ReparsePoint) -ne 0){return (New-FreshObservation $false $false)}
  if(($taskA -band [IO.FileAttributes]::Directory) -ne 0){return (New-FreshObservation $true $false)}
  return (New-FreshObservation $true $false ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash))
 }catch [IO.FileNotFoundException]{return (New-FreshObservation $true $true)}catch [IO.DirectoryNotFoundException]{return (New-FreshObservation $true $true)}catch{return (New-FreshObservation $false $false)}
}
function Get-FreshProgramObservation([string]$Path){
 $taskStart=Get-FreshPathObservation $Path;if(!$taskStart.known -or $taskStart.absent){return $taskStart}
 try{
  if((Get-KSessionFirewallTestPathClass $Path) -ne 'CANONICAL'){return (New-FreshObservation $false $false)}
  $taskRows=@();$taskBytes=0L
  foreach($taskItem in @(Get-ChildItem -LiteralPath $Path -Force -Recurse -ErrorAction Stop|Sort-Object FullName)){
   if(($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){return (New-FreshObservation $false $false)}
   if(!$taskItem.PSIsContainer){$taskBytes+=$taskItem.Length;if($taskRows.Count -ge 5000 -or $taskBytes -gt 512MB){return (New-FreshObservation $false $false)};$taskRows+=@{path=$taskItem.FullName;hash=(Get-FileHash -LiteralPath $taskItem.FullName -Algorithm SHA256).Hash}}
  }
  return (New-FreshObservation $true ($taskRows.Count -eq 0) (ConvertTo-Json -InputObject $taskRows -Depth 8 -Compress))
 }catch{return (New-FreshObservation $false $false)}
}
function Assert-FreshRegistryTree($Tree,[int]$Depth=0){
 if($Depth -gt 16 -or $Tree -isnot [Collections.IDictionary] -or (($Tree.get_Keys()|Sort-Object) -join ',') -cne 'children,values' -or $Tree.values -isnot [Collections.IDictionary] -or $Tree.children -isnot [Collections.IDictionary]){throw 'Registry tree unknown'}
 foreach($taskEntry in $Tree.values.get_Values()){
  if($taskEntry -isnot [Collections.IDictionary] -or (($taskEntry.get_Keys()|Sort-Object) -join ',') -cne 'kind,value' -or $null -eq $taskEntry.value){throw 'Registry value unknown'}
  $taskValid=switch -CaseSensitive ($taskEntry.kind){
   'String'{$taskEntry.value -is [string]}
   'ExpandString'{$taskEntry.value -is [string]}
   'DWord'{$taskEntry.value -is [int]}
   'QWord'{$taskEntry.value -is [long]}
   'MultiString'{$taskMulti=$taskEntry.value -is [string[]];if($taskMulti){foreach($taskString in $taskEntry.value){if($null -eq $taskString){$taskMulti=$false}}};$taskMulti}
   'Binary'{$taskEntry.value -is [byte[]]}
   'None'{$taskEntry.value -is [byte[]]}
   default{$false}
  }
  if(!$taskValid){throw 'Registry typed value unknown'}
 }
 foreach($taskChild in $Tree.children.get_Values()){Assert-FreshRegistryTree $taskChild ($Depth+1)}
}
function ConvertTo-FreshRegistryCanonical($Value,[int]$Depth=0){
 if($Depth -gt 58){throw 'Registry canonical bound'}
 if($null -eq $Value){return $null}
 if($Value -is [Collections.IDictionary]){
  $taskSorted=[ordered]@{};$taskNames=[string[]]@($Value.get_Keys());[Array]::Sort($taskNames,[StringComparer]::Ordinal)
  foreach($taskName in $taskNames){$taskSorted[$taskName]=ConvertTo-FreshRegistryCanonical $Value[$taskName] ($Depth+1)}
  return $taskSorted
 }
 if($Value -is [Array]){$taskItems=[Collections.Generic.List[object]]::new();foreach($taskValue in $Value){$taskItems.Add((ConvertTo-FreshRegistryCanonical $taskValue ($Depth+1)))};return ,$taskItems.ToArray()}
 if($Value -is [string] -or $Value -is [ValueType]){return $Value}
 throw 'Registry canonical type unknown'
}
function Get-FreshRegistryObservation([string[]]$Paths){
 try{
  $taskTree=[ordered]@{};$taskAbsent=$true
  foreach($taskHiveName in @([Microsoft.Win32.RegistryHive]::CurrentUser,[Microsoft.Win32.RegistryHive]::LocalMachine)){
   foreach($taskView in @([Microsoft.Win32.RegistryView]::Registry64,[Microsoft.Win32.RegistryView]::Registry32)){
    $taskHive=[Microsoft.Win32.RegistryKey]::OpenBaseKey($taskHiveName,$taskView)
    try{foreach($taskPath in $Paths){$taskKey=$taskHive.OpenSubKey($taskPath);$taskID=[string]$taskHiveName+':'+[string]$taskView+':'+$taskPath;if($null -eq $taskKey){$taskTree[$taskID]=$null}else{try{$taskTree[$taskID]=Registry-Tree $taskKey;Assert-FreshRegistryTree $taskTree[$taskID];$taskAbsent=$false}finally{$taskKey.Dispose()}}}}finally{$taskHive.Dispose()}
   }
  }
  return (New-FreshObservation $true $taskAbsent (ConvertTo-Json -InputObject (ConvertTo-FreshRegistryCanonical $taskTree) -Depth 60 -Compress))
 }catch{return (New-FreshObservation $false $false)}
}
function Get-FreshProductObservations([string]$PhysicalWork){
 $taskResult=@{productRegistration=(Get-FreshRegistryObservation @('Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1'));binding=(Get-FreshRegistryObservation @('Software\KSESSION\Beta\InstallerBinding'))}
 foreach($taskRow in @(@('startup','Startup','K-SESSION Fresh Trial.lnk'),@('desktop','Desktop','K⁺-SESSION.lnk'),@('programs','Programs','K⁺-SESSION.lnk'))){
  try{$taskDir=[Environment]::GetFolderPath($taskRow[1],'DoNotVerify');$taskResult[$taskRow[0]]=Get-FreshPathObservation (Join-Path $taskDir $taskRow[2])}catch{$taskResult[$taskRow[0]]=New-FreshObservation $false $false}
 }
 $taskResult.programFiles=Get-FreshProgramObservation (Join-Path $PhysicalWork 'installed-core/Installed 中文 with spaces')
 return $taskResult
}
function Get-FreshRulesObservation {
 $script:FreshRulesObservationPhase='QUERY'
 try{
  $taskPS=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
  $taskScript=@'
$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';Import-Module (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/Modules/NetSecurity/NetSecurity.psd1') -ErrorAction Stop
function Canonical($rows){$result=[Collections.Generic.List[string]]::new();foreach($o in $rows){$v=[ordered]@{};foreach($p in @($o.CimInstanceProperties|Sort-Object Name)){$v[$p.Name]=$p.Value};$result.Add((ConvertTo-Json -InputObject $v -Depth 16 -Compress))};$result.Sort([StringComparer]::Ordinal);return ,$result.ToArray()}
$rows=@(foreach($store in @('PersistentStore','ActiveStore')){[ordered]@{store=$store;rules=(Canonical @(Get-NetFirewallRule -PolicyStore $store -ErrorAction Stop));port=(Canonical @(Get-NetFirewallPortFilter -PolicyStore $store -ErrorAction Stop));app=(Canonical @(Get-NetFirewallApplicationFilter -PolicyStore $store -ErrorAction Stop));address=(Canonical @(Get-NetFirewallAddressFilter -PolicyStore $store -ErrorAction Stop));interface=(Canonical @(Get-NetFirewallInterfaceFilter -PolicyStore $store -ErrorAction Stop));interfaceType=(Canonical @(Get-NetFirewallInterfaceTypeFilter -PolicyStore $store -ErrorAction Stop));service=(Canonical @(Get-NetFirewallServiceFilter -PolicyStore $store -ErrorAction Stop));security=(Canonical @(Get-NetFirewallSecurityFilter -PolicyStore $store -ErrorAction Stop))}})
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);[Console]::Write((ConvertTo-Json -InputObject $rows -Depth 8 -Compress))
'@
  $taskRead=Invoke-KSessionMemoryProcess $taskPS @('-NoLogo','-NoProfile','-NonInteractive','-Command',$taskScript) 30
  if($taskRead.TimedOut -or $taskRead.ForcedTermination){$script:FreshRulesObservationPhase='QUERY_TIMEOUT';return (New-FreshObservation $false $false)}
  if($taskRead.ExitCode -ne 0 -or $taskRead.Stderr.Length -ne 0){$script:FreshRulesObservationPhase='QUERY_FAILED';if(($taskRead.Stdout+$taskRead.Stderr) -match 'Access.is.denied|拒绝访问|ACCESS_DENIED|0x80070005|0x80041003'){$script:FreshRulesObservationPhase='QUERY_ACCESS_DENIED'}elseif(($taskRead.Stdout+$taskRead.Stderr) -match 'ParserError|UnexpectedToken'){$script:FreshRulesObservationPhase='QUERY_SOURCE_ERROR'}elseif(($taskRead.Stdout+$taskRead.Stderr) -match 'CommandNotFound|Modules_ModuleNotFound'){$script:FreshRulesObservationPhase='QUERY_COMMAND_MISSING'}elseif(($taskRead.Stdout+$taskRead.Stderr) -match 'ParameterBinding|NamedParameterNotFound'){$script:FreshRulesObservationPhase='QUERY_PARAMETER_INVALID'}elseif(($taskRead.Stdout+$taskRead.Stderr) -match '0x800706[dD]9|NoMoreEndpoints'){$script:FreshRulesObservationPhase='QUERY_SERVICE_UNAVAILABLE'}elseif(($taskRead.Stdout+$taskRead.Stderr) -match 'CimException|CimJobException'){$script:FreshRulesObservationPhase='QUERY_CIM_FAILED'}elseif(($taskRead.Stdout+$taskRead.Stderr) -match 'MethodException|MethodCountCouldNotFindBest'){$script:FreshRulesObservationPhase='QUERY_METHOD_ERROR'};return (New-FreshObservation $false $false)}
  $script:FreshRulesObservationPhase='PROTOCOL_SHAPE'
  $taskParsed=ConvertFrom-Json -InputObject $taskRead.Stdout -AsHashtable -NoEnumerate -ErrorAction Stop
  if($taskParsed -isnot [array]){return (New-FreshObservation $false $false)}
  if($taskParsed.Count -ne 2 -or ($taskParsed.store -join ',') -cne 'PersistentStore,ActiveStore'){return (New-FreshObservation $false $false)}
  $taskEmpty=$true
  foreach($taskStore in $taskParsed){
   if((($taskStore.Keys|Sort-Object) -join ',') -cne 'address,app,interface,interfaceType,port,rules,security,service,store'){return (New-FreshObservation $false $false)}
   foreach($taskPart in @('rules','port','app','address','interface','interfaceType','service','security')){
    if($taskStore[$taskPart] -isnot [array]){return (New-FreshObservation $false $false)}
    foreach($taskEntry in $taskStore[$taskPart]){if($taskEntry -isnot [string]){return (New-FreshObservation $false $false)};$taskBody=ConvertFrom-Json -InputObject $taskEntry -AsHashtable -ErrorAction Stop;if($taskBody -isnot [Collections.IDictionary] -or $taskBody.Count -eq 0){return (New-FreshObservation $false $false)}}
    if($taskStore[$taskPart].Count -ne 0){$taskEmpty=$false}
   }
  }
  $script:FreshRulesObservationPhase='COMPLETE';return (New-FreshObservation $true $taskEmpty $taskRead.Stdout)
 }catch{return (New-FreshObservation $false $false)}
}
