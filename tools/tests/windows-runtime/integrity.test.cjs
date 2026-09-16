'use strict';
// All mutation targets below are newly generated synthetic fixtures, never a runtime build.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {inventory,writeNew,writeJSON,sha,inside}=require('../../windows-runtime/common.cjs');
const {verify}=require('../../windows-runtime/verify.cjs');
const root=path.resolve(process.argv[2]),repo=path.resolve(__dirname,'../../..');
if(!/^E:\\/i.test(root)||root===repo||inside(repo,root))throw Error('External E-drive evidence directory required');
fs.mkdirSync(root);let sequence=0,passed=0;
function fixture(change=()=>{}) {
  const dir=path.join(root,String(++sequence));fs.mkdirSync(dir);
  writeNew(path.join(dir,'runtime/node.exe'),'SYNTHETIC NOT AN EXECUTABLE');
  writeNew(path.join(dir,'app/package-lock.json'),'{}');
  writeNew(path.join(dir,'licenses/NOTICE'),'Synthetic notice, no third-party material');
  const m={format:'k-session-runtime',manifestSchema:1,platform:'win32-x64',businessDataIncluded:false,launcherIncluded:false,ocrEngineIncluded:false,files:inventory(dir),nodeHash:sha('SYNTHETIC NOT AN EXECUTABLE'),packageLockHash:sha('{}')};
  change(m,dir);writeJSON(path.join(dir,'manifest/runtime-manifest.json'),m);
  writeNew(path.join(dir,'hashes/SHA256SUMS.txt'),inventory(dir).map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
  return dir;
}
verify(fixture());passed++;
for(const [name,mutate] of [
  ['file corruption',d=>fs.appendFileSync(path.join(d,'licenses/NOTICE'),'changed')],
  ['file missing',d=>fs.renameSync(path.join(d,'licenses/NOTICE'),path.join(d,'licenses/NOTICE.moved'))],
  ['extra file',d=>writeNew(path.join(d,'unexpected.txt'),'extra')],
  ['checksum corruption',d=>fs.appendFileSync(path.join(d,'hashes/SHA256SUMS.txt'),'invalid\n')]
]) {const d=fixture();mutate(d);assert.throws(()=>verify(d),undefined,name);passed++;}
for(const mutate of [m=>{m.manifestSchema=2;},m=>{m.platform='win32-arm64';},m=>{m.businessDataIncluded=true;},m=>{m.launcherIncluded=true;},m=>{m.ocrEngineIncluded=true;},m=>{m.files.push({...m.files[0]});},m=>{m.files[0].path='../escaped';},m=>{m.nodeHash='0'.repeat(64);}]){assert.throws(()=>verify(fixture(mutate)));passed++;}
const forbidden=fixture((m,dir)=>{writeNew(path.join(dir,'app/data.json'),'{}');m.files=inventory(dir);});assert.throws(()=>verify(forbidden),/contamination/);passed++;
const result={suite:'synthetic-runtime-integrity',passed,qualification:'Tampering with generated fixtures only; no real Node or data included'};
writeJSON(path.join(root,'report.json'),result);console.log(JSON.stringify(result));
