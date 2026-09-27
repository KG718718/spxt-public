'use strict';

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const networkDefault = require('../../../public-lan-network');
const serverDefault = require('../../../public-lan-server');

const STAGES = Object.freeze([
  'HOSTED_CONTEXT', 'OUTPUT_PRECHECK', 'PRODUCTION_DISCOVERY_REJECT', 'SYNTHETIC_DISCOVERY',
  'RUNNER_ADDRESS_ENUMERATION', 'RUNNER_ADDRESS_CARDINALITY', 'SUBNET_DERIVATION',
  'CONTROLLER_CREATE', 'LOOPBACK_BIND', 'LAN_BIND', 'PORT_SELECTION', 'LAN_HTTP_PROBE',
  'CONTROLLER_HEALTH', 'CONTROLLER_CLOSE', 'REPORT_WRITE', 'COMPLETE', 'INTERNAL'
]);
const REASONS = Object.freeze([
  'CONTEXT_REQUIRED', 'SOURCE_COMMIT_UNAVAILABLE', 'SOURCE_COMMIT_MISMATCH',
  'OUTPUT_ARGUMENT_INVALID', 'OUTPUT_EXISTS', 'PRODUCTION_DISCOVERY_ACCEPTED',
  'PRODUCTION_DISCOVERY_INVALID', 'SYNTHETIC_DISCOVERY_FAILED', 'ENUMERATION_FAILED',
  'ZERO_RUNNER_CANDIDATES', 'MULTIPLE_RUNNER_CANDIDATES', 'SUBNET_INVALID',
  'CONTROLLER_CREATE_FAILED', 'LOOPBACK_BIND_FAILED', 'LAN_BIND_FAILED',
  'PORT_RANGE_EXHAUSTED_MIXED', 'LOCAL_HEALTH_FAILED', 'LAN_HEALTH_FAILED',
  'CONTROLLER_NOT_READY', 'HTTP_PROBE_FAILED', 'CLOSE_FAILED', 'REPORT_WRITE_FAILED',
  'PASS', 'INTERNAL'
]);
const STAGE_REASONS = Object.freeze({
  HOSTED_CONTEXT: ['CONTEXT_REQUIRED', 'SOURCE_COMMIT_UNAVAILABLE', 'SOURCE_COMMIT_MISMATCH'],
  OUTPUT_PRECHECK: ['OUTPUT_ARGUMENT_INVALID', 'OUTPUT_EXISTS'],
  PRODUCTION_DISCOVERY_REJECT: ['PRODUCTION_DISCOVERY_ACCEPTED', 'PRODUCTION_DISCOVERY_INVALID'],
  SYNTHETIC_DISCOVERY: ['SYNTHETIC_DISCOVERY_FAILED'], RUNNER_ADDRESS_ENUMERATION: ['ENUMERATION_FAILED'],
  RUNNER_ADDRESS_CARDINALITY: ['ZERO_RUNNER_CANDIDATES', 'MULTIPLE_RUNNER_CANDIDATES'],
  SUBNET_DERIVATION: ['SUBNET_INVALID'], CONTROLLER_CREATE: ['CONTROLLER_CREATE_FAILED'],
  LOOPBACK_BIND: ['LOOPBACK_BIND_FAILED'], LAN_BIND: ['LAN_BIND_FAILED'],
  PORT_SELECTION: ['PORT_RANGE_EXHAUSTED_MIXED'], LAN_HTTP_PROBE: ['HTTP_PROBE_FAILED'],
  CONTROLLER_HEALTH: ['LOCAL_HEALTH_FAILED', 'LAN_HEALTH_FAILED', 'CONTROLLER_NOT_READY'],
  CONTROLLER_CLOSE: ['CLOSE_FAILED'], REPORT_WRITE: ['REPORT_WRITE_FAILED'], COMPLETE: ['PASS'], INTERNAL: ['INTERNAL']
});
const REPORT_KEYS = Object.freeze([
  'schema', 'status', 'stage', 'reason', 'sourceCommit', 'productionDiscoveryRejected',
  'syntheticDiscoveryPassed', 'runnerCandidateCount', 'portsAttempted', 'loopbackBindFailures',
  'lanBindFailures', 'controllerCreated', 'dualBindReady', 'controllerHealthPassed',
  'httpProbePassed', 'cleanupComplete', 'firewallChanged', 'realLanClaim'
]);

