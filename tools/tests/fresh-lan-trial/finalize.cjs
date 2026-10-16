'use strict';
const assert=require('node:assert/strict'),{validate}=require('./report.cjs');
function finish(input,completion,cleanup,expected,outerFailure=false){
 validate(input,expected);const r=structuredClone(input);
 assert.deepEqual(Object.keys(completion).sort(),['schema','sourceCommit','controlCommit','run','mode','checksComplete','actualFailure'].sort());assert.equal(completion.schema,1);assert.equal(completion.sourceCommit,r.sourceCommit);assert.equal(completion.controlCommit,r.controlCommit);assert.deepEqual(completion.run,r.run);assert.equal(completion.mode,r.mode);assert.equal(typeof completion.checksComplete,'boolean');assert.equal(typeof completion.actualFailure,'boolean');
 assert.deepEqual(Object.keys(cleanup).sort(),Object.keys(r.cleanup).sort());for(const v of Object.values(cleanup))assert.ok(v===true||v===false||v===null);r.cleanup=cleanup;
 const recoveryReady=r.schema!==2||require('./install-r2/recovery.cjs').restored(r.recovery);
 const ready=recoveryReady&&completion.checksComplete&&!completion.actualFailure&&!outerFailure&&r.checks.length===9&&r.checks.every(c=>c.pass)&&Object.values(cleanup).every(v=>v===true)&&r.reason==='CLEANUP_UNPROVEN';
 if(ready){r.status='FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING';r.stage='COMPLETE';r.reason='PASS';}
 else{r.status='FAIL';if(r.stage==='COMPLETE')r.stage='F09';if(!recoveryReady||Object.values(cleanup).some(v=>v!==true))r.reason='CLEANUP_UNPROVEN';else if(r.reason==='PASS')r.reason='GATE_FAILED';}
 return validate(r,expected);
}
module.exports={finish};
