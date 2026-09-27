[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RepositoryRoot)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$invoke=Join-Path $RepositoryRoot 'tools\windows-installer\beta2-identity\invoke.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($invoke,[ref]$tokens,[ref]$errors)
if($errors.Count-ne 0){throw 'INVOKE_PARSE_FAILED'}
$functions=@($ast.FindAll({param($node)$node-is[Management.Automation.Language.FunctionDefinitionAst]-and
  $node.Name-in@('Assert-SafeAsciiPath','Invoke-SetupAndWait','Wait-UninstallerCleanup','Get-RemainingPayloadCount',
    'Get-LogicalSubkeyCount','Assert-UninstallContract')},$true))
if($functions.Count-ne 6){throw 'PROCESS_HELPER_MISSING'}
$functions|Sort-Object{$_.Extent.StartOffset}|ForEach-Object{Invoke-Expression $_.Extent.Text}
$observedPhase=$null
function Set-TaskPhase([string]$Phase){$script:observedPhase=$Phase}

function New-SafeHarnessTemporaryPath([string]$Root,[AllowNull()][string]$RunnerTemp){
  if($Root-cnotmatch '^[A-Za-z]:\\'){throw 'REPOSITORY_PATH_UNSAFE'}
  $repository=[IO.Path]::GetFullPath($Root)
  $parents=@()
  if(![string]::IsNullOrWhiteSpace($RunnerTemp)){
    try{$runner=[IO.Path]::GetFullPath($RunnerTemp)}catch{$runner=$null}
    if($runner -and $runner.Equals($RunnerTemp,[StringComparison]::Ordinal) -and
       $runner -cmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$' -and
       (Test-Path -LiteralPath $runner -PathType Container)){$parents+=,$runner.TrimEnd('\\')}
  }
  $drive=[IO.Path]::GetPathRoot($repository)
  if($drive -cnotmatch '^[A-Za-z]:\\$'){throw 'REPOSITORY_DRIVE_UNSAFE'}
  $parents+=,$drive
  foreach($parent in $parents){
    $candidate=[IO.Path]::GetFullPath((Join-Path $parent ('KSESSION-B45-ID-PROCESS-'+[Guid]::NewGuid().ToString('N'))))
    if($candidate -cmatch '^[A-Za-z]:\\[A-Za-z0-9._\\-]+$'){return $candidate}
  }
  throw 'TEMP_PATH_UNSAFE'
}

