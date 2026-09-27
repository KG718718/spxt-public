'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const identity = require('../../../windows-installer/beta3-upgrade/identity.cjs');
const {buildBundle} = require('../../../windows-installer/beta3-upgrade/trusted-identity.cjs');

const repo = path.resolve(__dirname, '../../../..');
const evidence = JSON.parse(fs.readFileSync(path.join(repo,
  'docs/tasks/windows-installer-v1.1/batch-4.5/evidence/accepted-f3-beta2-identity.json')));
const clone = value => structuredClone(value);

function rejected(fn, code) {
  assert.throws(fn, error => error instanceof identity.Rejection && error.code === code);
}

test('C01 accepted F3 evidence produces the only closed beta2 to beta3 profile', () => {
  const bundle = buildBundle(evidence);
  assert.deepEqual(Object.keys(bundle), ['schema', 'profiles']);
  assert.equal(bundle.profiles.length, 1);
  assert.equal(bundle.profiles[0].id, 'accepted-f3-run-36246132535');
  assert.equal(bundle.profiles[0].policy.fromInstallerVersion, '1.1.0-beta.2');
  assert.equal(bundle.profiles[0].policy.targetInstallerVersion, '1.1.0-beta.3');
  assert.equal(bundle.profiles[0].policy.appVersion, '1.0.0');
  assert.equal(bundle.profiles[0].policy.dataContractVersion, 1);
  assert.equal(bundle.profiles[0].policy.runtimeIdentitySchema, 1);
  assert.deepEqual(Object.fromEntries(Object.keys(identity.APPROVED_ANCHORS).map(key =>
    [key, bundle.profiles[0].policy[key]])), identity.APPROVED_ANCHORS);
  assert.doesNotThrow(() => identity.validateBundle(bundle));
});

test('C02 unknown beta2 profile is rejected', () => {
  const bundle = buildBundle(evidence);
  const unknown = clone(bundle); unknown.profiles[0].id = 'unknown-beta2'; unknown.profiles[0].sources = ['unknown-beta2'];
  rejected(() => identity.validateBundle(unknown), 'BUNDLE_INVALID');
});

test('C03 same version with any changed installed anchor is rejected', () => {
  const bundle = buildBundle(evidence);
  for (const field of Object.keys(identity.APPROVED_ANCHORS)) {
    const changed = clone(bundle); changed.profiles[0].policy[field] = '0'.repeat(64);
    rejected(() => identity.validateBundle(changed), 'POLICY_INVALID');
  }
});

test('C04 same source with a different build identity or expanded bundle is rejected', () => {
  const bundle = buildBundle(evidence);
  const rebuilt = clone(bundle); rebuilt.profiles[0].policy.buildInfoSha256 = '1'.repeat(64);
  rejected(() => identity.validateBundle(rebuilt), 'POLICY_INVALID');
  const extra = clone(bundle); extra.profiles.push(clone(extra.profiles[0]));
  rejected(() => identity.validateBundle(extra), 'BUNDLE_INVALID');
  const missing = {schema: 1, profiles: []};
  rejected(() => identity.validateBundle(missing), 'BUNDLE_INVALID');
});

test('C05 beta1 direct to beta3 route is rejected', () => {
  const policy = clone(buildBundle(evidence).profiles[0].policy);
  rejected(() => identity.validatePolicy({...policy, fromInstallerVersion: '1.1.0-beta.1'}), 'POLICY_INVALID');
});

test('C06 beta3 same-version route and registered beta3 snapshot are rejected', () => {
  const policy = clone(buildBundle(evidence).profiles[0].policy);
  rejected(() => identity.validatePolicy({...policy, fromInstallerVersion: '1.1.0-beta.3'}), 'POLICY_INVALID');
  const snapshot = {registrations: [{view: '64', key: identity.UNINSTALL_KEY, displayName: 'K⁺-SESSION Beta',
    displayVersion: '1.1.0-beta.3', installLocation: String.raw`C:\KSESSION\installed`,
    uninstallString: String.raw`"C:\KSESSION\installed\uninstall\unins000.exe"`}], bindings: [{view: '64',
    key: identity.BINDING_KEY, installRoot: String.raw`C:\KSESSION\installed`, instance: String.raw`C:\KSESSION\instance`}]};
  rejected(() => identity.validate(snapshot, policy), 'VERSION_UNSUPPORTED');
});

test('C07 beta3 to beta2 downgrade route remains rejected', () => {
  const policy = clone(buildBundle(evidence).profiles[0].policy);
  rejected(() => identity.validatePolicy({...policy, fromInstallerVersion: '1.1.0-beta.3',
    targetInstallerVersion: '1.1.0-beta.2'}), 'POLICY_INVALID');
  const oldIdentity = fs.readFileSync(path.join(repo, 'tools/windows-installer/upgrade-detection/index.cjs'), 'utf8');
  assert.match(oldIdentity, /fromInstallerVersion !== '1\.1\.0-beta\.1'/);
});

