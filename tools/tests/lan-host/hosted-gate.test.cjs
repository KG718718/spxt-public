'use strict';

const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const network = require('../../../public-lan-network');
const server = require('../../../public-lan-server');
const gate = require('./hosted-gate.cjs');

const repo = path.resolve(__dirname, '../../..');
const commit = 'a'.repeat(40);
const testRoot = path.join(repo, '.test-work', `b45-hosted-gate-${process.pid}-${Date.now()}`);
fs.mkdirSync(testRoot, {recursive: true});
let serial = 0;

class FakeServer extends EventEmitter {
  constructor(handler) { super(); this.handler = handler; this.listening = false; }
  close(callback) { this.listening = false; queueMicrotask(() => callback?.()); }
  closeAllConnections() {}
}

function interfaces(addresses = ['10.20.30.40']) {
  return () => ({Ethernet: addresses.map(address => ({address, netmask: '255.255.255.0', internal: false, family: 'IPv4'}))});
}

function reserve(mode = 'success', counters = {}) {
  return async options => {
    const servers = [];
    const dual = options.addresses.length === 2;
    for (const address of options.addresses) {
      const created = options.createServer(address, options.port);
      if (dual && mode === 'loopback-bind' && address === '127.0.0.1') {
        counters.loopbackRejected = (counters.loopbackRejected || 0) + 1;
        throw Object.assign(Error('synthetic'), {code: 'EADDRINUSE'});
      }
      if (dual && mode === 'lan-bind' && address !== '127.0.0.1') {
        counters.lanRejected = (counters.lanRejected || 0) + 1;
        for (const item of servers) item.close();
        throw Object.assign(Error('synthetic'), {code: 'EADDRINUSE'});
      }
      created.listening = true; servers.push(created);
    }
    counters.reservations = (counters.reservations || 0) + 1;
    return {port: options.port, addresses: options.addresses, servers, async release() {
      counters.releases = (counters.releases || 0) + 1;
      if (mode === 'close-fail') throw Error('synthetic');
      for (const item of servers) item.close();
    }};
  };
}

function defaults(overrides = {}) {
  const fakeNetwork = {...network, discoverWindowsLan: () => ({status: 'NO_PRIVATE_LAN', selected: null, candidates: []})};
  return {
    platform: 'win32',
    env: {GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', GITHUB_REPOSITORY: 'KG718718/spxt-public', GITHUB_SHA: commit},
    network: fakeNetwork,
    networkInterfaces: interfaces(),
    createLanHostController: server.createLanHostController,
    STATUS: server.STATUS,
    reservePersistedPort: reserve(),
    controllerOptions: {probe: async () => true, createHttpServer: handler => new FakeServer(handler)},
    httpProbe: async () => 200,
    ports: [8080],
    stdout: {write() {}},
    ...overrides
  };
}

async function run(overrides = {}) {
  const output = path.join(testRoot, `report-${++serial}.json`);
  const result = await gate.runGate([output], defaults(overrides));
  const disk = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.deepEqual(disk, result.report);
  assert.equal(gate.validateReport(disk, commit), true);
  return result;
}

test.after(() => fs.rmSync(testRoot, {recursive: true, force: true}));

test('1 production discovery must reject the hosted virtual adapter', async () => {
  const result = await run();
  assert.equal(result.report.productionDiscoveryRejected, true);
  const accepted = await run({network: {...network, discoverWindowsLan: () => ({status: 'SELECTED', candidates: [{}]})}});
  assert.equal(accepted.report.stage, 'PRODUCTION_DISCOVERY_REJECT');
  assert.equal(accepted.report.reason, 'PRODUCTION_DISCOVERY_ACCEPTED');
});

test('2 synthetic physical LAN is selected while its virtual twin is rejected', () => {
  assert.equal(gate.syntheticDiscovery(network).adapterId, '12345678-1234-1234-1234-123456789abc');
});

test('3 zero runner candidates has a fixed cardinality classification', async () => {
  const result = await run({networkInterfaces: interfaces([])});
  assert.equal(result.report.stage, 'RUNNER_ADDRESS_CARDINALITY');
  assert.equal(result.report.reason, 'ZERO_RUNNER_CANDIDATES');
  assert.equal(result.report.runnerCandidateCount, 0);
});

test('4 one runner candidate is accepted by the isolated harness', async () => {
  const result = await run();
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.runnerCandidateCount, 1);
});

