'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const test=require('node:test');
const network=require('../../../public-lan-network');
const root=path.resolve(__dirname,'../../..');

function ownedPrivate(){
  const rows=[];
  for(const entries of Object.values(os.networkInterfaces()))for(const item of entries||[]){
    const address=network.normalizeIPv4(item.address);if(!item.internal&&item.family==='IPv4'&&address&&network.privateBlock(address)){
      const bits=network.ipv4Number(item.netmask);if(bits===null)continue;
      const binary=bits.toString(2).padStart(32,'0');if(!/^1*0*$/.test(binary))continue;
      rows.push({address,prefixLength:binary.includes('0')?binary.indexOf('0'):32});
    }
  }
  assert.equal(rows.length,1,'full hosted session gate requires exactly one runner-owned private IPv4');return rows[0];
}
function environment(directory,extra={}){return {...process.env,KSESSION_LAN_MODE:'1',KSESSION_DATA_FILE:path.join(directory,'data.json'),
  KSESSION_CONFIG_FILE:path.join(directory,'config.json'),KSESSION_ATTACHMENTS_DIR:path.join(directory,'attachments'),
  KSESSION_BACKUPS_DIR:path.join(directory,'backups'),KSESSION_MAIL_CONFIG_FILE:path.join(directory,'mail-reminder.config.json'),
  KSESSION_SMTP_SECRET_FILE:path.join(directory,'runtime','secrets','smtp-pass.dpapi'),KSESSION_MAIL_ENABLED:'0',
  KSESSION_MAIL_DRY_RUN:'1',KSESSION_MAIL_FORMAL_ENABLED:'0',KSESSION_SKIP_STARTUP_JOBS:'1',...extra};}
async function started(t,args,env,pattern){
  const child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env});let output='';
  t.after(()=>stop(child));
  child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{output+=chunk});
  for(let count=0;count<200&&!pattern.test(output)&&child.exitCode===null;count++)await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(child.exitCode,null,'server exited before readiness');assert.equal(pattern.test(output),true,'server readiness marker was not observed');return{child,output};
}
async function stop(child){if(child.exitCode===null)child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));}
async function json(url,options){const response=await fetch(url,{...options,signal:AbortSignal.timeout(5000)});return{status:response.status,data:await response.json()};}
function samplePDF(){
  const stream='BT /F1 12 Tf 30 750 Td (Synthetic LAN session evidence) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
  let value='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(value));value+=(index+1)+' 0 obj\n'+object+'\nendobj\n';});const xref=Buffer.byteLength(value);
  value+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return Buffer.from(value);
}

