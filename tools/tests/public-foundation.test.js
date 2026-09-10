'use strict';

// Synthetic unit fixtures only. Never import these records into an installed instance.
const assert = require('node:assert/strict');
const clients = require('../../client-master');
const { authoritativeDebtStatus } = require('../../business-view-contract');

let passed = 0;
function test(name, run) {
    run();
    passed += 1;
    console.log('PASS ' + name);
}
const context = { id: 'DEMO-CLIENT-1', username: 'demo-admin', clients: [], now: '2030-01-02 03:04:05' };
const input = { fullName: '演示甲方有限公司', aliases: ['演示甲方', 'Demo Client'], note: '虚构测试记录' };
const make = () => clients.createClientRecord(input, context);

test('normalizes width, whitespace and case', () => {
    assert.equal(clients.normalizeClientName(' ＤＥＭＯ Client　'), 'democlient');
});
test('deduplicates normalized aliases', () => {
    assert.deepEqual(clients.parseClientAliases('Demo，ＤＥＭＯ;其他'), ['Demo', '其他']);
});
test('rejects missing full name', () => {
    assert.throws(() => clients.validateClientInput({ fullName: ' ' }), /不能为空/);
});
test('rejects excessive full name', () => {
    assert.throws(() => clients.validateClientInput({ fullName: '字'.repeat(121) }), /不能超过/);
});
test('rejects excessive note', () => {
    assert.throws(() => clients.validateClientInput({ fullName: '演示', note: '字'.repeat(501) }), /不能超过/);
});
test('rejects more than twenty aliases', () => {
    assert.throws(() => clients.parseClientAliases(Array.from({ length: 21 }, (_, n) => 'alias-' + n)), /不能超过 20/);
});
test('rejects name also used as an alias', () => {
    assert.throws(() => clients.validateClientInput({ fullName: 'Demo', aliases: ['ＤＥＭＯ'] }), /不能重复/);
});
test('rejects cross-record name and alias conflicts', () => {
    assert.throws(() => clients.validateClientInput({ fullName: 'ＤＥＭＯ　CLIENT' }, [make()]), /已被/);
});
test('disabled clients still reserve names', () => {
    assert.throws(() => clients.validateClientInput({ fullName: input.fullName }, [{ ...make(), enabled: false }]), /已被/);
});
test('create uses supplied stable id and audit context', () => {
    const row = make();
    assert.equal(row.id, context.id);
    assert.equal(row.code, context.id);
    assert.equal(row.createdBy, context.username);
    assert.equal(row.createdAt, context.now);
    assert.equal(row.enabled, true);
    assert.deepEqual(context.clients, []);
});
test('create ignores unapproved identity fields', () => {
    const row = clients.createClientRecord({ ...input, id: 'forged', createdBy: 'forged', shortName: 'ignored' }, context);
    assert.equal(row.id, context.id);
    assert.equal(row.createdBy, context.username);
    assert.equal(Object.hasOwn(row, 'shortName'), false);
});
test('partial update preserves id, prior fields and source object', () => {
    const row = make();
    const before = JSON.stringify(row);
    const updated = clients.updateClientRecord(row, { id: 'forged', enabled: false }, { ...context, clients: [row] });
    assert.equal(updated.id, row.id);
    assert.equal(updated.code, row.code);
    assert.equal(updated.fullName, row.fullName);
    assert.equal(updated.enabled, false);
    assert.equal(JSON.stringify(row), before);
});
test('legacy short name is retained, not replaced by new input', () => {
    const row = { ...make(), shortName: '历史展示值' };
    const updated = clients.updateClientRecord(row, { shortName: 'ignored' }, { ...context, clients: [row] });
    assert.equal(updated.shortName, '历史展示值');
});
test('updating an absent record fails', () => {
    assert.throws(() => clients.updateClientRecord(null, {}, context), /不存在/);
});
test('minimal active view excludes management-only fields', () => {
    assert.deepEqual(Object.keys(clients.activeClientView(make())).sort(), ['code', 'displayName', 'fullName', 'id']);
});
test('active client resolves by stable id', () => {
    const row = make();
    assert.equal(clients.resolveActiveClient([row], row.id), row);
});
test('missing, unknown and disabled choices fail', () => {
    assert.throws(() => clients.resolveActiveClient([], ''), /请选择/);
    assert.throws(() => clients.resolveActiveClient([], 'unknown'), /不存在/);
    assert.throws(() => clients.resolveActiveClient([{ ...make(), enabled: false }], context.id), /已停用/);
});
test('new snapshot uses authoritative client name', () => {
    const row = make();
    const record = clients.applyClientSnapshot({ partyA: 'forged' }, row);
    assert.equal(record.clientId, row.id);
    assert.equal(record.partyA, row.fullName);
    assert.equal(record.clientNameSnapshot, row.fullName);
});
test('legacy binding preserves original display evidence', () => {
    const row = make();
    const record = { id: 'DEMO-PROJECT', partyA: '虚构旧名称' };
    clients.bindLegacyClient(record, row, context);
    assert.equal(record.partyA, '虚构旧名称');
    assert.equal(record.clientNameSnapshot, '虚构旧名称');
    assert.equal(record.clientBindingAudit.confirmedBy, context.username);
    assert.equal(record.clientBindingAudit.clientFullNameSnapshot, row.fullName);
});
test('legacy binding without original name uses selected name', () => {
    const row = make();
    const record = {};
    clients.bindLegacyClient(record, row, context);
    assert.equal(record.partyA, row.fullName);
});
test('repeat binding fails without changing evidence', () => {
    const record = {};
    clients.bindLegacyClient(record, make(), context);
    const before = JSON.stringify(record);
    assert.throws(() => clients.bindLegacyClient(record, make(), context), /不能重复绑定/);
    assert.equal(JSON.stringify(record), before);
});
test('absent legacy record fails', () => {
    assert.throws(() => clients.bindLegacyClient(null, make(), context), /不存在/);
});
test('debt lifecycle status takes precedence', () => {
    assert.equal(authoritativeDebtStatus({ lifecycleStatus: 'closed', status: 'approved' }), 'closed');
});
test('debt status fallback remains unchanged', () => {
    assert.equal(authoritativeDebtStatus({ status: 'approved' }), 'approved');
    assert.equal(authoritativeDebtStatus({}), '');
    assert.equal(authoritativeDebtStatus(null), '');
});
console.log(JSON.stringify({ suite: 'public-foundation', passed, synthetic: true }));
