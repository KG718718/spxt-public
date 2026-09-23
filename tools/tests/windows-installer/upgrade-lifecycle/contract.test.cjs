'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'../../../..');
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');

test('workflow rebuilds exact beta.1 and supplies a closed fresh plus historical bundle',()=>{
 const y=read('.github/workflows/setup-v3.yml'),rebuild=read('tools/windows-installer/rebuild-beta1.ps1'),source=read('tools/windows-installer/verify-beta1-source.cjs'),verify=read('tools/windows-installer/verify-beta1-build.cjs'),offline=read('tools/windows-installer/offline-ci.ps1');
 for(const marker of ['checkout --detach e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','fresh-identity.cjs','KSESSION_APPROVED_IDENTITY_BUNDLE','KSESSION_BETA1_SETUP'])assert.match(y,new RegExp(marker));
 assert.match(y,/rebuild-beta1\.ps1 -Source E:\/beta1-source -Work E:\/beta1-build/);
 assert.doesNotMatch(y,/beta1-source\/tools\/windows-installer\/ci\.ps1/);
 assert.doesNotMatch(rebuild,/windows-installer\/ci\.ps1|offline-ci\.ps1|TestSetup/);
 for(const marker of ['windows-portable/ci.ps1','windows-installer/toolchain.ps1','windows-installer/build.cjs','verify-beta1-source.cjs','verify-beta1-build.cjs','candidate'])assert.match(rebuild,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','BETA1_SOURCE_TOPLEVEL_MISMATCH','BETA1_SOURCE_COMMIT_MISMATCH','BETA1_SOURCE_TREE_MISMATCH','BETA1_SOURCE_TRACKED_DIRTY','core.autocrlf=false','--untracked-files=no'])assert.match(source,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['K-SESSION-Setup-1.1.0-beta.1.exe','programInventorySha256','historicalGuiRegression','NOT_RUN_BUILD_ONLY'])assert.match(verify,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.ok(y.indexOf('fresh-identity.cjs')>y.indexOf('rebuild-beta1.ps1'));
 assert.match(y,/setup-source\/tools\/windows-installer\/ci\.ps1/);
 assert.match(offline,/\^TestUpgradeLifecycle\$/);
});

test('hosted gate makes file-symlink coverage mandatory and runs both real lifecycles offline',()=>{
 const ci=read('tools/windows-installer/ci.ps1'),offline=read('tools/windows-installer/offline-ci.ps1'),setup=read('.github/workflows/setup-v3.yml'),portable=read('.github/workflows/portable-v2b.yml'),hosted=read('tools/tests/windows-runtime/hosted-gate.cjs');
 assert.match(ci,/KSESSION_REQUIRE_FILE_SYMLINK='1'/);assert.match(ci,/upgrade-preflight\/preflight\.test\.cjs/);
 assert.match(offline,/\^TestSetup\$/);assert.match(offline,/\^TestUpgradeLifecycle\$/);
 assert.match(offline,/taskTick -lt 600/);
 assert.match(setup,/testTotal -ne 742/);assert.match(portable,/testTotal -ne 742/);assert.match(hosted,/testTotal:suites\.reduce/);
});

test('real lifecycle has U01-U30 and all five required recoverable failure fixtures',()=>{
 const go=read('tools/windows-launcher/upgrade_windows_test.go'),build=read('tools/windows-installer/build.cjs'),iss=read('tools/windows-installer/setup.iss');
 for(let n=1;n<=30;n++)assert.match(go,new RegExp(`U${String(n).padStart(2,'0')}`));
 for(const mode of ['fault-space','fault-permission','fault-cancel','fault-copy','fault-payload-hash','fault-post-copy'])assert.match(build,new RegExp(mode));
 assert.match(build,/Check: IsUpgradeInstall; BeforeInstall: BeforeUpgradeCopy/);
 assert.match(iss,/procedure BeforeUpgradeCopy\(Rel: String\)/);assert.match(iss,/KSESSION_FIXTURE_COPY_FAILURE/);assert.match(iss,/KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE/);
 assert.match(go,/fault-payload-hash", "KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED"/);
 assert.match(go,/instanceStable/);assert.match(go,/ownedStable/);assert.match(go,/core-beta1/);assert.match(go,/core-beta2/);assert.match(go,/core-reinstall/);
});

test('successful upgrade asserts real shortcut targets, arguments, and normalized registry identity before U24/U25 PASS',()=>{
 const go=read('tools/windows-launcher/upgrade_windows_test.go');
 const u24=go.indexOf('record("U24"'),u25=go.indexOf('record("U25"');
 assert.ok(u24>go.indexOf('readShortcut(link, false)'));assert.ok(u24>go.indexOf('readShortcut(link, true)'));
 assert.ok(u25>go.indexOf('assertBeta2Registration()'));
 for(const marker of ['DisplayVersion != "1.1.0-beta.2"','state.Machine != 0','len(state.Rows) < 1','32/64 registry aliases conflict'])assert.match(go,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('artifact allowlist requires the closed thirty-check upgrade report',()=>{
 const verify=read('tools/windows-installer/verify-artifact.cjs');
 assert.match(verify,/UPGRADE-TEST-REPORT\.json/);assert.match(verify,/Object\.keys\(upgrade\.checks\)\.length,30/);
});

test('portable restart expires temporary attachment ownership while admin verifies persisted bytes',()=>{
 const core=read('tools/tests/windows-portable/core-client.cjs');
 for(const marker of ['UNATTACHED_UPLOAD_EMPLOYEE_ACCESS_MUST_EXPIRE_AFTER_RESTART','PERSISTED_ATTACHMENT_ADMIN_DOWNLOAD_FAILED','employeeDownload.status,403','adminDownload.status,200','Buffer.from(await adminDownload.arrayBuffer()),prior'])assert.match(core,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.ok(core.indexOf('employeeDownload.status,403')<core.indexOf('adminDownload.status,200'));
});
