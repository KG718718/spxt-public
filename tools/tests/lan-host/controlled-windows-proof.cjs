'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const production = require('../../../public-lan-network');

const root = path.resolve(__dirname, '../../..');
const KEYS = Object.freeze(['schema', 'status', 'platform', 'reason', 'sourceCommit',
  'productionNetworkBlobSha256', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08',
  'privateCandidatePresent']);
const REASONS = new Set(['PASS', 'PLATFORM_UNSUPPORTED', 'SYSTEM_RUNTIME_INVALID',
  'DISCOVERY_COMMAND_FAILED', 'DISCOVERY_RECORDS_INVALID', 'DISCOVERY_SHAPE_INVALID',
  'NO_PRIVATE_CANDIDATE', 'SYNTHETIC_RULE_FAILED', 'LISTENER_ATTEMPTED',
  'NETWORK_STATE_CHANGED', 'INTERNAL']);

function gitIdentity() {
  const sourceCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'],
    {encoding: 'utf8', windowsHide: true, timeout: 10000}).trim().toLowerCase();
  assert.match(sourceCommit, /^[a-f0-9]{40}$/);
  const productionNetworkBlobSha256 = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(root, 'public-lan-network.js'))).digest('hex');
  return {sourceCommit, productionNetworkBlobSha256};
}

function emptyReport(identity) {
  return {schema: 1, status: 'FAIL', platform: 'WINDOWS_10', reason: 'INTERNAL', ...identity,
    P01: false, P02: false, P03: false, P04: false, P05: false, P06: false,
    P07: false, P08: false, privateCandidatePresent: false};
}

function fixedReason(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return ({NETWORK_SYSTEM_RUNTIME_INVALID: 'SYSTEM_RUNTIME_INVALID',
    NETWORK_DISCOVERY_FAILED: 'DISCOVERY_COMMAND_FAILED',
    NETWORK_DISCOVERY_INVALID: 'DISCOVERY_RECORDS_INVALID'})[code] || 'INTERNAL';
}

function syntheticRules(network) {
  const id = '12345678-1234-1234-1234-123456789abc';
  const base = {Name: 'Synthetic Ethernet', Description: 'Synthetic physical fixture', InterfaceGuid: id,
    InterfaceIndex: 7, Status: 'Up', HardwareInterface: true, Virtual: false, MediaType: '802.3',
    PhysicalMediaType: 'Ethernet', Address: '192.168.44.10', PrefixLength: 24, AddressState: 'Preferred',
    NetworkCategory: 'Private', HasDefaultRoute: true, OnLinkPrefixes: ['192.168.44.0/24'], RouteMetric: 10};
  return network.selectLanAdapter([base]).status === 'SELECTED'
    && ['Hyper-V virtual adapter', 'VPN tunnel adapter'].every(description =>
      network.selectLanAdapter([{...base, Virtual: description.startsWith('Hyper'), Description: description}]).status === 'NO_PRIVATE_LAN');
}

function privateBoundaries(network) {
  return ['10.0.0.1', '172.16.0.1', '172.31.255.254', '192.168.1.2'].every(address => !!network.privateBlock(address))
    && ['172.15.255.255', '172.32.0.1', '127.0.0.1', '169.254.1.1', '8.8.8.8', '0.0.0.0'].every(address => !network.privateBlock(address));
}

function validDiscovery(result, network) {
  if (!result || !['NO_PRIVATE_LAN', 'MULTIPLE_LAN_ADAPTERS', 'SELECTED', 'NETWORK_CHANGED'].includes(result.status)
      || !Object.hasOwn(result, 'selected') || !Array.isArray(result.candidates)) return false;
  if (result.status === 'SELECTED' && !result.selected) return false;
  if (result.status === 'NO_PRIVATE_LAN' && (result.selected !== null || result.candidates.length !== 0)) return false;
  return result.candidates.every(candidate => candidate && typeof candidate.adapterId === 'string'
    && typeof candidate.name === 'string' && !!network.subnetFor(candidate.address, candidate.prefixLength)
    && typeof candidate.subnet === 'string');
}

