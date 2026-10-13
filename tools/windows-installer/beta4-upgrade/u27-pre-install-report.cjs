'use strict';

const assert=require('node:assert/strict');

const exitStatuses=Object.freeze([
  'INNO_EXIT_SUCCESS','INNO_EXIT_INITIALIZE_FAILED','INNO_EXIT_CANCEL_BEFORE_INSTALL','INNO_EXIT_PREPARE_FATAL',
  'INNO_EXIT_INSTALL_FATAL','INNO_EXIT_CANCEL_DURING_INSTALL','INNO_EXIT_DEBUGGER_TERMINATED',
  'INNO_EXIT_PREPARE_REJECTED','INNO_EXIT_PREPARE_RESTART_REQUIRED','INNO_EXIT_UNEXPECTED_NONZERO',
  'PROCESS_START_FAILED','NOT_OBSERVED'
]);
const allowedMarkers=Object.freeze([
  'KSESSION_DATA_PRIOR_MISSING','KSESSION_DATA_REJECT_','KSESSION_DATA_SWITCH_UNCONFIRMED',
  'KSESSION_FIXTURE_CANCEL_DURING_COPY','KSESSION_FIXTURE_COPY_FAILURE','KSESSION_FIXTURE_COPY_INJECTION_PREPARE_FAILED','KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE',
  'KSESSION_INSTALLED_PAYLOAD_VERIFIED','KSESSION_PREINSTALL_READY','KSESSION_PROCESS_INSPECTION_UNAVAILABLE',
  'KSESSION_REJECT_INSTANCE_LOCK','KSESSION_REJECT_NONEMPTY','KSESSION_REJECT_PATH','KSESSION_REJECT_REGISTERED',
  'KSESSION_REJECT_RUNNING','KSESSION_REJECT_SPACE','KSESSION_REJECT_SPACE_QUERY','KSESSION_REJECT_WRITE',
  'KSESSION_UPGRADE_PREFLIGHT_REJECTED','KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED',
  'KSESSION_UPGRADE_GATE_ARGUMENT_INVALID','KSESSION_UPGRADE_GATE_REQUEST_INVALID','KSESSION_UPGRADE_GATE_BUNDLE_HASH','KSESSION_UPGRADE_GATE_BUNDLE_INVALID',
  'KSESSION_UPGRADE_GATE_IDENTITY_REJECTED','KSESSION_UPGRADE_GATE_PREFLIGHT_ARGUMENT_INVALID','KSESSION_UPGRADE_GATE_PREFLIGHT_DATA_CONTRACT_UNSUPPORTED',
  'KSESSION_UPGRADE_GATE_PREFLIGHT_APP_RESOURCE_INVALID','KSESSION_UPGRADE_GATE_PREFLIGHT_INSTALL_ROOT_INVALID','KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_NOT_FOUND',
  'KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_PATH_UNSAFE','KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_UNREADABLE','KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_INVALID',
  'KSESSION_UPGRADE_GATE_PREFLIGHT_REGISTRATION_CONFLICT','KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_CONFLICT','KSESSION_UPGRADE_GATE_PREFLIGHT_STORE_UNREADABLE',
  'KSESSION_UPGRADE_GATE_PREFLIGHT_STORE_INVALID','KSESSION_UPGRADE_GATE_PREFLIGHT_CONFIG_INVALID','KSESSION_UPGRADE_GATE_PREFLIGHT_ORPHANED_INSTALLATION',
  'KSESSION_UPGRADE_GATE_PREFLIGHT_STORE_VALIDATION_FAILED','KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_STRUCTURE_UNSAFE','KSESSION_UPGRADE_GATE_PREFLIGHT_INTERNAL',
  'KSESSION_UPGRADE_GATE_CONTRACT_RESULT','KSESSION_UPGRADE_GATE_CONTRACT_INSTALL_ROOT','KSESSION_UPGRADE_GATE_CONTRACT_INSTANCE_PATH',
  'KSESSION_UPGRADE_GATE_CONTRACT_DATA','KSESSION_UPGRADE_GATE_INTERNAL','KSESSION_UPGRADE_GATE_PROCESS_START_FAILED','KSESSION_UPGRADE_GATE_UNKNOWN',
  'KSESSION_UPGRADE_GATE_IDENTITY_REGISTRATION','KSESSION_UPGRADE_GATE_IDENTITY_BINDING','KSESSION_UPGRADE_GATE_IDENTITY_PATH',
  'KSESSION_UPGRADE_GATE_IDENTITY_MANIFEST','KSESSION_UPGRADE_GATE_IDENTITY_PROGRAM','KSESSION_UPGRADE_GATE_IDENTITY_BUILD',
  'KSESSION_UPGRADE_GATE_IDENTITY_RUNTIME','KSESSION_UPGRADE_GATE_IDENTITY_LAUNCHER','KSESSION_UPGRADE_GATE_IDENTITY_INTERNAL',
  'KSESSION_UPGRADE_GATE_ACCEPTED','KSESSION_UPGRADE_REGISTRATION_REJECTED','KSESSION_UPGRADE_ROLLBACK_FAILED','KSESSION_UPGRADE_ROOT_MISMATCH',
  'KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED','KSESSION_UPGRADE_COMMIT_UNKNOWN','KSESSION_UPGRADE_INSTALLED_VERIFIED',
  'KSESSION_UPGRADE_NATIVE_COPY_COMPLETE','KSESSION_UPGRADE_POSTINSTALL_FAILED','KSESSION_UPGRADE_TRANSACTION_COMMITTED',
  'KSESSION_UPGRADE_TRANSACTION_PREPARED','KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK','KSESSION_UPGRADE_TRANSACTION_SWAPPED',
  'KSESSION_SEQUENCE_IDENTITY_ACCEPTED','KSESSION_SEQUENCE_REGISTRATION_COUNT','KSESSION_SEQUENCE_REGISTRATION_NAME',
  'KSESSION_SEQUENCE_REGISTRATION_VERSION','KSESSION_SEQUENCE_REGISTRATION_NAME_VERSION','KSESSION_SEQUENCE_REGISTRATION_SNAPSHOT',
  'KSESSION_SEQUENCE_REGISTRATION_CONFLICT','KSESSION_SEQUENCE_REGISTRATION_UNINSTALL',
  'KSESSION_SEQUENCE_REGISTRATION_AMBIGUOUS','KSESSION_SEQUENCE_REGISTRATION_INCONSISTENT'
]);
const definitePreInstallRejections=new Set([
  'KSESSION_DATA_PRIOR_MISSING','KSESSION_DATA_SWITCH_UNCONFIRMED','KSESSION_REJECT_INSTANCE_LOCK',
  'KSESSION_REJECT_NONEMPTY','KSESSION_REJECT_PATH','KSESSION_REJECT_REGISTERED','KSESSION_REJECT_RUNNING',
  'KSESSION_REJECT_SPACE','KSESSION_REJECT_SPACE_QUERY','KSESSION_REJECT_WRITE','KSESSION_UPGRADE_PREFLIGHT_REJECTED',
  'KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED','KSESSION_UPGRADE_REGISTRATION_REJECTED','KSESSION_UPGRADE_ROOT_MISMATCH'
]);
const reportKeys=Object.freeze(['schema','phase','status','classification','sourceCommit','processState','logState','exitStatus',
  'markerState','observedMarkers','preInstallState','copyState','postInstallVerificationState']);

