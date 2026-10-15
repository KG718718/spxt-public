'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const contract=require('../../../tests/fresh-lan-trial/recovery-r1/contract.cjs'),trial=require('../../../tests/fresh-lan-trial/report.cjs'),smoke=require('../../../tests/fresh-lan-trial/recovery-r1/smoke-report.cjs');
function candidateMetadata(evidence,context,input){contract.candidateEvidence(evidence.report,{sourceCommit:context.sourceCommit,controlCommit:evidence.run.head_sha,run:{id:input.candidateRunId,attempt:1}},input.candidateSetupSha256);const id=Number(input.candidateArtifactId),runId=Number(input.candidateRunId);assert.ok(Number.isSafeInteger(id)&&Number.isSafeInteger(runId));return{id,runId,controlCommit:evidence.run.head_sha,testedSource:context.sourceCommit,setupSha256:input.candidateSetupSha256};}
async function main(){
 const [repo,work]=process.argv.slice(2);assert.equal(process.argv.length,4);assert.equal(process.platform,'win32');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
 const git=(...args)=>cp.execFileSync('git',['-C',repo,...args],{encoding:'utf8',windowsHide:true,timeout:15000}).trim();
 const control=process.env.GITHUB_SHA;assert.match(control,/^[a-f0-9]{40}$/);assert.equal(git('rev-parse','HEAD'),control);const parents=git('rev-list','--parents','-n','1',control).split(' ');assert.equal(parents.length,2);
 const input=JSON.parse(fs.readFileSync(path.join(repo,contract.TRIGGER))),headers={Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 const api=async route=>{const r=await fetch('https://api.github.com/repos/KG718718/spxt-public/'+route,{headers,signal:AbortSignal.timeout(60000)});assert.equal(r.status,200);return r.json();};
 const current=await api('actions/runs/'+process.env.GITHUB_RUN_ID);assert.equal(current.head_sha,control);assert.equal(current.path,contract.WORKFLOW);assert.ok(Number.isSafeInteger(current.workflow_id));
 const history=[];for(let page=1;page<=100;page++){const r=await api('actions/workflows/'+current.workflow_id+'/runs?per_page=100&page='+page);assert.ok(Array.isArray(r.workflow_runs));history.push(...r.workflow_runs);if(r.workflow_runs.length<100)break;if(page===100)throw Error('incomplete history');}
 const context=contract.request({repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,event:process.env.GITHUB_EVENT_NAME,attempt:process.env.GITHUB_RUN_ATTEMPT,sha:control,parent:parents[1],title:git('log','-1','--format=%B'),changedFiles:git('diff','--name-only',parents[1],control).split('\n'),runId:process.env.GITHUB_RUN_ID},input,history);
 context.run={id:process.env.GITHUB_RUN_ID,attempt:1};context.r1.codeFingerprint=contract.codeFingerprint(git('ls-tree','-r',context.sourceCommit));context.candidate=input.mode==='QA'?{runId:input.candidateRunId,artifactId:input.candidateArtifactId,sourceCommit:input.testedSource,setupSha256:input.candidateSetupSha256}:{runId:null,artifactId:null,sourceCommit:null,setupSha256:null};
 const ancestor=(old,newer)=>{assert.match(old,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',old,newer);};
 async function readArtifact(runId,artifactId,kind,sourceCommit){
  const [metadata,run]=await Promise.all([api('actions/artifacts/'+artifactId),api('actions/runs/'+runId)]);contract.artifact(metadata,run,{runId,artifactId,sourceCommit,kind,conclusion:kind==='FAILURE'?'failure':'success'});assert.ok(metadata.size_in_bytes>0&&metadata.size_in_bytes<(kind==='TRIAL'?512*1024*1024:512*1024));
  contract.referenceControl({parents:git('rev-list','--parents','-n','1',run.head_sha).split(' '),changedFiles:git('diff','--name-only',sourceCommit,run.head_sha).split('\n'),title:git('log','-1','--format=%B',run.head_sha)},run,sourceCommit);
  const response=await fetch('https://api.github.com/repos/KG718718/spxt-public/actions/artifacts/'+artifactId+'/zip',{headers,signal:AbortSignal.timeout(240000)});assert.equal(response.status,200);const zip=path.join(work,kind.toLowerCase()+'-reference.zip');fs.writeFileSync(zip,Buffer.from(await response.arrayBuffer()),{flag:'wx'});
  const r=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-File',path.join(__dirname,'read-report.ps1'),'-Zip',zip,'-Kind',kind],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:512*1024});assert.equal(r.status,0);assert.equal((r.stderr||'').trim(),'');return{run,report:JSON.parse(r.stdout),zip};
 }
 if(input.mode!=='SMOKE'){
  const run=history.find(r=>String(r.id)===input.smokeRunId),source=run.display_title.split(' ')[2],evidence=await readArtifact(input.smokeRunId,input.smokeArtifactId,'SMOKE',source);
  ancestor(source,context.sourceCommit);contract.smokeEvidence(evidence.report,{sourceCommit:source,controlCommit:evidence.run.head_sha,run:{id:input.smokeRunId,attempt:1},codeFingerprint:contract.codeFingerprint(git('ls-tree','-r',source))},{slot:input.slot,codeHash:context.r1.codeFingerprint,ancestor:true});
 }
 if(input.slot==='R1C2'){
  const run=history.find(r=>String(r.id)===input.firstCandidateRunId),source=run.display_title.split(' ')[2],evidence=await readArtifact(input.firstCandidateRunId,input.firstCandidateArtifactId,'FAILURE',source);
  ancestor(source,context.sourceCommit);contract.firstFailure(evidence.report,{sourceCommit:source,controlCommit:evidence.run.head_sha,run:{id:input.firstCandidateRunId,attempt:1}},{previousCodeHash:contract.codeFingerprint(git('ls-tree','-r',source)),codeHash:context.r1.codeFingerprint,ancestor:true});
 }
 if(input.mode==='QA'){
  const evidence=await readArtifact(input.candidateRunId,input.candidateArtifactId,'TRIAL',context.sourceCommit);
  contract.candidateEvidence(evidence.report,{sourceCommit:context.sourceCommit,controlCommit:evidence.run.head_sha,run:{id:input.candidateRunId,attempt:1}},input.candidateSetupSha256);fs.renameSync(evidence.zip,path.join(work,'candidate.zip'));
  fs.writeFileSync(path.join(work,'candidate-metadata.json'),JSON.stringify(candidateMetadata(evidence,context,input))+'\n',{flag:'wx'});
 }
 fs.writeFileSync(path.join(work,'context.json'),JSON.stringify(context)+'\n',{flag:'wx'});fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(trial.initial(context.sourceCommit,context.mode,context.candidate,context.controlCommit,context.run))+'\n',{flag:'wx'});
 git('-c','core.autocrlf=false','checkout','--detach',context.sourceCommit);assert.equal(git('rev-parse','HEAD'),context.sourceCommit);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+input.mode+'\nsource='+context.sourceCommit+'\n');
}
module.exports={candidateMetadata};
if(require.main===module)main().catch(()=>{process.stderr.write('BUILD_FIRST_R1_SOURCE_REJECTED\n');process.exitCode=1;});
