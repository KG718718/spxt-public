'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),g=require('./fc3-contract.cjs'),f=require('./fc3-fixtures.cjs');
const request=x=>g.request(x.env,x.input,x.history,x.facts,x.bytes);
test('new local recovery source remains ineligible for the exhausted historical FC3 slot',()=>{
 const x=f.fixture(),head=f.git('rev-parse','HEAD');a.notEqual(head,x.input.testedSource);
 for(const k of ['reviewedSource','testedSource','localBuildSource'])x.input[k]=head;
 a.throws(()=>g.source(f.repo,x.input));
});
test('FC3 and conditional original FQ1 have versioned context through original entry and finalizer validators',()=>{
 for(const slot of ['FC3','FQ1']){const x=f.fixture(slot),c=request(x);a.equal(c.installCandidate.schema,3);a.equal(require('../install-candidate/contract.cjs').context(c),c);a.equal(require('../../../windows-installer/fresh-trial/final-install-lan/bootstrap.cjs').initialReport(c).schema,2);a.equal(require('../../../windows-installer/fresh-trial/install-candidate/context.cjs').check(c,x.facts.runner.environment,x.facts.testedTree),true);a.equal(g.proofFor(x.input),g.PROOF);}
});
test('FC3 rejects other schema authorization slot marker source control attempt and supplied historical exception fields',()=>{
 const changes=[x=>x.input.schema=2,x=>x.input.authorizationCommit=require('./contract.cjs').AUTHORIZATION,x=>x.input.slot='FC2',x=>x.input.mode='QA',x=>x.input.approvalMarker='PASS',x=>x.input.firstCandidateRunId=g.HISTORY[1].id,x=>x.input.candidateRunId='501',x=>x.env.attempt='2',x=>x.env.event='workflow_dispatch',x=>x.env.repository='other',x=>x.env.ref='refs/heads/main',x=>x.env.parent=g.REPAIR,x=>x.env.changedFiles.push('other'),x=>x.env.title=g.PREFIX+'FC2 '+x.input.testedSource,x=>x.input.raw='private',x=>x.facts.complete=false];
 for(const change of changes){const x=f.fixture();change(x);a.throws(()=>request(x));}
});
test('complete immutable IC1 FC1 FC2 histories never turn UNKNOWN cleanup into PASS or another budget',()=>{
 for(const change of [x=>x.history.shift(),x=>x.history[2].head_sha='a'.repeat(40),x=>x.history[2].conclusion='success',x=>x.history[2].run_attempt=2,x=>x.history[0].display_title='unknown',x=>x.history.push({...x.history[3],id:901}),x=>x.history.push({...x.history[3],id:902,conclusion:'failure',status:'completed'}),x=>x.history[3].status='completed',x=>x.history[3].head_sha='a'.repeat(40),x=>x.history[3].id=x.history[0].id]){const x=f.fixture();change(x);a.throws(()=>request(x));}
 const x=f.fixture();const before=JSON.stringify(x.history);request(x);a.equal(JSON.stringify(x.history),before);
});
test('one shared QA is blocked by any prior old/new QA, extra candidate, retry, removed legacy run or failed FC3',()=>{
 for(const slot of ['FC3','FQ1'])for(const name of ['IQ1','FQ1','QA1','R1Q1']){const x=f.fixture(slot);x.history.push({...x.history.at(-1),id:777,display_title:g.PREFIX+name+' '+x.input.testedSource});a.throws(()=>request(x));}
 for(const path of g.LEGACY){const x=f.fixture();x.facts.legacy[path].pop();a.throws(()=>request(x));const y=f.fixture();y.facts.legacy[path].push({...y.facts.legacy[path][0],id:777,display_title:'FreshBuildR1 R1Q1 '+y.input.testedSource});a.throws(()=>request(y));}
 for(const change of [x=>x.history.at(-1).conclusion='failure',x=>x.history.at(-1).run_attempt=2,x=>x.history.at(-1).status='cancelled',x=>x.history.at(-1).display_title=g.PREFIX+'FC2 '+x.input.testedSource,x=>x.input.candidateRunId='502']){const x=f.fixture('FQ1');change(x);a.throws(()=>request(x));}
});
test('actual reviewed repair/source/fingerprint proof rejects caller boolean authority and changed blobs',t=>{
 const x=f.fixture();a.ok(g.source(f.repo,x.input).includes('runs-on: windows-2025'));
 for(const change of [x=>x.facts.fc3SourceRepo=true,x=>x.input.localBuildSource=g.REPAIR,x=>x.input.codeFingerprint='0'.repeat(64),x=>x.facts.buildAncestor=false,x=>x.facts.reviewTree='bogus',x=>x.bytes=Buffer.from('{}')]){const q=f.fixture();change(q);a.throws(()=>request(q));}
 const real=cp.execFileSync;let changed=false;t.mock.method(cp,'execFileSync',(exe,args,options)=>{const out=real(exe,args,options);if(args.includes('ls-tree')&&args.includes(x.input.testedSource)&&args.includes(g.REPAIR_FILES[0])){changed=true;return out.replace(/^(100644 blob )[a-f0-9]{40}/m,'$1'+'0'.repeat(40));}return out;});a.throws(()=>g.source(f.repo,x.input));a.equal(changed,true);
});
test('Master review is real typed evidence, not just an arbitrary approval marker',()=>{
 for(const change of [r=>r.status='PENDING',r=>r.sourceCommit=g.REPAIR,r=>r.buildSource=g.REPAIR,r=>r.codeFingerprint='0'.repeat(64),r=>r.localBuildReportSha256='0'.repeat(64),r=>r.localBuildSetupSha256='0'.repeat(64),r=>r.authorizationCommit=g.REPAIR,r=>r.repairSource='a'.repeat(40),r=>r.hostedTriggered=true,r=>r.raw='private',r=>r.checks.localGatesPassed=false,r=>r.checks.sameExeQaPreserved='true']){const x=f.fixture();change(x.review);x.facts.masterReviewBytes=Buffer.from(JSON.stringify(x.review));a.throws(()=>request(x));}
 const x=f.fixture();delete x.facts.masterReviewBytes;a.throws(()=>request(x));
});
test('current standard Windows VM and real distinct API Job binding remain mandatory',()=>{
 for(const change of [e=>e.environment.RUNNER_ENVIRONMENT='self-hosted',e=>e.currentRun.id=901,e=>e.currentJobs.jobs[0].labels=['self-hosted'],e=>e.currentJobs.jobs[0].run_attempt=2,e=>e.currentJobs.jobs[0].head_sha='a'.repeat(40),e=>e.referenceRun.id=1,e=>e.referenceJobs.jobs[0].id=e.currentJobs.jobs[0].id,e=>e.referenceJobs.total_count=0,e=>delete e.environment.GITHUB_JOB]){const x=f.fixture();change(x.facts.runner);a.throws(()=>request(x));}
 const x=f.fixture();a.equal(x.facts.runner.currentJobs.jobs[0].runner_id,x.facts.runner.referenceJobs.jobs[0].runner_id);request(x);
});
test('QA requires complete successful recovery and exact Candidate EXE/source/run/archive metadata',()=>{
 const x=f.fixture('FQ1');request(x);for(const change of [r=>r.cleanup.ownedDriveRestored=false,r=>r.recovery.startup='OWNERSHIP_UNKNOWN',r=>r.recovery.globalRegistry='STATE_CHANGED',r=>r.setupSha256='0'.repeat(64),r=>r.checks.pop(),r=>r.sourceCommit=g.REPAIR,r=>r.buildDiagnostic.classification='UNKNOWN',r=>r.status='FAIL',r=>r.raw='private']){const q=f.fixture('FQ1');change(q.facts.candidateReport);a.throws(()=>request(q));}
 const r=x.facts.runner.referenceRun,m={id:601,expired:false,workflow_run:{id:501,head_sha:r.head_sha,head_branch:'codex/lan-fresh-trial-v1.1'},name:g.CANDIDATE_PREFIX+x.input.testedSource,size_in_bytes:1000},spec={runId:'501',artifactId:'601',sourceCommit:x.input.testedSource,kind:'TRIAL'};a.equal(g.artifact(m,r,spec),true);
 for(const change of [m=>m.expired=true,m=>m.id++,m=>m.workflow_run.head_sha='0'.repeat(40),m=>m.workflow_run.head_branch='main',m=>m.name='other']){const q=structuredClone(m);change(q);a.throws(()=>g.artifact(q,r,spec));}a.throws(()=>g.artifact(m,{...r,display_title:g.PREFIX+'FC2 '+x.input.testedSource},spec));
});
test('schema downgrade extra private context and proof rewrites are refused',()=>{
 const c=request(f.fixture());for(const change of [c=>c.installCandidate.schema=2,c=>c.installCandidate.repairSource='a'.repeat(40),c=>c.installCandidate.authorizationCommit=g.REPAIR,c=>c.installCandidate.codeFingerprint='bad',c=>c.slot='FC2',c=>c.reportSchema=1,c=>c.installCandidate.raw='private']){const q=structuredClone(c);change(q);a.throws(()=>require('../install-candidate/contract.cjs').context(q));}
 for(const k of ['jobEmpty','environmentRestored','naturalExit','stderrEmpty']){const x=f.fixture();x.proof[k]=false;x.bytes=Buffer.from(JSON.stringify(x.proof));x.input.localBuildReportSha256=require('./fc2-final.cjs').sha(x.bytes);a.throws(()=>request(x));}
});
test('pure generator returns only schema3 input and never changes the frozen actual trigger',()=>{
 const before=fs.readFileSync(g.TRIGGER),x=f.fixture();a.deepEqual(JSON.parse(require('./trigger.cjs').serialize(x.env,x.input,x.history,x.facts,x.bytes)),x.input);a.deepEqual(fs.readFileSync(g.TRIGGER),before);a.throws(()=>require('./contract.cjs').validateInput(x.input));
});
test('actual final report entry keeps schema3 context and concrete F01 first failure after owned cleanup',()=>{
 const path=require('node:path'),x=f.fixture(),c=request(x),r=require('./fixtures.cjs').success(c.sourceCommit,c.run.id,c.controlCommit),ev=require('../install-r2/startup-events.cjs'),rows=(context,stages)=>stages.map(stage=>({context,stage}));
 Object.assign(r,{status:'FAIL',stage:'F01',reason:'SETUP_REJECTED',checks:[]});r.setupDiagnostics=r.setupDiagnostics.slice(0,6);const d=r.setupDiagnostics[5];Object.assign(d,{exitStatus:'INNO_EXIT_INSTALL_FATAL',markers:['KSESSION_PREINSTALL_READY','KSESSION_UPGRADE_POSTINSTALL_FAILED'],copy:'UNKNOWN',postInstall:'NOT_OBSERVED',outcome:'UNKNOWN',startup:ev.fromEvents([...rows('CREATE',ev.CREATE.slice(0,6)),...rows('INSTALL_VERIFY',ev.VERIFY.slice(0,7)),...rows('INSTALL_VERIFY',['TARGET_DETAIL_PATH_CHECK','TARGET_MISMATCH']),...rows('CLEANUP',['CLEANUP_ENTER']),...rows('CLEANUP_VERIFY',['OWNER_VERIFY_ENTER','OWNER_VERIFIED']),...rows('CLEANUP',['CLEANUP_REMOVED'])])});
 const root=fs.mkdtempSync(path.join(f.repo,'.test-work/fc3-final-report-owned-')),publish=path.join(root,'publish');fs.mkdirSync(publish);fs.writeFileSync(path.join(root,'.owned.json'),'{"kind":"SYNTHETIC_FINAL_REPORT_ONLY"}');fs.writeFileSync(path.join(root,'context.json'),JSON.stringify(c));fs.writeFileSync(path.join(root,'fresh-report.json'),JSON.stringify(r));
 const entry=path.join(f.repo,'tools/windows-installer/fresh-trial/finalize-entry.cjs');const check=cp.spawnSync(process.execPath,[entry,'CHECK',root,publish,'false'],{windowsHide:true,encoding:'utf8'});a.equal(check.status,0);a.equal(check.stderr,'');const final=cp.spawnSync(process.execPath,[entry,'FINAL',root,publish,'true','false'],{windowsHide:true,encoding:'utf8'});a.equal(final.status,1);a.equal(final.stderr,'');const result=JSON.parse(fs.readFileSync(path.join(publish,'failure/fresh-report.json')));a.equal(result.status,'FAIL');a.equal(result.stage,'F01');a.deepEqual(result.setupDiagnostics[5].startup.firstFailure,{context:'INSTALL_VERIFY',stage:'TARGET_MISMATCH'});
});
