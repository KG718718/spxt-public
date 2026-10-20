'use strict';
// Local end-to-end source admission with synthetic API/control/governance Git
// objects. Real repair/safety/source blobs are read from the original checkout.
// No network, checkout, actual trigger, real Review or product process is used.
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),g=require('./fc3-contract.cjs'),f=require('./fc3-fixtures.cjs');
for(const [slot,badReview] of [['FC3',false],['FQ1',false],['FC3',true],['FQ1',true]])test('full '+slot+' bootstrap '+(badReview?'rejects bad review before execution':'dispatch source runner proof archive outputs without trigger writes'),async t=>{
 const x=f.fixture(slot),source=x.input.testedSource,current=x.env.sha,qa=slot==='FQ1',reviewed=qa?'d'.repeat(40):source;
 x.input.reviewedSource=reviewed;x.input.approvalMarker='FINAL_FRESH_FC3_MASTER_REVIEWED_'+slot+'_'+reviewed;
 if(badReview){x.review.status='FAIL';x.facts.masterReviewBytes=Buffer.from(JSON.stringify(x.review));}
 const root=fs.mkdtempSync(path.join(f.repo,'.test-work/fc3-bootstrap-owned-')),output=path.join(root,'outputs');fs.writeFileSync(path.join(root,'.owned.json'),'{"kind":"FC3_BOOTSTRAP_STUB_ONLY"}');fs.writeFileSync(output,'',{flag:'wx'});
 const realGit=cp.execFileSync,realRead=fs.readFileSync,realSpawn=cp.spawnSync,before=realRead(g.TRIGGER),actualHead=realGit('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();let virtualHead=current,checkoutCalls=0,archiveReads=0;
 const text=(v,o)=>o?.encoding?v:Buffer.from(v),apiRows=new Map(),archive=Buffer.from('OWNED_SYNTHETIC_ARCHIVE_NOT_PRODUCT');
 const env={...x.facts.runner.environment,GH_TOKEN:'OWNED_TEST_PLACEHOLDER',GITHUB_OUTPUT:output};const saved=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
 t.mock.method(fs,'readFileSync',(p,...args)=>String(p)===path.join(f.repo,g.TRIGGER)?Buffer.from(JSON.stringify(x.input)):realRead(p,...args));
 t.mock.method(cp,'execFileSync',(exe,args,o)=>{
  if(exe!=='git')return realGit(exe,args,o);const v=args.slice(0,2).join(' ')==='-C '+f.repo?args.slice(2):args;
  if(v.includes('checkout')){checkoutCalls++;virtualHead=source;return text('',o);}
  if(v[0]==='rev-parse'&&v[1]==='HEAD')return text(virtualHead+'\n',o);
  if(v[0]==='rev-list'&&v.at(-1)===current)return text(current+' '+reviewed+'\n',o);
  if(qa&&v[0]==='rev-list'&&v.at(-1)===x.facts.runner.referenceRun.head_sha)return text(x.facts.runner.referenceRun.head_sha+' '+source+'\n',o);
  if(v[0]==='diff'&&v.includes('--name-only')&&(v.at(-1)===current||qa&&v.at(-1)===x.facts.runner.referenceRun.head_sha))return text(g.TRIGGER+'\n',o);
  if(v[0]==='log'&&(v.length===3||v.at(-1)===current))return text(x.env.title+'\n',o);
  if(qa&&v[0]==='log'&&v.at(-1)===x.facts.runner.referenceRun.head_sha)return text(x.facts.runner.referenceRun.display_title+'\n',o);
  if(v[0]==='show'&&v[1]===reviewed+':'+g.PROOF)return text(x.bytes.toString('utf8'),o);
  if(v[0]==='show'&&v[1]===reviewed+':'+g.REVIEW)return text(x.facts.masterReviewBytes.toString('utf8'),o);
  if(v[0]==='merge-base'&&(v.includes(current)||qa&&(v.includes(reviewed)||v.includes(x.facts.runner.referenceRun.head_sha))))return text('',o);
  // Only the governance alias is synthetic; code and safety blobs stay real.
  if(qa&&['ls-tree','rev-parse','show'].includes(v[0])&&v.some(s=>s===reviewed||s.startsWith(reviewed+':'))){const changed=args.map(s=>s===reviewed?source:s.startsWith(reviewed+':')?source+s.slice(reviewed.length):s);return realGit(exe,changed,o);}
  return realGit(exe,args,o);
 });
 t.mock.method(cp,'spawnSync',(exe,args,o)=>{if(exe==='pwsh'&&args.includes('-Zip')&&args.includes('TRIAL')){archiveReads++;return{status:0,stderr:Buffer.alloc(0),stdout:Buffer.from(JSON.stringify(x.facts.candidateReport))};}return realSpawn(exe,args,o);});
 apiRows.set('actions/runs/900',{...x.facts.runner.currentRun,workflow_id:777});apiRows.set('actions/workflows/777/runs?per_page=100&page=1',{total_count:x.history.length,workflow_runs:x.history});
 for(const p of g.LEGACY)apiRows.set('actions/workflows/'+p.split('/').at(-1)+'/runs?per_page=100&page=1',{total_count:x.facts.legacy[p].length,workflow_runs:x.facts.legacy[p]});
 apiRows.set('actions/runs/'+x.facts.runner.referenceRun.id,x.facts.runner.referenceRun);
 apiRows.set('actions/runs/900/attempts/1/jobs?per_page=100&page=1',x.facts.runner.currentJobs);apiRows.set('actions/runs/'+x.facts.runner.referenceRun.id+'/attempts/1/jobs?per_page=100&page=1',x.facts.runner.referenceJobs);
 if(qa)apiRows.set('actions/artifacts/601',{id:601,expired:false,workflow_run:{id:501,head_sha:x.facts.runner.referenceRun.head_sha,head_branch:'codex/lan-fresh-trial-v1.1'},name:g.CANDIDATE_PREFIX+source,size_in_bytes:archive.length,digest:'sha256:'+require('./fc2-final.cjs').sha(archive)});
 t.mock.method(globalThis,'fetch',async url=>{const route=new URL(url).pathname.replace('/repos/KG718718/spxt-public/','')+new URL(url).search;if(route==='actions/artifacts/601/zip'&&qa)return{status:200,arrayBuffer:async()=>archive};a.ok(apiRows.has(route),'unknown stub route');return{status:200,json:async()=>structuredClone(apiRows.get(route))};});
 try{
  if(badReview){await a.rejects(()=>require('../../../windows-installer/fresh-trial/final-install-lan/bootstrap.cjs').main(f.repo,root));a.equal(checkoutCalls,0);a.equal(fs.existsSync(path.join(root,'context.json')),false);a.equal(fs.existsSync(path.join(root,'candidate-metadata.json')),false);a.deepEqual(realRead(g.TRIGGER),before);a.equal(realRead(output,'utf8'),'');return;}
  await require('../../../windows-installer/fresh-trial/final-install-lan/bootstrap.cjs').main(f.repo,root);
  const c=JSON.parse(realRead(path.join(root,'context.json')));g.context(c);a.equal(c.sourceCommit,source);a.equal(c.installCandidate.schema,3);a.equal(c.installCandidate.reviewedSource,reviewed);a.equal(checkoutCalls,1);a.equal(archiveReads,qa?1:0);a.equal(realGit('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),actualHead);a.deepEqual(realRead(g.TRIGGER),before);
  const report=JSON.parse(realRead(path.join(root,'fresh-report.json')));a.equal(report.schema,2);a.equal(report.stage,'SOURCE');a.equal(report.status,'FAIL');a.equal(report.setupSha256,qa?x.input.candidateSetupSha256:null);
  const written=realRead(output,'utf8');a.ok(written.includes('mode='+x.input.mode+'\n'));a.ok(written.includes('candidateArtifactName='+g.CANDIDATE_PREFIX+source+'\n'));
  if(qa){const m=JSON.parse(realRead(path.join(root,'candidate-metadata.json')));a.equal(m.setupSha256,x.input.candidateSetupSha256);a.equal(m.testedSource,source);a.deepEqual(realRead(path.join(root,'candidate.zip')),archive);}
  a.equal(require('../../../windows-installer/fresh-trial/install-candidate/context.cjs').check(c,env,x.facts.testedTree),true);a.equal(g.boundContext(f.repo,c),true);
  const reviewBytes=x.facts.masterReviewBytes;x.facts.masterReviewBytes=Buffer.from('{}');a.throws(()=>g.boundContext(f.repo,c));x.facts.masterReviewBytes=reviewBytes;
  const proofBytes=x.bytes;x.bytes=Buffer.from('{}');a.throws(()=>g.boundContext(f.repo,c));x.bytes=proofBytes;
 }finally{for(const[k,v]of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