test('L19 L26 production handler serves two independent authenticated sessions through an isolated real private socket',async t=>{
  assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ksession-lan-production-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const password='Synthetic-'+crypto.randomBytes(24).toString('hex'),username='synthetic-lan-admin';
  const employeePassword='Synthetic-'+crypto.randomBytes(24).toString('hex'),employee='synthetic-lan-employee';
  const local=await started(t,[path.join(root,'server.js')],environment(directory,{PORT:'0',KSESSION_HOST:'127.0.0.1'}),/running at http:\/\/127\.0\.0\.1:(\d+)/);
  const localPort=Number(local.output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/)[1]),localOrigin='http://127.0.0.1:'+localPort;
  const created=await json(localOrigin+'/api/setup',{method:'POST',headers:{'Content-Type':'application/json',Origin:localOrigin},body:JSON.stringify({username,password})});
  assert.equal(created.status,201);await stop(local.child);

  const owned=ownedPrivate(),guid='12345678-1234-1234-1234-123456789abc';
  const reservation=await network.findAndReservePort({addresses:['127.0.0.1',owned.address]});const port=reservation.port;await reservation.release();
  const lanConfig={schema:1,port,adapterPreference:guid};fs.writeFileSync(path.join(directory,'lan-deployment.json'),JSON.stringify(lanConfig)+'\n');
  const selected={adapterId:guid,name:'Hosted isolated injected discovery',address:owned.address,prefixLength:owned.prefixLength,
    subnet:network.subnetFor(owned.address,owned.prefixLength).cidr,routeMetric:0};
  const preload=path.join(__dirname,'discovery-preload.cjs');
  const host=await started(t,['--require',preload,path.join(root,'server.js')],environment(directory,{PORT:String(port),KSESSION_HOST:'127.0.0.1',
    KSESSION_TEST_DISCOVERY:JSON.stringify(selected)}),/LAN status: LAN_SERVER_READY/);
  const localStatus=await json('http://127.0.0.1:'+port+'/api/lan/status');assert.equal(localStatus.status,200);assert.equal(localStatus.data.status,'LAN_SERVER_READY');
  const origin='http://'+owned.address+':'+port;
  const remoteSetup=await json(origin+'/api/setup');assert.equal(remoteSetup.status,403);assert.equal(remoteSetup.data.code,'REMOTE_BOOTSTRAP_CLOSED');
  const login=credentials=>json(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(credentials)});
  const adminLogin=await login({username,password});assert.equal(adminLogin.status,200);assert.match(adminLogin.data.token,/^[a-f0-9]+$/);
  const createdEmployee=await json(origin+'/api/users',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Authorization:'Bearer '+adminLogin.data.token},body:JSON.stringify({username:employee,password:employeePassword,role:'user'})});
  assert.equal(createdEmployee.status,200);
  const employeeLogin=await login({username:employee,password:employeePassword});assert.equal(employeeLogin.status,200);assert.match(employeeLogin.data.token,/^[a-f0-9]+$/);assert.notEqual(adminLogin.data.token,employeeLogin.data.token);
  for(const [token,expectedName,expectedRole] of [[adminLogin.data.token,username,'admin'],[employeeLogin.data.token,employee,'user']]){
    const auth=await json(origin+'/api/check-auth',{headers:{Authorization:'Bearer '+token,Origin:origin}});assert.equal(auth.status,200);assert.equal(auth.data.authenticated,true);assert.equal(auth.data.username,expectedName);assert.equal(auth.data.role,expectedRole);
  }
  const adminUsers=await json(origin+'/api/users',{headers:{Authorization:'Bearer '+adminLogin.data.token,Origin:origin}});assert.equal(adminUsers.status,200);assert.equal(adminUsers.data.length,2);
  const employeeUsers=await json(origin+'/api/users',{headers:{Authorization:'Bearer '+employeeLogin.data.token,Origin:origin}});assert.equal(employeeUsers.status,403);
  const pdf=samplePDF(),form=new FormData();form.set('file',new Blob([pdf],{type:'application/pdf'}),'synthetic-lan-session.pdf');
  const uploadResponse=await fetch(origin+'/api/upload',{method:'POST',signal:AbortSignal.timeout(5000),headers:{Origin:origin,Authorization:'Bearer '+employeeLogin.data.token},body:form});
  assert.equal(uploadResponse.status,200);const upload=await uploadResponse.json();assert.equal(path.basename(upload.filename),upload.filename);
  assert.deepEqual(fs.readFileSync(path.join(directory,'attachments',upload.filename)),pdf);
  const logout=await json(origin+'/api/logout',{method:'POST',headers:{Authorization:'Bearer '+adminLogin.data.token,Origin:origin}});assert.equal(logout.status,200);assert.equal(logout.data.success,true);
  const adminAfterLogout=await json(origin+'/api/check-auth',{headers:{Authorization:'Bearer '+adminLogin.data.token,Origin:origin}});assert.equal(adminAfterLogout.status,200);assert.equal(adminAfterLogout.data.authenticated,false);
  const employeeAfterLogout=await json(origin+'/api/check-auth',{headers:{Authorization:'Bearer '+employeeLogin.data.token,Origin:origin}});assert.equal(employeeAfterLogout.status,200);assert.equal(employeeAfterLogout.data.authenticated,true);assert.equal(employeeAfterLogout.data.username,employee);
  const saved=JSON.parse(fs.readFileSync(path.join(directory,'data.json'),'utf8'));assert.equal(saved.users.length,2);
  const output=process.env.KSESSION_LAN_SESSION_REPORT;assert.ok(output);fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({schema:1,status:'PASS',productionBusinessHandler:true,runnerOwnedPrivateSocket:true,
    discovery:'SYNTHETIC_STRICT_TEST_INJECTION',listenerGuard:'PRODUCTION',remoteBootstrapClosed:true,sessionCount:2,
    independentBearerSessions:true,distinctIdentities:true,identityChecks:true,roleBoundaryPreserved:true,oneSessionLogoutIsolated:true,
    hostAttachmentStored:true,sameHostInstance:true,realSecondDeviceClaim:false},null,2)+'\n',{flag:'wx'});
});
