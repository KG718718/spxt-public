'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP hosted upload runtime');process.exit(0);}
const {start}=require('./hosted-runtime-helper');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'.test-work');fs.mkdirSync(base,{recursive:true});
const directory=fs.mkdtempSync(path.join(base,'upload-runtime-')),password='Synthetic-Upload-2026!';
let f,count=0;
const disk=()=>fs.readFileSync(path.join(directory,'data.json'),'utf8');
const files=()=>fs.existsSync(path.join(directory,'attachments'))?fs.readdirSync(path.join(directory,'attachments'),{recursive:true}).sort():[];
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
async function json(url,token,body,method=body===undefined?'GET':'POST',status=200){const r=await f.call(url,{token,body,method});assert.equal(r.status,status,JSON.stringify(r.data));return r.data;}
function pdf(){
 const stream='BT /F1 12 Tf 30 750 Td (Synthetic invoice 90000000000000000003) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
 let s='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const xref=Buffer.byteLength(s);
 s+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return Buffer.from(s);
}
async function upload(url,token,name,buffer=pdf(),fields={}){
 const form=new FormData();for(const[k,v]of Object.entries(fields))form.set(k,String(v));form.set('file',new Blob([buffer],{type:'application/pdf'}),name);
 const r=await fetch('http://127.0.0.1:'+f.port+url,{method:'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),Origin:'http://127.0.0.1:'+f.port},body:form});
 return {status:r.status,data:await r.json()};
}
(async()=>{try{
 f=await start(directory);assert.ok(f.port,f.output);
 await json('/api/setup',null,{username:'upload-admin',password},'POST',201);
 const admin=(await json('/api/login',null,{username:'upload-admin',password})).token;
 for(const username of ['upload-owner','upload-other'])await json('/api/users',admin,{username,password,role:'user'});
 const owner=(await json('/api/login',null,{username:'upload-owner',password})).token,other=(await json('/api/login',null,{username:'upload-other',password})).token;
 await json('/api/config',admin,{expectedVersion:0,taxRate:0,serviceFeeRates:{default:0,'礼品采购':0}},'PUT');
 const client=(await json('/api/clients',admin,{fullName:'合成附件甲方有限公司'})).record;
 const supplier=(await json('/api/suppliers',admin,{name:'合成附件供应商有限公司',bankAccount:'SYNTHETIC',payeeAccountType:'formal-supplier'})).supplier;
 await check('unauthenticated multipart creates no attachment',async()=>{const before=files();const r=await upload('/api/upload',null,'unauthorized.pdf');assert.equal(r.status,401);assert.deepEqual(files(),before);});
 let attachment;
 await check('new Chinese upload preserves readable original name',async()=>{const r=await upload('/api/upload',owner,'合成附件_中文.pdf');assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.originalName,'合成附件_中文.pdf');attachment=r.data;});
 await check('new Cyrillic upload preserves readable original name',async()=>{const r=await upload('/api/upload',owner,'пример.pdf');assert.equal(r.status,200);assert.equal(r.data.originalName,'пример.pdf');});
 await check('fake PDF and empty upload refuse without orphan files',async()=>{for(const b of [Buffer.from('<script>alert(1)</script>'),Buffer.alloc(0)]){const before=files();assert.equal((await upload('/api/upload',owner,'invalid.pdf',b)).status,400);assert.deepEqual(files(),before);}});
 const projectBody={clientId:client.id,projectName:'Synthetic uploaded attachment',approver:'upload-admin',startDate:new Date().toISOString().slice(0,10),contractAmount:100,items:[{item:'其他',content:'Synthetic',supplier:supplier.name,payeeAccountId:supplier.id,supplierNameStatus:'confirmed',isProxy:'否',amount:10}],attachments:[attachment]};
 const appId=(await json('/api/application',owner,projectBody)).id;
 await check('project response preserves attachment original name',async()=>{const data=await json('/api/data',owner);assert.equal(data.applications[0].attachments[0].originalName,'合成附件_中文.pdf');});
 await check('owner download is private and has UTF-8 filename header',async()=>{const r=await fetch('http://127.0.0.1:'+f.port+attachment.path,{headers:{Authorization:'Bearer '+owner}});assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/filename\*=UTF-8''/i);assert.deepEqual(Buffer.from(await r.arrayBuffer()),pdf());});
 await check('another employee cannot download the attachment',async()=>{const r=await fetch('http://127.0.0.1:'+f.port+attachment.path,{headers:{Authorization:'Bearer '+other}});assert.equal(r.status,403);});
 await check('OCR refuses another employee project and cleans its temporary file',async()=>{const before=files(),dataBefore=disk();const r=await upload('/api/invoices/ocr',other,'other-project.pdf',pdf(),{appId});assert.equal(r.status,403,JSON.stringify(r.data));assert.deepEqual(files(),before);assert.equal(disk(),dataBefore);});
 await check('missing optional OCR reports clearly with no path leak or orphan attachment',async()=>{const before=files(),dataBefore=disk();const r=await upload('/api/invoices/ocr',owner,'optional-not-installed.pdf',pdf(),{appId});assert.equal(r.status,503,JSON.stringify(r.data));assert.match(r.data.error,/未安装|尚未安装/);assert.doesNotMatch(r.data.error,/[A-Z]:\\|D:\/a\//i);assert.deepEqual(files(),before);assert.equal(disk(),dataBefore);});
 console.log('Public upload and optional OCR runtime: '+count+' passed.');
}catch(e){console.error(e.stack);process.exitCode=1;}finally{if(f)await f.stop();}})();
