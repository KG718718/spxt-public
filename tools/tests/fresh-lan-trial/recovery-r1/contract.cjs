'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const WORKFLOW='.github/workflows/fresh-build-first-r1.yml',TRIGGER='docs/tasks/windows-installer-v1.1/fresh-lan-trial/build-first-r1-trigger.json';
const SLOTS=Object.freeze({R1S1:'SMOKE',R1C1:'CANDIDATE',R1C2:'CANDIDATE',R1Q1:'QA'});
const INPUT=['schema','mode','slot','reviewedSource','testedSource','approvalMarker','smokeRunId','smokeArtifactId','firstCandidateRunId','firstCandidateArtifactId','candidateRunId','candidateArtifactId','candidateSetupSha256'];
function exact(o,keys){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),[...keys].sort());}
function codeFingerprint(tree){assert.ok(typeof tree==='string'&&tree.length>0);const rows=tree.trim().split('\n').filter(line=>{const file=line.slice(line.indexOf('\t')+1);return !file.startsWith('docs/')&&!['AGENTS.md','PROJECT.md'].includes(file);});assert.ok(rows.length>0);return crypto.createHash('sha256').update(rows.join('\n')+'\n').digest('hex');}
function request(env,input,history=[]){
 exact(input,INPUT);assert.equal(input.schema,1);assert.equal(env.repository,'KG718718/spxt-public');assert.equal(env.ref,'refs/heads/codex/lan-fresh-trial-v1.1');assert.equal(env.event,'push');assert.equal(env.attempt,'1');assert.match(env.sha,/^[a-f0-9]{40}$/);assert.match(env.runId,/^[1-9][0-9]*$/);assert.equal(input.reviewedSource,env.parent);assert.match(input.reviewedSource,/^[a-f0-9]{40}$/);assert.match(input.testedSource,/^[a-f0-9]{40}$/);assert.deepEqual(env.changedFiles,[TRIGGER]);
 assert.ok(Object.hasOwn(SLOTS,input.slot));assert.equal(input.mode,SLOTS[input.slot]);assert.equal(input.approvalMarker,'BUILD_FIRST_R1_MASTER_REVIEWED_'+input.slot+'_'+input.reviewedSource);
 const title='FreshBuildR1 '+input.slot+' '+input.testedSource;assert.equal(env.title,title);
 const prior=history.filter(r=>String(r.id)!==env.runId);
 assert.ok(prior.length<4,'recovery budget exhausted');
 assert.ok(prior.every(r=>r.path===WORKFLOW&&r.head_branch==='codex/lan-fresh-trial-v1.1'&&/^FreshBuildR1 R1(?:S1|C[12]|Q1) [a-f0-9]{40}$/.test(r.display_title||'')),'unknown prior run consumes budget');
 assert.ok(!prior.some(r=>r.display_title.startsWith('FreshBuildR1 R1Q1 ')),'QA ends recovery');
 assert.ok(prior.every(r=>!r.display_title.startsWith('FreshBuildR1 '+input.slot+' ')),'slot already consumed');
 assert.ok(prior.every(r=>r.run_attempt===1),'attempt consumes recovery budget');
 if(input.mode!=='SMOKE'){
  for(const k of ['smokeRunId','smokeArtifactId'])assert.match(input[k],/^[1-9][0-9]{0,19}$/);
  const smoke=prior.find(r=>String(r.id)===input.smokeRunId);assert.ok(smoke&&smoke.display_title.startsWith('FreshBuildR1 R1S1 ')&&smoke.conclusion==='success');
 }else{assert.equal(prior.length,0);assert.equal(input.smokeRunId,'');assert.equal(input.smokeArtifactId,'');}
 if(input.slot==='R1C1')assert.ok(!prior.some(r=>/FreshBuildR1 R1(?:C[12]|Q1) /.test(r.display_title)));
 if(input.slot==='R1C2'){
  assert.ok(!prior.some(r=>/^FreshBuildR1 R1C[12] /.test(r.display_title)&&r.conclusion==='success'),'first candidate PASS ends candidate loop');
  const first=prior.find(r=>String(r.id)===input.firstCandidateRunId);assert.ok(first&&first.display_title.startsWith('FreshBuildR1 R1C1 ')&&first.conclusion==='failure');assert.match(input.firstCandidateArtifactId,/^[1-9][0-9]{0,19}$/);
  assert.notEqual(input.testedSource,first.display_title.split(' ')[2]);
 }else{assert.equal(input.firstCandidateRunId,'');assert.equal(input.firstCandidateArtifactId,'');}
 if(input.mode==='QA'){for(const k of ['candidateRunId','candidateArtifactId'])assert.match(input[k],/^[1-9][0-9]{0,19}$/);assert.match(input.candidateSetupSha256,/^[a-f0-9]{64}$/);const candidate=prior.find(r=>String(r.id)===input.candidateRunId);assert.ok(candidate&&/^FreshBuildR1 R1C[12] /.test(candidate.display_title)&&candidate.conclusion==='success');assert.equal(candidate.display_title.split(' ')[2],input.testedSource);}
 else{assert.equal(input.testedSource,input.reviewedSource);for(const k of ['candidateRunId','candidateArtifactId','candidateSetupSha256'])assert.equal(input[k],'');}
 return {title,sourceCommit:input.testedSource,controlCommit:env.sha,mode:input.mode==='QA'?'QA':'CANDIDATE',slot:input.slot,r1:{schema:1,mode:input.mode,slot:input.slot}};
}
function artifact(metadata,run,{runId,artifactId,sourceCommit,kind,conclusion='success'}){
 assert.equal(String(metadata.id),artifactId);assert.equal(String(metadata.workflow_run.id),runId);assert.equal(metadata.workflow_run.head_sha,run.head_sha);assert.equal(String(run.id),runId);assert.equal(metadata.expired,false);assert.equal(run.run_attempt,1);assert.equal(run.path,WORKFLOW);assert.equal(run.head_branch,'codex/lan-fresh-trial-v1.1');assert.equal(run.conclusion,conclusion);assert.match(run.head_sha,/^[a-f0-9]{40}$/);
 const prefix=kind==='SMOKE'?'K-SESSION-build-first-r1-smoke-':kind==='FAILURE'?'build-first-r1-safe-failure-':'K-SESSION-build-first-r1-candidate-';assert.equal(metadata.name,prefix+(kind==='FAILURE'?runId:sourceCommit));
 assert.ok(kind==='SMOKE'?run.display_title==='FreshBuildR1 R1S1 '+sourceCommit:/^FreshBuildR1 R1C[12] /.test(run.display_title)&&run.display_title.split(' ')[2]===sourceCommit);return true;
}
function smokeEvidence(report,expected,{slot,codeHash,ancestor}){require('./smoke-report.cjs').validate(report,expected);assert.equal(report.status,'BUILD_SMOKE_PASS');assert.equal(ancestor,true);if(slot==='R1C1')assert.equal(report.codeFingerprint,codeHash);return true;}
function firstFailure(report,expected,{previousCodeHash,codeHash,ancestor}){require('../report.cjs').validate(report,{...expected,mode:'CANDIDATE'});assert.equal(report.status,'FAIL');assert.ok(Object.values(report.cleanup).every(v=>v===true));assert.equal(ancestor,true);assert.notEqual(previousCodeHash,codeHash);return true;}
function candidateEvidence(report,expected,setupSha256){require('../report.cjs').validate(report,{...expected,mode:'CANDIDATE'});assert.equal(report.status,'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING');assert.equal(report.setupSha256,setupSha256);return true;}
function referenceControl(facts,run,sourceCommit){assert.deepEqual(facts.parents,[run.head_sha,sourceCommit]);assert.deepEqual(facts.changedFiles,[TRIGGER]);assert.equal(facts.title,run.display_title);return true;}
module.exports={WORKFLOW,TRIGGER,SLOTS,INPUT,exact,codeFingerprint,request,artifact,smokeEvidence,firstFailure,candidateEvidence,referenceControl};
