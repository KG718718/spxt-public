'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),expected=require('../lan-host/expected-go-tests.cjs').LAUNCHER;
const {validate}=require('./build-diagnostic.cjs');
function classify(raw,exit){
 const result=classification=>validate({stage:'LAUNCHER_UNIT_GO_JSON',classification,script:null,line:null});
 let events;try{assert.equal(typeof raw,'string');assert.ok(raw.length<=16*1024*1024);events=raw.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));assert.ok(events.length>0);for(const e of events){assert.ok(e&&typeof e==='object'&&!Array.isArray(e)&&['start','run','pause','cont','pass','bench','fail','output','skip','build-start','build-output','build-fail'].includes(e.Action));assert.ok(Object.keys(e).every(k=>['Time','Action','Package','Test','Elapsed','Output','OutputType','FailedBuild'].includes(k)));for(const k of ['Time','Package','Test','Output','OutputType','FailedBuild'])if(k in e)assert.equal(typeof e[k],'string');if('Elapsed'in e)assert.ok(Number.isFinite(e.Elapsed)&&e.Elapsed>=0);}}catch{return result('GO_JSON_INVALID');}
 const failed=events.filter(e=>e.Action==='fail'&&typeof e.Test==='string'),top=failed.filter(e=>!e.Test.includes('/'));
 if(failed.length){if(top.length===1&&expected.includes(top[0].Test)&&failed.every(e=>e.Test===top[0].Test||e.Test.startsWith(top[0].Test+'/')))return result('GO_TEST_FAILED_'+top[0].Test);return result('GO_TESTS_FAILED');}
 if(events.some(e=>e.Action==='build-fail'||(typeof e.FailedBuild==='string'&&e.FailedBuild!=='')))return result('GO_COMMAND_FAILED');
 if(events.some(e=>e.Action==='skip'))return result('GO_TESTS_SKIPPED');
 if(exit!==0)return result('GO_COMMAND_FAILED');
 if(events.some(e=>e.Action==='fail'&&!e.Test)||events.filter(e=>e.Action==='pass'&&!e.Test).length!==1)return result('GO_PACKAGE_FAILED');
 const passed=events.filter(e=>e.Action==='pass'&&typeof e.Test==='string'&&!e.Test.includes('/')).map(e=>e.Test);
 if(new Set(passed).size!==passed.length||JSON.stringify([...passed].sort())!==JSON.stringify([...expected].sort()))return result('GO_EXPECTED_SET_MISMATCH');
 return result('PASS');
}
module.exports={classify};
if(require.main===module){let diagnostic;try{assert.equal(process.argv.length,5);const exit=Number(process.argv[4]);assert.ok(Number.isInteger(exit));let raw;try{raw=fs.readFileSync(process.argv[2],'utf8');}catch(e){diagnostic={stage:'LAUNCHER_UNIT_GO_JSON',classification:e.code==='ENOENT'?'GO_JSON_MISSING':'GO_JSON_UNREADABLE',script:null,line:null};}if(raw!==undefined)diagnostic=classify(raw,exit);}catch{diagnostic={stage:'LAUNCHER_UNIT_GO_JSON',classification:'GO_JSON_INVALID',script:null,line:null};}fs.writeFileSync(process.argv[3],JSON.stringify(diagnostic)+'\n');process.exitCode=diagnostic.classification==='PASS'?0:1;}
