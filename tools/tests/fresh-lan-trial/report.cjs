'use strict';
const assert=require('node:assert/strict');
const IDS=Object.freeze(['F01','F02','F03','F04','F05','F06','F07','F08','F09']);
const WITNESSES=Object.freeze({
 F01:['actualSetup','zeroExit','freshMode','preexistingRejected','rejectionsUnchanged'],
 F02:['programInventory','runtimeManifest','launcherHash','helperHash','emptyBusiness','noTestPayload'],
 F03:['actualInstalledLauncher','ownedInstalledNode','uniqueNode','exclusiveLock','loopbackBootstrap','remoteBootstrapRejected'],
 F04:['productionDiscoveryTests','uniquePreselect','multipleRequiresChoice','explicitFirstConsent','unsafeRejected','portSubnetConfig','virtualRejected','firewallAuthorizationBeforeBind','restoredFirewallBeforeBind','isolatedDualListenerSocket'],
 F05:['installedServiceIdentity','headlessBrowser','twoContexts','twoLogins','authorizationIsolation','saveReadback','attachmentUploadDownload','adminConfigurationUI','projectSaveReadback'],
 F06:['normalStop','ownedProcessesExited','lockReleased','restartPersistence','configPersistence','loginStartupWiring'],
 F07:['helperIdentity','virtualRejected','privateNarrowRuleTests','ownedRuleRemoved'],
 F08:['exact26Suites','exact742Checks','zeroFailure','zeroSkip'],
 F09:['exactAllowlist','sourceBound','setupHashBound','sameExe','privacyVerified']
});
const HUMAN=Object.freeze(['REAL_GUI_UAC','PHYSICAL_PRIVATE_ADAPTER','FIREWALL_AUTHORIZATION','SECOND_PHYSICAL_DEVICE','WINDOWS_LOGIN_STARTUP','SECOND_LAUNCHER_GUI']);
const METHODS=Object.freeze({F01:'ACTUAL_SETUP',F02:'INSTALLED_BYTES',F03:'ACTUAL_INSTALLED_LAUNCHER_AND_ISOLATED_REMOTE_HANDLER',F04:'ISOLATED_PRODUCTION_POLICY_TESTS_AND_SOCKET',F05:'INSTALLED_PAYLOAD_BROWSER_LOOPBACK',F06:'ACTUAL_RESTART_AND_STARTUP_WIRING',F07:'CONTROLLED_RULE_AND_POLICY_TESTS',F08:'FROZEN_REGRESSION',F09:'ARTIFACT_BYTES'});
function exact(o,keys){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),[...keys].sort());}
function validate(r,expected){
 if(expected.reportSchema!==undefined)assert.equal(r.schema,expected.reportSchema);
 const extended=r?.schema===2;if(extended)require('./install-r2/recovery.cjs').validate(r.recovery);
 exact(r,[...(extended?['recovery']:[]),'schema','kind','sourceCommit','controlCommit','run','mode','status','stage','reason','setupSha256','candidate','checks','cleanup','humanPending','historical','setupDiagnostics','buildDiagnostic']);
 require('./build-diagnostic.cjs').validate(r.buildDiagnostic);
 assert.match(r.controlCommit,/^[a-f0-9]{40}$/);if(expected.controlCommit)assert.equal(r.controlCommit,expected.controlCommit);
 exact(r.run,['id','attempt']);assert.match(r.run.id,/^[1-9][0-9]{0,19}$/);assert.equal(r.run.attempt,1);if(expected.run)assert.deepEqual(r.run,expected.run);
 assert.ok(Array.isArray(r.setupDiagnostics)&&r.setupDiagnostics.length<=7);for(const d of r.setupDiagnostics){require('./setup-diagnostic.cjs').validate(d);if(expected.reportSchema===2)assert.equal(d.schema,2);}
 assert.ok(r.schema===1||r.schema===2);assert.equal(r.kind,'KSESSION_FRESH_TRIAL');
 assert.match(r.sourceCommit,/^[a-f0-9]{40}$/);assert.equal(r.sourceCommit,expected.sourceCommit);
 assert.ok(['CANDIDATE','QA'].includes(r.mode));assert.equal(r.mode,expected.mode);
 assert.ok(['FAIL','FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING'].includes(r.status));
 assert.ok(['ENV','SOURCE','BUILD',...IDS,'COMPLETE'].includes(r.stage));
 assert.ok(['PASS','GATE_FAILED','DEPENDENCY_UNPROVEN','SOURCE_REJECTED','SETUP_REJECTED','BROWSER_FAILED','CLEANUP_UNPROVEN','BUILD_PORTABLE_FAILED','BUILD_TOOLCHAIN_FAILED','BUILD_COMPILER_FAILED','BROWSER_TOOL_FAILED','REPORT_INVALID'].includes(r.reason));
 assert.ok(r.setupSha256===null||/^[a-f0-9]{64}$/.test(r.setupSha256));
 exact(r.candidate,['runId','artifactId','sourceCommit','setupSha256']);
 for(const k of ['runId','artifactId'])assert.ok(r.candidate[k]===null||/^[1-9][0-9]{0,19}$/.test(r.candidate[k]));
 assert.ok(r.candidate.sourceCommit===null||r.candidate.sourceCommit===r.sourceCommit);
 assert.ok(r.candidate.setupSha256===null||r.candidate.setupSha256===r.setupSha256);
 assert.ok(Array.isArray(r.checks)&&r.checks.length<=9);
 r.checks.forEach((c,n)=>{exact(c,['id','method','pass','witnesses']);assert.equal(c.id,IDS[n]);assert.equal(c.method,METHODS[c.id]);assert.equal(typeof c.pass,'boolean');exact(c.witnesses,WITNESSES[c.id]);for(const v of Object.values(c.witnesses))assert.equal(typeof v,'boolean');assert.equal(c.pass,Object.values(c.witnesses).every(x=>x===true));});
 exact(r.cleanup,['ownedLauncherExited','ownedNodeExited','handlesClosed','lockReleased','ownedRulesAbsent','ownedRegistrationAbsent','ownedShortcutsAbsent','ownedToolchainAbsent','ownedDriveRestored','environmentRestored']);
 for(const v of Object.values(r.cleanup))assert.ok(v===true||v===false||v===null);
 assert.deepEqual(r.humanPending,HUMAN);
 assert.deepEqual(r.historical,{upgrade:{result:'FAIL',workStatus:'DEFERRED'},uninstallReinstall:{result:'FAIL',workStatus:'DEFERRED'},LC01:{result:'FAIL',workStatus:'DEFERRED'},U27:{result:'FAIL',workStatus:'DEFERRED'}});
 if(r.status!=='FAIL'){
  if(extended){assert.equal(require('./install-r2/recovery.cjs').restored(r.recovery),true);assert.ok(r.setupDiagnostics.every(d=>d.schema===2));}
  assert.equal(r.stage,'COMPLETE');assert.equal(r.reason,'PASS');assert.match(r.setupSha256,/^[a-f0-9]{64}$/);
  assert.equal(r.buildDiagnostic.stage,'COMPLETE');assert.equal(r.buildDiagnostic.classification,'PASS');assert.equal(Object.hasOwn(r.buildDiagnostic,'supervisor'),false);
  assert.equal(r.checks.length,9);assert.ok(r.checks.every(c=>c.pass));assert.ok(Object.values(r.cleanup).every(v=>v===true));
  assert.deepEqual(r.setupDiagnostics.map(d=>d.call),['NONEMPTY_TARGET','EXISTING_INSTANCE','DESKTOP_SHORTCUT','STARTUP_SHORTCUT','OLD_BINDING','FRESH_ACCEPT','REGISTERED_REJECT']);for(const d of r.setupDiagnostics)require('./setup-diagnostic.cjs').expected(d);
  if(r.mode==='QA'){assert.match(r.candidate.runId,/^[1-9][0-9]*$/);assert.match(r.candidate.artifactId,/^[1-9][0-9]*$/);assert.equal(r.candidate.sourceCommit,r.sourceCommit);assert.equal(r.candidate.setupSha256,r.setupSha256);assert.deepEqual(r.candidate,expected.candidate);}
 }else{assert.notEqual(r.reason,'PASS');assert.notEqual(r.stage,'COMPLETE');}
 return r;
}
function initial(sourceCommit,mode,candidate={runId:null,artifactId:null,sourceCommit:null,setupSha256:null},controlCommit=sourceCommit,run={id:'1',attempt:1},schema=1){
 assert.ok(schema===1||schema===2);const result={schema,kind:'KSESSION_FRESH_TRIAL',sourceCommit,controlCommit,run,mode,status:'FAIL',stage:'ENV',reason:'DEPENDENCY_UNPROVEN',setupSha256:null,candidate,checks:[],setupDiagnostics:[],buildDiagnostic:{stage:'NOT_STARTED',classification:'NOT_STARTED',script:null,line:null},cleanup:{ownedLauncherExited:null,ownedNodeExited:null,handlesClosed:null,lockReleased:null,ownedRulesAbsent:null,ownedRegistrationAbsent:null,ownedShortcutsAbsent:null,ownedToolchainAbsent:null,ownedDriveRestored:null,environmentRestored:null},humanPending:[...HUMAN],historical:{upgrade:{result:'FAIL',workStatus:'DEFERRED'},uninstallReinstall:{result:'FAIL',workStatus:'DEFERRED'},LC01:{result:'FAIL',workStatus:'DEFERRED'},U27:{result:'FAIL',workStatus:'DEFERRED'}}};if(schema===2)result.recovery=require('./install-r2/recovery.cjs').initial();return result;
}
module.exports={IDS,WITNESSES,HUMAN,METHODS,validate,initial};
