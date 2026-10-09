'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const {fixedSessionReport,verifySessionReport}=require('../../../windows-installer/beta4-upgrade/session-report.cjs');
const repo=path.resolve(__dirname,'../../../..');
const read=file=>fs.readFileSync(path.join(repo,file),'utf8');

test('beta4 private-session report rejects extra identity, token, network and false success fields',()=>{
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
  assert.match(verifier,/verifySessionReport\(json\('production-sessions-beta4\.json'\),commit\)/);
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
