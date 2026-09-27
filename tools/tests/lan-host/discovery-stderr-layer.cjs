'use strict';

const path = require('node:path');
const production = require('../../../public-lan-network');

const STAGES = Object.freeze(['S01', 'S02', 'S03']);
const LAYERS = Object.freeze(['STARTUP', 'MODULE', 'QUERY']);
const SCRIPT = Object.freeze({
  S01: "$ErrorActionPreference='Stop'\n[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress",
  S02: "$ErrorActionPreference='Stop'\n" +
    "$names=@('Get-NetConnectionProfile','Get-NetRoute','Get-NetAdapter','Get-NetIPAddress')\n" +
    "$available=$true; foreach($name in $names) { if ($null -eq (Get-Command $name -ErrorAction SilentlyContinue)) { $available=$false } }\n" +
    '[pscustomobject]@{ok=$available} | ConvertTo-Json -Compress',
  S03: "$ErrorActionPreference='Stop'\n" +
    'Get-NetConnectionProfile -ErrorAction Stop | Out-Null\n' +
    '[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress'
});
const REPORT_KEYS = Object.freeze(['schema', 'status', 'layer', 'S01', 'S02', 'S03', 'stderrEmpty']);

function emptyReport() {
  return {schema: 1, status: 'FAIL', layer: 'UNRESOLVED',
    S01: 'NOT_RUN', S02: 'NOT_RUN', S03: 'NOT_RUN', stderrEmpty: false};
}

function classifyStage(result) {
  const outcome = {pass: false, stderrOnly: false, stderrEmpty: false};
  if (result === null || result === undefined) return outcome;
  try {
    outcome.stderrEmpty = !String(result.stderr || '').trim();
    const cleanProcess = !result.error && result.status === 0 && !result.signal;
    const stdout = String(result.stdout || '').replace(/^\ufeff/, '');
    let validOutput = false;
    if (stdout.trim()) {
      try {
        const parsed = JSON.parse(stdout);
        validOutput = !!parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          && Object.keys(parsed).length === 1 && parsed.ok === true;
      } catch { /* A malformed output cannot establish a layer. */ }
    }
    outcome.pass = cleanProcess && outcome.stderrEmpty && validOutput;
    outcome.stderrOnly = cleanProcess && !outcome.stderrEmpty && validOutput;
  } catch { return {pass: false, stderrOnly: false, stderrEmpty: false}; }
  return outcome;
}

function runLayerChain(options = {}) {
  const report = emptyReport();
  if ((options.platform || process.platform) !== 'win32' || typeof options.spawnSync !== 'function') return report;
  let runtime;
  try { runtime = production.resolveSystemPowerShell(options.productionOptions); }
  catch { return report; }
  for (let index = 0; index < STAGES.length; index += 1) {
    const stage = STAGES[index];
    let outcome;
    try {
      const encoded = Buffer.from(SCRIPT[stage], 'utf16le').toString('base64');
      const result = options.spawnSync(runtime.executable,
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
          '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
        {encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
          cwd: path.win32.join(runtime.systemRoot, 'System32'), env: runtime.environment});
      outcome = classifyStage(result);
    } catch { outcome = {pass: false, stderrOnly: false, stderrEmpty: false}; }
    report[stage] = outcome.pass ? 'PASS' : 'FAIL';
    report.stderrEmpty = outcome.stderrEmpty;
    if (!outcome.pass) {
      if (outcome.stderrOnly) report.layer = LAYERS[index];
      return report;
    }
  }
  report.status = 'PASS';
  report.layer = 'PASS';
  return report;
}

function validateReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)
      || Object.keys(report).sort().join('|') !== [...REPORT_KEYS].sort().join('|')) return false;
  if (report.schema !== 1 || !['PASS', 'FAIL'].includes(report.status)
      || !['STARTUP', 'MODULE', 'QUERY', 'PASS', 'UNRESOLVED'].includes(report.layer)
      || typeof report.stderrEmpty !== 'boolean') return false;
  if (STAGES.some(stage => !['PASS', 'FAIL', 'NOT_RUN'].includes(report[stage]))) return false;
  const expected = report.S01 === 'NOT_RUN' && report.S02 === 'NOT_RUN' && report.S03 === 'NOT_RUN'
    || report.S01 === 'FAIL' && report.S02 === 'NOT_RUN' && report.S03 === 'NOT_RUN'
    || report.S01 === 'PASS' && report.S02 === 'FAIL' && report.S03 === 'NOT_RUN'
    || report.S01 === 'PASS' && report.S02 === 'PASS' && ['FAIL', 'PASS'].includes(report.S03);
  if (!expected) return false;
  if (report.status === 'PASS') return report.layer === 'PASS' && report.stderrEmpty
    && STAGES.every(stage => report[stage] === 'PASS');
  if (report.layer === 'PASS') return false;
  if (report.layer === 'STARTUP') return report.S01 === 'FAIL' && !report.stderrEmpty;
  if (report.layer === 'MODULE') return report.S01 === 'PASS' && report.S02 === 'FAIL' && !report.stderrEmpty;
  if (report.layer === 'QUERY') return report.S01 === 'PASS' && report.S02 === 'PASS'
    && report.S03 === 'FAIL' && !report.stderrEmpty;
  return !STAGES.every(stage => report[stage] === 'PASS');
}

module.exports = {STAGES, SCRIPT, REPORT_KEYS, emptyReport, classifyStage, runLayerChain, validateReport};
