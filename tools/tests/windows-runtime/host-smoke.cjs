'use strict';
// Build-host diagnostics only. Never reports clean Windows 11 or offline G1 PASS.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const {cleanEnvironment,inside,writeNew,writeJSON,sha}=require('../../windows-runtime/common.cjs');
const {verify}=require('../../windows-runtime/verify.cjs');
const stage=path.resolve(process.argv[2]),evidence=path.resolve(process.argv[3]),app=path.join(stage,'app'),node=path.join(stage,'runtime/node.exe');
if(!/^E:\\/i.test(evidence)||inside(stage,evidence)||inside(path.resolve(__dirname,'../../..'),evidence)||evidence===stage)throw Error('Evidence must be external to package/source on E drive');
fs.mkdirSync(evidence);fs.mkdirSync(path.join(evidence,'temp'));
const instance=path.join(evidence,'合成实例 with spaces');fs.mkdirSync(instance);
const env={...cleanEnvironment(path.join(evidence,'temp')),PORT:'0',KSESSION_HOST:'127.0.0.1',
  KSESSION_DATA_FILE:path.join(instance,'data.json'),KSESSION_CONFIG_FILE:path.join(instance,'config.json'),
  KSESSION_ATTACHMENTS_DIR:path.join(instance,'attachments'),KSESSION_BACKUPS_DIR:path.join(instance,'backups'),
  KSESSION_MAIL_CONFIG_FILE:path.join(instance,'mail-reminder.config.json'),KSESSION_MAIL_LOG_FILE:path.join(instance,'logs/mail.log'),
  KSESSION_SMTP_SECRET_FILE:path.join(instance,'runtime/secrets/smtp-pass.dpapi'),
  KSESSION_OCR_PYTHON:path.join(instance,'absent-python.exe'),KSESSION_OCR_SCRIPT:path.join(app,'tools/ocr/ocr_invoice.py'),
  KSESSION_MAIL_ENABLED:'0',KSESSION_MAIL_FORMAL_ENABLED:'0',KSESSION_MAIL_DRY_RUN:'1',KSESSION_SKIP_STARTUP_JOBS:'1'};
