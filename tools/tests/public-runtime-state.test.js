'use strict';
const assert=require('node:assert/strict');
const {runtimeState}=require('../../public-runtime-state');
const {newEmptyState}=require('../../public-startup');
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
check('new installation remains entirely empty',()=>assert.deepEqual(runtimeState(newEmptyState()),newEmptyState()));
check('missing counter follows saved maximum, not array length',()=>{
    const input={users:[],applications:[{id:'APP0099',taxAmount:18}],payments:[],extension:{a:1}};
    const before=JSON.stringify(input),state=runtimeState(input);
    assert.equal(state.nextAppId,100);assert.equal(state.applications[0].taxAmount,18);
    assert.deepEqual(state.extension,{a:1});assert.equal(JSON.stringify(input),before);
});
check('present colliding counter refuses upgrade without reset',()=>{
    const input={...newEmptyState(),applications:[{id:'APP0042'}]};
    assert.throws(()=>runtimeState(input),/counter conflicts/);
});
check('missing debt link counter follows saved identifier',()=>{
    const input={users:[],applications:[{id:'APP0001',debtLinks:[{id:'DEBTLINK00075'}]}],payments:[]};
    assert.equal(runtimeState(input).nextDebtLinkId,76);
});
check('unsafe large identifiers fail closed',()=>{
    assert.throws(()=>runtimeState({users:[],applications:[{id:'APP9999999999999999999'}],payments:[]}),/Unsafe/);
});
check('explicit saved counters remain unchanged',()=>{
    const input={...newEmptyState(),nextAppId:18};assert.deepEqual(runtimeState(input),input);
});
console.log('Public runtime state: '+count+' passed.');
