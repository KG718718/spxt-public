'use strict';

// Synthetic localhost-only runtime check. A real private adapter is intentionally never queried.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');

test('LAN mode without deployment config retains local first-Admin flow and creates no LAN config', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'k-session-b45-t2-runtime-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env, PORT: '0', KSESSION_HOST: '127.0.0.1', KSESSION_LAN_MODE: '1',
      KSESSION_DATA_FILE: path.join(directory, 'data.json'), KSESSION_CONFIG_FILE: path.join(directory, 'config.json'),
      KSESSION_ATTACHMENTS_DIR: path.join(directory, 'attachments'), KSESSION_BACKUPS_DIR: path.join(directory, 'backups'),
      KSESSION_MAIL_CONFIG_FILE: path.join(directory, 'mail-reminder.config.json'),
      KSESSION_SMTP_SECRET_FILE: path.join(directory, 'runtime', 'secrets', 'smtp-pass.dpapi'),
      KSESSION_MAIL_ENABLED: '0', KSESSION_MAIL_DRY_RUN: '1', KSESSION_MAIL_FORMAL_ENABLED: '0',
      KSESSION_SKIP_STARTUP_JOBS: '1'
    }
  });
  let output = ''; let port = 0;
  child.stdout.on('data', chunk => { output += chunk; port ||= Number(output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/)?.[1] || 0); });
  child.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null) child.kill();
    await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  });
  for (let count = 0; count < 100 && !port && child.exitCode === null; count += 1) {
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.ok(port, output);
  const setup = await fetch('http://127.0.0.1:' + port + '/api/setup');
  assert.equal(setup.status, 200);
  assert.equal((await setup.json()).initializationRequired, true);
  assert.equal(fs.existsSync(path.join(directory, 'lan-deployment.json')), false);
  const pendingStatus = await fetch('http://127.0.0.1:' + port + '/api/lan/status');
  assert.equal(pendingStatus.status, 200);
  assert.equal((await pendingStatus.json()).status, 'HOST_INITIALIZATION_REQUIRED');

  const origin = 'http://127.0.0.1:' + port;
  const initialized = await fetch(origin + '/api/setup', {
    method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin},
    body: JSON.stringify({username: 'synthetic-lan-host-admin', password: 'Synthetic-LAN-Host-Secret-2026!'})
  });
  assert.equal(initialized.status, 201, await initialized.text());
  assert.equal(fs.existsSync(path.join(directory, 'lan-deployment.json')), false);
  const localStatus = await fetch(origin + '/api/lan/status');
  assert.equal((await localStatus.json()).status, 'LOCAL_ONLY');
  const saved = JSON.parse(fs.readFileSync(path.join(directory, 'data.json'), 'utf8'));
  assert.equal(saved.users.length, 1); assert.equal(saved.users[0].role, 'admin');
});

test('damaged LAN config fails closed with explicit status while existing Local data stays byte-identical', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'k-session-b45-t2-damaged-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const data = require('../../../public-startup').newEmptyState();
  data.users.push({username: 'synthetic-admin', password: 'synthetic-stored-hash', role: 'admin', accountStatus: 'active'});
  const dataBytes = Buffer.from(JSON.stringify(data, null, 2));
  const lanBytes = Buffer.from('{"schema":1,"port":8083,"adapterPreference":"invalid"}\n');
  fs.writeFileSync(path.join(directory, 'data.json'), dataBytes);
  fs.writeFileSync(path.join(directory, 'lan-deployment.json'), lanBytes);
  const child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, PORT: '0', KSESSION_HOST: '127.0.0.1', KSESSION_LAN_MODE: '1',
      KSESSION_DATA_FILE: path.join(directory, 'data.json'), KSESSION_CONFIG_FILE: path.join(directory, 'config.json'),
      KSESSION_ATTACHMENTS_DIR: path.join(directory, 'attachments'), KSESSION_BACKUPS_DIR: path.join(directory, 'backups'),
      KSESSION_MAIL_CONFIG_FILE: path.join(directory, 'mail-reminder.config.json'),
      KSESSION_SMTP_SECRET_FILE: path.join(directory, 'runtime', 'secrets', 'smtp-pass.dpapi'),
      KSESSION_MAIL_ENABLED: '0', KSESSION_MAIL_DRY_RUN: '1', KSESSION_MAIL_FORMAL_ENABLED: '0',
      KSESSION_SKIP_STARTUP_JOBS: '1'}
  });
  let output = ''; let port = 0;
  child.stdout.on('data', chunk => { output += chunk; port ||= Number(output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/)?.[1] || 0); });
  child.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => { if (child.exitCode === null) child.kill(); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)); });
  for (let count = 0; count < 100 && !port && child.exitCode === null; count += 1) await new Promise(resolve => setTimeout(resolve, 25));
  assert.ok(port, output);
  const status = await fetch('http://127.0.0.1:' + port + '/api/lan/status');
  assert.equal(status.status, 200);
  const view = await status.json();
  assert.equal(view.status, 'LAN_START_FAILED');
  assert.equal(view.localListening, true); assert.equal(view.lanListening, false);
  assert.deepEqual(fs.readFileSync(path.join(directory, 'data.json')), dataBytes);
  assert.deepEqual(fs.readFileSync(path.join(directory, 'lan-deployment.json')), lanBytes);
});
