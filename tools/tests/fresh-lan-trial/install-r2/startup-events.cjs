'use strict';
const assert=require('node:assert/strict'),STAGES=require('./startup-stages.cjs');
const VERIFY=Object.freeze(['VERIFY_DIRECTORY','VERIFY_ATTRIBUTES','VERIFY_EXPECTED_HASH','VERIFY_HASH','COM_INITIALIZE','COM_OPEN_LINK','TARGET_READ','TARGET_MATCH','ARGUMENTS_READ','ARGUMENTS_MATCH','WORKDIR_READ','WORKDIR_MATCH','MATCHED']);
const CREATE=Object.freeze(['CREATE_ENTER','CREATE_LINK','LINK_CREATED','CREATE_HASH','CREATE_MOVE','LINK_MOVED','INI_WRITE','INI_WRITTEN']);
const FAILURE_AT=Object.freeze({DIRECTORY_UNSAFE:'VERIFY_DIRECTORY',ATTRIBUTES_REJECTED:'VERIFY_ATTRIBUTES',EXPECTED_HASH_MISSING:'VERIFY_EXPECTED_HASH',HASH_MISMATCH:'VERIFY_HASH',TARGET_MISMATCH:'TARGET_READ',ARGUMENTS_MISMATCH:'ARGUMENTS_READ',WORKDIR_MISMATCH:'WORKDIR_READ',CREATE_PRECONDITION_REJECTED:'CREATE_ENTER',RETURN_NAME_MISMATCH:'LINK_CREATED',CREATE_HASH_MISSING:'CREATE_HASH',MOVE_REJECTED:'CREATE_MOVE',INI_WRITE_FAILED:'INI_WRITE',CLEANUP_DELETE_FAILED:'CLEANUP_ENTER',CLEANUP_IDENTITY_UNKNOWN:'CLEANUP_ENTER'});
const CONTEXTS=Object.freeze(['CREATE','INSTALL_VERIFY','CLEANUP','CLEANUP_VERIFY','UNINSTALL_VERIFY']);
const OWNER_FAILURE_AT=Object.freeze({OWNER_REJECTED:'OWNER_VERIFY_ENTER',MOVE_PROOF_FAILED:'LINK_MOVED'});
const TARGET_DETAILS=Object.freeze(['PATH_CHECK','TRUSTED_REFERENCE','FILE_IDENTITY','HASH','MAPPING','HANDLE_CLEANUP'].map(x=>'TARGET_DETAIL_'+x));
function analyze(events){
 assert.ok(Array.isArray(events)&&events.length<=128);const state=Object.fromEntries(CONTEXTS.map(k=>[k,{pos:0,last:null,terminal:false}]));let firstFailure=null;
 for(const event of events){assert.deepEqual(Object.keys(event).sort(),['context','stage']);const {context,stage}=event;assert.ok(CONTEXTS.includes(context));assert.ok(STAGES.includes(stage));const s=state[context];assert.equal(s.terminal,false,'terminal context cannot restart');
  if(context==='INSTALL_VERIFY')assert.ok(state.CREATE.pos>=6,'install verification follows owned move');
  if(context==='CLEANUP_VERIFY')assert.equal(state.CLEANUP.last,'CLEANUP_ENTER');
  const failed=Object.hasOwn(FAILURE_AT,stage)||Object.hasOwn(OWNER_FAILURE_AT,stage)||stage==='VERIFY_EXCEPTION';
  if(TARGET_DETAILS.includes(s.last))assert.equal(stage,'TARGET_MISMATCH','target detail requires the original terminal failure');
  if(failed){if(stage==='VERIFY_EXCEPTION'){assert.ok(context.endsWith('_VERIFY'));assert.ok(s.pos>0);}else if(stage==='TARGET_MISMATCH'){assert.ok(s.last==='TARGET_READ'||TARGET_DETAILS.includes(s.last));}else{assert.equal(s.last,FAILURE_AT[stage]??OWNER_FAILURE_AT[stage]);}if(stage==='OWNER_REJECTED')assert.equal(context,'CLEANUP_VERIFY');if(stage==='MOVE_PROOF_FAILED')assert.equal(context,'CREATE');if(stage==='CLEANUP_DELETE_FAILED')assert.ok(['MATCHED','OWNER_VERIFIED'].includes(state.CLEANUP_VERIFY.last));if(stage==='CLEANUP_IDENTITY_UNKNOWN'){assert.equal(state.CLEANUP_VERIFY.terminal,true);assert.ok(!['MATCHED','OWNER_VERIFIED'].includes(state.CLEANUP_VERIFY.last));}s.terminal=true;firstFailure??={context,stage};}
  else if(TARGET_DETAILS.includes(stage)){assert.ok(['INSTALL_VERIFY','CLEANUP_VERIFY'].includes(context));assert.equal(s.last,'TARGET_READ');}
  else if(context==='CLEANUP'){
   if(stage==='CLEANUP_ENTER'){assert.equal(s.pos,0);assert.ok(state.CREATE.pos>=6);}else{assert.equal(stage,'CLEANUP_REMOVED');assert.equal(s.last,'CLEANUP_ENTER');assert.ok(['MATCHED','OWNER_VERIFIED'].includes(state.CLEANUP_VERIFY.last));s.terminal=true;}s.pos++;
  }else if(context==='CLEANUP_VERIFY'&&(stage==='OWNER_VERIFY_ENTER'||stage==='OWNER_VERIFIED')){if(stage==='OWNER_VERIFY_ENTER'){assert.equal(s.pos,0);}else{assert.equal(s.last,'OWNER_VERIFY_ENTER');s.terminal=true;}s.pos++;
  }else{const sequence=context==='CREATE'?CREATE:VERIFY;assert.equal(stage,sequence[s.pos]);if(context==='CREATE'&&stage==='INI_WRITE')assert.equal(state.INSTALL_VERIFY.last,'MATCHED');s.pos++;if(s.pos===sequence.length)s.terminal=true;}
  s.last=stage;
 }
 return {firstFailure,installMatched:state.INSTALL_VERIFY.last==='MATCHED'&&state.CREATE.last==='INI_WRITTEN'&&!firstFailure,cleanupRemoved:state.CLEANUP.last==='CLEANUP_REMOVED'};
}
function validate(value){assert.deepEqual(Object.keys(value).sort(),['events','firstFailure']);const result=analyze(value.events);assert.deepEqual(value.firstFailure,result.firstFailure);return result;}
function fromEvents(events){return{events,firstFailure:analyze(events).firstFailure};}
module.exports={VERIFY,CREATE,CONTEXTS,TARGET_DETAILS,FAILURE_AT:Object.freeze({...FAILURE_AT,...OWNER_FAILURE_AT}),analyze,validate,fromEvents};