class GateFailure extends Error {
  constructor(stage, reason) { super(reason); this.stage = stage; this.reason = reason; }
}

function failure(stage, reason) {
  if (!STAGES.includes(stage) || !REASONS.includes(reason) || reason === 'PASS') return new GateFailure('INTERNAL', 'INTERNAL');
  return new GateFailure(stage, reason);
}

function sourceCommit(value) { return /^[a-f0-9]{40}$/i.test(String(value || '')) ? String(value).toLowerCase() : 'UNKNOWN'; }

function createReport(commit) {
  return {
    schema: 1, status: 'FAIL', stage: 'INTERNAL', reason: 'INTERNAL', sourceCommit: sourceCommit(commit),
    productionDiscoveryRejected: false, syntheticDiscoveryPassed: false, runnerCandidateCount: 0,
    portsAttempted: 0, loopbackBindFailures: 0, lanBindFailures: 0, controllerCreated: false,
    dualBindReady: false, controllerHealthPassed: false, httpProbePassed: false,
    cleanupComplete: false, firewallChanged: false, realLanClaim: false
  };
}

function fixedFailure(report, error) {
  const stage = error instanceof GateFailure ? error.stage : 'INTERNAL';
  const reason = error instanceof GateFailure ? error.reason : 'INTERNAL';
  return {...report, status: 'FAIL', stage, reason};
}

function prefixFromNetmask(mask, network = networkDefault) {
  const parts = network.normalizeIPv4(mask)?.split('.').map(Number);
  if (!parts) return null;
  const bits = parts.map(part => part.toString(2).padStart(8, '0')).join('');
  if (!/^1*0*$/.test(bits)) return null;
  return bits.indexOf('0') < 0 ? 32 : bits.indexOf('0');
}

function enumerateRunnerAddresses(interfaces, network = networkDefault) {
  const candidates = new Map();
  try {
    for (const entries of Object.values(interfaces())) {
      for (const entry of entries || []) {
        const address = network.normalizeIPv4(entry.address);
        const prefixLength = prefixFromNetmask(entry.netmask, network);
        if (!entry.internal && entry.family === 'IPv4' && address && network.privateBlock(address) && prefixLength !== null) {
          candidates.set(address + '/' + prefixLength, {address, prefixLength});
        }
      }
    }
  } catch { throw failure('RUNNER_ADDRESS_ENUMERATION', 'ENUMERATION_FAILED'); }
  return [...candidates.values()].sort((left, right) => left.address.localeCompare(right.address) || left.prefixLength - right.prefixLength);
}

function syntheticDiscovery(network = networkDefault) {
  const adapterId = '12345678-1234-1234-1234-123456789abc';
  const base = {Name: 'Synthetic Ethernet', Description: 'Synthetic physical fixture', InterfaceGuid: adapterId,
    InterfaceIndex: 7, Status: 'Up', HardwareInterface: true, Virtual: false, MediaType: '802.3',
    PhysicalMediaType: 'Ethernet', Address: '192.168.44.10', PrefixLength: 24, AddressState: 'Preferred',
    NetworkCategory: 'Private', HasDefaultRoute: true, OnLinkPrefixes: ['192.168.44.0/24'], RouteMetric: 10};
  const physical = network.selectLanAdapter([base]);
  const virtual = network.selectLanAdapter([{...base, Virtual: true, Description: 'Hyper-V virtual adapter'}]);
  if (physical.status !== 'SELECTED' || virtual.status !== 'NO_PRIVATE_LAN' || virtual.candidates.length !== 0) {
    throw failure('SYNTHETIC_DISCOVERY', 'SYNTHETIC_DISCOVERY_FAILED');
  }
  return {adapterId};
}

