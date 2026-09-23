'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const detection = require('./upgrade-detection/index.cjs');
const {GateError, runGate} = require('./upgrade-gate/index.cjs');

const REASONS = new Set(['IDENTITY_ACCEPTED', 'IDENTITY_REGISTRATION', 'IDENTITY_BINDING', 'IDENTITY_PATH',
  'IDENTITY_MANIFEST', 'IDENTITY_PROGRAM', 'IDENTITY_BUILD', 'IDENTITY_RUNTIME', 'IDENTITY_LAUNCHER', 'IDENTITY_INTERNAL']);
function safeIdentityReason(error) {
  return error instanceof GateError && REASONS.has(error.reason) ? error.reason : 'IDENTITY_INTERNAL';
}
function main(args) {
  const [requestFile, bundleFile, reportFile] = args;
  if (!requestFile || !bundleFile || !reportFile) throw new Error('IDENTITY_DIAGNOSTIC_ARGUMENT_INVALID');
  let reason = 'IDENTITY_INTERNAL';
  try {
    const request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
    const bundleBytes = fs.readFileSync(bundleFile);
    const expected = crypto.createHash('sha256').update(bundleBytes).digest('hex');
    runGate(request, bundleBytes, expected, {detection,
      preflight: {runPreflight: () => ({ok: true, code: 'PREFLIGHT_OK', state: 'diagnostic'})}});
    reason = 'IDENTITY_ACCEPTED';
  } catch (error) {
    reason = safeIdentityReason(error);
  }
  fs.writeFileSync(reportFile, JSON.stringify({schema: 1, status: reason === 'IDENTITY_ACCEPTED' ? 'PASS' : 'REJECT', reason}) + '\n',
    {flag: 'wx', mode: 0o600});
  process.stdout.write(reason + '\n');
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch { process.stdout.write('IDENTITY_INTERNAL\n'); process.exitCode = 1; }
}
module.exports = {REASONS, safeIdentityReason};
