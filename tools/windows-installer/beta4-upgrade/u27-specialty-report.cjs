'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {fixedU27NotObserved,verifyU27PreInstallReport}=require('./u27-pre-install-report.cjs');

const topKeys=Object.freeze(['schema','kind','status','stage','classification','sourceCommit','testSetupState',
  'lifecyclePrefixState','networkState','prestate','u27PreInstall','cleanupState']);
const prestateKeys=Object.freeze(['observationState','uninstallCompletionState','productRegistrationState','bindingState',
  'installRootState','programState','uninstallerState','desktopShortcutState','startShortcutState','controlledLauncherState',
  'controlledNodeState','rootLockState','instanceState']);
const classifications=new Set(['NOT_OBSERVED','ENVIRONMENT_FAILED','PREFIX_TEST_SETUP_FAILED','PREFIX_LIFECYCLE_FAILED',
  'PRESTATE_UNKNOWN','U27_NON_SUCCESS','U27_DIAGNOSTIC_FAILED','POST_SETUP_STATE_FAILED','SETUP_SUCCEEDED_CLONE_UNKNOWN','NETWORK_RESTORE_FAILED','ISOLATION_INVALID','EXECUTION_FAILURE']);

function source(value){assert.match(value,/^[a-f0-9]{40}$/);return value;}
function emptyPrestate(){return {observationState:'NOT_OBSERVED',uninstallCompletionState:'NOT_OBSERVED',
  productRegistrationState:'NOT_OBSERVED',bindingState:'NOT_OBSERVED',programState:'NOT_OBSERVED',
  installRootState:'NOT_OBSERVED',
  uninstallerState:'NOT_OBSERVED',desktopShortcutState:'NOT_OBSERVED',startShortcutState:'NOT_OBSERVED',
  controlledLauncherState:'NOT_OBSERVED',controlledNodeState:'NOT_OBSERVED',rootLockState:'NOT_OBSERVED',instanceState:'NOT_OBSERVED'};}
function emptyNetwork(){return {isolationState:'NOT_OBSERVED',restorationState:'NOT_OBSERVED'};}
function initial(sourceCommit){source(sourceCommit);return {schema:1,kind:'U27_SPECIALTY',status:'FAIL',stage:'PREFIX',
  classification:'NOT_OBSERVED',sourceCommit,testSetupState:'NOT_OBSERVED',lifecyclePrefixState:'NOT_OBSERVED',
  networkState:emptyNetwork(),prestate:emptyPrestate(),u27PreInstall:fixedU27NotObserved(sourceCommit),cleanupState:'NOT_OBSERVED'};}
