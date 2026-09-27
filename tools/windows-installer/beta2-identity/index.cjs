'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {inventory} = require('../../windows-runtime/common.cjs');

const REPOSITORY = 'KG718718/spxt-public';
const RUN_ID = 36246132535;
const RUN_ATTEMPT = 1;
const ARTIFACT_ID = 10907910968;
const ARTIFACT_NAME = 'K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58';
const ARTIFACT_BYTES = 32538249;
const ARTIFACT_DIGEST = 'sha256:e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6';
const ARTIFACT_URL = `https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${ARTIFACT_ID}/zip`;
const SETUP_NAME = 'K-SESSION-Setup-1.1.0-beta.2.exe';
const SETUP_BYTES = 33018840;
const SETUP_SHA256 = '877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6';
const SOURCE_COMMIT = 'c8886e6b6d413c2fd73d6716621d07a80b337e58';
const SOURCE_TREE = '0f298af80c1cbdf3835f39aca265cbcdb859bea6';
const PROFILE_ID = 'accepted-f3-run-36246132535';
const UNINSTALL_KEY = String.raw`Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`;
const BINDING_KEY = String.raw`Software\KSESSION\Beta\InstallerBinding`;
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const REPORT_STAGES = new Set(['STATIC_GATE', 'HOSTED_PREFLIGHT', 'API_METADATA', 'ARTIFACT_DOWNLOAD', 'ARCHIVE_IDENTITY',
  'EXTRACT', 'SETUP_IDENTITY', 'INSTALL', 'INSTALL_LOG', 'OWNED_PROCESS_QUIESCE', 'INSTALLED_FOOTPRINT', 'REGISTRY_READ',
  'REGISTRY_NORMALIZE', 'COLLECT', 'RETENTION_PROBE', 'UNINSTALL', 'UNINSTALL_EXIT', 'UNINSTALL_SELF_CLEANUP',
  'UNINSTALL_SELF_CLEANUP_TIMEOUT', 'CLEANUP_VERIFY', 'CLEANUP_READ_PROGRAM_ROOT', 'CLEANUP_PROGRAM_ROOT',
  'CLEANUP_READ_UNINSTALL_REGISTRATION', 'CLEANUP_UNINSTALL_REGISTRATION', 'CLEANUP_READ_DESKTOP_SHORTCUT',
  'CLEANUP_DESKTOP_SHORTCUT', 'CLEANUP_READ_START_MENU_SHORTCUT', 'CLEANUP_START_MENU_SHORTCUT',
  'CLEANUP_READ_BINDING_RETAINED', 'CLEANUP_BINDING_RETAINED', 'CLEANUP_READ_INSTANCE_RETAINED',
  'CLEANUP_INSTANCE_RETAINED', 'CLEANUP_READ_PROBE_RETAINED', 'CLEANUP_PROBE_RETAINED', 'CLEANUP_BINDING_REMOVE',
  'CLEANUP_READ_BINDING_AFTER_HARNESS', 'CLEANUP_INSTANCE_REMOVE', 'CLEANUP_READ_INSTANCE_AFTER_HARNESS',
  'CLEANUP_PAYLOAD_REMOVE', 'CLEANUP_READ_PAYLOAD_AFTER_HARNESS', 'CLEANUP_FINAL_STATE', 'CLEANUP_EVIDENCE_WRITE',
  'FINALIZE']);

class Beta2IdentityError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function fail(code) { throw new Beta2IdentityError(code); }
function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function readRegular(file, code) {
  try {
    const info = fs.lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink()) fail(code);
    return fs.readFileSync(file);
  } catch (error) { if (error instanceof Beta2IdentityError) throw error; fail(code); }
}
function readJson(file, code) {
  const bytes = readRegular(file, code);
  try { return {bytes, value: JSON.parse(bytes.toString('utf8'))}; } catch { fail(code); }
}

