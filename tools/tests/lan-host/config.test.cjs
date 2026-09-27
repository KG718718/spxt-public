'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {CONFIG_FILENAME, parseStrictJson, validateLanConfig, createLanConfigStore} = require('../../../public-lan-config');

const ID = 'abcdef01-2345-6789-abcd-ef0123456789';
const VALID = Object.freeze({schema: 1, port: 8083, adapterPreference: ID});

function fixture(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ksession-lan-' + label + '-'));
  const instance = path.join(root, 'instance'); fs.mkdirSync(instance);
  const business = path.join(instance, 'data.json'); fs.writeFileSync(business, Buffer.from([0, 255, 1, 2, 3, 10]));
  return {root, instance, business, config: path.join(instance, CONFIG_FILENAME)};
}
function cleanup(root) { fs.rmSync(root, {recursive: true, force: true}); }

test('strict schema accepts only port and stable adapter GUID, never an IP', () => {
  assert.deepEqual(validateLanConfig(VALID), VALID);
  for (const invalid of [null, [], {}, {...VALID, schema: 2}, {...VALID, port: 8079}, {...VALID, port: 8100},
    {...VALID, port: '8083'}, {...VALID, adapterPreference: 'Ethernet'}, {...VALID, adapterPreference: ID.toUpperCase()},
    {...VALID, adapterPreference: '00000000-0000-0000-0000-000000000000'},
    {...VALID, address: '192.168.1.2'}, {...VALID, unknown: true}]) {
    assert.throws(() => validateLanConfig(invalid), {code: 'LAN_CONFIG_INVALID'});
  }
});

test('save and reload are isolated from byte-identical business data', () => {
  const f = fixture('roundtrip');
  try {
    const before = fs.readFileSync(f.business);
    const store = createLanConfigStore({instanceDirectory: f.instance});
    assert.equal(store.load(), null); assert.equal(store.file, f.config);
    store.save(VALID);
    store.save({...VALID, port: 8084});
    assert.deepEqual(createLanConfigStore({instanceDirectory: f.instance}).load(), {...VALID, port: 8084});
    assert.deepEqual(fs.readFileSync(f.business), before);
    assert.deepEqual(fs.readdirSync(f.instance).sort(), ['data.json', CONFIG_FILENAME]);
  } finally { cleanup(f.root); }
});

test('damaged or linked config is rejected and never overwritten', t => {
  const damaged = fixture('damaged');
  try {
    const original = '{"schema":1,"port":8083,"adapterPreference":"bad"}\n'; fs.writeFileSync(damaged.config, original);
    assert.throws(() => createLanConfigStore({instanceDirectory: damaged.instance}), {code: 'LAN_CONFIG_INVALID'});
    assert.equal(fs.readFileSync(damaged.config, 'utf8'), original);
  } finally { cleanup(damaged.root); }

  const linked = fixture('linked-config'); const target = path.join(linked.root, 'outside.json'); fs.writeFileSync(target, JSON.stringify(VALID));
  try {
    fs.linkSync(target, linked.config);
    assert.throws(() => createLanConfigStore({instanceDirectory: linked.instance}), {code: 'LAN_CONFIG_UNREADABLE'});
    assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), VALID);
  } finally { cleanup(linked.root); }
});

