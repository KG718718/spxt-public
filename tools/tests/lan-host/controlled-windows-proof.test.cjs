'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const production = require('../../../public-lan-network');
const proof = require('./controlled-windows-proof.cjs');

const identity = {sourceCommit: 'a'.repeat(40), productionNetworkBlobSha256: 'b'.repeat(64)};
const candidate = {adapterId: '12345678-1234-1234-1234-123456789abc', name: 'Synthetic',
  address: '192.168.44.10', prefixLength: 24, subnet: '192.168.44.0/24'};
const records = [{Address: candidate.address, Name: 'Synthetic', InterfaceGuid: candidate.adapterId}];

function deps(overrides = {}) {
  return {platform: 'win32', release: '10.0.19045', identity,
    network: {...production, resolveSystemPowerShell: () => ({}), runWindowsDiscovery: () => records,
      discoverWindowsLan: () => ({status: 'SELECTED', selected: candidate, candidates: [candidate]})}, ...overrides};
}

test('all P01–P08 pass only with closed production shaped inputs and private candidate', () => {
  const report = proof.runProof(deps());
  assert.equal(report.status, 'PASS'); assert.equal(report.reason, 'PASS');
  assert.equal(proof.validateReport(report, identity), true);
  assert.deepEqual(Object.keys(report).sort(), [...proof.KEYS].sort());
});

test('fixed known command failure stops before later discovery calls', () => {
  let selected = false;
  const network = {...deps().network,
    runWindowsDiscovery() {throw Object.assign(Error('raw address path stderr'), {code: 'NETWORK_DISCOVERY_FAILED'});},
    discoverWindowsLan() {selected = true; throw Error('must not run');}};
  const report = proof.runProof(deps({network}));
  assert.equal(selected, false); assert.equal(report.status, 'FAIL');
  assert.equal(report.reason, 'DISCOVERY_COMMAND_FAILED');
  assert.equal(report.P01, true); assert.equal(report.P02, false);
  assert.doesNotMatch(JSON.stringify(report), /raw address|stderr|192\.168/);
});

test('invalid result and no private candidate cannot be PASS', () => {
  const invalid = proof.runProof(deps({network: {...deps().network, discoverWindowsLan: () => ({status: 'SELECTED'})}}));
  assert.equal(invalid.reason, 'DISCOVERY_SHAPE_INVALID');
  const none = proof.runProof(deps({network: {...deps().network,
    discoverWindowsLan: () => ({status: 'NO_PRIVATE_LAN', selected: null, candidates: []})}}));
  assert.equal(none.reason, 'NO_PRIVATE_CANDIDATE'); assert.equal(none.privateCandidatePresent, false);
});

test('network state change remains in memory and prevents PASS', () => {
  let calls = 0;
  const network = {...deps().network, runWindowsDiscovery: () => ++calls === 1 ? records : []};
  const report = proof.runProof(deps({network}));
  assert.equal(report.reason, 'NETWORK_STATE_CHANGED'); assert.equal(report.P08, false);
  assert.doesNotMatch(JSON.stringify(report), /192\.168/);
});

test('synthetic virtual VPN and RFC1918 rules use unchanged production helpers', () => {
  assert.equal(proof.syntheticRules(production), true);
  assert.equal(proof.privateBoundaries(production), true);
  const weak = {...deps().network, privateBlock: () => ({base: 0, prefix: 0})};
  assert.equal(proof.runProof(deps({network: weak})).reason, 'SYNTHETIC_RULE_FAILED');
});

test('report validator rejects raw network identity and false success', () => {
  const report = proof.runProof(deps());
  assert.throws(() => proof.validateReport({...report, ip: '192.168.44.10'}, identity));
  assert.throws(() => proof.validateReport({...report, P08: false}, identity));
  assert.throws(() => proof.validateReport({...report, productionNetworkBlobSha256: 'c'.repeat(64)}, identity));
});

test('non Windows 10 environment stops before invoking discovery', () => {
  const network = {...deps().network, resolveSystemPowerShell() {throw Error('must not run');}};
  const report = proof.runProof(deps({platform: 'linux', network}));
  assert.equal(report.reason, 'PLATFORM_UNSUPPORTED');
});
