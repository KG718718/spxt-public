'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const gate=require('./contract.cjs'),r1=require('../recovery-r1/contract.cjs');
function fixture(){
  const source='a'.repeat(40),control='b'.repeat(40),tree='100644 blob '+'1'.repeat(40)+'\ttools/code.cjs\n';
  const proof={schema:1,kind:'FAST_P0_LOCAL_BUILD',qualification:'BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE',sourceCommit:source,status:'PASS',stage:'FINAL',jobEmpty:true,forcedTermination:false,naturalExit:true,stderrEmpty:true,environmentRestored:true,productionInstalled:false,productionExeRun:false,setupSha256:'c'.repeat(64),setupBytes:12000000};
  const bytes=Buffer.from(JSON.stringify(proof)+'\n');
  const input={schema:2,mode:'CANDIDATE',slot:'R1C1',reviewedSource:source,testedSource:source,approvalMarker:'FAST_DELIVERY_V1_MASTER_REVIEWED_R1C1_'+source,smokeRunId:'',smokeArtifactId:'',firstCandidateRunId:'',firstCandidateArtifactId:'',candidateRunId:'',candidateArtifactId:'',candidateSetupSha256:'',authorizationCommit:gate.AUTHORIZATION,localBuildSource:source,localBuildReportSha256:crypto.createHash('sha256').update(bytes).digest('hex'),localBuildSetupSha256:proof.setupSha256,codeFingerprint:r1.codeFingerprint(tree)};
  const env={repository:'KG718718/spxt-public',ref:'refs/heads/codex/lan-fresh-trial-v1.1',event:'push',attempt:'1',sha:control,parent:source,title:'FreshBuildR1 R1C1 '+source,changedFiles:[r1.TRIGGER],runId:'900'};
  const history=[{id:gate.FAILED_SMOKE.id,head_sha:gate.FAILED_SMOKE.control,display_title:'FreshBuildR1 R1S1 '+gate.FAILED_SMOKE.source,path:r1.WORKFLOW,head_branch:'codex/lan-fresh-trial-v1.1',run_attempt:1,conclusion:'failure'}];
  const facts={authorizationAncestor:true,buildAncestor:true,testedAncestor:true,buildTree:tree,reviewTree:tree,testedTree:tree};
  return {input,env,history,facts,proof,bytes};
}
function request(f){return gate.request(f.env,f.input,f.history,f.bytes,f.facts);}
test('new authorization accepts real local proof while preserving failed exhausted Smoke',()=>{
  const f=fixture(),before=structuredClone(f.history),c=request(f);assert.equal(c.slot,'R1C1');assert.equal(c.r1.fastDelivery.authorizationCommit,gate.AUTHORIZATION);assert.deepEqual(f.history,before);assert.equal(f.history[0].conclusion,'failure');
});
test('no new Smoke slot or legacy approval marker may enter fast delivery',()=>{
  for(const change of [f=>f.input.slot='R1S1',f=>f.input.mode='SMOKE',f=>f.input.schema=1,f=>f.input.approvalMarker='BUILD_FIRST_R1_MASTER_REVIEWED_R1C1_'+f.input.reviewedSource,f=>f.input.smokeRunId=gate.FAILED_SMOKE.id,f=>f.input.authorizationCommit='d'.repeat(40)]){const f=fixture();change(f);assert.throws(()=>request(f));}
});
test('local source fingerprint report digest and artifact identity remain mandatory',()=>{
  for(const change of [f=>f.bytes=Buffer.from('{}'),f=>f.input.localBuildSetupSha256='d'.repeat(64),f=>f.input.localBuildSource='d'.repeat(40),f=>f.input.codeFingerprint='d'.repeat(64),f=>f.facts.buildTree+='100644 blob '+'2'.repeat(40)+'\ttools/changed.cjs\n',f=>f.facts.authorizationAncestor=false,f=>f.facts.buildAncestor=false,f=>f.facts.testedAncestor=false]){const f=fixture();change(f);assert.throws(()=>request(f));}
});
test('unknown process cleanup forced exit or forged proof cannot qualify',()=>{
  for(const [key,value] of [['jobEmpty','UNKNOWN'],['naturalExit',false],['forcedTermination',true],['environmentRestored','UNKNOWN'],['stderrEmpty',false],['status','FAIL'],['stage','PAYLOAD'],['productionExeRun',true],['raw','private'],['setupBytes',0]]){
    const f=fixture();f.proof[key]=value;f.bytes=Buffer.from(JSON.stringify(f.proof)+'\n');f.input.localBuildReportSha256=crypto.createHash('sha256').update(f.bytes).digest('hex');assert.throws(()=>request(f),key);
  }
});
test('immutable failed Smoke and every earlier attempt consumes original budget',()=>{
  for(const change of [f=>f.history=[],f=>f.history[0].conclusion='success',f=>f.history[0].run_attempt=2,f=>f.history[0].id='1',f=>f.history[0].head_sha='d'.repeat(40),f=>f.history.push({...f.history[0],id:'901',display_title:'unknown'}),f=>f.history.push({...f.history[0],id:'901',display_title:'FreshBuildR1 R1C1 '+'d'.repeat(40),conclusion:'cancelled'})]){const f=fixture();change(f);assert.throws(()=>request(f));}
});
test('source control branch trigger and attempt are exact',()=>{
  for(const [key,value]of [['repository','other'],['ref','refs/heads/main'],['event','workflow_dispatch'],['attempt','2'],['parent','d'.repeat(40)],['changedFiles',[r1.TRIGGER,'other']],['title','other']]){const f=fixture();f.env[key]=value;assert.throws(()=>request(f));}
  const f=fixture();f.input.private='x';assert.throws(()=>request(f));
});
function priorCandidate(slot,source,conclusion,id){return {id,head_sha:'e'.repeat(40),display_title:'FreshBuildR1 '+slot+' '+source,path:r1.WORKFLOW,head_branch:'codex/lan-fresh-trial-v1.1',run_attempt:1,conclusion};}
function setSlot(f,slot){f.input.slot=slot;f.input.mode=r1.SLOTS[slot];f.input.approvalMarker='FAST_DELIVERY_V1_MASTER_REVIEWED_'+slot+'_'+f.input.reviewedSource;f.env.title='FreshBuildR1 '+slot+' '+f.input.testedSource;}
test('second candidate needs one failed first and cannot run after first PASS or cancellation',()=>{
  const f=fixture();setSlot(f,'R1C2');f.input.firstCandidateRunId='501';f.input.firstCandidateArtifactId='601';f.history.push(priorCandidate('R1C1','d'.repeat(40),'failure','501'));assert.equal(request(f).slot,'R1C2');
  for(const change of [x=>x.history[1].conclusion='success',x=>x.history[1].conclusion='cancelled',x=>x.history[1].run_attempt=2,x=>x.input.firstCandidateArtifactId='',x=>x.history[1].display_title='FreshBuildR1 R1C1 '+x.input.testedSource,x=>x.history.push(priorCandidate('R1C2','d'.repeat(40),'failure','502'))]){const x=structuredClone(f);change(x);x.bytes=Buffer.from(x.bytes);assert.throws(()=>request(x));}
});
function qaFixture(){const f=fixture();setSlot(f,'R1Q1');f.input.candidateRunId='501';f.input.candidateArtifactId='601';f.input.candidateSetupSha256='d'.repeat(64);f.history.push(priorCandidate('R1C1',f.input.testedSource,'success','501'));return f;}
test('QA requires first successful original candidate slot and exact tested source',()=>{
  assert.equal(request(qaFixture()).mode,'QA');
  for(const change of [f=>f.history[1].conclusion='failure',f=>f.input.candidateRunId='502',f=>f.input.candidateArtifactId='',f=>f.input.candidateSetupSha256='',f=>f.history[1].display_title='FreshBuildR1 R1C1 '+'d'.repeat(40),f=>f.history.push(priorCandidate('R1C2','e'.repeat(40),'failure','502')),f=>f.history.push(priorCandidate('R1Q1',f.input.testedSource,'failure','503'))]){const f=qaFixture();change(f);assert.throws(()=>request(f));}
  const second=qaFixture();second.history[1].conclusion='failure';second.history.push(priorCandidate('R1C2',second.input.testedSource,'success','502'));second.input.candidateRunId='502';assert.equal(request(second).mode,'QA');
});
test('actual original candidate and QA metadata gate rejects different EXE bytes or control',()=>{
  const evidence=require('../recovery-r1/fixtures.cjs').trialPass();
  const make=require('../../../windows-installer/fresh-trial/recovery-r1/bootstrap.cjs').candidateMetadata;
  const context={sourceCommit:evidence.sourceCommit},input={candidateRunId:evidence.run.id,candidateArtifactId:'22',candidateSetupSha256:evidence.setupSha256};
  assert.equal(make({report:evidence,run:{head_sha:evidence.controlCommit}},context,input).setupSha256,evidence.setupSha256);
  assert.throws(()=>make({report:evidence,run:{head_sha:evidence.controlCommit}},context,{...input,candidateSetupSha256:'d'.repeat(64)}));
  assert.throws(()=>make({report:evidence,run:{head_sha:'d'.repeat(40)}},context,input));
});
test('second candidate original evidence gate also requires changed code and proven cleanup',()=>{
  const report=require('../recovery-r1/fixtures.cjs').trialPass();report.status='FAIL';report.stage='F09';report.reason='GATE_FAILED';
  const expected={sourceCommit:report.sourceCommit,controlCommit:report.controlCommit,run:report.run};
  const facts={previousCodeHash:'a'.repeat(64),codeHash:'b'.repeat(64),ancestor:true};
  assert.equal(r1.firstFailure(report,expected,facts),true);
  assert.throws(()=>r1.firstFailure(report,expected,{...facts,codeHash:facts.previousCodeHash}));
  assert.throws(()=>r1.firstFailure(report,expected,{...facts,ancestor:false}));
  report.cleanup.ownedRulesAbsent=null;assert.throws(()=>r1.firstFailure(report,expected,facts));
});
