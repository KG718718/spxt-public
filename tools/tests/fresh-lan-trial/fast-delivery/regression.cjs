'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
function parse(stdout,stderr,status,expected){
  assert.equal(expected.length,26);assert.equal(new Set(expected).size,26);
  const sections=stdout.split(/\r?\nRUN /).slice(1);
  const suites=expected.map((name,i)=>{
    const section=sections[i]||'',actual=section.split(/\r?\n/)[0].trim();
    const summary=section.split(/\r?\n/).filter(l=>/^Public /.test(l)&&/passed/i.test(l)).at(-1);
    let count=null;
    if(name==='public-foundation.test.js'){
      const line=section.split(/\r?\n/).find(l=>l.startsWith('{"suite":"public-foundation"'));
      if(line)try{count=JSON.parse(line).passed;}catch{}
    }else if(summary){const m=summary.match(/(\d+)(?:\/\d+)? (?:checks )?passed/i)||summary.match(/passed:\s*(\d+)/i);if(m)count=Number(m[1]);}
    const skipped=/^SKIP /m.test(section),failed=stderr.includes('FAIL '+name+':')||/^FAIL /m.test(section);
    return{id:'S'+String(i+1).padStart(2,'0'),name,reportedChecks:Number.isSafeInteger(count)&&count>=0?count:null,skipped,pass:actual===name&&!failed&&!skipped&&Number.isSafeInteger(count)&&count>=0};
  });
  const r={schema:1,kind:'FAST_FRESH_REGRESSION',status:'FAIL',suiteTotal:sections.length,suitePass:suites.filter(s=>s.pass).length,suiteFail:suites.filter(s=>!s.pass&&!s.skipped).length,skipped:suites.filter(s=>s.skipped).length,testTotal:suites.reduce((n,s)=>n+(s.reportedChecks||0),0),suites,pass:null,fail:null,exitClass:status===0?'ZERO':status===null?'UNKNOWN':'NONZERO',rawOutputStored:false};
  if(status===0&&sections.length===26&&suites.every(s=>s.pass)&&r.testTotal===742&&r.skipped===0){r.status='PASS';r.pass=742;r.fail=0;}
  return r;
}
function preflight(work){
  const root=fs.mkdtempSync(path.join(work,'regression-preflight-')),created=[];
  let good=false,clean=false;
  try{
    const file=path.join(root,'target.txt'),dir=path.join(root,'directory'),fl=path.join(root,'file-link'),dl=path.join(root,'directory-link');
    fs.writeFileSync(file,'synthetic',{flag:'wx'});created.push(file);fs.mkdirSync(dir);created.push(dir);
    fs.symlinkSync(file,fl,'file');created.push(fl);fs.symlinkSync(dir,dl,'dir');created.push(dl);
    assert.ok(fs.lstatSync(fl).isSymbolicLink()&&fs.lstatSync(dl).isSymbolicLink());
    assert.equal(fs.readFileSync(fl,'utf8'),'synthetic');assert.equal(fs.realpathSync(dl),fs.realpathSync(dir));good=true;
  }catch{}finally{
    try{assert.deepEqual(fs.readdirSync(root).sort(),created.map(p=>path.basename(p)).sort());
      for(const p of created.reverse()){const s=fs.lstatSync(p);if(s.isSymbolicLink()||s.isFile())fs.unlinkSync(p);else{assert.equal(fs.readdirSync(p).length,0);fs.rmdirSync(p);}}
      fs.rmdirSync(root);clean=true;
    }catch{}
  }
  return{fileAndDirectoryLinks:good,ownedFixturesRemoved:clean};
}
function main(){
  assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.GITHUB_REPOSITORY,'KG718718/spxt-public');assert.equal(process.platform,'win32');
  const [repo,work]=process.argv.slice(2);assert.equal(process.argv.length,4);
  const source=process.env.KSESSION_FRESH_TESTED_SOURCE;assert.match(source,/^[a-f0-9]{40}$/);
  const pre=preflight(work);assert.equal(pre.fileAndDirectoryLinks,true);assert.equal(pre.ownedFixturesRemoved,true);
  const expected=fs.readdirSync(path.join(repo,'tools/tests')).filter(n=>/^public-.+\.test\.js$/.test(n)).sort();
  const p=cp.spawnSync(process.execPath,['tools/tests/run-public-tests.js'],{cwd:repo,env:process.env,encoding:'utf8',windowsHide:true,timeout:20*60*1000,maxBuffer:32*1024*1024});
  const r={...parse(p.stdout||'',p.stderr||'',p.status,expected),sourceCommit:source,run:{id:process.env.GITHUB_RUN_ID,attempt:Number(process.env.GITHUB_RUN_ATTEMPT)},preflight:pre};
  fs.writeFileSync(path.join(work,'regression.json'),JSON.stringify(r)+'\n',{flag:'wx'});
  if(r.status!=='PASS')process.exitCode=1;
}
module.exports={parse,preflight};
if(require.main===module)try{main();}catch{process.stderr.write('FAST_FRESH_REGRESSION_REJECTED\n');process.exitCode=1;}
