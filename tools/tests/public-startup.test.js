'use strict';
// Synthetic, in-memory fixtures only. Never imported during installation.
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const {
    ARRAY_FIELDS, COUNTER_FIELDS, newEmptyState, loadStartupState, localSetupRequest,
    validateState, validateConfig, initializeFirstAdministrator
} = require('../../public-startup');
let passed = 0;
function test(name, body) { body(); passed++; console.log('PASS ' + name); }
function memoryFs(initial = {}) {
    const files = new Map(Object.entries(initial));
    const descriptors = new Map();
    const directories = new Map();
    let next = 1;
    const attempts = [];
    const fault = (code) => Object.assign(new Error(code), { code });
    const io = {
        files, directories, attempts, fail: '',
        readFileSync(file) {
            attempts.push('read');
            if (this.fail === 'read') throw fault('EACCES');
            if (!files.has(file)) throw fault('ENOENT');
            return files.get(file);
        },
        lstatSync(file) {
            if (files.has(file)) return { isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false };
            if (directories.has(file)) return { isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false };
            throw fault('ENOENT');
        },
        readdirSync(file) { return directories.get(file) || []; },
        mkdirSync() { attempts.push('mkdir'); },
        openSync(file, flag) {
            attempts.push('open');
            assert.equal(flag, 'wx');
            if (files.has(file)) throw fault('EEXIST');
            if (this.fail === 'open') throw fault('EACCES');
            files.set(file, '');
            const fd = next++;
            descriptors.set(fd, file);
            return fd;
        },
        writeFileSync(fd, content) {
            attempts.push('write');
            if (this.fail === 'write') throw fault('ENOSPC');
            files.set(descriptors.get(fd), content);
        },
        fsyncSync() {
            attempts.push('fsync');
            if (this.fail === 'fsync') throw fault('EIO');
        },
        closeSync(fd) { descriptors.delete(fd); },
        linkSync(from, to) {
            attempts.push('link');
            if (this.beforeLink) this.beforeLink(to);
            if (files.has(to)) throw fault('EEXIST');
            if (this.fail === 'link') throw fault('EPERM');
            files.set(to, files.get(from));
        },
        unlinkSync(file) { attempts.push('unlink'); files.delete(file); }
    };
    return io;
}
const options = (fs) => ({
    fs, dataFile: path.resolve('synthetic-data.json'), configFile: path.resolve('synthetic-config.json'),
    priorFiles: [path.resolve('synthetic-mail.json')],
    priorDirectories: [path.resolve('synthetic-attachments'), path.resolve('synthetic-backups')]
});
function existingState() {
    const value = newEmptyState();
    value.users.push({username: 'synthetic-admin', role: 'admin', password: 'synthetic-legacy-password'});
    value.applications.push({id: 'SYN-APP', status: 'approved', contractAmount: 845.31});
    return value;
}
function stateFs(data, config) {
    const fs = memoryFs();
    if (data !== undefined) fs.files.set(options(fs).dataFile, typeof data === 'string' ? data : JSON.stringify(data));
    if (config !== undefined) fs.files.set(options(fs).configFile, typeof config === 'string' ? config : JSON.stringify(config));
    return fs;
}
function assertNoWrites(fs) {
    assert.equal(fs.attempts.some(action => ['mkdir', 'open', 'write', 'link', 'unlink'].includes(action)), false);
}
test('fresh install is zero-data and read-only until administrator creation', () => {
    const fs = memoryFs();
    const result = loadStartupState(options(fs));
    assert.equal(result.needsInitialization, true);
    for (const key of ARRAY_FIELDS) assert.deepEqual(result.data[key], []);
    for (const key of COUNTER_FIELDS) assert.equal(result.data[key], 1);
    assert.deepEqual(result.config, {});
    assertNoWrites(fs);
});
for (const [name, data] of [['invalid JSON','{"users":['],['array','[]'],['null','null'],['empty object','{}'],['wrong users',{...newEmptyState(),users:{}}],['wrong collection',{...newEmptyState(),invoices:null}],['invalid counter',{...newEmptyState(),nextAppId:0}],['invalid account',{...newEmptyState(),users:[{username:'x',role:'admin'}]}]]) {
    test('corrupt data refuses startup: ' + name, () => {
        const fs = stateFs(data);
        const before = [...fs.files];
        assert.throws(() => loadStartupState(options(fs)), {code:'STORE_INVALID'});
        assert.deepEqual([...fs.files], before);
        assertNoWrites(fs);
    });
}
for (const config of ['{"incomplete":','[]','null',{serviceFeeRates:[]},{bonusRules:null}]) {
    test('corrupt configuration refuses startup', () => {
        const fs = stateFs(existingState(), config);
        const before = [...fs.files];
        assert.throws(() => loadStartupState(options(fs)));
        assert.deepEqual([...fs.files], before);
        assertNoWrites(fs);
    });
}
test('unreadable files do not become a new installation', () => {
    const fs = stateFs(existingState()); fs.fail = 'read';
    assert.throws(() => loadStartupState(options(fs)), {code:'STORE_UNREADABLE'});
    assertNoWrites(fs);
});
test('configuration without data prevents initialization', () => {
    const fs = stateFs(undefined,{});
    assert.throws(() => loadStartupState(options(fs)), {code:'ORPHANED_INSTALLATION'});
    assertNoWrites(fs);
});
test('mail history without data prevents initialization', () => {
    const fs = memoryFs(); fs.files.set(options(fs).priorFiles[0], '{}');
    assert.throws(() => loadStartupState(options(fs)), {code:'ORPHANED_INSTALLATION'});
    assertNoWrites(fs);
});
test('attachments without data prevent initialization', () => {
    const fs = memoryFs(); fs.directories.set(options(fs).priorDirectories[0], ['synthetic.pdf']);
    assert.throws(() => loadStartupState(options(fs)), {code:'ORPHANED_INSTALLATION'});
    assertNoWrites(fs);
});
test('empty runtime directories do not create business data', () => {
    const fs = memoryFs(); fs.directories.set(options(fs).priorDirectories[0], []);
    assert.equal(loadStartupState(options(fs)).needsInitialization,true);
    assertNoWrites(fs);
});
test('existing data and unknown historical fields are unchanged', () => {
    const value = {...existingState(),futureMetadata:{keep:'unchanged'}};
    const fs = stateFs(value,{serviceFeeRates:{default:0,'礼品采购':0}});
    const result = loadStartupState(options(fs));
    assert.equal(result.needsInitialization,false);
    assert.deepEqual(result.data,value);
    assertNoWrites(fs);
});
test('an existing empty store never reopens first-admin creation', () => {
    const fs = stateFs(newEmptyState());
    assert.equal(loadStartupState(options(fs)).needsInitialization,false);
    assert.throws(() => initializeFirstAdministrator({...options(fs),username:'synthetic-admin',password:'Synthetic-Secret-32'}),{code:'ALREADY_INITIALIZED'});
    assertNoWrites(fs);
});
for (const address of ['127.0.0.1','::1','::ffff:127.0.0.1']) {
    test('setup accepts local same-origin request '+address, () => {
        assert.equal(localSetupRequest({socket:{remoteAddress:address},headers:{host:'localhost:8080',origin:'http://localhost:8080'}},8080,true),true);
    });
}
for (const input of [
    {ip:'192.0.2.15',host:'localhost:8080',origin:'http://localhost:8080'},
    {ip:'127.0.0.1',host:'attacker.example:8080',origin:'http://attacker.example:8080'},
    {ip:'127.0.0.1',host:'localhost:8080',origin:'http://attacker.example'},
    {ip:'127.0.0.1',host:'localhost:8080',origin:'null'},
    {ip:'127.0.0.1',host:'localhost:8080'},
    {ip:'127.0.0.1',host:'localhost:9999',origin:'http://localhost:9999'}
]) {
    test('setup denies remote, rebinding, cross-origin or absent origin', () => {
        assert.equal(localSetupRequest({socket:{remoteAddress:input.ip},headers:{host:input.host,...(input.origin?{origin:input.origin}:{})}},8080,true),false);
    });
}
for (const [username,password] of [['','Synthetic-Secret-32'],[' synthetic','Synthetic-Secret-32'],['synthetic','short'],['synthetic',null],['synthetic',' bad-space-password'],['synthetic','x'.repeat(129)]]) {
    test('invalid initial credentials do not write any files', () => {
        const fs = memoryFs();
        assert.throws(() => initializeFirstAdministrator({...options(fs),username,password}),{code:'INVALID_ADMIN'});
        assertNoWrites(fs);
    });
}
test('initialization stores one hashed administrator and no business seed', () => {
    const fs = memoryFs();
    const data=initializeFirstAdministrator({...options(fs),username:'synthetic-admin',password:'Synthetic-Secret-32'});
    assert.equal(data.users.length,1);
    assert.equal(data.users[0].role,'admin');
    const [algorithm,iterations,salt,hash]=data.users[0].password.split('$');
    assert.equal(algorithm,'pbkdf2-sha256');
    assert.equal(crypto.pbkdf2Sync('Synthetic-Secret-32',salt,Number(iterations),32,'sha256').toString('hex'),hash);
    assert.equal(fs.files.size,1);
    assert.equal([...fs.files.values()][0].includes('Synthetic-Secret-32'),false);
    for(const key of ARRAY_FIELDS.filter(key=>!['users','logs'].includes(key)))assert.deepEqual(data[key],[]);
    assert.equal(data.logs.length,1);
    const bytes=fs.files.get(options(fs).dataFile);
    assert.throws(()=>initializeFirstAdministrator({...options(fs),username:'other-admin',password:'Another-Synthetic-42'}),{code:'ALREADY_INITIALIZED'});
    assert.equal(fs.files.get(options(fs).dataFile),bytes);
    assert.deepEqual(loadStartupState(options(fs)).data,data);
});
for(const failure of ['open','write','fsync','link']){
    test('failed initialization leaves no business data: '+failure,()=>{
        const fs=memoryFs();fs.fail=failure;
        assert.throws(()=>initializeFirstAdministrator({...options(fs),username:'synthetic-admin',password:'Synthetic-Secret-32'}),{code:'INITIALIZATION_FAILED'});
        assert.equal(fs.files.has(options(fs).dataFile),false);
        assert.equal(fs.files.size,0);
    });
}
test('concurrent creation cannot replace the winning file',()=>{
    const fs=memoryFs();const winner=JSON.stringify(existingState());
    fs.beforeLink=destination=>fs.files.set(destination,winner);
    assert.throws(()=>initializeFirstAdministrator({...options(fs),username:'other-admin',password:'Synthetic-Secret-32'}),{code:'ALREADY_INITIALIZED'});
    assert.equal(fs.files.get(options(fs).dataFile),winner);
    assert.equal(fs.files.size,1);
});
test('duplicate usernames cannot silently pass validation',()=>{
    const value=existingState();value.users.push({...value.users[0]});
    assert.throws(()=>validateState(value),{code:'STORE_INVALID'});
});
test('empty business parameters are valid readable configuration, not ready to calculate',()=>{
    assert.deepEqual(validateConfig({}),{});
});
test('linked data path is not treated as a new or ordinary installation',()=>{
    const fs=stateFs(existingState());
    const originalStat=fs.lstatSync.bind(fs);
    fs.lstatSync=file=>file===options(fs).dataFile?{isFile:()=>true,isDirectory:()=>false,isSymbolicLink:()=>true}:originalStat(file);
    assert.throws(()=>loadStartupState(options(fs)),{code:'STORE_UNREADABLE'});
    assertNoWrites(fs);
});
test('initial administrator uses existing account and audit field contract',()=>{
    const fs=memoryFs();
    const data=initializeFirstAdministrator({...options(fs),username:'synthetic-admin',password:'Synthetic-Secret-32'});
    assert.equal(typeof data.users[0].created,'string');
    assert.ok(data.users[0].created.length>0);
    assert.equal(data.logs[0].user,'synthetic-admin');
    assert.equal(typeof data.logs[0].detail,'string');
});

