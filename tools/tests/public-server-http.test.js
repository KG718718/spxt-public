'use strict';
// Hosted runner only. All identities, records, files and configuration below are synthetic.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP hosted full-server test; no local files created.');process.exit(0);}
const root=path.resolve(__dirname,'../..');
assert.ok(fs.existsSync(path.join(root,'server.js')),'Public runtime must exist; component tests are not an installable system.');
const {newEmptyState}=require('../../public-startup');
const workRoot=path.join(root,'.test-work');fs.mkdirSync(workRoot,{recursive:true});
const work=fs.mkdtempSync(path.join(workRoot,'full-server-'));
const password='Synthetic-Test-Only-2026!';
let count=0,sequence=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
async function start(directory,{env={}}={}){
    fs.mkdirSync(directory,{recursive:true});
    let output='',port=0,child;
    const stopped=new Promise(resolve=>{
        child=spawn(process.execPath,[path.join(root,'server.js')],{cwd:root,windowsHide:true,
            env:{...process.env,PORT:'0',KSESSION_HOST:'127.0.0.1',
                KSESSION_DATA_FILE:path.join(directory,'data.json'),KSESSION_CONFIG_FILE:path.join(directory,'config.json'),
                KSESSION_ATTACHMENTS_DIR:path.join(directory,'attachments'),KSESSION_BACKUPS_DIR:path.join(directory,'backups'),
                KSESSION_MAIL_CONFIG_FILE:path.join(directory,'mail-reminder.config.json'),
                KSESSION_MAIL_LOG_FILE:path.join(directory,'logs','mail.log'),
                KSESSION_SMTP_SECRET_FILE:path.join(directory,'runtime','secrets','smtp-pass.dpapi'),
                KSESSION_MAIL_ENABLED:'0',KSESSION_MAIL_DRY_RUN:'1',KSESSION_MAIL_FORMAL_ENABLED:'0',
                KSESSION_SKIP_STARTUP_JOBS:'1',...env},
            stdio:['ignore','pipe','pipe']});
        child.on('exit',code=>resolve(code));
    });
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/);if(match)port=Number(match[1]);});
    child.stderr.on('data',chunk=>output+=chunk);
    for(let i=0;i<160&&!port&&child.exitCode===null;i++)await new Promise(r=>setTimeout(r,50));
    return {directory,child,stopped,get output(){return output;},port,
        async stop(){if(child.exitCode===null)child.kill();await stopped;},
        async call(url,{method='GET',body,token,headers={}}={}){
            assert.ok(port,'Runtime did not start: '+output);
            const response=await fetch('http://127.0.0.1:'+port+url,{method,redirect:'manual',
                headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json',Origin:'http://127.0.0.1:'+port}:{}),...headers},
                ...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
            const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
            return {status:response.status,data,headers:response.headers};
        }};
}
function directory(){return path.join(work,String(++sequence));}
function saved(f){return fs.readFileSync(path.join(f.directory,'data.json'),'utf8');}
async function login(f,name){const r=await f.call('/api/login',{method:'POST',body:{username:name,password}});assert.equal(r.status,200,JSON.stringify(r.data));return r.data.token;}
(async()=>{
let f;
try{
    f=await start(directory());assert.ok(f.port,f.output);
    await check('fresh runtime creates no business data/config before setup',()=>{
        assert.equal(fs.existsSync(path.join(f.directory,'data.json')),false);
        assert.equal(fs.existsSync(path.join(f.directory,'config.json')),false);
        assert.deepEqual(fs.readdirSync(path.join(f.directory,'attachments')),[]);
    });
    await check('setup GET and real login page are served',async()=>{
        assert.equal((await f.call('/api/setup')).data.initializationRequired,true);
        const page=await f.call('/login.html');assert.equal(page.status,200);assert.match(page.data,/K⁺-SESSION/);
    });
    await check('business API blocked before setup',async()=>assert.equal((await f.call('/api/data')).status,503));
    await check('first Admin initialization creates exactly one account and no business records',async()=>{
        const r=await f.call('/api/setup',{method:'POST',body:{username:'test-admin',password}});assert.equal(r.status,201,JSON.stringify(r.data));
        const state=JSON.parse(saved(f));assert.equal(state.users.length,1);assert.match(state.users[0].password,/^pbkdf2-sha256\$/);
        for(const key of ['applications','payments','debts','clients','suppliers','invoices'])assert.deepEqual(state[key],[]);
    });
    await check('repeat setup is refused without data changes',async()=>{
        const before=saved(f);assert.equal((await f.call('/api/setup',{method:'POST',body:{username:'second-admin',password}})).status,409);
        assert.equal(saved(f),before);
    });
    const admin=await login(f,'test-admin');
    await check('real login uses random token and HttpOnly Strict cookie',async()=>{
        const r=await f.call('/api/login',{method:'POST',body:{username:'test-admin',password}});
        assert.equal(Buffer.from(r.data.token,'base64url').length,32);assert.notEqual(r.data.token,admin);
        assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
    });
    await check('malformed cookie does not crash service or authenticate',async()=>{
        assert.equal((await f.call('/api/data',{headers:{Cookie:'k_session=%zz'}})).status,401);
        assert.equal((await f.call('/api/check-auth',{token:admin})).status,200);
    });
    await check('remote command and machine-status endpoints do not exist',async()=>{
        for(const route of ['/api/admin/exec','/api/admin/status'])assert.equal((await f.call(route,{token:admin})).status,404);
    });
    await check('first config view has no tax, buyer, fee or bonus defaults',async()=>{
        const r=await f.call('/api/config',{token:admin});assert.equal(r.status,200,JSON.stringify(r.data));
        assert.equal(r.data.taxRate,null);assert.deepEqual(r.data.serviceFeeRates,{});assert.equal(r.data.configVersion,0);
    });
    await check('Admin creates ordinary synthetic employee and approver without replacement grants',async()=>{
        for(const [username,role] of [['test-employee','user'],['test-approver','approver']]){
            const r=await f.call('/api/users',{method:'POST',token:admin,body:{username,password,role,invoiceReplacementAllowed:true}});
            assert.equal(r.status,200,JSON.stringify(r.data));
            assert.equal(JSON.parse(saved(f)).users.find(u=>u.username===username).invoiceReplacementAllowed,false);
        }
    });
    let employee=await login(f,'test-employee');const approver=await login(f,'test-approver');
    await check('employee cannot save system configuration; bytes unchanged',async()=>{
        const before=saved(f);assert.equal((await f.call('/api/config',{method:'PUT',token:employee,body:{expectedVersion:0,taxRate:0.02}})).status,403);
        assert.equal(saved(f),before);assert.equal(fs.existsSync(path.join(f.directory,'config.json')),false);
    });
    await check('config writes are versioned and do not rewrite business data',async()=>{
        const before=saved(f);const r=await f.call('/api/config',{method:'PUT',token:admin,body:{expectedVersion:0,taxRate:0.02,invoiceBuyerName:'示例购买方测试单位',serviceFeeRates:{default:0.03,'礼品采购':0.04}}});
        assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.config.configVersion,1);assert.equal(saved(f),before);
        const cfg=JSON.parse(fs.readFileSync(path.join(f.directory,'config.json'),'utf8'));assert.equal(cfg.configAuditRecords.length,1);
        assert.equal((await f.call('/api/config',{method:'PUT',token:admin,body:{expectedVersion:0,taxRate:0}})).status,409);
    });
    await check('employee configuration view hides Admin-only fields and logs',async()=>{
        const r=await f.call('/api/config',{token:employee});assert.equal(r.data.taxRate,0.02);
        for(const field of ['configVersion','configAuditRecords','invoiceBuyerName','bonusRules'])assert.equal(Object.hasOwn(r.data,field),false,field);
        assert.equal((await f.call('/api/logs',{token:employee})).status,403);
    });
    await check('config audit visible via existing Admin log API',async()=>{
        const r=await f.call('/api/logs',{token:admin});assert.equal(r.status,200);
        assert.ok(r.data.some(row=>row.action==='修改配置'&&row.id==='CONFIG-1'));
    });
    await check('employee cannot self-grant; approver cannot grant',async()=>{
        const before=saved(f);
        for(const token of [employee,approver])assert.equal((await f.call('/api/users/test-employee/invoice-replacement',{method:'POST',token,body:{allowed:true,expectedVersion:0,reason:'Synthetic test'}})).status,403);
        assert.equal(saved(f),before);
    });
    await check('Admin explicit grant is atomic, audited, versioned and revokes old employee session',async()=>{
        const r=await f.call('/api/users/test-employee/invoice-replacement',{method:'POST',token:admin,body:{allowed:true,expectedVersion:0,reason:'Synthetic test grant'}});
        assert.equal(r.status,200,JSON.stringify(r.data));
        const state=JSON.parse(saved(f));const user=state.users.find(u=>u.username==='test-employee');
        assert.equal(user.invoiceReplacementAllowed,true);assert.equal(user.lifecycleVersion,1);
        assert.deepEqual(state.accountLifecycleAuditRecords[0].permissionChange,{before:false,after:true});
        assert.equal((await f.call('/api/data',{token:employee})).status,401);employee=await login(f,'test-employee');
    });
    await check('revoke and stale grant refuse/commit with exact current version',async()=>{
        const stale=await f.call('/api/users/test-employee/invoice-replacement',{method:'POST',token:admin,body:{allowed:false,expectedVersion:0,reason:'Synthetic test'}});
        assert.equal(stale.status,409);
        const r=await f.call('/api/users/test-employee/invoice-replacement',{method:'POST',token:admin,body:{allowed:false,expectedVersion:1,reason:'Synthetic revoke'}});
        assert.equal(r.status,200);assert.equal(JSON.parse(saved(f)).users.find(u=>u.username==='test-employee').invoiceReplacementAllowed,false);
    });
    await check('cross-origin config or login is rejected',async()=>{
        for(const url of ['/api/config','/api/login'])assert.equal((await f.call(url,{method:url.endsWith('config')?'PUT':'POST',token:admin,body:{},headers:{Origin:'https://untrusted.invalid'}})).status,403);
    });
    await check('all empty module API reads remain available without default bonus configuration',async()=>{
        for(const url of ['/api/data','/api/suppliers','/api/clients','/api/debts','/api/invoice-summary','/api/invoices','/api/invoice-submissions','/api/invoice-pools','/api/bonus-confirmations?year=2026&month=9','/api/mail-reminders/config']){
            const r=await f.call(url,{token:admin});assert.equal(r.status,200,url+' '+JSON.stringify(r.data));
        }
    });
    const beforeRestart=saved(f),dir=f.directory;
    await f.stop();f=await start(dir);
    await check('restart preserves all stored records and invalidates previous sessions',async()=>{
        assert.ok(f.port,f.output);assert.equal(saved(f),beforeRestart);
        assert.equal((await f.call('/api/data',{token:admin})).status,401);
        const token=await login(f,'test-admin');const r=await f.call('/api/config',{token});assert.equal(r.data.taxRate,0.02);assert.equal(r.data.configVersion,1);
    });
    await f.stop();f=null;
    for(const kind of ['attachments','backups','mail','corrupt-data','corrupt-config']){
        await check('startup refuses '+kind+' remnants without resetting them',async()=>{
            const d=directory();fs.mkdirSync(d,{recursive:true});let target,bytes='synthetic';
            if(kind==='attachments'||kind==='backups'){fs.mkdirSync(path.join(d,kind));target=path.join(d,kind,'preserve.txt');}
            else if(kind==='mail'){target=path.join(d,'mail-reminder.config.json');bytes='{}';}
            else {target=path.join(d,kind==='corrupt-data'?'data.json':'config.json');bytes='{broken';}
            fs.writeFileSync(target,bytes);f=await start(d);assert.equal(f.port,0,'Must not listen with '+kind);await f.stop();assert.equal(fs.readFileSync(target,'utf8'),bytes);f=null;
        });
    }
    console.log('Public full-server HTTP tests: '+count+' passed.');
}finally{if(f)await f.stop();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
