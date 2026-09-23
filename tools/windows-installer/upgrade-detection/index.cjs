'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const UNINSTALL_KEY = String.raw`Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`;
const BINDING_KEY = String.raw`Software\KSESSION\Beta\InstallerBinding`;
const BASELINE_COMMIT = 'e9417f036d0cdf736ff84682556a994040f0de0b';
const BASELINE_TREE = '5da66cb9b73dfa307948634634bfab2cfaaead12';
const APPROVED_PROFILE_IDS = new Set(['historical-run-35514357007', 'fresh-ci-baseline']);

class Rejection extends Error {
  constructor(exitCode, code, diagnostic, reason = code) {
    super(`${code}: ${diagnostic}`);
    this.exitCode = exitCode;
    this.code = code;
    this.diagnostic = diagnostic;
    this.reason = reason;
  }
}

function reject(exitCode, code, diagnostic) {
  throw new Rejection(exitCode, code, diagnostic);
}

function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readExactJSON(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('not a regular file');
  const bytes = fs.readFileSync(file);
  return {bytes, value: JSON.parse(bytes.toString('utf8'))};
}

function exactKeys(object, keys) {
  return object && typeof object === 'object' && !Array.isArray(object) &&
    Object.keys(object).sort().join('\0') === [...keys].sort().join('\0');
}

function validatePolicy(policy) {
  if (!exactKeys(policy, [
    'schema', 'appId', 'uninstallKey', 'bindingKey', 'fromInstallerVersion',
    'targetInstallerVersion', 'appVersion', 'dataContractVersion',
    'allowLegacyMissingDataContract', 'sourceCommit', 'sourceTree',
    'programManifestSha256', 'programInventorySha256',
    'runtimeManifestSha256', 'launcherSha256', 'buildInfoSha256'
  ])) reject(40, 'POLICY_INVALID', '可信策略字段集合无效。');
  if (policy.schema !== 1 || policy.appId !== 'KSESSION-Beta-Installer-v1' ||
      policy.uninstallKey !== UNINSTALL_KEY || policy.bindingKey !== BINDING_KEY ||
      policy.fromInstallerVersion !== '1.1.0-beta.1' ||
      policy.targetInstallerVersion !== '1.1.0-beta.2' ||
      policy.appVersion !== '1.0.0' || policy.dataContractVersion !== 1 ||
      policy.allowLegacyMissingDataContract !== true ||
      !COMMIT.test(policy.sourceCommit) || !COMMIT.test(policy.sourceTree) ||
      policy.sourceCommit !== BASELINE_COMMIT || policy.sourceTree !== BASELINE_TREE) {
    reject(40, 'POLICY_INVALID', '可信策略的固定版本或源码契约无效。');
  }
  for (const field of ['programManifestSha256', 'programInventorySha256', 'runtimeManifestSha256', 'launcherSha256', 'buildInfoSha256']) {
    if (!SHA.test(policy[field])) reject(40, 'POLICY_INVALID', '可信策略缺少固定构建哈希。');
  }
}

function policyFingerprint(policy) {
  validatePolicy(policy);
  const ordered = [
    policy.schema, policy.appId, policy.uninstallKey, policy.bindingKey,
    policy.fromInstallerVersion, policy.targetInstallerVersion, policy.appVersion,
    policy.dataContractVersion, policy.allowLegacyMissingDataContract,
    policy.sourceCommit, policy.sourceTree, policy.programManifestSha256,
    policy.programInventorySha256, policy.runtimeManifestSha256,
    policy.launcherSha256, policy.buildInfoSha256
  ];
  return sha(Buffer.from(JSON.stringify(ordered)));
}