for(const marker of [{accountStatus:'deleted'},{deletedAt:'2025-02-03T00:00:00.000Z'}]){
    test('deleted employee history without credentials survives restart',()=>{
        const value=existingState();
        value.users.push({username:'former-fixture',role:'user',...marker});
        value.applications[0].applicant='former-fixture';
        const fs=stateFs(value);const before=[...fs.files];
        const result=loadStartupState(options(fs));
        assert.equal(result.needsInitialization,false);
        assert.deepEqual(result.data,value);
        assert.throws(()=>initializeFirstAdministrator({...options(fs),username:'replacement-admin',password:'Synthetic-Secret-32'}),{code:'ALREADY_INITIALIZED'});
        assert.deepEqual([...fs.files],before);assertNoWrites(fs);
    });
}
for(const status of ['active','disabled']){
    test('nondeleted account still requires a password: '+status,()=>{
        const value=existingState();value.users.push({username:'missing-credential',role:'user',accountStatus:status});
        const fs=stateFs(value);assert.throws(()=>loadStartupState(options(fs)),{code:'STORE_INVALID'});assertNoWrites(fs);
    });
}
test('deleted marker does not excuse malformed stored credential',()=>{
    const value=existingState();value.users.push({username:'former-fixture',role:'user',accountStatus:'deleted',password:123});
    assert.throws(()=>validateState(value),{code:'STORE_INVALID'});
});
test('deleted account still needs a known role',()=>{
    const value=existingState();value.users.push({username:'former-fixture',role:'unknown',accountStatus:'deleted'});
    assert.throws(()=>validateState(value),{code:'STORE_INVALID'});
});
test('deleted username remains reserved and cannot be duplicated',()=>{
    const value=existingState();value.users.push({username:value.users[0].username,role:'user',accountStatus:'deleted'});
    assert.throws(()=>validateState(value),{code:'STORE_INVALID'});
});
for(const taxRate of [null,'','0.02',false,true,-0.01,NaN,Infinity,[],{}]){
    test('invalid configured tax stops startup without writes: '+String(taxRate),()=>{
        const fs=stateFs(existingState(),{taxRate});const before=[...fs.files];
        assert.throws(()=>loadStartupState(options(fs)),{code:'CONFIG_INVALID'});
        assert.deepEqual([...fs.files],before);assertNoWrites(fs);
    });
}
test('explicit zero tax remains valid at restart',()=>{
    const fs=stateFs(existingState(),{taxRate:0});
    assert.equal(loadStartupState(options(fs)).config.taxRate,0);assertNoWrites(fs);
});
test('valid tax and historical snapshots are never rewritten',()=>{
    const value=existingState();value.applications[0].taxAmount=12;value.applications[0].taxRateSnapshot=0.03;
    const fs=stateFs(value,{taxRate:0.02});const before=[...fs.files];
    const result=loadStartupState(options(fs));assert.deepEqual(result.data,value);assert.equal(result.config.taxRate,0.02);
    assert.deepEqual([...fs.files],before);assertNoWrites(fs);
});


