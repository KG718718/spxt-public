'use strict';
const assert=require('node:assert/strict');
const {IDS,WITNESSES,METHODS,initial,validate}=require('./report.cjs');
async function run({sourceCommit,controlCommit,runIdentity,mode,candidate,setupSha256,buildDiagnostic,stages,cleanup,write,diagnostics=()=>[],completionWrite=async()=>{},pendingOuter=[]}){
 const expected={sourceCommit,controlCommit,run:runIdentity,mode,...(mode==='QA'?{candidate}:{})},r=initial(sourceCommit,mode,candidate,controlCommit,runIdentity);
 assert.ok(Array.isArray(pendingOuter)&&pendingOuter.every(k=>['ownedToolchainAbsent','ownedDriveRestored','environmentRestored'].includes(k)));assert.equal(new Set(pendingOuter).size,pendingOuter.length);
 if(setupSha256!==undefined)r.setupSha256=setupSha256;
 if(buildDiagnostic!==undefined){require('./build-diagnostic.cjs').validate(buildDiagnostic);r.buildDiagnostic=buildDiagnostic;}
 let success=false,gatesComplete=false,actualFailure=false;
 try{
  for(const id of IDS){
   r.stage=id;r.reason='GATE_FAILED';await write(r);
   assert.equal(typeof stages[id],'function');
   const evidence=await stages[id]();assert.ok(evidence&&typeof evidence==='object');assert.deepEqual(Object.keys(evidence).sort(),[...WITNESSES[id]].sort());
   for(const v of Object.values(evidence))assert.equal(v,true);
   r.checks.push({id,method:METHODS[id],pass:true,witnesses:evidence});await write(r);
  }
  success=true;gatesComplete=true;
 }catch(e){
  actualFailure=true;
  if(IDS.includes(e?.fixedStage))r.stage=e.fixedStage;
  if(['DEPENDENCY_UNPROVEN','SOURCE_REJECTED','SETUP_REJECTED','BROWSER_FAILED'].includes(e?.fixedReason))r.reason=e.fixedReason;
 }finally{
  try{const ds=diagnostics();assert.ok(Array.isArray(ds));for(const d of ds)require('./setup-diagnostic.cjs').validate(d);r.setupDiagnostics=ds;}catch{success=false;actualFailure=true;r.reason='GATE_FAILED';}
  try{const c=await cleanup();assert.deepEqual(Object.keys(c).sort(),Object.keys(r.cleanup).sort());for(const [k,v]of Object.entries(c)){assert.ok(v===true||v===false||v===null);if(v!==true&&!(v===null&&pendingOuter.includes(k)))actualFailure=true;}r.cleanup=c;}catch{r.reason='CLEANUP_UNPROVEN';success=false;actualFailure=true;}
  if(!Object.values(r.cleanup).every(v=>v===true)){r.reason='CLEANUP_UNPROVEN';success=false;}
  if(success){r.status='FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING';r.stage='COMPLETE';r.reason='PASS';}
  validate(r,expected);await write(r);
  await completionWrite({schema:1,sourceCommit:r.sourceCommit,controlCommit:r.controlCommit,run:r.run,mode:r.mode,checksComplete:gatesComplete,actualFailure});
 }
 return r;
}
module.exports={run};
