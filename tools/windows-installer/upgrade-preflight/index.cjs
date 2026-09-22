'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXIT = Object.freeze({
    OK: 0,
    ARGUMENT: 10,
    DATA_CONTRACT: 11,
    APP_RESOURCE: 12,
    INSTANCE: 13,
    BINDING: 14,
    STORE: 15,
    STRUCTURE: 16,
    INTERNAL: 17
});

class PreflightError extends Error {
    constructor(code, exitCode) {
        super(code);
        this.code = code;
        this.exitCode = exitCode;
    }
}

function fail(code, exitCode) {
    throw new PreflightError(code, exitCode);
}

function samePath(left, right) {
    return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function within(parent, child) {
    const relative = path.relative(parent, child);
    return relative === '' || (!path.isAbsolute(relative) && relative !== '..'
        && !relative.startsWith('..' + path.sep));
}

function requireAbsolute(value, code = 'ARGUMENT_INVALID') {
    if (typeof value !== 'string' || !value || !path.isAbsolute(value)
        || value.includes('\0') || path.normalize(value) !== value) {
        fail(code, EXIT.ARGUMENT);
    }
    if (process.platform === 'win32' && (!/^[A-Za-z]:\\/.test(value) || value.startsWith('\\\\'))) {
        fail(code, EXIT.ARGUMENT);
    }
    return value;
}

function assertExistingPathSafe(target, expectedType, code, exitCode) {
    let current = target;
    for (;;) {
        let stat;
        try {
            stat = fs.lstatSync(current);
        } catch {
            fail(code, exitCode);
        }
        if (stat.isSymbolicLink()) fail(code, exitCode);
        let real;
        try {
            real = fs.realpathSync.native(current);
        } catch {
            fail(code, exitCode);
        }
        if (!samePath(path.normalize(real), path.normalize(current))) fail(code, exitCode);
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    const stat = fs.lstatSync(target);
    if ((expectedType === 'directory' && !stat.isDirectory())
        || (expectedType === 'file' && !stat.isFile())) {
        fail(code, exitCode);
    }
}

function assertOptionalRegularFile(filename) {
    try {
        const stat = fs.lstatSync(filename);
        if (!stat.isFile() || stat.isSymbolicLink()) fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
        const real = fs.realpathSync.native(filename);
        if (!samePath(path.normalize(real), path.normalize(filename))) {
            fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
        }
    } catch (error) {
        if (error?.code === 'ENOENT') return;
        if (error instanceof PreflightError) throw error;
        fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
    }
}

function assertSafeTree(directory) {
    let root;
    try {
        const stat = fs.lstatSync(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink()) fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
        root = fs.realpathSync.native(directory);
    } catch (error) {
        if (error?.code === 'ENOENT') return;
        if (error instanceof PreflightError) throw error;
        fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
    }
    if (!samePath(path.normalize(root), path.normalize(directory))) {
        fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
    }
    const pending = [directory];
    while (pending.length) {
        const current = pending.pop();
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
        }
        for (const entry of entries) {
            const candidate = path.join(current, entry.name);
            let stat;
            try {
                stat = fs.lstatSync(candidate);
            } catch {
                fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
            }
            if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
                fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
            }
            let real;
            try {
                real = fs.realpathSync.native(candidate);
            } catch {
                fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
            }
            if (!samePath(path.normalize(real), path.normalize(candidate)) || !within(root, real)) {
                fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE);
            }
            if (stat.isDirectory()) pending.push(candidate);
        }
    }
}

function decodeBinding(source) {
    if (!Buffer.isBuffer(source) || source.length === 0 || source.length > 65536) {
        fail('BINDING_INVALID', EXIT.BINDING);
    }
    if (source[0] === 0xff && source[1] === 0xfe) return source.subarray(2).toString('utf16le');
    if (source[0] === 0xfe && source[1] === 0xff) fail('BINDING_INVALID', EXIT.BINDING);
    return source.toString('utf8').replace(/^\ufeff/, '');
}

