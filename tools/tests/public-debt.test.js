'use strict';
// Pure synthetic cases. No installation seed or production file access.
const assert=require('node:assert/strict');
const debt=require('../../debt-repayment');
const copy=x=>JSON.parse(JSON.stringify(x));
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
function fixture(){
    const d={id:'SYN-DEBT',status:'approved',applicant:'employee-test',clientId:'SYN-CLIENT',title:'Synthetic debt',principal:2000,totalActualCost:600,
        costItems:[{id:'SYN-COST',item:'其他',content:'Synthetic',supplier:'Synthetic vendor',payeeAccountType:'formal-supplier',payeeAccountId:'SYN-SUP',amount:600}]};
    const config={serviceFeeRates:{default:0.07,'礼品采购':0}};
    const options={requestedLinks:[{debtId:d.id,principal:800,itemName:'其他'}],debts:[d],applications:[],payments:[],clientId:'SYN-CLIENT',username:'employee-test',config,nextLinkId:()=> 'SYN-LINK'};
    const link=debt.createDebtLinks(options)[0];
    return {d,config,options,link,app:{id:'SYN-APP',status:'approved',applicant:'employee-test',clientId:'SYN-CLIENT',debtLinks:[link]}};
}
test('debt standalone financial basis remains tax-inclusive without another tax',()=>{
    assert.deepEqual(debt.calculateDebtFinancials({principal:2000,totalActualCost:600}),{amountBasis:'tax-inclusive-v1',principal:2000,totalActualCost:600,contractAmount:2000,taxAmount:0,profit:1400,kpi1:0.7,kpi2:0.7});
});
test('configured fee rate is copied into project link snapshot',()=>{
    const f=fixture();assert.equal(f.link.serviceFeeRateSnapshot,0.07);assert.equal(f.link.serviceFee,56);assert.equal(f.link.allocatedCost,240);
    assert.equal(f.link.costAllocations[0].payeeAccountId,'SYN-SUP');
});
test('explicit zero fee is not mistaken for absent configuration',()=>{
    const f=fixture();f.options.requestedLinks[0].itemName='礼品采购';
    assert.equal(debt.createDebtLinks(f.options)[0].serviceFee,0);
});
test('missing service fee configuration fails before link numbering',()=>{
    const f=fixture();let issued=0;f.options.config={};f.options.nextLinkId=()=>{issued++;return 'SYN';};
    assert.throws(()=>debt.createDebtLinks(f.options));assert.equal(issued,0);
});
test('old link keeps its fee snapshot after configuration changes',()=>{
    const f=fixture(),before=copy(f.link);f.config.serviceFeeRates.default=0.5;
    const snap=debt.buildDebtPaymentSnapshot({debt:f.d,link:f.link,confirmedPrincipal:400,applications:[f.app],payments:[],balanceAfter:1600});
    assert.equal(snap.serviceFee,28);assert.equal(snap.allocatedCost,120);assert.deepEqual(f.link,before);
});
test('pending and approved repayment facts have distinct balances',()=>{
    const f=fixture();const detail=p=>debt.buildDebtPaymentSnapshot({debt:f.d,link:f.link,confirmedPrincipal:p,applications:[f.app],payments:[],balanceAfter:2000-p});
    const payments=[{id:'SYN-PAY-A',projectId:f.app.id,status:'approved',debtRepayments:[detail(400)]},{id:'SYN-PAY-B',projectId:f.app.id,status:'pending',debtRepayments:[detail(200)]}];
    const b=debt.debtBalances(f.d,[f.app],payments);
    assert.equal(b.effectivePrincipal,600);assert.equal(b.receivedPrincipal,400);assert.equal(b.pendingRepaymentPrincipal,200);
    assert.equal(b.outstandingPrincipal,1600);assert.equal(b.remainingPrincipal,1400);assert.equal(b.receivedCost,120);
});
test('closed projects leave dynamic balances and retain historical linkage',()=>{
    const f=fixture();f.app.status='closed';const before=copy(f);
    const v=debt.debtView(f.d,[f.app],[]);
    assert.equal(v.effectivePrincipal,0);assert.equal(v.links.length,0);assert.equal(v.historicalLinks.length,1);assert.equal(v.historicalLinks[0].closureAudit,null);
    assert.deepEqual(copy(f),before);
});
test('wrong employee or client cannot borrow another debt allowance',()=>{
    for(const field of ['username','clientId']){const f=fixture(),before=copy(f.options);f.options[field]='SYN-OTHER';assert.throws(()=>debt.createDebtLinks(f.options));f.options[field]=before[field];assert.deepEqual(copy(f.options),before);}
});
test('unapproved debt and excessive principal remain rejected',()=>{
    const f=fixture();f.d.status='pending';assert.throws(()=>debt.createDebtLinks(f.options));f.d.status='approved';
    f.options.requestedLinks[0].principal=2001;assert.throws(()=>debt.createDebtLinks(f.options));
});
test('duplicate debt references in one project remain invalid',()=>{
    const f=fixture();f.options.requestedLinks.push({...f.options.requestedLinks[0]});assert.throws(()=>debt.createDebtLinks(f.options),/重复关联/);
});
test('cost distribution follows remaining actual cost on final repayment',()=>{
    const f=fixture();const first=debt.buildDebtPaymentSnapshot({debt:f.d,link:f.link,confirmedPrincipal:700,applications:[f.app],payments:[],balanceAfter:1300});
    const payments=[{id:'SYN-PAY',projectId:f.app.id,status:'approved',debtRepayments:[first]}];
    const last=debt.buildDebtPaymentSnapshot({debt:f.d,link:f.link,confirmedPrincipal:1300,applications:[f.app],payments,balanceAfter:0});
    assert.equal(first.allocatedCost+last.allocatedCost,600);assert.equal(last.remainingAfter,0);
});
test('KPI repayment row is a system debt reference rather than a new vendor',()=>{
    const f=fixture(),row=debt.buildDebtKpiItems([f.link])[0];
    assert.equal(row.supplierType,'system-debt');assert.equal(row.amount,800);assert.equal(row.serviceFee,56);assert.equal(row.isProxy,'是');
});
test('additional debt cannot bypass confirmed project bonus freeze',()=>{
    const f=fixture();
    const result=debt.projectExtraDebtEligibility({originalProjectId:f.app.id,username:'employee-test',requestedClientId:'SYN-CLIENT',applications:[f.app],payments:[],bonusConfirmations:[{id:'SYN-BON',applicationId:f.app.id,status:'locked'}]});
    assert.equal(result.eligible,false);assert.ok(result.reason.includes('Admin'));
});
test('new debt uses caller identity, structured cost, and stable client fields',()=>{
    const f=fixture();const r=debt.createDebtRecord({principal:2000,title:'Synthetic debt',businessDescription:'Synthetic evidence',approver:'reviewer-test',clientId:'SYN-CLIENT',clientNameSnapshot:'Synthetic client',partyA:'Synthetic client',costItems:f.d.costItems},{username:'employee-test',id:'SYN-NEW',applications:[],payments:[],bonusConfirmations:[],now:'2027-04-10'});
    assert.equal(r.status,'pending');assert.equal(r.applicant,'employee-test');assert.equal(r.clientId,'SYN-CLIENT');assert.equal(r.costItems[0].payeeAccountId,'SYN-SUP');assert.equal(r.costItems[0].id,'COST1');
});
test('pure preview does not change financial source objects',()=>{
    const f=fixture(),before=copy(f);debt.debtView(f.d,[f.app],[]);assert.deepEqual(copy(f),before);
});
console.log('Public debt checks passed: '+passed);
