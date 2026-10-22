param([Parameter(Mandatory=$true)][string]$Base,[Parameter(Mandatory=$true)][string]$Name)
$ErrorActionPreference='Stop'
trap{[Console]::Error.WriteLine('AB_FAILURE_DIRECTORY_CONTROLLER_FAILED');exit 1}
Add-Type -Path (Join-Path $PSScriptRoot 'owned-failure-directory.cs')
$taskReceipt=$null
try{
 $taskReceipt=[FreshFailureDirectory]::Create($Base,$Name)
 $taskReady=$taskReceipt.Ready -and $taskReceipt.CreatedNew -and $taskReceipt.FileProbe() -and $taskReceipt.ChildCreateDenied()
 [Console]::WriteLine((@{schema=1;kind='AB_FAILURE_DIRECTORY_READY';ready=[bool]$taskReady;createdNew=$taskReceipt.CreatedNew}|ConvertTo-Json -Compress));[Console]::Out.Flush()
 $taskOperation=[Console]::ReadLine()
 if($taskOperation -cne 'RESTORE'){exit 1}
 $taskState=$taskReceipt.Restore()
 if($taskState -cnotin @('OWNED_REMOVED','RETIRED_CHANGED','OWNERSHIP_UNKNOWN','ACL_CHANGED','UNOWNED_CHILDREN_PRESENT','ACL_RESTORE_UNPROVEN','DELETE_FAILED','POST_ABSENCE_UNPROVEN')){$taskState='OWNERSHIP_UNKNOWN'}
 [Console]::WriteLine((@{schema=1;kind='AB_FAILURE_DIRECTORY_RESTORED';state=$taskState;creationComplete=[bool]$taskReady}|ConvertTo-Json -Compress));[Console]::Out.Flush()
 if($taskState -cne 'OWNED_REMOVED'){exit 1}
}finally{if($null -ne $taskReceipt){$taskReceipt.Dispose()}}