test('strict JSON rejects duplicate decoded keys recursively and trailing values without changing files', () => {
  const f = fixture('strict-json');
  const attachments = path.join(f.instance, 'attachments'); fs.mkdirSync(attachments);
  const attachment = path.join(attachments, 'synthetic.bin'); fs.writeFileSync(attachment, Buffer.from([9, 8, 7, 0, 255]));
  const sources = [
    `{"schema":1,"port":8080,"port":8099,"adapterPreference":"${ID}"}`,
    `{"schema":1,"port":8080,"po\\u0072t":8099,"adapterPreference":"${ID}"}`,
    `{"schema":1,"port":8080,"adapterPreference":"${ID}","extra":{"x":1,"\\u0078":2}}`,
    `{"schema":1,"port":8080,"adapterPreference":"${ID}","extra":[{"x":1,"x":2}]}`,
    `{"schema":1,"port":8080,"adapterPreference":"${ID}","unknown":true}`,
    `{"schema":1,"port":8080,"adapterPreference":"${ID}"}{"schema":1}`,
    `{"schema":1,"port":8080,"adapterPreference":"${ID}"} true`
  ];
  try {
    assert.equal(JSON.parse(sources[0]).port, 8099, 'native JSON.parse demonstrates the old last-wins counterexample');
    for (const source of sources) {
      fs.writeFileSync(f.config, source);
      const before = {config: fs.readFileSync(f.config), business: fs.readFileSync(f.business), attachment: fs.readFileSync(attachment)};
      assert.throws(() => createLanConfigStore({instanceDirectory: f.instance}), {code: 'LAN_CONFIG_INVALID'});
      assert.deepEqual(fs.readFileSync(f.config), before.config);
      assert.deepEqual(fs.readFileSync(f.business), before.business);
      assert.deepEqual(fs.readFileSync(attachment), before.attachment);
    }
    fs.writeFileSync(f.config, sources[0]);
    const beforeSave = {config: fs.readFileSync(f.config), business: fs.readFileSync(f.business), attachment: fs.readFileSync(attachment)};
    const cli = path.join(__dirname, '../../lan-host/config-cli.cjs');
    const result = spawnSync(process.execPath, [cli, 'save', '--instance-dir', f.instance, '--port', '8083',
      '--adapter-preference', ID], {encoding: 'utf8', windowsHide: true, timeout: 10000});
    assert.equal(result.status, 20); assert.deepEqual(JSON.parse(result.stdout), {schema: 1, status: 'LAN_CONFIG_INVALID'});
    assert.equal(result.stderr, '');
    assert.deepEqual(fs.readFileSync(f.config), beforeSave.config);
    assert.deepEqual(fs.readFileSync(f.business), beforeSave.business);
    assert.deepEqual(fs.readFileSync(attachment), beforeSave.attachment);
  } finally { cleanup(f.root); }
});

test('strict JSON tokenization does not mistake key-like string content for object members', () => {
  const parsed = parseStrictJson('{"text":"the text \\\"port\\\":8080 is inert","nested":{"port":8080},"array":[1,true,null]}');
  assert.equal(parsed.text, 'the text "port":8080 is inert');
  assert.equal(parsed.nested.port, 8080);
  assert.deepEqual(parsed.array, [1, true, null]);
  assert.equal(parseStrictJson('8.08e3'), 8080, 'general JSON parsing remains standards-compliant');
  assert.throws(() => parseStrictJson('{"text":"ok","\\u0074ext":"duplicate"}'));
});

test('LAN config requires canonical integer tokens across load and save boundaries', () => {
  const f = fixture('canonical-numbers');
  const attachments = path.join(f.instance, 'attachments'); fs.mkdirSync(attachments);
  const attachment = path.join(attachments, 'synthetic.bin'); fs.writeFileSync(attachment, Buffer.from([4, 3, 2, 1, 0]));
  const variants = [
    `{"schema":1,"port":8080.0,"adapterPreference":"${ID}"}`,
    `{"schema":1,"port":8.08e3,"adapterPreference":"${ID}"}`,
    `{"schema":1,"port":8.080E+3,"adapterPreference":"${ID}"}`,
    `{"schema":1e0,"port":8080,"adapterPreference":"${ID}"}`,
    `{"schema":1.0,"port":8080,"adapterPreference":"${ID}"}`,
    `{"schema":1,"port":08080,"adapterPreference":"${ID}"}`,
    `{"schema":1,"port":-0,"adapterPreference":"${ID}"}`
  ];
  const cli = path.join(__dirname, '../../lan-host/config-cli.cjs');
  try {
    for (const source of variants) {
      fs.writeFileSync(f.config, source);
      const before = {config: fs.readFileSync(f.config), business: fs.readFileSync(f.business), attachment: fs.readFileSync(attachment)};
      assert.throws(() => createLanConfigStore({instanceDirectory: f.instance}), {code: 'LAN_CONFIG_INVALID'});
      const result = spawnSync(process.execPath, [cli, 'save', '--instance-dir', f.instance, '--port', '8083',
        '--adapter-preference', ID], {encoding: 'utf8', windowsHide: true, timeout: 10000});
      assert.equal(result.status, 20); assert.deepEqual(JSON.parse(result.stdout), {schema: 1, status: 'LAN_CONFIG_INVALID'});
      assert.equal(result.stderr, '');
      assert.deepEqual(fs.readFileSync(f.config), before.config);
      assert.deepEqual(fs.readFileSync(f.business), before.business);
      assert.deepEqual(fs.readFileSync(attachment), before.attachment);
    }
    fs.unlinkSync(f.config);
    const store = createLanConfigStore({instanceDirectory: f.instance});
    store.save(VALID);
    assert.deepEqual(createLanConfigStore({instanceDirectory: f.instance}).load(), VALID);
    assert.equal(fs.readFileSync(f.config, 'utf8'), JSON.stringify(VALID, null, 2) + '\n');
  } finally { cleanup(f.root); }
});

