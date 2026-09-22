'use strict';
const { GateError, runFiles } = require('./index.cjs');
try {
  if (process.argv.length !== 6 || process.argv[2] !== '--request') throw new GateError('GATE_ARGUMENT_INVALID');
  process.stdout.write(JSON.stringify(runFiles(process.argv[3], process.argv[4], process.argv[5])) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error instanceof GateError ? error.code : 'GATE_INTERNAL' }) + '\n');
  process.exitCode = 1;
}
