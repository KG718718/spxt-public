'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {validateEvidence} = require('../beta2-identity/index.cjs');
const {validateBundle} = require('./identity.cjs');

function buildBundle(evidence) {
  validateEvidence(evidence);
  const profile = structuredClone(evidence.profile);
  const bundle = {schema: 1, profiles: [profile]};
  validateBundle(bundle);
  return bundle;
}

function main(argv) {
  if (argv.length !== 2) throw new Error('ARGUMENT_INVALID');
  const evidenceFile = path.resolve(argv[0]);
  const outputFile = path.resolve(argv[1]);
  if (evidenceFile === outputFile || fs.existsSync(outputFile)) throw new Error('OUTPUT_INVALID');
  const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  fs.writeFileSync(outputFile, JSON.stringify(buildBundle(evidence), null, 2) + '\n', {flag: 'wx', mode: 0o600});
  process.stdout.write(JSON.stringify({status: 'PASS', profileId: evidence.profile.id, profileCount: 1}) + '\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {buildBundle};
