'use strict';
// Synthetic HTTP/FS tests run only on the approved hosted runner.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
if(process.env.GITHUB_ACTIONS!=='true'){
    console.log('SKIP hosted bootstrap HTTP tests; no local fixture created.');
    process.exit(0);
}
const {createBootstrapHandler}=require('../../public-bootstrap-http');
const root=path.resolve(__dirname,'../..','.test-work');
fs.mkdirSync(root,{recursive:true});
const work=fs.mkdtempSync(path.join(root,'bootstrap-http-'));
let count=0,seq=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
function options(){
    const directory=path.join(work,String(++seq));fs.mkdirSync(directory);
    return {directory,dataFile:path.join(directory,'data.json'),configFile:path.join(directory,'config.json'),
        priorDirectories:[path.join(directory,'attachments'),path.join(directory,'backups')],
        priorFiles:[path.join(directory,'mail-config.json')]};
}
async function fixture(overrides={}){
    const storage=options();let loaded=null;
    let server;
    const handler=createBootstrapHandler({...storage,getPort:()=>server.address().port,
        onInitialized:state=>{loaded=state;},...overrides});
    server=http.createServer((req,res)=>{if(!handler(req,res)){res.statusCode=404;res.end('Not Found');}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const port=server.address().port;
    return {storage,server,handler,port,loaded:()=>loaded,
        stop:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
function call(f,{method='GET',route='/api/setup',payload,body,headers={}}={}){
    const bytes=body!==undefined?body:payload!==undefined?JSON.stringify(payload):undefined;
    return new Promise((resolve,reject)=>{
        const req=http.request({host:'127.0.0.1',port:f.port,path:route,method,
            headers:{host:'127.0.0.1:'+f.port,...(method==='POST'?{'content-type':'application/json',origin:'http://127.0.0.1:'+f.port}:{}),...headers}},
            res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');let data;try{data=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:res.headers,text,data});});});
        req.on('error',reject);if(bytes!==undefined)req.write(bytes);req.end();
    });
}
const valid={username:'installer-fixture',password:'Synthetic-only-password!2026'};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
    const f=await fixture();
    try{
        await check('fresh GET reports setup required with no disk write',async()=>{const r=await call(f);assert.equal(r.status,200);assert.deepEqual(r.data,{initializationRequired:true});assert.equal(fs.existsSync(f.storage.dataFile),false);assert.equal(r.headers['cache-control'],'no-store');});
        await check('unknown endpoint is not handled',async()=>assert.equal((await call(f,{route:'/not-setup'})).status,404));
        await check('untrusted Host is refused',async()=>assert.equal((await call(f,{headers:{host:'untrusted.invalid'}})).status,403));
        await check('cross-origin GET is refused',async()=>assert.equal((await call(f,{headers:{origin:'http://untrusted.invalid'}})).status,403));
        await check('unsupported method returns 405 and Allow',async()=>{const r=await call(f,{method:'PUT',body:'invalid'});assert.equal(r.status,405);assert.equal(r.headers.allow,'GET, POST');});
        await check('POST without Origin is refused',async()=>assert.equal((await call(f,{method:'POST',payload:valid,headers:{origin:''}})).status,403));
        await check('POST cross origin is refused',async()=>assert.equal((await call(f,{method:'POST',payload:valid,headers:{origin:'http://untrusted.invalid'}})).status,403));
        await check('plain text payload is refused',async()=>assert.equal((await call(f,{method:'POST',payload:valid,headers:{'content-type':'text/plain'}})).status,415));
        await check('malformed JSON fails',async()=>assert.equal((await call(f,{method:'POST',body:'{bad'})).status,400));
        await check('JSON array fails',async()=>assert.equal((await call(f,{method:'POST',payload:[]})).status,400));
        await check('empty body fails',async()=>assert.equal((await call(f,{method:'POST',body:''})).status,400));
        await check('caller cannot add role or default users',async()=>assert.equal((await call(f,{method:'POST',payload:{...valid,role:'user'}})).status,400));
        await check('short password fails',async()=>assert.equal((await call(f,{method:'POST',payload:{...valid,password:'short'}})).status,400));
        await check('invalid username fails',async()=>assert.equal((await call(f,{method:'POST',payload:{...valid,username:' spaced '}})).status,400));
        await check('chunked oversized body fails',async()=>assert.equal((await call(f,{method:'POST',body:'x'.repeat(9000)})).status,413));
        await check('all rejected requests leave zero state',async()=>{assert.equal(fs.existsSync(f.storage.dataFile),false);assert.equal(f.loaded(),null);assert.deepEqual(fs.readdirSync(f.storage.directory),[]);});
        await check('forwarded headers cannot impersonate remote socket',async()=>{const r=await call(f,{headers:{'x-forwarded-for':'198.51.100.20','x-forwarded-host':'untrusted.invalid'}});assert.equal(r.status,200);});
        await check('non-loopback socket is denied even with spoofed proxy headers',async()=>{
            const req={url:'/api/setup',method:'GET',headers:{host:'127.0.0.1:'+f.port,'x-forwarded-for':'127.0.0.1'},socket:{remoteAddress:'198.51.100.20'}};
            const res={statusCode:0,setHeader(){},end(){}};assert.equal(f.handler(req,res),true);assert.equal(res.statusCode,403);
        });
        await check('first valid POST creates only installer Admin',async()=>{
            const r=await call(f,{method:'POST',payload:valid});assert.equal(r.status,201);assert.deepEqual(r.data,{success:true,initializationRequired:false});
            assert.doesNotMatch(r.text,/password|token|pbkdf2|installer-fixture/);
            const saved=JSON.parse(fs.readFileSync(f.storage.dataFile,'utf8'));assert.equal(saved.users.length,1);assert.equal(saved.users[0].role,'admin');
            assert.match(saved.users[0].password,/^pbkdf2-sha256\$210000\$/);assert.notEqual(saved.users[0].password,valid.password);
            for(const k of ['applications','payments','debts','clients','invoices','suppliers','bonusConfirmations','employeeSettlements'])assert.deepEqual(saved[k],[]);
            assert.equal(saved.logs.length,1);assert.equal(f.loaded().users[0].username,valid.username);assert.equal(fs.existsSync(f.storage.configFile),false);
        });
        await check('initialized GET exposes no account details',async()=>{const r=await call(f);assert.deepEqual(r.data,{initializationRequired:false});});
        await check('repeated POST cannot overwrite Admin or facts',async()=>{const before=hash(f.storage.dataFile);assert.equal((await call(f,{method:'POST',payload:{...valid,username:'second-fixture'}})).status,409);assert.equal(hash(f.storage.dataFile),before);});
    }finally{await f.stop();}
    for(const [name,seed] of [
        ['corrupt data',s=>fs.writeFileSync(s.dataFile,'{broken')],
        ['invalid config',s=>fs.writeFileSync(s.configFile,'[]')],
        ['orphan config',s=>fs.writeFileSync(s.configFile,'{}')],
        ['orphan attachment',s=>{fs.mkdirSync(s.priorDirectories[0]);fs.writeFileSync(path.join(s.priorDirectories[0],'synthetic.txt'),'synthetic');}],
        ['orphan mail config',s=>fs.writeFileSync(s.priorFiles[0],'{}')]
    ]){
        const x=await fixture();
        try{seed(x.storage);await check(name+' does not initialize or overwrite',async()=>{
            const exists=fs.existsSync(x.storage.dataFile),before=exists?hash(x.storage.dataFile):null;
            assert.equal((await call(x)).status,503);assert.equal((await call(x,{method:'POST',payload:valid})).status,503);
            assert.equal(fs.existsSync(x.storage.dataFile),exists);if(exists)assert.equal(hash(x.storage.dataFile),before);
        });}finally{await x.stop();}
    }
    const reloaded=await fixture({...f.storage});
    try{await check('restarted HTTP handler reads existing initialized state',async()=>{const before=hash(f.storage.dataFile);assert.deepEqual((await call(reloaded)).data,{initializationRequired:false});assert.equal((await call(reloaded,{method:'POST',payload:valid})).status,409);assert.equal(hash(f.storage.dataFile),before);});}finally{await reloaded.stop();}
    const fault=await fixture({fs:{...fs,readdirSync:()=>{const e=new Error('private-synthetic-fs-path');e.code='EACCES';throw e;}}});
    try{fs.mkdirSync(fault.storage.priorDirectories[0]);await check('unexpected filesystem errors hide paths and preserve storage',async()=>{const r=await call(fault);assert.equal(r.status,503);assert.doesNotMatch(r.text,/private-synthetic|EACCES/);assert.equal(fs.existsSync(fault.storage.dataFile),false);});}finally{await fault.stop();}
    const x=await fixture();
    try{
        await check('concurrent POST publishes exactly one Admin',async()=>{
            const results=await Promise.all([call(x,{method:'POST',payload:valid}),call(x,{method:'POST',payload:{...valid,username:'other-installer-fixture'}})]);
            assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(JSON.parse(fs.readFileSync(x.storage.dataFile,'utf8')).users.length,1);
        });
    }finally{await x.stop();}
    const failed=await fixture({onInitialized:()=>{throw Error('synthetic callback secret');}});
    try{
        await check('runtime handoff failure preserves committed initialization',async()=>{
            const r=await call(failed,{method:'POST',payload:valid});assert.equal(r.status,503);assert.equal(r.data.code,'INITIALIZATION_RELOAD_REQUIRED');
            assert.doesNotMatch(r.text,/synthetic callback secret|pbkdf2|password/);const before=hash(failed.storage.dataFile);
            assert.equal((await call(failed,{method:'POST',payload:valid})).status,409);assert.equal(hash(failed.storage.dataFile),before);
        });
    }finally{await failed.stop();}

    for(const marker of [{accountStatus:'deleted'},{deletedAt:'2025-02-03T00:00:00.000Z'}]){
        const tombstone=await fixture();
        try{
            assert.equal((await call(tombstone,{method:'POST',payload:valid})).status,201);
            const data=JSON.parse(fs.readFileSync(tombstone.storage.dataFile,'utf8'));
            data.users.push({username:'former-fixture',role:'user',...marker});
            data.applications.push({id:'HISTORY-FIXTURE',applicant:'former-fixture',status:'closed',taxAmount:12,taxRateSnapshot:0.03});
            fs.writeFileSync(tombstone.storage.dataFile,JSON.stringify(data));
            await check('credential-free deleted history loads without reopening setup',async()=>{
                const before=hash(tombstone.storage.dataFile);
                assert.deepEqual((await call(tombstone)).data,{initializationRequired:false});
                assert.equal((await call(tombstone,{method:'POST',payload:valid})).status,409);
                assert.equal(hash(tombstone.storage.dataFile),before);
                assert.deepEqual(JSON.parse(fs.readFileSync(tombstone.storage.dataFile,'utf8')),data);
            });
        }finally{await tombstone.stop();}
    }
    for(const taxRate of [null,'',false,-0.01,0]){
        const taxFixture=await fixture();
        try{
            assert.equal((await call(taxFixture,{method:'POST',payload:valid})).status,201);
            fs.writeFileSync(taxFixture.storage.configFile,JSON.stringify({taxRate}));
            await check('configured tax validates before initialized setup response: '+String(taxRate),async()=>{
                const dataHash=hash(taxFixture.storage.dataFile),configHash=hash(taxFixture.storage.configFile);
                const read=await call(taxFixture),post=await call(taxFixture,{method:'POST',payload:valid});
                assert.equal(read.status,taxRate===0?200:503);assert.equal(post.status,taxRate===0?409:503);
                assert.equal(hash(taxFixture.storage.dataFile),dataHash);assert.equal(hash(taxFixture.storage.configFile),configHash);
            });
        }finally{await taxFixture.stop();}
    }


    for(const invoiceBuyerName of [null,'',false,'有限公司','合成购买方有限公司']){
        const buyerFixture=await fixture();
        try{
            assert.equal((await call(buyerFixture,{method:'POST',payload:valid})).status,201);
            fs.writeFileSync(buyerFixture.storage.configFile,JSON.stringify({invoiceBuyerName}));
            await check('saved buyer configuration is validated before setup read',async()=>{
                const dataHash=hash(buyerFixture.storage.dataFile),configHash=hash(buyerFixture.storage.configFile);
                const ok=invoiceBuyerName==='合成购买方有限公司';
                assert.equal((await call(buyerFixture)).status,ok?200:503);
                assert.equal((await call(buyerFixture,{method:'POST',payload:valid})).status,ok?409:503);
                assert.equal(hash(buyerFixture.storage.dataFile),dataHash);
                assert.equal(hash(buyerFixture.storage.configFile),configHash);
            });
        }finally{await buyerFixture.stop();}
    }
    for(const invoiceReplacementAllowed of [false,true,'true',null]){
        const permissionFixture=await fixture();
        try{
            assert.equal((await call(permissionFixture,{method:'POST',payload:valid})).status,201);
            const data=JSON.parse(fs.readFileSync(permissionFixture.storage.dataFile,'utf8'));
            data.users.push({username:'permission-fixture',role:'user',password:'synthetic-hash',invoiceReplacementAllowed});
            fs.writeFileSync(permissionFixture.storage.dataFile,JSON.stringify(data));
            await check('saved replacement authorization is validated without normalization',async()=>{
                const before=hash(permissionFixture.storage.dataFile),ok=typeof invoiceReplacementAllowed==='boolean';
                assert.equal((await call(permissionFixture)).status,ok?200:503);
                assert.equal((await call(permissionFixture,{method:'POST',payload:valid})).status,ok?409:503);
                assert.equal(hash(permissionFixture.storage.dataFile),before);
            });
        }finally{await permissionFixture.stop();}
    }

    console.log('Public bootstrap HTTP checks: '+count+' passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
