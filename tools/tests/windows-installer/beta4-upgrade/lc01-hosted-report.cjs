'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const api=require('../../../windows-installer/beta2-identity/index.cjs');
const expected=require('../../../../docs/tasks/windows-installer-v1.1/batch-4.5/evidence/accepted-f3-beta2-identity.json').profile.policy;
const NODE_SHA='ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32';
const ANCHORS=['programManifestSha256','programInventorySha256','runtimeManifestSha256','launcherSha256','buildInfoSha256'];
const paths=new Set(['NOT_RUN','START_FAILED','INVALID_BUDGET','SESSION_GUARD_FAILED','TIMEOUT','WINDOW_IDENTITY_FAILED','DIALOG_MISMATCH','DIALOG_CONFIRM_FAILED','WAIT_FAILED','DISPATCH_SUCCESS','INSTANCE_BUSY_REJECTED','UNEXPECTED_EXIT','CLEANUP_FAILED','CLEANUP_TERMINATED','HANDLE_CLOSE_FAILED']);
const stages=new Set(['ENV','SOURCE','TOOLCHAIN','IDENTITY','FIRST','SECOND','STOP','FINALIZE']);
function keys(v,wanted){assert.ok(v&&typeof v==='object'&&!Array.isArray(v));assert.deepEqual(Object.keys(v).sort(),wanted.slice().sort());}
function identity(draft,root){
 assert.equal(draft.kind,'k-session-beta2-identity-evidence');assert.equal(draft.status,'PASS');
 // Actual API metadata was already validated by reused invoke.ps1; compare actual captured source as well.
 assert.equal(draft.source.runId,api.RUN_ID);assert.equal(draft.source.artifactId,api.ARTIFACT_ID);
 assert.equal(draft.source.headSha,api.SOURCE_COMMIT);assert.equal(draft.source.setupSha256,api.SETUP_SHA256);
 for(const field of ANCHORS)assert.equal(draft.profile.policy[field],expected[field]);
 for(const field of ['sourceCommit','sourceTree','fromInstallerVersion'])assert.equal(draft.profile.policy[field],expected[field]);
 assert.equal(draft.verification.installedAnchors,'PASS');assert.equal(draft.verification.registrationBinding,'PASS');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'uninstall/installer-manifest.json')));
 assert.equal(manifest.payload.length,1042);
 assert.equal(api.sha(fs.readFileSync(path.join(root,'program/runtime/node.exe'))),NODE_SHA);
 return {status:'PASS',inventoryFiles:1042,nodeSha256:NODE_SHA,...Object.fromEntries(ANCHORS.map(k=>[k,draft.profile.policy[k]]))};
}
function lifecycle(v){
 keys(v,['status','stage','second','firstIdentity','nodeIdentity','exclusiveLock','noSecondBackend','firstNaturalExit','firstExitCode','nodeExited','quiescence','handlesClosed','cleanupTerminated','modalProof']);
 assert.ok(['PASS','FAIL'].includes(v.status)&&stages.has(v.stage));
 assert.ok(['OBSERVED','NOT_EXERCISED','UNPROVEN'].includes(v.modalProof));
 for(const k of ['firstIdentity','nodeIdentity','exclusiveLock','noSecondBackend','firstNaturalExit','nodeExited','quiescence','handlesClosed','cleanupTerminated'])assert.equal(typeof v[k],'boolean');
 assert.ok(Number.isInteger(v.firstExitCode)&&v.firstExitCode>=0&&v.firstExitCode<=0xffffffff);
 keys(v.second,['Status','Path','BusyClosed','NaturalExit','CleanupTerminated','HandlesClosed','ExitCode']);
 assert.ok(['PASS','FAIL'].includes(v.second.Status)&&paths.has(v.second.Path));
 for(const k of ['BusyClosed','NaturalExit','CleanupTerminated','HandlesClosed'])assert.equal(typeof v.second[k],'boolean');
 assert.ok(Number.isInteger(v.second.ExitCode)&&v.second.ExitCode>=0&&v.second.ExitCode<=0xffffffff);
 if(v.status==='PASS'){
  assert.equal(v.stage,'FINALIZE');for(const k of ['firstIdentity','nodeIdentity','exclusiveLock','noSecondBackend','firstNaturalExit','nodeExited','quiescence','handlesClosed'])assert.equal(v[k],true);
  assert.equal(v.firstExitCode,0);assert.equal(v.cleanupTerminated,false);assert.equal(v.second.Status,'PASS');assert.equal(v.second.NaturalExit,true);assert.equal(v.second.HandlesClosed,true);assert.equal(v.second.CleanupTerminated,false);
  if(v.second.Path==='DISPATCH_SUCCESS'){assert.equal(v.second.ExitCode,0);assert.equal(v.second.BusyClosed,false);assert.equal(v.modalProof,'NOT_EXERCISED');}
  else{assert.equal(v.second.Path,'INSTANCE_BUSY_REJECTED');assert.equal(v.second.ExitCode,1);assert.equal(v.second.BusyClosed,true);assert.equal(v.modalProof,'OBSERVED');}
 }
 return v;
}
function validate(v){
 keys(v,['schema','kind','status','stage','testedCommit','f3','identity','lifecycle','cleanupVerified','physicalWin10Certified','dualDeviceLanCertified']);
 assert.equal(v.schema,1);assert.equal(v.kind,'lc01-hosted');assert.ok(['PASS','FAIL'].includes(v.status)&&stages.has(v.stage));assert.match(v.testedCommit,/^[a-f0-9]{40}$/);
 keys(v.f3,['runId','artifactId','sourceCommit','setupSha256']);assert.equal(v.f3.runId,api.RUN_ID);assert.equal(v.f3.artifactId,api.ARTIFACT_ID);assert.equal(v.f3.sourceCommit,api.SOURCE_COMMIT);assert.equal(v.f3.setupSha256,api.SETUP_SHA256);
 assert.equal(typeof v.cleanupVerified,'boolean');assert.equal(v.physicalWin10Certified,false);assert.equal(v.dualDeviceLanCertified,false);
 if(v.identity!==null){keys(v.identity,['status','inventoryFiles','nodeSha256',...ANCHORS]);assert.equal(v.identity.status,'PASS');assert.equal(v.identity.inventoryFiles,1042);assert.equal(v.identity.nodeSha256,NODE_SHA);for(const f of ANCHORS)assert.equal(v.identity[f],expected[f]);}
 if(v.lifecycle!==null)lifecycle(v.lifecycle);
 if(v.status==='PASS'){assert.equal(v.stage,'FINALIZE');assert.ok(v.identity&&v.lifecycle);assert.equal(v.lifecycle.status,'PASS');assert.equal(v.cleanupVerified,true);}
 return v;
}
function base(commit,stage='ENV'){return {schema:1,kind:'lc01-hosted',status:'FAIL',stage,testedCommit:commit,f3:{runId:api.RUN_ID,artifactId:api.ARTIFACT_ID,sourceCommit:api.SOURCE_COMMIT,setupSha256:api.SETUP_SHA256},identity:null,lifecycle:null,cleanupVerified:false,physicalWin10Certified:false,dualDeviceLanCertified:false};}
function publish(dir,commit,stage,runnerOutcome='SUCCESS'){
 assert.ok(['SUCCESS','FAIL'].includes(runnerOutcome));
 const v=base(commit,stage);
 try{
  const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  if(fs.existsSync(path.join(dir,'identity-fixed.json')))v.identity=read('identity-fixed.json');
  if(fs.existsSync(path.join(dir,'lifecycle-fixed.json')))v.lifecycle=lifecycle(read('lifecycle-fixed.json'));
  if(fs.existsSync(path.join(dir,'beta2-identity-evidence.json'))){api.validateEvidence(read('beta2-identity-evidence.json'));const run=api.validateRunReport(read('BETA2-IDENTITY-REPORT.json'));v.cleanupVerified=run.status==='PASS';}
  if(runnerOutcome==='SUCCESS'&&v.identity&&v.lifecycle?.status==='PASS'&&v.cleanupVerified){v.status='PASS';v.stage='FINALIZE';}
  validate(v);
 }catch{Object.assign(v,base(commit,stage));}
 validate(v);fs.writeFileSync(path.join(dir,'LC01-HOSTED-REPORT.json'),JSON.stringify(v,null,2)+'\n');return v;
}
module.exports={identity,lifecycle,validate,base,publish};
if(require.main===module){try{
 const [command,...args]=process.argv.slice(2);
 if(command==='identity'){assert.equal(args.length,3);fs.writeFileSync(args[2],JSON.stringify(identity(JSON.parse(fs.readFileSync(args[0])),args[1]))+'\n',{flag:'wx'});}
 else if(command==='publish'){assert.equal(args.length,4);const v=publish(...args);if(v.status!=='PASS')process.exitCode=1;}
 else if(command==='verify'){assert.equal(args.length,1);validate(JSON.parse(fs.readFileSync(args[0])));}
 else if(command==='initialize'){assert.equal(args.length,2);fs.writeFileSync(args[0],JSON.stringify(validate(base(args[1],'SOURCE')))+'\n',{flag:'wx'});}
 else throw Error('USAGE');
}catch{process.stderr.write('LC01_REPORT_REJECTED\n');process.exitCode=1;}}
