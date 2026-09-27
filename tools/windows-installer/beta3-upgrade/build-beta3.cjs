'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {inventory,sha,writeNew,writeJSON}=require('../../windows-runtime/common.cjs');
const {validateBundle}=require('./identity.cjs');
const {verify}=require('../../windows-portable/package-lan.cjs');
const {FIREWALL:firewallUnitExpected,LAUNCHER:launcherUnitExpected,INTEGRATION_IDS:integrationExpected}=require('../../tests/lan-host/expected-go-tests.cjs');
const [portable,compiler,outArg,commit,mode='lan-candidate',bundleArg]=process.argv.slice(2);
const repo=path.resolve(__dirname,'../../..'),out=path.resolve(outArg),pin=JSON.parse(fs.readFileSync(path.join(__dirname,'toolchain-beta3.json')));
assert.ok(/^E:\\/i.test(out)&&!fs.existsSync(out));assert.match(commit,/^[a-f0-9]{40}$/);
assert.ok(['lan-candidate','fault-space','fault-permission','fault-cancel','fault-copy','fault-payload-hash','fault-post-copy'].includes(mode));
assert.ok(bundleArg,'approved accepted-F3 beta.2 identity bundle required');
const bundlePath=path.resolve(bundleArg),bundleBytes=fs.readFileSync(bundlePath),bundle=JSON.parse(bundleBytes.toString('utf8'));
validateBundle(bundle);
const root=path.join(portable,'解包程序 中文 with spaces','K-SESSION'),pv=verify(root);
const pr=JSON.parse(fs.readFileSync(path.join(portable,'artifact/portable-test-report.json')));
const payloadCommit=commit;
assert.equal(pr.sourceCommit,payloadCommit);assert.equal(pr.status,'PASS');assert.equal(pv.sourceCommit,payloadCommit);
assert.equal(pr.staging.status,'PASS');assert.equal(pr.extracted.status,'PASS');
assert.equal(pr.staging.checks.length,27);assert.equal(pr.extracted.checks.length,27);
assert.equal(pr.firewallUnit.status,'PASS');assert.deepEqual(pr.firewallUnit.expectedTests,firewallUnitExpected);assert.equal(pr.firewallUnit.pass,firewallUnitExpected.length);assert.equal(pr.firewallUnit.fail,0);assert.equal(pr.firewallUnit.skipped,0);
assert.equal(pr.firewallBuild.qualification,'TEST_BUILD_ONLY');assert.equal(pr.firewallBuild.fixtureRootSource,'OWNED_PHYSICAL');assert.equal(pr.firewallBuild.status,'PASS');assert.equal(pr.firewallBuild.stage,'COMPLETE');assert.equal(pr.firewallBuild.reason,'PASS');assert.equal(pr.firewallBuild.sourceCommit,commit);assert.equal(pr.firewallBuild.testsPass,13);assert.equal(pr.firewallBuild.testsFail,0);assert.equal(pr.firewallBuild.testsSkipped,0);assert.equal(pr.firewallBuild.packagePass,true);assert.equal(pr.firewallBuild.compileReached,true);
assert.equal(pr.launcherUnit.status,'PASS');assert.deepEqual(pr.launcherUnit.expectedTests,launcherUnitExpected);assert.equal(pr.launcherUnit.pass,launcherUnitExpected.length);assert.equal(pr.launcherUnit.fail,0);assert.equal(pr.launcherUnit.skipped,0);
assert.equal(pr.launcherIntegration.status,'PASS');assert.deepEqual(pr.launcherIntegration.expectedChecks,integrationExpected);assert.equal(pr.launcherIntegration.pass,integrationExpected.length);assert.equal(pr.launcherIntegration.fail,0);assert.equal(pr.launcherIntegration.skipped,0);
const build=JSON.parse(fs.readFileSync(path.join(root,'build-info.json')));
const zip=path.join(portable,'artifact/K-SESSION-portable-lan-beta-win-x64.zip');
const zi=JSON.parse(fs.readFileSync(path.join(portable,'artifact/zip-identity.json')));
assert.equal(sha(fs.readFileSync(zip)),zi.zipSha256);assert.equal(zi.sourceCommit,payloadCommit);
const files=inventory(root),gen=path.join(out,'generated'),artifact=path.join(out,'artifact');
fs.mkdirSync(gen,{recursive:true});fs.mkdirSync(artifact);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'app/package.json')));
assert.equal(pin.installerVersion,'1.1.0-beta.3');assert.equal(pin.appId,'KSESSION-Beta-Installer-v1');assert.equal(pkg.version,'1.0.0');
assert.match(build.firewallHelperSha256,/^[a-f0-9]{64}$/);assert.equal(sha(fs.readFileSync(path.join(root,'K-SESSION-Firewall.exe'))),build.firewallHelperSha256);
const info={product:'K⁺-SESSION Beta',qualification:mode==='lan-candidate'?'UNSIGNED DEVELOPMENT ARTIFACT':'FAULT FIXTURE - NEVER DISTRIBUTE',
 installerVersion:pin.installerVersion,appVersion:pkg.version,dataContractVersion:1,sourceCommit:commit,sourceTree:build.sourceTree,
 portablePayloadSha256:zi.zipSha256,runtimeManifestSha256:build.runtimeManifestSha256,launcherSha256:build.launcherSha256,
 firewallHelperSha256:build.firewallHelperSha256,
 packageLockSha256:build.packageLockSha256,nodeVersion:build.nodeVersion,goVersion:build.goVersion,
 innoSetupVersion:pin.version,innoDownloadSha256:pin.sha256,installerScriptSha256:sha(fs.readFileSync(path.join(__dirname,'setup-beta3.iss'))),
 platform:'windows',architecture:'x64',buildTimestamp:new Date().toISOString(),unsigned:true,mode,
 installedProgramFileCount:files.length,installedProgramBytes:files.reduce((n,f)=>n+f.bytes,0),instanceBindingSchema:1};