function source(value){assert.match(value,/^[a-f0-9]{40}$/);return value;}
function safeInnoExitStatus(exitCode,processStarted){
  if(!processStarted)return 'PROCESS_START_FAILED';
  return ({0:'INNO_EXIT_SUCCESS',1:'INNO_EXIT_INITIALIZE_FAILED',2:'INNO_EXIT_CANCEL_BEFORE_INSTALL',
    3:'INNO_EXIT_PREPARE_FATAL',4:'INNO_EXIT_INSTALL_FATAL',5:'INNO_EXIT_CANCEL_DURING_INSTALL',
    6:'INNO_EXIT_DEBUGGER_TERMINATED',7:'INNO_EXIT_PREPARE_REJECTED',8:'INNO_EXIT_PREPARE_RESTART_REQUIRED'})[exitCode]||
    'INNO_EXIT_UNEXPECTED_NONZERO';
}
function markers(value){
  assert.ok(Array.isArray(value));
  assert.equal(new Set(value).size,value.length);
  assert.deepEqual(value,[...value].sort());
  for(const marker of value)assert.ok(allowedMarkers.includes(marker),'invalid U27 marker');
  return value;
}
function normalizedReport({processState,logState,exitStatus,observedMarkers},sourceCommit){
  source(sourceCommit);
  assert.ok(['NOT_OBSERVED','STARTED','START_FAILED'].includes(processState));
  assert.ok(['NOT_OBSERVED','OBSERVED','MISSING','READ_FAILED'].includes(logState));
  assert.ok(exitStatuses.includes(exitStatus));
  markers(observedMarkers);
  let status='FAIL',classification='NOT_OBSERVED',markerState='NOT_OBSERVED';
  let preInstallState='NOT_OBSERVED',copyState='NOT_OBSERVED',postInstallVerificationState='NOT_OBSERVED';
  if(processState==='NOT_OBSERVED'){
    assert.equal(logState,'NOT_OBSERVED');assert.equal(exitStatus,'NOT_OBSERVED');assert.deepEqual(observedMarkers,[]);
  }else if(processState==='START_FAILED'){
    assert.equal(exitStatus,'PROCESS_START_FAILED');assert.notEqual(logState,'OBSERVED');assert.deepEqual(observedMarkers,[]);
    classification='PROCESS_START_FAILED';
  }else{
    assert.notEqual(exitStatus,'PROCESS_START_FAILED');assert.notEqual(exitStatus,'NOT_OBSERVED');
    if(logState!=='OBSERVED'){
      assert.deepEqual(observedMarkers,[]);
      classification=logState==='MISSING'?'LOG_MISSING':logState==='READ_FAILED'?'LOG_READ_FAILED':'NOT_OBSERVED';
      preInstallState='UNKNOWN';copyState='UNKNOWN';postInstallVerificationState='UNKNOWN';
    }else{
      markerState=observedMarkers.length?'OBSERVED':'NOT_OBSERVED';
      const pre=observedMarkers.includes('KSESSION_PREINSTALL_READY');
      const installed=observedMarkers.includes('KSESSION_INSTALLED_PAYLOAD_VERIFIED');
      const preRejects=observedMarkers.filter(marker=>definitePreInstallRejections.has(marker));
      const dataReject=observedMarkers.includes('KSESSION_DATA_REJECT_');
      const postFailure=observedMarkers.includes('KSESSION_UPGRADE_POSTINSTALL_FAILED');
      const upgradeMarkers=observedMarkers.filter(marker=>marker.startsWith('KSESSION_UPGRADE_')&&
        !definitePreInstallRejections.has(marker)&&marker!=='KSESSION_UPGRADE_POSTINSTALL_FAILED');
      const unexpected=observedMarkers.filter(marker=>![
        'KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED','KSESSION_PROCESS_INSPECTION_UNAVAILABLE',
        'KSESSION_DATA_REJECT_','KSESSION_UPGRADE_POSTINSTALL_FAILED'
      ].includes(marker)&&!definitePreInstallRejections.has(marker));
      const success=exitStatus==='INNO_EXIT_SUCCESS';
      preInstallState=pre?'PASS':'UNKNOWN';
      copyState=(installed||postFailure||(pre&&dataReject))?'PASS':'UNKNOWN';
      postInstallVerificationState=installed?'PASS':postFailure||(pre&&dataReject)?'FAILED':'UNKNOWN';
      const ambiguous=(preRejects.length>1)||(preRejects.length>0&&(pre||dataReject||postFailure||installed))||
        (dataReject&&postFailure)||upgradeMarkers.length>0||unexpected.length>0;
      if(success&&pre&&installed&&!ambiguous){
        status='PASS';classification='SUCCESS';preInstallState='PASS';copyState='PASS';postInstallVerificationState='PASS';
      }else if(ambiguous){
        classification='UNKNOWN';
      }else if(!success&&installed){
        classification='LATE_FAILURE_AFTER_VERIFICATION';
      }else if(postFailure){
        classification='POSTINSTALL_FAILED';
      }else if(pre&&dataReject){
        classification='POSTINSTALL_DATA_REJECTED';
      }else if(dataReject){
        classification='DATA_REJECTED_PHASE_UNKNOWN';
      }else if(preRejects.length===1&&!pre){
        classification='PREINSTALL_REJECTED';preInstallState='REJECTED';copyState='NOT_OBSERVED';postInstallVerificationState='NOT_OBSERVED';
      }else if(pre){
        classification=success?'UNKNOWN':'ABNORMAL_EXIT_AFTER_PREINSTALL';
      }else{
        classification='UNKNOWN';preInstallState='UNKNOWN';copyState='UNKNOWN';postInstallVerificationState='UNKNOWN';
      }
    }
  }
  return {schema:1,phase:'U27_PRE_INSTALL',status,classification,sourceCommit,processState,logState,exitStatus,
    markerState,observedMarkers:[...observedMarkers],preInstallState,copyState,postInstallVerificationState};
}
function classifyU27PreInstall(input,sourceCommit){
  assert.deepEqual(Object.keys(input).sort(),['exitCode','logState','observedMarkers','processStarted'].sort());
  const processState=input.processStarted?'STARTED':'START_FAILED';
  return normalizedReport({processState,logState:input.logState,exitStatus:safeInnoExitStatus(input.exitCode,input.processStarted),
    observedMarkers:markers([...input.observedMarkers].sort())},sourceCommit);
}
function fixedU27NotObserved(sourceCommit){
  return normalizedReport({processState:'NOT_OBSERVED',logState:'NOT_OBSERVED',exitStatus:'NOT_OBSERVED',observedMarkers:[]},sourceCommit);
}
function verifyU27PreInstallReport(value,sourceCommit,{requirePass=false}={}){
  assert.ok(value&&typeof value==='object'&&!Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(),[...reportKeys].sort());
  const rebuilt=normalizedReport({processState:value.processState,logState:value.logState,exitStatus:value.exitStatus,
    observedMarkers:value.observedMarkers},sourceCommit);
  assert.deepEqual(value,rebuilt);
  if(requirePass){assert.equal(value.status,'PASS');assert.equal(value.classification,'SUCCESS');}
  const text=JSON.stringify(value);
  assert.doesNotMatch(text,/(?:password|token|cookie|authorization|sha256|bytes|length|[A-Za-z]:\\)/i);
  return value;
}

module.exports={allowedMarkers,exitStatuses,safeInnoExitStatus,classifyU27PreInstall,fixedU27NotObserved,verifyU27PreInstallReport};
