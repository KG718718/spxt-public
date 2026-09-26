'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { inventory } = require('../../windows-runtime/common.cjs');

const INSTALLER_VERSION = '1.1.0-beta.2';
const APP_VERSION = '1.0.0';
const DATA_CONTRACT_VERSION = 1;
const JOURNAL_SCHEMA = 1;
const RECOVERY_NAME = '.ksession-upgrade-recovery-v1';
const INSTALLER_METADATA = Object.freeze(['LICENSE-Inno-Setup.txt', 'build-info.json', 'installer-manifest.json',
  'instance-binding.ini', 'unins000.dat', 'unins000.exe']);

class TransactionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) { throw new TransactionError(code, message); }
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
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
function assertPlan(plan) {
  const keys = ['schema', 'installRoot', 'instancePath', 'stagedProgram', 'stagedMetadata', 'desktopShortcut',
    'startMenuShortcut', 'sourceCommit', 'runtimeManifestHash', 'launcherHash', 'programManifestHash',
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
  if (plan.upgradeFrom !== '1.1.0-beta.1' || plan.upgradeTo !== INSTALLER_VERSION ||
      plan.instanceBindingSchema !== 1 || !/^[a-f0-9]{40}$/.test(plan.sourceCommit) ||
      ![plan.runtimeManifestHash, plan.launcherHash, plan.programManifestHash].every(value => /^[a-f0-9]{64}$/.test(value))) {
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
function validateStaged(plan) {
  directory(plan.stagedProgram, 'STAGE_INVALID');
  directory(plan.stagedMetadata, 'STAGE_INVALID');
  const manifestFile = path.join(plan.stagedMetadata, 'installer-manifest.json');
  const buildFile = path.join(plan.stagedMetadata, 'build-info.json');
  regular(manifestFile, 'STAGE_INVALID'); regular(buildFile, 'STAGE_INVALID');
  const manifestBytes = fs.readFileSync(manifestFile);
  if (sha(manifestBytes) !== plan.programManifestHash) fail('STAGE_IDENTITY', 'program manifest hash mismatch');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const build = readJson(buildFile);
  if (manifest.schema !== 1 || manifest.version !== INSTALLER_VERSION || manifest.sourceCommit !== plan.sourceCommit ||
      !Array.isArray(manifest.payload) || sha(Buffer.from(JSON.stringify(manifest.payload))) !== manifest.payloadInventorySha256 ||
      JSON.stringify(inventory(plan.stagedProgram)) !== JSON.stringify(manifest.payload)) fail('STAGE_PAYLOAD', 'staged program mismatch');
  if (build.installerVersion !== INSTALLER_VERSION || build.appVersion !== APP_VERSION ||
      build.dataContractVersion !== DATA_CONTRACT_VERSION || build.sourceCommit !== plan.sourceCommit ||
      build.runtimeManifestSha256 !== plan.runtimeManifestHash || build.launcherSha256 !== plan.launcherHash ||
      build.programManifestHash !== plan.programManifestHash || build.instanceBindingSchema !== 1) fail('STAGE_IDENTITY', 'build identity mismatch');
  const runtime = path.join(plan.stagedProgram, 'manifest', 'runtime-manifest.json');
  const launcher = path.join(plan.stagedProgram, 'K-SESSION.exe');
  regular(runtime, 'STAGE_INVALID'); regular(launcher, 'STAGE_INVALID');
  if (sha(fs.readFileSync(runtime)) !== plan.runtimeManifestHash || sha(fs.readFileSync(launcher)) !== plan.launcherHash) {
    fail('STAGE_IDENTITY', 'runtime or launcher mismatch');
  }
  return { manifest, build };
}
function prepare(plan) {
  assertPlan(plan);
  if (fs.existsSync(plan.stagedProgram) || fs.existsSync(plan.stagedMetadata)) validateStaged(plan);
  const loc = locations(plan);
  directory(plan.installRoot, 'INSTALL_ROOT_INVALID'); directory(loc.program, 'OLD_PROGRAM_INVALID'); directory(loc.uninstall, 'OLD_METADATA_INVALID');
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
  try {
    fs.renameSync(loc.program, loc.oldProgram);
    if (fault === 'after-old-program') throw new Error('fault');
    fs.renameSync(plan.stagedProgram, loc.program);
    replaceJson(loc.journal, { ...journal, phase: 'SWAPPED' });
    if (fault === 'after-new-program') throw new Error('fault');
    validateStaged({ ...plan, stagedProgram: loc.program });
    for (const name of ['build-info.json', 'installer-manifest.json']) fs.copyFileSync(path.join(plan.stagedMetadata, name), path.join(loc.uninstall, name));
    const state = {
      schema: 1, installerVersion: INSTALLER_VERSION, appVersion: APP_VERSION, dataContractVersion: DATA_CONTRACT_VERSION,
      sourceCommit: plan.sourceCommit, runtimeManifestHash: plan.runtimeManifestHash, launcherHash: plan.launcherHash,
      programManifestHash: plan.programManifestHash, instanceBindingSchema: plan.instanceBindingSchema,
      installRoot: plan.installRoot, instancePath: plan.instancePath, upgradeFrom: plan.upgradeFrom, upgradeTo: plan.upgradeTo
    };
    fs.writeFileSync(path.join(loc.uninstall, 'install-state.json'), JSON.stringify(state, null, 2) + '\n', { flag: 'wx' });
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
  regular(path.join(loc.uninstall, 'install-state.json'), 'FINAL_STATE_INVALID');
  fs.rmSync(loc.recovery, { recursive: true, force: false });
  return { ok: true, code: 'TRANSACTION_COMMITTED' };
}

module.exports = { APP_VERSION, DATA_CONTRACT_VERSION, INSTALLER_VERSION, INSTALLER_METADATA, RECOVERY_NAME, TransactionError,
  commit, finalize, locations, prepare, rollback, validateStaged };
