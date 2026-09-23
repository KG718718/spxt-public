'use strict';
// Synthetic core API checks against the Node process started by the real Launcher.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
let coreStage='HANDLER_READY',diagnosticWritten=false;
const diagnosticStages=new Set(['HANDLER_READY','COMMON_MODULE','ARGUMENTS','APP_REQUIRE','READY','SETUP_STATUS','SETUP_INITIALIZE','ZERO_DATA','EXISTING_IDENTITY','ADMIN_LOGIN','PDF_FIXTURES','PDF_PROBE','XLSX_EXPORT','EMPLOYEE_CREATE','EMPLOYEE_LOGIN','PERSISTED_ATTACHMENT','UPLOAD','BACKUP','COMPLETE']);
function failureKind(e){
 if(e?.code==='ERR_ASSERTION')return'ASSERTION';
 if(e?.name==='TimeoutError'||e?.name==='AbortError')return'TIMEOUT';
 if(e?.code==='MODULE_NOT_FOUND')return'MISSING_MODULE';
 if(e?.code==='ENOENT')return'MISSING_FILE';
 if(e?.code==='EACCES'||e?.code==='EPERM')return'ACCESS_DENIED';
 return'UNEXPECTED';
}
function emitDiagnostic(e){
 if(diagnosticWritten)return;
 diagnosticWritten=true;
 const stage=diagnosticStages.has(coreStage)?coreStage:'UNKNOWN';
 try{fs.writeSync(2,'KSESSION_CORE_PROBE_DIAGNOSTIC '+JSON.stringify({code:'CORE_PROBE_FAILED',stage,kind:failureKind(e)})+'\n');}catch{}
}
process.once('uncaughtException',e=>{emitDiagnostic(e);process.exit(1);});
process.once('unhandledRejection',e=>{emitDiagnostic(e);process.exit(1);});
let sha,writeJSON,root,instance,portArg,evidence,mode,port,url,app,load,topLevelReady=false;
try{
 coreStage='COMMON_MODULE';
 ({sha,writeJSON}=require('../../windows-runtime/common.cjs'));
 coreStage='ARGUMENTS';
 [root,instance,portArg,evidence,mode]=process.argv.slice(2);port=Number(portArg);
 if(!root||!instance||!evidence||!['initial','existing'].includes(mode)||!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid core probe arguments');
 url='http://127.0.0.1:'+port;
 coreStage='APP_REQUIRE';
 app=path.join(root,'app');load=createRequire(path.join(app,'package.json'));
 coreStage='READY';topLevelReady=true;
}catch(e){emitDiagnostic(e);process.exitCode=1;}
function pdf(lines,unicode=false){
 const objs=['',''],pageIds=[];
 const add=s=>{objs.push(s);return objs.length;};
 let font;
 if(unicode){
  const cmap='/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Synthetic def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange 1 beginbfrange <0000> <FFFF> <0000> endbfrange endcmap CMapName currentdict /CMap defineresource pop end end';
  const cm=add('<< /Length '+Buffer.byteLength(cmap)+' >>\nstream\n'+cmap+'\nendstream');
  const descriptor=add('<< /Type /FontDescriptor /FontName /Synthetic /Flags 4 /FontBBox [0 -200 1000 1000] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>');
  const child=add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Synthetic /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor '+descriptor+' 0 R /CIDToGIDMap /Identity /DW 1000 >>');
  font=add('<< /Type /Font /Subtype /Type0 /BaseFont /Synthetic /Encoding /Identity-H /DescendantFonts ['+child+' 0 R] /ToUnicode '+cm+' 0 R >>');
 }else font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 for(const text of lines){
  const str=unicode?'<'+[...text].map(c=>c.charCodeAt(0).toString(16).padStart(4,'0')).join('')+'>':'('+text+')';
  const stream='BT /F1 12 Tf 30 750 Td '+str+' Tj ET',content=add('<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream');
  pageIds.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+font+' 0 R >> >> /Contents '+content+' 0 R >>'));
 }
 objs[0]='<< /Type /Catalog /Pages 2 0 R >>';objs[1]='<< /Type /Pages /Kids ['+pageIds.map(n=>n+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let s='%PDF-1.4\n',off=[];objs.forEach((o,i)=>{off.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const x=Buffer.byteLength(s);
 s+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF\n';return Buffer.from(s);
}
async function call(p,body,token){const res=await fetch(url+p,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(15000),headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:res.status,data:await res.json()};}
async function runCoreProbe(){
 const identityFile=path.join(instance,'.portable-test-identity.json');let id;
 if(mode==='initial'){
  coreStage='SETUP_STATUS';
  assert.equal((await call('/api/setup')).data.initializationRequired,true);
  coreStage='SETUP_INITIALIZE';
  id={username:'portable-synthetic-admin',password:'Synthetic-'+crypto.randomBytes(24).toString('hex')};
  assert.equal((await call('/api/setup',id)).status,201);writeJSON(identityFile,id);
  coreStage='ZERO_DATA';
  const d=JSON.parse(fs.readFileSync(path.join(instance,'data.json')));assert.equal(d.users.length,1);for(const k of ['applications','payments','debts','clients','suppliers','invoices'])assert.deepEqual(d[k],[]);
 }else{coreStage='EXISTING_IDENTITY';id=JSON.parse(fs.readFileSync(identityFile));assert.equal((await call('/api/setup')).data.initializationRequired,false);}
 coreStage='ADMIN_LOGIN';
 const login=await call('/api/login',id);assert.equal(login.status,200);const token=login.data.token;assert.ok(token);
 coreStage='PDF_FIXTURES';
 const samples=[{file:'english.pdf',lines:['SYNTHETIC 12345.67']},{file:'chinese.pdf',lines:['合成中文测试金额12345.67'],unicode:true},{file:'multipage.pdf',lines:['SYNTHETIC PAGE ONE 100.00','SYNTHETIC PAGE TWO 200.00','SYNTHETIC PAGE THREE 300.00']}];
 fs.mkdirSync(evidence,{recursive:true});for(const sample of samples)fs.writeFileSync(path.join(evidence,sample.file),pdf(sample.lines,sample.unicode));
 coreStage='PDF_PROBE';
 const probe=path.join(__dirname,'pdf-probe.cjs'), node=path.join(root,'runtime/node.exe');
 const result=JSON.parse(cp.execFileSync(node,['--no-addons',probe,app,evidence],{windowsHide:true,timeout:60000,maxBuffer:2e6}).toString());assert.equal(result.status,'PASS');
 coreStage='XLSX_EXPORT';
 const x=await fetch(url+'/api/exports?module=admin&format=xlsx&scope=all',{headers:{Authorization:'Bearer '+token}});assert.equal(x.status,200);
 const entries=load('fflate').unzipSync(new Uint8Array(await x.arrayBuffer()));assert.ok(entries['xl/workbook.xml']);
 const employee='portable-synthetic-employee';
 coreStage='EMPLOYEE_CREATE';
 if(mode==='initial')assert.equal((await call('/api/users',{username:employee,password:id.password,role:'user'},token)).status,200);
 coreStage='EMPLOYEE_LOGIN';
 const el=await call('/api/login',{username:employee,password:id.password});assert.equal(el.status,200);
 const bytes=pdf(['SYNTHETIC UPLOAD 12345.67']),form=new FormData();form.set('file',new Blob([bytes],{type:'application/pdf'}),'合成中文附件.pdf');
 if(mode!=='initial'){
   coreStage='PERSISTED_ATTACHMENT';
   assert.equal(typeof id.attachment,'string');const prior=fs.readFileSync(path.join(instance,'attachments',id.attachment));
   const attachmentUrl=url+'/attachments/'+encodeURIComponent(id.attachment);
   const employeeDownload=await fetch(attachmentUrl,{headers:{Authorization:'Bearer '+el.data.token}});
   assert.equal(employeeDownload.status,403,'UNATTACHED_UPLOAD_EMPLOYEE_ACCESS_MUST_EXPIRE_AFTER_RESTART');
   const adminDownload=await fetch(attachmentUrl,{headers:{Authorization:'Bearer '+token}});
   assert.equal(adminDownload.status,200,'PERSISTED_ATTACHMENT_ADMIN_DOWNLOAD_FAILED');
   assert.deepEqual(Buffer.from(await adminDownload.arrayBuffer()),prior);
 }
 coreStage='UPLOAD';
 const up=await fetch(url+'/api/upload',{method:'POST',headers:{Origin:url,Authorization:'Bearer '+el.data.token},body:form});assert.equal(up.status,200);const u=await up.json();assert.equal(u.originalName,'合成中文附件.pdf');assert.equal(path.basename(u.filename),u.filename);assert.equal(sha(fs.readFileSync(path.join(instance,'attachments',u.filename))),sha(bytes));
 if(mode==='initial'){id.attachment=u.filename;fs.writeFileSync(identityFile,JSON.stringify(id,null,2)+'\n',{mode:0o600});}
 coreStage='BACKUP';
 const backup=await call('/api/backups',{},token);assert.equal(backup.status,200);assert.equal(backup.data.success,true);assert.equal(path.basename(backup.data.fileName),backup.data.fileName);
 assert.equal(sha(fs.readFileSync(path.join(instance,'backups',backup.data.fileName))),backup.data.sha256);
 coreStage='COMPLETE';
 console.log(JSON.stringify({status:'PASS',mode,checks:['admin','login','english-pdf','chinese-pdf','multipage-pdf','xlsx','chinese-upload','structured-backup'],pdf:result}));
}
if(topLevelReady)runCoreProbe().catch(e=>{emitDiagnostic(e);process.exitCode=1;});
