'use strict';

const httpDefault = require('node:http');
const path = require('node:path');
const {Worker} = require('node:worker_threads');
const {
  normalizeIPv4, isAddressInSubnet, reservePersistedPort
} = require('./public-lan-network');

const STATUS = Object.freeze({
  LOCAL_ONLY: 'LOCAL_ONLY',
  HOST_INITIALIZATION_REQUIRED: 'HOST_INITIALIZATION_REQUIRED',
  NO_PRIVATE_LAN: 'NO_PRIVATE_LAN',
  MULTIPLE_LAN_ADAPTERS: 'MULTIPLE_LAN_ADAPTERS',
  PORT_OCCUPIED: 'PORT_OCCUPIED',
  LAN_START_FAILED: 'LAN_START_FAILED',
  LAN_HEALTH_FAILED: 'LAN_HEALTH_FAILED',
  NETWORK_CHANGED: 'NETWORK_CHANGED',
  LAN_SERVER_READY: 'LAN_SERVER_READY'
});
const ACCEPTED_SOCKETS = Symbol('acceptedSockets');

function fixedStatus(value, fallback = STATUS.LAN_START_FAILED) {
  return Object.values(STATUS).includes(value) ? value : fallback;
}

function sendJson(res, statusCode, payload) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function endpointPath(req) {
  return String(req.url || '').split('?')[0];
}

function localStatusOrigin(req, port) {
  const host = String(req.headers?.host || '').toLowerCase();
  const allowed = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
  if (!allowed.has(host)) return false;
  const origin = req.headers?.origin;
  return origin === undefined || origin === 'http://' + host;
}

function publicState(state, needsInitialization) {
  const selected = state.selected;
  const initializing = Boolean(needsInitialization());
  const status = fixedStatus(state.status, STATUS.LOCAL_ONLY);
  return {
    schema: 1,
    status,
    serverReady: status === STATUS.LAN_SERVER_READY,
    initializationRequired: initializing,
    port: Number.isInteger(state.port) ? state.port : null,
    localListening: Boolean(state.localListening),
    lanListening: Boolean(state.lanListening),
    localHealth: Boolean(state.localHealth),
    lanHealth: Boolean(state.lanHealth),
    remoteBootstrapClosed: true,
    selected: selected ? {
      adapterId: selected.adapterId,
      address: selected.address,
      prefixLength: selected.prefixLength,
      subnet: selected.subnet
    } : null
  };
}

function createRequestGate(options) {
  if (typeof options?.getState !== 'function' || typeof options?.needsInitialization !== 'function') {
    throw new TypeError('LAN request gate requires state callbacks.');
  }
  return function gate(listener, req, res, next) {
    const state = options.getState();
    const remote = normalizeIPv4(req.socket?.remoteAddress);
    const local = normalizeIPv4(req.socket?.localAddress);
    const expected = normalizeIPv4(listener.address);
    if (listener.kind === 'local') {
      if (expected !== '127.0.0.1' || local !== expected || remote !== '127.0.0.1') {
        sendJson(res, 403, {success: false, code: 'CONNECTION_REJECTED'});
        req.resume?.();
        return;
      }
      if (endpointPath(req) === '/api/lan/status') {
        const port = req.socket?.localPort;
        if (req.method !== 'GET' || !Number.isInteger(port) || !localStatusOrigin(req, port)) {
          sendJson(res, req.method === 'GET' ? 403 : 405, {success: false, code: 'LOCAL_STATUS_REJECTED'});
          req.resume?.();
          return;
        }
        sendJson(res, 200, publicState(state, options.needsInitialization));
        return;
      }
      next(req, res);
      return;
    }
    const selected = state.selected;
    if (listener.kind !== 'lan' || !selected || expected !== normalizeIPv4(selected.address)
        || local !== expected || !remote
        || !isAddressInSubnet(remote, selected.address, selected.prefixLength)) {
      sendJson(res, 403, {success: false, code: fixedStatus(state.status, STATUS.NETWORK_CHANGED)});
      req.resume?.();
      return;
    }
    if (endpointPath(req) === '/api/setup') {
      sendJson(res, options.needsInitialization() ? 503 : 403, {
        success: false,
        code: options.needsInitialization() ? STATUS.HOST_INITIALIZATION_REQUIRED : 'REMOTE_BOOTSTRAP_CLOSED'
      });
      req.resume?.();
      return;
    }
    if (options.needsInitialization()) {
      sendJson(res, 503, {success: false, code: STATUS.HOST_INITIALIZATION_REQUIRED});
      req.resume?.();
      return;
    }
    if (endpointPath(req) === '/api/lan/status') {
      sendJson(res, 403, {success: false, code: 'LOCAL_STATUS_ONLY'});
      req.resume?.();
      return;
    }
    next(req, res);
  };
}

function closeServer(server, destroyConnections = false) {
  return new Promise(resolve => {
    if (!server.listening) return resolve();
    // Stop accepting first, then destroy the exact connections accepted by this listener.
    server.close(() => resolve());
    if (destroyConnections) {
      for (const socket of server[ACCEPTED_SOCKETS] || []) socket.destroy?.();
      server.closeAllConnections?.();
    }
  });
}

