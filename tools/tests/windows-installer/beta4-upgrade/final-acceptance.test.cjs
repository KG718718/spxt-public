'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const {fixedSessionReport,verifySessionReport}=require('../../../windows-installer/beta4-upgrade/session-report.cjs');
const acceptance=require('../../../windows-installer/beta4-upgrade/acceptance-report.cjs');
const repo=path.resolve(__dirname,'../../../..');
const read=file=>fs.readFileSync(path.join(repo,file),'utf8');

test('beta4 private-session report rejects extra identity, token, network and false success fields',t=>{
  const commit='a'.repeat(40),other='b'.repeat(40),pass=fixedSessionReport(commit);
  assert.doesNotThrow(()=>verifySessionReport(pass,commit));
  assert.throws(()=>verifySessionReport(pass,other));
  assert.throws(()=>verifySessionReport({...pass,sourceCommit:other},commit));
  assert.throws(()=>verifySessionReport({...pass,sourceCommit:'not-a-sha'},commit));
  assert.throws(()=>verifySessionReport(pass,'not-a-sha'));
  assert.throws(()=>verifySessionReport({...pass,sourceCommit:undefined},commit));
  for(const field of ['username','token','address','port','body','instancePath','windowText'])
    assert.throws(()=>verifySessionReport({...pass,[field]:'synthetic'},commit));
  for(const field of ['concurrentRequests','oneSessionLogoutIsolated','roleBoundaryPreserved','loginPageServed'])
    assert.throws(()=>verifySessionReport({...pass,[field]:false},commit));
  for(const field of ['realSecondDeviceClaim','realPhysicalLanClaim','browserUiClaim'])
    assert.throws(()=>verifySessionReport({...pass,[field]:true},commit));
  assert.throws(()=>verifySessionReport({...pass,socketClass:'LOOPBACK'},commit));
  const evidence=acceptance.fixedAcceptanceEvidence(commit),report=acceptance.fixedAcceptanceReport(commit);
  assert.doesNotThrow(()=>acceptance.verifyAcceptanceEvidence(evidence,commit));
  assert.doesNotThrow(()=>acceptance.verifyAcceptanceReport(report,commit));
  assert.throws(()=>acceptance.verifyAcceptanceReport(undefined,commit));
  assert.throws(()=>acceptance.verifyAcceptanceReport({...report,extra:true},commit));
  assert.throws(()=>acceptance.verifyAcceptanceReport({...report,sourceCommit:other},commit));
  assert.doesNotThrow(()=>acceptance.verifyArtifactFileSet(['b','a'],['a','b']));
  assert.throws(()=>acceptance.verifyArtifactFileSet(['a'],['a','b']));
  assert.throws(()=>acceptance.verifyArtifactFileSet(['a','b','extra'],['a','b']));
  for(const key of acceptance.automaticKeys){
    assert.throws(()=>acceptance.verifyAcceptanceEvidence({...evidence,[key]:'FAIL'},commit),key+' evidence FAIL');
    assert.throws(()=>acceptance.verifyAcceptanceEvidence({...evidence,[key]:'UNKNOWN'},commit),key+' evidence UNKNOWN');
    const bad=structuredClone(report);bad.automatic[key]='FAIL';assert.throws(()=>acceptance.verifyAcceptanceReport(bad,commit),key+' report FAIL');
  }
  for(const key of acceptance.humanKeys){const bad=structuredClone(report);bad.human[key]='PASS';assert.throws(()=>acceptance.verifyAcceptanceReport(bad,commit),key+' human spoof');}
  const missingAutomatic=structuredClone(report);delete missingAutomatic.automatic[acceptance.automaticKeys[0]];assert.throws(()=>acceptance.verifyAcceptanceReport(missingAutomatic,commit));
  const missingHuman=structuredClone(report);delete missingHuman.human[acceptance.humanKeys[0]];assert.throws(()=>acceptance.verifyAcceptanceReport(missingHuman,commit));
  for(const field of ['secondLauncherStarted','doubleLaunchProven','enterpriseLanCertified']){const bad=structuredClone(report);bad.scope[field]=true;assert.throws(()=>acceptance.verifyAcceptanceReport(bad,commit),field);}
  const erasedHistory=structuredClone(report);erasedHistory.scope.historicalLCK03SyntheticGateRetained=false;assert.throws(()=>acceptance.verifyAcceptanceReport(erasedHistory,commit));
  assert.deepEqual(Object.keys(report.lockMatrix).sort(),[...acceptance.lockIds].sort());
  assert.equal(report.lockMatrix.LCK03,'HUMAN_PENDING');
  for(const id of acceptance.lockIds.filter(id=>id!=='LCK03'))assert.equal(report.lockMatrix[id],'PASS',id);
  const falseLck03=structuredClone(report);falseLck03.lockMatrix.LCK03='PASS';assert.throws(()=>acceptance.verifyAcceptanceReport(falseLck03,commit));
  const syntheticLck03={status:'PASS',method:'node:test exact passed-subtest mapping'};
  assert.deepEqual(acceptance.verifyHistoricalLCK03SyntheticGate(syntheticLck03),syntheticLck03);
  for(const status of ['FAIL','UNKNOWN'])assert.throws(()=>acceptance.verifyHistoricalLCK03SyntheticGate({...syntheticLck03,status}));
  assert.throws(()=>acceptance.verifyHistoricalLCK03SyntheticGate({status:'PASS'}));
  assert.throws(()=>acceptance.verifyHistoricalLCK03SyntheticGate({...syntheticLck03,method:'real second Launcher'}));
  assert.throws(()=>acceptance.verifyAcceptanceEvidence({...evidence,extra:'PASS'},commit));
  assert.throws(()=>acceptance.verifyAcceptanceEvidence({...evidence,sourceCommit:other},commit));
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-acceptance-report-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'beta4-acceptance.json');
  assert.deepEqual(acceptance.ensureAcceptanceReport(file,commit,evidence).created,true);
  const firstBytes=fs.readFileSync(file);assert.deepEqual(acceptance.ensureAcceptanceReport(file,commit,evidence).created,false);assert.deepEqual(fs.readFileSync(file),firstBytes);
  fs.writeFileSync(file,JSON.stringify({...report,status:'PASS'})+'\n');assert.throws(()=>acceptance.ensureAcceptanceReport(file,commit,evidence));
  const failedFile=path.join(dir,'automatic-fail.json'),failedEvidence={...evidence,rootLockExclusive:'FAIL'};
  assert.throws(()=>acceptance.ensureAcceptanceReport(failedFile,commit,failedEvidence));assert.equal(fs.existsSync(failedFile),false);
});

