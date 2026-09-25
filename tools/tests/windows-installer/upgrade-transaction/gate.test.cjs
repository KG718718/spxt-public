'use strict';
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { GateError, runGate, sha } = require('../../../windows-installer/upgrade-gate/index.cjs');
const {safeIdentityReason} = require('../../../windows-installer/identity-diagnostic.cjs');
const {classifyCodes} = require('../../../windows-installer/sequence-identity.cjs');
const bundleBytes = Buffer.from('{"schema":1,"profiles":[]}\n');
const request = { schema: 1, snapshot: { registrations: [], bindings: [] }, preflight: { installRoot: 'C:\\Install', instancePath: 'D:\\Instance' } };
const good = {
  detection: { validateApprovedIdentity: () => ({ profileId: 'historical-run-35514357007', installRoot: 'C:\\Install', instancePath: 'D:\\Instance', dataContractVersion: 1, fromInstallerVersion: '1.1.0-beta.1', targetInstallerVersion: '1.1.0-beta.2' }) },
  preflight: { runPreflight: () => ({ ok: true, code: 'PREFLIGHT_OK', state: 'initialized' }) }
};
test('gate requires both exact identity and read-only instance preflight', () => {
  assert.equal(runGate(request, bundleBytes, sha(bundleBytes), good).code, 'UPGRADE_PREFLIGHT_OK');
});
test('gate rejects bundle hash before identity evaluation', () => {
  assert.throws(() => runGate(request, bundleBytes, '0'.repeat(64), good), error => error.code === 'GATE_BUNDLE_HASH');
});
test('gate collapses identity details to one stable rejection', () => {
  const deps = { ...good, detection: { validateApprovedIdentity: () => { throw Error('sensitive path'); } } };
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), deps), error => error.code === 'GATE_IDENTITY_REJECTED' && error.reason === 'IDENTITY_INTERNAL' && !error.message.includes('sensitive'));
  for (const reason of ['IDENTITY_REGISTRATION', 'IDENTITY_BINDING', 'IDENTITY_PATH', 'IDENTITY_MANIFEST', 'IDENTITY_PROGRAM', 'IDENTITY_BUILD', 'IDENTITY_RUNTIME', 'IDENTITY_LAUNCHER']) {
    const detection = { validateApprovedIdentity: () => { throw { reason, message: 'path=C:\\private token=secret' }; } };
    assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), { ...good, detection }), error =>
      error.code === 'GATE_IDENTITY_REJECTED' && error.reason === reason && !error.message.includes('private') && !error.message.includes('secret'));
  }
});
test('gate rejects instance failure and cross-helper mismatch', () => {
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), { ...good, preflight: { runPreflight: () => { throw Error('secret'); } } }), error => error.code === 'GATE_INSTANCE_REJECTED' && error.reason === 'PREFLIGHT_INTERNAL' && !error.message.includes('secret'));
  const deps = { ...good, detection: { validateApprovedIdentity: () => ({ profileId: 'historical-run-35514357007', installRoot: 'C:\\Other', instancePath: 'D:\\Instance', dataContractVersion: 1 }) } };
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), deps), error => error.code === 'GATE_CONTRACT_MISMATCH' && error.reason === 'CONTRACT_INSTALL_ROOT');
});
test('gate classifies fixed preflight and contract reasons without carrying helper details', () => {
  const codes = ['ARGUMENT_INVALID', 'DATA_CONTRACT_UNSUPPORTED', 'APP_RESOURCE_INVALID', 'INSTALL_ROOT_INVALID', 'INSTANCE_NOT_FOUND',
    'INSTANCE_PATH_UNSAFE', 'INSTANCE_UNREADABLE', 'BINDING_INVALID', 'REGISTRATION_CONFLICT', 'BINDING_CONFLICT',
    'STORE_UNREADABLE', 'STORE_INVALID', 'CONFIG_INVALID', 'ORPHANED_INSTALLATION', 'STORE_VALIDATION_FAILED', 'INSTANCE_STRUCTURE_UNSAFE'];
  for (const code of codes) {
    const preflight = { runPreflight: () => { throw Object.assign(Error('path=C:\\private token=secret'), { code }); } };
    assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), { ...good, preflight }), error =>
      error.code === 'GATE_INSTANCE_REJECTED' && error.reason === `PREFLIGHT_${code}` && !error.message.includes('private') && !error.message.includes('secret'));
  }
  for (const [field, value, reason] of [['installRoot', 'C:\\Other', 'CONTRACT_INSTALL_ROOT'],
    ['instancePath', 'D:\\Other', 'CONTRACT_INSTANCE_PATH'], ['dataContractVersion', 2, 'CONTRACT_DATA']]) {
    const detection = { validateApprovedIdentity: () => ({ ...good.detection.validateApprovedIdentity(), [field]: value }) };
    assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), { ...good, detection }), error => error.reason === reason);
  }
  const preflight = { runPreflight: () => ({ ok: false, code: 'PRIVATE_DETAIL', state: 'secret' }) };
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), { ...good, preflight }), error =>
    error.reason === 'CONTRACT_RESULT' && !error.message.includes('PRIVATE_DETAIL') && !error.message.includes('secret'));
});
test('gate CLI exposes only fixed JSON and a fixed exit code for invalid invocation', () => {
  const cli = path.join(__dirname, '../../../windows-installer/upgrade-gate/cli.cjs');
  const result = childProcess.spawnSync(process.execPath, [cli, 'path=C:\\private', 'token=secret'], { encoding: 'utf8' });
  assert.equal(result.status, 10);
  assert.equal(result.stdout, '{"ok":false,"code":"GATE_ARGUMENT_INVALID"}\n');
  assert.equal(result.stderr, '');
  assert.doesNotMatch(result.stdout, /private|secret|path=/i);
});
test('hosted identity diagnostic accepts only fixed reasons', () => {
  for (const reason of ['IDENTITY_REGISTRATION', 'IDENTITY_BINDING', 'IDENTITY_PATH', 'IDENTITY_MANIFEST', 'IDENTITY_PROGRAM',
    'IDENTITY_BUILD', 'IDENTITY_RUNTIME', 'IDENTITY_LAUNCHER', 'IDENTITY_INTERNAL']) {
    assert.equal(safeIdentityReason(new GateError('GATE_IDENTITY_REJECTED', reason)), reason);
  }
  for (const error of [Error('path=C:\\private token=secret'), new GateError('GATE_IDENTITY_REJECTED', 'IDENTITY_PRIVATE_HASH')]) {
    assert.equal(safeIdentityReason(error), 'IDENTITY_INTERNAL');
  }
});
test('sequence registration diagnostic exposes only a closed fixed subreason', () => {
  for (const code of ['REGISTRATION_COUNT', 'VERSION_UNSUPPORTED', 'SNAPSHOT_INVALID', 'REGISTRATION_CONFLICT', 'UNINSTALL_METADATA_INVALID']) {
    assert.equal(classifyCodes([code, code]), code);
  }
  assert.equal(classifyCodes(['REGISTRATION_COUNT', 'VERSION_UNSUPPORTED']), 'IDENTITY_REGISTRATION_AMBIGUOUS');
  assert.equal(classifyCodes(['path=C:\\private token=secret']), 'IDENTITY_REGISTRATION_AMBIGUOUS');
  assert.equal(classifyCodes(['REGISTRATION_COUNT'], true), 'IDENTITY_REGISTRATION_INCONSISTENT');
});
