'use strict';

// Public configuration and operation eligibility only. This module does not
// grant route/project access, change stored history, or perform persistence.
const PAYEE_TYPES = new Set(['formal-supplier', 'employee-payee', 'company-payee']);
const POOL_TYPES = new Set(['employee', 'supplier']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function fail(code, message, statusCode = 400) {
    const error = new Error(message); error.code = code; error.statusCode = statusCode; throw error;
}
function normalizeInvoiceName(value) {
    // Retain the existing invoice matching rule, not the account identity rule.
    return String(value || '').toLowerCase()
        .replace(/[（）()\s,，.。·\-_\[\]【】]/g, '')
        .replace(/有限公司|有限责任公司|公司|个体工商户|开票专用章/g, '');
}
function validateInvoiceBuyerName(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 300
        || /[\u0000-\u001f\u007f]/.test(value) || !normalizeInvoiceName(value)) {
        fail('INVOICE_BUYER_INVALID', '购买方必须为有效的单位全称（1—300字），不能含控制字符');
    }
    return value.trim();
}
function invoiceBuyerView(config = {}) {
    if (!object(config)) fail('INVOICE_BUYER_INVALID', '购买方配置结构无效');
    if (!own(config, 'invoiceBuyerName')) return {invoiceBuyerName: null, invoiceBuyerConfigured: false};
    return {invoiceBuyerName: validateInvoiceBuyerName(config.invoiceBuyerName), invoiceBuyerConfigured: true};
}
function configuredInvoiceBuyer(config) {
    const view = invoiceBuyerView(config);
    if (!view.invoiceBuyerConfigured) {
        fail('INVOICE_BUYER_NOT_CONFIGURED', '请先由 Admin 配置发票购买方单位全称', 409);
    }
    return view.invoiceBuyerName;
}
function invoiceBuyerMatches(actual, config) {
    const required = configuredInvoiceBuyer(config);
    if (typeof actual !== 'string' || !normalizeInvoiceName(actual)) return false;
    return normalizeInvoiceName(actual) === normalizeInvoiceName(required);
}
function currentActiveAccount(username, users) {
    if (typeof username !== 'string' || !username || !Array.isArray(users)) return null;
    const matches = users.filter(account => object(account) && own(account, 'username') && account.username === username);
    if (matches.length !== 1) return null;
    const account = matches[0];
    if (account.deletedAt || account.accountStatus === 'deleted'
        || account.disabledAt || account.accountStatus === 'disabled') return null;
    return account;
}
function canOperatorUseReplacement(username, users) {
    const account = currentActiveAccount(username, users);
    if (!account) return false;
    if (account.role === 'admin' || account.role === 'approver') return true;
    return account.role === 'user' && own(account, 'invoiceReplacementAllowed')
        && account.invoiceReplacementAllowed === true;
}
function replacementPermissionPatch(operatorUsername, targetUsername, allowed, expectedVersion, users) {
    const operator = currentActiveAccount(operatorUsername, users);
    if (!operator || operator.role !== 'admin') fail('ADMIN_REQUIRED', '只有有效 Admin 可以维护员工替票授权', 403);
    const target = currentActiveAccount(targetUsername, users);
    if (!target || target.role !== 'user') fail('ACTIVE_EMPLOYEE_REQUIRED', '请选择现有有效员工账号');
    if (typeof allowed !== 'boolean') fail('REPLACEMENT_PERMISSION_INVALID', '替票授权必须为明确勾选值');
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
        fail('LIFECYCLE_VERSION_REQUIRED', '缺少有效账号版本，请刷新后重试');
    }
    const version = Number(target.lifecycleVersion);
    const currentVersion = Number.isSafeInteger(version) && version >= 0 ? version : 0;
    if (expectedVersion !== currentVersion) fail('LIFECYCLE_VERSION_CONFLICT', '账号状态已变化，请刷新后重试', 409);
    // Apply only inside the existing atomic lifecycle/audit transaction.
    return {invoiceReplacementAllowed: allowed};
}
function payeeSnapshotType(record) {
    if (!object(record) || !own(record, 'payeeAccountType')) return '';
    const value = typeof record.payeeAccountType === 'string' ? record.payeeAccountType.trim() : '';
    return PAYEE_TYPES.has(value) ? value : '';
}
function replacementRowFromSnapshot(record) {
    const type = payeeSnapshotType(record);
    return type ? type === 'employee-payee' || type === 'company-payee' : null;
}
function poolSnapshotType(record) {
    if (!object(record) || !own(record, 'poolOwnerType')) return '';
    return POOL_TYPES.has(record.poolOwnerType) ? record.poolOwnerType : '';
}
function supplierBankIsOptional(record) {
    return payeeSnapshotType(record) === 'employee-payee';
}
function debtPayeeEligible(record) {
    return payeeSnapshotType(record) === 'formal-supplier' && record.enabled !== false;
}
module.exports = {
    normalizeInvoiceName, validateInvoiceBuyerName, invoiceBuyerView, configuredInvoiceBuyer,
    invoiceBuyerMatches, canOperatorUseReplacement, replacementPermissionPatch,
    payeeSnapshotType, replacementRowFromSnapshot, poolSnapshotType,
    supplierBankIsOptional, debtPayeeEligible
};
