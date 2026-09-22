'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const helperDir = path.resolve(__dirname, '../../../windows-installer/upgrade-detection');
const {BINDING_KEY, Rejection, UNINSTALL_KEY, inventory, sha, validate,
  validateApprovedIdentity, validateBundle} = require(path.join(helperDir, 'index.cjs'));
const {inventory: buildInventory} = require('../../../windows-runtime/common.cjs');
const COMMIT = 'e9417f036d0cdf736ff84682556a994040f0de0b';
const TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';

function writeJSON(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function writeBinding(file, root, instance) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`[Installation]\r\nSchema=1\r\nInstallRoot=${root}\r\nInstance=${instance}\r\n`, 'utf16le')]));
}
function clone(value) { return structuredClone(value); }

function fixture(seed = 'SYNTHETIC') {
  const scratch = path.join(__dirname, '.tmp');
  fs.mkdirSync(scratch, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(scratch, 'case-'));
  const actualRoot = path.join(temporary, 'installed');
  const actualInstance = path.join(temporary, 'instance');
  const program = path.join(actualRoot, 'program');
  const uninstall = path.join(actualRoot, 'uninstall');
  fs.mkdirSync(path.join(program, 'manifest'), {recursive: true});
  fs.mkdirSync(path.join(program, 'app'), {recursive: true});
  fs.mkdirSync(path.join(program, 'runtime'), {recursive: true});
  fs.mkdirSync(uninstall, {recursive: true});
  fs.mkdirSync(actualInstance);
  fs.writeFileSync(path.join(program, 'K-SESSION.exe'), `${seed} LAUNCHER - NOT EXECUTABLE`);
  fs.writeFileSync(path.join(program, 'runtime', 'placeholder'), `${seed} RUNTIME`);
  fs.writeFileSync(path.join(program, 'app', 'server.js'), `// ${seed}\n`);
  const runtime = {format: 'k-session-runtime', manifestSchema: 1, version: '1.0.0', platform: 'win32-x64',
    sourceCommit: COMMIT, sourceTree: TREE, businessDataIncluded: false, launcherIncluded: false,
    build: {toolCommit: COMMIT}};
  writeJSON(path.join(program, 'manifest', 'runtime-manifest.json'), runtime);
  const runtimeHash = sha(fs.readFileSync(path.join(program, 'manifest', 'runtime-manifest.json')));
  const launcherHash = sha(fs.readFileSync(path.join(program, 'K-SESSION.exe')));
  const buildInfo = {installerVersion: '1.1.0-beta.1', appVersion: '1.0.0', sourceCommit: COMMIT, sourceTree: TREE,
    runtimeManifestSha256: runtimeHash, launcherSha256: launcherHash, buildTimestamp: seed};
  writeJSON(path.join(uninstall, 'build-info.json'), buildInfo);
  fs.writeFileSync(path.join(uninstall, 'unins000.exe'), 'SYNTHETIC UNINSTALLER - NOT EXECUTABLE');
  const winRoot = actualRoot;
  const winInstance = actualInstance;
  writeBinding(path.join(uninstall, 'instance-binding.ini'), winRoot, winInstance);
  const payload = inventory(program);
  const manifest = {schema: 1, sourceCommit: COMMIT, sourceTree: TREE, payload,
    payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: '1.1.0-beta.1'};
  writeJSON(path.join(uninstall, 'installer-manifest.json'), manifest);
  const policy = {schema: 1, appId: 'KSESSION-Beta-Installer-v1', uninstallKey: UNINSTALL_KEY, bindingKey: BINDING_KEY,
    fromInstallerVersion: '1.1.0-beta.1', targetInstallerVersion: '1.1.0-beta.2', appVersion: '1.0.0',
    dataContractVersion: 1, allowLegacyMissingDataContract: true, sourceCommit: COMMIT, sourceTree: TREE,
    programManifestSha256: sha(fs.readFileSync(path.join(uninstall, 'installer-manifest.json'))),
    programInventorySha256: manifest.payloadInventorySha256, runtimeManifestSha256: runtimeHash,
    launcherSha256: launcherHash, buildInfoSha256: sha(fs.readFileSync(path.join(uninstall, 'build-info.json')))};
  const snapshot = {registrations: [{view: '64', key: UNINSTALL_KEY, displayName: 'K⁺-SESSION Beta',
    displayVersion: '1.1.0-beta.1', installLocation: winRoot,
    uninstallString: `"${winRoot}\\uninstall\\unins000.exe"`}],
    bindings: [{view: '64', key: BINDING_KEY, installRoot: winRoot, instance: winInstance}]};
  return {temporary, actualRoot, actualInstance, program, uninstall, policy, snapshot, winRoot, winInstance};
}

