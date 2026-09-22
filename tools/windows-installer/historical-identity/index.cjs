'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  BINDING_KEY,
  UNINSTALL_KEY,
  Rejection,
  inventory,
  sha,
  validate,
  validatePolicy
} = require('../upgrade-detection/index.cjs');

const REPOSITORY = 'KG718718/spxt-public';
const RUN_ID = 35514357007;
const RUN_ATTEMPT = 1;
const ARTIFACT_ID = 10606870944;
const ARTIFACT_NAME = 'K-SESSION-setup-win-x64-e9417f036d0cdf736ff84682556a994040f0de0b';
const ARTIFACT_BYTES = 32506311;
const ARTIFACT_DIGEST = 'sha256:4d88dd071fb9c14e85c2f2b0c5aab26f425ae25765c564ea275bc21483043f7f';
const ARTIFACT_URL = `https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${ARTIFACT_ID}/zip`;
const SETUP_NAME = 'K-SESSION-Setup-1.1.0-beta.1.exe';
const SETUP_BYTES = 32988254;
const SETUP_SHA256 = '49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8';
const SOURCE_COMMIT = 'e9417f036d0cdf736ff84682556a994040f0de0b';
const SOURCE_TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';
const PROFILE_ID = 'historical-run-35514357007';
const SHA256 = /^[a-f0-9]{64}$/;

class HistoricalIdentityError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function fail(code) {
  throw new HistoricalIdentityError(code);
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function sameSequence(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function classifyPayloadPathConflict(actualPaths, expectedPaths) {
  if (sameSequence(actualPaths, expectedPaths)) return null;
  if (sameSequence([...actualPaths].sort(), [...expectedPaths].sort())) return 'INSTALLED_PAYLOAD_PATH_ORDER_CONFLICT';
  if (sameSequence(actualPaths, expectedPaths.map(value => value.replaceAll('\\', '/')))) {
    return 'INSTALLED_PAYLOAD_PATH_SEPARATOR_CONFLICT';
  }
  if (sameSequence(actualPaths.map(value => value.toLowerCase()), expectedPaths.map(value => value.toLowerCase()))) {
    return 'INSTALLED_PAYLOAD_PATH_CASE_CONFLICT';
  }
  if (sameSequence(actualPaths.map(value => value.normalize('NFC')), expectedPaths.map(value => value.normalize('NFC')))) {
    return 'INSTALLED_PAYLOAD_PATH_UNICODE_CONFLICT';
  }
  return 'INSTALLED_PAYLOAD_PATH_SET_CONFLICT';
}

function readRegular(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) fail('FILE_NOT_REGULAR');
  return fs.readFileSync(file);
}

function readJsonBytes(file) {
  const bytes = readRegular(file);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('JSON_INVALID'); }
  return {bytes, value};
}

function readInstalledJson(file, code) {
  try { return readJsonBytes(file); } catch { fail(code); }
}

function readInstalledRegular(file, code) {
  try { return readRegular(file); } catch { fail(code); }
}

