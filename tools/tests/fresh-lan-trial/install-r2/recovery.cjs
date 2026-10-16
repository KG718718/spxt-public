'use strict';
const assert=require('node:assert/strict');
const KEYS=Object.freeze(['productRegistration','binding','startup','desktop','programs','programFiles','compilerOwnedFiles','compilerSettings','globalRegistry','rules']);
const STATES=Object.freeze(['NOT_OBSERVED','ABSENT_UNCHANGED','SNAPSHOT_UNCHANGED','OWNED_REMOVED','OWNED_PRESERVED','OWNERSHIP_UNKNOWN','EXTERNAL_CHANGED','STATE_CHANGED','OBSERVATION_FAILED']);
const RESTORED=Object.freeze(['ABSENT_UNCHANGED','SNAPSHOT_UNCHANGED','OWNED_REMOVED']);
function initial(){return Object.fromEntries(KEYS.map(k=>[k,'NOT_OBSERVED']));}
function validate(value,keys=KEYS){assert.deepEqual(Object.keys(value).sort(),[...keys].sort());for(const s of Object.values(value))assert.ok(STATES.includes(s));return value;}
function restored(value){validate(value);return Object.values(value).every(s=>RESTORED.includes(s));}
function decision({before,after,ownership,removed=false}){
 assert.ok(['ABSENT','SNAPSHOT','UNKNOWN'].includes(before));assert.ok(['ABSENT','UNCHANGED','PRESENT','CHANGED','UNKNOWN'].includes(after));assert.ok(['NONE','RECEIPT_VERIFIED','UNKNOWN'].includes(ownership));assert.equal(typeof removed,'boolean');
 if(removed&&ownership!=='RECEIPT_VERIFIED')return{state:'OWNERSHIP_UNKNOWN',mayDelete:false};
 if(before==='UNKNOWN'||after==='UNKNOWN')return{state:'OBSERVATION_FAILED',mayDelete:false};
 if(after==='CHANGED')return{state:'EXTERNAL_CHANGED',mayDelete:false};
 if(before==='ABSENT'&&after==='ABSENT')return{state:removed&&ownership==='RECEIPT_VERIFIED'?'OWNED_REMOVED':'ABSENT_UNCHANGED',mayDelete:false};
 if(before==='SNAPSHOT'&&after==='UNCHANGED'&&!removed)return{state:'SNAPSHOT_UNCHANGED',mayDelete:false};
 if(before==='ABSENT'&&after==='PRESENT'&&ownership==='RECEIPT_VERIFIED')return{state:'OWNED_PRESERVED',mayDelete:!removed};
 return{state:'OWNERSHIP_UNKNOWN',mayDelete:false};
}
module.exports={KEYS,STATES,RESTORED,initial,validate,restored,decision};
