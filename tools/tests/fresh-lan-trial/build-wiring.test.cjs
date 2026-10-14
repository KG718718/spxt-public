'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {json}=require('./shell-protocol.cjs'),{validate}=require('./build-diagnostic.cjs');
const repo=path.resolve(__dirname,'../../..'),launcher=fs.readFileSync(path.join(repo,'tools/windows-launcher/build.ps1'),'utf8'),payload=fs.readFileSync(path.join(repo,'tools/windows-installer/fresh-trial/build-payload.ps1'),'utf8');

test('actual fresh scratch branch converts simulated SUBST to physical test paths; standard retains its prior paths',()=>{
 const begin=launcher.indexOf('if($FreshTrial){',launcher.indexOf("$taskScratch=Join-Path"));
 const end=launcher.indexOf("$env:GOPROXY='off'",begin);
 // Replace only the dot-source with a mock resolver: no drive mapping or host
 // filesystem operation is performed. Execute the actual environment assignments.
 const block=launcher.slice(begin,end).replace(/\. \(Join-Path \$PSScriptRoot [^\r\n]+/,'');
 const result=json(`function Resolve-KSessionFirewallPhysicalPath([string]$p){if($p -cne 'E:\\owned\\launcher-build-cache'){throw 'unexpected resolver input'};return 'C:\\private\\owned\\launcher-build-cache'};$rows=@();foreach($fresh in @($false,$true)){$FreshTrial=$fresh;$taskScratch='E:\\owned\\launcher-build-cache';$env:GOCACHE=Join-Path $taskScratch 'go-cache';$env:GOTMPDIR=Join-Path $taskScratch 'go-temp';${block};$rows+=@{fresh=$fresh;temp=$env:TEMP;tmp=$env:TMP;go=$env:GOTMPDIR;cache=$env:GOCACHE}};$rows|ConvertTo-Json -Compress`);
 assert.equal(result[0].temp,'E:\\owned\\launcher-build-cache\\go-temp');
 assert.equal(result[1].temp,'C:\\private\\owned\\launcher-build-cache\\go-temp');
 for(const row of result){assert.equal(row.temp,row.tmp);assert.equal(row.temp,row.go);assert.ok(row.cache.endsWith('go-cache'));}
 assert.equal(launcher.includes("Fresh-Build-Stage 'LAUNCHER_STANDARD_TESTS'"),true);
 assert.equal(launcher.includes("Fresh-Build-Stage 'LAUNCHER_FRESH_TESTS'"),true);
});

test('native pwsh File switch passes actual true and false to child without string truthiness',()=>{
 const dir=fs.mkdtempSync(path.join(repo,'.test-work','fresh-switch-')),file=path.join(dir,'switch.ps1');
 fs.writeFileSync(file,'param([switch]$FreshTrial)\n[Console]::WriteLine(($FreshTrial.IsPresent|ConvertTo-Json -Compress))\n');
 for(const value of ['True','False']){const r=cp.spawnSync('pwsh',['-NoLogo','-NoProfile','-File',file,'-FreshTrial:$'+value],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);assert.equal(r.stderr.trim(),'');assert.equal(JSON.parse(r.stdout),value==='True');}
});

test('later build command failures retain distinct fixed phases with no raw diagnostics',()=>{
 const stages=['LAUNCHER_IDENTITY','LAUNCHER_STANDARD_TESTS','LAUNCHER_FRESH_TESTS','LAUNCHER_COMPILE','LAUNCHER_UNIT','PAYLOAD_ASSEMBLY','LAN_NODE','PAYLOAD_REPORT'];
 for(const stage of stages){assert.ok((launcher+payload).includes("-Stage '"+stage+"'")||payload.includes("Build-Stage '"+stage+"'"));const d={stage,classification:'COMMAND_FAILED',script:null,line:null};validate(d);assert.throws(()=>validate({...d,stderr:'private path'}));}
 assert.ok(payload.indexOf("Build-Stage 'LAUNCHER_UNIT'")<payload.indexOf('$taskLauncherUnitTests='));
 assert.ok(payload.indexOf("Build-Stage 'PAYLOAD_ASSEMBLY'")<payload.indexOf("@($taskPackageScript,'finish'"));
 assert.ok(payload.indexOf("Build-Stage 'LAN_NODE'")<payload.indexOf('$taskLanTests='));
 assert.ok(payload.indexOf("Build-Stage 'PAYLOAD_REPORT'")<payload.indexOf('$taskIdentityRaw='));
});
