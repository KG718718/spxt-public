'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const test=require('node:test');
const network=require('../../../../public-lan-network');
const {fixedSessionReport}=require('../../../windows-installer/beta4-upgrade/session-report.cjs');

const repo=path.resolve(__dirname,'../../../..');
const localOnly=process.env.KSESSION_BETA4_SESSION_LOOPBACK==='1';
function hostedAddress(){
  assert.equal(process.platform,'win32');
  assert.equal(process.env.GITHUB_ACTIONS,'true');
  assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
  assert.equal(process.env.GITHUB_REPOSITORY,'KG718718/spxt-public');
  const rows=[];
  for(const entries of Object.values(os.networkInterfaces()))for(const entry of entries||[]){
    const address=network.normalizeIPv4(entry.address);
    const prefixLength=network.prefixFromNetmask(entry.netmask);
    if(!entry.internal&&entry.family==='IPv4'&&address&&network.privateBlock(address)
        &&prefixLength!==null&&prefixLength<=30&&network.subnetFor(address,prefixLength))rows.push({address,prefixLength});
  }
  assert.equal(rows.length,1,'exactly one runner-owned private IPv4 required');
  return rows[0];
}
function environment(dir,extra={}){return {...process.env,KSESSION_LAN_MODE:'1',
  KSESSION_DATA_FILE:path.join(dir,'data.json'),KSESSION_CONFIG_FILE:path.join(dir,'config.json'),
  KSESSION_ATTACHMENTS_DIR:path.join(dir,'attachments'),KSESSION_BACKUPS_DIR:path.join(dir,'backups'),
  KSESSION_MAIL_CONFIG_FILE:path.join(dir,'mail-reminder.config.json'),
  KSESSION_SMTP_SECRET_FILE:path.join(dir,'runtime','secrets','smtp-pass.dpapi'),
  KSESSION_MAIL_ENABLED:'0',KSESSION_MAIL_DRY_RUN:'1',KSESSION_MAIL_FORMAL_ENABLED:'0',
  KSESSION_SKIP_STARTUP_JOBS:'1',...extra};}