function runProof(options = {}) {
  const network = options.network || production;
  const identity = options.identity || gitIdentity();
  const report = emptyReport(identity);
  const platform = options.platform || process.platform;
  const release = options.release || os.release();
  if (platform !== 'win32' || !/^10\.0\.19045(?:\.|$)/.test(release)) {
    report.reason = 'PLATFORM_UNSUPPORTED'; return report;
  }
  let before;
  let listenerAttempts = 0;
  const oldNetCreate = net.createServer;
  const oldHttpCreate = http.createServer;
  net.createServer = () => {listenerAttempts += 1; throw Error('proof listener forbidden');};
  http.createServer = () => {listenerAttempts += 1; throw Error('proof listener forbidden');};
  try {
    try { network.resolveSystemPowerShell(); report.P01 = true; }
    catch (error) { report.reason = fixedReason(error); return report; }
    try { before = network.runWindowsDiscovery(); report.P02 = true; }
    catch (error) { report.reason = fixedReason(error); return report; }
    if (!Array.isArray(before)) {report.reason = 'DISCOVERY_RECORDS_INVALID'; return report;}
    report.P03 = true;
    let selected;
    try { selected = network.discoverWindowsLan(); }
    catch (error) { report.reason = fixedReason(error); return report; }
    if (!validDiscovery(selected, network)) {report.reason = 'DISCOVERY_SHAPE_INVALID'; return report;}
    report.P04 = true;
    report.privateCandidatePresent = selected.candidates.length > 0;
    if (!syntheticRules(network) || !privateBoundaries(network)) {report.reason = 'SYNTHETIC_RULE_FAILED'; return report;}
    report.P05 = true; report.P06 = true;
    if (listenerAttempts !== 0) {report.reason = 'LISTENER_ATTEMPTED'; return report;}
    report.P07 = true;
    let after;
    try {after = network.runWindowsDiscovery();}
    catch (error) {report.reason = fixedReason(error); return report;}
    const script = network.WINDOWS_DISCOVERY_SCRIPT;
    if (!Array.isArray(after) || JSON.stringify(before) !== JSON.stringify(after)
        || typeof script !== 'string' || /\b(?:Set|New|Remove|Restart|Disable|Enable)-Net\w*/i.test(script)) {
      report.reason = 'NETWORK_STATE_CHANGED'; return report;
    }
    report.P08 = true;
    if (!report.privateCandidatePresent) {report.reason = 'NO_PRIVATE_CANDIDATE'; return report;}
    report.status = 'PASS'; report.reason = 'PASS';
    return report;
  } finally {
    net.createServer = oldNetCreate; http.createServer = oldHttpCreate;
    if (listenerAttempts !== 0) {report.P07 = false; report.status = 'FAIL'; report.reason = 'LISTENER_ATTEMPTED';}
  }
}

function validateReport(report, expectedIdentity) {
  assert.deepEqual(Object.keys(report).sort(), [...KEYS].sort());
  assert.equal(report.schema, 1); assert.equal(report.platform, 'WINDOWS_10');
  assert.ok(['PASS', 'FAIL'].includes(report.status)); assert.ok(REASONS.has(report.reason));
  assert.match(report.sourceCommit, /^[a-f0-9]{40}$/);
  assert.match(report.productionNetworkBlobSha256, /^[a-f0-9]{64}$/);
  if (expectedIdentity) {
    assert.equal(report.sourceCommit, expectedIdentity.sourceCommit);
    assert.equal(report.productionNetworkBlobSha256, expectedIdentity.productionNetworkBlobSha256);
  }
  for (const key of ['P01','P02','P03','P04','P05','P06','P07','P08','privateCandidatePresent']) assert.equal(typeof report[key], 'boolean');
  if (report.status === 'PASS') {
    assert.equal(report.reason, 'PASS');
    for (const key of ['P01','P02','P03','P04','P05','P06','P07','P08','privateCandidatePresent']) assert.equal(report[key], true);
  } else assert.notEqual(report.reason, 'PASS');
  return true;
}

function main(argv) {
  if (argv.length !== 1 || !argv[0]) throw Error('fixed output required');
  const output = path.resolve(argv[0]);
  if (fs.existsSync(output)) throw Error('output exists');
  let report;
  try {report = runProof();}
  catch {report = emptyReport(gitIdentity());}
  validateReport(report);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write(JSON.stringify({status: report.status, reason: report.reason}) + '\n');
  process.exitCode = report.status === 'PASS' ? 0 : 1;
}

module.exports = {KEYS, REASONS, gitIdentity, emptyReport, fixedReason, syntheticRules,
  privateBoundaries, validDiscovery, runProof, validateReport};
if (require.main === module) {
  try {main(process.argv.slice(2));}
  catch {process.stdout.write('{"status":"FAIL","reason":"INTERNAL"}\n'); process.exitCode = 1;}
}
