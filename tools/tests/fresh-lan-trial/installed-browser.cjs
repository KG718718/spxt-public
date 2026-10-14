'use strict';
// This driver never spawns a repository server or preloads a discovery adapter.
// It consumes only an already running, independently verified installed Launcher service.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {verify}=require('../../windows-portable/package-lan.cjs');
const {inventory,sha}=require('../../windows-runtime/common.cjs');
function installedIdentity(installRoot,sourceCommit){
 const root=fs.realpathSync(installRoot),program=path.join(root,'program');
 assert.equal(fs.lstatSync(installRoot).isSymbolicLink(),false);
 const info=JSON.parse(fs.readFileSync(path.join(root,'uninstall/build-info.json')));
 assert.equal(info.mode,'fresh-trial');assert.equal(info.sourceCommit,sourceCommit);
 assert.equal(info.appVersion,'1.0.0');assert.equal(info.dataContractVersion,1);
 const manifestBytes=fs.readFileSync(path.join(root,'uninstall/installer-manifest.json'));
 assert.equal(sha(manifestBytes),info.programManifestHash);
 const manifest=JSON.parse(manifestBytes);assert.equal(manifest.sourceCommit,sourceCommit);
 assert.deepEqual(inventory(program),manifest.payload);
 const portable=verify(program);assert.equal(portable.sourceCommit,sourceCommit);
 assert.equal(portable.launcherSha256,info.launcherSha256);assert.equal(portable.firewallHelperSha256,info.firewallHelperSha256);
 assert.equal(portable.manifestSha256,info.runtimeManifestSha256);
 for(const f of manifest.payload)assert.ok(!/^app\/(?:tools\/tests\/|tests?\/|\.git\/)|^app\/tools\/.*discovery-preload\.cjs$/i.test(f.path),'test payload rejected');
 assert.equal(JSON.parse(fs.readFileSync(path.join(program,'manifest/runtime-manifest.json'))).deriveProfile?.profile,'fresh-trial');
 return {program,info};
}
function clientReadback(response,name){
 assert.equal(response.status,200);assert.ok(response.data&&typeof response.data==='object'&&!Array.isArray(response.data));
 assert.ok(Array.isArray(response.data.records));assert.ok(response.data.records.some(c=>c.fullName===name));return true;
}
async function authenticatedCall(page,route,method='GET',body){
 return page.evaluate(async({route,method,body})=>{
  const token=localStorage.getItem('token');
  const r=await fetch(route,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
 },{route,method,body});
}
async function login(page,origin,username,password){
 await page.goto(origin+'/login.html',{waitUntil:'domcontentloaded'});
 await page.locator('#loginForm').waitFor({state:'visible'});
 await page.locator('#username').fill(username);await page.locator('#password').fill(password);
 await Promise.all([page.waitForURL(origin+'/approval.html'),page.locator('#loginSubmitButton').click()]);
 const a=await authenticatedCall(page,'/api/check-auth');assert.equal(a.status,200);assert.equal(a.data.authenticated,true);assert.equal(a.data.username,username);
}
function syntheticPDF(){
 const stream='BT /F1 12 Tf 30 750 Td (Fresh trial synthetic attachment) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
 let b='%PDF-1.4\n',offsets=[0];for(const [i,o] of objects.entries()){offsets.push(Buffer.byteLength(b));b+=(i+1)+' 0 obj\n'+o+'\nendobj\n';}const xref=Buffer.byteLength(b);b+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return Buffer.from(b);
}
async function runInstalledBrowser({installRoot,sourceCommit,origin,chromium,verifyOwnedListener,restarted=false,credentials}){
 assert.match(origin,/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/);assert.ok(Number(new URL(origin).port)<=65535);
 const identity=installedIdentity(installRoot,sourceCommit);
 // The Windows harness must recheck TCP PID + process image + Launcher event before/after browser work.
 assert.equal(typeof verifyOwnedListener,'function');await verifyOwnedListener(identity.program,origin);
 assert.ok(chromium&&typeof chromium.launch==='function');
 const secrets=credentials||{admin:'fresh-admin',user:'fresh-user',adminPassword:'Fresh-'+crypto.randomBytes(24).toString('hex'),userPassword:'Fresh-'+crypto.randomBytes(24).toString('hex'),client:'Synthetic Fresh Trial '+crypto.randomBytes(8).toString('hex')};
 const browser=await chromium.launch({headless:true});let closed=false;
 try{
  const a=await browser.newContext({acceptDownloads:true}),b=await browser.newContext({acceptDownloads:true});assert.notEqual(a,b);
  const pa=await a.newPage(),pb=await b.newPage();
  if(!restarted){
   await pa.goto(origin+'/login.html',{waitUntil:'domcontentloaded'});
   await pa.locator('#setupForm').waitFor({state:'visible'});
   await pa.locator('#setupUsername').fill(secrets.admin);await pa.locator('#setupPassword').fill(secrets.adminPassword);await pa.locator('#setupConfirm').fill(secrets.adminPassword);
   await pa.locator('#setupSubmitButton').click();await pa.locator('#loginForm').waitFor({state:'visible'});
  }
  await login(pa,origin,secrets.admin,secrets.adminPassword);
  if(!restarted){const u=await authenticatedCall(pa,'/api/users','POST',{username:secrets.user,password:secrets.userPassword,role:'user'});assert.equal(u.status,200);}
  await login(pb,origin,secrets.user,secrets.userPassword);
  const ta=await pa.evaluate(()=>localStorage.getItem('token')),tb=await pb.evaluate(()=>localStorage.getItem('token'));assert.ok(ta&&tb&&ta!==tb);
  assert.equal((await authenticatedCall(pb,'/api/users')).status,403);
  assert.equal((await authenticatedCall(pa,'/api/users')).status,200);
  if(!restarted){const c=await authenticatedCall(pa,'/api/clients','POST',{fullName:secrets.client,note:'Synthetic browser persistence test'});assert.equal(c.status,200);assert.equal(c.data.success,true);}
  clientReadback(await authenticatedCall(pa,'/api/clients'),secrets.client);
  const pdf=syntheticPDF();
  const attachment=await pb.evaluate(async({bytes,priorPath})=>{
   const token=localStorage.getItem('token'),form=new FormData();form.set('file',new Blob([new Uint8Array(bytes)],{type:'application/pdf'}),'synthetic-fresh.pdf');
   let attachmentPath=priorPath;
   if(!attachmentPath){
    const upload=await fetch('/api/upload',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});const data=await upload.json();
    if(upload.status!==200||typeof data.path!=='string'||!/^\/attachments\/[^/]+$/.test(data.path))return {ok:false};
    attachmentPath=data.path;
   }
   if(!/^\/attachments\/[^/]+$/.test(attachmentPath))return {ok:false};
   const download=await fetch(attachmentPath,{headers:{Authorization:'Bearer '+token}});
   const actual=Array.from(new Uint8Array(await download.arrayBuffer()));
   return {ok:download.status===200&&actual.length===bytes.length&&actual.every((v,i)=>v===bytes[i]),attachmentPath};
  },{bytes:Array.from(pdf),priorPath:restarted?secrets.attachmentPath:null});assert.equal(attachment.ok,true);
  secrets.attachmentPath=attachment.attachmentPath;
  await verifyOwnedListener(identity.program,origin);
  return {witnesses:{installedServiceIdentity:true,headlessBrowser:true,twoContexts:true,twoLogins:true,authorizationIsolation:true,saveReadback:true,attachmentUploadDownload:true},credentials:secrets};
 }finally{await browser.close();closed=true;assert.equal(closed,true);}
}
module.exports={installedIdentity,runInstalledBrowser,syntheticPDF,clientReadback};
