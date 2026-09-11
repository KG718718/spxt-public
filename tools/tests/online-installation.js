'use strict';
// Hosted-only real online setup. Never creates a local developer installation.
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Hosted Windows execution only');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),work=path.join(root,'.test-work','online-installer');
fs.mkdirSync(work,{recursive:true});
const evidence=path.join(root,'.test-work','online-installer-evidence');fs.mkdirSync(evidence,{recursive:true});
let count=0,checks=[],running=null,browser=null;
async function check(name,fn){await fn();checks.push(name);count++;console.log('PASS '+name);}
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function inventory(dir){let r={};if(!fs.existsSync(dir))return r;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())for(const [k,v]of Object.entries(inventory(p)))r[e.name+'/'+k]=v;else r[e.name]=sha(fs.readFileSync(p));}return r;}
function command(exe,args,options={}){return new Promise(resolve=>{let output='';const child=cp.spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],...options});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.once('error',e=>resolve({code:-1,output:output+e.message}));child.once('exit',code=>resolve({code,output}));});}
async function start(target){
 const child=cp.spawn('cmd.exe',['/d','/s','/c','""'+path.join(target,'Start.cmd')+'" --no-browser --port 0"'],{windowsVerbatimArguments:true,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,KSESSION_SKIP_STARTUP_JOBS:'1'}});let output='',port=0;
 child.stdout.on('data',b=>{output+=b;const m=output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/);if(m)port=+m[1];});child.stderr.on('data',b=>output+=b);
 const stopped=new Promise(r=>child.once('exit',r));
 for(let i=0;i<300&&!port&&child.exitCode===null;i++)await new Promise(r=>setTimeout(r,100));
 assert.ok(port,'Launcher failed: '+output);
 return {child,port,get output(){return output;},async stop(){child.stdin.end('stop\n');await stopped;},async call(url,{method='GET',body,token}={}){const res=await fetch('http://127.0.0.1:'+port+url,{method,headers:{Origin:'http://127.0.0.1:'+port,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});let data=await res.text();try{data=JSON.parse(data);}catch{}return {status:res.status,data};}};
}
(async()=>{
 let failure;try{
 const common=require('../installer/install-common');
 const {buildOnline}=require('../build-online-package');
 await check('unsafe target paths, links and ambiguous paths rejected',()=>{
  for(const p of ['../escape','/escape','C:/escape','a\\b','a//b','a/../b','.env'])assert.throws(()=>common.safeRelative(p));
  assert.equal(common.safeRelative('tools/ocr/ocr_invoice.py'),'tools/ocr/ocr_invoice.py');
 });
 const bundle=path.join(work,'安装包 with spaces');const built=buildOnline(root,bundle);
 await check('source-only online package has no instance or binaries',()=>{
  assert.equal(built.manifest.businessDataIncluded,false);assert.equal(built.manifest.runtimeIncluded,false);
  for(const name of Object.keys(inventory(bundle)))assert.doesNotMatch(name,/\.(exe|dll|node|dpapi)$|(^|\/)(data\.json|config\.json|node_modules|attachments|backups)(\/|$)/i);
  assert.equal(common.verifyPayload(bundle).files.length,32);
 });
 const target=path.join(work,'正式安装 中文 ! space');
 const bootstrap=await command('cmd.exe',['/d','/s','/c','""'+path.join(bundle,'Install.cmd')+'" --target "'+target+'""'],{windowsVerbatimArguments:true,env:{...process.env,KSESSION_INSTALL_NONINTERACTIVE:'1'}});
 fs.writeFileSync(path.join(evidence,'bootstrap.log'),bootstrap.output);
 await check('real CMD bootstrap downloads pinned official Node and installs npm lock',()=>assert.equal(bootstrap.code,0,bootstrap.output));
 const dist=JSON.parse(fs.readFileSync(path.join(bundle,'distribution.json')));
 const activeFile=path.join(target,'active.json'),active=JSON.parse(fs.readFileSync(activeFile));
 await check('runtime archive hash, Node version, payload and original licenses preserved',()=>{
  assert.equal(sha(fs.readFileSync(path.join(target,'runtime','node.exe'))),dist.nodeExeSha256);
  assert.equal(cp.execFileSync(path.join(target,'runtime','node.exe'),['--version'],{encoding:'utf8'}).trim(),'v'+dist.nodeVersion);
  assert.ok(fs.existsSync(path.join(target,'runtime','LICENSE')));
  assert.ok(fs.existsSync(path.join(target,'versions',active.release,'app','node_modules','nodemailer','LICENSE')));
  assert.equal(fs.existsSync(path.join(target,'instance','data.json')),false);
 });
 const archive=JSON.parse(fs.readFileSync(path.join(target,'installation.json'))).bootstrapArchive;
 async function install(to=target,from=bundle){return command(path.join(target,'runtime','node.exe'),[path.join(from,'installer.js'),'--target',to,'--runtime',path.join(target,'runtime'),'--archive',archive],{env:process.env});}
 const foreign=path.join(work,'unknown-existing');fs.mkdirSync(foreign);fs.writeFileSync(path.join(foreign,'keep.txt'),'must survive');
 await check('unknown nonempty destination is refused without changes',async()=>{const before=inventory(foreign);const r=await install(foreign);assert.notEqual(r.code,0);assert.deepEqual(inventory(foreign),before);});
 running=await start(target);
 await check('new installation exposes setup only on loopback',async()=>{assert.equal((await running.call('/api/setup')).data.initializationRequired,true);assert.match(running.output,/127\.0\.0\.1/);});
 const {chromium}=require('playwright-core');browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+running.port+'/login.html');await page.locator('#setupForm').waitFor({state:'visible'});
 await page.screenshot({path:path.join(evidence,'01-installed-first-admin.png'),fullPage:true});
 await check('installed real page creates first Admin with no embedded account',async()=>{
  assert.equal(await page.locator('#setupUsername').inputValue(),'');
  await page.locator('#setupUsername').fill('installer-admin');await page.locator('#setupPassword').fill('Synthetic-Install-Secret-42');await page.locator('#setupConfirm').fill('Synthetic-Install-Secret-42');await page.locator('#setupSubmitButton').click();await page.locator('#loginForm').waitFor({state:'visible'});
  const data=JSON.parse(fs.readFileSync(path.join(target,'instance','data.json')));assert.equal(data.users.length,1);for(const k of ['applications','payments','debts','suppliers','clients','invoices'])assert.deepEqual(data[k],[]);
 });
 await page.locator('#username').fill('installer-admin');await page.locator('#password').fill('Synthetic-Install-Secret-42');await page.locator('#loginSubmitButton').click();await page.waitForURL('**/approval.html');

 await check('new unconfigured Admin can view an empty approval list without initialization failure',async()=>{
  await page.waitForFunction(()=>document.getElementById('approvalFilterSummary')?.textContent!=='审批记录未加载');
  assert.doesNotMatch(await page.locator('body').innerText(),/初始化失败|审批配置尚未就绪/);
  assert.match(await page.locator('#approvalInitializationError').innerText(),/未配置.*税率|税率.*未配置/);
  const rate=await page.evaluate(()=>{try{return {value:getTaxRate()};}catch(e){return {error:e.message};}});assert.match(rate.error,/税率/);
 });

 await page.screenshot({path:path.join(evidence,'02-installed-login.png'),fullPage:true});
 const login=await running.call('/api/login',{method:'POST',body:{username:'installer-admin',password:'Synthetic-Install-Secret-42'}}),token=login.data.token;assert.equal(login.status,200);

 await check('unconfigured employee form shows a configuration prompt without computing null as zero',async()=>{
  const created=await running.call('/api/users',{method:'POST',token,body:{username:'installer-employee',password:'Synthetic-Employee-Secret-42',role:'user'}});
  assert.equal(created.status,200,JSON.stringify(created));
  const ec=await browser.newContext({viewport:{width:1440,height:1000}}),ep=await ec.newPage();
  ep.on('pageerror',e=>errors.push(e.message));ep.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
  try{
   await ep.goto('http://127.0.0.1:'+running.port+'/login.html');await ep.locator('#loginForm').waitFor({state:'visible'});
   await ep.locator('#username').fill('installer-employee');await ep.locator('#password').fill('Synthetic-Employee-Secret-42');await ep.locator('#loginSubmitButton').click();await ep.waitForURL('**/approval.html');
   await ep.waitForFunction(()=>typeof authoritativeDataReady!=='undefined'&&authoritativeDataReady===true);
   await ep.locator('#contractAmount').fill('1000');await ep.waitForFunction(()=>document.getElementById('totalTax')?.textContent==='待配置');
   assert.doesNotMatch(await ep.locator('body').innerText(),/初始化失败/);assert.match(await ep.locator('#approvalInitializationError').innerText(),/税率/);
   const data=JSON.parse(fs.readFileSync(path.join(target,'instance','data.json')));for(const k of ['applications','payments','invoices'])assert.deepEqual(data[k],[]);
   await ep.screenshot({path:path.join(evidence,'03-unconfigured-employee.png'),fullPage:true});
  }finally{await ec.close();}
 });

 await check('new Admin explicitly configures tax; zero is not missing',async()=>{
  const before=await running.call('/api/config',{token});assert.equal(before.data.taxRate,null);
  const r=await running.call('/api/config',{method:'PUT',token,body:{taxRate:0,expectedVersion:before.data.configVersion}});
  assert.equal(r.status,200,JSON.stringify(r));assert.equal((await running.call('/api/config',{token})).data.taxRate,0);
 });
 await page.reload();await page.waitForFunction(()=>document.getElementById('approvalFilterSummary')?.textContent!=='审批记录未加载');
 await check('explicit zero restores a normal empty approval page',async()=>{assert.doesNotMatch(await page.locator('body').innerText(),/初始化失败|尚未配置税率/);assert.equal(await page.evaluate(()=>getTaxRate()),0);});
 await check('second launcher and installing while running fail without instance changes',async()=>{
  const before=inventory(path.join(target,'instance')),pointer=fs.readFileSync(activeFile,'utf8');
  const second=await command(path.join(target,'runtime','node.exe'),[path.join(target,'launcher.js'),'--no-browser','--port','0']);assert.notEqual(second.code,0);assert.match(second.output,/lock|running/i);
  const re=await install();assert.notEqual(re.code,0);assert.match(re.output,/lock|running/i);
  assert.equal(fs.readFileSync(activeFile,'utf8'),pointer);assert.deepEqual(inventory(path.join(target,'instance')),before);
 });
 await check('actual installed browser has no runtime or console errors',()=>assert.deepEqual(errors,[]));await browser.close();browser=null;
 await running.stop();running=null;
 const saved=inventory(path.join(target,'instance'));
 await check('same-version reinstall is idempotent and preserves instance bytes',async()=>{const r=await install();assert.equal(r.code,0,r.output);assert.deepEqual(inventory(path.join(target,'instance')),saved);assert.equal(JSON.parse(fs.readFileSync(activeFile)).release,active.release);});
 running=await start(target);
 await check('restart keeps Admin and config and does not reopen setup',async()=>{assert.equal((await running.call('/api/setup')).data.initializationRequired,false);const r=await running.call('/api/login',{method:'POST',body:{username:'installer-admin',password:'Synthetic-Install-Secret-42'}});assert.equal(r.status,200);assert.equal((await running.call('/api/config',{token:r.data.token})).data.taxRate,0);});
 await running.stop();running=null;
 const stable=inventory(path.join(target,'instance')),pointer=fs.readFileSync(activeFile,'utf8');
 await check('payload corruption is rejected before any instance or pointer change',async()=>{
  const app=path.join(bundle,'payload','server.js'),prior=fs.readFileSync(app);fs.appendFileSync(app,'\n// tamper');try{const r=await install();assert.notEqual(r.code,0);assert.match(r.output,/checksum/i);assert.equal(fs.readFileSync(activeFile,'utf8'),pointer);assert.deepEqual(inventory(path.join(target,'instance')),stable);}finally{fs.writeFileSync(app,prior);}
 });

 await check('installed dependency corruption prevents launch and reinstall without data writes',async()=>{
  const file=path.join(target,'versions',active.release,'app','node_modules','nodemailer','package.json'),original=fs.readFileSync(file);fs.appendFileSync(file,'\n ');
  try{const r=await install();assert.notEqual(r.code,0);assert.match(r.output,/dependency checksum/i);const launch=await command(path.join(target,'runtime','node.exe'),[path.join(target,'launcher.js'),'--no-browser']);assert.notEqual(launch.code,0);assert.match(launch.output,/dependency checksum/i);assert.deepEqual(inventory(path.join(target,'instance')),stable);assert.equal(fs.readFileSync(activeFile,'utf8'),pointer);}finally{fs.writeFileSync(file,original);}
 });
 await check('invalid port refuses launch without touching instance',async()=>{
  const r=await command(path.join(target,'runtime','node.exe'),[path.join(target,'launcher.js'),'--no-browser','--port','70000']);assert.notEqual(r.code,0);assert.deepEqual(inventory(path.join(target,'instance')),stable);
 });
 await check('unofficial npm source is refused before installation changes',()=>{
  const file=path.join(bundle,'payload','package-lock.json'),original=fs.readFileSync(file),value=JSON.parse(original);value.packages['node_modules/fflate'].resolved='https://example.com/untrusted.tgz';fs.writeFileSync(file,JSON.stringify(value));
  try{assert.throws(()=>common.verifyNpm(path.join(bundle,'payload')),/Non-official/);assert.deepEqual(inventory(path.join(target,'instance')),stable);}finally{fs.writeFileSync(file,original);}
 });
 await check('real npm integrity failure leaves active program and instance unchanged',async()=>{
  const lockFile=path.join(bundle,'payload','package-lock.json'),mf=path.join(bundle,'payload-manifest.json'),priorLock=fs.readFileSync(lockFile),priorManifest=fs.readFileSync(mf);
  const lock=JSON.parse(priorLock);lock.packages['node_modules/fflate'].integrity='sha512-'+Buffer.alloc(64).toString('base64');fs.writeFileSync(lockFile,JSON.stringify(lock,null,2)+'\n');
  const m=JSON.parse(priorManifest),r=m.files.find(x=>x.path==='package-lock.json'),b=fs.readFileSync(lockFile);r.bytes=b.length;r.sha256=sha(b);fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');
  try{const result=await install();fs.writeFileSync(path.join(evidence,'expected-integrity-failure.log'),result.output);assert.notEqual(result.code,0);assert.match(result.output,/integrity|checksum/i);assert.equal(fs.readFileSync(activeFile,'utf8'),pointer);assert.deepEqual(inventory(path.join(target,'instance')),stable);}finally{fs.writeFileSync(lockFile,priorLock);fs.writeFileSync(mf,priorManifest);}
 });

 await check('same-schema upgrade keeps prior program and complete instance',async()=>{
  const app=path.join(bundle,'payload','server.js');fs.appendFileSync(app,'\n// synthetic same-schema program upgrade\n');
  const mf=path.join(bundle,'payload-manifest.json'),m=JSON.parse(fs.readFileSync(mf)),r=m.files.find(f=>f.path==='server.js'),b=fs.readFileSync(app);r.bytes=b.length;r.sha256=sha(b);fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');
  const result=await install();assert.equal(result.code,0,result.output);
  assert.notEqual(JSON.parse(fs.readFileSync(activeFile)).release,active.release);assert.ok(fs.existsSync(path.join(target,'versions',active.release,'app','server.js')));assert.deepEqual(inventory(path.join(target,'instance')),stable);
 });
 await check('stopped whole-installation copy restores bytes and login',async()=>{
  const restored=path.join(work,'restored copy 中文');fs.cpSync(target,restored,{recursive:true,errorOnExist:true,force:false});
  assert.deepEqual(inventory(path.join(restored,'instance')),stable);running=await start(restored);
  const r=await running.call('/api/login',{method:'POST',body:{username:'installer-admin',password:'Synthetic-Install-Secret-42'}});assert.equal(r.status,200);assert.equal((await running.call('/api/config',{token:r.data.token})).data.taxRate,0);
  await running.stop();running=null;
 });
 fs.writeFileSync(path.join(evidence,'K-SESSION-online-setup.zip'),built.bytes);
 fs.writeFileSync(path.join(evidence,'PACKAGE-MANIFEST.json'),JSON.stringify(built.manifest,null,2)+'\n');
 fs.writeFileSync(path.join(evidence,'SHA256SUMS.txt'),built.sha256+'  K-SESSION-online-setup.zip\n');
 }catch(e){failure=e;}finally{
 if(browser)await browser.close();if(running)await running.stop();
 fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify({success:!failure,passed:count,checks,error:failure?.stack||null,scope:'Hosted Windows online install; all accounts and data synthetic; no LAN two-device claim'},null,2));
 }if(failure)throw failure;console.log('Online installer: '+count+' passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
