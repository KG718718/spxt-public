'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  ARTIFACT_DIGEST,
  ARTIFACT_ID,
  ARTIFACT_NAME,
  ARTIFACT_URL,
  HistoricalIdentityError,
  REPOSITORY,
  RUN_ID,
  SETUP_NAME,
  SOURCE_COMMIT,
  assertNoSensitiveOutput,
  collectInstalledPolicy,
  createDraft,
  finalizeEvidence,
  locateUniqueSetup,
  normalizeSharedHkcuSnapshot,
  validateApiMetadata,
  validateEvidence
} = require('../../../windows-installer/historical-identity/index.cjs');
const {BINDING_KEY, UNINSTALL_KEY, inventory, sha} = require('../../../windows-installer/upgrade-detection/index.cjs');

const TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function metadata() {
  return {
    run: {id: RUN_ID, attempt: 1, repository: REPOSITORY, headSha: SOURCE_COMMIT, status: 'completed', conclusion: 'success'},
    artifact: {id: ARTIFACT_ID, name: ARTIFACT_NAME, sizeInBytes: 32506311, digest: ARTIFACT_DIGEST,
      expired: false, expiresAt: '2026-10-20T00:00:00.000Z', archiveDownloadUrl: ARTIFACT_URL, workflowRunId: RUN_ID}
  };
}
function expectHistorical(code, fn) {
  assert.throws(fn, error => error instanceof HistoricalIdentityError && error.code === code);
}
function fixture() {
  const scratch = path.join(__dirname, '.tmp');
  fs.mkdirSync(scratch, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(scratch, 'case-'));
  const installRoot = path.join(temporary, 'installed');
  const instance = path.join(temporary, 'instance');
  const program = path.join(installRoot, 'program');
  const uninstall = path.join(installRoot, 'uninstall');
  fs.mkdirSync(path.join(program, 'manifest'), {recursive: true});
  fs.mkdirSync(path.join(program, 'app'));
  fs.mkdirSync(path.join(program, 'runtime'));
  fs.mkdirSync(uninstall);
  fs.mkdirSync(instance);
  fs.writeFileSync(path.join(program, 'K-SESSION.exe'), 'SYNTHETIC LAUNCHER');
  fs.writeFileSync(path.join(program, 'app', 'server.js'), '// synthetic\n');
  fs.writeFileSync(path.join(program, 'app', 'café.txt'), 'SYNTHETIC UNICODE PATH');
  fs.writeFileSync(path.join(program, 'runtime', 'node.exe'), 'SYNTHETIC NODE');
  const runtime = {format: 'k-session-runtime', manifestSchema: 1, version: '1.0.0', platform: 'win32-x64',
    sourceCommit: SOURCE_COMMIT, sourceTree: TREE, businessDataIncluded: false, launcherIncluded: false,
    build: {toolCommit: SOURCE_COMMIT}};
  writeJson(path.join(program, 'manifest', 'runtime-manifest.json'), runtime);
  const runtimeHash = sha(fs.readFileSync(path.join(program, 'manifest', 'runtime-manifest.json')));
  const launcherHash = sha(fs.readFileSync(path.join(program, 'K-SESSION.exe')));
  writeJson(path.join(uninstall, 'build-info.json'), {installerVersion: '1.1.0-beta.1', appVersion: '1.0.0',
    sourceCommit: SOURCE_COMMIT, sourceTree: TREE, runtimeManifestSha256: runtimeHash, launcherSha256: launcherHash,
    buildTimestamp: 'SYNTHETIC'});
  fs.writeFileSync(path.join(uninstall, 'unins000.exe'), 'SYNTHETIC UNINSTALLER');
  const binding = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`[Installation]\r\nSchema=1\r\nInstallRoot=${installRoot}\r\nInstance=${instance}\r\n`, 'utf16le')]);
  fs.writeFileSync(path.join(uninstall, 'instance-binding.ini'), binding);
  const payload = inventory(program);
  writeJson(path.join(uninstall, 'installer-manifest.json'), {schema: 1, sourceCommit: SOURCE_COMMIT, sourceTree: TREE,
    payload, payloadInventorySha256: sha(Buffer.from(JSON.stringify(payload))), version: '1.1.0-beta.1'});
  const snapshot = {registrations: [{view: '64', key: UNINSTALL_KEY, displayName: 'K⁺-SESSION Beta',
    displayVersion: '1.1.0-beta.1', installLocation: installRoot,
    uninstallString: `"${installRoot}\\uninstall\\unins000.exe"`}],
  bindings: [{view: '64', key: BINDING_KEY, installRoot, instance}]};
  return {temporary, installRoot, instance, uninstall, snapshot};
}
function cleanup(f) {
  fs.rmSync(f.temporary, {recursive: true, force: true});
  try { fs.rmdirSync(path.dirname(f.temporary)); } catch {}
}
function cleanupProof() {
  return {uninstallerExitCode: 0, programRootExistsAfterUninstall: false, uninstallRegistrationCountAfterUninstall: 0,
    desktopShortcutExistsAfterUninstall: false, startMenuShortcutExistsAfterUninstall: false,
    bindingRetainedAfterUninstall: true, instanceRetainedAfterUninstall: true,
    bindingRegistrationCountAfterHarnessCleanup: 0, instanceExistsAfterHarnessCleanup: false, temporaryPayloadRemoved: true};
}

test('strict API metadata accepts only the fixed successful, unexpired public artifact', () => {
  assert.equal(validateApiMetadata(metadata(), Date.parse('2026-09-22T00:00:00Z')).artifact.id, ARTIFACT_ID);
  for (const mutate of [
    value => { value.run.repository = 'someone/else'; },
    value => { value.run.headSha = '0'.repeat(40); },
    value => { value.run.conclusion = 'failure'; },
    value => { value.artifact.id++; },
    value => { value.artifact.digest = 'sha256:' + '0'.repeat(64); },
    value => { value.artifact.expired = true; }
  ]) {
    const value = structuredClone(metadata()); mutate(value);
    assert.throws(() => validateApiMetadata(value, Date.parse('2026-09-22T00:00:00Z')), HistoricalIdentityError);
  }
  expectHistorical('ARTIFACT_EXPIRED', () => validateApiMetadata(metadata(), Date.parse('2026-10-21T00:00:00Z')));
  const extra = metadata(); extra.artifact.untrusted = true;
  expectHistorical('ARTIFACT_METADATA_MISMATCH', () => validateApiMetadata(extra, Date.parse('2026-09-22T00:00:00Z')));
});

