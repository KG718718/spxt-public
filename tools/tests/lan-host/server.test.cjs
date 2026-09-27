'use strict';

const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const test = require('node:test');
const {
  STATUS, createRequestGate, discoverLanInWorker, createLanHostController
} = require('../../../public-lan-server');

const selectedA = Object.freeze({
  adapterId: '11111111-1111-1111-1111-111111111111', name: 'Synthetic Ethernet',
  address: '192.168.40.10', prefixLength: 24, subnet: '192.168.40.0/24'
});
const selectedB = Object.freeze({...selectedA, address: '192.168.40.20'});

function response() {
  return {
    statusCode: null, headers: {}, body: '', destroyed: false, writableEnded: false,
    writeHead(statusCode, headers = {}) { this.statusCode = statusCode; Object.assign(this.headers, headers); },
    setHeader(key, value) { this.headers[key] = value; },
    end(body = '') { this.body += body; this.writableEnded = true; }
  };
}

function request({method = 'GET', route = '/', remoteAddress, localAddress, localPort = 8083, headers = {}}) {
  const req = new EventEmitter();
  req.method = method; req.url = route; req.headers = headers;
  req.socket = {remoteAddress, localAddress, localPort};
  req.resumed = false; req.resume = () => { req.resumed = true; };
  return req;
}

function invoke(gate, listener, input) {
  const req = request(input); const res = response(); let next = 0;
  gate(listener, req, res, () => { next += 1; });
  return {req, res, next, json: () => JSON.parse(res.body)};
}

class FakeServer extends EventEmitter {
  constructor(handler) { super(); this.handler = handler; this.listening = false; this.destroyedConnections = 0; this.closeCalls = 0; this.history = []; }
  listen(options) { this.options = options; this.listening = true; queueMicrotask(() => this.emit('listening')); }
  close(callback) { this.closeCalls += 1; this.history.push('stop-accept'); this.listening = false; queueMicrotask(() => callback?.()); }
  closeAllConnections() { this.destroyedConnections += 1; this.history.push('destroy-accepted'); }
}

function reservation(servers, port = 8083) {
  return {port, addresses: [], servers, releaseCalls: 0, async release() { this.releaseCalls += 1; }};
}

test('entry guard runs before OPTIONS/bootstrap and ignores forwarded identity', () => {
  let initializing = true;
  const state = {status: STATUS.HOST_INITIALIZATION_REQUIRED, port: 8083, selected: selectedA, localListening: true, lanListening: true};
  const gate = createRequestGate({getState: () => state, needsInitialization: () => initializing});

  const remoteSetup = invoke(gate, {kind: 'lan', address: selectedA.address}, {
    method: 'POST', route: '/api/setup', remoteAddress: '192.168.40.21', localAddress: selectedA.address,
    headers: {host: '127.0.0.1:8083', origin: 'http://127.0.0.1:8083', forwarded: 'for=127.0.0.1', 'x-forwarded-for': '127.0.0.1'}
  });
  assert.equal(remoteSetup.next, 0);
  assert.equal(remoteSetup.res.statusCode, 503);
  assert.equal(remoteSetup.json().code, STATUS.HOST_INITIALIZATION_REQUIRED);

  const remoteOptions = invoke(gate, {kind: 'lan', address: selectedA.address}, {
    method: 'OPTIONS', route: '/api/login', remoteAddress: '192.168.40.21', localAddress: selectedA.address
  });
  assert.equal(remoteOptions.res.statusCode, 503);

  const spoofedRemote = invoke(gate, {kind: 'local', address: '127.0.0.1'}, {
    route: '/api/setup', remoteAddress: '198.51.100.20', localAddress: '127.0.0.1',
    headers: {host: '127.0.0.1:8083', 'x-forwarded-for': '127.0.0.1'}
  });
  assert.equal(spoofedRemote.next, 0);
  assert.equal(spoofedRemote.res.statusCode, 403);

  const local = invoke(gate, {kind: 'local', address: '127.0.0.1'}, {
    route: '/api/setup', remoteAddress: '::ffff:127.0.0.1', localAddress: '::ffff:127.0.0.1',
    headers: {host: '127.0.0.1:8083'}
  });
  assert.equal(local.next, 1);
  initializing = false;
  const login = invoke(gate, {kind: 'lan', address: selectedA.address}, {
    method: 'POST', route: '/api/login', remoteAddress: '::ffff:192.168.40.22', localAddress: selectedA.address,
    headers: {host: '192.168.40.10:8083'}
  });
  assert.equal(login.next, 1);
  const closedSetup = invoke(gate, {kind: 'lan', address: selectedA.address}, {
    method: 'POST', route: '/api/setup', remoteAddress: '192.168.40.21', localAddress: selectedA.address,
    headers: {host: '127.0.0.1:8083', origin: 'http://127.0.0.1:8083', forwarded: 'for=127.0.0.1', 'x-forwarded-for': '127.0.0.1'}
  });
  assert.equal(closedSetup.next, 0);
  assert.equal(closedSetup.res.statusCode, 403);
  assert.equal(closedSetup.json().code, 'REMOTE_BOOTSTRAP_CLOSED');
});

