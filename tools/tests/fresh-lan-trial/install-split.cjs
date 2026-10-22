'use strict';
// Prospective split execution only. No authorization, slot, trigger, historical
// source fence or legacy schema is created or relaxed by this module.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const legacy=require('./report.cjs'),recovery=require('./install-r2/recovery.cjs');
const HEX=/^[a-f0-9]{40}$/,SHA=/^[a-f0-9]{64}$/,ID=/^[1-9][0-9]{0,19}$/;
const REJECT=Object.freeze(['NONEMPTY_TARGET','EXISTING_INSTANCE','DESKTOP_SHORTCUT','STARTUP_SHORTCUT','OLD_BINDING']);
const FAILURES=Object.freeze(['NONE','CORE_NOT_RUN','CORE_PROCESS_FAILED','REGISTRY_REPORT_INVALID','CORE_REPORT_INVALID','FAILED_INSTALL_REPORT_INVALID','FAILED_INSTALL_RECOVERY_NOT_READY','REQUIRED_GATE_FAILED','CORE_GATE_FAILED','TRANSFER_IDENTITY_CHANGED']);
const STATES=Object.freeze(['NOT_STARTED','CREATED_NEW','UNCHANGED','OWNED_REMOVED','PRESTATE_UNKNOWN','PARENT_UNKNOWN','CREATE_COLLISION','CREATE_FAILED','WRITE_FAILED','WRITE_READBACK_UNKNOWN','WRITE_OBSERVATION_UNKNOWN','RECEIPT_UNKNOWN','HANDLE_CONTENT_CHANGED','HANDLE_CHANGED','OBSERVATION_FAILED','STRUCTURED_STATE_CHANGED','HANDLE_UNKNOWN','PARENT_CHANGED','DELETE_FAILED','CLOSE_FAILED','DELETE_OBSERVATION_FAILED','RETIRED_STATE_CHANGED']);
function exact(o,keys){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),[...keys].sort());}
function binding(value,role,source,setup){exact(value,['schema','role','sourceCommit','setupSha256']);assert.equal(value.schema,1);assert.ok(['A','B'].includes(role));assert.equal(value.role,role);assert.match(source,HEX);assert.equal(value.sourceCommit,source);assert.match(setup,SHA);assert.equal(value.setupSha256,setup);return true;}
function registry(r,source,role){
 exact(r,['schema','kind','sourceCommit','role','create','compare','cleanup','firstFailure','handlesClosed']);
 assert.equal(r.schema,1);assert.equal(r.kind,'FRESH_REGISTRY_FIXTURE');assert.equal(r.sourceCommit,source);assert.equal(r.role,role);assert.ok(['','A','B'].includes(role));
 for(const k of ['create','compare','cleanup'])assert.ok(STATES.includes(r[k]));
 const first=String(r.firstFailure).split(':');assert.ok(r.firstFailure==='NONE'||(first.length===2&&['create','compare','cleanup'].includes(first[0])&&STATES.includes(first[1])&&!['NOT_STARTED','CREATED_NEW','UNCHANGED','OWNED_REMOVED'].includes(first[1])));
 assert.equal(typeof r.handlesClosed,'boolean');return r;
}
function core(r,source,role,setup){
 exact(r,['schema','kind','sourceCommit','role','setupSha256','status','stage','reason','checks','cleanup','fixturesClean','recovery','setupDiagnostics','installationParentRecovery']);
 assert.equal(r.schema,3);assert.equal(r.kind,'FRESH_INSTALLED_SPLIT');assert.equal(r.sourceCommit,source);assert.equal(r.role,role);assert.ok(['A','B'].includes(role));assert.match(setup,SHA);assert.equal(r.setupSha256,setup);
 // Reuse the complete legacy observation validator without reinterpreting any
 // saved schema2 report. Only this explicitly versioned in-memory view adapts.
 const {role:unusedRole,setupSha256:unusedSha,installationParentRecovery:unusedParents,...view}=r;
 view.schema=2;view.kind='FRESH_INSTALLED_CORE';require('./observations.cjs').core(view,source,2);
 const allowed=role==='B'?legacy.WITNESSES.F01.slice(3):[...legacy.WITNESSES.F01.slice(0,3),...['F02','F03','F05','F06'].flatMap(k=>legacy.WITNESSES[k])];
 for(const k of Object.keys(r.checks))assert.ok(allowed.includes(k));
 exact(r.installationParentRecovery,['uninstallParent','bindingParent']);for(const value of Object.values(r.installationParentRecovery))assert.ok([...recovery.STATES,'NOT_APPLICABLE'].includes(value));
 if(r.status==='PASS'){
  assert.equal(r.stage,'COMPLETE');assert.equal(r.reason,'PASS');assert.equal(r.fixturesClean,true);assert.ok(Object.values(r.cleanup).every(v=>v===true));
  for(const value of Object.values(r.installationParentRecovery))if(role==='A')assert.ok(recovery.RESTORED.includes(value));else assert.equal(value,'NOT_APPLICABLE');
  const calls=role==='B'?REJECT:['FRESH_ACCEPT','REGISTERED_REJECT'];assert.deepEqual(r.setupDiagnostics.map(d=>d.call),calls);for(const d of r.setupDiagnostics)require('./setup-diagnostic.cjs').expected(d);
  for(const k of role==='B'?allowed:legacy.WITNESSES.F01.slice(0,3))assert.equal(r.checks[k],true);
 }
 return r;
}
function command(role,go,overlay){assert.ok(['A','B'].includes(role));return{exe:go,args:['test','-overlay',overlay,'-tags','fresh_trial_tests','-count=1','-timeout=15m','-run','^TestFreshInstalledCore$','.'],environment:{KSESSION_FRESH_INSTALL_ROLE:role}};}
// This is also used by the real Hosted entry. Tests replace only its process
// callback, never dispatch, evidence reads, fixed diagnostics or aggregation.
async function execute({role,sourceCommit,setupSha256,launch,readCore,readRegistry,phases={},failedInstallRecovery,write}){
 assert.ok(['A','B'].includes(role));assert.match(sourceCommit,HEX);assert.match(setupSha256,SHA);
 const result={schema:2,kind:'FRESH_SPLIT_INNER',role,sourceCommit,setupSha256,status:'FAIL',stage:'F01',failure:'CORE_NOT_RUN',checks:{},core:null,registry:null,failedInstallRecovery:role==='B'?'NOT_RUN':'NOT_APPLICABLE',failedInstallEvidence:null};
 let exit=null;
 try{exit=await launch(role);}catch{result.failure='CORE_PROCESS_FAILED';}
 // Always attempt both safe reports even when Go exits nonzero. Raw Go output
 // is never used as the diagnostic transport and is never persisted here.
 try{result.registry=registry(await readRegistry(),sourceCommit,role);}catch{result.failure='REGISTRY_REPORT_INVALID';}
 try{result.core=core(await readCore(),sourceCommit,role,setupSha256);if(result.core.status==='FAIL'&&legacy.IDS.includes(result.core.stage))result.stage=result.core.stage;}catch{result.failure='CORE_REPORT_INVALID';}
 if(role==='B'&&failedInstallRecovery){try{result.failedInstallEvidence=require('./ab-failure.cjs').validate(await failedInstallRecovery(),sourceCommit,setupSha256);}catch{result.failure='FAILED_INSTALL_REPORT_INVALID';}}
 if(exit===0&&result.core?.status==='PASS'&&result.registry?.handlesClosed===true&&result.registry.firstFailure==='NONE'){
  try{
   if(role==='B'){
    for(const k of legacy.WITNESSES.F01.slice(3)){assert.equal(result.core.checks[k],true);result.checks[k]=true;}
    assert.equal(result.registry.create,'CREATED_NEW');assert.equal(result.registry.compare,'UNCHANGED');assert.equal(result.registry.cleanup,'OWNED_REMOVED');
    // Five rejection fixtures are not proof of interrupted native Setup recovery.
    // No current production Fresh build permits fault/sequence fixture flags.
    if(!failedInstallRecovery){result.failure='FAILED_INSTALL_RECOVERY_NOT_READY';}
    else{assert.equal(result.failedInstallEvidence?.status,'PASS');result.failedInstallRecovery='VERIFIED';result.status='INNER_PASS_OUTER_PENDING';result.stage='COMPLETE';result.failure='NONE';}
   }else{
    for(const k of legacy.WITNESSES.F01.slice(0,3)){assert.equal(result.core.checks[k],true);result.checks[k]=true;}
    for(const id of legacy.IDS.slice(1)){result.stage=id;const witnesses=await phases[id]();exact(witnesses,legacy.WITNESSES[id]);assert.ok(Object.values(witnesses).every(v=>v===true));Object.assign(result.checks,witnesses);}
    result.status='INNER_PASS_OUTER_PENDING';result.stage='COMPLETE';result.failure='NONE';
   }
  }catch{result.failure='REQUIRED_GATE_FAILED';}
 }else if(result.core&&result.registry){result.failure=exit!==0?'CORE_PROCESS_FAILED':'CORE_GATE_FAILED';}
 await write(result);return result;
}
function jobs(api,workflow,expected){
 // This requires raw current Jobs API rows plus exact inactive/approved
 // workflow bytes. Separate paths or random machine markers prove nothing.
 assert.equal(api.total_count,2);assert.ok(Array.isArray(api.jobs)&&api.jobs.length===2);
 const rows=api.jobs;assert.equal(new Set(rows.map(j=>String(j.id))).size,2);
 assert.doesNotMatch(workflow,/self-hosted|windows-.*slim|\n    (?:container|services|strategy|uses):/);
 assert.equal((workflow.match(/runs-on: windows-2025/g)||[]).length,2);
 for(const role of ['A','B']){const j=rows.find(j=>j.name==='fresh-'+role);assert.ok(j);assert.match(String(j.id),ID);assert.equal(String(j.run_id),expected.runId);assert.equal(j.run_attempt,1);assert.equal(j.head_sha,expected.controlCommit);assert.deepEqual(j.labels,['windows-2025']);assert.equal(j.runner_group_name,'GitHub Actions');assert.equal(j.status,'completed');assert.equal(j.conclusion,'success');}
 return true;
}
function inner(r,source,setup,role){
 exact(r,['schema','kind','role','sourceCommit','setupSha256','status','stage','failure','checks','core','registry','failedInstallRecovery','failedInstallEvidence']);assert.equal(r.schema,2);assert.equal(r.kind,'FRESH_SPLIT_INNER');assert.equal(r.role,role);assert.equal(r.sourceCommit,source);assert.equal(r.setupSha256,setup);assert.ok(['FAIL','INNER_PASS_OUTER_PENDING'].includes(r.status));assert.ok([...legacy.IDS,'COMPLETE'].includes(r.stage));assert.ok(FAILURES.includes(r.failure));
 const keys=[...new Set(legacy.IDS.flatMap(id=>legacy.WITNESSES[id]))].filter(k=>role==='B'?legacy.WITNESSES.F01.slice(3).includes(k):!legacy.WITNESSES.F01.slice(3).includes(k));
 for(const [k,v]of Object.entries(r.checks)){assert.ok(keys.includes(k));assert.equal(typeof v,'boolean');}
 if(r.core!==null)core(r.core,source,role,setup);if(r.registry!==null)registry(r.registry,source,role);if(r.failedInstallEvidence!==null)require('./ab-failure.cjs').validate(r.failedInstallEvidence,source,setup);
 assert.ok(['NOT_RUN','NOT_APPLICABLE','VERIFIED'].includes(r.failedInstallRecovery));
 if(r.status==='INNER_PASS_OUTER_PENDING'){
  assert.equal(r.failure,'NONE');assert.equal(r.stage,'COMPLETE');assert.equal(r.core?.status,'PASS');assert.equal(r.registry?.firstFailure,'NONE');assert.equal(r.registry?.handlesClosed,true);exact(r.checks,keys);assert.ok(Object.values(r.checks).every(v=>v===true));for(const [k,v]of Object.entries(r.core.checks))assert.equal(r.checks[k],v);
  if(role==='B'){assert.equal(r.registry.create,'CREATED_NEW');assert.equal(r.registry.compare,'UNCHANGED');assert.equal(r.registry.cleanup,'OWNED_REMOVED');assert.equal(r.failedInstallRecovery,'VERIFIED');assert.equal(r.failedInstallEvidence?.status,'PASS');}else{for(const k of ['create','compare','cleanup'])assert.equal(r.registry[k],'NOT_STARTED');assert.equal(r.failedInstallRecovery,'NOT_APPLICABLE');assert.equal(r.failedInstallEvidence,null);}
 }else assert.notEqual(r.failure,'NONE');return r;
}
function aggregate(a,b,outerA,outerB,api,workflow,expected){
 exact(expected,['sourceCommit','controlCommit','setupSha256','runId','workflowSha256']);assert.match(expected.sourceCommit,HEX);assert.match(expected.controlCommit,HEX);assert.match(expected.setupSha256,SHA);assert.match(expected.runId,ID);assert.match(expected.workflowSha256,SHA);assert.equal(crypto.createHash('sha256').update(workflow).digest('hex'),expected.workflowSha256);
 assert.ok(a&&b);assert.equal(a.role,'A');assert.equal(b.role,'B');jobs(api,workflow,expected);
 for(const [r,o]of [[a,outerA],[b,outerB]]){
  exact(r,['schema','kind','role','sourceCommit','setupSha256','status','stage','failure','checks','core','registry','failedInstallRecovery','failedInstallEvidence']);
  assert.equal(r.schema,2);assert.equal(r.kind,'FRESH_SPLIT_INNER');assert.equal(r.sourceCommit,expected.sourceCommit);assert.equal(r.setupSha256,expected.setupSha256);assert.equal(r.status,'INNER_PASS_OUTER_PENDING');assert.equal(r.failure,'NONE');
  inner(r,expected.sourceCommit,expected.setupSha256,r.role);
  core(r.core,expected.sourceCommit,r.role,expected.setupSha256);registry(r.registry,expected.sourceCommit,r.role);assert.equal(r.core.status,'PASS');assert.equal(r.registry.firstFailure,'NONE');assert.equal(r.registry.handlesClosed,true);
  const keys=[...new Set(legacy.IDS.flatMap(id=>legacy.WITNESSES[id]))].filter(k=>r.role==='B'?legacy.WITNESSES.F01.slice(3).includes(k):!legacy.WITNESSES.F01.slice(3).includes(k));exact(r.checks,keys);assert.ok(Object.values(r.checks).every(v=>v===true));for(const [k,v]of Object.entries(r.core.checks))assert.equal(r.checks[k],v);
  if(r.role==='B'){assert.equal(r.registry.create,'CREATED_NEW');assert.equal(r.registry.compare,'UNCHANGED');assert.equal(r.registry.cleanup,'OWNED_REMOVED');}else for(const key of ['create','compare','cleanup'])assert.equal(r.registry[key],'NOT_STARTED');
  exact(o,['role','jobId','sourceCommit','setupSha256','recovery','jobEmpty','environmentRestored','productPrestateAbsent','rawOutputStored']);assert.equal(o.role,r.role);assert.equal(o.jobId,String(api.jobs.find(j=>j.name==='fresh-'+r.role).id));assert.equal(o.sourceCommit,expected.sourceCommit);assert.equal(o.setupSha256,expected.setupSha256);assert.equal(recovery.restored(o.recovery),true);for(const k of ['jobEmpty','environmentRestored','productPrestateAbsent'])assert.equal(o[k],true);assert.equal(o.rawOutputStored,false);
 }
 assert.equal(b.failedInstallRecovery,'VERIFIED');assert.equal(require('./ab-failure.cjs').validate(b.failedInstallEvidence,expected.sourceCommit,expected.setupSha256).status,'PASS');assert.equal(a.failedInstallRecovery,'NOT_APPLICABLE');assert.equal(a.failedInstallEvidence,null);
 const checks={...a.checks,...b.checks};exact(checks,[...new Set(legacy.IDS.flatMap(id=>legacy.WITNESSES[id]))]);assert.ok(Object.values(checks).every(v=>v===true));
 return{schema:1,kind:'FRESH_SPLIT_AGGREGATE',sourceCommit:expected.sourceCommit,setupSha256:expected.setupSha256,status:'AUTOMATION_PASS_HUMAN_PENDING',checks:legacy.IDS.map(id=>({id,method:legacy.METHODS[id],pass:true,witnesses:Object.fromEntries(legacy.WITNESSES[id].map(k=>[k,true]))})),humanPending:[...legacy.HUMAN]};
}
module.exports={REJECT,FAILURES,STATES,binding,registry,core,command,execute,inner,jobs,aggregate};
