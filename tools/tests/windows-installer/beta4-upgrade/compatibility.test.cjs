'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const identity = require('../../../windows-installer/beta4-upgrade/identity.cjs');
const {buildBundle} = require('../../../windows-installer/beta4-upgrade/trusted-identity.cjs');
const harness = require('./prepare-hosted-harness.cjs');
const expectedGoTests = require('../../lan-host/expected-go-tests.cjs');

const repo = path.resolve(__dirname, '../../../..');
const evidence = JSON.parse(fs.readFileSync(path.join(repo,
  'docs/tasks/windows-installer-v1.1/batch-4.5/evidence/accepted-f3-beta2-identity.json')));
const clone = value => structuredClone(value);

function rejected(fn, code) {
  assert.throws(fn, error => error instanceof identity.Rejection && error.code === code);
}

test('C01 accepted F3 evidence produces the only closed beta2 to beta4 profile', () => {
  const bundle = buildBundle(evidence);
  assert.deepEqual(Object.keys(bundle), ['schema', 'profiles']);
  assert.equal(bundle.profiles.length, 1);
  assert.equal(bundle.profiles[0].id, 'accepted-f3-run-36246132535');
  assert.equal(bundle.profiles[0].policy.fromInstallerVersion, '1.1.0-beta.2');
  assert.equal(bundle.profiles[0].policy.targetInstallerVersion, '1.1.0-beta.4');
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

test('C05 beta1 direct to beta4 route is rejected', () => {
  const policy = clone(buildBundle(evidence).profiles[0].policy);
  rejected(() => identity.validatePolicy({...policy, fromInstallerVersion: '1.1.0-beta.1'}), 'POLICY_INVALID');
});

test('LAN-2 rejects beta3 as a source and preserves the historical F3 evidence', () => {
  const original = clone(evidence);
  const bundle = buildBundle(evidence);
  assert.deepEqual(evidence, original);
  assert.equal(evidence.profile.policy.targetInstallerVersion, '1.1.0-beta.3');
  assert.equal(bundle.profiles[0].policy.targetInstallerVersion, '1.1.0-beta.4');
  rejected(() => identity.validatePolicy({...bundle.profiles[0].policy,
    fromInstallerVersion: '1.1.0-beta.3'}), 'POLICY_INVALID');
  const beta3 = clone(bundle);
  beta3.profiles[0].policy.fromInstallerVersion = '1.1.0-beta.3';
  rejected(() => identity.validateBundle(beta3), 'POLICY_INVALID');
  const beta3Snapshot = {registrations: [{view: '64', key: identity.UNINSTALL_KEY,
    displayName: 'K⁺-SESSION Beta', displayVersion: '1.1.0-beta.3',
    installLocation: String.raw`C:\KSESSION\installed`,
    uninstallString: String.raw`"C:\KSESSION\installed\uninstall\unins000.exe"`}],
  bindings: [{view: '64', key: identity.BINDING_KEY,
    installRoot: String.raw`C:\KSESSION\installed`, instance: String.raw`C:\KSESSION\instance`}]};
  rejected(() => identity.validate(beta3Snapshot, bundle.profiles[0].policy), 'VERSION_UNSUPPORTED');
});

test('C06 beta4 same-version route and registered beta4 snapshot are rejected', () => {
  const policy = clone(buildBundle(evidence).profiles[0].policy);
  rejected(() => identity.validatePolicy({...policy, fromInstallerVersion: '1.1.0-beta.4'}), 'POLICY_INVALID');
  const snapshot = {registrations: [{view: '64', key: identity.UNINSTALL_KEY, displayName: 'K⁺-SESSION Beta',
    displayVersion: '1.1.0-beta.4', installLocation: String.raw`C:\KSESSION\installed`,
    uninstallString: String.raw`"C:\KSESSION\installed\uninstall\unins000.exe"`}], bindings: [{view: '64',
    key: identity.BINDING_KEY, installRoot: String.raw`C:\KSESSION\installed`, instance: String.raw`C:\KSESSION\instance`}]};
  rejected(() => identity.validate(snapshot, policy), 'VERSION_UNSUPPORTED');
});

test('C07 beta4 to beta2 downgrade route remains rejected', () => {
  const policy = clone(buildBundle(evidence).profiles[0].policy);
  rejected(() => identity.validatePolicy({...policy, fromInstallerVersion: '1.1.0-beta.4',
    targetInstallerVersion: '1.1.0-beta.2'}), 'POLICY_INVALID');
  const oldIdentity = fs.readFileSync(path.join(repo, 'tools/windows-installer/upgrade-detection/index.cjs'), 'utf8');
  assert.match(oldIdentity, /fromInstallerVersion !== '1\.1\.0-beta\.1'/);
});

test('C14 runtime trust is repository-local and never depends on Artifact availability', () => {
  const source = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta4-upgrade/identity.cjs'), 'utf8');
  const generator = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta4-upgrade/trusted-identity.cjs'), 'utf8');
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

test('old beta1 route remains frozen while beta4 Setup and build use isolated files', () => {
  const oldIdentity = fs.readFileSync(path.join(repo, 'tools/windows-installer/upgrade-detection/index.cjs'), 'utf8');
  const oldSetup = fs.readFileSync(path.join(repo, 'tools/windows-installer/setup.iss'), 'utf8');
  const nextSetup = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta4-upgrade/setup-beta4.iss'), 'utf8');
  const nextBuild = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta4-upgrade/build-beta4.cjs'), 'utf8');
  assert.match(oldIdentity, /historical-run-35514357007/); assert.match(oldIdentity, /fresh-ci-baseline/);
  assert.match(oldIdentity, /fromInstallerVersion !== '1\.1\.0-beta\.1'/);
  assert.match(oldSetup, /"upgradeFrom":"1\.1\.0-beta\.1","upgradeTo":"1\.1\.0-beta\.2"/);
  assert.match(nextSetup, /"upgradeFrom":"1\.1\.0-beta\.2","upgradeTo":"1\.1\.0-beta\.4"/);
  assert.match(nextSetup, /PriorDisplayVersion = '1\.1\.0-beta\.4'/);
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

test('LAN test subprocess resolves dependencies only from the built Runtime tree and restores NODE_PATH', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ksession-runtime-modules-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const modules = path.join(directory, 'app', 'node_modules'), probe = path.join(modules, 'ksession-runtime-probe');
  fs.mkdirSync(probe, {recursive: true}); fs.writeFileSync(path.join(probe, 'index.js'), "module.exports='runtime-only';\n");
  const script = "if(require('ksession-runtime-probe')!=='runtime-only')process.exit(23)";
  const missing = cp.spawnSync(process.execPath, ['-e', script], {cwd: repo, env: {...process.env, NODE_PATH: ''}, windowsHide: true});
  assert.notEqual(missing.status, 0);
  const resolved = cp.spawnSync(process.execPath, ['-e', script], {cwd: repo, env: {...process.env, NODE_PATH: modules}, windowsHide: true});
  assert.equal(resolved.status, 0);
  const ci = fs.readFileSync(path.join(repo, 'tools/windows-portable/ci-lan.ps1'), 'utf8');
  assert.match(ci, /\$taskRuntimeModules=Join-Path \$taskRoot 'app\/node_modules'/);
  assert.match(ci, /Enter-KSessionLanNodeTestEnvironment[\s\S]+--test-reporter=tap[\s\S]+Exit-KSessionLanNodeTestEnvironment/);
  // T2 owns ci-lan.ps1. Until its LAN-2 change is integrated, this checkout
  // still carries the frozen 37-test gate; beta4 itself must require 44.
  assert.match(ci, /Tests-ne(?:37|44)-or\$taskNodeSummary\.Pass-ne(?:37|44)-or\$taskNodeSummary\.Fail-ne0-or\$taskNodeSummary\.Skipped-ne0/);
  assert.match(ci, /Restore-KSessionProcessEnvironment \$taskNodePathState/);
  const beta4=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/ci-beta4.ps1'),'utf8');
  const beta4Build=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/build-beta4.cjs'),'utf8');
  assert.match(beta4Build, /pr\.nodeTestEnvironment\.tests,44/);
  assert.match(beta4Build, /pr\.nodeTestEnvironment\.pass,44/);
  const helper=fs.readFileSync(path.join(repo,'tools/tests/lan-host/node-test-environment.ps1'),'utf8');
  const workflow=fs.readFileSync(path.join(repo,'.github/workflows/lan2-beta4-v1.1.yml'),'utf8').replaceAll('\r\n','\n');
  assert.match(ci,/Invoke-KSessionWithRestoredEnvironment \$taskLauncherBuildVariables[\s\S]+tools\/windows-launcher\/build\.ps1/);
  for(const name of ['TEMP','TMP','GOTMPDIR','GOCACHE'])assert.match(ci,new RegExp("'"+name+"'"));
  assert.match(helper,/Resolve-KSessionFirewallPhysicalPath \$OwnedParent/);
  assert.match(helper,/Get-KSessionFirewallTestPathClass \$root\)-ne'CANONICAL'/);
  assert.match(ci,/lan-node-test-environment\.json/);
  assert.match(workflow,/E:\/lan-build\/portable\/lan-node-test-environment\.json/);
  assert.ok(beta4.indexOf('Enter-KSessionLanCandidateTestEnvironment') < beta4.indexOf("'tools/windows-portable/ci-lan.ps1'"));
  assert.ok(beta4.indexOf('Exit-KSessionLanCandidateTestEnvironment') > beta4.indexOf("'FROZEN_REGRESSION'"));
  assert.match(beta4,/ci-test-environment\.json[\s\S]+environmentRestored/);
  assert.match(beta4,/if\(!\$taskCandidateEnvironmentReport\.environmentRestored\)\{Set-FixedStage \$script:taskStage 'FAIL';throw/);
  assert.match(workflow,/E:\/lan-build\/ci-test-environment\.json/);
  assert.match(workflow,/Same-commit frozen public regression[\s\S]+Enter-KSessionLanNodeTestEnvironment[\s\S]+Exit-KSessionLanNodeTestEnvironment/);
});

test('LAN-2 workflow exposes only full and QA and fixes source identity before build', () => {
  const workflow = fs.readFileSync(path.join(repo, '.github/workflows/lan2-beta4-v1.1.yml'), 'utf8').replaceAll('\r\n','\n');
  const caller = fs.readFileSync(path.join(repo, '.github/workflows/setup-v3.yml'), 'utf8').replaceAll('\r\n','\n');
  const candidate = workflow.slice(workflow.indexOf('\n  candidate:\n'));
  const lan2Job = caller.match(/\n  lan2-beta4-v1-1:\n([\s\S]*?)(?=\n  historical-identity:\n)/);
  assert.ok(lan2Job);
  assert.equal((caller.match(/\n          - lan2-full\n/g) || []).length, 1);
  assert.equal((caller.match(/\n          - lan2-qa\n/g) || []).length, 1);
  assert.equal(lan2Job[1], [
    "    if: github.repository == 'KG718718/spxt-public' && github.ref == 'refs/heads/codex/lan2-manual-host-v1.1' && github.event_name == 'workflow_dispatch' && (inputs.mode == 'lan2-full' || inputs.mode == 'lan2-qa')",
    '    permissions:', '      contents: read', '      actions: read',
    '    uses: ./.github/workflows/lan2-beta4-v1.1.yml', '    with:',
    "      mode: ${{ inputs.mode == 'lan2-full' && 'full' || inputs.mode == 'lan2-qa' && 'qa' || '' }}"
  ].join('\n'));
  assert.match(workflow, /\n  workflow_call:\n    inputs:\n      mode:\n/);
  assert.match(candidate, /github\.repository == 'KG718718\/spxt-public' && github\.ref == 'refs\/heads\/codex\/lan2-manual-host-v1\.1'/);
  assert.match(candidate, /\(inputs\.mode == 'full' \|\| inputs\.mode == 'qa'\)/);
  assert.match(workflow, /options:\n          - full\n          - qa\n/);
  assert.doesNotMatch(workflow, /\n  diagnostic(?:-extension)?:\n|          - diagnostic(?:-extension)?\n/);
  assert.match(candidate, /refs\/heads\/codex\/lan2-manual-host-v1\.1/);
  assert.ok(candidate.indexOf('Initialize fixed candidate stage evidence') < candidate.indexOf('uses: actions/checkout@'));
  for (const stage of ['ENV', 'SOURCE', 'DOWNLOAD', 'VERIFY']) assert.match(workflow, new RegExp("stage='" + stage + "'", 'i'));
  assert.equal((workflow.match(/name: Finalize fixed failure stage/g) || []).length, 1);
  assert.equal((candidate.match(/status='FAIL';stage=\$taskStage/g) || []).length, 1);
  assert.match(candidate, /artifacts\/10907910968\/zip[\s\S]+e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6/);
  assert.match(candidate, /877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6/);
  assert.match(candidate, /beta4-upgrade\/ci-beta4\.ps1[\s\S]+-FullHosted/);
  assert.match(workflow, /E:\/lan-evidence\/beta4-ci-stage\.json/);
  assert.doesNotMatch(workflow, /compiler-stdout|compiler-stderr|server\.log/);
});

test('LAN-2 full CI has no legacy production discovery precondition', () => {
  const ci = fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/ci-beta4.ps1'),'utf8');
  const verifier = fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/verify-artifact-beta4.cjs'),'utf8');
  const workflow = fs.readFileSync(path.join(repo,'.github/workflows/lan2-beta4-v1.1.yml'),'utf8');
  assert.doesNotMatch(ci + verifier + workflow, /lan-host\/hosted-gate\.cjs|lan-host\/production-sessions\.test\.cjs|PRODUCTION_DISCOVERY_REJECT/);
  assert.match(ci, /beta4-upgrade\/production-sessions\.test\.cjs/);
  assert.doesNotMatch(ci + workflow, /DiagnosticHosted|diagnostic-extension|HOSTED_LAN/);
  assert.match(ci, /offline-ci-beta4\.ps1/);
  assert.match(ci, /firewall-hosted-gate\.ps1/);
});

test('versioned Go overlay rewires LAN package verification and injects the reviewed helper identity', () => {
  const portableSource = '\truntimeHash = info["runtimeManifestSha256"].(string)\n' +
    Array(4).fill('tools/windows-portable/package.cjs').join('\n');
  const portable = harness.transformPortable(portableSource);
  assert.equal((portable.match(/package-lan\.cjs/g) || []).length, 4);
  assert.match(portable, /firewallHelperHash = info\["firewallHelperSha256"\]\.\(string\)/);
  assert.doesNotMatch(portable, /tools\/windows-portable\/package\.cjs/);
  const integration = harness.transformIntegration('\truntimeHash = build["runtimeManifestSha256"].(string)\n');
  assert.match(integration, /firewallHelperHash = build\["firewallHelperSha256"\]\.\(string\)/);
  const ci = fs.readFileSync(path.join(repo, 'tools/windows-portable/ci-lan.ps1'), 'utf8');
  assert.equal((ci.match(/-overlay=/g) || []).length, 3);
  assert.doesNotMatch(fs.readFileSync(path.join(repo, 'tools/windows-launcher/portable_windows_test.go'), 'utf8'), /package-lan\.cjs/);
});

test('beta4 rollback snapshots complete registry views and restores registration only after file rollback', () => {
  const setup = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta4-upgrade/setup-beta4.iss'), 'utf8');
  for (const marker of ['SnapshotUpgradeRegistration', 'ExportRegistryKey', 'ImportRegistryKey',
    'PriorProduct64Hash', 'PriorBinding64Hash', 'PriorProduct32Hash', 'PriorBinding32Hash',
    'KSESSION_FIXTURE_REGISTRY_RESTORE_FAILURE', 'KSESSION_UPGRADE_ROLLBACK_FAILED']) assert.match(setup, new RegExp(marker));
  assert.doesNotMatch(setup, /procedure RestoreUpgradeRegistration/);
  assert.doesNotMatch(setup, /RegWriteStringValue\(HKCU64, ProductKey, 'Display/);
  assert.match(setup, /if RunNode\('upgrade-transaction-cli\.cjs', 'rollback[\s\S]+if RestoreUpgradeRegistration and[\s\S]+complete-rollback[\s\S]+Log\('KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK'\)/);
  assert.match(setup, /GetSHA256OfFile\(VerifyName\) = ExpectedHash/);
  const corrupt=setup.indexOf("SaveStringToFile(PriorProduct64Snapshot, 'synthetic-corruption'");
  const validate=setup.indexOf('ValidateRegistrySnapshot(PriorProduct64Snapshot');
  const remove=setup.indexOf('DeleteRegistryKeyExact(HKCU64, ProductKey)');
  assert.ok(corrupt>=0&&corrupt<validate&&validate<remove);
  assert.match(setup, /GetFileAttributesW\(FileName\)[\s\S]+\$400/);
  const generator = fs.readFileSync(path.join(__dirname, 'prepare-hosted-harness.cjs'), 'utf8');
  assert.match(generator, /registration-64/);assert.match(generator, /registration-32/);
  assert.match(generator, /accepted F3 beta\.2 upgraded in place to beta\.4/);
});

test('fixed Go JSON reporter rejects missing, failed, skipped, or unexpected tests', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ksession-go-report-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const reporter=path.join(repo,'tools/tests/lan-host/go-test-report.cjs'),run=(name,events,expected)=>{
    const input=path.join(directory,name+'.jsonl'),output=path.join(directory,name+'.json');fs.writeFileSync(input,events.map(JSON.stringify).join('\n')+'\n');
    return cp.spawnSync(process.execPath,[reporter,input,output,'SYNTHETIC',...expected],{encoding:'utf8',windowsHide:true});
  };
  const pass=[{Action:'run',Test:'TestOne'},{Action:'pass',Test:'TestOne'},{Action:'pass'}];
  assert.equal(run('pass',pass,['TestOne']).status,0);
  assert.notEqual(run('missing',pass,['TestOne','TestTwo']).status,0);
  assert.notEqual(run('skip',[{Action:'skip',Test:'TestOne'},{Action:'pass'}],['TestOne']).status,0);
  assert.notEqual(run('unexpected',[...pass.slice(0,-1),{Action:'pass',Test:'TestTwo'},{Action:'pass'}],['TestOne']).status,0);
});

test('fixed Go policies cover the exact Launcher build group and every firewall top-level test', () => {
  const launcherPolicy = [
    'TestRelativePathSafety', 'TestEnvironmentAllowlist', 'TestInstanceOutsidePackage', 'TestRuntimeMissing',
    'TestJobOwnsOnlyChild', 'TestInstallDataSafety', 'TestLANReadyRequiresEveryGate', 'TestFixedServerStatusesMapToProductStates',
    'TestCandidateAndJSONAreStrict', 'TestEnvironmentLANModeIsExplicitAndAllowlisted',
    'TestExactListenerOwnershipRejectsWildcardThirdNICPortAndPIDImpersonationRows',
    'TestCopyURLSourceIsOnlyCurrentPrivateEndpoint', 'TestPersistedPortNeverSilentlyFallsThroughRange',
    'TestFirewallHelperFixedHashBeforeElevation', 'TestFirewallHelperAbsentHashKeepsHistoricalLocalMode',
    'TestFirewallEnvironmentFailureIsFailClosed', 'TestFirewallInterfaceNameArgumentIsQuoted',
    'TestEnableRejectionRestoresDisabledPreferenceAndLocalChild', 'TestLANSettingsTransitionDoesNotBlockUIThread',
    'TestTransitionStartFailureRestoresOldConfigAndService', 'TestFirstTransitionStartFailureKeepsDeterminedPort',
    'TestTransitionRejectsUnexpectedFallbackPort', 'TestFailedRefreshRevokesStaleCopyURL',
    'TestFreshDiscoveryMismatchRevokesCopyURL', 'TestFreshDiscoveryMatchPublishesURLWhenFirewallBlocked',
    'TestStopDispatchRetriesBusyOwnedWindow', 'TestStopDispatchKeepsStrictOverallTimeout',
    'TestStrictLocalStatusAndActualPIDSocketOwnership'
  ];
  const firewallPolicy = [
    'TestRequestWhitelistAndInterfaceName', 'TestStrictDeploymentConfig', 'TestStrictDeploymentConfigExactKeyCorpus',
    'TestInstallIdentityAndTampering', 'TestReparseResolutionMismatchIsRejected',
    'TestCleanPathComparisonRejectsLexicalAliases', 'TestBoundConfigMustMatchRequest',
    'TestRegistrationAndINIContracts', 'TestRuleOwnershipAndIdempotencyPolicy',
    'TestEmbeddedFirewallScriptIsClosed', 'TestEmbeddedFirewallScriptParses', 'TestStatusOutputAllowlist',
    'TestFirewallScriptBehaviorWithIsolatedCmdletHarness'
  ];
  assert.equal(launcherPolicy.length, 28);
  assert.equal(firewallPolicy.length, 13);
  assert.deepEqual(expectedGoTests.LAUNCHER, launcherPolicy);
  assert.deepEqual(expectedGoTests.FIREWALL, firewallPolicy);
  const launcherBuild=fs.readFileSync(path.join(repo,'tools/windows-launcher/build.ps1'),'utf8');
  const anchoredGroup=/-run '\^Test\(([^']+)\)\$'/;
  assert.equal("-run 'Test(RelativePathSafety)$'".match(anchoredGroup),null);
  assert.equal("-run '^Test(RelativePathSafety)'".match(anchoredGroup),null);
  const group=launcherBuild.match(anchoredGroup);
  assert.ok(group);assert.deepEqual(group[1].split('|').map(name=>'Test'+name),launcherPolicy);
  const firewallDir=path.join(repo,'tools/windows-firewall');
  const firewallNames=fs.readdirSync(firewallDir).filter(name=>name.endsWith('_test.go')).flatMap(name=>
    [...fs.readFileSync(path.join(firewallDir,name),'utf8').matchAll(/^func (Test\w+)\(/gm)].map(match=>match[1]));
  assert.deepEqual(firewallNames.sort(),[...firewallPolicy].sort());
  const integration=fs.readFileSync(path.join(repo,'tools/windows-launcher/integration_windows_test.go'),'utf8');
  assert.equal(new Set(expectedGoTests.INTEGRATION_IDS).size,expectedGoTests.INTEGRATION_IDS.length);
  for(const id of expectedGoTests.INTEGRATION_IDS)assert.match(integration,new RegExp('pass\\("'+id+' '));
});
