'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const [output,commit]=process.argv.slice(2);
assert.ok(output&&/^[a-f0-9]{40}$/.test(commit));assert.equal(fs.existsSync(output),false);
const files=['compatibility.test.cjs','transaction.test.cjs'].map(name=>path.join(__dirname,name));
const result=cp.spawnSync(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...files],
  {encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
const tap=String(result.stdout||'');
const number=name=>{const match=tap.match(new RegExp('^# '+name+' (\\d+)$','m'));return match?Number(match[1]):-1;};
const tests=number('tests'),pass=number('pass'),fail=number('fail'),skipped=number('skipped');
const checks={};
for(let n=1;n<=15;n++){
  const id='C'+String(n).padStart(2,'0');
  checks[id]={status:result.status===0&&new RegExp('\\b'+id+'\\b').test(tap)?'PASS':'FAIL',method:'node:test exact closed compatibility assertion'};
}
const status=result.status===0&&fail===0&&skipped===0&&Object.values(checks).every(check=>check.status==='PASS')?'PASS':'FAIL';
const report={schema:1,status,sourceCommit:commit,acceptedProfile:'accepted-f3-run-36246132535',
  runtimeTrust:'REPOSITORY_FIXED_ANCHORS',onlineArtifactRequiredAtRuntime:false,tests,pass,fail,skipped,checks};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(status!=='PASS')process.exitCode=1;
