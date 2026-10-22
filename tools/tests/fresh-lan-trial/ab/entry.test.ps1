$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$taskRoot=Join-Path $taskRepo ('.test-work/ab-ps-entry-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskRoot|Out-Null
$script:taskChecks=0
function Assert-Ab($Value){if(!$Value){throw ('AB_ENTRY_COUNTER_FAILED_'+$script:taskChecks)};$script:taskChecks++}
function Run-Ab([string]$Script,[string[]]$Arguments){
 $taskStart=[Diagnostics.ProcessStartInfo]::new((Get-Process -Id $PID).Path);$taskStart.UseShellExecute=$false;$taskStart.CreateNoWindow=$true;$taskStart.RedirectStandardOutput=$true;$taskStart.RedirectStandardError=$true
 foreach($taskArg in @('-NoLogo','-NoProfile','-NonInteractive','-File',$Script)+$Arguments){$taskStart.ArgumentList.Add($taskArg)}
 $taskProcess=[Diagnostics.Process]::new();$taskProcess.StartInfo=$taskStart
 try{[void]$taskProcess.Start();$taskOut=$taskProcess.StandardOutput.ReadToEndAsync();$taskErr=$taskProcess.StandardError.ReadToEndAsync();if(!$taskProcess.WaitForExit(20000)){throw 'PRIVATE_ENTRY_TIMEOUT'};return @{code=$taskProcess.ExitCode;out=$taskOut.GetAwaiter().GetResult();err=$taskErr.GetAwaiter().GetResult()}}finally{$taskProcess.Dispose()}
}
$taskYaml=[IO.File]::ReadAllLines((Join-Path $taskRepo '.github/workflows/fresh-ab-acceptance.yml'))
$taskBlocks=@();for($taskIndex=0;$taskIndex -lt $taskYaml.Length;$taskIndex++){if($taskYaml[$taskIndex] -ceq '        run: |'){$taskLines=@();while($taskIndex+1 -lt $taskYaml.Length -and $taskYaml[$taskIndex+1].StartsWith('          ')){$taskIndex++;$taskLines+=$taskYaml[$taskIndex].Substring(10)};$taskBlocks+=($taskLines -join "`n")}}
Assert-Ab ($taskBlocks.Count -eq 8)
foreach($taskBlock in $taskBlocks){$taskTokens=$null;$taskErrors=$null;[void][Management.Automation.Language.Parser]::ParseInput($taskBlock,[ref]$taskTokens,[ref]$taskErrors);Assert-Ab ($taskErrors.Count -eq 0)}
# Invoke actual selected B branch with downloads/hash operations replaced at the
# process boundary. No Setup, compiler, registry or network access occurs.
$taskTokens=$null;$taskErrors=$null;$taskAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $taskRepo 'tools/windows-installer/fresh-trial/ci.ps1'),[ref]$taskTokens,[ref]$taskErrors);Assert-Ab ($taskErrors.Count -eq 0)
$taskBranch=@($taskAst.FindAll({param($n) $n -is [Management.Automation.Language.IfStatementAst] -and $n.Clauses[0].Item1.Extent.Text -ceq '$taskAb -and $taskContext.installSplit.role -ceq ''B'''},$true));Assert-Ab ($taskBranch.Count -eq 1)
$taskAb=$true;$taskContext=@{installSplit=@{role='B'};mode='CANDIDATE'};$taskWork=$taskRoot;$script:taskPins=0;$script:taskStages=0
function Stage($Reason){Assert-Ab ($Reason -ceq 'BUILD_TOOLCHAIN_FAILED');$script:taskStages++}
function Pinned($Uri,$Hash,$Zip,$Output){$script:taskPins++}
function Get-Content {param([switch]$Raw,[string]$LiteralPath) if($LiteralPath.EndsWith('distribution.json')){return '{"nodeUrl":"synthetic","nodeArchiveSha256":"synthetic","nodeExeSha256":"abcdef"}'};if($LiteralPath.EndsWith('toolchain.json')){return '{"goWindowsZip":"synthetic","sha256":"synthetic"}'};throw 'UNEXPECTED_CONTENT_READ'}
function Get-FileHash {param([string]$LiteralPath,[string]$Algorithm) return @{Hash='ABCDEF'}}
Invoke-Expression $taskBranch[0].Extent.Text
Remove-Item Function:Get-Content,Function:Get-FileHash
Assert-Ab ($taskPins -eq 2 -and $taskStages -eq 1)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskNames=@('K-SESSION-Fresh-Trial-1.1.0-beta.4.exe','K-SESSION-Fresh-Trial-1.1.0-beta.4.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','fresh-report.json','ab-transfer.json')
foreach($taskCase in @('valid','symlink','traversal','duplicate','empty')){
 $taskZip=Join-Path $taskRoot ($taskCase+'.zip');$taskArchive=[IO.Compression.ZipFile]::Open($taskZip,'Create')
 try{for($i=0;$i -lt 8;$i++){$taskName=$taskNames[$i];if($i -eq 7 -and $taskCase -ceq 'traversal'){$taskName='../ab-transfer.json'};if($i -eq 7 -and $taskCase -ceq 'duplicate'){$taskName='fresh-report.json'};$taskEntry=$taskArchive.CreateEntry($taskName);if($i -eq 7 -and $taskCase -ceq 'symlink'){$taskEntry.ExternalAttributes=-1610612736};$taskStream=$taskEntry.Open();try{if($taskCase -cne 'empty' -or $i -ne 7){$taskStream.WriteByte(65)}}finally{$taskStream.Dispose()}}}finally{$taskArchive.Dispose()}
 $taskOut=Join-Path $taskRoot ('extract-'+$taskCase);$taskResult=Run-Ab (Join-Path $taskRepo 'tools/windows-installer/fresh-trial/ab/extract-transfer.ps1') @('-Zip',$taskZip,'-Output',$taskOut)
 if($taskCase -ceq 'valid'){Assert-Ab ($taskResult.code -eq 0 -and $taskResult.out -ceq 'AB_TRANSFER_EXTRACTED' -and $taskResult.err -ceq '');Assert-Ab ((Get-ChildItem -LiteralPath $taskOut).Count -eq 8)}else{Assert-Ab ($taskResult.code -eq 1 -and $taskResult.out -ceq '' -and $taskResult.err.Trim() -ceq 'AB_TRANSFER_ARCHIVE_REJECTED');Assert-Ab (!(Test-Path -LiteralPath $taskOut))}
}
# Wrapper failures: missing script, process start failure and unexpected streams.
# Execute each real source/execution/final run body from an empty owned cwd;
# only node is replaced for source. Raw sentinel must never escape the wrapper.
foreach($taskKind in @('missing','start','stderr')){
 foreach($taskBlock in $taskBlocks|Where-Object{$_ -match 'try\{' -and $_ -notmatch 'AB_ISOLATION_ENTRY_FAILED'}){
  $taskDir=Join-Path $taskRoot ([guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $taskDir,(Join-Path $taskDir 'fallback-evidence')|Out-Null
  $taskPrefix='$env:FRESH_CONTROL_ROOT=$PSScriptRoot;$env:GITHUB_OUTPUT=Join-Path $PSScriptRoot ''output'';Set-Location $PSScriptRoot;'
  if($taskKind -ceq 'start'){$taskPrefix+='function node {throw ''PRIVATE_SENTINEL_PATH_AND_SECRET''};'}elseif($taskKind -ceq 'stderr'){$taskPrefix+='function node {Write-Error ''PRIVATE_SENTINEL_PATH_AND_SECRET'' -ErrorAction Continue;$global:LASTEXITCODE=0};'}else{$taskPrefix+='function node {throw ''PRIVATE_MISSING_SCRIPT''};'}
  $taskScript=Join-Path $taskDir 'wrapper.ps1';[IO.File]::WriteAllText($taskScript,$taskPrefix+"`n"+$taskBlock,[Text.UTF8Encoding]::new($false));$taskResult=Run-Ab $taskScript @()
  Assert-Ab ($taskResult.code -eq 1 -and $taskResult.err -ceq '' -and $taskResult.out.Trim() -cmatch '^AB_(SOURCE|EXECUTION|FINALIZATION)_FAILED$')
 }
}
[Console]::Write((@{status='PASS';checks=$script:taskChecks;productExecuted=$false;rawOutputStored=$false}|ConvertTo-Json -Compress))
