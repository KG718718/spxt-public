'use strict';
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),g=require('../../../tests/fresh-lan-trial/ab/contract.cjs'),report=require('../../../tests/fresh-lan-trial/ab/report.cjs');
function main(mode,work,publish,driveRestored,outerFailure='false'){
 a.ok(['CHECK','FINAL'].includes(mode));a.ok(['true','false'].includes(driveRestored));a.ok(['true','false'].includes(outerFailure));const c=g.context(JSON.parse(fs.readFileSync(path.join(work,'context.json')))),r=report.validate(JSON.parse(fs.readFileSync(path.join(work,'fresh-report.json'))),c);
 if(mode==='CHECK'){a.equal(c.installSplit.role,process.env.KSESSION_FRESH_INSTALL_ROLE);return;}
 let diagnostic=null;try{diagnostic=JSON.parse(fs.readFileSync(path.join(publish,'supervisor-entry-private.json')));}catch{}
 const final=report.finalize(r,c,diagnostic,driveRestored==='true',outerFailure==='true');fs.mkdirSync(path.join(publish,'evidence'),{recursive:true});fs.writeFileSync(path.join(publish,'fresh-report.json'),JSON.stringify(final)+'\n');fs.writeFileSync(path.join(publish,'evidence/fresh-report.json'),JSON.stringify(final)+'\n');
 if(final.status==='PART_PASS_NOT_CANDIDATE'&&final.role==='A'){
  try{const dir=path.join(publish,'artifact'),info=JSON.parse(fs.readFileSync(path.join(dir,'build-info.json')));const expected={sourceCommit:c.sourceCommit,sourceTree:c.ab.sourceTree,controlCommit:c.controlCommit,runId:c.run.id,aJobId:c.ab.jobId,setupSha256:final.setupSha256,manifestSha256:c.ab.manifestSha256};a.equal(info.sourceTree,expected.sourceTree);a.equal(info.sourceTree,g.gitAt(path.resolve(__dirname,'../../../..'))('rev-parse',c.sourceCommit+'^{tree}'));require('../../../tests/fresh-lan-trial/ab/transfer.cjs').pack(dir,path.join(publish,'transfer'),expected);fs.appendFileSync(process.env.GITHUB_OUTPUT,'setupSha256='+expected.setupSha256+'\nmanifestSha256='+expected.manifestSha256+'\ntransferReady=true\n');}catch{final.status='FAIL';final.stage='F09';final.reason='GATE_FAILED';final.firstFailure={stage:'F09',classification:'TRANSFER_IDENTITY_CHANGED'};report.validate(final,c);fs.writeFileSync(path.join(publish,'fresh-report.json'),JSON.stringify(final)+'\n');fs.writeFileSync(path.join(publish,'evidence/fresh-report.json'),JSON.stringify(final)+'\n');throw Error('TRANSFER_REJECTED');}
 }
 if(final.status!=='PART_PASS_NOT_CANDIDATE')process.exitCode=1;
}
module.exports={main};if(require.main===module){try{main(...process.argv.slice(2));}catch{process.stderr.write('AB_FINAL_REPORT_INVALID\n');process.exitCode=1;}}
