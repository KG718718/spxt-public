'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { inventory } = require('../../windows-runtime/common.cjs');

const INSTALLER_VERSION = '1.1.0-beta.3';
const APP_VERSION = '1.0.0';
const DATA_CONTRACT_VERSION = 1;
const JOURNAL_SCHEMA = 1;
const RECOVERY_NAME = '.ksession-upgrade-recovery-v1';
const INSTALLER_METADATA = Object.freeze(['LICENSE-Inno-Setup.txt', 'build-info.json', 'installer-manifest.json',
  'install-state.json', 'instance-binding.ini', 'unins000.dat', 'unins000.exe']);
const ACCEPTED_F3_STATE = Object.freeze({
  installerVersion: '1.1.0-beta.2', appVersion: APP_VERSION, dataContractVersion: DATA_CONTRACT_VERSION,
  sourceCommit: 'c8886e6b6d413c2fd73d6716621d07a80b337e58',
  runtimeManifestHash: '9cbae719e33456290c5c12d71b27e1fe4db0bc93f4e6b25f771ddf6bc6075671',
  launcherHash: '0abe466cf580673e436deb9283dbd551ad1cb4b89f15b4c1cba5b60e66983b89',
  programManifestHash: '4681b44bb6a70926f0efba7e2f98701bc1cc12981618774cd5345aa1dc993d2c',
  upgradeTo: '1.1.0-beta.2'
});

class TransactionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) { throw new TransactionError(code, message); }
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function parseStrictJson(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > 16384) throw Error('invalid json');
  let offset = 0;
  const whitespace = () => { while (/[\u0009\u000a\u000d\u0020]/.test(source[offset] || '')) offset += 1; };
  function string() {
    if (source[offset] !== '"') throw Error('string required');
    const start = offset++;
    while (offset < source.length) {
      const code = source.charCodeAt(offset);
      if (code < 0x20) throw Error('control character');
      if (source[offset] === '"') { offset += 1; return JSON.parse(source.slice(start, offset)); }
      if (source[offset] === '\\') {
        offset += 1;
        if ('"\\/bfnrt'.includes(source[offset])) { offset += 1; continue; }
        if (source[offset] !== 'u' || !/^[0-9a-f]{4}$/i.test(source.slice(offset + 1, offset + 5))) throw Error('invalid escape');
        offset += 5; continue;
      }
      offset += 1;
    }
    throw Error('unterminated string');
  }
  function value(depth) {
    if (depth > 16) throw Error('json nesting limit');
    whitespace();
    if (source[offset] === '"') return string();
    if (source[offset] === '{') {
      offset += 1; whitespace();
      const result = Object.create(null), seen = new Set();
      if (source[offset] === '}') { offset += 1; return result; }
      while (offset < source.length) {
        whitespace(); const key = string(); whitespace();
        if (seen.has(key)) throw Error('duplicate key');
        seen.add(key);
        if (source[offset++] !== ':') throw Error('colon required');
        result[key] = value(depth + 1); whitespace();
        if (source[offset] === '}') { offset += 1; return result; }
        if (source[offset++] !== ',') throw Error('comma required');
      }
      throw Error('unterminated object');
    }
    if (source[offset] === '[') {
      offset += 1; whitespace(); const result = [];
      if (source[offset] === ']') { offset += 1; return result; }
      while (offset < source.length) {
        result.push(value(depth + 1)); whitespace();
        if (source[offset] === ']') { offset += 1; return result; }
        if (source[offset++] !== ',') throw Error('comma required');
      }
      throw Error('unterminated array');
    }
    for (const [token, result] of [['true', true], ['false', false], ['null', null]]) {
      if (source.startsWith(token, offset)) { offset += token.length; return result; }
    }
    const number = source.slice(offset).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!number) throw Error('value required');
    offset += number[0].length; return JSON.parse(number[0]);
  }
  whitespace(); const result = value(0); whitespace();
  if (offset !== source.length) throw Error('trailing json');
  return result;
}
function readStrictJson(file, code) {
  const bytes = fs.readFileSync(file), text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes) || text.startsWith('\ufeff')) fail(code, 'JSON encoding invalid');
  let value;
  try { value = parseStrictJson(text); } catch { fail(code, 'JSON syntax invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, 'JSON object invalid');
  return {bytes, value};
}
function writeJsonNew(file, value) {
  const handle = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(handle, JSON.stringify(value, null, 2) + '\n'); }
  finally { fs.closeSync(handle); }
}
function replaceJson(file, value) {
  const temp = file + '.new';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  fs.renameSync(temp, file);
}
function regular(file, code) {
  let info;
  try { info = fs.lstatSync(file); } catch { fail(code, 'required file missing'); }
  if (!info.isFile() || info.isSymbolicLink()) fail(code, 'required file unsafe');
  return info;
}
function directory(dir, code) {
  let info;
  try { info = fs.lstatSync(dir); } catch { fail(code, 'required directory missing'); }
  if (!info.isDirectory() || info.isSymbolicLink()) fail(code, 'required directory unsafe');
  return info;
}
function within(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
function samePath(left, right) {
  return typeof left === 'string' && typeof right === 'string' &&
    path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}
function assertPlan(plan) {
  const keys = ['schema', 'installRoot', 'instancePath', 'stagedProgram', 'stagedMetadata', 'desktopShortcut',
    'startMenuShortcut', 'sourceCommit', 'runtimeManifestHash', 'launcherHash', 'firewallHelperHash', 'programManifestHash',
    'instanceBindingSchema', 'upgradeFrom', 'upgradeTo'];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) ||
      Object.keys(plan).sort().join('\0') !== keys.sort().join('\0') || plan.schema !== 1) {
    fail('PLAN_INVALID', 'transaction plan invalid');
  }
  for (const key of ['installRoot', 'instancePath', 'stagedProgram', 'stagedMetadata', 'desktopShortcut', 'startMenuShortcut']) {
    if (typeof plan[key] !== 'string' || !path.isAbsolute(plan[key])) fail('PLAN_INVALID', 'transaction path invalid');
  }
  if (within(plan.installRoot, plan.instancePath) || within(plan.instancePath, plan.installRoot)) fail('INSTANCE_SCOPE', 'instance overlaps install root');
  if (within(plan.instancePath, plan.stagedProgram) || within(plan.stagedProgram, plan.instancePath) ||
      within(plan.instancePath, plan.stagedMetadata) || within(plan.stagedMetadata, plan.instancePath)) {
    fail('INSTANCE_SCOPE', 'stage overlaps instance');
  }
  if (plan.upgradeFrom !== '1.1.0-beta.2' || plan.upgradeTo !== INSTALLER_VERSION ||
      plan.instanceBindingSchema !== 1 || !/^[a-f0-9]{40}$/.test(plan.sourceCommit) ||
      ![plan.runtimeManifestHash, plan.launcherHash, plan.firewallHelperHash, plan.programManifestHash].every(value => /^[a-f0-9]{64}$/.test(value))) {
    fail('PLAN_INVALID', 'transaction identity invalid');
  }
}
function locations(plan) {
  const recovery = path.join(plan.installRoot, RECOVERY_NAME);
  return {
    program: path.join(plan.installRoot, 'program'),
    uninstall: path.join(plan.installRoot, 'uninstall'),
    recovery,
    journal: path.join(recovery, 'journal.json'),
    oldProgram: path.join(recovery, 'program'),
    oldUninstall: path.join(recovery, 'uninstall'),
    shortcuts: path.join(recovery, 'shortcuts')
  };
}
function copyIfPresent(source, target) {
  if (!fs.existsSync(source)) return false;
  const info = fs.lstatSync(source);
  if ((!info.isFile() && !info.isDirectory()) || info.isSymbolicLink()) fail('RECOVERY_UNSAFE', 'recovery source unsafe');
  fs.cpSync(source, target, { recursive: info.isDirectory(), force: false, errorOnExist: true });
  return true;
}
function copyInstallerMetadata(source, target) {
  directory(source, 'OLD_METADATA_INVALID');
  const names = fs.readdirSync(source).sort();
  if (names.join('\0') !== [...INSTALLER_METADATA].sort().join('\0')) fail('OLD_METADATA_INVALID', 'unexpected installer metadata');
  fs.mkdirSync(target);
  for (const name of INSTALLER_METADATA) {
    const from = path.join(source, name), to = path.join(target, name);
    regular(from, 'OLD_METADATA_INVALID'); fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  }
}
function validateOldInstallState(plan, file) {
  regular(file, 'OLD_METADATA_INVALID');
  const state = readStrictJson(file, 'OLD_METADATA_INVALID').value;
  const keys = ['schema', 'installerVersion', 'appVersion', 'dataContractVersion', 'sourceCommit',
    'runtimeManifestHash', 'launcherHash', 'programManifestHash', 'instanceBindingSchema', 'installRoot',
    'instancePath', 'upgradeFrom', 'upgradeTo'];
  if (!state || typeof state !== 'object' || Array.isArray(state) ||
      Object.keys(state).sort().join('\0') !== keys.sort().join('\0') || state.schema !== 1 ||
      state.instanceBindingSchema !== 1 || !samePath(state.installRoot, plan.installRoot) ||
      !samePath(state.instancePath, plan.instancePath)) fail('OLD_METADATA_INVALID', 'old install state contract invalid');
  for (const [key, expected] of Object.entries(ACCEPTED_F3_STATE)) {
    if (state[key] !== expected) fail('OLD_METADATA_INVALID', 'old install state identity mismatch');
  }
  if (!['fresh', '1.1.0-beta.1'].includes(state.upgradeFrom)) fail('OLD_METADATA_INVALID', 'old install state route invalid');
  return state;
}
function newInstallState(plan) {
  return {
    schema: 1, installerVersion: INSTALLER_VERSION, appVersion: APP_VERSION, dataContractVersion: DATA_CONTRACT_VERSION,
    sourceCommit: plan.sourceCommit, runtimeManifestHash: plan.runtimeManifestHash, launcherHash: plan.launcherHash,
    firewallHelperHash: plan.firewallHelperHash, programManifestHash: plan.programManifestHash,
    instanceBindingSchema: plan.instanceBindingSchema, installRoot: plan.installRoot, instancePath: plan.instancePath,
    upgradeFrom: plan.upgradeFrom, upgradeTo: plan.upgradeTo
  };
}
function replaceInstallState(file, state) {
  regular(file, 'OLD_METADATA_INVALID');
  const temp = file + '.new';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  fs.rmSync(file, {force: false});
  fs.renameSync(temp, file);
}
function validateNewInstallState(plan, file) {
  regular(file, 'FINAL_STATE_INVALID');
  const state = readStrictJson(file, 'FINAL_STATE_INVALID').value;
  if (JSON.stringify(state) !== JSON.stringify(newInstallState(plan))) fail('FINAL_STATE_INVALID', 'new install state mismatch');
  return state;
}
function validateStaged(plan) {
  directory(plan.stagedProgram, 'STAGE_INVALID');
  directory(plan.stagedMetadata, 'STAGE_INVALID');
  const manifestFile = path.join(plan.stagedMetadata, 'installer-manifest.json');
  const buildFile = path.join(plan.stagedMetadata, 'build-info.json');
  regular(manifestFile, 'STAGE_INVALID'); regular(buildFile, 'STAGE_INVALID');
  const manifestBytes = fs.readFileSync(manifestFile);
  if (sha(manifestBytes) !== plan.programManifestHash) fail('STAGE_MANIFEST_HASH', 'program manifest hash mismatch');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const build = readJson(buildFile);
  if (manifest.schema !== 1 || manifest.version !== INSTALLER_VERSION || manifest.sourceCommit !== plan.sourceCommit ||
      !Array.isArray(manifest.payload) || sha(Buffer.from(JSON.stringify(manifest.payload))) !== manifest.payloadInventorySha256 ||
      JSON.stringify(inventory(plan.stagedProgram)) !== JSON.stringify(manifest.payload)) fail('STAGE_PAYLOAD', 'staged program mismatch');
  if (build.installerVersion !== INSTALLER_VERSION || build.appVersion !== APP_VERSION ||
      build.dataContractVersion !== DATA_CONTRACT_VERSION || build.sourceCommit !== plan.sourceCommit ||
      build.runtimeManifestSha256 !== plan.runtimeManifestHash || build.launcherSha256 !== plan.launcherHash ||
      build.firewallHelperSha256 !== plan.firewallHelperHash ||
      build.programManifestHash !== plan.programManifestHash || build.instanceBindingSchema !== 1) fail('STAGE_IDENTITY', 'build identity mismatch');
  const runtime = path.join(plan.stagedProgram, 'manifest', 'runtime-manifest.json');
  const launcher = path.join(plan.stagedProgram, 'K-SESSION.exe');
  const firewallHelper = path.join(plan.stagedProgram, 'K-SESSION-Firewall.exe');
  regular(runtime, 'STAGE_INVALID'); regular(launcher, 'STAGE_INVALID'); regular(firewallHelper, 'STAGE_INVALID');
  if (sha(fs.readFileSync(runtime)) !== plan.runtimeManifestHash || sha(fs.readFileSync(launcher)) !== plan.launcherHash ||
      sha(fs.readFileSync(firewallHelper)) !== plan.firewallHelperHash) {
    fail('STAGE_IDENTITY', 'runtime, launcher, or firewall helper mismatch');
  }
  return { manifest, build };
}
function prepare(plan) {
  assertPlan(plan);
  if (fs.existsSync(plan.stagedProgram) || fs.existsSync(plan.stagedMetadata)) validateStaged(plan);
  const loc = locations(plan);
  directory(plan.installRoot, 'INSTALL_ROOT_INVALID'); directory(loc.program, 'OLD_PROGRAM_INVALID'); directory(loc.uninstall, 'OLD_METADATA_INVALID');
  validateOldInstallState(plan, path.join(loc.uninstall, 'install-state.json'));
  if (fs.existsSync(loc.recovery)) fail('RECOVERY_EXISTS', 'unfinished recovery exists');
  fs.mkdirSync(loc.recovery, { recursive: false });
  try {
    copyInstallerMetadata(loc.uninstall, loc.oldUninstall);
    fs.mkdirSync(loc.shortcuts);
    const desktop = copyIfPresent(plan.desktopShortcut, path.join(loc.shortcuts, 'desktop.lnk'));
    const start = copyIfPresent(plan.startMenuShortcut, path.join(loc.shortcuts, 'start-menu.lnk'));
    writeJsonNew(loc.journal, { schema: JOURNAL_SCHEMA, phase: 'PREPARED', plan, desktop, start });
  } catch (error) {
    fs.rmSync(loc.recovery, { recursive: true, force: true });
    if (error instanceof TransactionError) throw error;
    fail('RECOVERY_CREATE_FAILED', 'cannot create recovery state');
  }
  return { ok: true, code: 'TRANSACTION_PREPARED' };
}
function loadJournal(plan) {
  assertPlan(plan);
  const loc = locations(plan);
  regular(loc.journal, 'RECOVERY_INVALID');
  const journal = readJson(loc.journal);
  if (journal.schema !== JOURNAL_SCHEMA || JSON.stringify(journal.plan) !== JSON.stringify(plan) || !['PREPARED', 'SWAPPED'].includes(journal.phase)) {
    fail('RECOVERY_INVALID', 'journal invalid');
  }
  return { loc, journal };
}
function restoreShortcuts(plan, loc, journal) {
  for (const [present, target, saved] of [
    [journal.desktop, plan.desktopShortcut, path.join(loc.shortcuts, 'desktop.lnk')],
    [journal.start, plan.startMenuShortcut, path.join(loc.shortcuts, 'start-menu.lnk')]
  ]) {
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    if (present) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(saved, target, fs.constants.COPYFILE_EXCL); }
  }
}
function rollback(plan) {
  const { loc, journal } = loadJournal(plan);
  try {
    if (journal.phase === 'SWAPPED' || fs.existsSync(loc.oldProgram)) {
      if (fs.existsSync(loc.program)) fs.rmSync(loc.program, { recursive: true, force: true });
      directory(loc.oldProgram, 'RECOVERY_INVALID'); fs.renameSync(loc.oldProgram, loc.program);
    }
    if (fs.existsSync(loc.uninstall)) fs.rmSync(loc.uninstall, { recursive: true, force: true });
    fs.cpSync(loc.oldUninstall, loc.uninstall, { recursive: true, force: false, errorOnExist: true });
    restoreShortcuts(plan, loc, journal);
    fs.rmSync(loc.recovery, { recursive: true, force: true });
    return { ok: true, code: 'TRANSACTION_ROLLED_BACK' };
  } catch (error) {
    if (error instanceof TransactionError) throw error;
    fail('ROLLBACK_FAILED', 'rollback incomplete');
  }
}
function commit(plan, fault = '') {
  const { loc, journal } = loadJournal(plan);
  if (journal.phase !== 'PREPARED') fail('PHASE_INVALID', 'transaction already swapped');
  validateStaged(plan);
  const currentStateFile = path.join(loc.uninstall, 'install-state.json');
  const savedStateFile = path.join(loc.oldUninstall, 'install-state.json');
  validateOldInstallState(plan, currentStateFile); validateOldInstallState(plan, savedStateFile);
  if (!fs.readFileSync(currentStateFile).equals(fs.readFileSync(savedStateFile))) fail('OLD_METADATA_INVALID', 'old install state changed after snapshot');
  try {
    fs.renameSync(loc.program, loc.oldProgram);
    if (fault === 'after-old-program') throw new Error('fault');
    fs.renameSync(plan.stagedProgram, loc.program);
    replaceJson(loc.journal, { ...journal, phase: 'SWAPPED' });
    if (fault === 'after-new-program') throw new Error('fault');
    validateStaged({ ...plan, stagedProgram: loc.program });
    for (const name of ['build-info.json', 'installer-manifest.json']) fs.copyFileSync(path.join(plan.stagedMetadata, name), path.join(loc.uninstall, name));
    const state = newInstallState(plan);
    replaceInstallState(currentStateFile, state);
    if (fault === 'after-metadata') throw new Error('fault');
    return { ok: true, code: 'TRANSACTION_SWAPPED', state };
  } catch {
    try { rollback(plan); } catch { fail('ROLLBACK_FAILED', 'commit failed and rollback incomplete'); }
    fail('COMMIT_FAILED_ROLLED_BACK', 'commit failed and old install restored');
  }
}
function finalize(plan) {
  const { loc, journal } = loadJournal(plan);
  if (journal.phase !== 'SWAPPED') fail('PHASE_INVALID', 'transaction not swapped');
  validateStaged({ ...plan, stagedProgram: loc.program });
  validateNewInstallState(plan, path.join(loc.uninstall, 'install-state.json'));
  fs.rmSync(loc.recovery, { recursive: true, force: false });
  return { ok: true, code: 'TRANSACTION_COMMITTED' };
}

module.exports = { ACCEPTED_F3_STATE, APP_VERSION, DATA_CONTRACT_VERSION, INSTALLER_VERSION, INSTALLER_METADATA, RECOVERY_NAME, TransactionError,
  commit, finalize, locations, parseStrictJson, prepare, rollback, validateOldInstallState, validateStaged };
