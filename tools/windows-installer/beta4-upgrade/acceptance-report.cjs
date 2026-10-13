'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

const automaticKeys=Object.freeze([
  'portable','setupLifecycle','upgradeU01U30','singleInstanceBaseline','firstLauncherAlive','privateNodeAlive',
  'rootLockExclusive','readyStable','nodeSpawnStable','u05u06StateInvariant','persistentInventoryQuiescence',
  'compatibilityC01C15','historicalLCK03SyntheticGate','offlineLifecycle','privateSession','firewallHosted','publicRegression26Suites742Checks',
  'artifactPrivacyAndIdentity'
]);
const humanKeys=Object.freeze([
  'firstAdminCreationAndBrowserLogin','twoAccountConcurrentReadSaveAttachment',
  'originalBackgroundStableDuringSecondLaunch','actualSecondLauncherStart','dialogText','dialogButton',
  'secondLauncherNaturalExit','doubleLaunchBehavior','normalExitRestartDataRetained',
  'visibleInstallerWizard','visibleShellLaunchPage','physicalWindows10','realAdapterSelection','uacPrompt',
  'firewallAuthorization','physicalSecondDevice','lanEndToEnd'
]);
const lockIds=Object.freeze(Array.from({length:14},(_,index)=>'LCK'+String(index+1).padStart(2,'0')));

function commit(value){assert.match(value,/^[a-f0-9]{40}$/);return value;}
function verifyHistoricalLCK03SyntheticGate(value){
  assert.deepEqual(value,{status:'PASS',method:'node:test exact passed-subtest mapping'});
  return value;
}
function fixedAcceptanceEvidence(sourceCommit){
  return {schema:1,sourceCommit:commit(sourceCommit),setupChecks:32,upgradeChecks:30,compatibilityChecks:15,
    compatibilityLocksWithoutHistoricalLCK03:13,singleInstanceObservations:7,regressionSuites:26,
    regressionChecks:742,regressionFail:0,regressionSkipped:0,
    ...Object.fromEntries(automaticKeys.map(key=>[key,'PASS']))};
}
function verifyAcceptanceEvidence(value,sourceCommit){assert.deepEqual(value,fixedAcceptanceEvidence(sourceCommit));return value;}
function fixedAcceptanceReport(sourceCommit){
  const automatic=Object.fromEntries(automaticKeys.map(key=>[key,'PASS']));
  const human=Object.fromEntries(humanKeys.map(key=>[key,'HUMAN_PENDING']));
  return {schema:1,kind:'k-session-lan2-acceptance-split',status:'AUTOMATION_PASS_HUMAN_PENDING',
    sourceCommit:commit(sourceCommit),qualification:'FULL_AUTOMATION_WITH_EXPLICIT_HUMAN_PENDING',
    automatic:{status:'PASS',...automatic},
    scope:{singleInstanceBaselineOnly:true,secondLauncherStarted:false,doubleLaunchProven:false,
      historicalLCK03SyntheticGateRetained:true,enterpriseLanCertified:false},
    lockMatrix:Object.fromEntries(lockIds.map(id=>[id,id==='LCK03'?'HUMAN_PENDING':'PASS'])),
    human:{status:'HUMAN_PENDING',...human}};
}
function verifyAcceptanceReport(value,sourceCommit){assert.deepEqual(value,fixedAcceptanceReport(sourceCommit));return value;}
function verifyArtifactFileSet(actual,expected){
  assert.ok(Array.isArray(actual)&&Array.isArray(expected));
  assert.deepEqual([...actual].sort(),[...expected].sort());
  return actual;
}
function writeAcceptanceReport(file,sourceCommit,evidence){
  assert.ok(file&&fs.existsSync(file)===false,'fresh acceptance report required');
  verifyAcceptanceEvidence(evidence,sourceCommit);
  const report=fixedAcceptanceReport(sourceCommit);
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  verifyAcceptanceReport(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
  return report;
}
function ensureAcceptanceReport(file,sourceCommit,evidence){
  verifyAcceptanceEvidence(evidence,sourceCommit);
  if(fs.existsSync(file)){
    const before=fs.readFileSync(file);
    const value=JSON.parse(before.toString('utf8'));
    verifyAcceptanceReport(value,sourceCommit);
    assert.deepEqual(fs.readFileSync(file),before);
    return {created:false,report:value};
  }
  return {created:true,report:writeAcceptanceReport(file,sourceCommit,evidence)};
}

module.exports={automaticKeys,humanKeys,lockIds,fixedAcceptanceEvidence,verifyAcceptanceEvidence,fixedAcceptanceReport,
  verifyAcceptanceReport,verifyArtifactFileSet,verifyHistoricalLCK03SyntheticGate,writeAcceptanceReport,ensureAcceptanceReport};
