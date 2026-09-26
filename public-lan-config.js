'use strict';

const fsDefault = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {PORT_MIN, PORT_MAX, adapterId} = require('./public-lan-network');

const CONFIG_FILENAME = 'lan-deployment.json';
const KEYS = Object.freeze(['schema', 'port', 'adapterPreference']);

class LanConfigError extends Error {
  constructor(code, message) { super(message); this.name = 'LanConfigError'; this.code = code; }
}

function fail(code, message) { throw new LanConfigError(code, message); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

function validateLanConfig(value) {
  if (!record(value) || Object.keys(value).length !== KEYS.length || KEYS.some(key => !Object.hasOwn(value, key))
      || value.schema !== 1 || !Number.isInteger(value.port) || value.port < PORT_MIN || value.port > PORT_MAX
      || adapterId(value.adapterPreference) !== value.adapterPreference) {
    fail('LAN_CONFIG_INVALID', 'LAN 配置损坏或结构非法；原文件不会被覆盖。');
  }
  return Object.freeze({schema: 1, port: value.port, adapterPreference: value.adapterPreference});
}

function safeInstance(instanceDirectory, fs) {
  if (typeof instanceDirectory !== 'string' || !path.isAbsolute(instanceDirectory)) fail('LAN_CONFIG_PATH_INVALID', '必须提供绝对 instance 路径。');
  const resolved = path.resolve(instanceDirectory);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { fail('LAN_CONFIG_PATH_INVALID', 'instance 目录不存在或不可读取。'); }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('LAN_CONFIG_PATH_INVALID', 'instance 必须是真实目录，不能使用链接。');
  let physical;
  try { physical = fs.realpathSync.native ? fs.realpathSync.native(resolved) : fs.realpathSync(resolved); }
  catch { fail('LAN_CONFIG_PATH_INVALID', 'instance 真实路径无法确认。'); }
  if (path.resolve(physical).toLowerCase() !== resolved.toLowerCase()) fail('LAN_CONFIG_PATH_INVALID', 'instance 路径包含链接或重解析点。');
  return resolved;
}

function readSource(file, fs) {
  let stat;
  try { stat = fs.lstatSync(file); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    fail('LAN_CONFIG_UNREADABLE', 'LAN 配置不可读取，LAN 已保持关闭。');
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail('LAN_CONFIG_UNREADABLE', 'LAN 配置必须是独立普通文件，不能使用链接。');
  try {
    const source = fs.readFileSync(file, 'utf8');
    const after = fs.lstatSync(file);
    if (!after.isFile() || after.isSymbolicLink() || after.nlink !== 1 || after.dev !== stat.dev || after.ino !== stat.ino) {
      fail('LAN_CONFIG_UNREADABLE', 'LAN 配置读取期间发生变化，LAN 已保持关闭。');
    }
    return source;
  }
  catch { fail('LAN_CONFIG_UNREADABLE', 'LAN 配置读取失败，LAN 已保持关闭。'); }
}

function parseSource(source) {
  if (source === null) return null;
  try { return validateLanConfig(JSON.parse(source)); }
  catch (error) {
    if (error instanceof LanConfigError) throw error;
    fail('LAN_CONFIG_INVALID', 'LAN 配置损坏或结构非法；原文件不会被覆盖。');
  }
}

function createLanConfigStore(options = {}) {
  const fs = options.fs || fsDefault;
  const directory = safeInstance(options.instanceDirectory, fs);
  const file = path.join(directory, CONFIG_FILENAME);
  let source = readSource(file, fs);
  let state = parseSource(source);

  function unchanged() {
    if (readSource(file, fs) !== source) fail('LAN_CONFIG_EXTERNAL_CHANGE', 'LAN 配置已被其他操作修改，请重新加载。');
  }

  function save(nextValue) {
    const next = validateLanConfig(nextValue);
    unchanged();
    const serialized = JSON.stringify(next, null, 2) + '\n';
    const temporary = path.join(directory, '.lan-deployment-' + crypto.randomUUID() + '.tmp');
    let descriptor;
    let owned = false;
    try {
      safeInstance(directory, fs);
      descriptor = fs.openSync(temporary, 'wx', 0o600); owned = true;
      fs.writeFileSync(descriptor, serialized, 'utf8'); fs.fsyncSync(descriptor);
      fs.closeSync(descriptor); descriptor = undefined;
      if (fs.readFileSync(temporary, 'utf8') !== serialized) throw Error('staged bytes differ');
      unchanged();
      fs.renameSync(temporary, file); owned = false;
    } catch (error) {
      if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch {} }
      if (owned) { try { fs.unlinkSync(temporary); } catch {} }
      if (error instanceof LanConfigError) throw error;
      fail('LAN_CONFIG_SAVE_FAILED', 'LAN 配置保存失败；原配置保持不变。');
    }
    source = serialized;
    state = next;
    return state;
  }

  return Object.freeze({file, load: () => state, save});
}

module.exports = {CONFIG_FILENAME, LanConfigError, validateLanConfig, createLanConfigStore};
