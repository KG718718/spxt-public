'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const DIR=__dirname, REPO=path.resolve(DIR,'../../../..');
function once(text,from,to){assert.equal(text.split(from).length-1,1,'single fixed source marker required');return text.replace(from,()=>to);}
function generate(out){
 assert.ok(path.isAbsolute(out)&&!fs.existsSync(out),'fresh absolute output required');fs.mkdirSync(out);
 const policy=fs.readFileSync(path.join(REPO,'tools/research/lan2-lc01/policy.go'),'utf8').replaceAll('\r\n','\n');
 const windows=fs.readFileSync(path.join(DIR,'second-launcher-windows.go.in'),'utf8').replaceAll('\r\n','\n');
 const hosted=fs.readFileSync(path.join(DIR,'lc01-hosted.go.in'),'utf8').replaceAll('\r\n','\n');
 fs.writeFileSync(path.join(out,'go.mod'),'module ksession/lc01-hosted\n\ngo 1.27.1\n',{flag:'wx'});
 fs.writeFileSync(path.join(out,'hosted_windows_test.go'),hosted+'\n'+policy.slice(policy.indexOf('const lcBusyText'))+'\n'+windows.slice(windows.indexOf('type lcPinned')),{flag:'wx'});
 let ps=fs.readFileSync(path.join(REPO,'tools/windows-installer/beta2-identity/invoke.ps1'),'utf8').replaceAll('\r\n','\n');
 ps=once(ps,'[Parameter(Mandatory=$true)][string]$TestedCommit','[Parameter(Mandatory=$true)][string]$LifecycleExe,\n  [Parameter(Mandatory=$true)][string]$TestedCommit');
 ps=ps.replaceAll('C:\\KSESSION-B45-BETA2-IDENTITY-WORK','C:\\KSESSION-LC01-HOSTED-WORK');
 ps=once(ps,"$taskAllowedPhases=@('STATIC_GATE'","$taskAllowedPhases=@('LC01_LIFECYCLE','STATIC_GATE'");
 ps=once(ps,"if($env:GITHUB_ACTIONS -ne 'true' -or", "if($env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public' -or $env:GITHUB_REF -ne 'refs/heads/codex/lan2-manual-host-v1.1' -or $env:GITHUB_ACTIONS -ne 'true' -or");
 // Reuse exact F3 metadata/download/install/collect/uninstall contracts; no forced PID cleanup.
 const start=ps.indexOf('function Stop-OwnedProcesses{'),end=ps.indexOf('\ntry{\n  $taskNode=',start);
 assert.ok(start>0&&end>start);
 ps=ps.slice(0,start)+`function Stop-OwnedProcesses{
  $allowed=@((Join-Path $taskInstall 'program\\K-SESSION.exe'),(Join-Path $taskInstall 'program\\runtime\\node.exe'))
  $owned=@(Get-CimInstance Win32_Process|Where-Object{$path=[string]$_.ExecutablePath;$path -and ($allowed|Where-Object{$_.Equals($path,[StringComparison]::OrdinalIgnoreCase)})})
  if($owned.Count-ne 0){throw 'OWNED_QUIESCENCE_UNPROVEN'}
}
`+ps.slice(end);
 ps=ps.replaceAll('-Wait -PassThru','-PassThru');
 ps=once(ps,'try{$process.ExitCode}finally{$process.Dispose()}',"try{if(!$process.WaitForExit(120000)){$process.Kill();[void]$process.WaitForExit(3000);throw 'SETUP_TIMEOUT'};$process.ExitCode}finally{$process.Dispose()}");
 ps=once(ps,'try{$uninstallExit=$process.ExitCode}finally{$process.Dispose()}',"try{if(!$process.WaitForExit(120000)){$process.Kill();[void]$process.WaitForExit(3000);throw 'UNINSTALL_TIMEOUT'};$uninstallExit=$process.ExitCode}finally{$process.Dispose()}");
 ps=once(ps,';$p.Dispose()}}catch{}',";if(!$p.WaitForExit(120000)){$p.Kill();[void]$p.WaitForExit(3000)};$p.Dispose()}}catch{}");
 const insertion=`  & $taskNode (Join-Path $RepositoryRoot 'tools/tests/windows-installer/beta4-upgrade/lc01-hosted-report.cjs') identity $taskDraft $taskInstall (Join-Path $OutputDirectory 'identity-fixed.json')
  if($LASTEXITCODE-ne 0){throw 'EXACT_F3_ANCHORS_FAILED'}
  Set-TaskPhase 'LC01_LIFECYCLE'
  $env:LC01_INSTALL=$taskInstall;$env:LC01_INSTANCE=$taskInstance
  $env:LC01_LIFECYCLE_REPORT=Join-Path $OutputDirectory 'lifecycle-fixed.json'
  $lcProcess=Start-Process -FilePath $LifecycleExe -ArgumentList @('-test.run=^TestHostedLC01$','-test.timeout=120s') -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskWork 'lifecycle.stdout') -RedirectStandardError (Join-Path $taskWork 'lifecycle.stderr')
  try{if(!$lcProcess.WaitForExit(150000)){$lcProcess.Kill();[void]$lcProcess.WaitForExit(3000);throw 'LIFECYCLE_TIMEOUT'};if($lcProcess.ExitCode-ne 0){throw 'LIFECYCLE_NOT_PROVEN'}}finally{$lcProcess.Dispose()}
  Stop-OwnedProcesses
`;
 ps=once(ps,"  Set-TaskPhase 'RETENTION_PROBE'",insertion+"  Set-TaskPhase 'RETENTION_PROBE'");
 // Identity module stage vocabulary stays unchanged; its run-report stage maps lifecycle failure to COLLECT.
 ps=once(ps,"if($Status -cnotin @('PASS','BLOCKED')", "if($taskPhase -eq 'LC01_LIFECYCLE'){$script:taskPhase='COLLECT'}\n  if($Status -cnotin @('PASS','BLOCKED')");
 fs.writeFileSync(path.join(out,'invoke-lc01.ps1'),ps,{flag:'wx'});
}
module.exports={generate,once};
if(require.main===module){assert.equal(process.argv.length,3);generate(path.resolve(process.argv[2]));}
