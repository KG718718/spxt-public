'use strict';
const assert=require('node:assert/strict');
const TOP='TestFreshFirewallBindingBeforeAnyMutation',PREFIX='FRESH_FIREWALL_SCENARIO_JSON=';
const SCENARIOS=Object.freeze(['exact-binding','guid-changed','ip-changed','prefix-changed','subnet-changed','missing-binding','public','unknown-virtual','unknown-hardware','unknown-hidden','route-unknown','read-failure']);
const PHASES=Object.freeze(['GO_START','PS_EXECUTION','TIMEOUT','ASSERTION','COMPLETE']);
const EXITS=Object.freeze(['START_FAILED','ZERO','NETWORK','BLOCKED','OTHER','TIMEOUT','GUARD_REJECTED']);
function validate(o){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),['scenario','phase','exitClass','mockVerified','requiredReadsObserved','mutationObserved','expectationMatched','pathProven'].sort());assert.ok(SCENARIOS.includes(o.scenario));assert.ok(PHASES.includes(o.phase));assert.ok(EXITS.includes(o.exitClass));for(const k of ['mockVerified','requiredReadsObserved','mutationObserved','expectationMatched','pathProven'])assert.ok(['GO_START','TIMEOUT'].includes(o.phase)?(typeof o[k]==='boolean'||o[k]==='UNKNOWN'):typeof o[k]==='boolean');if(o.phase==='COMPLETE'){for(const k of ['mockVerified','requiredReadsObserved','expectationMatched','pathProven'])assert.equal(o[k],true);assert.equal(o.mutationObserved,o.scenario==='exact-binding');assert.equal(o.exitClass,o.scenario==='exact-binding'?'ZERO':o.scenario==='read-failure'?'BLOCKED':'NETWORK');}return o;}
function observations(events){const out=new Map();for(const e of events){if(typeof e.Output!=='string'||!e.Output.includes(PREFIX))continue;const text=e.Output.slice(e.Output.indexOf(PREFIX)+PREFIX.length).trim();assert.ok(text.length<=2048);const o=validate(JSON.parse(text));assert.equal(e.Test,TOP+'/'+o.scenario);assert.equal(out.has(o.scenario),false);out.set(o.scenario,o);}return out;}
function failureCode(o){validate(o);assert.notEqual(o.phase,'COMPLETE');return'GO_FRESH_SCENARIO_FAILED_'+o.scenario+'_'+o.phase+'_'+o.exitClass;}
const BOOLS=Object.freeze(['mockVerified','requiredReadsObserved','mutationObserved','expectationMatched','pathProven']);
function diagnosticRows(observed){return SCENARIOS.map(name=>{
 const input=observed.get(name);if(!input)return{scenario:name,phase:'UNKNOWN',exitClass:'UNKNOWN',...Object.fromEntries(BOOLS.map(k=>[k,'UNKNOWN']))};
 const out={...input};if(out.phase==='GO_START')for(const k of BOOLS)out[k]='UNKNOWN';
 if(out.phase==='TIMEOUT')for(const k of BOOLS)if(['expectationMatched','pathProven'].includes(k)||out[k]!==true)out[k]='UNKNOWN';
 return out;
});}
function validateDiagnosticRows(rows){
 assert.ok(Array.isArray(rows));assert.equal(rows.length,12);
 rows.forEach((o,i)=>{
  assert.equal(o.scenario,SCENARIOS[i]);assert.deepEqual(Object.keys(o).sort(),['scenario','phase','exitClass',...BOOLS].sort());
  if(o.phase==='UNKNOWN'){assert.equal(o.exitClass,'UNKNOWN');for(const k of BOOLS)assert.equal(o[k],'UNKNOWN');}
  else if(['GO_START','TIMEOUT'].includes(o.phase)){
   assert.equal(o.exitClass,o.phase==='GO_START'?'START_FAILED':'TIMEOUT');
   for(const k of BOOLS)assert.ok(o.phase==='TIMEOUT'&&['mockVerified','requiredReadsObserved','mutationObserved'].includes(k)?[true,'UNKNOWN'].includes(o[k]):o[k]==='UNKNOWN');
  }else validate(o);
 });return rows;
}
module.exports={TOP,PREFIX,SCENARIOS,PHASES,EXITS,BOOLS,validate,observations,failureCode,diagnosticRows,validateDiagnosticRows};
