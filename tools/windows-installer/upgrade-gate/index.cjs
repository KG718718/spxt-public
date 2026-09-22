'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const detection = require('../upgrade-detection/index.cjs');
const preflight = require('../upgrade-preflight/index.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
class GateError extends Error { constructor(code) { super(code); this.code = code; } }
function exact(value, keys) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0'); }
function runGate(request, bundleBytes, expectedBundleSha, deps = { detection, preflight }) {
  if (!exact(request, ['schema', 'snapshot', 'preflight']) || request.schema !== 1 || !/^[a-f0-9]{64}$/.test(expectedBundleSha)) throw new GateError('GATE_REQUEST_INVALID');
  if (sha(bundleBytes) !== expectedBundleSha) throw new GateError('GATE_BUNDLE_HASH');
  let bundle;
  try { bundle = JSON.parse(bundleBytes.toString('utf8')); } catch { throw new GateError('GATE_BUNDLE_INVALID'); }
  let identity;
  try { identity = deps.detection.validateApprovedIdentity(request.snapshot, bundle); }
  catch { throw new GateError('GATE_IDENTITY_REJECTED'); }
  let instance;
  try { instance = deps.preflight.runPreflight(request.preflight); }
  catch { throw new GateError('GATE_INSTANCE_REJECTED'); }
  if (!instance || instance.ok !== true || instance.code !== 'PREFLIGHT_OK' || identity.installRoot !== request.preflight.installRoot ||
      identity.instancePath !== request.preflight.instancePath || identity.dataContractVersion !== 1) throw new GateError('GATE_CONTRACT_MISMATCH');
  return { ok: true, code: 'UPGRADE_PREFLIGHT_OK', profileId: identity.profileId, state: instance.state,
    fromInstallerVersion: identity.fromInstallerVersion, targetInstallerVersion: identity.targetInstallerVersion };
}
function runFiles(requestFile, bundleFile, expectedBundleSha) {
  return runGate(JSON.parse(fs.readFileSync(requestFile, 'utf8')), fs.readFileSync(bundleFile), expectedBundleSha);
}
module.exports = { GateError, runFiles, runGate, sha };