const manifest={schema:1,sourceCommit:commit,sourceTree:info.sourceTree,payload:files,payloadInventorySha256:sha(JSON.stringify(files)),version:pin.installerVersion};
const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
info.programManifestHash=sha(manifestBytes);
writeJSON(path.join(gen,'build-info.json'),info);writeNew(path.join(gen,'installer-manifest.json'),manifestBytes);
writeNew(path.join(gen,'approved-identity-bundle.json'),bundleBytes);
const copyRuntime=(source,name,replacements=[])=>{
 let text=fs.readFileSync(source,'utf8');for(const [from,to] of replacements)text=text.replace(from,to);writeNew(path.join(gen,name),text);
};
copyRuntime(path.join(__dirname,'identity.cjs'),'upgrade-detection.cjs');
copyRuntime(path.join(__dirname,'../upgrade-preflight/index.cjs'),'upgrade-preflight.cjs',[["require('../../../public-startup')","require('./public-startup')"]]);
copyRuntime(path.join(__dirname,'../upgrade-gate/index.cjs'),'upgrade-gate.cjs',[["require('../upgrade-detection/index.cjs')","require('./upgrade-detection.cjs')"],["require('../upgrade-preflight/index.cjs')","require('./upgrade-preflight.cjs')"]]);
copyRuntime(path.join(__dirname,'../upgrade-gate/cli.cjs'),'upgrade-gate-cli.cjs',[["require('./index.cjs')","require('./upgrade-gate.cjs')"]]);
copyRuntime(path.join(__dirname,'transaction.cjs'),'upgrade-transaction.cjs',[["require('../../windows-runtime/common.cjs')","require('./runtime-common.cjs')"]]);
copyRuntime(path.join(__dirname,'transaction-cli.cjs'),'upgrade-transaction-cli.cjs',[["require('./transaction.cjs')","require('./upgrade-transaction.cjs')"]]);
copyRuntime(path.join(repo,'tools/windows-runtime/common.cjs'),'runtime-common.cjs');
for(const name of ['public-startup.js','public-config-store.js','tax-config.js','invoice-access-policy.js','service-fee-config.js','bonus-config.js']) copyRuntime(path.join(repo,name),name);
writeNew(path.join(gen,'instance-binding.ini'),Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from('[Installation]\r\nSchema=1\r\n','utf16le')]));
const programManifestDefine=mode==='fault-payload-hash'?'0'.repeat(64):info.programManifestHash;
writeNew(path.join(gen,'identity.iss'),'#define RequiredBytes '+(['fault-space','sequence-space'].includes(mode)?'9000000000000000':String(info.installedProgramBytes+512*1024*1024))+'\n'+
  '#define IdentityBundleSha256 "'+sha(bundleBytes)+'"\n#define ProgramManifestSha256 "'+programManifestDefine+'"\n'+
  '#define RuntimeManifestSha256 "'+info.runtimeManifestSha256+'"\n#define LauncherSha256 "'+info.launcherSha256+'"\n'+
  '#define FirewallHelperSha256 "'+info.firewallHelperSha256+'"\n'+
  '#define SourceCommit "'+commit+'"\n');
