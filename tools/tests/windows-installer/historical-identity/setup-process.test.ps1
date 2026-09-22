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
    $node.Name -in @('Assert-SetupLaunchPath','Invoke-SetupTreeAndWait')
},$true))
if($functions.Count -ne 2){throw 'SETUP_WAIT_FUNCTION_MISSING'}
$functions | Sort-Object {$_.Extent.StartOffset} | ForEach-Object {Invoke-Expression $_.Extent.Text}

$temporary=Join-Path $PSScriptRoot ('.tmp-process-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($temporary)|Out-Null
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
  'SETUP PROCESS TEST PASS'
}finally{
  if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Recurse -Force}
}
