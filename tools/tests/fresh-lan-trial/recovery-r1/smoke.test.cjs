'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const smoke=require('./smoke-report.cjs'),trial=require('../report.cjs');
const source='a'.repeat(40),control='b'.repeat(40),hash='c'.repeat(64),context={sourceCommit:source,controlCommit:control,run:{id:'123',attempt:1},mode:'CANDIDATE',r1:{schema:1,mode:'SMOKE',slot:'R1S1',codeFingerprint:hash}};
function ready(){const r=smoke.initial(context);r.setupSha256=hash;r.buildDiagnostic={stage:'COMPLETE',classification:'PASS',script:null,line:null};for(const k in r.checks)r.checks[k]=true;for(const k in r.cleanup)r.cleanup[k]=true;r.cleanup.ownedDriveRestored=null;return r;}
test('Smoke is build-only and cannot pass pending cleanup, outer failure, missing compilation or unknown checks',()=>{
 assert.equal(smoke.finish(ready(),{driveRestored:true,outerFailure:false}).status,'BUILD_SMOKE_PASS');
 for(const [driveRestored,outerFailure] of [[false,false],[true,true]])assert.equal(smoke.finish(ready(),{driveRestored,outerFailure}).status,'FAIL');
 assert.throws(()=>smoke.finish(ready(),{driveRestored:true,outerFailure:null}));
 for(const kind of ['checks','cleanup'])for(const k in ready()[kind]){if(k==='ownedDriveRestored')continue;const r=ready();r[kind][k]=null;assert.equal(smoke.finish(r,{driveRestored:true,outerFailure:false}).status,'FAIL');}
 const r=ready();r.productExecuted=true;assert.throws(()=>smoke.finish(r,{driveRestored:true,outerFailure:false}));assert.throws(()=>smoke.validate({...ready(),raw:'private'},{}));
});
test('actual physical Smoke finalizer uses source-bound private build proof and never writes candidate or EXE',()=>{
 const root=fs.mkdtempSync(path.resolve(__dirname,'../../../../.test-work/r1-smoke-final-')),work=path.join(root,'work'),publish=path.join(root,'publish');fs.mkdirSync(work);fs.mkdirSync(publish);fs.writeFileSync(path.join(work,'context.json'),JSON.stringify(context));const base=trial.initial(source,'CANDIDATE',undefined,control,context.run);base.stage='BUILD';base.buildDiagnostic={stage:'COMPLETE',classification:'PASS',script:null,line:null};for(const k in base.cleanup)base.cleanup[k]=true;base.cleanup.ownedDriveRestored=null;fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(base));fs.writeFileSync(path.join(work,'smoke-ready-private.json'),JSON.stringify({sourceCommit:source,codeFingerprint:hash,setupSha256:hash,checks:ready().checks}));
 const entry=path.resolve(__dirname,'../../../windows-installer/fresh-trial/recovery-r1/smoke.cjs');
 for(const outer of ['false','true']){const r=cp.spawnSync(process.execPath,[entry,'FINAL',work,publish,'true',outer],{encoding:'utf8',windowsHide:true});assert.equal(r.status,outer==='false'?0:1);const result=JSON.parse(fs.readFileSync(path.join(publish,'smoke-report.json'),'utf8'));assert.equal(result.status,outer==='false'?'BUILD_SMOKE_PASS':'FAIL');assert.equal(result.qualifiedForInstallation,false);assert.equal(result.productExecuted,false);assert.equal(fs.existsSync(path.join(publish,'artifact')),false);}
 const invalid=JSON.parse(fs.readFileSync(path.join(work,'smoke-ready-private.json'),'utf8'));invalid.sourceCommit='d'.repeat(40);fs.writeFileSync(path.join(work,'smoke-ready-private.json'),JSON.stringify(invalid));const r=cp.spawnSync(process.execPath,[entry,'FINAL',work,publish,'true','false'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,1);
});
test('R1 workflow uploads only smoke JSON for SMOKE and keeps Candidate/QA full gates separate',()=>{
 const repo=path.resolve(__dirname,'../../../..'),workflow=fs.readFileSync(path.join(repo,'.github/workflows/fresh-build-first-r1.yml'),'utf8'),ci=fs.readFileSync(path.join(repo,'tools/windows-installer/fresh-trial/ci.ps1'),'utf8');
 assert.ok(workflow.includes('paths: [docs/tasks/windows-installer-v1.1/fresh-lan-trial/build-first-r1-trigger.json]'));assert.doesNotMatch(workflow,/workflow_dispatch|workflow_call/);assert.ok(workflow.includes('timeout-minutes: 45'));assert.ok(workflow.includes('cancel-in-progress: false'));
 const uploads=workflow.split('      - uses: actions/upload-artifact@').slice(1);assert.equal(uploads.length,4);const smokeUpload=uploads.find(x=>x.includes("outputs.mode == 'SMOKE'"));assert.ok(smokeUpload.includes('/smoke-report.json'));assert.doesNotMatch(smokeUpload,/\/artifact\//);
 const branch=ci.slice(ci.indexOf('  if($BuildOnly){'),ci.indexOf("  Stage 'BROWSER_TOOL_FAILED'"));assert.ok(branch.includes("'READY'"));assert.doesNotMatch(branch,/hosted-run|browser|TestFreshInstalledCore/);assert.ok(ci.includes("'hosted-run.cjs'"));assert.ok(ci.includes('$script:taskFailed=$false'));
});
test('actual strict PowerShell success path requires an initialized script failure flag',()=>{
 const ci=fs.readFileSync(path.resolve(__dirname,'../../../windows-installer/fresh-trial/ci.ps1'),'utf8');assert.ok(ci.includes('$script:taskFailed=$false'));
 for(const initialized of [false,true]){const script="Set-StrictMode -Version Latest;"+(initialized?'$script:taskFailed=$false;':'')+"try{if($script:taskFailed){'FAILED'}else{'READY'}}catch{'UNBOUND_FAILURE_FLAG'}";const r=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-Command',script],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);assert.equal(r.stdout.trim(),initialized?'READY':'UNBOUND_FAILURE_FLAG');}
});
