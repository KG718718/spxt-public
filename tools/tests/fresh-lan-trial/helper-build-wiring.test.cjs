'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {ORIGINAL,FRESH}=require('./helper-go-diagnostic.cjs'),{validate}=require('./build-diagnostic.cjs');
const repo=path.resolve(__dirname,'../../..'),quote=s=>"'"+s.replaceAll("'","''")+"'";
test('actual Helper builder retains safe stage on INPUT/ENV/13/overlay/2/compile/identity/restore failures',()=>{
 const root=fs.mkdtempSync(path.join(repo,'.test-work/helper-build-stub-'));
 for(const [mode,stage] of [['PASS','HELPER_COMPLETE'],['INPUT','HELPER_INPUT'],['ENV','HELPER_ENVIRONMENT'],['STD','HELPER_STANDARD_TESTS'],['OVERLAY','HELPER_FRESH_OVERLAY'],['FRESH','HELPER_FRESH_TESTS'],['COMPILE','HELPER_COMPILE'],['IDENTITY','HELPER_IDENTITY'],['RESTORE','HELPER_ENVIRONMENT']]){
  const work=path.join(root,mode),fixture=path.join(work,'builder'),output=path.join(work,'output'),fixed=path.join(work,'fixed.json'),legacy=path.join(work,'legacy.json'),go=path.join(work,'go.ps1'),node=path.join(work,'node.ps1');fs.mkdirSync(fixture,{recursive:true});
  fs.copyFileSync(path.join(repo,'tools/windows-firewall/build.ps1'),path.join(fixture,'build.ps1'));
  const memoryFixture=path.join(work,'tests/fresh-lan-trial');fs.mkdirSync(memoryFixture,{recursive:true});fs.writeFileSync(path.join(memoryFixture,'memory-process.ps1'),require('./memory-stub-fixture.cjs').bridge());
  const counter='TestFreshFirewallHarnessCannotMaskInfrastructureFailure';fs.writeFileSync(path.join(work,'COUNTER.jsonl'),[...['guid-changed_ADAPTER_ABORT','guid-changed_ROUTE_ABORT','unknown-virtual_ADAPTER_ABORT','guid-changed_MISSING_MOCK'].map(id=>({Action:'pass',Test:counter+'/'+id})),{Action:'pass',Test:counter},{Action:'pass'}].map(e=>JSON.stringify(e)).join('\n'));
  let environment=fs.readFileSync(path.join(repo,'tools/windows-firewall/test-environment.ps1'),'utf8');
  if(mode==='ENV')environment+="\nfunction Enter-KSessionFirewallTestEnvironment($p,$l){throw 'synthetic environment rejection'}\n";
  if(mode==='RESTORE')environment+="\nfunction Exit-KSessionFirewallTestEnvironment($s){throw 'synthetic restoration rejection'}\n";
  fs.writeFileSync(path.join(fixture,'test-environment.ps1'),environment);
  for(const [kind,names] of [['STD',ORIGINAL],['FRESH',FRESH]]){const failed=mode===kind;const events=names.map((Test,i)=>({Action:failed&&i===0?'fail':'pass',Test,Output:'synthetic private sentinel'}));if(kind==='FRESH'&&!failed)events.push(...require('./fresh-scenario-fixture.cjs').goodEvents());events.push({Action:failed?'fail':'pass'});fs.writeFileSync(path.join(work,kind+'.jsonl'),events.map(e=>JSON.stringify(e)).join('\n'));}
  fs.writeFileSync(node,`$name=[IO.Path]::GetFileName([string]$args[0]);if($name -eq 'prepare-policy-overlay.cjs' -and ${quote(mode)} -eq 'OVERLAY'){$global:LASTEXITCODE=8;return};$forward=@((Join-Path ${quote(path.join(repo,'tools/tests/fresh-lan-trial'))} $name)) + @($args|Select-Object -Skip 1);& ${quote(process.execPath)} @forward\n`);
  fs.writeFileSync(go,`if($args[0] -eq 'version'){'go version go1.27.1 windows/amd64';$global:LASTEXITCODE=0;return};if($args[0] -eq 'test'){$kind=if($args -contains '^TestFreshFirewallHarnessCannotMaskInfrastructureFailure$'){'COUNTER'}elseif($args -contains '-overlay'){'FRESH'}else{'STD'};Get-Content -LiteralPath (Join-Path ${quote(work)} ($kind+'.jsonl'));$global:LASTEXITCODE=if(${quote(mode)} -ceq $kind){1}else{0};return};if($args[0] -eq 'build'){if(${quote(mode)} -eq 'COMPILE'){$global:LASTEXITCODE=7;return};[IO.File]::WriteAllBytes(${quote(path.join(output,'K-SESSION-Firewall.exe'))},[byte[]](77,90,0,0));if(${quote(mode)} -eq 'IDENTITY'){New-Item -ItemType Directory -Path ${quote(path.join(output,'build-info.json'))}|Out-Null};$global:LASTEXITCODE=0;return};throw 'unexpected stub command'\n`);
  const r=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-File',path.join(fixture,'build.ps1'),'-OutputDir',output,'-SourceCommit','a'.repeat(40),'-RuntimeManifestSha256','b'.repeat(64),'-NodeSha256',mode==='INPUT'?'0'.repeat(64):'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32','-InstallerVersion','1.1.0-beta.4','-GoExe',go,'-DiagnosticReport',legacy,'-FreshTrial','-FreshBuildDiagnostic',fixed],{encoding:'utf8',windowsHide:true,timeout:20000,env:{...process.env,TEMP:work,TMP:work,GOWORK:'off',KSESSION_FRESH_BUILD_NODE:node}});
  const d=JSON.parse(fs.readFileSync(fixed,'utf8'));validate(d);assert.equal(d.stage,stage,mode);assert.equal(r.status===0,mode==='PASS',mode);assert.ok(!JSON.stringify(d).includes('sentinel'));
  if(mode==='PASS'){assert.equal(d.classification,'PASS');assert.equal(JSON.parse(fs.readFileSync(legacy,'utf8')).status,'PASS');}
  if(mode==='RESTORE'){assert.equal(d.classification,'ENV_RESTORE_FAILED');assert.equal(JSON.parse(fs.readFileSync(legacy,'utf8')).status,'FAIL');}
  if(mode==='IDENTITY')assert.equal(JSON.parse(fs.readFileSync(legacy,'utf8')).status,'FAIL');
 }
 // Stub EXEs above are deliberately invalid bytes; no product is executed or
 // these fixtures used as actual build/identity evidence.
});
