'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE_COMMIT = 'e9417f036d0cdf736ff84682556a994040f0de0b';
const SOURCE_TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';
const SOURCE_BLOBS = Object.freeze({
  'package-lock.json': '46ee051e66e3a3cf32f97054a8da6d8e9dbf2f5b',
  'tools/installer/distribution.json': '1ba8274bd78d3e68cc3b7f05e7cc25f26664444f',
  'tools/windows-runtime/build.cjs': 'a08178fbb484ce9cf234569af8b2d2682334d4cb',
  'tools/windows-launcher/go.mod': '9dd0946b06476835ace75579599b892efff28820',
  'tools/windows-launcher/toolchain.json': 'bd3f69cd6a0185a1b0a02e8f0f1f3878cacb8a15',
  'tools/windows-launcher/build.ps1': '19e93893a4de57724e0eff088789b07e2e4b8220',
  'tools/windows-portable/ci.ps1': '7bd4c0c249f71a49750457619b99282da9eee729',
  'tools/windows-installer/toolchain.json': '997eaf1c4351ecaa7d1413e56b79d06dca07a437',
  'tools/windows-installer/toolchain.ps1': '489099a99919326ad2705e696d9804ccab7f13dc',
  'tools/windows-installer/build.cjs': '54b6d705d7497877b42c292ac16d8aa11aa5b2d3',
  'tools/windows-installer/setup.iss': '2a11cd2d1ff64edfb297b85bff3767371e0fcead',
  'tools/tests/windows-installer/contract.cjs': '0d7be20e5068a3d6cad61371fbe30f46da022132'
});

class SourceError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function fail(code) { throw new SourceError(code); }
function canonicalPath(value) {
  const resolved = fs.realpathSync.native(path.resolve(value));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
function samePath(a, b) {
  try { return canonicalPath(a) === canonicalPath(b); }
  catch { return false; }
}
function git(source, args, env) {
  const result = cp.spawnSync('git', ['-c', 'core.autocrlf=false', '-C', source, ...args],
    {encoding: 'utf8', windowsHide: true, env, maxBuffer: 2e6});
  if (result.status !== 0 || result.error) fail('BETA1_SOURCE_GIT_ERROR');
  return result.stdout.trim();
}
function verifyCheckout(sourceArg, expected = {}, options = {}) {
  const source = path.resolve(sourceArg);
  const env = options.env || process.env;
  const commit = expected.commit || SOURCE_COMMIT;
  const tree = expected.tree || SOURCE_TREE;
  const blobs = expected.blobs || SOURCE_BLOBS;
  const top = git(source, ['rev-parse', '--show-toplevel'], env);
  if (!samePath(top, source)) fail('BETA1_SOURCE_TOPLEVEL_MISMATCH');
  if (git(source, ['rev-parse', 'HEAD'], env) !== commit) fail('BETA1_SOURCE_COMMIT_MISMATCH');
  if (git(source, ['rev-parse', 'HEAD^{tree}'], env) !== tree) fail('BETA1_SOURCE_TREE_MISMATCH');
  if (git(source, ['status', '--porcelain', '--untracked-files=no'], env) !== '') fail('BETA1_SOURCE_TRACKED_DIRTY');
  for (const [file, blob] of Object.entries(blobs)) {
    if (git(source, ['hash-object', '--', file], env) !== blob) fail('BETA1_SOURCE_BLOB_MISMATCH');
  }
  return {status: 'PASS', sourceCommit: commit, sourceTree: tree, trackedClean: true, coreAutocrlf: false, blobCount: Object.keys(blobs).length};
}

if (require.main === module) {
  try {
    assert.equal(process.argv.length, 3);
    process.stdout.write(JSON.stringify(verifyCheckout(process.argv[2])) + '\n');
  } catch (error) {
    const code = error instanceof SourceError ? error.code : 'BETA1_SOURCE_USAGE_OR_INTERNAL';
    process.stderr.write(code + '\n');
    process.exitCode = error instanceof SourceError ? 20 : 21;
  }
}

module.exports = {SOURCE_BLOBS, SOURCE_COMMIT, SOURCE_TREE, SourceError, verifyCheckout};
