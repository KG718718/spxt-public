'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{run}=require('./pipeline.cjs'),{finish}=require('./finalize.cjs'),{WITNESSES,IDS,initial}=require('./report.cjs');
test('all nine actual gates + pending outer cleanup become PASS only after strict owned finalization',async()=>{
 const sourceCommit='a'.repeat(40),controlCommit='b'.repeat(40),runIdentity={id:'12',attempt:1},expected={sourceCommit,controlCommit,mode:'CANDIDATE',run:runIdentity};let completion;
 const full=Object.fromEntries(Object.keys(initial(sourceCommit,'CANDIDATE').cleanup).map(k=>[k,true])),pending={...full,ownedToolchainAbsent:null,ownedDriveRestored:null,environmentRestored:null};
 const r=await run({sourceCommit,controlCommit,runIdentity,mode:'CANDIDATE',setupSha256:'c'.repeat(64),buildDiagnostic:{stage:'COMPLETE',classification:'PASS',script:null,line:null},stages:Object.fromEntries(IDS.map(id=>[id,async()=>Object.fromEntries(WITNESSES[id].map(k=>[k,true]))])),cleanup:async()=>pending,pendingOuter:['ownedToolchainAbsent','ownedDriveRestored','environmentRestored'],diagnostics:()=>require('./setup-diagnostic-fixture.cjs').all(),write:async()=>{},completionWrite:async c=>completion=c});
 assert.equal(r.status,'FAIL');assert.equal(completion.actualFailure,false);assert.equal(finish(r,completion,full,expected).status,'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING');
 assert.equal(finish(r,{...completion,actualFailure:true},full,expected).status,'FAIL');assert.equal(finish(r,completion,{...full,ownedDriveRestored:null},expected).status,'FAIL');assert.equal(finish(r,completion,full,expected,true).status,'FAIL');
});
