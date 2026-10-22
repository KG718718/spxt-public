param([Parameter(Mandatory=$true)][string]$Zip)
$ErrorActionPreference='Stop'
trap{[Console]::Error.WriteLine('AB_PART_ARCHIVE_REJECTED');exit 1}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=[IO.Compression.ZipFile]::OpenRead($Zip)
try{
 if($taskArchive.Entries.Count -ne 1){throw 'ONE_JSON_REQUIRED'}
 $taskEntry=$taskArchive.Entries[0]
 if($taskEntry.FullName -cne 'fresh-report.json' -or $taskEntry.Length -lt 1 -or $taskEntry.Length -gt 1MB -or ([long]$taskEntry.ExternalAttributes -band 0xf0000000L) -eq 0xa0000000L){throw 'PART_ALLOWLIST_REJECTED'}
 $taskStream=$taskEntry.Open();try{$taskMemory=[IO.MemoryStream]::new();try{$taskStream.CopyTo($taskMemory);if($taskMemory.Length -ne $taskEntry.Length){throw 'PART_READ_INCOMPLETE'};$taskText=[Text.UTF8Encoding]::new($false,$true).GetString($taskMemory.ToArray());[Console]::Write($taskText)}finally{$taskMemory.Dispose()}}finally{$taskStream.Dispose()}
}finally{$taskArchive.Dispose()}
