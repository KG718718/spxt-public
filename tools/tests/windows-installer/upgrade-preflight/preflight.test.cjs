'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const helper = path.join(repoRoot, 'tools', 'windows-installer', 'upgrade-preflight', 'index.cjs');
const taskTempRoot = path.join(__dirname, '.task-tmp');

function hash(source) {
    return crypto.createHash('sha256').update(source).digest('hex');
}

function snapshot(root) {
    if (!fs.existsSync(root)) return [{ path: '', type: 'missing' }];
    const rows = [];
    function visit(current, relative) {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const absolute = path.join(current, entry.name);
            const rel = path.join(relative, entry.name);
            const stat = fs.lstatSync(absolute);
            if (stat.isSymbolicLink()) {
                rows.push({ path: rel, type: 'link', target: fs.readlinkSync(absolute) });
            } else if (stat.isDirectory()) {
                rows.push({ path: rel, type: 'directory' });
                visit(absolute, rel);
            } else {
                const bytes = fs.readFileSync(absolute);
                rows.push({ path: rel, type: 'file', bytes: bytes.length, sha256: hash(bytes) });
            }
        }
    }
    visit(root, '');
    return rows;
}

function writeBinding(filename, installRoot, instancePath, overrides = {}) {
    const values = { Schema: '1', InstallRoot: installRoot, Instance: instancePath, ...overrides };
    const text = '[Installation]\r\n' + Object.entries(values).map(([key, value]) => `${key}=${value}\r\n`).join('');
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
}

function validData() {
    return {
        users: [{ username: 'synthetic-admin', password: crypto.randomBytes(24).toString('hex'), role: 'admin' }],
        applications: [], payments: []
    };
}

function makeFixture(t, mode = 'initialized') {
    fs.mkdirSync(taskTempRoot, { recursive: true });
    const base = fs.mkdtempSync(path.join(taskTempRoot, 'case-'));
    t.after(() => {
        fs.rmSync(base, { recursive: true, force: true });
        try { fs.rmdirSync(taskTempRoot); } catch {}
    });
    const installRoot = path.join(base, 'install');
    // T3 must validate with trusted beta.2 staged resources before replacing beta.1 program files.
    const appRoot = path.join(base, 'staged-beta2', 'app');
    const bindingFile = path.join(installRoot, 'uninstall', 'instance-binding.ini');
    const instancePath = path.join(base, 'instance');
    fs.mkdirSync(appRoot, { recursive: true });
    fs.cpSync(path.join(repoRoot, 'public-startup.js'), path.join(appRoot, 'public-startup.js'));
    for (const dependency of ['public-config-store.js', 'tax-config.js', 'invoice-access-policy.js', 'service-fee-config.js', 'bonus-config.js']) {
        fs.cpSync(path.join(repoRoot, dependency), path.join(appRoot, dependency));
    }
    fs.mkdirSync(instancePath, { recursive: true });
    if (mode === 'initialized') fs.writeFileSync(path.join(instancePath, 'data.json'), JSON.stringify(validData()));
    if (mode === 'uninitialized') fs.writeFileSync(path.join(instancePath, '.ksession-instance-v1'), 'K-SESSION empty instance v1\n');
    writeBinding(bindingFile, installRoot, instancePath);
    return { base, installRoot, appRoot, bindingFile, instancePath };
}

function invoke(fixture, changes = {}) {
    const options = {
        installRoot: fixture.installRoot,
        instancePath: fixture.instancePath,
        bindingFile: fixture.bindingFile,
        registeredInstallRoot: fixture.installRoot,
        registeredInstance: fixture.instancePath,
        dataContractVersion: '1',
        appRoot: fixture.appRoot,
        ...changes
    };
    const before = snapshot(fixture.instancePath);
    const result = spawnSync(process.execPath, [helper,
        '--install-root', options.installRoot,
        '--instance', options.instancePath,
        '--binding-file', options.bindingFile,
        '--registered-install-root', options.registeredInstallRoot,
        '--registered-instance', options.registeredInstance,
        '--data-contract', options.dataContractVersion,
        '--app-root', options.appRoot
    ], { encoding: 'utf8', windowsHide: true });
    const after = snapshot(fixture.instancePath);
    assert.deepEqual(after, before, 'preflight changed instance bytes or entries');
    assert.equal(result.stderr, '');
    return { status: result.status, output: JSON.parse(result.stdout) };
}

