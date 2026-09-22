'use strict';
const fs = require('node:fs');
const { TransactionError, commit, finalize, prepare, rollback } = require('./index.cjs');
function main(argv) {
  if (argv.length < 2 || !['prepare', 'commit', 'rollback', 'finalize'].includes(argv[0])) throw new TransactionError('ARGUMENT_INVALID', 'usage');
  const plan = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
  const result = argv[0] === 'prepare' ? prepare(plan) : argv[0] === 'commit' ? commit(plan, argv[2] || '') : argv[0] === 'rollback' ? rollback(plan) : finalize(plan);
  process.stdout.write(JSON.stringify({ ok: result.ok, code: result.code }) + '\n');
}
try { main(process.argv.slice(2)); }
catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error instanceof TransactionError ? error.code : 'TRANSACTION_INTERNAL' }) + '\n');
  process.exitCode = 1;
}
