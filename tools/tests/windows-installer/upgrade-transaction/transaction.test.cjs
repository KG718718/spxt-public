'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { inventory } = require('../../../windows-runtime/common.cjs');
const tx = require('../../../windows-installer/upgrade-transaction/index.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function put(file, bytes) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); }
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ksession-tx-'));
  const installRoot = path.join(root, 'install'), instancePath = path.join(root, 'instance');
  const stagedProgram = path.join(root, 'stage', 'program'), stagedMetadata = path.join(root, 'stage', 'metadata');
  put(path.join(installRoot, 'program', 'old.txt'), 'old-program');
  put(path.join(installRoot, 'uninstall', 'build-info.json'), '{"old":true}\n');
  put(path.join(installRoot, 'uninstall', 'installer-manifest.json'), '{"old":true}\n');
  put(path.join(installRoot, 'uninstall', 'instance-binding.ini'), '[Installation]\nSchema=1\n');
  put(path.join(installRoot, 'uninstall', 'LICENSE-Inno-Setup.txt'), 'license');
  put(path.join(installRoot, 'uninstall', 'unins000.dat'), 'uninstall-data');
  put(path.join(installRoot, 'uninstall', 'unins000.exe'), 'uninstaller');
  put(path.join(instancePath, 'data.json'), '{"sentinel":"business"}\n');
  put(path.join(instancePath, 'config.json'), '{"buyer":"synthetic"}\n');
  put(path.join(instancePath, 'attachments', 'synthetic.bin'), Buffer.from([0, 1, 2, 3]));
  put(path.join(instancePath, 'backups', 'data.synthetic.json'), '{"backup":true}\n');
  put(path.join(instancePath, 'mail-reminder.config.json'), '{"enabled":false}\n');
  put(path.join(instancePath, 'runtime', 'secrets', 'smtp-pass.dpapi'), Buffer.from([9, 8, 7, 6, 5]));
  const runtime = Buffer.from('{"runtime":"beta2"}\n'), launcher = Buffer.from('launcher-beta2');
  put(path.join(stagedProgram, 'manifest', 'runtime-manifest.json'), runtime);
  put(path.join(stagedProgram, 'K-SESSION.exe'), launcher);
  put(path.join(stagedProgram, 'app', 'server.js'), 'module.exports=true;\n');
  const payload = inventory(stagedProgram);
  const sourceCommit = 'a'.repeat(40);
  const manifest = { schema: 1, sourceCommit, sourceTree: 'b'.repeat(40), payload,
    payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: tx.INSTALLER_VERSION };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  put(path.join(stagedMetadata, 'installer-manifest.json'), manifestBytes);
  put(path.join(stagedMetadata, 'build-info.json'), JSON.stringify({ installerVersion: tx.INSTALLER_VERSION,
    appVersion: tx.APP_VERSION, dataContractVersion: 1, sourceCommit,
    runtimeManifestSha256: sha(runtime), launcherSha256: sha(launcher), programManifestHash: sha(manifestBytes),
    instanceBindingSchema: 1 }, null, 2) + '\n');
  const desktopShortcut = path.join(root, 'desktop', 'K-SESSION.lnk'), startMenuShortcut = path.join(root, 'start', 'K-SESSION.lnk');
  put(desktopShortcut, 'old-desktop'); put(startMenuShortcut, 'old-start');
  const plan = { schema: 1, installRoot, instancePath, stagedProgram, stagedMetadata, desktopShortcut, startMenuShortcut,
    sourceCommit, runtimeManifestHash: sha(runtime), launcherHash: sha(launcher), programManifestHash: sha(manifestBytes),
    instanceBindingSchema: 1, upgradeFrom: '1.1.0-beta.1', upgradeTo: tx.INSTALLER_VERSION };
  return { root, plan, business: inventory(instancePath), desktopShortcut, startMenuShortcut };
}
function cleanup(f) { fs.rmSync(f.root, { recursive: true, force: true }); }
for (const fault of ['after-old-program', 'after-new-program', 'after-metadata']) {
  test('fault '+fault+' restores old owned state and leaves instance byte-identical', () => {
    const f = fixture();
    try {
      tx.prepare(f.plan);
      fs.writeFileSync(f.desktopShortcut, 'new-desktop'); fs.writeFileSync(f.startMenuShortcut, 'new-start');
      assert.throws(() => tx.commit(f.plan, fault), error => error.code === 'COMMIT_FAILED_ROLLED_BACK');
      assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
      assert.equal(fs.readFileSync(f.desktopShortcut, 'utf8'), 'old-desktop');
      assert.equal(fs.readFileSync(f.startMenuShortcut, 'utf8'), 'old-start');
      assert.deepEqual(inventory(f.plan.instancePath), f.business);
      assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    } finally { cleanup(f); }
  });
}
test('commit records complete beta2 state and finalize removes recovery only', () => {
  const f = fixture();
  try {
    tx.prepare(f.plan); const result = tx.commit(f.plan); assert.equal(result.code, 'TRANSACTION_SWAPPED');
    const state = JSON.parse(fs.readFileSync(path.join(f.plan.installRoot, 'uninstall', 'install-state.json')));
    assert.deepEqual(Object.keys(state).sort(), ['appVersion','dataContractVersion','installRoot','installerVersion','instanceBindingSchema','instancePath','launcherHash','programManifestHash','runtimeManifestHash','schema','sourceCommit','upgradeFrom','upgradeTo'].sort());
    assert.equal(state.installerVersion, '1.1.0-beta.2'); assert.equal(state.upgradeFrom, '1.1.0-beta.1');
    assert.deepEqual(inventory(f.plan.instancePath), f.business);
    assert.equal(tx.finalize(f.plan).code, 'TRANSACTION_COMMITTED');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'K-SESSION.exe'), 'utf8'), 'launcher-beta2');
  } finally { cleanup(f); }
});
test('prepare rejects staged payload tampering before recovery is created', () => {
  const f = fixture();
  try {
    fs.appendFileSync(path.join(f.plan.stagedProgram, 'K-SESSION.exe'), 'tampered');
    assert.throws(() => tx.prepare(f.plan), error => error.code === 'STAGE_PAYLOAD');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
  } finally { cleanup(f); }
});
test('prepare rejects the obsolete handcrafted manifest hash alias', () => {
  const f = fixture();
  try {
    const file = path.join(f.plan.stagedMetadata, 'build-info.json');
    const build = JSON.parse(fs.readFileSync(file, 'utf8'));
    build.programManifestSha256 = build.programManifestHash;
    delete build.programManifestHash;
    fs.writeFileSync(file, JSON.stringify(build, null, 2) + '\n');
    assert.throws(() => tx.prepare(f.plan), error => error.code === 'STAGE_IDENTITY');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
  } finally { cleanup(f); }
});
test('prepare rejects unknown uninstall entries instead of copying untrusted metadata', () => {
  const f = fixture();
  try {
    put(path.join(f.plan.installRoot, 'uninstall', 'unknown.bin'), 'untrusted');
    assert.throws(() => tx.prepare(f.plan), error => error.code === 'OLD_METADATA_INVALID');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
  } finally { cleanup(f); }
});
test('prepare rejects an unexpected old install state before the new state create-only write', () => {
  const f = fixture();
  try {
    put(path.join(f.plan.installRoot, 'uninstall', 'install-state.json'), '{"unexpected":true}\n');
    assert.throws(() => tx.prepare(f.plan), error => error.code === 'OLD_METADATA_INVALID');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
  } finally { cleanup(f); }
});
test('plan cannot include business instance in install or stage scope', () => {
  const f = fixture();
  try {
    assert.throws(() => tx.prepare({ ...f.plan, instancePath: path.join(f.plan.installRoot, 'instance') }), error => error.code === 'INSTANCE_SCOPE');
  } finally { cleanup(f); }
});