test('selected subnet and actual listener address are both mandatory', () => {
  const state = {status: STATUS.LAN_SERVER_READY, port: 8083, selected: selectedA, localListening: true, lanListening: true};
  const gate = createRequestGate({getState: () => state, needsInitialization: () => false});
  for (const input of [
    {remoteAddress: '192.168.41.7', localAddress: selectedA.address},
    {remoteAddress: '10.0.0.7', localAddress: selectedA.address},
    {remoteAddress: '192.168.40.7', localAddress: '192.168.40.99'}
  ]) {
    const result = invoke(gate, {kind: 'lan', address: selectedA.address}, {route: '/api/login', ...input});
    assert.equal(result.next, 0); assert.equal(result.res.statusCode, 403);
  }
  const accepted = invoke(gate, {kind: 'lan', address: selectedA.address}, {
    route: '/api/login', remoteAddress: '192.168.40.7', localAddress: selectedA.address,
    headers: {forwarded: 'for=203.0.113.9', 'x-forwarded-for': '203.0.113.9'}
  });
  assert.equal(accepted.next, 1);
});

test('status endpoint is read-only, local-listener-only and never claims LAN READY', () => {
  const state = {status: STATUS.LAN_SERVER_READY, port: 8083, selected: selectedA,
    localListening: true, lanListening: true, localHealth: true, lanHealth: true};
  const gate = createRequestGate({getState: () => state, needsInitialization: () => false});
  const local = invoke(gate, {kind: 'local', address: '127.0.0.1'}, {
    route: '/api/lan/status', remoteAddress: '127.0.0.1', localAddress: '127.0.0.1',
    headers: {host: '127.0.0.1:8083'}
  });
  assert.equal(local.res.statusCode, 200);
  assert.equal(local.json().status, STATUS.LAN_SERVER_READY);
  assert.notEqual(local.json().status, 'LAN READY');
  assert.equal(local.json().remoteBootstrapClosed, true);

  const crossOrigin = invoke(gate, {kind: 'local', address: '127.0.0.1'}, {
    route: '/api/lan/status', remoteAddress: '127.0.0.1', localAddress: '127.0.0.1',
    headers: {host: '127.0.0.1:8083', origin: 'https://untrusted.invalid'}
  });
  assert.equal(crossOrigin.res.statusCode, 403);
  const write = invoke(gate, {kind: 'local', address: '127.0.0.1'}, {
    method: 'POST', route: '/api/lan/status', remoteAddress: '127.0.0.1', localAddress: '127.0.0.1',
    headers: {host: '127.0.0.1:8083'}
  });
  assert.equal(write.res.statusCode, 405);
  const remote = invoke(gate, {kind: 'lan', address: selectedA.address}, {
    route: '/api/lan/status', remoteAddress: '192.168.40.7', localAddress: selectedA.address
  });
  assert.equal(remote.res.statusCode, 403);
});

test('hung discovery is isolated in a timed worker while Local requests remain responsive', async () => {
  class HangingWorker extends EventEmitter {
    terminate() { this.terminated = true; return Promise.resolve(0); }
  }
  const pending = discoverLanInWorker({
    adapterPreference: selectedA.adapterId, timeoutMs: 25, Worker: HangingWorker
  });
  const gate = createRequestGate({
    getState: () => ({status: STATUS.LOCAL_ONLY, port: 8083, selected: null, localListening: true, lanListening: false}),
    needsInitialization: () => false
  });
  const local = invoke(gate, {kind: 'local', address: '127.0.0.1'}, {
    route: '/login.html', remoteAddress: '127.0.0.1', localAddress: '127.0.0.1'
  });
  assert.equal(local.next, 1);
  await assert.rejects(pending, error => error.code === 'NETWORK_DISCOVERY_FAILED');
});

test('controller installs one shared business handler before reserving both real handles', async () => {
  const created = []; let businessCalls = 0;
  const reserve = async options => {
    assert.deepEqual(options.addresses, ['127.0.0.1', selectedA.address]);
    const servers = options.addresses.map(address => options.createServer(address, options.port));
    assert.equal(servers.every(server => typeof server.handler === 'function'), true);
    servers.forEach(server => { server.listening = true; });
    return reservation(servers, options.port);
  };
  const controller = createLanHostController({
    handler() { businessCalls += 1; }, needsInitialization: () => false, reservePersistedPort: reserve,
    probe: async () => true,
    createHttpServer(handler) { const server = new FakeServer(handler); created.push(server); return server; }
  });
  const config = {schema: 1, port: 8083, adapterPreference: selectedA.adapterId};
  const state = await controller.start(config, {status: 'SELECTED', selected: selectedA});
  assert.equal(state.status, STATUS.LAN_SERVER_READY);
  assert.equal(created.length, 2);
  const localReq = request({route: '/', remoteAddress: '127.0.0.1', localAddress: '127.0.0.1'});
  created[0].handler(localReq, response());
  const lanReq = request({route: '/', remoteAddress: '192.168.40.22', localAddress: selectedA.address});
  created[1].handler(lanReq, response());
  assert.equal(businessCalls, 2);
  controller.healthFailed();
  assert.equal(controller.state().status, STATUS.LAN_HEALTH_FAILED);
  controller.initializationChanged();
  assert.equal(controller.state().status, STATUS.LAN_HEALTH_FAILED, 'initialization changes cannot mask failed health');
  await controller.close();
});

