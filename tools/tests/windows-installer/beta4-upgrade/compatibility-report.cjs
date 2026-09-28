'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const [output,commit]=process.argv.slice(2);
assert.ok(output&&/^[a-f0-9]{40}$/.test(commit));assert.equal(fs.existsSync(output),false);
const files=['compatibility.test.cjs','transaction.test.cjs','lock-lifecycle.test.cjs'].map(name=>path.join(__dirname,name));
const result=cp.spawnSync(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...files],
  {encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
const tap=String(result.stdout||'');
const number=name=>{const match=tap.match(new RegExp('^# '+name+' (\\d+)$','m'));return match?Number(match[1]):-1;};
const tests=number('tests'),pass=number('pass'),fail=number('fail'),skipped=number('skipped');
const passedNames=new Set([...tap.matchAll(/^ok \d+ - (.+)$/gm)].map(match=>match[1]));
const combined='C08 C09 C10 C11 C12 commit preserves instance, account, attachment, LAN config, port and interface while finalizing beta4';
const expected={
  C01:['C01 accepted F3 evidence produces the only closed beta2 to beta4 profile'],
  C02:['C02 unknown beta2 profile is rejected'],C03:['C03 same version with any changed installed anchor is rejected'],
  C04:['C04 same source with a different build identity or expanded bundle is rejected'],
  C05:['C05 beta1 direct to beta4 route is rejected'],C06:['C06 beta4 same-version route and registered beta4 snapshot are rejected'],
  C07:['C07 beta4 to beta2 downgrade route remains rejected'],C08:[combined],C09:[combined],C10:[combined],C11:[combined],C12:[combined],
  C13:['C13 fault after-old-program restores beta2 owned state and leaves instance byte-identical',
    'C13 fault after-new-program restores beta2 owned state and leaves instance byte-identical',
    'C13 fault after-metadata restores beta2 owned state and leaves instance byte-identical',
    'C13 install-state temporary write failure restores exact beta2 state bytes',
    'C13 install-state temporary rename failure restores exact beta2 state bytes'],
  C14:['C14 runtime trust is repository-local and never depends on Artifact availability'],
  C15:['C15 bundle and fixed diagnostics contain no path, secret, business body, or account content']
};
const checks={};
for(let n=1;n<=15;n++){
  const id='C'+String(n).padStart(2,'0');
  checks[id]={status:result.status===0&&expected[id].every(name=>passedNames.has(name))?'PASS':'FAIL',method:'node:test exact passed-subtest mapping'};
}
const status=result.status===0&&fail===0&&skipped===0&&Object.values(checks).every(check=>check.status==='PASS')?'PASS':'FAIL';
const report={schema:1,status,sourceCommit:commit,acceptedProfile:'accepted-f3-run-36246132535',
  runtimeTrust:'REPOSITORY_FIXED_ANCHORS',onlineArtifactRequiredAtRuntime:false,tests,pass,fail,skipped,checks};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(status!=='PASS')process.exitCode=1;