test('5 multiple runner candidates fail closed without deterministic production selection', async () => {
  const result = await run({networkInterfaces: interfaces(['10.20.30.40', '192.168.55.20'])});
  assert.equal(result.report.stage, 'RUNNER_ADDRESS_CARDINALITY');
  assert.equal(result.report.reason, 'MULTIPLE_RUNNER_CANDIDATES');
  assert.equal(result.report.runnerCandidateCount, 2);
});

test('6 invalid runner subnet has a fixed derivation failure', async () => {
  const fakeNetwork = {...network, discoverWindowsLan: () => ({status: 'NO_PRIVATE_LAN', selected: null, candidates: []}), subnetFor: () => null};
  const result = await run({network: fakeNetwork});
  assert.equal(result.report.stage, 'SUBNET_DERIVATION');
  assert.equal(result.report.reason, 'SUBNET_INVALID');
});

test('7 loopback bind failure closes the controller before reporting', async () => {
  const counters = {};
  const result = await run({reservePersistedPort: reserve('loopback-bind', counters)});
  assert.equal(result.report.stage, 'LOOPBACK_BIND');
  assert.equal(result.report.loopbackBindFailures, 1);
  assert.equal(result.report.cleanupComplete, true);
});

test('8 LAN bind failure closes local fallback before reporting', async () => {
  const counters = {};
  const result = await run({reservePersistedPort: reserve('lan-bind', counters)});
  assert.equal(result.report.stage, 'LAN_BIND');
  assert.equal(result.report.lanBindFailures, 1);
  assert.equal(result.report.cleanupComplete, true);
  assert.ok(counters.releases >= 1);
});

test('9 controller health failure safely closes every listener', async () => {
  const result = await run({controllerOptions: {probe: async ({kind}) => kind === 'local', createHttpServer: handler => new FakeServer(handler)}});
  assert.equal(result.report.stage, 'CONTROLLER_HEALTH');
  assert.equal(result.report.reason, 'LAN_HEALTH_FAILED');
  assert.equal(result.report.cleanupComplete, true);
});

test('10 LAN HTTP probe failure safely closes the ready controller', async () => {
  const result = await run({httpProbe: async () => 503});
  assert.equal(result.report.stage, 'LAN_HTTP_PROBE');
  assert.equal(result.report.reason, 'HTTP_PROBE_FAILED');
  assert.equal(result.report.cleanupComplete, true);
});

test('11 close failure can never be converted into PASS', async () => {
  const result = await run({reservePersistedPort: reserve('close-fail')});
  assert.equal(result.report.status, 'FAIL');
  assert.equal(result.report.stage, 'CONTROLLER_CLOSE');
  assert.equal(result.report.reason, 'CLOSE_FAILED');
});

test('12 only a healthy probed and closed dual bind writes final PASS', async () => {
  const result = await run();
  assert.equal(result.report.status, 'PASS');
  assert.equal(result.report.stage, 'COMPLETE');
  assert.equal(result.report.reason, 'PASS');
  assert.equal(result.report.dualBindReady, true);
  assert.equal(result.report.controllerHealthPassed, true);
  assert.equal(result.report.httpProbePassed, true);
  assert.equal(result.report.cleanupComplete, true);
  assert.equal(result.report.firewallChanged, false);
  assert.equal(result.report.realLanClaim, false);
});

test('13 unknown controller exception maps only to INTERNAL', async () => {
  const result = await run({createLanHostController: () => ({async start() { throw Error('private raw text'); }, async close() {}})});
  assert.equal(result.report.stage, 'INTERNAL');
  assert.equal(result.report.reason, 'INTERNAL');
  assert.doesNotMatch(JSON.stringify(result.report), /private raw text/);
});

test('14 fixed report does not disclose address path adapter or raw identity', async () => {
  const result = await run();
  const raw = JSON.stringify(result.report);
  assert.deepEqual(Object.keys(result.report).sort(), [...gate.REPORT_KEYS].sort());
  assert.doesNotMatch(raw, /10\.20\.30\.40|192\.168\.44\.10|Synthetic Ethernet|Runner-owned|12345678|b45-hosted-gate/i);
  assert.equal(result.report.sourceCommit, commit);
  assert.throws(() => gate.validateReport({...result.report, address: '10.20.30.40'}, commit));
  assert.throws(() => gate.validateReport({...result.report, sourceCommit: 'b'.repeat(40)}, commit));
  assert.throws(() => gate.validateReport({...result.report, cleanupComplete: false}, commit));
});