function cleanup(f) {
  fs.rmSync(f.temporary, {recursive: true, force: true});
  try { fs.rmdirSync(path.dirname(f.temporary)); } catch {}
}
function expectCode(f, code) {
  assert.throws(() => validate(f.snapshot, f.policy), error => error instanceof Rejection && error.code === code);
}
function approvedBundle(historicalPolicy, freshPolicy) {
  return {schema: 1, profiles: [
    {id: 'historical-run-35514357007', sources: ['historical-run-35514357007'], policy: clone(historicalPolicy)},
    {id: 'fresh-ci-baseline', sources: ['fresh-ci-baseline'], policy: clone(freshPolicy)}
  ]};
}
function expectBundleCode(snapshot, bundle, code) {
  assert.throws(() => validateApprovedIdentity(snapshot, bundle), error => error instanceof Rejection && error.code === code);
}

test('inventory matches beta.1 build ordering by globally sorting complete relative paths', () => {
  const scratch = path.join(__dirname, '.tmp');
  fs.mkdirSync(scratch, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(scratch, 'inventory-order-'));
  try {
    fs.mkdirSync(path.join(temporary, 'a'));
    fs.writeFileSync(path.join(temporary, 'a', 'a'), 'nested');
    fs.writeFileSync(path.join(temporary, 'a-'), 'root');
    const betaBuildOrder = buildInventory(temporary).map(item => item.path);
    assert.deepEqual(betaBuildOrder, ['a-', 'a/a']);
    assert.deepEqual(inventory(temporary).map(item => item.path), betaBuildOrder);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
    try { fs.rmdirSync(scratch); } catch {}
  }
});

test('U01/U07 accepts only exact anchored beta.1 and maps its missing data contract to DC1', () => {
  const f = fixture();
  try {
    const result = validate(f.snapshot, f.policy);
    assert.deepEqual(result, {status: 'PASS', code: 'ELIGIBLE_BETA1', fromInstallerVersion: '1.1.0-beta.1',
      targetInstallerVersion: '1.1.0-beta.2', installRoot: f.winRoot, instancePath: f.winInstance, dataContractVersion: 1});
  } finally { cleanup(f); }
});

test('U03/U04 rejects portable, unregistered and online/legacy identities', async t => {
  await t.test('portable or unregistered', () => { const f = fixture(); try { f.snapshot.registrations = []; expectCode(f, 'REGISTRATION_COUNT'); } finally { cleanup(f); } });
  await t.test('online/legacy version', () => { const f = fixture(); try { f.snapshot.registrations[0].displayVersion = '1.0.0'; expectCode(f, 'VERSION_UNSUPPORTED'); } finally { cleanup(f); } });
});

test('U05/U06 rejects same, higher and downgrade-source versions', async t => {
  for (const version of ['1.1.0-beta.2', '1.1.0-beta.3', '2.0.0']) {
    await t.test(version, () => { const f = fixture(); try { f.snapshot.registrations[0].displayVersion = version; expectCode(f, 'VERSION_UNSUPPORTED'); } finally { cleanup(f); } });
  }
});

test('U16 rejects missing, duplicate, incomplete and contradictory binding/registration', async t => {
  await t.test('missing binding', () => { const f = fixture(); try { f.snapshot.bindings = []; expectCode(f, 'BINDING_COUNT'); } finally { cleanup(f); } });
  await t.test('duplicate registration views', () => { const f = fixture(); try { f.snapshot.registrations.push({...f.snapshot.registrations[0], view: '32'}); expectCode(f, 'REGISTRATION_COUNT'); } finally { cleanup(f); } });
  await t.test('missing required field', () => { const f = fixture(); try { delete f.snapshot.bindings[0].instance; expectCode(f, 'SNAPSHOT_INVALID'); } finally { cleanup(f); } });
  await t.test('conflicting root', () => { const f = fixture(); try { f.snapshot.bindings[0].installRoot = String.raw`E:\Synthetic\Other`; expectCode(f, 'BINDING_CONFLICT'); } finally { cleanup(f); } });
  await t.test('forged uninstall command', () => { const f = fixture(); try { f.snapshot.registrations[0].uninstallString = String.raw`E:\Other\unins000.exe`; expectCode(f, 'UNINSTALL_METADATA_INVALID'); } finally { cleanup(f); } });
});

