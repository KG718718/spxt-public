'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sha,inventory}=require('../../windows-runtime/common.cjs');
const [root,commit]=process.argv.slice(2);
const names=['K-SESSION-Setup-1.1.0-beta.3.exe','K-SESSION-Setup-1.1.0-beta.3.exe.sha256','build-info.json',
 'installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','portable-test-report.json',
 'toolchain-verification.json','beta3-compatibility-report.json','BETA3-INSTALLER-TEST-REPORT.json',
 'BETA3-UPGRADE-TEST-REPORT.json','offline-network.json','hosted-lan-gate.json','public-regression.json'];
names.push('firewall-hosted-gate.json');
names.push('beta3-ci-stage.json');
names.push('production-sessions.json');
assert.deepEqual(fs.readdirSync(root).sort(),names.sort());
const read=name=>fs.readFileSync(path.join(root,name)),json=name=>JSON.parse(read(name).toString().replace(/^\uFEFF/,''));
const info=json('build-info.json');
assert.equal(info.sourceCommit,commit);assert.equal(info.mode,'lan-candidate');assert.equal(info.unsigned,true);
assert.equal(info.installerVersion,'1.1.0-beta.3');assert.equal(info.appVersion,'1.0.0');
assert.equal(info.dataContractVersion,1);assert.equal(info.instanceBindingSchema,1);
for(const key of ['runtimeManifestSha256','launcherSha256','firewallHelperSha256','programManifestHash'])assert.match(info[key],/^[a-f0-9]{64}$/,key);
assert.equal(info.setupSha256,sha(read('K-SESSION-Setup-1.1.0-beta.3.exe')));
const stage=json('beta3-ci-stage.json');assert.equal(stage.status,'PASS');assert.equal(stage.stage,'COMPLETE');
assert.equal(stage.sourceCommit,commit);assert.equal(stage.mode,'FULL');
const manifest=json('installer-manifest.json');
assert.equal(manifest.version,'1.1.0-beta.3');assert.equal(manifest.sourceCommit,commit);
assert.ok(manifest.payload.some(file=>file.path==='K-SESSION-Firewall.exe'));
assert.ok(manifest.payload.some(file=>file.path==='app/tools/lan-host/launcher-cli.cjs'));
const compatibility=json('beta3-compatibility-report.json');
assert.equal(compatibility.status,'PASS');assert.equal(compatibility.sourceCommit,commit);
assert.equal(Object.keys(compatibility.checks).length,15);assert.equal(compatibility.actualSetupLifecycle,'PASS');
assert.equal(compatibility.onlineArtifactRequiredAtRuntime,false);
for(let n=1;n<=15;n++)assert.equal(compatibility.checks['C'+String(n).padStart(2,'0')]?.status,'PASS');
const portable=json('portable-test-report.json');assert.equal(portable.status,'PASS');assert.equal(portable.sourceCommit,commit);
for(const phase of ['staging','extracted']){assert.equal(portable[phase]?.status,'PASS');assert.equal(portable[phase]?.sourceCommit,commit);assert.equal(portable[phase]?.checks?.length,27);}
assert.equal(portable.firewallUnit?.status,'PASS');assert.equal(portable.firewallUnit?.pass,12);assert.equal(portable.firewallUnit?.fail,0);assert.equal(portable.firewallUnit?.skipped,0);
const regression=json('public-regression.json');
assert.equal(regression.sourceCommit,commit);assert.equal(regression.testTotal,742);assert.equal(regression.fail,0);assert.equal(regression.skipped,0);assert.equal(regression.suitePass,26);
const setup=json('BETA3-INSTALLER-TEST-REPORT.json');
assert.equal(setup.sourceCommit,commit);assert.equal(setup.status,'AUTOMATED_PASS_HUMAN_PENDING');assert.equal(Object.keys(setup.checks).length,32);
const upgrade=json('BETA3-UPGRADE-TEST-REPORT.json');
assert.equal(upgrade.beta2SourceCommit,'c8886e6b6d413c2fd73d6716621d07a80b337e58');
assert.equal(upgrade.beta3SourceCommit,commit);assert.equal(upgrade.status,'PASS');assert.equal(Object.keys(upgrade.checks).length,30);
const offline=json('offline-network.json');
assert.equal(offline.sourceCommit,commit);assert.equal(offline.status,'PASS');assert.equal(offline.externalBefore,true);
assert.equal(offline.externalDuring,false);assert.equal(offline.restored,true);assert.equal(offline.firewallChanged,false);
const hosted=json('hosted-lan-gate.json');
assert.deepEqual(hosted,{schema:1,status:'PASS',productionHostedAdapterRejected:true,syntheticStrictDiscovery:'PASS',
 runnerOwnedPrivateBind:'PASS',controllerHealth:'PASS',productionDiscoveryUsedAsSuccess:false,firewallChanged:false,realLanClaim:false});
const sessions=json('production-sessions.json');assert.equal(sessions.status,'PASS');assert.equal(sessions.productionBusinessHandler,true);
assert.equal(sessions.runnerOwnedPrivateSocket,true);assert.equal(sessions.discovery,'SYNTHETIC_STRICT_TEST_INJECTION');
assert.equal(sessions.listenerGuard,'PRODUCTION');assert.equal(sessions.sessionCount,2);assert.equal(sessions.independentBearerSessions,true);
assert.equal(sessions.distinctIdentities,true);assert.equal(sessions.identityChecks,true);assert.equal(sessions.roleBoundaryPreserved,true);
assert.equal(sessions.oneSessionLogoutIsolated,true);assert.equal(sessions.hostAttachmentStored,true);
assert.equal(sessions.sameHostInstance,true);assert.equal(sessions.realSecondDeviceClaim,false);
const firewall=json('firewall-hosted-gate.json');
assert.equal(firewall.status,'PASS');assert.equal(firewall.productionHelperHostedVirtualRejected,true);
assert.equal(firewall.productRuleCreated,false);assert.equal(firewall.netSecurityPersistentExact,true);
assert.equal(firewall.netSecurityActiveStoreExact,true);assert.equal(firewall.testRuleCleanup,true);
assert.equal(firewall.profile,'Private');assert.equal(firewall.remoteAny,false);assert.equal(firewall.programAny,false);
assert.equal(firewall.globalFirewallProfileChanged,false);assert.equal(firewall.realPhysicalLanClaim,false);
const pending=new Set(['I01','I02','I09']);
for(let n=1;n<=32;n++){const id='I'+String(n).padStart(2,'0');assert.equal(setup.checks[id]?.status,pending.has(id)?'PENDING':'PASS',id);}
for(let n=1;n<=30;n++){const id='U'+String(n).padStart(2,'0');assert.equal(upgrade.checks[id]?.status,'PASS',id);}
for(const file of inventory(root)){
 if(file.path.endsWith('.exe'))continue;
 const text=read(file.path).toString();
 assert.doesNotMatch(text,/"(?:password|token|smtpPass|cookie|authorization)"\s*:/i,file.path);
 assert.doesNotMatch(text,/[A-Za-z]:\\Users\\|attachments?[/\\].+\.(?:pdf|jpe?g|png)/i,file.path);
}
console.log('BETA3 LAN SETUP ARTIFACT VERIFIED; REAL LAN HUMAN ACCEPTANCE PENDING');