for(const invoiceBuyerName of [null,'',false,23,[],{},'有限公司','bad\nname']){
    test('invalid saved buyer stops startup without rewriting',()=>{
        const fs=stateFs(existingState(),{invoiceBuyerName});const before=[...fs.files];
        assert.throws(()=>loadStartupState(options(fs)),{code:'CONFIG_INVALID'});
        assert.deepEqual([...fs.files],before);assertNoWrites(fs);
    });
}
test('configured buyer and saved invoice values remain unchanged at startup',()=>{
    const value=existingState();value.invoices=[{buyerName:'合成历史购买方',amount:71}];
    const fs=stateFs(value,{invoiceBuyerName:' 合成新购买方有限公司 '});const before=[...fs.files];
    const result=loadStartupState(options(fs));
    assert.equal(result.config.invoiceBuyerName,' 合成新购买方有限公司 ');
    assert.deepEqual(result.data,value);assert.deepEqual([...fs.files],before);assertNoWrites(fs);
});
for(const invoiceReplacementAllowed of [null,'true',1,{},[]]){
    test('invalid saved employee authorization stops startup without rewriting',()=>{
        const value=existingState();value.users[0].invoiceReplacementAllowed=invoiceReplacementAllowed;
        const fs=stateFs(value);const before=[...fs.files];
        assert.throws(()=>loadStartupState(options(fs)),{code:'STORE_INVALID'});
        assert.deepEqual([...fs.files],before);assertNoWrites(fs);
    });
}
test('explicit boolean authorization is preserved and missing field not auto-created',()=>{
    const value=existingState();value.users[0].invoiceReplacementAllowed=false;
    value.users.push({username:'authorized-fixture',role:'user',password:'synthetic-hash',invoiceReplacementAllowed:true});
    value.users.push({username:'unconfigured-fixture',role:'user',password:'synthetic-hash'});
    const fs=stateFs(value);const result=loadStartupState(options(fs));
    assert.deepEqual(result.data,value);
    assert.equal(Object.hasOwn(result.data.users[2],'invoiceReplacementAllowed'),false);assertNoWrites(fs);
});

console.log('Public startup checks passed: '+passed);
