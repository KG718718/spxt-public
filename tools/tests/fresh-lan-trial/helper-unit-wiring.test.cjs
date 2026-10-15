'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),names=require('../lan-host/expected-go-tests.cjs').FIREWALL;
const repo=path.resolve(__dirname,'../../..'),quote=s=>"'"+s.replaceAll("'","''")+"'";
test('actual old parent Helper13 inherits flags; new actual outer boundary fixes them and restores all state',()=>{
 const current=fs.readFileSync(path.join(repo,'tools/windows-installer/fresh-trial/build-payload.ps1'),'utf8').replace(/\r\n/g,'\n'),old=cp.execFileSync('git',['show','de6c2312a9a827f57808d63dc9ac9614f2c0aa33:tools/windows-installer/fresh-trial/build-payload.ps1'],{cwd:repo,encoding:'utf8',windowsHide:true}).replace(/\r\n/g,'\n');
 const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a))),root=fs.mkdtempSync(path.join(repo,'.test-work/helper-unit-counter-'));
 for(const [label,source] of [['OLD',old],['NEW',current]]){
  const work=path.join(root,label),raw=path.join(work,'go.jsonl'),go=path.join(work,'go.ps1'),observed=path.join(work,'observed.json'),runner=path.join(work,'run.ps1');fs.mkdirSync(work);
  fs.writeFileSync(raw,[...names.map(Test=>({Action:'pass',Test})),{Action:'pass'}].map(e=>JSON.stringify(e)).join('\n'));
  fs.writeFileSync(go,`@{CGO=$env:CGO_ENABLED;Flags=[string]$env:GOFLAGS;Workspace=$env:GOWORK;Toolchain=$env:GOTOOLCHAIN}|ConvertTo-Json -Compress|Set-Content -LiteralPath ${quote(observed)} -Encoding utf8;Get-Content -LiteralPath ${quote(raw)};$global:LASTEXITCODE=0\n`);
  const body=section(source,'$taskGoTestPolicy=','$taskHelperHash='),functions=section(source,'function Run-Checked','function Get-Pinned')+section(source,'function Build-Stage',"Build-Stage 'RUNTIME'");
  const prefix=label==='NEW'?section(current,'$taskBuildVariables=','if(!$GoRoot)'):'';
  const suffix=label==='NEW'?current.slice(current.lastIndexOf('}finally{\n  Restore-KSessionProcessEnvironment $taskBuildSnapshot')):'';
  assert.ok(label==='OLD'||(prefix.includes('try{')&&suffix.includes('Test-KSessionProcessEnvironmentRestored')));
  fs.writeFileSync(runner,`$ErrorActionPreference='Stop';$taskRepo=${quote(repo)};$taskWork=${quote(work)};$taskNode=${quote(process.execPath)};$taskGo=${quote(go)};$BuildDiagnostic=Join-Path $taskWork 'fixed.json';. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1');$env:CGO_ENABLED='1';$env:GOFLAGS='-tags=untrusted';$env:GOWORK='off';$env:GOTOOLCHAIN='auto';$env:TEMP=$taskWork;$env:TMP=$taskWork;$before=Save-KSessionProcessEnvironment @('CGO_ENABLED','GOFLAGS','GOWORK','GOTOOLCHAIN','KSESSION_FIREWALL_TEST_ROOT','TEMP','TMP','GOCACHE','GOTMPDIR');${require('./memory-stub-fixture.cjs').bridge()}${functions}\n${prefix}\n${body}\n${suffix}\n[Console]::WriteLine((@{restored=(Test-KSessionProcessEnvironmentRestored $before);pass=(Get-Content -Raw (Join-Path $taskWork 'firewall-unit-report.json')|ConvertFrom-Json).pass}|ConvertTo-Json -Compress))\n`);
  const r=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-File',runner],{encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(r.status,0,label);const final=JSON.parse(r.stdout.trim().split(/\r?\n/).at(-1));assert.equal(final.restored,true);assert.equal(final.pass,13);
  const actual=JSON.parse(fs.readFileSync(observed,'utf8'));assert.deepEqual(actual,label==='OLD'?{CGO:'1',Flags:'-tags=untrusted',Workspace:'off',Toolchain:'auto'}:{CGO:'0',Flags:'',Workspace:'off',Toolchain:'local'});
 }
});
