param([Parameter(Mandatory=$true)][string]$Root,[Parameter(Mandatory=$true)][string]$TrustedLauncher)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
trap { [Console]::Error.WriteLine('FC3_F06_FIXTURE_FAILED'); exit 1 }
. (Join-Path $PSScriptRoot '../memory-process.ps1')
. (Join-Path $PSScriptRoot '../../lan-host/node-test-environment.ps1')
. (Join-Path $PSScriptRoot '../../../windows-firewall/test-environment.ps1')
. (Join-Path $PSScriptRoot '../supervisor-entry.ps1')
Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE 5
if($Root -cnotmatch '^E:\\CodexWorkspace\\outputs\\fresh-fc3-f06-[a-f0-9]{32}$' -or (Test-Path $Root) -or (Get-KSessionFirewallTestPathClass (Split-Path $Root)) -cne 'CANONICAL'){throw 'New owned physical root required'}
$taskSha='29ca62abf304f022e4ba637c9f2abf8167f695a46f5b77c3bb1cf0f2bfef8eb9'
if((Get-FileHash $TrustedLauncher -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskSha){throw 'Reviewed 04dd Launcher bytes required'}
$taskTokens=$null;$taskErrors=$null
$taskAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../install-r2/link-driver.ps1'),[ref]$taskTokens,[ref]$taskErrors)
foreach($taskName in @('Read-DriverWorld','Read-DriverRegistryTree')){$taskFunctions=@($taskAst.FindAll({param($n)$n -is [Management.Automation.Language.FunctionDefinitionAst]},$true)|Where-Object Name -CEQ $taskName);if($taskFunctions.Count -ne 1){throw 'Read-only observer required'};. ([scriptblock]::Create($taskFunctions[0].Extent.Text))}
$taskWorld=Read-DriverWorld;$taskEnv=Save-KSessionProcessEnvironment @('TEMP','TMP');$taskMapped=@();$taskAliases=@();$taskResult=@{schema=1;kind='FC3_F06_ORIGINAL_BASELINE';status='FAIL';baselineCapturedOnceForVerification=$true;worldUnchanged=$null;environmentRestored=$false;mappingRestored=$false;productInstalled=$false;productExecuted=$false;rawOutputStored=$false;cases=@()}
New-Item -ItemType Directory $Root|Out-Null
[IO.File]::WriteAllText((Join-Path $Root '.owned-fc3-f06.json'),'{"kind":"FC3_F06_OWNED"}')
try{
 New-Item -ItemType Directory (Join-Path $Root 'temp'),(Join-Path $Root 'app/program'),(Join-Path $Root 'links'),(Join-Path $Root 'instance 中文 with spaces'),(Join-Path $Root 'other')|Out-Null
 $env:TEMP=Join-Path $Root 'temp';$env:TMP=$env:TEMP
 Add-Type -TypeDefinition 'using System;using System.Text;using System.Runtime.InteropServices;public static class Fc3F06Mapping{[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]public static extern uint QueryDosDevice(string n,StringBuilder b,int s);}'
 foreach($taskDrive in @('R:','S:','T:','U:','V:','W:','X:','Y:','Z:')){$taskBuffer=[Text.StringBuilder]::new(32768);$taskCount=[Fc3F06Mapping]::QueryDosDevice($taskDrive,$taskBuffer,$taskBuffer.Capacity);$taskError=[Runtime.InteropServices.Marshal]::GetLastWin32Error();if($taskCount -eq 0 -and $taskError -eq 2 -and !(Test-Path ($taskDrive+'\'))){$taskAliases+=,$taskDrive;if($taskAliases.Count -eq 2){break}}}
 if($taskAliases.Count -ne 2){throw 'Two absent controlled mappings required'}
 foreach($taskDrive in $taskAliases){$taskMap=Invoke-KSessionMemoryProcess (Join-Path $env:SystemRoot 'System32/subst.exe') @($taskDrive,$Root) 10;if($taskMap.ExitCode -ne 0 -or $taskMap.ForcedTermination){throw 'Mapping creation failed'};$taskMapped+=,$taskDrive;$taskBuffer=[Text.StringBuilder]::new(32768);if([Fc3F06Mapping]::QueryDosDevice($taskDrive,$taskBuffer,$taskBuffer.Capacity) -eq 0 -or $taskBuffer.ToString() -cne ('\??\'+$Root)){throw 'Unknown mapping'}}
 $taskPhysical=Join-Path $Root 'app/program/K-SESSION.exe';[IO.File]::Copy($TrustedLauncher,$taskPhysical,$false)
 $taskExpected=$taskAliases[0]+'\app\program\K-SESSION.exe';$taskWorkdir=$taskAliases[0]+'\app\program';$taskInstance=Join-Path $Root 'instance 中文 with spaces'
 $taskHelper=Join-Path $PSScriptRoot '../install-r2/shortcut-target.ps1'
 $taskAst=[Management.Automation.Language.Parser]::ParseFile($taskHelper,[ref]$taskTokens,[ref]$taskErrors)
 $taskClass=@($taskAst.FindAll({param($n)$n -is [Management.Automation.Language.StringConstantExpressionAst] -and $n.Value.Contains('public static class FreshShortcutTarget')},$true));if($taskClass.Count -ne 1){throw 'Exact reviewed helper required'};Add-Type -TypeDefinition $taskClass[0].Value
 # This is the only baseline supplied to every verification, including after
 # replacement. Later observation of a different ID never becomes authority.
 $taskOriginal=([FreshShortcutTarget]::Capture($taskExpected,$taskSha)).Split(':');if($taskOriginal.Count -ne 2){throw 'Original baseline missing'}
 $taskRows=@();$taskShell=New-Object -ComObject WScript.Shell
 foreach($taskIndex in @(0,1,2)){$taskPath=Join-Path $Root ('links/owned-'+$taskIndex+'.lnk');$taskArgs='--instance "'+$taskInstance+'"';if($taskIndex -eq 2){$taskArgs='--logon '+$taskArgs};$taskLink=$taskShell.CreateShortcut($taskPath);$taskLink.TargetPath=$taskPhysical;$taskLink.Arguments=$taskArgs;$taskLink.WorkingDirectory=$taskWorkdir;$taskLink.Save();$taskRows+=,@{path=$taskPath;target=$taskExpected;args=$taskArgs;workdir=$taskWorkdir;fileId=$taskOriginal[0];parentId=$taskOriginal[1]}}
 $taskPS5=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe';$taskPS7=(Get-Process -Id $PID).Path
 function Invoke-F06Case([string]$Name,[bool]$Want,[string]$PS=$taskPS5,[bool]$Precondition=$true){$taskRun=Invoke-KSessionMemoryProcess $PS @('-NoLogo','-NoProfile','-NonInteractive','-File',$taskHelper,'-RowsJson',($taskRows|ConvertTo-Json -Compress),'-LauncherSha256',$taskSha) 30;$taskPass=$Precondition -and $taskRun.ExitCode -eq $(if($Want){0}else{1}) -and !$taskRun.TimedOut -and !$taskRun.ForcedTermination -and $taskRun.Stdout.Length -eq 0 -and $taskRun.Stderr.Length -eq 0;$taskResult.cases+=,@{case=$Name;expected=$Want;preconditionProven=$Precondition;pass=$taskPass};if(!$taskPass){throw 'Exact F06 counter failed'}}
 Invoke-F06Case 'subst_expected_physical_target_ps5' $true
 Invoke-F06Case 'subst_expected_physical_target_ps7' $true $taskPS7
 $taskLink=$taskShell.CreateShortcut($taskRows[0].path);$taskCopy=Join-Path $Root 'other/K-SESSION.exe';[IO.File]::Copy($taskPhysical,$taskCopy,$false);$taskLink.TargetPath=$taskCopy;$taskLink.Save();Invoke-F06Case 'same_bytes_different_object' $false
 $taskLink.TargetPath=$taskAliases[1]+'\app\program\K-SESSION.exe';$taskLink.Save();$taskProbe=$taskShell.CreateShortcut($taskRows[0].path);Invoke-F06Case 'unapproved_alias_same_object' $false $taskPS5 ([IO.Path]::GetPathRoot([string]$taskProbe.TargetPath) -ieq ($taskAliases[1]+'\'))
 $taskLink.TargetPath=$taskPhysical;$taskLink.Arguments='--wrong-owned-argument';$taskLink.Save();Invoke-F06Case 'arguments_mismatch' $false
 $taskLink.Arguments=$taskRows[0].args;$taskLink.WorkingDirectory=Join-Path $Root 'other';$taskLink.Save();Invoke-F06Case 'workdir_mismatch' $false
 $taskLink.WorkingDirectory=$taskWorkdir;$taskLink.Save()
 [IO.File]::Move($taskPhysical,(Join-Path $Root 'app/program/original-held.exe'));[IO.File]::Copy($TrustedLauncher,$taskPhysical,$false)
 $taskObserved=([FreshShortcutTarget]::Capture($taskExpected,$taskSha)).Split(':')
 Invoke-F06Case 'same_bytes_replacement_original_baseline' $false $taskPS5 ($taskObserved.Count -eq 2 -and $taskObserved[0] -cne $taskOriginal[0] -and (Get-FileHash $taskPhysical -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $taskSha)
 $taskResult.status='PASS'
}finally{
 $taskResult.mappingRestored=$true
 foreach($taskDrive in $taskMapped){try{$taskBuffer=[Text.StringBuilder]::new(32768);if([Fc3F06Mapping]::QueryDosDevice($taskDrive,$taskBuffer,$taskBuffer.Capacity) -eq 0 -or $taskBuffer.ToString() -cne ('\??\'+$Root)){throw 'Unknown mapping refused'};$taskUnmap=Invoke-KSessionMemoryProcess (Join-Path $env:SystemRoot 'System32/subst.exe') @($taskDrive,'/D') 10;$taskBuffer=[Text.StringBuilder]::new(32768);$taskCount=[Fc3F06Mapping]::QueryDosDevice($taskDrive,$taskBuffer,$taskBuffer.Capacity);$taskError=[Runtime.InteropServices.Marshal]::GetLastWin32Error();if($taskUnmap.ExitCode -ne 0 -or $taskUnmap.ForcedTermination -or $taskCount -ne 0 -or $taskError -ne 2 -or (Test-Path ($taskDrive+'\'))){throw 'Mapping recovery unknown'}}catch{$taskResult.mappingRestored=$false}}
 try{$taskResult.worldUnchanged=(Read-DriverWorld) -ceq $taskWorld}catch{$taskResult.worldUnchanged=$null}
 Restore-KSessionProcessEnvironment $taskEnv;$taskResult.environmentRestored=Test-KSessionProcessEnvironmentRestored $taskEnv
 if(!$taskResult.mappingRestored -or $taskResult.worldUnchanged -ne $true -or !$taskResult.environmentRestored){$taskResult.status='FAIL'}
 [IO.File]::WriteAllText((Join-Path $Root 'result.json'),($taskResult|ConvertTo-Json -Depth 8 -Compress),[Text.UTF8Encoding]::new($false))
}
if($taskResult.status -cne 'PASS'){exit 1}
