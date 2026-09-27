'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { inventory } = require('../../../windows-runtime/common.cjs');
const tx = require('../../../windows-installer/beta3-upgrade/transaction.cjs');
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
  put(path.join(instancePath, 'lan-deployment.json'), '{"schema":1,"port":8083,"adapterPreference":"12345678-1234-1234-1234-123456789abc"}\n');
  put(path.join(instancePath, 'attachments', 'synthetic.bin'), Buffer.from([0, 1, 2, 3]));
  put(path.join(instancePath, 'backups', 'data.synthetic.json'), '{"backup":true}\n');
  put(path.join(instancePath, 'mail-reminder.config.json'), '{"enabled":false}\n');
  put(path.join(instancePath, 'runtime', 'secrets', 'smtp-pass.dpapi'), Buffer.from([9, 8, 7, 6, 5]));
  const runtime = Buffer.from('{"runtime":"beta3"}\n'), launcher = Buffer.from('launcher-beta3');
  const firewallHelper = Buffer.from('firewall-helper-beta3');
  put(path.join(stagedProgram, 'manifest', 'runtime-manifest.json'), runtime);
  put(path.join(stagedProgram, 'K-SESSION.exe'), launcher);
  put(path.join(stagedProgram, 'K-SESSION-Firewall.exe'), firewallHelper);
  put(path.join(stagedProgram, 'app', 'server.js'), 'module.exports=true;\n');
  const payload = inventory(stagedProgram);
  const sourceCommit = 'a'.repeat(40);
  const manifest = { schema: 1, sourceCommit, sourceTree: 'b'.repeat(40), payload,
    payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: tx.INSTALLER_VERSION };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  put(path.join(stagedMetadata, 'installer-manifest.json'), manifestBytes);
  put(path.join(stagedMetadata, 'build-info.json'), JSON.stringify({ installerVersion: tx.INSTALLER_VERSION,
    appVersion: tx.APP_VERSION, dataContractVersion: 1, sourceCommit,
    runtimeManifestSha256: sha(runtime), launcherSha256: sha(launcher), firewallHelperSha256: sha(firewallHelper), programManifestHash: sha(manifestBytes),
    instanceBindingSchema: 1 }, null, 2) + '\n');
  const desktopShortcut = path.join(root, 'desktop', 'K-SESSION.lnk'), startMenuShortcut = path.join(root, 'start', 'K-SESSION.lnk');
  put(desktopShortcut, 'old-desktop'); put(startMenuShortcut, 'old-start');
  const plan = { schema: 1, installRoot, instancePath, stagedProgram, stagedMetadata, desktopShortcut, startMenuShortcut,
    sourceCommit, runtimeManifestHash: sha(runtime), launcherHash: sha(launcher), firewallHelperHash: sha(firewallHelper), programManifestHash: sha(manifestBytes),
    instanceBindingSchema: 1, upgradeFrom: '1.1.0-beta.2', upgradeTo: tx.INSTALLER_VERSION };
  const oldState = {schema: 1, ...tx.ACCEPTED_F3_STATE, instanceBindingSchema: 1, installRoot, instancePath,
    upgradeFrom: '1.1.0-beta.1'};
  const oldStateBytes = Buffer.from(JSON.stringify(oldState, null, 2) + '\n');
  put(path.join(installRoot, 'uninstall', 'install-state.json'), oldStateBytes);
  return { root, plan, business: inventory(instancePath), desktopShortcut, startMenuShortcut, oldStateBytes };
}
function cleanup(f) { fs.rmSync(f.root, { recursive: true, force: true }); }
const cli = path.resolve(__dirname, '../../../windows-installer/beta3-upgrade/transaction-cli.cjs');
function runCli(args) { return cp.spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', windowsHide: true }); }
test('strict state JSON parser treats key-like quoted text as data and rejects decoded duplicate keys at every depth', () => {
  const value = tx.parseStrictJson('{"outer":"quoted \\"fake\\": text","nested":{"value":1}}');
  assert.equal(value.outer, 'quoted "fake": text'); assert.equal(value.nested.value, 1);
  assert.throws(() => tx.parseStrictJson('{"schema":0,"schem\\u0061":1}'));
  assert.throws(() => tx.parseStrictJson('{"nested":{"key":1,"k\\u0065y":2}}'));
  assert.throws(() => tx.parseStrictJson('{"schema":1}{}'));
});
for (const fault of ['after-old-program', 'after-new-program', 'after-metadata']) {
  test('C13 fault '+fault+' restores beta2 owned state and leaves instance byte-identical', () => {
    const f = fixture();
    try {
      tx.prepare(f.plan);
      fs.writeFileSync(f.desktopShortcut, 'new-desktop'); fs.writeFileSync(f.startMenuShortcut, 'new-start');
      assert.throws(() => tx.commit(f.plan, fault), error => error.code === 'COMMIT_FAILED_ROLLED_BACK');
      assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
      assert.equal(fs.readFileSync(f.desktopShortcut, 'utf8'), 'old-desktop');
      assert.equal(fs.readFileSync(f.startMenuShortcut, 'utf8'), 'old-start');
      assert.deepEqual(fs.readFileSync(path.join(f.plan.installRoot, 'uninstall', 'install-state.json')), f.oldStateBytes);
      assert.deepEqual(inventory(f.plan.instancePath), f.business);
      assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    } finally { cleanup(f); }
  });
}
for (const operation of ['write', 'rename']) {
  test('C13 install-state temporary '+operation+' failure restores exact beta2 state bytes', () => {
    const f = fixture(); const original = operation === 'write' ? fs.writeFileSync : fs.renameSync;
    try {
      tx.prepare(f.plan);
      if (operation === 'write') {
        fs.writeFileSync = function(file, ...args) {
          if (String(file).endsWith('install-state.json.new')) throw Object.assign(Error('synthetic write failure'), {code: 'EIO'});
          return original.call(fs, file, ...args);
        };
      } else {
        fs.renameSync = function(source, target) {
          if (String(source).endsWith('install-state.json.new')) throw Object.assign(Error('synthetic rename failure'), {code: 'EIO'});
          return original.call(fs, source, target);
        };
      }
      assert.throws(() => tx.commit(f.plan), error => error.code === 'COMMIT_FAILED_ROLLED_BACK');
      assert.deepEqual(fs.readFileSync(path.join(f.plan.installRoot, 'uninstall', 'install-state.json')), f.oldStateBytes);
      assert.deepEqual(inventory(f.plan.instancePath), f.business);
    } finally {
      if (operation === 'write') fs.writeFileSync = original; else fs.renameSync = original;
      cleanup(f);
    }
  });
}
test('C08 C09 C10 C11 C12 commit preserves instance, account, attachment, LAN config, port and adapter while finalizing beta3', () => {
  const f = fixture();
  try {
    tx.prepare(f.plan); const result = tx.commit(f.plan); assert.equal(result.code, 'TRANSACTION_SWAPPED');
    const state = JSON.parse(fs.readFileSync(path.join(f.plan.installRoot, 'uninstall', 'install-state.json')));
    assert.deepEqual(Object.keys(state).sort(), ['appVersion','dataContractVersion','firewallHelperHash','installRoot','installerVersion','instanceBindingSchema','instancePath','launcherHash','programManifestHash','runtimeManifestHash','schema','sourceCommit','upgradeFrom','upgradeTo'].sort());
    assert.equal(state.installerVersion, '1.1.0-beta.3'); assert.equal(state.upgradeFrom, '1.1.0-beta.2');
    assert.deepEqual(inventory(f.plan.instancePath), f.business);
    assert.equal(tx.finalize(f.plan).code, 'TRANSACTION_COMMITTED');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'K-SESSION.exe'), 'utf8'), 'launcher-beta3');
  } finally { cleanup(f); }
});
test('file rollback retains a fixed journal until registry restoration is acknowledged', () => {
  const f = fixture();
  try {
    tx.prepare(f.plan); tx.commit(f.plan);
    assert.equal(tx.rollback(f.plan, true).code, 'TRANSACTION_ROLLED_BACK_REGISTRY_PENDING');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), true);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
    assert.deepEqual(fs.readFileSync(path.join(f.plan.installRoot, 'uninstall', 'install-state.json')), f.oldStateBytes);
    assert.equal(tx.completeRollback(f.plan).code, 'TRANSACTION_ROLLBACK_COMPLETED');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
  } finally { cleanup(f); }
});
for (const cleanupFault of ['first', 'mid']) {
  test('finalize cleanup '+cleanupFault+' failure stays committed and can never roll back to beta2', () => {
    const f = fixture(), original = fs.rmSync;
    try {
      tx.prepare(f.plan); tx.commit(f.plan);
      fs.rmSync = function(target, options) {
        if (path.basename(String(target)) === tx.COMMITTED_RECOVERY_NAME) {
          if (cleanupFault === 'mid') original.call(fs, path.join(target, 'program'), {recursive: true, force: true});
          throw Object.assign(Error('synthetic committed cleanup failure'), {code: 'EIO'});
        }
        return original.call(fs, target, options);
      };
      assert.equal(tx.finalize(f.plan).code, 'TRANSACTION_COMMITTED_RECOVERY_PENDING');
      fs.rmSync = original;
      assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
      assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.COMMITTED_RECOVERY_NAME)), true);
      assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'K-SESSION.exe'), 'utf8'), 'launcher-beta3');
      assert.throws(() => tx.rollback(f.plan), error => ['RECOVERY_INVALID','PHASE_INVALID'].includes(error.code));
      assert.equal(tx.finalize(f.plan).code, 'TRANSACTION_COMMITTED');
      assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.COMMITTED_RECOVERY_NAME)), false);
      assert.deepEqual(inventory(f.plan.instancePath), f.business);
    } finally { fs.rmSync = original; cleanup(f); }
  });
}
test('prepare rejects staged payload tampering before recovery is created', () => {
  const f = fixture();
  try {
    fs.appendFileSync(path.join(f.plan.stagedProgram, 'K-SESSION.exe'), 'tampered');
    assert.throws(() => tx.prepare(f.plan), error => error.code === 'STAGE_PAYLOAD');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
  } finally { cleanup(f); }
});
test('prepare rejects a helper hash mismatch before recovery is created', () => {
  const f = fixture();
  try {
    assert.throws(() => tx.prepare({...f.plan, firewallHelperHash: '0'.repeat(64)}), error => error.code === 'STAGE_IDENTITY');
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
test('prepare rejects a malformed old beta2 install state before recovery creation', () => {
  const f = fixture();
  try {
    put(path.join(f.plan.installRoot, 'uninstall', 'install-state.json'), '{"unexpected":true}\n');
    assert.throws(() => tx.prepare(f.plan), error => error.code === 'OLD_METADATA_INVALID');
    assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
    assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
  } finally { cleanup(f); }
});
test('prepare accepts both legitimate accepted-F3 beta2 origins and snapshots their exact state bytes', () => {
  for (const upgradeFrom of ['fresh', '1.1.0-beta.1']) {
    const f = fixture();
    try {
      const stateFile = path.join(f.plan.installRoot, 'uninstall', 'install-state.json');
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); state.upgradeFrom = upgradeFrom;
      const bytes = Buffer.from(JSON.stringify(state, null, 2) + '\n'); fs.writeFileSync(stateFile, bytes);
      assert.equal(tx.prepare(f.plan).code, 'TRANSACTION_PREPARED');
      assert.deepEqual(fs.readFileSync(path.join(tx.locations(f.plan).oldUninstall, 'install-state.json')), bytes);
      assert.equal(tx.rollback(f.plan).code, 'TRANSACTION_ROLLED_BACK');
      assert.deepEqual(fs.readFileSync(stateFile), bytes);
    } finally { cleanup(f); }
  }
});
test('prepare rejects missing, mismatched, duplicate-key, or trailing accepted-F3 beta2 install state', () => {
  for (const mutation of ['missing', 'wrong-version', 'wrong-root', 'extra-field', 'duplicate', 'escaped-duplicate', 'trailing']) {
    const f = fixture();
    try {
      const file = path.join(f.plan.installRoot, 'uninstall', 'install-state.json');
      if (mutation === 'missing') fs.rmSync(file);
      else if (mutation === 'duplicate') {
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('{', '{"schema":0,'));
      } else if (mutation === 'escaped-duplicate') {
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('{', '{"schem\\u0061":0,'));
      } else if (mutation === 'trailing') {
        fs.appendFileSync(file, '{}');
      } else {
        const state = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (mutation === 'wrong-version') state.installerVersion = '1.1.0-beta.1';
        if (mutation === 'wrong-root') state.installRoot = path.join(f.root, 'other-install');
        if (mutation === 'extra-field') state.untrusted = true;
        fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
      }
      assert.throws(() => tx.prepare(f.plan), error => error.code === 'OLD_METADATA_INVALID', mutation);
      assert.equal(fs.existsSync(path.join(f.plan.installRoot, tx.RECOVERY_NAME)), false);
      assert.equal(fs.readFileSync(path.join(f.plan.installRoot, 'program', 'old.txt'), 'utf8'), 'old-program');
    } finally { cleanup(f); }
  }
});
test('plan cannot include business instance in install or stage scope', () => {
  const f = fixture();
  try {
    assert.throws(() => tx.prepare({ ...f.plan, instancePath: path.join(f.plan.installRoot, 'instance') }), error => error.code === 'INSTANCE_SCOPE');
  } finally { cleanup(f); }
});