function validateApiMetadata(metadata, now = Date.now()) {
  if (!exactKeys(metadata, ['run', 'artifact'])) fail('METADATA_SCHEMA');
  const {run, artifact} = metadata;
  if (!exactKeys(run, ['id', 'attempt', 'repository', 'headSha', 'status', 'conclusion']) ||
      run.id !== RUN_ID || run.attempt !== RUN_ATTEMPT || run.repository !== REPOSITORY ||
      run.headSha !== SOURCE_COMMIT || run.status !== 'completed' || run.conclusion !== 'success') {
    fail('RUN_METADATA_MISMATCH');
  }
  if (!exactKeys(artifact, ['id', 'name', 'sizeInBytes', 'digest', 'expired', 'expiresAt',
    'archiveDownloadUrl', 'workflowRunId']) || artifact.id !== ARTIFACT_ID || artifact.name !== ARTIFACT_NAME ||
      artifact.sizeInBytes !== ARTIFACT_BYTES || artifact.digest !== ARTIFACT_DIGEST || artifact.expired !== false ||
      artifact.archiveDownloadUrl !== ARTIFACT_URL || artifact.workflowRunId !== RUN_ID ||
      typeof artifact.expiresAt !== 'string') fail('ARTIFACT_METADATA_MISMATCH');
  const expiry = Date.parse(artifact.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) fail('ARTIFACT_EXPIRED');
  return metadata;
}
function validateArchiveIdentity(bytes, digest) {
  if (bytes !== ARTIFACT_BYTES || digest !== ARTIFACT_DIGEST) fail('ARCHIVE_IDENTITY_MISMATCH');
  return true;
}

function walkRegular(root, directory = root, result = []) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const full = path.join(directory, entry.name);
    const info = fs.lstatSync(full);
    if (info.isSymbolicLink()) fail('ARTIFACT_REPARSE');
    if (info.isDirectory()) walkRegular(root, full, result);
    else if (info.isFile()) result.push(full);
    else fail('ARTIFACT_SPECIAL_FILE');
  }
  return result;
}
function locateUniqueSetup(root) {
  const matches = walkRegular(root).filter(file => path.basename(file) === SETUP_NAME);
  if (matches.length !== 1) fail('SETUP_NOT_UNIQUE');
  const bytes = readRegular(matches[0], 'SETUP_IDENTITY_MISMATCH');
  if (bytes.length !== SETUP_BYTES || sha(bytes) !== SETUP_SHA256) fail('SETUP_IDENTITY_MISMATCH');
  return matches[0];
}

function normalizeSnapshot(snapshot) {
  if (!exactKeys(snapshot, ['registrations', 'bindings']) || !Array.isArray(snapshot.registrations) ||
      !Array.isArray(snapshot.bindings)) fail('REGISTRY_SCHEMA');
  if (snapshot.registrations.length < 1 || snapshot.bindings.length < 1) fail('REGISTRY_MISSING');
  const normalize = (records, fields) => {
    if (records.some(record => !exactKeys(record, fields) || !['32', '64'].includes(record.view))) fail('REGISTRY_CONFLICT');
    if (records.length === 1) return [structuredClone(records[0])];
    if (records.length !== 2 || new Set(records.map(record => record.view)).size !== 2) fail('REGISTRY_CONFLICT');
    const canonical = records.find(record => record.view === '64');
    const alternate = records.find(record => record.view === '32');
    if (!canonical || !alternate) fail('REGISTRY_CONFLICT');
    for (const field of fields.filter(field => field !== 'view')) if (canonical[field] !== alternate[field]) fail('REGISTRY_CONFLICT');
    return [structuredClone(canonical)];
  };
  const registrations = normalize(snapshot.registrations,
    ['view', 'key', 'displayName', 'displayVersion', 'installLocation', 'uninstallString']);
  const bindings = normalize(snapshot.bindings, ['view', 'key', 'installRoot', 'instance']);
  if (registrations[0].view !== bindings[0].view) fail('REGISTRY_CONFLICT');
  return {registrations, bindings};
}

