'use strict';

const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');

const holderScript=path.join(__dirname,'lock-holder.ps1');
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-lock-lifecycle-'));
  const lock=path.join(dir,'.launcher.lock');
  fs.writeFileSync(lock,'synthetic-lock');
  t.after(()=>{fs.unlinkSync(lock);fs.rmdirSync(dir);});
  return {dir,lock};
}
function startHolder(t,lock){
  const child=cp.spawn('pwsh',['-NoLogo','-NoProfile','-NonInteractive','-File',holderScript,'-LockFile',lock],
    {windowsHide:true,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(child.exitCode===null)child.kill();});
  return new Promise((resolve,reject)=>{
    let stdout='';
    const timer=setTimeout(()=>reject(Error('lock holder did not start')),10000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.stdout.on('data',bytes=>{
      stdout+=bytes.toString();
      if(/LOCKED\r?\n/.test(stdout)){clearTimeout(timer);resolve(child);}
    });
    child.once('exit',code=>{if(!/LOCKED\r?\n/.test(stdout)){clearTimeout(timer);reject(Error('lock holder exited '+code));}});
  });
}
function exited(child){
  if(child.exitCode!==null||child.signalCode!==null)return Promise.resolve(child.exitCode);
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('holder exit timed out')),10000);
    child.once('exit',code=>{clearTimeout(timer);resolve(code);});
  });
}
function readback(lock){return fs.readFileSync(lock,'utf8');}
async function waitReadback(lock,timeoutMs){
  const end=Date.now()+timeoutMs;
  for(;;){
    try{return readback(lock);}catch(error){
      if(!['EBUSY','EPERM','EACCES'].includes(error.code))throw error;
      if(Date.now()>=end)throw Error('LOCK_RELEASE_TIMEOUT');
      await new Promise(resolve=>setTimeout(resolve,10));
    }
  }
}
async function release(child){child.stdin.end('release\n');assert.equal(await exited(child),0);}

test('controlled holder PID owns the exclusive synthetic launcher lock',async t=>{
  const {lock}=fixture(t),child=await startHolder(t,lock);
  assert.ok(child.pid>0);
  assert.throws(()=>readback(lock),error=>['EBUSY','EPERM','EACCES'].includes(error.code));
  await release(child);
});
test('a stop request alone does not authorize inventory before process exit',async t=>{
  const {lock}=fixture(t),child=await startHolder(t,lock);
  child.stdin.write('stop-requested\n');
  assert.equal(child.exitCode,null);
  assert.throws(()=>readback(lock));
  await release(child);
});
test('graceful shutdown closes the lock before readback',async t=>{
  const {lock}=fixture(t),child=await startHolder(t,lock);
  await release(child);
  assert.equal(await waitReadback(lock,1000),'synthetic-lock');
});
test('abnormal process exit releases the kernel-held file lock',async t=>{
  const {lock}=fixture(t),child=await startHolder(t,lock);
  child.kill();await exited(child);
  assert.equal(await waitReadback(lock,1000),'synthetic-lock');
});
test('lock wait times out closed while the holder is still alive',async t=>{
  const {lock}=fixture(t),child=await startHolder(t,lock);
  await assert.rejects(waitReadback(lock,100),/LOCK_RELEASE_TIMEOUT/);
  assert.equal(child.exitCode,null);
  await release(child);
});
test('cleanup completion precedes complete instance inventory and readback',async t=>{
  const {dir,lock}=fixture(t),child=await startHolder(t,lock);
  const other=path.join(dir,'synthetic.json');fs.writeFileSync(other,'{}');
  await release(child);
  assert.equal(await waitReadback(lock,1000),'synthetic-lock');
  assert.deepEqual(fs.readdirSync(dir).sort(),['.launcher.lock','synthetic.json']);
  assert.equal(fs.readFileSync(other,'utf8'),'{}');
  fs.unlinkSync(other);
});
test('repeated start stop readback cycles leave no lock holder',async t=>{
  const {lock}=fixture(t);
  for(let n=0;n<3;n++){
    const child=await startHolder(t,lock);
    assert.throws(()=>readback(lock));
    await release(child);
    assert.equal(await waitReadback(lock,1000),'synthetic-lock');
  }
});
test('a separate control process can exit while another process still owns the lock',async t=>{
  const {lock}=fixture(t),holder=await startHolder(t,lock);
  const control=cp.spawn('pwsh',['-NoLogo','-NoProfile','-NonInteractive','-Command','exit 0'],
    {windowsHide:true,stdio:'ignore'});
  assert.equal(await exited(control),0);
  assert.throws(()=>readback(lock),error=>['EBUSY','EPERM','EACCES'].includes(error.code));
  await release(holder);
  assert.equal(await waitReadback(lock,1000),'synthetic-lock');
});
