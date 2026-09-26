'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '../../../..');
const iss = fs.readFileSync(path.join(root, 'tools/windows-installer/setup.iss'), 'utf8');
const build = fs.readFileSync(path.join(root, 'tools/windows-installer/build.cjs'), 'utf8');
const toolchain = JSON.parse(fs.readFileSync(path.join(root, 'tools/windows-installer/toolchain.json')));
test('U09 beta2 remains per-user lowest privilege with same identity and fixed root', () => {
  for (const line of ['AppId=KSESSION-Beta-Installer-v1','AppVersion=1.1.0-beta.2','PrivilegesRequired=lowest',
    'DefaultDirName={localappdata}\\Programs\\K-SESSION-Beta','UninstallFilesDir={app}\\uninstall','CloseApplications=no','RestartApplications=no']) {
    assert.ok(iss.split(/\r?\n/).includes(line), line);
  }
  assert.equal(toolchain.installerVersion, '1.1.0-beta.2'); assert.equal(toolchain.version, '6.7.3');
  assert.ok(!iss.toLowerCase().includes('taskkill'));
});
test('U01-U08/U15-U17 exact beta1 gate runs before recoverable transaction and hides data selection on upgrade', () => {
  assert.match(iss, /RunUpgradeGate[\s\S]*upgrade-gate-cli\.cjs/);
  assert.match(iss, /PrepareToInstall[\s\S]*RunUpgradeGate[\s\S]*PrepareUpgradeTransaction[\s\S]*KSESSION_PREINSTALL_READY/);
  assert.match(iss, /ShouldSkipPage[\s\S]*UpgradeMode and \(PageID = DataPage\.ID\)/);
  assert.match(iss, /升级不会移动或删除业务数据与附件/);
  assert.match(iss, /if not FileExists\(P\) then begin[\s\S]*Result := not UpgradeMode/);
  for (const name of ['upgrade-detection.cjs','upgrade-preflight.cjs','approved-identity-bundle.json','ksession-beta2-node.exe']) assert.ok(iss.includes(name), name);
  assert.ok(build.includes('validateBundle(bundle)'));
});
test('installed beta2 is explicitly rejected while older registrations still reach the exact upgrade gate', () => {
  const start = iss.indexOf('function InitializeSetup: Boolean;');
  const finish = iss.indexOf('function PrepareToInstall', start);
  assert.ok(start >= 0 && finish > start);
  const initialize = iss.slice(start, finish);
  assert.match(initialize, /UpgradeMode := HasRegistration/);
  assert.match(initialize, /ReadUpgradeIdentity/);
  assert.match(initialize, /UpgradeMode and \(PriorDisplayVersion = '1\.1\.0-beta\.2'\)/);
  assert.match(initialize, /KSESSION_REJECT_REGISTERED/);
  assert.ok(initialize.indexOf('ReadUpgradeIdentity') < initialize.indexOf('KSESSION_REJECT_REGISTERED'));
  assert.doesNotMatch(initialize, /RunUpgradeGate|PrepareUpgradeTransaction/);
});
test('U11/U14/U18-U25 transaction stages program and metadata, rolls back before finalize, and records complete state', () => {
  assert.match(build, /DestDir: "\{tmp\}\\\\ksession-upgrade-v1\\\\program/);
  assert.match(iss, /DestDir: "\{tmp\}\\ksession-upgrade-v1\\metadata"/);
  assert.match(iss, /DeinitializeSetup[\s\S]*rollback[\s\S]*RestoreUpgradeRegistration/);
  assert.match(iss, /CurStep = ssPostInstall[\s\S]*CommitUpgradeTransaction[\s\S]*VerifyInstalled[\s\S]*finalize/);
  assert.match(iss, /VerifyFinalRegistration[\s\S]*DisplayVersion[\s\S]*1\.1\.0-beta\.2[\s\S]*instance-binding\.ini/);
  for (const field of ['installerVersion','appVersion','dataContractVersion','sourceCommit','runtimeManifestHash','launcherHash',
    'programManifestHash','instanceBindingSchema','installRoot','instancePath','upgradeFrom','upgradeTo']) assert.ok(iss.includes('"'+field+'"') || build.includes(field), field);
  assert.ok(!build.includes('data.json')); assert.ok(!build.includes('attachments')); assert.ok(!build.includes('backups'));
});
