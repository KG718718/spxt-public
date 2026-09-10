'use strict';
// These filesystem fixtures execute only in the approved GitHub-hosted test job.
// They are never shipped in the production package.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const startup = require('../../public-startup');
if (process.env.GITHUB_ACTIONS !== 'true') {
    console.log('SKIP cloud-only real filesystem checks (no local fixture is created).');
    process.exit(0);
}
const repository = path.resolve(__dirname,'../..');
const workParent = path.join(repository,'.test-work');
fs.mkdirSync(workParent,{recursive:true});
const root = fs.mkdtempSync(path.join(workParent,'startup-'));
if (!path.resolve(root).startsWith(workParent+path.sep)) throw Error('Invalid fixture scope');
let passed = 0, sequence = 0;
const cases = [];
function test(name, fn){cases.push({name,fn});}
function fixture(){
    const directory=path.join(root,String(++sequence));fs.mkdirSync(directory);
    return {directory,dataFile:path.join(directory,'data.json'),configFile:path.join(directory,'config.json'),
        priorFiles:[path.join(directory,'mail-config.json')],priorDirectories:[path.join(directory,'attachments'),path.join(directory,'backups')]};
}
function snapshot(directory){
    const result={};
    function visit(folder,prefix=''){for(const name of fs.readdirSync(folder).sort()){
        const full=path.join(folder,name),key=prefix+name,s=fs.lstatSync(full);
        if(s.isSymbolicLink())result[key]='LINK:'+fs.readlinkSync(full);
        else if(s.isDirectory()){result[key+'/']='DIR';visit(full,key+'/');}
        else result[key]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }}
    visit(directory);return result;
}
const credentials={username:'synthetic-admin',password:'Synthetic-Only-Secret-123'};
function writeState(f){const data=startup.newEmptyState();data.users.push({username:'legacy-test',role:'admin',password:'synthetic-legacy'});
    data.applications.push({id:'SYN-APP',status:'approved',contractAmount:281.35});data.futureExtension={retained:true};
    fs.writeFileSync(f.dataFile,JSON.stringify(data));return data;}