function listenServer(server, address, port) {
  return new Promise((resolve, reject) => {
    const cleanup = () => { server.off('error', failed); server.off('listening', ready); };
    const failed = error => { cleanup(); reject(error); };
    const ready = () => { cleanup(); resolve(); };
    server.once('error', failed);
    server.once('listening', ready);
    server.listen({host: address, port, exclusive: true});
  });
}

function probeListener({address, port, kind, initializationRequired}, http = httpDefault) {
  return new Promise(resolve => {
    const expected = kind === 'local' ? 200 : (initializationRequired ? 503 : 200);
    const route = kind === 'local' ? '/api/lan/status' : (initializationRequired ? '/api/login' : '/login.html');
    const req = http.get({host: address, port, path: route, headers: {Host: address + ':' + port}, timeout: 2000}, res => {
      res.resume(); res.once('end', () => resolve(res.statusCode === expected));
    });
    req.once('timeout', () => { req.destroy(); resolve(false); });
    req.once('error', () => resolve(false));
  });
}

function discoverLanInWorker(options = {}) {
  const modulePath = path.join(__dirname, 'public-lan-network.js');
  const timeoutMs = Number.isInteger(options.timeoutMs) ? options.timeoutMs : 20000;
  const WorkerClass = options.Worker || Worker;
  return new Promise((resolve, reject) => {
    const worker = new WorkerClass(`
      'use strict';
      const {parentPort,workerData}=require('node:worker_threads');
      try {
        const network=require(workerData.modulePath);
        parentPort.postMessage({ok:true,value:network.discoverWindowsLan({adapterPreference:workerData.adapterPreference})});
      } catch (error) {
        parentPort.postMessage({ok:false,code:typeof error?.code==='string'?error.code:'NETWORK_DISCOVERY_FAILED'});
      }
    `, {
      eval: true,
      env: process.env.SystemRoot ? {SystemRoot: process.env.SystemRoot} : {},
      workerData: {modulePath, adapterPreference: options.adapterPreference}
    });
    let settled = false;
    const finish = (error, value) => {
      if (settled) return; settled = true; clearTimeout(timer); worker.terminate().catch(() => {});
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(Object.assign(Error('Network discovery timed out'), {code: 'NETWORK_DISCOVERY_FAILED'})), timeoutMs);
    worker.once('message', message => message?.ok
      ? finish(null, message.value)
      : finish(Object.assign(Error('Network discovery failed'), {code: message?.code || 'NETWORK_DISCOVERY_FAILED'})));
    worker.once('error', () => finish(Object.assign(Error('Network discovery failed'), {code: 'NETWORK_DISCOVERY_FAILED'})));
    worker.once('exit', code => { if (code !== 0) finish(Object.assign(Error('Network discovery failed'), {code: 'NETWORK_DISCOVERY_FAILED'})); });
  });
}