test('U17 rejects payload tampering and a rewritten self-consistent old manifest', async t => {
  await t.test('payload differs from anchored manifest', () => { const f = fixture(); try { fs.appendFileSync(path.join(f.program, 'app', 'server.js'), '// tamper'); expectCode(f, 'PROGRAM_TAMPERED'); } finally { cleanup(f); } });
  await t.test('attacker rewrites payload and manifest together', () => {
    const f = fixture();
    try {
      fs.appendFileSync(path.join(f.program, 'app', 'server.js'), '// tamper');
      const payload = inventory(f.program);
      writeJSON(path.join(f.uninstall, 'installer-manifest.json'), {schema: 1, sourceCommit: COMMIT, sourceTree: TREE,
        payload, payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: '1.1.0-beta.1'});
      expectCode(f, 'MANIFEST_UNTRUSTED');
    } finally { cleanup(f); }
  });
  await t.test('unsafe manifest path is rejected even when policy pins its bytes', () => {
    const f = fixture();
    try {
      const file = path.join(f.uninstall, 'installer-manifest.json'); const manifest = JSON.parse(fs.readFileSync(file));
      manifest.payload[0].path = '../escape'; manifest.payloadInventorySha256 = sha(Buffer.from(JSON.stringify(manifest.payload)));
      writeJSON(file, manifest); f.policy.programManifestSha256 = sha(fs.readFileSync(file)); f.policy.programInventorySha256 = manifest.payloadInventorySha256;
      expectCode(f, 'MANIFEST_INVALID');
    } finally { cleanup(f); }
  });
  await t.test('reordered manifest entries remain rejected even when the same exact set is repinned', () => {
    const f = fixture();
    try {
      const file = path.join(f.uninstall, 'installer-manifest.json'); const manifest = JSON.parse(fs.readFileSync(file));
      manifest.payload.reverse(); manifest.payloadInventorySha256 = sha(Buffer.from(JSON.stringify(manifest.payload)));
      writeJSON(file, manifest); f.policy.programManifestSha256 = sha(fs.readFileSync(file));
      f.policy.programInventorySha256 = manifest.payloadInventorySha256;
      expectCode(f, 'PROGRAM_TAMPERED');
    } finally { cleanup(f); }
  });
});

test('unknown commit/tree and unknown data contract fail closed', async t => {
  await t.test('unknown baseline policy', () => { const f = fixture(); try { f.policy.sourceCommit = '1'.repeat(40); expectCode(f, 'POLICY_INVALID'); } finally { cleanup(f); } });
  await t.test('declared DC2', () => {
    const f = fixture();
    try {
      const file = path.join(f.uninstall, 'build-info.json'); const build = JSON.parse(fs.readFileSync(file)); build.dataContractVersion = 2; writeJSON(file, build);
      f.policy.buildInfoSha256 = sha(fs.readFileSync(file)); expectCode(f, 'DATA_CONTRACT_UNSUPPORTED');
    } finally { cleanup(f); }
  });
});

test('path overlap and reparse/junction roots are rejected', async t => {
  await t.test('overlap', () => { const f = fixture(); try { f.snapshot.bindings[0].instance = `${f.winRoot}\\instance`; expectCode(f, 'PATH_OVERLAP'); } finally { cleanup(f); } });
  await t.test('junction', () => {
    const f = fixture();
    try {
      const link = path.join(f.temporary, 'linked-install');
      fs.symlinkSync(f.actualRoot, link, 'junction');
      f.snapshot.registrations[0].installLocation = link;
      f.snapshot.registrations[0].uninstallString = `"${link}\\uninstall\\unins000.exe"`;
      f.snapshot.bindings[0].installRoot = link;
      expectCode(f, 'PATH_REPARSE');
    } finally { cleanup(f); }
  });
});

