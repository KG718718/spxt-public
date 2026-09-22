'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
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
  assert.match(historical, /if: github\.event_name == 'workflow_dispatch' && github\.repository == 'KG718718\/spxt-public' && github\.ref == 'refs\/heads\/codex\/windows-installer-v1\.1'/);
  assert.match(historical, /permissions:\s*\n\s+contents: read\s*\n\s+actions: read/);
  assert.match(historical, /invoke\.ps1/);
  assert.match(historical, /if: success\(\)[\s\S]*path: \$\{\{ env\.KSESSION_HISTORICAL_EVIDENCE \}\}/);
  assert.doesNotMatch(historical, /(?:\.exe|artifact\.zip|installed|taskWork)\s*$/im);
  assert.equal((historical.match(/actions\/upload-artifact@/g) || []).length, 1, 'historical job uploads exactly one artifact');
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
  const allowed = [...allowlistBlock[1].matchAll(/'([A-Z_]+)'/g)].map(match => match[1]);
  assert.deepEqual(allowed, ['HOSTED_PREFLIGHT', 'API_METADATA', 'ARTIFACT_DOWNLOAD', 'ARCHIVE_HASH', 'EXTRACT',
    'SETUP_IDENTITY', 'INSTALL', 'REGISTRY_HKLM', 'REGISTRY_HKCU_READ', 'REGISTRY_SNAPSHOT_WRITE',
    'REGISTRY_NORMALIZE_INPUT', 'REGISTRY_NORMALIZE_MISSING_REGISTRATION',
    'REGISTRY_NORMALIZE_MISSING_BINDING', 'REGISTRY_NORMALIZE_MISSING_BOTH', 'REGISTRY_NORMALIZE_CONFLICT',
    'REGISTRY_NORMALIZE_USAGE', 'REGISTRY_NORMALIZE_OUTPUT', 'REGISTRY_NORMALIZE_OTHER', 'REGISTRY_RESULT_READ',
    'REGISTRY_UNIQUENESS', 'COLLECT', 'UNINSTALL', 'CLEANUP', 'FINALIZE']);
  assert.equal(new Set(allowed).size, allowed.length, 'phase allowlist contains duplicates');
  const assigned = [...script.matchAll(/Set-TaskPhase '([A-Z_]+)'/g)].map(match => match[1]);
  assert.deepEqual([...new Set(assigned)].sort(), [...allowed].sort(), 'every and only allowlisted phases must be assigned');
  const catchBlock = script.match(/} catch \{([\s\S]*?)\n} finally \{/);
  assert.ok(catchBlock, 'closed catch block missing');
  assert.match(catchBlock[1], /\$taskAllowedPhases -notcontains \$taskPhase/);
  assert.match(catchBlock[1], /WriteLine\('HISTORICAL_IDENTITY_BLOCKED_'\+\$taskPhase\)/);
  assert.doesNotMatch(catchBlock[1], /\$_|Exception|\.Message|https?:|taskWork|taskToken|RepositoryRoot|OutputFile|registry/i);
  for (const phase of allowed) {
    const output = `HISTORICAL_IDENTITY_BLOCKED_${phase}`;
    assert.match(output, /^HISTORICAL_IDENTITY_BLOCKED_[A-Z_]+$/);
    assert.doesNotMatch(output, /[A-Za-z]:[\\/]|Users|token|password|cookie|authorization|https?:|\\Software\\/i);
  }
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
