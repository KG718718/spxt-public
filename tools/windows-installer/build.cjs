'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {inventory,sha,writeNew,writeJSON}=require('../windows-runtime/common.cjs');
const {verify}=require('../windows-portable/package.cjs');
const [portable,compiler,outArg,commit,mode='candidate']=process.argv.slice(2);
const repo=path.resolve(__dirname,'../..'),out=path.resolve(outArg),pin=JSON.parse(fs.readFileSync(path.join(__dirname,'toolchain.json')));
assert.ok(/^E:\\/i.test(out)&&!fs.existsSync(out));assert.match(commit,/^[a-f0-9]{40}$/);
assert.ok(['candidate','fault-space','fault-cancel'].includes(mode));
const root=path.join(portable,'解包程序 中文 with spaces','K-SESSION'),pv=verify(root);
const pr=JSON.parse(fs.readFileSync(path.join(portable,'artifact/portable-test-report.json')));
assert.equal(pr.sourceCommit,commit);assert.equal(pr.status,'PASS');assert.equal(pv.sourceCommit,commit);
assert.equal(pr.staging.status,'PASS');assert.equal(pr.extracted.status,'PASS');
const build=JSON.parse(fs.readFileSync(path.join(root,'build-info.json')));
const zip=path.join(portable,'artifact/K-SESSION-portable-beta-win-x64.zip');
const zi=JSON.parse(fs.readFileSync(path.join(portable,'artifact/zip-identity.json')));
assert.equal(sha(fs.readFileSync(zip)),zi.zipSha256);assert.equal(zi.sourceCommit,commit);
const files=inventory(root),gen=path.join(out,'generated'),artifact=path.join(out,'artifact');
fs.mkdirSync(gen,{recursive:true});fs.mkdirSync(artifact);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'app/package.json')));
const info={product:'K⁺-SESSION Beta',qualification:mode==='candidate'?'UNSIGNED DEVELOPMENT ARTIFACT':'FAULT FIXTURE - NEVER DISTRIBUTE',
 installerVersion:pin.installerVersion,appVersion:pkg.version,sourceCommit:commit,sourceTree:build.sourceTree,
 portablePayloadSha256:zi.zipSha256,runtimeManifestSha256:build.runtimeManifestSha256,launcherSha256:build.launcherSha256,
 packageLockSha256:build.packageLockSha256,nodeVersion:build.nodeVersion,goVersion:build.goVersion,
 innoSetupVersion:pin.version,innoDownloadSha256:pin.sha256,installerScriptSha256:sha(fs.readFileSync(path.join(__dirname,'setup.iss'))),
 platform:'windows',architecture:'x64',buildTimestamp:new Date().toISOString(),unsigned:true,mode,
 installedProgramFileCount:files.length,installedProgramBytes:files.reduce((n,f)=>n+f.bytes,0)};
writeJSON(path.join(gen,'build-info.json'),info);
const manifest={schema:1,sourceCommit:commit,sourceTree:info.sourceTree,payload:files,payloadInventorySha256:sha(JSON.stringify(files)),version:pin.installerVersion};
writeJSON(path.join(gen,'installer-manifest.json'),manifest);
writeNew(path.join(gen,'instance-binding.ini'),Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from('[Installation]\r\nSchema=1\r\n','utf16le')]));
writeNew(path.join(gen,'identity.iss'),'#define RequiredBytes '+(mode==='fault-space'?'9000000000000000':String(info.installedProgramBytes+512*1024*1024))+'\n');
const q=s=>s.replaceAll('"','""'),pas=s=>s.replaceAll("'","''");
writeNew(path.join(gen,'files.iss'),'\ufeff'+files.map(f=>{
 const parts=f.path.split('/'),file=parts.pop(),dir=parts.join('\\'),rel=f.path.replaceAll('/','\\');
 return 'Source: "'+q(path.join(root,f.path))+'"; DestDir: "{app}\\program'+(dir?'\\'+q(dir):'')+'"; DestName: "'+q(file)+'"; Flags: ignoreversion; BeforeInstall: EnsureAbsent(\''+pas(rel)+'\')';
}).join('\n')+'\n');
writeNew(path.join(gen,'verify.iss'),'\ufeff'+files.map(f=>"  if GetSHA256OfFile(ExpandConstant('{app}\\program\\') + '"+pas(f.path.replaceAll('/','\\'))+"') <> '"+f.sha256+"' then RaiseException('安装内容校验失败，禁止启动。');").join('\n')+'\n');
const license=fs.readFileSync(path.join(compiler,'License.txt'));
assert.match(license.toString(),/Inno Setup License/);writeNew(path.join(gen,'LICENSE-Inno-Setup.txt'),license);
writeNew(path.join(gen,'install-info.txt'),'\ufeffK⁺-SESSION Beta / Unsigned\nInstaller 1.1.0-beta.1 | Application '+pkg.version+'\nWindows 10 x64 Beta Track；Win11 未实机认证。\n离线包含核心程序，不需要另装 Node/npm/Python/Git。\n卸载仅移除程序，账号、附件、备份和配置保留。\n不支持覆盖升级：请先保存并停止程序，再卸载后安装。\nOCR、真实邮件不在离线核心承诺内。\n');
const args=['/Qp','/DPayload='+root,'/DGenerated='+gen,'/DOutput='+artifact,...(mode==='fault-cancel'?['/DFaultCancel=1']:[]),path.join(__dirname,'setup.iss')];
const result=cp.spawnSync(path.join(compiler,'ISCC.exe'),args,{encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:4e6});
writeNew(path.join(out,'compiler.stdout.log'),result.stdout||'');writeNew(path.join(out,'compiler.stderr.log'),result.stderr||'');
if(result.status!==0){console.error(result.stdout,result.stderr);throw Error('ISCC failed '+result.status);}
assert.deepEqual(inventory(root),files,'compiler modified payload');
const name='K-SESSION-Setup-1.1.0-beta.1.exe',exe=fs.readFileSync(path.join(artifact,name));
const final={...info,setupBytes:exe.length,setupSha256:sha(exe),payloadInventorySha256:manifest.payloadInventorySha256,licenseSha256:sha(license),generatedScriptHashes:inventory(gen).filter(f=>f.path.endsWith('.iss'))};
writeJSON(path.join(artifact,'build-info.json'),final);writeJSON(path.join(artifact,'installer-manifest.json'),manifest);
writeNew(path.join(artifact,name+'.sha256'),final.setupSha256+'  '+name+'\n');writeNew(path.join(artifact,'LICENSE-Inno-Setup.txt'),license);
writeJSON(path.join(artifact,'license-summary.json'),{inno:{version:pin.version,license:'Inno Setup License',sha256:sha(license)},runtime:JSON.parse(fs.readFileSync(path.join(root,'manifest/runtime-manifest.json'))).licenses});
console.log(JSON.stringify(final));