test('accepts initialized DC1 without changing data, config, attachments, backups, or secret fixture', t => {
    const fixture = makeFixture(t);
    fs.writeFileSync(path.join(fixture.instancePath, 'config.json'), '{}');
    fs.mkdirSync(path.join(fixture.instancePath, 'attachments', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(fixture.instancePath, 'attachments', 'nested', 'synthetic.bin'), crypto.randomBytes(31));
    fs.mkdirSync(path.join(fixture.instancePath, 'backups'), { recursive: true });
    fs.writeFileSync(path.join(fixture.instancePath, 'backups', 'synthetic.json'), '{}');
    const secretFile = path.join(fixture.instancePath, 'runtime', 'secrets', 'smtp-pass.dpapi');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    const secret = crypto.randomBytes(47);
    fs.writeFileSync(secretFile, secret);
    const secretEvidence = { exists: fs.existsSync(secretFile), bytes: secret.length, sha256: hash(secret) };
    assert.equal(secretEvidence.exists, true);
    assert.equal(secretEvidence.bytes, 47);
    assert.equal(secretEvidence.sha256.length, 64);
    const result = invoke(fixture);
    assert.deepEqual(result, { status: 0, output: { ok: true, code: 'PREFLIGHT_OK', state: 'initialized' } });
});

test('accepts the owned uninitialized state without creating data or config', t => {
    const fixture = makeFixture(t, 'uninitialized');
    const result = invoke(fixture);
    assert.deepEqual(result, { status: 0, output: { ok: true, code: 'PREFLIGHT_OK', state: 'uninitialized' } });
});

for (const sample of [
    ['missing instance', (t, f) => { fs.rmSync(f.instancePath, { recursive: true }); }, 13, 'INSTANCE_NOT_FOUND'],
    ['bad data JSON', (t, f) => { fs.writeFileSync(path.join(f.instancePath, 'data.json'), '{'); }, 15, 'STORE_INVALID'],
    ['bad config JSON', (t, f) => { fs.writeFileSync(path.join(f.instancePath, 'config.json'), '{'); }, 15, 'STORE_INVALID'],
    ['invalid config state', (t, f) => { fs.writeFileSync(path.join(f.instancePath, 'config.json'), JSON.stringify({ configVersion: 1, configAuditRecords: [] })); }, 15, 'CONFIG_INVALID'],
    ['invalid public data state', (t, f) => { fs.writeFileSync(path.join(f.instancePath, 'data.json'), JSON.stringify({ users: null, applications: [], payments: [] })); }, 15, 'STORE_INVALID'],
    ['orphaned config without data', (t, f) => { fs.rmSync(path.join(f.instancePath, 'data.json')); fs.writeFileSync(path.join(f.instancePath, 'config.json'), '{}'); }, 15, 'ORPHANED_INSTALLATION'],
    ['binding conflict', (t, f) => { writeBinding(f.bindingFile, f.installRoot, path.join(f.base, 'different')); }, 14, 'BINDING_CONFLICT'],
    ['registration conflict', () => {}, 14, 'REGISTRATION_CONFLICT', { registeredInstance: path.join(repoRoot, 'synthetic-other-instance') }],
    ['unknown data contract', () => {}, 11, 'DATA_CONTRACT_UNSUPPORTED', { dataContractVersion: '2' }],
    ['missing application startup contract', (t, f) => { fs.rmSync(path.join(f.appRoot, 'public-startup.js')); }, 12, 'APP_RESOURCE_INVALID'],
    ['unsafe attachment link', (t, f) => {
        const outside = path.join(f.base, 'outside');
        fs.mkdirSync(outside);
        fs.mkdirSync(path.join(f.instancePath, 'attachments'));
        fs.symlinkSync(outside, path.join(f.instancePath, 'attachments', 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    }, 16, 'INSTANCE_STRUCTURE_UNSAFE'],
    ['unsafe backups link', (t, f) => {
        const outside = path.join(f.base, 'outside');
        fs.mkdirSync(outside);
        fs.symlinkSync(outside, path.join(f.instancePath, 'backups'), process.platform === 'win32' ? 'junction' : 'dir');
    }, 16, 'INSTANCE_STRUCTURE_UNSAFE']
]) {
    test(`rejects ${sample[0]} and leaves the instance unchanged`, t => {
        const fixture = makeFixture(t);
        sample[1](t, fixture);
        const result = invoke(fixture, sample[4]);
        assert.deepEqual(result, { status: sample[2], output: { ok: false, code: sample[3] } });
    });
}

test('rejects orphaned files in an uninitialized instance without changing them', t => {
    const fixture = makeFixture(t, 'uninitialized');
    fs.writeFileSync(path.join(fixture.instancePath, 'unknown.bin'), crypto.randomBytes(9));
    const result = invoke(fixture);
    assert.deepEqual(result, { status: 15, output: { ok: false, code: 'ORPHANED_INSTALLATION' } });
});

test('rejects an instance whose ancestor is a reparse point without changing the target', t => {
    const fixture = makeFixture(t);
    const actual = path.join(fixture.base, 'actual-instance');
    fs.renameSync(fixture.instancePath, actual);
    fs.symlinkSync(actual, fixture.instancePath, process.platform === 'win32' ? 'junction' : 'dir');
    writeBinding(fixture.bindingFile, fixture.installRoot, fixture.instancePath);
    const before = snapshot(actual);
    const result = invoke({ ...fixture, instancePath: actual }, { instancePath: fixture.instancePath, registeredInstance: fixture.instancePath });
    assert.deepEqual(snapshot(actual), before);
    assert.deepEqual(result, { status: 13, output: { ok: false, code: 'INSTANCE_PATH_UNSAFE' } });
});

test('rejects an unknown top-level directory junction without changing instance or target', t => {
    const fixture = makeFixture(t);
    const outside = path.join(fixture.base, 'outside-top-level');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'sentinel.bin'), crypto.randomBytes(13));
    fs.symlinkSync(outside, path.join(fixture.instancePath, 'unexpected-link'), process.platform === 'win32' ? 'junction' : 'dir');
    const targetBefore = snapshot(outside);
    const result = invoke(fixture);
    assert.deepEqual(snapshot(outside), targetBefore);
    assert.deepEqual(result, { status: 16, output: { ok: false, code: 'INSTANCE_STRUCTURE_UNSAFE' } });
});

test('rejects a link inside an unknown ordinary directory without changing instance or target', t => {
    const fixture = makeFixture(t);
    const outside = path.join(fixture.base, 'outside-deep');
    const unknown = path.join(fixture.instancePath, 'ordinary-unknown', 'nested');
    fs.mkdirSync(outside);
    fs.mkdirSync(unknown, { recursive: true });
    fs.writeFileSync(path.join(outside, 'sentinel.bin'), crypto.randomBytes(15));
    fs.symlinkSync(outside, path.join(unknown, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const targetBefore = snapshot(outside);
    const result = invoke(fixture);
    assert.deepEqual(snapshot(outside), targetBefore);
    assert.deepEqual(result, { status: 16, output: { ok: false, code: 'INSTANCE_STRUCTURE_UNSAFE' } });
});

test('rejects an unknown top-level file symlink when Windows permits creating one', t => {
    const fixture = makeFixture(t);
    const outside = path.join(fixture.base, 'outside-file.bin');
    const link = path.join(fixture.instancePath, 'unexpected-file-link.bin');
    fs.writeFileSync(outside, crypto.randomBytes(17));
    try {
        fs.symlinkSync(outside, link, 'file');
    } catch (error) {
        if (process.platform === 'win32' && (error.code === 'EPERM' || error.code === 'EACCES')) {
            if (process.env.KSESSION_REQUIRE_FILE_SYMLINK === '1') throw error;
            t.skip('Windows file symlink privilege is unavailable; junction coverage remains active.');
            return;
        }
        throw error;
    }
    const targetBefore = snapshot(path.dirname(outside));
    const result = invoke(fixture);
    assert.deepEqual(snapshot(path.dirname(outside)), targetBefore);
    assert.deepEqual(result, { status: 16, output: { ok: false, code: 'INSTANCE_STRUCTURE_UNSAFE' } });
});

test('diagnostics never include path or stored user content', t => {
    const fixture = makeFixture(t);
    const sentinel = 'SYNTHETIC-CONTENT-' + crypto.randomBytes(12).toString('hex');
    fs.writeFileSync(path.join(fixture.instancePath, 'data.json'), sentinel);
    const result = invoke(fixture);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(sentinel), false);
    assert.equal(serialized.includes(fixture.instancePath), false);
});

test.after(() => {
    try { fs.rmSync(taskTempRoot, { recursive: true, force: true }); } catch {}
});