test('approved identity bundle accepts historical and fresh exact anchors independently', () => {
  const historical = fixture('HISTORICAL-RUN-35514357007'); const fresh = fixture('FRESH-CI-BASELINE');
  try {
    const bundle = approvedBundle(historical.policy, fresh.policy);
    assert.equal(validateApprovedIdentity(historical.snapshot, bundle).profileId, 'historical-run-35514357007');
    assert.equal(validateApprovedIdentity(fresh.snapshot, bundle).profileId, 'fresh-ci-baseline');
  } finally { cleanup(historical); cleanup(fresh); }
});

test('identical historical/fresh anchors are represented once with both explicit sources', () => {
  const historical = fixture('BYTE-IDENTICAL-SOURCE');
  try {
    const bundle = {schema: 1, profiles: [{id: 'historical-run-35514357007',
      sources: ['historical-run-35514357007', 'fresh-ci-baseline'], policy: clone(historical.policy)}]};
    assert.equal(validateApprovedIdentity(historical.snapshot, bundle).profileId, 'historical-run-35514357007');
  } finally { cleanup(historical); }
});

test('bundle rejects unlisted same-source identities and dynamic build-info variants', async t => {
  await t.test('third identity with same commit/tree is not trusted', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH'); const third = fixture('THIRD-UNLISTED');
    try { expectBundleCode(third.snapshot, approvedBundle(historical.policy, fresh.policy), 'IDENTITY_NOT_APPROVED'); }
    finally { cleanup(historical); cleanup(fresh); cleanup(third); }
  });
  await t.test('changed dynamic build-info is not accepted by commit/tree alone', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try {
      const file = path.join(historical.uninstall, 'build-info.json'); const build = JSON.parse(fs.readFileSync(file));
      build.buildTimestamp = 'DIFFERENT-DYNAMIC-TIMESTAMP'; writeJSON(file, build);
      expectBundleCode(historical.snapshot, approvedBundle(historical.policy, fresh.policy), 'IDENTITY_NOT_APPROVED');
    } finally { cleanup(historical); cleanup(fresh); }
  });
  await t.test('rewritten payload and old manifest still do not create an approved identity', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH'); const forged = fixture('FORGED');
    try {
      fs.appendFileSync(path.join(forged.program, 'app', 'server.js'), '// attacker rewrite');
      const payload = inventory(forged.program);
      writeJSON(path.join(forged.uninstall, 'installer-manifest.json'), {schema: 1, sourceCommit: COMMIT, sourceTree: TREE,
        payload, payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: '1.1.0-beta.1'});
      expectBundleCode(forged.snapshot, approvedBundle(historical.policy, fresh.policy), 'IDENTITY_NOT_APPROVED');
    } finally { cleanup(historical); cleanup(fresh); cleanup(forged); }
  });
});

test('bundle schema rejects duplicate, ambiguous, excessive and open-ended profiles', async t => {
  await t.test('duplicate profile ID', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try { const bundle = approvedBundle(historical.policy, fresh.policy); bundle.profiles[1].id = bundle.profiles[0].id;
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_INVALID'); }
    finally { cleanup(historical); cleanup(fresh); }
  });
  await t.test('duplicate complete anchor fingerprint', () => {
    const historical = fixture('HISTORICAL');
    try { const bundle = approvedBundle(historical.policy, historical.policy);
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_DUPLICATE_IDENTITY'); }
    finally { cleanup(historical); }
  });
  await t.test('more than two profiles', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try { const bundle = approvedBundle(historical.policy, fresh.policy); bundle.profiles.push(clone(bundle.profiles[0]));
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_INVALID'); }
    finally { cleanup(historical); cleanup(fresh); }
  });
  await t.test('extra bundle field', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try { const bundle = approvedBundle(historical.policy, fresh.policy); bundle.wildcard = true;
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_INVALID'); }
    finally { cleanup(historical); cleanup(fresh); }
  });
  await t.test('unknown profile ID', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try { const bundle = approvedBundle(historical.policy, fresh.policy); bundle.profiles[0].id = 'any-fresh-build';
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_INVALID'); }
    finally { cleanup(historical); cleanup(fresh); }
  });
  await t.test('fresh-only bundle is incomplete', () => {
    const fresh = fixture('FRESH');
    try { const bundle = {schema: 1, profiles: [{id: 'fresh-ci-baseline', sources: ['fresh-ci-baseline'], policy: fresh.policy}]};
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_INCOMPLETE'); }
    finally { cleanup(fresh); }
  });
  await t.test('extra profile field', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try { const bundle = approvedBundle(historical.policy, fresh.policy); bundle.profiles[0].wildcard = true;
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'BUNDLE_INVALID'); }
    finally { cleanup(historical); cleanup(fresh); }
  });
  await t.test('extra policy field', () => {
    const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH');
    try { const bundle = approvedBundle(historical.policy, fresh.policy); bundle.profiles[0].policy.ignoreBuildTimestamp = true;
      assert.throws(() => validateBundle(bundle), error => error instanceof Rejection && error.code === 'POLICY_INVALID'); }
    finally { cleanup(historical); cleanup(fresh); }
  });
});

