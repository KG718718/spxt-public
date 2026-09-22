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
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-SetupAndWait'
},$true))
if($functions.Count -ne 1){throw 'SETUP_WAIT_FUNCTION_MISSING'}
Invoke-Expression $functions[0].Extent.Text

$temporary=Join-Path $PSScriptRoot ('.tmp-process-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($temporary)|Out-Null
try{
  $helper=Join-Path $temporary 'gui-helper.exe'
  $sourceFile=Join-Path $temporary 'gui-helper.cs'
  $marker=Join-Path $temporary 'completed.txt'
  $source=@'
using System;
using System.IO;
using System.Threading;
public static class GuiHelper {
  [STAThread]
  public static int Main(string[] args) {
    Thread.Sleep(600);
    File.WriteAllText(args[0], String.Join("\n", args));
    return Int32.Parse(args[1]);
  }
}
'@
  [IO.File]::WriteAllText($sourceFile,$source,[Text.UTF8Encoding]::new($false))
  $compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  if(!(Test-Path -LiteralPath $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
  if(!(Test-Path -LiteralPath $compiler)){throw 'CSHARP_COMPILER_MISSING'}
  & $compiler '/nologo' '/target:winexe' ('/out:'+$helper) $sourceFile | Out-Null
  if($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $helper)){throw 'GUI_HELPER_BUILD_FAILED'}
  $arguments=@($marker,'7','value with spaces','quote"value')
  $stopwatch=[Diagnostics.Stopwatch]::StartNew()
  $exitCode=Invoke-SetupAndWait -FileName $helper -Arguments $arguments
  $stopwatch.Stop()
  if($exitCode -ne 7){throw 'EXIT_CODE_NOT_PROPAGATED'}
  if($stopwatch.ElapsedMilliseconds -lt 500 -or !(Test-Path -LiteralPath $marker)){throw 'PROCESS_NOT_WAITED'}
  $received=[IO.File]::ReadAllText($marker).Split("`n")
  if($received.Count -ne $arguments.Count){throw 'ARGUMENT_COUNT_CHANGED'}
  for($index=0;$index-lt$arguments.Count;$index++){
    if($received[$index] -cne $arguments[$index]){throw 'ARGUMENT_CHANGED'}
  }
  'SETUP PROCESS TEST PASS'
}finally{
  if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Recurse -Force}
}
