'use strict';
// All writes below are restricted to a GitHub-hosted synthetic test directory.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP hosted package-core checks');process.exit(0);}
const {buildCore,verifyCore,validatePath,sha256}=require('../package-core');
const {zipSync,unzipSync}=require('fflate'),{start}=require('./hosted-runtime-helper');
const root=path.resolve(__dirname,'../..'),work=path.join(root,'.test-work','package-core-evidence');
fs.mkdirSync(work,{recursive:true});
let count=0,f;
const report={distribution:'application-core-only',standaloneInstaller:false,checks:[]};
async function check(name,fn){await fn();report.checks.push(name);count++;console.log('PASS '+name);}
(async()=>{try{
 const built=buildCore(root);
 await check('reviewed source-only allowlist excludes runtime and business assets',()=>{
  assert.equal(built.manifest.files.length,32);assert.equal(built.manifest.installableStandalone,false);
  assert.equal(built.manifest.runtimeIncluded,false);assert.equal(built.manifest.businessDataIncluded,false);
  assert.deepEqual(verifyCore(built.bytes),built.manifest);
 });
 await check('same reviewed input produces identical deterministic archive bytes',()=>assert.equal(buildCore(root).sha256,built.sha256));
 for(const bad of ['../server.js','/server.js','C:/server.js','data.json','config.json','runtime/x','attachments/x','node_modules/x','.env','tools/../server.js']){
  await check('forbidden archive path: '+bad,()=>assert.throws(()=>validatePath(bad)));
 }
 await check('modified code and extra data entry both fail verification',()=>{
  const files=unzipSync(built.bytes);files['K-SESSION/server.js']=Buffer.from('tampered');
  assert.throws(()=>verifyCore(zipSync(files)));
  const more=unzipSync(built.bytes);more['K-SESSION/data.json']=Buffer.from('{}');
  assert.throws(()=>verifyCore(zipSync(more)));
 });
 const extracted=path.join(work,'extracted');
 for(const [name,bytes] of Object.entries(unzipSync(built.bytes))){
  const destination=path.join(extracted,...name.split('/'));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
 }
 const programRoot=path.join(extracted,'K-SESSION'),instance=path.join(work,'synthetic-instance');
 const env={NODE_PATH:path.join(root,'node_modules')};
 await check('extracted source core starts empty without importing synthetic seeds',async()=>{
  f=await start(instance,{env,programRoot});assert.ok(f.port,f.output);
  const setup=await f.call('/api/setup');assert.equal(setup.status,200);assert.equal(setup.data.initializationRequired,true);
  assert.equal(fs.existsSync(path.join(instance,'data.json')),false);
 });
 const password='Synthetic-Package-Only-2026!';
 await check('first installed Admin is created explicitly and all business lists remain empty',async()=>{
  const r=await f.call('/api/setup',{method:'POST',body:{username:'package-admin',password}});assert.equal(r.status,201,JSON.stringify(r.data));
  const data=JSON.parse(fs.readFileSync(path.join(instance,'data.json'),'utf8'));
  assert.equal(data.users.length,1);assert.equal(data.users[0].username,'package-admin');
  for(const key of ['applications','payments','clients','suppliers','invoices','debts','bonusConfirmations','employeeSettlements'])assert.equal(data[key].length,0,key);
 });
 await check('same-version program replacement and restart preserve saved instance bytes',async()=>{
  const before=fs.readFileSync(path.join(instance,'data.json'));await f.stop();
  // Program-only replacement; never copy configuration or business data.
  for(const record of built.manifest.files){
   const target=path.join(programRoot,...record.path.split('/'));
   fs.writeFileSync(target,unzipSync(built.bytes)['K-SESSION/'+record.path]);
  }
  f=await start(instance,{env,programRoot});assert.ok(f.port,f.output);
  assert.deepEqual(fs.readFileSync(path.join(instance,'data.json')),before);
  const setup=await f.call('/api/setup');assert.equal(setup.data.initializationRequired,false);
  const login=await f.call('/api/login',{method:'POST',body:{username:'package-admin',password}});assert.equal(login.status,200);
 });
 await check('saved configuration and synthetic attachment survive program replacement',async()=>{
  const login=await f.call('/api/login',{method:'POST',body:{username:'package-admin',password}});
  const token=login.data.token;assert.ok(token);
  const config=await f.call('/api/config',{token,method:'PUT',body:{expectedVersion:0,taxRate:0}});
  assert.equal(config.status,200,JSON.stringify(config.data));
  const client=await f.call('/api/clients',{token,method:'POST',body:{fullName:'Synthetic package restore client'}});
  assert.equal(client.status,200,JSON.stringify(client.data));
  const attachment=path.join(instance,'attachments','synthetic-backup-evidence.bin');
  fs.mkdirSync(path.dirname(attachment),{recursive:true});
  fs.writeFileSync(attachment,Buffer.from('Synthetic restore byte evidence; not an uploaded invoice.'));
 });
 const snapshotTree=directory=>{
  const files={};
  const walk=(dir,prefix='')=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=prefix+entry.name,target=path.join(dir,entry.name);
   if(entry.isDirectory())walk(target,rel+'/');
   else if(entry.isFile())files[rel]=sha256(fs.readFileSync(target));
   else throw Error('Unexpected fixture link or special file');
  }};walk(directory);return files;
 };
 await check('stopped complete-instance copy restores configuration, credentials, master data and attachment bytes',async()=>{
  await f.stop();const original=snapshotTree(instance);
  const backup=path.join(work,'synthetic-complete-backup'),restored=path.join(work,'synthetic-restored-instance');
  // Synthetic manual recovery rehearsal only, not an automatic production restore API.
  fs.cpSync(instance,backup,{recursive:true,errorOnExist:true,force:false});
  assert.deepEqual(snapshotTree(backup),original);
  fs.cpSync(backup,restored,{recursive:true,errorOnExist:true,force:false});
  assert.deepEqual(snapshotTree(restored),original);
  f=await start(restored,{env,programRoot});assert.ok(f.port,f.output);
  assert.deepEqual(snapshotTree(restored),original);
  const login=await f.call('/api/login',{method:'POST',body:{username:'package-admin',password}});assert.equal(login.status,200);
  const config=await f.call('/api/config',{token:login.data.token});assert.equal(config.status,200);assert.equal(config.data.taxRate,0);
  const clients=await f.call('/api/clients',{token:login.data.token});assert.equal(clients.status,200);
  assert.ok(JSON.stringify(clients.data).includes('Synthetic package restore client'));
  assert.deepEqual(snapshotTree(instance),original);assert.deepEqual(snapshotTree(backup),original);
  assert.deepEqual(fs.readFileSync(path.join(restored,'attachments','synthetic-backup-evidence.bin')),
   fs.readFileSync(path.join(backup,'attachments','synthetic-backup-evidence.bin')));
 });
 report.archiveSha256=built.sha256;report.fileCount=built.manifest.files.length;report.passed=count;
 fs.writeFileSync(path.join(work,'report.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(work,'PACKAGE-MANIFEST.json'),JSON.stringify(built.manifest,null,2));
 // Artifact is explicitly core-only, not an installer and does not include this evidence fixture.
 fs.writeFileSync(path.join(work,'K-SESSION-application-core-only.zip'),built.bytes);
 fs.writeFileSync(path.join(work,'SHA256SUMS.txt'),built.sha256+'  K-SESSION-application-core-only.zip\n');
 console.log('Public package core: '+count+' passed.');
}catch(e){console.error(e.stack);process.exitCode=1;}finally{if(f)await f.stop();}})();
