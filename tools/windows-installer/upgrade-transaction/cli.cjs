'use strict';
const fs = require('node:fs');
const { TransactionError, commit, finalize, prepare, rollback } = require('./index.cjs');
const exits = Object.freeze({
  ARGUMENT_INVALID: 60, STAGE_MANIFEST_HASH: 61, PLAN_INVALID: 62, INSTANCE_SCOPE: 63,
  INSTALL_ROOT_INVALID: 64, OLD_PROGRAM_INVALID: 65, OLD_METADATA_INVALID: 66,
  RECOVERY_EXISTS: 67, RECOVERY_CREATE_FAILED: 68, RECOVERY_INVALID: 69,
  RECOVERY_UNSAFE: 70, STAGE_INVALID: 71, STAGE_PAYLOAD: 72, PHASE_INVALID: 73,
  COMMIT_FAILED_ROLLED_BACK: 74, ROLLBACK_FAILED: 75, FINAL_STATE_INVALID: 76,
  STAGE_IDENTITY: 77
});
function main(argv) {
  if (argv.length < 2 || !['prepare', 'commit', 'rollback', 'finalize'].includes(argv[0])) throw new TransactionError('ARGUMENT_INVALID', 'usage');
  const plan = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
  const result = argv[0] === 'prepare' ? prepare(plan) : argv[0] === 'commit' ? commit(plan, argv[2] || '') : argv[0] === 'rollback' ? rollback(plan) : finalize(plan);
  process.stdout.write(JSON.stringify({ ok: result.ok, code: result.code }) + '\n');
}
try { main(process.argv.slice(2)); }
catch (error) {
  const known = error instanceof TransactionError && Object.hasOwn(exits, error.code);
  process.stdout.write(JSON.stringify({ ok: false, code: known ? error.code : 'TRANSACTION_INTERNAL' }) + '\n');
  process.exitCode = known ? exits[error.code] : 79;
}