test('fresh filesystem remains empty during startup detection',()=>{
    const f=fixture(),before=snapshot(f.directory),result=startup.loadStartupState(f);
    assert.equal(result.needsInitialization,true);assert.deepEqual(snapshot(f.directory),before);
});
test('first creation publishes exactly one data file, not test or business seeds',()=>{
    const f=fixture(),data=startup.initializeFirstAdministrator({...f,...credentials});
    assert.deepEqual(fs.readdirSync(f.directory),['data.json']);assert.equal(data.users.length,1);
    for(const key of startup.ARRAY_FIELDS.filter(k=>!['users','logs'].includes(k)))assert.deepEqual(data[key],[]);
    assert.equal(data.logs.length,1);assert.equal(data.users[0].role,'admin');assert.equal(typeof data.users[0].created,'string');
    assert.deepEqual(JSON.parse(fs.readFileSync(f.dataFile,'utf8')),data);
    assert.equal(fs.lstatSync(f.dataFile).nlink,1);
});
test('password is salted PBKDF2 and plaintext is absent from persisted bytes',()=>{
    const f=fixture(),data=startup.initializeFirstAdministrator({...f,...credentials});
    const [kind,iterations,salt,hash]=data.users[0].password.split('$');
    assert.equal(kind,'pbkdf2-sha256');assert.equal(Number(iterations),210000);
    assert.equal(crypto.pbkdf2Sync(credentials.password,salt,Number(iterations),32,'sha256').toString('hex'),hash);
    assert.equal(fs.readFileSync(f.dataFile,'utf8').includes(credentials.password),false);
});
test('repeat initialization preserves every byte of the existing store',()=>{
    const f=fixture();startup.initializeFirstAdministrator({...f,...credentials});const before=snapshot(f.directory);
    assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials}),{code:'ALREADY_INITIALIZED'});
    assert.deepEqual(snapshot(f.directory),before);
});
test('restart preserves configured values and unknown historical fields',()=>{
    const f=fixture(),data=writeState(f);fs.writeFileSync(f.configFile,JSON.stringify({serviceFeeRates:{default:0,'礼品采购':0},futureSetting:true}));
    const before=snapshot(f.directory),result=startup.loadStartupState(f);
    assert.equal(result.needsInitialization,false);assert.deepEqual(result.data,data);
    assert.equal(result.config.serviceFeeRates.default,0);assert.equal(result.config.futureSetting,true);
    assert.deepEqual(snapshot(f.directory),before);
});
test('new process reloads an existing store without initializing',()=>{
    const f=fixture();writeState(f);const before=snapshot(f.directory);
    const source="const s=require(process.argv[1]);const o=JSON.parse(process.argv[2]);const r=s.loadStartupState(o);process.stdout.write(JSON.stringify({needs:r.needsInitialization,id:r.data.applications[0].id}));";
    const result=JSON.parse(cp.execFileSync(process.execPath,['-e',source,path.join(repository,'public-startup.js'),JSON.stringify(f)],{encoding:'utf8',timeout:15000,windowsHide:true}));
    assert.deepEqual(result,{needs:false,id:'SYN-APP'});assert.deepEqual(snapshot(f.directory),before);
});
for(const [label,content] of [['truncated JSON','{"users":['],['invalid root','[]'],['invalid critical collection','{"users":[],"applications":{},"payments":[]}']]){
    test('damaged data remains untouched: '+label,()=>{
        const f=fixture();fs.writeFileSync(f.dataFile,content);const before=snapshot(f.directory);
        assert.throws(()=>startup.loadStartupState(f),{code:'STORE_INVALID'});
        assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials}));
        assert.deepEqual(snapshot(f.directory),before);
    });
}
test('damaged configuration does not become default configuration',()=>{
    const f=fixture();writeState(f);fs.writeFileSync(f.configFile,'{"incomplete":');const before=snapshot(f.directory);
    assert.throws(()=>startup.loadStartupState(f),{code:'STORE_INVALID'});assert.deepEqual(snapshot(f.directory),before);
});
test('configuration without data blocks fresh installation',()=>{
    const f=fixture();fs.writeFileSync(f.configFile,'{}');const before=snapshot(f.directory);
    assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials}),{code:'ORPHANED_INSTALLATION'});
    assert.deepEqual(snapshot(f.directory),before);
});
test('old attachments and backups prevent accidental empty initialization',()=>{
    for(const index of [0,1]){
        const f=fixture(),folder=f.priorDirectories[index];fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'synthetic-evidence.txt'),'synthetic');
        const before=snapshot(f.directory);
        assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials}),{code:'ORPHANED_INSTALLATION'});
        assert.deepEqual(snapshot(f.directory),before);
    }
});
test('mail configuration without data prevents initialization',()=>{
    const f=fixture();fs.writeFileSync(f.priorFiles[0],'{}');const before=snapshot(f.directory);
    assert.throws(()=>startup.loadStartupState(f),{code:'ORPHANED_INSTALLATION'});
    assert.deepEqual(snapshot(f.directory),before);
});
test('a directory in place of data is not an empty database',()=>{
    const f=fixture();fs.mkdirSync(f.dataFile);const before=snapshot(f.directory);
    assert.throws(()=>startup.loadStartupState(f),{code:'STORE_UNREADABLE'});
    assert.deepEqual(snapshot(f.directory),before);
});
test('linked data file is rejected without altering its target',()=>{
    const f=fixture(),target=path.join(f.directory,'synthetic-original.json');fs.writeFileSync(target,JSON.stringify(startup.newEmptyState()));
    fs.symlinkSync(target,f.dataFile,'file');const before=snapshot(f.directory);
    assert.throws(()=>startup.loadStartupState(f),{code:'STORE_UNREADABLE'});assert.deepEqual(snapshot(f.directory),before);
});
test('dangling link is not mistaken for a missing data file',()=>{
    const f=fixture();fs.symlinkSync(path.join(f.directory,'missing.json'),f.dataFile,'file');const before=snapshot(f.directory);
    assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials}),{code:'STORE_UNREADABLE'});
    assert.deepEqual(snapshot(f.directory),before);
});
test('exclusive publication failure preserves winner and removes owned staging file',()=>{
    const f=fixture(),winner=JSON.stringify(startup.newEmptyState());
    const io=Object.create(fs);
    io.linkSync=(from,to)=>{fs.writeFileSync(to,winner);fs.linkSync(from,to);};
    assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials,fs:io}),{code:'ALREADY_INITIALIZED'});
    assert.equal(fs.readFileSync(f.dataFile,'utf8'),winner);assert.deepEqual(fs.readdirSync(f.directory),['data.json']);
});
test('disk failure before publication leaves no partly initialized store',()=>{
    const f=fixture(),io=Object.create(fs);io.fsyncSync=()=>{throw Object.assign(Error('Synthetic disk failure'),{code:'EIO'});};
    assert.throws(()=>startup.initializeFirstAdministrator({...f,...credentials,fs:io}),{code:'INITIALIZATION_FAILED'});
    assert.deepEqual(fs.readdirSync(f.directory),[]);
});
test('two independent processes can create only one initial administrator',async()=>{
    const f=fixture();
    const source=String.raw`const s=require(process.argv[1]);process.once('message',o=>{try{const d=s.initializeFirstAdministrator(o);process.send({success:true,username:d.users[0].username});}catch(e){process.send({success:false,code:e.code});}finally{process.disconnect();}});process.send({ready:true});`;
    const children=[];
    try{
        const launch=()=>new Promise((resolve,reject)=>{
            const child=cp.spawn(process.execPath,['-e',source,path.join(repository,'public-startup.js')],{stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
            children.push(child);let stderr='';child.stderr.on('data',x=>stderr+=x);
            const timer=setTimeout(()=>{child.kill();reject(Error('Synthetic initializer timeout'));},20000);
            child.once('error',reject);
            child.on('message',message=>{if(message.ready)resolve({child,result:new Promise((done,fail)=>{
                child.once('message',answer=>{clearTimeout(timer);done(answer);});
                child.once('exit',code=>{if(code)fail(Error('Initializer exited '+code+': '+stderr));});
            })});});
        });
        const workers=await Promise.all([launch(),launch()]);
        workers.forEach((w,i)=>w.child.send({...f,...credentials,username:'synthetic-admin-'+i}));
        const results=await Promise.all(workers.map(w=>w.result));
        assert.equal(results.filter(x=>x.success).length,1);
        assert.equal(results.find(x=>!x.success).code,'ALREADY_INITIALIZED');
        const data=JSON.parse(fs.readFileSync(f.dataFile,'utf8'));
        assert.equal(data.users.length,1);assert.equal(data.users[0].username,results.find(x=>x.success).username);
        assert.deepEqual(fs.readdirSync(f.directory),['data.json']);
    }finally{for(const child of children)if(child.exitCode===null)child.kill();}
});
(async()=>{
    try{
        for(const item of cases){await item.fn();passed++;console.log('PASS '+item.name);}
        console.log('Public real filesystem checks passed: '+passed);
    }finally{
        const exact=fs.realpathSync(root),parent=fs.realpathSync(workParent);
        if(!exact.startsWith(parent+path.sep))throw Error('Refusing unsafe fixture cleanup');
        fs.rmSync(exact,{recursive:true,force:false});
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
