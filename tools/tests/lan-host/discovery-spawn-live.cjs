'use strict';

// Invoke manually only under the controlled Win10 task card. Never print raw
// process results, exceptions, command arguments, or the resolved executable.
let report = {reason: 'INTERNAL', processResultPresent: false, spawnError: false,
  timedOut: false, exitZero: false, signalPresent: false, stderrEmpty: false,
  stdoutPresent: false, jsonParseable: false};
try {
  const os = require('node:os');
  if (process.platform === 'win32' && os.release() === '10.0.19045') {
    const {spawnSync} = require('node:child_process');
    const {runClassifier, validateReport} = require('./discovery-spawn-classifier.cjs');
    const classified = runClassifier({spawnSync});
    if (validateReport(classified)) report = classified;
  }
} catch {
  // A fixed report is the only permitted output, including on unexpected errors.
}
process.stdout.write(`${JSON.stringify(report)}\n`);
