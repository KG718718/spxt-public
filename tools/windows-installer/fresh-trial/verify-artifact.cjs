'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {inventory,sha,safePath}=require('../../windows-runtime/common.cjs');
const {validate}=require('../../tests/fresh-lan-trial/report.cjs');
const NAME='K-SESSION-Fresh-Trial-1.1.0-beta.4.exe';
const FILES=Object.freeze([NAME,NAME+'.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','fresh-report.json']);
const INFO=Object.freeze(['product','qualification','installerVersion','appVersion','dataContractVersion','sourceCommit','sourceTree','portablePayloadSha256','runtimeManifestSha256','launcherSha256','firewallHelperSha256','packageLockSha256','nodeVersion','goVersion','innoSetupVersion','innoDownloadSha256','installerScriptSha256','platform','architecture','buildTimestamp','unsigned','mode','installedProgramFileCount','installedProgramBytes','instanceBindingSchema','programManifestHash','setupBytes','setupSha256','payloadInventorySha256','licenseSha256','generatedScriptHashes']);
function exact(o,keys){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),[...keys].sort());}
function inspect(root,sourceCommit,expectedSha){
 const files=inventory(root);assert.deepEqual(files.map(f=>f.path).sort(),[...FILES].sort());
 const info=JSON.parse(fs.readFileSync(path.join(root,'build-info.json')));exact(info,INFO);
 assert.equal(info.mode,'fresh-trial');assert.equal(info.qualification,'FRESH TRIAL - UNSIGNED DEVELOPMENT ARTIFACT');assert.equal(info.sourceCommit,sourceCommit);
 assert.equal(info.appVersion,'1.0.0');assert.equal(info.dataContractVersion,1);assert.equal(info.installerVersion,'1.1.0-beta.4');assert.equal(info.nodeVersion,'24.21.0');assert.equal(info.goVersion,'1.27.1');assert.equal(info.innoSetupVersion,'6.7.3');assert.equal(info.unsigned,true);assert.equal(info.instanceBindingSchema,1);assert.equal(info.platform,'windows');assert.equal(info.architecture,'x64');
 for(const k of ['sourceCommit','sourceTree'])assert.match(info[k],/^[a-f0-9]{40}$/);
 for(const k of INFO.filter(k=>/Sha256$|Hash$/.test(k)))assert.match(info[k],/^[a-f0-9]{64}$/);
 assert.match(info.buildTimestamp,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
 const exe=fs.readFileSync(path.join(root,NAME)),setupSha256=sha(exe);assert.equal(setupSha256,info.setupSha256);assert.equal(exe.length,info.setupBytes);assert.ok(exe.length>0);if(expectedSha)assert.equal(setupSha256,expectedSha);
 assert.equal(fs.readFileSync(path.join(root,NAME+'.sha256'),'utf8'),setupSha256+'  '+NAME+'\n');
 const manifestBytes=fs.readFileSync(path.join(root,'installer-manifest.json')),m=JSON.parse(manifestBytes);exact(m,['schema','sourceCommit','sourceTree','payload','payloadInventorySha256','version']);
 assert.equal(m.schema,1);assert.equal(m.sourceCommit,sourceCommit);assert.equal(m.sourceTree,info.sourceTree);assert.equal(m.version,info.installerVersion);assert.equal(sha(manifestBytes),info.programManifestHash);assert.equal(sha(JSON.stringify(m.payload)),m.payloadInventorySha256);assert.equal(m.payloadInventorySha256,info.payloadInventorySha256);
 assert.equal(m.payload.length,info.installedProgramFileCount);assert.equal(m.payload.reduce((a,f)=>a+f.bytes,0),info.installedProgramBytes);
 const seen=new Set();for(const f of m.payload){exact(f,['path','bytes','sha256']);safePath(f.path);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(f.bytes)&&f.bytes>=0);assert.ok(!seen.has(f.path.toLowerCase()));seen.add(f.path.toLowerCase());assert.ok(!/^(?:app\/)?(?:data\.json|config\.json|\.env|attachments\/|backups\/|runtime\/secrets\/|tests\/|\.git\/)/i.test(f.path));assert.ok(!/^app\/tools\/tests\//i.test(f.path));}
 for(const p of ['runtime/node.exe','K-SESSION.exe','K-SESSION-Firewall.exe','app/server.js','app/public-lan-network.js','manifest/runtime-manifest.json'])assert.ok(seen.has(p.toLowerCase()));
 assert.equal(sha(fs.readFileSync(path.join(root,'LICENSE-Inno-Setup.txt'))),info.licenseSha256);
 for(const f of info.generatedScriptHashes){exact(f,['path','bytes','sha256']);safePath(f.path);assert.ok(/^[a-z-]+\.iss$/.test(f.path));assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(f.bytes)&&f.bytes>0);}
 const license=JSON.parse(fs.readFileSync(path.join(root,'license-summary.json')));exact(license,['inno','runtime']);exact(license.inno,['version','license','sha256']);assert.equal(license.inno.version,'6.7.3');assert.equal(license.inno.license,'Inno Setup License');assert.equal(license.inno.sha256,info.licenseSha256);assert.ok(Array.isArray(license.runtime));
 for(const l of license.runtime){assert.ok(Object.keys(l).every(k=>['name','version','license','files'].includes(k)));assert.equal(typeof l.name,'string');assert.match(l.name,/^[a-zA-Z0-9@/._ -]{1,100}$/);if(l.version)assert.match(l.version,/^[0-9.]+$/);assert.ok(Array.isArray(l.files));for(const f of l.files){exact(f,['path','sha256']);safePath(f.path);assert.match(f.sha256,/^[a-f0-9]{64}$/);}}
 return {setupSha256};
}
function verify(root,expected){assert.ok(expected.reportSchema===undefined||expected.reportSchema===2);const r=validate(JSON.parse(fs.readFileSync(path.join(root,'fresh-report.json'))),{...expected,reportSchema:2});assert.equal(r.status,'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING');const identity=inspect(root,expected.sourceCommit,expected.mode==='QA'?expected.candidate.setupSha256:undefined);assert.equal(identity.setupSha256,r.setupSha256);return identity;}
module.exports={NAME,FILES,INFO,inspect,verify};
