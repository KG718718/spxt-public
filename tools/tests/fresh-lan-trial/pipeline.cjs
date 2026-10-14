'use strict';
const assert=require('node:assert/strict');
const {IDS,WITNESSES,METHODS,initial,validate}=require('./report.cjs');
async function run({sourceCommit,controlCommit,runIdentity,mode,candidate,setupSha256,buildDiagnostic,stages,cleanup,write,diagnostics=()=>[]}){
 const expected={sourceCommit,controlCommit,run:runIdentity,mode,...(mode==='QA'?{candidate}:{})},r=initial(sourceCommit,mode,candidate,controlCommit,runIdentity);
 if(setupSha256!==undefined)r.setupSha256=setupSha256;
 if(buildDiagnostic!==undefined){require('./build-diagnostic.cjs').validate(buildDiagnostic);r.buildDiagnostic=buildDiagnostic;}
 let success=false;
 try{
  for(const id of IDS){
   r.stage=id;r.reason='GATE_FAILED';await write(r);
   assert.equal(typeof stages[id],'function');
   const evidence=await stages[id]();assert.ok(evidence&&typeof evidence==='object');assert.deepEqual(Object.keys(evidence).sort(),[...WITNESSES[id]].sort());
   for(const v of Object.values(evidence))assert.equal(v,true);
   r.checks.push({id,method:METHODS[id],pass:true,witnesses:evidence});await write(r);
  }
  success=true;
 }catch(e){
  if(IDS.includes(e?.fixedStage))r.stage=e.fixedStage;
  if(['DEPENDENCY_UNPROVEN','SOURCE_REJECTED','SETUP_REJECTED','BROWSER_FAILED'].includes(e?.fixedReason))r.reason=e.fixedReason;
 }finally{
  try{const ds=diagnostics();assert.ok(Array.isArray(ds));for(const d of ds)require('./setup-diagnostic.cjs').validate(d);r.setupDiagnostics=ds;}catch{success=false;r.reason='GATE_FAILED';}
  try{const c=await cleanup();assert.deepEqual(Object.keys(c).sort(),Object.keys(r.cleanup).sort());for(const v of Object.values(c))assert.ok(v===true||v===false||v===null);r.cleanup=c;}catch{r.reason='CLEANUP_UNPROVEN';success=false;}
  if(!Object.values(r.cleanup).every(v=>v===true)){r.reason='CLEANUP_UNPROVEN';success=false;}
  if(success){r.status='FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING';r.stage='COMPLETE';r.reason='PASS';}
  validate(r,expected);await write(r);
 }
 return r;
}
module.exports={run};