test('partial LAN bind cleanup permits the next real port candidate', async () => {
  const counters = {}; let failed = false;
  const failOnce = reserve('lan-bind', counters); const succeed = reserve('success', counters);
  const baseReserve = options => {
    if (options.addresses.length === 2 && !failed) { failed = true; return failOnce(options); }
    return succeed(options);
  };
  const result = await run({reservePersistedPort: baseReserve, ports: [8080, 8081]});
  assert.equal(result.report.status, 'PASS');
  assert.equal(result.report.portsAttempted, 2);
  assert.equal(result.report.lanBindFailures, 1);
  assert.equal(result.report.cleanupComplete, true);
  assert.ok(counters.releases >= 2);
});

test('hosted context and output precheck remain separate fixed stages', async () => {
  const contextOutput = path.join(testRoot, `report-${++serial}.json`);
  const context = await gate.runGate([contextOutput], defaults({platform: 'linux'}));
  assert.equal(context.report.stage, 'HOSTED_CONTEXT');
  assert.equal(context.report.reason, 'CONTEXT_REQUIRED');
  const output = await gate.runGate([], defaults());
  assert.equal(output.report.stage, 'OUTPUT_PRECHECK');
  assert.equal(output.report.reason, 'OUTPUT_ARGUMENT_INVALID');
});

test('enumeration, controller creation, mixed range, and report write fail with fixed stages', async () => {
  const enumeration = await run({networkInterfaces() { throw Error('raw'); }});
  assert.equal(enumeration.report.stage, 'RUNNER_ADDRESS_ENUMERATION');
  const creation = await run({createLanHostController() { throw Error('raw'); }});
  assert.equal(creation.report.stage, 'CONTROLLER_CREATE');
  let attempt = 0;
  const loopback = reserve('loopback-bind'); const lan = reserve('lan-bind');
  const mixed = await run({ports: [8080, 8081], reservePersistedPort(options) {
    if (options.addresses.length === 1) return reserve('success')(options);
    attempt += 1; return (attempt === 1 ? loopback : lan)(options);
  }});
  assert.equal(mixed.report.stage, 'PORT_SELECTION');
  assert.equal(mixed.report.reason, 'PORT_RANGE_EXHAUSTED_MIXED');
  const reportPath = path.join(testRoot, `write-fail-${++serial}.json`);
  const brokenFs = {...fs, writeFileSync() { throw Error('raw'); }};
  const write = await gate.runGate([reportPath], defaults({fs: brokenFs}));
  assert.equal(write.report.stage, 'REPORT_WRITE');
  assert.equal(write.report.reason, 'REPORT_WRITE_FAILED');
});

test('manual workflow exposes only the read-only hosted diagnostic and fixed JSON artifact', () => {
  const workflow = fs.readFileSync(path.join(repo, '.github/workflows/setup-v3.yml'), 'utf8');
  const hostedJob = workflow.match(/  lan-hosted-diagnostic:[\s\S]*?(?=\r?\n  lan-host-v1-1:)/)?.[0] || '';
  assert.match(workflow, /- lan-hosted-diagnostic/);
  assert.match(hostedJob, /inputs\.mode == 'lan-hosted-diagnostic'/);
  assert.match(hostedJob, /permissions:\s*\r?\n\s*contents: read/);
  assert.match(hostedJob, /hosted-gate\.cjs[^\r\n]+KSESSION_HOSTED_LAN_REPORT/);
  assert.match(hostedJob, /hosted-gate\.cjs verify-report[^\r\n]+github\.sha/);
  assert.match(hostedJob, /path: \$\{\{ env\.KSESSION_HOSTED_LAN_REPORT \}\}/);
  assert.doesNotMatch(hostedJob, /uses: \.\/\.github\/workflows\/lan-host-v1\.1\.yml/);
  const verifier = fs.readFileSync(path.join(repo, 'tools/windows-installer/beta3-upgrade/verify-artifact-beta3.cjs'), 'utf8');
  assert.match(verifier, /validateReport:validateHostedLanReport/);
  assert.match(verifier, /validateHostedLanReport\(hosted,commit\)/);
});
