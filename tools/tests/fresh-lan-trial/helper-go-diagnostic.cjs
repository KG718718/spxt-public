'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ORIGINAL=require('../lan-host/expected-go-tests.cjs').FIREWALL;
const FRESH=Object.freeze(['TestFreshStrictBindingAndStandardSchemaIsolation','TestFreshFirewallBindingBeforeAnyMutation']);
const profiles=Object.freeze({ORIGINAL:{expected:ORIGINAL,stage:'HELPER_STANDARD_TESTS'},FRESH:{expected:FRESH,stage:'HELPER_FRESH_TESTS'},UNIT:{expected:ORIGINAL,stage:'HELPER_UNIT_GO_JSON'}});
function classify(raw,exit,kind){assert.ok(Object.hasOwn(profiles,kind));return require('./unit-diagnostic.cjs').classify(raw,exit,profiles[kind]);}
module.exports={ORIGINAL,FRESH,profiles,classify};
if(require.main===module){let d;const kind=process.argv[5];assert.equal(process.argv.length,6);assert.ok(Object.hasOwn(profiles,kind));try{const exit=Number(process.argv[4]);assert.ok(Number.isInteger(exit));d=classify(fs.readFileSync(process.argv[2],'utf8'),exit,kind);}catch(e){d={stage:profiles[kind].stage,classification:e.code==='ENOENT'?'GO_JSON_MISSING':e.code==='EACCES'||e.code==='EISDIR'?'GO_JSON_UNREADABLE':'GO_JSON_INVALID',script:null,line:null};}fs.writeFileSync(process.argv[3],JSON.stringify(d)+'\n');process.exitCode=d.classification==='PASS'?0:1;}