function validateApiMetadata(metadata, now = Date.now()) {
  if (!exactKeys(metadata, ['run', 'artifact'])) fail('METADATA_SCHEMA');
  const {run, artifact} = metadata;
  if (!exactKeys(run, ['id', 'attempt', 'repository', 'headSha', 'status', 'conclusion']) ||
      run.id !== RUN_ID || run.attempt !== RUN_ATTEMPT || run.repository !== REPOSITORY ||
      run.headSha !== SOURCE_COMMIT || run.status !== 'completed' || run.conclusion !== 'success') {
    fail('RUN_METADATA_MISMATCH');
  }
  if (!exactKeys(artifact, ['id', 'name', 'sizeInBytes', 'digest', 'expired', 'expiresAt', 'archiveDownloadUrl', 'workflowRunId']) ||
      artifact.id !== ARTIFACT_ID || artifact.name !== ARTIFACT_NAME || artifact.sizeInBytes !== ARTIFACT_BYTES ||
      artifact.digest !== ARTIFACT_DIGEST || artifact.expired !== false || artifact.archiveDownloadUrl !== ARTIFACT_URL ||
      artifact.workflowRunId !== RUN_ID || typeof artifact.expiresAt !== 'string') {
    fail('ARTIFACT_METADATA_MISMATCH');
  }
  const expiry = Date.parse(artifact.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) fail('ARTIFACT_EXPIRED');
  return metadata;
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

function locateUniqueSetup(extractedRoot) {
  const matches = walkRegular(extractedRoot).filter(file => path.basename(file) === SETUP_NAME);
  if (matches.length !== 1) fail('SETUP_NOT_UNIQUE');
  const bytes = readRegular(matches[0]);
  if (bytes.length !== SETUP_BYTES || sha(bytes) !== SETUP_SHA256) fail('SETUP_IDENTITY_MISMATCH');
  return matches[0];
}

function normalizeSharedHkcuSnapshot(snapshot) {
  if (!exactKeys(snapshot, ['registrations', 'bindings']) || !Array.isArray(snapshot.registrations) ||
      !Array.isArray(snapshot.bindings)) fail('REGISTRY_SNAPSHOT_SCHEMA');
  const registrationMissing = snapshot.registrations.length < 1;
  const bindingMissing = snapshot.bindings.length < 1;
  if (registrationMissing && bindingMissing) fail('REGISTRY_MISSING_BOTH');
  if (registrationMissing) fail('REGISTRY_MISSING_REGISTRATION');
  if (bindingMissing) fail('REGISTRY_MISSING_BINDING');
  function normalize(records, fields) {
    if (records.some(record => !exactKeys(record, fields) || !['64', '32'].includes(record.view))) {
      fail('REGISTRY_VIEW_CONFLICT');
    }
    if (records.length === 1) return [structuredClone(records[0])];
    if (records.length !== 2 || new Set(records.map(record => record.view)).size !== 2 ||
        !records.some(record => record.view === '64') || !records.some(record => record.view === '32')) {
      fail('REGISTRY_VIEW_CONFLICT');
    }
    const canonical = records.find(record => record.view === '64');
    const alternate = records.find(record => record.view === '32');
    for (const field of fields.filter(field => field !== 'view')) {
      if (canonical[field] !== alternate[field]) fail('REGISTRY_VIEW_CONFLICT');
    }
    return [structuredClone(canonical)];
  }
  const registrations = normalize(snapshot.registrations,
    ['view', 'key', 'displayName', 'displayVersion', 'installLocation', 'uninstallString']);
  const bindings = normalize(snapshot.bindings, ['view', 'key', 'installRoot', 'instance']);
  if (registrations[0].view !== bindings[0].view) fail('REGISTRY_VIEW_CONFLICT');
  return {registrations, bindings};
}

function collectInstalledPolicy(installRoot) {
  const uninstall = path.join(installRoot, 'uninstall');
  const program = path.join(installRoot, 'program');
  const manifestRecord = readInstalledJson(path.join(uninstall, 'installer-manifest.json'), 'INSTALLED_MANIFEST_INVALID');
  const buildRecord = readInstalledJson(path.join(uninstall, 'build-info.json'), 'INSTALLED_BUILD_INFO_INVALID');
  const runtimeRecord = readInstalledJson(path.join(program, 'manifest', 'runtime-manifest.json'), 'INSTALLED_RUNTIME_INVALID');
  const launcherBytes = readInstalledRegular(path.join(program, 'K-SESSION.exe'), 'INSTALLED_LAUNCHER_INVALID');
  const manifest = manifestRecord.value;
  const build = buildRecord.value;
  const runtime = runtimeRecord.value;
  if (!exactKeys(manifest, ['schema', 'sourceCommit', 'sourceTree', 'payload', 'payloadInventorySha256', 'version']) ||
      manifest.schema !== 1 || manifest.sourceCommit !== SOURCE_COMMIT || manifest.sourceTree !== SOURCE_TREE ||
      manifest.version !== '1.1.0-beta.1' || !SHA256.test(manifest.payloadInventorySha256) ||
      sha(Buffer.from(JSON.stringify(manifest.payload))) !== manifest.payloadInventorySha256) fail('INSTALLED_MANIFEST_INVALID');
  if (build.installerVersion !== '1.1.0-beta.1' || build.appVersion !== '1.0.0' ||
      build.sourceCommit !== SOURCE_COMMIT || build.sourceTree !== SOURCE_TREE ||
      !SHA256.test(build.runtimeManifestSha256) || !SHA256.test(build.launcherSha256)) fail('INSTALLED_BUILD_INFO_INVALID');
  if (runtime.format !== 'k-session-runtime' || runtime.manifestSchema !== 1 || runtime.version !== '1.0.0' ||
      runtime.platform !== 'win32-x64' || runtime.sourceCommit !== SOURCE_COMMIT || runtime.sourceTree !== SOURCE_TREE ||
      runtime.build?.toolCommit !== SOURCE_COMMIT || runtime.businessDataIncluded !== false || runtime.launcherIncluded !== false) {
    fail('INSTALLED_RUNTIME_INVALID');
  }
  const runtimeManifestSha256 = sha(runtimeRecord.bytes);
  const launcherSha256 = sha(launcherBytes);
  let actualPayload;
  try { actualPayload = inventory(program); } catch { fail('INSTALLED_INVENTORY_INVALID'); }
  if (build.runtimeManifestSha256 !== runtimeManifestSha256) fail('INSTALLED_RUNTIME_HASH_CONFLICT');
  if (build.launcherSha256 !== launcherSha256) fail('INSTALLED_LAUNCHER_HASH_CONFLICT');
  if (!Array.isArray(manifest.payload)) fail('INSTALLED_PAYLOAD_SCHEMA_CONFLICT');
  if (actualPayload.length !== manifest.payload.length) fail('INSTALLED_PAYLOAD_COUNT_CONFLICT');
  if (manifest.payload.some(expected => !exactKeys(expected, ['path', 'bytes', 'sha256']) ||
      typeof expected.path !== 'string')) fail('INSTALLED_PAYLOAD_SCHEMA_CONFLICT');
  const pathConflict = classifyPayloadPathConflict(
    actualPayload.map(actual => actual.path), manifest.payload.map(expected => expected.path));
  if (pathConflict) fail(pathConflict);
  for (let index = 0; index < actualPayload.length; index += 1) {
    const actual = actualPayload[index];
    const expected = manifest.payload[index];
    if (actual.bytes !== expected.bytes) fail('INSTALLED_PAYLOAD_BYTES_CONFLICT');
    if (actual.sha256 !== expected.sha256) fail('INSTALLED_PAYLOAD_HASH_CONFLICT');
  }
  const policy = {
    schema: 1,
    appId: 'KSESSION-Beta-Installer-v1',
    uninstallKey: UNINSTALL_KEY,
    bindingKey: BINDING_KEY,
    fromInstallerVersion: '1.1.0-beta.1',
    targetInstallerVersion: '1.1.0-beta.2',
    appVersion: '1.0.0',
    dataContractVersion: 1,
    allowLegacyMissingDataContract: true,
    sourceCommit: SOURCE_COMMIT,
    sourceTree: SOURCE_TREE,
    programManifestSha256: sha(manifestRecord.bytes),
    programInventorySha256: manifest.payloadInventorySha256,
    runtimeManifestSha256,
    launcherSha256,
    buildInfoSha256: sha(buildRecord.bytes)
  };
  validatePolicy(policy);
  return policy;
}

function validateInstalledFootprint(installRoot, instance) {
  const policy = collectInstalledPolicy(installRoot);
  const bindingFile = path.join(installRoot, 'uninstall', 'instance-binding.ini');
  const bytes = readInstalledRegular(bindingFile, 'INSTALLED_BINDING_INVALID');
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xfe) fail('INSTALLED_BINDING_INVALID');
  const lines = bytes.subarray(2).toString('utf16le').split(/\r?\n/).filter(line => line.length > 0);
  if (lines.shift() !== '[Installation]') fail('INSTALLED_BINDING_INVALID');
  const values = {};
  for (const line of lines) {
    const separator = line.indexOf('=');
    if (separator < 1) fail('INSTALLED_BINDING_INVALID');
    const key = line.slice(0, separator);
    if (Object.hasOwn(values, key)) fail('INSTALLED_BINDING_INVALID');
    values[key] = line.slice(separator + 1);
  }
  if (!exactKeys(values, ['Schema', 'InstallRoot', 'Instance']) || values.Schema !== '1' ||
      path.resolve(values.InstallRoot).toLowerCase() !== path.resolve(installRoot).toLowerCase() ||
      path.resolve(values.Instance).toLowerCase() !== path.resolve(instance).toLowerCase()) {
    fail('INSTALLED_BINDING_INVALID');
  }
  return policy;
}

