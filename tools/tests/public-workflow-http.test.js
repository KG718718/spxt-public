'use strict';
// Actual service with synthetic users, payees and records; hosted runner only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP hosted cross-module workflow');process.exit(0);}
const {start}=require('./hosted-runtime-helper');
const root=path.resolve(__dirname,'../..'),workRoot=path.join(root,'.test-work');fs.mkdirSync(workRoot,{recursive:true});
const directory=fs.mkdtempSync(path.join(workRoot,'workflow-'));
const password='Synthetic-Workflow-2026!',date=new Date().toISOString().slice(0,10),month=date.slice(0,7);
const [year,monthNumber]=month.split('-').map(Number),buyer='示例购买方测试单位',seller='示例供应商甲有限公司';
const rules={profitBands:[{min:0,max:null,value:100}],kpi2Bands:[{min:0,max:null,value:1}],manualKpi2Threshold:0.8};
let f,count=0;
const disk=()=>fs.readFileSync(path.join(directory,'data.json'),'utf8');
const state=()=>JSON.parse(disk());
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
async function request(url,token,body,method=body===undefined?'GET':'POST',status=200){
 const r=await f.call(url,{token,body,method});assert.equal(r.status,status,url+' '+JSON.stringify(r.data));return r.data;
}
async function login(username){return (await request('/api/login',null,{username,password})).token;}
(async()=>{try{
 f=await start(directory);assert.ok(f.port,f.output);
 await request('/api/setup',null,{username:'flow-admin',password},'POST',201);
 const admin=await login('flow-admin');
 for(const username of ['flow-owner','flow-executor','flow-other'])await request('/api/users',admin,{username,password,role:'user',createPayeeAccount:username==='flow-owner'});
 const employee=await login('flow-owner'),other=await login('flow-other');
 await request('/api/config',admin,{expectedVersion:0,taxRate:0.02,invoiceBuyerName:buyer,serviceFeeRates:{default:0.03,'礼品采购':0.04},bonusRules:rules},'PUT');
 const client=(await request('/api/clients',admin,{fullName:'示例项目甲方有限公司'})).record;
 const supplier=(await request('/api/suppliers',admin,{name:seller,bankAccount:'SYNTHETIC-NOT-A-BANK',payeeAccountType:'formal-supplier'})).supplier;
 const payee=state().suppliers.find(s=>s.linkedEmployeeUsername==='flow-owner');
 const projectBody={clientId:client.id,projectName:'Synthetic cross-module workflow',approver:'flow-admin',startDate:date,contractAmount:1000,attachments:[],
  items:[{item:'其他',content:'Synthetic service',supplier:seller,payeeAccountId:supplier.id,supplierNameStatus:'confirmed',isProxy:'是',amount:400,serviceFee:999},
   {item:'其他',content:'Synthetic reimbursement',supplier:'flow-owner',payeeAccountId:payee.id,supplierNameStatus:'confirmed',isProxy:'否',amount:100}]};
 await check('missing activity date refuses project with exact zero business writes',async()=>{
  const before=disk();await request('/api/application',employee,{...projectBody,startDate:''},'POST',400);assert.equal(disk(),before);
 });
 let appId,payId;
 await check('project uses actual master links, server fee and configured tax',async()=>{
  appId=(await request('/api/application',employee,projectBody)).id;assert.equal(appId,'APP0001');
  const app=state().applications.find(x=>x.id===appId);assert.equal(app.items[0].serviceFee,12);assert.equal(app.taxRateSnapshot,0.02);
  assert.equal(app.items[0].payeeAccountType,'formal-supplier');assert.equal(app.items[1].payeeAccountType,'employee-payee');
  assert.equal(app.items[0].projectItemId,appId+'-ITEM-01');
 });
 await check('other employee cannot review or access project facts',async()=>{
  const before=disk();await request('/api/application/'+appId,other,{status:'approved'},'PUT',403);assert.equal(disk(),before);
  const view=await request('/api/data',other);assert.equal(view.applications.some(x=>x.id===appId),false);
 });
 await request('/api/application/'+appId,admin,{status:'approved'},'PUT');
 const approvedProject=JSON.stringify(state().applications[0]);
 await check('changing current tax does not rewrite an approved project snapshot',async()=>{
  await request('/api/config',admin,{expectedVersion:1,taxRate:0.05},'PUT');assert.equal(JSON.stringify(state().applications[0]),approvedProject);
 });
 const paymentBody={projectId:appId,approver:'flow-admin',items:state().applications[0].items.map(({projectItemId,...item})=>item),attachments:[],executionParticipants:[{username:'flow-executor',contribution:'Synthetic execution'}]};
 await check('payment follows approved project tax and immutable project evidence',async()=>{
  payId=(await request('/api/payment',employee,paymentBody)).id;assert.equal(payId,'PAY0001');
  const payment=state().payments[0];assert.equal(payment.taxRateSnapshot,0.02);assert.equal(payment.taxAmount,state().applications[0].taxAmount);
  assert.equal(payment.items[0].serviceFee,12);assert.equal(JSON.stringify(state().applications[0]),approvedProject);
 });
 await check('duplicate payment business chain is blocked without writes',async()=>{
  const before=disk();await request('/api/payment',employee,paymentBody,'POST',409);assert.equal(disk(),before);
 });
 await request('/api/payment/'+payId,admin,{status:'approved'},'PUT');
 const approvedPayment=JSON.stringify(state().payments[0]);
 let summary=await request('/api/invoice-summary',employee);
 await check('invoice expected amounts come from approved payment with saved payee types',()=>{
  assert.equal(summary.rows.length,2);assert.equal(summary.totals.expected,500);
  assert.equal(summary.rows.find(x=>x.supplier===seller).expectedAmount,400);
 });
 const formalRow=summary.rows.find(x=>x.supplier===seller),employeeRow=summary.rows.find(x=>x.supplier==='flow-owner');
 const invoice=(invoiceNo,sellerName,amount)=>({invoiceNo,buyerName:buyer,sellerName,amount,invoiceDate:date,invoiceType:'发票',checked:true,eligible:true});
 const batch=(row,item)=>({appId,expectedKeys:[row.key],items:[item],employeeNote:'Synthetic workflow'});
 await check('forged eligible cannot bypass configured buyer or formal seller',async()=>{
  for(const item of [{...invoice('90000000000000000001',seller,500),buyerName:'其他示例购买方'},invoice('90000000000000000001','其他示例销售方',500)]){
   const before=disk();await request('/api/invoices/batch-v2',employee,batch(formalRow,item),'POST',400);assert.equal(disk(),before);
  }
 });
 await check('ungranted employee cannot use replacement despite employee payee association',async()=>{
  const before=disk();await request('/api/invoices/batch-v2',employee,batch(employeeRow,invoice('90000000000000000002',seller,100)),'POST',400);assert.equal(disk(),before);
 });
 let formalBatch;
 await check('formal supplier invoice becomes pending, not automatically confirmed or shared',async()=>{
  formalBatch=await request('/api/invoices/batch-v2',employee,batch(formalRow,invoice('90000000000000000001',seller,500)));
  summary=await request('/api/invoice-summary',employee);assert.equal(summary.totals.pendingAmount,400);
  assert.equal(summary.totals.confirmed,0);assert.equal(state().invoices[0].status,'待审核');
 });
 await check('employee cannot approve invoice batch',async()=>{
  const before=disk();await request('/api/invoice-submissions/'+formalBatch.batchId,employee,{status:'已确认'},'PUT',403);assert.equal(disk(),before);
 });
 await request('/api/invoice-submissions/'+formalBatch.batchId,admin,{status:'已确认'},'PUT');
 await check('approved invoice changes confirmation totals and preserves project/payment snapshots',async()=>{
  summary=await request('/api/invoice-summary',employee);assert.equal(summary.totals.confirmed,400);assert.equal(summary.totals.missing,100);
  assert.equal(JSON.stringify(state().payments[0]),approvedPayment);assert.equal(JSON.stringify(state().applications[0]),approvedProject);
 });
 await request('/api/users/flow-owner/invoice-replacement',admin,{allowed:true,expectedVersion:0,reason:'Synthetic grant'});
 const granted=await login('flow-owner');let replacementBatch;
 await check('explicitly granted employee can submit replacement invoice',async()=>{
  replacementBatch=await request('/api/invoices/batch-v2',granted,batch(employeeRow,invoice('90000000000000000002',seller,100)));
  assert.equal(replacementBatch.invoices[0].poolOwnerType,'employee');
 });
 await request('/api/invoice-submissions/'+replacementBatch.batchId,admin,{status:'已确认'},'PUT');
 await check('all invoice gaps closed and confirmed histories survive permission revocation',async()=>{
  const before=JSON.stringify(state().invoices);
  await request('/api/users/flow-owner/invoice-replacement',admin,{allowed:false,expectedVersion:1,reason:'Synthetic revoke'});
  assert.equal(JSON.stringify(state().invoices),before);
  summary=await request('/api/invoice-summary',admin);assert.equal(summary.totals.confirmed,500);assert.equal(summary.totals.missing,0);
 });
 const preview=(await request('/api/bonus-preview?year='+year+'&month='+monthNumber,admin)).preview;
 const bonusRow=preview.rows.find(x=>x.applicationId===appId);
 const confirm={applicationId:appId,paymentId:payId,rulesDigest:bonusRow.rulesDigest,finalBusinessBonus:100,executionBonuses:[{username:'flow-executor',amount:25}],confirmationNote:'Synthetic acceptance'};
 await check('stale bonus rule digest is rejected without writes',async()=>{
  const before=disk();await request('/api/bonus-confirmations',admin,{...confirm,rulesDigest:'stale'},'POST',409);assert.equal(disk(),before);
 });
 let confirmation;
 await check('Admin confirms separate business and execution amounts with rule snapshot',async()=>{
  confirmation=(await request('/api/bonus-confirmations',admin,confirm)).confirmation;
  assert.deepEqual(confirmation.totals,{businessBonus:100,executionBonus:25,projectBonus:125});assert.equal(confirmation.status,'locked');
 });
 await check('confirmed bonus prevents project/payment closure and new payment with zero writes',async()=>{
  const renewed=await login('flow-owner');
  for(const [url,token,body,method] of [['/api/application/'+appId,admin,{status:'closed',reason:'Synthetic attempt'},'PUT'],['/api/payment/'+payId,admin,{status:'closed',reason:'Synthetic attempt'},'PUT'],['/api/payment',renewed,paymentBody,'POST']]){
   const before=disk();await request(url,token,body,method,409);assert.equal(disk(),before);
  }
 });
 await check('monthly settlements include owner bonus/reimbursement and executor fee separately',async()=>{
  for(const employeeName of ['flow-owner','flow-executor']){
   const r=await request('/api/employee-settlements',admin,{employee:employeeName,activityMonth:month,selectedReimbursementSourceKeys:[]});
   assert.equal(r.settlement.employee,employeeName);assert.equal(r.settlement.status,'locked');
  }
  const records=state().employeeSettlements;assert.equal(records.length,2);
  assert.equal(records.find(x=>x.employee==='flow-owner').totals.totalPayable,200);
  assert.equal(records.find(x=>x.employee==='flow-executor').totals.totalPayable,25);
 });
 await check('month closure cannot be confirmed twice',async()=>{
  const before=disk();await request('/api/employee-settlements',admin,{employee:'flow-owner',activityMonth:month,selectedReimbursementSourceKeys:[]},'POST',409);assert.equal(disk(),before);
 });
 await check('restart preserves cross-module amounts and snapshots',async()=>{
  const before=disk();await f.stop();f=await start(directory);assert.ok(f.port,f.output);assert.equal(disk(),before);
  const token=await login('flow-admin');assert.equal((await request('/api/invoice-summary',token)).totals.confirmed,500);
 });
 console.log('Public actual cross-module workflow: '+count+' passed.');
}catch(e){console.error(e.stack);process.exitCode=1;}finally{if(f)await f.stop();}})();