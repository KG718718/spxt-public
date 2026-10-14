'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {runInstalledBrowser}=require('./installed-browser.cjs');
async function main(){
 assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.GITHUB_REPOSITORY,'KG718718/spxt-public');
 const [root,sourceCommit,origin,nodePid,launcherPid,privateFile,reportFile,phase]=process.argv.slice(2);
 assert.equal(process.argv.slice(2).length,8);assert.match(sourceCommit,/^[a-f0-9]{40}$/);assert.equal(sourceCommit,process.env.KSESSION_FRESH_TESTED_SOURCE);
 for(const p of [nodePid,launcherPid])assert.match(p,/^[1-9][0-9]*$/);
 assert.ok(['FIRST','RESTART'].includes(phase));assert.equal(fs.existsSync(reportFile),false);
 const {chromium}=require('playwright-core');
 const credentials=phase==='RESTART'?JSON.parse(fs.readFileSync(privateFile)):undefined;
 async function verifyOwnedListener(program,endpoint){
  const port=Number(new URL(endpoint).port);
  // No tokens, paths or IDs from this private query enter the fixed report.
  const script=`$ErrorActionPreference='Stop';$n=Get-CimInstance Win32_Process -Filter 'ProcessId=${nodePid}';$l=Get-CimInstance Win32_Process -Filter 'ProcessId=${launcherPid}';$all=@(Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='K-SESSION.exe'" -ErrorAction Stop);$nc=@($all|Where-Object{$_.ExecutablePath -ieq $n.ExecutablePath});$lc=@($all|Where-Object{$_.ExecutablePath -ieq $l.ExecutablePath});$s=@(Get-NetTCPConnection -State Listen -OwningProcess ${nodePid} -ErrorAction Stop);@{node=$n.ExecutablePath;launcher=$l.ExecutablePath;parent=$n.ParentProcessId;nodeCount=$nc.Count;launcherCount=$lc.Count;sockets=@($s|ForEach-Object{@{address=$_.LocalAddress;port=$_.LocalPort}})}|ConvertTo-Json -Depth 4 -Compress`;
  const observation=require('./shell-protocol.cjs').json(script);assert.equal(path.resolve(observation.node).toLowerCase(),path.join(program,'runtime/node.exe').toLowerCase());assert.equal(path.resolve(observation.launcher).toLowerCase(),path.join(program,'K-SESSION.exe').toLowerCase());assert.equal(observation.parent,Number(launcherPid));assert.equal(observation.nodeCount,1);assert.equal(observation.launcherCount,1);assert.ok(Array.isArray(observation.sockets));assert.equal(observation.sockets.length,1);assert.deepEqual(observation.sockets[0],{address:'127.0.0.1',port});
 }
 const result=await runInstalledBrowser({installRoot:root,sourceCommit,origin,chromium,verifyOwnedListener,restarted:phase==='RESTART',credentials});
 if(phase==='FIRST')fs.writeFileSync(privateFile,JSON.stringify(result.credentials),{flag:'wx',mode:0o600});
 fs.writeFileSync(reportFile,JSON.stringify({schema:1,sourceCommit,phase,status:'PASS',method:'INSTALLED_PAYLOAD_BROWSER',witnesses:result.witnesses,browserClosed:true})+'\n',{flag:'wx'});
}
main().catch(()=>{process.stderr.write('FRESH_TRIAL_BROWSER_FAILED\n');process.exitCode=1;});
