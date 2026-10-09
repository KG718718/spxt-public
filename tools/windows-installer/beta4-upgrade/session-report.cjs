'use strict';
const assert=require('node:assert/strict');

const PASS=Object.freeze({schema:1,status:'PASS',productionBusinessHandler:true,
  socketClass:'HOSTED_RUNNER_PRIVATE',discovery:'SYNTHETIC_STRICT_TEST_INJECTION',
  remoteBootstrapClosed:true,loginPageServed:true,sessionCount:2,distinctIdentities:true,
  independentBearerSessions:true,concurrentRequests:true,roleBoundaryPreserved:true,
  oneSessionLogoutIsolated:true,basicBusinessOperation:true,realSecondDeviceClaim:false,
  realPhysicalLanClaim:false,browserUiClaim:false});

function fixedSessionReport(sourceCommit){
  assert.match(sourceCommit,/^[a-f0-9]{40}$/);
  return {...PASS,sourceCommit};
}
function verifySessionReport(value,sourceCommit){assert.deepEqual(value,fixedSessionReport(sourceCommit));}
module.exports={fixedSessionReport,verifySessionReport};