const report={qualification:'Windows build host, external network NOT blocked; not clean Windows 11 G1',checks:[],failures:[],browser:'NOT EXECUTED',screenshots:[],g1:'NOT SATISFIED'};
let child,stopped,output='',port;
async function check(name,fn){await fn();report.checks.push(name);console.log('PASS '+name);}
async function start(){
  port=0;child=cp.spawn(node,[path.join(app,'server.js')],{env,cwd:app,windowsHide:true,stdio:['ignore','pipe','pipe']});
  stopped=new Promise(resolve=>{child.once('exit',resolve);child.once('error',e=>{output+='spawn failed: '+e.message;resolve();});});
  child.stdout.on('data',b=>{output+=b;const match=String(b).match(/running at http:\/\/127\.0\.0\.1:(\d+)/);if(match)port=+match[1];});child.stderr.on('data',b=>output+=b);
  for(let i=0;i<120&&!port&&child.exitCode===null;i++)await new Promise(r=>setTimeout(r,100));
  assert.ok(port,'Server did not become ready');
}
async function stop(){if(child&&child.exitCode===null)child.kill();if(stopped)await stopped;child=null;}
async function call(url,body,token,method=body===undefined?'GET':'POST'){
  const res=await fetch('http://127.0.0.1:'+port+url,{method,signal:AbortSignal.timeout(10000),headers:{Origin:'http://127.0.0.1:'+port,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:res.status,data};
}
function samplePDF(){
  const stream='BT /F1 12 Tf 30 750 Td (Synthetic runtime PDF 12345) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
  let s='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const xref=Buffer.byteLength(s);
  s+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return Buffer.from(s);
}
(async()=>{try{
  const before=verify(stage);report.manifestHash=before.manifestHash;
  await check('V01 build-host integrity',()=>assert.ok(before.files>32));
  await check('V02 package Node only',()=>{assert.equal(process.execPath.toLowerCase(),node.toLowerCase());assert.equal(process.version,'v24.21.0');});
  await check('V03 server ready',start);
  await check('V04 HTTP login page (NOT browser)',async()=>{const r=await call('/login.html');assert.equal(r.status,200);assert.match(r.data,/setupForm/);});
  const username='runtime-synthetic-admin',password='Synthetic-'+crypto.randomBytes(24).toString('hex');
  await check('V05 first Admin and zero business records',async()=>{
    assert.equal((await call('/api/setup')).data.initializationRequired,true);
    assert.equal((await call('/api/setup',{username,password})).status,201);
    const data=JSON.parse(fs.readFileSync(env.KSESSION_DATA_FILE));assert.equal(data.users.length,1);
    for(const key of ['applications','payments','debts','clients','suppliers','invoices'])assert.deepEqual(data[key],[]);
    assert.equal((await call('/api/setup',{username,password})).status,409);
  });
  let token;
  await check('V06 login',async()=>{const r=await call('/api/login',{username,password});assert.equal(r.status,200);token=r.data.token;assert.ok(token);});
  const load=createRequire(path.join(app,'package.json')),pdf=samplePDF();
  await check('V07 synthetic PDF library text (NOT full invoice UI)',async()=>{
    const pdfjs=await import(pathToFileURL(load.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
    const doc=await pdfjs.getDocument({data:new Uint8Array(pdf),disableWorker:true,useSystemFonts:true}).promise;
    try{const page=await doc.getPage(1),text=await page.getTextContent();assert.match(text.items.map(i=>i.str).join(' '),/Synthetic runtime PDF 12345/);}finally{await doc.destroy();}
    const {PDFParse}=load('pdf-parse'),parser=new PDFParse({data:new Uint8Array(pdf)});
    try{assert.match((await parser.getText()).text,/Synthetic runtime PDF 12345/);}finally{await parser.destroy();}
  });
  await check('V08 XLSX via original export API, no Office',async()=>{
    const r=await fetch('http://127.0.0.1:'+port+'/api/exports?module=admin&format=xlsx&scope=all',{signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+token}});
    assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer()),entries=load('fflate').unzipSync(bytes);
    assert.ok(entries['xl/workbook.xml']);assert.ok(Object.values(entries).some(b=>Buffer.from(b).toString().includes(username)));
    writeNew(path.join(evidence,'synthetic-export.xlsx'),bytes);report.xlsxSha256=sha(bytes);
  });
  await check('V09 Chinese upload byte preservation',async()=>{
    const employee='runtime-synthetic-employee';
    assert.equal((await call('/api/users',{username:employee,password,role:'user'},token)).status,200);
    const employeeLogin=await call('/api/login',{username:employee,password});assert.equal(employeeLogin.status,200);
    const form=new FormData();form.set('file',new Blob([pdf],{type:'application/pdf'}),'合成闭包测试.pdf');
    const denied=await fetch('http://127.0.0.1:'+port+'/api/upload',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Origin:'http://127.0.0.1:'+port,Authorization:'Bearer '+token},body:form});
    assert.equal(denied.status,403);await denied.arrayBuffer();
    const r=await fetch('http://127.0.0.1:'+port+'/api/upload',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Origin:'http://127.0.0.1:'+port,Authorization:'Bearer '+employeeLogin.data.token},body:form});
    assert.equal(r.status,200);const data=await r.json();assert.equal(data.originalName,'合成闭包测试.pdf');assert.equal(path.basename(data.filename),data.filename);
    assert.equal(sha(fs.readFileSync(path.join(env.KSESSION_ATTACHMENTS_DIR,data.filename))),sha(pdf));
  });
  await check('V10 structured-data backup via original Admin API',async()=>{
    const r=await call('/api/backups',{},token);assert.equal(r.status,200);assert.equal(r.data.success,true);
    assert.equal(path.basename(r.data.fileName),r.data.fileName);const bytes=fs.readFileSync(path.join(env.KSESSION_BACKUPS_DIR,r.data.fileName));assert.equal(sha(bytes),r.data.sha256);
    assert.equal(JSON.parse(bytes).users[0].username,username);
  });
  await check('restart preserves Admin and invalidates sessions',async()=>{
    await stop();await start();assert.equal((await call('/api/setup')).data.initializationRequired,false);
    assert.equal((await call('/api/data',undefined,token)).status,401);assert.equal((await call('/api/login',{username,password})).status,200);
  });
}catch(e){report.failures.push(e.message);process.exitCode=1;}finally{
  await stop();
  try{verify(stage);report.checks.push('package unchanged after diagnostics');}catch(e){report.failures.push(e.message);process.exitCode=1;}
  // No passwords/tokens are logged; generated identity remains only in external synthetic instance.
  writeNew(path.join(evidence,'server.log'),output);writeJSON(path.join(evidence,'host-smoke.json'),report);
  console.log(JSON.stringify({passed:report.checks.length,failures:report.failures,g1:report.g1}));
}})();
