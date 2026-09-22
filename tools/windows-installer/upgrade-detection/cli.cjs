#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {Rejection, sha, validateApprovedIdentity} = require('./index.cjs');

function emit(value) { process.stdout.write(JSON.stringify(value) + '\n'); }
function argumentsExact() {
  const args = process.argv.slice(2);
  if (args.length !== 6) return null;
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--bundle', '--bundle-sha256', '--snapshot'].includes(args[i]) || values[args[i]] !== undefined || !args[i + 1]) return null;
    values[args[i]] = args[i + 1];
  }
  return values;
}
function readRegular(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('not a regular file');
  return fs.readFileSync(file);
}

try {
  const args = argumentsExact();
  if (!args || !/^[a-f0-9]{64}$/.test(args['--bundle-sha256'])) {
    emit({status: 'REJECT', code: 'USAGE'}); process.exitCode = 64;
  } else {
    const bundleBytes = readRegular(args['--bundle']);
    if (sha(bundleBytes) !== args['--bundle-sha256']) throw new Rejection(40, 'BUNDLE_HASH_MISMATCH', '受信任身份集合哈希不匹配。');
    const result = validateApprovedIdentity(JSON.parse(readRegular(args['--snapshot']).toString('utf8')), JSON.parse(bundleBytes));
    emit(result);
  }
} catch (error) {
  if (error instanceof Rejection) {
    emit({status: 'REJECT', code: error.code});
    process.stderr.write(error.diagnostic + '\n');
    process.exitCode = error.exitCode;
  } else {
    emit({status: 'REJECT', code: 'INTERNAL_ERROR'});
    process.stderr.write('无法完成旧安装身份验证。\n');
    process.exitCode = 70;
  }
}