function readBinding(filename) {
    assertExistingPathSafe(filename, 'file', 'BINDING_INVALID', EXIT.BINDING);
    let text;
    try {
        text = decodeBinding(fs.readFileSync(filename));
    } catch (error) {
        if (error instanceof PreflightError) throw error;
        fail('BINDING_INVALID', EXIT.BINDING);
    }
    const values = new Map();
    let section = '';
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith(';') || line.startsWith('#')) continue;
        const heading = line.match(/^\[([^\]]+)\]$/);
        if (heading) {
            section = heading[1].trim().toLowerCase();
            continue;
        }
        const at = line.indexOf('=');
        if (at <= 0) fail('BINDING_INVALID', EXIT.BINDING);
        if (section !== 'installation') continue;
        const key = line.slice(0, at).trim().toLowerCase();
        const value = line.slice(at + 1).trim();
        if (!['schema', 'installroot', 'instance'].includes(key) || values.has(key) || !value) {
            fail('BINDING_INVALID', EXIT.BINDING);
        }
        values.set(key, value);
    }
    if (values.size !== 3 || values.get('schema') !== '1') fail('BINDING_INVALID', EXIT.BINDING);
    return { installRoot: values.get('installroot'), instance: values.get('instance') };
}

function loadStartupContract(appRoot) {
    assertExistingPathSafe(appRoot, 'directory', 'APP_RESOURCE_INVALID', EXIT.APP_RESOURCE);
    const startupFile = path.join(appRoot, 'public-startup.js');
    assertExistingPathSafe(startupFile, 'file', 'APP_RESOURCE_INVALID', EXIT.APP_RESOURCE);
    let contract;
    try {
        contract = require(startupFile);
    } catch {
        fail('APP_RESOURCE_INVALID', EXIT.APP_RESOURCE);
    }
    if (!contract || typeof contract.loadStartupState !== 'function') {
        fail('APP_RESOURCE_INVALID', EXIT.APP_RESOURCE);
    }
    return contract;
}

function assertUninitializedShape(instancePath) {
    let entries;
    try {
        entries = fs.readdirSync(instancePath, { withFileTypes: true });
    } catch {
        fail('INSTANCE_UNREADABLE', EXIT.INSTANCE);
    }
    const allowed = new Set(['.ksession-instance-v1', '.launcher.lock', 'launcher-logs', 'temp']);
    if (entries.some(entry => !allowed.has(entry.name))) {
        fail('ORPHANED_INSTALLATION', EXIT.STORE);
    }
    const marker = path.join(instancePath, '.ksession-instance-v1');
    if (entries.some(entry => entry.name === '.ksession-instance-v1')) {
        assertOptionalRegularFile(marker);
        let source;
        try { source = fs.readFileSync(marker, 'utf8'); } catch { fail('INSTANCE_STRUCTURE_UNSAFE', EXIT.STRUCTURE); }
        if (source !== 'K-SESSION empty instance v1\n') fail('ORPHANED_INSTALLATION', EXIT.STORE);
    }
}

function normalizeStoreFailure(error) {
    const known = new Set(['STORE_UNREADABLE', 'STORE_INVALID', 'CONFIG_INVALID', 'ORPHANED_INSTALLATION']);
    if (known.has(error?.code)) fail(error.code, EXIT.STORE);
    fail('STORE_VALIDATION_FAILED', EXIT.STORE);
}

