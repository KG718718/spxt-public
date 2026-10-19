# Definitions only. Hosted entry supplies fixed callbacks; no local-mode CLI bypass.
function ConvertTo-FreshSupervisorWork([string]$Work){
 if($Work -notmatch '^E:[\\/]fresh-trial[\\/]?$'){throw 'WORK_ROOT_REJECTED'}
 $taskNormalized=[IO.Path]::GetFullPath($Work).TrimEnd('\')
 if($taskNormalized -ine 'E:\fresh-trial'){throw 'WORK_ROOT_REJECTED'}
 return $taskNormalized
}
function Wait-FreshCiAssignment([string]$Gate,[int]$Seconds=30){
 if(!$Gate){throw 'CI_ENTRY_REJECTED'};$taskDeadline=[DateTime]::UtcNow.AddSeconds($Seconds)
 while(!(Test-Path -LiteralPath $Gate)){if([DateTime]::UtcNow -gt $taskDeadline){throw 'CI_ENTRY_REJECTED'};Start-Sleep -Milliseconds 10}
 if((Get-Content -LiteralPath $Gate -Raw) -cne 'ASSIGNED'){throw 'CI_ENTRY_REJECTED'}
}
function New-FreshSupervisorSink([string]$Root,$Identity){
 if((Get-KSessionFirewallTestPathClass $Root) -ne 'CANONICAL' -or $Identity.sourceCommit -cnotmatch '^[a-f0-9]{40}$' -or $Identity.controlCommit -cnotmatch '^[a-f0-9]{40}$' -or $Identity.run.id -cnotmatch '^[1-9][0-9]{0,19}$' -or $Identity.run.attempt -ne 1){throw 'DIAGNOSTIC_OWNER_UNKNOWN'}
 $taskReceipt=Join-Path $Root 'isolation-private.json';$a=[IO.File]::GetAttributes($taskReceipt)
 if(($a -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or ($a -band [IO.FileAttributes]::Directory) -ne 0){throw 'DIAGNOSTIC_OWNER_UNKNOWN'}
 $taskOwner=[FreshWorkDirectoryNative]::ReadFixedFile($taskReceipt)|ConvertFrom-Json
 if((($taskOwner.PSObject.Properties.Name|Sort-Object) -join ',') -cne 'created,drive,runId,schema,target' -or $taskOwner.schema -ne 1 -or $taskOwner.runId -cne $Identity.run.id -or $taskOwner.drive -cne 'E:' -or $taskOwner.created -isnot [bool]){throw 'DIAGNOSTIC_OWNER_UNKNOWN'}
 $taskHandle=[FreshWorkDirectoryNative]::Open($Root)
 try{return [pscustomobject]@{root=$Root;handle=$taskHandle;identity=[FreshWorkDirectoryNative]::Identity($taskHandle);source=$Identity;bytes=$null;last=$null;workObserved=$false;workMatched=$false;stream=$null;ownerStream=$null;writeFailed=$false}}catch{$taskHandle.Dispose();throw 'DIAGNOSTIC_OWNER_UNKNOWN'}
}
function Close-FreshSupervisorSink($Sink){if($null -ne $Sink){if($null -ne $Sink.stream){$Sink.stream.Dispose()};if($null -ne $Sink.ownerStream){$Sink.ownerStream.Dispose()};$Sink.handle.Dispose()}}
function Set-FreshSupervisorWorkOwner($Sink,$Binding){
 if(!(Test-FreshSupervisorSink $Sink) -or !(Test-FreshPhysicalWorkBinding $Binding)){throw 'WORK_OWNER_UNKNOWN'}
 $r=[ordered]@{schema=1;kind='FRESH_SUPERVISOR_WORK_OWNER';sourceCommit=$Sink.source.sourceCommit;controlCommit=$Sink.source.controlCommit;run=$Sink.source.run;identity=$Binding.identity}
 $Sink.ownerStream=[IO.File]::Open((Join-Path $Sink.root 'supervisor-work-owner-private.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 $b=[Text.Encoding]::UTF8.GetBytes(($r|ConvertTo-Json -Depth 4 -Compress));$Sink.ownerStream.Write($b,0,$b.Length);$Sink.ownerStream.Flush();$Sink.workObserved=$true;$Sink.workMatched=$true
}
function Read-FreshSupervisorWorkOwner([string]$Root,$Identity){$sink=New-FreshSupervisorSink $Root $Identity;try{if(!(Test-FreshSupervisorSink $sink)){throw 'WORK_OWNER_UNKNOWN'};$r=[FreshWorkDirectoryNative]::ReadFixedFile((Join-Path $Root 'supervisor-work-owner-private.json'));if(!(Test-FreshSupervisorSink $sink)){throw 'WORK_OWNER_UNKNOWN'};return $r}finally{Close-FreshSupervisorSink $sink}}
function Test-FreshSupervisorSink($Sink){
 try{if((Get-KSessionFirewallTestPathClass $Sink.root) -ne 'CANONICAL' -or [FreshWorkDirectoryNative]::Identity($Sink.handle) -cne $Sink.identity){return $false};$h=[FreshWorkDirectoryNative]::Open($Sink.root);try{return [FreshWorkDirectoryNative]::Identity($h) -ceq $Sink.identity}finally{$h.Dispose()}}catch{return $false}
}
function Set-FreshSupervisorDiagnostic($Sink,[string]$Stage,[string]$Classification,$Scope=$null){
 $taskStages=@('SUPERVISOR_CONTEXT','SUPERVISOR_BINDING','SUPERVISOR_JOB','SUPERVISOR_REPORT','CI_ENTRY','ENV_PRECHECK')
 $taskClasses=@('SUPERVISOR_CONTEXT_REJECTED','WORK_BINDING_REJECTED','SUPERVISOR_START_FAILED','JOB_ASSIGNMENT_FAILED','JOB_HANDSHAKE_FAILED','SUPERVISOR_TIMEOUT','CI_ENTRY_REJECTED','ENV_PRECHECK_FAILED','CHILD_EXIT_FAILED','REPORT_WRITE_FAILED','SUPERVISOR_DIAGNOSTIC_INVALID','PASS','NOT_STARTED')
 if($Stage -cnotin $taskStages -or $Classification -cnotin $taskClasses -or !(Test-FreshSupervisorSink $Sink)){throw 'DIAGNOSTIC_WRITE_REJECTED'}
 if($null -ne $Scope){Assert-FreshSupervisorScope $Scope}
 if($null -ne $Sink.last -and $Sink.last.diagnostic.classification -cnotin @('PASS','NOT_STARTED')){$Stage=$Sink.last.diagnostic.stage;$Classification=$Sink.last.diagnostic.classification}
 if($null -eq $Scope -and $null -ne $Sink.last){$Scope=$Sink.last.scope}
 if($Classification -ceq 'PASS' -and ($null -eq $Scope -or $Scope.status -cne 'PASS' -or !$Sink.workObserved -or !$Sink.workMatched)){throw 'DIAGNOSTIC_PASS_UNPROVEN'}
 $taskRecord=[ordered]@{schema=1;kind='FRESH_SUPERVISOR_ENTRY';sourceCommit=$Sink.source.sourceCommit;controlCommit=$Sink.source.controlCommit;run=$Sink.source.run;diagnostic=[ordered]@{stage=$Stage;classification=$Classification;script=$null;line=$null};scope=$Scope;workObserved=$Sink.workObserved;workMatched=$Sink.workMatched}
 $taskBytes=[Text.UTF8Encoding]::new($false).GetBytes(($taskRecord|ConvertTo-Json -Depth 10 -Compress))
 if($Sink.writeFailed){throw 'DIAGNOSTIC_WRITE_REJECTED'}
 if($null -eq $Sink.stream){$Sink.stream=[IO.File]::Open((Join-Path $Sink.root 'supervisor-entry-private.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)}
 try{$Sink.stream.SetLength(0);$Sink.stream.Position=0;$Sink.stream.Write($taskBytes,0,$taskBytes.Length);$Sink.stream.Flush()}catch{$Sink.writeFailed=$true;throw 'DIAGNOSTIC_WRITE_REJECTED'}
 $Sink.bytes=$taskBytes;$Sink.last=$taskRecord
}
function Assert-FreshSupervisorScope($Scope){
 if((($Scope.PSObject.Properties.Name|Sort-Object) -join ',') -cne 'assigned,forcedTermination,handlesClosed,jobEmpty,kind,naturalExit,pipesClosed,schema,status,stderrEmpty' -or $Scope.schema -ne 1 -or $Scope.kind -cne 'FAST_OWNED_PROCESS_SCOPE'){throw 'DIAGNOSTIC_SCOPE_INVALID'}
 foreach($k in @('assigned','pipesClosed','handlesClosed','forcedTermination')){if($Scope.$k -isnot [bool]){throw 'DIAGNOSTIC_SCOPE_INVALID'}}
 foreach($k in @('naturalExit','stderrEmpty','jobEmpty')){if($null -ne $Scope.$k -and $Scope.$k -isnot [bool]){throw 'DIAGNOSTIC_SCOPE_INVALID'}}
 $pass=$Scope.assigned -and $Scope.naturalExit -eq $true -and $Scope.stderrEmpty -eq $true -and $Scope.pipesClosed -and $Scope.handlesClosed -and $Scope.jobEmpty -eq $true -and !$Scope.forcedTermination
 if($Scope.status -cne $(if($pass){'PASS'}else{'FAIL'})){throw 'DIAGNOSTIC_SCOPE_INVALID'}
}
function Write-FreshSupervisorEmergency($Sink){
 if(!(Test-FreshSupervisorSink $Sink)){throw 'DIAGNOSTIC_OWNER_UNKNOWN'}
 $r=[ordered]@{schema=1;kind='FRESH_SUPERVISOR_ENTRY';sourceCommit=$Sink.source.sourceCommit;controlCommit=$Sink.source.controlCommit;run=$Sink.source.run;diagnostic=[ordered]@{stage='SUPERVISOR_REPORT';classification='REPORT_WRITE_FAILED';script=$null;line=$null};scope=$null;workObserved=$Sink.workObserved;workMatched=$Sink.workMatched}
 $f=[IO.File]::Open((Join-Path $Sink.root 'supervisor-entry-error-private.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 try{$b=[Text.Encoding]::UTF8.GetBytes(($r|ConvertTo-Json -Depth 10 -Compress));$f.Write($b,0,$b.Length)}finally{$f.Dispose()}
}
function Read-FreshSupervisorDiagnostic([string]$Root,$Identity){
 $sink=New-FreshSupervisorSink $Root $Identity
 try{if(!(Test-FreshSupervisorSink $sink)){throw 'DIAGNOSTIC_OWNER_UNKNOWN'};$path=Join-Path $Root 'supervisor-entry-error-private.json';$emergency=Test-Path -LiteralPath $path;if(!$emergency){$path=Join-Path $Root 'supervisor-entry-private.json'};if(!(Test-Path -LiteralPath $path)){return $null};$text=[FreshWorkDirectoryNative]::ReadFixedFile($path);if(!(Test-FreshSupervisorSink $sink)){throw 'DIAGNOSTIC_OWNER_UNKNOWN'};if($emergency){$r=$text|ConvertFrom-Json;if($r.diagnostic.stage -cne 'SUPERVISOR_REPORT' -or $r.diagnostic.classification -cne 'REPORT_WRITE_FAILED' -or $null -ne $r.scope){throw 'DIAGNOSTIC_INVALID'}};return $text}finally{Close-FreshSupervisorSink $sink}
}
function Assert-FreshEnvPrecheck($Registry,$Rules,$Compiler,$Products){
 if($null -eq $Registry -or $Registry.known -ne $true -or $null -eq $Rules -or $Rules.known -ne $true -or $null -eq $Compiler -or $Compiler.known -ne $true -or $Compiler.absent -ne $true){throw 'ENV_PRECHECK_FAILED'}
 if((($Products.Keys|Sort-Object) -join ',') -cne 'binding,desktop,productRegistration,programFiles,programs,startup' -or @($Products.Values|Where-Object{$_.known -ne $true}).Count){throw 'ENV_PRECHECK_FAILED'}
}
function Invoke-FreshSupervisorCore([string]$Work,$Sink,[scriptblock]$VerifyContext,[scriptblock]$OpenBinding,[scriptblock]$Execute,[scriptblock]$Normalize={param($p)ConvertTo-FreshSupervisorWork $p}){
 $binding=$null;$phase='SUPERVISOR_BINDING';$classification='WORK_BINDING_REJECTED';$scope=$null
 try{
  $workNormalized=& $Normalize $Work
  $phase='SUPERVISOR_CONTEXT';$classification='SUPERVISOR_CONTEXT_REJECTED';Set-FreshSupervisorDiagnostic $Sink $phase 'NOT_STARTED'
  $contextResult=& $VerifyContext $workNormalized
  if($null -ne $contextResult){$scope=$contextResult.scope;Assert-FreshSupervisorScope $scope;if($scope.status -cne 'PASS'){throw 'SUPERVISOR_CONTEXT_REJECTED'}}
  $phase='SUPERVISOR_BINDING';$classification='WORK_BINDING_REJECTED';Set-FreshSupervisorDiagnostic $Sink $phase 'NOT_STARTED'
  $binding=& $OpenBinding $workNormalized
  if(!(Test-FreshPhysicalWorkBinding $binding)){throw 'WORK_BINDING_REJECTED'}
  Set-FreshSupervisorWorkOwner $Sink $binding
  $phase='SUPERVISOR_JOB';$classification='SUPERVISOR_START_FAILED';Set-FreshSupervisorDiagnostic $Sink $phase 'NOT_STARTED'
  $result=& $Execute $workNormalized $binding.physical
  $Sink.workMatched=Test-FreshPhysicalWorkBinding $binding
  $scope=$result.scope;$processClass=$result.classification;Assert-FreshSupervisorScope $scope
  if(!(Test-FreshPinnedWorkDirectory $binding)){$phase='SUPERVISOR_BINDING';$classification='WORK_BINDING_REJECTED';throw 'WORK_BINDING_REJECTED'}
  $phase='SUPERVISOR_REPORT';$classification='REPORT_WRITE_FAILED'
  $file=[IO.File]::Open((Join-Path $binding.physical 'scope-job-proof.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$b=[Text.Encoding]::UTF8.GetBytes(($scope|ConvertTo-Json -Compress));$file.Write($b,0,$b.Length)}finally{$file.Dispose()}
  if(!(Test-FreshPhysicalWorkBinding $binding)){$phase='SUPERVISOR_BINDING';$classification='WORK_BINDING_REJECTED';throw 'WORK_BINDING_REJECTED'}
  $phase=switch($processClass){'CI_ENTRY_REJECTED'{'CI_ENTRY'}'ENV_PRECHECK_FAILED'{'ENV_PRECHECK'}default{'SUPERVISOR_JOB'}}
  $classification=$processClass;Set-FreshSupervisorDiagnostic $Sink $phase $classification $scope
  return ($scope.status -ceq 'PASS' -and $classification -ceq 'PASS')
 }catch{
  if($classification -ceq 'WORK_BINDING_REJECTED'){$Sink.workMatched=$false}
  try{Set-FreshSupervisorDiagnostic $Sink $phase $classification $scope}catch{try{Write-FreshSupervisorEmergency $Sink}catch{};[Console]::Error.WriteLine('FRESH_SUPERVISOR_REPORT_WRITE_FAILED')}
  return $false
 }finally{if($null -ne $binding){Close-FreshPhysicalWorkBinding $binding}}
}