test('beta4 CI runs private-session gate after offline restoration and before firewall',()=>{
  const ci=read('tools/windows-installer/beta4-upgrade/ci-beta4.ps1');
  const offline=ci.indexOf("if($LASTEXITCODE -ne 0){throw 'Offline beta4 lifecycle failed'}");
  const session=ci.indexOf("Set-FixedStage 'PRIVATE_SESSION'");
  const firewall=ci.indexOf("Set-FixedStage 'FIREWALL'");
  assert.ok(offline>=0&&session>offline&&firewall>session);
  assert.match(ci,/production-sessions\.test\.cjs/);
  assert.match(ci,/KSESSION_BETA4_SESSION_REPORT/);
  assert.match(ci,/KSESSION_BETA4_SOURCE_COMMIT=\$Commit/);
  assert.match(ci,/\$env:GITHUB_SHA -ne \$Commit/);
  assert.match(ci,/Remove-Item Env:KSESSION_BETA4_SESSION_LOOPBACK/);
  assert.match(ci,/Copy-Item -LiteralPath \$taskSessionReport -Destination \$taskArtifact/);
  const verifier=read('tools/windows-installer/beta4-upgrade/verify-artifact-beta4.cjs');
  assert.match(verifier,/production-sessions-beta4\.json/);
  assert.match(verifier,/privateSession=json\('production-sessions-beta4\.json'\);verifySessionReport\(privateSession,commit\)/);
  assert.match(verifier,/ensureAcceptanceReport\(acceptanceFile,commit,acceptanceEvidence\)/);
  assert.match(verifier,/verifyAcceptanceReport\(json\(acceptanceName\),commit\)/);
  assert.match(verifier,/compatibility\.locks.*id!=='LCK03'/s);
  assert.match(verifier,/verifyHistoricalLCK03SyntheticGate\(compatibility\.locks\.LCK03\)/);
  const acceptanceSource=read('tools/windows-installer/beta4-upgrade/acceptance-report.cjs');
  assert.match(acceptanceSource,/AUTOMATION_PASS_HUMAN_PENDING/);
  assert.match(acceptanceSource,/actualSecondLauncherStart.*HUMAN_PENDING/s);
  assert.match(acceptanceSource,/secondLauncherNaturalExit.*HUMAN_PENDING/s);
  assert.match(acceptanceSource,/firstAdminCreationAndBrowserLogin.*twoAccountConcurrentReadSaveAttachment/s);
  assert.match(acceptanceSource,/originalBackgroundStableDuringSecondLaunch.*normalExitRestartDataRetained/s);
  assert.match(acceptanceSource,/singleInstanceBaselineOnly:true,secondLauncherStarted:false,doubleLaunchProven:false/);
  assert.match(acceptanceSource,/historicalLCK03SyntheticGateRetained:true/);
  const sessions=read('tools/tests/windows-installer/beta4-upgrade/production-sessions.test.cjs');
  assert.match(sessions,/git'\,\['-C',repo,'rev-parse','HEAD'\]/);
  assert.match(sessions,/process\.env\.GITHUB_SHA,sourceCommit/);
  const workflow=read('.github/workflows/lan2-beta4-v1.1.yml');
  assert.match(workflow,/E:\/lan-build\/private-session\/production-sessions-beta4\.json/);
  assert.match(workflow,/testTotal -ne 742.*suitePass -ne 26.*fail -ne 0.*skipped -ne 0/);
});

test('new push wrapper is single-branch and single-document gated with exclusive markers',()=>{
  const wrapper=read('.github/workflows/lan2-final-acceptance.yml');
  assert.match(wrapper,/on:\s*\n\s*push:/);
  assert.doesNotMatch(wrapper,/workflow_dispatch:|pull_request:|schedule:/);
  assert.match(wrapper,/branches: \[codex\/lan2-manual-host-v1\.1\]/);
  assert.match(wrapper,/paths:\s*\n\s*- docs\/tasks\/windows-installer-v1\.1\/batch-lan-2\/LAN2-FINAL-TRIGGER\.md/);
  assert.doesNotMatch(wrapper,/lan2-lc01\/HOSTED-TRIGGER\.json/);
  assert.match(wrapper,/github\.repository == 'KG718718\/spxt-public'/);
  assert.match(wrapper,/github\.run_attempt == 1/);
  assert.match(wrapper,/!contains\(github\.event\.head_commit\.message, '\[lan2-final-qa\]'\)/);
  assert.match(wrapper,/!contains\(github\.event\.head_commit\.message, '\[lan2-candidate\]'\)/);
  assert.match(wrapper,/uses: \.\/\.github\/workflows\/lan2-beta4-v1\.1\.yml/);
  assert.match(wrapper,/mode: \$\{\{ contains\(github\.event\.head_commit\.message, '\[lan2-candidate\]'\) && 'full' \|\| 'qa' \}\}/);
  assert.doesNotMatch(wrapper,/secrets:|write/);
  const old=read('.github/workflows/setup-v3.yml');
  assert.match(old,/branches: \[codex\/windows-installer-v1\.1\]/);
});