test('unique Setup selection rejects missing, duplicate, reparse and wrong SHA candidates', async t => {
  await t.test('missing', () => {
    const dir = fs.mkdtempSync(path.join(__dirname, '.tmp-missing-'));
    try { expectHistorical('SETUP_NOT_UNIQUE', () => locateUniqueSetup(dir)); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
  });
  await t.test('duplicate', () => {
    const dir = fs.mkdtempSync(path.join(__dirname, '.tmp-duplicate-'));
    try {
      fs.mkdirSync(path.join(dir, 'a')); fs.mkdirSync(path.join(dir, 'b'));
      fs.writeFileSync(path.join(dir, 'a', SETUP_NAME), 'one'); fs.writeFileSync(path.join(dir, 'b', SETUP_NAME), 'two');
      expectHistorical('SETUP_NOT_UNIQUE', () => locateUniqueSetup(dir));
    } finally { fs.rmSync(dir, {recursive: true, force: true}); }
  });
  await t.test('wrong SHA', () => {
    const dir = fs.mkdtempSync(path.join(__dirname, '.tmp-hash-'));
    try { fs.writeFileSync(path.join(dir, SETUP_NAME), 'not the historical Setup');
      expectHistorical('SETUP_IDENTITY_MISMATCH', () => locateUniqueSetup(dir)); }
    finally { fs.rmSync(dir, {recursive: true, force: true}); }
  });
});

test('installed anchors come only from installed program/uninstall paths, never outer final build-info', () => {
  const f = fixture();
  try {
    const policy = collectInstalledPolicy(f.installRoot);
    assert.match(policy.buildInfoSha256, /^[a-f0-9]{64}$/);
    writeJson(path.join(f.temporary, 'build-info.json'), {source: 'outer final artifact metadata'});
    fs.writeFileSync(path.join(f.uninstall, 'build-info.json'), '{"tampered":true}\n');
    expectHistorical('INSTALLED_BUILD_INFO_INVALID', () => collectInstalledPolicy(f.installRoot));
  } finally { cleanup(f); }
});

test('real snapshot shape must have one registration and binding in the same view', async t => {
  await t.test('missing registry', () => {
    const f = fixture(); try { f.snapshot.registrations = []; expectHistorical('T1_REGISTRATION_COUNT', () => createDraft(metadata(), f.snapshot, f.installRoot)); }
    finally { cleanup(f); }
  });
  await t.test('multiple views', () => {
    const f = fixture(); try { f.snapshot.registrations.push({...f.snapshot.registrations[0], view: '32'});
      expectHistorical('T1_REGISTRATION_COUNT', () => createDraft(metadata(), f.snapshot, f.installRoot)); }
    finally { cleanup(f); }
  });
});

test('shared HKCU aliases collapse only when 32/64 observations are byte-for-byte equivalent', async t => {
  await t.test('identical shared aliases select the nominal 64-bit install view', () => {
    const f = fixture();
    try {
      const raw = {registrations: [structuredClone(f.snapshot.registrations[0]),
        {...structuredClone(f.snapshot.registrations[0]), view: '32'}],
      bindings: [structuredClone(f.snapshot.bindings[0]), {...structuredClone(f.snapshot.bindings[0]), view: '32'}]};
      const normalized = normalizeSharedHkcuSnapshot(raw);
      assert.equal(normalized.registrations.length, 1);
      assert.equal(normalized.bindings.length, 1);
      assert.equal(normalized.registrations[0].view, '64');
      assert.equal(createDraft(metadata(), normalized, f.installRoot).verification.t1SinglePolicy, 'PASS');
    } finally { cleanup(f); }
  });
  await t.test('divergent view values remain a hard rejection', () => {
    const f = fixture();
    try {
      const raw = {registrations: [structuredClone(f.snapshot.registrations[0]),
        {...structuredClone(f.snapshot.registrations[0]), view: '32', displayVersion: '1.1.0-beta.0'}],
      bindings: [structuredClone(f.snapshot.bindings[0]), {...structuredClone(f.snapshot.bindings[0]), view: '32'}]};
      expectHistorical('REGISTRY_VIEW_CONFLICT', () => normalizeSharedHkcuSnapshot(raw));
    } finally { cleanup(f); }
  });
  await t.test('missing registration remains a hard rejection', () => {
    const f = fixture();
    try {
      expectHistorical('REGISTRY_MISSING_REGISTRATION', () =>
        normalizeSharedHkcuSnapshot({registrations: [], bindings: f.snapshot.bindings}));
    } finally { cleanup(f); }
  });
  await t.test('missing binding remains a hard rejection', () => {
    const f = fixture();
    try {
      expectHistorical('REGISTRY_MISSING_BINDING', () =>
        normalizeSharedHkcuSnapshot({registrations: f.snapshot.registrations, bindings: []}));
    } finally { cleanup(f); }
  });
  await t.test('both missing observations remain a hard rejection', () => {
    expectHistorical('REGISTRY_MISSING_BOTH', () => normalizeSharedHkcuSnapshot({registrations: [], bindings: []}));
  });
});

test('draft and finalized evidence use the closed profile schema and contain only hashes and identifiers', () => {
  const f = fixture();
  try {
    const draft = createDraft(metadata(), f.snapshot, f.installRoot);
    assert.equal(draft.profile.id, 'historical-run-35514357007');
    assert.equal(draft.verification.t1SinglePolicy, 'PASS');
    assert.doesNotMatch(JSON.stringify(draft), /case-|[A-Za-z]:[\\/]/);
    const evidence = finalizeEvidence(draft, cleanupProof());
    assert.equal(validateEvidence(evidence), evidence);
    const extra = structuredClone(evidence); extra.profile.policy.wildcard = true;
    assert.throws(() => validateEvidence(extra), HistoricalIdentityError);
    const badCleanup = cleanupProof(); badCleanup.instanceExistsAfterHarnessCleanup = true;
    expectHistorical('CLEANUP_FAILED', () => finalizeEvidence(draft, badCleanup));
  } finally { cleanup(f); }
});

test('reviewed hosted evidence anchors the exact historical policy in the repository', () => {
  const evidenceFile = path.resolve(__dirname,
    '../../../windows-installer/historical-identity/historical-run-35514357007-evidence.json');
  const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  assert.equal(validateEvidence(evidence), evidence);
  assert.deepEqual(evidence.profile.policy, {
    schema: 1,
    appId: 'KSESSION-Beta-Installer-v1',
    uninstallKey: UNINSTALL_KEY,
    bindingKey: BINDING_KEY,
    fromInstallerVersion: '1.1.0-beta.1',
    targetInstallerVersion: '1.1.0-beta.2',
    appVersion: '1.0.0',
    dataContractVersion: 1,
    allowLegacyMissingDataContract: true,
    sourceCommit: SOURCE_COMMIT,
    sourceTree: TREE,
    programManifestSha256: '9160ce5dc49b2439759fa64273fd35bc529ad029a1fe0081f9c9396bedb1fe05',
    programInventorySha256: '8818d2f74a52adaf4f89dd124ad9e2041286fbd44b509198d5c38860f6487f24',
    runtimeManifestSha256: 'ed3ad8843eba580c3c233cd1e0c3a5635c23e47c24c0d95a5f41121f2f0a34f0',
    launcherSha256: '12e421cc3d00f79c4802991b59446d654e0782860eb701265ea523ce1ca00e8b',
    buildInfoSha256: 'd6e45d1f737266230c96e37652a118dea2e2f0c79d73de125a3625525222dd27'
  });
  assert.deepEqual(evidence.verification.cleanup, cleanupProof());
});

test('output redaction rejects local paths, usernames, tokens, credentials and business filenames', () => {
  for (const value of [
    {note: 'E:\\runner\\payload'}, {note: 'C:/Users/runneradmin'}, {note: 'authorization bearer'},
    {note: 'password=value'}, {note: 'data.json'}, {note: 'customer attachment'}
  ]) assert.throws(() => assertNoSensitiveOutput(value), HistoricalIdentityError);
});

test('default-registered Setup workflow isolates historical capture to manual development-branch dispatch', () => {
  const root = path.resolve(__dirname, '../../../..');
  const standalone = path.join(root, '.github/workflows/setup-b4-historical-identity.yml');
  assert.equal(fs.existsSync(standalone), false, 'unregistered standalone workflow must not remain');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/setup-v3.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /\n\s+push:/);
  const start = workflow.indexOf('\n  historical-identity:');
  assert.ok(start > 0, 'historical job missing');
  const historical = workflow.slice(start);
  assert.match(historical, /if: github\.event_name == 'workflow_dispatch' && inputs\.mode == 'full' && github\.repository == 'KG718718\/spxt-public' && github\.ref == 'refs\/heads\/codex\/windows-installer-v1\.1'/);
  assert.match(historical, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read/);
  assert.match(historical, /invoke\.ps1/);
  assert.match(historical, /C:\/KSESSION-B4-T1A-EVIDENCE\/historical-identity-evidence\.json/);
  assert.doesNotMatch(historical, /subst\s+E:|E:\/KSESSION-B4-T1A-EVIDENCE/);
  assert.match(historical, /if: success\(\)[\s\S]*path: \$\{\{ env\.KSESSION_HISTORICAL_EVIDENCE \}\}/);
  assert.doesNotMatch(historical, /(?:\.exe|artifact\.zip|installed|taskWork)\s*$/im);
  assert.equal((historical.match(/actions\/upload-artifact@/g) || []).length, 1, 'historical job uploads exactly one artifact');
});

