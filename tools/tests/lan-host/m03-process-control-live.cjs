'use strict';

// This entry point is dormant until a separate, approved one-shot live dispatch.
let report = {schema: 1, status: 'BLOCKED', result: 'UNRESOLVED', stderrEmpty: false};
try {
  const os = require('node:os');
  if (process.argv.length === 3 && process.argv[2] === '--approved-one-shot'
      && process.platform === 'win32' && os.release() === '10.0.19045') {
    const {spawnSync} = require('node:child_process');
    const {runProcessControl, validateReport} = require('./m03-process-control.cjs');
    const candidate = runProcessControl({spawnSync});
    if (validateReport(candidate)) report = candidate;
  }
} catch { /* Only the fixed report may reach stdout. */ }
process.stdout.write(`${JSON.stringify(report)}\n`);
