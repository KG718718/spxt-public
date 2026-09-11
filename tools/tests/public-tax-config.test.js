'use strict';
const assert=require('node:assert/strict');
const {validateTaxRate,taxRateForCalculation,taxConfigurationForResponse}=require('../../tax-config');
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const mustReject=(input)=>assert.throws(()=>taxRateForCalculation(input),e=>e.code==='TAX_NOT_CONFIGURED'||e.code==='TAX_INVALID');
test('new installation has no tax default',()=>assert.deepEqual(taxConfigurationForResponse({}),{taxRate:null,taxRateConfigured:false}));
test('missing config cannot calculate',()=>mustReject(undefined));
test('missing tax field cannot calculate',()=>mustReject({}));
test('inherited rate is not configuration',()=>mustReject(Object.create({taxRate:0.02})));
test('explicit zero is usable',()=>assert.equal(taxRateForCalculation({taxRate:0}),0));
test('explicit synthetic two percent is usable',()=>assert.equal(taxRateForCalculation({taxRate:0.02}),0.02));
for(const value of [null,undefined,'','0.02',false,true,NaN,Infinity,-Infinity,-0.01,[],{}]){
    test('reject invalid rate '+String(value),()=>assert.throws(()=>validateTaxRate(value),e=>e.code==='TAX_INVALID'));
}
test('malformed config object rejects',()=>mustReject([]));
test('configured response preserves explicit zero',()=>assert.deepEqual(taxConfigurationForResponse({taxRate:0}),{taxRate:0,taxRateConfigured:true}));
test('invalid existing value is not converted to zero',()=>assert.throws(()=>taxConfigurationForResponse({taxRate:null})));
test('read response excludes unrelated private settings',()=>assert.deepEqual(taxConfigurationForResponse({taxRate:0.02,secretFixture:'not-returned'}),{taxRate:0.02,taxRateConfigured:true}));
test('validators do not rewrite any object',()=>{const f={taxRate:0.02,nested:{id:'synthetic'}},s=JSON.stringify(f);taxRateForCalculation(f);taxConfigurationForResponse(f);assert.equal(JSON.stringify(f),s);});
test('existing nonnegative range is not narrowed silently',()=>assert.equal(validateTaxRate(1.2),1.2));
test('unchanged inclusive-tax formula with explicit rate',()=>{const rate=taxRateForCalculation({taxRate:0.02});assert.equal(102*rate/(1+rate),2);});
test('saved historical fields are not accepted as config writes',()=>{const history={taxRateSnapshot:0.03,taxAmount:3};const before=JSON.stringify(history);mustReject(history);assert.equal(JSON.stringify(history),before);});
console.log('Public tax configuration checks: '+checks+' passed');
