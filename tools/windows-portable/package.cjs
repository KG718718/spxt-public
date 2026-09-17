'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const {inventory,sha,writeNew,writeJSON,safePath,inspectPE}=require('../windows-runtime/common.cjs');
const {verify:verifyRuntime}=require('../windows-runtime/verify.cjs');
const read=(root,p)=>fs.readFileSync(path.join(root,p));
function verify(root) {
 root=fs.realpathSync(root);
 const info=JSON.parse(read(root,'build-info.json')),m=JSON.parse(read(root,'manifest/runtime-manifest.json'));
 assert.equal(info.qualification,'UNSIGNED DEVELOPMENT ARTIFACT');
 assert.match(info.sourceCommit,/^[a-f0-9]{40}$/);assert.match(info.sourceTree,/^[a-f0-9]{40}$/);
 for(const c of [info.launcherSourceCommit,info.runtimeSourceCommit,m.sourceCommit,m.build.toolCommit])assert.equal(c,info.sourceCommit);
 assert.equal(info.sourceTree,m.sourceTree);assert.equal(info.platform,'win32-x64');assert.equal(info.GOOS,'windows');assert.equal(info.GOARCH,'amd64');assert.equal(info.CGO_ENABLED,'0');
 assert.equal(m.platform,'win32-x64');assert.equal(m.manifestSchema,1);assert.equal(m.businessDataIncluded,false);
 assert.equal(info.nodeVersion,'24.21.0');assert.equal(info.goVersion,'1.27.1');assert.equal(info.packageLockSha256,m.packageLockHash);
 assert.equal(info.runtimeManifestSha256,sha(read(root,'manifest/runtime-manifest.json')));
 assert.equal(info.launcherSha256,sha(read(root,'K-SESSION.exe')));
 assert.equal(m.nodeHash,sha(read(root,'runtime/node.exe')));
 inspectPE(read(root,'K-SESSION.exe'));inspectPE(read(root,'runtime/node.exe'));
 const expected=new Map(m.files.map(f=>[safePath(f.path),f]));
 for(const p of ['manifest/runtime-manifest.json','hashes/SHA256SUMS.txt','K-SESSION.exe','build-info.json']){assert.ok(!expected.has(p));expected.set(p,{path:p,bytes:read(root,p).length,sha256:sha(read(root,p))});}
 const actual=inventory(root);
 assert.deepEqual(actual,[...expected.values()].sort((a,b)=>a.path.localeCompare(b.path,'en')));
 const rt=actual.filter(f=>!['hashes/SHA256SUMS.txt','K-SESSION.exe','build-info.json'].includes(f.path));
 assert.equal(read(root,'hashes/SHA256SUMS.txt').toString(),rt.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 assert.equal(m.dependencies.length,20);
 for(const f of actual) {
  assert.ok(!/^app\/(data.json|config.json|attachments\/|backups\/|runtime\/|mail-reminder.config.json|\.env)/i.test(f.path),'program data contamination');
  assert.ok(!/^app\/node_modules\/.*\.(node|dll|exe|wasm)$/i.test(f.path),'native dependency');
 }
 for(const item of m.licenses)for(const f of item.files)assert.equal(sha(read(root,f.path)),f.sha256);
 return {status:'PASS',sourceCommit:info.sourceCommit,manifestSha256:info.runtimeManifestSha256,launcherSha256:info.launcherSha256,files:actual.length,uncompressedBytes:actual.reduce((n,f)=>n+f.bytes,0),dependencyCount:20};
}
function prepare(root,goRoot) {
 verifyRuntime(root);
 const m=JSON.parse(read(root,'manifest/runtime-manifest.json'));
 const license=fs.readFileSync(path.join(goRoot,'LICENSE'));
 assert.match(license.toString(),/Copyright 2009 The Go Authors/);
 writeNew(path.join(root,'licenses/go/LICENSE'),license);
 const project=read(root,'app/LICENSE');writeNew(path.join(root,'licenses/KSESSION-LICENSE'),project);
 for(const [name,p] of [['Go','licenses/go/LICENSE'],['K-SESSION','licenses/KSESSION-LICENSE']]){
  const bytes=read(root,p);m.files.push({path:p,bytes:bytes.length,sha256:sha(bytes)});m.licenses.push({name,version:name==='Go'?'1.27.1':m.version,files:[{path:p,sha256:sha(bytes)}]});
 }
 m.files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
 // Own fresh build only, never an existing installed Runtime.
 fs.writeFileSync(path.join(root,'manifest/runtime-manifest.json'),JSON.stringify(m,null,2)+'\n');
 const files=inventory(root).filter(f=>f.path!=='hashes/SHA256SUMS.txt');
 fs.writeFileSync(path.join(root,'hashes/SHA256SUMS.txt'),files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 verifyRuntime(root);
}
function finish(root,launcherDir,git,repo,commit) {
 const m=JSON.parse(read(root,'manifest/runtime-manifest.json')),li=JSON.parse(read(launcherDir,'build-info.json'));
 assert.equal(m.sourceCommit,commit);assert.equal(li.sourceCommit,commit);assert.equal(li.runtimeManifestSha256,sha(read(root,'manifest/runtime-manifest.json')));
 writeNew(path.join(root,'K-SESSION.exe'),read(launcherDir,'K-SESSION.exe'));
 const info={product:'K⁺-SESSION',qualification:'UNSIGNED DEVELOPMENT ARTIFACT',sourceCommit:commit,sourceTree:m.sourceTree,launcherSourceCommit:commit,runtimeSourceCommit:commit,
 runtimeManifestSha256:li.runtimeManifestSha256,packageLockSha256:m.packageLockHash,nodeVersion:m.nodeVersion,goVersion:'1.27.1',GOOS:'windows',GOARCH:'amd64',CGO_ENABLED:'0',
 buildTimestamp:cp.execFileSync(git,['-C',repo,'show','-s','--format=%cI',commit],{windowsHide:true}).toString().trim(),timestampPolicy:'source commit time; Runtime OS metadata may differ between builds',
 artifactFormat:'portable-zip',platform:'win32-x64',launcherSha256:li.sha256,sha256:li.sha256,bytes:li.bytes,
 instanceContract:'Beta only: LOCALAPPDATA/K-SESSION/Beta/instance; external logs subdirectory; Batch4 decides final path'};
 writeJSON(path.join(root,'build-info.json'),info);return verify(root);
}
function archive(root,out,reportFile) {
 const v=verify(root),report=JSON.parse(fs.readFileSync(reportFile));assert.equal(report.status,'PASS');assert.equal(report.sourceCommit,v.sourceCommit);assert.equal(report.manifestSha256,v.manifestSha256);assert.equal(report.checks.length,27);
 const {zipSync}=createRequire(path.join(root,'app/package.json'))('fflate'),entries={};
 for(const f of inventory(root))entries['K-SESSION/'+f.path]=[read(root,f.path),{mtime:new Date('2026-01-01T00:00:00Z')}];
 const bytes=zipSync(entries,{level:6}),name='K-SESSION-portable-beta-win-x64.zip';
 writeNew(path.join(out,name),bytes);writeNew(path.join(out,'SHA256SUMS.txt'),sha(bytes)+'  '+name+'\n');
 writeJSON(path.join(out,'zip-identity.json'),{...v,zip:name,zipSha256:sha(bytes),zipBytes:bytes.length,extractedRecheck:'REQUIRED'});
}
if(require.main===module){const [mode,...a]=process.argv.slice(2);const fn={prepare,finish,verify,archive}[mode];if(!fn)throw Error('Unknown mode');console.log(JSON.stringify(fn(...a)||{status:'PASS'}));}
module.exports={verify};
