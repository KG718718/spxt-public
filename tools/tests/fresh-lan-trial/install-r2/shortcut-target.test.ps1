param([Parameter(Mandatory=$true)][string]$Root,[Parameter(Mandatory=$true)][string]$LauncherSha256)
$ErrorActionPreference='Stop'
$taskStage='SOURCE'
trap { [Console]::Error.WriteLine('SHORTCUT_ORACLE_'+$taskStage+'_FAILED'); exit 1 }
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if($Root -cnotmatch '^E:\\CodexWorkspace\\outputs\\fresh-install-r2-link-[a-f0-9]{32}$'){throw 'Owned root required'}
$taskMarker=Get-Content (Join-Path $Root '.owned-link-driver.json') -Raw|ConvertFrom-Json
if($taskMarker.kind -cne 'OWNED_LINK_DRIVER' -or $taskMarker.aliases.Count -ne 2){throw 'Owned marker required'}
$taskTokens=$null;$taskErrors=$null
$taskAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'shortcut-target.ps1'),[ref]$taskTokens,[ref]$taskErrors)
$taskCode=@($taskAst.FindAll({param($a)$a -is [Management.Automation.Language.StringConstantExpressionAst] -and $a.Value.Contains('public static class FreshShortcutTarget')},$true))
if($taskErrors.Count -ne 0 -or $taskCode.Count -ne 1){throw 'Exact oracle class required'}
Add-Type -TypeDefinition $taskCode[0].Value
$taskCases=@();$taskAll=$true
foreach($taskName in @('exact','com_normalization','same_bytes_copy','same_file_wrong_leaf','same_file_wrong_parent','empty','missing','raw_dot','unreadable','bound_write_denied','subst_to_physical','unapproved_alias','directory_reparse','embedded_nul')){
 $taskStage='CAPTURE_'+$taskName.ToUpperInvariant()
 $taskCaseRoot=Join-Path $Root ('target-'+$taskName+' 中文 with spaces')
 $taskExpected=Join-Path $taskCaseRoot 'app/program/K-SESSION.exe';$taskActual=$taskExpected
 if($taskName -ceq 'subst_to_physical'){$taskExpected=$taskMarker.aliases[0]+'\target-'+$taskName+' 中文 with spaces\app\program\K-SESSION.exe'}
 $taskCapture=[FreshShortcutTarget]::Capture($taskExpected,$LauncherSha256)
 if($taskCapture -cnotmatch '^[a-f0-9]{48}:[a-f0-9]{48}$'){throw 'Trusted baseline capture failed'}
 $taskIds=$taskCapture.Split(':');$taskWant=$taskName -in @('exact','com_normalization','bound_write_denied','subst_to_physical');$taskPin=$null
 switch -Exact ($taskName){
  'same_bytes_copy'{$taskActual=Join-Path $taskCaseRoot 'temp/K-SESSION.exe'}
  'same_file_wrong_leaf'{$taskActual=Join-Path $taskCaseRoot 'app/program/different.exe'}
  'same_file_wrong_parent'{$taskActual=Join-Path $taskCaseRoot 'other/K-SESSION.exe'}
  'empty'{$taskActual=''}
  'missing'{$taskActual=Join-Path $taskCaseRoot 'missing/K-SESSION.exe'}
  'raw_dot'{$taskActual=$taskCaseRoot+'\app\.\program\K-SESSION.exe'}
  'unreadable'{$taskPin=[IO.File]::Open($taskExpected,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)}
  'unapproved_alias'{$taskActual=$taskMarker.aliases[1]+'\target-'+$taskName+' 中文 with spaces\app\program\K-SESSION.exe'}
  'directory_reparse'{$taskActual=Join-Path $Root 'owned-junction/K-SESSION.exe'}
  'embedded_nul'{$taskActual=$taskExpected+[char]0+'ignored'}
 }
 $taskStage='MATCH_'+$taskName.ToUpperInvariant()
 try{$taskActualResult=[FreshShortcutTarget]::Matches($taskActual,$taskExpected,$LauncherSha256,$taskIds[0],$taskIds[1])}finally{if($taskPin){$taskPin.Dispose()}}
 $taskPass=$taskActualResult -eq $taskWant;$taskAll=$taskAll -and $taskPass
 $taskCases+=,@{case=$taskName;expected=$taskWant;actual=$taskActualResult;pass=$taskPass}
}
# A separate owned fixture captures before replacement; the Go callback retains
# this same baseline in RAM after complete F02 proof. It never recaptures per call.
$taskCounter=Join-Path $Root 'oracle-lifetime/program'
$taskStage='LIFETIME'
New-Item -ItemType Directory -Path $taskCounter|Out-Null
$taskExpected=Join-Path $taskCounter 'K-SESSION.exe'
[IO.File]::Copy((Join-Path $Root 'trusted-launcher.exe'),$taskExpected,$false)
$taskIds=([FreshShortcutTarget]::Capture($taskExpected,$LauncherSha256)).Split(':')
if($taskIds.Count -ne 2){throw 'Original baseline required'}
[IO.File]::Move($taskExpected,(Join-Path $taskCounter 'original-held.exe'))
[IO.File]::Copy((Join-Path $Root 'trusted-launcher.exe'),$taskExpected,$false)
$taskRejectNewId=-not [FreshShortcutTarget]::Matches($taskExpected,$taskExpected,$LauncherSha256,$taskIds[0],$taskIds[1])
$taskFreshIds=([FreshShortcutTarget]::Capture($taskExpected,$LauncherSha256)).Split(':')
$taskAcceptFresh=[FreshShortcutTarget]::Matches($taskExpected,$taskExpected,$LauncherSha256,$taskFreshIds[0],$taskFreshIds[1])
[IO.File]::WriteAllText($taskExpected,'owned modified fixture bytes')
$taskRejectChanged=-not [FreshShortcutTarget]::Matches($taskExpected,$taskExpected,$LauncherSha256,$taskFreshIds[0],$taskFreshIds[1])
$taskAll=$taskAll -and $taskRejectNewId -and $taskAcceptFresh -and $taskRejectChanged
. (Join-Path $PSScriptRoot '../memory-process.ps1')
$taskStage='ENTRY'
$taskExpected=Join-Path $Root 'case-baseline 中文 with spaces/app/program/K-SESSION.exe'
$taskEntryIds=([FreshShortcutTarget]::Capture($taskExpected,$LauncherSha256)).Split(':')
$taskRows=@();$taskShell=New-Object -ComObject WScript.Shell
$taskEntryRoot=Join-Path $Root 'oracle-entry';New-Item -ItemType Directory $taskEntryRoot|Out-Null
foreach($taskIndex in @(0,1,2)){
 $taskLinkPath=Join-Path $taskEntryRoot ('owned-'+$taskIndex+'.lnk');$taskLink=$taskShell.CreateShortcut($taskLinkPath)
 $taskLink.TargetPath=$taskExpected;$taskLink.Arguments='--owned-fixture';$taskLink.WorkingDirectory=Split-Path $taskExpected;$taskLink.Save()
 $taskRows+=,@{path=$taskLinkPath;target=$taskExpected;args='--owned-fixture';workdir=(Split-Path $taskExpected);fileId=$taskEntryIds[0];parentId=$taskEntryIds[1]}
}
$taskHelper=Join-Path $PSScriptRoot 'shortcut-target.ps1'
$taskPS5=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$taskPS7=(Get-Process -Id $PID).Path
$taskPS5Result=Invoke-KSessionMemoryProcess $taskPS5 @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-RowsJson',($taskRows|ConvertTo-Json -Compress),'-LauncherSha256',$LauncherSha256) 30
$taskPS7Result=Invoke-KSessionMemoryProcess $taskPS7 @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-RowsJson',($taskRows|ConvertTo-Json -Compress),'-LauncherSha256',$LauncherSha256) 30
$taskPS5Pass=$taskPS5Result.ExitCode -eq 0 -and !$taskPS5Result.TimedOut -and !$taskPS5Result.ForcedTermination -and $taskPS5Result.Stdout.Length -eq 0 -and $taskPS5Result.Stderr.Length -eq 0
$taskPS7Pass=$taskPS7Result.ExitCode -eq 0 -and !$taskPS7Result.TimedOut -and !$taskPS7Result.ForcedTermination -and $taskPS7Result.Stdout.Length -eq 0 -and $taskPS7Result.Stderr.Length -eq 0
$taskCaptureResult=Invoke-KSessionMemoryProcess $taskPS5 @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-Capture','-ExpectedLauncher',$taskExpected,'-LauncherSha256',$LauncherSha256) 30
$taskCapturePass=$taskCaptureResult.ExitCode -eq 0 -and !$taskCaptureResult.TimedOut -and !$taskCaptureResult.ForcedTermination -and $taskCaptureResult.Stdout -ceq ($taskEntryIds -join ':') -and $taskCaptureResult.Stderr.Length -eq 0
$taskRows[0].args='--wrong-owned-argument'
$taskArgsResult=Invoke-KSessionMemoryProcess $taskPS5 @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-RowsJson',($taskRows|ConvertTo-Json -Compress),'-LauncherSha256',$LauncherSha256) 30
$taskArgsRefused=$taskArgsResult.ExitCode -eq 1 -and !$taskArgsResult.TimedOut -and !$taskArgsResult.ForcedTermination -and $taskArgsResult.Stdout.Length -eq 0 -and $taskArgsResult.Stderr.Length -eq 0
$taskRows[0].args='--owned-fixture';$taskRows[0].workdir=$taskEntryRoot
$taskWorkdirResult=Invoke-KSessionMemoryProcess $taskPS5 @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-RowsJson',($taskRows|ConvertTo-Json -Compress),'-LauncherSha256',$LauncherSha256) 30
$taskWorkdirRefused=$taskWorkdirResult.ExitCode -eq 1 -and !$taskWorkdirResult.TimedOut -and !$taskWorkdirResult.ForcedTermination -and $taskWorkdirResult.Stdout.Length -eq 0 -and $taskWorkdirResult.Stderr.Length -eq 0
$taskRows[0].workdir=Split-Path $taskExpected
$taskRows[0].path=Join-Path $Root 'target-damaged_link_current_hash 中文 with spaces/startup/K-SESSION Fresh Trial.lnk'
$taskDamagedResult=Invoke-KSessionMemoryProcess $taskPS5 @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-RowsJson',($taskRows|ConvertTo-Json -Compress),'-LauncherSha256',$LauncherSha256) 30
$taskDamagedRefused=$taskDamagedResult.ExitCode -eq 1 -and !$taskDamagedResult.TimedOut -and !$taskDamagedResult.ForcedTermination -and $taskDamagedResult.Stdout.Length -eq 0 -and $taskDamagedResult.Stderr.Length -eq 0
$taskAll=$taskAll -and $taskPS5Pass -and $taskPS7Pass -and $taskCapturePass -and $taskArgsRefused -and $taskWorkdirRefused -and $taskDamagedRefused
$taskResult=@{schema=1;kind='SHORTCUT_ORACLE_MATRIX';allPassed=$taskAll;rejectOriginalIdReplacement=$taskRejectNewId;freshBaselineAccepted=$taskAcceptFresh;rejectChangedBytes=$taskRejectChanged;entryWindowsPS5=$taskPS5Pass;entryPS7=$taskPS7Pass;captureWindowsPS5=$taskCapturePass;argumentsRefused=$taskArgsRefused;workdirRefused=$taskWorkdirRefused;damagedRefused=$taskDamagedRefused;cases=$taskCases;rawOutputStored=$false}
[IO.File]::WriteAllText((Join-Path $Root 'oracle-matrix.json'),($taskResult|ConvertTo-Json -Depth 8 -Compress),[Text.UTF8Encoding]::new($false))
if(!$taskAll){exit 1}