async function stop(child){
  if(child.exitCode!==null||child.signalCode!==null)return;
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('synthetic server did not exit')),5000);
    child.once('exit',()=>{clearTimeout(timer);resolve()});
    child.kill();
  });
}
async function started(t,args,env,pattern){
  const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,stdio:['ignore','pipe','pipe'],env});
  t.after(()=>stop(child));
  let output='';child.stdout.on('data',part=>{output+=part.toString()});
  child.stderr.on('data',part=>{output+=part.toString()});
  for(let n=0;n<200&&!pattern.test(output)&&child.exitCode===null;n++)await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(child.exitCode,null,'server exited before readiness');
  assert.equal(pattern.test(output),true,'server readiness marker missing');
  return {child,output};
}
async function call(origin,route,options={}){
  const response=await fetch(origin+route,{...options,headers:{Origin:origin,...options.headers},signal:AbortSignal.timeout(5000)});
  return {status:response.status,data:await response.json()};
}
function body(value){return {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)};}
function syntheticPDF(){
  const stream='BT /F1 12 Tf 30 750 Td (Synthetic beta4 session attachment) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
  let text='%PDF-1.4\n',offsets=[0];
  objects.forEach((object,n)=>{offsets.push(Buffer.byteLength(text));text+=(n+1)+' 0 obj\n'+object+'\nendobj\n'});
  const xref=Buffer.byteLength(text);
  text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(text);
}
test('beta4 production handler serves independent concurrent sessions on a controlled private socket',async t=>{
  if(localOnly)assert.notEqual(process.env.GITHUB_ACTIONS,'true','loopback mode forbidden on Hosted');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-beta4-sessions-'));
  assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const admin='synthetic-admin',employee='synthetic-employee';
  const secret='Synthetic-'+crypto.randomBytes(24).toString('hex');
  const employeeSecret='Synthetic-'+crypto.randomBytes(24).toString('hex');
  const local=await started(t,[path.join(repo,'server.js')],environment(dir,{PORT:'0',KSESSION_HOST:'127.0.0.1'}),/running at http:\/\/127\.0\.0\.1:(\d+)/);
  const localPort=Number(local.output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/)[1]);
  const localOrigin='http://127.0.0.1:'+localPort;
  const created=await call(localOrigin,'/api/setup',body({username:admin,password:secret}));
  assert.equal(created.status,201);
  let host=local.child,origin=localOrigin;
  if(!localOnly){
    await stop(local.child);
    const owned=hostedAddress(),name='HostedTestEthernet';
    const reservation=await network.findAndReservePort({addresses:['127.0.0.1',owned.address]});
    const port=reservation.port;await reservation.release();
    fs.writeFileSync(path.join(dir,'lan-deployment.json'),JSON.stringify({schema:2,enabled:true,interfaceName:name,port})+'\n');
    const selected={interfaceName:name,name,address:owned.address,prefixLength:owned.prefixLength,
      subnet:network.subnetFor(owned.address,owned.prefixLength).cidr};
    const preload=path.join(repo,'tools/tests/lan-host/discovery-preload.cjs');
    host=(await started(t,['--require',preload,path.join(repo,'server.js')],environment(dir,{PORT:String(port),
      KSESSION_HOST:'127.0.0.1',KSESSION_TEST_DISCOVERY:JSON.stringify(selected)}),/LAN status: LAN_SERVER_READY/)).child;
    origin='http://'+owned.address+':'+port;
    const remoteSetup=await call(origin,'/api/setup');
    assert.equal(remoteSetup.status,403);assert.equal(remoteSetup.data.code,'REMOTE_BOOTSTRAP_CLOSED');
  }
  const loginPage=await fetch(origin+'/login.html',{signal:AbortSignal.timeout(5000)});
  assert.equal(loginPage.status,200);
  assert.ok(/login|登录/i.test(await loginPage.text()),'login page marker missing');
  const adminLogin=await call(origin,'/api/login',body({username:admin,password:secret}));
  assert.equal(adminLogin.status,200);assert.ok(typeof adminLogin.data.token==='string'&&adminLogin.data.token.length>=24);
  const adminHeaders={Authorization:'Bearer '+adminLogin.data.token};
  const createEmployee=await call(origin,'/api/users',{...body({username:employee,password:employeeSecret,role:'user'}),
    headers:{...body({}).headers,...adminHeaders}});
  assert.equal(createEmployee.status,200);
  const employeeLogin=await call(origin,'/api/login',body({username:employee,password:employeeSecret}));
  assert.equal(employeeLogin.status,200);assert.ok(typeof employeeLogin.data.token==='string'&&employeeLogin.data.token.length>=24);
  assert.ok(adminLogin.data.token!==employeeLogin.data.token,'distinct session tokens required');
  const employeeHeaders={Authorization:'Bearer '+employeeLogin.data.token};
  const concurrent=await Promise.all(Array.from({length:12},(_,n)=>call(origin,'/api/check-auth',
    {headers:n%2?adminHeaders:employeeHeaders})));
  assert.equal(concurrent.every(row=>row.status===200&&row.data.authenticated===true),true);
  assert.ok(concurrent.some(row=>row.data.username===admin)&&concurrent.some(row=>row.data.username===employee),
    'both synthetic identities required');
  const users=await call(origin,'/api/users',{headers:adminHeaders});
  assert.equal(users.status,200);assert.equal(users.data.length,2);
  const denied=await call(origin,'/api/users',{headers:employeeHeaders});assert.equal(denied.status,403);
  const pdf=syntheticPDF(),form=new FormData();
  form.set('file',new Blob([pdf],{type:'application/pdf'}),'synthetic-beta4-session.pdf');
  const uploadResponse=await fetch(origin+'/api/upload',{method:'POST',signal:AbortSignal.timeout(5000),
    headers:{Origin:origin,...employeeHeaders},body:form});
  assert.equal(uploadResponse.status,200);
  const upload=await uploadResponse.json();
  assert.equal(path.basename(upload.filename),upload.filename);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'attachments',upload.filename))).digest('hex'),
    crypto.createHash('sha256').update(pdf).digest('hex'));
  const logout=await call(origin,'/api/logout',{method:'POST',headers:adminHeaders});
  assert.equal(logout.status,200);assert.equal(logout.data.success,true);
  const after=await Promise.all([
    call(origin,'/api/check-auth',{headers:adminHeaders}),
    call(origin,'/api/check-auth',{headers:employeeHeaders})]);
  assert.equal(after[0].data.authenticated,false);
  assert.equal(after[1].data.authenticated,true);
  assert.equal(after[1].data.username,employee);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'data.json'),'utf8')).users.length,2);
  await stop(host);
  if(!localOnly){
    const output=process.env.KSESSION_BETA4_SESSION_REPORT;
    assert.ok(output&&path.isAbsolute(output));
    assert.equal(fs.existsSync(output),false);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(fixedSessionReport(),null,2)+'\n',{flag:'wx'});
  }
});