function validateInstallLogMarkers(bytes) {
  if (!Buffer.isBuffer(bytes)) fail('INSTALL_LOG_INVALID');
  const log = bytes.toString('utf8');
  const failureMarkers = [
    'KSESSION_DATA_PRIOR_MISSING', 'KSESSION_DATA_REJECT_', 'KSESSION_REJECT_REGISTERED',
    'KSESSION_REJECT_RUNNING', 'KSESSION_DATA_SWITCH_UNCONFIRMED', 'KSESSION_REJECT_PATH',
    'KSESSION_REJECT_NONEMPTY', 'KSESSION_REJECT_SPACE_QUERY', 'KSESSION_REJECT_SPACE',
    'KSESSION_REJECT_WRITE', 'KSESSION_UNINSTALL_REJECT_RUNNING'
  ];
  if (failureMarkers.some(marker => log.includes(marker))) fail('INSTALL_LOG_FAILURE_MARKER');
  if (!log.includes('KSESSION_PREINSTALL_READY')) fail('INSTALL_LOG_NO_PREINSTALL');
  if (!log.includes('KSESSION_INSTALLED_PAYLOAD_VERIFIED')) fail('INSTALL_LOG_NO_POSTINSTALL');
  return true;
}

function createDraft(metadata, snapshot, installRoot) {
  validateApiMetadata(metadata);
  const policy = collectInstalledPolicy(installRoot);
  let result;
  try { result = validate(snapshot, policy); }
  catch (error) {
    if (error instanceof Rejection) fail(`T1_${error.code}`);
    throw error;
  }
  if (result.status !== 'PASS' || result.code !== 'ELIGIBLE_BETA1') fail('T1_RESULT_INVALID');
  const view = snapshot.registrations[0]?.view;
  if (!['32', '64'].includes(view) || snapshot.bindings[0]?.view !== view) fail('REGISTRY_VIEW_INVALID');
  return {
    schema: 1,
    kind: 'k-session-historical-identity-evidence',
    status: 'PASS',
    source: {
      repository: REPOSITORY,
      runId: RUN_ID,
      runAttempt: RUN_ATTEMPT,
      artifactId: ARTIFACT_ID,
      artifactName: ARTIFACT_NAME,
      artifactDigest: ARTIFACT_DIGEST,
      headSha: SOURCE_COMMIT,
      setupFileName: SETUP_NAME,
      setupBytes: SETUP_BYTES,
      setupSha256: SETUP_SHA256
    },
    profile: {id: PROFILE_ID, sources: [PROFILE_ID], policy},
    verification: {
      artifactMetadata: 'PASS', uniqueSetup: 'PASS', installedAnchors: 'PASS', registrySnapshot: 'PASS',
      t1SinglePolicy: 'PASS', registryView: view, registrationCount: snapshot.registrations.length,
      bindingCount: snapshot.bindings.length, anchorCount: 5
    }
  };
}