function validatePolicy(policy) {
  const keys = ['schema', 'appId', 'registrationDisplayName', 'uninstallKey', 'bindingKey',
    'fromInstallerVersion', 'targetInstallerVersion', 'appVersion', 'dataContractVersion',
    'runtimeIdentitySchema', 'instanceBindingSchema', 'sourceCommit', 'sourceTree', 'programManifestSha256',
    'programInventorySha256', 'runtimeManifestSha256', 'launcherSha256', 'buildInfoSha256'];
  if (!exactKeys(policy, keys) || policy.schema !== 1 || policy.appId !== 'KSESSION-Beta-Installer-v1' ||
      policy.registrationDisplayName !== 'K⁺-SESSION Beta' || policy.uninstallKey !== UNINSTALL_KEY ||
      policy.bindingKey !== BINDING_KEY || policy.fromInstallerVersion !== '1.1.0-beta.2' ||
      policy.targetInstallerVersion !== '1.1.0-beta.3' || policy.appVersion !== '1.0.0' ||
      policy.dataContractVersion !== 1 || policy.runtimeIdentitySchema !== 1 || policy.instanceBindingSchema !== 1 ||
      policy.sourceCommit !== SOURCE_COMMIT || policy.sourceTree !== SOURCE_TREE ||
      !COMMIT.test(policy.sourceCommit) || !COMMIT.test(policy.sourceTree) ||
      ['programManifestSha256', 'programInventorySha256', 'runtimeManifestSha256', 'launcherSha256', 'buildInfoSha256']
        .some(field => !SHA256.test(policy[field]))) fail('POLICY_INVALID');
  return policy;
}

function validateBinding(file, installRoot, instance) {
  const bytes = readRegular(file, 'BINDING_INVALID');
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xfe) fail('BINDING_INVALID');
  const lines = bytes.subarray(2).toString('utf16le').split(/\r?\n/).filter(Boolean);
  if (lines.shift() !== '[Installation]') fail('BINDING_INVALID');
  const values = {};
  for (const line of lines) {
    const separator = line.indexOf('=');
    if (separator < 1 || Object.hasOwn(values, line.slice(0, separator))) fail('BINDING_INVALID');
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  if (!exactKeys(values, ['Schema', 'InstallRoot', 'Instance']) || values.Schema !== '1' ||
      path.resolve(values.InstallRoot).toLowerCase() !== path.resolve(installRoot).toLowerCase() ||
      path.resolve(values.Instance).toLowerCase() !== path.resolve(instance).toLowerCase()) fail('BINDING_INVALID');
}