test('partial dual-bind failure cleans up and preserves local on the persisted port without fallback', async () => {
  const calls = [];
  const reserve = async options => {
    calls.push({port: options.port, addresses: options.addresses.slice()});
    if (options.addresses.length === 2) throw Object.assign(Error('occupied'), {code: 'PORT_OCCUPIED'});
    const local = options.createServer('127.0.0.1', options.port); local.listening = true;
    return reservation([local], options.port);
  };
  const controller = createLanHostController({handler() {}, needsInitialization: () => false,
    reservePersistedPort: reserve, probe: async () => true, createHttpServer: handler => new FakeServer(handler)});
  const state = await controller.start({port: 8087, adapterPreference: selectedA.adapterId}, {status: 'SELECTED', selected: selectedA});
  assert.equal(state.status, STATUS.PORT_OCCUPIED);
  assert.equal(state.localListening, true);
  assert.equal(state.lanListening, false);
  assert.deepEqual(calls, [
    {port: 8087, addresses: ['127.0.0.1', selectedA.address]},
    {port: 8087, addresses: ['127.0.0.1']}
  ]);
  await controller.close();
});

test('LAN self-health failure closes LAN while retaining healthy Local access', async () => {
  const created = [];
  const controller = createLanHostController({
    handler() {}, needsInitialization: () => false,
    reservePersistedPort: async options => {
      const servers = options.addresses.map(address => options.createServer(address, options.port));
      servers.forEach(server => { server.listening = true; });
      return reservation(servers, options.port);
    },
    probe: async input => input.kind === 'local',
    createHttpServer(handler) { const server = new FakeServer(handler); created.push(server); return server; }
  });
  const state = await controller.start({port: 8088, adapterPreference: selectedA.adapterId}, {status: 'SELECTED', selected: selectedA});
  assert.equal(state.status, STATUS.LAN_HEALTH_FAILED);
  assert.equal(state.localListening, true); assert.equal(state.localHealth, true);
  assert.equal(state.lanListening, false); assert.equal(state.lanHealth, false);
  assert.equal(created[1].destroyedConnections, 1);
  await controller.close();
});

test('network change revokes old guard before closing old LAN connections and rebinds same port', async () => {
  const created = [];
  const reserve = async options => {
    const servers = options.addresses.map(address => options.createServer(address, options.port));
    servers.forEach(server => { server.listening = true; });
    return reservation(servers, options.port);
  };
  const controller = createLanHostController({handler() {}, needsInitialization: () => false,
    reservePersistedPort: reserve, probe: async () => true,
    createHttpServer(handler) { const server = new FakeServer(handler); created.push(server); return server; }});
  const config = {port: 8089, adapterPreference: selectedA.adapterId};
  await controller.start(config, {status: 'SELECTED', selected: selectedA});
  const oldLan = created[1];
  controller.healthFailed();
  const recovered = await controller.reconcile({status: 'SELECTED', selected: selectedA}, config);
  assert.equal(recovered.status, STATUS.LAN_SERVER_READY);
  assert.equal(created.length, 3, 'same adapter must rebind after a failed listener/health state');
  const recoveredLan = created[2];
  const changed = await controller.reconcile({status: 'SELECTED', selected: selectedB}, config);
  assert.equal(oldLan.destroyedConnections, 1);
  assert.equal(oldLan.closeCalls, 1);
  assert.deepEqual(oldLan.history.slice(0, 2), ['stop-accept', 'destroy-accepted']);
  assert.equal(recoveredLan.destroyedConnections, 1);
  assert.equal(changed.status, STATUS.LAN_SERVER_READY);
  assert.equal(changed.port, 8089);
  assert.equal(changed.selected.address, selectedB.address);
  assert.deepEqual(created.at(-1).options, {host: selectedB.address, port: 8089, exclusive: true});

  const missing = await controller.reconcile({status: 'NETWORK_CHANGED', selected: null}, config);
  assert.equal(missing.status, STATUS.NETWORK_CHANGED);
  assert.equal(missing.localListening, true);
  assert.equal(missing.lanListening, false);
  assert.equal(missing.selected, null);
  await controller.close();
});
