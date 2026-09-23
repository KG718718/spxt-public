'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { inventory, sha } = require('../windows-runtime/common.cjs');

const SOURCE_COMMIT = 'e9417f036d0cdf736ff84682556a994040f0de0b';
const SOURCE_TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';
const SETUP_NAME = 'K-SESSION-Setup-1.1.0-beta.1.exe';

function regular(file) {
  const info = fs.lstatSync(file);
  assert.ok(info.isFile() && !info.isSymbolicLink(), 'beta.1 build input must be a regular file');
  return fs.readFileSync(file);
}

function json(file) {
  return JSON.parse(regular(file).toString('utf8').replace(/^\ufeff/, ''));
}

function verifyBeta1Build(oldBuildArg) {
  const oldBuild = path.resolve(oldBuildArg);
  assert.match(oldBuild, /^E:\\/i);
  const generated = path.join(oldBuild, 'candidate', 'generated');
  const artifact = path.join(oldBuild, 'candidate', 'artifact');
  const program = path.join(oldBuild, 'portable', '解包程序 中文 with spaces', 'K-SESSION');
  const generatedManifestFile = path.join(generated, 'installer-manifest.json');
  const generatedBuildFile = path.join(generated, 'build-info.json');
  const manifestBytes = regular(generatedManifestFile);
  const manifest = JSON.parse(manifestBytes);
  const buildBytes = regular(generatedBuildFile);
  const build = JSON.parse(buildBytes);
  const artifactManifestBytes = regular(path.join(artifact, 'installer-manifest.json'));
  const artifactBuild = json(path.join(artifact, 'build-info.json'));
  const setupBytes = regular(path.join(artifact, SETUP_NAME));
  const actualInventory = inventory(program);

  assert.equal(build.sourceCommit, SOURCE_COMMIT);
  assert.equal(build.sourceTree, SOURCE_TREE);
  assert.equal(build.installerVersion, '1.1.0-beta.1');
  assert.equal(build.appVersion, '1.0.0');
  assert.equal(build.nodeVersion, '24.21.0');
  assert.equal(build.goVersion, '1.27.1');
  assert.equal(build.innoSetupVersion, '6.7.3');
  assert.equal(build.packageLockSha256, '7e650d8d4141d888ab7cc81da25fa094f0e36ffaa0f2152d5066346633e8b2b5');
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.sourceCommit, SOURCE_COMMIT);
  assert.equal(manifest.sourceTree, SOURCE_TREE);
  assert.equal(manifest.version, '1.1.0-beta.1');
  assert.deepEqual(actualInventory, manifest.payload);
  assert.equal(sha(Buffer.from(JSON.stringify(actualInventory))), manifest.payloadInventorySha256);
  assert.deepEqual(artifactManifestBytes, manifestBytes);
  for (const [key, value] of Object.entries(build)) assert.deepEqual(artifactBuild[key], value);
  assert.equal(artifactBuild.mode, 'candidate');
  assert.equal(artifactBuild.setupBytes, setupBytes.length);
  assert.equal(artifactBuild.setupSha256, sha(setupBytes));
  assert.equal(regular(path.join(artifact, SETUP_NAME + '.sha256')).toString('utf8'), artifactBuild.setupSha256 + '  ' + SETUP_NAME + '\n');
  assert.deepEqual(fs.readdirSync(artifact).sort(), [SETUP_NAME, SETUP_NAME + '.sha256', 'LICENSE-Inno-Setup.txt',
    'build-info.json', 'installer-manifest.json', 'license-summary.json'].sort());
  const portableReport = json(path.join(oldBuild, 'portable', 'artifact', 'portable-test-report.json'));
  assert.equal(portableReport.status, 'PASS');
  assert.equal(portableReport.sourceCommit, SOURCE_COMMIT);
  assert.equal(portableReport.staging.status, 'PASS');
  assert.equal(portableReport.extracted.status, 'PASS');
  return { build, buildBytes, manifest, manifestBytes, program, setupSha256: artifactBuild.setupSha256,
    report: {schema: 1, kind: 'k-session-beta1-build-only', status: 'PASS', sourceCommit: SOURCE_COMMIT,
      sourceTree: SOURCE_TREE, installerVersion: '1.1.0-beta.1', setupSha256: artifactBuild.setupSha256,
      programManifestSha256: sha(manifestBytes), programInventorySha256: manifest.payloadInventorySha256,
      historicalGuiRegression: 'NOT_RUN_BUILD_ONLY'} };
}

if (require.main === module) {
  const [oldBuild, output] = process.argv.slice(2);
  assert.ok(oldBuild && output, 'old build and report output are required');
  const result = verifyBeta1Build(oldBuild);
  fs.writeFileSync(path.resolve(output), JSON.stringify(result.report, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  process.stdout.write(JSON.stringify(result.report) + '\n');
}

module.exports = {SOURCE_COMMIT, SOURCE_TREE, verifyBeta1Build};