function finalizeEvidence(draft, cleanup) {
  if (!exactKeys(cleanup, [
    'uninstallerExitCode', 'programRootExistsAfterUninstall', 'uninstallRegistrationCountAfterUninstall',
    'desktopShortcutExistsAfterUninstall', 'startMenuShortcutExistsAfterUninstall',
    'bindingRetainedAfterUninstall', 'instanceRetainedAfterUninstall',
    'bindingRegistrationCountAfterHarnessCleanup', 'instanceExistsAfterHarnessCleanup', 'temporaryPayloadRemoved'
  ])) fail('CLEANUP_SCHEMA');
  if (cleanup.uninstallerExitCode !== 0 || cleanup.programRootExistsAfterUninstall !== false ||
      cleanup.uninstallRegistrationCountAfterUninstall !== 0 || cleanup.desktopShortcutExistsAfterUninstall !== false ||
      cleanup.startMenuShortcutExistsAfterUninstall !== false || cleanup.bindingRetainedAfterUninstall !== true ||
      cleanup.instanceRetainedAfterUninstall !== true || cleanup.bindingRegistrationCountAfterHarnessCleanup !== 0 ||
      cleanup.instanceExistsAfterHarnessCleanup !== false || cleanup.temporaryPayloadRemoved !== true) fail('CLEANUP_FAILED');
  const evidence = structuredClone(draft);
  evidence.verification.cleanup = cleanup;
  validateEvidence(evidence);
  return evidence;
}

