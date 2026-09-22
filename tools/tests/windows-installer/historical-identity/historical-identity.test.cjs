'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  ARTIFACT_DIGEST,
  ARTIFACT_ID,
  ARTIFACT_NAME,
  ARTIFACT_URL,
  HistoricalIdentityError,
  REPOSITORY,
  RUN_ID,
  SETUP_NAME,
  SOURCE_COMMIT,
  assertNoSensitiveOutput,
  collectInstalledPolicy,
  createDraft,
  finalizeEvidence,
  locateUniqueSetup,
  validateApiMetadata,
  validateEvidence
} = require('../../../windows-installer/historical-identity/index.cjs');
const {BINDING_KEY, UNINSTALL_KEY, inventory, sha} = require('../../../windows-installer/upgrade-detection/index.cjs');

const TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function metadata() {
  return {
    run: {id: RUN_ID, attempt: 1, repository: REPOSITORY, headSha: SOURCE_COMMIT, status: 'completed', conclusion: 'success'},
    artifact: {id: ARTIFACT_ID, name: ARTIFACT_NAME, sizeInBytes: 32506311, digest: ARTIFACT_DIGEST,
      expired: false, expiresAt: '2026-10-20T00:00:00.000Z', archiveDownloadUrl: ARTIFACT_URL, workflowRunId: RUN_ID}
  };
}
function expectHistorical(code, fn) {
  assert.throws(fn, error => error instanceof HistoricalIdentityError && error.code === code);
}
function fixture() {
  const scratch = path.join(__dirname, '.tmp');
  fs.mkdirSync(scratch, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(scratch, 'case-'));
  const installRoot = path.join(temporary, 'installed');
  const instance = path.join(temporary, 'instance');
  const program = path.join(installRoot, 'program');
  const uninstall = path.join(installRoot, 'uninstall');
  fs.mkdirSync(path.join(program, 'manifest'), {recursive: true});
  fs.mkdirSync(path.join(program, 'app'));
  fs.mkdirSync(path.join(program, 'runtime'));
  fs.mkdirSync(uninstall);
  fs.mkdirSync(instance);
  fs.writeFileSync(path.join(program, 'K-SESSION.exe'), 'SYNTHETIC LAUNCHER');
  fs.writeFileSync(path.join(program, 'app', 'server.js'), '// synthetic\n');
  fs.writeFileSync(path.join(program, 'runtime', 'node.exe'), 'SYNTHETIC NODE');
  const runtime = {format: 'k-session-runtime', manifestSchema: 1, version: '1.0.0', platform: 'win32-x64',
    sourceCommit: SOURCE_COMMIT, sourceTree: TREE, businessDataIncluded: false, launcherIncluded: false,
    build: {toolCommit: SOURCE_COMMIT}};
  writeJson(path.join(program, 'manifest', 'runtime-manifest.json'), runtime);
  const runtimeHash = sha(fs.readFileSync(path.join(program, 'manifest', 'runtime-manifest.json')));
  const launcherHash = sha(fs.readFileSync(path.join(program, 'K-SESSION.exe')));
  writeJson(path.join(uninstall, 'build-info.json'), {installerVersion: '1.1.0-beta.1', appVersion: '1.0.0',
    sourceCommit: SOURCE_COMMIT, sourceTree: TREE, runtimeManifestSha256: runtimeHash, launcherSha256: launcherHash,
    buildTimestamp: 'SYNTHETIC'});
  fs.writeFileSync(path.join(uninstall, 'unins000.exe'), 'SYNTHETIC UNINSTALLER');
  const binding = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`[Installation]\r\nSchema=1\r\nInstallRoot=${installRoot}\r\nInstance=${instance}\r\n`, 'utf16le')]);
  fs.writeFileSync(path.join(uninstall, 'instance-binding.ini'), binding);
  const payload = inventory(program);
  writeJson(path.join(uninstall, 'installer-manifest.json'), {schema: 1, sourceCommit: SOURCE_COMMIT, sourceTree: TREE,
    payload, payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: '1.1.0-beta.1'});
  const snapshot = {registrations: [{view: '64', key: UNINSTALL_KEY, displayName: 'K⁺-SESSION Beta',
    displayVersion: '1.1.0-beta.1', installLocation: installRoot,
    uninstallString: `"${installRoot}\\uninstall\\unins000.exe"`}],
  bindings: [{view: '64', key: BINDING_KEY, installRoot, instance}]};
  return {temporary, installRoot, instance, uninstall, snapshot};
}
function cleanup(f) {
  fs.rmSync(f.temporary, {recursive: true, force: true});
  try { fs.rmdirSync(path.dirname(f.temporary)); } catch {}
}
function cleanupProof() {
  return {uninstallerExitCode: 0, programRootExistsAfterUninstall: false, uninstallRegistrationCountAfterUninstall: 0,
    desktopShortcutExistsAfterUninstall: false, startMenuShortcutExistsAfterUninstall: false,
    bindingRetainedAfterUninstall: true, instanceRetainedAfterUninstall: true,
    bindingRegistrationCountAfterHarnessCleanup: 0, instanceExistsAfterHarnessCleanup: false, temporaryPayloadRemoved: true};
}

