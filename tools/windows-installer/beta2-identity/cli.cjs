#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const api = require('./index.cjs');

function exactArgs(names) {
  const args = process.argv.slice(3);
  if (args.length !== names.length * 2) return null;
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!names.includes(args[index]) || Object.hasOwn(result, args[index]) || !args[index + 1]) return null;
    result[args[index]] = args[index + 1];
  }
  return result;
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600}); }

try {
  const command = process.argv[2];
  if (command === 'metadata') {
    const args = exactArgs(['--input']); if (!args) throw new api.Beta2IdentityError('USAGE');
    api.validateApiMetadata(read(args['--input']));
  } else if (command === 'setup') {
    const args = exactArgs(['--root']); if (!args) throw new api.Beta2IdentityError('USAGE');
    api.locateUniqueSetup(args['--root']);
  } else if (command === 'normalize-snapshot') {
    const args = exactArgs(['--input', '--output']); if (!args) throw new api.Beta2IdentityError('USAGE');
    write(args['--output'], api.normalizeSnapshot(read(args['--input'])));
  } else if (command === 'installed-footprint') {
    const args = exactArgs(['--install-root', '--instance']); if (!args) throw new api.Beta2IdentityError('USAGE');
    api.collectInstalledPolicy(args['--install-root'], args['--instance']);
  } else if (command === 'collect') {
    const args = exactArgs(['--metadata', '--snapshot', '--install-root', '--instance', '--output']);
    if (!args) throw new api.Beta2IdentityError('USAGE');
    write(args['--output'], api.createDraft(read(args['--metadata']), read(args['--snapshot']),
      args['--install-root'], args['--instance']));
  } else if (command === 'finalize') {
    const args = exactArgs(['--draft', '--cleanup', '--output']); if (!args) throw new api.Beta2IdentityError('USAGE');
    write(args['--output'], api.finalizeEvidence(read(args['--draft']), read(args['--cleanup'])));
  } else if (command === 'verify') {
    const args = exactArgs(['--input']); if (!args) throw new api.Beta2IdentityError('USAGE');
    api.validateEvidence(read(args['--input']));
  } else if (command === 'report') {
    const args = exactArgs(['--status', '--stage', '--tested-commit', '--output']);
    if (!args) throw new api.Beta2IdentityError('USAGE');
    write(args['--output'], api.createRunReport(args['--status'], args['--stage'], args['--tested-commit']));
  } else if (command === 'verify-report') {
    const args = exactArgs(['--input']); if (!args) throw new api.Beta2IdentityError('USAGE');
    api.validateRunReport(read(args['--input']));
  } else throw new api.Beta2IdentityError('USAGE');
} catch (error) {
  const code = error instanceof api.Beta2IdentityError ? error.code : 'INTERNAL';
  process.stderr.write(`BETA2_IDENTITY_${code}\n`);
  process.exitCode = 1;
}