test('CLI enforces bundle byte hash and redacts failure output', () => {
  const f = fixture('HISTORICAL'); const fresh = fixture('FRESH');
  try {
    const bundleFile = path.join(f.temporary, 'bundle.json'); const snapshotFile = path.join(f.temporary, 'snapshot.json');
    writeJSON(bundleFile, approvedBundle(f.policy, fresh.policy)); writeJSON(snapshotFile, f.snapshot);
    const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--bundle', bundleFile, '--bundle-sha256', '0'.repeat(64), '--snapshot', snapshotFile],
      {encoding: 'utf8'});
    assert.equal(run.status, 40); assert.match(run.stdout, /BUNDLE_HASH_MISMATCH/);
    assert.doesNotMatch(run.stdout + run.stderr, /Synthetic|ksession-upgrade-detection|[a-f0-9]{64}/i);
  } finally { cleanup(f); cleanup(fresh); }
});

test('CLI success is read-only for the instance directory', () => {
  const f = fixture('HISTORICAL'); const fresh = fixture('FRESH');
  try {
    const bundleFile = path.join(f.temporary, 'bundle.json'); const snapshotFile = path.join(f.temporary, 'snapshot.json');
    writeJSON(bundleFile, approvedBundle(f.policy, fresh.policy)); writeJSON(snapshotFile, f.snapshot);
    const before = fs.readdirSync(f.actualInstance);
    const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--bundle', bundleFile,
      '--bundle-sha256', sha(fs.readFileSync(bundleFile)), '--snapshot', snapshotFile],
    {encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr); assert.deepEqual(
      {code: JSON.parse(run.stdout).code, profileId: JSON.parse(run.stdout).profileId},
      {code: 'ELIGIBLE_BETA1', profileId: 'historical-run-35514357007'});
    assert.deepEqual(fs.readdirSync(f.actualInstance), before);
  } finally { cleanup(f); cleanup(fresh); }
});

test('CLI no-match output does not reveal per-profile failures or local paths', () => {
  const historical = fixture('HISTORICAL'); const fresh = fixture('FRESH'); const third = fixture('THIRD');
  try {
    const bundleFile = path.join(third.temporary, 'bundle.json'); const snapshotFile = path.join(third.temporary, 'snapshot.json');
    writeJSON(bundleFile, approvedBundle(historical.policy, fresh.policy)); writeJSON(snapshotFile, third.snapshot);
    const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--bundle', bundleFile,
      '--bundle-sha256', sha(fs.readFileSync(bundleFile)), '--snapshot', snapshotFile], {encoding: 'utf8'});
    assert.equal(run.status, 31); assert.deepEqual(JSON.parse(run.stdout), {status: 'REJECT', code: 'IDENTITY_NOT_APPROVED'});
    assert.doesNotMatch(run.stdout + run.stderr, /PROGRAM_TAMPERED|MANIFEST_UNTRUSTED|HISTORICAL|FRESH|THIRD|case-[^\\/\s]+|[a-f0-9]{64}/i);
  } finally { cleanup(historical); cleanup(fresh); cleanup(third); }
});

test('CLI rejects unknown or duplicate arguments', () => {
  const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--bundle', 'x', '--bundle', 'y', '--snapshot', 'z'], {encoding: 'utf8'});
  assert.equal(run.status, 64); assert.equal(JSON.parse(run.stdout).code, 'USAGE');
});
