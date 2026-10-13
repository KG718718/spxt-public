'use strict';
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const generator=require('./prepare-u27-specialty.cjs');
const pre=require('../../../windows-installer/beta4-upgrade/u27-pre-install-report.cjs');
const report=require('../../../windows-installer/beta4-upgrade/u27-specialty-report.cjs');

const source='a'.repeat(40),other='b'.repeat(40);
const repo=path.resolve(__dirname,'../../../..');
const completePrestate=()=>({observationState:'COMPLETE',uninstallCompletionState:'UNKNOWN',productRegistrationState:'ABSENT',
  bindingState:'EXPECTED',installRootState:'NONEMPTY_DIRECTORY',programState:'ABSENT',uninstallerState:'ABSENT',
  desktopShortcutState:'ABSENT',startShortcutState:'ABSENT',controlledLauncherState:'EXITED',controlledNodeState:'EXITED',
  rootLockState:'EXCLUSIVE_OPEN_CLOSED',instanceState:'UNCHANGED'});
const observed=(overrides={})=>pre.classifyU27PreInstall({processStarted:true,exitCode:0,logState:'OBSERVED',
  observedMarkers:['KSESSION_PREINSTALL_READY','KSESSION_INSTALLED_PAYLOAD_VERIFIED'],...overrides},source);
const top=(classification,overrides={})=>({schema:1,kind:'U27_SPECIALTY',status:'FAIL',stage:'U27_PRE_INSTALL',classification,
  sourceCommit:source,testSetupState:'PASS',lifecyclePrefixState:'PASS',prestate:completePrestate(),
  networkState:{isolationState:'ISOLATED',restorationState:'RESTORED'},u27PreInstall:pre.fixedU27NotObserved(source),cleanupState:'CONTROLLED_ONLY',...overrides});

test('specialty generator preserves full TestSetup and the normal U01-U27 prefix',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-u27-specialty-')),out=path.join(root,'specialty');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  cp.execFileSync(process.execPath,[path.join(__dirname,'prepare-u27-specialty.cjs'),path.join(repo,'tools/windows-launcher'),out],
    {cwd:repo,windowsHide:true,stdio:'pipe'});
  const read=(...parts)=>fs.readFileSync(path.join(...parts),'utf8').replaceAll('\r\n','\n');
  const full=read(out,'full-normal','upgrade_windows_test.go'),specialty=read(out,'upgrade_windows_test.go');
  assert.equal(read(out,'full-normal','setup_windows_test.go'),read(out,'setup_windows_test.go'));
  assert.deepEqual(generator.stripAllowedSpecialty(full,specialty),{full:generator.stripAllowedSpecialty(full,specialty).full,
    specialty:generator.stripAllowedSpecialty(full,specialty).full});
  assert.match(specialty,/func TestU27Specialty\(/);assert.doesNotMatch(specialty,/func TestUpgradeLifecycle\(/);
  for(const id of ['U28','U29','U30'])assert.doesNotMatch(specialty,new RegExp(`record\\("${id}"`));
  assert.match(specialty,/if sequenceDiagnostic \|\| diagnostic \{ t\.Fatal\("U27 specialty requires the complete normal lifecycle prefix"\) \}/);
  assert.match(specialty,/u26Inventory := persistentInventory\(\)[\s\S]*u26Proof\.ControlledExited, u26Proof\.RootLockOpenClosed = true, true[\s\S]*u26Proof\.InstanceUnchanged = equalMaps\(upgradedInstance, u26Inventory\)/);
  assert.match(specialty,/observeU27SpecialtyPrestate\(ps, target, instance, desktop, start, u26Proof\)/);
  assert.match(specialty,/TestU27SpecialtyPurePrestate[\s\S]*u27SpecialtyGateProof\{\}[\s\S]*"product64":null[\s\S]*"installRoot":null[\s\S]*"extra":true/);
});

