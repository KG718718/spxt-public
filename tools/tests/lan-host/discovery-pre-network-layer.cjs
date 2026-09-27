'use strict';

const path = require('node:path');
const production = require('../../../public-lan-network');

const FIXED_JSON = '{"ok":true}';
const STAGES = Object.freeze(['M00', 'M01', 'M02']);
const LAYERS = Object.freeze(['SHELL_OR_ENVIRONMENT', 'UTILITY_MODULE_LOAD', 'UTILITY_SERIALIZATION']);
const SCRIPT = Object.freeze({
  M00: "$ErrorActionPreference='Stop'\n[Console]::Out.Write('{\"ok\":true}')",
  M01: "$ErrorActionPreference='Stop'\nImport-Module Microsoft.PowerShell.Utility -ErrorAction Stop\n" +
    "[Console]::Out.Write('{\"ok\":true}')",
  M02: "$ErrorActionPreference='Stop'\n[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress"
});
const REPORT_KEYS = Object.freeze(['schema', 'status', 'layer', 'M00', 'M01', 'M02']);

function emptyReport() {
  return {schema: 1, status: 'FAIL', layer: 'UNRESOLVED',
    M00: 'NOT_RUN', M01: 'NOT_RUN', M02: 'NOT_RUN'};
}

function classifyStage(result, stage) {
  const unknown = {pass: false, stderrOnly: false};
  if (result === null || result === undefined || !STAGES.includes(stage)) return unknown;
  try {
    const cleanProcess = !result.error && result.status === 0 && !result.signal;
    const stdout = String(result.stdout || '');
    // M00 is a pure .NET baseline: no normalization of its runtime stdout.
    const fixedOutput = stage === 'M00' ? stdout === FIXED_JSON
      : stdout.replace(/^\ufeff/, '').trim() === FIXED_JSON;
    const stderrEmpty = !String(result.stderr || '').trim();
    return {pass: cleanProcess && fixedOutput && stderrEmpty,
      stderrOnly: cleanProcess && fixedOutput && !stderrEmpty};
  } catch { return unknown; }
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
      outcome = classifyStage(result, stage);
    } catch { outcome = {pass: false, stderrOnly: false}; }
    report[stage] = outcome.pass ? 'PASS' : 'FAIL';
    if (!outcome.pass) {
      if (outcome.stderrOnly) report.layer = LAYERS[index];
      return report;
    }
  }
  report.status = 'PASS';
  report.layer = 'PRE_NETWORK_PASS';
  return report;
}

function validateReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)
      || Object.keys(report).sort().join('|') !== [...REPORT_KEYS].sort().join('|')) return false;
  if (report.schema !== 1 || !['PASS', 'FAIL'].includes(report.status)
      || ![...LAYERS, 'PRE_NETWORK_PASS', 'UNRESOLVED'].includes(report.layer)
      || STAGES.some(stage => !['PASS', 'FAIL', 'NOT_RUN'].includes(report[stage]))) return false;
  const notRun = report.M00 === 'NOT_RUN' && report.M01 === 'NOT_RUN' && report.M02 === 'NOT_RUN';
  const firstFailed = report.M00 === 'FAIL' && report.M01 === 'NOT_RUN' && report.M02 === 'NOT_RUN';
  const secondFailed = report.M00 === 'PASS' && report.M01 === 'FAIL' && report.M02 === 'NOT_RUN';
  const thirdFailed = report.M00 === 'PASS' && report.M01 === 'PASS' && report.M02 === 'FAIL';
  const allPassed = STAGES.every(stage => report[stage] === 'PASS');
  if (report.status === 'PASS') return report.layer === 'PRE_NETWORK_PASS' && allPassed;
  if (report.layer === 'SHELL_OR_ENVIRONMENT') return firstFailed;
  if (report.layer === 'UTILITY_MODULE_LOAD') return secondFailed;
  if (report.layer === 'UTILITY_SERIALIZATION') return thirdFailed;
  return report.layer === 'UNRESOLVED' && (notRun || firstFailed || secondFailed || thirdFailed);
}

module.exports = {FIXED_JSON, STAGES, SCRIPT, REPORT_KEYS, emptyReport,
  classifyStage, runLayerChain, validateReport};
