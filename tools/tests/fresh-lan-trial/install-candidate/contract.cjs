'use strict';
const assert=require('node:assert/strict'),r1=require('../recovery-r1/contract.cjs');
const AUTHORIZATION='627d871a4afedbd4b8403df78a7c79ad498c3a08';
const WORKFLOW='.github/workflows/fresh-install-candidate.yml',TRIGGER='docs/tasks/windows-installer-v1.1/fresh-lan-trial/install-candidate-20261017-trigger.json';
const LEGACY=['.github/workflows/fresh-lan-trial.yml','.github/workflows/fresh-build-first-r1.yml'];
const PROOF='docs/tasks/windows-installer-v1.1/fresh-lan-trial/INSTALL-CANDIDATE-20261017-LOCAL-BUILD.json';
const INPUT=['schema','mode','slot','reviewedSource','testedSource','approvalMarker','authorizationCommit','codeFingerprint','localBuildSource','localBuildReportSha256','localBuildSetupSha256','candidateRunId','candidateArtifactId','candidateSetupSha256'];
const SLOTS=Object.freeze({IC1:'CANDIDATE',IQ1:'QA'}),HEX=/^[a-f0-9]{40}$/,SHA=/^[a-f0-9]{64}$/,ID=/^[1-9][0-9]{0,19}$/;
function historyPages(pages){
 assert.ok(Array.isArray(pages)&&pages.length>0&&pages.length<=100);let count=null;const rows=[];
 pages.forEach((p,i)=>{r1.exact(p,['total_count','workflow_runs']);assert.ok(Number.isSafeInteger(p.total_count)&&p.total_count>=0&&p.total_count<10000);if(count===null)count=p.total_count;assert.equal(p.total_count,count);assert.ok(Array.isArray(p.workflow_runs));assert.ok(p.workflow_runs.length<=100);if(i<pages.length-1)assert.equal(p.workflow_runs.length,100);rows.push(...p.workflow_runs);});
 assert.equal(rows.length,count,'incomplete history');assert.equal(new Set(rows.map(r=>String(r.id))).size,rows.length);for(const r of rows)assert.match(String(r.id),ID);return rows;
}
function legacyBudget(histories){
 r1.exact(histories,LEGACY);for(const file of LEGACY){assert.ok(Array.isArray(histories[file]));for(const r of histories[file]){
  assert.equal(r.path,file);assert.equal(r.head_branch,'codex/lan-fresh-trial-v1.1');assert.equal(r.run_attempt,1);
  const pattern=file===LEGACY[0]?/^FreshTrial (C[123]|QA1) [a-f0-9]{40}$/:/^FreshBuildR1 (R1S1|R1C[12]|R1Q1) [a-f0-9]{40}$/;
  assert.match(r.display_title,pattern);assert.ok(!/ (?:QA1|R1Q1) /.test(r.display_title),'existing QA already consumed');
 }}return true;
}
function buildEvidence(bytes,input,facts){
 assert.ok(Buffer.isBuffer(bytes));assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),input.localBuildReportSha256);const p=JSON.parse(bytes.toString('utf8'));
 r1.exact(p,['schema','kind','qualification','sourceCommit','status','stage','jobEmpty','forcedTermination','naturalExit','stderrEmpty','environmentRestored','productionInstalled','productionExeRun','setupSha256','setupBytes']);assert.equal(p.schema,1);assert.equal(p.kind,'FAST_P0_LOCAL_BUILD');assert.equal(p.qualification,'BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE');assert.equal(p.sourceCommit,input.localBuildSource);assert.equal(p.status,'PASS');assert.equal(p.stage,'FINAL');for(const k of ['jobEmpty','naturalExit','stderrEmpty','environmentRestored'])assert.equal(p[k],true);for(const k of ['forcedTermination','productionInstalled','productionExeRun'])assert.equal(p[k],false);assert.equal(p.setupSha256,input.localBuildSetupSha256);assert.match(p.setupSha256,SHA);assert.ok(Number.isSafeInteger(p.setupBytes)&&p.setupBytes>1024*1024);assert.equal(facts.buildAncestor,true);assert.equal(r1.codeFingerprint(facts.buildTree),input.codeFingerprint);return p;
}
function request(env,input,history,facts,proof){
 r1.exact(input,INPUT);assert.equal(input.schema,1);assert.equal(input.authorizationCommit,AUTHORIZATION);
 assert.equal(env.repository,'KG718718/spxt-public');assert.equal(env.ref,'refs/heads/codex/lan-fresh-trial-v1.1');assert.equal(env.event,'push');assert.equal(env.attempt,'1');assert.match(env.runId,ID);assert.match(env.sha,HEX);
 for(const k of ['reviewedSource','testedSource','localBuildSource'])assert.match(input[k],HEX);for(const k of ['codeFingerprint','localBuildReportSha256','localBuildSetupSha256'])assert.match(input[k],SHA);assert.equal(env.parent,input.reviewedSource);assert.deepEqual(env.changedFiles,[TRIGGER]);
 assert.ok(Object.hasOwn(SLOTS,input.slot));assert.equal(input.mode,SLOTS[input.slot]);assert.equal(input.approvalMarker,'FRESH_INSTALL_20261017_MASTER_REVIEWED_'+input.slot+'_'+input.reviewedSource);assert.equal(env.title,'FreshInstall20261017 '+input.slot+' '+input.testedSource);
 assert.equal(facts.complete,true);assert.equal(facts.authorizationAncestor,true);assert.equal(facts.testedAncestor,true);assert.equal(r1.codeFingerprint(facts.reviewTree),input.codeFingerprint);assert.equal(r1.codeFingerprint(facts.testedTree),input.codeFingerprint);legacyBudget(facts.legacy);buildEvidence(proof,input,facts);
 assert.ok(Array.isArray(history)&&history.length>=1&&history.length<=2);assert.equal(new Set(history.map(r=>String(r.id))).size,history.length);
 for(const r of history){assert.match(String(r.id),ID);assert.equal(r.path,WORKFLOW);assert.equal(r.head_branch,'codex/lan-fresh-trial-v1.1');assert.equal(r.event,'push');assert.equal(r.run_attempt,1);assert.match(r.head_sha,HEX);assert.match(r.display_title,/^FreshInstall20261017 (IC1|IQ1) [a-f0-9]{40}$/);}
 const current=history.filter(r=>String(r.id)===env.runId);assert.equal(current.length,1);assert.equal(current[0].head_sha,env.sha);assert.equal(current[0].display_title,env.title);
 const prior=history.filter(r=>String(r.id)!==env.runId);
 if(input.slot==='IC1'){assert.equal(prior.length,0);assert.equal(input.testedSource,input.reviewedSource);for(const k of ['candidateRunId','candidateArtifactId','candidateSetupSha256'])assert.equal(input[k],'');}
 else{assert.equal(prior.length,1);const c=prior[0];assert.equal(c.display_title,'FreshInstall20261017 IC1 '+input.testedSource);assert.equal(c.status,'completed');assert.equal(c.conclusion,'success');assert.equal(String(c.id),input.candidateRunId);assert.match(input.candidateRunId,ID);assert.match(input.candidateArtifactId,ID);assert.match(input.candidateSetupSha256,SHA);}
 const candidate=input.mode==='QA'?{runId:input.candidateRunId,artifactId:input.candidateArtifactId,sourceCommit:input.testedSource,setupSha256:input.candidateSetupSha256}:{runId:null,artifactId:null,sourceCommit:null,setupSha256:null};
 return {title:env.title,sourceCommit:input.testedSource,controlCommit:env.sha,mode:input.mode,slot:input.slot,reportSchema:2,run:{id:env.runId,attempt:1},candidate,installCandidate:{schema:1,authorizationCommit:AUTHORIZATION,slot:input.slot,codeFingerprint:input.codeFingerprint}};
}
function context(c){
 if(c?.installCandidate?.schema===3)return require('../final-install-lan/fc3-contract.cjs').context(c);
 if(c?.installCandidate?.schema===2)return require('../final-install-lan/contract.cjs').context(c);
 r1.exact(c,['title','sourceCommit','controlCommit','mode','slot','reportSchema','run','candidate','installCandidate']);r1.exact(c.installCandidate,['schema','authorizationCommit','slot','codeFingerprint']);assert.equal(c.reportSchema,2);assert.equal(c.installCandidate.schema,1);assert.equal(c.installCandidate.authorizationCommit,AUTHORIZATION);assert.equal(c.installCandidate.slot,c.slot);assert.match(c.installCandidate.codeFingerprint,SHA);assert.ok(Object.hasOwn(SLOTS,c.slot));assert.equal(c.mode,SLOTS[c.slot]);assert.match(c.sourceCommit,HEX);assert.match(c.controlCommit,HEX);assert.notEqual(c.sourceCommit,c.controlCommit);assert.equal(c.title,'FreshInstall20261017 '+c.slot+' '+c.sourceCommit);r1.exact(c.run,['id','attempt']);assert.match(c.run.id,ID);assert.equal(c.run.attempt,1);r1.exact(c.candidate,['runId','artifactId','sourceCommit','setupSha256']);
 if(c.mode==='QA'){assert.match(c.candidate.runId,ID);assert.notEqual(c.candidate.runId,c.run.id);assert.match(c.candidate.artifactId,ID);assert.equal(c.candidate.sourceCommit,c.sourceCommit);assert.match(c.candidate.setupSha256,SHA);}else assert.ok(Object.values(c.candidate).every(v=>v===null));return c;
}
function artifact(metadata,run,input){
 assert.equal(String(metadata.id),input.candidateArtifactId);assert.equal(metadata.expired,false);assert.equal(String(metadata.workflow_run.id),input.candidateRunId);assert.equal(metadata.workflow_run.head_sha,run.head_sha);assert.equal(String(run.id),input.candidateRunId);assert.match(run.head_sha,HEX);assert.equal(run.path,WORKFLOW);assert.equal(run.head_branch,'codex/lan-fresh-trial-v1.1');assert.equal(run.event,'push');assert.equal(run.run_attempt,1);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.display_title,'FreshInstall20261017 IC1 '+input.testedSource);assert.equal(metadata.name,'K-SESSION-install-20261017-candidate-'+input.testedSource);assert.ok(Number.isSafeInteger(metadata.size_in_bytes)&&metadata.size_in_bytes>0&&metadata.size_in_bytes<512*1024*1024);return true;
}
function referenceControl(f,run,source){assert.deepEqual(f.parents,[run.head_sha,source]);assert.deepEqual(f.changedFiles,[TRIGGER]);assert.equal(f.title,run.display_title);return true;}
function candidateEvidence(report,input,control){require('../report.cjs').validate(report,{reportSchema:2,sourceCommit:input.testedSource,controlCommit:control,run:{id:input.candidateRunId,attempt:1},mode:'CANDIDATE'});assert.equal(report.status,'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING');assert.equal(report.setupSha256,input.candidateSetupSha256);assert.ok(Object.values(report.candidate).every(v=>v===null));return true;}
module.exports={AUTHORIZATION,WORKFLOW,TRIGGER,PROOF,LEGACY,INPUT,SLOTS,historyPages,legacyBudget,buildEvidence,request,context,artifact,referenceControl,candidateEvidence};