$unsafeEnvironmentRoots=@(
  @{value='C:\RUNNER~1\Temp';category='SHORT_NAME'},
  @{value='C:\unsafe path\Temp';category='SPACE'},
  @{value='C:\临时\Temp';category='NON_ASCII'}
)
foreach($unsafeRoot in $unsafeEnvironmentRoots){
  $selected=New-SafeHarnessTemporaryPath -Root $RepositoryRoot -RunnerTemp $unsafeRoot.value
  if($selected-cnotmatch '^[A-Za-z]:\\KSESSION-B45-ID-PROCESS-[a-f0-9]{32}$' -or
     $selected.StartsWith($unsafeRoot.value,[StringComparison]::OrdinalIgnoreCase)){
    throw ('TEMP_FALLBACK_'+$unsafeRoot.category)
  }
}
$workspaceFallback=New-SafeHarnessTemporaryPath -Root 'C:\工作 区\repository' -RunnerTemp 'C:\RUNNER~1\Temp'
if($workspaceFallback-cnotmatch '^C:\\KSESSION-B45-ID-PROCESS-[a-f0-9]{32}$'){
  throw 'TEMP_FALLBACK_WORKSPACE_UNICODE_SPACE'
}
$temporary=New-SafeHarnessTemporaryPath -Root $RepositoryRoot -RunnerTemp $env:RUNNER_TEMP
[IO.Directory]::CreateDirectory($temporary)|Out-Null
try{
  $source=Join-Path $temporary 'helper.cs';$helper=Join-Path $temporary 'helper.exe';$log=Join-Path $temporary 'setup.log'
  [IO.File]::WriteAllText($source,@'
using System;
using System.IO;
using System.Threading;
public static class Helper {
  public static int Main(string[] args) {
    if (args.Length == 2 && args[0] == "--delete") { Thread.Sleep(600); File.Delete(args[1]); return 0; }
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

  $taskInstall=Join-Path $temporary 'uninstall-fixture';$uninstallDir=Join-Path $taskInstall 'uninstall'
  [IO.Directory]::CreateDirectory($uninstallDir)|Out-Null
  $uninstaller=Join-Path $uninstallDir 'unins000.exe'
  [IO.File]::WriteAllText($uninstaller,'synthetic',[Text.UTF8Encoding]::new($false))
  $deleteProcess=Start-Process -FilePath $helper -ArgumentList @('--delete',$uninstaller) -PassThru -WindowStyle Hidden
  $taskUninstallSelfCleanupTimeoutMilliseconds=25000
  $stopwatch=[Diagnostics.Stopwatch]::StartNew();$removed=Wait-UninstallerCleanup $uninstaller;$stopwatch.Stop()
  $deleteProcess.WaitForExit();$deleteProcess.Dispose()
  if(!$removed -or $stopwatch.ElapsedMilliseconds-lt 500 -or (Test-Path -LiteralPath $uninstaller)){
    throw 'UNINSTALLER_SELF_CLEANUP_NOT_WAITED'
  }
  [IO.File]::WriteAllText($uninstaller,'synthetic',[Text.UTF8Encoding]::new($false))
  $taskUninstallSelfCleanupTimeoutMilliseconds=200
  if(Wait-UninstallerCleanup $uninstaller){throw 'UNINSTALLER_SELF_CLEANUP_TIMEOUT_NOT_ENFORCED'}
  Remove-Item -LiteralPath $uninstaller -Force

  $remainingOne=Join-Path $temporary 'remaining-one.bin';$remainingTwo=Join-Path $temporary 'remaining-two.bin'
  $paths=@($remainingOne,$remainingTwo,(Join-Path $temporary 'missing.bin'))
  if((Get-RemainingPayloadCount $paths)-ne 0){throw 'PAYLOAD_ZERO_COUNT_INVALID'}
  [IO.File]::WriteAllText($remainingOne,'synthetic',[Text.UTF8Encoding]::new($false))
  if((Get-RemainingPayloadCount $paths)-ne 1){throw 'PAYLOAD_ONE_COUNT_INVALID'}
  [IO.File]::WriteAllText($remainingTwo,'synthetic',[Text.UTF8Encoding]::new($false))
  if((Get-RemainingPayloadCount $paths)-ne 2){throw 'PAYLOAD_MULTIPLE_COUNT_INVALID'}
  Remove-Item -LiteralPath $remainingOne,$remainingTwo -Force

  if((Get-LogicalSubkeyCount @($false,$false))-ne 0 -or
     (Get-LogicalSubkeyCount @($true,$false))-ne 1 -or
     (Get-LogicalSubkeyCount @($false,$true))-ne 1 -or
     (Get-LogicalSubkeyCount @($true,$true))-ne 1){throw 'SHARED_REGISTRY_VIEW_COUNT_INVALID'}
  $retained=@{programAfter=$false;registrationAfter=0;desktopAfter=$false;programsAfter=$false;
    bindingAfter=1;instanceAfter=$true;probeAfter=$true}
  $script:observedPhase=$null;Assert-UninstallContract $retained
  if($null-ne$script:observedPhase -or $retained.programAfter -or $retained.registrationAfter-ne 0 -or
     !$retained.bindingAfter -or !$retained.instanceAfter -or !$retained.probeAfter){throw 'RETENTION_SUCCESS_STATE_INVALID'}
  foreach($failure in @(
    @{field='bindingAfter';value=0;phase='CLEANUP_BINDING_RETAINED'},
    @{field='instanceAfter';value=$false;phase='CLEANUP_INSTANCE_RETAINED'},
    @{field='probeAfter';value=$false;phase='CLEANUP_PROBE_RETAINED'})){
    $state=$retained.Clone();$state[$failure.field]=$failure.value;$script:observedPhase=$null
    try{Assert-UninstallContract $state;throw 'UNSAFE_RETENTION_ACCEPTED'}
    catch{if($_.Exception.Message-cne'UNINSTALL_CONTRACT_FAILED' -or $script:observedPhase-cne$failure.phase){throw}}
  }

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
  if($text-match '\)\.Count\s+-eq\s+0' -or
     !$text.Contains("Set-TaskPhase 'CLEANUP_READ_PAYLOAD_AFTER_HARNESS'") -or
     !$text.Contains('Get-RemainingPayloadCount @(') -or
     !$text.Contains("Set-TaskPhase 'UNINSTALL_SELF_CLEANUP_TIMEOUT'")){
    throw 'CLEANUP_PHASE_OR_COUNT_UNSAFE'
  }
  $finallyIndex=$text.LastIndexOf('}finally{')
  $mainCatch=[regex]::Match($text,'\}catch\{\r?\n  if\(\$taskAllowedPhases')
  $catchIndex=$mainCatch.Index
  if(!$mainCatch.Success -or $finallyIndex-le$catchIndex){throw 'FAILURE_FLOW_MISSING'}
  $catchText=$text.Substring($catchIndex,$finallyIndex-$catchIndex);$finallyText=$text.Substring($finallyIndex)
  if(!$catchText.Contains("Write-RunReport 'BLOCKED'") -or $finallyText.Contains('Write-RunReport') -or
     $finallyText.Contains('Set-TaskPhase')){throw 'PRIMARY_FAILURE_STAGE_CAN_BE_OVERWRITTEN'}
  'BETA2 IDENTITY PROCESS TEST PASS'
}finally{if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Recurse -Force}}
