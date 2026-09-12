'use strict';
const fsDefault = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {validateTaxRate,taxConfigurationForResponse} = require('./tax-config');
const {validateServiceFeeRates} = require('./service-fee-config');
const {validateBonusRules} = require('./bonus-config');
const {validateInvoiceBuyerName} = require('./invoice-access-policy');
const PARAMETERS = Object.freeze(['taxRate','serviceFeeRates','bonusRules','invoiceBuyerName']);
const own = (value,key) => Object.hasOwn(value,key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
function failure(code,message,statusCode=400) {return Object.assign(new Error(message),{code,statusCode});}
function invalid(message='配置或审计结构非法；不会覆盖原文件。') {throw failure('CONFIG_INVALID',message);}
function canonical(value) {
    if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
    if (record(value)) return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
    return JSON.stringify(value);
}
function parameters(value, rejectUnknown=false) {
    if (!record(value)) invalid();
    if (rejectUnknown && Object.keys(value).some(key=>!PARAMETERS.includes(key))) invalid('配置含未知或受保护字段。');
    const out = {};
    for (const key of PARAMETERS) {
        if (!own(value,key)) continue;
        try {
            switch(key) {
                case 'taxRate': out[key]=validateTaxRate(value[key]); break;
                case 'serviceFeeRates': out[key]=validateServiceFeeRates(value[key]); break;
                case 'bonusRules': out[key]=validateBonusRules(value[key]); break;
                case 'invoiceBuyerName': out[key]=validateInvoiceBuyerName(value[key]); break;
            }
        } catch {invalid('配置项目非法：'+key+'。请完整填写，不会使用默认值。');}
    }
    return out;
}
function changedFields(a,b) {return PARAMETERS.filter(key=>canonical(a[key])!==canonical(b[key]));}
function assertAdmin(actor) {
    if (!record(actor) || actor.role!=='admin' || typeof actor.username!=='string' || !actor.username.trim()
        || actor.deletedAt || (actor.accountStatus && actor.accountStatus!=='active'))
        throw failure('CONFIG_FORBIDDEN','仅当前有效 Admin 可以修改系统配置。',403);
}
function validateConfigState(value) {
    const current=parameters(value);
    const hasVersion=own(value,'configVersion'), hasAudit=own(value,'configAuditRecords');
    if (!hasVersion && !hasAudit) return value;
    if (!hasVersion || !hasAudit || !Number.isSafeInteger(value.configVersion) || value.configVersion<0
        || !Array.isArray(value.configAuditRecords) || value.configAuditRecords.length!==value.configVersion) invalid();
    let prior=null;
    const allowed=['id','version','time','user','action','changedFields','before','after'];
    for (let i=0;i<value.configAuditRecords.length;i++) {
        const audit=value.configAuditRecords[i];
        if (!record(audit) || Object.keys(audit).some(key=>!allowed.includes(key))
            || allowed.some(key=>!own(audit,key)) || audit.version!==i+1 || audit.id!=='CONFIG-'+(i+1)
            || audit.action!=='修改配置' || typeof audit.user!=='string' || !audit.user.trim()
            || typeof audit.time!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(audit.time)
            || !Number.isFinite(Date.parse(audit.time)) || new Date(audit.time).toISOString()!==audit.time) invalid();
        const before=parameters(audit.before,true),after=parameters(audit.after,true);
        if (canonical(before)!==canonical(audit.before) || canonical(after)!==canonical(audit.after)
            || canonical(changedFields(before,after))!==canonical(audit.changedFields)
            || (prior!==null && canonical(before)!==canonical(prior))) invalid('配置审计链不一致；请检查或恢复完整备份。');
        prior=after;
    }
    if (prior!==null && canonical(prior)!==canonical(current)) invalid('当前参数与最后一次审计不一致；禁止静默覆盖。');
    return value;
}
function configView(state,actor) {
    const safe=parameters(state);
    const base={serviceFeeRates:safe.serviceFeeRates||{},...taxConfigurationForResponse(state)};
    if (actor?.role!=='admin') return base;
    return {...base,configVersion:own(state,'configVersion')?state.configVersion:0,
        invoiceBuyerName:safe.invoiceBuyerName??null,invoiceBuyerConfigured:own(safe,'invoiceBuyerName'),
        bonusRules:safe.bonusRules??null,bonusRulesConfigured:own(safe,'bonusRules'),
        serviceFeeConfigured:own(safe,'serviceFeeRates')};
}
function readFile(file,fs) {
    try {
        const stat=fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw failure('CONFIG_UNREADABLE','配置必须是普通文件，不能使用链接。',503);
    } catch(error) {
        if (error.code==='ENOENT') return null;
        throw failure('CONFIG_UNREADABLE','配置不可读取，拒绝按空配置继续。',503);
    }
    try {return fs.readFileSync(file,'utf8');}
    catch {throw failure('CONFIG_UNREADABLE','配置读取失败，拒绝按空配置继续。',503);}
}
function createConfigStore(options) {
    if (!options || typeof options.configFile!=='string' || !path.isAbsolute(options.configFile))
        throw Error('An explicit absolute configFile is required.');
    const fs=options.fs||fsDefault, file=options.configFile;
    let source=readFile(file,fs), state;
    try {state=source===null?{}:JSON.parse(source);}
    catch {invalid();}
    validateConfigState(state);
    function unchanged() {
        if (readFile(file,fs)!==source)
            throw failure('CONFIG_EXTERNAL_CHANGE','配置文件已被其他操作更改，请重载服务核对后再保存。',409);
    }
    function update({patch,expectedVersion,actor}={}) {
        assertAdmin(actor);
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion<0)
            throw failure('CONFIG_VERSION_INVALID','缺少合法配置版本，请刷新页面。');
        const version=own(state,'configVersion')?state.configVersion:0;
        if (expectedVersion!==version)
            throw failure('CONFIG_VERSION_CONFLICT','配置已更新，请刷新后重新确认。',409);
        if (version===Number.MAX_SAFE_INTEGER) invalid('配置版本已达安全上限，请联系维护人员。');
        const values=parameters(patch,true);
        if (!Object.keys(values).length) invalid('请至少提交一项配置。');
        unchanged();
        const next={...clone(state),...values};
        const before=parameters(state),after=parameters(next);
        const audit={id:'CONFIG-'+(version+1),version:version+1,time:new Date().toISOString(),
            user:actor.username,action:'修改配置',changedFields:changedFields(before,after),before,after};
        next.configVersion=version+1;
        next.configAuditRecords=[...(next.configAuditRecords||[]),audit];
        validateConfigState(next);
        // Complete all validation/serialization and response preparation before the commit point.
        const serialized=JSON.stringify(next,null,2);
        const response=configView(next,actor);
        const temporary=path.join(path.dirname(file),'.config-'+crypto.randomUUID()+'.tmp');
        let fd,owned=false;
        try {
            const parent=fs.lstatSync(path.dirname(file));
            if (!parent.isDirectory() || parent.isSymbolicLink()) throw Error('Unsafe config directory');
            fd=fs.openSync(temporary,'wx',0o600);owned=true;
            fs.writeFileSync(fd,serialized,'utf8');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
            if (fs.readFileSync(temporary,'utf8')!==serialized) throw Error('Staged bytes differ');
            unchanged();
            fs.renameSync(temporary,file);
        } catch(error) {
            if (fd!==undefined) {try{fs.closeSync(fd);}catch{/* Keep original failure. */}}
            if (owned) {try{fs.unlinkSync(temporary);}catch{/* Only this operation's temp; never remove the target. */}}
            if (error.code==='CONFIG_EXTERNAL_CHANGE') throw error;
            throw failure('CONFIG_SAVE_FAILED','配置和审计未保存，原配置保持不变；请检查存储后重试。',503);
        }
        // No second file write, audit callback, or fallible post-save hook.
        source=serialized;state=next;
        return response;
    }
    function logs(legacy=[]) {
        if (!Array.isArray(legacy)) throw Error('Legacy logs must be an array.');
        const recent=(state.configAuditRecords||[]).map(audit=>({
            id:audit.id,time:audit.time,user:audit.user,action:audit.action,
            detail:JSON.stringify({version:audit.version,changedFields:audit.changedFields,before:audit.before,after:audit.after})
        })).reverse();
        // Keep original legacy records; do not mirror config audits back into data.json.
        return [...recent,...clone(legacy)].map((entry,index)=>({entry,index}))
            .sort((a,b)=>{
                const at=Date.parse(a.entry.time),bt=Date.parse(b.entry.time);
                return Number.isFinite(at)&&Number.isFinite(bt)?bt-at||a.index-b.index:a.index-b.index;
            }).map(row=>row.entry);
    }
    return Object.freeze({update,getParameters:()=>parameters(state),getConfig:()=>clone(state),getVersion:()=>own(state,'configVersion')?state.configVersion:0,
        view:actor=>configView(state,actor),logs});
}
module.exports={createConfigStore,validateConfigState,configView,PARAMETERS};
