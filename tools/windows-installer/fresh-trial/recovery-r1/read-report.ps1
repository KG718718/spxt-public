param([Parameter(Mandatory=$true)][string]$Zip,[ValidateSet('SMOKE','TRIAL','FAILURE')][string]$Kind)
$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=[IO.Compression.ZipFile]::OpenRead($Zip)
try{
  $taskName=if($Kind -eq 'SMOKE'){'smoke-report.json'}else{'fresh-report.json'}
  $taskAllowed=if($Kind -eq 'TRIAL'){@('K-SESSION-Fresh-Trial-1.1.0-beta.4.exe','K-SESSION-Fresh-Trial-1.1.0-beta.4.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','fresh-report.json')}else{@($taskName)}
  if($taskArchive.Entries.Count -ne $taskAllowed.Count -or (Compare-Object @($taskArchive.Entries.FullName|Sort-Object) @($taskAllowed|Sort-Object))){throw 'Artifact file set rejected'}
  $taskEntry=$taskArchive.GetEntry($taskName)
  if($null -eq $taskEntry -or $taskEntry.Length -lt 1 -or $taskEntry.Length -gt 256KB){throw 'Artifact report bound rejected'}
  $taskStream=$taskEntry.Open();$taskReader=[IO.StreamReader]::new($taskStream,[Text.UTF8Encoding]::new($false,$true),$false)
  try{[Console]::Write($taskReader.ReadToEnd())}finally{$taskReader.Dispose();$taskStream.Dispose()}
}finally{$taskArchive.Dispose()}
