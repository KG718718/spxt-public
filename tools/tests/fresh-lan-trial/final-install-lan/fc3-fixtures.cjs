'use strict';
// Synthetic API/P0/review records for local contracts; never write the real
// trigger, build proof or Master review paths. Source/blob checks use real Git.
const cp=require('node:child_process'),path=require('node:path'),g=require('./fc3-contract.cjs'),old=require('./fixtures.cjs'),r1=require('../recovery-r1/contract.cjs');
const repo=path.resolve(__dirname,'../../../..'),git=(...a)=>cp.execFileSync('git',['-C',repo,...a],{encoding:'utf8',windowsHide:true}).trim();
function fixture(slot='FC3'){
 const head=git('rev-parse','HEAD'),tree=git('ls-tree','-r',head),fp=r1.codeFingerprint(tree),x=old.fixture('FC1');
 Object.assign(x.input,{schema:3,slot,mode:g.SLOTS[slot],authorizationCommit:g.AUTHORIZATION,reviewedSource:head,testedSource:head,localBuildSource:head,codeFingerprint:fp,approvalMarker:'FINAL_FRESH_FC3_MASTER_REVIEWED_'+slot+'_'+head,candidateRunId:slot==='FQ1'?'501':'',candidateArtifactId:slot==='FQ1'?'601':'',candidateSetupSha256:slot==='FQ1'?old.setup:''});
 x.proof.sourceCommit=head;x.bytes=Buffer.from(JSON.stringify(x.proof)+'\n');x.input.localBuildReportSha256=require('./fc2-final.cjs').sha(x.bytes);
 Object.assign(x.env,{parent:head,title:g.PREFIX+slot+' '+head});
 const rich=r=>({...r,repository:{full_name:'KG718718/spxt-public'},head_repository:{full_name:'KG718718/spxt-public'}});
 const current=rich({...old.row(900,slot,head,null,old.control),status:'in_progress'});
 x.history=g.HISTORY.map(a=>({...old.row(a.id,'FC1',head,'failure',a.head_sha),display_title:a.display_title}));x.history.push(current);
 const reference=slot==='FQ1'?rich(old.row(501,'FC3',head,'success','f'.repeat(40))):rich(x.history[2]);if(slot==='FQ1')x.history.push(reference);
 const job=(r,id,current)=>({id,run_id:r.id,run_attempt:1,head_sha:r.head_sha,labels:['windows-2025'],runner_group_name:'GitHub Actions',name:'fresh',status:current?'in_progress':'completed',conclusion:current?null:r.conclusion,runner_id:1000000506});
 const environment={GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',GITHUB_REPOSITORY:'KG718718/spxt-public',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'900',GITHUB_SHA:old.control,GITHUB_WORKFLOW_REF:'KG718718/spxt-public/'+g.WORKFLOW+'@refs/heads/codex/lan-fresh-trial-v1.1',GITHUB_WORKFLOW_SHA:old.control,GITHUB_JOB:'fresh',GITHUB_REF:'refs/heads/codex/lan-fresh-trial-v1.1',GITHUB_EVENT_NAME:'push'};
 Object.assign(x.facts,{fc3SourceRepo:repo,buildTree:tree,reviewTree:tree,testedTree:tree,runner:{environment,currentRun:current,currentJobs:{total_count:1,jobs:[job(current,10001,true)]},referenceRun:reference,referenceJobs:{total_count:1,jobs:[job(reference,10002,false)]}}});
 x.review={schema:1,kind:'FC3_MASTER_REVIEW',status:'PASS',qualification:'LOCAL_REVIEW_ONLY_NOT_HOSTED',authorizationCommit:g.AUTHORIZATION,repairSource:g.REPAIR,sourceCommit:head,buildSource:head,codeFingerprint:fp,localBuildReportSha256:x.input.localBuildReportSha256,localBuildSetupSha256:x.input.localBuildSetupSha256,checks:{localGatesPassed:true,repairBlobsVerified:true,runnerContractPreserved:true,resourceSafetyPreserved:true,sameExeQaPreserved:true},hostedTriggered:false};x.facts.masterReviewBytes=Buffer.from(JSON.stringify(x.review));
 if(slot==='FQ1')x.facts.candidateReport=old.success(head,'501',reference.head_sha);
 return x;
}
module.exports={repo,git,fixture};