function collectInstalledPolicy(installRoot, instance) {
  const uninstall = path.join(installRoot, 'uninstall');
  const program = path.join(installRoot, 'program');
  const manifestRecord = readJson(path.join(uninstall, 'installer-manifest.json'), 'MANIFEST_INVALID');
  const buildRecord = readJson(path.join(uninstall, 'build-info.json'), 'BUILD_INFO_INVALID');
  const runtimeRecord = readJson(path.join(program, 'manifest', 'runtime-manifest.json'), 'RUNTIME_INVALID');
  const launcher = readRegular(path.join(program, 'K-SESSION.exe'), 'LAUNCHER_INVALID');
  const manifest = manifestRecord.value;
  const build = buildRecord.value;
  const runtime = runtimeRecord.value;
  if (!exactKeys(manifest, ['schema', 'sourceCommit', 'sourceTree', 'payload', 'payloadInventorySha256', 'version']) ||
      manifest.schema !== 1 || manifest.sourceCommit !== SOURCE_COMMIT || manifest.sourceTree !== SOURCE_TREE ||
      manifest.version !== '1.1.0-beta.2' || !Array.isArray(manifest.payload) ||
      !SHA256.test(manifest.payloadInventorySha256) ||
      sha(Buffer.from(JSON.stringify(manifest.payload))) !== manifest.payloadInventorySha256) fail('MANIFEST_INVALID');
  const buildKeys = ['product', 'qualification', 'installerVersion', 'appVersion', 'dataContractVersion', 'sourceCommit',
    'sourceTree', 'portablePayloadSha256', 'runtimeManifestSha256', 'launcherSha256', 'packageLockSha256',
    'nodeVersion', 'goVersion', 'innoSetupVersion', 'innoDownloadSha256', 'installerScriptSha256', 'platform',
    'architecture', 'buildTimestamp', 'unsigned', 'mode', 'installedProgramFileCount', 'installedProgramBytes',
    'instanceBindingSchema', 'programManifestHash'];
  if (!exactKeys(build, buildKeys) || build.installerVersion !== '1.1.0-beta.2' || build.appVersion !== '1.0.0' ||
      build.dataContractVersion !== 1 || build.sourceCommit !== SOURCE_COMMIT || build.sourceTree !== SOURCE_TREE ||
      build.instanceBindingSchema !== 1 || build.platform !== 'windows' || build.architecture !== 'x64' ||
      build.mode !== 'candidate' || build.unsigned !== true ||
      [build.runtimeManifestSha256, build.launcherSha256, build.programManifestHash].some(value => !SHA256.test(value))) {
    fail('BUILD_INFO_INVALID');
  }
  if (runtime.format !== 'k-session-runtime' || runtime.manifestSchema !== 1 || runtime.version !== '1.0.0' ||
      runtime.platform !== 'win32-x64' || runtime.sourceCommit !== SOURCE_COMMIT || runtime.sourceTree !== SOURCE_TREE ||
      runtime.build?.toolCommit !== SOURCE_COMMIT || runtime.businessDataIncluded !== false || runtime.launcherIncluded !== false) {
    fail('RUNTIME_INVALID');
  }
  const runtimeHash = sha(runtimeRecord.bytes);
  const launcherHash = sha(launcher);
  if (build.runtimeManifestSha256 !== runtimeHash) fail('RUNTIME_HASH_CONFLICT');
  if (build.launcherSha256 !== launcherHash) fail('LAUNCHER_HASH_CONFLICT');
  if (build.programManifestHash !== sha(manifestRecord.bytes)) fail('MANIFEST_HASH_CONFLICT');
  let actual;
  try { actual = inventory(program); } catch { fail('INVENTORY_INVALID'); }
  if (JSON.stringify(actual) !== JSON.stringify(manifest.payload)) fail('PROGRAM_INVENTORY_CONFLICT');
  if (build.installedProgramFileCount !== actual.length ||
      build.installedProgramBytes !== actual.reduce((total, item) => total + item.bytes, 0)) fail('BUILD_INFO_INVALID');
  validateBinding(path.join(uninstall, 'instance-binding.ini'), installRoot, instance);
  return validatePolicy({schema: 1, appId: 'KSESSION-Beta-Installer-v1', registrationDisplayName: 'K⁺-SESSION Beta',
    uninstallKey: UNINSTALL_KEY, bindingKey: BINDING_KEY, fromInstallerVersion: '1.1.0-beta.2',
    targetInstallerVersion: '1.1.0-beta.3', appVersion: '1.0.0', dataContractVersion: 1,
    runtimeIdentitySchema: 1, instanceBindingSchema: 1, sourceCommit: SOURCE_COMMIT, sourceTree: SOURCE_TREE,
    programManifestSha256: sha(manifestRecord.bytes), programInventorySha256: manifest.payloadInventorySha256,
    runtimeManifestSha256: runtimeHash, launcherSha256: launcherHash, buildInfoSha256: sha(buildRecord.bytes)});
}

function validateSnapshot(snapshot, installRoot, instance) {
  const normalized = normalizeSnapshot(snapshot);
  if (normalized.registrations.length !== 1 || normalized.bindings.length !== 1) fail('REGISTRY_CONFLICT');
  const registration = normalized.registrations[0];
  const binding = normalized.bindings[0];
  const expectedUninstaller = path.win32.join(installRoot, 'uninstall', 'unins000.exe');
  const command = registration.uninstallString.match(/^"([^"]+)"$/)?.[1] ?? registration.uninstallString;
  if (registration.key !== UNINSTALL_KEY || binding.key !== BINDING_KEY ||
      registration.displayName !== 'K⁺-SESSION Beta' || registration.displayVersion !== '1.1.0-beta.2' ||
      path.resolve(registration.installLocation).toLowerCase() !== path.resolve(installRoot).toLowerCase() ||
      path.resolve(binding.installRoot).toLowerCase() !== path.resolve(installRoot).toLowerCase() ||
      path.resolve(binding.instance).toLowerCase() !== path.resolve(instance).toLowerCase() ||
      path.win32.normalize(command).toLowerCase() !== path.win32.normalize(expectedUninstaller).toLowerCase()) {
    fail('REGISTRY_CONTRACT_INVALID');
  }
  return normalized;
}

