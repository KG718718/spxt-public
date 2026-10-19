'use strict';
// The user approved one historical exception. No other UNKNOWN report qualifies.
const assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const AUTHORIZATION='18d408fcf5f72420fd209fc5b569e5af7f7e22a2',FIX='cb2042de92cf4b578de73ee62863c62fbc04b26a';
const FC1=Object.freeze({runId:'39011056474',jobId:'117333497808',artifactId:'12092841661',source:'63e91f986e969b12f0faf5a4fc974f39dc91dcc0',control:'9fef45f81af4f5d58a3b45fb2ff8da7f25d40076',reportSha256:'c7459ae5e175f6dc478d3982e2bad7f8888c47515b208657bd1809f62aca9896',archiveSha256:'4bcf8c764a2441934e7f37d4efd39ebeb5e9fe83656ce16f1f8259d3a8eab662',archiveBytes:843});
const WORKFLOW='.github/workflows/fresh-install-candidate.yml',PROOF='docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/FC2-LOCAL-BUILD.json';
const FIX_FILES=['tools/tests/fresh-lan-trial/build-diagnostic.cjs','tools/tests/fresh-lan-trial/fast-delivery/job-scope.ps1','tools/tests/fresh-lan-trial/fast-delivery/suspended-process.ps1','tools/tests/fresh-lan-trial/finalize.cjs','tools/tests/fresh-lan-trial/install-candidate/early.cjs','tools/tests/fresh-lan-trial/install-candidate/wiring.test.cjs','tools/tests/fresh-lan-trial/install-r2/ci-finally.test.ps1','tools/tests/fresh-lan-trial/install-r2/physical-work.ps1','tools/tests/fresh-lan-trial/install-r2/supervisor-entry.test.cjs','tools/tests/fresh-lan-trial/report.cjs','tools/tests/fresh-lan-trial/supervisor-constants.cjs','tools/tests/fresh-lan-trial/supervisor-core.test.ps1','tools/tests/fresh-lan-trial/supervisor-diagnostic.cjs','tools/tests/fresh-lan-trial/supervisor-entry.ps1','tools/tests/fresh-lan-trial/supervisor-entry.test.ps1','tools/windows-installer/fresh-trial/ci.ps1','tools/windows-installer/fresh-trial/finalize-entry.cjs','tools/windows-installer/fresh-trial/finalize.ps1','tools/windows-installer/fresh-trial/hosted-supervisor.ps1'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function source(repo,i){
 assert.equal(typeof repo,'string');assert.ok(repo.length>0);const git=(...a)=>cp.execFileSync('git',['-C',repo,...a],{encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe']}).trim();
 for(const c of [i.localBuildSource,i.testedSource,i.reviewedSource])assert.match(c,/^[a-f0-9]{40}$/);
 git('merge-base','--is-ancestor',AUTHORIZATION,i.localBuildSource);git('merge-base','--is-ancestor',FIX,i.testedSource);git('merge-base','--is-ancestor',i.localBuildSource,i.testedSource);git('merge-base','--is-ancestor',i.testedSource,i.reviewedSource);
 const pinned=git('ls-tree','-r',FIX,'--',...FIX_FILES,WORKFLOW),actual=git('ls-tree','-r',i.testedSource,'--',...FIX_FILES,WORKFLOW);assert.equal(pinned.split('\n').length,FIX_FILES.length+1);assert.equal(actual,pinned);
 assert.equal(git('ls-tree',i.reviewedSource,'--',WORKFLOW),git('ls-tree',FIX,'--',WORKFLOW));
 return cp.execFileSync('git',['-C',repo,'show',i.reviewedSource+':'+WORKFLOW],{encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe']});
}
function archive(metadata,bytes,exact=false){
 assert.ok(Buffer.isBuffer(bytes)&&bytes.length>0);assert.equal(metadata.expired,false);assert.equal(metadata.digest,'sha256:'+sha(bytes));
 if(exact){assert.equal(String(metadata.id),FC1.artifactId);assert.equal(metadata.name,'final-install-lan-safe-failure-'+FC1.runId);assert.equal(metadata.size_in_bytes,FC1.archiveBytes);assert.equal(bytes.length,FC1.archiveBytes);assert.equal(sha(bytes),FC1.archiveSha256);assert.equal(String(metadata.workflow_run.id),FC1.runId);assert.equal(metadata.workflow_run.head_sha,FC1.control);assert.equal(metadata.workflow_run.head_branch,'codex/lan-fresh-trial-v1.1');}
 return true;
}
function jobPage(page,run,current){
 assert.equal(page.total_count,1);assert.ok(Array.isArray(page.jobs)&&page.jobs.length===1);const j=page.jobs[0];assert.ok(Number.isSafeInteger(j.id)&&j.id>0);assert.equal(String(j.run_id),String(run.id));assert.equal(j.run_attempt,1);assert.equal(j.head_sha,run.head_sha);assert.deepEqual(j.labels,['windows-2025']);assert.equal(j.runner_group_name,'GitHub Actions');assert.equal(j.name,'fresh');assert.equal(j.status,current?'in_progress':'completed');assert.equal(j.conclusion,current?null:run.conclusion);return j;
}
function runner(e,workflow){
 const {environment:env,currentRun:run,currentJobs,referenceRun:previous,referenceJobs}=e;
 assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(env.RUNNER_OS,'Windows');assert.equal(env.GITHUB_REPOSITORY,'KG718718/spxt-public');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_RUN_ID,String(run.id));assert.equal(env.GITHUB_SHA,run.head_sha);assert.equal(env.GITHUB_WORKFLOW_REF,'KG718718/spxt-public/'+WORKFLOW+'@refs/heads/codex/lan-fresh-trial-v1.1');assert.equal(env.GITHUB_JOB,'fresh');
 for(const r of [run,previous]){assert.equal(r.path,WORKFLOW);assert.equal(r.head_branch,'codex/lan-fresh-trial-v1.1');assert.equal(r.event,'push');assert.equal(r.run_attempt,1);assert.equal(r.repository.full_name,'KG718718/spxt-public');assert.equal(r.head_repository.full_name,'KG718718/spxt-public');assert.match(r.head_sha,/^[a-f0-9]{40}$/);}
 assert.equal(run.status,'in_progress');assert.equal(run.conclusion,null);assert.equal(previous.status,'completed');assert.ok(['failure','success'].includes(previous.conclusion));assert.notEqual(String(run.id),String(previous.id));
 const blob=Buffer.from(workflow);assert.equal(crypto.createHash('sha1').update('blob '+blob.length+'\0').update(blob).digest('hex'),'9d1fe73928ce466735d1d9a710c1cfc8a7028483');assert.match(workflow,/\n    runs-on: windows-2025\n/);assert.doesNotMatch(workflow,/self-hosted|windows-.*slim|\n    (?:container|services|strategy|uses):/);
 const current=jobPage(currentJobs,run,true),old=jobPage(referenceJobs,previous,false);assert.notEqual(current.id,old.id);
 // GitHub's standard hosted-runner VM contract applies to this exact workflow;
 // runner_id/name are deliberately neither compared nor emitted.
 return {standardWindowsWorkflow:true,githubHostedWindows:true,currentApiJobBound:true,referenceApiJobBound:true,distinctJobAndRun:true,standardNewVmContract:true};
}
function exactFailure(e,i,facts){
 assert.equal(i.slot,'FC2');assert.equal(i.firstCandidateRunId,FC1.runId);assert.equal(i.firstCandidateArtifactId,FC1.artifactId);assert.equal(i.firstCandidateReportSha256,FC1.reportSha256);assert.equal(e.sourceCommit,FC1.source);assert.equal(e.run.head_sha,FC1.control);assert.equal(String(e.run.id),FC1.runId);assert.equal(sha(e.reportBytes),FC1.reportSha256);
 archive(facts.fc2Reference.metadata,facts.fc2Reference.archiveBytes,true);
 const r=JSON.parse(e.reportBytes.toString('utf8'));assert.ok(e.reportBytes.every(b=>b<128));assert.equal(r.stage,'SOURCE');assert.equal(r.reason,'CLEANUP_UNPROVEN');assert.equal(r.setupSha256,null);assert.deepEqual(r.checks,[]);assert.deepEqual(r.setupDiagnostics,[]);assert.deepEqual(r.buildDiagnostic,{stage:'NOT_STARTED',classification:'NOT_STARTED',script:null,line:null});for(const [k,v]of Object.entries(r.cleanup))assert.equal(v,k==='ownedDriveRestored'?true:null);assert.ok(Object.values(r.recovery).every(v=>v==='NOT_OBSERVED'));
 const workflow=source(facts.fc2SourceRepo,i);assert.equal(facts.runner.referenceRun.head_sha,FC1.control);assert.equal(String(facts.runner.referenceRun.id),FC1.runId);assert.equal(String(facts.runner.referenceJobs.jobs[0].id),FC1.jobId);runner(facts.runner,workflow);
 assert.equal(facts.previousAncestor,true);assert.notEqual(require('../recovery-r1/contract.cjs').codeFingerprint(facts.previousTree),i.codeFingerprint);return true;
}
module.exports={AUTHORIZATION,FIX,FC1,WORKFLOW,PROOF,FIX_FILES,sha,source,archive,runner,exactFailure};
