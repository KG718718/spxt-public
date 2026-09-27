'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, `expected one harness marker: ${from}`);
  return source.replace(from, to);
}
function replaceCount(source, from, to, count) {
  assert.equal(source.split(from).length - 1, count, `expected ${count} harness markers: ${from}`);
  return source.replaceAll(from, to);
}

function main(argv) {
  assert.equal(argv.length, 2, 'launcher source and fresh output required');
  const launcher = path.resolve(argv[0]), output = path.resolve(argv[1]);
  const repo = path.resolve(launcher, '../..');
  assert.equal(fs.existsSync(output), false, 'fresh harness output required');
  fs.mkdirSync(output, {recursive: false});

  let setup = fs.readFileSync(path.join(launcher, 'setup_windows_test.go'), 'utf8');
  setup = replaceOnce(setup, 'K-SESSION-Setup-1.1.0-beta.2.exe', 'K-SESSION-Setup-1.1.0-beta.3.exe');
  setup = replaceOnce(setup, 'INSTALLER-TEST-REPORT.json', 'BETA3-INSTALLER-TEST-REPORT.json');
  setup = replaceCount(setup, 'tools/windows-portable/package.cjs', 'tools/windows-portable/package-lan.cjs', 2);
  fs.writeFileSync(path.join(output, 'setup_windows_test.go'), setup, {flag: 'wx'});

  let upgrade = fs.readFileSync(path.join(launcher, 'upgrade_windows_test.go'), 'utf8');
  upgrade = upgrade.replaceAll('beta.1', '__KSESSION_SOURCE_VERSION__');
  upgrade = upgrade.replaceAll('beta.2', 'beta.3');
  upgrade = upgrade.replaceAll('__KSESSION_SOURCE_VERSION__', 'beta.2');
  upgrade = upgrade.replaceAll('beta1', '__KSESSION_SOURCE_TOKEN__');
  upgrade = upgrade.replaceAll('beta2', 'targetBeta3');
  upgrade = upgrade.replaceAll('__KSESSION_SOURCE_TOKEN__', 'sourceBeta2');
  upgrade = upgrade.replaceAll('BETA1', '__KSESSION_SOURCE_UPPER__');
  upgrade = upgrade.replaceAll('BETA2', 'TARGET_BETA3');
  upgrade = upgrade.replaceAll('__KSESSION_SOURCE_UPPER__', 'SOURCE_BETA2');
  upgrade = upgrade.replaceAll('KSESSION_SOURCE_BETA2_SETUP', 'KSESSION_BETA2_SETUP');
  upgrade = upgrade.replaceAll('sourceBeta2SourceCommit', 'beta2SourceCommit');
  upgrade = upgrade.replaceAll('targetBeta3SourceCommit', 'beta3SourceCommit');
  upgrade = upgrade.replaceAll('e9417f036d0cdf736ff84682556a994040f0de0b', 'c8886e6b6d413c2fd73d6716621d07a80b337e58');
  upgrade = replaceOnce(upgrade, 'UPGRADE-TEST-REPORT.json', 'BETA3-UPGRADE-TEST-REPORT.json');
  upgrade = replaceOnce(upgrade, 'tools/windows-portable/package.cjs', 'tools/windows-portable/package-lan.cjs');
  const lanConfigText = JSON.stringify({schema: 1, port: 8083,
    adapterPreference: '12345678-1234-1234-1234-123456789abc'}) + '\n';
  const {validateLanConfig} = require(path.join(repo, 'public-lan-config.js'));
  assert.deepEqual(validateLanConfig(JSON.parse(lanConfigText)), {schema: 1, port: 8083,
    adapterPreference: '12345678-1234-1234-1234-123456789abc'});
  upgrade = replaceOnce(upgrade, '\tinstanceStable := walkHash(instance)',
    '\tlanConfig := []byte(' + JSON.stringify(lanConfigText) + ')\n' +
    '\tif e = os.WriteFile(filepath.Join(instance, "lan-deployment.json"), lanConfig, 0600); e != nil { t.Fatal(e) }\n' +
    '\tinstanceStable := walkHash(instance)');
  upgrade = replaceOnce(upgrade, '\tsequenceDiagnostic := os.Getenv("KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC") == "1"',
    '\tsequenceDiagnostic := os.Getenv("KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC") == "1"\n' +
    '\tdiagnostic := os.Getenv("KSESSION_BETA3_DIAGNOSTIC") == "1"');
  const fixturesLine = '\tfixtures := []struct{ id, dir, marker string }{{"U18", "fault-space", "KSESSION_REJECT_SPACE"}, {"U20", "fault-cancel", "KSESSION_FIXTURE_CANCEL_DURING_COPY"}, {"U21", "fault-copy", "KSESSION_FIXTURE_COPY_FAILURE"}, {"U22", "fault-payload-hash", "KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED"}, {"U23", "fault-post-copy", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE"}}';
  upgrade = replaceOnce(upgrade, fixturesLine, fixturesLine + '\n' +
    '\tif diagnostic { fixtures = []struct{ id, dir, marker string }{{"U22", "fault-payload-hash", "KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED"}, {"U23", "fault-post-copy", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE"}} }');
  const permissionStart = upgrade.indexOf('\t// Permission failure uses the normal payload');
  const permissionEnd = upgrade.indexOf('\n\trunSetup(targetBeta3, true)', permissionStart);
  assert.ok(permissionStart >= 0 && permissionEnd > permissionStart);
  upgrade = upgrade.slice(0, permissionStart) + '\tif !diagnostic {\n' +
    upgrade.slice(permissionStart, permissionEnd) + '\n\t}' + upgrade.slice(permissionEnd);
  upgrade = replaceOnce(upgrade, '\tif len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30" {',
    '\tif diagnostic { _, u22 := checks["U22"]; _, u23 := checks["U23"]; if !u22 || !u23 || len(checks) < 21 { t.Fatal("diagnostic coverage incomplete") } }\n' +
    '\tif !diagnostic && (len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30") {');
  assert.match(upgrade, /KSESSION_BETA2_SETUP/);
  assert.match(upgrade, /K-SESSION-Setup-1\.1\.0-beta\.3\.exe/);
  assert.match(upgrade, /state\["upgradeFrom"\] != "1\.1\.0-beta\.2"/);
  assert.match(upgrade, /package-lan\.cjs/);
  assert.match(upgrade, /lan-deployment\.json/);
  assert.match(upgrade, /lanConfig := \[\]byte\("\{\\"schema\\":1,\\"port\\":8083,\\"adapterPreference\\":\\"12345678-1234-1234-1234-123456789abc\\"\}\\n"\)/);
  assert.doesNotMatch(upgrade, /1\.1\.0-beta\.1|KSESSION_BETA1_SETUP|e9417f036d0cdf736ff84682556a994040f0de0b/);
  fs.writeFileSync(path.join(output, 'upgrade_windows_test.go'), upgrade, {flag: 'wx'});
  process.stdout.write('{"status":"PASS","harness":"beta2-to-beta3"}\n');
}

main(process.argv.slice(2));
