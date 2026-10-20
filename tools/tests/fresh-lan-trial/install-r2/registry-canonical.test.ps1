param([Parameter(Mandatory=$true)][string]$Root,[switch]$Native)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'hosted-recovery.ps1')
$taskPass=0
function Assert-Registry([bool]$Value){if(!$Value){throw 'REGISTRY_CANONICAL_COUNTER_FAILED'};$script:taskPass++}
function Canonical($Value){ConvertTo-Json -InputObject (ConvertTo-FreshRegistryCanonical $Value) -Depth 60 -Compress}
$taskA=[ordered]@{Z=[ordered]@{values=[ordered]@{b=@('String','中文');a=@('DWord',123)};children=[ordered]@{}};A=$null}
$taskB=[ordered]@{A=$null;Z=[ordered]@{children=[ordered]@{};values=[ordered]@{a=@('DWord',123);b=@('String','中文')}}}
Assert-Registry ((Canonical $taskA) -ceq (Canonical $taskB))
$taskBefore=New-FreshObservation $true $false (Canonical $taskA)
$taskAfter=New-FreshObservation $true $false (Canonical $taskB)
Assert-Registry ((Get-FreshRecoveryState $taskBefore $taskAfter) -ceq 'SNAPSHOT_UNCHANGED')
$taskB.Z.values.b=@('ExpandString','中文');Assert-Registry ((Get-FreshRecoveryState $taskBefore (New-FreshObservation $true $false (Canonical $taskB))) -ceq 'STATE_CHANGED')
$taskB.Z.values.b=@('String','不同');Assert-Registry ((Get-FreshRecoveryState $taskBefore (New-FreshObservation $true $false (Canonical $taskB))) -ceq 'STATE_CHANGED')
$taskB.Z.values.b=@('String','中文');$taskB.Z.children.new=[ordered]@{values=[ordered]@{};children=[ordered]@{}};Assert-Registry ((Canonical $taskA) -cne (Canonical $taskB))
Assert-Registry ((Canonical @('a','b')) -cne (Canonical @('b','a')))
Assert-Registry ((Canonical @()) -ceq '[]')
Assert-Registry ((Canonical @('one')) -ceq '["one"]')
Assert-Registry ((Canonical ([byte[]]@(1,2))) -ceq '[1,2]')
Assert-Registry ((Canonical $null) -ceq 'null')
Assert-Registry ((Canonical '') -ceq '""')
Assert-Registry ((Canonical @($null)) -ceq '[null]')
Assert-Registry ((Canonical @('x',$null)) -ceq '["x",null]')
$taskNested=ConvertFrom-Json -InputObject '[["x","y"],["z"],null,[]]' -NoEnumerate
Assert-Registry ((Canonical $taskNested) -ceq '[["x","y"],["z"],null,[]]')
Assert-Registry ((Canonical @{value=@($null)}) -cne (Canonical @{value=@()}))
Assert-Registry ((Canonical @{value=$null}) -cne (Canonical @{}))
Assert-Registry ((Canonical ([ordered]@{Keys='controlled';Values='retained';Count=2;other='expected'})) -ceq '{"Count":2,"Keys":"controlled","Values":"retained","other":"expected"}')
$taskFakeObservation=@{known=$true;absent=$false;value='controlled';Keys=@('absent','known','value')}
Assert-Registry ((Get-FreshRecoveryState $taskFakeObservation $taskFakeObservation) -ceq 'OBSERVATION_FAILED')
foreach($taskAlias in @('Keys','Values','Count')){
 $taskAliasTree=@{values=[ordered]@{};children=[ordered]@{}}
 $taskAliasTree.values[$taskAlias]=@{kind='String';value='controlled'}
 $taskAliasTree.values.bad=@{kind='Unknown';value='bad'}
 $taskRejected=$false;try{Assert-FreshRegistryTree $taskAliasTree}catch{$taskRejected=$true};Assert-Registry $taskRejected
}
$taskNullStrings=[string[]]::new(2);$taskNullStrings[0]='x'
$taskAliasTree=@{values=@{sample=@{kind='MultiString';value=$taskNullStrings}};children=@{}}
$taskRejected=$false;try{Assert-FreshRegistryTree $taskAliasTree}catch{$taskRejected=$true};Assert-Registry $taskRejected
foreach($taskKind in @('missing','null','wrong-kind','wrong-type','extra-field')){
 $taskTyped=@{values=@{probe=@{kind='String';value='x'}};children=@{}}
 switch($taskKind){'missing'{$taskTyped.values.probe.Remove('value')};'null'{$taskTyped.values.probe.value=$null};'wrong-kind'{$taskTyped.values.probe.kind='Unknown'};'wrong-type'{$taskTyped.values.probe.value=123};'extra-field'{$taskTyped.values.probe.raw='FORBIDDEN'}}
 $taskRejected=$false;try{Assert-FreshRegistryTree $taskTyped}catch{$taskRejected=$true};Assert-Registry $taskRejected
}
$taskPrivateRestored=$null
if($Native){
 . (Join-Path $PSScriptRoot '../supervisor-entry.ps1')
 Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE 5
 # Load only the existing observer function definition, never the CI entry.
 $taskTokens=$null;$taskErrors=$null
 $taskAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../../../windows-installer/fresh-trial/ci.ps1'),[ref]$taskTokens,[ref]$taskErrors)
 if($taskErrors.Count){throw 'OBSERVER_SOURCE_INVALID'}
 $taskDefinitions=@($taskAst.FindAll({param($n)$n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -ceq 'Registry-Tree'},$true))
 if($taskDefinitions.Count -ne 1){throw 'OBSERVER_DEFINITION_INVALID'}
 . ([scriptblock]::Create($taskDefinitions[0].Extent.Text))
 Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;public static class FreshCanonicalRegistryControl {
[DllImport("advapi32.dll",CharSet=CharSet.Unicode)]public static extern int RegCreateKeyEx(IntPtr root,string path,uint reserved,string cls,uint options,uint access,IntPtr security,out IntPtr key,out uint disposition);
[DllImport("advapi32.dll",CharSet=CharSet.Unicode)]public static extern int RegSetValueEx(IntPtr key,string name,uint reserved,uint kind,byte[] data,uint bytes);
[DllImport("advapi32.dll",CharSet=CharSet.Unicode)]public static extern int RegDeleteKeyEx(IntPtr root,string path,uint view,uint reserved);
[DllImport("advapi32.dll")]public static extern int RegCloseKey(IntPtr key);
}
'@
 $taskPrivate='Software\CodexFc3Canonical_'+[guid]::NewGuid().ToString('N');$taskOther=$taskPrivate+'_absent';$taskH=[IntPtr]::Zero;$taskOwned=$false
 $taskPre=Get-FreshRegistryObservation @($taskPrivate,$taskOther)
 Assert-Registry ($taskPre.known -and $taskPre.absent)
 try{
  $taskDisposition=0u;$taskRc=[FreshCanonicalRegistryControl]::RegCreateKeyEx([IntPtr]::new(-2147483647),$taskPrivate,0,$null,0,0x3011f,[IntPtr]::Zero,[ref]$taskH,[ref]$taskDisposition)
  if($taskRc -ne 0 -or $taskDisposition -ne 1){throw 'PRIVATE_EXCLUSIVE_CREATE_FAILED'};$taskOwned=$true
  $taskData=[Text.Encoding]::Unicode.GetBytes("FRESH_TRIAL_OWNED`0")
  if([FreshCanonicalRegistryControl]::RegSetValueEx($taskH,'FreshTrialOwned',0,1,$taskData,$taskData.Length) -ne 0){throw 'PRIVATE_EXCLUSIVE_WRITE_FAILED'}
  $taskPresent=Get-FreshRegistryObservation @($taskPrivate,$taskOther)
  Assert-Registry ($taskPresent.known -and !$taskPresent.absent)
  Assert-Registry ((Get-FreshRecoveryState $taskPresent (Get-FreshRegistryObservation @($taskOther,$taskPrivate))) -ceq 'SNAPSHOT_UNCHANGED')
  $taskRows=ConvertFrom-Json -InputObject $taskPresent.value -AsHashtable
  Assert-Registry ($null -ne $taskRows['CurrentUser:Registry64:'+$taskPrivate] -and $null -ne $taskRows['CurrentUser:Registry32:'+$taskPrivate])
 }finally{
  if($taskOwned){
   $taskHive=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,[Microsoft.Win32.RegistryView]::Registry64)
   try{$taskKey=$taskHive.OpenSubKey($taskPrivate);if($null -eq $taskKey){throw 'PRIVATE_OWNERSHIP_UNKNOWN'};try{$taskExact=$taskKey.GetValueNames().Count -eq 1 -and $taskKey.GetValueNames()[0] -ceq 'FreshTrialOwned' -and [string]$taskKey.GetValueKind('FreshTrialOwned') -ceq 'String' -and $taskKey.GetValue('FreshTrialOwned') -ceq 'FRESH_TRIAL_OWNED' -and $taskKey.GetSubKeyNames().Count -eq 0}finally{$taskKey.Dispose()};if(!$taskExact){throw 'PRIVATE_OWNERSHIP_UNKNOWN'};if([FreshCanonicalRegistryControl]::RegDeleteKeyEx([IntPtr]::new(-2147483647),$taskPrivate,0x100,0) -ne 0){throw 'PRIVATE_DELETE_FAILED'}}finally{$taskHive.Dispose()}
  }
  if($taskH -ne [IntPtr]::Zero){if([FreshCanonicalRegistryControl]::RegCloseKey($taskH) -ne 0){throw 'PRIVATE_CLOSE_FAILED'}}
 }
 $taskAfter=Get-FreshRegistryObservation @($taskPrivate,$taskOther)
 $taskPrivateRestored=$taskAfter.known -and $taskAfter.absent -and (Get-FreshRecoveryState $taskPre $taskAfter) -ceq 'ABSENT_UNCHANGED'
 Assert-Registry $taskPrivateRestored
}
if(Test-Path -LiteralPath $Root){throw 'New owned output required'}
New-Item -ItemType Directory -Path $Root|Out-Null
$taskReport=@{schema=1;kind='FC3_REGISTRY_CANONICAL_COUNTERS';pass=$taskPass;fail=0;skip=0;privateRegistryWritten=[bool]$Native;privateGlobalRestored=$taskPrivateRestored;productRegistrationTouched=$false;rawOutputStored=$false}
[IO.File]::WriteAllText((Join-Path $Root 'result.json'),($taskReport|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
$taskReport|ConvertTo-Json -Compress
