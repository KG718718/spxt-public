'use strict';

const production = require('../../../public-lan-network');

const REPORT_KEYS = Object.freeze(['reason', 'processResultPresent', 'spawnError',
  'timedOut', 'exitZero', 'signalPresent', 'stderrEmpty', 'stdoutPresent', 'jsonParseable']);
const REASONS = new Set(['SPAWN_FAILED', 'TIMEOUT', 'EXIT_NONZERO', 'SIGNAL', 'STDERR_NONEMPTY',
  'STDOUT_EMPTY', 'JSON_INVALID', 'COMMAND_PASS', 'INTERNAL']);

function emptyReport() {
  return {reason: 'INTERNAL', processResultPresent: false,
    spawnError: false, timedOut: false, exitZero: false, signalPresent: false,
    stderrEmpty: false, stdoutPresent: false, jsonParseable: false};
}

function classifyResult(result) {
  const report = emptyReport();
  if (result === null || result === undefined) return {...report, reason: 'SPAWN_FAILED'};
  try {
    report.processResultPresent = true;
    report.spawnError = !!result.error;
    report.timedOut = result.error?.code === 'ETIMEDOUT';
    report.exitZero = result.status === 0;
    report.signalPresent = !!result.signal;
    report.stderrEmpty = !String(result.stderr || '').trim();
    report.stdoutPresent = !!String(result.stdout || '').trim();
    if (report.stdoutPresent) {
      try {JSON.parse(String(result.stdout).replace(/^\ufeff/, '')); report.jsonParseable = true;}
      catch {report.jsonParseable = false;}
    }
    if (report.timedOut) report.reason = 'TIMEOUT';
    else if (report.spawnError) report.reason = 'SPAWN_FAILED';
    else if (report.signalPresent) report.reason = 'SIGNAL';
    else if (!report.exitZero) report.reason = 'EXIT_NONZERO';
    else if (!report.stderrEmpty) report.reason = 'STDERR_NONEMPTY';
    else if (!report.stdoutPresent) report.reason = 'STDOUT_EMPTY';
    else if (!report.jsonParseable) report.reason = 'JSON_INVALID';
    else report.reason = 'COMMAND_PASS';
  } catch {return emptyReport();}
  return report;
}

function runClassifier(options) {
  const report = emptyReport();
  if (!options || typeof options.spawnSync !== 'function') return report;
  let observed = false;
  let spawnedResult;
  let spawnThrew = false;
  let productionSucceeded = false;
  try {
    production.runWindowsDiscovery({...options.productionOptions, spawnSync(...args) {
      observed = true;
      try {spawnedResult = options.spawnSync(...args); return spawnedResult;}
      catch {spawnThrew = true; throw Error('FIXED_SPAWN_EXCEPTION');}
    }});
    productionSucceeded = true;
  } catch {
    if (spawnThrew || !observed) return report;
  }
  if (!observed) return report;
  const classified = classifyResult(spawnedResult);
  return classified.reason === 'COMMAND_PASS' && !productionSucceeded ? report : classified;
}

function validateReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report) ||
      Object.keys(report).sort().join('|') !== [...REPORT_KEYS].sort().join('|')) return false;
  if (!REASONS.has(report.reason)) return false;
  for (const key of REPORT_KEYS.slice(1)) if (typeof report[key] !== 'boolean') return false;
  if (report.reason === 'COMMAND_PASS' && (!report.processResultPresent ||
      report.spawnError || report.timedOut || !report.exitZero || report.signalPresent ||
      !report.stderrEmpty || !report.stdoutPresent || !report.jsonParseable)) return false;
  return true;
}

module.exports = {REPORT_KEYS, REASONS, emptyReport, classifyResult, runClassifier, validateReport};
