'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const helperDir = path.resolve(__dirname, '../../../windows-installer/upgrade-detection');
const {BINDING_KEY, Rejection, UNINSTALL_KEY, inventory, sha, validate} = require(path.join(helperDir, 'index.cjs'));
const COMMIT = 'e9417f036d0cdf736ff84682556a994040f0de0b';
const TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';

function writeJSON(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function writeBinding(file, root, instance) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`[Installation]\r\nSchema=1\r\nInstallRoot=${root}\r\nInstance=${instance}\r\n`, 'utf16le')]));
}
function clone(value) { return structuredClone(value); }

function fixture() {
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
  fs.writeFileSync(path.join(program, 'K-SESSION.exe'), 'SYNTHETIC LAUNCHER - NOT EXECUTABLE');
  fs.writeFileSync(path.join(program, 'runtime', 'placeholder'), 'SYNTHETIC RUNTIME');
  fs.writeFileSync(path.join(program, 'app', 'server.js'), '// synthetic\n');
  const runtime = {format: 'k-session-runtime', manifestSchema: 1, version: '1.0.0', platform: 'win32-x64',
    sourceCommit: COMMIT, sourceTree: TREE, businessDataIncluded: false, launcherIncluded: false,
    build: {toolCommit: COMMIT}};
  writeJSON(path.join(program, 'manifest', 'runtime-manifest.json'), runtime);
  const runtimeHash = sha(fs.readFileSync(path.join(program, 'manifest', 'runtime-manifest.json')));
  const launcherHash = sha(fs.readFileSync(path.join(program, 'K-SESSION.exe')));
  const buildInfo = {installerVersion: '1.1.0-beta.1', appVersion: '1.0.0', sourceCommit: COMMIT, sourceTree: TREE,
    runtimeManifestSha256: runtimeHash, launcherSha256: launcherHash, buildTimestamp: 'SYNTHETIC'};
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

test('CLI enforces policy byte hash and redacts failure output', () => {
  const f = fixture();
  try {
    const policyFile = path.join(f.temporary, 'policy.json'); const snapshotFile = path.join(f.temporary, 'snapshot.json');
    writeJSON(policyFile, f.policy); writeJSON(snapshotFile, f.snapshot);
    const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--policy', policyFile, '--policy-sha256', '0'.repeat(64), '--snapshot', snapshotFile],
      {encoding: 'utf8'});
    assert.equal(run.status, 40); assert.match(run.stdout, /POLICY_HASH_MISMATCH/);
    assert.doesNotMatch(run.stdout + run.stderr, /Synthetic|ksession-upgrade-detection|[a-f0-9]{64}/i);
  } finally { cleanup(f); }
});

test('CLI success is read-only for the instance directory', () => {
  const f = fixture();
  try {
    const policyFile = path.join(f.temporary, 'policy.json'); const snapshotFile = path.join(f.temporary, 'snapshot.json');
    writeJSON(policyFile, f.policy); writeJSON(snapshotFile, f.snapshot);
    const before = fs.readdirSync(f.actualInstance);
    const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--policy', policyFile,
      '--policy-sha256', sha(fs.readFileSync(policyFile)), '--snapshot', snapshotFile],
    {encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr); assert.equal(JSON.parse(run.stdout).code, 'ELIGIBLE_BETA1');
    assert.deepEqual(fs.readdirSync(f.actualInstance), before);
  } finally { cleanup(f); }
});

test('CLI rejects unknown or duplicate arguments', () => {
  const run = cp.spawnSync(process.execPath, [path.join(helperDir, 'cli.cjs'), '--policy', 'x', '--policy', 'y', '--snapshot', 'z'], {encoding: 'utf8'});
  assert.equal(run.status, 64); assert.equal(JSON.parse(run.stdout).code, 'USAGE');
});
