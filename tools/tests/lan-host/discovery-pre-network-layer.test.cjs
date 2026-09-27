'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {FIXED_JSON, SCRIPT, REPORT_KEYS, classifyStage, runLayerChain, validateReport} =
  require('./discovery-pre-network-layer.cjs');
const prior = require('./discovery-stderr-layer.cjs');

const fakeFs = {
  lstatSync(value) {
    return {isDirectory: () => value.toLowerCase() === 'c:\\windows',
      isFile: () => value.toLowerCase().endsWith('\\powershell.exe'), isSymbolicLink: () => false};
  },
  realpathSync: {native: value => value}
};
const productionOptions = {systemRoot: 'C:\\Windows', fs: fakeFs};
const clean = () => ({status: 0, signal: null, stdout: FIXED_JSON, stderr: ''});

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
    assert.equal(Buffer.from(args.at(-1), 'base64').toString('utf16le'), SCRIPT[`M0${calls}`]);
    const answer = answers[calls++];
    if (answer instanceof Error) throw answer;
    return answer;
  }});
  assert.equal(validateReport(report), true);
  assert.deepEqual(Object.keys(report).sort(), [...REPORT_KEYS].sort());
  return {report, calls};
}

test('M00 is pure language/.NET; M01 explicitly loads Utility; M02 matches historical S01', () => {
  assert.doesNotMatch(SCRIPT.M00, /ConvertTo-Json|Write-Output|Out-|Get-|Import-Module|Microsoft\.PowerShell\.Utility/i);
  assert.match(SCRIPT.M00, /\[Console\]::Out\.Write/);
  assert.match(SCRIPT.M01, /Import-Module Microsoft\.PowerShell\.Utility -ErrorAction Stop/);
  assert.doesNotMatch(SCRIPT.M01, /ConvertTo-Json|Get-Net|Get-Command/);
  assert.equal(SCRIPT.M02, prior.SCRIPT.S01);
});

test('M00 exact fixed stdout is required, without normalization', () => {
  assert.equal(classifyStage(clean(), 'M00').pass, true);
  assert.equal(classifyStage({...clean(), stdout: `${FIXED_JSON}\n`}, 'M00').pass, false);
  assert.equal(run([{...clean(), stdout: `${FIXED_JSON}\n`}]).report.layer, 'UNRESOLVED');
});

test('M00 stderr selects SHELL_OR_ENVIRONMENT and stops', () => {
  const {report, calls} = run([{...clean(), stderr: 'SECRET_STDERR'}]);
  assert.equal(calls, 1);
  assert.deepEqual(report, {schema: 1, status: 'FAIL', layer: 'SHELL_OR_ENVIRONMENT',
    M00: 'FAIL', M01: 'NOT_RUN', M02: 'NOT_RUN'});
});

test('M01 stderr selects UTILITY_MODULE_LOAD and stops', () => {
  const {report, calls} = run([clean(), {...clean(), stderr: 'SECRET_STDERR'}]);
  assert.equal(calls, 2);
  assert.deepEqual([report.layer, report.M00, report.M01, report.M02],
    ['UTILITY_MODULE_LOAD', 'PASS', 'FAIL', 'NOT_RUN']);
});

test('M02 stderr selects UTILITY_SERIALIZATION', () => {
  const {report, calls} = run([clean(), clean(), {...clean(), stdout: `${FIXED_JSON}\n`, stderr: 'SECRET_STDERR'}]);
  assert.equal(calls, 3);
  assert.deepEqual([report.layer, report.M00, report.M01, report.M02],
    ['UTILITY_SERIALIZATION', 'PASS', 'PASS', 'FAIL']);
});

test('all three clean stages select PRE_NETWORK_PASS', () => {
  const {report, calls} = run([clean(), clean(), {...clean(), stdout: `${FIXED_JSON}\n`}]);
  assert.equal(calls, 3);
  assert.deepEqual([report.status, report.layer, report.M00, report.M01, report.M02],
    ['PASS', 'PRE_NETWORK_PASS', 'PASS', 'PASS', 'PASS']);
});

test('nonzero with stderr is UNRESOLVED', () => {
  assert.equal(run([{...clean(), status: 2, stderr: 'SECRET_STDERR'}]).report.layer, 'UNRESOLVED');
});

test('timeout and spawn errors are UNRESOLVED', () => {
  const timeout = Object.assign(Error('SECRET_EXCEPTION'), {code: 'ETIMEDOUT'});
  assert.equal(run([{...clean(), error: timeout, stderr: 'SECRET_STDERR'}]).report.layer, 'UNRESOLVED');
  assert.equal(run([{...clean(), error: Error('SECRET_EXCEPTION')}]).report.layer, 'UNRESOLVED');
  assert.equal(run([null]).report.layer, 'UNRESOLVED');
});

test('signal and invalid fixed stdout are UNRESOLVED', () => {
  assert.equal(run([{...clean(), signal: 'SIGTERM', stderr: 'SECRET_STDERR'}]).report.layer,
    'UNRESOLVED');
  assert.equal(run([{...clean(), stdout: 'SECRET_STDOUT', stderr: 'SECRET_STDERR'}]).report.layer,
    'UNRESOLVED');
});

test('unknown thrown exception is UNRESOLVED and stops', () => {
  const {report, calls} = run([Error('SECRET_EXCEPTION')]);
  assert.equal(calls, 1);
  assert.equal(report.layer, 'UNRESOLVED');
  assert.equal(JSON.stringify(report).includes('SECRET_EXCEPTION'), false);
});

test('report whitelist rejects extra fields and inconsistent states', () => {
  const {report} = run([clean(), clean(), clean()]);
  assert.equal(validateReport({...report, stdout: 'SECRET_STDOUT'}), false);
  assert.equal(validateReport({...report, status: 'FAIL', layer: 'UNRESOLVED'}), false);
});

test('stdout/stderr bodies never enter the report', () => {
  for (const answer of [{...clean(), stderr: 'SECRET_STDERR'},
    {...clean(), stdout: 'SECRET_STDOUT', stderr: 'SECRET_STDERR'}]) {
    assert.equal(JSON.stringify(run([answer]).report).includes('SECRET_'), false);
  }
});

test('synthetic evidence contains only the four fixed tier reports', () => {
  const evidencePath = path.resolve(__dirname,
    '../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/pre-network-layer-synthetic.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const stderr = {...clean(), stderr: 'SECRET_STDERR'};
  const expected = [run([stderr]).report, run([clean(), stderr]).report,
    run([clean(), clean(), stderr]).report, run([clean(), clean(), clean()]).report];
  assert.equal(evidence.length, 4);
  assert.equal(evidence.every(validateReport), true);
  assert.deepEqual(evidence, expected);
});