test('C14 runtime trust is repository-local and never depends on Artifact availability', () => {
  const source = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta3-upgrade/identity.cjs'), 'utf8');
  const generator = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta3-upgrade/trusted-identity.cjs'), 'utf8');
  assert.doesNotMatch(source + generator, /https?:\/\/|Invoke-WebRequest|actions\/artifacts|GITHUB_TOKEN|fetch\s*\(/i);
  const bundle = buildBundle(evidence);
  assert.deepEqual(Object.keys(bundle.profiles[0]).sort(), ['id', 'policy', 'sources']);
  assert.equal(JSON.stringify(bundle).includes('artifactId'), false);
});

test('C15 bundle and fixed diagnostics contain no path, secret, business body, or account content', () => {
  const serialized = JSON.stringify(buildBundle(evidence));
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]|token|password|cookie|authorization|attachments?|invoice|customer|employee|data\.json|config\.json/i);
  let rejection;
  try {
    identity.validateBundle({schema: 1, profiles: []});
  } catch (error) {
    rejection = error;
  }
  assert.ok(rejection instanceof identity.Rejection);
  assert.doesNotMatch(String(rejection), /[A-Za-z]:[\\/]|token|password|cookie|stack/i);
});

test('old beta1 route remains frozen while beta3 Setup and build use isolated files', () => {
  const oldIdentity = fs.readFileSync(path.join(repo, 'tools/windows-installer/upgrade-detection/index.cjs'), 'utf8');
  const oldSetup = fs.readFileSync(path.join(repo, 'tools/windows-installer/setup.iss'), 'utf8');
  const nextSetup = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta3-upgrade/setup-beta3.iss'), 'utf8');
  const nextBuild = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta3-upgrade/build-beta3.cjs'), 'utf8');
  assert.match(oldIdentity, /historical-run-35514357007/); assert.match(oldIdentity, /fresh-ci-baseline/);
  assert.match(oldIdentity, /fromInstallerVersion !== '1\.1\.0-beta\.1'/);
  assert.match(oldSetup, /"upgradeFrom":"1\.1\.0-beta\.1","upgradeTo":"1\.1\.0-beta\.2"/);
  assert.match(nextSetup, /"upgradeFrom":"1\.1\.0-beta\.2","upgradeTo":"1\.1\.0-beta\.3"/);
  assert.match(nextSetup, /PriorDisplayVersion = '1\.1\.0-beta\.3'/);
  assert.doesNotMatch(nextSetup, /0\.0\.0\.0|Profile Public|runas|New-NetFirewallRule/i);
  assert.match(nextBuild, /firewallHelperSha256/); assert.match(nextBuild, /K-SESSION-Firewall\.exe/);
});

test('Runtime application allowlist contains only reviewed LAN modules and CLIs', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'tools/package-manifest.json')));
  for (const file of ['public-lan-network.js', 'public-lan-config.js', 'public-lan-server.js',
    'tools/lan-host/network-cli.cjs', 'tools/lan-host/config-cli.cjs',
    'tools/lan-host/launcher-cli.cjs']) assert.ok(manifest.applicationFiles.includes(file));
  assert.equal(manifest.applicationFiles.length, 38);
  assert.equal(manifest.applicationFiles.some(file => /\*|tests|firewall/i.test(file)), false);
});

test('LAN portable build orders Runtime, helper, Launcher, composition and binds the exact helper hash', () => {
  const ci = fs.readFileSync(path.join(repo, 'tools/windows-portable/ci-lan.ps1'), 'utf8');
  const pack = fs.readFileSync(path.join(repo, 'tools/windows-portable/package-lan.cjs'), 'utf8');
  const runtime = ci.indexOf('tools/windows-runtime/build.cjs');
  const helper = ci.indexOf('tools/windows-firewall/build.ps1');
  const launcher = ci.indexOf('tools/windows-launcher/build.ps1');
  const finish = ci.indexOf("$taskPackageScript,'finish'");
  assert.ok(runtime >= 0 && runtime < helper && helper < launcher && launcher < finish);
  assert.match(ci, /-FirewallHelperSha256 \$taskHelperHash/);
  assert.match(pack, /assert\.equal\(li\.firewallHelperSha256,hi\.sha256\)/);
  assert.match(pack, /inspectPE\(read\(root,'K-SESSION-Firewall\.exe'\)\)/);
  assert.doesNotMatch(ci + pack, /0\.0\.0\.0|Profile Public|Remove-NetFirewallRule/i);
});
