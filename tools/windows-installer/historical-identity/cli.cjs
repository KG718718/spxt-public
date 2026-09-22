#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  HistoricalIdentityError,
  createDraft,
  finalizeEvidence,
  locateUniqueSetup,
  normalizeSharedHkcuSnapshot,
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

const NORMALIZE_EXIT = Object.freeze({INPUT: 20, MISSING_REGISTRATION: 21, MISSING_BINDING: 22, MISSING_BOTH: 23,
  CONFLICT: 24, USAGE: 25, OUTPUT: 26, OTHER: 27});
function normalizeSnapshotCommand() {
  const args = exactArgs(['--input', '--output']);
  if (!args) return NORMALIZE_EXIT.USAGE;
  let snapshot;
  try { snapshot = readJson(args['--input']); } catch { return NORMALIZE_EXIT.INPUT; }
  let normalized;
  try {
    normalized = normalizeSharedHkcuSnapshot(snapshot);
  } catch (error) {
    if (!(error instanceof HistoricalIdentityError)) return NORMALIZE_EXIT.OTHER;
    if (error.code === 'REGISTRY_SNAPSHOT_SCHEMA') return NORMALIZE_EXIT.INPUT;
    if (error.code === 'REGISTRY_MISSING_REGISTRATION') return NORMALIZE_EXIT.MISSING_REGISTRATION;
    if (error.code === 'REGISTRY_MISSING_BINDING') return NORMALIZE_EXIT.MISSING_BINDING;
    if (error.code === 'REGISTRY_MISSING_BOTH') return NORMALIZE_EXIT.MISSING_BOTH;
    if (error.code === 'REGISTRY_VIEW_CONFLICT') return NORMALIZE_EXIT.CONFLICT;
    return NORMALIZE_EXIT.OTHER;
  }
  try { writeJson(args['--output'], normalized); } catch { return NORMALIZE_EXIT.OUTPUT; }
  return 0;
}

const command = process.argv[2];
if (command === 'normalize-snapshot') {
  try { process.exitCode = normalizeSnapshotCommand(); } catch { process.exitCode = NORMALIZE_EXIT.OTHER; }
  return;
}

try {
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
