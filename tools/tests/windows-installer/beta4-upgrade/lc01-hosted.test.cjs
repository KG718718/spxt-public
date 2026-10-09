'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {generate,once}=require('./prepare-lc01-hosted.cjs');
const report=require('./lc01-hosted-report.cjs');
const repo=path.resolve(__dirname,'../../../..');
const out=fs.mkdtempSync(path.join(repo,'.test-work/lc01-hosted-tests-'));
const generated=path.join(out,'generated');generate(generated);
const go=fs.readFileSync(path.join(generated,'hosted_windows_test.go'),'utf8');
const ps=fs.readFileSync(path.join(generated,'invoke-lc01.ps1'),'utf8');
test('literal replacement preserves dollar quote and anchored test regex',()=>assert.equal(once('xMARKx','MARK',"$' $& -test.run=^TestHostedLC01$'"),"x$' $& -test.run=^TestHostedLC01$'x"));
test('standalone compile package embeds reviewed policy verbatim, no production main',()=>{
 const policy=fs.readFileSync(path.join(repo,'tools/research/lan2-lc01/policy.go'),'utf8').replaceAll('\r\n','\n');
 assert.ok(go.includes(policy.slice(policy.indexOf('const lcBusyText'))));
 assert.equal((go.match(/func TestHostedLC01\(/g)||[]).length,1);assert.equal(go.includes('func main()'),false);
 const adapter=fs.readFileSync(path.join(__dirname,'second-launcher-windows.go.in'),'utf8').replaceAll('\r\n','\n');
 assert.ok(go.includes(adapter.slice(adapter.indexOf('type lcPinned'))));
 assert.equal(/20\s*\*\s*time.Second/.test(go),false);assert.ok(go.includes('const lcSecondBudget = 30 * time.Second'));
 assert.equal((go.match(/w.Now\(\) >= lcSecondBudget/g)||[]).length,5);
});
test('reused F3 identity install source has one lifecycle injection and no PID force',()=>{
 for(const s of ['actions/artifacts/10907910968/zip','actions/runs/36246132535','Clear-ChildAuthenticationEnvironment','EXACT_F3_ANCHORS_FAILED','Wait-UninstallerCleanup'])assert.ok(ps.includes(s));
 assert.equal(ps.includes('Stop-Process'),false);assert.equal(ps.includes('-Wait -PassThru'),false);
 assert.ok(ps.indexOf("Invoke-Node @('collect'")<ps.indexOf("Set-TaskPhase 'LC01_LIFECYCLE'"));
 assert.ok(ps.indexOf("Set-TaskPhase 'LC01_LIFECYCLE'")<ps.indexOf("Set-TaskPhase 'RETENTION_PROBE'"));
 assert.ok(ps.includes("'-test.run=^TestHostedLC01$'"));
 assert.equal(ps.includes('beta.4'),false);assert.equal(ps.includes('Disable-NetAdapter'),false);
});
test('upload is exactly one validated JSON, push requires trigger path/marker and first attempt',()=>{
 const workflow=fs.readFileSync(path.join(repo,'.github/workflows/lc01-hosted.yml'),'utf8');
 assert.ok(workflow.includes('HOSTED-TRIGGER.json'));assert.ok(workflow.includes("contains(github.event.head_commit.message, '[lc01-hosted]')"));assert.ok(workflow.includes('github.run_attempt == 1'));
 assert.equal((workflow.match(/path: \$\{\{ runner.temp \}\}\/lc01-evidence\/LC01-HOSTED-REPORT.json/g)||[]).length,1);
 assert.equal(workflow.includes('workflow_dispatch'),false);
 const uses=[...workflow.matchAll(/uses: ([^\s]+)/g)].map(m=>m[1]);assert.equal(uses.length,3);
 for(const value of uses)assert.match(value,/^actions\/[a-z-]+@[a-f0-9]{40}$/);
 for(const name of fs.readdirSync(path.join(repo,'.github/workflows')).filter(n=>n.endsWith('.yml')&&n!=='lc01-hosted.yml')){
  const text=fs.readFileSync(path.join(repo,'.github/workflows',name),'utf8');
  const push=text.match(/\n  push:\r?\n([\s\S]*?)(?=\n(?:  [a-z_]+:|[a-z]+:))/)?.[1];
  if(push?.includes('codex/lan2-manual-host-v1.1'))checkApprovedOtherPush(name,text);
 }
 assert.ok(workflow.includes("!contains(github.event.head_commit.message, '[lan2-candidate]')"));
 assert.ok(workflow.includes("!contains(github.event.head_commit.message, '[lan2-final-qa]')"));
 const fixture="\n  push:\n    branches: [codex/lan2-manual-host-v1.1]\n    paths:\n      - docs/tasks/windows-installer-v1.1/batch-lan-2/LAN2-FINAL-TRIGGER.md\npermissions:\njobs:\n  approved-once:\n    if: contains(github.event.head_commit.message, '[lan2-candidate]') || contains(github.event.head_commit.message, '[lan2-final-qa]')\n    uses: ./.github/workflows/lan2-beta4-v1.1.yml\n";
 checkApprovedOtherPush('lan2-final-acceptance.yml',fixture);
 assert.throws(()=>checkApprovedOtherPush('unknown.yml',fixture));
 assert.throws(()=>checkApprovedOtherPush('lan2-final-acceptance.yml',fixture.replace('batch-lan-2/LAN2-FINAL-TRIGGER.md','lan2-lc01/HOSTED-TRIGGER.json')));
});
function checkApprovedOtherPush(name,text){
 assert.equal(name,'lan2-final-acceptance.yml');
 const push=text.match(/\n  push:\n([\s\S]*?)\npermissions:/)?.[1];assert.ok(push);
 assert.match(push,/^    branches: \[codex\/lan2-manual-host-v1.1\]\r?\n    paths:\r?\n      - ['"]?docs\/tasks\/windows-installer-v1.1\/batch-lan-2\/LAN2-FINAL-TRIGGER.md['"]?\s*$/);
 assert.equal(text.includes('[lc01-hosted]'),false);
 for(const marker of ['[lan2-candidate]','[lan2-final-qa]'])assert.ok(text.includes("contains(github.event.head_commit.message, '"+marker+"')"));
 assert.ok(text.includes('uses: ./.github/workflows/lan2-beta4-v1.1.yml'));
}
function passing(pathValue='DISPATCH_SUCCESS'){
 const v=report.base('a'.repeat(40),'FINALIZE');
 const expected=require('../../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/accepted-f3-beta2-identity.json').profile.policy;
 const fields=['programManifestSha256','programInventorySha256','runtimeManifestSha256','launcherSha256','buildInfoSha256'];
 v.identity={status:'PASS',inventoryFiles:1042,nodeSha256:'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32',...Object.fromEntries(fields.map(k=>[k,expected[k]]))};
 v.lifecycle={status:'PASS',stage:'FINALIZE',second:{Status:'PASS',Path:pathValue,BusyClosed:pathValue==='INSTANCE_BUSY_REJECTED',NaturalExit:true,CleanupTerminated:false,HandlesClosed:true,ExitCode:pathValue==='INSTANCE_BUSY_REJECTED'?1:0},firstIdentity:true,nodeIdentity:true,exclusiveLock:true,noSecondBackend:true,firstNaturalExit:true,firstExitCode:0,nodeExited:true,quiescence:true,handlesClosed:true,cleanupTerminated:false,modalProof:pathValue==='INSTANCE_BUSY_REJECTED'?'OBSERVED':'NOT_EXERCISED'};
 v.status='PASS';v.cleanupVerified=true;return v;
}
test('only both observed natural success paths accepted; physical gates stay false',()=>{
 report.validate(passing());report.validate(passing('INSTANCE_BUSY_REJECTED'));report.validate(report.base('a'.repeat(40)));
});
test('sensitive arbitrary fields/text/paths/PIDs/env cannot be uploaded',()=>{
 for(const k of ['pid','path','windowText','env','stdout','secret']){const v=passing();v.lifecycle[k]='sensitive';assert.throws(()=>report.validate(v));}
 for(const mutate of [v=>v.f3.setupSha256='C:\\private',v=>v.lifecycle.second.Path='window body',v=>v.lifecycle.modalProof='headless assumed',v=>v.identity.launcherSha256='0'.repeat(64)]){const v=passing();mutate(v);assert.throws(()=>report.validate(v));}
});
test('cleanup, natural exit, no backend/lock, quiescence, unknown modal fail closed',()=>{
 for(const mutate of [v=>v.lifecycle.cleanupTerminated=true,v=>v.lifecycle.second.CleanupTerminated=true,v=>v.lifecycle.second.NaturalExit=false,
 v=>v.lifecycle.noSecondBackend=false,v=>v.lifecycle.exclusiveLock=false,v=>v.lifecycle.quiescence=false,v=>v.lifecycle.handlesClosed=false,
 v=>v.lifecycle.firstNaturalExit=false,v=>v.lifecycle.firstExitCode=97,v=>v.lifecycle.nodeExited=false,v=>v.lifecycle.modalProof='UNPROVEN',v=>v.cleanupVerified=false]){
  const v=passing();mutate(v);assert.throws(()=>report.validate(v));
 }
});
test('failure/unknown cannot be relabeled PASS without installed identity/lifecycle/cleanup',()=>{
 const v=report.base('a'.repeat(40));v.status='PASS';assert.throws(()=>report.validate(v));
 const dir=path.join(out,'failure');fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'lifecycle-fixed.json'),JSON.stringify({pid:123,windowText:'private'}));
 const emitted=report.publish(dir,'a'.repeat(40),'IDENTITY');assert.equal(emitted.status,'FAIL');assert.equal(emitted.lifecycle,null);assert.equal(emitted.cleanupVerified,false);
 report.validate(JSON.parse(fs.readFileSync(path.join(dir,'LC01-HOSTED-REPORT.json'))));
 assert.equal(report.publish(dir,'a'.repeat(40),'IDENTITY','FAIL').status,'FAIL');
 assert.throws(()=>report.publish(dir,'a'.repeat(40),'IDENTITY','UNKNOWN'));
});
