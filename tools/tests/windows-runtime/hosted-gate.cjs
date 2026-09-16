'use strict';
// Adds evidence around the existing runner; does not change any suite or expected result.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os'),assert=require('node:assert/strict');
const {writeJSON,writeNew,sha}=require('../../windows-runtime/common.cjs');
if(process.env.GITHUB_ACTIONS!=='true'||process.platform!=='win32')throw Error('Hosted Windows only');
const repo=path.resolve(__dirname,'../../..'),out=path.join(repo,'.test-work/r5a-gate');
fs.mkdirSync(out,{recursive:true});
const identity={sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,node:process.version,os:os.release(),qualification:'GitHub Hosted Windows Server; NOT Windows 10/11 consumer validation'};
if(process.argv[2]==='preflight'){
 const root=fs.mkdtempSync(path.join(repo,'.test-work/r5a-symlink-')),r={...identity,file:false,directory:false,status:'FAIL'};
 try{
  fs.writeFileSync(path.join(root,'target.txt'),'synthetic');fs.mkdirSync(path.join(root,'directory'));
  fs.symlinkSync(path.join(root,'target.txt'),path.join(root,'file-link'),'file');
  assert.ok(fs.lstatSync(path.join(root,'file-link')).isSymbolicLink());assert.equal(fs.readFileSync(path.join(root,'file-link'),'utf8'),'synthetic');r.file=true;
  fs.symlinkSync(path.join(root,'directory'),path.join(root,'directory-link'),'dir');
  assert.ok(fs.lstatSync(path.join(root,'directory-link')).isSymbolicLink());assert.equal(fs.realpathSync(path.join(root,'directory-link')),fs.realpathSync(path.join(root,'directory')));r.directory=true;r.status='PASS';
 }catch(e){r.error=e.message;process.exitCode=1;}finally{writeJSON(path.join(out,'symlink.json'),r);console.log(JSON.stringify(r));}
}else if(process.argv[2]==='regression'){
 const pre=JSON.parse(fs.readFileSync(path.join(out,'symlink.json')));assert.equal(pre.status,'PASS');assert.equal(pre.sourceCommit,identity.sourceCommit);
 const p=cp.spawnSync(process.execPath,['tools/tests/run-public-tests.js'],{cwd:repo,env:process.env,windowsHide:true,encoding:'utf8',timeout:20*60*1000,maxBuffer:32*1024*1024});
 const stdout=p.stdout||'',stderr=p.stderr||'';process.stdout.write(stdout);process.stderr.write(stderr);
 writeNew(path.join(out,'stdout.log'),stdout);writeNew(path.join(out,'stderr.log'),stderr);
 const sections=stdout.split(/\r?\nRUN /).slice(1),suites=sections.map(section=>{
  const name=section.split(/\r?\n/)[0].trim();
  const summary=section.split(/\r?\n/).filter(l=>/^Public /.test(l)&&/passed/i.test(l)).at(-1);
  let count;
  if(name==='public-foundation.test.js'){const l=section.split(/\r?\n/).find(l=>l.startsWith('{"suite":"public-foundation"'));if(l)count=JSON.parse(l).passed;}
  else if(summary){const m=summary.match(/(\d+)(?:\/\d+)? (?:checks )?passed/i)||summary.match(/passed:\s*(\d+)/i);if(m)count=+m[1];}
  const skipped=/^SKIP /m.test(section),failed=stderr.includes('FAIL '+name+':')||/^FAIL /m.test(section);
  return{name,reportedChecks:count??null,skipped,pass:!failed&&!skipped&&Number.isInteger(count)};
 });
 const r={...identity,preflight:pre,status:'FAIL',suiteTotal:suites.length,suitePass:suites.filter(s=>s.pass).length,suiteFail:suites.filter(s=>!s.pass&&!s.skipped).length,skipped:suites.filter(s=>s.skipped).length,testTotal:suites.reduce((n,s)=>n+(s.reportedChecks||0),0),countDefinition:'sum of suite-reported checks, not individual assert calls',suites,exitCode:p.status,signal:p.signal,stdoutSha256:sha(stdout),stderrSha256:sha(stderr)};
 if(p.status===0&&suites.length===26&&suites.every(s=>s.pass)&&!r.skipped)r.status='PASS';
 r.pass=r.status==='PASS'?r.testTotal:null;r.fail=r.status==='PASS'?0:null;
 writeJSON(path.join(out,'regression.json'),r);console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=1;
}else throw Error('Expected preflight or regression');
