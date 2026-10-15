'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),contract=require('./contract.cjs'),smoke=require('./smoke-report.cjs'),trial=require('../report.cjs');
const source='a'.repeat(40),control='b'.repeat(40),hash='c'.repeat(64),env={repository:'KG718718/spxt-public',ref:'refs/heads/codex/lan-fresh-trial-v1.1',event:'push',attempt:'1',sha:control,runId:'99',parent:source,changedFiles:[contract.TRIGGER]};
function input(slot){return{schema:1,mode:contract.SLOTS[slot],slot,reviewedSource:source,testedSource:source,approvalMarker:'BUILD_FIRST_R1_MASTER_REVIEWED_'+slot+'_'+source,smokeRunId:slot==='R1S1'?'':'1',smokeArtifactId:slot==='R1S1'?'':'11',firstCandidateRunId:slot==='R1C2'?'2':'',firstCandidateArtifactId:slot==='R1C2'?'22':'',candidateRunId:slot==='R1Q1'?'2':'',candidateArtifactId:slot==='R1Q1'?'22':'',candidateSetupSha256:slot==='R1Q1'?hash:''};}
function run(slot,id,conclusion='success',s=source){return{id,run_attempt:1,path:contract.WORKFLOW,head_branch:'codex/lan-fresh-trial-v1.1',head_sha:control,display_title:'FreshBuildR1 '+slot+' '+s,conclusion};}
function request(i,h=[]){return contract.request({...env,title:'FreshBuildR1 '+i.slot+' '+i.testedSource},i,h);}
const {smokePass,trialPass}=require('./fixtures.cjs');
test('R1 exact slots and single path cannot reuse old slots, markers, attempts or unrelated workflow history',()=>{
 request(input('R1S1'));request(input('R1C1'),[run('R1S1',1)]);request(input('R1Q1'),[run('R1S1',1),run('R1C1',2)]);
 const c2=input('R1C2');c2.testedSource=source;c2.reviewedSource=source;request(c2,[run('R1S1',1),run('R1C1',2,'failure','d'.repeat(40))]);
 for(const prior of [{...run('R1S1',1),display_title:'invalid early source failure'},run('R1S1',1,'cancelled'),{...run('R1S1',1),run_attempt:2},{...run('R1S1',1),path:'.github/workflows/fresh-lan-trial.yml'}])assert.throws(()=>request(input('R1S1'),[prior]));
 assert.throws(()=>request(input('R1C1'),[{...run('R1S1',1),display_title:'invalid slot'}]));
 assert.throws(()=>request(c2,[run('R1S1',1),run('R1C1',2)]));assert.throws(()=>request(c2,[run('R1S1',1),run('R1C1',2,'cancelled')]));
 for(const patch of [{slot:'C1'},{approvalMarker:'FRESH_TRIAL_MASTER_REVIEWED_C1_'+source},{mode:'DIAGNOSTIC'}])assert.throws(()=>request({...input('R1S1'),...patch}));
});
test('fingerprint includes CLI, workflows, lock and profile; governance alone does not count as code change',()=>{
 const rows=['100644 blob '+source+'\tserver.js','100644 blob '+source+'\ttools/cli.cjs','100644 blob '+source+'\t.github/workflows/fresh-build-first-r1.yml','100644 blob '+source+'\tpackage-lock.json','100644 blob '+source+'\tprofile.json'];const baseline=contract.codeFingerprint(rows.join('\n'));
 assert.equal(contract.codeFingerprint([...rows,'100644 blob '+control+'\tdocs/result.md','100644 blob '+control+'\tAGENTS.md','100644 blob '+control+'\tPROJECT.md'].join('\n')),baseline);
 for(let i=0;i<rows.length;i++){const changed=[...rows];changed[i]=changed[i].replace(source,control);assert.notEqual(contract.codeFingerprint(changed.join('\n')),baseline);}
});
test('Smoke dependency needs strict bound build proof and all cleanup; Candidate2 needs safe failure and actual code change',()=>{
 const s=smokePass(),e={sourceCommit:source,controlCommit:control,run:{id:'1',attempt:1},codeFingerprint:hash};contract.smokeEvidence(s,e,{slot:'R1C1',codeHash:hash,ancestor:true});
 for(const change of [r=>r.status='FAIL',r=>r.checks.setupCompiled=null,r=>r.cleanup.environmentRestored=null,r=>r.controlCommit='d'.repeat(40),r=>r.productExecuted=true,r=>r.setupSha256=null]){const r=structuredClone(s);change(r);assert.throws(()=>contract.smokeEvidence(r,e,{slot:'R1C1',codeHash:hash,ancestor:true}));}
 assert.throws(()=>contract.smokeEvidence(s,e,{slot:'R1C1',codeHash:'e'.repeat(64),ancestor:true}));assert.throws(()=>contract.smokeEvidence(s,e,{slot:'R1C1',codeHash:hash,ancestor:false}));
 const f=trial.initial(source,'CANDIDATE',undefined,control,{id:'2',attempt:1});f.stage='BUILD';for(const k in f.cleanup)f.cleanup[k]=true;const expected={sourceCommit:source,controlCommit:control,run:{id:'2',attempt:1}},proof={previousCodeHash:hash,codeHash:'d'.repeat(64),ancestor:true};contract.firstFailure(f,expected,proof);
 assert.throws(()=>contract.firstFailure(f,expected,{...proof,codeHash:hash}));const unknown=structuredClone(f);unknown.cleanup.ownedRulesAbsent=null;assert.throws(()=>contract.firstFailure(unknown,expected,proof));
});
test('QA requires exact R1 candidate artifact/run/attempt/source/EXE and cannot accept old workflow PASS',()=>{
 const i=input('R1Q1'),r=run('R1C1',2),m={id:22,expired:false,name:'K-SESSION-build-first-r1-candidate-'+source,workflow_run:{id:2,head_sha:control}};contract.artifact(m,r,{runId:'2',artifactId:'22',sourceCommit:source,kind:'TRIAL'});contract.candidateEvidence(trialPass(),{sourceCommit:source,controlCommit:control,run:{id:'2',attempt:1}},hash);
 const facts={parents:[control,source],changedFiles:[contract.TRIGGER],title:r.display_title};contract.referenceControl(facts,r,source);assert.throws(()=>contract.referenceControl({...facts,changedFiles:['tools/unsafe.cjs',contract.TRIGGER]},r,source));assert.throws(()=>contract.referenceControl({...facts,parents:[control,'d'.repeat(40)]},r,source));
 for(const patch of [{path:'.github/workflows/fresh-lan-trial.yml'},{run_attempt:2},{display_title:'FreshTrial C1 '+source},{head_sha:'e'.repeat(40)}])assert.throws(()=>contract.artifact(m,{...r,...patch},{runId:i.candidateRunId,artifactId:i.candidateArtifactId,sourceCommit:source,kind:'TRIAL'}));
 assert.throws(()=>contract.candidateEvidence(trialPass(),{sourceCommit:source,controlCommit:control,run:{id:'2',attempt:1}},'e'.repeat(64)));
});
