'use strict';

// Controlled one-shot N01–N05 runner: only closed result codes reach stdout.
let reports = Array.from({length: 5}, () => ({status: 'FAIL', reason: 'INTERNAL'}));
try {
  const os = require('node:os');
  if (process.platform === 'win32' && os.release() === '10.0.19045') {
    const {spawnSync} = require('node:child_process');
    const {runProbes, validateProbe} = require('./discovery-probes.cjs');
    const result = runProbes(spawnSync);
    if (result.length === 5 && result.every(validateProbe)) reports = result;
  }
} catch {
  // Do not print exceptions, command output, executable, or local identity.
}
process.stdout.write(`${JSON.stringify(reports)}\n`);
