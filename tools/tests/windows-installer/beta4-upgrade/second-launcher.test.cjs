'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const {injectSecondLauncherLockRejection,appendSecondLauncherHelpers}=require('./prepare-hosted-harness.cjs');
const repo=path.resolve(__dirname,'../../../..');
const original=fs.readFileSync(path.join(repo,'tools/windows-launcher/upgrade_windows_test.go'),'utf8').replaceAll('\r\n','\n');
const generated=appendSecondLauncherHelpers(injectSecondLauncherLockRejection(original),repo);
test('LC01 generated overlay embeds the actual pure Go policy and Windows adapter',()=>{
  const policy=fs.readFileSync(path.join(repo,'tools/research/lan2-lc01/policy.go'),'utf8').replaceAll('\r\n','\n');
  assert.ok(generated.includes(policy.slice(policy.indexOf('const lcBusyText'))));
  const adapter=fs.readFileSync(path.join(__dirname,'second-launcher-windows.go.in'),'utf8').replaceAll('\r\n','\n');
  assert.ok(generated.includes(adapter.slice(adapter.indexOf('type lcPinned'))));
  assert.match(generated,/secondResult := checkSecondLauncher/);
  assert.doesNotMatch(generated,/second\.Run\(\)|exec\.CommandContext\(secondContext/);
});
test('LC02 guards retain original session, lock, both event counts and second process chain',()=>{
  for(const marker of ['!w.first.live()','!w.node.live()','"NODE_SPAWN"','"READY"','LOCK_NOT_EXCLUSIVE','row.ParentProcessID == w.second.pid'])assert.ok(generated.includes(marker),marker);
  assert.match(generated,/!secondResult\.NaturalExit \|\| secondResult\.CleanupTerminated \|\| !secondResult\.HandlesClosed/);
});
test('LC03 dialog messages require complete exact proof and immediate reinspection',()=>{
  assert.match(generated,/now != original \|\| !lcExactBusy\(now\)/);
  assert.match(generated,/thread != 0 && pid != 0/);
  assert.match(generated,/n != 0 && n < uintptr\(len\(b\)-1\)/);
  assert.match(generated,/d\.Text == lcBusyText/);
  assert.match(generated,/d\.Title == lcProductTitle/);
  assert.match(generated,/d\.ButtonID == 1 && d\.TextCount == 1 && d\.ButtonCount == 1/);
  assert.equal((generated.match(/NewProc\("PostMessageW"\)/g)||[]).length,1);
  assert.doesNotMatch(generated,/NewProc\("(?:SendMessageW|FindWindowW|WM_CLOSE)"\)/);
});
test('LC04 cleanup targets original process handle and cannot set PASS',()=>{
  assert.match(generated,/syscall\.CreateProcess\(app, command/);
  assert.match(generated,/handle:\s*pi\.Process, pid:\s*pi\.ProcessId/);
  assert.match(generated,/syscall\.TerminateProcess\(w\.second\.handle, 97\)/);
  assert.match(generated,/err != nil \|\| terminated \{\s*result\.Status = "FAIL"/);
  assert.match(generated,/syscall\.CloseHandle\(snapshot\)/);
  assert.match(generated,/time\.Second/);
});
test('LC05 finite callback registration is independent of polling duration',()=>{
  assert.equal((generated.match(/syscall\.NewCallback\(/g)||[]).length,2);
  assert.match(generated,/lcScanMutex\.Lock\(\)\s*defer lcScanMutex\.Unlock\(\)/);
  assert.throws(()=>injectSecondLauncherLockRejection(original.replace('\tport := int(ready["port"].(float64))','')),/expected one harness marker/);
});
test('LC06 all second-launcher deadlines share finite 30s in candidate and dedicated proof',()=>{
  assert.match(generated,/const lcSecondBudget = 30 \* time.Second/);
  assert.doesNotMatch(generated,/20\s*\*\s*time.Second/);
  assert.equal((generated.match(/w.Now\(\) >= lcSecondBudget/g)||[]).length,5);
  assert.match(generated,/lcRun\(w, lcSecondBudget\)/);
});
