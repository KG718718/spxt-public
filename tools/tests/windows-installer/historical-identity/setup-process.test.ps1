[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RepositoryRoot)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$invokeScript=Join-Path $RepositoryRoot 'tools\windows-installer\historical-identity\invoke.ps1'
$tokens=$null
$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($invokeScript,[ref]$tokens,[ref]$errors)
if($errors.Count -ne 0){throw 'INVOKE_PARSE_FAILED'}
$functions=@($ast.FindAll({param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -in @('Assert-SetupLaunchPath','Invoke-SetupTreeAndWait','Wait-UninstallerSelfCleanup','Get-RemainingPayloadCount')
},$true))
if($functions.Count -ne 4){throw 'PROCESS_HELPER_FUNCTION_MISSING'}
$functions | Sort-Object {$_.Extent.StartOffset} | ForEach-Object {Invoke-Expression $_.Extent.Text}
$observedPhase=$null
function Set-TaskPhase([string]$Phase) {$script:observedPhase=$Phase}

$temporary=$null
$candidates=@($env:RUNNER_TEMP,$env:TEMP,$env:TMP,[IO.Path]::GetTempPath()) |
  Where-Object{![string]::IsNullOrWhiteSpace($_)} | Select-Object -Unique
foreach($candidate in $candidates){
  $attempt=$null
  try{
    $root=[IO.Path]::GetFullPath($candidate).TrimEnd('\')
    if($root -cnotmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$' -or !(Test-Path -LiteralPath $root -PathType Container)){continue}
    $attempt=Join-Path $root ('KSESSION-B4-T1A-PROCESS-'+[Guid]::NewGuid().ToString('N'))
    if($attempt -cnotmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$'){continue}
    [IO.Directory]::CreateDirectory($attempt)|Out-Null
    $probe=Join-Path $attempt 'write.probe'
    [IO.File]::WriteAllText($probe,'synthetic',[Text.UTF8Encoding]::new($false))
    Remove-Item -LiteralPath $probe -Force
    $temporary=$attempt
    break
  }catch{
    if($attempt -and (Test-Path -LiteralPath $attempt)){Remove-Item -LiteralPath $attempt -Recurse -Force -ErrorAction SilentlyContinue}
  }
}
if(!$temporary){throw 'SAFE_WRITABLE_TEMP_UNAVAILABLE'}
try{
  $helper=Join-Path $temporary 'gui-helper.exe'
  $sourceFile=Join-Path $temporary 'gui-helper.cs'
  $marker=Join-Path $temporary 'completed.txt'
  $source=@'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
public static class GuiHelper {
  [STAThread]
  public static int Main(string[] args) {
    if (args.Length == 2 && args[0] == "--delete") {
      Thread.Sleep(600);
      File.Delete(args[1]);
      return 0;
    }
    if (args.Length == 2 && args[0] == "--child") {
      Thread.Sleep(600);
      File.WriteAllText(args[1], "CHILD_COMPLETED");
      return 0;
    }
    string log = null;
    foreach (string arg in args) if (arg.StartsWith("/LOG=")) log = arg.Substring(5);
    if (log == null) return 9;
    File.WriteAllText(log + ".args", String.Join("\n", args));
    Process.Start(new ProcessStartInfo {
      FileName = Assembly.GetExecutingAssembly().Location,
      Arguments = "--child " + log,
      UseShellExecute = false,
      CreateNoWindow = true
    });
    return 7;
  }
}
'@
  [IO.File]::WriteAllText($sourceFile,$source,[Text.UTF8Encoding]::new($false))
  $compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  if(!(Test-Path -LiteralPath $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
  if(!(Test-Path -LiteralPath $compiler)){throw 'CSHARP_COMPILER_MISSING'}
  & $compiler '/nologo' '/target:winexe' ('/out:'+$helper) $sourceFile | Out-Null
  if($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $helper)){throw 'GUI_HELPER_BUILD_FAILED'}
  $installRoot=Join-Path $temporary 'installed'
  $instance=Join-Path $temporary 'instance'
  $stdout=Join-Path $temporary 'setup.stdout'
  $stderr=Join-Path $temporary 'setup.stderr'
  $stopwatch=[Diagnostics.Stopwatch]::StartNew()
  $exitCode=Invoke-SetupTreeAndWait -FileName $helper -InstallRoot $installRoot -Instance $instance `
    -Log $marker -StandardOutput $stdout -StandardError $stderr
  $stopwatch.Stop()
  if($exitCode -ne 7){throw 'EXIT_CODE_NOT_PROPAGATED'}
  if($stopwatch.ElapsedMilliseconds -lt 500 -or !(Test-Path -LiteralPath $marker)){throw 'PROCESS_NOT_WAITED'}
  $expected=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',('/DIR='+$installRoot),
    ('/INSTANCE='+$instance),'/CONFIRMDATACHANGE=1',('/LOG='+$marker))
  $received=[IO.File]::ReadAllText($marker+'.args').Split("`n")
  if($received.Count -ne $expected.Count){throw 'ARGUMENT_COUNT_CHANGED'}
  for($index=0;$index-lt$expected.Count;$index++){
    if($received[$index] -cne $expected[$index]){throw 'ARGUMENT_CHANGED'}
  }
  foreach($suffix in @(' unsafe','"quoted','&command')){
    try{
      Invoke-SetupTreeAndWait -FileName $helper -InstallRoot $installRoot -Instance ($instance+$suffix) `
        -Log $marker -StandardOutput $stdout -StandardError $stderr | Out-Null
      throw 'UNSAFE_PATH_ACCEPTED'
    }catch{if($_.Exception.Message -ne 'SETUP_PATH_UNSAFE'){throw}}
  }
  $taskInstall=Join-Path $temporary 'uninstall-fixture'
  $uninstallDir=Join-Path $taskInstall 'uninstall'
  [IO.Directory]::CreateDirectory($uninstallDir)|Out-Null
  $uninstaller=Join-Path $uninstallDir 'unins000.exe'
  [IO.File]::WriteAllText($uninstaller,'synthetic',[Text.UTF8Encoding]::new($false))
  $deleteProcess=Start-Process -FilePath $helper -ArgumentList @('--delete',$uninstaller) -WindowStyle Hidden -PassThru
  $taskUninstallSelfCleanupTimeoutMilliseconds=25000
  $stopwatch.Restart()
  $removed=Wait-UninstallerSelfCleanup $uninstaller
  $stopwatch.Stop()
  $deleteProcess.WaitForExit()
  if(!$removed -or $stopwatch.ElapsedMilliseconds -lt 500 -or (Test-Path -LiteralPath $uninstaller)){
    throw 'UNINSTALLER_SELF_CLEANUP_NOT_WAITED'
  }
  [IO.File]::WriteAllText($uninstaller,'synthetic',[Text.UTF8Encoding]::new($false))
  $taskUninstallSelfCleanupTimeoutMilliseconds=200
  if(Wait-UninstallerSelfCleanup $uninstaller){throw 'UNINSTALLER_SELF_CLEANUP_TIMEOUT_NOT_ENFORCED'}
  Remove-Item -LiteralPath $uninstaller -Force
  $remainingOne=Join-Path $temporary 'remaining-one.bin'
  $remainingTwo=Join-Path $temporary 'remaining-two.bin'
  $missingOne=Join-Path $temporary 'missing-one.bin'
  $missingTwo=Join-Path $temporary 'missing-two.bin'
  $payloadPaths=@($remainingOne,$remainingTwo,$missingOne,$missingTwo)
  $evaluatePayloads={param([int]$Expected)
    $script:observedPhase=$null
    $count=Get-RemainingPayloadCount $payloadPaths
    $payloadRemoved=$count -eq 0
    if(!$payloadRemoved){Set-TaskPhase 'CLEANUP_PAYLOAD_REMOVE'}
    if($count -ne $Expected){throw 'PAYLOAD_REMAINING_COUNT_INCORRECT'}
    if(($Expected -eq 0 -and (!$payloadRemoved -or $null-ne$script:observedPhase)) -or
       ($Expected -gt 0 -and ($payloadRemoved -or $script:observedPhase -ne 'CLEANUP_PAYLOAD_REMOVE'))){
      throw 'PAYLOAD_REMAINING_PHASE_INCORRECT'
    }
  }
  & $evaluatePayloads 0
  [IO.File]::WriteAllText($remainingOne,'synthetic',[Text.UTF8Encoding]::new($false))
  & $evaluatePayloads 1
  [IO.File]::WriteAllText($remainingTwo,'synthetic',[Text.UTF8Encoding]::new($false))
  & $evaluatePayloads 2
  Remove-Item -LiteralPath $remainingOne -Force
  Remove-Item -LiteralPath $remainingTwo -Force
  'SETUP PROCESS TEST PASS'
}finally{
  if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Recurse -Force}
}
