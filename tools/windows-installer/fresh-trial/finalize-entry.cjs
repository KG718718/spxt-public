'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {validate}=require('../../tests/fresh-lan-trial/report.cjs');
const {safe}=require('../../tests/fresh-lan-trial/safe-failure.cjs');
const {finish}=require('../../tests/fresh-lan-trial/finalize.cjs');
const {inspect,verify}=require('./verify-artifact.cjs');
function main(){
 const [mode,work,publish,driveRestored,outerFailure='false']=process.argv.slice(2);assert.ok(['CHECK','FINAL'].includes(mode));assert.ok(['true','false'].includes(outerFailure));
 const context=JSON.parse(fs.readFileSync(path.join(work,'context.json'))),expected={reportSchema:2,sourceCommit:context.sourceCommit,controlCommit:context.controlCommit,run:context.run,mode:context.mode,...(context.mode==='QA'?{candidate:context.candidate}:{})};
 assert.equal(context.reportSchema,2);if(Object.hasOwn(context,'installCandidate')||process.env.GITHUB_WORKFLOW_REF==='KG718718/spxt-public/.github/workflows/fresh-install-candidate.yml@refs/heads/codex/lan-fresh-trial-v1.1')require('../../tests/fresh-lan-trial/install-candidate/contract.cjs').context(context);const r=validate(JSON.parse(fs.readFileSync(path.join(work,'fresh-report.json'))),expected);
 if(mode==='CHECK'){if(r.checks.length===9)inspect(path.join(work,'artifact'),context.sourceCommit,context.mode==='QA'?context.candidate.setupSha256:undefined);else safe(r,expected);return;}
 const completionFile=path.join(publish,'completion-private.json');
 const completion=fs.existsSync(completionFile)?JSON.parse(fs.readFileSync(completionFile)):{schema:1,sourceCommit:r.sourceCommit,controlCommit:r.controlCommit,run:r.run,mode:r.mode,checksComplete:false,actualFailure:true};
 const cleanup={...r.cleanup,ownedDriveRestored:driveRestored==='true'};
 let supervisorFailure=false;const supervisorFile=path.join(publish,'supervisor-entry-private.json');
 if(fs.existsSync(supervisorFile)){assert.ok(fs.statSync(supervisorFile).size<=16384);const e=JSON.parse(fs.readFileSync(supervisorFile));const merged=require('../../tests/fresh-lan-trial/supervisor-diagnostic.cjs').merge(r,e,expected);supervisorFailure=merged.failure;Object.assign(cleanup,r.cleanup);cleanup.ownedDriveRestored=driveRestored==='true';}
 const final=finish(r,completion,cleanup,expected,outerFailure==='true'||supervisorFailure);
 fs.writeFileSync(path.join(publish,'fresh-report.json'),JSON.stringify(final)+'\n');
 if(final.status==='FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING'){
  fs.writeFileSync(path.join(publish,'artifact/fresh-report.json'),JSON.stringify(final)+'\n');verify(path.join(publish,'artifact'),expected);
 }else{safe(final,expected);fs.mkdirSync(path.join(publish,'failure'),{recursive:true});fs.writeFileSync(path.join(publish,'failure/fresh-report.json'),JSON.stringify(final)+'\n');process.exitCode=1;}
}
try{main();}catch{process.stderr.write('FRESH_TRIAL_FINAL_REPORT_INVALID\n');process.exitCode=1;}
