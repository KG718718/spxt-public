'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { runGate, sha } = require('../../../windows-installer/upgrade-gate/index.cjs');
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
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), deps), error => error.code === 'GATE_IDENTITY_REJECTED' && !error.message.includes('sensitive'));
});
test('gate rejects instance failure and cross-helper mismatch', () => {
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), { ...good, preflight: { runPreflight: () => { throw Error('secret'); } } }), error => error.code === 'GATE_INSTANCE_REJECTED');
  const deps = { ...good, detection: { validateApprovedIdentity: () => ({ profileId: 'historical-run-35514357007', installRoot: 'C:\\Other', instancePath: 'D:\\Instance', dataContractVersion: 1 }) } };
  assert.throws(() => runGate(request, bundleBytes, sha(bundleBytes), deps), error => error.code === 'GATE_CONTRACT_MISMATCH');
});
