'use strict';
// Synthetic values only. In-memory filesystem: no developer-machine files are created.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createConfigStore, validateConfigState } = require('../../public-config-store');
const root = path.resolve('/synthetic-config');
const file = path.join(root, 'config.json');
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }
function ioError(code = 'EACCES') { return Object.assign(Error('synthetic storage failure'), {code}); }
function memoryFs(initial, fault) {
    const files = new Map(initial === undefined ? [] : [[file, JSON.stringify(initial)]]);
    const fds = new Map(); let fd = 10;
    let fail = fault, externalOnSync = null;
    const fs = {
        lstatSync(p) {
            if (p === root) return {isDirectory:()=>true, isFile:()=>false, isSymbolicLink:()=>false};
            if (!files.has(p)) throw ioError('ENOENT');
            if (fail === 'stat') throw ioError();
            return {isDirectory:()=>false, isFile:()=>true, isSymbolicLink:()=>fail === 'link'};
        },
        readFileSync(p) { if (fail === 'read') throw ioError(); if (!files.has(p)) throw ioError('ENOENT'); return files.get(p); },
        openSync(p, flags) {
            assert.equal(flags, 'wx');
            if (fail === 'open') throw ioError();
            if (fail === 'collision') { files.set(p, 'unrelated collision file'); throw ioError('EEXIST'); }
            if (files.has(p)) throw ioError('EEXIST');
            files.set(p, ''); fds.set(++fd, p); return fd;
        },
        writeFileSync(n, bytes) { if (fail === 'write') throw ioError(); files.set(fds.get(n), fail === 'partial' ? bytes.slice(0, 10) : bytes); },
        fsyncSync() { if (externalOnSync) {files.set(file, externalOnSync); externalOnSync = null;} if (fail === 'sync') throw ioError(); },
        closeSync(n) { if (fail === 'close') throw ioError(); fds.delete(n); },
        renameSync(a,b) { if (fail === 'rename') throw ioError(); files.set(b, files.get(a)); files.delete(a); },
        unlinkSync(p) { if (!files.has(p)) throw ioError('ENOENT'); files.delete(p); }
    };
    return {fs, files, fault(v) {fail = v;}, changeDuringSync(v) {externalOnSync = JSON.stringify(v);}};
}
const admin = {username:'fixture-admin', role:'admin', accountStatus:'active'};
const fee = {default:0.07, '礼品采购':0.09};
const bonus = {profitBands:[{min:0,max:null,value:11}],kpi2Bands:[{min:0,max:null,value:1}],manualKpi2Threshold:0.2};
function fixture(initial, fault) { const io = memoryFs(initial, fault); return {...io, store:createConfigStore({configFile:file,fs:io.fs})}; }
function put(f, patch, version = f.store.getVersion(), actor = admin) { return f.store.update({patch,expectedVersion:version,actor}); }
function rejectsUnchanged(f, fn, code) {
    const bytes = f.files.get(file), state = f.store.getConfig();
    assert.throws(fn, e=>e.code===code, code);
    assert.equal(f.files.get(file),bytes); assert.deepEqual(f.store.getConfig(),state);
}
check('missing configuration stays absent and has version zero',()=>{
    const f=fixture(); assert.equal(f.files.size,0); assert.equal(f.store.getVersion(),0);
    assert.deepEqual(f.store.getConfig(),{});
    assert.equal(f.store.view(admin).taxRate,null);
});
check('parameters and full audit commit together without data-log callback',()=>{
    const f=fixture({taxRate:0.02,extension:{preserve:true}});
    const old=f.store.getConfig(); put(f,{taxRate:0.03});
    const saved=JSON.parse(f.files.get(file));
    assert.equal(saved.taxRate,0.03); assert.equal(saved.configVersion,1);
    assert.equal(saved.configAuditRecords.length,1);
    const audit=saved.configAuditRecords[0];
    assert.equal(audit.before.taxRate,0.02); assert.equal(audit.after.taxRate,0.03);
    assert.equal(audit.user,admin.username); assert.deepEqual(audit.changedFields,['taxRate']);
    assert.deepEqual(saved.extension,{preserve:true}); assert.equal(old.taxRate,0.02);
    assert.deepEqual(f.store.getConfig(),saved);
});
for(const [key,value] of [['taxRate',0],['serviceFeeRates',fee],['bonusRules',bonus],['invoiceBuyerName','示例购买方']]) {
    check('explicit business parameter accepted: '+key,()=>{const f=fixture();put(f,{[key]:value});assert.ok(Object.hasOwn(f.store.getConfig(),key));});
}
for(const [key,value] of [['taxRate',null],['taxRate','0'],['taxRate',false],['taxRate',-1],
    ['taxRate',Infinity],['serviceFeeRates',{}],['serviceFeeRates',{default:0.1,'礼品采购':1.5}],
    ['bonusRules',{}],['invoiceBuyerName',''],['invoiceBuyerName','\n']]) {
    check('invalid supplied parameter rejected: '+key+' '+String(value),()=>{
        const f=fixture({taxRate:0.02});rejectsUnchanged(f,()=>put(f,{[key]:value}),'CONFIG_INVALID');
    });
}
for(const key of ['configVersion','configAuditRecords','expectedVersion','password','smtpPassword','kpiFormulas','unknown','__proto__']) {
    check('unknown or protected payload rejected: '+key,()=>{
        const f=fixture();rejectsUnchanged(f,()=>put(f,JSON.parse('{"'+key+'":1}')),'CONFIG_INVALID');
    });
}
for(const actor of [null,{username:'fixture-user',role:'user'},{username:'fixture-reviewer',role:'approver'},
    {...admin,accountStatus:'disabled'},{...admin,deletedAt:'2026-01-01'}]) {
    check('current non-admin or inactive account cannot save '+JSON.stringify(actor),()=>{
        const f=fixture();rejectsUnchanged(f,()=>put(f,{taxRate:0.03},0,actor),'CONFIG_FORBIDDEN');
    });
}
for(const version of [undefined,null,'0',false,-1,0.1,Number.MAX_SAFE_INTEGER+1]) {
    check('version must be an explicit nonnegative integer: '+String(version),()=>{
        const f=fixture();rejectsUnchanged(f,()=>f.store.update({patch:{taxRate:0.03},expectedVersion:version,actor:admin}),'CONFIG_VERSION_INVALID');
    });
}
check('stale version is rejected and does not create duplicate audit',()=>{
    const f=fixture();put(f,{taxRate:0.03},0);
    rejectsUnchanged(f,()=>put(f,{taxRate:0.04},0),'CONFIG_VERSION_CONFLICT');
    assert.equal(f.store.getConfig().configAuditRecords.length,1);
});
check('empty payload is not an audited update',()=>{
    const f=fixture();rejectsUnchanged(f,()=>put(f,{}),'CONFIG_INVALID');
});
check('returned state and audit views cannot mutate authoritative memory',()=>{
    const f=fixture();put(f,{taxRate:0.03});
    f.store.getConfig().configAuditRecords[0].after.taxRate=0.99;
    f.store.view(admin).taxRate=0.99; f.store.logs([])[0].detail='altered';
    assert.equal(f.store.getConfig().taxRate,0.03);assert.equal(f.store.getConfig().configAuditRecords[0].after.taxRate,0.03);
});
check('employee response excludes audit, buyer, bonus and unknown secret fields',()=>{
    const f=fixture({taxRate:0,invoiceBuyerName:'示例购买方',secret:'must-not-leak'});
    put(f,{serviceFeeRates:fee,bonusRules:bonus});
    const raw=JSON.stringify(f.store.view({username:'fixture-user',role:'user'}));
    for(const marker of ['must-not-leak','configAuditRecords','fixture-admin','示例购买方','profitBands'])assert.ok(!raw.includes(marker));
    assert.equal(f.store.view(admin).taxRate,0);assert.ok(!JSON.stringify(f.store.view(admin)).includes('must-not-leak'));
});
check('operation-log projection includes new audit without rewriting old logs',()=>{
    const f=fixture();const old=[{time:'2025/1/1 00:00:00',user:'fixture-old',action:'旧操作',detail:'unchanged'}];
    const before=JSON.stringify(old);put(f,{taxRate:0.03});const rows=f.store.logs(old);
    assert.equal(rows.length,2);assert.equal(rows[0].action,'修改配置');assert.equal(rows[0].user,admin.username);
    assert.match(rows[0].detail,/taxRate/);assert.deepEqual(rows[1],old[0]);assert.equal(JSON.stringify(old),before);
});
for(const fault of ['open','write','partial','sync','close','rename']) {
    check('failed '+fault+' leaves bytes and memory unchanged',()=>{
        const f=fixture({taxRate:0.02});f.fault(fault);
        rejectsUnchanged(f,()=>put(f,{taxRate:0.03}),'CONFIG_SAVE_FAILED');
        assert.equal(f.files.size,1);
    });
}
check('first save failure does not fabricate configuration',()=>{
    const f=fixture();f.fault('rename');rejectsUnchanged(f,()=>put(f,{taxRate:0.03}),'CONFIG_SAVE_FAILED');assert.equal(f.files.size,0);
});
check('temp name collision must not remove unrelated file',()=>{
    const f=fixture({taxRate:0.02});f.fault('collision');
    rejectsUnchanged(f,()=>put(f,{taxRate:0.03}),'CONFIG_SAVE_FAILED');
    assert.ok([...f.files.values()].includes('unrelated collision file'));
});
check('external file change is not overwritten',()=>{
    const f=fixture({taxRate:0.02});f.files.set(file,JSON.stringify({taxRate:0.09}));
    rejectsUnchanged(f,()=>put(f,{taxRate:0.03}),'CONFIG_EXTERNAL_CHANGE');
});
check('change during staging is detected before commit',()=>{
    const f=fixture({taxRate:0.02});f.changeDuringSync({taxRate:0.09});
    assert.throws(()=>put(f,{taxRate:0.03}),e=>e.code==='CONFIG_EXTERNAL_CHANGE');
    assert.equal(JSON.parse(f.files.get(file)).taxRate,0.09);assert.equal(f.store.getConfig().taxRate,0.02);assert.equal(f.files.size,1);
});
check('restart reads exactly the committed parameters and audit',()=>{
    const f=fixture();put(f,{taxRate:0.03});const again=createConfigStore({configFile:file,fs:f.fs});
    assert.deepEqual(again.getConfig(),f.store.getConfig());rejectsUnchanged({...f,store:again},()=>put({...f,store:again},{taxRate:0.04},0),'CONFIG_VERSION_CONFLICT');
});
for(const broken of [{configVersion:1},{configAuditRecords:[]},{configVersion:-1,configAuditRecords:[]},
    {configVersion:1,configAuditRecords:[]},{configVersion:'0',configAuditRecords:[]},
    {configVersion:0,configAuditRecords:{}},{taxRate:null}]) {
    check('invalid persisted config fails closed '+JSON.stringify(broken),()=>{
        const io=memoryFs(broken),before=io.files.get(file);assert.throws(()=>createConfigStore({configFile:file,fs:io.fs}),e=>e.code==='CONFIG_INVALID');
        assert.equal(io.files.get(file),before);
    });
}
check('audit chain and parameter tampering fail closed',()=>{
    const f=fixture();put(f,{taxRate:0.03});put(f,{taxRate:0.04});
    for(const corrupt of [
        s=>s.configAuditRecords[0].after.taxRate=0.99,
        s=>s.taxRate=0.99,
        s=>s.configAuditRecords[0].user='',
        s=>s.configAuditRecords[1].version=7,
        s=>s.configAuditRecords[0].after.password='hidden'
    ]) {const s=f.store.getConfig();corrupt(s);assert.throws(()=>validateConfigState(s),e=>e.code==='CONFIG_INVALID');}
});
check('501 low-frequency audits retain oldest event without truncation',()=>{
    const f=fixture();for(let i=0;i<501;i++)put(f,{taxRate:i%2?0.02:0.03});
    const s=f.store.getConfig();assert.equal(s.configAuditRecords.length,501);assert.equal(s.configAuditRecords[0].version,1);
    assert.equal(s.configAuditRecords[500].version,501);
});
check('invalid JSON and symlink are not treated as missing config',()=>{
    const f=fixture();f.files.set(file,'{bad');assert.throws(()=>createConfigStore({configFile:file,fs:f.fs}),e=>e.code==='CONFIG_INVALID');
    f.files.set(file,'{}');f.fault('link');assert.throws(()=>createConfigStore({configFile:file,fs:f.fs}),e=>e.code==='CONFIG_UNREADABLE');
});
check('startup rejects invalid audit before any new initialization or save',()=>{
    const {validateConfig}=require('../../public-startup');
    assert.throws(()=>validateConfig({taxRate:0.02,configVersion:1,configAuditRecords:[]}),e=>e.code==='CONFIG_INVALID');
    assert.throws(()=>validateConfig({serviceFeeRates:{}}),e=>e.code==='CONFIG_INVALID');
    const f=fixture();put(f,{taxRate:0.03});assert.deepEqual(validateConfig(f.store.getConfig()),f.store.getConfig());
});
function handlerFixture(f,{disconnect=false}={}) {
    const {EventEmitter}=require('node:events');
    const {createConfigHandler}=require('../../public-config-http');
    const req=new EventEmitter();
    Object.assign(req,{url:'/api/config',method:'PUT',headers:{origin:'http://127.0.0.1:32100',
        host:'127.0.0.1:32100','content-type':'application/json'},socket:{encrypted:false},resume(){},setTimeout(){}});
    const statuses=[];
    const res={destroyed:false,writableEnded:false,setHeader(){},destroy(){this.destroyed=true;},
        end(value){statuses.push(this.statusCode);if(disconnect)throw Error('synthetic disconnected response');this.body=JSON.parse(value);this.writableEnded=true;}};
    const handler=createConfigHandler({store:f.store,getCurrentUser:()=>admin,
        getLogs(){throw Error('synthetic unavailable legacy log service');}});
    handler(req,res);req.emit('data',Buffer.from('{"expectedVersion":0,"taxRate":0.03}'));req.emit('end');
    return {res,statuses};
}
check('unavailable legacy log service cannot turn committed configuration into failure',()=>{
    const f=fixture({taxRate:0.02});const {res,statuses}=handlerFixture(f);
    assert.deepEqual(statuses,[200]);assert.equal(res.body.success,true);
    assert.equal(f.store.getConfig().configVersion,1);assert.equal(JSON.parse(f.files.get(file)).configAuditRecords.length,1);
});
check('response disconnect after commit does not roll back or attempt a false failure response',()=>{
    const f=fixture({taxRate:0.02});const {res,statuses}=handlerFixture(f,{disconnect:true});
    assert.deepEqual(statuses,[200]);assert.equal(res.destroyed,true);assert.equal(f.store.getConfig().taxRate,0.03);
    assert.equal(JSON.parse(f.files.get(file)).configVersion,1);
    rejectsUnchanged(f,()=>put(f,{taxRate:0.03},0),'CONFIG_VERSION_CONFLICT');
});
check('runtime parameter view is current, independent and excludes audit/internal fields',()=>{
 const f=fixture({taxRate:0.02,internalValue:'not-for-runtime'});
 put(f,{serviceFeeRates:{default:0.03,'礼品采购':0.04}});
 const view=f.store.getParameters();assert.equal(view.taxRate,0.02);
 assert.equal(Object.hasOwn(view,'configAuditRecords'),false);assert.equal(Object.hasOwn(view,'internalValue'),false);
 view.serviceFeeRates.default=0.99;assert.equal(f.store.getParameters().serviceFeeRates.default,0.03);
 put(f,{taxRate:0},f.store.getVersion());assert.equal(f.store.getParameters().taxRate,0);
});
console.log('Public atomic config unit tests: '+count+' passed.');
