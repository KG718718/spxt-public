'use strict';
const a=require('node:assert/strict');
const HEX=/^[a-f0-9]{40}$/,ID=/^[1-9][0-9]*$/;
const IDS=['NORMAL_RECEIPT','PARTIAL_CREATE_RECEIPT','REPLACEMENT_IDENTITY'];
const INJECTIONS=['NONE','AFTER_FIRST_CREATE','REPLACE_OBJECT'];
const OBSERVED=['NOT_OBSERVED','INJECTED_PARTIAL_FAILURE','REPLACEMENT_CREATED'];
const FAILURES=['NONE','RANDOM_ROOT_UNPROVEN','PRESTATE_UNPROVEN','RECEIPT_UNPROVEN','TEMPORARY_CLOSE_UNPROVEN','CREATE_UNPROVEN','INJECTION_UNPROVEN','REPLACEMENT_UNPROVEN','REPLACEMENT_CHANGED','OLD_OWNER_NOT_REJECTED','DELETE_UNPROVEN','CLOSE_UNPROVEN','OBSERVE_UNPROVEN'];
function exact(value,keys){a.ok(value&&typeof value==='object'&&!Array.isArray(value));a.deepEqual(Object.keys(value).sort(),keys.slice().sort());}
const oneOf=(value,items)=>a.ok(items.includes(value));
function safeScenario(s,index){
 exact(s,['id','status','expectedInjection','observedInjection','prestateKnown','prestateAbsent','nodes','receiptNodes','temporaryClose','oldOwnerRejected','oldOwnerRejection','replacementPreserved','delete','close','observe','replacementDelete','replacementClose','replacementDisposition','replacementCreatorHandleIssued','deleteFailure','closeFailure','observeFailure','replacementDeleteFailure','replacementCloseFailure','failure']);
 a.equal(s.id,IDS[index]);a.equal(s.expectedInjection,INJECTIONS[index]);oneOf(s.status,['PASS','FAIL','NOT_RUN']);oneOf(s.observedInjection,OBSERVED);oneOf(s.failure,FAILURES);
 for(const k of ['prestateKnown','prestateAbsent'])a.equal(typeof s[k],'boolean');for(const k of ['oldOwnerRejected','replacementPreserved'])a.ok(s[k]===null||typeof s[k]==='boolean');
 oneOf(s.oldOwnerRejection,['NOT_ATTEMPTED','RECEIPT_UNKNOWN','HANDLE_CONTENT_CHANGED','HANDLE_CHANGED','OBSERVATION_FAILED','STRUCTURED_STATE_CHANGED','PARENT_CHANGED','DELETE_FAILED','CLOSE_FAILED','DELETE_OBSERVATION_FAILED','OWNED_REMOVED']);
 oneOf(s.temporaryClose,['NOT_ATTEMPTED','PASS','FAIL']);oneOf(s.delete,['NOT_ATTEMPTED','PARTIAL','FAILED','OWNED_REMOVED']);oneOf(s.close,['NOT_ATTEMPTED','PASS','FAIL']);oneOf(s.observe,['NOT_ATTEMPTED','RESTORED','UNPROVEN']);
 oneOf(s.replacementDelete,['NOT_APPLICABLE','NOT_ATTEMPTED','FAILED','OWNED_REMOVED']);oneOf(s.replacementClose,['NOT_APPLICABLE','NOT_ATTEMPTED','PASS','FAIL']);
 a.ok(Number.isSafeInteger(s.replacementDisposition)&&s.replacementDisposition>=0&&s.replacementDisposition<=2);a.equal(typeof s.replacementCreatorHandleIssued,'boolean');
 for(const k of ['deleteFailure','replacementDeleteFailure'])oneOf(s[k],['NONE','DELETE_FAILED']);for(const k of ['closeFailure','replacementCloseFailure'])oneOf(s[k],['NONE','CLOSE_FAILED']);oneOf(s.observeFailure,['NONE','FOUR_VIEW_RESTORE_UNPROVEN']);
 a.ok(Number.isSafeInteger(s.receiptNodes)&&s.receiptNodes>=0&&s.receiptNodes<=3);a.ok(Array.isArray(s.nodes));a.equal(s.nodes.length,s.receiptNodes);
 for(const n of s.nodes){exact(n,['prestateKnown','prestateAbsent','disposition','creatorHandleIssued','poststateKnown','poststateAbsent','restored']);for(const k of ['prestateKnown','prestateAbsent','creatorHandleIssued','poststateKnown','poststateAbsent','restored'])a.equal(typeof n[k],'boolean');a.ok(Number.isSafeInteger(n.disposition)&&n.disposition>=0&&n.disposition<=2);if(n.restored){a.equal(n.prestateKnown,true);a.equal(n.prestateAbsent,true);a.equal(n.poststateKnown,true);a.equal(n.poststateAbsent,true);}}
 if(s.closeFailure!=='NONE')a.equal(s.close,'FAIL');if(s.deleteFailure!=='NONE')oneOf(s.delete,['PARTIAL','FAILED']);if(s.observeFailure!=='NONE')a.equal(s.observe,'UNPROVEN');if(s.replacementCloseFailure!=='NONE')a.equal(s.replacementClose,'FAIL');if(s.replacementDeleteFailure!=='NONE')a.equal(s.replacementDelete,'FAILED');
 if(s.delete==='OWNED_REMOVED')a.equal(s.deleteFailure,'NONE');if(s.replacementDelete==='OWNED_REMOVED'){a.equal(s.replacementDeleteFailure,'NONE');a.equal(s.replacementDisposition,1);a.equal(s.replacementCreatorHandleIssued,true);}if(s.observe==='RESTORED')a.equal(s.observeFailure,'NONE');
 if(index<2){a.equal(s.oldOwnerRejection,'NOT_ATTEMPTED');a.equal(s.replacementDisposition,0);a.equal(s.replacementCreatorHandleIssued,false);a.equal(s.replacementDelete,'NOT_APPLICABLE');a.equal(s.replacementClose,'NOT_APPLICABLE');}
 if(s.oldOwnerRejected===true)a.equal(s.oldOwnerRejection,'RECEIPT_UNKNOWN');
 if(s.status==='NOT_RUN'){a.equal(s.failure,'NONE');a.equal(s.observedInjection,'NOT_OBSERVED');a.equal(s.receiptNodes,0);a.equal(s.prestateKnown,false);a.equal(s.prestateAbsent,false);for(const k of ['oldOwnerRejected','replacementPreserved'])a.equal(s[k],null);a.equal(s.oldOwnerRejection,'NOT_ATTEMPTED');a.equal(s.temporaryClose,'NOT_ATTEMPTED');a.equal(s.delete,'NOT_ATTEMPTED');a.equal(s.close,'NOT_ATTEMPTED');a.equal(s.observe,'NOT_ATTEMPTED');a.equal(s.replacementDelete,index===2?'NOT_ATTEMPTED':'NOT_APPLICABLE');a.equal(s.replacementClose,index===2?'NOT_ATTEMPTED':'NOT_APPLICABLE');a.equal(s.replacementDisposition,0);a.equal(s.replacementCreatorHandleIssued,false);for(const k of ['deleteFailure','closeFailure','observeFailure','replacementDeleteFailure','replacementCloseFailure'])a.equal(s[k],'NONE');}
 if(s.status==='FAIL')a.notEqual(s.failure,'NONE');
}
function passed(s,index){
 a.equal(s.status,'PASS');a.equal(s.observedInjection,OBSERVED[index]);a.equal(s.failure,'NONE');a.equal(s.prestateKnown,true);a.equal(s.prestateAbsent,true);a.equal(s.receiptNodes,index===0?2:1);
 for(const n of s.nodes){a.equal(n.prestateKnown,true);a.equal(n.prestateAbsent,true);a.equal(n.disposition,1);a.equal(n.creatorHandleIssued,true);a.equal(n.poststateKnown,true);a.equal(n.poststateAbsent,true);a.equal(n.restored,true);}
 a.equal(s.temporaryClose,'PASS');a.equal(s.close,'PASS');a.equal(s.observe,'RESTORED');for(const k of ['deleteFailure','closeFailure','observeFailure','replacementDeleteFailure','replacementCloseFailure'])a.equal(s[k],'NONE');
 if(index<2){a.equal(s.delete,'OWNED_REMOVED');a.equal(s.oldOwnerRejected,null);a.equal(s.oldOwnerRejection,'NOT_ATTEMPTED');a.equal(s.replacementPreserved,null);a.equal(s.replacementDelete,'NOT_APPLICABLE');a.equal(s.replacementClose,'NOT_APPLICABLE');}
 else{a.equal(s.delete,'OWNED_REMOVED');a.equal(s.oldOwnerRejected,true);a.equal(s.oldOwnerRejection,'RECEIPT_UNKNOWN');a.equal(s.replacementPreserved,true);a.equal(s.replacementDisposition,1);a.equal(s.replacementCreatorHandleIssued,true);a.equal(s.replacementDelete,'OWNED_REMOVED');a.equal(s.replacementClose,'PASS');}
}
function validate(value,expected){
 exact(expected,['sourceCommit','controlCommit','runId','attempt','job']);a.match(expected.sourceCommit,HEX);a.match(expected.controlCommit,HEX);a.match(expected.runId,ID);a.equal(expected.attempt,1);a.equal(expected.job,'native_registry');
 exact(value,['schema','kind','status','qualification','sourceCommit','controlCommit','runId','attempt','job','firstFailure','scenarios']);
 a.equal(value.schema,1);a.equal(value.kind,'FRESH_NATIVE_REGISTRY_RECOVERY');a.equal(value.qualification,'NATIVE_RECOVERY_ONLY_NOT_INSTALLATION_ACCEPTANCE');
 for(const key of ['sourceCommit','controlCommit','runId','attempt','job'])a.equal(value[key],expected[key]);
 oneOf(value.status,['PASS','FAIL']);oneOf(value.firstFailure,FAILURES);a.ok(Array.isArray(value.scenarios));a.equal(value.scenarios.length,3);
 for(const [index,s] of value.scenarios.entries())safeScenario(s,index);
 const failed=value.scenarios.findIndex(s=>s.status==='FAIL');
 if(value.status==='PASS'){a.equal(value.firstFailure,'NONE');a.equal(failed,-1);for(const [index,s] of value.scenarios.entries())passed(s,index);}
 else if(failed>=0){a.equal(value.firstFailure,value.scenarios[failed].failure);for(let i=0;i<failed;i++)passed(value.scenarios[i],i);for(let i=failed+1;i<3;i++)a.equal(value.scenarios[i].status,'NOT_RUN');}
 else{a.equal(value.firstFailure,'RANDOM_ROOT_UNPROVEN');for(const s of value.scenarios)a.equal(s.status,'NOT_RUN');}
 return value;
}
module.exports={validate,IDS,INJECTIONS,OBSERVED,FAILURES};
if(require.main===module){
 try{
  const fs=require('node:fs');a.equal(process.argv.length,3);const raw=fs.readFileSync(process.argv[2]);a.ok(raw.length>0&&raw.length<=64*1024);
  const value=JSON.parse(raw);const expected={sourceCommit:process.env.KSESSION_NATIVE_SOURCE,controlCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:Number(process.env.GITHUB_RUN_ATTEMPT),job:process.env.GITHUB_JOB};
  const result=validate(value,expected);process.stdout.write(JSON.stringify(result)+'\n');
 }catch{process.stderr.write('NATIVE_REPORT_INVALID\n');process.exitCode=1;}
}
