'use strict';

const FIXED_JSON = '{"ok":true}';
const KEYS = Object.freeze(['schema', 'status', 'result']);
const VALID_RESULTS = new Set(['EXPLICIT_IMPORT_SERIALIZATION_PASS',
  'EXPLICIT_IMPORT_SERIALIZATION_FAIL', 'UNRESOLVED']);

// A spawnSync result aggregates stderr for the entire child process. A nonempty
// aggregate cannot identify which in-process phase produced it.
function classifyAggregate(result) {
  const unresolved = {schema: 1, status: 'BLOCKED', result: 'UNRESOLVED'};
  try {
    if (!result || result.error || result.status !== 0 || result.signal) return unresolved;
    if (String(result.stdout || '').replace(/^\ufeff/, '').trim() !== FIXED_JSON) return unresolved;
    if (String(result.stderr || '').trim()) return unresolved;
    return {schema: 1, status: 'PASS', result: 'EXPLICIT_IMPORT_SERIALIZATION_PASS'};
  } catch { return unresolved; }
}

function validateReport(report) {
  return !!report && typeof report === 'object' && !Array.isArray(report)
    && Object.keys(report).sort().join('|') === [...KEYS].sort().join('|')
    && report.schema === 1 && VALID_RESULTS.has(report.result)
    && ((report.status === 'PASS' && report.result === 'EXPLICIT_IMPORT_SERIALIZATION_PASS')
      || (report.status === 'BLOCKED' && report.result === 'UNRESOLVED'));
}

module.exports = {FIXED_JSON, KEYS, classifyAggregate, validateReport};
