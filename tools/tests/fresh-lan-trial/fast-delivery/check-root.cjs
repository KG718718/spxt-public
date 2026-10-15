'use strict';
// Only fixed IDs derived from checked-in filenames/static test declarations leave memory.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../../..');
const git=(...args)=>cp.execFileSync('git',['-C',repo,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const sourceCommit=git('rev-parse','HEAD'),cleanBefore=git('status','--porcelain','--untracked-files=no')==='';
const files=fs.readdirSync(root).filter(n=>/^[a-z0-9-]+\.test\.cjs$/.test(n)).sort();
const declarations=[];
files.forEach((file,fi)=>{
  const text=fs.readFileSync(path.join(root,file),'utf8');let ti=0;
  for(const m of text.matchAll(/\btest\(\s*(['"])([^'"\r\n]+)\1/g))declarations.push({title:m[2],id:'F'+String(fi+1).padStart(2,'0')+'T'+String(++ti).padStart(2,'0'),file});
});
const p=cp.spawnSync(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...files.map(f=>path.join(root,f))],{cwd:repo,encoding:'utf8',windowsHide:true,timeout:10*60*1000,maxBuffer:32*1024*1024});
const text=p.stdout||'',failed=[];
for(const m of text.matchAll(/^\s*not ok \d+ - (.+)$/gm)){
  const matches=declarations.filter(d=>d.title===m[1]);
  failed.push(matches.length===1?{id:matches[0].id,file:matches[0].file}:{id:'UNKNOWN',file:'UNKNOWN'});
}
const count=name=>{const rows=[...text.matchAll(new RegExp('^# '+name+' ([0-9]+)$','gm'))];return rows.length?Number(rows.at(-1)[1]):null;};
const r={schema:1,kind:'FAST_ROOT_FRESH_GATE',sourceCommit,sourceBound:cleanBefore&&git('rev-parse','HEAD')===sourceCommit&&git('status','--porcelain','--untracked-files=no')==='',status:'FAIL',tests:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped'),exitClass:p.error?.code==='ETIMEDOUT'?'TIMEOUT':p.status===null?'UNKNOWN':p.status===0?'ZERO':'NONZERO',failures:failed,rawOutputStored:false};
if(r.sourceBound&&p.status===0&&r.tests>=131&&r.pass===r.tests&&r.fail===0&&r.skipped===0&&failed.length===0)r.status='PASS';
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(r)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify(r)+'\n');process.exitCode=r.status==='PASS'?0:1;