test('historical static gate is shared, fail-fast, path-safe, and emits only a closed report', () => {
  const root = path.resolve(__dirname, '../../../..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/setup-v3.yml'), 'utf8');
  const helper = path.join(root, 'tools/windows-installer/historical-identity/static-gate.ps1');
  const reportHelper = path.join(root, 'tools/windows-installer/historical-identity/static-gate-report.ps1');
  const qaStart = workflow.indexOf('\n  qa-static:'), historicalStart = workflow.indexOf('\n  historical-identity:');
  assert.ok(qaStart > 0 && historicalStart > qaStart);
  const qa = workflow.slice(qaStart, historicalStart), historical = workflow.slice(historicalStart);
  assert.match(qa, /github\.repository == 'KG718718\/spxt-public'[\s\S]*github\.ref == 'refs\/heads\/codex\/windows-installer-v1\.1'[\s\S]*github\.event_name == 'workflow_dispatch'[\s\S]*inputs\.mode == 'qa-static'/);
  for (const block of [qa, historical]) assert.match(block, /historical-identity\/static-gate\.ps1 -RepositoryRoot \$env:GITHUB_WORKSPACE/);
  for (const forbidden of ['rebuild-beta1.ps1','historical-identity/invoke.ps1','windows-installer/ci.ps1','windows-portable/ci.ps1','K-SESSION-Setup']) assert.doesNotMatch(qa, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(qa, /if: always\(\)[\s\S]*historical-identity-static-[\s\S]*KSESSION_HISTORICAL_STATIC_REPORT/);
  for (const block of [qa, historical]) assert.match(block, /static-gate-report\.ps1[\s\S]*Test-KSessionHistoricalStaticGateReport[\s\S]*ExpectedCommit/);
  for (const block of [qa, historical]) assert.match(block, /\$taskExit -ne 0 -or \$taskEvidence\.status -cne 'PASS'/);

  const makeFixture = (base, invalidFirst) => {
    const put = (relative, text) => { const file = path.join(base, relative); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, text); };
    put('tools/windows-installer/historical-identity/index.cjs', invalidFirst ? '}' : "'use strict';\n");
    put('tools/windows-installer/historical-identity/cli.cjs', "'use strict';\n");
    put('tools/tests/windows-installer/historical-identity/historical-identity.test.cjs', "'use strict';require('node:test')('synthetic pass',()=>{});\n");
    put('tools/tests/windows-installer/upgrade-detection/upgrade-detection.test.cjs', "'use strict';require('node:test')('synthetic pass',()=>{});\n");
    put('tools/tests/windows-installer/upgrade-preflight/preflight.test.cjs', "'use strict';require('node:test')('synthetic pass',()=>{});\n");
    put('tools/tests/windows-installer/contract.cjs', `'use strict';require('node:fs').writeFileSync(${JSON.stringify(path.join(base, 'later-ran'))},'ran');\n`);
  };
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ksession-static-gate-'));
  try {
    for (const [name, invalidFirst, expectedStatus] of [['前序失败 with spaces', true, 'FAIL'], ['全部通过 with spaces', false, 'PASS']]) {
      const fixture = path.join(temp, name), report = path.join(temp, `${name}-报告.json`), sentinel = path.join(fixture, 'later-ran');
      fs.mkdirSync(fixture); makeFixture(fixture, invalidFirst);
      const result = childProcess.spawnSync('pwsh', ['-NoProfile','-NonInteractive','-File',helper,'-RepositoryRoot',fixture,'-ReportPath',report,'-SourceCommit','a'.repeat(40)],
        {encoding:'utf8',windowsHide:true});
      assert.equal(result.status, invalidFirst ? 41 : 0, result.stderr);
      assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
      assert.equal(fs.existsSync(sentinel), !invalidFirst, `${name}: later successful command execution must reflect fail-fast boundary`);
      const evidence = JSON.parse(fs.readFileSync(report, 'utf8'));
      assert.deepEqual(evidence, {schema:1,status:expectedStatus,gate:'HISTORICAL_IDENTITY_STATIC',sourceCommit:'a'.repeat(40)});
      assert.doesNotMatch(fs.readFileSync(report, 'utf8'), /ksession-static-gate|with spaces|前序失败|全部通过|[A-Z]:\\/i);
    }
    const invalidReport=path.join(temp,'invalid-source-report.json');
    const invalidInput=childProcess.spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',helper,'-RepositoryRoot',temp,'-ReportPath',invalidReport,'-SourceCommit','path=E:\\private'],{encoding:'utf8',windowsHide:true});
    assert.equal(invalidInput.status,40);assert.equal(invalidInput.stdout,'');assert.equal(invalidInput.stderr,'');assert.equal(fs.existsSync(invalidReport),false);

    const expected='a'.repeat(40),valid={schema:1,status:'PASS',gate:'HISTORICAL_IDENTITY_STATIC',sourceCommit:expected};
    const cases=[
      [valid,true],[{...valid,status:'FAIL'},true],[{...valid,extra:'forbidden'},false],[{...valid,schema:'1'},false],
      [{...valid,schema:1.5},false],[{...valid,status:'pass'},false],[{...valid,gate:'OTHER'},false],
      [{...valid,sourceCommit:'b'.repeat(40)},false],[{...valid,sourceCommit:7},false],[[valid,valid],false]
    ].map(([report,accept])=>({json:JSON.stringify(report),accept}));
    const encoded=Buffer.from(JSON.stringify(cases)).toString('base64');
    const bootstrap=`. $env:KSESSION_STATIC_REPORT_HELPER;$cases=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadToEnd()))|ConvertFrom-Json;for($i=0;$i-lt$cases.Count;$i++){$case=$cases[$i];$accepted=$true;try{$report=$case.json|ConvertFrom-Json;Test-KSessionHistoricalStaticGateReport -Report $report -ExpectedCommit '${expected}'}catch{$accepted=$false};if($accepted-ne[bool]$case.accept){exit (20+$i)}}`;
    const validation=childProcess.spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',bootstrap],{encoding:'utf8',windowsHide:true,input:encoded,env:{...process.env,KSESSION_STATIC_REPORT_HELPER:reportHelper}});
    assert.equal(validation.status,0,validation.stderr);assert.equal(validation.stdout,'');assert.equal(validation.stderr,'');
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

test('PowerShell registry subkeys use one separator and exactly match the approved beta.1 keys', () => {
  const root = path.resolve(__dirname, '../../../..');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const setup = fs.readFileSync(path.join(root, 'tools/windows-installer/setup.iss'), 'utf8');
  const expected = {
    Product: 'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\KSESSION-Beta-Installer-v1_is1',
    Binding: 'Software\\KSESSION\\Beta\\InstallerBinding'
  };
  for (const [name, value] of Object.entries(expected)) {
    const task = script.match(new RegExp(`^\\$task${name}Subkey='([^']+)'$`, 'm'));
    const setupKey = setup.match(new RegExp(`^\\s*${name}Key = '([^']+)';\\s*$`, 'm'));
    assert.ok(task && setupKey, `${name} key literal missing`);
    assert.equal(task[1], value);
    assert.equal(setupKey[1], value);
    assert.doesNotMatch(task[1], /\\\\/, `${name} key contains a repeated path separator`);
  }
});

test('PowerShell diagnostics expose only a closed non-sensitive phase allowlist', () => {
  const root = path.resolve(__dirname, '../../../..');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const allowlistBlock = script.match(/\$taskAllowedPhases=@\(([\s\S]*?)\)\s*\$taskPhase=/);
  assert.ok(allowlistBlock, 'phase allowlist missing');
  const allowed = [...allowlistBlock[1].matchAll(/'([A-Z0-9_]+)'/g)].map(match => match[1]);
  assert.deepEqual(allowed, ['HOSTED_PREFLIGHT', 'HOSTED_ROOT_INPUT', 'HOSTED_ROOT_PRESENT', 'HOSTED_ROOT_NOT_FIXED',
    'HOSTED_ROOT_PLATFORM_VOLUME', 'HOSTED_ROOT_ANCESTOR', 'HOSTED_ROOT_REALPATH', 'HOSTED_ROOT_INSPECTION',
    'HOSTED_ROOT_USAGE', 'HOSTED_ROOT_OTHER', 'API_METADATA', 'ARTIFACT_DOWNLOAD', 'ARCHIVE_HASH', 'EXTRACT',
    'SETUP_IDENTITY', 'INSTALL', 'INSTALL_FOOTPRINT_MANIFEST', 'INSTALL_FOOTPRINT_BUILD_INFO',
    'INSTALL_FOOTPRINT_BINDING', 'INSTALL_FOOTPRINT_RUNTIME', 'INSTALL_FOOTPRINT_LAUNCHER',
    'INSTALL_FOOTPRINT_INVENTORY', 'INSTALL_FOOTPRINT_RUNTIME_HASH', 'INSTALL_FOOTPRINT_LAUNCHER_HASH',
    'INSTALL_FOOTPRINT_PAYLOAD_COUNT', 'INSTALL_FOOTPRINT_PAYLOAD_PATH_ORDER',
    'INSTALL_FOOTPRINT_PAYLOAD_PATH_SEPARATOR', 'INSTALL_FOOTPRINT_PAYLOAD_PATH_CASE',
    'INSTALL_FOOTPRINT_PAYLOAD_PATH_UNICODE', 'INSTALL_FOOTPRINT_PAYLOAD_PATH_SET',
    'INSTALL_FOOTPRINT_PAYLOAD_BYTES', 'INSTALL_FOOTPRINT_PAYLOAD_HASH', 'INSTALL_FOOTPRINT_PAYLOAD_SCHEMA', 'INSTALL_FOOTPRINT_USAGE',
    'INSTALL_FOOTPRINT_OTHER', 'INSTALL_LOG_INPUT',
    'INSTALL_LOG_FAILURE', 'INSTALL_LOG_NO_PREINSTALL', 'INSTALL_LOG_NO_POSTINSTALL', 'INSTALL_LOG_USAGE',
    'INSTALL_LOG_OTHER', 'REGISTRY_HKLM', 'REGISTRY_HKCU_READ', 'REGISTRY_SNAPSHOT_WRITE',
    'REGISTRY_NORMALIZE_INPUT', 'REGISTRY_NORMALIZE_MISSING_REGISTRATION',
    'REGISTRY_NORMALIZE_MISSING_BINDING', 'REGISTRY_NORMALIZE_MISSING_BOTH', 'REGISTRY_NORMALIZE_CONFLICT',
    'REGISTRY_NORMALIZE_USAGE', 'REGISTRY_NORMALIZE_OUTPUT', 'REGISTRY_NORMALIZE_OTHER', 'REGISTRY_RESULT_READ',
    'REGISTRY_UNIQUENESS', 'T1_PATH_REPARSE_INSTALL_ROOT_SELF', 'T1_PATH_REPARSE_INSTALL_ROOT_ANCESTOR',
    'T1_PATH_REPARSE_INSTANCE_SELF', 'T1_PATH_REPARSE_INSTANCE_ANCESTOR', 'T1_PATH_REPARSE_UNINSTALL_SELF',
    'T1_PATH_REPARSE_UNINSTALL_ANCESTOR', 'T1_PATH_REPARSE_PLATFORM_VOLUME',
    'T1_PATH_REPARSE_INSTALL_ROOT_REALPATH', 'T1_PATH_REPARSE_INSTANCE_REALPATH',
    'T1_PATH_REPARSE_UNINSTALL_REALPATH', 'T1_PATH_REPARSE_INSPECTION', 'T1_PATH_REPARSE_USAGE',
    'T1_PATH_REPARSE_OTHER', 'COLLECT', 'CLEANUP_UNINSTALLER_EXIT',
    'CLEANUP_UNINSTALLER_SELF_CLEANUP', 'CLEANUP_UNINSTALLER_SELF_CLEANUP_TIMEOUT', 'CLEANUP_PROGRAM_ROOT',
    'CLEANUP_UNINSTALL_REGISTRATION', 'CLEANUP_DESKTOP_SHORTCUT', 'CLEANUP_START_MENU_SHORTCUT',
    'CLEANUP_BINDING_RETAINED', 'CLEANUP_INSTANCE_RETAINED', 'CLEANUP_BINDING_REMOVE',
    'CLEANUP_INSTANCE_REMOVE', 'CLEANUP_PAYLOAD_REMOVE', 'CLEANUP_FINAL_STATE', 'CLEANUP_EVIDENCE_WRITE',
    'CLEANUP_INSPECTION', 'CLEANUP_READ_PROGRAM_ROOT', 'CLEANUP_READ_UNINSTALL_REGISTRATION',
    'CLEANUP_READ_DESKTOP_SHORTCUT', 'CLEANUP_READ_START_MENU_SHORTCUT', 'CLEANUP_READ_BINDING_RETAINED',
    'CLEANUP_READ_INSTANCE_RETAINED', 'CLEANUP_READ_BINDING_AFTER_HARNESS',
    'CLEANUP_READ_INSTANCE_AFTER_HARNESS', 'CLEANUP_READ_PAYLOAD_AFTER_HARNESS', 'CLEANUP_OTHER', 'FINALIZE']);
  assert.equal(new Set(allowed).size, allowed.length, 'phase allowlist contains duplicates');
  const assigned = [...script.matchAll(/Set-TaskPhase '([A-Z0-9_]+)'/g)].map(match => match[1]);
  assert.deepEqual([...new Set(assigned)].sort(), [...allowed].sort(), 'every and only allowlisted phases must be assigned');
  const catchBlock = script.match(/} catch \{([\s\S]*?)\n} finally \{/);
  assert.ok(catchBlock, 'closed catch block missing');
  assert.match(catchBlock[1], /\$taskAllowedPhases -notcontains \$taskPhase/);
  assert.match(catchBlock[1], /WriteLine\('HISTORICAL_IDENTITY_BLOCKED_'\+\$taskPhase\)/);
  assert.doesNotMatch(catchBlock[1], /\$_|Exception|\.Message|https?:|taskWork|taskToken|RepositoryRoot|OutputFile|registry/i);
  for (const phase of allowed) {
    const output = `HISTORICAL_IDENTITY_BLOCKED_${phase}`;
    assert.match(output, /^HISTORICAL_IDENTITY_BLOCKED_[A-Z0-9_]+$/);
    assert.doesNotMatch(output, /[A-Za-z]:[\\/]|Users|token|password|cookie|authorization|https?:|\\Software\\/i);
  }
});

test('cleanup diagnostics map every residual and owned removal boundary to a fixed silent phase', () => {
  const root = path.resolve(__dirname, '../../../..');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const block = script.match(/Set-TaskPhase 'CLEANUP_OTHER'([\s\S]*?)Set-TaskPhase 'FINALIZE'/);
  assert.ok(block, 'cleanup diagnostic block missing');
  const cleanup = block[0];
  assert.match(cleanup, /Set-TaskPhase 'CLEANUP_UNINSTALLER_EXIT'[\s\S]*\$taskUninstallExit=\$LASTEXITCODE[\s\S]*if\(\$taskUninstallExit -ne 0\)/);
  assert.match(cleanup, /Set-TaskPhase 'CLEANUP_UNINSTALLER_SELF_CLEANUP'[\s\S]*Wait-UninstallerSelfCleanup \$uninstaller[\s\S]*Set-TaskPhase 'CLEANUP_UNINSTALLER_SELF_CLEANUP_TIMEOUT'/);
  assert.match(script, /\$taskUninstallSelfCleanupTimeoutMilliseconds=25000/);
  assert.match(script, /function Wait-UninstallerSelfCleanup[\s\S]*Join-Path \$taskInstall 'uninstall\\unins000\.exe'[\s\S]*Start-Sleep -Milliseconds 100/);
  assert.doesNotMatch(cleanup, /Get-Process|Win32_Process|Wait-Process|Stop-Process|taskkill/i,
    'uninstaller completion must use only its exact terminal file, never unrelated processes');
  const inspectionReads = [
    ['CLEANUP_READ_PROGRAM_ROOT', '\\$programAfter=Test-Path -LiteralPath \\$taskInstall'],
    ['CLEANUP_READ_UNINSTALL_REGISTRATION', '\\$uninstallCount=Count-Subkey \\$taskProductSubkey'],
    ['CLEANUP_READ_DESKTOP_SHORTCUT', '\\$desktopAfter=Test-Path -LiteralPath \\$taskDesktopLink'],
    ['CLEANUP_READ_START_MENU_SHORTCUT', '\\$programsAfter=Test-Path -LiteralPath \\$taskProgramsLink'],
    ['CLEANUP_READ_BINDING_RETAINED', '\\$bindingAfter=Count-Subkey \\$taskBindingSubkey'],
    ['CLEANUP_READ_INSTANCE_RETAINED', '\\$instanceAfter=Test-Path -LiteralPath \\$taskInstance'],
    ['CLEANUP_READ_BINDING_AFTER_HARNESS', '\\$bindingAfterHarness=Count-Subkey \\$taskBindingSubkey'],
    ['CLEANUP_READ_INSTANCE_AFTER_HARNESS', '\\$instanceAfterHarness=Test-Path -LiteralPath \\$taskInstance'],
    ['CLEANUP_READ_PAYLOAD_AFTER_HARNESS', '\\$payloadRemainingCount=Get-RemainingPayloadCount @\\([\\s\\S]*\\$taskSnapshot\\)']
  ];
  for (const [phase, read] of inspectionReads) {
    assert.match(cleanup, new RegExp(`Set-TaskPhase '${phase}'\\s+${read}`), `${phase} read mapping missing`);
  }
  assert.match(script, /function Get-RemainingPayloadCount\(\[string\[\]\]\$Paths\)[\s\S]*return @\(\$Paths \| Where-Object \{Test-Path -LiteralPath \$_\}\)\.Count/);
  assert.match(cleanup, /\$payloadRemoved=\$payloadRemainingCount -eq 0\s+if\(!\$payloadRemoved\)\{Set-TaskPhase 'CLEANUP_PAYLOAD_REMOVE';throw 'PAYLOAD_REMOVE_FAILED'\}/);
  const residualMap = [
    ['\\$programAfter', 'CLEANUP_PROGRAM_ROOT'], ['\\$uninstallCount -ne 0', 'CLEANUP_UNINSTALL_REGISTRATION'],
    ['\\$desktopAfter', 'CLEANUP_DESKTOP_SHORTCUT'], ['\\$programsAfter', 'CLEANUP_START_MENU_SHORTCUT'],
    ['\\$bindingAfter -ne 1', 'CLEANUP_BINDING_RETAINED'], ['!\\$instanceAfter', 'CLEANUP_INSTANCE_RETAINED']
  ];
  for (const [condition, phase] of residualMap) {
    assert.match(cleanup, new RegExp(`if\\(${condition}\\)\\{Set-TaskPhase '${phase}'`));
  }
  assert.match(cleanup, /Set-TaskPhase 'CLEANUP_BINDING_REMOVE'[\s\S]*Remove-OwnedBinding[\s\S]*\$bindingAfterHarness=Count-Subkey[\s\S]*Set-TaskPhase 'CLEANUP_BINDING_REMOVE'/);
  assert.match(cleanup, /Set-TaskPhase 'CLEANUP_INSTANCE_REMOVE'[\s\S]*Assert-TaskPath \$taskInstance[\s\S]*Remove-Item -LiteralPath \$taskInstance[\s\S]*\$instanceAfterHarness=Test-Path[\s\S]*Set-TaskPhase 'CLEANUP_INSTANCE_REMOVE'/);
  assert.match(cleanup, /Set-TaskPhase 'CLEANUP_PAYLOAD_REMOVE'[\s\S]*foreach\(\$payloadPath in @\([\s\S]*Remove-Item -LiteralPath \$payloadPath[\s\S]*if\(!\$payloadRemoved\)\{Set-TaskPhase 'CLEANUP_PAYLOAD_REMOVE'/);
  assert.match(cleanup, /Set-TaskPhase 'CLEANUP_FINAL_STATE'[\s\S]*CLEANUP_FINAL_STATE_INVALID[\s\S]*Set-TaskPhase 'CLEANUP_EVIDENCE_WRITE'[\s\S]*Write-PrivateJson \$taskCleanup \$cleanup/);
  assert.doesNotMatch(cleanup, /Remove-Item\s+-Path|Remove-Item[^\r\n]*[*?]/, 'cleanup must use only exact literal paths');
});

test('post-install footprint and private log checks map only fixed silent categories', () => {
  const root = path.resolve(__dirname, '../../../..');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const cli = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/cli.cjs'), 'utf8');
  const block = script.match(/Set-TaskPhase 'INSTALL_FOOTPRINT_OTHER'([\s\S]*?)Set-TaskPhase 'REGISTRY_HKLM'/);
  assert.ok(block, 'post-install diagnostic block missing');
  assert.match(block[0], /Invoke-InstalledFootprint/);
  assert.match(block[0], /Set-TaskPhase 'INSTALL_LOG_OTHER'[\s\S]*Invoke-InstallLogCheck/);
  const footprintMap = [...script.matchAll(/(3[0-9]|4[0-7]) \{Set-TaskPhase '(INSTALL_FOOTPRINT_[A-Z_]+)'\}/g)]
    .map(match => [Number(match[1]), match[2]]);
  assert.deepEqual(footprintMap, [[30, 'INSTALL_FOOTPRINT_MANIFEST'], [31, 'INSTALL_FOOTPRINT_BUILD_INFO'],
    [32, 'INSTALL_FOOTPRINT_BINDING'], [33, 'INSTALL_FOOTPRINT_RUNTIME'], [34, 'INSTALL_FOOTPRINT_LAUNCHER'],
    [35, 'INSTALL_FOOTPRINT_INVENTORY'], [36, 'INSTALL_FOOTPRINT_RUNTIME_HASH'],
    [37, 'INSTALL_FOOTPRINT_LAUNCHER_HASH'], [38, 'INSTALL_FOOTPRINT_PAYLOAD_COUNT'],
    [39, 'INSTALL_FOOTPRINT_PAYLOAD_PATH_ORDER'], [40, 'INSTALL_FOOTPRINT_PAYLOAD_PATH_SEPARATOR'],
    [41, 'INSTALL_FOOTPRINT_PAYLOAD_PATH_CASE'], [42, 'INSTALL_FOOTPRINT_PAYLOAD_PATH_UNICODE'],
    [43, 'INSTALL_FOOTPRINT_PAYLOAD_PATH_SET'], [44, 'INSTALL_FOOTPRINT_PAYLOAD_BYTES'],
    [45, 'INSTALL_FOOTPRINT_PAYLOAD_HASH'], [46, 'INSTALL_FOOTPRINT_PAYLOAD_SCHEMA'],
    [47, 'INSTALL_FOOTPRINT_USAGE']]);
  const logMap = [...script.matchAll(/(40|41|42|43|44) \{Set-TaskPhase '(INSTALL_LOG_[A-Z_]+)'\}/g)]
    .map(match => [Number(match[1]), match[2]]);
  assert.deepEqual(logMap, [[40, 'INSTALL_LOG_INPUT'], [41, 'INSTALL_LOG_FAILURE'],
    [42, 'INSTALL_LOG_NO_PREINSTALL'], [43, 'INSTALL_LOG_NO_POSTINSTALL'], [44, 'INSTALL_LOG_USAGE']]);
  assert.match(script, /default \{Set-TaskPhase 'INSTALL_FOOTPRINT_OTHER'\}/);
  assert.match(script, /default \{Set-TaskPhase 'INSTALL_LOG_OTHER'\}/);
  assert.match(cli, /installedFootprintCommand\(\); \} catch \{ process\.exitCode = FOOTPRINT_EXIT\.OTHER; \}/);
  assert.match(cli, /installLogCommand\(\); \} catch \{ process\.exitCode = INSTALL_LOG_EXIT\.OTHER; \}/);
});

test('Setup launcher waits for descendants with constrained arguments and rejects a nonzero exit', () => {
  const root = path.resolve(__dirname, '../../../..');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  assert.doesNotMatch(script, /&\s+\$setup(?:\s|$)/, 'direct GUI invocation can return before Setup completes');
  assert.match(script, /function Assert-SetupLaunchPath[\s\S]*\^\[A-Za-z\]:\\\\\[A-Za-z0-9\._\\\\-\]\+\$/);
  assert.match(script, /\$arguments=@\('\/VERYSILENT','\/SUPPRESSMSGBOXES','\/NORESTART','\/SP-'/);
  assert.match(script, /Start-Process -FilePath \$trustedFile -ArgumentList \$arguments -Wait -PassThru -WindowStyle Hidden/);
  assert.match(script, /-RedirectStandardOutput \$trustedStdout -RedirectStandardError \$trustedStderr/);
  assert.doesNotMatch(script, /(?:Kill|Stop-Process|WaitForExit)/);
  assert.match(script, /\$setupExit=Invoke-SetupTreeAndWait[\s\S]*if\(\$setupExit -ne 0\)\{throw 'SETUP_FAILED'\}/);
  const processTest = path.join(root, 'tools/tests/windows-installer/historical-identity/setup-process.test.ps1');
  const unsafeRepositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repository with space 中文-'));
  const copiedInvoke = path.join(unsafeRepositoryRoot, 'tools/windows-installer/historical-identity/invoke.ps1');
  let result;
  try {
    fs.mkdirSync(path.dirname(copiedInvoke), {recursive: true});
    fs.copyFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), copiedInvoke);
    result = childProcess.spawnSync('pwsh',
      ['-NoProfile', '-File', processTest, '-RepositoryRoot', unsafeRepositoryRoot], {encoding: 'utf8'});
  } finally {
    fs.rmSync(unsafeRepositoryRoot, {recursive: true, force: true});
  }
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SETUP PROCESS TEST PASS/);
  assert.equal(result.stderr, '');
  assert.equal(fs.existsSync(unsafeRepositoryRoot), false, 'unsafe repository fixture must be removed');
});

test('registry diagnostics assign every sensitive operation to a fixed closed subphase', () => {
  const root = path.resolve(__dirname, '../../../..');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const registry = script.match(/Set-TaskPhase 'REGISTRY_HKLM'([\s\S]*?)Set-TaskPhase 'COLLECT'/);
  assert.ok(registry, 'registry diagnostic block missing');
  const expected = [
    ['REGISTRY_HKLM', 'Count-MachineSubkey'],
    ['REGISTRY_HKCU_READ', 'Read-Snapshot'],
    ['REGISTRY_SNAPSHOT_WRITE', 'Write-PrivateJson $taskRawSnapshot'],
    ['REGISTRY_NORMALIZE_OTHER', 'Invoke-Normalize'],
    ['REGISTRY_RESULT_READ', 'Get-Content -LiteralPath $taskSnapshot'],
    ['REGISTRY_UNIQUENESS', '$snapshot.registrations.Count']
  ];
  for (let index = 0; index < expected.length; index += 1) {
    const [phase, operation] = expected[index];
    const start = registry[0].indexOf(`Set-TaskPhase '${phase}'`);
    const end = index + 1 < expected.length
      ? registry[0].indexOf(`Set-TaskPhase '${expected[index + 1][0]}'`)
      : registry[0].indexOf("Set-TaskPhase 'COLLECT'");
    assert.ok(start >= 0 && end > start, `${phase} boundary missing`);
    assert.match(registry[0].slice(start, end), new RegExp(operation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const exitMap = [...script.matchAll(/(20|21|22|23|24|25|26) \{Set-TaskPhase '([A-Z_]+)'\}/g)]
    .map(match => [Number(match[1]), match[2]]);
  assert.deepEqual(exitMap, [[20, 'REGISTRY_NORMALIZE_INPUT'], [21, 'REGISTRY_NORMALIZE_MISSING_REGISTRATION'],
    [22, 'REGISTRY_NORMALIZE_MISSING_BINDING'], [23, 'REGISTRY_NORMALIZE_MISSING_BOTH'],
    [24, 'REGISTRY_NORMALIZE_CONFLICT'], [25, 'REGISTRY_NORMALIZE_USAGE'],
    [26, 'REGISTRY_NORMALIZE_OUTPUT']]);
  assert.match(script, /default \{Set-TaskPhase 'REGISTRY_NORMALIZE_OTHER'\}/);
});

test('normalize CLI maps failures to fixed silent exit categories', async t => {
  const cli = path.resolve(__dirname, '../../../windows-installer/historical-identity/cli.cjs');
  const cliSource = fs.readFileSync(cli, 'utf8');
  assert.match(cliSource, /catch \{ process\.exitCode = NORMALIZE_EXIT\.OTHER; \}/,
    'unexpected normalize failures must map silently to OTHER');
  const scratch = path.join(__dirname, '.tmp');
  fs.mkdirSync(scratch, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(scratch, 'normalize-cli-'));
  function invoke(args) {
    const result = childProcess.spawnSync(process.execPath, [cli, 'normalize-snapshot', ...args], {encoding: 'utf8'});
    assert.equal(result.signal, null);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
    return result.status;
  }
  try {
    await t.test('success', () => {
      const input = path.join(temporary, 'success-input.json');
      const output = path.join(temporary, 'success-output.json');
      writeJson(input, {registrations: [{view: '64', key: 'r', displayName: 'd', displayVersion: 'v',
        installLocation: 'i', uninstallString: 'u'}], bindings: [{view: '64', key: 'b', installRoot: 'i', instance: 'x'}]});
      assert.equal(invoke(['--input', input, '--output', output]), 0);
      assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).registrations[0].view, '64');
    });
    await t.test('invalid JSON or schema', () => {
      const malformed = path.join(temporary, 'malformed.json');
      fs.writeFileSync(malformed, '{');
      assert.equal(invoke(['--input', malformed, '--output', path.join(temporary, 'malformed-output.json')]), 20);
      const schema = path.join(temporary, 'schema.json');
      writeJson(schema, {registrations: [], bindings: [], extra: true});
      assert.equal(invoke(['--input', schema, '--output', path.join(temporary, 'schema-output.json')]), 20);
    });
    await t.test('missing registration', () => {
      const input = path.join(temporary, 'missing-registration.json');
      writeJson(input, {registrations: [],
        bindings: [{view: '64', key: 'b', installRoot: 'i', instance: 'x'}]});
      assert.equal(invoke(['--input', input, '--output', path.join(temporary, 'missing-registration-output.json')]), 21);
    });
    await t.test('missing binding', () => {
      const input = path.join(temporary, 'missing-binding.json');
      writeJson(input, {registrations: [{view: '64', key: 'r', displayName: 'd', displayVersion: 'v',
        installLocation: 'i', uninstallString: 'u'}], bindings: []});
      assert.equal(invoke(['--input', input, '--output', path.join(temporary, 'missing-binding-output.json')]), 22);
    });
    await t.test('both record types missing', () => {
      const input = path.join(temporary, 'missing-both.json');
      writeJson(input, {registrations: [], bindings: []});
      assert.equal(invoke(['--input', input, '--output', path.join(temporary, 'missing-both-output.json')]), 23);
    });
    await t.test('view or field conflict', () => {
      const input = path.join(temporary, 'conflict.json');
      writeJson(input, {registrations: [{view: '64', key: 'r', displayName: 'd', displayVersion: 'v',
        installLocation: 'i', uninstallString: 'u'}, {view: '32', key: 'r', displayName: 'd', displayVersion: 'other',
        installLocation: 'i', uninstallString: 'u'}], bindings: [{view: '64', key: 'b', installRoot: 'i', instance: 'x'}]});
      assert.equal(invoke(['--input', input, '--output', path.join(temporary, 'conflict-output.json')]), 24);
    });
    await t.test('usage', () => assert.equal(invoke([]), 25));
    await t.test('output exists or cannot be written', () => {
      const input = path.join(temporary, 'output-input.json');
      const output = path.join(temporary, 'existing-output.json');
      writeJson(input, {registrations: [{view: '64', key: 'r', displayName: 'd', displayVersion: 'v',
        installLocation: 'i', uninstallString: 'u'}], bindings: [{view: '64', key: 'b', installRoot: 'i', instance: 'x'}]});
      fs.writeFileSync(output, 'owned');
      assert.equal(invoke(['--input', input, '--output', output]), 26);
      assert.equal(fs.readFileSync(output, 'utf8'), 'owned');
    });
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
    try { fs.rmdirSync(scratch); } catch {}
  }
});

test('installed-footprint CLI validates fixed files and hashes without output', async t => {
  const cli = path.resolve(__dirname, '../../../windows-installer/historical-identity/cli.cjs');
  function invoke(args) {
    const result = childProcess.spawnSync(process.execPath, [cli, 'installed-footprint', ...args], {encoding: 'utf8'});
    assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    return result.status;
  }
  async function scenario(name, expected, mutate) {
    await t.test(name, () => {
      const f = fixture();
      try {
        if (mutate) mutate(f);
        assert.equal(invoke(['--install-root', f.installRoot, '--instance', f.instance]), expected);
      } finally { cleanup(f); }
    });
  }
  function mutateJson(file, mutate) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    mutate(value);
    writeJson(file, value);
  }
  function mutateManifest(f, mutate) {
    const file = path.join(f.uninstall, 'installer-manifest.json');
    mutateJson(file, value => {
      mutate(value.payload);
      value.payloadInventorySha256 = sha(Buffer.from(JSON.stringify(value.payload)));
    });
  }
  await scenario('success', 0);
  await scenario('installer manifest missing', 30, f => fs.rmSync(path.join(f.uninstall, 'installer-manifest.json')));
  await scenario('build info missing', 31, f => fs.rmSync(path.join(f.uninstall, 'build-info.json')));
  await scenario('instance binding missing', 32, f => fs.rmSync(path.join(f.uninstall, 'instance-binding.ini')));
  await scenario('runtime manifest missing', 33,
    f => fs.rmSync(path.join(f.installRoot, 'program', 'manifest', 'runtime-manifest.json')));
  await scenario('launcher missing', 34, f => fs.rmSync(path.join(f.installRoot, 'program', 'K-SESSION.exe')));
  await scenario('program inventory reparse entry', 35, f => fs.symlinkSync(
    path.join(f.installRoot, 'program', 'app'), path.join(f.installRoot, 'program', 'linked-app'), 'junction'));
  await scenario('runtime manifest hash conflict', 36,
    f => mutateJson(path.join(f.uninstall, 'build-info.json'), value => { value.runtimeManifestSha256 = '0'.repeat(64); }));
  await scenario('launcher hash conflict', 37,
    f => mutateJson(path.join(f.uninstall, 'build-info.json'), value => { value.launcherSha256 = '0'.repeat(64); }));
  await scenario('payload count conflict', 38,
    f => fs.writeFileSync(path.join(f.installRoot, 'program', 'extra.synthetic'), 'extra'));
  await scenario('payload path order conflict', 39,
    f => mutateManifest(f, payload => { payload.reverse(); }));
  await scenario('payload path separator conflict', 40,
    f => mutateManifest(f, payload => {
      const item = payload.find(value => value.path.includes('/')); item.path = item.path.replaceAll('/', '\\');
    }));
  await scenario('payload path case conflict', 41,
    f => mutateManifest(f, payload => { payload[0].path = payload[0].path.toUpperCase(); }));
  await scenario('payload path Unicode normalization conflict', 42,
    f => mutateManifest(f, payload => {
      const item = payload.find(value => value.path.includes('café')); item.path = item.path.normalize('NFD');
    }));
  await scenario('payload path set conflict', 43,
    f => mutateManifest(f, payload => { payload[0].path = 'synthetic-path'; }));
  await scenario('payload bytes conflict', 44,
    f => mutateManifest(f, payload => { payload[0].bytes += 1; }));
  await scenario('payload hash conflict', 45,
    f => mutateManifest(f, payload => { payload[0].sha256 = '0'.repeat(64); }));
  await scenario('payload schema conflict', 46,
    f => mutateManifest(f, payload => { payload[0].extra = true; }));
  await t.test('usage', () => assert.equal(invoke([]), 47));
});

test('install-log CLI checks only fixed marker presence and emits no log content', async t => {
  const cli = path.resolve(__dirname, '../../../windows-installer/historical-identity/cli.cjs');
  const temporary = fs.mkdtempSync(path.join(__dirname, '.tmp-log-'));
  function invoke(args) {
    const result = childProcess.spawnSync(process.execPath, [cli, 'install-log', ...args], {encoding: 'utf8'});
    assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    return result.status;
  }
  function log(name, text) { const file = path.join(temporary, name); fs.writeFileSync(file, text); return file; }
  try {
    await t.test('completed post-install', () => assert.equal(invoke(['--input',
      log('complete.log', 'KSESSION_PREINSTALL_READY\nKSESSION_INSTALLED_PAYLOAD_VERIFIED\n')]), 0));
    await t.test('log input unavailable', () => assert.equal(invoke(['--input', path.join(temporary, 'missing.log')]), 40));
    await t.test('approved failure marker', () => assert.equal(invoke(['--input',
      log('failure.log', 'KSESSION_PREINSTALL_READY\nKSESSION_REJECT_WRITE\n')]), 41));
    await t.test('preinstall marker missing', () => assert.equal(invoke(['--input',
      log('no-preinstall.log', 'KSESSION_INSTALLED_PAYLOAD_VERIFIED\n')]), 42));
    await t.test('postinstall marker missing', () => assert.equal(invoke(['--input',
      log('no-postinstall.log', 'KSESSION_PREINSTALL_READY\n')]), 43));
    await t.test('usage', () => assert.equal(invoke([]), 44));
  } finally { fs.rmSync(temporary, {recursive: true, force: true}); }
});

test('path-safety CLI classifies only path role and reparse boundary without output', async t => {
  const root = path.resolve(__dirname, '../../../..');
  const cli = path.resolve(__dirname, '../../../windows-installer/historical-identity/cli.cjs');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const scratch = fs.mkdtempSync(path.join(__dirname, '.tmp-path-safety-'));
  function invoke(installRoot, instance) {
    const result = childProcess.spawnSync(process.execPath,
      [cli, 'path-safety', '--install-root', installRoot, '--instance', instance], {encoding: 'utf8'});
    assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    return result.status;
  }
  function directories(name) {
    const base = path.join(scratch, name); const installRoot = path.join(base, 'installed');
    const instance = path.join(base, 'instance');
    fs.mkdirSync(path.join(installRoot, 'uninstall'), {recursive: true}); fs.mkdirSync(instance, {recursive: true});
    return {base, installRoot, instance};
  }
  try {
    await t.test('ordinary directories pass', () => {
      const f = directories('ordinary'); assert.equal(invoke(f.installRoot, f.instance), 0);
    });
    await t.test('install root self reparse', () => {
      const f = directories('root-self'); const link = path.join(f.base, 'installed-link');
      fs.symlinkSync(f.installRoot, link, 'junction'); assert.equal(invoke(link, f.instance), 50);
    });
    await t.test('install root ancestor reparse', () => {
      const target = directories('root-ancestor-target'); const base = path.join(scratch, 'root-ancestor');
      fs.mkdirSync(base); const link = path.join(base, 'parent-link'); fs.symlinkSync(target.base, link, 'junction');
      assert.equal(invoke(path.join(link, 'installed'), path.join(link, 'instance')), 51);
    });
    await t.test('instance self reparse', () => {
      const f = directories('instance-self'); const link = path.join(f.base, 'instance-link');
      fs.symlinkSync(f.instance, link, 'junction'); assert.equal(invoke(f.installRoot, link), 52);
    });
    await t.test('instance ancestor reparse', () => {
      const f = directories('instance-ancestor-root'); const target = path.join(scratch, 'instance-ancestor-target');
      fs.mkdirSync(path.join(target, 'instance'), {recursive: true});
      const link = path.join(scratch, 'instance-parent-link'); fs.symlinkSync(target, link, 'junction');
      assert.equal(invoke(f.installRoot, path.join(link, 'instance')), 53);
    });
    await t.test('uninstall self reparse', () => {
      const f = directories('uninstall-self'); const target = path.join(f.base, 'uninstall-target');
      fs.mkdirSync(target); fs.rmSync(path.join(f.installRoot, 'uninstall'), {recursive: true});
      fs.symlinkSync(target, path.join(f.installRoot, 'uninstall'), 'junction');
      assert.equal(invoke(f.installRoot, f.instance), 54);
    });
    await t.test('usage', () => {
      const result = childProcess.spawnSync(process.execPath, [cli, 'path-safety'], {encoding: 'utf8'});
      assert.equal(result.status, 61); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    });
    const exitMap = [...script.matchAll(/(5[0-9]|6[01]) \{Set-TaskPhase '(T1_PATH_REPARSE_[A-Z_]+)'\}/g)]
      .map(match => [Number(match[1]), match[2]]);
    assert.deepEqual(exitMap, [[50, 'T1_PATH_REPARSE_INSTALL_ROOT_SELF'], [51, 'T1_PATH_REPARSE_INSTALL_ROOT_ANCESTOR'],
      [52, 'T1_PATH_REPARSE_INSTANCE_SELF'], [53, 'T1_PATH_REPARSE_INSTANCE_ANCESTOR'],
      [54, 'T1_PATH_REPARSE_UNINSTALL_SELF'], [55, 'T1_PATH_REPARSE_UNINSTALL_ANCESTOR'],
      [56, 'T1_PATH_REPARSE_PLATFORM_VOLUME'], [57, 'T1_PATH_REPARSE_INSTALL_ROOT_REALPATH'],
      [58, 'T1_PATH_REPARSE_INSTANCE_REALPATH'], [59, 'T1_PATH_REPARSE_UNINSTALL_REALPATH'],
      [60, 'T1_PATH_REPARSE_INSPECTION'], [61, 'T1_PATH_REPARSE_USAGE']]);
    assert.match(script, /default \{Set-TaskPhase 'T1_PATH_REPARSE_OTHER'\}/);
    assert.match(script, /Set-TaskPhase 'T1_PATH_REPARSE_OTHER'[\s\S]*Invoke-PathSafetyCheck[\s\S]*Set-TaskPhase 'COLLECT'/);
  } finally { fs.rmSync(scratch, {recursive: true, force: true}); }
});

test('host-root preflight accepts a fixed local root and rejects mapped or unsafe roots without output', async t => {
  const root = path.resolve(__dirname, '../../../..');
  const cli = path.resolve(__dirname, '../../../windows-installer/historical-identity/cli.cjs');
  const script = fs.readFileSync(path.join(root, 'tools/windows-installer/historical-identity/invoke.ps1'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/setup-v3.yml'), 'utf8');
  function invoke(candidate) {
    const result = childProcess.spawnSync(process.execPath, [cli, 'host-root', '--candidate', candidate], {encoding: 'utf8'});
    assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    return result.status;
  }
  const ordinary = `C:\\KSESSION-B4-T1A-ROOT-${process.pid}-${Date.now()}`;
  assert.equal(fs.existsSync(ordinary), false);
  assert.equal(invoke(ordinary), 0, 'ordinary fixed local volume must pass');
  let present = null;
  const presentStamp = Date.now();
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = `C:\\KSESSION-B4-T1A-PRESENT-${process.pid}-${presentStamp}-${attempt}`;
    try { fs.mkdirSync(candidate); present = candidate; break; }
    catch (error) { if (!error || error.code !== 'EEXIST') throw error; }
  }
  assert.ok(present, 'a unique existing ASCII candidate is required');
  try {
    assert.match(present, /^C:\\KSESSION-B4-T1A-PRESENT-[0-9-]+$/,
      'the PRESENT fixture must not depend on repository-root characters');
    assert.equal(invoke(present), 71, 'an existing candidate must fail before hosted work begins');
  }
  finally { fs.rmdirSync(present); }
  assert.equal(invoke('C:\\KSESSION B4 中文'), 70, 'unsafe path text must fail closed');
  const scratch = fs.mkdtempSync(path.join(__dirname, '.tmp-host-root-'));
  let mappedDrive = null;
  try {
    for (const letter of ['Z:', 'Y:', 'X:', 'W:']) {
      if (!fs.existsSync(`${letter}\\`)) { mappedDrive = letter; break; }
    }
    assert.ok(mappedDrive, 'an unused synthetic drive letter is required');
    const attach = childProcess.spawnSync('subst.exe', [mappedDrive, scratch], {encoding: 'utf8'});
    assert.equal(attach.status, 0, 'synthetic mapped volume setup failed');
    assert.equal(invoke(`${mappedDrive}\\KSESSION-B4-T1A-WORK`), 72, 'mapped platform volume must stay rejected');
  } finally {
    if (mappedDrive) childProcess.spawnSync('subst.exe', [mappedDrive, '/D'], {encoding: 'utf8'});
    fs.rmSync(scratch, {recursive: true, force: true});
  }
  const exitMap = [...script.matchAll(/(7[0-6]) \{Set-TaskPhase '(HOSTED_ROOT_[A-Z_]+)'\}/g)]
    .map(match => [Number(match[1]), match[2]]);
  assert.deepEqual(exitMap, [[70, 'HOSTED_ROOT_INPUT'], [71, 'HOSTED_ROOT_PRESENT'],
    [72, 'HOSTED_ROOT_PLATFORM_VOLUME'], [73, 'HOSTED_ROOT_ANCESTOR'], [74, 'HOSTED_ROOT_REALPATH'],
    [75, 'HOSTED_ROOT_INSPECTION'], [76, 'HOSTED_ROOT_USAGE']]);
  assert.match(script, /\$taskWork='C:\\KSESSION-B4-T1A-WORK'/);
  assert.match(script, /DriveType -ne \[IO\.DriveType\]::Fixed/);
  assert.match(script, /default \{Set-TaskPhase 'HOSTED_ROOT_OTHER'\}/);
  const hostedBody = script.slice(script.indexOf('\ntry{'));
  assert.ok(hostedBody.indexOf('Invoke-HostedRootCheck $taskWork') < hostedBody.indexOf('Invoke-WebRequest'),
    'host roots must be rejected before artifact download');
  const historical = workflow.slice(workflow.indexOf('\n  historical-identity:'));
  assert.doesNotMatch(historical, /subst\s+E:/);
});
