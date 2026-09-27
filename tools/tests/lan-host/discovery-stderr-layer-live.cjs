'use strict';

// No real probe runs without the later, explicit controlled-chain dispatch.
let report = {schema: 1, status: 'FAIL', layer: 'UNRESOLVED',
  S01: 'NOT_RUN', S02: 'NOT_RUN', S03: 'NOT_RUN', stderrEmpty: false};
try {
  const os = require('node:os');
  if (process.argv.length === 3 && process.argv[2] === '--approved-one-shot'
      && process.platform === 'win32' && os.release() === '10.0.19045') {
    const {spawnSync} = require('node:child_process');
    const {runLayerChain, validateReport} = require('./discovery-stderr-layer.cjs');
    const candidate = runLayerChain({spawnSync});
    if (validateReport(candidate)) report = candidate;
  }
} catch { /* Never print an exception or local system detail. */ }
process.stdout.write(`${JSON.stringify(report)}\n`);
