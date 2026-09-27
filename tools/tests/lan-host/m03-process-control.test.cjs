'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {FIXED_JSON, SCRIPT, REPORT_KEYS, runProcessControl, validateReport} =
  require('./m03-process-control.cjs');
const prior = require('./discovery-pre-network-layer.cjs');

const fakeFs = {
  lstatSync(value) {
    return {isDirectory: () => value.toLowerCase() === 'c:\\windows',
      isFile: () => value.toLowerCase().endsWith('\\powershell.exe'), isSymbolicLink: () => false};
  },
  realpathSync: {native: value => value}
};
const productionOptions = {systemRoot: 'C:\\Windows', fs: fakeFs};
const clean = () => ({status: 0, signal: null, stdout: FIXED_JSON, stderr: ''});

function run(result) {
  let calls = 0;
  const report = runProcessControl({platform: 'win32', productionOptions,
    spawnSync(executable, args, options) {
      calls += 1;
      assert.equal(executable, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
      assert.deepEqual(args.slice(0, -1), ['-NoLogo', '-NoProfile', '-NonInteractive',
        '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand']);
      assert.equal(Buffer.from(args.at(-1), 'base64').toString('utf16le'), SCRIPT);
      assert.equal(options.cwd, 'C:\\Windows\\System32');
      assert.equal(options.encoding, 'utf8');
      assert.equal(options.windowsHide, true);
      assert.equal(options.timeout, 15000);
      assert.equal(options.maxBuffer, 1024 * 1024);
      assert.deepEqual(Object.keys(options.env).sort(), ['PATH', 'PSModulePath', 'SystemRoot', 'WINDIR']);
      if (result instanceof Error) throw result;
      return result;
    }});
  assert.equal(calls, 1);
  assert.equal(validateReport(report), true);
  assert.deepEqual(Object.keys(report).sort(), [...REPORT_KEYS].sort());
  return report;
}

test('M03 payload explicitly imports Utility then uses M02-equivalent serialization', () => {
  assert.equal(SCRIPT, "$ErrorActionPreference='Stop'\n" +
    'Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop\n' +
    prior.SCRIPT.M02.split('\n')[1]);
  assert.doesNotMatch(SCRIPT, /Get-Net|Get-Command|Registry|Get-Cim|Get-Wmi|Start-Transcript/i);
});

test('M03-T01: clean whole process is PASS', () => {
  assert.deepEqual(run(clean()), {schema: 1, status: 'PASS',
    result: 'EXPLICIT_IMPORT_SERIALIZATION_PASS', stderrEmpty: true});
});

test('M03-T02: hypothetical module stderr is UNRESOLVED', () => {
  assert.deepEqual(run({...clean(), stderr: 'SYNTHETIC_STDERR'}), {schema: 1,
    status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty: false});
});

test('M03-T03: hypothetical serialization stderr is the same UNRESOLVED', () => {
  assert.deepEqual(run({...clean(), stderr: 'SYNTHETIC_STDERR'}), {schema: 1,
    status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty: false});
});

test('M03-T04: nonzero exit cannot pass even with empty stderr', () => {
  assert.deepEqual(run({...clean(), status: 2}), {schema: 1,
    status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty: true});
});

test('M03-T05: timeout reports stderr not proven empty, without claiming observed bytes', () => {
  const error = Object.assign(Error('SYNTHETIC_ERROR'), {code: 'ETIMEDOUT'});
  assert.deepEqual(run({status: null, error, stdout: '', stderr: undefined}), {schema: 1,
    status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty: false});
});

test('M03-T06: spawn error and null result remain UNRESOLVED', () => {
  assert.equal(run({status: null, error: Error('SYNTHETIC_ERROR'), stderr: undefined}).stderrEmpty,
    false);
  assert.equal(run(null).result, 'UNRESOLVED');
});

test('M03-T07: nonfixed stdout is UNRESOLVED', () => {
  assert.deepEqual(run({...clean(), stdout: 'SYNTHETIC_OUTPUT'}), {schema: 1,
    status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty: true});
});

test('M03-T08: verifier rejects an extra field', () => {
  const report = run(clean());
  assert.equal(validateReport({...report, stdout: 'SYNTHETIC_OUTPUT'}), false);
  assert.equal(validateReport({...report, result: 'EXPLICIT_IMPORT_SERIALIZATION_FAIL'}), false);
  assert.equal(validateReport({...report, stderrEmpty: 'UNKNOWN'}), false);
});

test('fixed synthetic evidence contains no raw or free-form fields', () => {
  const evidencePath = path.resolve(__dirname,
    '../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/m03-process-synthetic.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.deepEqual(evidence, [run(clean()), run({...clean(), stderr: 'SYNTHETIC_STDERR'}),
    run({status: null, error: Error('SYNTHETIC_ERROR'), stderr: undefined})]);
  assert.equal(evidence.every(validateReport), true);
  assert.equal(JSON.stringify(evidence).includes('SYNTHETIC_'), false);
});