const q=s=>s.replaceAll('"','""'),pas=s=>s.replaceAll("'","''");
writeNew(path.join(gen,'files.iss'),'\ufeff'+files.map(f=>{
 const parts=f.path.split('/'),file=parts.pop(),dir=parts.join('\\'),rel=f.path.replaceAll('/','\\');
 const source='Source: "'+q(path.join(root,f.path))+'"; DestName: "'+q(file)+'"; Flags: ignoreversion';
 return source+'; DestDir: "{app}\\program'+(dir?'\\'+q(dir):'')+'"; Check: IsFreshInstall; BeforeInstall: EnsureAbsent(\''+pas(rel)+'\')\n'+
   source+'; DestDir: "{tmp}\\ksession-upgrade-v2\\program'+(dir?'\\'+q(dir):'')+'"; Check: IsUpgradeInstall; BeforeInstall: BeforeUpgradeCopy(\''+pas(rel)+'\')';
}).join('\n')+'\n');
writeNew(path.join(gen,'verify.iss'),'\ufeff'+files.map(f=>"  if GetSHA256OfFile(ExpandConstant('{app}\\program\\') + '"+pas(f.path.replaceAll('/','\\'))+"') <> '"+f.sha256+"' then RaiseException('安装内容校验失败，禁止启动。');").join('\n')+'\n');
const license=fs.readFileSync(path.join(compiler,'License.txt'));
assert.match(license.toString(),/Inno Setup License/);writeNew(path.join(gen,'LICENSE-Inno-Setup.txt'),license);
writeNew(path.join(gen,'install-info.txt'),'\ufeffK⁺-SESSION Beta / Unsigned\nInstaller 1.1.0-beta.3 | Application '+pkg.version+'\nWindows 10 x64 LAN Candidate；Win11 未实机认证。\n离线包含核心程序，不需要另装 Node/npm/Python/Git。\n卸载仅移除程序，账号、附件、备份和LAN配置保留。\n只升级经精确验证的受验F3 beta.2；升级沿用原数据位置，不移动或删除业务数据与附件。\nOCR、真实邮件不在离线核心承诺内。\n');
const fixtureDefine={
 'fault-cancel':'/DFaultCancel=1','fault-copy':'/DFaultCopy=1','fault-post-copy':'/DFaultPostCopy=1'
}[mode];
const args=['/Qp','/DPayload='+root,'/DGenerated='+gen,'/DOutput='+artifact,...(fixtureDefine?[fixtureDefine]:[]),path.join(__dirname,'setup-beta3.iss')];
const result=cp.spawnSync(path.join(compiler,'ISCC.exe'),args,{encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:4e6});
writeNew(path.join(out,'compiler.stdout.log'),result.stdout||'');writeNew(path.join(out,'compiler.stderr.log'),result.stderr||'');
if(result.status!==0){console.error(result.stdout,result.stderr);throw Error('ISCC failed '+result.status);}
assert.deepEqual(inventory(root),files,'compiler modified payload');
const name='K-SESSION-Setup-1.1.0-beta.3.exe',exe=fs.readFileSync(path.join(artifact,name));
const final={...info,setupBytes:exe.length,setupSha256:sha(exe),payloadInventorySha256:manifest.payloadInventorySha256,licenseSha256:sha(license),generatedScriptHashes:inventory(gen).filter(f=>f.path.endsWith('.iss'))};
writeJSON(path.join(artifact,'build-info.json'),final);writeJSON(path.join(artifact,'installer-manifest.json'),manifest);
writeNew(path.join(artifact,name+'.sha256'),final.setupSha256+'  '+name+'\n');writeNew(path.join(artifact,'LICENSE-Inno-Setup.txt'),license);
writeJSON(path.join(artifact,'license-summary.json'),{inno:{version:pin.version,license:'Inno Setup License',sha256:sha(license)},runtime:JSON.parse(fs.readFileSync(path.join(root,'manifest/runtime-manifest.json'))).licenses});
console.log(JSON.stringify(final));
