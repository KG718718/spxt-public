'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const diag=require('../supervisor-diagnostic.cjs'),report=require('../report.cjs'),build=require('../build-diagnostic.cjs');
const expected={reportSchema:2,sourceCommit:'a'.repeat(40),controlCommit:'b'.repeat(40),run:{id:'123',attempt:1},mode:'CANDIDATE'};
const envelope=(classification='CI_ENTRY_REJECTED')=>({schema:1,kind:'FRESH_SUPERVISOR_ENTRY',sourceCommit:expected.sourceCommit,controlCommit:expected.controlCommit,run:expected.run,diagnostic:{stage:'CI_ENTRY',classification,script:null,line:null},scope:null,workObserved:true,workMatched:true});
const initial=()=>report.initial(expected.sourceCommit,'CANDIDATE',undefined,expected.controlCommit,expected.run,2);
test('entry envelope is strict source/run bound with only fixed private ownership booleans',()=>{
 const e=envelope();diag.validate(e,expected);
 for(const v of [{...e,path:'private'},{...e,workIdentity:'A'.repeat(24)},{...e,sourceCommit:'c'.repeat(40)},{...e,run:{id:'124',attempt:1}},{...e,run:{id:'123',attempt:2}},{...e,workObserved:false},{...e,diagnostic:{...e.diagnostic,raw:'private'}},{...e,diagnostic:{...e.diagnostic,classification:'UNLISTED'}}])assert.throws(()=>diag.validate(v,expected));
});
test('private work owner never becomes a diagnostic field and rejects stale source/extra fields',()=>{
 const o={schema:1,kind:'FRESH_SUPERVISOR_WORK_OWNER',sourceCommit:expected.sourceCommit,controlCommit:expected.controlCommit,run:expected.run,identity:'A'.repeat(24)};diag.owner(o,expected);
 for(const v of [{...o,identity:'unknown'},{...o,sourceCommit:'c'.repeat(40)},{...o,extra:true},{...o,run:{id:'124',attempt:1}}])assert.throws(()=>diag.owner(v,expected));
});
test('PASS entry requires actual PASS scope and observed matching work ownership',()=>{
 const e=envelope('PASS');assert.throws(()=>diag.validate(e,expected));
 e.scope={schema:1,kind:'FAST_OWNED_PROCESS_SCOPE',assigned:true,naturalExit:false,stderrEmpty:true,pipesClosed:true,handlesClosed:true,jobEmpty:true,forcedTermination:false,status:'FAIL'};assert.throws(()=>diag.validate(e,expected));
 e.scope.naturalExit=true;e.scope.status='PASS';diag.validate(e,expected);
 assert.throws(()=>diag.validate({...e,workMatched:false},expected));assert.throws(()=>diag.validate({...e,workObserved:false,workMatched:false},expected));
});
test('entry failures preserve original deep build classification and invalidate binding recovery',()=>{
 const r=initial();r.stage='BUILD';r.buildDiagnostic={stage:'HELPER',classification:'COMMAND_FAILED',script:null,line:null};const before=structuredClone(r.buildDiagnostic);
 diag.merge(r,envelope('CHILD_EXIT_FAILED'),expected);assert.deepEqual(r.buildDiagnostic,{...before,supervisor:envelope('CHILD_EXIT_FAILED').diagnostic});report.validate(r,expected);
 const b=initial();diag.merge(b,envelope('WORK_BINDING_REJECTED'),expected);assert.equal(b.recovery.compilerOwnedFiles,'OBSERVATION_FAILED');assert.equal(b.cleanup.ownedToolchainAbsent,false);assert.equal(b.reason,'CLEANUP_UNPROVEN');report.validate(b,expected);
 const w=initial();diag.merge(w,envelope('REPORT_WRITE_FAILED'),expected);assert.equal(w.cleanup.handlesClosed,null);assert.equal(w.status,'FAIL');
 assert.throws(()=>build.validate({...r.buildDiagnostic,supervisor:{...r.buildDiagnostic.supervisor,raw:'private'}}));
});
test('actual FINAL CLI emits one existing schema2 failure report with the entry class and no private identity',()=>{
 const repo=path.resolve(__dirname,'../../../..'),root=fs.mkdtempSync(path.join(repo,'.test-work/supervisor-final-')),work=path.join(root,'work'),pub=path.join(root,'publish');fs.mkdirSync(work);fs.mkdirSync(pub);
 fs.writeFileSync(path.join(work,'context.json'),JSON.stringify({...expected}));fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(initial()));fs.writeFileSync(path.join(pub,'supervisor-entry-private.json'),JSON.stringify(envelope()));
 const p=cp.spawnSync(process.execPath,[path.join(repo,'tools/windows-installer/fresh-trial/finalize-entry.cjs'),'FINAL',work,pub,'true','true'],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(p.status,1);assert.equal(p.stdout,'');assert.equal(p.stderr,'');
 assert.deepEqual(fs.readdirSync(path.join(pub,'failure')),['fresh-report.json']);const text=fs.readFileSync(path.join(pub,'failure/fresh-report.json'),'utf8'),r=JSON.parse(text);report.validate(r,expected);assert.equal(r.buildDiagnostic.classification,'CI_ENTRY_REJECTED');assert.equal(r.status,'FAIL');assert.equal(r.setupSha256,null);assert.deepEqual(r.checks,[]);assert.ok(Object.values(r.recovery).every(x=>x==='NOT_OBSERVED'));assert.equal(r.cleanup.ownedDriveRestored,true);assert.equal(r.cleanup.handlesClosed,null);assert.doesNotMatch(text,/identity|workObserved|workMatched|private|stderr|stdout|[A-Z]:\\/);
});