function prefixFailure(sourceCommit,classification,networkState=emptyNetwork()){
  assert.ok(['ENVIRONMENT_FAILED','PREFIX_TEST_SETUP_FAILED'].includes(classification));
  const value=initial(sourceCommit);value.classification=classification;value.networkState=structuredClone(networkState);
  value.testSetupState=classification==='PREFIX_TEST_SETUP_FAILED'?'FAILED':'NOT_OBSERVED';
  return value;
}
function lifecyclePlaceholder(sourceCommit,networkState=emptyNetwork()){
  const value=initial(sourceCommit);value.classification='PREFIX_LIFECYCLE_FAILED';value.testSetupState='PASS';value.networkState=structuredClone(networkState);
  value.lifecyclePrefixState='FAILED';return value;
}
function exactKeys(value,keys){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),[...keys].sort());}
function oneOf(value,allowed){assert.ok(allowed.includes(value),`invalid fixed enum: ${value}`);return value;}
function validatePrestate(value){
  exactKeys(value,prestateKeys);
  oneOf(value.observationState,['NOT_OBSERVED','COMPLETE','INCOMPLETE']);
  oneOf(value.uninstallCompletionState,['NOT_OBSERVED','UNKNOWN']);
  oneOf(value.productRegistrationState,['NOT_OBSERVED','ABSENT','PRESENT','UNKNOWN']);
  oneOf(value.bindingState,['NOT_OBSERVED','EXPECTED','MISSING','MISMATCH','UNKNOWN']);
  oneOf(value.installRootState,['NOT_OBSERVED','ABSENT','EMPTY_DIRECTORY','NONEMPTY_DIRECTORY','NON_DIRECTORY','UNKNOWN']);
  for(const key of ['programState','uninstallerState','desktopShortcutState','startShortcutState'])oneOf(value[key],['NOT_OBSERVED','ABSENT','PRESENT','UNKNOWN']);
  for(const key of ['controlledLauncherState','controlledNodeState'])oneOf(value[key],['NOT_OBSERVED','EXITED','ACTIVE','UNKNOWN']);
  oneOf(value.rootLockState,['NOT_OBSERVED','EXCLUSIVE_OPEN_CLOSED','BUSY','MISSING','UNKNOWN']);
  oneOf(value.instanceState,['NOT_OBSERVED','UNCHANGED','CHANGED','UNKNOWN']);
  if(value.observationState==='NOT_OBSERVED')assert.deepEqual(value,emptyPrestate());
  if(value.observationState==='COMPLETE'){
    assert.equal(value.uninstallCompletionState,'UNKNOWN');
    for(const key of prestateKeys.filter(key=>!['observationState','uninstallCompletionState'].includes(key)))assert.notEqual(value[key],'UNKNOWN');
  }
  return value;
}
function validate(value,sourceCommit){
  exactKeys(value,topKeys);source(sourceCommit);assert.equal(value.schema,1);assert.equal(value.kind,'U27_SPECIALTY');assert.equal(value.sourceCommit,sourceCommit);
  oneOf(value.status,['FAIL','UNKNOWN']);oneOf(value.stage,['PREFIX','PRESTATE','U27_PRE_INSTALL','COMPLETE']);
  assert.ok(classifications.has(value.classification));
  oneOf(value.testSetupState,['NOT_OBSERVED','PASS','FAILED']);
  oneOf(value.lifecyclePrefixState,['NOT_OBSERVED','RUNNING','PASS','FAILED']);
  exactKeys(value.networkState,['isolationState','restorationState']);
  oneOf(value.networkState.isolationState,['NOT_OBSERVED','ISOLATED','UNKNOWN']);
  oneOf(value.networkState.restorationState,['NOT_OBSERVED','RESTORED','FAILED']);
  validatePrestate(value.prestate);verifyU27PreInstallReport(value.u27PreInstall,sourceCommit);
  oneOf(value.cleanupState,['NOT_OBSERVED','CONTROLLED_ONLY','FAILED']);
  if(value.classification==='NOT_OBSERVED')assert.deepEqual(value,initial(sourceCommit));
  const notObserved=()=>{assert.deepEqual(value.prestate,emptyPrestate());assert.equal(value.u27PreInstall.classification,'NOT_OBSERVED');assert.equal(value.cleanupState,'NOT_OBSERVED');};
  if(value.classification==='ENVIRONMENT_FAILED'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'PREFIX');assert.equal(value.testSetupState,'NOT_OBSERVED');assert.equal(value.lifecyclePrefixState,'NOT_OBSERVED');notObserved();}
  if(value.classification==='PREFIX_TEST_SETUP_FAILED'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'PREFIX');assert.equal(value.testSetupState,'FAILED');assert.equal(value.lifecyclePrefixState,'NOT_OBSERVED');notObserved();}
  if(value.classification==='PREFIX_LIFECYCLE_FAILED'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'PREFIX');assert.equal(value.testSetupState,'PASS');assert.equal(value.lifecyclePrefixState,'FAILED');notObserved();}
  if(value.classification==='PRESTATE_UNKNOWN'){assert.equal(value.status,'UNKNOWN');assert.equal(value.stage,'PRESTATE');assert.equal(value.testSetupState,'PASS');assert.equal(value.lifecyclePrefixState,'PASS');assert.equal(value.prestate.observationState,'INCOMPLETE');assert.equal(value.u27PreInstall.classification,'NOT_OBSERVED');assert.equal(value.cleanupState,'CONTROLLED_ONLY');}
  if(value.classification==='U27_NON_SUCCESS'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'U27_PRE_INSTALL');assert.equal(value.testSetupState,'PASS');assert.equal(value.lifecyclePrefixState,'PASS');assert.equal(value.prestate.observationState,'COMPLETE');assert.equal(value.u27PreInstall.status,'FAIL');assert.notEqual(value.u27PreInstall.exitStatus,'INNO_EXIT_SUCCESS');assert.equal(value.cleanupState,'CONTROLLED_ONLY');}
  if(value.classification==='U27_DIAGNOSTIC_FAILED'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'U27_PRE_INSTALL');assert.equal(value.testSetupState,'PASS');assert.equal(value.lifecyclePrefixState,'PASS');assert.equal(value.prestate.observationState,'COMPLETE');assert.equal(value.u27PreInstall.status,'FAIL');assert.equal(value.u27PreInstall.exitStatus,'INNO_EXIT_SUCCESS');assert.equal(value.cleanupState,'CONTROLLED_ONLY');}
  if(value.classification==='POST_SETUP_STATE_FAILED'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'U27_PRE_INSTALL');assert.equal(value.testSetupState,'PASS');assert.equal(value.lifecyclePrefixState,'PASS');assert.equal(value.prestate.observationState,'COMPLETE');assert.equal(value.u27PreInstall.status,'PASS');assert.equal(value.cleanupState,'CONTROLLED_ONLY');}
  if(value.classification==='SETUP_SUCCEEDED_CLONE_UNKNOWN'){
    assert.equal(value.status,'UNKNOWN');assert.equal(value.stage,'COMPLETE');assert.equal(value.testSetupState,'PASS');
    assert.equal(value.lifecyclePrefixState,'PASS');assert.equal(value.prestate.observationState,'COMPLETE');
    assert.equal(value.prestate.uninstallCompletionState,'UNKNOWN');assert.equal(value.u27PreInstall.status,'PASS');
    assert.equal(value.cleanupState,'CONTROLLED_ONLY');
  }
  if(value.classification==='NETWORK_RESTORE_FAILED'){assert.equal(value.status,'FAIL');assert.equal(value.stage,'COMPLETE');assert.equal(value.networkState.restorationState,'FAILED');}
  if(value.classification==='ISOLATION_INVALID'||value.classification==='EXECUTION_FAILURE'){
    assert.equal(value.status,'FAIL');assert.equal(value.stage,'COMPLETE');assert.equal(value.cleanupState,'CONTROLLED_ONLY');
  }
  const text=JSON.stringify(value);
  assert.doesNotMatch(text,/(?:password|cookie|authorization|account|pid|raw(?:log|error|message|stdout|stderr)|sha256|bytes|length|[A-Za-z]:\\)/i);
  return value;
}
function writeExclusive(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
function replaceExact(file,value){const temp=file+'.tmp';assert.equal(fs.existsSync(temp),false);fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});fs.renameSync(temp,file);}
function transitionNetwork(value,state){
  if(state==='ISOLATED'){assert.equal(value.networkState.restorationState,'NOT_OBSERVED');value.networkState.isolationState='ISOLATED';}
  else if(state==='RESTORED'){value.networkState.restorationState='RESTORED';}
  else if(state==='FAILED'){value.status='FAIL';value.stage='COMPLETE';value.classification='NETWORK_RESTORE_FAILED';value.networkState.isolationState='UNKNOWN';value.networkState.restorationState='FAILED';}
  else assert.fail('fixed network transition required');
  return value;
}
function driverFailure(value,sourceCommit,classification){
  validate(value,sourceCommit);assert.ok(['ISOLATION_INVALID','EXECUTION_FAILURE'].includes(classification));
  value.status='FAIL';value.stage='COMPLETE';value.classification=classification;value.cleanupState='CONTROLLED_ONLY';
  return validate(value,sourceCommit);
}
function validateFinal(value,sourceCommit){
  validate(value,sourceCommit);assert.notEqual(value.classification,'NOT_OBSERVED');
  if(value.classification!=='ENVIRONMENT_FAILED'&&value.classification!=='NETWORK_RESTORE_FAILED'&&value.classification!=='ISOLATION_INVALID'&&value.classification!=='EXECUTION_FAILURE')assert.equal(value.networkState.restorationState,'RESTORED');
  if(value.classification==='ISOLATION_INVALID'||value.classification==='EXECUTION_FAILURE')assert.ok(['RESTORED','FAILED'].includes(value.networkState.restorationState));
  if(value.classification==='NETWORK_RESTORE_FAILED')assert.equal(value.networkState.restorationState,'FAILED');
  return value;
}

