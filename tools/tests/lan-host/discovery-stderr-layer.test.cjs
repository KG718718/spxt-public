'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {SCRIPT, REPORT_KEYS, classifyStage, runLayerChain, validateReport} = require('./discovery-stderr-layer.cjs');

const fakeFs = {
  lstatSync(value) {
    return {isDirectory: () => value.toLowerCase() === 'c:\\windows',
      isFile: () => value.toLowerCase().endsWith('\\powershell.exe'), isSymbolicLink: () => false};
  },
  realpathSync: {native: value => value}
};
const productionOptions = {systemRoot: 'C:\\Windows', fs: fakeFs};
const clean = () => ({status: 0, signal: null, stdout: '{"ok":true}', stderr: ''});

function run(answers) {
  let calls = 0;
  const report = runLayerChain({platform: 'win32', productionOptions, spawnSync(executable, args, options) {
    assert.equal(executable, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    assert.deepEqual(args.slice(0, -1), ['-NoLogo', '-NoProfile', '-NonInteractive',
      '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand']);
    assert.equal(options.cwd, 'C:\\Windows\\System32');
    assert.equal(options.encoding, 'utf8');
    assert.equal(options.windowsHide, true);
    assert.equal(options.timeout, 15000);
    assert.equal(options.maxBuffer, 1024 * 1024);
    assert.deepEqual(Object.keys(options.env).sort(), ['PATH', 'PSModulePath', 'SystemRoot', 'WINDIR']);
    assert.equal(Buffer.from(args.at(-1), 'base64').toString('utf16le'), SCRIPT[`S0${calls + 1}`]);
    const answer = answers[calls++];
    if (answer instanceof Error) throw answer;
    return answer;
  }});
  assert.equal(validateReport(report), true);
  assert.deepEqual(Object.keys(report).sort(), [...REPORT_KEYS].sort());
  return {report, calls};
}

test('D01: clean S01 is a stage PASS; startup payload has no network command', () => {
  assert.equal(classifyStage(clean()).pass, true);
  assert.doesNotMatch(SCRIPT.S01, /Get-Net|Import-Module|Get-Command|Get-Cim|Get-Wmi/i);
  assert.deepEqual(run([{...clean(), stderr: 'SECRET_STDERR'}]).calls, 1);
});

test('D02: S01 stderr selects STARTUP and stops', () => {
  const {report, calls} = run([{...clean(), stderr: 'SECRET_STDERR'}]);
  assert.equal(calls, 1);
  assert.deepEqual([report.status, report.layer, report.S01, report.S02, report.S03, report.stderrEmpty],
    ['FAIL', 'STARTUP', 'FAIL', 'NOT_RUN', 'NOT_RUN', false]);
});

test('D03: S02 stderr selects MODULE and stops', () => {
  const {report, calls} = run([clean(), {...clean(), stderr: 'SECRET_STDERR'}]);
  assert.equal(calls, 2);
  assert.deepEqual([report.layer, report.S01, report.S02, report.S03],
    ['MODULE', 'PASS', 'FAIL', 'NOT_RUN']);
});

test('D04: S03 stderr selects QUERY', () => {
  const {report, calls} = run([clean(), clean(), {...clean(), stderr: 'SECRET_STDERR'}]);
  assert.equal(calls, 3);
  assert.deepEqual([report.layer, report.S01, report.S02, report.S03],
    ['QUERY', 'PASS', 'PASS', 'FAIL']);
});

test('D05: three clean stages select PASS', () => {
  const {report, calls} = run([clean(), clean(), clean()]);
  assert.equal(calls, 3);
  assert.deepEqual([report.status, report.layer, report.S01, report.S02, report.S03, report.stderrEmpty],
    ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', true]);
});

test('D06: nonzero exit with stderr is not called stderr-only', () => {
  assert.equal(run([{...clean(), status: 2, stderr: 'SECRET_STDERR'}]).report.layer, 'UNRESOLVED');
});

test('D07: timeout with stderr is not called stderr-only', () => {
  const error = Object.assign(Error('SECRET_EXCEPTION'), {code: 'ETIMEDOUT'});
  assert.equal(run([{...clean(), error, stderr: 'SECRET_STDERR'}]).report.layer, 'UNRESOLVED');
});

test('D08: spawn failure is UNRESOLVED', () => {
  assert.equal(run([null]).report.layer, 'UNRESOLVED');
});

test('D09: invalid JSON with stderr is not called stderr-only', () => {
  assert.equal(run([{...clean(), stdout: 'SECRET_STDOUT', stderr: 'SECRET_STDERR'}]).report.layer,
    'UNRESOLVED');
});

test('D10: unknown exception is UNRESOLVED without disclosure', () => {
  const {report} = run([Error('SECRET_EXCEPTION')]);
  assert.equal(report.layer, 'UNRESOLVED');
  assert.equal(JSON.stringify(report).includes('SECRET_EXCEPTION'), false);
});

test('D11: report with extra field is rejected', () => {
  const {report} = run([clean(), clean(), clean()]);
  assert.equal(validateReport({...report, stdout: 'SECRET_STDOUT'}), false);
  assert.equal(validateReport({...report, status: 'FAIL', layer: 'UNRESOLVED'}), false);
});

test('D12: stdout and stderr bodies are never in a report', () => {
  for (const answer of [{...clean(), stdout: 'SECRET_STDOUT', stderr: 'SECRET_STDERR'},
    {...clean(), stderr: 'SECRET_STDERR'}]) {
    const {report} = run([answer]);
    assert.equal(JSON.stringify(report).includes('SECRET_'), false);
  }
});

test('stage payloads enforce availability-only S02 and one query S03', () => {
  for (const name of ['Get-NetConnectionProfile', 'Get-NetRoute', 'Get-NetAdapter', 'Get-NetIPAddress']) {
    assert.equal(SCRIPT.S02.includes(`Get-Command $name`), true);
    assert.equal(SCRIPT.S02.includes(`'${name}'`), true);
  }
  assert.equal((SCRIPT.S03.match(/Get-NetConnectionProfile/g) || []).length, 1);
  assert.doesNotMatch(SCRIPT.S03, /Get-NetRoute|Get-NetAdapter|Get-NetIPAddress/);
  assert.match(SCRIPT.S03, /Out-Null/);
});

test('fixed synthetic evidence is exactly the four tier outcomes', () => {
  const evidencePath = path.resolve(__dirname,
    '../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/stderr-layer-synthetic.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const stderr = {...clean(), stderr: 'SECRET_STDERR'};
  const expected = [run([stderr]).report, run([clean(), stderr]).report,
    run([clean(), clean(), stderr]).report, run([clean(), clean(), clean()]).report];
  assert.equal(evidence.length, 4);
  assert.equal(evidence.every(validateReport), true);
  assert.deepEqual(evidence, expected);
});
