'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{classify}=require('./unit-diagnostic.cjs'),{validate}=require('./build-diagnostic.cjs'),expected=require('../lan-host/expected-go-tests.cjs').LAUNCHER;
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const good=()=>[...expected.map(Test=>({Action:'pass',Test})),{Action:'pass'}],encode=events=>events.map(e=>JSON.stringify(e)).join('\n');
test('exact original 28 evidence requires zero exit, one package pass and no skip or failure',()=>{
 assert.equal(classify(encode(good()),0).classification,'PASS');
 for(const [events,exit,want] of [[good(),2,'GO_COMMAND_FAILED'],[[...good(),{Action:'skip',Test:expected[0]}],0,'GO_TESTS_SKIPPED'],[[...good(),{Action:'fail'}],0,'GO_PACKAGE_FAILED'],[good().slice(1),0,'GO_EXPECTED_SET_MISMATCH'],[[...good(),{Action:'pass',Test:expected[0]}],0,'GO_EXPECTED_SET_MISMATCH']])assert.equal(classify(encode(events),exit).classification,want);
 for(const raw of ['', '\ufeff'+encode(good()),'private path raw',encode([null])])assert.equal(classify(raw,1).classification,'GO_JSON_INVALID');
 for(const event of [{Action:'unknown',Output:'private'},{Action:'output',PID:1,path:'private'}])assert.equal(classify(encode([...good(),event]),0).classification,'GO_JSON_INVALID');
 assert.equal(classify(encode([...good(),{Action:'build-fail',FailedBuild:'synthetic-private-module'}]),0).classification,'GO_COMMAND_FAILED');
 assert.equal(classify(encode([...good(),{Action:'output',FailedBuild:'synthetic-private-module'}]),0).classification,'GO_COMMAND_FAILED');
});
test('only one actual fixed top-level failing test may be exposed, all raw or unknown names remain generic',()=>{
 for(const name of expected){const d=classify(encode([{Action:'fail',Test:name+'/synthetic'},{Action:'fail',Test:name},{Action:'fail',Output:'customer raw path'}]),1);assert.equal(d.classification,'GO_TEST_FAILED_'+name);assert.ok(!JSON.stringify(d).includes('customer'));}
 for(const failed of [[{Action:'fail',Test:'private path'}],[{Action:'fail',Test:expected[0]},{Action:'fail',Test:expected[1]}],[{Action:'fail',Test:expected[0]+'/private'}]])assert.equal(classify(encode(failed),1).classification,'GO_TESTS_FAILED');
 assert.throws(()=>validate({stage:'LAUNCHER_UNIT_GO_JSON',classification:'GO_TEST_FAILED_private path',script:null,line:null}));
});
test('actual diagnostic CLI preserves missing, unreadable, malformed and unknown evidence as fixed failures',()=>{
 const root=fs.mkdtempSync(path.resolve(__dirname,'../../../.test-work/fresh-unit-cli-')),script=path.join(__dirname,'unit-diagnostic.cjs');
 const valid=path.join(root,'valid.jsonl'),malformed=path.join(root,'private-raw.jsonl'),unknown=path.join(root,'unknown.jsonl');
 fs.writeFileSync(valid,encode(good()));fs.writeFileSync(malformed,'synthetic private raw path');fs.writeFileSync(unknown,encode([...good(),{Action:'unknown',Output:'private'}]));
 for(const [input,exit,classification] of [[valid,0,'PASS'],[valid,1,'GO_COMMAND_FAILED'],[path.join(root,'missing'),1,'GO_JSON_MISSING'],[root,1,'GO_JSON_UNREADABLE'],[malformed,1,'GO_JSON_INVALID'],[unknown,0,'GO_JSON_INVALID']]){
  const output=path.join(root,classification+'-'+exit+'.json');const r=cp.spawnSync(process.execPath,[script,input,output,String(exit)],{encoding:'utf8',windowsHide:true});assert.equal(r.status,classification==='PASS'?0:1);assert.equal(r.stdout+r.stderr,'');const d=JSON.parse(fs.readFileSync(output,'utf8'));validate(d);assert.equal(d.classification,classification);assert.ok(!JSON.stringify(d).includes('private'));
 }
});