test('old beta2 install-state changed after prepare is rejected before program swap and snapshot restores exact bytes', () => {
  const f = fixture();
  try {
    const stateFile = path.join(f.plan.installRoot, 'uninstall', 'install-state.json');
    const beforeProgram = inventory(path.join(f.plan.installRoot, 'program'));
    const beforeBusiness = inventory(f.plan.instancePath);
    tx.prepare(f.plan);
    const changed = JSON.parse(f.oldStateBytes.toString('utf8')); changed.launcherHash = '0'.repeat(64);
    fs.writeFileSync(stateFile, JSON.stringify(changed, null, 2) + '\n');
    assert.throws(() => tx.commit(f.plan), error => error.code === 'OLD_METADATA_INVALID');
    assert.deepEqual(inventory(path.join(f.plan.installRoot, 'program')), beforeProgram);
    assert.deepEqual(inventory(f.plan.instancePath), beforeBusiness);
    assert.equal(fs.existsSync(tx.locations(f.plan).oldProgram), false);
    assert.equal(tx.rollback(f.plan).code, 'TRANSACTION_ROLLED_BACK');
    assert.deepEqual(fs.readFileSync(stateFile), f.oldStateBytes);
  } finally { cleanup(f); }
});

test('U22 deferred bad manifest hash is a fixed CLI rejection before old program swap', () => {
  const f = fixture();
  try {
    const beforeInstall = inventory(f.plan.installRoot), beforeBusiness = inventory(f.plan.instancePath);
    const beforeDesktop = fs.readFileSync(f.desktopShortcut), beforeStart = fs.readFileSync(f.startMenuShortcut);
    const stage = path.dirname(f.plan.stagedProgram), deferred = path.join(f.root, 'deferred-stage');
    fs.renameSync(stage, deferred);
    const badPlan = { ...f.plan, programManifestHash: '0'.repeat(64) };
    tx.prepare(badPlan);
    fs.renameSync(deferred, stage);
    const planFile = path.join(f.root, 'bad-plan.json');
    fs.writeFileSync(planFile, JSON.stringify(badPlan));
    const result = runCli(['commit', planFile]);
    assert.equal(result.status, 61);
    assert.equal(result.stdout, '{"ok":false,"code":"STAGE_MANIFEST_HASH"}\n');
    assert.equal(result.stderr, '');
    assert.deepEqual(inventory(f.plan.installRoot).filter(x => !x.path.startsWith(tx.RECOVERY_NAME + '/')), beforeInstall);
    assert.equal(fs.existsSync(tx.locations(badPlan).oldProgram), false);
    assert.deepEqual(inventory(f.plan.instancePath), beforeBusiness);
    assert.deepEqual(fs.readFileSync(f.desktopShortcut), beforeDesktop);
    assert.deepEqual(fs.readFileSync(f.startMenuShortcut), beforeStart);
    tx.rollback(badPlan);
    assert.deepEqual(inventory(f.plan.installRoot), beforeInstall);
  } finally { cleanup(f); }
});

