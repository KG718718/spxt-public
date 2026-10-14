'use strict';
const assert=require('node:assert/strict');
function request(env,input,priorRuns=[]){
 assert.equal(env.repository,'KG718718/spxt-public');assert.equal(env.ref,'refs/heads/codex/lan-fresh-trial-v1.1');assert.equal(env.event,'push');assert.equal(env.attempt,'1');
 assert.match(env.sha,/^[a-f0-9]{40}$/);assert.match(env.runId,/^[1-9][0-9]*$/);
 assert.ok(['CANDIDATE','QA'].includes(input.mode));assert.equal(input.schema,1);assert.equal(input.reviewedSource,env.parent);
 assert.match(input.testedSource,/^[a-f0-9]{40}$/);
 assert.deepEqual(env.changedFiles,['docs/tasks/windows-installer-v1.1/fresh-lan-trial/hosted-trigger.json']);
 assert.ok(['C1','C2','C3','QA1'].includes(input.slot));assert.equal(input.mode==='QA',input.slot==='QA1');
 assert.equal(input.approvalMarker,'FRESH_TRIAL_MASTER_REVIEWED_'+input.slot+'_'+input.reviewedSource);
 const title='FreshTrial '+input.slot+' '+input.testedSource;assert.equal(env.title,title);
 // Slots are reserved once, even when the first run fails before installing.
 assert.ok(priorRuns.every(r=>String(r.id)===env.runId||!String(r.display_title||'').startsWith('FreshTrial '+input.slot+' ')));
 if(input.mode==='QA'){
  for(const k of ['candidateRunId','candidateArtifactId'])assert.match(input[k],/^[1-9][0-9]{0,19}$/);
  assert.match(input.candidateSetupSha256,/^[a-f0-9]{64}$/);assert.notEqual(input.candidateRunId,env.runId);
 }else{assert.equal(input.testedSource,input.reviewedSource);for(const k of ['candidateRunId','candidateArtifactId','candidateSetupSha256'])assert.equal(input[k],'');}
 return {title,sourceCommit:input.testedSource,controlCommit:env.sha,mode:input.mode,slot:input.slot};
}
function candidateArtifact(metadata,run,input,sourceCommit,candidateControl){
 assert.equal(String(metadata.id),input.candidateArtifactId);assert.equal(metadata.expired,false);
 assert.equal(String(metadata.workflow_run.id),input.candidateRunId);assert.equal(metadata.workflow_run.head_sha,candidateControl);
 assert.equal(metadata.name,'K-SESSION-fresh-trial-candidate-'+sourceCommit);assert.equal(run.head_sha,candidateControl);assert.equal(run.conclusion,'success');assert.equal(run.run_attempt,1);
 assert.equal(run.path,'.github/workflows/fresh-lan-trial.yml');assert.equal(run.head_branch,'codex/lan-fresh-trial-v1.1');
 assert.ok(/^FreshTrial C[123] /.test(run.display_title));return true;
}
module.exports={request,candidateArtifact};
