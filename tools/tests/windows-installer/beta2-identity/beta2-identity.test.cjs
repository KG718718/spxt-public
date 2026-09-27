'use strict';
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const api = require('../../../windows-installer/beta2-identity/index.cjs');
const {inventory} = require('../../../windows-runtime/common.cjs');

function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function expect(code, action) {
  assert.throws(action, error => error instanceof api.Beta2IdentityError && error.code === code);
}
function metadata() {
  return {run: {id: api.RUN_ID, attempt: 1, repository: api.REPOSITORY, headSha: api.SOURCE_COMMIT,
    status: 'completed', conclusion: 'success'}, artifact: {id: api.ARTIFACT_ID, name: api.ARTIFACT_NAME,
    sizeInBytes: api.ARTIFACT_BYTES, digest: api.ARTIFACT_DIGEST, expired: false,
    expiresAt: '2099-10-26T13:55:32Z', archiveDownloadUrl: api.ARTIFACT_URL, workflowRunId: api.RUN_ID}};
}
function fixture() {
  const scratch = path.join(__dirname, '.tmp'); fs.mkdirSync(scratch, {recursive: true});
  const root = fs.mkdtempSync(path.join(scratch, 'case-'));
  const installRoot = path.join(root, 'installed'); const instance = path.join(root, 'instance');
  const program = path.join(installRoot, 'program'); const uninstall = path.join(installRoot, 'uninstall');
  fs.mkdirSync(path.join(program, 'manifest'), {recursive: true}); fs.mkdirSync(path.join(program, 'app'));
  fs.mkdirSync(path.join(program, 'runtime')); fs.mkdirSync(uninstall); fs.mkdirSync(instance);
  fs.writeFileSync(path.join(program, 'K-SESSION.exe'), 'SYNTHETIC LAUNCHER');
  fs.writeFileSync(path.join(program, 'app', 'server.js'), '// synthetic');
  fs.writeFileSync(path.join(program, 'runtime', 'node.exe'), 'SYNTHETIC NODE');
  const runtime = {format: 'k-session-runtime', manifestSchema: 1, version: '1.0.0', platform: 'win32-x64',
    sourceCommit: api.SOURCE_COMMIT, sourceTree: api.SOURCE_TREE, businessDataIncluded: false,
    launcherIncluded: false, build: {toolCommit: api.SOURCE_COMMIT}};
  writeJson(path.join(program, 'manifest', 'runtime-manifest.json'), runtime);
  const payload = inventory(program);
  const manifest = {schema: 1, sourceCommit: api.SOURCE_COMMIT, sourceTree: api.SOURCE_TREE, payload,
    payloadInventorySha256: api.sha(Buffer.from(JSON.stringify(payload))), version: '1.1.0-beta.2'};
  writeJson(path.join(uninstall, 'installer-manifest.json'), manifest);
  const manifestHash = api.sha(fs.readFileSync(path.join(uninstall, 'installer-manifest.json')));
  const runtimeHash = api.sha(fs.readFileSync(path.join(program, 'manifest', 'runtime-manifest.json')));
  const launcherHash = api.sha(fs.readFileSync(path.join(program, 'K-SESSION.exe')));
  writeJson(path.join(uninstall, 'build-info.json'), {product: 'K⁺-SESSION Beta',
    qualification: 'UNSIGNED DEVELOPMENT ARTIFACT', installerVersion: '1.1.0-beta.2', appVersion: '1.0.0',
    dataContractVersion: 1, sourceCommit: api.SOURCE_COMMIT, sourceTree: api.SOURCE_TREE,
    portablePayloadSha256: '1'.repeat(64), runtimeManifestSha256: runtimeHash, launcherSha256: launcherHash,
    packageLockSha256: '2'.repeat(64), nodeVersion: '24.21.0', goVersion: '1.27.1', innoSetupVersion: '6.7.3',
    innoDownloadSha256: '3'.repeat(64), installerScriptSha256: '4'.repeat(64), platform: 'windows',
    architecture: 'x64', buildTimestamp: '2099-01-01T00:00:00.000Z', unsigned: true, mode: 'candidate',
    installedProgramFileCount: payload.length, installedProgramBytes: payload.reduce((n, item) => n + item.bytes, 0),
    instanceBindingSchema: 1, programManifestHash: manifestHash});
  fs.writeFileSync(path.join(uninstall, 'unins000.exe'), 'SYNTHETIC');
  fs.writeFileSync(path.join(uninstall, 'instance-binding.ini'), Buffer.concat([Buffer.from([0xff, 0xfe]),
    Buffer.from(`[Installation]\r\nSchema=1\r\nInstallRoot=${installRoot}\r\nInstance=${instance}\r\n`, 'utf16le')]));
  const snapshot = {registrations: [{view: '64', key: api.UNINSTALL_KEY, displayName: 'K⁺-SESSION Beta',
    displayVersion: '1.1.0-beta.2', installLocation: installRoot,
    uninstallString: `"${path.win32.join(installRoot, 'uninstall', 'unins000.exe')}"`}],
  bindings: [{view: '64', key: api.BINDING_KEY, installRoot, instance}]};
  return {root, installRoot, instance, program, uninstall, snapshot};
}
function cleanup(f) { fs.rmSync(f.root, {recursive: true, force: true}); try { fs.rmdirSync(path.dirname(f.root)); } catch {} }
function cleanupProof() {
  return {uninstallerExitCode: 0, programRootExistsAfterUninstall: false,
    uninstallRegistrationCountAfterUninstall: 0, desktopShortcutExistsAfterUninstall: false,
    startMenuShortcutExistsAfterUninstall: false, bindingRetainedAfterUninstall: true,
    instanceRetainedAfterUninstall: true, retentionProbeUnchangedAfterUninstall: true,
    bindingRegistrationCountAfterHarnessCleanup: 0, instanceExistsAfterHarnessCleanup: false,
    temporaryPayloadRemoved: true};
}