function httpProbe(address, port) {
  return new Promise((resolve, reject) => {
    const request = http.get({host: address, port, path: '/login.html', headers: {Host: `${address}:${port}`}, timeout: 3000}, response => {
      response.resume(); response.once('end', () => resolve(response.statusCode));
    });
    request.once('timeout', () => request.destroy());
    request.once('error', reject);
  });
}

function instrumentReservation(baseReserve, observation) {
  return async options => {
    if (!Array.isArray(options.addresses) || options.addresses.length !== 2) return baseReserve(options);
    let activeStage = 'LOOPBACK_BIND';
    const createServer = options.createServer;
    try {
      return await baseReserve({...options, createServer(address, port) {
        activeStage = address === '127.0.0.1' ? 'LOOPBACK_BIND' : 'LAN_BIND';
        return createServer(address, port);
      }});
    } catch (error) {
      observation.bindFailureStage = activeStage;
      throw error;
    }
  };
}

async function closeController(controller, report) {
  try { await controller.close(); report.cleanupComplete = true; }
  catch { throw failure('CONTROLLER_CLOSE', 'CLOSE_FAILED'); }
}

async function attemptPort(port, selected, adapterId, report, deps) {
  report.cleanupComplete = false;
  const observation = {bindFailureStage: null};
  let controller;
  try {
    controller = deps.createLanHostController({
      ...(deps.controllerOptions || {}),
      needsInitialization: () => false,
      handler(req, res) { res.writeHead(200, {'Content-Type': 'text/plain'}); res.end('ok'); },
      reservePersistedPort: instrumentReservation(deps.reservePersistedPort, observation)
    });
    report.controllerCreated = true;
  } catch { throw failure('CONTROLLER_CREATE', 'CONTROLLER_CREATE_FAILED'); }

  let state;
  try {
    state = await controller.start({schema: 1, port, adapterPreference: adapterId}, {status: 'SELECTED', selected});
  } catch {
    await closeController(controller, report);
    throw failure('INTERNAL', 'INTERNAL');
  }
  if (state.status !== deps.STATUS.LAN_SERVER_READY) {
    const bindStage = observation.bindFailureStage;
    if (bindStage === 'LOOPBACK_BIND') report.loopbackBindFailures += 1;
    if (bindStage === 'LAN_BIND') report.lanBindFailures += 1;
    await closeController(controller, report);
    if (bindStage) return {ready: false, bindStage};
    if (!state.localHealth) throw failure('CONTROLLER_HEALTH', 'LOCAL_HEALTH_FAILED');
    if (!state.lanHealth) throw failure('CONTROLLER_HEALTH', 'LAN_HEALTH_FAILED');
    throw failure('CONTROLLER_HEALTH', 'CONTROLLER_NOT_READY');
  }
  if (!(state.localListening && state.lanListening)) {
    await closeController(controller, report);
    throw failure('CONTROLLER_HEALTH', 'CONTROLLER_NOT_READY');
  }
  report.dualBindReady = true;
  if (!(state.localHealth && state.lanHealth)) {
    await closeController(controller, report);
    throw failure('CONTROLLER_HEALTH', state.localHealth ? 'LAN_HEALTH_FAILED' : 'LOCAL_HEALTH_FAILED');
  }
  report.controllerHealthPassed = true;
  let status;
  try { status = await deps.httpProbe(selected.address, port); }
  catch { status = null; }
  if (status !== 200) {
    await closeController(controller, report);
    throw failure('LAN_HTTP_PROBE', 'HTTP_PROBE_FAILED');
  }
  report.httpProbePassed = true;
  await closeController(controller, report);
  return {ready: true};
}

function defaultDependencies() {
  return {
    platform: process.platform, env: process.env, fs, path, network: networkDefault,
    networkInterfaces: os.networkInterfaces, createLanHostController: serverDefault.createLanHostController,
    STATUS: serverDefault.STATUS, reservePersistedPort: networkDefault.reservePersistedPort,
    readCheckoutCommit: () => execFileSync('git', ['-C', path.resolve(__dirname, '../../..'), 'rev-parse', 'HEAD'],
      {encoding: 'utf8', windowsHide: true, timeout: 10000}).trim(),
    httpProbe, ports: Array.from({length: networkDefault.PORT_MAX - networkDefault.PORT_MIN + 1}, (_, index) => networkDefault.PORT_MIN + index),
    stdout: process.stdout
  };
}

