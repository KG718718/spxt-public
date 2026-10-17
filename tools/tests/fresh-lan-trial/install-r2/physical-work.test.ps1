param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$deadline=[DateTime]::UtcNow.AddSeconds(30);if(!$env:KSESSION_FAST_JOB_GATE){throw 'JOB_REQUIRED'};while(!(Test-Path -LiteralPath $env:KSESSION_FAST_JOB_GATE)){if([DateTime]::UtcNow -gt $deadline){throw 'JOB_ASSIGNMENT_UNKNOWN'};Start-Sleep -Milliseconds 20};if((Get-Content -LiteralPath $env:KSESSION_FAST_JOB_GATE -Raw) -cne 'ASSIGNED'){throw 'JOB_ASSIGNMENT_INVALID'}
. (Join-Path $PSScriptRoot '../../../windows-firewall/test-environment.ps1')
. (Join-Path $PSScriptRoot 'hosted-recovery.ps1')
. (Join-Path $PSScriptRoot 'physical-work.ps1')
if(!(Test-Path -LiteralPath $Root) -or (Get-KSessionFirewallTestPathClass $Root) -ne 'CANONICAL'){throw 'OWNED_ROOT_REQUIRED'}
$pass=0;$drive=$null;$activeTarget=$null;$binding=$null;$physicalBinding=$null;$restored=$false;$failed=$true
function Must([bool]$Value){if(!$Value){throw 'PHYSICAL_CONTRACT_FAILED'};$script:pass++}
function Reject([scriptblock]$Action){$rejected=$false;try{& $Action|Out-Null}catch{$rejected=$true};Must $rejected}
function Map-Owned([string]$Target){
 $b=[Text.StringBuilder]::new(32768)
 if([KSessionFirewallPathNative]::QueryDosDevice($script:drive,$b,$b.Capacity) -ne 0 -or (Test-Path ($script:drive+'\'))){throw 'FREE_MAPPING_REQUIRED'}
 & (Join-Path $env:SystemRoot 'System32/subst.exe') $script:drive $Target
 if($LASTEXITCODE -ne 0){throw 'OWNED_MAPPING_CREATE_FAILED'}
 $script:activeTarget=$Target
 if((Get-FreshNativeDevice $script:drive) -cne ('\??\'+$Target)){throw 'OWNED_MAPPING_IDENTITY_FAILED'}
}
function Unmap-Owned {
 if(!$script:activeTarget -or (Get-FreshNativeDevice $script:drive) -cne ('\??\'+$script:activeTarget)){throw 'UNKNOWN_MAPPING_PRESERVED'}
 & (Join-Path $env:SystemRoot 'System32/subst.exe') $script:drive /D
 if($LASTEXITCODE -ne 0){throw 'OWNED_MAPPING_REMOVE_FAILED'}
 $b=[Text.StringBuilder]::new(32768);if([KSessionFirewallPathNative]::QueryDosDevice($script:drive,$b,$b.Capacity) -ne 0){throw 'OWNED_MAPPING_RESTORE_UNKNOWN'}
 $script:activeTarget=$null
}
try{
 $physical=Join-Path $Root 'physical';New-Item -ItemType Directory -Path $physical|Out-Null
 $nativeDrive=[IO.Path]::GetPathRoot($physical).TrimEnd('\')
 $receipt=[pscustomobject]@{schema=1;runId='OWNED_LOCAL';drive=$nativeDrive;created=$false;target=$null}
 $physicalBinding=New-FreshPhysicalWorkBinding $physical $receipt 'OWNED_LOCAL' $Root
 Must (Test-FreshPhysicalWorkBinding $physicalBinding)
 $o=Get-FreshCompilerObservation $physicalBinding;Must ($o.known -and $o.absent)
 Reject {New-FreshPhysicalWorkBinding (Join-Path $Root 'missing') $receipt 'OWNED_LOCAL' $Root}
 Reject {New-FreshPhysicalWorkBinding $physical $receipt 'OTHER' $Root}
 $bad=$physicalBinding.PSObject.Copy();$bad.identity='unknown';Must (!(Test-FreshPinnedWorkDirectory $bad))
 # Do not assume a directory handle prevents rename on every Windows version.
 # If rename succeeds, current-path identity must fail; restore only the exact owned object.
 $renamed=$false;try{Move-Item -LiteralPath $physical -Destination ($physical+'-foreign') -ErrorAction Stop;$renamed=$true}catch{}
 if($renamed){
  Must (!(Test-FreshPinnedWorkDirectory $physicalBinding))
  $h=[FreshWorkDirectoryNative]::Open($physical+'-foreign');try{if([FreshWorkDirectoryNative]::Identity($h) -cne $physicalBinding.identity -or (Test-Path -LiteralPath $physical)){throw 'OWNED_RENAME_IDENTITY_UNKNOWN'}}finally{$h.Dispose()}
  Move-Item -LiteralPath ($physical+'-foreign') -Destination $physical -ErrorAction Stop
 }
 Must (Test-FreshPinnedWorkDirectory $physicalBinding)
 foreach($n in @('R:','S:','T:','U:','V:','W:','X:','Y:','Z:','Q:')){$b=[Text.StringBuilder]::new(32768);if([KSessionFirewallPathNative]::QueryDosDevice($n,$b,$b.Capacity) -eq 0 -and [Environment]::GetLogicalDrives() -inotcontains ($n+'\') -and !(Test-Path ($n+'\'))){$drive=$n;break}}
 if(!$drive){throw 'NO_SAFE_FREE_DRIVE'}
 $target=Join-Path $Root 'mapped';$other=Join-Path $Root 'other';foreach($p in @($target,$other)){New-Item -ItemType Directory -Path (Join-Path $p 'fresh-trial')|Out-Null}
 Map-Owned $target
 $receipt=[pscustomobject]@{schema=1;runId='OWNED_LOCAL';drive=$drive;created=$true;target=$target}
 $binding=New-FreshPhysicalWorkBinding ($drive+'\fresh-trial') $receipt 'OWNED_LOCAL' $target
 Must ((Test-FreshPhysicalWorkBinding $binding) -and $binding.physical -ieq (Join-Path $target 'fresh-trial'))
 $o=Get-FreshCompilerObservation $binding;Must ($o.known -and $o.absent)
 Reject {New-FreshPhysicalWorkBinding ($drive+'\fresh-trial') $receipt 'OWNED_LOCAL' $other}
 $unowned=[pscustomobject]@{schema=1;runId='OWNED_LOCAL';drive=$drive;created=$false;target=$null}
 Reject {New-FreshPhysicalWorkBinding ($drive+'\fresh-trial') $unowned 'OWNED_LOCAL' $target}
 $compiler=Join-Path $binding.physical 'inno/compiler';New-Item -ItemType Directory -Path $compiler|Out-Null
 $o=Get-FreshCompilerObservation $binding;Must ($o.known -and !$o.absent)
 $junction=Join-Path $physical 'inno';New-Item -ItemType Junction -Path $junction -Target $target|Out-Null
 Must (!(Get-FreshCompilerObservation $physicalBinding).known)
 Reject {New-FreshPhysicalWorkBinding $junction ([pscustomobject]@{schema=1;runId='OWNED_LOCAL';drive=$nativeDrive;created=$false;target=$null}) 'OWNED_LOCAL' $Root}
 $locked=Join-Path $Root 'locked';[IO.File]::WriteAllText($locked,'owned')
 $h=[IO.File]::Open($locked,'Open','ReadWrite','None');try{Must (!(Get-FreshPathObservation $locked).known)}finally{$h.Dispose()}
 Unmap-Owned;Map-Owned $other
 Must (!(Test-FreshPhysicalWorkBinding $binding))
 Must ((Test-FreshPinnedWorkDirectory $binding))
 Must (!(Get-FreshCompilerObservation $binding).known)
 Reject {Get-FreshPhysicalNode $binding ($drive+'\fresh-trial/node.exe')}
 # Restoration failure is rejected without touching an unknown receipt/mapping.
 $bad=$binding.PSObject.Copy();$bad.device='unowned';Must (!(Test-FreshPhysicalWorkBinding $bad))
 $activeTarget=$target;Reject {Unmap-Owned};$activeTarget=$other
 Must ((Get-FreshNativeDevice $drive) -ceq ('\??\'+$other))
 Unmap-Owned;$restored=$true;$failed=$false
}finally{
 if($null -ne $binding){Close-FreshPhysicalWorkBinding $binding}
 if($null -ne $physicalBinding){Close-FreshPhysicalWorkBinding $physicalBinding}
 if($activeTarget){Unmap-Owned;$restored=$true}
 $report=[ordered]@{schema=1;kind='CLOSURE_PHYSICAL_WORK';pass=$pass;fail=$(if($restored -and !$failed){0}else{1});skipped=0;mappingRestored=$restored;productionInstalled=$false;realRegistryWritten=$false;realRulesWritten=$false;rawOutputStored=$false}
 [IO.File]::WriteAllText((Join-Path $Root 'physical-result.json'),($report|ConvertTo-Json -Compress))
}
$report|ConvertTo-Json -Compress
