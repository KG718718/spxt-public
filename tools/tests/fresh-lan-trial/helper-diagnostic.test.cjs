'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {ORIGINAL,FRESH,classify}=require('./helper-go-diagnostic.cjs'),{validate}=require('./build-diagnostic.cjs');
const encode=names=>[...names.map(Test=>({Action:'pass',Test})),...(names===FRESH?require('./fresh-scenario-fixture.cjs').goodEvents():[]),{Action:'pass'}].map(e=>JSON.stringify(e)).join('\n');
test('helper original13/fresh2/unit13 keep independent exact sets and safe fixed failures',()=>{
 for(const [kind,names] of [['ORIGINAL',ORIGINAL],['FRESH',FRESH],['UNIT',ORIGINAL]]){
  assert.equal(classify(encode(names),0,kind).classification,'PASS');
  for(const name of names){const d=classify(JSON.stringify({Action:'fail',Test:name,Output:'private sentinel path'}),1,kind);assert.equal(d.classification,'GO_TEST_FAILED_'+name);assert.ok(!JSON.stringify(d).includes('sentinel'));}
  for(const [raw,exit,want] of [['',1,'GO_JSON_INVALID'],['private',1,'GO_JSON_INVALID'],[encode(names),1,'GO_COMMAND_FAILED'],[encode(names.slice(1)),0,'GO_EXPECTED_SET_MISMATCH'],[encode(names)+'\n'+JSON.stringify({Action:'build-fail'}),0,'GO_COMMAND_FAILED']])assert.equal(classify(raw,exit,kind).classification,want);
 }
 assert.throws(()=>validate({stage:'HELPER_FRESH_TESTS',classification:'GO_TEST_FAILED_'+ORIGINAL[0],script:null,line:null}));
});
test('actual helper diagnostic CLI preserves missing/invalid/nonzero without exposing private output',()=>{
 const root=fs.mkdtempSync(path.resolve(__dirname,'../../../.test-work/helper-diag-')),raw=path.join(root,'go.jsonl'),out=path.join(root,'fixed.json');fs.writeFileSync(raw,encode(ORIGINAL));
 for(const [input,exit,want] of [[raw,0,'PASS'],[raw,9,'GO_COMMAND_FAILED'],[path.join(root,'missing'),1,'GO_JSON_MISSING']]){const r=cp.spawnSync(process.execPath,[path.join(__dirname,'helper-go-diagnostic.cjs'),input,out,String(exit),'ORIGINAL'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,want==='PASS'?0:1);assert.equal(r.stdout+r.stderr,'');const d=JSON.parse(fs.readFileSync(out,'utf8'));validate(d);assert.equal(d.classification,want);}
});
test('helper reports COMPLETE only after actual identity writes; parent retains repeated helper gate and fixed environment',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../windows-firewall/build.ps1'),'utf8'),payload=fs.readFileSync(path.resolve(__dirname,'../../windows-installer/fresh-trial/build-payload.ps1'),'utf8');
 assert.ok(source.indexOf('function Complete-BuildIdentity')<source.indexOf('try {\n  Write-FreshStage')||source.indexOf('function Complete-BuildIdentity')<source.indexOf('try {\r\n  Write-FreshStage'));
 assert.ok(source.indexOf('  Complete-BuildIdentity')<source.indexOf("$taskReport.status='PASS'"));
 assert.ok(source.includes("Write-FreshStage 'HELPER_FRESH_TESTS'"));assert.ok(source.includes("Write-FreshStage 'HELPER_IDENTITY'"));
 assert.ok(payload.includes('-FreshBuildDiagnostic $BuildDiagnostic'));
 assert.ok(payload.includes("helper-go-diagnostic.cjs') $taskFirewallRaw $BuildDiagnostic $taskFirewallUnitExit UNIT"));
 assert.ok(payload.includes('Restore-KSessionProcessEnvironment $taskBuildSnapshot'));
});