test('specialty report accepts only fixed fail-closed state combinations',()=>{
  const accepted=[report.initial(source),report.prefixFailure(source,'ENVIRONMENT_FAILED'),
    report.prefixFailure(source,'PREFIX_TEST_SETUP_FAILED'),report.lifecyclePlaceholder(source),
    top('PRESTATE_UNKNOWN',{status:'UNKNOWN',stage:'PRESTATE',prestate:{...completePrestate(),observationState:'INCOMPLETE',bindingState:'UNKNOWN'}}),
    top('U27_NON_SUCCESS',{u27PreInstall:observed({exitCode:7,observedMarkers:['KSESSION_REJECT_NONEMPTY']})}),
    top('U27_DIAGNOSTIC_FAILED',{u27PreInstall:observed({observedMarkers:[]})}),
    top('POST_SETUP_STATE_FAILED',{u27PreInstall:observed()}),
    top('SETUP_SUCCEEDED_CLONE_UNKNOWN',{status:'UNKNOWN',stage:'COMPLETE',u27PreInstall:observed()})];
  for(const value of accepted)assert.doesNotThrow(()=>report.validate(value,source));
});

test('status, stage, source, schema and privacy contradictions are rejected',()=>{
  const valid=top('SETUP_SUCCEEDED_CLONE_UNKNOWN',{status:'UNKNOWN',stage:'COMPLETE',u27PreInstall:observed()});
  for(const mutation of [
    value=>value.status='FAIL',value=>value.stage='U27_PRE_INSTALL',value=>value.sourceCommit=other,
    value=>value.cleanupState='NOT_OBSERVED',value=>value.prestate.uninstallCompletionState='NOT_OBSERVED',
    value=>value.prestate.controlledNodeState='UNKNOWN',value=>value.rawStdout='secret',value=>value.pid='1234']){
    const changed=structuredClone(valid);mutation(changed);assert.throws(()=>report.validate(changed,source));
  }
  const setupRejected=top('U27_NON_SUCCESS',{u27PreInstall:observed({exitCode:7,observedMarkers:['KSESSION_REJECT_NONEMPTY']})});
  setupRejected.u27PreInstall.exitStatus='INNO_EXIT_SUCCESS';assert.throws(()=>report.validate(setupRejected,source));
});

