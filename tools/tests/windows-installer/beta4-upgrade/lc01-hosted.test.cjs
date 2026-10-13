'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {generate,once}=require('./prepare-lc01-hosted.cjs');
const report=require('./lc01-hosted-report.cjs');
const identityApi=require('../../../windows-installer/beta2-identity/index.cjs');
const repo=path.resolve(__dirname,'../../../..');
const out=fs.mkdtempSync(path.join(repo,'.test-work/lc01-hosted-tests-'));
const generated=path.join(out,'generated');generate(generated);
const go=fs.readFileSync(path.join(generated,'hosted_windows_test.go'),'utf8');
const ps=fs.readFileSync(path.join(generated,'invoke-lc01.ps1'),'utf8');
const outerPs=fs.readFileSync(path.join(__dirname,'lc01-hosted.ps1'),'utf8');
test('literal replacement preserves dollar quote and anchored test regex',()=>assert.equal(once('xMARKx','MARK',"$' $& -test.run=^TestHostedLC01$'"),"x$' $& -test.run=^TestHostedLC01$'x"));
test('standalone compile package embeds reviewed policy verbatim, no production main',()=>{
 const policy=fs.readFileSync(path.join(repo,'tools/research/lan2-lc01/policy.go'),'utf8').replaceAll('\r\n','\n');
 assert.ok(go.includes(policy.slice(policy.indexOf('const lcBusyText'))));
 assert.equal((go.match(/func TestHostedLC01\(/g)||[]).length,1);assert.equal(go.includes('func main()'),false);
 const adapter=fs.readFileSync(path.join(__dirname,'second-launcher-windows.go.in'),'utf8').replaceAll('\r\n','\n');
 assert.ok(go.includes(adapter.slice(adapter.indexOf('type lcPinned'))));
 assert.equal(/20\s*\*\s*time.Second/.test(go),false);assert.ok(go.includes('const lcSecondBudget = 30 * time.Second'));
 assert.equal((go.match(/w.Now\(\) >= lcSecondBudget/g)||[]).length,5);
});
test('reused F3 identity install source has one lifecycle injection and no PID force',()=>{
 for(const s of ['actions/artifacts/10907910968/zip','actions/runs/36246132535','Clear-ChildAuthenticationEnvironment','EXACT_F3_ANCHORS_FAILED','Wait-UninstallerCleanup'])assert.ok(ps.includes(s));
 assert.equal(ps.includes('Stop-Process'),false);assert.equal(ps.includes('-Wait -PassThru'),false);
 assert.ok(ps.indexOf("Invoke-Node @('collect'")<ps.indexOf("Set-TaskPhase 'LC01_LIFECYCLE'"));
 assert.ok(ps.indexOf("Set-TaskPhase 'LC01_LIFECYCLE'")<ps.indexOf("Set-TaskPhase 'RETENTION_PROBE'"));
 assert.ok(ps.includes("'-test.run=^TestHostedLC01$'"));
 assert.equal(ps.includes('beta.4'),false);assert.equal(ps.includes('Disable-NetAdapter'),false);
});
test('upload is exactly one validated JSON, push requires trigger path/marker and first attempt',()=>{
 const workflow=fs.readFileSync(path.join(repo,'.github/workflows/lc01-hosted.yml'),'utf8');
 assert.ok(workflow.includes('HOSTED-TRIGGER.json'));assert.ok(workflow.includes("contains(github.event.head_commit.message, '[lc01-hosted]')"));assert.ok(workflow.includes('github.run_attempt == 1'));
 assert.equal((workflow.match(/path: \$\{\{ runner.temp \}\}\/lc01-evidence\/LC01-HOSTED-REPORT.json/g)||[]).length,1);
 assert.equal(workflow.includes('workflow_dispatch'),false);
 const uses=[...workflow.matchAll(/uses: ([^\s]+)/g)].map(m=>m[1]);assert.equal(uses.length,3);
 for(const value of uses)assert.match(value,/^actions\/[a-z-]+@[a-f0-9]{40}$/);
 for(const name of fs.readdirSync(path.join(repo,'.github/workflows')).filter(n=>n.endsWith('.yml')&&n!=='lc01-hosted.yml')){
  const text=fs.readFileSync(path.join(repo,'.github/workflows',name),'utf8').replaceAll('\r\n','\n');
  const push=text.match(/\n  push:\r?\n([\s\S]*?)(?=\n(?:  [a-z_]+:|[a-z]+:))/)?.[1];
  if(push?.includes('codex/lan2-manual-host-v1.1'))checkApprovedOtherPush(name,text);
 }
 assert.ok(workflow.includes("!contains(github.event.head_commit.message, '[lan2-candidate]')"));
 assert.ok(workflow.includes("!contains(github.event.head_commit.message, '[lan2-final-qa]')"));
 const fixture="name: LAN2 final acceptance marker\r\non:\r\n  push:\r\n    branches: [codex/lan2-manual-host-v1.1]\r\n    paths:\r\n      - docs/tasks/windows-installer-v1.1/batch-lan-2/LAN2-FINAL-TRIGGER.md\r\npermissions:\r\n  contents: read\r\n  actions: read\r\nconcurrency:\r\n  group: lan2-final-acceptance-${{ github.ref }}\r\n  cancel-in-progress: false\r\njobs:\r\n  approved-once:\r\n    if: >-\r\n      github.repository == 'KG718718/spxt-public' &&\r\n      github.ref == 'refs/heads/codex/lan2-manual-host-v1.1' &&\r\n      github.run_attempt == 1 &&\r\n      ((contains(github.event.head_commit.message, '[lan2-candidate]') &&\r\n        !contains(github.event.head_commit.message, '[lan2-final-qa]')) ||\r\n       (contains(github.event.head_commit.message, '[lan2-final-qa]') &&\r\n        !contains(github.event.head_commit.message, '[lan2-candidate]')))\r\n    permissions:\r\n      contents: read\r\n      actions: read\r\n    uses: ./.github/workflows/lan2-beta4-v1.1.yml\r\n    with:\r\n      mode: ${{ contains(github.event.head_commit.message, '[lan2-candidate]') && 'full' || 'qa' }}\r\n";
 checkApprovedOtherPush('lan2-final-acceptance.yml',fixture);
 const crlf=fixture.replaceAll('\r\n','\n').replaceAll('\n','\r\n');
 assert.ok(crlf.includes('\r\n  push:\r\n'));
 checkApprovedOtherPush('lan2-final-acceptance.yml',crlf);
 assert.throws(()=>checkApprovedOtherPush('unknown.yml',crlf));
 assert.throws(()=>checkApprovedOtherPush('lan2-final-acceptance.yml',crlf.replace('batch-lan-2/LAN2-FINAL-TRIGGER.md','lan2-lc01/HOSTED-TRIGGER.json')));
 assert.throws(()=>checkApprovedOtherPush('unknown.yml',fixture));
 assert.throws(()=>checkApprovedOtherPush('lan2-final-acceptance.yml',fixture.replace('batch-lan-2/LAN2-FINAL-TRIGGER.md','lan2-lc01/HOSTED-TRIGGER.json')));
});
function checkApprovedOtherPush(name,text){
 text=text.replaceAll('\r\n','\n');
 assert.equal(name,'lan2-final-acceptance.yml');
 const push=text.match(/\n  push:\n([\s\S]*?)\npermissions:/)?.[1];assert.ok(push);
 assert.match(push,/^    branches: \[codex\/lan2-manual-host-v1.1\]\r?\n    paths:\r?\n      - ['"]?docs\/tasks\/windows-installer-v1.1\/batch-lan-2\/LAN2-FINAL-TRIGGER.md['"]?\s*$/);
 assert.equal(text.includes('[lc01-hosted]'),false);
 for(const marker of ['[lan2-candidate]','[lan2-final-qa]'])assert.ok(text.includes("contains(github.event.head_commit.message, '"+marker+"')"));
 assert.ok(text.includes('uses: ./.github/workflows/lan2-beta4-v1.1.yml'));
}
function passing(pathValue='DISPATCH_SUCCESS'){
 const v=report.base('a'.repeat(40),'PASS','FINALIZE','VERIFIED_PASS');
 const expected=require('../../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/accepted-f3-beta2-identity.json').profile.policy;
 const fields=['programManifestSha256','programInventorySha256','runtimeManifestSha256','launcherSha256','buildInfoSha256'];
 v.identity={status:'PASS',inventoryFiles:1042,nodeSha256:'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32',...Object.fromEntries(fields.map(k=>[k,expected[k]]))};
 v.lifecycle={status:'PASS',stage:'FINALIZE',second:{Status:'PASS',Path:pathValue,BusyClosed:pathValue==='INSTANCE_BUSY_REJECTED',NaturalExit:true,CleanupTerminated:false,HandlesClosed:true,ExitCode:pathValue==='INSTANCE_BUSY_REJECTED'?1:0},firstIdentity:true,nodeIdentity:true,exclusiveLock:true,noSecondBackend:true,firstNaturalExit:true,firstExitCode:0,nodeExited:true,quiescence:true,handlesClosed:true,cleanupTerminated:false,modalProof:pathValue==='INSTANCE_BUSY_REJECTED'?'OBSERVED':'NOT_EXERCISED'};
 v.interpreter=proof('a'.repeat(40));v.outer={stage:'IDENTITY',runnerOutcome:'SUCCESS'};v.status='PASS';v.cleanupVerified=true;return v;
}
function proof(commit){return {schema:1,kind:'lc01-powershell-proof',status:'PASS',testedCommit:commit,source:{repository:identityApi.REPOSITORY,runId:identityApi.RUN_ID,artifactId:identityApi.ARTIFACT_ID,headSha:identityApi.SOURCE_COMMIT},edition:'Core',versionMajor:7,api:'PASS',utf8:'PASS',signature:'PASS',reparse:false};}
function progress(commit,stage){return {schema:1,kind:'lc01-inner-progress',testedCommit:commit,source:{repository:identityApi.REPOSITORY,runId:identityApi.RUN_ID,artifactId:identityApi.ARTIFACT_ID,headSha:identityApi.SOURCE_COMMIT},stage,reason:'ENTERED_'+stage};}
function classifiedDir(name,{withProof=true,run,entered}={}){const dir=path.join(out,name);fs.mkdirSync(dir);if(withProof)fs.writeFileSync(path.join(dir,'LC01-POWERSHELL-PROOF.json'),JSON.stringify(proof('a'.repeat(40))));if(run)fs.writeFileSync(path.join(dir,'BETA2-IDENTITY-REPORT.json'),JSON.stringify(run));if(entered)fs.writeFileSync(path.join(dir,'LC01-INNER-PROGRESS.json'),JSON.stringify(entered));return dir;}
test('only both observed natural success paths accepted; physical gates stay false',()=>{
 report.validate(passing());report.validate(passing('INSTANCE_BUSY_REJECTED'));report.validate(report.base('a'.repeat(40)));
});
test('sensitive arbitrary fields/text/paths/PIDs/env cannot be uploaded',()=>{
 for(const k of ['pid','path','windowText','env','stdout','secret']){const v=passing();v.lifecycle[k]='sensitive';assert.throws(()=>report.validate(v));}
 for(const mutate of [v=>v.f3.setupSha256='C:\\private',v=>v.lifecycle.second.Path='window body',v=>v.lifecycle.modalProof='headless assumed',v=>v.identity.launcherSha256='0'.repeat(64)]){const v=passing();mutate(v);assert.throws(()=>report.validate(v));}
});
test('cleanup, natural exit, no backend/lock, quiescence, unknown modal fail closed',()=>{
 for(const mutate of [v=>v.lifecycle.cleanupTerminated=true,v=>v.lifecycle.second.CleanupTerminated=true,v=>v.lifecycle.second.NaturalExit=false,
 v=>v.lifecycle.noSecondBackend=false,v=>v.lifecycle.exclusiveLock=false,v=>v.lifecycle.quiescence=false,v=>v.lifecycle.handlesClosed=false,
 v=>v.lifecycle.firstNaturalExit=false,v=>v.lifecycle.firstExitCode=97,v=>v.lifecycle.nodeExited=false,v=>v.lifecycle.modalProof='UNPROVEN',v=>v.cleanupVerified=false]){
  const v=passing();mutate(v);assert.throws(()=>report.validate(v));
 }
});
test('failure/unknown cannot be relabeled PASS without installed identity/lifecycle/cleanup',()=>{
 const v=report.base('a'.repeat(40));v.status='PASS';assert.throws(()=>report.validate(v));
 const dir=path.join(out,'failure');fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'lifecycle-fixed.json'),JSON.stringify({pid:123,windowText:'private'}));
 const emitted=report.publish(dir,'a'.repeat(40),'IDENTITY','FAIL','NOT_STARTED');assert.equal(emitted.status,'FAIL');assert.equal(emitted.lifecycle,null);assert.equal(emitted.cleanupVerified,false);assert.equal(emitted.inner.classification,'NOT_STARTED');
 report.validate(JSON.parse(fs.readFileSync(path.join(dir,'LC01-HOSTED-REPORT.json'))));
 assert.equal(report.publish(dir,'a'.repeat(40),'IDENTITY','FAIL','NOT_STARTED').status,'FAIL');
 assert.throws(()=>report.publish(dir,'a'.repeat(40),'IDENTITY','UNKNOWN','NOT_STARTED'));
});
test('trusted interpreter contract uses exact arguments and preserves K plus UTF-8 without installation',()=>{
 const bundled=process.env.LC01_TEST_PWSH;assert.ok(bundled&&path.isAbsolute(bundled)&&fs.existsSync(bundled),'LC01_TEST_PWSH must name an existing absolute no-install PowerShell test executor');
 for(const token of ["GetFolderPath('ProgramFiles')",'Get-AuthenticodeSignature','ReparsePoint',"PSEdition -cne 'Core'",'PSVersion.Major -lt 7','IsPathFullyQualified',"LC01_CORE_API_UTF8_K⁺",'Confirm-LC01ProbeOutput'])assert.ok(outerPs.includes(token));
 const capability=spawnSync(bundled,['-NoProfile','-NonInteractive','-Command',"if($PSVersionTable.PSEdition -cne 'Core' -or $PSVersionTable.PSVersion.Major -lt 7 -or ![IO.Path]::IsPathFullyQualified('C:\\LC01')){exit 41};[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);[Console]::Write('BUNDLED_TEST_ONLY_K⁺')"],{encoding:'utf8'});assert.equal(capability.status,0,capability.stderr);assert.equal(capability.stdout,'BUNDLED_TEST_ONLY_K⁺');
 const stub=path.join(out,'child-stub.cjs'),stdout=path.join(out,'stub.stdout'),fixture=path.join(out,'trust-ok.json');
 fs.writeFileSync(stub,"'use strict';const a=require('node:assert/strict');a.deepEqual(process.argv.slice(2),['-NoProfile','-NonInteractive','-File','C:\\\\K⁺-SESSION\\\\invoke-lc01.ps1','-RepositoryRoot','C:\\\\repo','-OutputDirectory','C:\\\\out','-TestedCommit','"+'a'.repeat(40)+"','-LifecycleExe','C:\\\\build\\\\lc01.test.exe']);process.stdout.write('ARGUMENT_UTF8_K⁺');");
 fs.writeFileSync(fixture,JSON.stringify({candidate:'C:/Program Files/PowerShell/7/pwsh.exe',expected:'C:/Program Files/PowerShell/7/pwsh.exe',hasReparse:false,signatureStatus:'Valid',signer:'CN=PowerShell, O=Microsoft Corporation, C=US'}));
 const actual=spawnSync(bundled,['-NoProfile','-NonInteractive','-File',path.join(__dirname,'lc01-hosted.ps1'),'-TestedCommit','a'.repeat(40),'-ContractStub','-StubNode',process.execPath,'-StubScript',stub,'-StubOutput',stdout,'-TrustFixture',fixture],{encoding:'utf8'});
 assert.equal(actual.status,0,actual.stderr);assert.equal(fs.readFileSync(stdout,'utf8'),'ARGUMENT_UTF8_K⁺');
 const bad=path.join(out,'trust-bad.json');fs.writeFileSync(bad,JSON.stringify({candidate:'C:/synthetic-cache/pwsh.exe',expected:'C:/Program Files/PowerShell/7/pwsh.exe',hasReparse:false,signatureStatus:'Valid',signer:'CN=PowerShell, O=Microsoft Corporation, C=US'}));
 const rejected=spawnSync(bundled,['-NoProfile','-NonInteractive','-File',path.join(__dirname,'lc01-hosted.ps1'),'-TestedCommit','a'.repeat(40),'-ContractStub','-StubNode',process.execPath,'-StubScript',stub,'-StubOutput',stdout+'.bad','-TrustFixture',bad],{encoding:'utf8'});assert.notEqual(rejected.status,0);
 const badTrust=path.join(out,'trust-reparse-signature-bad.json');fs.writeFileSync(badTrust,JSON.stringify({candidate:'C:/Program Files/PowerShell/7/pwsh.exe',expected:'C:/Program Files/PowerShell/7/pwsh.exe',hasReparse:true,signatureStatus:'NotSigned',signer:'CN=Unknown'}));
 const trustRejected=spawnSync(bundled,['-NoProfile','-NonInteractive','-File',path.join(__dirname,'lc01-hosted.ps1'),'-TestedCommit','a'.repeat(40),'-ContractStub','-StubNode',process.execPath,'-StubScript',stub,'-StubOutput',stdout+'.trustbad','-TrustFixture',badTrust],{encoding:'utf8'});assert.notEqual(trustRejected.status,0);
});
test('outer state and inner classifications preserve not-started, missing and initial placeholder',()=>{
 const commit='a'.repeat(40),notStarted=report.publish(classifiedDir('not-started',{withProof:false}),commit,'TOOLCHAIN','FAIL','NOT_STARTED');assert.equal(notStarted.inner.classification,'NOT_STARTED');assert.equal(notStarted.reason,'CHILD_NOT_STARTED');assert.deepEqual(notStarted.outer,{stage:'TOOLCHAIN',runnerOutcome:'FAIL'});
 const envStopped=report.publish(classifiedDir('env-not-started',{withProof:false}),commit,'ENV','FAIL','NOT_STARTED');assert.equal(envStopped.reason,'CHILD_NOT_STARTED');
 const trustStopped=report.publish(classifiedDir('trust-not-started',{withProof:false}),commit,'IDENTITY','FAIL','NOT_STARTED','POWERSHELL_TRUST_REJECTED');assert.equal(trustStopped.reason,'POWERSHELL_TRUST_REJECTED');
 assert.throws(()=>report.publish(classifiedDir('private-parent-reason',{withProof:false}),commit,'ENV','FAIL','NOT_STARTED','PRIVATE_REASON'));
 const missing=report.publish(classifiedDir('missing'),commit,'IDENTITY','FAIL','STARTED');assert.equal(missing.inner.classification,'REPORT_MISSING');assert.deepEqual(missing.outer,{stage:'IDENTITY',runnerOutcome:'FAIL'});
 const initial=identityApi.createRunReport('BLOCKED','HOSTED_PREFLIGHT',commit);assert.equal(report.publish(classifiedDir('placeholder',{run:initial}),commit,'IDENTITY','FAIL','STARTED').inner.classification,'INITIAL_PLACEHOLDER');
});
test('every identity BLOCKED stage is retained with fixed stage and reason',()=>{
 const commit='a'.repeat(40),match=ps.match(/\$taskAllowedPhases=@\(([\s\S]*?)\)\n/);assert.ok(match);const stages=[...match[1].matchAll(/'([A-Z0-9_]+)'/g)].map(m=>m[1]).filter(s=>!s.startsWith('LC01_'));assert.ok(stages.length>30);
 for(const stage of stages){const run=identityApi.createRunReport('BLOCKED',stage,commit);const emitted=report.publish(classifiedDir('blocked-'+stage,{run,entered:progress(commit,stage)}),commit,'IDENTITY','FAIL','STARTED');assert.equal(emitted.inner.classification,'VERIFIED_BLOCKED');assert.equal(emitted.stage,stage);assert.equal(emitted.reason,'BLOCKED_'+stage);}
});
test('invalid report, commit/F3 mismatch and sensitive fields fail closed',()=>{
 const commit='a'.repeat(40),valid=identityApi.createRunReport('BLOCKED','API_METADATA',commit);
 const extra={...valid,token:'secret'};assert.equal(report.publish(classifiedDir('invalid-extra',{run:extra,entered:progress(commit,'API_METADATA')}),commit,'IDENTITY','FAIL','STARTED').inner.classification,'REPORT_INVALID');
 const mismatch=identityApi.createRunReport('BLOCKED','API_METADATA','b'.repeat(40));assert.equal(report.publish(classifiedDir('invalid-commit',{run:mismatch,entered:progress(commit,'API_METADATA')}),commit,'IDENTITY','FAIL','STARTED').inner.classification,'REPORT_INVALID');
 const badProgress=progress(commit,'API_METADATA');badProgress.source.artifactId=1;assert.equal(report.publish(classifiedDir('invalid-f3',{run:valid,entered:badProgress}),commit,'IDENTITY','FAIL','STARTED').inner.classification,'REPORT_INVALID');
 const leaked=report.base(commit);leaked.inner.path='C:/secret';assert.throws(()=>report.validate(leaked));
 const encoded=report.base(commit);encoded.inner.reason='PRIVATE_TOKEN_VALUE';encoded.reason='PRIVATE_TOKEN_VALUE';assert.throws(()=>report.validate(encoded));
 const badReason=progress(commit,'API_METADATA');badReason.reason='ENTERED_API_METADATA_SECRET';assert.equal(report.publish(classifiedDir('invalid-reason',{run:valid,entered:badReason}),commit,'IDENTITY','FAIL','STARTED').inner.classification,'REPORT_INVALID');
});
test('lifecycle and identity failures remain distinct and outer mismatch cannot pass',()=>{
 const commit='a'.repeat(40),run=identityApi.createRunReport('BLOCKED','COLLECT',commit);
 const missingIdentity=report.publish(classifiedDir('identity-failed',{run,entered:progress(commit,'LC01_IDENTITY_VALIDATION')}),commit,'IDENTITY','FAIL','STARTED');assert.equal(missingIdentity.inner.classification,'IDENTITY_VALIDATION_FAILED');
 const identityOk=classifiedDir('lifecycle-failed',{run,entered:progress(commit,'LC01_LIFECYCLE')});fs.writeFileSync(path.join(identityOk,'identity-fixed.json'),JSON.stringify(passing().identity));const lifecycleFailed=report.publish(identityOk,commit,'IDENTITY','FAIL','STARTED');assert.equal(lifecycleFailed.inner.classification,'LIFECYCLE_FAILED');assert.deepEqual(lifecycleFailed.identity,passing().identity);
 const inconsistent=passing();inconsistent.inner={classification:'UNKNOWN',stage:'FINALIZE',reason:'INNER_OUTER_INCONSISTENT'};inconsistent.reason='INNER_OUTER_INCONSISTENT';assert.throws(()=>report.validate(inconsistent));
 assert.throws(()=>report.publish(classifiedDir('outer-stage-mismatch'),commit,'TOOLCHAIN','FAIL','STARTED'));
 const staleRun=identityApi.createRunReport('PASS','FINALIZE',commit),stale=report.publish(classifiedDir('stale-final-progress',{run:staleRun,entered:progress(commit,'INSTALL')}),commit,'IDENTITY','SUCCESS','STARTED');assert.equal(stale.status,'FAIL');assert.equal(stale.inner.classification,'UNKNOWN');assert.equal(stale.reason,'INNER_STAGE_INCONSISTENT');
});
test('legacy schema one report remains readable with its original meaning',()=>{
 const current=passing(),legacy={schema:1,kind:'lc01-hosted',status:current.status,stage:current.stage,testedCommit:current.testedCommit,f3:current.f3,identity:current.identity,lifecycle:current.lifecycle,cleanupVerified:current.cleanupVerified,physicalWin10Certified:false,dualDeviceLanCertified:false};assert.equal(report.validate(legacy),legacy);
});
test('initializer is explicitly unfinalized rather than post-hoc child attribution',()=>{
 const dir=path.join(out,'initializer');fs.mkdirSync(dir);const cli=spawnSync(process.execPath,[path.join(__dirname,'lc01-hosted-report.cjs'),'initialize',path.join(dir,'LC01-HOSTED-REPORT.json'),'a'.repeat(40)],{encoding:'utf8'});assert.equal(cli.status,0,cli.stderr);const initial=JSON.parse(fs.readFileSync(path.join(dir,'LC01-HOSTED-REPORT.json')));assert.equal(initial.inner.classification,'UNKNOWN');assert.equal(initial.reason,'INITIAL_REPORT_UNFINALIZED');assert.deepEqual(initial.outer,{stage:'ENV',runnerOutcome:'FAIL'});
});