function validateBundle(bundle) {
  if (!exactKeys(bundle, ['schema', 'profiles']) || bundle.schema !== 1 ||
      !Array.isArray(bundle.profiles) || bundle.profiles.length < 1 || bundle.profiles.length > 2) {
    reject(41, 'BUNDLE_INVALID', '受信任身份集合结构或数量无效。');
  }
  const ids = new Set();
  const fingerprints = new Set();
  const coveredSources = new Set();
  for (const profile of bundle.profiles) {
    if (!exactKeys(profile, ['id', 'sources', 'policy']) || !APPROVED_PROFILE_IDS.has(profile.id) || ids.has(profile.id) ||
        !Array.isArray(profile.sources) || profile.sources.length < 1 || profile.sources.length > 2 || profile.sources[0] !== profile.id) {
      reject(41, 'BUNDLE_INVALID', '受信任身份 profile 名称无效或重复。');
    }
    ids.add(profile.id);
    for (const source of profile.sources) {
      if (!APPROVED_PROFILE_IDS.has(source) || coveredSources.has(source)) {
        reject(41, 'BUNDLE_INVALID', '受信任身份来源缺失、未知或重复。');
      }
      coveredSources.add(source);
    }
    const fingerprint = policyFingerprint(profile.policy);
    if (fingerprints.has(fingerprint)) {
      reject(41, 'BUNDLE_DUPLICATE_IDENTITY', '受信任身份集合包含重复完整锚。');
    }
    fingerprints.add(fingerprint);
  }
  if (coveredSources.size !== APPROVED_PROFILE_IDS.size ||
      [...APPROVED_PROFILE_IDS].some(source => !coveredSources.has(source)) ||
      (bundle.profiles.length === 1 && bundle.profiles[0].sources.join('\0') !== [...APPROVED_PROFILE_IDS].join('\0')) ||
      (bundle.profiles.length === 2 && bundle.profiles.some(profile => profile.sources.length !== 1))) {
    reject(41, 'BUNDLE_INCOMPLETE', '受信任身份集合未完整覆盖两个批准来源。');
  }
}

function normalizeLocal(value) {
  if (typeof value !== 'string' || !/^[A-Za-z]:\\/.test(value) || value.includes('\0')) {
    reject(24, 'PATH_UNSAFE', '安装目录或实例目录不是规范的本地绝对路径。');
  }
  const normalized = path.win32.normalize(value).replace(/[\\/]+$/, '');
  if (normalized.toLowerCase() !== value.replace(/[\\/]+$/, '').toLowerCase() || normalized.length < 4) {
    reject(24, 'PATH_UNSAFE', '安装目录或实例目录不是规范的本地绝对路径。');
  }
  return normalized;
}

function within(parent, child) {
  const p = parent.toLowerCase();
  const c = child.toLowerCase();
  return c === p || c.startsWith(p + '\\');
}

function volumeNormalizedPath(value) {
  const normalized = path.normalize(value);
  const volumeRoot = path.parse(normalized).root;
  const physicalRoot = fs.realpathSync.native(volumeRoot);
  return path.resolve(physicalRoot, path.relative(volumeRoot, normalized));
}

function ensureNoReparse(realPath) {
  let current = path.resolve(realPath);
  for (;;) {
    let info;
    try { info = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT') reject(24, 'PATH_REPARSE', '目录链无法安全检查。');
      info = null;
    }
    if (info?.isSymbolicLink()) reject(24, 'PATH_REPARSE', '目录链包含重解析点。');
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (fs.existsSync(realPath)) {
    const resolved = fs.realpathSync.native(realPath);
    if (path.resolve(resolved).toLowerCase() !== volumeNormalizedPath(realPath).toLowerCase()) {
      reject(24, 'PATH_REPARSE', '目录链包含重解析点。');
    }
  }
}

function validatePaths(root, instance) {
  let physicalRoot, physicalInstance;
  try { physicalRoot = volumeNormalizedPath(root); physicalInstance = volumeNormalizedPath(instance); }
  catch { reject(24, 'PATH_UNSAFE', '无法确认程序目录与实例目录的本地卷身份。'); }
  if (within(physicalRoot, physicalInstance) || within(physicalInstance, physicalRoot)) reject(24, 'PATH_OVERLAP', '程序目录与实例目录交叠。');
  const actual = {root, instance};
  ensureNoReparse(actual.root);
  ensureNoReparse(actual.instance);
  for (const [value, code, diagnostic] of [[actual.root, 'INSTALL_ROOT_MISSING', '登记程序目录不可用。'], [actual.instance, 'INSTANCE_MISSING', '绑定实例目录不可用。']]) {
    let info;
    try { info = fs.statSync(value); } catch { reject(code === 'INSTALL_ROOT_MISSING' ? 24 : 23, code, diagnostic); }
    if (!info.isDirectory()) reject(code === 'INSTALL_ROOT_MISSING' ? 24 : 23, code, diagnostic);
  }
  return actual;
}

function parseBinding(bytes) {
  if (bytes.length < 2 || bytes.length % 2 !== 0 || bytes[0] !== 0xff || bytes[1] !== 0xfe) {
    reject(23, 'BINDING_FILE_INVALID', '磁盘 binding 编码无效。');
  }
  const text = bytes.subarray(2).toString('utf16le').replaceAll('\r\n', '\n');
  let section = '';
  const values = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    if (line.startsWith('[') && line.endsWith(']')) { section = line.slice(1, -1); continue; }
    if (section !== 'Installation') continue;
    const separator = line.indexOf('=');
    if (separator < 1) reject(23, 'BINDING_FILE_INVALID', '磁盘 binding 格式无效。');
    const key = line.slice(0, separator).trim();
    if (Object.hasOwn(values, key)) reject(23, 'BINDING_FILE_INVALID', '磁盘 binding 含重复字段。');
    values[key] = line.slice(separator + 1).trim();
  }
  return values;
}

