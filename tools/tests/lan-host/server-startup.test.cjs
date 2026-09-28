'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {loadStartupState, newEmptyState} = require('../../../public-startup');
const {createLanHostController, STATUS} = require('../../../public-lan-server');

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'k-session-b45-t2-'));
  const files = {
    directory,
    data: path.join(directory, 'data.json'),
    config: path.join(directory, 'config.json'),
    lan: path.join(directory, 'lan-deployment.json'),
    attachment: path.join(directory, 'synthetic-attachment.bin')
  };
  return files;
}

function startup(files) {
  return loadStartupState({dataFile: files.data, configFile: files.config, priorFiles: [files.lan], priorDirectories: []});
}

test('LAN config is a prior-file anchor and is never created for a fresh local-only start', t => {
  const files = fixture(); t.after(() => fs.rmSync(files.directory, {recursive: true, force: true}));
  const fresh = startup(files);
  assert.equal(fresh.needsInitialization, true);
  assert.equal(fs.existsSync(files.lan), false);
  assert.deepEqual(fs.readdirSync(files.directory), []);

  const lanBytes = Buffer.from('{"schema":2,"port":8083,"interfaceName":"11111111-1111-1111-1111-111111111111"}\n');
  fs.writeFileSync(files.lan, lanBytes);
  assert.throws(() => startup(files), error => error.code === 'ORPHANED_INSTALLATION');
  assert.deepEqual(fs.readFileSync(files.lan), lanBytes);
  assert.equal(fs.existsSync(files.data), false);
});

test('existing zero-user data does not reopen unsafe setup and remote guard remains host-initialization-required', t => {
  const files = fixture(); t.after(() => fs.rmSync(files.directory, {recursive: true, force: true}));
  const state = newEmptyState();
  const bytes = Buffer.from(JSON.stringify(state, null, 2));
  fs.writeFileSync(files.data, bytes);
  const loaded = startup(files);
  assert.equal(loaded.needsInitialization, false, 'existing safety contract must not recreate Admin over an existing store');
  assert.deepEqual(loaded.data.users, []);
  assert.deepEqual(fs.readFileSync(files.data), bytes);

  let created;
  const reserve = async options => {
    const servers = options.addresses.map(address => options.createServer(address, options.port));
    servers.forEach(server => { server.listening = true; });
    return {servers, async release() {}};
  };
  const controller = createLanHostController({
    handler() { throw Error('remote request must not reach business handler'); },
    needsInitialization: () => true,
    probe: async () => true,
    reservePersistedPort: reserve,
    createHttpServer(handler) {
      const server = {handler, listening: false, closeAllConnections() {}, close(callback) { this.listening = false; callback?.(); }};
      (created ||= []).push(server); return server;
    }
  });
  const selected = {interfaceName: 'Ethernet', address: '192.168.50.10', prefixLength: 24, subnet: '192.168.50.0/24'};
  return controller.start({port: 8084, enabled: true, interfaceName: selected.interfaceName}, {status: 'SELECTED', selected}).then(async result => {
    assert.equal(result.status, STATUS.HOST_INITIALIZATION_REQUIRED);
    const req = {url: '/api/login', method: 'POST', headers: {}, socket: {remoteAddress: '192.168.50.22', localAddress: selected.address}, resume() {}};
    const res = {headers: {}, destroyed: false, writableEnded: false, writeHead(code) { this.statusCode = code; }, end(body) { this.body = body; this.writableEnded = true; }};
    created[1].handler(req, res);
    assert.equal(res.statusCode, 503);
    assert.equal(JSON.parse(res.body).code, STATUS.HOST_INITIALIZATION_REQUIRED);
    assert.deepEqual(fs.readFileSync(files.data), bytes);
    await controller.close();
  });
});

test('listener lifecycle does not rewrite synthetic business, account or attachment bytes', async t => {
  const files = fixture(); t.after(() => fs.rmSync(files.directory, {recursive: true, force: true}));
  const dataBytes = Buffer.from('{"users":[{"username":"synthetic-admin"}],"marker":"unchanged"}\n');
  const attachmentBytes = Buffer.from([0, 1, 2, 3, 254, 255]);
  fs.writeFileSync(files.data, dataBytes); fs.writeFileSync(files.attachment, attachmentBytes);
  const reserve = async options => {
    const servers = options.addresses.map(address => options.createServer(address, options.port));
    servers.forEach(server => { server.listening = true; });
    return {servers, async release() {}};
  };
  const controller = createLanHostController({handler() {}, needsInitialization: () => false,
    reservePersistedPort: reserve, probe: async () => true,
    createHttpServer: handler => ({handler, listening: false, closeAllConnections() {}, close(callback) { this.listening = false; callback?.(); },
      once() {}, off() {}, listen() { this.listening = true; }})});
  const selected = {interfaceName: 'Ethernet', address: '10.20.30.40', prefixLength: 24, subnet: '10.20.30.0/24'};
  const config = {port: 8085, enabled: true, interfaceName: selected.interfaceName};
  await controller.start(config, {status: 'SELECTED', selected});
  await controller.reconcile({status: 'NETWORK_CHANGED', selected: null}, config);
  await controller.close();
  assert.deepEqual(fs.readFileSync(files.data), dataBytes);
  assert.deepEqual(fs.readFileSync(files.attachment), attachmentBytes);
  assert.equal(fs.existsSync(files.lan), false);
});
