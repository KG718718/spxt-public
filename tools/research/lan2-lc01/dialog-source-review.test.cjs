'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');
const policyPath = 'tools/research/lan2-lc01/policy.go';
const adapterPath = 'tools/tests/windows-installer/beta4-upgrade/second-launcher-windows.go.in';
const acceptedF3 = 'c8886e6b6d413c2fd73d6716621d07a80b337e58';
const testedSource = '95a03c484d';
const masterBaseline = 'e2a5d10e496';

function gitShow(ref, file) {
  return execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8', windowsHide: true });
}

function current(file) {
  return fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
}

function goString(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")`));
  assert.ok(match, 'fixed constant unavailable');
  return JSON.parse(match[1]);
}

test('R1 policy and adapter equal tested source and master baseline', () => {
  for (const file of [policyPath, adapterPath]) {
    const now = current(file);
    assert.equal(now, gitShow(testedSource, file).replaceAll('\r\n', '\n'));
    assert.equal(now, gitShow(masterBaseline, file).replaceAll('\r\n', '\n'));
  }
});

test('R1 accepted F3 source exactly constructs the policy title and busy body', () => {
  const policy = current(policyPath);
  const core = gitShow(acceptedF3, 'tools/windows-launcher/core.go');
  const main = gitShow(acceptedF3, 'tools/windows-launcher/main_windows.go');
  const title = goString(policy, 'lcProductTitle');
  const fullBody = goString(policy, 'lcBusyText');
  const separator = '\r\n错误编号：';
  const split = fullBody.lastIndexOf(separator);
  assert.notEqual(split, -1);
  const message = fullBody.slice(0, split);
  const code = fullBody.slice(split + separator.length);
  assert.equal(goString(core, 'product'), title);
  assert.ok(main.includes(`fail(${JSON.stringify(code)}, ${JSON.stringify(message)})`));
  assert.ok(main.includes('message(f.Message + "\\r\\n错误编号：" + f.Code)'));
  assert.ok(main.includes('uintptr(unsafe.Pointer(ptr(product))), 0x10)'));
});

test('R1 adapter counts every nonempty Static and keeps only the last text', () => {
  const adapter = current(adapterPath);
  assert.ok(adapter.includes('SendMessageTimeoutW'));
  assert.ok(adapter.includes('if class == "Static" && text != ""'));
  assert.ok(adapter.includes('d.TextCount++'));
  assert.ok(adapter.includes('d.Text = text'));
  assert.ok(!adapter.includes('GetWindowLong'));
  assert.ok(adapter.includes('d.ButtonID = int(int32(id))'));
  assert.ok(adapter.includes('parent == hwnd'));
});
