'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),expected=require('../lan-host/expected-go-tests.cjs').LAUNCHER;
const repo=path.resolve(__dirname,'../../..'),source=fs.readFileSync(path.join(repo,'tools/windows-installer/fresh-trial/build-payload.ps1'),'utf8');
const part=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const functions=part('function Build-Stage',"Build-Stage 'RUNTIME'")+part('function Run-Checked','function Get-Pinned');
const unit=part("Build-Stage 'LAUNCHER_UNIT'","Build-Stage 'PAYLOAD_ASSEMBLY'");
const quote=s=>"'"+s.replaceAll("'","''")+"'";
test('actual C2 parent unit source inherits polluted caller Go settings without touching the named global cache',()=>{
 const old=cp.execFileSync('git',['show','ca8302c32976645a83174d055dc22d1f620e5ea3:tools/windows-installer/fresh-trial/build-payload.ps1'],{cwd:repo,encoding:'utf8',windowsHide:true});
 const start=old.indexOf("Build-Stage 'LAUNCHER_UNIT'"),end=old.indexOf("Build-Stage 'PAYLOAD_ASSEMBLY'",start),oldUnit=old.slice(start,end);
 const work=fs.mkdtempSync(path.join(repo,'.test-work/fresh-unit-legacy-')),raw=path.join(work,'synthetic-go.jsonl'),stub=path.join(work,'go-stub.ps1'),runner=path.join(work,'runner.ps1'),observation=path.join(work,'observation.json');
 fs.writeFileSync(raw,[...expected.map(Test=>({Action:'pass',Test})),{Action:'pass'}].map(e=>JSON.stringify(e)).join('\n'));
 fs.writeFileSync(stub,`@{CGO=$env:CGO_ENABLED;Toolchain=$env:GOTOOLCHAIN;Flags=$env:GOFLAGS;InheritedCache=($env:GOCACHE -ceq 'C:\\unowned-synthetic-cache')}|ConvertTo-Json -Compress|Set-Content -LiteralPath ${quote(observation)} -Encoding utf8\nGet-Content -LiteralPath ${quote(raw)}\n$global:LASTEXITCODE=0\n`);
 fs.writeFileSync(runner,`$ErrorActionPreference='Stop';$taskRepo=${quote(repo)};$taskWork=${quote(work)};$taskNode=${quote(process.execPath)};$taskGo=${quote(stub)};$taskGoTestPolicy=Join-Path $taskRepo 'tools/tests/lan-host/expected-go-tests.cjs';$BuildDiagnostic=Join-Path $taskWork 'diagnostic.json';$env:CGO_ENABLED='1';$env:GOTOOLCHAIN='auto';$env:GOFLAGS='-tags=untrusted';$env:GOCACHE='C:\\unowned-synthetic-cache';${functions}\n${oldUnit}\n[Console]::WriteLine('LEGACY_UNIT_FINISHED')\n`);
 const result=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-File',runner],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(result.status,0);assert.ok(result.stdout.includes('LEGACY_UNIT_FINISHED'));
 assert.deepEqual(JSON.parse(fs.readFileSync(observation,'utf8')),{CGO:'1',Toolchain:'auto',Flags:'-tags=untrusted',InheritedCache:true});
});
test('actual parent unit block preserves strict report and fixed failure classifications through native pipeline',()=>{
 const root=fs.mkdtempSync(path.join(repo,'.test-work/fresh-unit-wiring-'));
 for(const mode of ['PASS','TEST_FAIL','MALFORMED','REPORT_CONFLICT','EXIT_THROW','RESTORE_FAIL']){
  const work=path.join(root,mode);fs.mkdirSync(work);const raw=path.join(work,'synthetic-go.jsonl'),stub=path.join(work,'go-stub.ps1'),runner=path.join(work,'runner.ps1'),diagnostic=path.join(work,'diagnostic.json');
  const events=expected.map(Test=>({Action:'pass',Test}));events.push({Action:'pass'});
  if(mode==='TEST_FAIL')events.push({Action:'fail',Test:expected[0],Output:'synthetic private path must never be emitted'});
  fs.writeFileSync(raw,mode==='MALFORMED'?'synthetic private raw\n':events.map(e=>JSON.stringify(e)).join('\n')+'\n');
  const observation=path.join(work,'environment-observation.json');
  fs.writeFileSync(stub,`$owned=${quote(fs.realpathSync.native(work))};@{CGO=$env:CGO_ENABLED;Toolchain=$env:GOTOOLCHAIN;Proxy=$env:GOPROXY;SumDB=$env:GOSUMDB;Flags=([string]$env:GOFLAGS);OwnedCache=$env:GOCACHE.StartsWith($owned+'\\candidate-launcher-unit-');OwnedTemp=$env:GOTMPDIR.StartsWith($owned+'\\candidate-launcher-unit-')}|ConvertTo-Json -Compress|Set-Content -LiteralPath ${quote(observation)} -Encoding utf8\nGet-Content -LiteralPath ${quote(raw)}\n$global:LASTEXITCODE=${['TEST_FAIL','MALFORMED'].includes(mode)?1:0}\n`);
  if(mode==='REPORT_CONFLICT')fs.writeFileSync(path.join(work,'launcher-unit-report.json'),'owned-sentinel');
  fs.writeFileSync(runner,`$ErrorActionPreference='Stop';$taskRepo=${quote(repo)};$taskWork=${quote(work)};$taskNode=${quote(process.execPath)};$taskGo=${quote(stub)};$taskGoTestPolicy=Join-Path $taskRepo 'tools/tests/lan-host/expected-go-tests.cjs';$BuildDiagnostic=${quote(diagnostic)};. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1');$env:CGO_ENABLED='1';$env:GOTOOLCHAIN='auto';$env:GOFLAGS='-tags=untrusted';$env:GOPROXY='https://synthetic.invalid';$env:GOSUMDB='synthetic.invalid';$env:GOCACHE='C:\\unowned-synthetic-cache';$env:GOTMPDIR='C:\\unowned-synthetic-temp';$before=Save-KSessionProcessEnvironment @('CGO_ENABLED','GOTOOLCHAIN','GOFLAGS','GOPROXY','GOSUMDB','GOCACHE','GOTMPDIR','TEMP','TMP');${functions}\ntry{${unit}\n$status='PASS'}catch{$status='FAIL'};$d=Get-Content -Raw -LiteralPath $BuildDiagnostic|ConvertFrom-Json;[Console]::WriteLine((@{status=$status;diagnostic=$d;restored=(Test-KSessionProcessEnvironmentRestored $before);reportPresent=(Test-Path -LiteralPath (Join-Path $taskWork 'launcher-unit-report.json'))}|ConvertTo-Json -Compress))\n`);
  if(mode==='EXIT_THROW'||mode==='RESTORE_FAIL'){
   let script=fs.readFileSync(runner,'utf8');const inject=mode==='EXIT_THROW'?"function Exit-KSessionLanCandidateTestEnvironment($State){throw 'synthetic exit failure'};":"$originalRestore=${function:Restore-KSessionProcessEnvironment};function Restore-KSessionProcessEnvironment($State){& $originalRestore $State;if($State.Names -contains 'CGO_ENABLED'){$env:CGO_ENABLED='synthetic-restoration-failure'}};";
   script=script.replace('try{'+unit,()=>inject+'try{'+unit);fs.writeFileSync(runner,script);
  }
  const result=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-File',runner],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(result.status,0);
  const actual=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(actual.status,mode==='PASS'?'PASS':'FAIL');assert.ok(!JSON.stringify(actual).includes('private'));
  assert.equal(actual.restored,mode!=='RESTORE_FAIL');const observed=JSON.parse(fs.readFileSync(observation,'utf8'));assert.deepEqual(observed,{CGO:'0',Toolchain:'local',Proxy:'off',SumDB:'off',Flags:'',OwnedCache:true,OwnedTemp:true});
  if(mode==='PASS'){assert.equal(actual.diagnostic.stage,'LAUNCHER_UNIT_REPORT');assert.equal(JSON.parse(fs.readFileSync(path.join(work,'launcher-unit-report.json'),'utf8')).pass,28);}
  if(mode==='TEST_FAIL'){assert.equal(actual.diagnostic.classification,'GO_TEST_FAILED_'+expected[0]);assert.equal(actual.reportPresent,false);}
  if(mode==='MALFORMED'){assert.equal(actual.diagnostic.classification,'GO_JSON_INVALID');assert.equal(actual.reportPresent,false);}
  if(mode==='REPORT_CONFLICT'){assert.equal(actual.diagnostic.stage,'LAUNCHER_UNIT_REPORT');assert.equal(actual.diagnostic.classification,'COMMAND_FAILED');assert.equal(fs.readFileSync(path.join(work,'launcher-unit-report.json'),'utf8'),'owned-sentinel');}
  if(mode==='RESTORE_FAIL'){assert.equal(actual.diagnostic.stage,'LAUNCHER_UNIT_ENVIRONMENT');assert.equal(actual.diagnostic.classification,'ENV_RESTORE_FAILED');}
 }
});
