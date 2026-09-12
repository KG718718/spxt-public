'use strict';
// Real filesystem checks run only in the hosted cloud test workspace.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const backup=require('../../backup-service');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP cloud-only real backup filesystem checks.');process.exit(0);}
const parent=path.resolve(__dirname,'../../.test-work');fs.mkdirSync(parent,{recursive:true});
const root=fs.mkdtempSync(path.join(parent,'backup-'));let passed=0,seq=0;
const synthetic={applications:[{id:'SYN-APP',contractAmount:765.43}],payments:[],users:[]};
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function fixture(){const directory=path.join(root,String(++seq));fs.mkdirSync(directory);
    const dataFile=path.join(directory,'data.json'),backupsDir=path.join(directory,'backups');
    fs.writeFileSync(dataFile,JSON.stringify(synthetic));return {directory,dataFile,backupsDir};}
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function snap(dir){if(!fs.existsSync(dir))return {};return Object.fromEntries(fs.readdirSync(dir).sort().map(n=>[n,digest(fs.readFileSync(path.join(dir,n)))]));}
try{
    test('structured backup preserves exact source bytes and verifies manifest',()=>{
        const f=fixture(),before=fs.readFileSync(f.dataFile),r=backup.createStructuredDataBackup(f);
        assert.equal(r.success,true);assert.equal(r.verified,true);
        assert.deepEqual(fs.readFileSync(path.join(f.backupsDir,r.fileName)),before);
        assert.equal(r.sha256,digest(before));assert.equal(backup.listStructuredDataBackups(f).length,1);
        assert.deepEqual(fs.readFileSync(f.dataFile),before);
    });
    test('same timestamp produces distinct backups without overwriting',()=>{
        const f=fixture(),now=()=>new Date('2027-04-01T01:02:03Z');
        const a=backup.createStructuredDataBackup({...f,now}),b=backup.createStructuredDataBackup({...f,now});
        assert.equal(a.success,true);assert.equal(b.success,true);assert.notEqual(a.fileName,b.fileName);
        assert.equal(backup.listStructuredDataBackups(f).length,2);
    });
    test('rotation only removes verified generations and keeps historical unverified files',()=>{
        const f=fixture();fs.mkdirSync(f.backupsDir);fs.writeFileSync(path.join(f.backupsDir,'data_legacy.json'),'synthetic historical evidence');
        const before=fs.readFileSync(path.join(f.backupsDir,'data_legacy.json'),'utf8');
        for(let i=0;i<4;i++)assert.equal(backup.createStructuredDataBackup({...f,maxBackups:2,now:()=>new Date(Date.UTC(2027,3,1,0,0,i))}).success,true);
        const rows=backup.listStructuredDataBackups(f);assert.equal(rows.filter(x=>x.verified).length,2);
        assert.equal(rows.filter(x=>!x.verified).length,1);assert.equal(fs.readFileSync(path.join(f.backupsDir,'data_legacy.json'),'utf8'),before);
    });
    test('invalid JSON source cannot publish a new backup or remove old backups',()=>{
        const f=fixture();backup.createStructuredDataBackup(f);const before=snap(f.backupsDir);
        fs.writeFileSync(f.dataFile,'{"broken":');const r=backup.createStructuredDataBackup(f);
        assert.equal(r.success,false);assert.deepEqual(snap(f.backupsDir),before);
    });
    test('disk failure preserves source and previous backups',()=>{
        const f=fixture();backup.createStructuredDataBackup(f);const before=snap(f.backupsDir),source=fs.readFileSync(f.dataFile);
        const io=Object.create(fs);io.writeFileSync=()=>{throw Error('Synthetic disk full');};
        assert.equal(backup.createStructuredDataBackup({...f,fs:io}).success,false);
        assert.deepEqual(snap(f.backupsDir),before);assert.deepEqual(fs.readFileSync(f.dataFile),source);
    });
    test('daily marker is written only after a verified successful backup',()=>{
        const f=fixture(),now=()=>new Date('2027-04-01T18:00:00Z');
        const first=backup.runDailyStructuredDataBackup({...f,now});
        assert.equal(first.success,true);assert.equal(first.localDate,'2027-04-02');assert.equal(first.markerUpdated,true);
        const before=snap(f.backupsDir),second=backup.runDailyStructuredDataBackup({...f,now});
        assert.equal(second.skipped,true);assert.deepEqual(snap(f.backupsDir),before);
    });
    test('failed daily backup does not mark the day successful',()=>{
        const f=fixture();fs.writeFileSync(f.dataFile,'invalid');
        const r=backup.runDailyStructuredDataBackup(f);
        assert.equal(r.success,false);assert.equal(r.markerUpdated,false);
        assert.equal(fs.existsSync(path.join(f.backupsDir,'.last_successful_backup_date')),false);
    });
    test('tampered backup is not presented as verified',()=>{
        const f=fixture(),r=backup.createStructuredDataBackup(f);
        fs.writeFileSync(path.join(f.backupsDir,r.fileName),'{}');
        assert.equal(backup.listStructuredDataBackups(f).some(x=>x.fileName===r.fileName),false);
    });
    test('manifest digest mismatch is not silently accepted',()=>{
        const f=fixture(),r=backup.createStructuredDataBackup(f),file=path.join(f.backupsDir,r.fileName+'.manifest.json');
        const manifest=JSON.parse(fs.readFileSync(file,'utf8'));manifest.sha256='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(manifest));
        assert.equal(backup.listStructuredDataBackups(f).length,0);
    });
    console.log('Public backup checks passed: '+passed);
}finally{
    const exact=fs.realpathSync(root),base=fs.realpathSync(parent);
    if(!exact.startsWith(base+path.sep))throw Error('Unsafe fixture cleanup');
    fs.rmSync(exact,{recursive:true,force:false});
}
