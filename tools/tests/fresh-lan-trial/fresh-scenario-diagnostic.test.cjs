'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const schema=require('./fresh-scenario-diagnostic.cjs'),{goodEvents,goodObservation}=require('./fresh-scenario-fixture.cjs'),{classify,FRESH}=require('./helper-go-diagnostic.cjs');
const {validate}=require('./build-diagnostic.cjs');
const encode=events=>events.map(e=>JSON.stringify(e)).join('\n');
const pass=()=>[...goodEvents(),...FRESH.map(Test=>({Action:'pass',Test})),{Action:'pass'}];
function failed(scenario,phase,include=true,exitClass){const o={...goodObservation(scenario),phase,expectationMatched:false,pathProven:false};if(phase==='TIMEOUT')o.exitClass='TIMEOUT';if(phase==='GO_START')o.exitClass='START_FAILED';if(exitClass)o.exitClass=exitClass;return[...(include?[{Action:'output',Test:schema.TOP+'/'+scenario,Output:schema.PREFIX+JSON.stringify(o)}]:[]),{Action:'fail',Test:schema.TOP+'/'+scenario},{Action:'fail',Test:schema.TOP},{Action:'fail'}];}
test('fixed scenario evidence covers all12 and cannot pass missing, malformed, contradictory or sensitive data',()=>{
 assert.equal(classify(encode(pass()),0,'FRESH').classification,'PASS');assert.notEqual(classify(encode([...FRESH.map(Test=>({Action:'pass',Test})),{Action:'pass'}]),0,'FRESH').classification,'PASS');
 for(const o of [{...goodObservation('guid-changed'),raw:'private'}, {...goodObservation('guid-changed'),scenario:'private path'}, {...goodObservation('guid-changed'),mutationObserved:true}]){const events=pass();events[0]={Action:'output',Test:schema.TOP+'/guid-changed',Output:schema.PREFIX+JSON.stringify(o)};assert.equal(classify(encode(events),0,'FRESH').classification,'GO_JSON_INVALID');}
 for(const child of ['unknown','guid-changed'])assert.equal(classify(encode([...pass(),{Action:'pass',Test:schema.TOP+'/'+child}]),0,'FRESH').classification,'GO_JSON_INVALID');
 assert.throws(()=>require('./build-diagnostic.cjs').validate({stage:'HELPER_FRESH_TESTS',classification:'GO_FRESH_SCENARIO_FAILED_guid-changed_COMPLETE',script:null,line:null}));
});
test('actual diagnostic CLI preserves known scene/phase and UNKNOWN before observation without raw output',()=>{
 const root=fs.mkdtempSync(path.resolve(__dirname,'../../../.test-work/r2-scene-diag-')),cli=path.join(__dirname,'helper-go-diagnostic.cjs');
 for(const [name,events,want] of [['start',failed('exact-binding','GO_START'),'GO_FRESH_SCENARIO_FAILED_exact-binding_GO_START_START_FAILED'],['timeout',failed('exact-binding','TIMEOUT'),'GO_FRESH_SCENARIO_FAILED_exact-binding_TIMEOUT_TIMEOUT'],['assertion',failed('guid-changed','ASSERTION'),'GO_FRESH_SCENARIO_FAILED_guid-changed_ASSERTION_NETWORK'],['rejected23',failed('exact-binding','ASSERTION',true,'NETWORK'),'GO_FRESH_SCENARIO_FAILED_exact-binding_ASSERTION_NETWORK'],['rejected25',failed('exact-binding','ASSERTION',true,'BLOCKED'),'GO_FRESH_SCENARIO_FAILED_exact-binding_ASSERTION_BLOCKED'],['wrongexit',failed('exact-binding','PS_EXECUTION',true,'OTHER'),'GO_FRESH_SCENARIO_FAILED_exact-binding_PS_EXECUTION_OTHER'],['missing',failed('guid-changed','ASSERTION',false),'GO_FRESH_SCENARIO_FAILED_guid-changed_UNKNOWN_UNKNOWN'],['unknown',[{Action:'fail',Test:schema.TOP+'/private path'},{Action:'fail',Test:schema.TOP}],'GO_JSON_INVALID']]){
  const raw=path.join(root,name+'.jsonl'),out=path.join(root,name+'.json');fs.writeFileSync(raw,encode(events));const result=cp.spawnSync(process.execPath,[cli,raw,out,'1','FRESH'],{encoding:'utf8',windowsHide:true});assert.equal(result.status,1);assert.equal(result.stdout+result.stderr,'');const d=JSON.parse(fs.readFileSync(out,'utf8'));require('./build-diagnostic.cjs').validate(d);assert.equal(d.classification,want);assert.ok(!JSON.stringify(d).includes('private'));
 }
});
test('test-only boundary covers every production Net command and retains original timeout/explicit child environment',()=>{
 const repo=path.resolve(__dirname,'../../..'),production=fs.readFileSync(path.join(repo,'tools/windows-firewall/firewall_windows.go'),'utf8'),target=fs.readFileSync(path.join(repo,'tools/tests/fresh-lan-trial/fresh_behavior_windows_test.go.in'),'utf8');
 const commands=[...new Set(production.match(/\b(?:Get|Set|New|Remove)-Net[A-Za-z]+/g))];for(const name of commands)assert.ok(target.includes("'"+name+"'"),name);assert.ok(target.includes('20*time.Second')||target.includes('20 * time.Second'));assert.ok(target.includes('cmd.Env = []string'));assert.ok(target.includes('mockItem.ScriptBlock.File'));assert.doesNotMatch(target,/%s.*output/);
});
function multipleFailure(names,withTimeout){
 const rows=names.flatMap(scenario=>{
  const o={scenario,phase:'TIMEOUT',exitClass:'TIMEOUT',...Object.fromEntries(schema.BOOLS.map(k=>[k,'UNKNOWN']))};
  return [...(withTimeout?[{Action:'output',Test:schema.TOP+'/'+scenario,Output:schema.PREFIX+JSON.stringify(o)}]:[]),{Action:'fail',Test:schema.TOP+'/'+scenario}];
 });return [...rows,{Action:'fail',Test:schema.TOP},{Action:'fail'}];
}
test('all12 timeouts retain fixed all12 evidence and never become single-parent-only failure',()=>{
 const d=classify(encode(multipleFailure(schema.SCENARIOS,true)),1,'FRESH');validate(d);
 assert.equal(d.classification,'GO_FRESH_SCENARIOS_FAILED_MULTIPLE');assert.deepEqual(d.failedScenarios,schema.SCENARIOS);assert.equal(d.scenarios.length,12);
 for(const row of d.scenarios){assert.equal(row.phase,'TIMEOUT');assert.equal(row.exitClass,'TIMEOUT');for(const k of schema.BOOLS)assert.equal(row[k],'UNKNOWN');}
});
test('multiple UNKNOWN failures are explicit and reject duplicate sensitive or contradictory evidence',()=>{
 const names=schema.SCENARIOS.slice(0,2),d=classify(encode(multipleFailure(names,false)),1,'FRESH');validate(d);assert.deepEqual(d.failedScenarios,names);
 for(const row of d.scenarios){assert.equal(row.phase,'UNKNOWN');assert.equal(row.exitClass,'UNKNOWN');for(const k of schema.BOOLS)assert.equal(row[k],'UNKNOWN');}
 for(const change of [r=>r.failedScenarios.push(r.failedScenarios[0]),r=>r.scenarios[0].raw='private',r=>r.scenarios.pop(),r=>r.failedScenarios.push('unknown'),r=>r.stage='ISCC']){const bad=structuredClone(d);change(bad);assert.throws(()=>validate(bad));}
 const complete=goodObservation(names[0]);const contradictory=[{Action:'output',Test:schema.TOP+'/'+names[0],Output:schema.PREFIX+JSON.stringify(complete)},...multipleFailure(names,false)];assert.equal(classify(encode(contradictory),1,'FRESH').classification,'GO_JSON_INVALID');
});
test('multi evidence survives actual stdin CLI outer failure and cleanup-stage writers without raw files',()=>{
 const repo=path.resolve(__dirname,'../../..'),root=fs.mkdtempSync(path.join(repo,'.test-work/fast-multi-')),file=path.join(root,'fixed.json');
 const cli=cp.spawnSync(process.execPath,[path.join(__dirname,'helper-go-diagnostic.cjs'),'-',file,'1','FRESH'],{input:encode(multipleFailure(schema.SCENARIOS,true)),encoding:'utf8',windowsHide:true});assert.equal(cli.status,1);assert.equal(cli.stdout+cli.stderr,'');
 const d=JSON.parse(fs.readFileSync(file,'utf8'));validate(d);
 const r=require('./recovery-r1/fixtures.cjs').trialPass();r.status='FAIL';r.stage='BUILD';r.reason='BUILD_PORTABLE_FAILED';r.buildDiagnostic=d;
 const expected={sourceCommit:r.sourceCommit,controlCommit:r.controlCommit,run:r.run,mode:'CANDIDATE'};
 require('./report.cjs').validate(r,expected);const completion={schema:1,sourceCommit:r.sourceCommit,controlCommit:r.controlCommit,run:r.run,mode:r.mode,checksComplete:false,actualFailure:true};
 const final=require('./finalize.cjs').finish(r,completion,r.cleanup,expected,true);assert.equal(final.status,'FAIL');assert.deepEqual(final.buildDiagnostic,d);
 for(const [source,from,to,invoke]of [['tools/windows-firewall/build.ps1','function Write-FreshStage','function Write-FreshGoResult',"Write-FreshStage 'HELPER_ENVIRONMENT' 'ENV_RESTORE_FAILED'"],['tools/windows-installer/fresh-trial/build-payload.ps1','function Build-Stage',"Build-Stage 'RUNTIME'","Build-Stage 'BUILD_ENVIRONMENT'"]]){
  const text=fs.readFileSync(path.join(repo,source),'utf8'),body=text.slice(text.indexOf(from),text.indexOf(to,text.indexOf(from))),q=s=>"'"+s.replaceAll("'","''")+"'";
  const script="$ErrorActionPreference='Stop';$FreshTrial=$true;$FreshBuildDiagnostic="+q(file)+";$BuildDiagnostic="+q(file)+';'+body+';'+invoke;
  const p=cp.spawnSync('pwsh',['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(p.status,0);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),d);
 }
 assert.deepEqual(fs.readdirSync(root),['fixed.json']);
});
