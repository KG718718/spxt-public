'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),stages=require('./startup-stages.cjs'),contexts=require('./startup-events.cjs').CONTEXTS;
const NAMES=['baseline','missing_hash','wrong_hash','missing_link','directory_link','target_change','args_change','workdir_change','preexisting_refused','ini_failure_cleanup','cleanup_matches','cleanup_changed_preserved','move_no_overwrite','locked_cleanup_preserved'];
const NEGATIVE={missing_hash:'EXPECTED_HASH_MISSING',wrong_hash:'HASH_MISMATCH',missing_link:'ATTRIBUTES_REJECTED',directory_link:'ATTRIBUTES_REJECTED',target_change:'TARGET_MISMATCH',args_change:'ARGUMENTS_MISMATCH',workdir_change:'WORKDIR_MISMATCH'};
function proof(c){
 const last=(context,stage)=>c.lastContext===context&&c.lastStage===stage,first=(context,stage)=>c.firstFailureContext===context&&c.firstFailureStage===stage;
 if(Object.hasOwn(NEGATIVE,c.case))return last('INSTALL_VERIFY',NEGATIVE[c.case])&&first('INSTALL_VERIFY',NEGATIVE[c.case])&&c.cleanupFailureStage==='';
 switch(c.case){
 case'baseline':case'move_no_overwrite':return last('INSTALL_VERIFY','MATCHED')&&first('','')&&c.cleanupFailureStage===''&&(c.case!=='move_no_overwrite'||c.nativeMove==='EXISTS_REJECTED');
 case'preexisting_refused':return last('CREATE','CREATE_PRECONDITION_REJECTED')&&first('CREATE','CREATE_PRECONDITION_REJECTED')&&c.cleanupFailureStage==='';
 case'ini_failure_cleanup':return last('CLEANUP','CLEANUP_REMOVED')&&first('CREATE','INI_WRITE_FAILED')&&c.cleanupFailureStage==='';
 case'cleanup_matches':return last('CLEANUP','CLEANUP_REMOVED')&&first('','')&&c.cleanupFailureStage==='';
 case'cleanup_changed_preserved':return last('CLEANUP','CLEANUP_IDENTITY_UNKNOWN')&&first('INSTALL_VERIFY','HASH_MISMATCH')&&c.cleanupFailureStage==='HASH_MISMATCH';
 case'locked_cleanup_preserved':return last('CLEANUP','CLEANUP_DELETE_FAILED')&&first('CLEANUP','CLEANUP_DELETE_FAILED')&&c.cleanupFailureStage==='';
 default:return false;
 }
}
function facts(c){const expected={created:c.case!=='preexisting_refused'&&c.case!=='ini_failure_cleanup',matched:['baseline','cleanup_matches','move_no_overwrite','locked_cleanup_preserved'].includes(c.case),removed:['ini_failure_cleanup','cleanup_matches'].includes(c.case),preserved:['preexisting_refused','cleanup_changed_preserved','move_no_overwrite','locked_cleanup_preserved'].includes(c.case)};return Object.entries(expected).every(([k,v])=>c[k]===v);}
function validate(r){
 assert.deepEqual(Object.keys(r).sort(),['allPassed','cases','kind','schema']);assert.equal(r.schema,1);assert.equal(r.kind,'OWNED_INNO_COM_MATRIX');assert.equal(typeof r.allPassed,'boolean');assert.deepEqual(r.cases.map(c=>c.case),NAMES);
 for(const c of r.cases){assert.deepEqual(Object.keys(c).sort(),['case','pass','created','matched','removed','preserved','reasonProven','nativeMove','lastContext','lastStage','firstFailureContext','firstFailureStage','cleanupFailureStage'].sort());for(const k of ['pass','created','matched','removed','preserved','reasonProven'])assert.equal(typeof c[k],'boolean');for(const k of ['lastContext','firstFailureContext'])assert.ok(c[k]===''||contexts.includes(c[k]));for(const k of ['lastStage','firstFailureStage','cleanupFailureStage'])assert.ok(c[k]===''||stages.includes(c[k]));assert.ok(['NOT_CALLED','EXISTS_REJECTED','UNKNOWN'].includes(c.nativeMove));if(c.case!=='move_no_overwrite')assert.equal(c.nativeMove,'NOT_CALLED');assert.equal(c.reasonProven,proof(c));assert.equal(c.pass,proof(c)&&facts(c));}
 assert.equal(r.allPassed,r.cases.every(c=>c.pass));return r;
}
module.exports={NAMES,NEGATIVE,proof,facts,validate};if(require.main===module){try{validate(JSON.parse(fs.readFileSync(process.argv[2])))}catch{process.stderr.write('OWNED_MATRIX_INVALID\n');process.exitCode=1;}}