function validatePolicyShape(policy) {
  try { validatePolicy(policy); } catch { fail('EVIDENCE_PROFILE_INVALID'); }
  return exactKeys(policy, [
    'schema', 'appId', 'uninstallKey', 'bindingKey', 'fromInstallerVersion', 'targetInstallerVersion', 'appVersion',
    'dataContractVersion', 'allowLegacyMissingDataContract', 'sourceCommit', 'sourceTree', 'programManifestSha256',
    'programInventorySha256', 'runtimeManifestSha256', 'launcherSha256', 'buildInfoSha256'
  ]);
}

function validateEvidence(evidence) {
  if (!exactKeys(evidence, ['schema', 'kind', 'status', 'source', 'profile', 'verification']) || evidence.schema !== 1 ||
      evidence.kind !== 'k-session-historical-identity-evidence' || evidence.status !== 'PASS') fail('EVIDENCE_SCHEMA');
  if (!exactKeys(evidence.source, ['repository', 'runId', 'runAttempt', 'artifactId', 'artifactName', 'artifactDigest',
    'headSha', 'setupFileName', 'setupBytes', 'setupSha256'])) fail('EVIDENCE_SOURCE_SCHEMA');
  if (evidence.source.repository !== REPOSITORY || evidence.source.runId !== RUN_ID || evidence.source.runAttempt !== RUN_ATTEMPT ||
      evidence.source.artifactId !== ARTIFACT_ID || evidence.source.artifactName !== ARTIFACT_NAME ||
      evidence.source.artifactDigest !== ARTIFACT_DIGEST || evidence.source.headSha !== SOURCE_COMMIT ||
      evidence.source.setupFileName !== SETUP_NAME || evidence.source.setupBytes !== SETUP_BYTES ||
      evidence.source.setupSha256 !== SETUP_SHA256) fail('EVIDENCE_SOURCE_INVALID');
  if (!exactKeys(evidence.profile, ['id', 'sources', 'policy']) || evidence.profile.id !== PROFILE_ID ||
      JSON.stringify(evidence.profile.sources) !== JSON.stringify([PROFILE_ID]) || !validatePolicyShape(evidence.profile.policy)) {
    fail('EVIDENCE_PROFILE_INVALID');
  }
  if (!exactKeys(evidence.verification, ['artifactMetadata', 'uniqueSetup', 'installedAnchors', 'registrySnapshot',
    't1SinglePolicy', 'registryView', 'registrationCount', 'bindingCount', 'anchorCount', 'cleanup']) ||
      !['32', '64'].includes(evidence.verification.registryView) || evidence.verification.registrationCount !== 1 ||
      evidence.verification.bindingCount !== 1 || evidence.verification.anchorCount !== 5 ||
      ['artifactMetadata', 'uniqueSetup', 'installedAnchors', 'registrySnapshot', 't1SinglePolicy']
        .some(field => evidence.verification[field] !== 'PASS')) fail('EVIDENCE_VERIFICATION_INVALID');
  assertNoSensitiveOutput(evidence);
  return evidence;
}

function assertNoSensitiveOutput(value) {
  const serialized = JSON.stringify(value);
  const forbidden = [
    /[A-Za-z]:[\\/]/,
    /(?:^|[\\/])Users(?:[\\/]|$)/i,
    /(?:token|password|passwd|cookie|authorization|environment|username|secret)/i,
    /data\.json|config\.json|attachments?|invoice|customer|employee/i
  ];
  if (forbidden.some(pattern => pattern.test(serialized))) fail('EVIDENCE_SENSITIVE');
}

module.exports = {
  ARTIFACT_DIGEST, ARTIFACT_ID, ARTIFACT_NAME, ARTIFACT_URL, PROFILE_ID, REPOSITORY, RUN_ID,
  SETUP_NAME, SETUP_SHA256, SOURCE_COMMIT, HistoricalIdentityError, assertNoSensitiveOutput,
  collectInstalledPolicy, createDraft, finalizeEvidence, locateUniqueSetup, normalizeSharedHkcuSnapshot,
  validateApiMetadata, validateEvidence, validateInstallLogMarkers, validateInstalledFootprint
};
