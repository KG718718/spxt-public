#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  HistoricalIdentityError,
  createDraft,
  finalizeEvidence,
  locateUniqueSetup,
  validateApiMetadata,
  validateEvidence
} = require('./index.cjs');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); }
function exactArgs(names) {
  const args = process.argv.slice(3);
  if (args.length !== names.length * 2) return null;
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!names.includes(args[index]) || result[args[index]] !== undefined || !args[index + 1]) return null;
    result[args[index]] = args[index + 1];
  }
  return result;
}

try {
  const command = process.argv[2];
  if (command === 'metadata') {
    const args = exactArgs(['--input']); if (!args) throw new HistoricalIdentityError('USAGE');
    validateApiMetadata(readJson(args['--input']));
  } else if (command === 'setup') {
    const args = exactArgs(['--root']); if (!args) throw new HistoricalIdentityError('USAGE');
    locateUniqueSetup(args['--root']);
  } else if (command === 'collect') {
    const args = exactArgs(['--metadata', '--snapshot', '--install-root', '--output']);
    if (!args) throw new HistoricalIdentityError('USAGE');
    writeJson(args['--output'], createDraft(readJson(args['--metadata']), readJson(args['--snapshot']), args['--install-root']));
  } else if (command === 'finalize') {
    const args = exactArgs(['--draft', '--cleanup', '--output']);
    if (!args) throw new HistoricalIdentityError('USAGE');
    writeJson(args['--output'], finalizeEvidence(readJson(args['--draft']), readJson(args['--cleanup'])));
  } else if (command === 'verify') {
    const args = exactArgs(['--input']); if (!args) throw new HistoricalIdentityError('USAGE');
    validateEvidence(readJson(args['--input']));
  } else throw new HistoricalIdentityError('USAGE');
} catch (error) {
  const code = error instanceof HistoricalIdentityError ? error.code : 'INTERNAL_ERROR';
  process.stderr.write(`HISTORICAL_IDENTITY_${code}\n`);
  process.exitCode = 1;
}