async function executeGate(report, supplied = {}) {
  const deps = {...defaultDependencies(), ...supplied};
  const env = deps.env || {};
  if (deps.platform !== 'win32' || env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
      env.GITHUB_REPOSITORY !== 'KG718718/spxt-public' || !/^[a-f0-9]{40}$/i.test(String(env.GITHUB_SHA || ''))) {
    throw failure('HOSTED_CONTEXT', 'CONTEXT_REQUIRED');
  }
  let checkoutCommit;
  try { checkoutCommit = String(deps.readCheckoutCommit()).trim().toLowerCase(); }
  catch { throw failure('HOSTED_CONTEXT', 'SOURCE_COMMIT_UNAVAILABLE'); }
  if (!/^[a-f0-9]{40}$/.test(checkoutCommit)) throw failure('HOSTED_CONTEXT', 'SOURCE_COMMIT_UNAVAILABLE');
  if (checkoutCommit !== env.GITHUB_SHA.toLowerCase()) throw failure('HOSTED_CONTEXT', 'SOURCE_COMMIT_MISMATCH');

  let actual;
  try { actual = deps.network.discoverWindowsLan(); }
  catch { throw failure('PRODUCTION_DISCOVERY_REJECT', 'PRODUCTION_DISCOVERY_INVALID'); }
  if (!actual || !Array.isArray(actual.candidates)) throw failure('PRODUCTION_DISCOVERY_REJECT', 'PRODUCTION_DISCOVERY_INVALID');
  if (actual.status !== 'NO_PRIVATE_LAN' || actual.candidates.length !== 0) {
    throw failure('PRODUCTION_DISCOVERY_REJECT', 'PRODUCTION_DISCOVERY_ACCEPTED');
  }
  report.productionDiscoveryRejected = true;

  const {adapterId} = syntheticDiscovery(deps.network);
  report.syntheticDiscoveryPassed = true;
  const candidates = enumerateRunnerAddresses(deps.networkInterfaces, deps.network);
  report.runnerCandidateCount = candidates.length;
  if (candidates.length === 0) throw failure('RUNNER_ADDRESS_CARDINALITY', 'ZERO_RUNNER_CANDIDATES');
  if (candidates.length !== 1) throw failure('RUNNER_ADDRESS_CARDINALITY', 'MULTIPLE_RUNNER_CANDIDATES');
  const owned = candidates[0];
  const subnet = deps.network.subnetFor(owned.address, owned.prefixLength);
  if (!subnet) throw failure('SUBNET_DERIVATION', 'SUBNET_INVALID');
  const selected = {adapterId, name: 'Runner-owned isolated bind', address: owned.address,
    prefixLength: owned.prefixLength, subnet: subnet.cidr, routeMetric: 0};

  const bindFailures = new Set();
  for (const port of deps.ports) {
    report.portsAttempted += 1;
    const result = await attemptPort(port, selected, adapterId, report, deps);
    if (result.ready) return {...report, status: 'PASS', stage: 'COMPLETE', reason: 'PASS'};
    bindFailures.add(result.bindStage);
  }
  if (bindFailures.size === 1 && bindFailures.has('LOOPBACK_BIND')) throw failure('LOOPBACK_BIND', 'LOOPBACK_BIND_FAILED');
  if (bindFailures.size === 1 && bindFailures.has('LAN_BIND')) throw failure('LAN_BIND', 'LAN_BIND_FAILED');
  throw failure('PORT_SELECTION', 'PORT_RANGE_EXHAUSTED_MIXED');
}

