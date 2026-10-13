'use strict';
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const api=require('../../../windows-installer/beta4-upgrade/u27-pre-install-report.cjs');
const source='a'.repeat(40),other='b'.repeat(40);
const repo=path.resolve(__dirname,'../../../..');
const observe=(overrides={})=>api.classifyU27PreInstall({processStarted:true,exitCode:0,logState:'OBSERVED',
  observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED'],...overrides},source);

test('U27 success requires fixed pre-install and installed verification markers',()=>{
  const report=observe();
  assert.equal(report.status,'PASS');assert.equal(report.classification,'SUCCESS');
  assert.deepEqual([report.preInstallState,report.copyState,report.postInstallVerificationState],['PASS','PASS','PASS']);
  assert.doesNotThrow(()=>api.verifyU27PreInstallReport(report,source,{requirePass:true}));
});
test('U27 fixed pre-install rejection stays failed without claiming copy started',()=>{
  const report=observe({exitCode:7,observedMarkers:['KSESSION_REJECT_NONEMPTY']});
  assert.deepEqual([report.status,report.classification,report.preInstallState,report.copyState,report.postInstallVerificationState],
    ['FAIL','PREINSTALL_REJECTED','REJECTED','NOT_OBSERVED','NOT_OBSERVED']);
  assert.throws(()=>api.verifyU27PreInstallReport(report,source,{requirePass:true}));
});
test('U27 process start failure is fixed and contains no raw error',()=>{
  const report=observe({processStarted:false,exitCode:-1,logState:'MISSING',observedMarkers:[]});
  assert.equal(report.classification,'PROCESS_START_FAILED');assert.equal(report.exitStatus,'PROCESS_START_FAILED');
  assert.doesNotMatch(JSON.stringify(report),/path|message|error|sha|length|bytes/i);
});
test('U27 abnormal exit after pre-install leaves copy unknown',()=>{
  const report=observe({exitCode:4,observedMarkers:['KSESSION_PREINSTALL_READY']});
  assert.deepEqual([report.classification,report.preInstallState,report.copyState,report.postInstallVerificationState],
    ['ABNORMAL_EXIT_AFTER_PREINSTALL','PASS','UNKNOWN','UNKNOWN']);
});
test('U27 missing and unreadable log remain fail closed',()=>{
  for(const [logState,classification] of [['MISSING','LOG_MISSING'],['READ_FAILED','LOG_READ_FAILED']]){
    const report=observe({exitCode:1,logState,observedMarkers:[]});
    assert.equal(report.classification,classification);assert.equal(report.status,'FAIL');
    assert.throws(()=>api.verifyU27PreInstallReport(report,source,{requirePass:true}));
  }
});
test('U27 marker absence is UNKNOWN and never inferred as not entered',()=>{
  const report=observe({exitCode:7,observedMarkers:[]});
  assert.equal(report.classification,'UNKNOWN');assert.equal(report.markerState,'NOT_OBSERVED');
  assert.deepEqual([report.preInstallState,report.copyState,report.postInstallVerificationState],['UNKNOWN','UNKNOWN','UNKNOWN']);
});
test('U27 invalid marker and incomplete or stale-path evidence stay failed',()=>{
  assert.throws(()=>observe({exitCode:7,observedMarkers:['KSESSION_PRIVATE_PATH']}),/invalid U27 marker/);
  const contradiction=observe({exitCode:0,observedMarkers:['KSESSION_PREINSTALL_READY']});
  assert.equal(contradiction.classification,'UNKNOWN');assert.equal(contradiction.status,'FAIL');
  assert.throws(()=>api.verifyU27PreInstallReport(contradiction,source,{requirePass:true}));
  const staleUpgrade=observe({observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED','KSESSION_UPGRADE_TRANSACTION_COMMITTED']});
  assert.equal(staleUpgrade.classification,'UNKNOWN');
});
test('U27 later nonzero after installed verification preserves positive stages but fails',()=>{
  const report=observe({exitCode:4});
  assert.deepEqual([report.status,report.classification,report.preInstallState,report.copyState,report.postInstallVerificationState],
    ['FAIL','LATE_FAILURE_AFTER_VERIFICATION','PASS','PASS','PASS']);
});
test('U27 READY plus data rejection cannot prove copy or post-install phase',()=>{
  for(const exitCode of [7,4]){
    const report=observe({exitCode,observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_DATA_REJECT_']});
    assert.deepEqual([report.classification,report.preInstallState,report.copyState,report.postInstallVerificationState],
      ['DATA_REJECTED_PHASE_UNKNOWN','PASS','UNKNOWN','UNKNOWN']);
  }
  const withoutReady=observe({exitCode:7,observedMarkers:['KSESSION_DATA_REJECT_']});
  assert.deepEqual([withoutReady.classification,withoutReady.copyState,withoutReady.postInstallVerificationState],
    ['DATA_REJECTED_PHASE_UNKNOWN','UNKNOWN','UNKNOWN']);
});
test('U27 post-install failure is positive copy evidence while overall status remains FAIL',()=>{
  const report=observe({exitCode:4,observedMarkers:['KSESSION_DATA_REJECT_','KSESSION_PREINSTALL_READY','KSESSION_UPGRADE_POSTINSTALL_FAILED']});
  assert.deepEqual([report.status,report.classification,report.copyState,report.postInstallVerificationState],
    ['FAIL','POSTINSTALL_FAILED','PASS','FAILED']);
});
test('U27 exit zero cannot hide contradictory installed and rejection evidence',()=>{
  const postConflict=observe({observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED','KSESSION_UPGRADE_POSTINSTALL_FAILED']});
  assert.deepEqual([postConflict.status,postConflict.classification,postConflict.copyState,postConflict.postInstallVerificationState],
    ['FAIL','UNKNOWN','PASS','UNKNOWN']);
  const dataConflict=observe({observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED','KSESSION_DATA_REJECT_']});
  assert.deepEqual([dataConflict.status,dataConflict.classification,dataConflict.copyState,dataConflict.postInstallVerificationState],
    ['FAIL','UNKNOWN','PASS','PASS']);
  assert.throws(()=>api.verifyU27PreInstallReport(postConflict,source,{requirePass:true}));
  assert.throws(()=>api.verifyU27PreInstallReport(dataConflict,source,{requirePass:true}));
});
test('U27 classifier rejects coercible process and exit input types',()=>{
  const valid={processStarted:true,exitCode:0,logState:'OBSERVED',observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED']};
  assert.throws(()=>api.classifyU27PreInstall({...valid,processStarted:'false'},source));
  assert.throws(()=>api.classifyU27PreInstall({...valid,exitCode:'0'},source));
  assert.throws(()=>api.classifyU27PreInstall({...valid,exitCode:0.5},source));
});
test('U27 unordered conflicting phase markers remain UNKNOWN',()=>{
  const report=observe({exitCode:7,observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_REJECT_NONEMPTY']});
  assert.equal(report.classification,'UNKNOWN');assert.equal(report.status,'FAIL');assert.equal(report.preInstallState,'PASS');
});
test('U27 legacy fixed fixture and sequence markers are safe but unexpected UNKNOWN',()=>{
  for(const marker of ['KSESSION_FIXTURE_COPY_FAILURE','KSESSION_SEQUENCE_REGISTRATION_CONFLICT']){
    const report=observe({observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED',marker]});
    assert.equal(report.status,'FAIL');assert.equal(report.classification,'UNKNOWN');
    assert.doesNotThrow(()=>api.verifyU27PreInstallReport(report,source));
  }
});
test('U27 strict source and extra-field binding reject tampering',()=>{
  const report=observe();
  assert.throws(()=>api.verifyU27PreInstallReport(report,other));
  assert.throws(()=>api.verifyU27PreInstallReport({...report,rawLog:'secret'},source));
  assert.throws(()=>api.verifyU27PreInstallReport({...report,status:'FAIL'},source));
});
test('U27 initial report is explicit NOT_OBSERVED rather than inferred',()=>{
  const report=api.fixedU27NotObserved(source);
  assert.equal(report.status,'FAIL');assert.equal(report.classification,'NOT_OBSERVED');
  assert.doesNotThrow(()=>api.verifyU27PreInstallReport(report,source));
  assert.throws(()=>api.verifyU27PreInstallReport(report,source,{requirePass:true}));
});
test('U27 generated Full overlay records fixed diagnostics before failing',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-u27-overlay-')),out=path.join(root,'harness');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  cp.execFileSync(process.execPath,[path.join(__dirname,'prepare-hosted-harness.cjs'),path.join(repo,'tools/windows-launcher'),out],
    {cwd:repo,windowsHide:true,stdio:'pipe'});
  const generated=fs.readFileSync(path.join(out,'upgrade_windows_test.go'),'utf8').replaceAll('\r\n','\n');
  assert.match(generated,/u27PreInstall := u27NotObserved\(os\.Getenv\("GITHUB_SHA"\)\)/);
  assert.match(generated,/u27Result := runSetupRaw\(targetBeta4\)[\s\S]+report\["u27PreInstall"\] = u27PreInstall[\s\S]+U27_PRE_INSTALL failed/);
  assert.match(generated,/if \(u27Result\.exitCode == 0\) != true \{[\s\S]+setup targetBeta4 success=%v want=true/);
  assert.match(generated,/os\.ReadFile\(log\)[\s\S]+logState = "MISSING"[\s\S]+logState = "READ_FAILED"/);
  const raw=generated.slice(generated.indexOf('\trunSetupRaw := func'),generated.indexOf('\trunSetup := func'));
  assert.doesNotMatch(raw,/mustRead\(t, log\)/);
  const run=generated.slice(generated.indexOf('\trunSetup := func'),generated.indexOf('\tassertLog := func'));
  assert.match(run,/result\.logState != "OBSERVED"[\s\S]+t\.Fatalf\("setup diagnostic unavailable/);
  const markerSource=generated.slice(generated.indexOf('func safeInstallerMarkers'),generated.indexOf('func hasInstallerMarker'));
  const goMarkers=[...markerSource.matchAll(/"(KSESSION_[A-Z0-9_]+)"/g)].map(match=>match[1]);
  assert.deepEqual([...new Set([...goMarkers,'KSESSION_DATA_REJECT_'])].sort(),[...api.allowedMarkers].sort());
  for(const marker of ['PROCESS_START_FAILED','INNO_EXIT_UNEXPECTED_NONZERO','PREINSTALL_REJECTED','LATE_FAILURE_AFTER_VERIFICATION','POSTINSTALL_FAILED','DATA_REJECTED_PHASE_UNKNOWN','NOT_OBSERVED'])assert.ok(generated.includes(marker),marker);
  const u27Diagnostic=generated.slice(generated.indexOf('func u27NotObserved'));
  for(const forbidden of ['rawLog','rawError','logSHA256','logBytes'])assert.doesNotMatch(u27Diagnostic,new RegExp(forbidden));
});