function runPreflight(options) {
    if (!options || String(options.dataContractVersion) !== '1') {
        fail('DATA_CONTRACT_UNSUPPORTED', EXIT.DATA_CONTRACT);
    }
    const installRoot = requireAbsolute(options.installRoot);
    const instancePath = requireAbsolute(options.instancePath);
    const expectedBindingPath = requireAbsolute(options.bindingFile);
    const registeredInstallRoot = requireAbsolute(options.registeredInstallRoot);
    const registeredInstance = requireAbsolute(options.registeredInstance);
    const appRoot = requireAbsolute(options.appRoot);

    assertExistingPathSafe(installRoot, 'directory', 'INSTALL_ROOT_INVALID', EXIT.BINDING);
    try {
        const instanceStat = fs.lstatSync(instancePath);
        if (instanceStat.isSymbolicLink()) fail('INSTANCE_PATH_UNSAFE', EXIT.INSTANCE);
        if (!instanceStat.isDirectory()) fail('INSTANCE_NOT_FOUND', EXIT.INSTANCE);
    } catch (error) {
        if (error instanceof PreflightError) throw error;
        fail('INSTANCE_NOT_FOUND', EXIT.INSTANCE);
    }
    assertExistingPathSafe(instancePath, 'directory', 'INSTANCE_PATH_UNSAFE', EXIT.INSTANCE);
    if (within(installRoot, instancePath) || within(instancePath, installRoot)) {
        fail('INSTANCE_PATH_UNSAFE', EXIT.INSTANCE);
    }
    for (const protectedRoot of [process.env.SystemRoot, process.env.ProgramFiles,
        process.env['ProgramFiles(x86)'], process.env.ProgramW6432].filter(Boolean)) {
        const normalized = path.normalize(protectedRoot);
        if (within(normalized, instancePath) || within(instancePath, normalized)) {
            fail('INSTANCE_PATH_UNSAFE', EXIT.INSTANCE);
        }
    }
    if (!samePath(installRoot, registeredInstallRoot) || !samePath(instancePath, registeredInstance)) {
        fail('REGISTRATION_CONFLICT', EXIT.BINDING);
    }
    const binding = readBinding(expectedBindingPath);
    if (!samePath(binding.installRoot, installRoot) || !samePath(binding.instance, instancePath)) {
        fail('BINDING_CONFLICT', EXIT.BINDING);
    }
    if (!within(installRoot, expectedBindingPath)) fail('BINDING_INVALID', EXIT.BINDING);
    if (within(instancePath, appRoot) || within(appRoot, instancePath)) {
        fail('APP_RESOURCE_INVALID', EXIT.APP_RESOURCE);
    }

    const contract = loadStartupContract(appRoot);
    for (const directory of ['attachments', 'backups', 'logs', 'runtime', path.join('runtime', 'secrets'), 'launcher-logs', 'temp']) {
        assertSafeTree(path.join(instancePath, directory));
    }
    for (const filename of ['data.json', 'config.json', 'mail-reminder.config.json',
        path.join('runtime', 'secrets', 'smtp-pass.dpapi'), '.launcher.lock']) {
        assertOptionalRegularFile(path.join(instancePath, filename));
    }

    let startup;
    try {
        startup = contract.loadStartupState({
            dataFile: path.join(instancePath, 'data.json'),
            configFile: path.join(instancePath, 'config.json'),
            priorDirectories: [path.join(instancePath, 'attachments'), path.join(instancePath, 'backups'), path.join(instancePath, 'logs')],
            priorFiles: [path.join(instancePath, 'mail-reminder.config.json'), path.join(instancePath, 'runtime', 'secrets', 'smtp-pass.dpapi')]
        });
    } catch (error) {
        normalizeStoreFailure(error);
    }
    if (startup.needsInitialization) assertUninitializedShape(instancePath);
    return Object.freeze({ ok: true, code: 'PREFLIGHT_OK', state: startup.needsInitialization ? 'uninitialized' : 'initialized' });
}

function parseArguments(argv) {
    const names = new Map([
        ['--install-root', 'installRoot'], ['--instance', 'instancePath'], ['--binding-file', 'bindingFile'],
        ['--registered-install-root', 'registeredInstallRoot'], ['--registered-instance', 'registeredInstance'],
        ['--data-contract', 'dataContractVersion'], ['--app-root', 'appRoot']
    ]);
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
        const name = names.get(argv[index]);
        if (!name || index + 1 >= argv.length || Object.hasOwn(options, name)) {
            fail('ARGUMENT_INVALID', EXIT.ARGUMENT);
        }
        options[name] = argv[index + 1];
    }
    if (Object.keys(options).length !== names.size) fail('ARGUMENT_INVALID', EXIT.ARGUMENT);
    return options;
}

function diagnostic(error) {
    if (error instanceof PreflightError) return { exitCode: error.exitCode, body: { ok: false, code: error.code } };
    return { exitCode: EXIT.INTERNAL, body: { ok: false, code: 'PREFLIGHT_INTERNAL' } };
}

if (require.main === module) {
    try {
        process.stdout.write(JSON.stringify(runPreflight(parseArguments(process.argv.slice(2)))) + '\n');
    } catch (error) {
        const result = diagnostic(error);
        process.stdout.write(JSON.stringify(result.body) + '\n');
        process.exitCode = result.exitCode;
    }
}

module.exports = { EXIT, PreflightError, runPreflight, parseArguments, diagnostic };
