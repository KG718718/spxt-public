'use strict';
const fsDefault = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ARRAY_FIELDS = Object.freeze([
    'applications', 'payments', 'debts', 'clients', 'invoices', 'invoiceOcrJobs',
    'invoiceDraftBatches', 'invoiceAuditRecords', 'bonusConfirmations', 'employeeSettlements',
    'projectClosureRecords', 'paymentCorrectionRecords', 'accountLifecycleAuditRecords',
    'supplierClassificationAuditRecords', 'mailSendRecords', 'exportAuditRecords',
    'users', 'suppliers', 'logs'
]);
const COUNTER_FIELDS = Object.freeze([
    'nextAppId', 'nextPayId', 'nextDebtId', 'nextDebtLinkId', 'nextClientId',
    'nextInvoiceId', 'nextOcrJobId', 'nextInvoiceDraftId', 'nextInvoiceAuditId',
    'nextBonusConfirmationId', 'nextEmployeeSettlementId', 'nextMailSendId'
]);

function failure(code, message, statusCode = 500) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}
function plainRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function newEmptyState() {
    return Object.fromEntries([
        ...ARRAY_FIELDS.map(key => [key, []]),
        ...COUNTER_FIELDS.map(key => [key, 1])
    ]);
}
function readOptionalJson(filename, label, fs = fsDefault) {
    // Inspect the entry itself: a broken link or disappearing file is not a fresh install.
    try {
        const stat = fs.lstatSync(filename);
        if (!stat.isFile() || stat.isSymbolicLink()) {
            throw failure('STORE_UNREADABLE', label + '必须为普通文件，不能使用链接或目录。');
        }
    } catch (error) {
        if (error.code === 'ENOENT') return { exists: false, value: null };
        throw failure('STORE_UNREADABLE', label + '不可读取；已停止启动，请检查权限或恢复备份，原文件不变。');
    }
    let source;
    try {
        source = fs.readFileSync(filename, 'utf8');
    } catch {
        throw failure('STORE_UNREADABLE', label + '读取失败或读取期间发生变化；已停止启动，禁止按空库初始化。');
    }
    try {
        const value = JSON.parse(source);
        if (!plainRecord(value)) throw Error('object required');
        return { exists: true, value };
    } catch {
        throw failure('STORE_INVALID', label + '损坏或结构非法；已停止启动，不会初始化或覆盖原文件。');
    }
}
function validateState(value) {
    if (!plainRecord(value)) throw failure('STORE_INVALID', '业务数据必须为对象，禁止按空库初始化。');
    for (const key of ['users', 'applications', 'payments']) {
        if (!Object.hasOwn(value, key)) throw failure('STORE_INVALID', '业务数据缺少关键集合：' + key);
    }
    for (const key of ARRAY_FIELDS) {
        if (Object.hasOwn(value, key) && (!Array.isArray(value[key]) || value[key].some(item => !plainRecord(item)))) {
            throw failure('STORE_INVALID', '业务数据集合结构非法：' + key);
        }
    }
    for (const key of COUNTER_FIELDS) {
        if (Object.hasOwn(value, key) && (!Number.isSafeInteger(value[key]) || value[key] < 1)) {
            throw failure('STORE_INVALID', '业务编号计数结构非法：' + key);
        }
    }
    const seen = new Set();
    for (const account of value.users) {
        if (typeof account.username !== 'string' || !account.username.trim()
            || seen.has(account.username) || !['admin', 'approver', 'user'].includes(account.role)
            || typeof account.password !== 'string' || !account.password) {
            throw failure('STORE_INVALID', '账号结构非法或存在重复；请恢复正确数据，不会重建账号。');
        }
        seen.add(account.username);
    }
    return value;
}
function validateConfig(value) {
    if (!plainRecord(value)) throw failure('CONFIG_INVALID', '配置必须为对象。');
    if (Object.hasOwn(value, 'serviceFeeRates') && !plainRecord(value.serviceFeeRates)) {
        throw failure('CONFIG_INVALID', '服务费配置结构非法，拒绝静默回退。');
    }
    if (Object.hasOwn(value, 'bonusRules') && !plainRecord(value.bonusRules)) {
        throw failure('CONFIG_INVALID', '奖金配置结构非法，拒绝静默回退。');
    }
    return value;
}
function assertNoPriorAssets(options, fs) {
    for (const file of options.priorFiles || []) {
        try {
            fs.lstatSync(file);
            throw failure('ORPHANED_INSTALLATION', '缺少业务数据但存在其他配置或历史文件；请先恢复完整备份，禁止初始化。');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    for (const directory of options.priorDirectories || []) {
        try {
            const stat = fs.lstatSync(directory);
            if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(directory).length) {
                throw failure('ORPHANED_INSTALLATION', '缺少业务数据但存在附件或备份；请先核对恢复，不会新建空库。');
            }
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}
function loadStartupState(options) {
    const fs = options.fs || fsDefault;
    const configFile = readOptionalJson(options.configFile, '系统配置', fs);
    const dataFile = readOptionalJson(options.dataFile, '业务数据', fs);
    const config = configFile.exists ? validateConfig(configFile.value) : {};
    if (dataFile.exists) {
        return { data: validateState(dataFile.value), config, needsInitialization: false };
    }
    if (configFile.exists) throw failure('ORPHANED_INSTALLATION', '配置已存在但业务数据缺失；请恢复数据，不会进入首次初始化。');
    assertNoPriorAssets(options, fs);
    return { data: newEmptyState(), config, needsInitialization: true };
}
function localSetupRequest(req, port, requireOrigin = false) {
    const address = String(req.socket?.remoteAddress || '');
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false;
    const hosts = new Set(['localhost:' + port, '127.0.0.1:' + port, '[::1]:' + port]);
    const host = String(req.headers?.host || '').toLowerCase();
    if (!hosts.has(host)) return false;
    const origin = req.headers?.origin;
    if (requireOrigin && typeof origin !== 'string') return false;
    if (origin !== undefined && origin !== 'http://' + host && origin !== 'https://' + host) return false;
    return true;
}
function initializeFirstAdministrator(options) {
    const fs = options.fs || fsDefault;
    const startup = loadStartupState(options);
    if (!startup.needsInitialization) throw failure('ALREADY_INITIALIZED', '系统已经初始化，不能重复创建首个管理员。', 409);
    const username = options.username;
    const password = options.password;
    if (typeof username !== 'string' || username !== username.trim() || !username
        || username.length > 80 || /[\u0000-\u001f\u007f]/.test(username)) {
        throw failure('INVALID_ADMIN', '请输入1—80字符的管理员账号，不含首尾空白或控制字符。', 400);
    }
    if (typeof password !== 'string' || password !== password.trim() || password.length < 12
        || password.length > 128 || /[\u0000-\u001f\u007f]/.test(password)) {
        throw failure('INVALID_ADMIN', '首个管理员密码需12—128字符，不含首尾空白或控制字符。', 400);
    }
    const data = newEmptyState();
    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 210000;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    const at = new Date().toISOString();
    data.users.push({
        username, password: 'pbkdf2-sha256$' + iterations + '$' + salt + '$' + hash,
        role: 'admin', accountStatus: 'active', lifecycleVersion: 0, created: at
    });
    data.logs.push({ user: username, action: '首次管理员初始化', detail: '本机完成首次安装；未导入业务数据', time: at });
    validateState(data);
    const directory = path.dirname(options.dataFile);
    fs.mkdirSync(directory, { recursive: true });
    const temp = path.join(directory, '.initialize-' + crypto.randomBytes(16).toString('hex') + '.tmp');
    let descriptor;
    let published = false;
    try {
        descriptor = fs.openSync(temp, 'wx', 0o600);
        fs.writeFileSync(descriptor, JSON.stringify(data, null, 2), 'utf8');
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        validateState(JSON.parse(fs.readFileSync(temp, 'utf8')));
        // The destination is created atomically and never replaces an existing file.
        fs.linkSync(temp, options.dataFile);
        published = true;
        return data;
    } catch (error) {
        if (error.code === 'EEXIST') throw failure('ALREADY_INITIALIZED', '另一次初始化已完成；请刷新登录，不会覆盖现有文件。', 409);
        throw failure('INITIALIZATION_FAILED', '初始化保存失败；不会覆盖已有数据。请检查磁盘与文件权限。');
    } finally {
        if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch {} }
        try { fs.unlinkSync(temp); } catch (error) {
            if (error.code !== 'ENOENT' && !published) {
                // A failed cleanup is not a reason to replace existing data.
            }
        }
    }
}
module.exports = {
    ARRAY_FIELDS, COUNTER_FIELDS, newEmptyState, readOptionalJson,
    validateState, validateConfig, loadStartupState, localSetupRequest, initializeFirstAdministrator
};
