'use strict';
// Hosted-only, synthetic HTTP/filesystem integration; the identity adapter is not the full login system.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawnSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true') {console.log('SKIP hosted config HTTP tests; no local files created.');process.exit(0);}
const {createConfigStore}=require('../../public-config-store');
const {createConfigHandler,MAX_BODY_BYTES}=require('../../public-config-http');
const {loadStartupState,newEmptyState}=require('../../public-startup');
const root=path.resolve(__dirname,'../..','.test-work');
fs.mkdirSync(root,{recursive:true});
const work=fs.mkdtempSync(path.join(root,'config-http-'));
let count=0,seq=0;
async function check(name,fn) {await fn();count++;console.log('PASS '+name);}
async function fixture(initial) {
    const directory=path.join(work,String(++seq));fs.mkdirSync(directory);
    const configFile=path.join(directory,'config.json'),dataFile=path.join(directory,'data.json');
    const business={...newEmptyState(),users:[{username:'fixture-admin',role:'admin',password:'synthetic-only'}],
        applications:[{id:'FIXTURE-APP',taxAmount:12,taxRate:0.02,contractAmount:612}],
        payments:[{id:'FIXTURE-PAY',projectId:'FIXTURE-APP',status:'approved',contractAmount:612}]};
    fs.writeFileSync(dataFile,JSON.stringify(business));
    if(initial!==undefined)fs.writeFileSync(configFile,JSON.stringify(initial));
    let fault=null,onLookup=null;
    const io=new Proxy(fs,{get(target,key){
        if(['writeFileSync','fsyncSync','renameSync'].includes(key))return (...args)=>{
            if(fault===key)throw Object.assign(Error('synthetic persistence failure'),{code:'EACCES'});
            return target[key](...args);
        };
        return target[key];
    }});
    const users=new Map([
        ['admin',{username:'fixture-admin',role:'admin',accountStatus:'active'}],
        ['employee',{username:'fixture-employee',role:'user',accountStatus:'active'}],
        ['reviewer',{username:'fixture-reviewer',role:'approver',accountStatus:'active'}]
    ]);
    let store=createConfigStore({configFile,fs:io});
    const oldLogs=[{time:'2025/1/1 00:00:00',user:'fixture-old',action:'历史操作',detail:'original'}];
    let logReads=0;
    const handler=createConfigHandler({store,getCurrentUser(req){onLookup?.(req);return users.get(req.headers['x-fixture-role']);},
        getLogs(){logReads++;return oldLogs;}});
    const server=http.createServer((req,res)=>{if(!handler(req,res)){res.statusCode=404;res.end();}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    return {server,port:server.address().port,configFile,dataFile,directory,users,store,oldLogs,
        fault:v=>{fault=v;},onLookup:v=>{onLookup=v;},logReads:()=>logReads,
        stop:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
function request(f,{role='admin',method='GET',route='/api/config',payload,body,headers={},start}={}) {
    return new Promise((resolve,reject)=>{
        const req=http.request({host:'127.0.0.1',port:f.port,path:route,method,headers:{
            'x-fixture-role':role,origin:'http://127.0.0.1:'+f.port,'content-type':'application/json',...headers}},
            res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>{
                const text=Buffer.concat(chunks).toString('utf8');resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(text||'null')});
            });});
        req.on('error',reject);
        if(start) {start(req);return;}
        req.end(body!==undefined?body:payload!==undefined?JSON.stringify(payload):undefined);
    });
}
function bytes(f) {return fs.existsSync(f.configFile)?fs.readFileSync(f.configFile,'utf8'):null;}
async function unchanged(f,options,status) {
    const before=bytes(f),memory=f.store.getConfig(),data=fs.readFileSync(f.dataFile,'utf8');
    const result=await request(f,options);assert.equal(result.status,status);
    assert.equal(bytes(f),before);assert.deepEqual(f.store.getConfig(),memory);assert.equal(fs.readFileSync(f.dataFile,'utf8'),data);
    return result;
}
(async()=>{
    const f=await fixture({taxRate:0.02,privateSetting:'not-for-api'});
    try {
        await check('Admin reads version without unknown configuration fields',async()=>{
            const r=await request(f);assert.equal(r.status,200);assert.equal(r.body.configVersion,0);assert.equal(r.body.taxRate,0.02);
            assert.equal(r.headers['cache-control'],'no-store');assert.ok(!JSON.stringify(r).includes('not-for-api'));
        });
        for(const role of ['employee','reviewer','unknown'])await check('write access denied '+role,()=>unchanged(f,{role,method:'PUT',body:'{invalid'},role==='unknown'?401:403));
        for(const role of ['employee','reviewer','unknown'])await check('operation log denied '+role,()=>unchanged(f,{role,route:'/api/logs'},role==='unknown'?401:403));
        for(const route of ['/api/config','/api/logs'])await check('unsupported method rejected before invalid JSON '+route,()=>unchanged(f,{method:'POST',route,body:'{invalid'},405));
        await check('cross-origin PUT rejected',()=>unchanged(f,{method:'PUT',payload:{taxRate:0.03,expectedVersion:0},headers:{origin:'https://outside.invalid'}},403));
        await check('cookie request without Origin rejected',()=>unchanged(f,{method:'PUT',payload:{taxRate:0.03,expectedVersion:0},headers:{origin:'',cookie:'fixture=synthetic'}},403));
        await check('non-JSON rejected',()=>unchanged(f,{method:'PUT',body:'{}',headers:{'content-type':'text/plain'}},415));
        await check('invalid JSON rejected',()=>unchanged(f,{method:'PUT',body:'{'},400));
        await check('oversize body rejected',()=>unchanged(f,{method:'PUT',body:' '.repeat(MAX_BODY_BYTES+1)},413));
        for(const payload of [{taxRate:0.03},{taxRate:null,expectedVersion:0},{configAuditRecords:[],expectedVersion:0},
            {expectedVersion:0},{kpiFormulas:'arbitrary',expectedVersion:0}])
            await check('invalid/forged payload '+JSON.stringify(payload),()=>unchanged(f,{method:'PUT',payload},400));
        for(const stage of ['writeFileSync','fsyncSync','renameSync']) await check('real disk '+stage+' failure rolls back',async()=>{
            f.fault(stage);await unchanged(f,{method:'PUT',payload:{taxRate:0.03,expectedVersion:0}},503);f.fault(null);
            assert.deepEqual(fs.readdirSync(f.directory).sort(),['config.json','data.json']);
        });
        await check('atomic success persists both config and audit without saving business data',async()=>{
            const original=fs.readFileSync(f.dataFile,'utf8'),logs=JSON.stringify(f.oldLogs);
            const r=await request(f,{method:'PUT',payload:{taxRate:0.03,expectedVersion:0}});
            assert.equal(r.status,200);assert.equal(r.body.config.configVersion,1);
            const saved=JSON.parse(bytes(f));assert.equal(saved.taxRate,0.03);assert.equal(saved.configAuditRecords.length,1);
            assert.equal(saved.configAuditRecords[0].before.taxRate,0.02);assert.equal(saved.configAuditRecords[0].after.taxRate,0.03);
            assert.equal(fs.readFileSync(f.dataFile,'utf8'),original);assert.equal(JSON.stringify(f.oldLogs),logs);assert.equal(f.logReads(),0);
        });
        await check('old page retry returns 409 with no duplicate event',()=>unchanged(f,{method:'PUT',payload:{taxRate:0.03,expectedVersion:0}},409));
        await check('two requests with same version commit exactly once',async()=>{
            const result=await Promise.all([0.04,0.05].map(taxRate=>request(f,{method:'PUT',payload:{taxRate,expectedVersion:1}})));
            assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);const s=JSON.parse(bytes(f));
            assert.equal(s.configVersion,2);assert.equal(s.configAuditRecords.length,2);
            assert.equal(s.taxRate,result.find(r=>r.status===200).body.config.taxRate);
        });
        await check('original log endpoint displays audits and original history',async()=>{
            const r=await request(f,{route:'/api/logs'});assert.equal(r.status,200);assert.equal(r.body.length,3);
            assert.equal(r.body[0].id,'CONFIG-2');assert.equal(r.body[1].id,'CONFIG-1');assert.deepEqual(r.body[2],f.oldLogs[0]);
        });
        await check('fresh process reloads committed audit and parameters',async()=>{
            const code="const {createConfigStore}=require('./public-config-store');const s=createConfigStore({configFile:process.argv[1]});process.stdout.write(JSON.stringify(s.getConfig()));";
            const r=spawnSync(process.execPath,['-e',code,f.configFile],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',windowsHide:true});
            assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),JSON.parse(bytes(f)));
        });
        await check('public startup accepts committed configuration and preserves business snapshots',async()=>{
            const before=fs.readFileSync(f.dataFile,'utf8');
            const s=loadStartupState({configFile:f.configFile,dataFile:f.dataFile});assert.equal(s.config.configVersion,2);
            assert.equal(s.data.applications[0].taxRate,0.02);assert.equal(s.data.applications[0].taxAmount,12);
            assert.equal(fs.readFileSync(f.dataFile,'utf8'),before);
        });
        await check('Admin revoked while body arrives cannot save',async()=>{
            let seen;const firstLookup=new Promise(resolve=>{seen=resolve;});f.onLookup(()=>{seen();});
            const before=bytes(f);const pending=request(f,{method:'PUT',start(req){
                req.write('{"expectedVersion":2,');firstLookup.then(()=>{f.users.get('admin').role='user';req.end('"taxRate":0.08}');});
            }});
            const r=await pending;assert.equal(r.status,403);assert.equal(bytes(f),before);
            f.users.get('admin').role='admin';f.onLookup(null);
        });
        await check('aborted request body never commits configuration',async()=>{
            const original=bytes(f);let seen;
            const received=new Promise(resolve=>{seen=resolve;});f.onLookup(()=>seen());
            await new Promise((resolve,reject)=>{
                const req=http.request({host:'127.0.0.1',port:f.port,path:'/api/config',method:'PUT',
                    headers:{'x-fixture-role':'admin',origin:'http://127.0.0.1:'+f.port,'content-type':'application/json'}});
                req.on('error',error=>{if(error.code!=='ECONNRESET')reject(error);});
                req.on('close',resolve);req.write('{"expectedVersion":2,');
                received.then(()=>req.destroy());
            });
            f.onLookup(null);
            const r=await request(f);assert.equal(r.body.configVersion,2);assert.equal(bytes(f),original);
        });
        await check('unreadable configuration audit is rejected by startup without overwrite',async()=>{
            const original=bytes(f);const s=JSON.parse(original);s.configAuditRecords[0].after.taxRate=0.99;fs.writeFileSync(f.configFile,JSON.stringify(s));
            const broken=bytes(f);assert.throws(()=>loadStartupState({configFile:f.configFile,dataFile:f.dataFile}));
            assert.equal(bytes(f),broken);fs.writeFileSync(f.configFile,original);
        });
    }finally{await f.stop();}
    const first=await fixture();
    try {
        await check('missing config permits setup display without defaults',async()=>{
            const r=await request(first);assert.equal(r.body.taxRate,null);assert.equal(r.body.taxRateConfigured,false);assert.equal(bytes(first),null);
        });
        await check('first save failure leaves no config/audit/temp file',async()=>{
            first.fault('renameSync');await unchanged(first,{method:'PUT',payload:{taxRate:0,expectedVersion:0}},503);
            assert.deepEqual(fs.readdirSync(first.directory),['data.json']);first.fault(null);
        });
        await check('explicit zero stored and survives startup',async()=>{
            const r=await request(first,{method:'PUT',payload:{taxRate:0,expectedVersion:0}});assert.equal(r.status,200);
            assert.equal(loadStartupState({configFile:first.configFile,dataFile:first.dataFile}).config.taxRate,0);
        });
    }finally{await first.stop();}
    console.log('Public atomic config HTTP tests: '+count+' passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