test('deferred valid stage still follows the normal swap and finalize path', () => {
  const f = fixture();
  try {
    const stage = path.dirname(f.plan.stagedProgram), deferred = path.join(f.root, 'deferred-stage');
    fs.renameSync(stage, deferred);
    tx.prepare(f.plan);
    fs.renameSync(deferred, stage);
    assert.equal(tx.commit(f.plan).code, 'TRANSACTION_SWAPPED');
    assert.equal(tx.finalize(f.plan).code, 'TRANSACTION_COMMITTED');
    assert.deepEqual(inventory(f.plan.instancePath), f.business);
  } finally { cleanup(f); }
});

test('transaction CLI emits only fixed safe diagnostics for invalid and internal failures', () => {
  const invalid = runCli([]);
  assert.equal(invalid.status, 60);
  assert.equal(invalid.stdout, '{"ok":false,"code":"ARGUMENT_INVALID"}\n');
  assert.equal(invalid.stderr, '');
  const internal = runCli(['commit', path.join(os.tmpdir(), 'missing-ksession-plan.json')]);
  assert.equal(internal.status, 79);
  assert.equal(internal.stdout, '{"ok":false,"code":"TRANSACTION_INTERNAL"}\n');
  assert.equal(internal.stderr, '');
  assert.doesNotMatch(internal.stdout, /[A-Z]:\\|stack|ENOENT/i);
});