test('instance path through a directory link is rejected without outside writes', () => {
  const f = fixture('linked-directory'); const link = path.join(f.root, 'instance-link');
  try {
    fs.symlinkSync(f.instance, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => createLanConfigStore({instanceDirectory: link}), {code: 'LAN_CONFIG_PATH_INVALID'});
    assert.equal(fs.existsSync(f.config), false);
  } finally { cleanup(f.root); }
});

test('atomic staging failure and external change both preserve the previous bytes', () => {
  const f = fixture('failures');
  try {
    fs.writeFileSync(f.config, JSON.stringify(VALID, null, 2) + '\n');
    const before = fs.readFileSync(f.config);
    const failingFs = {...fs, renameSync() { const error = new Error('synthetic rename failure'); error.code = 'EIO'; throw error; }};
    const store = createLanConfigStore({instanceDirectory: f.instance, fs: failingFs});
    assert.throws(() => store.save({...VALID, port: 8084}), {code: 'LAN_CONFIG_SAVE_FAILED'});
    assert.deepEqual(fs.readFileSync(f.config), before);
    assert.equal(fs.readdirSync(f.instance).some(name => name.startsWith('.lan-deployment-')), false);

    const concurrent = createLanConfigStore({instanceDirectory: f.instance});
    fs.writeFileSync(f.config, JSON.stringify({...VALID, port: 8085}, null, 2) + '\n');
    const changed = fs.readFileSync(f.config);
    assert.throws(() => concurrent.save({...VALID, port: 8086}), {code: 'LAN_CONFIG_EXTERNAL_CHANGE'});
    assert.deepEqual(fs.readFileSync(f.config), changed);
  } finally { cleanup(f.root); }
});

test('restricted config CLI reuses the schema and never echoes the instance path', () => {
  const f = fixture('cli');
  const cli = path.join(__dirname, '../../lan-host/config-cli.cjs');
  const run = args => spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8', windowsHide: true, timeout: 10000});
  try {
    let result = run(['read', '--instance-dir', f.instance]);
    assert.equal(result.status, 10); assert.deepEqual(JSON.parse(result.stdout), {schema: 1, status: 'NOT_CONFIGURED', config: null});
    assert.equal(result.stdout.includes(f.instance), false); assert.equal(result.stderr, '');

    result = run(['save', '--port', '8083', '--adapter-preference', ID, '--instance-dir', f.instance]);
    assert.equal(result.status, 0); assert.deepEqual(JSON.parse(result.stdout), {schema: 1, status: 'SAVED', config: VALID});
    assert.equal(result.stdout.includes(f.instance), false); assert.equal(result.stderr, '');

    result = run(['save', '--instance-dir', f.instance, '--port', '9999', '--adapter-preference', ID]);
    assert.equal(result.status, 20); assert.deepEqual(JSON.parse(result.stdout), {schema: 1, status: 'LAN_CONFIG_INVALID'});
    assert.equal(result.stdout.includes(f.instance), false); assert.equal(result.stderr, '');

    result = run(['read', '--instance-dir', f.instance, '--instance-dir', f.instance]);
    assert.equal(result.status, 20); assert.deepEqual(JSON.parse(result.stdout), {schema: 1, status: 'CLI_ARGUMENT_INVALID'});
  } finally { cleanup(f.root); }
});
