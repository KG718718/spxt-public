'use strict';

// This entry point stays dormant until a separate one-shot live dispatch.
let report = {schema: 1, status: 'FAIL', layer: 'UNRESOLVED',
  M00: 'NOT_RUN', M01: 'NOT_RUN', M02: 'NOT_RUN'};
try {
  const os = require('node:os');
  if (process.argv.length === 3 && process.argv[2] === '--approved-one-shot'
      && process.platform === 'win32' && os.release() === '10.0.19045') {
    const {spawnSync} = require('node:child_process');
    const {runLayerChain, validateReport} = require('./discovery-pre-network-layer.cjs');
    const candidate = runLayerChain({spawnSync});
    if (validateReport(candidate)) report = candidate;
  }
} catch { /* No exception text or local identity may reach output. */ }
process.stdout.write(`${JSON.stringify(report)}\n`);
