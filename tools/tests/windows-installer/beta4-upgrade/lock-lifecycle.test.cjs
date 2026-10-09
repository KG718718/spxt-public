'use strict';

const assert=require('node:assert/strict');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const {injectLockRelease,injectPersistentInstanceInventory,injectRejectedSetupQuiescence,injectSecondLauncherLockRejection}=require('./prepare-hosted-harness.cjs');

const holderScript=path.join(__dirname,'lock-holder.ps1');
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-lock-lifecycle-'));
  const lock=path.join(dir,'.launcher.lock');
  fs.writeFileSync(lock,'synthetic-lock');
  t.after(()=>{if(fs.existsSync(lock))fs.unlinkSync(lock);fs.rmdirSync(dir);});
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
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function businessFixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-business-inventory-'));
  assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const put=(name,value)=>{const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);return file;};
  put('.launcher.lock','volatile');put('data.json','{"account":"synthetic"}');
  put('lan-deployment.json','{"schema":2,"interfaceName":"Ethernet","port":8083}');
  put('attachments/synthetic.bin',Buffer.from([1,2,3]));
  put('launcher-logs/launcher.log','synthetic log');put('temp/synthetic.tmp','synthetic temp');
  return {dir,put};
}
function persistentInventory(dir){
  const rows={};
  function walk(parent){
    for(const name of fs.readdirSync(parent).sort()){
      const file=path.join(parent,name),relative=path.relative(dir,file).replaceAll('\\','/');
      const info=fs.lstatSync(file);
      if(relative==='.launcher.lock'){
        if(!info.isFile()||info.isSymbolicLink())throw Error('LOCK_NOT_REGULAR');
        continue;
      }
      if(info.isDirectory()&&!info.isSymbolicLink())walk(file);
      else if(info.isFile()&&!info.isSymbolicLink())rows[relative]=sha(fs.readFileSync(file));
      else throw Error('UNKNOWN_NONREGULAR_FILE');
    }
  }
  walk(dir);return rows;
}
const originalUpgrade=fs.readFileSync(path.join(__dirname,'../../../windows-launcher/upgrade_windows_test.go'),'utf8').replaceAll('\r\n','\n');
const generatedUpgrade=injectSecondLauncherLockRejection(injectRejectedSetupQuiescence(
  injectPersistentInstanceInventory(injectLockRelease(originalUpgrade)),
  'beta2','beta1','beta.1','beta.2'));

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
test('a missing lock object is a hard error rather than a sharing retry',async t=>{
  const {lock}=fixture(t);
  fs.unlinkSync(lock);
  await assert.rejects(waitReadback(lock,100),error=>error.code==='ENOENT');
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
test('generated beta4 lifecycle gates all three inventories on bounded exclusive lock release',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../../../windows-launcher/upgrade_windows_test.go'),'utf8').replaceAll('\r\n','\n');
  const generated=injectLockRelease(source);
  const release='\twaitLauncherLockReleased(t, instance)';
  assert.equal(generated.split(release).length-1,3);
  assert.equal(generated.includes('\t_ = app.Wait()'),false);
  const order=/until\(t, func\(\) bool \{ return !alivePID\(pid\) && !alivePID\(uint32\(app\.Process\.Pid\)\) \}\)\n\tif e := app\.Wait\(\); e != nil \{ t\.Fatal\("launcher exit failed"\) \}\n\twaitLauncherLockReleased\(t, instance\)/g;
  assert.equal([...generated.matchAll(order)].length,3);
  assert.ok(generated.indexOf(release)<generated.indexOf('instanceStable := walkHash(instance)'));
  assert.match(generated,/syscall\.CreateFile\([^\n]+syscall\.GENERIC_READ, 0, nil, syscall\.OPEN_EXISTING/);
  assert.match(generated,/err == syscall\.Errno\(32\) \|\| err == syscall\.Errno\(33\) \{ return false \}/);
  assert.match(generated,/if err != nil \{ t\.Fatal\("lock release probe failed"\) \}/);
  assert.match(generated,/if e := syscall\.CloseHandle\(h\); e != nil \{ t\.Fatal\("lock probe close failed"\) \}/);
  assert.throws(()=>injectLockRelease(source.replace('\t_ = app.Wait()','')),/expected 3 harness markers/);
});

test('LCK06 only the root volatile lock is absent from persistent inventory',t=>{
  const {dir}=businessFixture(t),rows=persistentInventory(dir);
  assert.equal(Object.hasOwn(rows,'.launcher.lock'),false);
  assert.deepEqual(Object.keys(rows).sort(),['attachments/synthetic.bin','data.json','lan-deployment.json','launcher-logs/launcher.log','temp/synthetic.tmp']);
});
test('EXTRA nested lock-named ordinary file is still hashed',t=>{
  const {dir,put}=businessFixture(t);put('unknown/.launcher.lock','not the root control file');
  assert.equal(persistentInventory(dir)['unknown/.launcher.lock'],sha('not the root control file'));
});
test('LCK10 an unknown ordinary file is included and mutation is detected',t=>{
  const {dir,put}=businessFixture(t),file=put('unknown/new.bin','first');
  const before=persistentInventory(dir);fs.writeFileSync(file,'second');
  assert.notEqual(before['unknown/new.bin'],persistentInventory(dir)['unknown/new.bin']);
});
test('LCK11 sharing violation on an unknown file fails the full inventory',async t=>{
  const {dir,put}=businessFixture(t),file=put('unknown/held.bin','synthetic');
  const child=await startHolder(t,file);
  assert.throws(()=>persistentInventory(dir),error=>['EBUSY','EPERM','EACCES'].includes(error.code));
  await release(child);
  assert.ok(persistentInventory(dir)['unknown/held.bin']);
});
for(const [id,file] of [['LCK07','data.json'],['LCK08','attachments/synthetic.bin'],['LCK09','lan-deployment.json'],['EXTRA','launcher-logs/launcher.log'],['EXTRA','temp/synthetic.tmp']]){
  test(`${id} ${file} remains hash-protected`,t=>{
    const {dir,put}=businessFixture(t),before=persistentInventory(dir);
    put(file,'changed synthetic bytes');
    assert.notEqual(before[file],persistentInventory(dir)[file]);
  });
}
test('LCK01 runtime lock occupancy is expected',async t=>{
  const {dir}=businessFixture(t),lock=path.join(dir,'.launcher.lock'),first=await startHolder(t,lock);
  assert.throws(()=>readback(lock));
  const second=cp.spawn('pwsh',['-NoLogo','-NoProfile','-NonInteractive','-File',holderScript,'-LockFile',lock],
    {windowsHide:true,stdio:['pipe','pipe','pipe']});
  assert.notEqual(await exited(second),0);
  await release(first);
  assert.match(generatedUpgrade,/requireLauncherLockOccupied\(t, instance\)/);
});
test('LCK02 quiescent checkpoint requires exit and exclusive lock release before inventory',async t=>{
  const {dir}=businessFixture(t),lock=path.join(dir,'.launcher.lock'),holder=await startHolder(t,lock);
  await assert.rejects(waitReadback(lock,100),/LOCK_RELEASE_TIMEOUT/);
  await release(holder);
  assert.equal(await waitReadback(lock,1000),'volatile');
  assert.ok(persistentInventory(dir)['data.json']);
  assert.match(generatedUpgrade,/requireControlledProcessExited\(t, processID\)[\s\S]+waitLauncherLockReleased\(t, instance\)[\s\S]+return walkPersistentInstance\(t, instance\)/);
});
test('LCK12 lock probe failure and a missing lock fail closed',async t=>{
  const {dir}=businessFixture(t),lock=path.join(dir,'.launcher.lock');fs.unlinkSync(lock);
  await assert.rejects(waitReadback(lock,100),error=>error.code==='ENOENT');
  assert.match(generatedUpgrade,/if err != nil \{ t\.Fatal\("lock release probe failed"\) \}/);
  assert.match(generatedUpgrade,/if e := syscall\.CloseHandle\(h\); e != nil \{ t\.Fatal\("lock probe close failed"\) \}/);
});
test('LCK03 real second Launcher cannot acquire the same lock or start a second private session',()=>{
  assert.match(generatedUpgrade,/secondResult := checkSecondLauncher\(t, launcher, instance, uint32\(app\.Process\.Pid\), pid, readyBeforeSecond, spawnBeforeSecond\)/);
  assert.match(generatedUpgrade,/if !alivePID\(pid\) \|\| !alivePID\(uint32\(app\.Process\.Pid\)\) \{ t\.Fatal\("second Launcher displaced controlled session"\) \}/);
  assert.match(generatedUpgrade,/requireLauncherLockOccupied\(t, instance\)/);
  assert.match(generatedUpgrade,/eventCount\(instance, "READY"\) != readyBeforeSecond \|\| eventCount\(instance, "NODE_SPAWN"\) != spawnBeforeSecond/);
  assert.match(generatedUpgrade,/!secondResult\.NaturalExit \|\| secondResult\.CleanupTerminated \|\| !secondResult\.HandlesClosed/);
});
test('LCK04 U05 same-version rejection rechecks quiescence before comparison',()=>{
  assert.match(generatedUpgrade,/runSetup\(beta2, false\)\n\tpostSameVersionInstance := persistentInventory\(\)\n\tif !equalMaps\(upgradedOwned, owned\(\)\) \|\| !equalMaps\(upgradedInstance, postSameVersionInstance\) \{ t.Fatal\("same-version rejection changed state"\) \}\n\trecord\("U05"/);
  assert.doesNotMatch(generatedUpgrade,/runSetup\(beta2, false\)\n\tif [^\n]*\|\|[^\n]*persistentInventory\(\)/);
  assert.match(generatedUpgrade,/persistentInventory := func\(\) map\[string\]string \{[\s\S]+requireControlledProcessExited[\s\S]+waitLauncherLockReleased/);
});
test('LCK05 U06 downgrade rejection rechecks quiescence before comparison',()=>{
  assert.match(generatedUpgrade,/runSetup\(beta1, false\)\n\tpostDowngradeInstance := persistentInventory\(\)\n\tif !equalMaps\(upgradedOwned, owned\(\)\) \|\| !equalMaps\(upgradedInstance, postDowngradeInstance\) \{ t.Fatal\("downgrade rejection changed state"\) \}\n\trecord\("U06"/);
  assert.doesNotMatch(generatedUpgrade,/runSetup\(beta1, false\)\n\tif [^\n]*\|\|[^\n]*persistentInventory\(\)/);
  assert.match(generatedUpgrade,/persistentInventory := func\(\) map\[string\]string \{[\s\S]+requireControlledProcessExited[\s\S]+waitLauncherLockReleased/);
});
test('LCK13 rollback checkpoint retains persistent inventory',t=>{
  const {dir,put}=businessFixture(t),baseline=persistentInventory(dir);
  put('.launcher.lock','runtime changed after rollback');
  assert.deepEqual(persistentInventory(dir),baseline);
  assert.match(generatedUpgrade,/rollback[\s\S]+persistentInventory\(\)/i);
});
test('LCK14 uninstall reinstall checkpoints retain business bytes and repeat cleanly',async t=>{
  const {dir,put}=businessFixture(t),baseline=persistentInventory(dir),lock=path.join(dir,'.launcher.lock');
  assert.match(generatedUpgrade,/persistentInventory\(\)\) \{\n\t\tt\.Fatal\("uninstall changed instance"\)/);
  assert.match(generatedUpgrade,/persistentInventory\(\)\) \{\n\t\tt\.Fatal\("fresh beta\.2 rebind changed instance before launch"\)/);
  for(let n=0;n<2;n++){
    const holder=await startHolder(t,lock);await release(holder);
    put('.launcher.lock','volatile-'+n);
    assert.equal(await waitReadback(lock,1000),'volatile-'+n);
    assert.deepEqual(persistentInventory(dir),baseline);
  }
});
