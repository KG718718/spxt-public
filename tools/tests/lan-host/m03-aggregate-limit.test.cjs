'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {FIXED_JSON, KEYS, classifyAggregate, validateReport} = require('./m03-aggregate-limit.cjs');

const clean = () => ({status: 0, signal: null, stdout: FIXED_JSON, stderr: ''});
const syntheticStderr = 'SYNTHETIC_STDERR';

test('M03-T01: clean aggregate can only support fixed PASS', () => {
  const report = classifyAggregate(clean());
  assert.deepEqual(report, {schema: 1, status: 'PASS', result: 'EXPLICIT_IMPORT_SERIALIZATION_PASS'});
  assert.equal(validateReport(report), true);
});

test('M03-T02/T03: module and serialization stderr are observationally identical', () => {
  // These represent different hypothetical origins with the same spawnSync-visible result.
  const moduleOrigin = {...clean(), stderr: syntheticStderr};
  const serializationOrigin = {...clean(), stderr: syntheticStderr};
  const moduleReport = classifyAggregate(moduleOrigin);
  const serializationReport = classifyAggregate(serializationOrigin);
  assert.deepEqual(moduleReport, serializationReport);
  assert.deepEqual(moduleReport, {schema: 1, status: 'BLOCKED', result: 'UNRESOLVED'});
  assert.equal(moduleReport.result === 'EXPLICIT_IMPORT_SERIALIZATION_FAIL', false);
});

test('M03-T04: nonzero exit is unresolved, even with stderr', () => {
  assert.equal(classifyAggregate({...clean(), status: 2, stderr: syntheticStderr}).result, 'UNRESOLVED');
});

test('M03-T05: timeout is unresolved', () => {
  const error = Object.assign(Error('SYNTHETIC_ERROR'), {code: 'ETIMEDOUT'});
  assert.equal(classifyAggregate({...clean(), error}).result, 'UNRESOLVED');
});

test('M03-T06: spawn error is unresolved', () => {
  assert.equal(classifyAggregate({...clean(), error: Error('SYNTHETIC_ERROR')}).result, 'UNRESOLVED');
  assert.equal(classifyAggregate(null).result, 'UNRESOLVED');
});

test('M03-T07: nonfixed stdout is unresolved', () => {
  assert.equal(classifyAggregate({...clean(), stdout: 'SYNTHETIC_OUTPUT'}).result, 'UNRESOLVED');
});

test('M03-T08: verifier rejects extra fields', () => {
  const report = classifyAggregate(clean());
  assert.equal(validateReport({...report, stderr: syntheticStderr}), false);
  assert.deepEqual(Object.keys(report).sort(), [...KEYS].sort());
});

test('synthetic ambiguity evidence has only fixed enums', () => {
  const evidencePath = path.resolve(__dirname,
    '../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/m03-aggregate-ambiguity-synthetic.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.length, 2);
  assert.deepEqual(evidence, [classifyAggregate({...clean(), stderr: syntheticStderr}),
    classifyAggregate({...clean(), stderr: syntheticStderr})]);
  assert.equal(evidence.every(validateReport), true);
  assert.equal(JSON.stringify(evidence).includes('SYNTHETIC_'), false);
});
