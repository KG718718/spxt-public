'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { sha } = require('../windows-runtime/common.cjs');
const { policyFingerprint, validateBundle, validatePolicy } = require('./upgrade-detection/index.cjs');
const { verifyBeta1Build } = require('./verify-beta1-build.cjs');

const [oldBuildArg, historicalArg, outputArg] = process.argv.slice(2);
if (!oldBuildArg || !historicalArg || !outputArg) throw new Error('old build, historical evidence and output are required');
const oldBuild = path.resolve(oldBuildArg);
const {build, buildBytes, manifest, manifestBytes} = verifyBeta1Build(oldBuild);
const fresh = {
  schema: 1,
  appId: 'KSESSION-Beta-Installer-v1',
  uninstallKey: String.raw`Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`,
  bindingKey: String.raw`Software\KSESSION\Beta\InstallerBinding`,
  fromInstallerVersion: '1.1.0-beta.1', targetInstallerVersion: '1.1.0-beta.2',
  appVersion: '1.0.0', dataContractVersion: 1, allowLegacyMissingDataContract: true,
  sourceCommit: build.sourceCommit, sourceTree: build.sourceTree,
  programManifestSha256: sha(manifestBytes), programInventorySha256: manifest.payloadInventorySha256,
  runtimeManifestSha256: build.runtimeManifestSha256, launcherSha256: build.launcherSha256,
  buildInfoSha256: sha(buildBytes)
};
validatePolicy(fresh);
const historicalEvidence = JSON.parse(fs.readFileSync(path.resolve(historicalArg), 'utf8'));
if (historicalEvidence.status !== 'PASS' || !historicalEvidence.profile || historicalEvidence.profile.id !== 'historical-run-35514357007') {
  throw new Error('reviewed historical identity evidence is invalid');
}
validatePolicy(historicalEvidence.profile.policy);
const historical = historicalEvidence.profile;
const profiles = policyFingerprint(historical.policy) === policyFingerprint(fresh)
  ? [{ id: 'historical-run-35514357007', sources: ['historical-run-35514357007', 'fresh-ci-baseline'], policy: historical.policy }]
  : [historical, { id: 'fresh-ci-baseline', sources: ['fresh-ci-baseline'], policy: fresh }];
const bundle = { schema: 1, profiles };
validateBundle(bundle);
const output = path.resolve(outputArg);
fs.writeFileSync(output, JSON.stringify(bundle, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
process.stdout.write(JSON.stringify({status:'PASS', sourceCommit:fresh.sourceCommit,
  profileId:'fresh-ci-baseline', bundleSha256:sha(fs.readFileSync(output)), profileCount:profiles.length}) + '\n');
