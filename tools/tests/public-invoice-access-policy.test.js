'use strict';
// Synthetic records only. These fixtures are excluded from installation packages.
const assert = require('node:assert/strict');
const policy = require('../../invoice-access-policy');
let passed = 0;
function check(name, action) { action(); passed++; console.log('PASS ' + name); }
function throws(action, code, status) {
    assert.throws(action, error => error.code === code && error.statusCode === status);
}
const clone = value => JSON.parse(JSON.stringify(value));
const accounts = [
    {username: 'admin-fixture', role: 'admin', lifecycleVersion: 2},
    {username: 'reviewer-fixture', role: 'approver'},
    {username: 'employee-fixture', role: 'user', lifecycleVersion: 3},
    {username: 'staff.a-fixture', role: 'user', invoiceReplacementAllowed: true},
    {username: 'staffa-fixture', role: 'user', invoiceReplacementAllowed: false}
];
const configured = {invoiceBuyerName: ' 合成测试购买方有限公司 '};
check('new installation has no buyer default', () => {
    assert.deepEqual(policy.invoiceBuyerView({}), {invoiceBuyerName: null, invoiceBuyerConfigured: false});
});
check('missing buyer cannot be used for invoice validation', () => {
    throws(() => policy.configuredInvoiceBuyer({}), 'INVOICE_BUYER_NOT_CONFIGURED', 409);
});
check('missing buyer never equals missing invoice buyer', () => {
    throws(() => policy.invoiceBuyerMatches('', {}), 'INVOICE_BUYER_NOT_CONFIGURED', 409);
});
check('configured buyer trims only surrounding space for display', () => {
    assert.equal(policy.configuredInvoiceBuyer(configured), '合成测试购买方有限公司');
});
check('invoice matching retains existing punctuation and suffix normalization', () => {
    assert.equal(policy.invoiceBuyerMatches('合成测试（购买方）有限责任公司', configured), true);
});
check('different buyer and absent invoice buyer reject', () => {
    assert.equal(policy.invoiceBuyerMatches('另一个合成单位有限公司', configured), false);
    for (const value of ['', null, undefined, 123, [], {}]) assert.equal(policy.invoiceBuyerMatches(value, configured), false);
});
for (const value of ['', '  ', null, false, 1, [], {}, '有限公司', 'x'.repeat(301), '合成\n购买方']) {
    check('invalid buyer configuration rejects: ' + JSON.stringify(value).slice(0, 35), () => {
        throws(() => policy.validateInvoiceBuyerName(value), 'INVOICE_BUYER_INVALID', 400);
    });
}
check('inherited buyer setting cannot pass as explicit configuration', () => {
    throws(() => policy.configuredInvoiceBuyer(Object.create(configured)), 'INVOICE_BUYER_NOT_CONFIGURED', 409);
});
check('malformed configuration is not treated as absent', () => {
    for (const value of [null, [], false, 'name']) throws(() => policy.invoiceBuyerView(value), 'INVOICE_BUYER_INVALID', 400);
});
check('buyer read view does not leak unrelated settings', () => {
    assert.deepEqual(policy.invoiceBuyerView({...configured, privateFixture: 'not-returned'}),
        {invoiceBuyerName: '合成测试购买方有限公司', invoiceBuyerConfigured: true});
});
check('new employee has no automatic replacement permission', () => {
    assert.equal(policy.canOperatorUseReplacement('employee-fixture', accounts), false);
});
check('explicit true grants only current employee operation eligibility', () => {
    assert.equal(policy.canOperatorUseReplacement('staff.a-fixture', accounts), true);
});
check('account comparison is exact rather than supplier name normalization', () => {
    for (const name of ['STAFF.A-FIXTURE', 'staffa-fixture', 'staff.a-fixture ', ' staff.a-fixture'])
        assert.equal(policy.canOperatorUseReplacement(name, accounts), false);
});
check('supplier association alone does not authorize replacement', () => {
    const linked = clone(accounts);
    linked[2].payeeAccountId = 'SUP-SYNTHETIC';
    linked[2].linkedEmployeeUsername = 'employee-fixture';
    assert.equal(policy.canOperatorUseReplacement('employee-fixture', linked), false);
});
for (const marker of [{disabledAt: 'synthetic-time'}, {accountStatus: 'disabled'}, {deletedAt: 'synthetic-time'}, {accountStatus: 'deleted'}]) {
    check('inactive employee loses operation eligibility: ' + Object.keys(marker)[0] + ':' + Object.values(marker)[0], () => {
        const rows = [{username: 'staff.a-fixture', role: 'user', invoiceReplacementAllowed: true, ...marker}];
        assert.equal(policy.canOperatorUseReplacement('staff.a-fixture', rows), false);
    });
}
check('Admin and approver retain existing analysis eligibility without employee flag', () => {
    assert.equal(policy.canOperatorUseReplacement('admin-fixture', accounts), true);
    assert.equal(policy.canOperatorUseReplacement('reviewer-fixture', accounts), true);
});
check('stale role cannot override current account data', () => {
    const rows = clone(accounts); rows[0].role = 'user';
    assert.equal(policy.canOperatorUseReplacement('admin-fixture', rows), false);
});
check('disabled administrator does not retain replacement capability', () => {
    const rows = clone(accounts); rows[0].accountStatus = 'disabled';
    assert.equal(policy.canOperatorUseReplacement('admin-fixture', rows), false);
});
check('unknown and duplicate usernames fail closed', () => {
    assert.equal(policy.canOperatorUseReplacement('missing-fixture', accounts), false);
    assert.equal(policy.canOperatorUseReplacement('staff.a-fixture', [...accounts, accounts[3]]), false);
    assert.equal(policy.canOperatorUseReplacement('staff.a-fixture', {}), false);
});
check('flag must be own boolean true', () => {
    for (const flag of ['true', 1, {}, false, null])
        assert.equal(policy.canOperatorUseReplacement('s', [{username: 's', role: 'user', invoiceReplacementAllowed: flag}]), false);
    const record = Object.assign(Object.create({invoiceReplacementAllowed: true}), {username: 's', role: 'user'});
    assert.equal(policy.canOperatorUseReplacement('s', [record]), false);
});
check('Admin receives a patch without mutating live users', () => {
    const before = JSON.stringify(accounts);
    assert.deepEqual(policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', true, 3, accounts),
        {invoiceReplacementAllowed: true});
    assert.equal(JSON.stringify(accounts), before);
});
check('employee and approver cannot manage another account authorization', () => {
    for (const actor of ['employee-fixture', 'reviewer-fixture', 'missing-fixture'])
        throws(() => policy.replacementPermissionPatch(actor, 'employee-fixture', true, 3, accounts), 'ADMIN_REQUIRED', 403);
});
check('current Admin role and active state required for permission mutation', () => {
    for (const extra of [{role: 'user'}, {disabledAt: 'synthetic-time'}, {accountStatus: 'deleted'}]) {
        const rows = clone(accounts); Object.assign(rows[0], extra);
        throws(() => policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', true, 3, rows), 'ADMIN_REQUIRED', 403);
    }
});
check('only existing active employee can be configured', () => {
    for (const name of ['admin-fixture', 'reviewer-fixture', 'missing-fixture'])
        throws(() => policy.replacementPermissionPatch('admin-fixture', name, true, 0, accounts), 'ACTIVE_EMPLOYEE_REQUIRED', 400);
    const rows = clone(accounts); rows[2].accountStatus = 'disabled';
    throws(() => policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', false, 3, rows), 'ACTIVE_EMPLOYEE_REQUIRED', 400);
});
check('permission mutation requires explicit boolean', () => {
    for (const value of [undefined, null, 0, 1, 'true', 'false', []])
        throws(() => policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', value, 3, accounts), 'REPLACEMENT_PERMISSION_INVALID', 400);
});
check('permission mutation preserves lifecycle optimistic concurrency', () => {
    throws(() => policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', true, 2, accounts), 'LIFECYCLE_VERSION_CONFLICT', 409);
    for (const value of [undefined, null, '3', 3.1, -1, NaN])
        throws(() => policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', true, value, accounts), 'LIFECYCLE_VERSION_REQUIRED', 400);
});
check('legacy missing lifecycle version is read as zero without rewriting', () => {
    const rows = clone(accounts); delete rows[2].lifecycleVersion;
    assert.deepEqual(policy.replacementPermissionPatch('admin-fixture', 'employee-fixture', false, 0, rows), {invoiceReplacementAllowed: false});
    assert.equal(Object.hasOwn(rows[2], 'lifecycleVersion'), false);
});
check('withdrawal rechecks an old draft without modifying the draft', () => {
    const rows = clone(accounts);
    const draft = {id: 'DRAFT-SYNTHETIC', applicant: 'staff.a-fixture', eligible: true, amount: 47};
    const before = JSON.stringify(draft);
    assert.equal(policy.canOperatorUseReplacement(draft.applicant, rows), true);
    rows[3].invoiceReplacementAllowed = false;
    assert.equal(policy.canOperatorUseReplacement(draft.applicant, rows), false);
    assert.equal(JSON.stringify(draft), before);
});
check('stored payee identity never depends on authorization or supplier display name', () => {
    const records = [
        {payeeAccountType: 'formal-supplier', supplier: 'staff.a-fixture'},
        {payeeAccountType: 'employee-payee', supplier: 'Formal-looking synthetic name'},
        {payeeAccountType: 'company-payee', supplier: 'another-fixture'}
    ];
    const before = JSON.stringify(records);
    assert.deepEqual(records.map(policy.payeeSnapshotType), ['formal-supplier', 'employee-payee', 'company-payee']);
    assert.deepEqual(records.map(policy.replacementRowFromSnapshot), [false, true, true]);
    const rows = clone(accounts); rows[3].invoiceReplacementAllowed = false;
    assert.deepEqual(records.map(policy.replacementRowFromSnapshot), [false, true, true]);
    assert.equal(JSON.stringify(records), before);
});
check('unknown historical payee type is not guessed from current user or supplier name', () => {
    for (const record of [{supplier: 'staff.a-fixture'}, {payeeAccountType: 'invalid'}, {}]) {
        assert.equal(policy.payeeSnapshotType(record), '');
        assert.equal(policy.replacementRowFromSnapshot(record), null);
    }
});
check('stored pool type is stable when permission changes', () => {
    const history = [
        {poolOwnerType: 'employee', poolOwner: 'staff.a-fixture', amount: 37},
        {poolOwnerType: 'supplier', poolOwner: 'staff.a-fixture', amount: 92}
    ];
    const before = JSON.stringify(history);
    assert.deepEqual(history.map(policy.poolSnapshotType), ['employee', 'supplier']);
    const rows = clone(accounts); rows[3].invoiceReplacementAllowed = false;
    assert.deepEqual(history.map(policy.poolSnapshotType), ['employee', 'supplier']);
    assert.equal(JSON.stringify(history), before);
});
check('unknown historical pool identity cannot silently become shared supplier balance', () => {
    for (const record of [{poolOwner: 'staff.a-fixture'}, {poolOwnerType: 'unknown'}, {isReplacement: true}, {}])
        assert.equal(policy.poolSnapshotType(record), '');
});
check('only employee payee keeps ordinary optional bank information', () => {
    assert.equal(policy.supplierBankIsOptional({payeeAccountType: 'employee-payee'}), true);
    for (const type of ['formal-supplier', 'company-payee', '', 'other'])
        assert.equal(policy.supplierBankIsOptional({payeeAccountType: type, name: 'arbitrary-fixture'}), false);
});
check('debt cost eligibility admits only active formal suppliers', () => {
    assert.equal(policy.debtPayeeEligible({payeeAccountType: 'formal-supplier'}), true);
    assert.equal(policy.debtPayeeEligible({payeeAccountType: 'formal-supplier', enabled: false}), false);
    for (const type of ['employee-payee', 'company-payee', '', 'other'])
        assert.equal(policy.debtPayeeEligible({payeeAccountType: type}), false);
});
check('all reads and rejected mutations leave inputs unchanged', () => {
    const before = JSON.stringify({accounts, configured});
    try { policy.replacementPermissionPatch('employee-fixture', 'staff.a-fixture', true, 0, accounts); } catch {}
    policy.invoiceBuyerView(configured); policy.canOperatorUseReplacement('staff.a-fixture', accounts);
    assert.equal(JSON.stringify({accounts, configured}), before);
});
console.log('Public invoice access policy checks: ' + passed + ' passed');
