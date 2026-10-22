'use strict';
const assert=require('node:assert/strict'),recovery=require('./install-r2/recovery.cjs');
const KEYS=Object.freeze(['productRegistration','binding','startup','desktop','programs','programFiles','failedTarget','failedInstance']);
const PROOF=Object.freeze(['logKnown','preInstallReady','nativeInstallStarted','controlledDirectoryAttempt','accessDenied5','fatalInstall4','nativeRollback','postInstallNotReached','setupNaturalExit','sameExe','creatorReady','aclRestored','creatorHandlesClosed']);
const CONTROLLER=Object.freeze(['NOT_STARTED','READY_UNPROVEN','CREATION_INCOMPLETE','OWNED_REMOVED','RETIRED_CHANGED','OWNERSHIP_UNKNOWN','ACL_CHANGED','UNOWNED_CHILDREN_PRESENT','ACL_RESTORE_UNPROVEN','DELETE_FAILED','POST_ABSENCE_UNPROVEN','RESTORE_REPORT_INVALID']);
function exact(o,keys){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),[...keys].sort());}
function decode(text){
 const records=[];const lines=text.split(/\r?\n/);if(lines.at(-1)==='')lines.pop();
 for(const line of lines){const m=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} {3}(.*)$/.exec(line);if(m){records.push([m[1]]);if(records.length>8192)return null;}else if(line.startsWith(' '.repeat(26))&&records.length){records.at(-1).push(line.slice(26));}else return null;}
 return records;
}
function observe({text,target,exitCode,natural}){
 assert.equal(typeof text,'string');assert.ok(Buffer.byteLength(text,'utf8')<=4*1024*1024);assert.equal(typeof target,'string');assert.ok(target.length>3&&!/[\r\n]/.test(target));assert.equal(typeof natural,'boolean');
 const records=decode(text);const proof={logKnown:records!==null,preInstallReady:false,nativeInstallStarted:false,controlledDirectoryAttempt:false,accessDenied5:false,fatalInstall4:false,nativeRollback:false,postInstallNotReached:false,setupNaturalExit:natural};if(!records)return proof;
 const heads=records.map(r=>r[0]),once=value=>heads.filter(v=>v===value).length===1;
 const controlled=target.replace(/[\\/]$/,'')+'\\uninstall',creating='Creating directory: '+controlled;
 const pre=heads.indexOf('KSESSION_PREINSTALL_READY'),start=heads.indexOf('Starting the installation process.'),dir=heads.findIndex(s=>s.toLowerCase()===creating.toLowerCase()),fatal=heads.indexOf('Fatal exception during installation process (Exception):'),rollback=heads.indexOf('Rolling back changes.');
 const unique=once('KSESSION_PREINSTALL_READY')&&once('Starting the installation process.')&&once('Fatal exception during installation process (Exception):')&&once('Rolling back changes.')&&heads.slice(start,rollback).filter(s=>s.startsWith('Creating directory: ')).length===1;
 const body=fatal>=0?[...records[fatal]]:[];if(body.at(-1)==='')body.pop();
 const errorBody=body.slice(1);const denied=body.length===4&&errorBody[0].toLowerCase()===('Setup was unable to create the directory "'+controlled+'".').toLowerCase()&&errorBody[1]===''&&/^Error 5: .+$/.test(errorBody[2]);
 const suppressed='Defaulting to OK for suppressed message box (OK):';
 const after=fatal>=0&&rollback>fatal?records.slice(fatal+1,rollback):[];
 const expectedAfter=[['Exception message:'],[suppressed,...errorBody],[suppressed,'Setup was not completed.','','Please correct the problem and run Setup again.']];
 const clean=r=>r.at(-1)===''?r.slice(0,-1):r;
 const handling=after.length===3&&after.every((r,i)=>JSON.stringify(clean(r))===JSON.stringify(expectedAfter[i]));
 const unexpected=/-- (?:File|Registry|Icon|INI) entry --|Installation process succeeded\./.test(text)||[...text.matchAll(/KSESSION_[A-Za-z0-9_]+/g)].some(m=>m[0]!=='KSESSION_PREINSTALL_READY'&&!/^KSESSION_WIZARD_PAGE_[0-9]+$/.test(m[0]));
 return {...proof,preInstallReady:pre>=0&&unique,nativeInstallStarted:start>pre&&pre>=0&&unique,controlledDirectoryAttempt:dir>start&&start>pre&&pre>=0&&unique,accessDenied5:denied,fatalInstall4:exitCode===4&&fatal===dir+1&&dir>start,nativeRollback:rollback>fatal&&handling,postInstallNotReached:!unexpected};
}
function validate(r,source,setup){
 exact(r,['schema','kind','sourceCommit','setupSha256','status','mechanism','controllerState','setupExitCode','proof','recovery']);assert.equal(r.schema,1);assert.equal(r.kind,'FRESH_AB_FAILED_NATIVE_INSTALL');assert.match(source,/^[a-f0-9]{40}$/);assert.match(setup,/^[a-f0-9]{64}$/);assert.equal(r.sourceCommit,source);assert.equal(r.setupSha256,setup);assert.equal(r.mechanism,'OWNED_NONINHERITING_DENY_ADD_SUBDIRECTORY');assert.ok(CONTROLLER.includes(r.controllerState));assert.ok(Number.isInteger(r.setupExitCode)&&r.setupExitCode>=-1&&r.setupExitCode<=255);assert.ok(['PASS','FAIL'].includes(r.status));exact(r.proof,PROOF);for(const v of Object.values(r.proof))assert.equal(typeof v,'boolean');recovery.validate(r.recovery,KEYS);if(r.status==='PASS'){assert.equal(r.controllerState,'OWNED_REMOVED');assert.equal(r.setupExitCode,4);assert.ok(Object.values(r.proof).every(v=>v===true));assert.ok(Object.values(r.recovery).every(s=>recovery.RESTORED.includes(s)));assert.equal(r.recovery.failedTarget,'OWNED_REMOVED');}return r;
}
module.exports={KEYS,PROOF,CONTROLLER,decode,observe,validate};
if(require.main===module){let text='',invalid=false;const fail=()=>{if(!process.exitCode)process.stderr.write('AB_NATIVE_FAILURE_OBSERVATION_INVALID\n');process.exitCode=1;};process.stdin.setEncoding('utf8');process.stdin.on('data',s=>{if(invalid)return;if(Buffer.byteLength(text+s,'utf8')>4*1024*1024){invalid=true;text='';fail();return;}text+=s;});process.stdin.on('error',fail);process.stdin.on('end',()=>{if(invalid)return;try{const input=JSON.parse(text);exact(input,['text','target','exitCode','natural']);process.stdout.write(JSON.stringify(observe(input)));}catch{fail();}});}
