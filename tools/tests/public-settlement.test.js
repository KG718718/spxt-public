'use strict';
// Synthetic module integration only; no installation data or network access.
const assert = require('node:assert/strict');
const cfg = require('../../bonus-config');
const execution = require('../../execution-bonus');
const settlement = require('../../employee-settlement');
let passed = 0;
function test(name, body) { body(); passed++; console.log('PASS ' + name); }
const copy = x => JSON.parse(JSON.stringify(x));
function fixture() {
    const application = {id:'SYN-PRJ',projectName:'Synthetic activity',status:'approved',applicant:'owner-test',startDate:'2027-04-12'};
    const payments = [{id:'SYN-PAY',projectId:application.id,status:'approved',contractAmount:1000,taxAmount:0,approveTime:'2027-04-15T12:00:00Z',
        items:[{amount:200,serviceFee:0,isProxy:'否',supplier:'worker-test',payeeAccountType:'employee-payee',linkedEmployeeUsername:'worker-test',payeeAccountId:'SYN-PAYEE'}],
        executionParticipants:[{username:'worker-test',contribution:'Synthetic work'}]}];
    const rules = {profitBands:[{min:null,max:null,value:120}],kpi2Bands:[{min:null,max:null,value:1.25}],manualKpi2Threshold:0};
    const record = execution.createLockedBonusConfirmation({
        id:'SYN-BON',application,payments,existingConfirmations:[],rules,confirmedBy:'admin-test',confirmedAt:'2027-04-16T12:00:00Z',
        body:{paymentId:payments[0].id,finalBusinessBonus:150,executionBonuses:[{username:'worker-test',amount:25}],rulesDigest:cfg.bonusRulesDigest(rules)}
    });
    return {applications:[application],payments,bonusConfirmations:[record],employeeSettlements:[],
        users:[{username:'owner-test',role:'user'},{username:'worker-test',role:'user'},{username:'admin-test',role:'admin'}],rules};
}
const preview = (f, username='',month=4) => settlement.buildEmployeeSettlementPreview({...f,year:2027,month,username});
const lock = (f, employee='worker-test', extra={}) => settlement.createLockedEmployeeSettlement({...f,id:'SYN-SET',employee,activityMonth:'2027-04',confirmedBy:'admin-test',confirmedAt:'2027-04-30T10:00:00Z',...extra});
test('ordinary short account names have no hardcoded exclusions', () => {
    const names = Array.from({length:676},(_,i)=>String.fromCharCode(97+Math.floor(i/26),97+i%26));
    const result = settlement.employeeAccounts(names.map(username=>({username,role:'user'})));
    assert.equal(result.size,names.length);
    for(const name of names) assert.equal(result.get(name),name);
});
test('only employee roles qualify; disabled employees retain settlement access for Admin',()=>{
    const users=[{username:'active-test',role:'user'},{username:'disabled-test',role:'user',accountStatus:'disabled'},
        {username:'removed-test',role:'user',accountStatus:'deleted'},{username:'admin-test',role:'admin'},{username:'reviewer-test',role:'approver'}];
    assert.deepEqual([...settlement.employeeAccounts(users).values()],['active-test','disabled-test']);
});
test('configured bonus flows to applicant separately from execution and reimbursement',()=>{
    const f=fixture(),v=preview(f);
    assert.equal(v.totals.businessBonus,150);assert.equal(v.totals.executionBonus,25);assert.equal(v.totals.reimbursement,200);
    assert.equal(v.totals.totalPayable,0);
    const owner=v.employeeRows.find(x=>x.username==='owner-test');
    const worker=v.employeeRows.find(x=>x.username==='worker-test');
    assert.equal(owner.businessBonus,150);assert.equal(owner.executionBonus,0);
    assert.equal(worker.businessBonus,0);assert.equal(worker.executionBonus,25);assert.equal(worker.reimbursement,200);
});
test('automatic monthly completeness includes all available reimbursement rows',()=>{
    const f=fixture();f.payments[0].items.push({...f.payments[0].items[0],amount:35});
    const r=lock(f);assert.equal(r.reimbursementSnapshots.length,2);
    assert.deepEqual(r.totals,{businessBonus:0,executionBonus:25,reimbursement:235,totalPayable:260});
});
test('legacy subset request cannot omit an available reimbursement',()=>{
    const f=fixture();f.payments[0].items.push({...f.payments[0].items[0],amount:35});
    assert.equal(lock(f,'worker-test',{selectedReimbursementSourceKeys:['SYN-PAY:0']}).reimbursementSnapshots.length,2);
});
test('applicant monthly result does not contain another employee execution fee',()=>{
    const r=lock(fixture(),'owner-test');
    assert.deepEqual(r.totals,{businessBonus:150,executionBonus:0,reimbursement:0,totalPayable:150});
    assert.equal(r.executionBonusSnapshots.length,0);
});
test('reimbursement reads approved payment amount only, not service fee',()=>{
    const f=fixture();f.payments[0].items[0].serviceFee=90;
    assert.equal(lock(f).totals.reimbursement,200);
});
test('structured employee identity wins over supplier display name',()=>{
    const f=fixture();f.payments[0].items[0].supplier='Unrelated synthetic display';
    assert.equal(preview(f,'worker-test').sources.reimbursements[0].amount,200);
});
test('formal and company payees do not become employee reimbursements by matching name',()=>{
    for(const type of ['supplier','company-payee']){
        const f=fixture();f.payments[0].items[0].payeeAccountType=type;
        assert.equal(preview(f).sources.reimbursements.length,0);
    }
});
test('unknown structured employee is not inferred from matching supplier text',()=>{
    const f=fixture();f.payments[0].items[0].linkedEmployeeUsername='absent-test';
    assert.equal(preview(f).sources.reimbursements.length,0);
});
test('existing unstructured reimbursement read compatibility is retained',()=>{
    const f=fixture();const i=f.payments[0].items[0];delete i.payeeAccountType;delete i.linkedEmployeeUsername;delete i.payeeAccountId;
    assert.equal(preview(f).sources.reimbursements[0].username,'worker-test');
});
test('activity month controls all sources, not approval or confirmation date',()=>{
    const f=fixture();f.payments[0].approveTime='2027-05-04T00:00:00Z';f.bonusConfirmations[0].confirmedAt='2027-05-06T00:00:00Z';
    assert.equal(preview(f,'',4).sources.reimbursements.length,1);
    assert.equal(preview(f,'',5).sources.reimbursements.length,0);
    assert.equal(preview(f,'',5).sources.businessBonuses.length,0);
});
test('missing activity date is not guessed from payment',()=>{
    const f=fixture();delete f.applications[0].startDate;
    assert.equal(preview(f).sources.reimbursements.length,0);assert.equal(preview(f).sources.businessBonuses.length,0);
});
test('closed project releases dynamic sources without rewriting stored bonus',()=>{
    const f=fixture(),before=copy(f.bonusConfirmations);f.applications[0].status='closed';
    assert.equal(preview(f).sources.reimbursements.length,0);assert.equal(preview(f).sources.businessBonuses.length,0);
    assert.deepEqual(f.bonusConfirmations,before);
});
test('pending and rejected payments never displace approved reimbursement facts',()=>{
    const f=fixture();for(const status of ['pending','rejected','draft','closed'])f.payments.push({...copy(f.payments[0]),id:'SYN-'+status,status,approveTime:'2027-05-01T00:00:00Z',items:[{...f.payments[0].items[0],amount:9000}]});
    assert.equal(preview(f).sources.reimbursements.length,1);assert.equal(lock(f).totals.reimbursement,200);
});
test('current approved payment selector is shared with financial module',()=>{
    const f=fixture();f.payments.push({...copy(f.payments[0]),id:'SYN-PAY-LATEST',approveTime:'2027-04-20T00:00:00Z',items:[{...f.payments[0].items[0],amount:70}]});
    assert.equal(preview(f).sources.reimbursements[0].paymentId,'SYN-PAY-LATEST');
    assert.equal(lock(f).totals.reimbursement,70);
});
test('locked monthly result is counted once and duplicate month returns conflict',()=>{
    const f=fixture(),r=lock(f);f.employeeSettlements.push(r);
    const v=preview(f,'worker-test');
    assert.equal(v.totals.reimbursement,0);assert.equal(v.totals.confirmedReimbursement,200);assert.equal(v.totals.totalPayable,225);
    assert.equal(v.sources.reimbursements[0].available,false);
    assert.throws(()=>lock(f),e=>e.statusCode===409);
});
test('already claimed source cannot be claimed again after activity month changes',()=>{
    const f=fixture();f.employeeSettlements.push(lock(f));f.applications[0].startDate='2027-05-12';
    const v=preview(f,'worker-test',5);
    assert.equal(v.sources.reimbursements[0].available,false);
    assert.throws(()=>lock(f,'worker-test',{activityMonth:'2027-05'}),/没有可锁定/);
});
test('invalid or repeated reimbursement selections reject without mutation',()=>{
    for(const keys of [['SYN-OTHER:0'],['SYN-PAY:0','SYN-PAY:0'],[''],null]){
        const f=fixture(),before=copy(f);
        assert.throws(()=>lock(f,'worker-test',{selectedReimbursementSourceKeys:keys}));
        assert.deepEqual(f,before);
    }
});
test('empty sources cannot create a locked settlement',()=>{
    const f=fixture();f.bonusConfirmations=[];f.payments=[];
    assert.throws(()=>lock(f),/没有可锁定/);
});
test('disabled employee can be settled by existing Admin pathway; deleted one cannot',()=>{
    const f=fixture();f.users[1].accountStatus='disabled';
    assert.equal(lock(f).totals.totalPayable,225);f.users[1].accountStatus='deleted';
    assert.throws(()=>lock(f),/员工账号/);
});
test('configuration changes cannot recalculate locked bonus and settlement',()=>{
    const f=fixture(),r=lock(f),before=copy(r),bonBefore=copy(f.bonusConfirmations);
    f.employeeSettlements.push(r);f.rules.profitBands[0].value=999;f.rules.kpi2Bands[0].value=9;
    assert.equal(preview(f,'worker-test').totals.totalPayable,225);
    assert.deepEqual(r,before);assert.deepEqual(f.bonusConfirmations,bonBefore);
});
test('historical locked settlement remains readable after employee deletion',()=>{
    const f=fixture(),r=lock(f);f.employeeSettlements.push(r);f.users[1].accountStatus='deleted';
    const v=preview(f,'worker-test');assert.equal(v.settlements.length,1);assert.deepEqual(v.settlements[0].totals,r.totals);
});
test('snapshot changes do not alias original financial inputs',()=>{
    const f=fixture(),before=copy(f),r=lock(f);assert.deepEqual(f,before);
    f.payments[0].items[0].amount=999;
    assert.equal(r.totals.reimbursement,200);assert.equal(r.reimbursementSnapshots[0].amount,200);
});
test('historical source warnings describe invalidated facts without rewriting history',()=>{
    const f=fixture(),r=lock(f),before=copy(r);f.payments[0].status='closed';
    assert.equal(settlement.settlementRiskMessages(r,f.applications,f.payments).length,1);assert.deepEqual(r,before);
});
test('preview and lock do not mutate supplied collections',()=>{
    const f=fixture(),before=copy(f);preview(f);lock(f);assert.deepEqual(f,before);
});
console.log('Public settlement checks passed: '+passed);
