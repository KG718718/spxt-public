'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const report=require('../report.cjs'),recovery=require('./recovery.cjs');
function enter(input,context){
 assert.equal(context.reportSchema,2);
 const r=structuredClone(report.validate(input,{reportSchema:2,sourceCommit:context.sourceCommit,controlCommit:context.controlCommit,run:context.run,mode:context.mode,...(context.mode==='QA'?{candidate:context.candidate}:{})}));
 r.status='FAIL';r.stage='ENV';r.reason='DEPENDENCY_UNPROVEN';return r;
}
function finish(input,context,evidence,buildDiagnostic){
 assert.deepEqual(Object.keys(evidence).sort(),['environmentRestored','productPhaseStarted','recovery']);
 assert.equal(context.reportSchema,2);assert.equal(typeof evidence.environmentRestored,'boolean');assert.equal(typeof evidence.productPhaseStarted,'boolean');recovery.validate(evidence.recovery);
 const expected={reportSchema:2,sourceCommit:context.sourceCommit,controlCommit:context.controlCommit,run:context.run,mode:context.mode,...(context.mode==='QA'?{candidate:context.candidate}:{})};
 let r;try{r=structuredClone(report.validate(input,expected));}catch{r=Object.hasOwn(context,'installCandidate')?require('../../../windows-installer/fresh-trial/install-candidate/bootstrap.cjs').initialReport(context):report.initial(context.sourceCommit,context.mode,context.candidate,context.controlCommit,context.run,2);r.reason='REPORT_INVALID';}
 if(buildDiagnostic!==undefined){try{r.buildDiagnostic=require('../build-diagnostic.cjs').validate(buildDiagnostic);}catch{r.status='FAIL';r.reason='REPORT_INVALID';}}
 r.recovery=structuredClone(evidence.recovery);
 const restored=k=>recovery.RESTORED.includes(r.recovery[k]);
 r.cleanup.environmentRestored=evidence.environmentRestored;
 r.cleanup.ownedToolchainAbsent=restored('compilerOwnedFiles')&&restored('compilerSettings');
 r.cleanup.ownedRulesAbsent=restored('rules');
 r.cleanup.ownedRegistrationAbsent=restored('productRegistration');
 r.cleanup.ownedShortcutsAbsent=['startup','desktop','programs'].every(restored);
 if(!evidence.productPhaseStarted)for(const k of ['ownedLauncherExited','ownedNodeExited','handlesClosed','lockReleased'])r.cleanup[k]=true;
 const complete=recovery.restored(r.recovery)&&evidence.environmentRestored&&Object.entries(r.cleanup).every(([k,v])=>v===true||(k==='ownedDriveRestored'&&v===null));
 if(!complete){r.status='FAIL';r.reason='CLEANUP_UNPROVEN';if(r.stage==='COMPLETE')r.stage='F09';}
 const buildOnly=context.r1?.mode==='SMOKE'&&context.r1?.slot==='R1S1'&&!evidence.productPhaseStarted&&r.checks.length===0&&r.buildDiagnostic.stage==='COMPLETE'&&r.buildDiagnostic.classification==='PASS';
 report.validate(r,expected);return {report:r,canFinalize:complete&&r.reason!=='REPORT_INVALID'&&(buildOnly||(evidence.productPhaseStarted&&r.checks.length===9&&r.checks.every(c=>c.pass)))};
}
module.exports={finish,enter};
if(require.main===module){try{
 const env=process.argv[2]==='ENV',work=process.argv[env?3:2],context=JSON.parse(fs.readFileSync(path.join(work,'context.json')));let input=null;try{input=JSON.parse(fs.readFileSync(path.join(work,'fresh-report.json')))}catch{}
 if(env){fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(enter(input,context))+'\n');process.exitCode=0;return;}
 const diagnostic=path.join(work,'build-diagnostic.json');let buildDiagnostic;if(fs.existsSync(diagnostic)){try{assert.ok(fs.statSync(diagnostic).size<=256*1024);buildDiagnostic=JSON.parse(fs.readFileSync(diagnostic));}catch{buildDiagnostic=null;}}
 const result=finish(input,context,JSON.parse(fs.readFileSync(0,'utf8')),buildDiagnostic);
 fs.writeFileSync(path.join(work,'fresh-report.json'),JSON.stringify(result.report)+'\n');
 if(!result.canFinalize)process.exitCode=1;
}catch{process.stderr.write('FRESH_RECOVERY_FINAL_INVALID\n');process.exitCode=1;}}
