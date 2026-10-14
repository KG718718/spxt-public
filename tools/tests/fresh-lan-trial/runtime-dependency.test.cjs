'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {verifyResolvedModule}=require('./runtime-dependency.cjs');
const repo=path.resolve(__dirname,'../../..');
function fixture(){const root=fs.mkdtempSync(path.join(repo,'.test-work/fresh-dependency-')),modules=path.join(root,'runtime/app/node_modules'),packageDir=path.join(modules,'multer');fs.mkdirSync(packageDir,{recursive:true});fs.writeFileSync(path.join(packageDir,'package.json'),JSON.stringify({name:'multer',main:'index.js'}));fs.writeFileSync(path.join(packageDir,'index.js'),'module.exports={synthetic:true};\n');return{root,modules,file:path.join(packageDir,'index.js')};}
test('actual Node alias resolution reproduces legacy rejection and accepts only canonical owned modules',()=>{
 const f=fixture(),alias=path.join(f.root,'owned-alias');fs.symlinkSync(path.join(f.root,'runtime'),alias,'junction');const aliasModules=path.join(alias,'app/node_modules');
 const result=cp.spawnSync(process.execPath,['-e',"const r=require.resolve('multer');console.log(JSON.stringify({legacy:r.startsWith(process.env.NODE_PATH),resolved:r}))"],{encoding:'utf8',windowsHide:true,env:{...process.env,NODE_OPTIONS:'',NODE_PATH:aliasModules}});assert.equal(result.status,0);const observed=JSON.parse(result.stdout);assert.equal(observed.legacy,false);
 assert.equal(fs.realpathSync.native(observed.resolved).toLowerCase(),fs.realpathSync.native(f.file).toLowerCase());
 const physical=fs.realpathSync.native(aliasModules);assert.equal(verifyResolvedModule(physical,observed.resolved),true);
 assert.throws(()=>verifyResolvedModule(aliasModules,observed.resolved));
});
test('dependency boundary rejects outside, similar prefix and new internal links, while accepting Windows case differences',()=>{
 const f=fixture();assert.equal(verifyResolvedModule(f.modules.toUpperCase(),f.file.toUpperCase()),true);
 for(const dir of ['outside','runtime/app/node_modules-evil']){const d=path.join(f.root,dir);fs.mkdirSync(d,{recursive:true});const file=path.join(d,'index.js');fs.writeFileSync(file,'synthetic');assert.throws(()=>verifyResolvedModule(f.modules,file));}
 const link=path.join(f.modules,'linked');fs.symlinkSync(path.dirname(f.file),link,'junction');assert.throws(()=>verifyResolvedModule(f.modules,path.join(link,'index.js')));
});
test('actual build verifier CLI passes only the physically bound Runtime and emits fixed rejection for outside lookup',()=>{
 const owned=fixture(),outside=fixture(),script=path.join(__dirname,'runtime-dependency.cjs');
 for(const [modules,exit,output] of [[owned.modules,0,'FRESH_RUNTIME_DEPENDENCY_PASS'],[outside.modules,23,'FRESH_RUNTIME_DEPENDENCY_REJECTED']]){
  const r=cp.spawnSync(process.execPath,[script,owned.modules],{encoding:'utf8',windowsHide:true,env:{...process.env,NODE_OPTIONS:'',NODE_PATH:modules}});
  assert.equal(r.status,exit);assert.equal((r.stdout+r.stderr).trim(),output);assert.ok(!(r.stdout+r.stderr).includes(owned.root));
 }
 const payload=fs.readFileSync(path.join(repo,'tools/windows-installer/fresh-trial/build-payload.ps1'),'utf8');
 assert.ok(payload.indexOf('$taskRuntimeModules=Resolve-KSessionFirewallPhysicalPath')<payload.indexOf('$env:NODE_PATH=$taskRuntimeModules'));
 assert.ok(payload.includes("Get-KSessionFirewallTestPathClass $taskRuntimeModules) -ne 'CANONICAL'"));
 assert.ok(payload.includes("'tools/tests/fresh-lan-trial/runtime-dependency.cjs'),$taskRuntimeModules"));
});
