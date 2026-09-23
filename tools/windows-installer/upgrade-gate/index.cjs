'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const detection = require('../upgrade-detection/index.cjs');
const preflight = require('../upgrade-preflight/index.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
class GateError extends Error { constructor(code, reason = code) { super(code); this.code = code; this.reason = reason; } }
function exact(value, keys) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0'); }
function runGate(request, bundleBytes, expectedBundleSha, deps = { detection, preflight }) {
  if (!exact(request, ['schema', 'snapshot', 'preflight']) || request.schema !== 1 || !/^[a-f0-9]{64}$/.test(expectedBundleSha)) throw new GateError('GATE_REQUEST_INVALID');
  if (sha(bundleBytes) !== expectedBundleSha) throw new GateError('GATE_BUNDLE_HASH');
  let bundle;
  try { bundle = JSON.parse(bundleBytes.toString('utf8')); } catch { throw new GateError('GATE_BUNDLE_INVALID'); }
  let identity;
  try { identity = deps.detection.validateApprovedIdentity(request.snapshot, bundle); }
  catch (error) {
    const safe = new Set(['IDENTITY_REGISTRATION', 'IDENTITY_BINDING', 'IDENTITY_PATH', 'IDENTITY_MANIFEST',
      'IDENTITY_PROGRAM', 'IDENTITY_BUILD', 'IDENTITY_RUNTIME', 'IDENTITY_LAUNCHER', 'IDENTITY_INTERNAL']);
    throw new GateError('GATE_IDENTITY_REJECTED', safe.has(error?.reason) ? error.reason : 'IDENTITY_INTERNAL');
  }
  let instance;
  try { instance = deps.preflight.runPreflight(request.preflight); }
  catch (error) {
    const safe = new Set(['ARGUMENT_INVALID', 'DATA_CONTRACT_UNSUPPORTED', 'APP_RESOURCE_INVALID', 'INSTALL_ROOT_INVALID',
      'INSTANCE_NOT_FOUND', 'INSTANCE_PATH_UNSAFE', 'INSTANCE_UNREADABLE', 'BINDING_INVALID', 'REGISTRATION_CONFLICT',
      'BINDING_CONFLICT', 'STORE_UNREADABLE', 'STORE_INVALID', 'CONFIG_INVALID', 'ORPHANED_INSTALLATION',
      'STORE_VALIDATION_FAILED', 'INSTANCE_STRUCTURE_UNSAFE']);
    throw new GateError('GATE_INSTANCE_REJECTED', safe.has(error?.code) ? `PREFLIGHT_${error.code}` : 'PREFLIGHT_INTERNAL');
  }
  if (!instance || instance.ok !== true || instance.code !== 'PREFLIGHT_OK') throw new GateError('GATE_CONTRACT_MISMATCH', 'CONTRACT_RESULT');
  if (identity.installRoot !== request.preflight.installRoot) throw new GateError('GATE_CONTRACT_MISMATCH', 'CONTRACT_INSTALL_ROOT');
  if (identity.instancePath !== request.preflight.instancePath) throw new GateError('GATE_CONTRACT_MISMATCH', 'CONTRACT_INSTANCE_PATH');
  if (identity.dataContractVersion !== 1) throw new GateError('GATE_CONTRACT_MISMATCH', 'CONTRACT_DATA');
  return { ok: true, code: 'UPGRADE_PREFLIGHT_OK', profileId: identity.profileId, state: instance.state,
    fromInstallerVersion: identity.fromInstallerVersion, targetInstallerVersion: identity.targetInstallerVersion };
}
function runFiles(requestFile, bundleFile, expectedBundleSha) {
  return runGate(JSON.parse(fs.readFileSync(requestFile, 'utf8')), fs.readFileSync(bundleFile), expectedBundleSha);
}
module.exports = { GateError, runFiles, runGate, sha };
