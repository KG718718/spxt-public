param([Parameter(Mandatory=$true)][string]$Zip,[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
trap{[Console]::Error.WriteLine('AB_TRANSFER_ARCHIVE_REJECTED');exit 1}
if(Test-Path -LiteralPath $Output){throw 'NEW_EXTRACTION_REQUIRED'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=[IO.Compression.ZipFile]::OpenRead($Zip)
try{
 $taskNames=@('K-SESSION-Fresh-Trial-1.1.0-beta.4.exe','K-SESSION-Fresh-Trial-1.1.0-beta.4.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','fresh-report.json','ab-transfer.json')
 if($taskArchive.Entries.Count -ne 8 -or (Compare-Object ($taskNames|Sort-Object) @($taskArchive.Entries.FullName|Sort-Object))){throw 'EXACT_ALLOWLIST_REQUIRED'}
 $taskTotal=0L
 foreach($taskEntry in $taskArchive.Entries){$taskTotal+=$taskEntry.Length;if($taskEntry.Length -lt 1 -or $taskEntry.Length -gt 512MB -or $taskTotal -gt 512MB -or ([long]$taskEntry.ExternalAttributes -band 0xf0000000L) -eq 0xa0000000L){throw 'ARCHIVE_BOUND_OR_TYPE'} }
 New-Item -ItemType Directory -Path $Output|Out-Null
 foreach($taskEntry in $taskArchive.Entries){[IO.Compression.ZipFileExtensions]::ExtractToFile($taskEntry,(Join-Path $Output $taskEntry.FullName),$false)}
}finally{$taskArchive.Dispose()}
[Console]::Write('AB_TRANSFER_EXTRACTED')
