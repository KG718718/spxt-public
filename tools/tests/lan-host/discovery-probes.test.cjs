'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {PROBES, classifyProbe, validateProbe} = require('./discovery-probes.cjs');

test('N01–N05 are the five approved fixed probes', () => {
  assert.deepEqual(PROBES.map(([id]) => id), ['N01', 'N02', 'N03', 'N04', 'N05']);
});

test('probe classifier emits only a fixed status and reason', () => {
  const cases = [
    [{status: 0, stdout: 'true', stderr: ''}, 'PASS', 'RESULT_OK'],
    [{status: 7, stdout: '', stderr: ''}, 'FAIL', 'CMDLET_UNAVAILABLE'],
    [{status: 2, stdout: '', stderr: 'SECRET_STDERR'}, 'FAIL', 'COMMAND_FAILED'],
    [{status: 0, stdout: 'true', stderr: 'SECRET_STDERR'}, 'FAIL', 'STDERR_NONEMPTY'],
    [{status: 0, stdout: 'SECRET_STDOUT', stderr: ''}, 'FAIL', 'JSON_INVALID'],
    [{error: Object.assign(Error('SECRET_ERROR'), {code: 'ETIMEDOUT'})}, 'FAIL', 'TIMEOUT'],
    [{error: Error('SECRET_ERROR')}, 'FAIL', 'COMMAND_FAILED'],
    [null, 'FAIL', 'COMMAND_FAILED']
  ];
  for (const [input, status, reason] of cases) {
    const report = classifyProbe(input);
    assert.equal(validateProbe(report), true);
    assert.deepEqual(report, {status, reason});
    assert.equal(JSON.stringify(report).includes('SECRET_'), false);
  }
});