function validateReport(report, expectedCommit) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw failure('INTERNAL', 'INTERNAL');
  if (!/^[a-f0-9]{40}$/i.test(String(expectedCommit || ''))) throw failure('INTERNAL', 'INTERNAL');
  if (Object.keys(report).sort().join('|') !== [...REPORT_KEYS].sort().join('|')) throw failure('INTERNAL', 'INTERNAL');
  if (report.schema !== 1 || !['PASS', 'FAIL'].includes(report.status) || !STAGES.includes(report.stage) ||
      !REASONS.includes(report.reason) || !STAGE_REASONS[report.stage]?.includes(report.reason) ||
      report.sourceCommit !== sourceCommit(expectedCommit)) throw failure('INTERNAL', 'INTERNAL');
  for (const key of ['productionDiscoveryRejected', 'syntheticDiscoveryPassed', 'controllerCreated', 'dualBindReady',
    'controllerHealthPassed', 'httpProbePassed', 'cleanupComplete', 'firewallChanged', 'realLanClaim']) {
    if (typeof report[key] !== 'boolean') throw failure('INTERNAL', 'INTERNAL');
  }
  for (const key of ['runnerCandidateCount', 'portsAttempted', 'loopbackBindFailures', 'lanBindFailures']) {
    if (!Number.isSafeInteger(report[key]) || report[key] < 0 || report[key] > 100) throw failure('INTERNAL', 'INTERNAL');
  }
  if (report.status === 'FAIL' && report.stage === 'COMPLETE') throw failure('INTERNAL', 'INTERNAL');
  if (report.status === 'PASS' && (report.stage !== 'COMPLETE' || report.reason !== 'PASS' || !report.dualBindReady ||
      !report.controllerHealthPassed || !report.httpProbePassed || !report.cleanupComplete || report.firewallChanged || report.realLanClaim)) {
    throw failure('INTERNAL', 'INTERNAL');
  }
  return true;
}

function writeReport(output, report, deps) {
  deps.fs.mkdirSync(deps.path.dirname(output), {recursive: true});
  const temporary = output + '.writing';
  let created = false;
  try {
    deps.fs.writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    created = true;
    deps.fs.renameSync(temporary, output);
  } catch (error) {
    if (created && deps.fs.existsSync(temporary)) deps.fs.unlinkSync(temporary);
    throw error;
  }
}

async function runGate(argv, supplied = {}) {
  const deps = {...defaultDependencies(), ...supplied};
  const report = createReport(deps.env?.GITHUB_SHA);
  let output = null;
  try {
    if (!Array.isArray(argv) || argv.length !== 1 || typeof argv[0] !== 'string' || !argv[0]) {
      throw failure('OUTPUT_PRECHECK', 'OUTPUT_ARGUMENT_INVALID');
    }
    output = deps.path.resolve(argv[0]);
    if (deps.fs.existsSync(output)) throw failure('OUTPUT_PRECHECK', 'OUTPUT_EXISTS');
    Object.assign(report, await executeGate(report, deps));
  } catch (error) { Object.assign(report, fixedFailure(report, error)); }

  if (output && !deps.fs.existsSync(output)) {
    try { writeReport(output, report, deps); }
    catch { Object.assign(report, {status: 'FAIL', stage: 'REPORT_WRITE', reason: 'REPORT_WRITE_FAILED'}); }
  }
  const ok = report.status === 'PASS';
  deps.stdout.write(JSON.stringify({status: report.status, stage: report.stage, reason: report.reason}) + '\n');
  return {exitCode: ok ? 0 : 1, report};
}

async function cli(argv) {
  if (argv[0] === 'verify-report') {
    try {
      if (argv.length !== 3) throw failure('OUTPUT_PRECHECK', 'OUTPUT_ARGUMENT_INVALID');
      const value = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
      validateReport(value, argv[2]);
      process.stdout.write('{"status":"PASS","stage":"COMPLETE","reason":"PASS"}\n');
      return 0;
    } catch {
      process.stdout.write('{"status":"FAIL","stage":"INTERNAL","reason":"INTERNAL"}\n');
      return 1;
    }
  }
  return (await runGate(argv)).exitCode;
}

module.exports = {STAGES, REASONS, STAGE_REASONS, REPORT_KEYS, GateFailure, createReport, prefixFromNetmask,
  enumerateRunnerAddresses, syntheticDiscovery, executeGate, validateReport, runGate, instrumentReservation};

if (require.main === module) cli(process.argv.slice(2)).then(code => { process.exitCode = code; });
