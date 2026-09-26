'use strict';
const fs = require('node:fs');
const detection = require('./upgrade-detection/index.cjs');

const DETAILS = Object.freeze({
  REGISTRATION_COUNT: 60,
  REGISTRATION_NAME: 61,
  SNAPSHOT_INVALID: 62,
  REGISTRATION_CONFLICT: 63,
  UNINSTALL_METADATA_INVALID: 64,
  IDENTITY_REGISTRATION_AMBIGUOUS: 65,
  IDENTITY_REGISTRATION_INCONSISTENT: 66,
  REGISTRATION_VERSION: 67,
  REGISTRATION_NAME_VERSION: 68
});

function classifyVersionDetail(snapshot, policy) {
  const registrations = Array.isArray(snapshot?.registrations) ? snapshot.registrations : [];
  if (registrations.length !== 1 || !registrations[0] || typeof registrations[0] !== 'object') return 'IDENTITY_REGISTRATION_AMBIGUOUS';
  const registration = registrations[0];
  const nameMismatch = registration.displayName !== 'K⁺-SESSION Beta';
  const versionMismatch = registration.displayVersion !== policy?.fromInstallerVersion;
  if (nameMismatch && versionMismatch) return 'REGISTRATION_NAME_VERSION';
  if (nameMismatch) return 'REGISTRATION_NAME';
  if (versionMismatch) return 'REGISTRATION_VERSION';
  return 'IDENTITY_REGISTRATION_INCONSISTENT';
}

function classifyCodes(codes, accepted = false) {
  const reasons = new Set();
  for (const code of codes) reasons.add(DETAILS[code] ? code : 'IDENTITY_REGISTRATION_AMBIGUOUS');
  if (accepted) return 'IDENTITY_REGISTRATION_INCONSISTENT';
  return reasons.size === 1 ? [...reasons][0] : 'IDENTITY_REGISTRATION_AMBIGUOUS';
}

function classify(snapshot, bundle) {
  detection.validateBundle(bundle);
  const codes = [];
  let accepted = false;
  for (const profile of bundle.profiles) {
    try {
      detection.validate(snapshot, profile.policy);
      accepted = true;
    } catch (error) {
      let code = error instanceof detection.Rejection ? error.code : 'IDENTITY_REGISTRATION_AMBIGUOUS';
      if (code === 'VERSION_UNSUPPORTED') code = classifyVersionDetail(snapshot, profile.policy);
      codes.push(code);
    }
  }
  return classifyCodes(codes, accepted);
}

function main(args) {
  if (args.length !== 2) throw new Error('ARGUMENT_INVALID');
  const request = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const bundle = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const reason = classify(request.snapshot, bundle);
  process.exitCode = DETAILS[reason] || 65;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch { process.exitCode = 65; }
}
module.exports = {DETAILS, classify, classifyCodes, classifyVersionDetail};
