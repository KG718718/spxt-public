'use strict';

const path = require('node:path');
const production = require('../../../public-lan-network');

const FIXED_JSON = '{"ok":true}';
const SCRIPT = "$ErrorActionPreference='Stop'\n" +
  'Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop\n' +
  '[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress';
const REPORT_KEYS = Object.freeze(['schema', 'status', 'result', 'stderrEmpty']);

// false means "not established empty"; it does not assert that bytes were seen.
function unresolved(stderrEmpty = false) {
  return {schema: 1, status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty};
}

function classifyAggregate(result) {
  if (result === null || result === undefined) return unresolved();
  try {
    const stderrEmpty = typeof result.stderr === 'string'
      ? !result.stderr.trim() : false;
    if (result.error || result.status !== 0 || result.signal) return unresolved(stderrEmpty);
    if (String(result.stdout || '').replace(/^\ufeff/, '').trim() !== FIXED_JSON) {
      return unresolved(stderrEmpty);
    }
    if (stderrEmpty !== true) return unresolved(stderrEmpty);
    return {schema: 1, status: 'PASS', result: 'EXPLICIT_IMPORT_SERIALIZATION_PASS', stderrEmpty: true};
  } catch { return unresolved(); }
}

function runProcessControl(options = {}) {
  if ((options.platform || process.platform) !== 'win32' || typeof options.spawnSync !== 'function') {
    return unresolved();
  }
  try {
    const runtime = production.resolveSystemPowerShell(options.productionOptions);
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
    const result = options.spawnSync(runtime.executable,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      {encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
        cwd: path.win32.join(runtime.systemRoot, 'System32'), env: runtime.environment});
    return classifyAggregate(result);
  } catch { return unresolved(); }
}

function validateReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)
      || Object.keys(report).sort().join('|') !== [...REPORT_KEYS].sort().join('|')
      || report.schema !== 1 || typeof report.stderrEmpty !== 'boolean') return false;
  return (report.status === 'PASS' && report.result === 'EXPLICIT_IMPORT_SERIALIZATION_PASS'
    && report.stderrEmpty === true)
    || (report.status === 'BLOCKED' && report.result === 'UNRESOLVED');
}

module.exports = {FIXED_JSON, SCRIPT, REPORT_KEYS, unresolved,
  classifyAggregate, runProcessControl, validateReport};
