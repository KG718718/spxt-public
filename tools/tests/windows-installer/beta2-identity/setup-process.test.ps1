[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RepositoryRoot)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$invoke=Join-Path $RepositoryRoot 'tools\windows-installer\beta2-identity\invoke.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($invoke,[ref]$tokens,[ref]$errors)
if($errors.Count-ne 0){throw 'INVOKE_PARSE_FAILED'}
$functions=@($ast.FindAll({param($node)$node-is[Management.Automation.Language.FunctionDefinitionAst]-and
  $node.Name-in@('Assert-SafeAsciiPath','Invoke-SetupAndWait')},$true))
if($functions.Count-ne 2){throw 'PROCESS_HELPER_MISSING'}
$functions|Sort-Object{$_.Extent.StartOffset}|ForEach-Object{Invoke-Expression $_.Extent.Text}

$temporary=Join-Path $env:TEMP ('KSESSION-B45-ID-PROCESS-'+[Guid]::NewGuid().ToString('N'))
if($temporary-cnotmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$'){throw 'TEMP_PATH_UNSAFE'}
[IO.Directory]::CreateDirectory($temporary)|Out-Null
try{
  $source=Join-Path $temporary 'helper.cs';$helper=Join-Path $temporary 'helper.exe';$log=Join-Path $temporary 'setup.log'
  [IO.File]::WriteAllText($source,@'
using System;
using System.IO;
public static class Helper {
  public static int Main(string[] args) {
    foreach (string arg in args) if (arg.StartsWith("/LOG=")) File.WriteAllLines(arg.Substring(5)+".args", args);
    return 7;
  }
}
'@,[Text.UTF8Encoding]::new($false))
  $compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  if(!(Test-Path -LiteralPath $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
  & $compiler '/nologo' '/target:exe' ('/out:'+$helper) $source|Out-Null
  if($LASTEXITCODE-ne 0){throw 'HELPER_BUILD_FAILED'}
  $exit=Invoke-SetupAndWait -FileName $helper -InstallRoot (Join-Path $temporary 'installed') `
    -Instance (Join-Path $temporary 'instance') -Log $log -StandardOutput (Join-Path $temporary 'stdout') `
    -StandardError (Join-Path $temporary 'stderr')
  if($exit-ne 7){throw 'NATIVE_EXIT_NOT_PROPAGATED'}
  $args=[IO.File]::ReadAllLines($log+'.args')
  if($args.Count-ne 8 -or $args[0]-cne'/VERYSILENT' -or $args[7]-cne('/LOG='+$log)){throw 'SETUP_ARGS_CHANGED'}
  try{Invoke-SetupAndWait -FileName $helper -InstallRoot (Join-Path $temporary 'unsafe path') `
    -Instance (Join-Path $temporary 'instance') -Log $log -StandardOutput (Join-Path $temporary 'stdout') `
    -StandardError (Join-Path $temporary 'stderr')|Out-Null;throw 'UNSAFE_PATH_ACCEPTED'}
  catch{if($_.Exception.Message-cne'PATH_UNSAFE'){throw}}
  $text=Get-Content -LiteralPath $invoke -Raw
  if(!$text.Contains("Set-TaskPhase 'INSTALL'") -or
     !$text.Contains("if(`$setupExit-ne 0){throw 'SETUP_FAILED'}") -or
     !$text.Contains("Write-RunReport 'BLOCKED'") -or !$text.Contains('exit 1')){
    throw 'FIXED_INSTALL_FAILURE_REPORT_MISSING'
  }
  if($text-match '(?i)taskkill|Stop-Process\s+-Name' -or
     !$text.Contains("Set-TaskPhase 'OWNED_PROCESS_QUIESCE';Stop-OwnedProcesses") -or
     !$text.Contains("Join-Path `$taskInstall 'program\K-SESSION.exe'") -or
     !$text.Contains("Join-Path `$taskInstall 'program\runtime\node.exe'")){
    throw 'OWNED_PROCESS_SCOPE_INVALID'
  }
  $clear=$text.LastIndexOf('  Clear-ChildAuthenticationEnvironment')
  $install=$text.LastIndexOf("Set-TaskPhase 'INSTALL'")
  if($clear-lt 0 -or $install-lt 0 -or $clear-gt $install -or
     !$text.Contains("'GITHUB_TOKEN','GH_TOKEN','GITHUB_PAT','ACTIONS_RUNTIME_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','SYSTEM_ACCESSTOKEN'")){
    throw 'CHILD_AUTH_ENV_NOT_CLEARED'
  }
  'BETA2 IDENTITY PROCESS TEST PASS'
}finally{if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Recurse -Force}}