function strictUninstaller(command, expected) {
  if (typeof command !== 'string') return false;
  const quoted = command.match(/^"([^"]+)"$/);
  return (quoted ? quoted[1] : command).toLowerCase() === expected.toLowerCase();
}

function safeManifestPath(relative) {
  if (typeof relative !== 'string' || relative.length === 0 || relative.includes('\\') || relative.includes('\0')) return false;
  const clean = path.posix.normalize(relative);
  if (clean !== relative || clean === '..' || clean.startsWith('../') || path.posix.isAbsolute(clean)) return false;
  return clean.split('/').every(part => part && !/[\x00-\x1f<>:"|?*]/.test(part) && !/[. ]$/.test(part) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}

function inventory(root) {
  const files = [];
  function walk(directory, prefix = '') {
    const entries = fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(directory, entry.name);
      const info = fs.lstatSync(full);
      if (info.isSymbolicLink()) reject(27, 'PROGRAM_TAMPERED', '程序目录包含重解析文件。');
      if (info.isDirectory()) walk(full, relative);
      else if (info.isFile()) files.push({path: relative, bytes: info.size, sha256: sha(fs.readFileSync(full))});
      else reject(27, 'PROGRAM_TAMPERED', '程序目录包含非常规文件。');
    }
  }
  walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

function verifyProgram(root, manifest) {
  if (!Array.isArray(manifest.payload) || manifest.payload.length === 0) reject(26, 'MANIFEST_INVALID', '安装 manifest 文件清单为空。');
  const keys = new Set();
  for (const item of manifest.payload) {
    if (!exactKeys(item, ['path', 'bytes', 'sha256']) || !safeManifestPath(item.path) ||
        !Number.isSafeInteger(item.bytes) || item.bytes < 0 || !SHA.test(item.sha256)) {
      reject(26, 'MANIFEST_INVALID', '安装 manifest 含无效路径或哈希。');
    }
    const key = item.path.toLowerCase();
    if (keys.has(key)) reject(26, 'MANIFEST_INVALID', '安装 manifest 含重复路径。');
    keys.add(key);
  }
  const actual = inventory(root);
  if (JSON.stringify(actual) !== JSON.stringify(manifest.payload)) {
    reject(27, 'PROGRAM_TAMPERED', '程序文件集合或内容与可信清单不一致。');
  }
}

function validateSnapshotShape(snapshot) {
  if (!exactKeys(snapshot, ['registrations', 'bindings']) || !Array.isArray(snapshot.registrations) || !Array.isArray(snapshot.bindings)) {
    reject(22, 'SNAPSHOT_INVALID', '登记快照结构无效。');
  }
}

function validate(snapshot, policy) {
  validatePolicy(policy);
  validateSnapshotShape(snapshot);
  if (snapshot.registrations.length !== 1) reject(20, 'REGISTRATION_COUNT', '未找到唯一受支持的安装登记。');
  if (snapshot.bindings.length !== 1) reject(23, 'BINDING_COUNT', '未找到唯一受支持的安装绑定。');
  const registration = snapshot.registrations[0];
  const binding = snapshot.bindings[0];
  if (!exactKeys(registration, ['view', 'key', 'displayName', 'displayVersion', 'installLocation', 'uninstallString']) ||
      !exactKeys(binding, ['view', 'key', 'installRoot', 'instance'])) {
    reject(22, 'SNAPSHOT_INVALID', '登记快照字段集合无效。');
  }
  if (!['64', '32'].includes(registration.view) || registration.view !== binding.view ||
      registration.key !== policy.uninstallKey || binding.key !== policy.bindingKey) {
    reject(22, 'REGISTRATION_CONFLICT', '安装登记与绑定来源冲突。');
  }
  if (registration.displayName !== 'K⁺-SESSION Beta' || registration.displayVersion !== policy.fromInstallerVersion) {
    reject(21, 'VERSION_UNSUPPORTED', '已安装版本不是唯一批准的 beta.1 来源。');
  }
  const root = normalizeLocal(registration.installLocation);
  const instance = normalizeLocal(binding.instance);
  if (root.toLowerCase() !== normalizeLocal(binding.installRoot).toLowerCase()) {
    reject(23, 'BINDING_CONFLICT', '登记安装目录与绑定目录不一致。');
  }
  const actual = validatePaths(root, instance);
  const uninstallDir = path.join(actual.root, 'uninstall');
  ensureNoReparse(uninstallDir);
  const uninstaller = path.join(uninstallDir, 'unins000.exe');
  const expectedWinUninstaller = path.win32.join(root, 'uninstall', 'unins000.exe');
  if (!strictUninstaller(registration.uninstallString, expectedWinUninstaller)) {
    reject(22, 'UNINSTALL_METADATA_INVALID', '卸载命令与登记目录不一致。');
  }
  let uninstallerInfo;
  try { uninstallerInfo = fs.lstatSync(uninstaller); } catch { reject(22, 'UNINSTALL_METADATA_INVALID', '卸载程序缺失。'); }
  if (!uninstallerInfo.isFile() || uninstallerInfo.isSymbolicLink()) reject(22, 'UNINSTALL_METADATA_INVALID', '卸载程序不是普通文件。');

  let bindingValues;
  try {
    const bindingFile = path.join(uninstallDir, 'instance-binding.ini');
    const bindingInfo = fs.lstatSync(bindingFile);
    if (!bindingInfo.isFile() || bindingInfo.isSymbolicLink()) throw new Error('not a regular file');
    bindingValues = parseBinding(fs.readFileSync(bindingFile));
  }
  catch (error) { if (error instanceof Rejection) throw error; reject(23, 'BINDING_FILE_INVALID', '无法读取磁盘 binding。'); }
  if (!exactKeys(bindingValues, ['Schema', 'InstallRoot', 'Instance']) || bindingValues.Schema !== '1' ||
      normalizeLocal(bindingValues.InstallRoot).toLowerCase() !== root.toLowerCase() ||
      normalizeLocal(bindingValues.Instance).toLowerCase() !== instance.toLowerCase()) {
    reject(23, 'BINDING_FILE_INVALID', '磁盘 binding 与登记不一致。');
  }

  let manifestRecord;
  try { manifestRecord = readExactJSON(path.join(uninstallDir, 'installer-manifest.json')); }
  catch { reject(26, 'MANIFEST_UNTRUSTED', '安装 manifest 缺失或无法解析。'); }
  if (sha(manifestRecord.bytes) !== policy.programManifestSha256) {
    reject(26, 'MANIFEST_UNTRUSTED', '安装 manifest 不匹配 beta.2 内置可信锚。');
  }
  const manifest = manifestRecord.value;
  if (!exactKeys(manifest, ['schema', 'sourceCommit', 'sourceTree', 'payload', 'payloadInventorySha256', 'version']) ||
      manifest.schema !== 1 || manifest.sourceCommit !== policy.sourceCommit || manifest.sourceTree !== policy.sourceTree ||
      manifest.version !== policy.fromInstallerVersion || manifest.payloadInventorySha256 !== policy.programInventorySha256 ||
      sha(Buffer.from(JSON.stringify(manifest.payload))) !== manifest.payloadInventorySha256) {
    reject(26, 'MANIFEST_IDENTITY_INVALID', '安装 manifest 的版本或源码身份不匹配。');
  }
  verifyProgram(path.join(actual.root, 'program'), manifest);

  let buildRecord;
  try { buildRecord = readExactJSON(path.join(uninstallDir, 'build-info.json')); }
  catch { reject(30, 'BUILD_IDENTITY_UNTRUSTED', '构建身份缺失或无法解析。'); }
  if (sha(buildRecord.bytes) !== policy.buildInfoSha256) reject(30, 'BUILD_IDENTITY_UNTRUSTED', '构建身份不匹配可信锚。');
  const build = buildRecord.value;
  for (const [field, expected] of Object.entries({installerVersion: policy.fromInstallerVersion, appVersion: policy.appVersion,
    sourceCommit: policy.sourceCommit, sourceTree: policy.sourceTree, runtimeManifestSha256: policy.runtimeManifestSha256,
    launcherSha256: policy.launcherSha256})) {
    if (build[field] !== expected) reject(30, 'BUILD_IDENTITY_INVALID', '构建身份字段矛盾。');
  }
  if (build.dataContractVersion === undefined) {
    if (!policy.allowLegacyMissingDataContract || build.sourceCommit !== policy.sourceCommit) reject(30, 'DATA_CONTRACT_UNKNOWN', '无法绑定旧版缺失的数据契约。');
  } else if (build.dataContractVersion !== policy.dataContractVersion) {
    reject(30, 'DATA_CONTRACT_UNSUPPORTED', '旧安装声明了不受支持的数据契约。');
  }

  let runtimeRecord;
  try { runtimeRecord = readExactJSON(path.join(actual.root, 'program', 'manifest', 'runtime-manifest.json')); }
  catch { reject(28, 'RUNTIME_IDENTITY_UNTRUSTED', 'Runtime manifest 缺失或无法解析。'); }
  if (sha(runtimeRecord.bytes) !== policy.runtimeManifestSha256) reject(28, 'RUNTIME_IDENTITY_UNTRUSTED', 'Runtime manifest 不匹配可信锚。');
  const runtime = runtimeRecord.value;
  if (runtime.format !== 'k-session-runtime' || runtime.manifestSchema !== 1 || runtime.version !== policy.appVersion ||
      runtime.platform !== 'win32-x64' || runtime.sourceCommit !== policy.sourceCommit || runtime.sourceTree !== policy.sourceTree ||
      runtime.build?.toolCommit !== policy.sourceCommit || runtime.businessDataIncluded !== false || runtime.launcherIncluded !== false) {
    reject(28, 'RUNTIME_IDENTITY_INVALID', 'Runtime manifest 身份字段矛盾。');
  }
  if (sha(fs.readFileSync(path.join(actual.root, 'program', 'K-SESSION.exe'))) !== policy.launcherSha256) {
    reject(29, 'LAUNCHER_IDENTITY_INVALID', 'Launcher 不匹配可信锚。');
  }
  return {status: 'PASS', code: 'ELIGIBLE_BETA1', fromInstallerVersion: policy.fromInstallerVersion,
    targetInstallerVersion: policy.targetInstallerVersion, installRoot: root, instancePath: instance,
    dataContractVersion: policy.dataContractVersion};
}

function validateApprovedIdentity(snapshot, bundle) {
  validateBundle(bundle);
  const matches = [];
  const stages = new Map([
    ['REGISTRATION_COUNT', 0], ['VERSION_UNSUPPORTED', 0], ['SNAPSHOT_INVALID', 0], ['REGISTRATION_CONFLICT', 0], ['UNINSTALL_METADATA_INVALID', 0],
    ['BINDING_COUNT', 1], ['BINDING_CONFLICT', 1], ['BINDING_FILE_INVALID', 1],
    ['PATH_UNSAFE', 2], ['PATH_REPARSE', 2], ['PATH_OVERLAP', 2],
    ['MANIFEST_UNTRUSTED', 3], ['MANIFEST_INVALID', 3], ['MANIFEST_IDENTITY_INVALID', 3], ['PROGRAM_TAMPERED', 4],
    ['BUILD_IDENTITY_UNTRUSTED', 5], ['BUILD_IDENTITY_INVALID', 5], ['DATA_CONTRACT_UNKNOWN', 5], ['DATA_CONTRACT_UNSUPPORTED', 5],
    ['RUNTIME_IDENTITY_UNTRUSTED', 6], ['RUNTIME_IDENTITY_INVALID', 6], ['LAUNCHER_IDENTITY_INVALID', 7]
  ]);
  const names = ['REGISTRATION', 'BINDING', 'PATH', 'MANIFEST', 'PROGRAM', 'BUILD', 'RUNTIME', 'LAUNCHER'];
  let deepest = -1;
  for (const profile of bundle.profiles) {
    try {
      matches.push({profileId: profile.id, result: validate(snapshot, profile.policy)});
    } catch (error) {
      // Do not reveal which exact anchor failed or why when matching an approved set.
      const stage = error instanceof Rejection ? stages.get(error.code) : undefined;
      if (stage !== undefined && stage > deepest) deepest = stage;
    }
  }
  if (matches.length === 0) throw new Rejection(31, 'IDENTITY_NOT_APPROVED', '已安装 beta.1 不匹配任何已批准的精确身份。',
    deepest >= 0 ? `IDENTITY_${names[deepest]}` : 'IDENTITY_INTERNAL');
  if (matches.length !== 1) reject(41, 'BUNDLE_AMBIGUOUS', '受信任身份集合产生不唯一匹配。');
  return {...matches[0].result, profileId: matches[0].profileId};
}

module.exports = {BINDING_KEY, Rejection, UNINSTALL_KEY, inventory, policyFingerprint, sha,
  validate, validateApprovedIdentity, validateBundle, validatePolicy};