test('final verification proves restoration but never converts UNKNOWN into PASS',()=>{
  assert.throws(()=>report.validateFinal(report.initial(source),source));
  assert.doesNotThrow(()=>report.validateFinal(report.prefixFailure(source,'ENVIRONMENT_FAILED'),source));
  const unknown=top('SETUP_SUCCEEDED_CLONE_UNKNOWN',{status:'UNKNOWN',stage:'COMPLETE',u27PreInstall:observed()});
  assert.doesNotThrow(()=>report.validateFinal(unknown,source));assert.notEqual(unknown.status,'PASS');
  unknown.networkState.restorationState='NOT_OBSERVED';assert.throws(()=>report.validateFinal(unknown,source));
  const failed=report.transitionNetwork(report.lifecyclePlaceholder(source,{isolationState:'UNKNOWN',restorationState:'NOT_OBSERVED'}),'FAILED');
  assert.equal(failed.classification,'NETWORK_RESTORE_FAILED');assert.doesNotThrow(()=>report.validateFinal(failed,source));
  for(const classification of ['ISOLATION_INVALID','EXECUTION_FAILURE']){
    const driver=report.driverFailure(top('SETUP_SUCCEEDED_CLONE_UNKNOWN',{status:'UNKNOWN',stage:'COMPLETE',u27PreInstall:observed()}),source,classification);
    assert.equal(driver.status,'FAIL');assert.equal(driver.classification,classification);assert.doesNotThrow(()=>report.validateFinal(driver,source));
  }
  const ci=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/u27-specialty-ci.ps1'),'utf8');
  assert.match(ci,/status -cne 'UNKNOWN'[\s\S]*classification -cne 'SETUP_SUCCEEDED_CLONE_UNKNOWN'[\s\S]*U27_SPECIALTY_OUTCOME_UNKNOWN/);
  assert.match(ci,/KSESSION_SETUP_ARTIFACT=\(Join-Path/);assert.match(ci,/KSESSION_SETUP_EVIDENCE=\(Join-Path/);
});

test('prestate strict root, registry and U26 proof contracts are generated fail closed',()=>{
  const sourceText=fs.readFileSync(path.join(__dirname,'prepare-u27-specialty.cjs'),'utf8');
  for(const token of ['ABSENT','EMPTY_DIRECTORY','NONEMPTY_DIRECTORY','NON_DIRECTORY','UNKNOWN'])assert.match(sourceText,new RegExp(token));
  assert.match(sourceText,/len\(registry\) != 5/);
  assert.match(sourceText,/string\(product64Raw\) != "true"/);
  assert.match(sourceText,/u27StrictJSONString\(rootRaw\)/);
  assert.match(sourceText,/if proof\.ControlledExited/);
  assert.doesNotMatch(sourceText,/Start-Sleep|time\.Sleep/);
});

test('specialty driver uses exactly two offline Go processes and keeps raw output private',()=>{
  const offline=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/u27-specialty-offline.ps1'),'utf8');
  const ci=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/u27-specialty-ci.ps1'),'utf8');
  assert.equal((offline.match(/& \$Go test/g)||[]).length,2);
  assert.match(offline,/-run '\^TestSetup\$'/);assert.match(offline,/-run '\^TestU27Specialty\$'/);
  assert.match(offline,/Disable-NetAdapter[\s\S]*TestSetup[\s\S]*TestU27Specialty[\s\S]*Restore-ExactAdapters/);
  assert.match(offline,/TestSetup\$'[\s\S]*\*> \(Join-Path \$env:RUNNER_TEMP/);
  assert.match(offline,/TestU27Specialty\$'[\s\S]*\*> \(Join-Path \$env:RUNNER_TEMP/);
  assert.match(offline,/WaitForExit\(5000\)[\s\S]*HasExited[\s\S]*ExitCode/);
  assert.match(offline,/taskWatchdogExitVerified/);assert.match(offline,/taskWatchdog\.Dispose\(\)/);assert.match(offline,/U27_SPECIALTY_DRIVER_STATE_UNPROVEN/);
  assert.match(offline,/driver-failed/);assert.match(offline,/ISOLATION_INVALID/);assert.match(offline,/EXECUTION_FAILURE/);
  assert.doesNotMatch(ci,/-FullHosted/);assert.match(ci,/ci-beta4\.ps1/);
  for(const forbidden of ['PRIVATE_SESSION','firewall-hosted-gate','public-regression','verify-artifact-beta4'])assert.doesNotMatch(ci,new RegExp(forbidden,'i'));
});

test('push-marker specialty workflow is isolated and uploads only strictly verified fixed JSON',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github/workflows/lan2-u27-specialty.yml'),'utf8');
  assert.match(workflow,/on:\s*\n\s+push:/);assert.doesNotMatch(workflow,/workflow_call:|workflow_dispatch:/);
  for(const fixed of ['github.run_attempt == 1',"contains(github.event.head_commit.message, '[lan2-u27-r2]')",'LAN2-U27-R2-ONE-SHOT','refs/heads/codex/lan2-manual-host-v1.1',
    '36246132535','10907910968','c8886e6b6d413c2fd73d6716621d07a80b337e58',
    '877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6'])assert.match(workflow,new RegExp(fixed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(workflow,/git clone --no-hardlinks --no-checkout \. E:\/u27-source/);
  assert.match(workflow,/artifact\.workflow_run\.id[\s\S]*run\.repository\.full_name/);
  const upload=workflow.slice(workflow.lastIndexOf('- uses: actions/upload-artifact@'));
  assert.match(upload,/steps\.verify\.outputs\.safe == 'true'/);assert.match(upload,/U27-SPECIALTY-REPORT\.json/);assert.doesNotMatch(upload,/\.exe|\.log|artifact\//i);
  for(const forbidden of ['setup-v3','lan2-beta4-v1.1','lan2-final-acceptance','lc01-hosted.ps1'])assert.doesNotMatch(workflow,new RegExp(forbidden));
});
