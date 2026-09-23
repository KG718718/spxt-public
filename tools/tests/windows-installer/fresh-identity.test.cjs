'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {inventory,sha}=require('../../windows-runtime/common.cjs');
const {verifyBeta1Build}=require('../../windows-installer/verify-beta1-build.cjs');
const {SourceError,verifyCheckout}=require('../../windows-installer/verify-beta1-source.cjs');
const repo=path.resolve(__dirname,'../../..');

test('fresh identity generator is pinned and fails closed',()=>{
 const text=fs.readFileSync(path.join(__dirname,'../../windows-installer/fresh-identity.cjs'),'utf8');
 const verify=fs.readFileSync(path.join(__dirname,'../../windows-installer/verify-beta1-build.cjs'),'utf8');
 for(const value of ['fresh-ci-baseline','historical-run-35514357007']) assert.match(text,new RegExp(value));
 for(const value of ['e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','K-SESSION-Setup-1.1.0-beta.1.exe'])assert.match(verify,new RegExp(value.replaceAll('.','\\.')));
 assert.match(text,/verifyBeta1Build\(oldBuild\)/);
 assert.match(text,/validateBundle\(bundle\)/);
 assert.match(text,/flag: 'wx'/);
});

test('synthetic exact beta1 build closure validates and setup tampering fails closed',()=>{
 const root=fs.mkdtempSync(path.join(repo,'.test-work','beta1-build-verify-'));
 const put=(name,bytes)=>{const file=path.join(root,...name.split('/'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
 try{
  const program='portable/解包程序 中文 with spaces/K-SESSION';put(program+'/app/server.js','synthetic-beta1-program\n');
  const payload=inventory(path.join(root,...program.split('/'))),manifest={schema:1,sourceCommit:'e9417f036d0cdf736ff84682556a994040f0de0b',sourceTree:'5da66cb9b73dfa307948634634bfab2cfaaead12',payload,payloadInventorySha256:sha(JSON.stringify(payload)),version:'1.1.0-beta.1'};
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),setup=Buffer.from('synthetic setup bytes');
  const build={installerVersion:'1.1.0-beta.1',appVersion:'1.0.0',sourceCommit:manifest.sourceCommit,sourceTree:manifest.sourceTree,nodeVersion:'24.21.0',goVersion:'1.27.1',innoSetupVersion:'6.7.3',packageLockSha256:'7e650d8d4141d888ab7cc81da25fa094f0e36ffaa0f2152d5066346633e8b2b5',runtimeManifestSha256:'1'.repeat(64),launcherSha256:'2'.repeat(64)};
  put('candidate/generated/installer-manifest.json',manifestBytes);put('candidate/generated/build-info.json',JSON.stringify(build,null,2)+'\n');
  put('candidate/artifact/installer-manifest.json',manifestBytes);put('candidate/artifact/K-SESSION-Setup-1.1.0-beta.1.exe',setup);
  const final={...build,mode:'candidate',setupBytes:setup.length,setupSha256:sha(setup)};put('candidate/artifact/build-info.json',JSON.stringify(final,null,2)+'\n');
  put('candidate/artifact/K-SESSION-Setup-1.1.0-beta.1.exe.sha256',final.setupSha256+'  K-SESSION-Setup-1.1.0-beta.1.exe\n');put('candidate/artifact/LICENSE-Inno-Setup.txt','synthetic license');put('candidate/artifact/license-summary.json','{}\n');
  put('portable/artifact/portable-test-report.json',JSON.stringify({status:'PASS',sourceCommit:manifest.sourceCommit,staging:{status:'PASS'},extracted:{status:'PASS'}}));
  assert.equal(verifyBeta1Build(root).report.status,'PASS');
  fs.appendFileSync(path.join(root,'candidate/artifact/K-SESSION-Setup-1.1.0-beta.1.exe'),'tamper');
  assert.throws(()=>verifyBeta1Build(root));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('source verifier resolves path aliases, pins commit/tree and rejects wrong roots or tracked dirty under global CRLF config',()=>{
 const parent=fs.mkdtempSync(path.join(repo,'.test-work','beta1-source-verify-')),root=path.join(parent,'repo'),alias=path.join(parent,'repo-alias'),sub=path.join(root,'sub');
 const run=(args,env=process.env)=>cp.execFileSync('git',args,{cwd:root,env,windowsHide:true,encoding:'utf8'}).trim();
 try{
  fs.mkdirSync(root);
  run(['init']);run(['config','user.name','Synthetic']);run(['config','user.email','synthetic@example.invalid']);
  fs.writeFileSync(path.join(root,'fixed.txt'),'line one\nline two\n');run(['-c','core.autocrlf=false','add','fixed.txt']);run(['-c','core.autocrlf=false','commit','-m','synthetic']);fs.mkdirSync(sub);
  const commit=run(['rev-parse','HEAD']),tree=run(['rev-parse','HEAD^{tree}']),blob=run(['hash-object','fixed.txt']);
  const env={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'core.autocrlf',GIT_CONFIG_VALUE_0:'true'};
  fs.unlinkSync(path.join(root,'fixed.txt'));run(['-c','core.autocrlf=false','checkout','--','fixed.txt'],env);
  fs.symlinkSync(root,alias,process.platform==='win32'?'junction':'dir');
  assert.notEqual(path.resolve(root),path.resolve(alias));
  assert.equal(verifyCheckout(path.join(alias,'sub','..'),{commit,tree,blobs:{'fixed.txt':blob}},{env}).trackedClean,true);
  assert.throws(()=>verifyCheckout(sub,{commit,tree,blobs:{'fixed.txt':blob}},{env}),e=>e instanceof SourceError&&e.code==='BETA1_SOURCE_TOPLEVEL_MISMATCH');
  assert.throws(()=>verifyCheckout(root,{commit:'0'.repeat(40),tree,blobs:{'fixed.txt':blob}},{env}),e=>e instanceof SourceError&&e.code==='BETA1_SOURCE_COMMIT_MISMATCH');
  assert.throws(()=>verifyCheckout(root,{commit,tree:'0'.repeat(40),blobs:{'fixed.txt':blob}},{env}),e=>e instanceof SourceError&&e.code==='BETA1_SOURCE_TREE_MISMATCH');
  fs.appendFileSync(path.join(root,'fixed.txt'),'tracked mutation\n');
  assert.throws(()=>verifyCheckout(root,{commit,tree,blobs:{'fixed.txt':blob}},{env}),e=>e instanceof SourceError&&e.code==='BETA1_SOURCE_TRACKED_DIRTY');
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