if(require.main===module){
  const [command,file,sourceCommit,arg]=process.argv.slice(2);source(sourceCommit);
  if(command==='init'){writeExclusive(file,validate(initial(sourceCommit),sourceCommit));}
  else if(command==='prefix-failed'){
    const current=validate(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    replaceExact(file,validate(prefixFailure(sourceCommit,arg,current.networkState),sourceCommit));
  }else if(command==='lifecycle-start'){
    const current=validate(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    replaceExact(file,validate(lifecyclePlaceholder(sourceCommit,current.networkState),sourceCommit));
  }else if(command==='network'){
    const current=validate(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    replaceExact(file,validate(transitionNetwork(current,arg),sourceCommit));
  }else if(command==='driver-failed'){
    const current=validate(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    replaceExact(file,driverFailure(current,sourceCommit,arg));
  }else if(command==='export'){
    const target=arg;assert.ok(target&&path.resolve(target)!==path.resolve(file));
    const current=validate(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    validate(JSON.parse(fs.readFileSync(target,'utf8')),sourceCommit);replaceExact(target,current);
  }else if(command==='verify'){
    const value=validate(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    process.stdout.write(JSON.stringify({status:'VALID',reportStatus:value.status,classification:value.classification})+'\n');
  }else if(command==='verify-final'){
    const value=validateFinal(JSON.parse(fs.readFileSync(file,'utf8')),sourceCommit);
    process.stdout.write(JSON.stringify({status:'VALID_FINAL',reportStatus:value.status,classification:value.classification})+'\n');
  }else throw new Error('fixed command required');
}

module.exports={emptyNetwork,emptyPrestate,initial,prefixFailure,lifecyclePlaceholder,transitionNetwork,driverFailure,validate,validateFinal};