test('API metadata accepts only the fixed F3 run and Artifact', () => {
  assert.equal(api.validateApiMetadata(metadata(), Date.parse('2099-01-01T00:00:00Z')).artifact.id, api.ARTIFACT_ID);
  const cases = [
    ['RUN_METADATA_MISMATCH', value => { value.run.repository = 'other/repo'; }],
    ['RUN_METADATA_MISMATCH', value => { value.run.id += 1; }],
    ['RUN_METADATA_MISMATCH', value => { value.run.headSha = '0'.repeat(40); }],
    ['ARTIFACT_METADATA_MISMATCH', value => { value.artifact.id += 1; }],
    ['ARTIFACT_METADATA_MISMATCH', value => { value.artifact.digest = 'sha256:' + '0'.repeat(64); }]
  ];
  for (const [code, mutate] of cases) { const value = structuredClone(metadata()); mutate(value); expect(code, () => api.validateApiMetadata(value)); }
  const missing = metadata(); delete missing.artifact.name; expect('ARTIFACT_METADATA_MISMATCH', () => api.validateApiMetadata(missing));
  const extra = metadata(); extra.run.unknown = true; expect('RUN_METADATA_MISMATCH', () => api.validateApiMetadata(extra));
});

test('setup selection rejects missing, duplicate, wrong bytes and wrong hash', () => {
  const root = fs.mkdtempSync(path.join(__dirname, '.tmp-setup-'));
  try {
    expect('SETUP_NOT_UNIQUE', () => api.locateUniqueSetup(root));
    fs.writeFileSync(path.join(root, api.SETUP_NAME), 'not-f3');
    expect('SETUP_IDENTITY_MISMATCH', () => api.locateUniqueSetup(root));
    fs.mkdirSync(path.join(root, 'copy')); fs.writeFileSync(path.join(root, 'copy', api.SETUP_NAME), 'not-f3');
    expect('SETUP_NOT_UNIQUE', () => api.locateUniqueSetup(root));
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('archive identity rejects wrong ZIP size or digest before extraction', () => {
  assert.equal(api.validateArchiveIdentity(api.ARTIFACT_BYTES, api.ARTIFACT_DIGEST), true);
  expect('ARCHIVE_IDENTITY_MISMATCH', () => api.validateArchiveIdentity(api.ARTIFACT_BYTES + 1, api.ARTIFACT_DIGEST));
  expect('ARCHIVE_IDENTITY_MISMATCH', () => api.validateArchiveIdentity(api.ARTIFACT_BYTES, 'sha256:' + '0'.repeat(64)));
});

test('installed footprint fixes beta.2 source/tree/manifest/inventory/build/runtime/launcher/binding', () => {
  const f = fixture();
  try {
    const policy = api.collectInstalledPolicy(f.installRoot, f.instance);
    assert.equal(policy.fromInstallerVersion, '1.1.0-beta.2');
    assert.equal(policy.targetInstallerVersion, '1.1.0-beta.3');
    assert.equal(policy.appVersion, '1.0.0'); assert.equal(policy.dataContractVersion, 1);
    const buildFile = path.join(f.uninstall, 'build-info.json');
    const build = JSON.parse(fs.readFileSync(buildFile)); build.unknown = true; writeJson(buildFile, build);
    expect('BUILD_INFO_INVALID', () => api.collectInstalledPolicy(f.installRoot, f.instance));
  } finally { cleanup(f); }
});

test('snapshot rejects unknown registration, wrong version and path conflicts', () => {
  const f = fixture();
  try {
    assert.equal(api.validateSnapshot(f.snapshot, f.installRoot, f.instance).registrations.length, 1);
    const unknown = structuredClone(f.snapshot); unknown.registrations[0].extra = true;
    expect('REGISTRY_CONFLICT', () => api.validateSnapshot(unknown, f.installRoot, f.instance));
    const version = structuredClone(f.snapshot); version.registrations[0].displayVersion = '1.1.0-beta.3';
    expect('REGISTRY_CONTRACT_INVALID', () => api.validateSnapshot(version, f.installRoot, f.instance));
    const location = structuredClone(f.snapshot); location.bindings[0].instance = path.join(f.root, 'other');
    expect('REGISTRY_CONTRACT_INVALID', () => api.validateSnapshot(location, f.installRoot, f.instance));
  } finally { cleanup(f); }
});

test('final evidence is closed, non-sensitive and cleanup proves instance retention', () => {
  const f = fixture();
  try {
    const draft = api.createDraft(metadata(), f.snapshot, f.installRoot, f.instance);
    assert.equal(draft.profile.id, api.PROFILE_ID);
    assert.doesNotMatch(JSON.stringify(draft), /case-|[A-Za-z]:[\\/]/);
    const evidence = api.finalizeEvidence(draft, cleanupProof());
    assert.equal(api.validateEvidence(evidence), evidence);
    const unknown = structuredClone(evidence); unknown.profile.policy.wildcard = true;
    expect('POLICY_INVALID', () => api.validateEvidence(unknown));
    const cleanupUnknown = structuredClone(evidence); cleanupUnknown.verification.cleanup.unknown = true;
    expect('CLEANUP_FAILED', () => api.validateEvidence(cleanupUnknown));
    const residual = structuredClone(evidence); residual.verification.cleanup.programRootExistsAfterUninstall = true;
    expect('CLEANUP_FAILED', () => api.validateEvidence(residual));
    const retentionLost = structuredClone(evidence); retentionLost.verification.cleanup.instanceRetainedAfterUninstall = false;
    expect('CLEANUP_FAILED', () => api.validateEvidence(retentionLost));
    const extraText = structuredClone(evidence); extraText.verification.cleanup.notes = 'clean';
    expect('CLEANUP_FAILED', () => api.validateEvidence(extraText));
    const failed = cleanupProof(); failed.retentionProbeUnchangedAfterUninstall = false;
    expect('CLEANUP_FAILED', () => api.finalizeEvidence(draft, failed));
    expect('OUTPUT_SENSITIVE', () => api.assertNoSensitiveOutput({password: 'synthetic'}));
    expect('OUTPUT_SENSITIVE', () => api.assertNoSensitiveOutput({value: String.raw`C:\private`}));
  } finally { cleanup(f); }
});

test('run report exposes only fixed stage and reason', () => {
  const tested = 'a'.repeat(40);
  assert.equal(api.validateRunReport(api.createRunReport('BLOCKED', 'STATIC_GATE', tested)).reason,
    'BLOCKED_STATIC_GATE');
  assert.deepEqual(api.createRunReport('BLOCKED', 'INSTALL', tested), {schema: 1,
    kind: 'k-session-beta2-identity-run', status: 'BLOCKED', stage: 'INSTALL', reason: 'BLOCKED_INSTALL',
    source: {repository: api.REPOSITORY, runId: api.RUN_ID, artifactId: api.ARTIFACT_ID,
      headSha: api.SOURCE_COMMIT}, testedCommit: tested});
  assert.equal(api.validateRunReport(api.createRunReport('PASS', 'FINALIZE', tested)).reason, 'CAPTURED');
  assert.equal(api.validateRunReport(api.createRunReport('BLOCKED', 'CLEANUP_PAYLOAD_REMOVE', tested)).reason,
    'BLOCKED_CLEANUP_PAYLOAD_REMOVE');
  const invoke = fs.readFileSync(path.resolve(__dirname, '../../../windows-installer/beta2-identity/invoke.ps1'), 'utf8');
  const invokedStages = new Set([...invoke.matchAll(/Set-TaskPhase '([^']+)'/g)].map(match => match[1]));
  for (const stage of invokedStages) assert.equal(api.createRunReport('BLOCKED', stage, tested).stage, stage);
  expect('REPORT_INVALID', () => api.createRunReport('PASS', 'COLLECT', tested));
  const earlyPass = api.createRunReport('BLOCKED', 'COLLECT', tested);
  earlyPass.status = 'PASS'; earlyPass.reason = 'CAPTURED';
  expect('REPORT_INVALID', () => api.validateRunReport(earlyPass));
  expect('REPORT_INVALID', () => api.createRunReport('BLOCKED', 'RAW_EXCEPTION_TEXT', tested));
});

test('Get-Command node failure still overwrites the initial report with a fixed safe reason', () => {
  const root = path.resolve(__dirname, '../../../..');
  const output = fs.mkdtempSync(path.join(__dirname, '.tmp-report-'));
  const reportFile = path.join(output, 'BETA2-IDENTITY-REPORT.json');
  const tested = 'a'.repeat(40);
  writeJson(reportFile, api.createRunReport('BLOCKED', 'STATIC_GATE', tested));
  try {
    const where = childProcess.spawnSync('where.exe', ['pwsh.exe'], {encoding: 'utf8'});
    assert.equal(where.status, 0);
    const pwsh = where.stdout.split(/\r?\n/).find(Boolean);
    const result = childProcess.spawnSync(pwsh, ['-NoLogo', '-NoProfile', '-File',
      path.join(root, 'tools/windows-installer/beta2-identity/invoke.ps1'), '-RepositoryRoot', root,
      '-OutputDirectory', output, '-TestedCommit', tested],
    {encoding: 'utf8', env: {SystemRoot: process.env.SystemRoot, PATH: path.dirname(pwsh),
      GITHUB_ACTIONS: 'true', GITHUB_TOKEN: 'SYNTHETIC_NOT_EMITTED'}});
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^BETA2_IDENTITY_BLOCKED_HOSTED_PREFLIGHT\r?\n$/);
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(api.validateRunReport(report).reason, 'BLOCKED_HOSTED_PREFLIGHT');
    assert.equal(fs.existsSync(path.join(output, 'beta2-identity-evidence.json')), false);
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});

test('workflow adds a single isolated lan-identity job and fixed Artifact allowlist', () => {
  const root = path.resolve(__dirname, '../../../..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/setup-v3.yml'), 'utf8');
  assert.match(workflow, /\n\s+- lan-identity\s*\n/);
  const jobStart = workflow.indexOf('\n  lan-identity:');
  const job = workflow.slice(jobStart, workflow.indexOf('\n  historical-identity:', jobStart));
  assert.match(job, /inputs\.mode == 'lan-identity'/);
  assert.match(job, /refs\/heads\/codex\/lan-host-v1\.1/);
  assert.match(job, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read/);
  assert.match(job, /BETA2-IDENTITY-REPORT\.json/);
  assert.match(job, /beta2-identity-evidence\.json/);
  assert.match(job, /pwsh -NoLogo -NoProfile -File tools\/windows-installer\/beta2-identity\/invoke\.ps1/);
  assert.doesNotMatch(job, /upload-artifact[\s\S]*?(setup\.log|stdout|stderr|artifact\.zip|registry|snapshot)/i);
  for (const name of ['setup', 'identity', 'sequence', 'qa-static', 'historical-identity']) {
    const start = workflow.indexOf(`\n  ${name}:`); const end = workflow.indexOf('\n  ', start + 3);
    const body = workflow.slice(start, end < 0 ? workflow.length : end);
    assert.doesNotMatch(body, /inputs\.mode == 'lan-identity'/, `${name} must stay skipped`);
  }
});
