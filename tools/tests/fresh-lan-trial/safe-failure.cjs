'use strict';
const assert=require('node:assert/strict');
const {validate}=require('./report.cjs');
function early(r,control,runId){assert.deepEqual(Object.keys(r).sort(),['schema','kind','controlCommit','runId','runAttempt','stage','reason','status','cleanup'].sort());assert.equal(r.schema,1);assert.equal(r.kind,'FRESH_TRIAL_EARLY_FAILURE');assert.equal(r.controlCommit,control);assert.match(control,/^[a-f0-9]{40}$/);assert.equal(r.runId,runId);assert.match(runId,/^[1-9][0-9]*$/);assert.equal(r.runAttempt,1);assert.ok(['ENV','SOURCE'].includes(r.stage));assert.ok(['SOURCE_REJECTED','ISOLATION_UNPROVEN','REPORT_INVALID'].includes(r.reason));assert.equal(r.status,'FAIL');assert.ok(['NOT_STARTED','OWNED_ISOLATION_PENDING','RESTORED','UNKNOWN'].includes(r.cleanup));return r;}
function safe(r,expected){if(r.kind==='FRESH_TRIAL_EARLY_FAILURE')return early(r,expected.controlCommit,expected.run.id);validate(r,expected);assert.equal(r.status,'FAIL');return r;}
module.exports={early,safe};
