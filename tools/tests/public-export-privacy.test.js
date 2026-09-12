'use strict';
// Synthetic in-memory records only. Never installation seeds or real accounts.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { buildDataset, generateExport, safeSpreadsheetText } = require('../../export-service');
const copy = value => JSON.parse(JSON.stringify(value));
const worker = { username: 'worker-test', role: 'user' };
const owner = { username: 'owner-test', role: 'user' };
const admin = { username: 'administrator-test', role: 'admin' };
const options = { module: 'bonus', format: 'json', scope: 'current' };
const fixture = () => ({
  applications: [], payments: [], invoices: [], debts: [],
  bonusConfirmations: [{
    id: 'SYN-BON', applicationId: 'SYN-APP', activityMonth: '2027-03',
    projectApplicant: 'owner-test', status: 'locked', confirmedAt: '2027-04-01',
    businessBonus: { confirmedFinalBonus: 150, hidden: 'NONPUBLIC_OWNER_DETAILS' },
    executionBonuses: [
      { username: 'worker-test', amount: 25, note: 'NONPUBLIC_INTERNAL_NOTE' },
      { username: 'other-worker-test', amount: 65 }
    ],
    totals: { businessBonus: 150, executionBonus: 90, projectBonus: 240 },
    attachments: [{ filename: 'NONPUBLIC-FILE.pdf' }],
    privateSnapshot: 'NONPUBLIC_PROJECT_SNAPSHOT'
  }, {
    id: 'SYN-UNRELATED-BON', applicationId: 'SYN-UNRELATED-APP', activityMonth: '2027-03',
    projectApplicant: 'unrelated-test', status: 'locked',
    totals: { businessBonus: 700, executionBonus: 0, projectBonus: 700 }, executionBonuses: []
  }],
  employeeSettlements: [{
    id: 'SYN-SET', employee: 'worker-test', activityMonth: '2027-03', status: 'locked',
    totals: { businessBonus: 0, executionBonus: 25, reimbursement: 75, totalPayable: 100 },
    privateSnapshot: 'NONPUBLIC_SETTLEMENT_SNAPSHOT', attachments: [{ filename: 'NONPUBLIC-SET.pdf' }]
  }, {
    id: 'SYN-OWNER-SET', employee: 'owner-test', activityMonth: '2027-03', status: 'locked',
    totals: { businessBonus: 150, executionBonus: 0, reimbursement: 40, totalPayable: 190 }
  }, {
    id: 'SYN-OTHER-SET', employee: 'other-worker-test', activityMonth: '2027-03', status: 'locked',
    totals: { businessBonus: 0, executionBonus: 65, reimbursement: 0, totalPayable: 65 }
  }]
});
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
const build = (state = fixture(), user = worker, extra = {}) => buildDataset(state, user, { ...options, ...extra });
const bonusRow = d => d.sheets.find(s => s.name === '项目奖金').rows[0];
const settlementRows = d => d.sheets.find(s => s.name === '员工月结').rows;
const noHidden = value => {
  const text = JSON.stringify(value);
  for (const forbidden of ['owner-test','other-worker-test','unrelated-test','NONPUBLIC','SYN-UNRELATED','SYN-OWNER-SET','SYN-OTHER-SET'])
    assert.equal(text.includes(forbidden), false, 'Unexpected private field: ' + forbidden);
};
module.exports = (async () => {
  await test('execution participant sees only own 25, not applicant 150 or execution total 90', () => {
    const d = build(); assert.deepEqual(bonusRow(d).slice(4,7), [0,25,25]);
    assert.equal(d.metadata['金额汇总'],25); noHidden(d);
  });
  await test('employee column identifies recipient rather than mislabelling project applicant', () => {
    const d=build(),s=d.sheets[0]; assert.equal(s.columns[3],'员工');assert.equal(s.columns[6],'本人合计');assert.equal(s.rows[0][3],worker.username);
  });
  await test('applicant exports own business bonus but not other execution amounts', () => {
    const d=build(fixture(),owner);assert.deepEqual(bonusRow(d).slice(4,7),[150,0,150]);
    assert.equal(JSON.stringify(d).includes('other-worker-test'),false);assert.equal(JSON.stringify(d).includes('worker-test'),false);
    assert.equal(d.metadata['金额汇总'],150);
  });
  await test('admin project aggregate and settlement rows remain unchanged', () => {
    const d=build(fixture(),admin);assert.deepEqual(bonusRow(d).slice(3,7),['owner-test',150,90,240]);
    assert.equal(d.sheets[0].columns[3],'项目申请人');assert.equal(settlementRows(d).length,3);assert.equal(d.metadata['金额汇总'],940);
  });
  await test('unrelated employee receives no records or aggregate amount', () => {
    const d=build(fixture(),{username:'nobody-test',role:'user'});assert.equal(d.records.length,0);assert.equal(d.metadata['金额汇总'],0);
  });
  await test('own settlement shows own three sources and total, without hidden snapshots', () => {
    const d=build();assert.equal(settlementRows(d).length,1);assert.deepEqual(settlementRows(d)[0].slice(3,7),[0,25,75,100]);
    assert.equal(d.metadata['月结应发合计'],100);noHidden(d.records);
  });
  await test('ordinary employee cannot request Admin all scope', () => assert.throws(()=>build(fixture(),worker,{scope:'all'}),e=>e.statusCode===403));
  await test('approver cannot export bonus module', () => assert.throws(()=>build(fixture(),{username:'reviewer-test',role:'approver'}),e=>e.statusCode===403));
  await test('anonymous export rejected', () => assert.throws(()=>build(fixture(),null),e=>e.statusCode===401));
  await test('unknown bonus role rejected', () => assert.throws(()=>build(fixture(),{username:'worker-test',role:'unknown'}),e=>e.statusCode===403));
  await test('detail ID does not bypass ownership', () => assert.throws(()=>build(fixture(),worker,{scope:'detail',recordId:'SYN-UNRELATED-BON'}),e=>e.statusCode===403));
  await test('record ID list cannot add unowned bonus or settlement', () => {
    const d=build(fixture(),worker,{recordIds:'SYN-UNRELATED-BON,SYN-OTHER-SET'});assert.equal(d.records.length,0);assert.equal(d.metadata['金额汇总'],0);
  });
  await test('own bonus detail contains only the relevant confirmation', () => {
    const d=build(fixture(),worker,{scope:'detail',recordId:'SYN-BON'});assert.equal(d.records.length,1);noHidden(d);
  });
  await test('own settlement detail is available without revealing project bonus totals', () => {
    const d=build(fixture(),worker,{scope:'detail',recordId:'SYN-SET'});assert.equal(d.sheets[0].rows.length,0);assert.equal(settlementRows(d).length,1);
    assert.equal(d.metadata['金额汇总'],0);assert.equal(d.metadata['月结应发合计'],100);noHidden(d);
  });
  await test('project ID filter uses actual bonus application reference', () => {
    const d=build(fixture(),worker,{projectId:'SYN-APP'});assert.equal(d.sheets[0].rows.length,1);assert.equal(d.metadata['金额汇总'],25);
  });
  await test('month boundary filters use stored attribution month', () => {
    assert.equal(build(fixture(),worker,{startMonth:'2027-04'}).records.length,0);
    assert.equal(build(fixture(),worker,{startMonth:'2027-03',endMonth:'2027-03'}).records.length,2);
  });
  await test('search cannot infer another participant or hidden snapshot', () => {
    for(const query of ['owner-test','other-worker-test','NONPUBLIC'])assert.equal(build(fixture(),worker,{query}).records.length,0);
  });
  await test('identity checks do not grant a case-variant account access', () => {
    assert.equal(build(fixture(),{username:'WORKER-TEST',role:'user'}).records.length,0);
  });
  await test('missing execution line never falls back to whole execution total', () => {
    const s=fixture();s.bonusConfirmations[0].executionBonuses=[];
    assert.deepEqual(bonusRow(build(s,owner)).slice(4,7),[150,0,150]);
    assert.equal(build(s).sheets[0].rows.length,0);
  });
  await test('confirmed business amount is authoritative for employee own bonus', () => {
    const s=fixture();s.bonusConfirmations[0].totals.businessBonus=999;
    assert.equal(bonusRow(build(s,owner))[4],150);
  });
  await test('legacy own business amount falls back to saved total without recalculation', () => {
    const s=fixture();delete s.bonusConfirmations[0].businessBonus;assert.equal(bonusRow(build(s,owner))[4],150);
  });
  await test('explicit zero own business amount remains zero', () => {
    const s=fixture();s.bonusConfirmations[0].businessBonus.confirmedFinalBonus=0;assert.equal(bonusRow(build(s,owner))[4],0);
  });
  await test('multiple own execution entries sum only own amounts with money rounding', () => {
    const s=fixture();s.bonusConfirmations[0].executionBonuses.push({username:worker.username,amount:0.1},{username:worker.username,amount:0.2});
    assert.equal(bonusRow(build(s))[5],25.3);assert.equal(build(s).metadata['金额汇总'],25.3);
  });
  await test('source records remain byte-equivalent after all role projections', () => {
    const s=fixture(),before=JSON.stringify(s);for(const u of [worker,owner,admin])build(s,u);assert.equal(JSON.stringify(s),before);
  });
  await test('returned employee records do not retain references to source totals', () => {
    const s=fixture(),d=build(s);d.records[0].totals.executionBonus=999;assert.equal(s.bonusConfirmations[0].totals.executionBonus,90);
  });
  await test('employee bonus attachment export fails before reading any file', async () => {
    let resolved=0;await assert.rejects(()=>generateExport(fixture(),worker,{...options,format:'zip',scope:'attachments'},{resolveAttachment:()=>{resolved++;throw Error('must not read');}}),e=>e.statusCode===403);
    assert.equal(resolved,0);
  });
  for (const format of ['json','csv']) await test(format+' serialization and metadata omit other employee amounts and identities', async () => {
    const s=fixture(),before=JSON.stringify(s),r=await generateExport(s,worker,{...options,format});
    noHidden(r.buffer.toString('utf8'));assert.equal(r.metadata['金额汇总'],25);assert.equal(r.metadata['月结应发合计'],100);
    assert.equal(r.audit.bytes,r.buffer.length);assert.equal(r.audit.sha256,crypto.createHash('sha256').update(r.buffer).digest('hex'));
    assert.equal(JSON.stringify(s),before);
  });
  await test('formula-like strings stay text in spreadsheet exports', () => {
    for(const s of ['=1+1','+1','-1','@SUM(A1)','  =1'])assert.equal(safeSpreadsheetText(s),"'"+s);
    assert.equal(safeSpreadsheetText('Synthetic'), 'Synthetic');
  });
  await test('supplier statistics use existing payment-count label and amounts', () => {
    const d=buildDataset({__exportDataReport:{monthly:[],bySupplier:{'Synthetic vendor':{count:2,total:700}},sourceIds:[],totalRevenue:0}},admin,{module:'data',format:'json'});
    const s=d.sheets.find(x=>x.name==='供应商统计');assert.equal(s.columns[1],'涉及付款单数');assert.deepEqual(s.rows,[['Synthetic vendor',2,700]]);
  });
  if(process.env.GITHUB_ACTIONS==='true') await test('real XLSX archive omits hidden identities and preserves own values', async () => {
    const { unzipSync,strFromU8 }=require('fflate');
    const r=await generateExport(fixture(),worker,{...options,format:'xlsx'});
    const entries=unzipSync(r.buffer),xml=Object.entries(entries).filter(([name])=>name.endsWith('.xml')).map(([,bytes])=>strFromU8(bytes)).join('\n');
    noHidden(xml);assert.ok(xml.includes('worker-test'));assert.ok(xml.includes('本人合计'));
    assert.equal(r.metadata['金额汇总'],25);assert.equal(r.metadata['月结应发合计'],100);assert.equal(r.audit.bytes,r.buffer.length);
  });
  console.log('Public export privacy checks passed: '+passed);
})();
