'use strict';

const path = require('node:path');
const production = require('../../../public-lan-network');

const PROBES = Object.freeze([
  ['N01', 'Get-NetConnectionProfile', ''],
  ['N02', 'Get-NetRoute', "-AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0'"],
  ['N03', 'Get-NetRoute', '-AddressFamily IPv4'],
  ['N04', 'Get-NetAdapter', '-IncludeHidden'],
  ['N05', 'Get-NetIPAddress', '-AddressFamily IPv4']
]);
const REASONS = new Set(['CMDLET_UNAVAILABLE', 'COMMAND_FAILED', 'TIMEOUT',
  'STDERR_NONEMPTY', 'JSON_INVALID', 'RESULT_OK', 'INTERNAL']);

function classifyProbe(result) {
  try {
    if (!result) return {status: 'FAIL', reason: 'COMMAND_FAILED'};
    if (result.error?.code === 'ETIMEDOUT') return {status: 'FAIL', reason: 'TIMEOUT'};
    if (result.error || result.signal) return {status: 'FAIL', reason: 'COMMAND_FAILED'};
    if (result.status === 7) return {status: 'FAIL', reason: 'CMDLET_UNAVAILABLE'};
    if (result.status !== 0) return {status: 'FAIL', reason: 'COMMAND_FAILED'};
    if (String(result.stderr || '').trim()) return {status: 'FAIL', reason: 'STDERR_NONEMPTY'};
    try { JSON.parse(String(result.stdout || '').replace(/^\ufeff/, '')); }
    catch { return {status: 'FAIL', reason: 'JSON_INVALID'}; }
    return {status: 'PASS', reason: 'RESULT_OK'};
  } catch { return {status: 'FAIL', reason: 'INTERNAL'}; }
}

function validateProbe(report) {
  return !!report && typeof report === 'object' && !Array.isArray(report)
    && Object.keys(report).sort().join('|') === 'reason|status'
    && ['PASS', 'FAIL'].includes(report.status) && REASONS.has(report.reason)
    && (report.status === 'PASS') === (report.reason === 'RESULT_OK');
}

function runProbes(spawnSync) {
  const runtime = production.resolveSystemPowerShell();
  return PROBES.map(([, name, args]) => {
    try {
      const script = `$ErrorActionPreference='Stop'\n` +
        `if ($null -eq (Get-Command '${name}' -ErrorAction SilentlyContinue)) { exit 7 }\n` +
        `try { @(${name} ${args} -ErrorAction Stop) | Out-Null; [Console]::Out.Write('true') } catch { exit 2 }`;
      const encoded = Buffer.from(script, 'utf16le').toString('base64');
      const result = spawnSync(runtime.executable, ['-NoLogo', '-NoProfile', '-NonInteractive',
        '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
        encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
        cwd: path.win32.join(runtime.systemRoot, 'System32'), env: runtime.environment
      });
      return classifyProbe(result);
    } catch { return {status: 'FAIL', reason: 'INTERNAL'}; }
  });
}

module.exports = {PROBES, classifyProbe, validateProbe, runProbes};
