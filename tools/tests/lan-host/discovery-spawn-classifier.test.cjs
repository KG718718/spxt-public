'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {REPORT_KEYS, runClassifier, validateReport} = require('./discovery-spawn-classifier.cjs');

const fakeFs = {
  lstatSync(value) {
    return {
      isDirectory: () => value.toLowerCase() === 'c:\\windows',
      isFile: () => value.toLowerCase().endsWith('\\powershell.exe'),
      isSymbolicLink: () => false
    };
  },
  realpathSync: {native: value => value}
};
const productionOptions = {platform: 'win32', systemRoot: 'C:\\Windows', fs: fakeFs};
const observedReports = [];

function check(result, expectedReason, expectedBooleans = {}) {
  const report = runClassifier({productionOptions, spawnSync: () => result});
  assert.equal(validateReport(report), true);
  assert.deepEqual(Object.keys(report).sort(), [...REPORT_KEYS].sort());
  assert.equal(report.reason, expectedReason);
  for (const [key, value] of Object.entries(expectedBooleans)) assert.equal(report[key], value, key);
  observedReports.push(report);
  return report;
}

test('R01: normal exit and valid JSON', () => {
  const report = check({status: 0, signal: null, stderr: '', stdout: '["SECRET_STDOUT"]'}, 'COMMAND_PASS', {
    processResultPresent: true, spawnError: false, timedOut: false, exitZero: true,
    signalPresent: false, stderrEmpty: true, stdoutPresent: true, jsonParseable: true
  });
  assert.equal(JSON.stringify(report).includes('SECRET_STDOUT'), false);
});

test('R02: spawn error is classified without retaining its message', () => {
  const report = check({error: Object.assign(Error('SECRET_EXCEPTION'), {code: 'ENOENT'}),
    status: null, signal: null, stderr: '', stdout: ''}, 'SPAWN_FAILED', {spawnError: true});
  assert.equal(JSON.stringify(report).includes('SECRET_EXCEPTION'), false);
});

test('R03: timeout has a distinct reason', () => {
  check({error: Object.assign(Error('SECRET_TIMEOUT'), {code: 'ETIMEDOUT'}),
    status: null, signal: 'SIGTERM', stderr: '', stdout: ''}, 'TIMEOUT', {timedOut: true});
});

test('R04: nonzero exit', () => {
  check({status: 1, signal: null, stderr: '', stdout: '[]'}, 'EXIT_NONZERO', {exitZero: false});
});

test('R05: signal', () => {
  check({status: null, signal: 'SIGTERM', stderr: '', stdout: ''}, 'SIGNAL', {signalPresent: true});
});

test('R06: nonempty stderr is not emitted', () => {
  const report = check({status: 0, signal: null, stderr: 'SECRET_STDERR', stdout: '[]'},
    'STDERR_NONEMPTY', {stderrEmpty: false});
  assert.equal(JSON.stringify(report).includes('SECRET_STDERR'), false);
});

test('R07: empty stdout', () => {
  check({status: 0, signal: null, stderr: '', stdout: ''}, 'STDOUT_EMPTY', {stdoutPresent: false});
});

test('R08: invalid JSON is not emitted', () => {
  const report = check({status: 0, signal: null, stderr: '', stdout: 'SECRET_BAD_JSON'},
    'JSON_INVALID', {jsonParseable: false});
  assert.equal(JSON.stringify(report).includes('SECRET_BAD_JSON'), false);
});

test('R09: null process result', () => {
  check(null, 'SPAWN_FAILED', {processResultPresent: false});
});

test('R10: unknown exception is INTERNAL without exception text', () => {
  const report = runClassifier({productionOptions, spawnSync: () => {throw Error('SECRET_THROWN');}});
  assert.equal(validateReport(report), true);
  assert.equal(report.reason, 'INTERNAL');
  assert.equal(JSON.stringify(report).includes('SECRET_THROWN'), false);
  observedReports.push(report);
});

test('production discovery supplies the fixed spawn contract', () => {
  let called = false;
  const report = runClassifier({productionOptions, spawnSync(executable, args, options) {
    called = true;
    assert.equal(executable, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    assert.deepEqual(args.slice(0, -1), ['-NoLogo', '-NoProfile', '-NonInteractive',
      '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand']);
    assert.match(args.at(-1), /^[A-Za-z0-9+/]+={0,2}$/);
    assert.equal(options.cwd, 'C:\\Windows\\System32');
    assert.equal(options.encoding, 'utf8');
    assert.equal(options.windowsHide, true);
    assert.equal(options.timeout, 15000);
    assert.equal(options.maxBuffer, 1024 * 1024);
    assert.deepEqual(Object.keys(options.env).sort(), ['PATH', 'PSModulePath', 'SystemRoot', 'WINDIR']);
    return {status: 0, signal: null, stderr: '', stdout: '[]'};
  }});
  assert.equal(called, true);
  assert.equal(report.reason, 'COMMAND_PASS');
});

test('fixed synthetic evidence contains only the ten classified reports', () => {
  const evidencePath = path.resolve(__dirname,
    '../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/discovery-spawn-synthetic.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.length, 10);
  for (const report of evidence) assert.equal(validateReport(report), true);
  assert.deepEqual(evidence, observedReports);
});
