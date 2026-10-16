'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {request,candidateArtifact}=require('../../tests/fresh-lan-trial/workflow-contract.cjs');
const {initial,validate}=require('../../tests/fresh-lan-trial/report.cjs');
const {verify}=require('./verify-artifact.cjs');
const TRIGGER='docs/tasks/windows-installer-v1.1/fresh-lan-trial/hosted-trigger.json';
async function main(){
 const [repo,work]=process.argv.slice(2);assert.equal(process.argv.slice(2).length,2);assert.equal(process.platform,'win32');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
 const git=(...a)=>cp.execFileSync('git',['-C',repo,...a],{encoding:'utf8',windowsHide:true,timeout:15000}).trim();
 const control=process.env.GITHUB_SHA;assert.match(control,/^[a-f0-9]{40}$/);assert.equal(git('rev-parse','HEAD'),control);
 const parentLine=git('rev-list','--parents','-n','1',control).split(' ');assert.equal(parentLine.length,2);
 const input=JSON.parse(fs.readFileSync(path.join(repo,TRIGGER)));
 assert.deepEqual(Object.keys(input).sort(),['schema','mode','slot','reviewedSource','testedSource','approvalMarker','candidateRunId','candidateArtifactId','candidateSetupSha256'].sort());
 const headers={Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 async function api(route){const r=await fetch('https://api.github.com/repos/KG718718/spxt-public/'+route,{headers,signal:AbortSignal.timeout(60000)});assert.equal(r.status,200);return r.json();}
 const currentRun=await api('actions/runs/'+process.env.GITHUB_RUN_ID);assert.ok(Number.isSafeInteger(currentRun.workflow_id)&&currentRun.workflow_id>0);assert.equal(currentRun.head_sha,control);
 const prior=[];for(let page=1;page<=100;page++){const result=await api('actions/workflows/'+currentRun.workflow_id+'/runs?per_page=100&page='+page);assert.ok(Array.isArray(result.workflow_runs));prior.push(...result.workflow_runs);if(result.workflow_runs.length<100)break;if(page===100)throw Error('budget history incomplete');}
 const context=request({repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,event:process.env.GITHUB_EVENT_NAME,attempt:process.env.GITHUB_RUN_ATTEMPT,sha:control,parent:parentLine[1],title:git('log','-1','--format=%B'),changedFiles:git('diff','--name-only',parentLine[1],control).split('\n'),runId:process.env.GITHUB_RUN_ID},input,prior);
 const run={id:process.env.GITHUB_RUN_ID,attempt:1},candidate=input.mode==='QA'?{runId:input.candidateRunId,artifactId:input.candidateArtifactId,sourceCommit:input.testedSource,setupSha256:input.candidateSetupSha256}:{runId:null,artifactId:null,sourceCommit:null,setupSha256:null};
 fs.writeFileSync(path.join(work,'context.json'),JSON.stringify({...context,run,candidate,reportSchema:2})+'\n',{flag:'wx'});
 const report=initial(context.sourceCommit,context.mode,candidate,context.controlCommit,run,2);report.stage='SOURCE';report.reason='SOURCE_REJECTED';fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(report)+'\n');
 if(input.mode==='QA'){
  const metadata=await api('actions/artifacts/'+input.candidateArtifactId),candidateRun=await api('actions/runs/'+input.candidateRunId);
  candidateArtifact(metadata,candidateRun,input,context.sourceCommit,candidateRun.head_sha);
  assert.ok(Number.isSafeInteger(metadata.size_in_bytes)&&metadata.size_in_bytes>0&&metadata.size_in_bytes<512*1024*1024);
  const archive=await fetch('https://api.github.com/repos/KG718718/spxt-public/actions/artifacts/'+input.candidateArtifactId+'/zip',{headers,signal:AbortSignal.timeout(240000)});assert.equal(archive.status,200);fs.writeFileSync(path.join(work,'candidate.zip'),Buffer.from(await archive.arrayBuffer()),{flag:'wx'});
  fs.writeFileSync(path.join(work,'candidate-metadata.json'),JSON.stringify({id:metadata.id,runId:candidateRun.id,controlCommit:candidateRun.head_sha,testedSource:context.sourceCommit,setupSha256:candidate.setupSha256})+'\n',{flag:'wx'});
 }
 git('-c','core.autocrlf=false','checkout','--detach',context.sourceCommit);assert.equal(git('rev-parse','HEAD'),context.sourceCommit);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+context.mode+'\nsource='+context.sourceCommit+'\n');
}
main().catch(()=>{process.stderr.write('FRESH_TRIAL_SOURCE_REJECTED\n');process.exitCode=1;});