function createDraft(metadata, snapshot, installRoot, instance) {
  validateApiMetadata(metadata);
  const normalized = validateSnapshot(snapshot, installRoot, instance);
  const policy = collectInstalledPolicy(installRoot, instance);
  return {schema: 1, kind: 'k-session-beta2-identity-evidence', status: 'PASS',
    source: {repository: REPOSITORY, runId: RUN_ID, runAttempt: RUN_ATTEMPT, artifactId: ARTIFACT_ID,
      artifactName: ARTIFACT_NAME, artifactBytes: ARTIFACT_BYTES, artifactDigest: ARTIFACT_DIGEST,
      headSha: SOURCE_COMMIT, sourceTree: SOURCE_TREE, setupFileName: SETUP_NAME, setupBytes: SETUP_BYTES,
      setupSha256: SETUP_SHA256},
    profile: {id: PROFILE_ID, sources: [PROFILE_ID], policy},
    verification: {artifactMetadata: 'PASS', archiveIdentity: 'PASS', uniqueSetup: 'PASS', installedAnchors: 'PASS',
      registrationBinding: 'PASS', registryView: normalized.registrations[0].view, anchorCount: 5}};
}

function validateCleanup(cleanup) {
  const keys = ['uninstallerExitCode', 'programRootExistsAfterUninstall', 'uninstallRegistrationCountAfterUninstall',
    'desktopShortcutExistsAfterUninstall', 'startMenuShortcutExistsAfterUninstall', 'bindingRetainedAfterUninstall',
    'instanceRetainedAfterUninstall', 'retentionProbeUnchangedAfterUninstall', 'bindingRegistrationCountAfterHarnessCleanup',
    'instanceExistsAfterHarnessCleanup', 'temporaryPayloadRemoved'];
  if (!exactKeys(cleanup, keys) || cleanup.uninstallerExitCode !== 0 || cleanup.programRootExistsAfterUninstall !== false ||
      cleanup.uninstallRegistrationCountAfterUninstall !== 0 || cleanup.desktopShortcutExistsAfterUninstall !== false ||
      cleanup.startMenuShortcutExistsAfterUninstall !== false || cleanup.bindingRetainedAfterUninstall !== true ||
      cleanup.instanceRetainedAfterUninstall !== true || cleanup.retentionProbeUnchangedAfterUninstall !== true ||
      cleanup.bindingRegistrationCountAfterHarnessCleanup !== 0 || cleanup.instanceExistsAfterHarnessCleanup !== false ||
      cleanup.temporaryPayloadRemoved !== true) fail('CLEANUP_FAILED');
  return cleanup;
}

function finalizeEvidence(draft, cleanup) {
  validateCleanup(cleanup);
  const evidence = structuredClone(draft);
  evidence.verification.cleanup = cleanup;
  return validateEvidence(evidence);
}

