'use strict';
// Synthetic cases only. These amounts, accounts and thresholds are not installation defaults.
const assert = require('node:assert/strict');
const cfg = require('../../bonus-config');
const bonus = require('../../bonus-preview');
const execution = require('../../execution-bonus');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const clone = value => JSON.parse(JSON.stringify(value));
const rules = () => ({
    profitBands: [{ min: null, max: 1000, value: 120 }, { min: 1000, max: null, value: 240 }],
    kpi2Bands: [{ min: 0.6, max: 0.9, value: 1.25 }, { min: 0.9, max: null, value: 1.5 }],
    manualKpi2Threshold: 0.6
});
const invalid = fn => assert.throws(fn, error => error.code === 'BONUS_CONFIG_INVALID');
const missing = fn => assert.throws(fn, error => error.code === 'BONUS_CONFIG_MISSING');
const conflict = fn => assert.throws(fn, error => error.statusCode === 409);
function fixture() {
    const application = { id: 'PROJECT-SYNTHETIC', projectName: 'Synthetic project', status: 'approved', applicant: 'owner-test', startDate: '2027-04-12' };
    const payment = { id: 'PAYMENT-SYNTHETIC', projectId: application.id, status: 'approved', contractAmount: 1000, taxAmount: 0, approveTime: '2027-04-15T12:00:00Z', items: [{ amount: 200, serviceFee: 0, isProxy: '否' }], executionParticipants: [{ username: 'assistant-test', contribution: 'Synthetic work' }] };
    const config = rules();
    return { id: 'BONUS-SYNTHETIC', application, payments: [payment], existingConfirmations: [], rules: config, confirmedBy: 'admin-test', confirmedAt: '2027-04-16T12:00:00Z',
        body: { paymentId: payment.id, finalBusinessBonus: 150, executionBonuses: [{ username: 'assistant-test', amount: 25 }], rulesDigest: cfg.bonusRulesDigest(config) } };
}
test('no predefined business bonus values', () => assert.deepEqual(cfg.DEFAULT_BONUS_RULES, { profitBands: [], kpi2Bands: [] }));
test('default structure is deeply frozen', () => {
    assert.equal(Object.isFrozen(cfg.DEFAULT_BONUS_RULES), true);
    assert.equal(Object.isFrozen(cfg.DEFAULT_BONUS_RULES.profitBands), true);
    assert.equal(Object.isFrozen(cfg.DEFAULT_BONUS_RULES.kpi2Bands), true);
});
test('no historical company example fallback', () => {
    assert.deepEqual(bonus.CONFIRMED_PROJECT_EXAMPLES, []);
    assert.equal(Object.isFrozen(bonus.CONFIRMED_PROJECT_EXAMPLES), true);
});
for (const [name, value] of [['undefined', undefined], ['null', null], ['empty', {}], ['structure only', cfg.DEFAULT_BONUS_RULES]]) {
    test('missing configuration: ' + name, () => {
        missing(() => cfg.validateBonusRules(value));
        assert.equal(cfg.inspectBonusRules(value).ready, false);
        const row = bonus.calculateProjectBonus({ profit: 800, kpi2: 0.8 }, value);
        assert.equal(row.status, 'pending_confirmation');
        assert.equal(row.finalBonus, null);
        assert.equal(row.rulesDigest, null);
    });
}
test('complete configuration keeps explicit data and existing boundary defaults', () => {
    const result = cfg.validateBonusRules(rules());
    assert.equal(result.profitBands[0].minInclusive, true);
    assert.equal(result.profitBands[0].maxInclusive, false);
    assert.equal(result.manualKpi2Threshold, 0.6);
    assert.equal(result.profitBands[0].value, 120);
});
test('both tables and manual threshold are required', () => {
    for (const key of ['profitBands', 'kpi2Bands', 'manualKpi2Threshold']) {
        const input = rules(); delete input[key]; missing(() => cfg.validateBonusRules(input));
    }
});
test('empty tables are not a zero bonus policy', () => {
    for (const key of ['profitBands', 'kpi2Bands']) {
        const input = rules(); input[key] = []; missing(() => cfg.validateBonusRules(input));
    }
});
for (const [name, value] of [['null', null], ['undefined', undefined], ['empty string', ''], ['string number', '0.6'], ['true', true], ['false', false], ['NaN', NaN], ['Infinity', Infinity], ['negative Infinity', -Infinity], ['negative', -0.1], ['object', {}], ['array', []]]) {
    test('invalid financial parameter: ' + name, () => {
        for (const field of ['threshold', 'amount', 'coefficient']) {
            const input = rules();
            if (field === 'threshold') input.manualKpi2Threshold = value;
            if (field === 'amount') input.profitBands[0].value = value;
            if (field === 'coefficient') input.kpi2Bands[0].value = value;
            invalid(() => cfg.validateBonusRules(input));
        }
    });
}
test('explicit zero values are valid', () => {
    const input = { profitBands: [{ min: null, max: null, value: 0 }], kpi2Bands: [{ min: null, max: null, value: 0 }], manualKpi2Threshold: 0 };
    assert.equal(cfg.validateBonusRules(input).manualKpi2Threshold, 0);
    assert.equal(bonus.calculateProjectBonus({ profit: 800, kpi2: 0.8 }, input).finalBonus, 0);
});
test('money precision is limited to cents', () => { const input = rules(); input.profitBands[0].value = 1.001; invalid(() => cfg.validateBonusRules(input)); });
test('coefficient precision is limited to six decimals', () => { const input = rules(); input.kpi2Bands[0].value = 1.0000001; invalid(() => cfg.validateBonusRules(input)); });
test('unsafe numeric magnitude is rejected', () => { const input = rules(); input.profitBands[0].value = Number.MAX_SAFE_INTEGER; invalid(() => cfg.validateBonusRules(input)); });
test('configuration must be an object', () => { for (const input of [[], '', 0, false]) invalid(() => cfg.validateBonusRules(input)); });
test('unknown top-level fields are rejected', () => invalid(() => cfg.validateBonusRules({ ...rules(), hiddenFactor: 2 })));
test('inherited fields cannot complete configuration', () => missing(() => cfg.validateBonusRules(Object.create(rules()))));
test('unknown band fields are rejected', () => { const input = rules(); input.profitBands[0].extra = 1; invalid(() => cfg.validateBonusRules(input)); });
test('band fields cannot be inherited', () => { const input = rules(); input.profitBands[0] = Object.create(input.profitBands[0]); invalid(() => cfg.validateBonusRules(input)); });
test('invalid table structure is rejected', () => { const input = rules(); input.profitBands = {}; invalid(() => cfg.validateBonusRules(input)); });
test('invalid band structure is rejected', () => { const input = rules(); input.profitBands[0] = null; invalid(() => cfg.validateBonusRules(input)); });
test('explicit null means an unbounded interval', () => { const input = rules(); input.profitBands = [{ min: null, max: null, value: 120 }]; assert.equal(cfg.validateBonusRules(input).profitBands[0].min, null); });
test('blank bounds cannot silently become zero or unbounded', () => { const input = rules(); input.profitBands[0].min = ''; invalid(() => cfg.validateBonusRules(input)); });
test('boundary flags must be booleans', () => { const input = rules(); input.profitBands[0].minInclusive = 'false'; invalid(() => cfg.validateBonusRules(input)); });
test('reversed or empty intervals are rejected', () => { for (const min of [1000, 1001]) { const input = rules(); input.profitBands[0].min = min; invalid(() => cfg.validateBonusRules(input)); } });
test('overlap cannot depend on array ordering', () => { const input = rules(); input.profitBands[1].min = 900; invalid(() => cfg.validateBonusRules(input)); input.profitBands.reverse(); invalid(() => cfg.validateBonusRules(input)); });
test('adjacent closed boundaries may not overlap', () => { const input = rules(); input.profitBands[0].maxInclusive = true; invalid(() => cfg.validateBonusRules(input)); });
test('one included boundary remains unambiguous', () => { const input = rules(); input.profitBands[0].maxInclusive = true; input.profitBands[1].minInclusive = false; cfg.validateBonusRules(input); assert.equal(bonus.calculateProjectBonus({ profit: 1000, kpi2: 0.8 }, input).baseBonus, 120); });
test('table resource limit is enforced', () => { const input = rules(); input.profitBands = Array.from({ length: 101 }, (_, i) => ({ min: i, max: i + 1, value: 1 })); invalid(() => cfg.validateBonusRules(input)); });
test('canonical digest ignores object key ordering and explicit default flags', () => {
    const normalized = cfg.validateBonusRules(rules());
    const reordered = { manualKpi2Threshold: normalized.manualKpi2Threshold, kpi2Bands: normalized.kpi2Bands, profitBands: normalized.profitBands };
    assert.match(cfg.bonusRulesDigest(reordered), /^[a-f0-9]{64}$/);
    assert.equal(cfg.bonusRulesDigest(reordered), cfg.bonusRulesDigest(rules()));
});
test('changing a parameter changes its digest', () => { const input = rules(); const before = cfg.bonusRulesDigest(input); input.manualKpi2Threshold = 0.4; assert.notEqual(cfg.bonusRulesDigest(input), before); });
test('validation, digest and preview do not mutate source input', () => { const input = rules(), before = clone(input); cfg.validateBonusRules(input); cfg.bonusRulesDigest(input); bonus.calculateProjectBonus({ profit: 800, kpi2: 0.8 }, input); assert.deepEqual(input, before); });
test('normal formula remains base times coefficient', () => { const row = bonus.calculateProjectBonus({ profit: 800, kpi2: 0.8 }, rules()); assert.equal(row.baseBonus, 120); assert.equal(row.adjustmentRate, 1.25); assert.equal(row.finalBonus, 150); assert.equal(row.ruleSource, 'configured-bands'); });
test('tier lower and upper boundaries retain original semantics', () => {
    assert.equal(bonus.calculateProjectBonus({ profit: 1000, kpi2: 0.8 }, rules()).finalBonus, 300);
    assert.equal(bonus.calculateProjectBonus({ profit: 800, kpi2: 0.9 }, rules()).finalBonus, 180);
});
test('manual threshold follows configured value', () => { const input = rules(); assert.equal(bonus.calculateProjectBonus({ profit: 800, kpi2: 0.5 }, input).status, 'pending_admin_confirmation'); input.manualKpi2Threshold = 0.4; assert.equal(bonus.calculateProjectBonus({ profit: 800, kpi2: 0.5 }, input).status, 'pending_confirmation'); });
test('configured KPI band keeps precedence over manual path', () => { const input = rules(); input.kpi2Bands[0].min = 0.3; assert.equal(bonus.calculateProjectBonus({ profit: 800, kpi2: 0.5 }, input).status, 'calculated'); });
test('uncovered profit cannot use manual override', () => { const input = rules(); input.profitBands[0].min = 900; const row = bonus.calculateProjectBonus({ profit: 800, kpi2: 0.5 }, input); assert.equal(row.status, 'pending_confirmation'); assert.equal(row.finalBonus, null); });
test('uncovered KPI gaps do not become zero or automatic manual permission', () => { const input = rules(); input.kpi2Bands[0].max = 0.7; const row = bonus.calculateProjectBonus({ profit: 800, kpi2: 0.8 }, input); assert.equal(row.status, 'pending_confirmation'); assert.equal(row.finalBonus, null); });
test('malformed financial inputs stay pending', () => { for (const value of [undefined, null, NaN, Infinity, '800']) assert.equal(bonus.calculateProjectBonus({ profit: value, kpi2: 0.8 }, rules()).finalBonus, null); });
test('amount overflow never becomes a zero bonus', () => { const input = rules(); input.profitBands[0].value = 1000000000000; input.kpi2Bands[0].value = 1000000; const row = bonus.calculateProjectBonus({ profit: 800, kpi2: 0.8 }, input); assert.equal(row.configurationError, 'BONUS_RESULT_INVALID'); assert.equal(row.finalBonus, null); });
test('context identity cannot produce different configured amounts', () => {
    const financials = { profit: 800, kpi2: 0.8 };
    assert.deepEqual(bonus.calculateProjectBonus(financials, rules(), { applicationId: 'SYNTHETIC-A', applicant: 'owner-test' }), bonus.calculateProjectBonus(financials, rules(), { applicationId: 'SYNTHETIC-B', applicant: 'other-test' }));
});
test('default row has no implicit rules', () => { const f = fixture(); const row = bonus.buildProjectBonusRow(f.application, f.payments[0]); assert.equal(row.status, 'pending_confirmation'); assert.equal(row.finalBonus, null); });
test('financial formula and cost sources are unchanged', () => {
    const result = bonus.calculateProjectFinancials({ contractAmount: 2000 }, { contractAmount: 1000, taxAmount: 50, items: [{ amount: 9999 }], kpiItems: [{ amount: 100, serviceFee: 10, isProxy: '是' }, { amount: 200, serviceFee: 0, isProxy: '否' }] });
    assert.deepEqual(result, { revenue: 1000, paymentAmount: 300, serviceFee: 10, tax: 50, totalCost: 360, proxyCost: 110, profit: 640, kpi1: 0.64, kpi2: 0.719101 });
});
test('latest approved selection ignores rejected and newer pending versions', () => {
    const f = fixture(), base = f.payments[0];
    const rows = [base, { ...base, id: 'SYNTHETIC-PENDING', status: 'pending', approveTime: '2027-05-01T00:00:00Z' }, { ...base, id: 'SYNTHETIC-OLD', approveTime: '2027-04-01T00:00:00Z' }];
    const before = clone(rows); assert.equal(bonus.latestApprovedPayment(f.application.id, rows).id, base.id); assert.deepEqual(rows, before);
});
test('monthly preview and execution participant filter are unchanged', () => {
    const f = fixture();
    const result = bonus.buildBonusPreview({ applications: [f.application], payments: f.payments, year: 2027, month: 4, username: 'assistant-test', rules: f.rules });
    assert.equal(result.projectRows.length, 1); assert.equal(result.projectRows[0].finalBonus, 150);
    assert.equal(bonus.buildBonusPreview({ applications: [f.application], payments: f.payments, year: 2027, month: 5, rules: f.rules }).projectRows.length, 0);
});
test('normal locking saves existing financial facts and complete rule snapshot', () => {
    const f = fixture(), before = clone(f), record = execution.createLockedBonusConfirmation(f);
    assert.equal(record.status, 'locked'); assert.equal(record.totals.projectBonus, 175);
    assert.equal(record.ruleSnapshot.manualKpi2Threshold, 0.6);
    assert.equal(record.ruleSnapshot.rulesDigest, f.body.rulesDigest);
    assert.deepEqual(record.ruleSnapshot.profitBands, cfg.validateBonusRules(f.rules).profitBands);
    assert.deepEqual(f, before);
});
test('missing, incorrect and stale digests cannot lock', () => {
    for (const digest of [undefined, null, '', 'incorrect']) { const f = fixture(); if (digest === undefined) delete f.body.rulesDigest; else f.body.rulesDigest = digest; const before = clone(f); conflict(() => execution.createLockedBonusConfirmation(f)); assert.deepEqual(f, before); }
    const f = fixture(); f.rules.kpi2Bands[0].value = 1.3; conflict(() => execution.createLockedBonusConfirmation(f));
});
test('missing configuration cannot lock with a supplied amount', () => { const f = fixture(); delete f.rules; conflict(() => execution.createLockedBonusConfirmation(f)); });
test('duplicate locked project remains a conflict', () => { const f = fixture(); f.existingConfirmations.push({ applicationId: f.application.id, status: 'locked' }); conflict(() => execution.createLockedBonusConfirmation(f)); });
test('stale payment id still fails', () => { const f = fixture(); f.body.paymentId = 'OTHER-SYNTHETIC'; assert.throws(() => execution.createLockedBonusConfirmation(f), /付款记录已经变化/); });
test('unapproved project cannot lock', () => { const f = fixture(); f.application.status = 'closed'; assert.throws(() => execution.createLockedBonusConfirmation(f), /项目未通过/); });
test('missing approved payment cannot lock', () => { const f = fixture(); f.payments[0].status = 'rejected'; assert.throws(() => execution.createLockedBonusConfirmation(f), /已通过付款/); });
test('missing activity date still fails', () => { const f = fixture(); delete f.application.startDate; assert.throws(() => execution.createLockedBonusConfirmation(f), /活动日期/); });
test('manual confirmation still needs a note', () => { const f = fixture(); f.payments[0].items[0].amount = 500; f.body.finalBusinessBonus = 80; assert.throws(() => execution.createLockedBonusConfirmation(f), /确认备注/); f.body.confirmationNote = 'Synthetic review note'; const record = execution.createLockedBonusConfirmation(f); assert.equal(record.businessBonus.confirmationMode, 'manual_below_kpi2_threshold'); assert.equal(record.businessBonus.confirmedFinalBonus, 80); });
test('normal Admin final adjustment remains available', () => { const f = fixture(); f.body.finalBusinessBonus = 145; assert.equal(execution.createLockedBonusConfirmation(f).businessBonus.confirmationMode, 'manual_adjustment'); });
test('execution participant identities must match payment', () => { const f = fixture(); f.body.executionBonuses[0].username = 'unrelated-test'; assert.throws(() => execution.createLockedBonusConfirmation(f), /人员必须与付款/); });
test('zero execution amount still requires an individual reason', () => { const f = fixture(); f.body.executionBonuses[0].amount = 0; assert.throws(() => execution.createLockedBonusConfirmation(f), /必须填写原因/); f.body.executionBonuses[0].zeroReason = 'Synthetic exception'; assert.equal(execution.createLockedBonusConfirmation(f).totals.executionBonus, 0); });
test('invalid final amount still fails', () => { for (const value of ['', null, -1, 1.001]) { const f = fixture(); f.body.finalBusinessBonus = value; assert.throws(() => execution.createLockedBonusConfirmation(f)); } });
test('changed source rules cannot rewrite an already returned snapshot', () => { const f = fixture(), record = execution.createLockedBonusConfirmation(f), before = clone(record); f.rules.profitBands[0].value = 777; f.rules.manualKpi2Threshold = 0.2; assert.deepEqual(record, before); });
test('historic read filter does not recalculate from current rules', () => { const f = fixture(), record = execution.createLockedBonusConfirmation(f), before = clone(record); const rows = execution.filterConfirmations([record], { year: 2027, month: 4, username: 'assistant-test' }); assert.equal(rows.length, 1); assert.deepEqual(record, before); });
test('employee options preserve role, active status and applicant exclusion', () => {
    const users = [{ username: 'owner-test', role: 'user' }, { username: 'assistant-test', role: 'user' }, { username: 'admin-test', role: 'admin' }, { username: 'disabled-test', role: 'user', accountStatus: 'disabled' }, { username: 'deleted-test', role: 'user', deletedAt: '2027-01-01' }];
    assert.deepEqual(execution.employeeOptions(users, 'owner-test'), ['assistant-test']);
    assert.throws(() => execution.normalizeExecutionParticipants([{ username: 'owner-test' }], { users, projectApplicant: 'owner-test' }), /项目申请人不能/);
    assert.deepEqual(execution.normalizeExecutionParticipants([{ username: 'assistant-test', contribution: 'Synthetic work' }], { users, projectApplicant: 'owner-test' }), [{ username: 'assistant-test', contribution: 'Synthetic work' }]);
});
let failed = 0;
for (const { name, fn } of tests) {
    try { fn(); console.log('PASS ' + name); }
    catch (error) { failed += 1; console.log('FAIL ' + name + ': ' + error.message); }
}
console.log('Public bonus configuration: ' + (tests.length - failed) + '/' + tests.length + ' passed.');
if (failed) throw new Error(failed + ' public bonus test(s) failed');
