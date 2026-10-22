'use strict';
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),g=require('../../../tests/fresh-lan-trial/ab/contract.cjs'),report=require('../../../tests/fresh-lan-trial/ab/report.cjs'),artifact=require('../verify-artifact.cjs');
function main(mode,repo,work){
 const contextFile=path.join(work,'context.json'),c=JSON.parse(fs.readFileSync(contextFile));g.boundContext(repo,c,process.env);
 if(mode==='BIND'){
  const dir=path.join(work,'artifact'),info=JSON.parse(fs.readFileSync(path.join(dir,'build-info.json')));a.equal(info.sourceTree,c.ab.sourceTree);if(c.installSplit.role==='A'){const fresh=path.join(dir,'fresh-report.json');a.equal(fs.existsSync(fresh),false);fs.writeFileSync(fresh,JSON.stringify(require('../../../tests/fresh-lan-trial/report.cjs').initial(c.sourceCommit,c.mode,c.candidate,c.controlCommit,c.run,2))+'\n',{flag:'wx'});}const expected=c.installSplit.role==='B'?c.installSplit.setupSha256:undefined;if(c.installSplit.role==='B')a.match(expected,g.SHA);const value=artifact.inspect(dir,c.sourceCommit,expected);if(c.installSplit.setupSha256!==null)a.equal(c.installSplit.setupSha256,value.setupSha256);const manifest=g.sha(fs.readFileSync(path.join(dir,'installer-manifest.json')));if(c.ab.manifestSha256!==null)a.equal(c.ab.manifestSha256,manifest);c.ab.manifestSha256=manifest;c.installSplit.setupSha256=value.setupSha256;fs.writeFileSync(contextFile,JSON.stringify(c)+'\n');process.stdout.write('AB_BUILD_IDENTITY_BOUND');return;
 }
 const file=path.join(work,'fresh-report.json'),r=report.validate(JSON.parse(fs.readFileSync(file)),c);
 if(mode==='ENV'){a.equal(r.stage,'ENV');process.stdout.write('AB_ENV_ENTERED');return;}
 a.equal(mode,'FINISH');const ev=JSON.parse(fs.readFileSync(0,'utf8'));let inner=null;try{inner=JSON.parse(fs.readFileSync(path.join(work,'split-inner.json')));}catch{}let build=r.buildDiagnostic;try{build=JSON.parse(fs.readFileSync(path.join(work,'build-diagnostic.json')));}catch{}
 const result=report.ciFinish(r,c,ev,inner,build);fs.writeFileSync(file,JSON.stringify(result)+'\n');if(result.status!=='OUTER_PENDING')process.exitCode=1;
}
module.exports={main};if(require.main===module){try{main(...process.argv.slice(2));}catch{process.stderr.write('AB_CI_REPORT_OR_BINDING_REJECTED\n');process.exitCode=1;}}
