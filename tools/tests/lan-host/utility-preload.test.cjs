'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const network = require('../../../public-lan-network');

const BASELINE_BLOB = '4e13e944472f845675fe73d176f063c4fe97f6ed';
const IMPORT_LINE = 'Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop\n';
const source = fs.readFileSync(path.resolve(__dirname, '../../../public-lan-network.js'), 'utf8')
  .replace(/\r\n/g, '\n');
const script = network.WINDOWS_DISCOVERY_SCRIPT;
const syntheticRoot = 'C:\\Windows';
const fakeFs = {
  lstatSync(value) {
    const executable = /powershell\.exe$/i.test(value);
    return {isDirectory: () => !executable, isFile: () => executable, isSymbolicLink: () => false};
  },
  realpathSync: {native: value => value}
};
const productionOptions = {platform: 'win32', systemRoot: syntheticRoot, fs: fakeFs};

function gitBlobSha(content) {
  const bytes = Buffer.from(content);
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes).digest('hex');
}

function expectDiscoveryFailure(result, code = 'NETWORK_DISCOVERY_FAILED') {
  assert.throws(() => network.runWindowsDiscovery({...productionOptions, spawnSync: () => result}),
    error => error.code === code && !JSON.stringify(error).includes('SYNTHETIC_PRIVATE'));
}

function adapter(overrides = {}) {
  return {Name: 'Synthetic Ethernet', Description: 'Synthetic physical adapter',
    InterfaceGuid: '11111111-1111-4111-8111-111111111111', Status: 'Up',
    HardwareInterface: true, Virtual: false, MediaType: '802.3', PhysicalMediaType: '802.3',
    Address: '192.168.10.23', PrefixLength: 24, AddressState: 'Preferred',
    NetworkCategory: 'Private', HasDefaultRoute: true,
    OnLinkPrefixes: ['192.168.10.0/24'], RouteMetric: 20, ...overrides};
}

test('F01 Utility import is exact and before the first network cmdlet', () => {
  assert.equal(script.split('Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop').length, 2);
  assert.ok(script.startsWith("$ErrorActionPreference='Stop'\n" + IMPORT_LINE));
  assert.ok(script.indexOf(IMPORT_LINE) < script.indexOf('Get-Net'));
  assert.doesNotMatch(script, /Import-Module\s+(?:NetTCPIP|NetAdapter)\b/i);
});

test('F02 Utility import precedes ConvertTo-Json', () => {
  assert.ok(script.indexOf(IMPORT_LINE) < script.indexOf('ConvertTo-Json'));
});

test('F03 synthetic module-load failure remains fail closed', () => {
  expectDiscoveryFailure({status: 1, signal: null, stderr: 'SYNTHETIC_PRIVATE', stdout: ''});
});

test('F04 nonempty stderr remains rejected even with valid JSON', () => {
  expectDiscoveryFailure({status: 0, signal: null, stderr: 'SYNTHETIC_PRIVATE', stdout: '[]'});
});

test('F05 nonzero exit remains rejected', () => {
  expectDiscoveryFailure({status: 2, signal: null, stderr: '', stdout: '[]'});
});

test('F06 signal remains rejected', () => {
  expectDiscoveryFailure({status: null, signal: 'SIGTERM', stderr: '', stdout: ''});
});

test('F07 invalid JSON remains rejected', () => {
  expectDiscoveryFailure({status: 0, signal: null, stderr: '', stdout: 'SYNTHETIC_PRIVATE'});
});

test('F08 PSModulePath remains restricted to the system module directory', () => {
  let observed;
  network.runWindowsDiscovery({...productionOptions, spawnSync(_file, _args, options) {
    observed = options;
    return {status: 0, signal: null, stderr: '', stdout: '[]'};
  }});
  assert.equal(observed.env.PSModulePath,
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
  assert.equal(observed.timeout, 15000);
  assert.equal(observed.maxBuffer, 1024 * 1024);
});

test('F09 no user module path or inherited process environment', () => {
  const runtime = network.resolveSystemPowerShell(productionOptions);
  assert.deepEqual(Object.keys(runtime.environment).sort(), ['PATH', 'PSModulePath', 'SystemRoot', 'WINDIR']);
  assert.equal(runtime.environment.PATH, 'C:\\Windows\\System32');
  assert.equal(runtime.environment.PSModulePath.includes('Users'), false);
  assert.equal(runtime.environment.PSModulePath.includes('Documents'), false);
});

test('F10 removing the sole import restores the exact original production blob', () => {
  assert.equal(source.split(IMPORT_LINE).length, 2);
  assert.equal(gitBlobSha(source.replace(IMPORT_LINE, '')), BASELINE_BLOB);
});

test('F11 Public, VPN and virtual adapter rejection remains intact', () => {
  assert.equal(network.classifyAdapter(adapter()).accepted, true);
  for (const change of [{NetworkCategory: 'Public'}, {Name: 'Synthetic VPN'},
    {Virtual: true}, {Description: 'Synthetic Virtual Ethernet'}]) {
    assert.equal(network.classifyAdapter(adapter(change)).accepted, false);
  }
  assert.equal(gitBlobSha(source.replace(IMPORT_LINE, '')), BASELINE_BLOB);
});

test('F12 wildcard binding is still rejected before any listener creation', async () => {
  let attempted = false;
  await assert.rejects(network.reservePort({port: 8080,
    addresses: ['127.0.0.1', '0.0.0.0'], createServer() { attempted = true; }}),
  {code: 'LISTENER_ADDRESS_INVALID'});
  assert.equal(attempted, false);
  assert.equal(gitBlobSha(source.replace(IMPORT_LINE, '')), BASELINE_BLOB);
});
