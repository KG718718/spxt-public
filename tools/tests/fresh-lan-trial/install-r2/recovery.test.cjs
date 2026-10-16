'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),p=require('./recovery.cjs');
for(const key of p.KEYS)test(key+' absence, owned removal, unknown/external failure stay independent',()=>{
 const row=p.initial();row[key]=p.decision({before:'ABSENT',after:'ABSENT',ownership:'NONE'}).state;assert.equal(row[key],'ABSENT_UNCHANGED');assert.equal(p.restored(row),false);
 for(const c of [{before:'UNKNOWN',after:'ABSENT',ownership:'NONE'},{before:'ABSENT',after:'PRESENT',ownership:'UNKNOWN'},{before:'ABSENT',after:'CHANGED',ownership:'RECEIPT_VERIFIED'},{before:'SNAPSHOT',after:'PRESENT',ownership:'RECEIPT_VERIFIED'}])assert.equal(p.decision(c).mayDelete,false);
 assert.deepEqual(p.decision({before:'ABSENT',after:'PRESENT',ownership:'RECEIPT_VERIFIED'}),{state:'OWNED_PRESERVED',mayDelete:true});assert.equal(p.decision({before:'ABSENT',after:'ABSENT',ownership:'RECEIPT_VERIFIED',removed:true}).state,'OWNED_REMOVED');
});
test('all restored requires every fixed observation and rejects raw additions',()=>{const r=Object.fromEntries(p.KEYS.map(k=>[k,'SNAPSHOT_UNCHANGED']));assert.equal(p.restored(r),true);for(const s of p.STATES.filter(s=>!p.RESTORED.includes(s))){r.startup=s;assert.equal(p.restored(r),false)}assert.throws(()=>p.validate({...p.initial(),path:'private'}));assert.throws(()=>p.validate({...p.initial(),startup:'true'}));});