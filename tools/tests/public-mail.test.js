'use strict';
// All addresses and accounts are synthetic; transport, files and secrets are injected in memory.
const assert=require('node:assert/strict');
const path=require('node:path');
const {createMailReminderService,renderSummaryEmail,uniqueEmails}=require('../../mail-reminder');
let passed=0;
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
function fixture(config){
    const base=path.resolve('synthetic-mail-installation'),configFile=path.join(base,'mail-reminder.config.json');
    const files=new Map();const fds=new Map();let next=1;
    if(config!==undefined)files.set(configFile,typeof config==='string'?config:JSON.stringify(config));
    const missing=()=>Object.assign(Error('missing'),{code:'ENOENT'});
    const io={files,fail:'',
        existsSync:f=>files.has(f),
        lstatSync(f){if(!files.has(f))throw missing();return {isFile:()=>true,isSymbolicLink:()=>false};},
        readFileSync(f){const name=fds.get(f)||f;if(!files.has(name))throw missing();return files.get(name);},
        mkdirSync(){},
        openSync(f,flag){assert.equal(flag,'wx');if(files.has(f))throw Object.assign(Error('exists'),{code:'EEXIST'});files.set(f,'');const d=next++;fds.set(d,f);return d;},
        writeFileSync(f,text){if(this.fail==='write')throw Object.assign(Error('disk full'),{code:'ENOSPC'});files.set(fds.get(f)||f,String(text));},
        appendFileSync(f,text){files.set(f,(files.get(f)||'')+text);},
        closeSync(f){fds.delete(f);},fsyncSync(){if(this.fail==='fsync')throw Error('synthetic flush failure');},
        renameSync(from,to){if(this.fail==='rename')throw Error('synthetic publish failure');if(!files.has(from))throw missing();files.set(to,files.get(from));files.delete(from);},
        unlinkSync(f){files.delete(f);}
    };
    const env={};let secretReads=0;
    const secretStore={status:()=> '未配置',resolve:()=>{secretReads++;return {value:'synthetic-secret',source:'synthetic'};},save:()=>({status:'synthetic'}),clear:()=>({cleared:true})};
    const service=createMailReminderService(base,{fs:io,env,secretStore});
    return {base,configFile,io,env,service,get secretReads(){return secretReads;}};
}
test('fresh mail configuration has no host, recipient, private URL or credentials',()=>{
    const f=fixture(),c=f.service.publicConfig();assert.equal(c.smtpHost,'');assert.equal(c.publicBaseUrl,'');assert.equal(c.senderAddress,'');
    assert.equal(c.formalEnabled,false);assert.equal(c.enabled,false);assert.equal(c.dryRun,true);
    assert.deepEqual(c.accountEmails,{});assert.equal(c.smtpPasswordConfigured,false);
    assert.deepEqual(Object.values(c.reviewRecipients),[[],[],[],[]]);assert.equal(f.io.files.size,0);
});
for(const invalid of ['{"broken":','[]','null',{accountEmails:[]},{reminderTypes:'invalid'},{reviewRecipients:{invoice:'not-an-array'}}]){
    test('damaged mail configuration fails closed without writes',()=>{
        const f=fixture(invalid),before=[...f.io.files];assert.throws(()=>f.service.loadConfig());assert.deepEqual([...f.io.files],before);
    });
}
test('configuration save is atomic when publication fails',()=>{
    const f=fixture({senderName:'Previous sender'}),before=[...f.io.files];f.io.fail='rename';
    assert.throws(()=>f.service.savePublicConfig({senderName:'Next sender'}));assert.deepEqual([...f.io.files],before);
});
test('configuration save flush failure leaves previous bytes intact',()=>{
    const f=fixture({senderName:'Previous sender'}),before=[...f.io.files];f.io.fail='fsync';
    assert.throws(()=>f.service.savePublicConfig({senderName:'Next sender'}));assert.deepEqual([...f.io.files],before);
});
test('safe save stores only allowed public mail fields',()=>{
    const f=fixture();const c=f.service.savePublicConfig({formalEnabled:false,smtpHost:'smtp.example.invalid',senderAddress:'sender@example.invalid',publicBaseUrl:'https://app.example.invalid',
        accountEmails:{'employee-test':'employee@example.invalid'},smtpPass:'should-not-persist',password:'should-not-persist',token:'should-not-persist'});
    const bytes=f.io.files.get(f.configFile);assert.equal(bytes.includes('should-not-persist'),false);
    assert.equal(c.smtpHost,'smtp.example.invalid');assert.equal(c.accountEmails['employee-test'],'employee@example.invalid');
    assert.equal(f.io.files.size,1);
});
test('recipient merging deduplicates approver and additional address',()=>{
    const f=fixture({accountEmails:{'reviewer-test':'reviewer@example.invalid'},reviewRecipients:{application:['REVIEWER@example.invalid','extra@example.invalid']}});
    assert.deepEqual(f.service.recipientsForReview('application','reviewer-test'),['reviewer@example.invalid','extra@example.invalid']);
});
test('disabled formal or individual switch cannot become an allowed formal send',()=>{
    const f=fixture({formalEnabled:false});assert.equal(f.service.formalPreflight('businessBonus',['x@example.invalid']).reasonCode,'global_disabled');
    f.io.files.set(f.configFile,JSON.stringify({formalEnabled:true,reminderTypes:{businessBonus:false}}));
    assert.equal(f.service.formalPreflight('businessBonus',['x@example.invalid']).reasonCode,'type_disabled');
});
test('missing recipient is explicit and not replaced with a default account',()=>{
    const f=fixture({formalEnabled:true});
    assert.equal(f.service.formalPreflight('executionExpense',[]).reasonCode,'no_recipient');
    assert.equal(f.service.emailForUsername('absent-test'),'');
});
test('summary rendering escapes injected HTML and rejects script URL',()=>{
    const r=renderSummaryEmail({title:'<script>synthetic</script>',fields:[{label:'<x>',value:'"<&'}],link:'javascript:alert(1)'});
    assert.equal(r.html.includes('<script>'),false);assert.equal(r.html.includes('javascript:'),false);
    assert.ok(r.html.includes('&lt;script&gt;'));assert.ok(r.text.includes('<script>synthetic</script>'));
});
test('email normalization retains deterministic deduplication',()=>{
    assert.deepEqual(uniqueEmails(['ONE@example.invalid;two@example.invalid','one@example.invalid','invalid']),['one@example.invalid','two@example.invalid']);
});
test('forced dry run cannot read SMTP credentials or touch transport',async()=>{
    const f=fixture();const r=await f.service.send({eventKey:'SYN-DRY',type:'businessBonus',entityId:'SYN-ROW',to:['employee@example.invalid'],subject:'Synthetic',text:'Synthetic',forceDryRun:true});
    assert.equal(r.success,true);assert.equal(r.dryRun,true);assert.equal(f.secretReads,0);
    assert.ok(f.service.readLogs().some(x=>x.status==='dry_run'));
});
test('disabled notification records skipped status without resolving SMTP secret',async()=>{
    const f=fixture();const r=await f.service.send({eventKey:'SYN-SKIP',type:'executionExpense',to:['employee@example.invalid'],subject:'Synthetic'});
    assert.equal(r.skipped,true);assert.equal(f.secretReads,0);
});
test('synthetic SMTP transport never invokes external delivery',async()=>{
    const f=fixture({formalEnabled:true,enabled:true,dryRun:false,smtpHost:'smtp.example.invalid',senderAddress:'sender@example.invalid'});
    f.env.KSESSION_ENABLE_TEST_RESET='1';f.env.KSESSION_MAIL_TEST_TRANSPORT_FILE=path.join(f.base,'synthetic-transport.jsonl');
    const r=await f.service.smtpSend({type:'employeeSettlement',entityId:'SYN-SET',to:['employee@example.invalid'],subject:'Synthetic',text:'Synthetic'});
    assert.equal(r.success,true);assert.ok(f.io.files.has(f.env.KSESSION_MAIL_TEST_TRANSPORT_FILE));
    assert.equal(f.io.files.get(f.env.KSESSION_MAIL_TEST_TRANSPORT_FILE).includes('synthetic-secret'),false);
});
module.exports=(async()=>{for(const item of tests){await item.fn();passed++;console.log('PASS '+item.name);}console.log('Public mail checks passed: '+passed);return passed;})();
if(require.main===module)module.exports.catch(error=>{console.error(error);process.exitCode=1;});
