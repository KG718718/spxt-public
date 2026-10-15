'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {sha}=require('../../windows-runtime/common.cjs');
const report=require('../../tests/fresh-lan-trial/report.cjs');
const {validate:policy}=require('../../tests/fresh-lan-trial/build-policy.cjs');
const {prepare}=require('../../tests/fresh-lan-trial/prepare-overlay.cjs');
const {prepare:policyOverlay}=require('../../tests/fresh-lan-trial/prepare-policy-overlay.cjs');
const {run}=require('../../tests/fresh-lan-trial/pipeline.cjs');
const {NAME,inspect,verify}=require('./verify-artifact.cjs');
async function main(){
 const [repo,work,node,go]=process.argv.slice(2);assert.equal(process.argv.slice(2).length,4);assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.GITHUB_REPOSITORY,'KG718718/spxt-public');
 const context=JSON.parse(fs.readFileSync(path.join(work,'context.json')));assert.equal(context.controlCommit,process.env.GITHUB_SHA);assert.equal(context.sourceCommit,process.env.KSESSION_FRESH_TESTED_SOURCE);
 const checked=cp.execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();assert.equal(checked,context.sourceCommit);
 const artifact=path.join(work,'artifact'),setup=path.join(artifact,NAME),setupHash=sha(fs.readFileSync(setup));
 if(context.mode==='QA'){
  const metadata=JSON.parse(fs.readFileSync(path.join(work,'candidate-metadata.json')));
  const original=JSON.parse(fs.readFileSync(path.join(artifact,'fresh-report.json')));
  verify(artifact,{sourceCommit:context.sourceCommit,mode:'CANDIDATE',controlCommit:metadata.controlCommit,run:{id:context.candidate.runId,attempt:1}});assert.equal(setupHash,context.candidate.setupSha256);assert.equal(original.setupSha256,setupHash);
 }
 const writer=async r=>fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(r)+'\n');
 const physical=process.env.KSESSION_FRESH_PHYSICAL_WORK;assert.ok(physical&&path.isAbsolute(physical));
 const evidence=path.join(physical,'installed-core');let core=null,socket=null,firewall=null,coreExit=null;
 const baseEnv={...process.env,KSESSION_FRESH_EVIDENCE:evidence,KSESSION_FRESH_SETUP:setup,KSESSION_FRESH_TEST_NODE:node,KSESSION_FRESH_REPO:repo,KSESSION_FRESH_TESTED_SOURCE:context.sourceCommit};
 function command(exe,args,cwd=repo,env=baseEnv){const p=cp.spawnSync(exe,args,{cwd,env,windowsHide:true,encoding:'utf8',timeout:25*60*1000,maxBuffer:32*1024*1024});return p;}
 const fail=()=>{const e=Error('fixed gate');e.fixedStage=report.IDS.includes(core?.stage)?core.stage:'F09';e.fixedReason=core?.reason==='CLEANUP_UNPROVEN'?'CLEANUP_UNPROVEN':'GATE_FAILED';throw e;};
 function coreWitness(id){const witnesses=Object.fromEntries(report.WITNESSES[id].map(k=>[k,core?.checks?.[k]===true]));if(Object.values(witnesses).some(v=>v!==true))fail();return witnesses;}
 function readCore(){
  const r=JSON.parse(fs.readFileSync(path.join(evidence,'installed-core.json')));
  require('../../tests/fresh-lan-trial/observations.cjs').core(r,context.sourceCommit);
  assert.deepEqual(Object.keys(r).sort(),['schema','kind','sourceCommit','status','stage','reason','checks','cleanup','fixturesClean','setupDiagnostics'].sort());assert.equal(r.schema,1);assert.equal(r.kind,'FRESH_INSTALLED_CORE');assert.equal(r.sourceCommit,context.sourceCommit);assert.ok(['PASS','FAIL'].includes(r.status));assert.ok([...report.IDS,'COMPLETE'].includes(r.stage));assert.ok(['PASS','GATE_FAILED','CLEANUP_UNPROVEN'].includes(r.reason));assert.equal(typeof r.fixturesClean,'boolean');
  const allowed=[...report.WITNESSES.F01,...report.WITNESSES.F02,...report.WITNESSES.F03,...report.WITNESSES.F05,...report.WITNESSES.F06];for(const [k,v]of Object.entries(r.checks)){assert.ok(allowed.includes(k));assert.equal(typeof v,'boolean');}
  assert.deepEqual(Object.keys(r.cleanup).sort(),['ownedLauncherExited','ownedNodeExited','handlesClosed','lockReleased','ownedRegistrationAbsent','ownedShortcutsAbsent'].sort());for(const v of Object.values(r.cleanup))assert.ok(v===null||typeof v==='boolean');for(const d of r.setupDiagnostics)require('../../tests/fresh-lan-trial/setup-diagnostic.cjs').validate(d);core=r;
 }
 const phases={
  F01:async()=>{const overlay=prepare(path.join(work,'installed-overlay'));const p=command(go,['test','-overlay',overlay,'-tags','fresh_trial_tests','-count=1','-timeout=15m','-run','^TestFreshInstalledCore$','.'],path.join(repo,'tools/windows-launcher'));coreExit=p.status;readCore();if(p.status!==0||core.status!=='PASS'||!core.fixturesClean)fail();return coreWitness('F01');},
  F02:async()=>coreWitness('F02'),
  F03:async()=>{socket=require('../../tests/fresh-lan-trial/observations.cjs').socket(JSON.parse(fs.readFileSync(path.join(evidence,'isolated-socket.json'))),context.sourceCommit);core.checks.remoteBootstrapRejected=socket.remoteBootstrapRejected;return coreWitness('F03');},
  F04:async()=>{
   const src=fs.readFileSync(path.join(repo,'tools/tests/lan-host/fresh-deployment.test.cjs'),'utf8');const expected=[...src.matchAll(/^test\('([^']+)'/gm)].map(m=>m[1]);assert.equal(expected.length,13);
   const p=command(node,['--test','--test-reporter=tap','--test-concurrency=1','tools/tests/lan-host/fresh-deployment.test.cjs']);assert.equal(p.status,0);assert.deepEqual([...p.stdout.matchAll(/^ok \d+ - (.+)$/gm)].map(m=>m[1]),expected);assert.match(p.stdout,/# fail 0/);assert.match(p.stdout,/# skipped 0/);
   for(const [kind,name]of [['FRESH_FIREWALL_POLICY','FIREWALL'],['FRESH_LAUNCHER_POLICY','LAUNCHER']]){
    const output=path.join(physical,'policy-'+name.toLowerCase());
    const p=command('pwsh',['-NoLogo','-NoProfile','-NonInteractive','-File',path.join(repo,'tools/tests/fresh-lan-trial/run-policy.ps1'),'-Repo',repo,'-Work',output,'-Go',go,'-Node',node,'-Package',name,'-Commit',context.sourceCommit]);assert.equal(p.status,0);
    policy(JSON.parse(fs.readFileSync(path.join(output,'report.json'),'utf8').replace(/^\ufeff/,'')),kind,context.sourceCommit);
   }
   assert.equal(socket.dualListening,true);assert.equal(socket.ownedSocketsClosed,true);return Object.fromEntries(report.WITNESSES.F04.map(k=>[k,true]));
  },
  F05:async()=>coreWitness('F05'),F06:async()=>coreWitness('F06'),
  F07:async()=>{firewall=require('../../tests/fresh-lan-trial/observations.cjs').firewall(JSON.parse(fs.readFileSync(path.join(evidence,'firewall.json'))),context.sourceCommit);assert.equal(firewall.schema,1);assert.equal(firewall.status,'PASS');assert.equal(firewall.productionHelperHostedVirtualRejected,true);assert.equal(firewall.netSecurityPersistentExact,true);assert.equal(firewall.netSecurityActiveStoreExact,true);assert.equal(firewall.testRuleCleanup,true);assert.equal(firewall.realPhysicalLanClaim,false);assert.equal(firewall.globalFirewallProfileChanged,false);assert.equal(firewall.profile,'Private');assert.equal(firewall.remoteScope,'EXACT_RUNNER_PRIVATE_SUBNET');return{helperIdentity:core.checks.helperHash===true,virtualRejected:true,privateNarrowRuleTests:true,ownedRuleRemoved:true};},
  F08:async()=>{
   const env={...baseEnv,GITHUB_SHA:context.sourceCommit};let p;
   const npm=path.join(path.dirname(node),'node_modules/npm/bin/npm-cli.js');p=command(node,[npm,'ci','--logs-max=0','--loglevel=silent','--omit=optional','--ignore-scripts','--no-audit','--no-fund','--cache',path.join(work,'regression-cache')]);assert.equal(p.status,0);
   p=command(node,['tools/tests/fresh-lan-trial/fast-delivery/regression.cjs',repo,physical],repo,env);assert.equal(p.status,0);const r=JSON.parse(fs.readFileSync(path.join(physical,'regression.json')));assert.equal(r.sourceCommit,context.sourceCommit);assert.equal(r.status,'PASS');assert.equal(r.testTotal,742);assert.equal(r.suitePass,26);assert.equal(r.fail,0);assert.equal(r.skipped,0);return Object.fromEntries(report.WITNESSES.F08.map(k=>[k,true]));
  },
  F09:async()=>{assert.equal(sha(fs.readFileSync(setup)),setupHash);const provisional=report.initial(context.sourceCommit,context.mode,context.candidate,context.controlCommit,context.run);fs.writeFileSync(path.join(artifact,'fresh-report.json'),JSON.stringify(provisional)+'\n');const v=inspect(artifact,context.sourceCommit,context.mode==='QA'?context.candidate.setupSha256:undefined);assert.equal(v.setupSha256,setupHash);return Object.fromEntries(report.WITNESSES.F09.map(k=>[k,true]));}
 };
 const r=await run({sourceCommit:context.sourceCommit,controlCommit:context.controlCommit,runIdentity:context.run,mode:context.mode,candidate:context.candidate,setupSha256:setupHash,buildDiagnostic:JSON.parse(fs.readFileSync(path.join(work,'build-diagnostic.json'))),pendingOuter:['ownedToolchainAbsent','ownedDriveRestored','environmentRestored'],completionWrite:async c=>fs.writeFileSync(path.join(work,'completion.json'),JSON.stringify(c)+'\n'),stages:phases,diagnostics:()=>core?.setupDiagnostics||[],write:writer,cleanup:async()=>({ownedLauncherExited:core?.cleanup.ownedLauncherExited??null,ownedNodeExited:core?.cleanup.ownedNodeExited??null,handlesClosed:core?.cleanup.handlesClosed??null,lockReleased:core?.cleanup.lockReleased??null,ownedRulesAbsent:firewall?.testRuleCleanup===true,ownedRegistrationAbsent:core?.cleanup.ownedRegistrationAbsent??null,ownedShortcutsAbsent:core?.cleanup.ownedShortcutsAbsent??null,ownedToolchainAbsent:null,ownedDriveRestored:null,environmentRestored:null})});
 // Outer PS + always finalizer must finish tool/environment/drive restoration.
 if(r.checks.length!==9||coreExit!==0)process.exitCode=1;
}
main().catch(()=>{process.stderr.write('FRESH_TRIAL_HOSTED_GATE_FAILED\n');process.exitCode=1;});