function assertNoSensitiveOutput(value) {
  const serialized = JSON.stringify(value);
  const forbidden = [/[A-Za-z]:[\\/]/, /(?:token|password|passwd|cookie|authorization|environment|username|secret)/i,
    /data\.json|config\.json|attachments?|invoice|customer|employee|instancePath|installRoot/i];
  if (forbidden.some(pattern => pattern.test(serialized))) fail('OUTPUT_SENSITIVE');
}
function validateEvidence(evidence) {
  if (!exactKeys(evidence, ['schema', 'kind', 'status', 'source', 'profile', 'verification']) || evidence.schema !== 1 ||
      evidence.kind !== 'k-session-beta2-identity-evidence' || evidence.status !== 'PASS') fail('EVIDENCE_SCHEMA');
  const sourceKeys = ['repository', 'runId', 'runAttempt', 'artifactId', 'artifactName', 'artifactBytes', 'artifactDigest',
    'headSha', 'sourceTree', 'setupFileName', 'setupBytes', 'setupSha256'];
  if (!exactKeys(evidence.source, sourceKeys) || evidence.source.repository !== REPOSITORY ||
      evidence.source.runId !== RUN_ID || evidence.source.runAttempt !== RUN_ATTEMPT ||
      evidence.source.artifactId !== ARTIFACT_ID || evidence.source.artifactName !== ARTIFACT_NAME ||
      evidence.source.artifactBytes !== ARTIFACT_BYTES || evidence.source.artifactDigest !== ARTIFACT_DIGEST ||
      evidence.source.headSha !== SOURCE_COMMIT || evidence.source.sourceTree !== SOURCE_TREE ||
      evidence.source.setupFileName !== SETUP_NAME || evidence.source.setupBytes !== SETUP_BYTES ||
      evidence.source.setupSha256 !== SETUP_SHA256) fail('EVIDENCE_SOURCE_INVALID');
  if (!exactKeys(evidence.profile, ['id', 'sources', 'policy']) || evidence.profile.id !== PROFILE_ID ||
      JSON.stringify(evidence.profile.sources) !== JSON.stringify([PROFILE_ID])) fail('EVIDENCE_PROFILE_INVALID');
  validatePolicy(evidence.profile.policy);
  if (!exactKeys(evidence.verification, ['artifactMetadata', 'archiveIdentity', 'uniqueSetup', 'installedAnchors',
    'registrationBinding', 'registryView', 'anchorCount', 'cleanup']) ||
      ['artifactMetadata', 'archiveIdentity', 'uniqueSetup', 'installedAnchors', 'registrationBinding']
        .some(key => evidence.verification[key] !== 'PASS') || !['32', '64'].includes(evidence.verification.registryView) ||
      evidence.verification.anchorCount !== 5) fail('EVIDENCE_VERIFICATION_INVALID');
  validateCleanup(evidence.verification.cleanup);
  assertNoSensitiveOutput(evidence);
  return evidence;
}

function createRunReport(status, stage, testedCommit) {
  if (!['PASS', 'BLOCKED'].includes(status) || !REPORT_STAGES.has(stage) || !COMMIT.test(testedCommit) ||
      (status === 'PASS' && stage !== 'FINALIZE')) fail('REPORT_INVALID');
  const report = {schema: 1, kind: 'k-session-beta2-identity-run', status, stage,
    reason: status === 'PASS' ? 'CAPTURED' : `BLOCKED_${stage}`,
    source: {repository: REPOSITORY, runId: RUN_ID, artifactId: ARTIFACT_ID, headSha: SOURCE_COMMIT}, testedCommit};
  assertNoSensitiveOutput(report);
  return report;
}
function validateRunReport(report) {
  if (!exactKeys(report, ['schema', 'kind', 'status', 'stage', 'reason', 'source', 'testedCommit']) ||
      report.schema !== 1 || report.kind !== 'k-session-beta2-identity-run' ||
      !exactKeys(report.source, ['repository', 'runId', 'artifactId', 'headSha'])) fail('REPORT_INVALID');
  const expected = createRunReport(report.status, report.stage, report.testedCommit);
  if (JSON.stringify(report) !== JSON.stringify(expected)) fail('REPORT_INVALID');
  return report;
}

module.exports = {ARTIFACT_BYTES, ARTIFACT_DIGEST, ARTIFACT_ID, ARTIFACT_NAME, ARTIFACT_URL, BINDING_KEY,
  Beta2IdentityError, PROFILE_ID, REPOSITORY, RUN_ID, SETUP_BYTES, SETUP_NAME, SETUP_SHA256, SOURCE_COMMIT,
  SOURCE_TREE, UNINSTALL_KEY, assertNoSensitiveOutput, collectInstalledPolicy, createDraft, createRunReport,
  finalizeEvidence, locateUniqueSetup, normalizeSnapshot, sha, validateApiMetadata, validateEvidence, validatePolicy,
  validateArchiveIdentity, validateCleanup, validateRunReport, validateSnapshot};