test('strict API metadata accepts only the fixed successful, unexpired public artifact', () => {
  assert.equal(validateApiMetadata(metadata(), Date.parse('2026-09-22T00:00:00Z')).artifact.id, ARTIFACT_ID);
  for (const mutate of [
    value => { value.run.repository = 'someone/else'; },
    value => { value.run.headSha = '0'.repeat(40); },
    value => { value.run.conclusion = 'failure'; },
    value => { value.artifact.id++; },
    value => { value.artifact.digest = 'sha256:' + '0'.repeat(64); },
    value => { value.artifact.expired = true; }
  ]) {
    const value = structuredClone(metadata()); mutate(value);
    assert.throws(() => validateApiMetadata(value, Date.parse('2026-09-22T00:00:00Z')), HistoricalIdentityError);
  }
  expectHistorical('ARTIFACT_EXPIRED', () => validateApiMetadata(metadata(), Date.parse('2026-10-21T00:00:00Z')));
  const extra = metadata(); extra.artifact.untrusted = true;
  expectHistorical('ARTIFACT_METADATA_MISMATCH', () => validateApiMetadata(extra, Date.parse('2026-09-22T00:00:00Z')));
});

test('unique Setup selection rejects missing, duplicate, reparse and wrong SHA candidates', async t => {
  await t.test('missing', () => {
    const dir = fs.mkdtempSync(path.join(__dirname, '.tmp-missing-'));
    try { expectHistorical('SETUP_NOT_UNIQUE', () => locateUniqueSetup(dir)); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
  });
  await t.test('duplicate', () => {
    const dir = fs.mkdtempSync(path.join(__dirname, '.tmp-duplicate-'));
    try {
      fs.mkdirSync(path.join(dir, 'a')); fs.mkdirSync(path.join(dir, 'b'));
      fs.writeFileSync(path.join(dir, 'a', SETUP_NAME), 'one'); fs.writeFileSync(path.join(dir, 'b', SETUP_NAME), 'two');
      expectHistorical('SETUP_NOT_UNIQUE', () => locateUniqueSetup(dir));
    } finally { fs.rmSync(dir, {recursive: true, force: true}); }
  });
  await t.test('wrong SHA', () => {
    const dir = fs.mkdtempSync(path.join(__dirname, '.tmp-hash-'));
    try { fs.writeFileSync(path.join(dir, SETUP_NAME), 'not the historical Setup');
      expectHistorical('SETUP_IDENTITY_MISMATCH', () => locateUniqueSetup(dir)); }
    finally { fs.rmSync(dir, {recursive: true, force: true}); }
  });
});

test('installed anchors come only from installed program/uninstall paths, never outer final build-info', () => {
  const f = fixture();
  try {
    const policy = collectInstalledPolicy(f.installRoot);
    assert.match(policy.buildInfoSha256, /^[a-f0-9]{64}$/);
    writeJson(path.join(f.temporary, 'build-info.json'), {source: 'outer final artifact metadata'});
    fs.writeFileSync(path.join(f.uninstall, 'build-info.json'), '{"tampered":true}\n');
    expectHistorical('INSTALLED_BUILD_INFO_INVALID', () => collectInstalledPolicy(f.installRoot));
  } finally { cleanup(f); }
});

test('real snapshot shape must have one registration and binding in the same view', async t => {
  await t.test('missing registry', () => {
    const f = fixture(); try { f.snapshot.registrations = []; expectHistorical('T1_REGISTRATION_COUNT', () => createDraft(metadata(), f.snapshot, f.installRoot)); }
    finally { cleanup(f); }
  });
  await t.test('multiple views', () => {
    const f = fixture(); try { f.snapshot.registrations.push({...f.snapshot.registrations[0], view: '32'});
      expectHistorical('T1_REGISTRATION_COUNT', () => createDraft(metadata(), f.snapshot, f.installRoot)); }
    finally { cleanup(f); }
  });
});

test('draft and finalized evidence use the closed profile schema and contain only hashes and identifiers', () => {
  const f = fixture();
  try {
    const draft = createDraft(metadata(), f.snapshot, f.installRoot);
    assert.equal(draft.profile.id, 'historical-run-35514357007');
    assert.equal(draft.verification.t1SinglePolicy, 'PASS');
    assert.doesNotMatch(JSON.stringify(draft), /case-|[A-Za-z]:[\\/]/);
    const evidence = finalizeEvidence(draft, cleanupProof());
    assert.equal(validateEvidence(evidence), evidence);
    const extra = structuredClone(evidence); extra.profile.policy.wildcard = true;
    assert.throws(() => validateEvidence(extra), HistoricalIdentityError);
    const badCleanup = cleanupProof(); badCleanup.instanceExistsAfterHarnessCleanup = true;
    expectHistorical('CLEANUP_FAILED', () => finalizeEvidence(draft, badCleanup));
  } finally { cleanup(f); }
});

test('output redaction rejects local paths, usernames, tokens, credentials and business filenames', () => {
  for (const value of [
    {note: 'E:\\runner\\payload'}, {note: 'C:/Users/runneradmin'}, {note: 'authorization bearer'},
    {note: 'password=value'}, {note: 'data.json'}, {note: 'customer attachment'}
  ]) assert.throws(() => assertNoSensitiveOutput(value), HistoricalIdentityError);
});

test('workflow is dispatch-only, minimal-permission, success-only JSON upload and no package upload', () => {
  const root = path.resolve(__dirname, '../../../..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/setup-b4-historical-identity.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read/);
  assert.match(workflow, /if: success\(\)[\s\S]*path: \$\{\{ env\.KSESSION_HISTORICAL_EVIDENCE \}\}/);
  assert.doesNotMatch(workflow, /upload-artifact[\s\S]*(?:\.exe|artifact\.zip|installed|taskWork)/i);
});
