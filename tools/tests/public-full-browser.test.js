'use strict';
// Hosted-only acceptance of the actual application. All accounts/configuration are synthetic.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP hosted full UI; no local files created.');process.exit(0);}
const {chromium}=require('playwright-core'),{start}=require('./hosted-runtime-helper');
const root=path.resolve(__dirname,'../..'),workRoot=path.join(root,'.test-work');
fs.mkdirSync(workRoot,{recursive:true});
const fixture=fs.mkdtempSync(path.join(workRoot,'full-ui-')),evidence=path.join(workRoot,'full-ui-evidence');
fs.mkdirSync(evidence);const password='Synthetic-UI-Only-2026!';
let runtime,context,count=0,failure;const exceptions=[],consoleMessages=[],networkErrors=[],visual=[];
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
(async()=>{
try{
 runtime=await start(fixture);assert.ok(runtime.port,runtime.output);
 const origin='http://127.0.0.1:'+runtime.port;
 context=await chromium.launchPersistentContext(path.join(fixture,'browser-profile'),{channel:'msedge',headless:true,viewport:{width:1440,height:1000},acceptDownloads:false});
 const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(20000);
 function observe(p){
  p.on('pageerror',e=>exceptions.push({url:p.url(),message:e.message}));
  p.on('console',m=>{if(['error','warning'].includes(m.type()))consoleMessages.push({url:p.url(),type:m.type(),text:m.text()});});
  p.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/api/'))networkErrors.push({url:r.url(),status:r.status()});});
  p.on('dialog',d=>d.accept());
 }
 observe(page);
 async function shot(name){await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});}
 async function inspect(name,p=page){
  const result=await p.evaluate(()=>{
   const rgb=s=>{const a=(s.match(/[\d.]+/g)||[]).map(Number);return [a[0]||0,a[1]||0,a[2]||0,a.length>3?a[3]:1];};
   const blend=(front,back)=>[0,1,2].map(i=>front[i]*front[3]+back[i]*(1-front[3])).concat(1);
   const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const output=[];
   for(const el of document.querySelectorAll('button,a,input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea,label,p,small,span,h1,h2,h3,h4,td,th')){
    if(!el.getClientRects().length||el.closest('[hidden]'))continue;
    const style=getComputedStyle(el);if(style.visibility!=='visible'||Number(style.opacity)===0)continue;
    const isControl=el.matches('button,a,input,select,textarea');
    if(!isControl&&el.children.length&&![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
    const text=el.matches('input,textarea')?(el.value||el.getAttribute('placeholder')||''):el.textContent.trim();
    if(!text)continue;
    let chain=[],node=el;while(node){chain.unshift(node);node=node.parentElement;}
    let bg=[255,255,255,1],gradient=false;
    for(const n of chain){const st=getComputedStyle(n);bg=blend(rgb(st.backgroundColor),bg);if(st.backgroundImage!=='none')gradient=true;}
    const color=el.matches('input,textarea')&&!el.value&&el.getAttribute('placeholder')?getComputedStyle(el,'::placeholder').color:style.color;
    const fg=blend(rgb(color),bg),a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const size=parseFloat(style.fontSize),required=size>=24||(size>=18.66&&Number(style.fontWeight)>=700)?3:4.5;
    if(ratio+.01<required||gradient)output.push({selector:el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+el.className,text:text.slice(0,60),color,background:bg.slice(0,3),ratio,required,gradient,disabled:el.disabled===true});
   }
   return {lowContrast:output,viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  visual.push({name,...result});
 }
 async function expectConfigVersion(v){await page.waitForFunction(x=>document.getElementById('configVersion')?.textContent===String(x),v);}
 async function createUser(name,role,payee){
  await page.locator('[data-tab="users"]').click();await page.locator('#newUser').fill(name);await page.locator('#newPass').fill(password);
  await page.locator('#newRole').selectOption(role);await page.locator('#createUserPayee').setChecked(payee);
  const done=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/users'&&r.request().method()==='POST');
  await page.locator('button[onclick="addUser()"]').click();const r=await done;assert.equal(r.status(),200,await r.text());
  await page.locator('#userList tr').filter({hasText:name}).waitFor();
 }
 await page.goto(origin+'/login.html');
 await check('actual first-install Admin setup UI has empty credentials',async()=>{
  await page.locator('#setupForm').waitFor({state:'visible'});assert.equal(await page.locator('#setupUsername').inputValue(),'');
  await page.locator('#setupUsername').fill('ui-admin');await page.locator('#setupPassword').fill(password);await page.locator('#setupConfirm').fill(password);
  await page.locator('#setupSubmitButton').click();await page.locator('#loginForm').waitFor({state:'visible'});
 });
 await check('actual login and authenticated Admin navigation work',async()=>{
  await page.locator('#username').fill('ui-admin');await page.locator('#password').fill(password);await page.locator('#loginSubmitButton').click();
  await page.waitForURL('**/approval.html');await page.goto(origin+'/admin.html?tab=config');await expectConfigVersion(0);
 });
 // Missing configuration can show a controlled notice at first approval entry, not a default value.
 const beforeConfigMessages=consoleMessages.splice(0);const beforeConfigNetwork=networkErrors.splice(0);
 await check('all business configuration fields start empty, including explicit zero distinction',async()=>{
  for(const id of ['taxRate','invoiceBuyerName','manualKpi2Threshold'])assert.equal(await page.locator('#'+id).inputValue(),'');
  assert.deepEqual(await page.locator('.fee-rate').evaluateAll(xs=>xs.map(x=>x.value)),['','']);
  assert.equal(await page.locator('#profitBands > *').count(),0);assert.equal(await page.locator('#kpi2Bands > *').count(),0);
  await shot('01-config-empty');await inspect('config-empty');
 });
 await check('blank tax cannot save or create configuration file',async()=>{
  await page.locator('[onclick="saveConfig(\'invoice\')"]').click();await page.locator('#saveMsg').filter({hasText:'必须明确填写'}).waitFor();
  assert.equal(fs.existsSync(path.join(fixture,'config.json')),false);
 });
 await check('saving one group preserves unsaved inputs in other groups',async()=>{
  await page.locator('#taxRate').fill('2');await page.locator('#invoiceBuyerName').fill('示例购买方测试单位');
  await page.locator('.fee-rate').nth(0).fill('3');await page.locator('.fee-rate').nth(1).fill('4');
  await page.locator('[onclick="saveConfig(\'fee\')"]').click();await expectConfigVersion(1);
  assert.equal(await page.locator('#taxRate').inputValue(),'2');assert.equal(await page.locator('#invoiceBuyerName').inputValue(),'示例购买方测试单位');
  await page.locator('[onclick="saveConfig(\'invoice\')"]').click();await expectConfigVersion(2);
 });
 await check('Admin configures bonus bands and manual threshold through fields',async()=>{
  await page.locator('[onclick="addBonusBand(\'profitBands\')"]').click();
  const profit=page.locator('#profitBands .ks-bonus-band');await profit.locator('[data-field="min"]').fill('0');await profit.locator('[data-field="noMax"]').check();await profit.locator('[data-field="value"]').fill('100');
  await page.locator('[onclick="addBonusBand(\'kpi2Bands\')"]').click();
  const kpi=page.locator('#kpi2Bands .ks-bonus-band');await kpi.locator('[data-field="min"]').fill('0');await kpi.locator('[data-field="noMax"]').check();await kpi.locator('[data-field="value"]').fill('1');
  await page.locator('#manualKpi2Threshold').fill('80');
  await page.locator('[onclick="saveConfig(\'bonus\')"]').click();await expectConfigVersion(3);
  const cfg=JSON.parse(fs.readFileSync(path.join(fixture,'config.json'),'utf8'));assert.equal(cfg.taxRate,0.02);assert.equal(cfg.bonusRules.manualKpi2Threshold,0.8);assert.equal(cfg.configAuditRecords.length,3);
  await shot('02-config-saved');await inspect('config-saved');
 });
 await check('reload shows saved explicit parameters without changing their version',async()=>{
  await page.reload();await expectConfigVersion(3);assert.equal(await page.locator('#taxRate').inputValue(),'2');assert.equal(await page.locator('#manualKpi2Threshold').inputValue(),'80');
 });
 await check('Admin creates employee payee with no bank requirement and no implicit invoice grant',async()=>{
  await createUser('ui-employee','user',true);
  const state=JSON.parse(fs.readFileSync(path.join(fixture,'data.json'),'utf8'));
  assert.equal(state.users.find(x=>x.username==='ui-employee').invoiceReplacementAllowed,false);
  assert.equal(state.suppliers.length,1);assert.equal(state.suppliers[0].payeeAccountType,'employee-payee');assert.equal(state.suppliers[0].bankAccount,'');
 });
 await check('Admin explicitly grants employee replacement using checkbox and confirmation dialog',async()=>{
  const checkbox=page.locator('input[data-username="ui-employee"][onchange*="setInvoiceReplacementPermission"]');
  assert.equal(await checkbox.isChecked(),false);await checkbox.click();
  const dialog=page.locator('dialog[open]');await dialog.locator('[name="reason"]').fill('Synthetic UI acceptance');
  await dialog.locator('[data-submit]').click();
  await page.waitForFunction(()=>document.querySelector('input[data-username="ui-employee"][onchange*="setInvoiceReplacementPermission"]')?.checked);
  const state=JSON.parse(fs.readFileSync(path.join(fixture,'data.json'),'utf8'));
  assert.equal(state.users.find(x=>x.username==='ui-employee').invoiceReplacementAllowed,true);
  assert.deepEqual(state.accountLifecycleAuditRecords[0].permissionChange,{before:false,after:true});
  await shot('03-user-permission');await inspect('user-permission');
 });
 await createUser('ui-approver','approver',false);

 // Synthetic master records use actual APIs; project/payment and review below use visible controls.
 const apiAdmin=(await runtime.call('/api/login',{method:'POST',body:{username:'ui-admin',password}})).data.token;
 async function syntheticApi(url,token,body,method='POST'){
  const r=await runtime.call(url,{token,body,method});assert.equal(r.status,200,url+' '+JSON.stringify(r.data));return r.data;
 }
 const uiClient=(await syntheticApi('/api/clients',apiAdmin,{fullName:'界面合成甲方有限公司'})).record;
 const uiSupplier=(await syntheticApi('/api/suppliers',apiAdmin,{name:'界面合成供应商有限公司',bankAccount:'SYNTHETIC',payeeAccountType:'formal-supplier'})).supplier;
 const businessContext=await context.browser().newContext({viewport:{width:1440,height:1000}});
 try{
  const employeePage=await businessContext.newPage();observe(employeePage);
  await employeePage.goto(origin+'/login.html');await employeePage.locator('#username').fill('ui-employee');await employeePage.locator('#password').fill(password);await employeePage.locator('#loginSubmitButton').click();await employeePage.waitForURL('**/approval.html');
  let uiAppId,uiPayId;
  await check('employee submits actual project through visible form with empty activity date initially',async()=>{
   await employeePage.locator('#clientId').selectOption(uiClient.id);assert.equal(await employeePage.locator('#startDate').inputValue(),'');
   await employeePage.locator('#projectName').fill('Synthetic UI financial project');await employeePage.locator('#approver').selectOption('ui-admin');await employeePage.locator('#startDate').fill(new Date().toISOString().slice(0,10));
   if(await employeePage.locator('#appTableBody .item-select').count()===0)await employeePage.locator('[onclick="addAppRow()"]').click();
   const row=employeePage.locator('#appTableBody tr').filter({has:employeePage.locator('.item-select')}).first();
   await row.locator('.item-select').selectOption('其他');await row.locator('.content-input').fill('Synthetic UI service');await row.locator('.supplier-select').selectOption(uiSupplier.name);await row.locator('.is-proxy-select').selectOption('否');await row.locator('.amount-input').fill('300');await row.locator('.amount-input').blur();
   await employeePage.locator('#contractAmount').fill('1000');await employeePage.locator('#contractAmount').blur();await inspect('employee-filled-project',employeePage);
   const done=employeePage.waitForResponse(r=>new URL(r.url()).pathname==='/api/application'&&r.request().method()==='POST');await employeePage.locator('[onclick="submitApplication()"]').click();const r=await done;assert.equal(r.status(),200,await r.text());uiAppId=(await r.json()).id;
   assert.equal(await employeePage.locator('#projectName').inputValue(),'');
  });
  await syntheticApi('/api/config',apiAdmin,{expectedVersion:3,taxRate:0.05},'PUT');
  await page.goto(origin+'/approval.html');await page.locator('#approvalMainTab').click();
  await check('Admin sees saved project tax after configuration changes, and detail is operable',async()=>{
   const row=page.locator('#approvalTableBody tr').filter({hasText:uiAppId});await row.waitFor();assert.match(await row.innerText(),/680\.39/);
   await row.locator('.detail-button').click();await page.locator('#appDetailModal').waitFor({state:'visible'});await inspect('admin-project-detail');await shot('admin-project-detail');
   await page.locator('#appDetailCloseButton').click();
   const done=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/application/'+uiAppId&&r.request().method()==='PUT');await row.locator('.approve-button').click();assert.equal((await done).status(),200);
  });
  await check('employee payment UI inherits approved project rather than new tax setting',async()=>{
   await employeePage.reload();await employeePage.locator('#paymentMainTab').click();await employeePage.locator('#relatedProject').selectOption(uiAppId);
   await employeePage.locator('#paymentApprover').selectOption('ui-admin');assert.match(await employeePage.locator('#paymentTax').innerText(),/19\.61/);await inspect('employee-payment-filled',employeePage);
   const done=employeePage.waitForResponse(r=>new URL(r.url()).pathname==='/api/payment'&&r.request().method()==='POST');await employeePage.locator('#paymentSubmitButton').click();const r=await done;assert.equal(r.status(),200,await r.text());uiPayId=(await r.json()).id;
  });
  await page.reload();await page.locator('#approvalMainTab').click();
  await check('Admin opens payment detail and approves with unchanged saved financial facts',async()=>{
   const row=page.locator('#approvalTableBody tr').filter({hasText:uiPayId});await row.locator('.detail-button').click();await page.locator('#payDetailModal').waitFor({state:'visible'});await inspect('admin-payment-detail');await shot('admin-payment-detail');
   await page.locator('#payDetailCloseButton').click();const done=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/payment/'+uiPayId&&r.request().method()==='PUT');await row.locator('.approve-button').click();assert.equal((await done).status(),200);
  });
  const token=(await syntheticApi('/api/login',null,{username:'ui-employee',password})).token;
  const rows=(await syntheticApi('/api/invoice-summary',token,undefined,'GET')).rows;
  await syntheticApi('/api/invoices/batch-v2',token,{appId:uiAppId,expectedKeys:[rows.find(r=>r.appId===uiAppId).key],items:[{invoiceNo:'80000000000000000001',buyerName:'示例购买方测试单位',sellerName:uiSupplier.name,amount:300,invoiceDate:new Date().toISOString().slice(0,10),invoiceType:'发票'}]});
  await page.goto(origin+'/invoice.html');await page.getByRole('button',{name:'发票审核',exact:true}).click();await inspect('admin-invoice-pending');await shot('admin-invoice-pending');
  await check('approver actual login exposes review, not Admin maintenance',async()=>{
   const c=await context.browser().newContext({viewport:{width:1440,height:1000}});try{
    const p=await c.newPage();observe(p);await p.goto(origin+'/login.html');await p.locator('#username').fill('ui-approver');await p.locator('#password').fill(password);await p.locator('#loginSubmitButton').click();await p.waitForURL('**/approval.html');await p.locator('#approvalMainTab').waitFor({state:'visible'});
    assert.equal(await p.locator('#applicationMainTab').isVisible(),false);assert.equal(await p.locator('#adminBtn').isVisible(),false);await inspect('approver-project-review',p);await p.goto(origin+'/invoice.html');await inspect('approver-invoice',p);
   }finally{await c.close();}
  });
 }finally{await businessContext.close();}
 await page.goto(origin+'/admin.html');await page.locator('[data-tab="users"]').waitFor();

 await check('all eleven Admin module panels open on the real service',async()=>{
  for(const tab of ['users','clients','debts','config','mail','bonus-preview','employee-settlement','suppliers','logs','backups','stats']){
   await page.locator('[data-tab="'+tab+'"]').click();await page.locator('#tab-'+tab).waitFor({state:'visible'});
   await page.waitForTimeout(350);await inspect('admin-'+tab);await shot('admin-'+tab);
  }
 });
 await check('Admin project review and invoice pages are served without missing scripts',async()=>{
  for(const file of ['approval.html','invoice.html']){
   await page.goto(origin+'/'+file);await page.waitForTimeout(500);assert.ok(page.url().endsWith(file));await inspect('admin-'+file);await shot('admin-'+file.replace('.html',''));
  }
 });
 await check('employee real login has no Admin configuration entry and can open employee modules',async()=>{
  const employeeContext=await context.browser().newContext({viewport:{width:1440,height:1000}});
  try{
   const p=await employeeContext.newPage();observe(p);await p.goto(origin+'/login.html');await p.locator('#loginForm').waitFor({state:'visible'});
   await p.locator('#username').fill('ui-employee');await p.locator('#password').fill(password);await p.locator('#loginSubmitButton').click();await p.waitForURL('**/approval.html');
   for(const file of ['approval.html','debt.html','invoice.html']){
    await p.goto(origin+'/'+file);await p.waitForTimeout(450);assert.ok(p.url().endsWith(file));
    await inspect('employee-'+file,p);await p.screenshot({path:path.join(evidence,'employee-'+file.replace('.html','.png')),fullPage:true});
   }
   await p.goto(origin+'/admin.html');await p.waitForURL('**/approval.html');assert.equal(await p.locator('#adminBtn').isVisible(),false);
  }finally{await employeeContext.close();}
 });
 await check('normal full-page flows have no uncaught JavaScript errors',()=>assert.deepEqual(exceptions,[]));
 fs.writeFileSync(path.join(evidence,'initial-unconfigured-notices.json'),JSON.stringify({beforeConfigMessages,beforeConfigNetwork},null,2));
 await check('normal full-page API requests succeed',()=>assert.deepEqual(networkErrors,[]));
 await check('normal full-page console has no warnings or errors',()=>assert.deepEqual(consoleMessages,[]));
 await check('visible page text and controls have sufficient contrast',()=>assert.deepEqual(visual.flatMap(v=>v.lowContrast.map(x=>({page:v.name,...x}))),[]));
 console.log('Public full UI tests: '+count+' passed.');
}catch(error){failure=error;console.error(error.stack);process.exitCode=1;
 if(context){const pages=context.pages();if(pages[0])await pages[0].screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});}
}finally{
 fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify({count,failure:failure?.stack,exceptions,consoleMessages,networkErrors,visual},null,2));
 if(context)await context.close();if(runtime)await runtime.stop();
}
})();