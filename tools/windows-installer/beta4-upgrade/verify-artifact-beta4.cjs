'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sha,inventory}=require('../../windows-runtime/common.cjs');
const {FIREWALL:firewallUnitExpected,LAUNCHER:launcherUnitExpected,INTEGRATION_IDS:integrationExpected}=require('../../tests/lan-host/expected-go-tests.cjs');
const [root,commit]=process.argv.slice(2);
const names=['K-SESSION-Setup-1.1.0-beta.4.exe','K-SESSION-Setup-1.1.0-beta.4.exe.sha256','build-info.json',
 'installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','portable-test-report.json',
 'toolchain-verification.json','beta4-compatibility-report.json','ci-test-environment.json','BETA4-INSTALLER-TEST-REPORT.json',
 'BETA4-UPGRADE-TEST-REPORT.json','offline-network.json','public-regression.json'];
names.push('firewall-hosted-gate.json');
names.push('beta4-ci-stage.json');
assert.deepEqual(fs.readdirSync(root).sort(),names.sort());
const read=name=>fs.readFileSync(path.join(root,name)),json=name=>JSON.parse(read(name).toString().replace(/^\uFEFF/,''));
const info=json('build-info.json');
assert.equal(info.sourceCommit,commit);assert.equal(info.mode,'lan-candidate');assert.equal(info.unsigned,true);
assert.equal(info.installerVersion,'1.1.0-beta.4');assert.equal(info.appVersion,'1.0.0');
assert.equal(info.dataContractVersion,1);assert.equal(info.instanceBindingSchema,1);
for(const key of ['runtimeManifestSha256','launcherSha256','firewallHelperSha256','programManifestHash'])assert.match(info[key],/^[a-f0-9]{64}$/,key);
assert.equal(info.setupSha256,sha(read('K-SESSION-Setup-1.1.0-beta.4.exe')));
const stage=json('beta4-ci-stage.json');assert.equal(stage.status,'PASS');assert.equal(stage.stage,'COMPLETE');
assert.equal(stage.sourceCommit,commit);assert.equal(stage.mode,'FULL');
const ciEnvironment=json('ci-test-environment.json');assert.equal(ciEnvironment.qualification,'TEST_ONLY');assert.equal(ciEnvironment.status,'PASS');assert.equal(ciEnvironment.stage,'COMPLETE');assert.equal(ciEnvironment.reason,'PASS');assert.equal(ciEnvironment.sourceCommit,commit);assert.equal(ciEnvironment.selectedRootClass,'CANONICAL');assert.equal(ciEnvironment.environmentRestored,true);
const manifest=json('installer-manifest.json');
assert.equal(manifest.version,'1.1.0-beta.4');assert.equal(manifest.sourceCommit,commit);
assert.ok(manifest.payload.some(file=>file.path==='K-SESSION-Firewall.exe'));
assert.ok(manifest.payload.some(file=>file.path==='app/tools/lan-host/launcher-cli.cjs'));
const compatibility=json('beta4-compatibility-report.json');
assert.equal(compatibility.status,'PASS');assert.equal(compatibility.sourceCommit,commit);
assert.equal(Object.keys(compatibility.checks).length,15);assert.equal(compatibility.actualSetupLifecycle,'PASS');
assert.equal(compatibility.onlineArtifactRequiredAtRuntime,false);
for(let n=1;n<=15;n++)assert.equal(compatibility.checks['C'+String(n).padStart(2,'0')]?.status,'PASS');
const portable=json('portable-test-report.json');assert.equal(portable.status,'PASS');assert.equal(portable.sourceCommit,commit);
for(const phase of ['staging','extracted']){assert.equal(portable[phase]?.status,'PASS');assert.equal(portable[phase]?.sourceCommit,commit);assert.equal(portable[phase]?.checks?.length,27);}
assert.equal(portable.firewallUnit?.status,'PASS');assert.deepEqual(portable.firewallUnit?.expectedTests,firewallUnitExpected);assert.equal(portable.firewallUnit?.pass,firewallUnitExpected.length);assert.equal(portable.firewallUnit?.fail,0);assert.equal(portable.firewallUnit?.skipped,0);
assert.equal(portable.firewallBuild?.qualification,'TEST_BUILD_ONLY');assert.equal(portable.firewallBuild?.fixtureRootSource,'OWNED_PHYSICAL');assert.equal(portable.firewallBuild?.status,'PASS');assert.equal(portable.firewallBuild?.stage,'COMPLETE');assert.equal(portable.firewallBuild?.reason,'PASS');assert.equal(portable.firewallBuild?.sourceCommit,commit);assert.equal(portable.firewallBuild?.testsPass,13);assert.equal(portable.firewallBuild?.testsFail,0);assert.equal(portable.firewallBuild?.testsSkipped,0);assert.equal(portable.firewallBuild?.packagePass,true);assert.equal(portable.firewallBuild?.compileReached,true);
assert.equal(portable.nodeTestEnvironment?.qualification,'TEST_ONLY');assert.equal(portable.nodeTestEnvironment?.status,'PASS');assert.equal(portable.nodeTestEnvironment?.stage,'COMPLETE');assert.equal(portable.nodeTestEnvironment?.reason,'PASS');assert.equal(portable.nodeTestEnvironment?.selectedRootClass,'CANONICAL');assert.equal(portable.nodeTestEnvironment?.tests,44);assert.equal(portable.nodeTestEnvironment?.pass,44);assert.equal(portable.nodeTestEnvironment?.fail,0);assert.equal(portable.nodeTestEnvironment?.skipped,0);assert.equal(portable.nodeTestEnvironment?.environmentRestored,true);
assert.equal(portable.launcherUnit?.status,'PASS');assert.deepEqual(portable.launcherUnit?.expectedTests,launcherUnitExpected);assert.equal(portable.launcherUnit?.pass,launcherUnitExpected.length);assert.equal(portable.launcherUnit?.fail,0);assert.equal(portable.launcherUnit?.skipped,0);
assert.equal(portable.launcherIntegration?.status,'PASS');assert.deepEqual(portable.launcherIntegration?.expectedChecks,integrationExpected);assert.equal(portable.launcherIntegration?.pass,integrationExpected.length);assert.equal(portable.launcherIntegration?.fail,0);assert.equal(portable.launcherIntegration?.skipped,0);
const regression=json('public-regression.json');
assert.equal(regression.sourceCommit,commit);assert.equal(regression.testTotal,742);assert.equal(regression.fail,0);assert.equal(regression.skipped,0);assert.equal(regression.suitePass,26);
const setup=json('BETA4-INSTALLER-TEST-REPORT.json');
assert.equal(setup.sourceCommit,commit);assert.equal(setup.status,'AUTOMATED_PASS_HUMAN_PENDING');assert.equal(Object.keys(setup.checks).length,32);
const upgrade=json('BETA4-UPGRADE-TEST-REPORT.json');
assert.equal(upgrade.beta2SourceCommit,'c8886e6b6d413c2fd73d6716621d07a80b337e58');
assert.equal(upgrade.beta4SourceCommit,commit);assert.equal(upgrade.status,'PASS');assert.equal(Object.keys(upgrade.checks).length,30);
const offline=json('offline-network.json');
assert.equal(offline.sourceCommit,commit);assert.equal(offline.status,'PASS');assert.equal(offline.externalBefore,true);
assert.equal(offline.externalDuring,false);assert.equal(offline.restored,true);assert.equal(offline.firewallChanged,false);
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
console.log('BETA4 LAN SETUP ARTIFACT VERIFIED; REAL LAN HUMAN ACCEPTANCE PENDING');
