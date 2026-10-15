'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const r1 = require('../recovery-r1/contract.cjs');
const AUTHORIZATION = '757f73993f5acf0a9084deb3af2b60df293f456d';
const PROOF = 'docs/tasks/windows-installer-v1.1/fresh-lan-trial/FAST-P0-LOCAL-PROOF.json';
const INPUT = [...r1.INPUT, 'authorizationCommit', 'localBuildSource', 'localBuildReportSha256', 'localBuildSetupSha256', 'codeFingerprint'];
const FAILED_SMOKE = Object.freeze({id:'38674907559',source:'c503fe094c07b9e1c7e33648072701461afd73be',control:'f2195dd4191cf4a5341c09483a1d60e3cce8acd7'});
function buildEvidence(bytes, input, facts) {
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), input.localBuildReportSha256);
  const p = JSON.parse(bytes.toString('utf8'));
  r1.exact(p, ['schema','kind','qualification','sourceCommit','status','stage','jobEmpty','forcedTermination','naturalExit','stderrEmpty','environmentRestored','productionInstalled','productionExeRun','setupSha256','setupBytes']);
  assert.equal(p.schema,1);assert.equal(p.kind,'FAST_P0_LOCAL_BUILD');
  assert.equal(p.qualification,'BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE');
  assert.equal(p.sourceCommit,input.localBuildSource);assert.equal(p.status,'PASS');assert.equal(p.stage,'FINAL');
  for(const k of ['jobEmpty','naturalExit','stderrEmpty','environmentRestored'])assert.equal(p[k],true);
  for(const k of ['forcedTermination','productionInstalled','productionExeRun'])assert.equal(p[k],false);
  assert.match(p.setupSha256,/^[a-f0-9]{64}$/);assert.equal(p.setupSha256,input.localBuildSetupSha256);
  assert.ok(Number.isSafeInteger(p.setupBytes)&&p.setupBytes>1024*1024);
  assert.equal(input.authorizationCommit,AUTHORIZATION);
  assert.equal(facts.authorizationAncestor,true);assert.equal(facts.buildAncestor,true);assert.equal(facts.testedAncestor,true);
  for(const tree of [facts.buildTree,facts.reviewTree,facts.testedTree])assert.equal(r1.codeFingerprint(tree),input.codeFingerprint);
  return p;
}
function request(env,input,history,proof,facts) {
  r1.exact(input,INPUT);assert.equal(input.schema,2);
  assert.equal(env.repository,'KG718718/spxt-public');assert.equal(env.ref,'refs/heads/codex/lan-fresh-trial-v1.1');
  assert.equal(env.event,'push');assert.equal(env.attempt,'1');assert.match(env.sha,/^[a-f0-9]{40}$/);assert.match(env.runId,/^[1-9][0-9]{0,19}$/);
  assert.equal(env.parent,input.reviewedSource);assert.deepEqual(env.changedFiles,[r1.TRIGGER]);
  for(const k of ['reviewedSource','testedSource','localBuildSource'])assert.match(input[k],/^[a-f0-9]{40}$/);
  for(const k of ['localBuildReportSha256','localBuildSetupSha256','codeFingerprint'])assert.match(input[k],/^[a-f0-9]{64}$/);
  assert.ok(['R1C1','R1C2','R1Q1'].includes(input.slot));assert.equal(input.mode,r1.SLOTS[input.slot]);
  assert.equal(input.approvalMarker,'FAST_DELIVERY_V1_MASTER_REVIEWED_'+input.slot+'_'+input.reviewedSource);
  assert.equal(env.title,'FreshBuildR1 '+input.slot+' '+input.testedSource);
  assert.equal(input.smokeRunId,'');assert.equal(input.smokeArtifactId,'');
  const prior=history.filter(row=>String(row.id)!==env.runId);
  assert.ok(prior.length>=1&&prior.length<4);
  assert.ok(prior.every(row=>row.path===r1.WORKFLOW&&row.head_branch==='codex/lan-fresh-trial-v1.1'&&row.run_attempt===1&&/^FreshBuildR1 R1(?:S1|C[12]|Q1) [a-f0-9]{40}$/.test(row.display_title||'')));
  const smoke=prior.filter(row=>row.display_title.startsWith('FreshBuildR1 R1S1 '));assert.equal(smoke.length,1);
  assert.equal(String(smoke[0].id),FAILED_SMOKE.id);assert.equal(smoke[0].head_sha,FAILED_SMOKE.control);
  assert.equal(smoke[0].display_title,'FreshBuildR1 R1S1 '+FAILED_SMOKE.source);assert.equal(smoke[0].conclusion,'failure');
  assert.ok(!prior.some(row=>row.display_title.startsWith('FreshBuildR1 R1Q1 ')));
  assert.ok(!prior.some(row=>row.display_title.startsWith('FreshBuildR1 '+input.slot+' ')));
  const candidates=prior.filter(row=>/^FreshBuildR1 R1C[12] /.test(row.display_title));
  assert.equal(new Set(candidates.map(row=>row.display_title.split(' ')[1])).size,candidates.length);
  if(input.slot==='R1C1')assert.equal(candidates.length,0);
  if(input.slot==='R1C2'){
    assert.equal(candidates.length,1);const first=candidates[0];
    assert.equal(first.display_title.split(' ')[1],'R1C1');assert.equal(first.conclusion,'failure');
    assert.equal(String(first.id),input.firstCandidateRunId);assert.match(input.firstCandidateArtifactId,/^[1-9][0-9]{0,19}$/);
    assert.notEqual(input.testedSource,first.display_title.split(' ')[2]);
  }else{assert.equal(input.firstCandidateRunId,'');assert.equal(input.firstCandidateArtifactId,'');}
  if(input.mode==='QA'){
    assert.ok(candidates.length>=1&&candidates.length<=2);const passed=candidates.filter(row=>row.conclusion==='success');assert.equal(passed.length,1);
    assert.equal(String(passed[0].id),input.candidateRunId);assert.equal(passed[0].display_title.split(' ')[2],input.testedSource);
    assert.match(input.candidateArtifactId,/^[1-9][0-9]{0,19}$/);assert.match(input.candidateSetupSha256,/^[a-f0-9]{64}$/);
    if(candidates.length===2){
      assert.equal(passed[0].display_title.split(' ')[1],'R1C2');
      assert.equal(candidates.find(row=>row!==passed[0]).display_title.split(' ')[1],'R1C1');
      assert.equal(candidates.find(row=>row!==passed[0]).conclusion,'failure');
    }
  }else{
    assert.equal(input.testedSource,input.reviewedSource);
    for(const k of ['candidateRunId','candidateArtifactId','candidateSetupSha256'])assert.equal(input[k],'');
  }
  buildEvidence(proof,input,facts);
  return {title:env.title,sourceCommit:input.testedSource,controlCommit:env.sha,mode:input.mode,slot:input.slot,
    r1:{schema:1,mode:input.mode,slot:input.slot,fastDelivery:{schema:1,authorizationCommit:AUTHORIZATION,localBuildSource:input.localBuildSource,localBuildReportSha256:input.localBuildReportSha256,localBuildSetupSha256:input.localBuildSetupSha256}}};
}
module.exports={AUTHORIZATION,PROOF,INPUT,FAILED_SMOKE,buildEvidence,request};