function createLanHostController(options = {}) {
  if (typeof options.handler !== 'function' || typeof options.needsInitialization !== 'function') {
    throw new TypeError('LAN host controller requires handler callbacks.');
  }
  const createHttpServer = options.createHttpServer || (handler => httpDefault.createServer(handler));
  const reserve = options.reservePersistedPort || reservePersistedPort;
  const probe = options.probe || probeListener;
  let state = {
    status: STATUS.LOCAL_ONLY, port: null, selected: null,
    localListening: false, lanListening: false, localHealth: false, lanHealth: false
  };
  let localServer = null;
  let lanServer = null;
  let reservation = null;
  const gate = createRequestGate({getState: () => state, needsInitialization: options.needsInitialization});

  function update(patch) { state = Object.freeze({...state, ...patch}); return state; }
  function monitor(server, kind) {
    server.on?.('error', () => {
      if (kind === 'lan') update({status: STATUS.LAN_START_FAILED, selected: null, lanListening: false, lanHealth: false});
      else update({status: STATUS.LAN_START_FAILED, localListening: false, localHealth: false});
    });
  }
  function makeServer(kind, address) {
    const server = createHttpServer((req, res) => gate({kind, address}, req, res, options.handler));
    const sockets = new Set(); server[ACCEPTED_SOCKETS] = sockets;
    server.on?.('connection', socket => {
      sockets.add(socket); socket.once?.('close', () => sockets.delete(socket));
    });
    return server;
  }
  function selectedForConfig(discovery, config) {
    if (!discovery || discovery.status !== 'SELECTED' || !discovery.selected) return null;
    return discovery.selected.adapterId === config.adapterPreference ? discovery.selected : null;
  }
  async function check(kind, address, port) {
    try { return await probe({address, port, kind, initializationRequired: options.needsInitialization()}); }
    catch { return false; }
  }

  async function start(config, discovery) {
    const selected = selectedForConfig(discovery, config);
    if (!selected) {
      const discoveryStatus = fixedStatus(discovery?.status, STATUS.NETWORK_CHANGED);
      update({status: discoveryStatus, port: config.port, selected: null});
      try {
        reservation = await reserve({
          port: config.port, addresses: ['127.0.0.1'],
          createServer(address) { return makeServer('local', address); }
        });
        [localServer] = reservation.servers;
        monitor(localServer, 'local');
        update({status: discoveryStatus, localListening: true, localHealth: await check('local', '127.0.0.1', config.port)});
      } catch (error) {
        update({status: fixedStatus(error?.code), localListening: false, localHealth: false});
      }
      return state;
    }
    update({status: STATUS.LAN_START_FAILED, port: config.port, selected});
    try {
      reservation = await reserve({
        port: config.port,
        addresses: ['127.0.0.1', selected.address],
        createServer(address) { return makeServer(address === '127.0.0.1' ? 'local' : 'lan', address); }
      });
      [localServer, lanServer] = reservation.servers;
      monitor(localServer, 'local'); monitor(lanServer, 'lan');
      update({
        status: STATUS.LAN_HEALTH_FAILED,
        localListening: true, lanListening: true, localHealth: false, lanHealth: false
      });
      const localHealth = await check('local', '127.0.0.1', config.port);
      const lanHealth = await check('lan', selected.address, config.port);
      update({
        status: localHealth && lanHealth
          ? (options.needsInitialization() ? STATUS.HOST_INITIALIZATION_REQUIRED : STATUS.LAN_SERVER_READY)
          : STATUS.LAN_HEALTH_FAILED,
        localHealth, lanHealth
      });
      if (!lanHealth) {
        await closeServer(lanServer, true); lanServer = null;
        update({lanListening: false, selected: null});
      }
    } catch (error) {
      const failureStatus = fixedStatus(error?.code);
      update({status: failureStatus, localListening: false, lanListening: false, localHealth: false, lanHealth: false});
      // A failed LAN bind must not unnecessarily remove host-local access.
      try {
        reservation = await reserve({
          port: config.port, addresses: ['127.0.0.1'],
          createServer(address) { return makeServer('local', address); }
        });
        [localServer] = reservation.servers;
        monitor(localServer, 'local');
        update({status: failureStatus, localListening: true, localHealth: await check('local', '127.0.0.1', config.port)});
      } catch (localError) {
        update({status: fixedStatus(localError?.code), localListening: false, localHealth: false});
      }
    }
    return state;
  }

  async function reconcile(discovery, config) {
    const next = selectedForConfig(discovery, config);
    const same = next && state.selected && next.adapterId === state.selected.adapterId
      && next.address === state.selected.address && next.prefixLength === state.selected.prefixLength
      && state.lanListening && state.lanHealth;
    if (same) return state;

    // Change the guard first and tear down accepted LAN connections before trusting a new subnet.
    update({status: STATUS.NETWORK_CHANGED, selected: null, lanListening: false, lanHealth: false});
    if (lanServer) await closeServer(lanServer, true);
    lanServer = null;
    if (!next) {
      update({status: fixedStatus(discovery?.status, STATUS.NETWORK_CHANGED)});
      return state;
    }
    update({selected: next});
    const candidate = makeServer('lan', next.address);
    try {
      await listenServer(candidate, next.address, config.port);
      lanServer = candidate;
      monitor(lanServer, 'lan');
      const lanHealth = await check('lan', next.address, config.port);
      update({
        status: lanHealth && state.localListening && state.localHealth
          ? (options.needsInitialization() ? STATUS.HOST_INITIALIZATION_REQUIRED : STATUS.LAN_SERVER_READY)
          : STATUS.LAN_HEALTH_FAILED,
        lanListening: lanHealth, lanHealth
      });
      if (!lanHealth) {
        await closeServer(lanServer, true); lanServer = null;
        update({selected: null});
      }
    } catch (error) {
      await closeServer(candidate, true);
      update({status: fixedStatus(error?.code === 'EADDRINUSE' || error?.code === 'EACCES' ? STATUS.PORT_OCCUPIED : STATUS.LAN_START_FAILED)});
    }
    return state;
  }

  function initializationChanged() {
    if (!state.localListening || !state.localHealth || !state.lanListening || !state.lanHealth) return state;
    return update({status: options.needsInitialization() ? STATUS.HOST_INITIALIZATION_REQUIRED : STATUS.LAN_SERVER_READY});
  }

  function healthFailed() {
    return update({status: STATUS.LAN_HEALTH_FAILED, lanHealth: false});
  }

  async function close() {
    update({status: STATUS.LOCAL_ONLY, selected: null, localListening: false, lanListening: false, localHealth: false, lanHealth: false});
    await Promise.all([localServer, lanServer].filter(Boolean).map(server => closeServer(server, true)));
    if (reservation) await reservation.release();
    reservation = null; localServer = null; lanServer = null;
  }

  return Object.freeze({start, reconcile, initializationChanged, healthFailed, close, state: () => state});
}

module.exports = {
  STATUS, fixedStatus, publicState, createRequestGate, probeListener, discoverLanInWorker, createLanHostController
};
