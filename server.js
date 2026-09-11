'use strict';
const {loadStartupState}=require('./public-startup');
const {runtimeState}=require('./public-runtime-state');
const {createBootstrapHandler}=require('./public-bootstrap-http');
const {createConfigStore}=require('./public-config-store');
const {createConfigHandler}=require('./public-config-http');
const {taxRateForCalculation}=require('./tax-config');
const invoicePolicy=require('./invoice-access-policy');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { execFile } = require('child_process');
const { generateExport } = require('./export-service');
const { authoritativeDebtStatus } = require('./business-view-contract');
const { createMailReminderService } = require('./mail-reminder');
const {
    createStructuredDataBackup,
    listStructuredDataBackups,
    runDailyStructuredDataBackup
} = require('./backup-service');
const { buildBonusPreview, latestApprovedPayment } = require('./bonus-preview');
const {
    createLockedBonusConfirmation,
    employeeOptions,
    filterConfirmations,
    normalizeExecutionParticipants
} = require('./execution-bonus');
const {
    buildEmployeeSettlementPreview,
    createLockedEmployeeSettlement
} = require('./employee-settlement');
const {
    DEBT_SUPPLIER_LABEL,
    DEBT_SUPPLIER_VALUE,
    buildDebtKpiItems,
    buildDebtPaymentKpiItems,
    buildDebtPaymentSnapshot,
    confirmDebtLinksByPayment,
    createDebtLinks,
    createDebtRecord,
    debtView,
    debtBalances,
    assertProjectExtraDebtEligible,
    projectExtraDebtEligibility
} = require('./debt-repayment');
const {
    activeClientView,
    applyClientSnapshot,
    bindLegacyClient,
    createClientRecord,
    resolveActiveClient,
    updateClientRecord
} = require('./client-master');
const {
    SERVICE_FEE_ITEM_OPTIONS,
    effectiveServiceFeeRates,
    serviceFeeRateForItemName,
    validateServiceFeeRates
} = require('./service-fee-config');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.KSESSION_HOST || '127.0.0.1';
if (!Number.isInteger(PORT) || PORT<0 || PORT>65535 || !require('net').isIP(HOST)) throw Error('Invalid server host or port.');
const DATA_FILE = process.env.KSESSION_DATA_FILE ? path.resolve(process.env.KSESSION_DATA_FILE) : path.join(__dirname, 'data.json');
const CONFIG_FILE = process.env.KSESSION_CONFIG_FILE ? path.resolve(process.env.KSESSION_CONFIG_FILE) : path.join(__dirname, 'config.json');
const SALT = 'default_salt';
const SESSION_TTL_MS = Math.max(1000, Number(process.env.KSESSION_SESSION_TTL_MS) || 8 * 60 * 60 * 1000);
const PASSWORD_ITERATIONS = 210000;
const TEST_RESET_ENABLED = process.env.KSESSION_ENABLE_TEST_RESET === '1'
    && process.env.KSESSION_DATA_FILE
    && path.resolve(process.env.KSESSION_DATA_FILE) !== path.resolve(path.join(__dirname, 'data.json'));
let projectCloseSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_PROJECT_CLOSE_SAVE_ONCE === '1';
let paymentCorrectionSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_PAYMENT_CORRECTION_SAVE_ONCE === '1';
let invoiceReviewSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_INVOICE_REVIEW_SAVE_ONCE === '1';
let invoiceReviewLogFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_INVOICE_REVIEW_LOG_ONCE === '1';
let invoiceReviewArchiveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_INVOICE_REVIEW_ARCHIVE_ONCE === '1';
let accountLifecycleSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_ACCOUNT_LIFECYCLE_SAVE_ONCE === '1';
let bonusSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_BONUS_SAVE_ONCE === '1';
let bonusLogFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_BONUS_LOG_ONCE === '1';
let settlementSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_SETTLEMENT_SAVE_ONCE === '1';
let settlementLogFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_SETTLEMENT_LOG_ONCE === '1';
let mailAttemptCreateSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_MAIL_ATTEMPT_CREATE_SAVE_ONCE === '1';
let mailAttemptResultSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_MAIL_ATTEMPT_RESULT_SAVE_ONCE === '1';
let structuredBackupFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_BACKUP_ONCE === '1';
let supplierCreateSaveFailurePending = TEST_RESET_ENABLED && process.env.KSESSION_TEST_FAIL_SUPPLIER_CREATE_SAVE_ONCE === '1';
const supplierMutationFailureActions = new Set(TEST_RESET_ENABLED
    ? String(process.env.KSESSION_TEST_FAIL_SUPPLIER_MUTATION_ON_ACTIONS || '').split(',').map(value => value.trim()).filter(Boolean)
    : []);
const ATTACHMENTS_DIR = process.env.KSESSION_ATTACHMENTS_DIR ? path.resolve(process.env.KSESSION_ATTACHMENTS_DIR) : path.join(__dirname, 'attachments');
const BACKUPS_DIR = process.env.KSESSION_BACKUPS_DIR ? path.resolve(process.env.KSESSION_BACKUPS_DIR) : path.join(__dirname, 'backups');
const MAX_BACKUPS = 7;
const OCR_PYTHON = process.env.KSESSION_OCR_PYTHON || path.join(__dirname, 'runtime', 'ocr', 'ocr-env', 'Scripts', 'python.exe');
const OCR_SCRIPT = process.env.KSESSION_OCR_SCRIPT || path.join(__dirname, 'tools', 'ocr', 'ocr_invoice.py');
const PAYEE_ACCOUNT_TYPES = new Set(['formal-supplier', 'employee-payee', 'company-payee']);

function isValidApproverAccount(username) {
    const account = (users || []).find(item => item.username === String(username || '').trim());
    return Boolean(account && accountIsActive(account) && (account.role === 'admin' || account.role === 'approver'));
}
const LUXURY_KEYWORDS = ['LV', 'L.V', 'LOUIS VUITTON', 'GUCCI', 'HERMES', '路易威登', '古驰', '爱马仕'];
const MAX_INVOICE_BATCH_FILES = 12;
const MAX_UPLOAD_FILE_SIZE = 20 * 1024 * 1024;
const INVOICE_UPLOAD_FIELD_LIMIT = 128;
const GENERAL_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg']);
const INVOICE_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const DEBT_EDIT_LOCK_MS = Math.max(TEST_RESET_ENABLED ? 50 : 10000, Number(process.env.KSESSION_DEBT_EDIT_LOCK_MS) || 120000);
const debtEditLocks = new Map();
function purgeDebtEditLocks(now = Date.now()) { for (const [id, lock] of debtEditLocks.entries()) if (!lock || lock.expiresAt <= now) debtEditLocks.delete(id); }
function debtLockError(lock) { const expiry = new Date(lock.expiresAt).toLocaleTimeString('zh-CN', { hour12: false }); const identity = lock.projectId || lock.draftToken || '未命名草稿'; const error = new Error('欠款当前正由 '+(lock.username||'其他账号')+' 编辑（'+identity+'），租约预计 '+expiry+' 到期；请让对方提交/释放，或到期后刷新重试'); error.statusCode=409; return error; }
function acquireDebtEditLock(input) { purgeDebtEditLocks(); const existing=debtEditLocks.get(input.debtId); if(existing&&(existing.username!==input.username||existing.draftToken!==input.draftToken)) throw debtLockError(existing); const lock={...input,expiresAt:Date.now()+DEBT_EDIT_LOCK_MS};debtEditLocks.set(input.debtId,lock);return lock; }
function releaseDebtEditLocks(input) { purgeDebtEditLocks();for(const [id,lock] of debtEditLocks.entries())if(lock.username===input.username&&lock.draftToken===input.draftToken&&(!input.debtId||id===input.debtId))debtEditLocks.delete(id); }
function assertDebtEditLocksAvailable(links,username,draftToken){purgeDebtEditLocks();for(const item of links||[]){const lock=debtEditLocks.get(String(item?.debtId||''));if(lock&&(lock.username!==username||lock.draftToken!==draftToken))throw debtLockError(lock);}}

// 自动备份：按中国本地自然日创建结构化数据备份（仅 data.json）
function autoBackup() {
    const result = runDailyStructuredDataBackup({ dataFile: DATA_FILE, backupsDir: BACKUPS_DIR, maxBackups: MAX_BACKUPS });
    if (result.skipped) return result;
    if (!result.success) {
        console.error('[结构化数据备份] 创建失败:', result.error);
        return result;
    }
    console.log(`[结构化数据备份] 已创建: ${result.fileName}; SHA-256=${result.sha256}`);
    if (result.rotation?.status === 'warning') console.warn('[结构化数据备份] 轮换警告:', result.rotation.warning);
    if (result.markerWarning) console.warn('[结构化数据备份] 成功日期标记警告:', result.markerWarning);
    return result;
}

// API与测试归零共用的手工结构化数据备份
function createManualBackup() {
    if (structuredBackupFailurePending) {
        structuredBackupFailurePending = false;
        return { success: false, type: 'structured-data', error: '隔离测试注入：结构化数据备份创建失败' };
    }
    const result = createStructuredDataBackup({ dataFile: DATA_FILE, backupsDir: BACKUPS_DIR, maxBackups: MAX_BACKUPS });
    return result.success ? { ...result, file: result.fileName } : result;
}

// Validate before creating directories, scheduling work, or accepting business requests.
const startupOptions={dataFile:DATA_FILE,configFile:CONFIG_FILE,
    priorDirectories:[ATTACHMENTS_DIR,BACKUPS_DIR,path.join(path.dirname(CONFIG_FILE),"logs")],
    priorFiles:[process.env.KSESSION_MAIL_CONFIG_FILE||path.join(path.dirname(CONFIG_FILE),"mail-reminder.config.json"),
        process.env.KSESSION_SMTP_SECRET_FILE||path.join(path.dirname(CONFIG_FILE),"runtime","secrets","smtp-pass.dpapi")]};
const startup=loadStartupState(startupOptions);
let needsInitialization=startup.needsInitialization;
let data=runtimeState(startup.data);
const configStore=createConfigStore({configFile:CONFIG_FILE});
function currentConfig(){return configStore.getParameters();}
const mailReminder=createMailReminderService(path.dirname(CONFIG_FILE));
mailReminder.publicConfig(); // Validate existing mail configuration before serving requests.
fs.mkdirSync(ATTACHMENTS_DIR,{recursive:true});
fs.mkdirSync(BACKUPS_DIR,{recursive:true});
let { applications, payments, debts, clients, invoices, invoiceOcrJobs, invoiceDraftBatches, invoiceAuditRecords, bonusConfirmations, employeeSettlements, projectClosureRecords, paymentCorrectionRecords, accountLifecycleAuditRecords, supplierClassificationAuditRecords, mailSendRecords, exportAuditRecords, nextAppId, nextPayId, nextDebtId, nextDebtLinkId, nextClientId, nextInvoiceId, nextOcrJobId, nextInvoiceDraftId, nextInvoiceAuditId, nextBonusConfirmationId, nextEmployeeSettlementId, nextMailSendId, users, suppliers, logs } = data;
if (!suppliers) suppliers = [];
if (!logs) logs = [];
if (!debts) debts = [];
if (!clients) clients = [];
if (!invoices) invoices = [];
if (!invoiceOcrJobs) invoiceOcrJobs = [];
if (!invoiceDraftBatches) invoiceDraftBatches = [];
if (!invoiceAuditRecords) invoiceAuditRecords = [];
if (!bonusConfirmations) bonusConfirmations = [];
if (!employeeSettlements) employeeSettlements = [];
if (!projectClosureRecords) projectClosureRecords = [];
if (!paymentCorrectionRecords) paymentCorrectionRecords = [];
if (!accountLifecycleAuditRecords) accountLifecycleAuditRecords = [];
if (!supplierClassificationAuditRecords) supplierClassificationAuditRecords = [];
if (!mailSendRecords) mailSendRecords = [];
if (!exportAuditRecords) exportAuditRecords = [];
if (!nextInvoiceId) nextInvoiceId = invoices.length + 1;
if (!nextOcrJobId) nextOcrJobId = invoiceOcrJobs.length + 1;
if (!nextInvoiceDraftId) nextInvoiceDraftId = invoiceDraftBatches.length + 1;
if (!nextInvoiceAuditId) nextInvoiceAuditId = invoiceAuditRecords.length + 1;
if (!nextBonusConfirmationId) nextBonusConfirmationId = bonusConfirmations.length + 1;
if (!nextEmployeeSettlementId) nextEmployeeSettlementId = employeeSettlements.length + 1;
if (!nextMailSendId) nextMailSendId = mailSendRecords.length + 1;
if (!nextDebtId) nextDebtId = debts.length + 1;
if (!nextDebtLinkId) nextDebtLinkId = (applications || []).reduce((count, app) => count + (app.debtLinks || []).length, 0) + 1;
if (!nextClientId) nextClientId = clients.length + 1;

// 会话存储
let sessions = Object.create(null);
const temporaryAttachmentOwners = new Map();
const temporaryAttachmentNames = new Map();

function currentDataState() {
    return { ...data, applications, payments, debts, clients, invoices, invoiceOcrJobs, invoiceDraftBatches, invoiceAuditRecords, bonusConfirmations, employeeSettlements, projectClosureRecords, paymentCorrectionRecords, accountLifecycleAuditRecords, supplierClassificationAuditRecords, mailSendRecords, exportAuditRecords, nextAppId, nextPayId, nextDebtId, nextDebtLinkId, nextClientId, nextInvoiceId, nextOcrJobId, nextInvoiceDraftId, nextInvoiceAuditId, nextBonusConfirmationId, nextEmployeeSettlementId, nextMailSendId, users, suppliers, logs };
}

function assignDataState(state) {
    data=state;
    ({ applications, payments, debts, clients, invoices, invoiceOcrJobs, invoiceDraftBatches, invoiceAuditRecords, bonusConfirmations, employeeSettlements, projectClosureRecords, paymentCorrectionRecords, accountLifecycleAuditRecords, supplierClassificationAuditRecords, mailSendRecords, exportAuditRecords, nextAppId, nextPayId, nextDebtId, nextDebtLinkId, nextClientId, nextInvoiceId, nextOcrJobId, nextInvoiceDraftId, nextInvoiceAuditId, nextBonusConfirmationId, nextEmployeeSettlementId, nextMailSendId, users, suppliers, logs } = state);
}

function saveDataState(state) {
    const payload = JSON.stringify(state, null, 2);
    JSON.parse(payload);
    const dir = path.dirname(DATA_FILE);
    const tempFile = path.join(dir, `.${path.basename(DATA_FILE)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`);
    let fd, owned=false;
    try {
        fd = fs.openSync(tempFile, 'wx', 0o600); owned=true;
        fs.writeFileSync(fd, payload, 'utf8');
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;
        if (fs.readFileSync(tempFile,'utf8') !== payload) throw Error('Staged data differs');
        fs.renameSync(tempFile, DATA_FILE);
        if (TEST_RESET_ENABLED && typeof process.send === 'function') {
            try { process.send({ type: 'k-session-data-save' }); } catch (ipcError) {}
        }
    } catch (error) {
        if (fd !== undefined) {
            try { fs.closeSync(fd); } catch (closeError) {}
        }
        if (owned) { try { fs.unlinkSync(tempFile); } catch (cleanupError) {} }
        throw error;
    }
}

function saveData() {
    saveDataState(currentDataState());
}

function cloneCurrentDataState() {
    return JSON.parse(JSON.stringify(currentDataState()));
}

function appendLogWithoutSaving(username, action, detail, at = new Date().toLocaleString('zh-CN')) {
    logs.unshift({ time: at, user: username, action, detail });
    if (logs.length > 500) logs = logs.slice(0, 500);
}

function projectClosedError(projectId, action = '继续操作') {
    const error = new Error(`项目 ${projectId || ''} 已关闭，不能${action}；如需继续业务请重新申请项目`);
    error.statusCode = 409;
    return error;
}

function assertProjectOpenForWrite(app, action) {
    if (app?.status === 'closed') throw projectClosedError(app.id, action);
    return app;
}

function lockedBonusForProject(state, projectId, paymentId = '') {
    const projectPaymentIds = new Set((state.payments || [])
        .filter(payment => String(payment?.projectId || '') === String(projectId || ''))
        .map(payment => String(payment?.id || ''))
        .filter(Boolean));
    if (paymentId) projectPaymentIds.add(String(paymentId));
    return (state.bonusConfirmations || []).find(record => (
        record?.status === 'locked'
        && (
            String(record?.applicationId || '') === String(projectId || '')
            || projectPaymentIds.has(String(record?.paymentId || ''))
        )
    )) || null;
}

function assertProjectFinancialFactsUnlocked(state, projectId, action = '修改项目或付款财务事实', paymentId = '') {
    const locked = lockedBonusForProject(state, projectId, paymentId);
    if (!locked) return;
    const error = new Error(`项目奖金已经锁定（${locked.id || projectId}），不能${action}；奖金锁定不可取消，发票补交与审核仍保持开放`);
    error.statusCode = 409;
    throw error;
}

function appendStateLog(state, username, action, detail, at = new Date().toLocaleString('zh-CN')) {
    state.logs = Array.isArray(state.logs) ? state.logs : [];
    state.logs.unshift({ time: at, user: username, action, detail });
    if (state.logs.length > 500) state.logs.length = 500;
}

function commitLockedBonusConfirmation({ applicationId, body, user }) {
    const current = currentDataState();
    const application = (current.applications || []).find(item => item.id === applicationId);
    if (!application) {
        const error = new Error('项目不存在');
        error.statusCode = 404;
        throw error;
    }
    assertProjectOpenForWrite(application, '确认奖金');
    const next = cloneCurrentDataState();
    const id = 'BONUS' + String(next.nextBonusConfirmationId).padStart(4, '0');
    const confirmedAt = new Date().toLocaleString('zh-CN');
    const record = createLockedBonusConfirmation({
        id,
        application: next.applications.find(item => item.id === applicationId),
        payments: next.payments,
        existingConfirmations: next.bonusConfirmations,
        body,
        confirmedBy: user.username,
        rules:currentConfig().bonusRules,
        confirmedAt
    });
    next.nextBonusConfirmationId += 1;
    next.bonusConfirmations.push(record);
    appendStateLog(next, user.username, '确认锁定项目奖金', `${record.id} / ${record.applicationId} / ${record.paymentId} / ${mailMoney(record.totals.projectBonus)}`, confirmedAt);
    if (bonusLogFailurePending) {
        bonusLogFailurePending = false;
        const error = new Error('测试注入：奖金锁定日志失败');
        error.statusCode = 500;
        throw error;
    }
    if (bonusSaveFailurePending) {
        bonusSaveFailurePending = false;
        const error = new Error('测试注入：奖金锁定保存失败');
        error.statusCode = 500;
        throw error;
    }
    saveDataState(next);
    assignDataState(next);
    return record;
}

function commitLockedEmployeeSettlement({ body, user }) {
    const next = cloneCurrentDataState();
    const id = 'SETTLE' + String(next.nextEmployeeSettlementId).padStart(4, '0');
    const confirmedAt = new Date().toLocaleString('zh-CN');
    const record = createLockedEmployeeSettlement({
        id,
        employee: body?.employee,
        activityMonth: body?.activityMonth,
        selectedReimbursementSourceKeys: body?.selectedReimbursementSourceKeys,
        applications: next.applications,
        payments: next.payments,
        bonusConfirmations: next.bonusConfirmations,
        employeeSettlements: next.employeeSettlements,
        users: next.users,
        confirmedBy: user.username,
        confirmedAt
    });
    next.nextEmployeeSettlementId += 1;
    next.employeeSettlements.push(record);
    appendStateLog(next, user.username, '确认锁定员工月度结算', `${record.id} / ${record.employee} / ${record.activityMonth} / ${mailMoney(record.totals.totalPayable)}`, confirmedAt);
    if (settlementLogFailurePending) {
        settlementLogFailurePending = false;
        const error = new Error('测试注入：员工月结锁定日志失败');
        error.statusCode = 500;
        throw error;
    }
    if (settlementSaveFailurePending) {
        settlementSaveFailurePending = false;
        const error = new Error('测试注入：员工月结锁定保存失败');
        error.statusCode = 500;
        throw error;
    }
    saveDataState(next);
    assignDataState(next);
    return record;
}

function assertInvoiceActivityDate(app) {
    if (!app) {
        const error = new Error('未找到发票所属项目');
        error.statusCode = 404;
        throw error;
    }
    if (!String(app.startDate || '').trim() || !isValidProjectActivityDate(app.startDate)) {
        const error = new Error('项目活动日期缺失或无效；历史项目需由Admin根据原始证据补录后才能递交新发票');
        error.statusCode = 409;
        throw error;
    }
    return app;
}

function projectIdFromExpectedKey(key) {
    return String(key || '').split(':')[0] || '';
}

function projectForInvoiceWrite(body = {}) {
    const appId = String(body.appId || projectIdFromExpectedKey(body.expectedKey) || '').trim();
    return appId ? applications.find(app => app.id === appId) || null : null;
}

function settlementReferencesProject(record, projectId, confirmations = bonusConfirmations, paymentRecords = payments) {
    if (String(record?.projectId || '') === projectId) return true;
    const directSnapshots = [
        ...(record?.businessBonusSnapshots || []),
        ...(record?.executionBonusSnapshots || []),
        ...(record?.reimbursementSnapshots || [])
    ];
    if (directSnapshots.some(item => String(item?.applicationId || item?.projectId || '') === projectId)) return true;
    const reimbursementPaymentIds = new Set(
        (record?.reimbursementSnapshots || [])
            .map(item => String(item?.paymentId || ''))
            .filter(Boolean)
    );
    if ((paymentRecords || []).some(item => (
        reimbursementPaymentIds.has(String(item?.id || ''))
        && String(item?.projectId || '') === projectId
    ))) return true;
    const confirmationIds = new Set([
        ...(record?.businessBonusSnapshots || []),
        ...(record?.executionBonusSnapshots || [])
    ].map(item => String(item?.confirmationId || '')).filter(Boolean));
    return (confirmations || []).some(item => (
        confirmationIds.has(String(item?.id || '')) && String(item?.applicationId || '') === projectId
    ));
}

function projectDownstreamSummary(state, projectId) {
    const app = (state.applications || []).find(item => item.id === projectId);
    return {
        payments: (state.payments || []).filter(item => item.projectId === projectId),
        invoices: (state.invoices || []).filter(item => item.appId === projectId),
        invoiceDrafts: (state.invoiceDraftBatches || []).filter(item => item.appId === projectId),
        invoiceOcrJobs: (state.invoiceOcrJobs || []).filter(item => item.appId === projectId),
        invoiceAudits: (state.invoiceAuditRecords || []).filter(item => item.appId === projectId || (state.invoices || []).some(inv => inv.appId === projectId && inv.batchId && inv.batchId === item.batchId)),
        debtLinks: Array.isArray(app?.debtLinks) ? app.debtLinks : [],
        bonusConfirmations: (state.bonusConfirmations || []).filter(item => item.applicationId === projectId),
        employeeSettlements: (state.employeeSettlements || []).filter(item => settlementReferencesProject(
            item,
            projectId,
            state.bonusConfirmations || [],
            state.payments || []
        ))
    };
}

function hasAnyProjectDownstream(summary) {
    return Object.values(summary).some(records => records.length > 0);
}

function closeProjectChainAtomically({ projectId, user, reason }) {
    const state = currentDataState();
    const app = (state.applications || []).find(item => item.id === projectId);
    if (!app) {
        const error = new Error('未找到项目');
        error.statusCode = 404;
        throw error;
    }
    if (!user) {
        const error = new Error('未登录');
        error.statusCode = 401;
        throw error;
    }
    if (app.status === 'draft') {
        const error = new Error('历史项目草稿（只读），不能关闭');
        error.statusCode = 409;
        throw error;
    }
    const existingClosure = (state.projectClosureRecords || []).find(item => item.projectId === projectId);
    if (app.status === 'closed') {
        const affected = existingClosure?.affected || {};
        const originalHadDownstream = ['payments', 'invoices', 'invoiceDrafts', 'invoiceOcrJobs', 'invoiceAudits', 'debtLinks', 'bonusConfirmations', 'employeeSettlements']
            .some(key => Array.isArray(affected[key]) && affected[key].length > 0);
        const employeeMayReplay = user.role === 'user'
            && (app.applicant === user.username || app.owner === user.username)
            && ['pending', 'rejected'].includes(existingClosure?.originalStatus)
            && !originalHadDownstream;
        if (user.role !== 'admin' && !employeeMayReplay) {
            const error = new Error('无权关闭该项目');
            error.statusCode = 403;
            throw error;
        }
        return { idempotent: true, closure: existingClosure || null, historicalClosed: !existingClosure };
    }
    const summary = projectDownstreamSummary(state, projectId);
    const hasDownstream = hasAnyProjectDownstream(summary);
    const isEmployeeOwner = user.role === 'user' && app.applicant === user.username;
    if (user.role === 'approver') {
        const error = new Error('普通审批人无权执行项目整链关闭，必须由管理员操作');
        error.statusCode = 403;
        throw error;
    }
    if (user.role !== 'admin') {
        if (!isEmployeeOwner) {
            const error = new Error('只能关闭本人项目');
            error.statusCode = 403;
            throw error;
        }
        if (!['pending', 'rejected'].includes(app.status)) {
            const error = new Error('员工只能关闭本人待审批或已驳回项目');
            error.statusCode = 403;
            throw error;
        }
        if (hasDownstream) {
            const error = new Error('该项目已有下游记录，只能由管理员执行整链关闭');
            error.statusCode = 409;
            throw error;
        }
    }
    if (!['pending', 'rejected', 'approved'].includes(app.status)) {
        const error = new Error(`项目存在非法历史状态 ${app.status || '空'}，不能关闭；请先审计历史记录`);
        error.statusCode = 409;
        throw error;
    }
    const normalizedReason = String(reason || '').trim();
    if (!normalizedReason) {
        const error = new Error('关闭原因不能为空');
        error.statusCode = 400;
        throw error;
    }
    const lockedBonus = summary.bonusConfirmations.find(item => item?.status === 'locked');
    if (lockedBonus) {
        const error = new Error(`项目奖金已经锁定（${lockedBonus.id || projectId}），未开发奖金冲销，不能整链关闭`);
        error.statusCode = 409;
        throw error;
    }
    const next = JSON.parse(JSON.stringify(state));
    next.projectClosureRecords = Array.isArray(next.projectClosureRecords) ? next.projectClosureRecords : [];
    const nextApp = next.applications.find(item => item.id === projectId);
    const closedAt = new Date().toISOString();
    const closureId = `PROJECT-CLOSE-${projectId}`;
    const closureMarker = { closureId, projectId, closedBy: user.username, closedAt, reason: normalizedReason, result: 'invalidated' };
    const affected = {
        payments: [], invoices: [], invoiceDrafts: [], invoiceOcrJobs: [], invoiceAudits: [], debtLinks: [],
        bonusConfirmations: [], employeeSettlements: [],
        moduleFacts: {
            bonus: { storageSemantics: 'current writes persist locked confirmations only', result: summary.bonusConfirmations.length ? 'persisted-unlocked-records-invalidated' : 'no-persisted-record' },
            employeeSettlement: { storageSemantics: 'current writes persist completed locked settlements only', result: summary.employeeSettlements.length ? 'persisted-uncompleted-records-invalidated' : 'no-persisted-record' }
        }
    };

    (next.payments || []).filter(item => item.projectId === projectId).forEach(item => {
        affected.payments.push({ id: item.id || '', originalStatus: item.status || '', result: item.status === 'closed' ? 'existing-closed-evidence-preserved' : 'business-chain-invalidated' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '' };
    });
    (next.invoices || []).filter(item => item.appId === projectId).forEach(item => {
        affected.invoices.push({ id: item.id || '', originalStatus: item.status || '', invoiceNo: item.invoiceNo || '', result: 'occupation-released-evidence-preserved' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '' };
    });
    (next.invoiceDraftBatches || []).filter(item => item.appId === projectId).forEach(item => {
        affected.invoiceDrafts.push({ id: item.id || '', originalStatus: item.status || '草稿', result: 'occupation-released-evidence-preserved' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '草稿' };
    });
    (next.invoiceOcrJobs || []).filter(item => item.appId === projectId).forEach(item => {
        affected.invoiceOcrJobs.push({ id: item.id || '', originalStatus: item.status || '', result: 'evidence-preserved-no-reuse' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '' };
    });
    const projectBatchIds = new Set((next.invoices || []).filter(item => item.appId === projectId).map(item => item.batchId).filter(Boolean));
    (next.invoiceAuditRecords || []).filter(item => item.appId === projectId || projectBatchIds.has(item.batchId)).forEach(item => {
        affected.invoiceAudits.push({ id: item.id || '', originalStatus: item.status || '', result: 'audit-evidence-preserved' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '' };
    });
    (nextApp.debtLinks || []).forEach(link => {
        affected.debtLinks.push({ id: link.id || '', debtId: link.debtId || '', originalStatus: link.occupationStatus || '', result: 'occupation-released-evidence-preserved' });
        link.projectClosure = { ...closureMarker, originalOccupationStatus: link.occupationStatus || '' };
        link.occupationStatus = 'released';
    });
    (next.bonusConfirmations || []).filter(item => item.applicationId === projectId).forEach(item => {
        affected.bonusConfirmations.push({ id: item.id || '', originalStatus: item.status || '', result: 'business-fact-invalidated-evidence-preserved' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '' };
    });
    (next.employeeSettlements || []).filter(item => settlementReferencesProject(
        item,
        projectId,
        next.bonusConfirmations || [],
        next.payments || []
    )).forEach(item => {
        affected.employeeSettlements.push({ id: item.id || '', originalStatus: item.status || '', result: 'business-fact-invalidated-evidence-preserved' });
        item.projectClosure = { ...closureMarker, originalStatus: item.status || '' };
    });
    nextApp.status = 'closed';
    nextApp.projectClosure = { ...closureMarker, originalStatus: app.status || '' };
    const closure = {
        id: closureId, projectId, projectGroupId: nextApp.projectGroupId || nextApp.id || '', projectName: nextApp.projectName || '',
        applicant: nextApp.applicant || '', originalStatus: app.status || '', closedBy: user.username, closedByRole: user.role,
        closedAt, reason: normalizedReason, affected
    };
    next.projectClosureRecords.push(closure);
    next.logs = Array.isArray(next.logs) ? next.logs : [];
    next.logs.unshift({ time: closedAt, user: user.username, action: '项目整链关闭', detail: `${projectId} / ${closureId} / ${normalizedReason}` });
    if (next.logs.length > 500) next.logs = next.logs.slice(0, 500);

    if (projectCloseSaveFailurePending) {
        projectCloseSaveFailurePending = false;
        const error = new Error('模拟项目整链关闭保存失败');
        error.statusCode = 500;
        throw error;
    }
    saveDataState(next);
    assignDataState(next);
    return { idempotent: false, closure };
}

function recordIsLockedBonus(record) {
    return record?.status === 'locked';
}

function structuredInvoicePaymentIdsForCorrection(invoice) {
    const ids = [
        invoice?.paymentId || '',
        ...(Array.isArray(invoice?.paymentIds) ? invoice.paymentIds : []),
        ...invoiceKeysForServer(invoice).map(key => {
            const parts = String(key || '').split(':');
            return parts.length >= 3 && /^PAY/i.test(parts[1] || '') ? parts[1] : '';
        })
    ];
    return uniqueList(ids.map(value => String(value || '').trim()).filter(Boolean));
}

function paymentCorrectionFor(paymentId, records = paymentCorrectionRecords) {
    return (records || []).find(record => record?.paymentId === paymentId) || null;
}

function closeApprovedDebtPaymentAtomically({ paymentId, user, reason }) {
    if (!user) {
        const error = new Error('未登录');
        error.statusCode = 401;
        throw error;
    }
    if (user.role !== 'admin') {
        const error = new Error('只有管理员可以更正已通过的欠款归还付款');
        error.statusCode = 403;
        throw error;
    }
    const state = currentDataState();
    const pay = (state.payments || []).find(record => record.id === paymentId);
    if (!pay) {
        const error = new Error('未找到付款');
        error.statusCode = 404;
        throw error;
    }
    const existing = paymentCorrectionFor(paymentId, state.paymentCorrectionRecords || []);
    if (existing && pay.status === 'closed') return { idempotent: true, correction: existing };
    if (existing) {
        const error = new Error('付款更正审计与当前状态不一致，仅允许人工核对');
        error.statusCode = 409;
        throw error;
    }
    const normalizedReason = String(reason || '').trim();
    if (!normalizedReason) {
        const error = new Error('更正原因不能为空');
        error.statusCode = 400;
        throw error;
    }
    if (pay.status !== 'approved') {
        const error = new Error(`只有已通过付款可以执行欠款归还更正；当前状态为${pay.status || '未知'}`);
        error.statusCode = 409;
        throw error;
    }
    const app = (state.applications || []).find(record => record.id === pay.projectId);
    if (!app || app.status !== 'approved') {
        const error = new Error('关联项目不是有效的已通过状态，不能执行付款更正');
        error.statusCode = 409;
        throw error;
    }
    assertProjectFinancialFactsUnlocked(state, app.id, '更正已通过付款', pay.id);
    if (confirmedDebtPrincipalForPayment(pay, app) <= 0) {
        const error = new Error('该付款欠款实际确认本金为0，请使用现有普通关闭路径');
        error.statusCode = 409;
        throw error;
    }
    const graph = analyzePaymentVersionGraph((state.payments || []).filter(record => record.projectId === pay.projectId));
    if (graph.invalid || graph.openRootIds.size > 1) {
        const error = new Error(graph.invalid
            ? `该项目历史付款版本图异常，仅允许只读查看：${graph.invalidReason}`
            : '该项目存在多条历史独立付款业务链，仅允许只读查看');
        error.statusCode = 409;
        throw error;
    }
    if ((state.payments || []).some(record => record.previousPayId === pay.id)) {
        const error = new Error('该付款已经存在后续版本，不能重复更正');
        error.statusCode = 409;
        throw error;
    }
    const lockedBonus = (state.bonusConfirmations || []).find(record => (
        (record.applicationId === app.id || record.paymentId === pay.id) && recordIsLockedBonus(record)
    ));
    if (lockedBonus) {
        const error = new Error(`相关业务奖金或执行奖金已经确认（${lockedBonus.id || app.id}），不能更正付款`);
        error.statusCode = 409;
        throw error;
    }
    const effectiveProjectInvoices = (state.invoices || []).filter(invoice => (
        invoice.appId === app.id && ['待审核', '已确认'].includes(invoice.status)
    ));
    const exactInvoices = [];
    const ambiguousInvoices = [];
    effectiveProjectInvoices.forEach(invoice => {
        const linkedPaymentIds = structuredInvoicePaymentIdsForCorrection(invoice);
        if (!linkedPaymentIds.length) {
            ambiguousInvoices.push(invoice);
            return;
        }
        if (!linkedPaymentIds.includes(pay.id)) return;
        if (linkedPaymentIds.length !== 1) {
            ambiguousInvoices.push(invoice);
            return;
        }
        exactInvoices.push(invoice);
    });
    if (ambiguousInvoices.length) {
        const error = new Error(`存在无法精确判断是否属于付款 ${pay.id} 的历史有效发票（${ambiguousInvoices.map(invoice => invoice.id || invoice.invoiceNo || '未编号').join('、')}），请人工核对`);
        error.statusCode = 409;
        throw error;
    }

    const next = JSON.parse(JSON.stringify(state));
    next.paymentCorrectionRecords = Array.isArray(next.paymentCorrectionRecords) ? next.paymentCorrectionRecords : [];
    const correctedAt = new Date().toISOString();
    const correctionId = `PAYMENT-CORRECTION-${pay.id}`;
    const marker = { correctionId, paymentId: pay.id, projectId: app.id, correctedBy: user.username, correctedAt, reason: normalizedReason, result: 'invalidated' };
    const nextPay = next.payments.find(record => record.id === pay.id);
    nextPay.status = 'closed';
    nextPay.approvedDebtCorrection = { correctionId };
    const affectedInvoices = [];
    exactInvoices.forEach(invoice => {
        const nextInvoice = next.invoices.find(record => record.id === invoice.id);
        affectedInvoices.push({ id: invoice.id || '', invoiceNo: invoice.invoiceNo || '', originalStatus: invoice.status, originalAmount: toMoney(invoice.amount) });
        nextInvoice.status = '已关闭';
        nextInvoice.paymentCorrection = { ...marker, originalStatus: invoice.status };
    });
    const affectedInvoiceDrafts = [];
    (next.invoiceDraftBatches || []).forEach(draft => {
        const linkedPaymentIds = structuredInvoicePaymentIdsForCorrection(draft);
        if (linkedPaymentIds.length !== 1 || linkedPaymentIds[0] !== pay.id) return;
        affectedInvoiceDrafts.push({ id: draft.id || '', originalStatus: draft.status || '草稿' });
        draft.paymentCorrection = { ...marker, originalStatus: draft.status || '草稿' };
    });
    const affectedInvoiceOcrJobs = [];
    (next.invoiceOcrJobs || []).forEach(job => {
        const linkedPaymentIds = structuredInvoicePaymentIdsForCorrection(job);
        if (linkedPaymentIds.length !== 1 || linkedPaymentIds[0] !== pay.id) return;
        affectedInvoiceOcrJobs.push({ id: job.id || '', originalStatus: job.status || '' });
        job.paymentCorrection = { ...marker, originalStatus: job.status || '' };
    });
    const exactBatchIds = new Set(exactInvoices.map(invoice => invoice.batchId).filter(Boolean));
    (next.invoiceAuditRecords || []).filter(record => exactBatchIds.has(record.batchId)).forEach(record => {
        record.paymentCorrection = { ...marker, originalStatus: record.status || record.afterStatus || record.action || '' };
    });
    const record = {
        id: correctionId,
        paymentId: pay.id,
        projectId: app.id,
        projectGroupId: app.projectGroupId || app.id,
        applicant: pay.applicant || pay.owner || '',
        correctedBy: user.username,
        correctedByRole: user.role,
        correctedAt,
        reason: normalizedReason,
        originalPaymentStatus: pay.status,
        originalApproveTime: pay.approveTime || '',
        originalConfirmedDebtPrincipal: confirmedDebtPrincipalForPayment(pay, app),
        affectedInvoices,
        affectedInvoiceDrafts,
        affectedInvoiceOcrJobs
    };
    next.paymentCorrectionRecords.push(record);
    next.logs = Array.isArray(next.logs) ? next.logs : [];
    next.logs.unshift({ time: correctedAt, user: user.username, action: '更正并关闭欠款归还付款', detail: `${pay.id} / ${correctionId} / ${normalizedReason}` });
    if (next.logs.length > 500) next.logs = next.logs.slice(0, 500);
    if (paymentCorrectionSaveFailurePending) {
        paymentCorrectionSaveFailurePending = false;
        const error = new Error('模拟付款更正保存失败');
        error.statusCode = 500;
        throw error;
    }
    saveDataState(next);
    assignDataState(next);
    return { idempotent: false, correction: record };
}

function logAction(username, action, detail) {
    logs.unshift({
        time: new Date().toLocaleString('zh-CN'),
        user: username,
        action,
        detail
    });
    // 保留最近500条
    if (logs.length > 500) logs = logs.slice(0, 500);
    saveData();
}

function mailMoney(value) {
    return `¥${roundMoney(toMoney(value)).toFixed(2)}`;
}

function mailSystemLink(page) {
    const baseUrl = String(mailReminder.loadConfig().publicBaseUrl || '').replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${String(page || '').replace(/^\//, '')}` : '';
}

function createMailSendRecord(payload, preflight, options = {}) {
    const now = new Date().toISOString();
    const next = cloneCurrentDataState();
    next.mailSendRecords = Array.isArray(next.mailSendRecords) ? next.mailSendRecords : [];
    next.nextMailSendId = Number(next.nextMailSendId) || next.mailSendRecords.length + 1;
    const record = {
        id: `MAIL${String(next.nextMailSendId++).padStart(6, '0')}`,
        eventKey: String(payload.eventKey || '').trim(),
        type: String(payload.type || '').trim(),
        entityId: String(payload.entityId || '').trim(),
        recipients: mailReminder.uniqueEmails(preflight.recipients || payload.to),
        mode: String(options.mode || 'automatic'),
        status: preflight.allowed ? 'pending_verification' : 'skipped',
        operator: String(options.operator || 'system'),
        attemptedAt: now,
        updatedAt: now,
        failureReason: preflight.allowed ? '' : preflight.reason,
        reasonCode: preflight.allowed ? '' : preflight.reasonCode,
        messageId: '',
        originalRecordId: String(options.originalRecordId || ''),
        resendReason: String(options.resendReason || '').trim()
    };
    next.mailSendRecords.push(record);
    if (mailAttemptCreateSaveFailurePending) {
        mailAttemptCreateSaveFailurePending = false;
        throw new Error('模拟邮件发送尝试记录保存失败');
    }
    saveDataState(next);
    assignDataState(next);
    mailReminder.appendLog({
        eventKey: record.eventKey,
        type: record.type,
        entityId: record.entityId,
        recipients: record.recipients,
        status: record.status,
        error: record.failureReason
    });
    return record;
}

function updateMailSendRecord(recordId, changes) {
    const next = cloneCurrentDataState();
    next.mailSendRecords = Array.isArray(next.mailSendRecords) ? next.mailSendRecords : [];
    const record = next.mailSendRecords.find(item => item.id === recordId);
    if (!record) throw new Error('邮件发送尝试记录不存在');
    Object.assign(record, changes, { updatedAt: new Date().toISOString() });
    if (mailAttemptResultSaveFailurePending) {
        mailAttemptResultSaveFailurePending = false;
        throw new Error('模拟邮件发送结果保存失败');
    }
    saveDataState(next);
    assignDataState(next);
    mailReminder.appendLog({
        eventKey: record.eventKey,
        type: record.type,
        entityId: record.entityId,
        recipients: record.recipients,
        status: record.status,
        error: record.failureReason
    });
    return record;
}

function findExistingMailAttempt(eventKey) {
    const key = String(eventKey || '').trim();
    if (!key) return null;
    return (mailSendRecords || []).find(record => record.eventKey === key) || null;
}

async function executeFormalMail(payload, options = {}) {
    if (!options.allowRelatedAttempt) {
        const existing = findExistingMailAttempt(payload.eventKey);
        if (existing) {
            return {
                success: false,
                skipped: true,
                duplicate: true,
                reason: `该业务邮件已有正式发送尝试 ${existing.id}，普通重复发送已拦截`,
                record: existing
            };
        }
    }
    const preflight = mailReminder.formalPreflight(payload.type, payload.to);
    let record;
    try {
        record = createMailSendRecord(payload, preflight, options);
    } catch (error) {
        mailReminder.appendLog({
            eventKey: payload.eventKey,
            type: payload.type,
            entityId: payload.entityId,
            recipients: payload.to,
            status: 'record_save_failed',
            error: '正式发送尝试记录保存失败，未调用SMTP'
        });
        return { success: false, error: '正式发送尝试记录保存失败，未调用SMTP' };
    }
    if (!preflight.allowed) {
        return { success: false, skipped: true, reason: preflight.reason, record };
    }
    const smtpResult = await mailReminder.smtpSend(payload);
    if (!smtpResult.success) {
        try {
            record = updateMailSendRecord(record.id, {
                status: 'failed',
                failureReason: smtpResult.error || 'SMTP邮件发送失败',
                reasonCode: 'smtp_failed'
            });
            return { success: false, error: record.failureReason, record };
        } catch (error) {
            mailReminder.appendLog({
                eventKey: payload.eventKey,
                type: payload.type,
                entityId: payload.entityId,
                recipients: payload.to,
                status: 'pending_verification',
                error: '发送结果保存失败，状态待核实'
            });
            return { success: false, pendingVerification: true, error: '发送结果保存失败，状态待核实', record };
        }
    }
    try {
        record = updateMailSendRecord(record.id, {
            status: 'smtp_accepted',
            failureReason: '',
            reasonCode: '',
            messageId: smtpResult.messageId || ''
        });
        return { success: true, messageId: record.messageId, recipients: record.recipients, record };
    } catch (error) {
        mailReminder.appendLog({
            eventKey: payload.eventKey,
            type: payload.type,
            entityId: payload.entityId,
            recipients: payload.to,
            status: 'pending_verification',
            error: 'SMTP已接受，但发送结果保存失败，状态待核实'
        });
        return { success: false, pendingVerification: true, error: 'SMTP已接受，但发送结果保存失败，状态待核实', record };
    }
}

function queueMailReminder(payload) {
    const testCaptureFile = TEST_RESET_ENABLED ? String(process.env.KSESSION_MAIL_TEST_CAPTURE_FILE || '').trim() : '';
    if (testCaptureFile) {
        try {
            fs.mkdirSync(path.dirname(testCaptureFile), { recursive: true });
            fs.appendFileSync(testCaptureFile, JSON.stringify(payload) + '\n', 'utf8');
        } catch (error) {
            console.error('[邮件提醒] 写入隔离测试捕获失败:', error.message);
        }
    }
    executeFormalMail(payload, { mode: 'automatic', operator: 'system' }).catch(error => {
        console.error('[邮件提醒] 异步发送异常:', error.message);
    });
}

function notifyDebtSubmitted(debt, shouldQueue = true) {
    const message = mailReminder.renderSummaryEmail({
        title: '欠款审核待办提醒',
        intro: '有新的欠款申请等待审核。',
        fields: [
            { label: '欠款编号', value: debt?.id || '-' },
            { label: '申请员工', value: debt?.applicant || '-' },
            { label: '甲方', value: debt?.clientNameSnapshot || debt?.partyA || '-' },
            { label: '欠款事项', value: debt?.title || '-' },
            { label: '含税欠款金额', value: mailMoney(debt?.principal) },
            { label: '含税供应商实际成本', value: mailMoney(debt?.totalActualCost) }
        ],
        link: mailSystemLink('approval.html?tab=approval&type=debt'),
        footer: '本邮件只用于提醒，请进入审批中心的欠款审批页完成审核。'
    });
    const payload = {
        eventKey: 'debt:' + (debt?.id || '') + ':submitted',
        type: 'debtTodo',
        entityId: debt?.id,
        to: mailReminder.recipientsForReview('debt', debt?.approver),
        subject: '[K⁺-SESSION欠款审核] ' + (debt?.id || '') + ' 待审批',
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function notifyDebtResult(debt, reviewer, status, shouldQueue = true) {
    const statusText = status === 'approved' ? '已通过' : '已驳回';
    const fields = [
        { label: '欠款编号', value: debt?.id || '-' },
        { label: '审批状态', value: statusText },
        { label: '审批人', value: reviewer || '-' },
        { label: '甲方', value: debt?.clientNameSnapshot || debt?.partyA || '-' },
        { label: '欠款事项', value: debt?.title || '-' },
        { label: '含税欠款金额', value: mailMoney(debt?.principal) }
    ];
    if (debt?.reviewNote) fields.push({ label: '审批备注', value: debt.reviewNote });
    const message = mailReminder.renderSummaryEmail({
        title: '欠款审批状态提醒',
        intro: '欠款申请 ' + (debt?.id || '') + ' ' + statusText + '。',
        fields,
        link: mailSystemLink('debt.html'),
        footer: '请进入员工欠款台账查看当前状态。'
    });
    const payload = {
        eventKey: 'debt:' + (debt?.id || '') + ':' + status,
        type: 'debtResult',
        entityId: debt?.id,
        to: mailReminder.emailForUsername(debt?.applicant),
        subject: '[K⁺-SESSION欠款审批结果] ' + (debt?.id || '') + ' ' + statusText,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}
function paymentMailTotals(payment) {
    const result = (payment?.items || []).reduce((summary, item) => {
        summary.amount = roundMoney(summary.amount + toMoney(item?.amount));
        summary.serviceFee = roundMoney(summary.serviceFee + toMoney(item?.serviceFee));
        summary.itemCount += 1;
        return summary;
    }, { amount: 0, serviceFee: 0, itemCount: 0, total: 0 });
    (payment?.debtRepayments || []).forEach(item => {
        result.amount = roundMoney(result.amount + toMoney(item?.confirmedPrincipal));
        result.serviceFee = roundMoney(result.serviceFee + toMoney(item?.serviceFee));
        result.itemCount += 1;
    });
    result.total = roundMoney(result.amount + result.serviceFee);
    return result;
}

function attachmentCountForMail(record) {
    const candidates = [record?.attachments, record?.attachmentFiles, record?.files];
    const list = candidates.find(Array.isArray) || [];
    return list.length;
}

function notifyApplicationSubmitted(app, shouldQueue = true) {
    const recipients = mailReminder.recipientsForReview('application', app?.approver);
    const total = toMoney(app?.contractAmount ?? app?.total);
    const message = mailReminder.renderSummaryEmail({
        title: '项目审核待办提醒',
        intro: '有新的项目申请等待审核。',
        fields: [
            { label: '申请员工', value: app?.applicant || '-' },
            { label: '项目编号', value: app?.id || '-' },
            { label: '项目名称', value: app?.projectName || '-' },
            { label: '活动时间', value: app?.startDate || '未记录' },
            { label: '甲方', value: app?.partyA || '-' },
            { label: '项目总金额', value: mailMoney(total) },
            { label: '明细条数', value: String((app?.items || []).length) },
            { label: '附件数量', value: String(attachmentCountForMail(app)) },
            { label: '是否重提', value: app?.previousAppId ? `是，上一版 ${app.previousAppId}` : '否' },
            { label: '提交时间', value: app?.date || '-' }
        ],
        link: mailSystemLink('approval.html'),
        footer: '本邮件只用于提醒，请进入 K⁺-SESSION 系统完成审核。'
    });
    const payload = {
        eventKey: `application:${app?.id}:submitted`,
        type: 'applicationTodo',
        entityId: app?.id,
        to: recipients,
        subject: `[K⁺-SESSION项目审核] ${app?.id || ''} 项目已提交待审批`,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function notifyApplicationResult(app, reviewer, status, shouldQueue = true) {
    const statusText = status === 'approved' ? '已通过' : '已驳回';
    const fields = [
        { label: '审核结果', value: statusText },
        { label: '申请员工', value: app?.applicant || '-' },
        { label: '项目编号', value: app?.id || '-' },
        { label: '项目名称', value: app?.projectName || '-' },
        { label: '活动时间', value: app?.startDate || '未记录' },
        { label: '甲方', value: app?.partyA || '-' },
        { label: '项目总金额', value: mailMoney(app?.contractAmount ?? app?.total) },
        { label: '审核人', value: reviewer || '-' },
        { label: '审核时间', value: app?.approveTime || '-' }
    ];
    if (status === 'rejected' && app?.reviewNote) fields.push({ label: '驳回原因', value: app.reviewNote });
    const message = mailReminder.renderSummaryEmail({
        title: '项目审核状态提醒',
        intro: `项目 ${app?.id || ''} ${statusText}。`,
        fields,
        link: mailSystemLink('approval.html'),
        footer: status === 'approved' ? '项目通过后可按系统流程继续办理付款。' : '请进入系统查看项目并按需重新提交。'
    });
    const payload = {
        eventKey: `application:${app?.id}:${status}`,
        type: 'applicationResult',
        entityId: app?.id,
        to: mailReminder.emailForUsername(app?.applicant),
        subject: `[K⁺-SESSION项目审核结果] ${app?.id || ''} ${statusText}`,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function notifyPaymentSubmitted(payment, app, shouldQueue = true) {
    const totals = paymentMailTotals(payment);
    const message = mailReminder.renderSummaryEmail({
        title: '付款审核待办提醒',
        intro: '有新的付款申请等待审核。',
        fields: [
            { label: '申请员工', value: payment?.applicant || '-' },
            { label: '项目编号', value: payment?.projectId || '-' },
            { label: '项目名称', value: app?.projectName || payment?.projectId || '-' },
            { label: '付款编号', value: payment?.id || '-' },
            { label: '付款金额', value: mailMoney(totals.amount) },
            { label: '服务费金额', value: mailMoney(totals.serviceFee) },
            { label: '付款合计', value: mailMoney(totals.total) },
            { label: '付款明细条数', value: String(totals.itemCount) },
            { label: '附件数量', value: String(attachmentCountForMail(payment)) },
            { label: '是否重提', value: payment?.previousPayId ? `是，上一版 ${payment.previousPayId}` : '否' },
            { label: '提交时间', value: payment?.date || '-' }
        ],
        link: mailSystemLink('approval.html'),
        footer: '本邮件只用于提醒，请进入 K⁺-SESSION 系统完成审核。'
    });
    const payload = {
        eventKey: `payment:${payment?.id}:submitted`,
        type: 'paymentTodo',
        entityId: payment?.id,
        to: mailReminder.recipientsForReview('payment', payment?.approver),
        subject: `[K⁺-SESSION付款审核] ${payment?.id || ''} 待审批`,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function notifyPaymentResult(payment, app, reviewer, status, shouldQueue = true) {
    const totals = paymentMailTotals(payment);
    const statusText = status === 'approved' ? '已通过' : (status === 'rejected' ? '已驳回' : '已关闭');
    const fields = [
        { label: '审核结果', value: statusText },
        { label: '申请员工', value: payment?.applicant || '-' },
        { label: '项目编号', value: payment?.projectId || '-' },
        { label: '项目名称', value: app?.projectName || payment?.projectId || '-' },
        { label: '付款编号', value: payment?.id || '-' },
        { label: '付款金额', value: mailMoney(totals.amount) },
        { label: '服务费金额', value: mailMoney(totals.serviceFee) },
        { label: '付款合计', value: mailMoney(totals.total) },
        { label: '付款明细条数', value: String(totals.itemCount) },
        { label: status === 'closed' ? '操作人' : '审核人', value: reviewer || '-' },
        { label: status === 'closed' ? '关闭时间' : '审核时间', value: status === 'closed' ? (payment?.closedAt || '未记录') : (payment?.approveTime || '未记录') }
    ];
    if (status === 'rejected' && payment?.reviewNote) fields.push({ label: '驳回原因', value: payment.reviewNote });
    const message = mailReminder.renderSummaryEmail({
        title: '付款审批状态提醒',
        intro: `付款申请 ${payment?.id || ''} ${statusText}。`,
        fields,
        link: mailSystemLink('approval.html'),
        footer: status === 'approved' ? '付款通过后，项目将按现有规则进入发票审核工作台。' : '请进入系统查看当前记录。'
    });
    const payload = {
        eventKey: `payment:${payment?.id}:${status}`,
        type: 'paymentResult',
        entityId: payment?.id,
        to: mailReminder.emailForUsername(payment?.applicant),
        subject: `[K⁺-SESSION付款审核结果] ${payment?.id || ''} ${statusText}`,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function invoiceBatchForMail(batchId) {
    return buildInvoiceSubmissions().find(batch => batch.batchId === batchId) || null;
}

function notifyInvoiceSubmitted(batchId, shouldQueue = true) {
    const batch = invoiceBatchForMail(batchId);
    if (!batch) return;
    const realInvoiceCount = (batch.invoices || []).filter(item => item.invoiceType !== '无票提报').length;
    const noInvoiceCount = (batch.invoices || []).filter(item => item.invoiceType === '无票提报').length;
    const message = mailReminder.renderSummaryEmail({
        title: '发票审核待办提醒',
        intro: '有新的发票审核批次等待处理。',
        fields: [
            { label: '提交员工', value: batch.createdBy || batch.owner || '-' },
            { label: '项目编号', value: batch.appId || '-' },
            { label: '项目名称', value: batch.projectName || '-' },
            { label: '付款编号', value: batch.paymentNo || '-' },
            { label: '发票批次号', value: batch.batchId || '-' },
            { label: '本批次发票分配金额', value: mailMoney(batch.invoiceAmount) },
            { label: '发票张数', value: String(realInvoiceCount) },
            { label: '无票说明数量', value: String(noInvoiceCount) },
            { label: '可继续申请金额', value: mailMoney(batch.missingAmount) },
            { label: '供应商或替票对象', value: batch.detailSummary || '-' },
            { label: '使用多余发票池', value: batch.invoices?.some(item => item.fromPool) ? '是' : '否' },
            { label: '包含无票提报', value: toMoney(batch.noInvoiceAmount) > 0 ? '是' : '否' },
            { label: '风险提示', value: batch.riskLabels?.length ? batch.riskLabels.join('、') : '无' },
            { label: '提交时间', value: batch.createdAt || '-' }
        ],
        link: mailSystemLink('invoice.html'),
        footer: '本邮件不包含发票附件，请进入 K⁺-SESSION 系统审核。'
    });
    const payload = {
        eventKey: `invoice:${batchId}:submitted`,
        type: 'invoiceTodo',
        entityId: batchId,
        to: mailReminder.recipientsForReview('invoice'),
        subject: `[K⁺-SESSION发票审核] ${batchId} 待审批`,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function notifyInvoiceResult(batchId, status, note, reviewer, submitter, shouldQueue = true) {
    const batch = invoiceBatchForMail(batchId);
    const statusText = status === '已确认' ? '已确认' : '已驳回';
    const realInvoiceCount = (batch?.invoices || []).filter(item => item.invoiceType !== '无票提报').length;
    const noInvoiceCount = (batch?.invoices || []).filter(item => item.invoiceType === '无票提报').length;
    const fields = [
        { label: '审核结果', value: statusText },
        { label: '提交员工', value: submitter || batch?.createdBy || batch?.owner || '-' },
        { label: '项目编号', value: batch?.appId || '-' },
        { label: '项目名称', value: batch?.projectName || '-' },
        { label: '付款编号', value: batch?.paymentNo || '-' },
        { label: '发票批次号', value: batchId },
        { label: '本批次发票分配金额', value: mailMoney(batch?.invoiceAmount) },
        { label: '发票张数', value: String(realInvoiceCount) },
        { label: '无票说明数量', value: String(noInvoiceCount) },
        { label: '可继续申请金额', value: mailMoney(batch?.missingAmount) },
        { label: '供应商或替票对象', value: batch?.detailSummary || '-' },
        { label: '审核人', value: reviewer || '-' },
        { label: '审核时间', value: batch?.updatedAt || '未记录' }
    ];
    if (status === '已驳回' && note) fields.push({ label: '驳回原因', value: note });
    const message = mailReminder.renderSummaryEmail({
        title: '发票审核状态提醒',
        intro: `发票批次 ${batchId} ${statusText}。`,
        fields,
        link: mailSystemLink('invoice.html'),
        footer: status === '已确认' ? '该批次已确认。' : '请进入系统查看原因并按需重新递交。'
    });
    const payload = {
        eventKey: `invoice:${batchId}:${status}`,
        type: 'invoiceResult',
        entityId: batchId,
        to: mailReminder.emailForUsername(submitter || batch?.createdBy || batch?.owner),
        subject: `[K⁺-SESSION发票审核结果] ${batchId} ${statusText}`,
        ...message
    };
    if (shouldQueue) queueMailReminder(payload);
    return payload;
}

function buildMonthlyGapReminder(username, month) {
    const summary = buildInvoiceSummary(username);
    const scopedRows = (summary.rows || []).filter(row => !month || row.projectMonth === month);
    const groups = new Map();
    scopedRows.forEach(row => {
        const key = [row.appId, row.paymentId || row.paymentNo, row.supplier].join('|');
        if (!groups.has(key)) {
            groups.set(key, {
                appId: row.appId,
                projectName: row.projectName,
                paymentId: row.paymentId || row.paymentNo || '',
                supplier: row.supplier,
                expected: 0,
                confirmed: 0,
                pending: 0,
                draft: 0,
                missing: 0
            });
        }
        const group = groups.get(key);
        group.expected = roundMoney(group.expected + toMoney(row.expectedAmount));
        group.draft = roundMoney(group.draft + toMoney(row.draftAmount));
        group.missing = roundMoney(group.missing + toMoney(row.missingAmount));
        (row.matchedInvoices || []).forEach(invoice => {
            if (invoice.status === '已确认') group.confirmed = roundMoney(group.confirmed + toMoney(invoice.amount));
            if (invoice.status === '待审核') group.pending = roundMoney(group.pending + toMoney(invoice.amount));
        });
    });
    const gapRows = [...groups.values()].filter(row => row.missing > 0.009);
    const totals = gapRows.reduce((result, row) => {
        Object.keys(result).forEach(key => result[key] = roundMoney(result[key] + toMoney(row[key])));
        return result;
    }, { expected: 0, confirmed: 0, pending: 0, draft: 0, missing: 0 });
    const projectCount = new Set(gapRows.map(row => row.appId)).size;
    const message = mailReminder.renderSummaryEmail({
        title: '月度发票缺口提醒',
        intro: gapRows.length ? `${username} 在 ${month} 仍有发票缺口，请及时处理。` : `${username} 在 ${month} 当前没有发票缺口。`,
        fields: [
            { label: '员工账号', value: username },
            { label: '统计月份', value: month },
            { label: '应补金额', value: mailMoney(totals.expected) },
            { label: '已确认金额', value: mailMoney(totals.confirmed) },
            { label: '待审核金额', value: mailMoney(totals.pending) },
            { label: '待提交草稿金额', value: mailMoney(totals.draft) },
            { label: '当前缺口金额', value: mailMoney(totals.missing) },
            { label: '涉及项目数', value: String(projectCount) }
        ],
        rows: gapRows.map(row => ({
            label: `${row.appId} ${row.projectName}`,
            value: `${row.paymentId || '-'} / ${row.supplier || '-'} / 应补 ${mailMoney(row.expected)} / 已确认 ${mailMoney(row.confirmed)} / 待审核 ${mailMoney(row.pending)} / 草稿 ${mailMoney(row.draft)} / 缺口 ${mailMoney(row.missing)}`
        })),
        link: mailSystemLink('invoice.html'),
        footer: '本提醒复用 K⁺-SESSION 当前发票汇总口径；草稿、待审核和已确认金额分别展示。'
    });
    return { message, gapRows, totals, projectCount };
}

function buildBonusPreviewMail(preview, username) {
    const rows = preview.projectRows || [];
    const summary = preview.bonusByEmployee?.[username] || { projectCount: rows.length, calculatedCount: 0, pendingCount: rows.length, finalBonus: 0 };
    return mailReminder.renderSummaryEmail({
        title: '月度业务奖金试算预览',
        intro: `${username} / ${preview.filter.monthKey} 业务奖金试算。未完成规则确认的项目不计入合计。`,
        fields: [
            { label: '员工账号', value: username },
            { label: '计算月份', value: preview.filter.monthKey },
            { label: '项目数', value: String(summary.projectCount) },
            { label: '已按确认规则计算', value: String(summary.calculatedCount) },
            { label: '待确认项目', value: String(summary.pendingCount) },
            { label: '当前可确认奖金合计', value: mailMoney(summary.finalBonus) }
        ],
        rows: rows.map(row => ({
            label: `${row.applicationId} ${row.projectName}`,
            value: `${row.paymentId} / 利润 ${mailMoney(row.profit)} / KPI2 ${(row.kpi2 * 100).toFixed(2)}% / 基础奖金 ${row.baseBonus === null ? '待确认' : mailMoney(row.baseBonus)} / 调整比例 ${row.adjustmentRate === null ? '待确认' : `${(row.adjustmentRate * 100).toFixed(0)}%`} / 最终奖金 ${row.finalBonus === null ? '待确认' : mailMoney(row.finalBonus)}`
        })),
        link: mailSystemLink('admin.html?tab=bonus-preview'),
        footer: '本邮件为强制 Dry-run 预览，不会真实投递，不代表奖金已经确认、锁定或发放。'
    });
}

function buildBonusConfirmationMail(record) {
    return mailReminder.renderSummaryEmail({
        title: 'K⁺-SESSION 业务奖金确认',
        intro: `${record.projectApplicant} / ${record.activityMonth} 业务奖金已确认锁定。`,
        fields: [
            { label: '项目', value: `${record.applicationId} ${record.projectName}` },
            { label: '付款编号', value: record.paymentId },
            { label: '项目申请人', value: record.projectApplicant },
            { label: '业务奖金', value: mailMoney(record.totals?.businessBonus) },
            { label: '确认人', value: record.confirmedBy },
            { label: '确认时间', value: record.confirmedAt }
        ],
        link: mailSystemLink('admin.html?tab=bonus-preview'),
        footer: '金额来自已锁定业务奖金快照，不包含执行人员或其执行费用，也不代表奖金已经发放。'
    });
}

function buildExecutionExpenseMail(record, username) {
    const item = (record.executionBonuses || []).find(row => String(row?.username || '').toLowerCase() === String(username || '').toLowerCase());
    if (!item) return null;
    const fields = [
        { label: '执行人员账号', value: item.username },
        { label: '项目', value: `${record.applicationId} ${record.projectName}` },
        { label: '付款编号', value: record.paymentId },
        { label: '执行贡献', value: item.contribution || '未记录' },
        { label: '执行费用', value: mailMoney(item.amount) },
        { label: '确认人', value: record.confirmedBy },
        { label: '确认时间', value: record.confirmedAt }
    ];
    if (toMoney(item.amount) === 0) fields.push({ label: '0元原因', value: item.zeroReason || '历史记录未提供' });
    return mailReminder.renderSummaryEmail({
        title: 'K⁺-SESSION 执行费用确认',
        intro: `${item.username} 的项目执行费用已确认锁定。`,
        fields,
        link: mailSystemLink('admin.html?tab=bonus-preview'),
        footer: '本邮件只包含该执行人员本人的保存事实，不包含其他执行人员明细。'
    });
}

function buildEmployeeSettlementMail(record) {
    const businessRows = (record.businessBonusSnapshots || []).map(item => ({
        label: `【业务奖金】${item.applicationId || '-'} ${item.projectName || ''}`.trim(),
        value: `${item.paymentId || '-'} / ${mailMoney(item.amount)}`
    }));
    const executionRows = (record.executionBonusSnapshots || []).map(item => ({
        label: `【执行奖金】${item.applicationId || '-'} ${item.projectName || ''}`.trim(),
        value: `${item.contribution || '未填写工作说明'} / ${item.paymentId || '-'} / ${mailMoney(item.amount)}${toMoney(item.amount) === 0 ? ` / 0元原因：${item.zeroReason || '历史记录未提供'}` : ''}`
    }));
    const reimbursementRows = (record.reimbursementSnapshots || []).map(item => ({
        label: `【员工报销】${item.projectId || '-'} ${item.projectName || ''}`.trim(),
        value: `${item.paymentId || '-'}:${item.itemIndex} / ${item.item || '-'}${item.content ? ` / ${item.content}` : ''} / ${item.supplier || '-'} / ${mailMoney(item.amount)}`
    }));
    const subject = `[K⁺-SESSION员工月度结算] ${record.employee} ${record.activityMonth}`;
    const message = mailReminder.renderSummaryEmail({
        title: '员工月度结算确认',
        intro: `${record.employee} / ${record.activityMonth} 业务归属月份的已锁定月度结算。`,
        fields: [
            { label: '员工账号', value: record.employee },
            { label: '业务归属月份', value: record.activityMonth },
            { label: '结算编号', value: record.id },
            { label: '业务奖金小计', value: mailMoney(record.totals?.businessBonus) },
            { label: '执行奖金小计', value: mailMoney(record.totals?.executionBonus) },
            { label: '员工报销小计', value: mailMoney(record.totals?.reimbursement) },
            { label: '本月合计应发', value: mailMoney(record.totals?.totalPayable) },
            { label: '确认时间', value: record.confirmedAt }
        ],
        rows: [...businessRows, ...executionRows, ...reimbursementRows],
        link: mailSystemLink('admin.html?tab=employee-settlement'),
        footer: '金额来自该员工已锁定月度结算快照，只包含该员工本人数据，不代表已经发放。'
    });
    return {
        subject,
        message,
        summary: {
            settlementId: record.id,
            employee: record.employee,
            activityMonth: record.activityMonth,
            businessBonusCount: businessRows.length,
            executionBonusCount: executionRows.length,
            reimbursementCount: reimbursementRows.length,
            totals: record.totals
        }
    };
}

function mailRecordNotFound(message = '未找到适用的已保存业务记录') {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function buildSavedMailPayload(type, entityId, extra = {}) {
    const id = String(entityId || '').trim();
    if (type === 'applicationTodo') {
        const app = applications.find(item => item.id === id);
        if (!app) throw mailRecordNotFound('未找到已保存项目记录');
        return notifyApplicationSubmitted(app, false);
    }
    if (type === 'applicationResult') {
        const app = applications.find(item => item.id === id && ['approved', 'rejected'].includes(item.status));
        if (!app) throw mailRecordNotFound('未找到已有审核结果的项目记录');
        return notifyApplicationResult(app, app.reviewedBy || '未记录', app.status, false);
    }
    if (type === 'paymentTodo') {
        const payment = payments.find(item => item.id === id);
        if (!payment) throw mailRecordNotFound('未找到已保存付款记录');
        return notifyPaymentSubmitted(payment, applications.find(item => item.id === payment.projectId), false);
    }
    if (type === 'paymentResult') {
        const payment = payments.find(item => item.id === id && ['approved', 'rejected', 'closed'].includes(item.status));
        if (!payment) throw mailRecordNotFound('未找到已有审核或关闭结果的付款记录');
        return notifyPaymentResult(payment, applications.find(item => item.id === payment.projectId), payment.reviewedBy || payment.closedBy || '未记录', payment.status, false);
    }
    if (type === 'debtTodo') {
        const debt = debts.find(item => item.id === id);
        if (!debt) throw mailRecordNotFound('未找到已保存欠款记录');
        return notifyDebtSubmitted(debt, false);
    }
    if (type === 'debtResult') {
        const debt = debts.find(item => item.id === id && ['approved', 'rejected'].includes(item.status));
        if (!debt) throw mailRecordNotFound('未找到已有审核结果的欠款记录');
        return notifyDebtResult(debt, debt.reviewedBy || '未记录', debt.status, false);
    }
    if (type === 'invoiceTodo') {
        const payload = notifyInvoiceSubmitted(id, false);
        if (!payload) throw mailRecordNotFound('未找到已保存发票批次');
        return payload;
    }
    if (type === 'invoiceResult') {
        const audit = (invoiceAuditRecords || []).find(item => item.batchId === id && ['已确认', '已驳回'].includes(item.afterStatus || item.action));
        if (!audit) throw mailRecordNotFound('未找到已有审核结果的发票批次');
        return notifyInvoiceResult(id, audit.afterStatus || audit.action, audit.note || '', audit.reviewer || '未记录', audit.submittedBy || audit.owner || '', false);
    }
    if (type === 'businessBonus') {
        const record = bonusConfirmations.find(item => item.id === id && item.status === 'locked');
        if (!record) throw mailRecordNotFound('未找到已锁定奖金记录');
        const message = buildBonusConfirmationMail(record);
        return {
            eventKey: `business-bonus:${record.id}`,
            type,
            entityId: record.id,
            to: mailReminder.emailForUsername(record.projectApplicant),
            subject: `[K⁺-SESSION业务奖金确认] ${record.applicationId} ${record.activityMonth}`,
            ...message
        };
    }
    if (type === 'executionExpense') {
        const separator = id.indexOf(':');
        const confirmationId = separator === -1 ? id : id.slice(0, separator);
        const username = String(extra.username || (separator === -1 ? '' : id.slice(separator + 1))).trim();
        const record = bonusConfirmations.find(item => item.id === confirmationId && item.status === 'locked');
        const message = record ? buildExecutionExpenseMail(record, username) : null;
        if (!record || !message) throw mailRecordNotFound('未找到该执行人员的已锁定执行费用记录');
        return {
            eventKey: `execution-expense:${record.id}:${username.toLowerCase()}`,
            type,
            entityId: `${record.id}:${username}`,
            to: mailReminder.emailForUsername(username),
            subject: `[K⁺-SESSION执行费用确认] ${record.applicationId} ${username}`,
            ...message
        };
    }
    if (type === 'employeeSettlement') {
        const record = employeeSettlements.find(item => item.id === id && item.status === 'locked');
        if (!record) throw mailRecordNotFound('未找到已锁定员工月结记录');
        const preview = buildEmployeeSettlementMail(record);
        return {
            eventKey: `employee-settlement:${record.id}`,
            type,
            entityId: record.id,
            to: mailReminder.emailForUsername(record.employee),
            subject: preview.subject,
            text: preview.message.text,
            html: preview.message.html
        };
    }
    if (type === 'monthlyGap') {
        const username = String(extra.username || id.split(':')[0] || '').trim();
        const month = String(extra.month || id.slice(username.length + 1) || '').trim();
        if (!username || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw mailRecordNotFound('请选择有效员工和月份');
        const monthly = buildMonthlyGapReminder(username, month);
        return {
            eventKey: `monthly-gap:${username}:${month}`,
            type,
            entityId: `${username}:${month}`,
            to: mailReminder.emailForUsername(username),
            subject: `[K⁺-SESSION月度发票缺口] ${username} ${month} 缺口汇总`,
            ...monthly.message
        };
    }
    throw mailRecordNotFound('邮件类型不存在或没有适用保存记录');
}

const MAIL_TYPE_DEFINITIONS = [
    { type: 'applicationTodo', label: '项目提交待办', trigger: '项目事务成功后自动', recipientRule: '所选审批账号邮箱 + 项目审核额外收件邮箱', manual: false },
    { type: 'applicationResult', label: '项目审核结果', trigger: '项目审核成功后自动', recipientRule: '项目申请人邮箱', manual: false },
    { type: 'paymentTodo', label: '付款提交待办', trigger: '付款事务成功后自动', recipientRule: '所选审批账号邮箱 + 付款审核额外收件邮箱', manual: false },
    { type: 'paymentResult', label: '付款审核结果', trigger: '付款审核或关闭成功后自动', recipientRule: '付款申请人邮箱', manual: false },
    { type: 'debtTodo', label: '欠款提交待办', trigger: '欠款事务成功后自动', recipientRule: '所选审批账号邮箱 + 欠款审核额外收件邮箱', manual: false },
    { type: 'debtResult', label: '欠款审核结果', trigger: '欠款审核成功后自动', recipientRule: '欠款申请人邮箱', manual: false },
    { type: 'invoiceTodo', label: '发票提交待办', trigger: '发票批次递交成功后自动', recipientRule: '发票审核收件邮箱', manual: false },
    { type: 'invoiceResult', label: '发票审核结果', trigger: '发票审核成功后自动', recipientRule: '发票批次提交人邮箱', manual: false },
    { type: 'businessBonus', label: '业务奖金确认', trigger: 'Admin手工发送', recipientRule: '项目申请人邮箱', manual: true },
    { type: 'executionExpense', label: '逐人执行费用', trigger: 'Admin手工发送', recipientRule: '对应执行人员账号邮箱', manual: true },
    { type: 'employeeSettlement', label: '员工月结', trigger: 'Admin手工发送', recipientRule: '对应员工账号邮箱', manual: true },
    { type: 'monthlyGap', label: '月度发票缺口', trigger: 'Admin手工发送', recipientRule: '所选员工账号邮箱', manual: true }
];

function mailTemplateEntities() {
    const result = {};
    result.applicationTodo = (applications || []).map(item => ({ id: item.id, label: `${item.id} ${item.projectName || ''}（${item.status || '未记录'}）` }));
    result.applicationResult = (applications || []).filter(item => ['approved', 'rejected'].includes(item.status)).map(item => ({ id: item.id, label: `${item.id} ${item.projectName || ''}（${item.status}）` }));
    result.paymentTodo = (payments || []).map(item => ({ id: item.id, label: `${item.id} / ${item.projectId || ''}（${item.status || '未记录'}）` }));
    result.paymentResult = (payments || []).filter(item => ['approved', 'rejected', 'closed'].includes(item.status)).map(item => ({ id: item.id, label: `${item.id} / ${item.projectId || ''}（${item.status}）` }));
    result.debtTodo = (debts || []).map(item => ({ id: item.id, label: `${item.id} ${item.title || ''}（${item.status || '未记录'}）` }));
    result.debtResult = (debts || []).filter(item => ['approved', 'rejected'].includes(item.status)).map(item => ({ id: item.id, label: `${item.id} ${item.title || ''}（${item.status}）` }));
    const batches = buildInvoiceSubmissions();
    result.invoiceTodo = batches.map(item => ({ id: item.batchId, label: `${item.batchId} / ${item.appId || ''}` }));
    result.invoiceResult = (invoiceAuditRecords || []).filter(item => ['已确认', '已驳回'].includes(item.afterStatus || item.action)).map(item => ({ id: item.batchId, label: `${item.batchId}（${item.afterStatus || item.action}）` }));
    for (const type of MAIL_PERIOD_TYPES) result[type] = mailPeriodEntities(type);
    result.monthlyGap = [];
    return result;
}

const MAIL_PERIOD_TYPES = ['businessBonus', 'executionExpense', 'employeeSettlement'];
function mailValidMonth(value) {
    return /^(?:[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(String(value || ''));
}
function mailPeriodEntities(type, lockedOnly = true) {
    const source = type === 'employeeSettlement' ? employeeSettlements : bonusConfirmations;
    if (!MAIL_PERIOD_TYPES.includes(type)) return [];
    return (source || []).filter(row => !lockedOnly || row.status === 'locked').flatMap(record => {
        const rows = type === 'executionExpense' ? (record.executionBonuses || []) : [null];
        return rows.map(row => {
            const id = row ? `${record.id}:${row.username}` : record.id;
            const employee = String((row ? row.username : type === 'employeeSettlement' ? record.employee : record.projectApplicant) || '');
            const rawAmount = row ? row.amount : type === 'employeeSettlement' ? record.totals?.totalPayable : record.totals?.businessBonus;
            const amount = rawAmount !== null && rawAmount !== undefined && String(rawAmount).trim() !== '' && Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : null;
            const activityMonth = mailValidMonth(record.activityMonth) ? record.activityMonth : '';
            return { id, employee, activityMonth, amount, status: record.status,
                label: `${employee} / ${activityMonth || '月份未记录'} / ${id} / ${amount === null ? '金额未记录' : mailMoney(amount)}` };
        });
    });
}
function validateMailPeriodQuery(params) {
    const activityMonth = params.get('activityMonth') || '';
    const employee = params.get('employee') || '';
    const pageText = params.get('page');
    if (activityMonth && activityMonth !== 'unrecorded' && !mailValidMonth(activityMonth)) throw new Error('业务归属月份无效');
    if (employee.length > 300) throw new Error('员工筛选无效');
    if (pageText !== null && (!/^[1-9]\d{0,8}$/.test(pageText))) throw new Error('页码无效');
    return { activityMonth, employee, page: pageText === null ? null : Number(pageText) };
}
function mailMatchesPeriod(row, filter) {
    return (!filter.employee || row.employee === filter.employee) &&
        (!filter.activityMonth || (filter.activityMonth === 'unrecorded' ? !row.activityMonth : row.activityMonth === filter.activityMonth));
}
function mailRecordPage(params) {
    const filter = validateMailPeriodQuery(params);
    const type = params.get('type') || '';
    if (type && !MAIL_TYPE_DEFINITIONS.some(row => row.type === type)) throw new Error('邮件类型无效');
    const from = params.get('from') || '', to = params.get('to') || '';
    const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if ((from && !validDay(from)) || (to && !validDay(to)) || (from && to && from > to)) throw new Error('发送日期范围无效');
    const metadata = new Map(MAIL_PERIOD_TYPES.flatMap(kind => mailPeriodEntities(kind, false).map(row => [`${kind}:${row.id}`, row])));
    const rows = (mailSendRecords || []).map(record => {
        const source = metadata.get(`${record.type}:${record.entityId}`);
        return { ...record, activityMonth: source?.activityMonth || '', employee: source?.employee || '', amount: source?.amount ?? null };
    });
    const facets = {
        months: [...new Set(rows.map(row => row.activityMonth).filter(Boolean))].sort().reverse(),
        employees: [...new Set(rows.map(row => row.employee).filter(Boolean))].sort()
    };
    const entity = (params.get('entityId') || '').toLowerCase();
    const records = rows.filter(row => (!type || row.type === type) &&
        (!params.get('status') || row.status === params.get('status')) &&
        (!entity || String(row.entityId || '').toLowerCase().includes(entity)) &&
        (!from || String(row.attemptedAt || '') >= from) &&
        (!to || String(row.attemptedAt || '') <= `${to}T23:59:59.999Z`) &&
        mailMatchesPeriod(row, filter))
        .sort((a, b) => String(b.attemptedAt || '').localeCompare(String(a.attemptedAt || '')) || String(b.id).localeCompare(String(a.id)));
    const total = records.length, pageSize = 20, totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = filter.page === null ? null : Math.min(filter.page, totalPages);
    return { success: true, records: page === null ? records : records.slice((page - 1) * pageSize, page * pageSize),
        total, page, pageSize, totalPages, facets };
}
function assertMailSelectionContext(body) {
    if (!body?.selectionContext) return; // Legacy callers still use the authoritative entity ID.
    const row = mailPeriodEntities(body.type).find(item => item.id === body.entityId);
    const expected = body.selectionContext;
    if (!row || expected.employee !== row.employee || expected.activityMonth !== row.activityMonth ||
        expected.amount !== row.amount || (body.username && body.username !== row.employee)) {
        const error = new Error('所选月份、员工或记录已变化，请重新选择后发送');
        error.statusCode = 409;
        throw error;
    }
}
function settlementAvailableYears() {
    const current = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric' }).format(new Date());
    const months = [...(applications || []).map(row => String(row.startDate || '').slice(0, 7)),
        ...(bonusConfirmations || []).map(row => row.activityMonth), ...(employeeSettlements || []).map(row => row.activityMonth)];
    return [...new Set([current, ...months.filter(mailValidMonth).map(value => value.slice(0, 4))])].sort().reverse();
}

function mailHttpStatus(result) {
    if (result?.success) return 200;
    if (result?.duplicate || result?.skipped) return 409;
    if (result?.pendingVerification) return 500;
    return 502;
}

function parseJsonBody(req, callback) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            callback(null, body ? JSON.parse(body) : {});
        } catch (e) {
            callback(e);
        }
    });
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[（）()\s,，.。·\-_\[\]【】]/g, '')
        .replace(/有限公司|有限责任公司|公司|个体工商户|开票专用章/g, '');
}

function toMoney(value) {
    const n = parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
    return Math.round((toMoney(value) + Number.EPSILON) * 100) / 100;
}

function configuredTaxRate(){return taxRateForCalculation(currentConfig());}
function projectTaxSnapshot(app) {
    const contractAmount=toMoney(app?.contractAmount);
    const savedTax=app?.taxAmount, savedRate=app?.taxRateSnapshot;
    const hasRate=typeof savedRate==='number'&&Number.isFinite(savedRate)&&savedRate>=0;
    if(typeof savedTax==='number'&&Number.isFinite(savedTax)&&savedTax>=0)
        return {taxRateSnapshot:hasRate?savedRate:null,taxAmount:savedTax};
    if(!hasRate){const error=new Error('历史项目缺少税额及税率快照；不能用当前配置重算，请核对原始依据。');error.statusCode=409;throw error;}
    return {taxRateSnapshot:savedRate,taxAmount:contractAmount>0?contractAmount*savedRate/(1+savedRate):0};
}
function serviceFeeRateForItem(item,fallbackItem) {
    const saved=fallbackItem?.serviceFeeRateSnapshot;
    if(typeof saved==='number'&&Number.isFinite(saved)&&saved>=0)return saved;
    return serviceFeeRateForItemName(currentConfig().serviceFeeRates,item?.item);
}
function normalizeFinancialItem(item, authoritativeItem = null) {
    const normalized = { ...item };
    normalized.amount = roundMoney(item?.amount);
    normalized.isProxy = authoritativeItem ? String(authoritativeItem.isProxy || '') : String(item?.isProxy || '');
    const rate = serviceFeeRateForItem(normalized, authoritativeItem);
    normalized.serviceFeeRateSnapshot = rate;
    normalized.serviceFee = normalized.isProxy === '是' ? roundMoney(normalized.amount * rate) : 0;
    return normalized;
}

const ALLOWED_FINANCIAL_ITEMS = new Set(SERVICE_FEE_ITEM_OPTIONS);
const PROJECT_SUPPLIER_CONFIRMED = 'confirmed';
const PROJECT_SUPPLIER_PENDING = 'pending-confirmation';
const PROJECT_PENDING_SUPPLIER_LABEL = '临时供应商（名称待确认）';
const PAYMENT_CONFIRMED_SUPPLIER_SOURCE = 'payment-confirmed-company-full-name';

function isValidProjectActivityDate(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function currentChinaYear(now = new Date()) {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric' }).format(now));
}

function projectActivityDateBounds(now = new Date()) {
    const year = currentChinaYear(now);
    return { min: `${year - 1}-01-01`, max: `${year + 3}-12-31` };
}

function projectActivityDateInSubmissionWindow(value, now = new Date()) {
    if (!isValidProjectActivityDate(value)) return false;
    const bounds = projectActivityDateBounds(now);
    return value >= bounds.min && value <= bounds.max;
}

function historicalActivityDateBounds(now = new Date()) {
    const validYears = (applications || []).map(app => String(app?.startDate || '').match(/^(\d{4})-/)?.[1]).filter(Boolean).map(Number);
    const year = currentChinaYear(now);
    return { min: `${validYears.length ? Math.min(...validYears) : year - 1}-01-01`, max: `${year + 3}-12-31` };
}

function normalizeProjectFinancialItems(items) {
    if (!Array.isArray(items)) throw new Error('项目成本明细必须是列表');
    return items.map((item, index) => {
        const label = `第${index + 1}条项目成本明细`;
        const itemName = String(item?.item || '').trim();
        const content = String(item?.content || '').trim();
        const submittedSupplier = String(item?.supplier || '').trim();
        const submittedStatus = String(item?.supplierNameStatus || '').trim();
        if (![PROJECT_SUPPLIER_CONFIRMED, PROJECT_SUPPLIER_PENDING].includes(submittedStatus)) throw new Error(`${label}的supplierNameStatus必填且只能是 confirmed 或 pending-confirmation`);
        const supplierNameStatus = submittedStatus;
        const supplier = supplierNameStatus === PROJECT_SUPPLIER_PENDING ? PROJECT_PENDING_SUPPLIER_LABEL : submittedSupplier;
        const supplierPendingReason = String(item?.supplierPendingReason || '').trim();
        const isProxy = String(item?.isProxy || '').trim();
        const amountText = String(item?.amount ?? '').trim();
        if (!ALLOWED_FINANCIAL_ITEMS.has(itemName)) throw new Error(`${label}的单项不合法`);
        if (content.length > 300) throw new Error(`${label}的内容不得超过300字`);
        if (supplierNameStatus === PROJECT_SUPPLIER_PENDING && !content) throw new Error(`${label}名称待确认时必须填写业务内容`);
        if (supplierNameStatus === PROJECT_SUPPLIER_PENDING && (!supplierPendingReason || supplierPendingReason.length > 300 || /[\r\n\t]/.test(supplierPendingReason))) throw new Error(`${label}名称待确认时必须填写待确认原因，且不得换行或超过300字`);
        if (!supplier || supplier.length > 100 || /[\r\n\t]/.test(supplier)) throw new Error(`${label}的供应商不能为空、不得换行且不得超过100字`);
        if (supplier === DEBT_SUPPLIER_VALUE || supplier === DEBT_SUPPLIER_LABEL || item?.isDebtRepayment || item?.supplierType === 'system-debt') throw new Error(`${label}不能伪造成欠款专用明细`);
        if (isProxy !== '是' && isProxy !== '否') throw new Error(`${label}的是否代付只能选择“是”或“否”`);
        if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0) throw new Error(`${label}的金额必须大于0且最多两位小数`);
        const normalized = normalizeFinancialItem({ item: itemName, content, supplier, isProxy, amount: amountText });
        normalized.supplierNameStatus = supplierNameStatus;
        if (supplierNameStatus === PROJECT_SUPPLIER_PENDING) {
            normalized.supplierPendingReason = supplierPendingReason;
        } else {
            const payeeAccount = payeeAccountByIdOrName(item);
            if (String(item?.payeeAccountId || '').trim() && !payeeAccount) throw new Error(`${label}的收款对象不存在`);
            if (payeeAccount) {
                if (normalizeText(submittedSupplier) !== normalizeText(payeeAccount.name)) throw new Error(`${label}的供应商名称与所选收款对象不一致`);
                normalized.supplier = payeeAccount.name;
                normalized.payeeAccountId = payeeAccount.id || '';
                normalized.payeeAccountType = normalizedPayeeAccountType(payeeAccount);
                normalized.linkedEmployeeUsername = String(payeeAccount.linkedEmployeeUsername || '').trim();
            }
        }
        return normalized;
    });
}

function isEffectiveProjectCostItem(item) {
    if (!item || toMoney(item.amount) <= 0) return false;
    const supplier = String(item.supplier || '').trim();
    const isProxy = String(item.isProxy || '').trim();
    if (!String(item.item || '').trim() || !supplier || (isProxy !== '是' && isProxy !== '否')) return false;
    return !/[\r\n\t]/.test(supplier);
}

function projectConstraintFinancials(app) {
    const contractAmount = toMoney(app?.contractAmount ?? app?.total);
    const items = Array.isArray(app?.items) ? app.items : [];
    const itemCost = items.reduce((sum, item) => sum + toMoney(item?.amount) + toMoney(item?.serviceFee), 0);
    const tax = projectTaxSnapshot({ ...app, contractAmount }).taxAmount;
    const totalCost = itemCost + tax;
    return { contractAmount, totalCost, profit: contractAmount - totalCost };
}

function projectConstraintReasons(app, { submission = false } = {}) {
    const reasons = [];
    const contractAmount = toMoney(app?.contractAmount ?? app?.total);
    const activityDate = String(app?.startDate || app?.activityDate || '').trim();
    const hasEffectiveCost = (Array.isArray(app?.items) ? app.items : []).some(isEffectiveProjectCostItem);
    if (contractAmount <= 0) reasons.push(submission ? '合同金额必须大于 0' : '合同金额未大于 0');
    if (!activityDate) reasons.push(submission ? '活动日期必须填写' : '活动日期缺失');
    else if (!isValidProjectActivityDate(activityDate)) reasons.push(submission ? '活动日期必须为有效日期' : '活动日期无效');
    if (!hasEffectiveCost) reasons.push(submission ? '至少需要一条有效成本明细' : '缺少有效成本明细');
    if (contractAmount > 0 && hasEffectiveCost) {
        try {
        const {profit}=projectConstraintFinancials(app);
        if (profit < 0) reasons.push(submission ? `项目利润不得小于 0（当前为 ¥${profit.toFixed(2)}）` : `项目利润为负（¥${profit.toFixed(2)}）`);
        } catch(error) {if(submission)throw error;reasons.push(error.message);}
    }
    return reasons;
}

function normalizePaymentFinancialItems(items, app) {
    if (!Array.isArray(items)) throw new Error('付款明细必须是列表');
    const allowedItems = new Set([...ALLOWED_FINANCIAL_ITEMS, ...(app?.items || []).filter(item => !item?.isDebtRepayment).map(item => String(item?.item || '').trim()).filter(Boolean)]);
    const projectItemsById = new Map((app?.items || [])
        .filter(item => item?.supplierNameStatus === PROJECT_SUPPLIER_PENDING && item?.projectItemId)
        .map(item => [String(item.projectItemId), item]));
    const seenProjectItemIds = new Set();
    return items.map((item, index) => {
        const label = `第${index + 1}条付款明细`;
        const itemName = String(item?.item || '').trim();
        const content = String(item?.content || '').trim();
        const supplier = String(item?.supplier || '').trim();
        const isProxy = String(item?.isProxy || '').trim();
        const amountText = String(item?.amount ?? '').trim();
        const projectItemId = String(item?.projectItemId || '').trim();
        if (!allowedItems.has(itemName)) throw new Error(`${label}的单项不合法`);
        if (content.length > 300) throw new Error(`${label}的内容不得超过300字`);
        if (!supplier || supplier.length > 100 || /[\r\n\t]/.test(supplier)) throw new Error(`${label}的供应商不能为空、不得换行且不得超过100字`);
        if (supplier === PROJECT_PENDING_SUPPLIER_LABEL) throw new Error(`${label}必须填写真实供应商公司全称`);
        if (supplier === DEBT_SUPPLIER_VALUE || supplier === DEBT_SUPPLIER_LABEL || item?.isDebtRepayment || item?.supplierType === 'system-debt') throw new Error(`${label}不能伪造成欠款专用明细`);
        if (isProxy !== '是' && isProxy !== '否') throw new Error(`${label}的是否代付只能选择“是”或“否”`);
        if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amountText)) throw new Error(`${label}的金额必须为非负数且最多两位小数`);
        const normalized = normalizeFinancialItem({ item: itemName, content, supplier, isProxy, amount: amountText });
        const payeeAccount = payeeAccountByIdOrName(item);
        if (String(item?.payeeAccountId || '').trim() && !payeeAccount) throw new Error(`${label}的收款账号不存在`);
        if (payeeAccount) {
            if (normalizeText(supplier) !== normalizeText(payeeAccount.name)) throw new Error(`${label}的供应商名称与所选收款对象不一致`);
            normalized.supplier = payeeAccount.name;
            normalized.payeeAccountId = payeeAccount.id || '';
            normalized.payeeAccountType = normalizedPayeeAccountType(payeeAccount);
            normalized.linkedEmployeeUsername = String(payeeAccount.linkedEmployeeUsername || '').trim();
        }
        if (projectItemId) {
            if (!projectItemsById.has(projectItemId)) throw new Error(`${label}的projectItemId没有对应的项目待确认明细，不能伪造项目明细来源`);
            if (seenProjectItemIds.has(projectItemId)) throw new Error(`${label}重复引用了同一projectItemId`);
            seenProjectItemIds.add(projectItemId);
            normalized.projectItemId = projectItemId;
            normalized.supplierNameSource = PAYMENT_CONFIRMED_SUPPLIER_SOURCE;
        }
        return normalized;
    });
}

function positiveMoney(value) {
    const amount = roundMoney(value);
    return amount > 0 ? amount : 0;
}

function parseInvoiceMoneyCandidate(value) {
    const text = String(value || '').replace(/[，,]/g, '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return 0;
    const integerDigits = text.split('.')[0].replace(/\D/g, '');
    const totalDigits = text.replace(/\D/g, '');
    if (integerDigits.length > 9 || totalDigits.length > 11) return 0;
    const amount = toMoney(text);
    return amount > 0 && amount <= 999999999.99 ? amount : 0;
}

function parseLocalDateTime(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const text = String(value || '').trim();
    if (!text) return null;
    const match = text.match(/(20\d{2}|19\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})日?(?:\s*(?:上午|下午)?\s*(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
        let hour = Number(match[4] || 0);
        if (/下午/.test(text) && hour < 12) hour += 12;
        if (/上午/.test(text) && hour === 12) hour = 0;
        return new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            hour,
            Number(match[5] || 0),
            Number(match[6] || 0)
        );
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLocalDateTime(value) {
    const date = parseLocalDateTime(value);
    return date ? date.toLocaleString('zh-CN') : '';
}

function addCalendarMonths(dateValue, months) {
    const date = parseLocalDateTime(dateValue);
    if (!date) return null;
    const next = new Date(date.getTime());
    next.setMonth(next.getMonth() + months);
    return next;
}

function poolStartAtForRecord(record) {
    return formatLocalDateTime(record?.poolStartAt || record?.uploadedAt || record?.createdAt || record?.updatedAt || '');
}

function poolExpireAtFromStart(startAt) {
    const expireAt = addCalendarMonths(startAt, 1);
    return expireAt ? expireAt.toLocaleString('zh-CN') : '';
}

function poolTiming(startAt, now = new Date()) {
    const startDate = parseLocalDateTime(startAt);
    if (!startDate) {
        return {
            poolStartAt: '',
            poolExpireAt: '',
            poolMonth: '',
            isExpired: false,
            timeStatus: '有效期未记录'
        };
    }
    const expireDate = addCalendarMonths(startDate, 1);
    const expired = expireDate ? now.getTime() > expireDate.getTime() : false;
    return {
        poolStartAt: startDate.toLocaleString('zh-CN'),
        poolExpireAt: expireDate ? expireDate.toLocaleString('zh-CN') : '',
        poolMonth: normalizeMonth(startDate.toLocaleDateString('zh-CN')),
        isExpired: expired,
        timeStatus: expired ? '已过期' : '共享期内'
    };
}

function safePathSegment(value, fallback = '未命名') {
    const text = String(value || '').trim() || fallback;
    return text
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/\.+$/g, '')
        .slice(0, 80) || fallback;
}

function toForwardSlash(value) {
    return String(value || '').replace(/\\/g, '/');
}

function attachmentFullPathFromPublicPath(publicPathOrFilename) {
    const raw = String(publicPathOrFilename || '').trim();
    if (!raw) return '';
    let rel = raw;
    if (rel.startsWith('/attachments/')) rel = rel.slice('/attachments/'.length);
    rel = rel.split('?')[0].replace(/^[/\\]+/, '');
    try {
        rel = decodeURIComponent(rel);
    } catch (e) {}
    const fullPath = path.resolve(ATTACHMENTS_DIR, path.normalize(rel));
    const root = path.resolve(ATTACHMENTS_DIR);
    const lowerFull = fullPath.toLowerCase();
    const lowerRoot = root.toLowerCase();
    if (lowerFull !== lowerRoot && !lowerFull.startsWith(lowerRoot + path.sep.toLowerCase())) return '';
    return fullPath;
}

function publicPathFromAttachmentFullPath(fullPath) {
    const root = path.resolve(ATTACHMENTS_DIR);
    const rel = path.relative(root, path.resolve(fullPath));
    return '/attachments/' + toForwardSlash(rel);
}

const CRC32_TABLE = (() => {
    const table = [];
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(buffer) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buffer.length; i += 1) {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buffer[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
}

function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
}

function createZipBuffer(files) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    files.forEach(file => {
        const nameBuffer = Buffer.from(file.name, 'utf8');
        const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data || '');
        const crc = crc32(data);
        const stamp = dosDateTime(file.mtime || new Date());
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(0, 8);
        local.writeUInt16LE(stamp.time, 10);
        local.writeUInt16LE(stamp.day, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuffer.length, 26);
        local.writeUInt16LE(0, 28);
        localParts.push(local, nameBuffer, data);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(0, 10);
        central.writeUInt16LE(stamp.time, 12);
        central.writeUInt16LE(stamp.day, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(data.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuffer.length, 28);
        central.writeUInt16LE(0, 30);
        central.writeUInt16LE(0, 32);
        central.writeUInt16LE(0, 34);
        central.writeUInt16LE(0, 36);
        central.writeUInt32LE(0, 38);
        central.writeUInt32LE(offset, 42);
        centralParts.push(central, nameBuffer);
        offset += local.length + nameBuffer.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...localParts, ...centralParts, end]);
}

function uniqueZipEntryName(baseName, usedNames) {
    const ext = path.extname(baseName);
    const stem = ext ? baseName.slice(0, -ext.length) : baseName;
    let name = baseName;
    let index = 2;
    while (usedNames.has(name.toLowerCase())) {
        name = `${stem}-${index}${ext}`;
        index += 1;
    }
    usedNames.add(name.toLowerCase());
    return name;
}

function buildInvoiceAttachmentPackage(batchId) {
    const targets = (invoices || []).filter(inv => inv.batchId === batchId && inv.attachment?.path);
    const usedNames = new Set();
    const files = [];
    targets.forEach((inv, index) => {
        const fullPath = attachmentFullPathFromPublicPath(inv.attachment.path);
        if (!fullPath || !fs.existsSync(fullPath)) return;
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return;
        const originalName = inv.attachment.originalName || inv.attachment.filename || path.basename(fullPath);
        const rawName = `${String(index + 1).padStart(2, '0')}-${inv.invoiceNo || inv.id || 'invoice'}-${originalName}`;
        const entryName = uniqueZipEntryName(safePathSegment(rawName, `invoice-${index + 1}.pdf`), usedNames);
        files.push({
            name: entryName,
            data: fs.readFileSync(fullPath),
            mtime: stat.mtime
        });
    });
    const first = targets[0] || {};
    const appId = first.appId || '';
    const zipName = `${safePathSegment(appId || 'invoice')}-${safePathSegment(batchId || 'batch')}-发票附件包.zip`;
    return { files, zipName, invoiceCount: targets.length };
}

function contextValue(context, key, current = '') {
    return Object.prototype.hasOwnProperty.call(context || {}, key)
        ? (context[key] || '')
        : (current || '');
}

function attachmentIdFor(file) {
    if (!file) return '';
    if (file.attachmentId) return file.attachmentId;
    const seed = file.filename || file.path || file.originalPath || file.originalName || JSON.stringify(file);
    return 'ATT' + crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12).toUpperCase();
}

function normalizeAttachmentRecord(file, context = {}) {
    if (!file) return null;
    const now = context.updatedAt || new Date().toLocaleString('zh-CN');
    const next = { ...file };
    if (!next.path && next.filename) next.path = '/attachments/' + next.filename;
    if (!next.filename && next.path) next.filename = path.basename(String(next.path).split('?')[0]);
    next.attachmentId = attachmentIdFor(next);
    next.uploadedBy = next.uploadedBy || context.uploadedBy || '';
    next.uploadedAt = next.uploadedAt || context.uploadedAt || now;
    next.state = context.state || next.state || '临时识别';
    next.stateChangedAt = now;
    next.linkedOcrJobId = contextValue(context, 'linkedOcrJobId', next.linkedOcrJobId);
    next.linkedDraftId = contextValue(context, 'linkedDraftId', next.linkedDraftId);
    next.linkedInvoiceId = contextValue(context, 'linkedInvoiceId', next.linkedInvoiceId);
    next.linkedAppId = contextValue(context, 'linkedAppId', next.linkedAppId);
    next.linkedBatchId = contextValue(context, 'linkedBatchId', next.linkedBatchId);
    return next;
}

function attachmentMatches(a, b) {
    if (!a || !b) return false;
    if (a.attachmentId && b.attachmentId && a.attachmentId === b.attachmentId) return true;
    if (a.path && b.path && a.path === b.path) return true;
    if (a.originalPath && b.path && a.originalPath === b.path) return true;
    if (a.path && b.originalPath && a.path === b.originalPath) return true;
    if (a.filename && b.filename && a.filename === b.filename) return true;
    return false;
}

function syncOcrAttachmentState(reference, state, context = {}) {
    if (!reference) return;
    const targetJobId = context.linkedOcrJobId || reference.linkedOcrJobId || reference.ocrJobId || '';
    const now = context.updatedAt || new Date().toLocaleString('zh-CN');
    (invoiceOcrJobs || []).forEach(job => {
        const matchesJob = targetJobId && job.id === targetJobId;
        const matchesAttachment = attachmentMatches(job.attachment, reference) || attachmentMatches(job.item?.attachment, reference);
        if (!matchesJob && !matchesAttachment) return;
        const nextContext = {
            ...context,
            state,
            updatedAt: now,
            linkedOcrJobId: job.id,
            uploadedBy: context.uploadedBy || job.owner || '',
            uploadedAt: context.uploadedAt || job.createdAt || ''
        };
        job.attachment = normalizeAttachmentRecord(job.attachment || reference, nextContext);
        if (job.item?.attachment) job.item.attachment = normalizeAttachmentRecord(job.item.attachment, nextContext);
        job.updatedAt = now;
        try {
            writeOcrJobManifest(job);
        } catch (archiveErr) {
            job.archiveError = archiveErr.message;
            console.error('[归档] OCR附件状态写入失败:', archiveErr);
        }
    });
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJsonFile(filePath, value) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function parseArchiveDateParts(value) {
    const raw = String(value || '').trim();
    let dt = raw ? new Date(raw.replace(/\//g, '-')) : null;
    if (!dt || Number.isNaN(dt.getTime())) dt = new Date();
    const year = String(dt.getFullYear());
    const month = `${year}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return { year, month };
}

function archiveDatePartsForApp(app) {
    return parseArchiveDateParts(app?.startDate || app?.date || app?.createdAt);
}

function applicationProjectGroupId(app) {
    if (!app) return '';
    if (app.projectGroupId) return app.projectGroupId;
    if (app.previousAppId) {
        const prev = applications.find(item => item.id === app.previousAppId);
        return applicationProjectGroupId(prev) || app.previousAppId;
    }
    const child = applications.find(item => item.previousAppId === app.id || item.projectGroupId === app.id);
    if (child) return child.projectGroupId || app.id;
    return app.id || '';
}

function appForPayment(payment) {
    return applications.find(app => app.id === payment?.projectId) || null;
}

function appForInvoice(inv) {
    return applications.find(app => app.id === inv?.appId) || null;
}

function paymentIdFromExpectedKey(key) {
    const parts = String(key || '').split(':');
    return parts[1] && /^PAY\d+$/i.test(parts[1]) ? parts[1] : '';
}

function invoicePaymentIds(inv) {
    const keys = [
        inv?.expectedKey || '',
        ...(Array.isArray(inv?.expectedKeys) ? inv.expectedKeys : []),
        ...(Array.isArray(inv?.detailAllocations) ? inv.detailAllocations.map(item => item.key || '') : [])
    ];
    return uniqueList(keys.map(paymentIdFromExpectedKey).filter(Boolean));
}

function invoicePaymentIsApproved(inv) {
    const paymentIds = invoicePaymentIds(inv);
    if (paymentIds.length) {
        return paymentIds.some(id => (payments || []).some(pay => pay.id === id && pay.status === 'approved'));
    }
    return approvedPaymentsForApp(inv?.appId).length > 0;
}

function isInvoiceOccupying(inv) {
    const status = inv?.status || '待审核';
    if (status !== '待审核' && status !== '已确认') return false;
    if (inv?.projectClosure?.result === 'invalidated') return false;
    if (inv?.paymentCorrection?.result === 'invalidated') return false;
    if (appForInvoice(inv)?.status === 'closed') return false;
    return invoicePaymentIsApproved(inv);
}

function isInvoiceDraftOccupying(draft) {
    if ((draft?.status || '草稿') !== '草稿') return false;
    if (draft?.projectClosure?.result === 'invalidated') return false;
    if (draft?.paymentCorrection?.result === 'invalidated') return false;
    return appForInvoiceDraft(draft)?.status !== 'closed';
}

function appForOcrJob(job) {
    return applications.find(app => app.id === job?.appId) || null;
}

function appForInvoiceDraft(draft) {
    return applications.find(app => app.id === draft?.appId) || null;
}

function findExistingProjectArchiveDir(projectGroupId) {
    const archiveRoot = path.join(ATTACHMENTS_DIR, 'archive');
    if (!projectGroupId || !fs.existsSync(archiveRoot)) return '';
    const stack = [archiveRoot];
    while (stack.length) {
        const dir = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const full = path.join(dir, entry.name);
            if (entry.name === projectGroupId || entry.name.startsWith(projectGroupId + '-')) return full;
            stack.push(full);
        }
    }
    return '';
}

function projectArchiveDirForApp(app) {
    const projectGroupId = applicationProjectGroupId(app);
    const existing = findExistingProjectArchiveDir(projectGroupId);
    if (existing) return existing;
    const { year, month } = archiveDatePartsForApp(app);
    const owner = safePathSegment(app?.applicant || app?.owner || app?.createdBy || 'unknown');
    const projectName = safePathSegment(app?.projectName || projectGroupId || '项目');
    return path.join(ATTACHMENTS_DIR, 'archive', year, month, owner, `${projectGroupId}-${projectName}`);
}

function projectArchivePublicDirForApp(app) {
    return publicPathFromAttachmentFullPath(projectArchiveDirForApp(app));
}

function uniqueDestinationPath(dir, basename) {
    const parsed = path.parse(basename || 'attachment');
    const cleanBase = safePathSegment(parsed.name || 'attachment');
    const ext = parsed.ext || '';
    let candidate = path.join(dir, cleanBase + ext);
    let index = 2;
    while (fs.existsSync(candidate)) {
        candidate = path.join(dir, `${cleanBase}-${index}${ext}`);
        index += 1;
    }
    return candidate;
}

function archiveAttachmentList(attachments, targetDir, context) {
    ensureDir(targetDir);
    return (Array.isArray(attachments) ? attachments : []).map((file, index) => {
        const originalPublicPath = file.path || (file.filename ? '/attachments/' + file.filename : '');
        const source = attachmentFullPathFromPublicPath(originalPublicPath || file.filename);
        const alreadyArchived = String(originalPublicPath || '').startsWith('/attachments/archive/');
        const archived = {
            ...file,
            originalPath: file.originalPath || originalPublicPath,
            archive: {
                ...(file.archive || {}),
                recordType: context.recordType,
                recordId: context.recordId,
                projectGroupId: context.projectGroupId,
                archivedAt: context.archivedAt
            }
        };

        if (!source || !fs.existsSync(source)) {
            archived.archiveMissing = true;
            return archived;
        }

        if (alreadyArchived && path.dirname(source) === path.resolve(targetDir)) {
            archived.path = originalPublicPath;
            archived.filename = path.basename(source);
            return archived;
        }

        const destName = file.filename || `${context.recordId}-${index + 1}${path.extname(file.originalName || '') || path.extname(source)}`;
        const dest = uniqueDestinationPath(targetDir, path.basename(destName));
        try {
            fs.renameSync(source, dest);
        } catch (e) {
            fs.copyFileSync(source, dest);
        }
        archived.filename = path.basename(dest);
        archived.path = publicPathFromAttachmentFullPath(dest);
        forgetTemporaryAttachment(normalizedAttachmentPublicPath(originalPublicPath));
        return archived;
    });
}

function groupApps(projectGroupId) {
    return applications.filter(app => applicationProjectGroupId(app) === projectGroupId);
}

function groupPayments(projectGroupId) {
    return payments.filter(pay => applicationProjectGroupId(appForPayment(pay)) === projectGroupId);
}

function groupInvoices(projectGroupId) {
    return invoices.filter(inv => applicationProjectGroupId(appForInvoice(inv)) === projectGroupId);
}

function groupOcrJobs(projectGroupId) {
    return (invoiceOcrJobs || []).filter(job => applicationProjectGroupId(appForOcrJob(job)) === projectGroupId);
}

function groupInvoiceDrafts(projectGroupId) {
    return (invoiceDraftBatches || []).filter(draft => applicationProjectGroupId(appForInvoiceDraft(draft)) === projectGroupId);
}

function writeProjectRootManifest(app) {
    if (!app) return;
    const projectGroupId = applicationProjectGroupId(app);
    const projectDir = projectArchiveDirForApp(app);
    const apps = groupApps(projectGroupId);
    const pays = groupPayments(projectGroupId);
    const invs = groupInvoices(projectGroupId);
    const ocrs = groupOcrJobs(projectGroupId);
    const drafts = groupInvoiceDrafts(projectGroupId);
    const { year, month } = archiveDatePartsForApp(apps[0] || app);
    writeJsonFile(path.join(projectDir, 'manifest.json'), {
        type: 'project',
        projectGroupId,
        owner: app.applicant || app.owner || '',
        year,
        month,
        projectName: app.projectName || '',
        latestAppId: apps[apps.length - 1]?.id || app.id || '',
        applicationIds: apps.map(item => item.id).filter(Boolean),
        paymentIds: pays.map(item => item.id).filter(Boolean),
        invoiceBatchIds: [...new Set(invs.map(item => item.batchId).filter(Boolean))],
        invoiceIds: invs.map(item => item.id).filter(Boolean),
        ocrJobIds: ocrs.map(item => item.id).filter(Boolean),
        invoiceDraftIds: drafts.map(item => item.id).filter(Boolean),
        updatedAt: new Date().toLocaleString('zh-CN')
    });
    app.archive = {
        ...(app.archive || {}),
        projectRoot: publicPathFromAttachmentFullPath(projectDir),
        projectGroupId,
        updatedAt: new Date().toLocaleString('zh-CN')
    };
}

function writeApplicationManifest(app) {
    if (!app) return;
    const projectGroupId = applicationProjectGroupId(app);
    const projectDir = projectArchiveDirForApp(app);
    const recordDir = path.join(projectDir, '01-项目申请记录', app.id || '未编号');
    ensureDir(path.join(recordDir, 'attachments'));
    writeJsonFile(path.join(recordDir, 'manifest.json'), {
        type: 'application',
        id: app.id || '',
        projectGroupId,
        previousAppId: app.previousAppId || '',
        revisionNo: app.revisionNo || 1,
        status: app.status || '',
        applicant: app.applicant || '',
        projectName: app.projectName || '',
        date: app.date || '',
        attachments: app.attachments || [],
        updatedAt: new Date().toLocaleString('zh-CN')
    });
    app.archive = {
        ...(app.archive || {}),
        recordDir: publicPathFromAttachmentFullPath(recordDir),
        projectGroupId,
        updatedAt: new Date().toLocaleString('zh-CN')
    };
    writeProjectRootManifest(app);
}

function archiveApplicationAttachments(app) {
    if (!app) return;
    const projectGroupId = applicationProjectGroupId(app);
    const recordDir = path.join(projectArchiveDirForApp(app), '01-项目申请记录', app.id || '未编号');
    app.attachments = archiveAttachmentList(app.attachments, path.join(recordDir, 'attachments'), {
        recordType: 'application',
        recordId: app.id || '',
        projectGroupId,
        archivedAt: new Date().toLocaleString('zh-CN')
    });
    writeApplicationManifest(app);
}

function writePaymentManifest(payment, app = null) {
    const projectApp = app || appForPayment(payment);
    if (!payment || !projectApp) return;
    const projectGroupId = applicationProjectGroupId(projectApp);
    const recordDir = path.join(projectArchiveDirForApp(projectApp), '02-付款申请记录', payment.id || '未编号');
    ensureDir(path.join(recordDir, 'attachments'));
    writeJsonFile(path.join(recordDir, 'manifest.json'), {
        type: 'payment',
        id: payment.id || '',
        projectId: payment.projectId || '',
        projectGroupId,
        previousPayId: payment.previousPayId || '',
        revisionNo: payment.revisionNo || 1,
        status: payment.status || '',
        applicant: payment.applicant || '',
        date: payment.date || '',
        attachments: payment.attachments || [],
        executionParticipants: payment.executionParticipants || [],
        updatedAt: new Date().toLocaleString('zh-CN')
    });
    payment.archive = {
        ...(payment.archive || {}),
        recordDir: publicPathFromAttachmentFullPath(recordDir),
        projectGroupId,
        updatedAt: new Date().toLocaleString('zh-CN')
    };
    writeProjectRootManifest(projectApp);
}

function archivePaymentAttachments(payment, app = null) {
    const projectApp = app || appForPayment(payment);
    if (!payment || !projectApp) return;
    const projectGroupId = applicationProjectGroupId(projectApp);
    const recordDir = path.join(projectArchiveDirForApp(projectApp), '02-付款申请记录', payment.id || '未编号');
    payment.attachments = archiveAttachmentList(payment.attachments, path.join(recordDir, 'attachments'), {
        recordType: 'payment',
        recordId: payment.id || '',
        projectGroupId,
        archivedAt: new Date().toLocaleString('zh-CN')
    });
    writePaymentManifest(payment, projectApp);
}

function temporaryArchiveDirForApp(app, recordId) {
    return path.join(projectArchiveDirForApp(app), '05-临时识别与草稿记录', recordId || '未编号');
}

function archiveOcrAttachment(job, app = null) {
    const projectApp = app || appForOcrJob(job);
    if (!job || !projectApp || !job.attachment) return;
    const projectGroupId = applicationProjectGroupId(projectApp);
    const recordDir = temporaryArchiveDirForApp(projectApp, job.id || 'OCR');
    const archivedList = archiveAttachmentList([job.attachment], path.join(recordDir, 'attachments'), {
        recordType: 'ocrJob',
        recordId: job.id || '',
        projectGroupId,
        archivedAt: new Date().toLocaleString('zh-CN')
    });
    job.attachment = normalizeAttachmentRecord(archivedList[0] || job.attachment, {
        state: job.attachment?.state || '临时识别',
        linkedOcrJobId: job.id || '',
        linkedAppId: job.appId || projectApp.id || '',
        uploadedBy: job.attachment?.uploadedBy || job.owner || '',
        uploadedAt: job.attachment?.uploadedAt || job.createdAt || '',
        updatedAt: new Date().toLocaleString('zh-CN')
    });
    if (job.item?.attachment) job.item.attachment = job.attachment;
    job.filePath = attachmentFullPathFromPublicPath(job.attachment.path) || job.filePath;
    writeOcrJobManifest(job, projectApp);
}

function writeOcrJobManifest(job, app = null) {
    const projectApp = app || appForOcrJob(job);
    if (!job || !projectApp || !job.id) return;
    const projectGroupId = applicationProjectGroupId(projectApp);
    const recordDir = temporaryArchiveDirForApp(projectApp, job.id);
    ensureDir(path.join(recordDir, 'attachments'));
    const linkedDraftIds = [...new Set((invoiceDraftBatches || [])
        .filter(draft => (draft.items || []).some(item =>
            item.ocrJobId === job.id ||
            item.attachment?.linkedOcrJobId === job.id ||
            attachmentMatches(item.attachment, job.attachment)
        ))
        .map(draft => draft.id)
        .filter(Boolean))];
    const linkedInvoiceIds = [...new Set((invoices || [])
        .filter(inv => inv.attachment?.linkedOcrJobId === job.id || attachmentMatches(inv.attachment, job.attachment))
        .map(inv => inv.id)
        .filter(Boolean))];
    const linkedBatchIds = [...new Set((invoices || [])
        .filter(inv => inv.attachment?.linkedOcrJobId === job.id || attachmentMatches(inv.attachment, job.attachment))
        .map(inv => inv.batchId)
        .filter(Boolean))];
    writeJsonFile(path.join(recordDir, 'manifest.json'), {
        type: 'ocrJob',
        id: job.id || '',
        batchId: job.batchId || '',
        appId: job.appId || projectApp.id || '',
        projectGroupId,
        status: job.status || '',
        attachmentState: job.attachment?.state || '',
        owner: job.owner || '',
        ownerRole: job.ownerRole || '',
        expectedKeys: job.expectedKeys || [],
        invoiceNo: job.item?.invoiceNo || job.extracted?.invoiceNo || '',
        sellerName: job.item?.sellerName || job.extracted?.sellerName || '',
        buyerName: job.item?.buyerName || job.extracted?.buyerName || '',
        amount: toMoney(job.item?.amount || job.extracted?.amount),
        invoiceDate: job.item?.invoiceDate || job.extracted?.invoiceDate || '',
        parseSource: job.item?.parseSource || job.extracted?.parseSource || '',
        error: job.error || '',
        attachment: job.attachment || null,
        linkedDraftIds,
        linkedInvoiceIds,
        linkedBatchIds,
        createdAt: job.createdAt || '',
        updatedAt: job.updatedAt || new Date().toLocaleString('zh-CN')
    });
    job.archive = {
        ...(job.archive || {}),
        recordDir: publicPathFromAttachmentFullPath(recordDir),
        projectGroupId,
        updatedAt: new Date().toLocaleString('zh-CN')
    };
    writeProjectRootManifest(projectApp);
}

function writeDraftManifest(draft, app = null) {
    const projectApp = app || appForInvoiceDraft(draft);
    if (!draft || !projectApp || !draft.id) return;
    const projectGroupId = applicationProjectGroupId(projectApp);
    const recordDir = temporaryArchiveDirForApp(projectApp, draft.id);
    const attachments = (draft.items || []).map(item => item.attachment).filter(Boolean);
    const linkedOcrJobIds = [...new Set((draft.items || []).map(item => item.ocrJobId || item.attachment?.linkedOcrJobId).filter(Boolean))];
    const invoiceNos = [...new Set((draft.items || []).map(item => item.invoiceNo).filter(Boolean))];
    writeJsonFile(path.join(recordDir, 'manifest.json'), {
        type: 'invoiceDraft',
        id: draft.id || '',
        appId: draft.appId || projectApp.id || '',
        projectGroupId,
        status: draft.status || '草稿',
        owner: draft.owner || '',
        createdBy: draft.createdBy || '',
        expectedKeys: draft.expectedKeys || [],
        detailLabel: draft.detailLabel || '',
        need: toMoney(draft.need),
        checked: toMoney(draft.checked),
        noInvoice: !!draft.noInvoice,
        noInvoiceAmount: toMoney(draft.noInvoiceAmount),
        employeeNote: draft.employeeNote || '',
        itemCount: (draft.items || []).length,
        invoiceNos,
        linkedOcrJobIds,
        submittedBatchId: draft.submittedBatchId || '',
        attachments,
        createdAt: draft.createdAt || '',
        updatedAt: draft.updatedAt || new Date().toLocaleString('zh-CN')
    });
    draft.archive = {
        ...(draft.archive || {}),
        recordDir: publicPathFromAttachmentFullPath(recordDir),
        projectGroupId,
        updatedAt: new Date().toLocaleString('zh-CN')
    };
    linkedOcrJobIds.forEach(id => {
        const job = (invoiceOcrJobs || []).find(item => item.id === id);
        if (job) {
            try {
                writeOcrJobManifest(job, projectApp);
            } catch (archiveErr) {
                job.archiveError = archiveErr.message;
                console.error('[归档] 草稿关联OCR清单写入失败:', archiveErr);
            }
        }
    });
    writeProjectRootManifest(projectApp);
}

function writeInvoiceBatchManifest(app, batchId, targets, drafts = []) {
    if (!app || !batchId) return;
    const projectGroupId = applicationProjectGroupId(app);
    const recordDir = path.join(projectArchiveDirForApp(app), '03-发票申请记录', batchId);
    ensureDir(path.join(recordDir, 'invoice-files'));
    ensureDir(path.join(recordDir, 'no-invoice-files'));
    writeJsonFile(path.join(recordDir, 'manifest.json'), {
        type: 'invoiceBatch',
        batchId,
        appId: app.id || '',
        projectGroupId,
        statusList: [...new Set((targets || []).map(inv => inv.status || '').filter(Boolean))],
        owner: (targets || [])[0]?.owner || (targets || [])[0]?.createdBy || '',
        invoiceIds: (targets || []).map(inv => inv.id).filter(Boolean),
        invoiceNos: (targets || []).map(inv => inv.invoiceNo).filter(Boolean),
        draftIds: (drafts || []).map(draft => draft.id).filter(Boolean),
        attachments: (targets || []).map(inv => inv.attachment).filter(Boolean),
        noInvoiceCount: (targets || []).filter(inv => inv.invoiceType === '无票提报').length,
        amount: roundMoney((targets || []).reduce((sum, inv) => sum + toMoney(inv.amount), 0)),
        updatedAt: new Date().toLocaleString('zh-CN')
    });
    (targets || []).forEach(inv => {
        inv.archive = {
            ...(inv.archive || {}),
            recordDir: publicPathFromAttachmentFullPath(recordDir),
            projectGroupId,
            updatedAt: new Date().toLocaleString('zh-CN')
        };
    });
    writeProjectRootManifest(app);
}

function archiveInvoiceBatchAttachments(appId, batchId, targets, drafts = []) {
    const app = applications.find(item => item.id === appId) || appForInvoice((targets || [])[0]);
    if (!app || !batchId) return;
    const projectGroupId = applicationProjectGroupId(app);
    const recordDir = path.join(projectArchiveDirForApp(app), '03-发票申请记录', batchId);
    const invoiceDir = path.join(recordDir, 'invoice-files');
    (targets || []).forEach(inv => {
        if (!inv.attachment) return;
        const archivedList = archiveAttachmentList([inv.attachment], invoiceDir, {
            recordType: 'invoiceBatch',
            recordId: batchId,
            projectGroupId,
            archivedAt: new Date().toLocaleString('zh-CN')
        });
        inv.attachment = archivedList[0] || inv.attachment;
        (invoiceOcrJobs || []).forEach(job => {
            if (!job.attachment) return;
            const sameFile = job.attachment.filename && job.attachment.filename === inv.attachment.originalPath?.split('/').pop();
            const samePath = job.attachment.path && job.attachment.path === inv.attachment.originalPath;
            if (sameFile || samePath) {
                job.attachment = inv.attachment;
                job.filePath = attachmentFullPathFromPublicPath(inv.attachment.path) || job.filePath;
                job.updatedAt = new Date().toLocaleString('zh-CN');
                try {
                    writeOcrJobManifest(job, app);
                } catch (archiveErr) {
                    job.archiveError = archiveErr.message;
                    console.error('[归档] 发票批次关联OCR清单写入失败:', archiveErr);
                }
            }
        });
    });
    (drafts || []).forEach(draft => {
        (draft.items || []).forEach(item => {
            if (!item.attachment) return;
            const target = (targets || []).find(inv => inv.invoiceNo && inv.invoiceNo === item.invoiceNo && inv.attachment);
            if (target) item.attachment = target.attachment;
        });
        try {
            writeDraftManifest(draft, app);
        } catch (archiveErr) {
            draft.archiveError = archiveErr.message;
            console.error('[归档] 发票草稿清单写入失败:', archiveErr);
        }
    });
    writeInvoiceBatchManifest(app, batchId, targets, drafts);
}

function writeInvoiceAuditArchive(record) {
    if (!record) return;
    const app = applications.find(item => item.id === record.appId) || appForInvoice(invoices.find(inv => inv.batchId === record.batchId));
    if (!app) return;
    const recordDir = path.join(projectArchiveDirForApp(app), '04-审核留痕', record.id || 'AUDIT');
    writeJsonFile(path.join(recordDir, 'manifest.json'), {
        type: 'invoiceAudit',
        ...record,
        projectGroupId: applicationProjectGroupId(app),
        updatedAt: new Date().toLocaleString('zh-CN')
    });
    writeProjectRootManifest(app);
}

function normalizedPayeeAccountType(record) {
    const explicit = String(record?.payeeAccountType || '').trim();
    return PAYEE_ACCOUNT_TYPES.has(explicit) ? explicit : '';
}

function canonicalAccountKey(value) {
    return String(value || '').trim().toLowerCase();
}

// Explicit classification is authoritative; historical names alone grant no exemption.
function supplierBankIsOptional(record){return invoicePolicy.supplierBankIsOptional(record);}

function supplierRecordsById(id, records = suppliers) {
    const key = String(id || '').trim();
    return key ? (records || []).filter(record => String(record?.id || '').trim() === key) : [];
}

function uniqueSupplierById(id, records = suppliers) {
    const matches = supplierRecordsById(id, records);
    if (matches.length > 1) {
        const error = new Error('收款对象ID存在重复，必须先完成主数据修复');
        error.statusCode = 409;
        error.code = 'duplicate-supplier-id';
        throw error;
    }
    return matches[0] || null;
}

function supplierClassificationVersion(record) {
    const value = Number(record?.classificationVersion);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function canonicalSupplierReferenceName(value) {
    return String(value || '').trim().toLowerCase();
}

const SUPPLIER_REFERENCE_ID_KEYS = /(?:^|_)(?:supplier|payeeAccount)(?:Id)?$/i;
const SUPPLIER_REFERENCE_NAME_KEYS = /(?:^|_)(?:supplier|supplierName|realSupplier|sellerName|payeeName)$/i;

function valueReferencesSupplier(value, record, parentKey = '') {
    if (Array.isArray(value)) return value.some(item => valueReferencesSupplier(item, record, parentKey));
    if (value && typeof value === 'object') {
        return Object.entries(value).some(([key, item]) => valueReferencesSupplier(item, record, key));
    }
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    const text = String(value).trim();
    if (!text) return false;
    if (SUPPLIER_REFERENCE_ID_KEYS.test(parentKey) && text === String(record?.id || '').trim()) return true;
    return SUPPLIER_REFERENCE_NAME_KEYS.test(parentKey)
        && canonicalSupplierReferenceName(text) === canonicalSupplierReferenceName(record?.name);
}

function valueContainsExactSupplierId(value, supplierId) {
    if (Array.isArray(value)) return value.some(item => valueContainsExactSupplierId(item, supplierId));
    if (value && typeof value === 'object') return Object.values(value).some(item => valueContainsExactSupplierId(item, supplierId));
    return (typeof value === 'string' || typeof value === 'number')
        && String(value).trim() === String(supplierId || '').trim();
}

function supplierReferenceCount(record, state = currentDataState()) {
    const businessCollections = [
        state.applications, state.payments, state.debts, state.invoices, state.invoiceDraftBatches,
        state.bonusConfirmations, state.employeeSettlements, state.projectClosureRecords, state.paymentCorrectionRecords
    ];
    const auditCollections = [
        state.invoiceAuditRecords, state.accountLifecycleAuditRecords, state.supplierClassificationAuditRecords,
        state.mailSendRecords, state.exportAuditRecords, state.logs
    ];
    const businessCount = businessCollections.reduce((total, collection) => total + (Array.isArray(collection)
        ? collection.filter(item => valueReferencesSupplier(item, record)).length
        : 0), 0);
    return businessCount + auditCollections.reduce((total, collection) => total + (Array.isArray(collection)
        ? collection.filter(item => valueReferencesSupplier(item, record) || valueContainsExactSupplierId(item, record?.id)).length
        : 0), 0);
}

function supplierIdentityConflict(record, records = suppliers) {
    const id = String(record?.id || '').trim();
    const bankKey = String(record?.bankAccount || '').trim().toLowerCase();
    const employeeKey = normalizedPayeeAccountType(record) === 'employee-payee'
        ? canonicalAccountKey(record?.linkedEmployeeUsername)
        : '';
    return {
        duplicateId: Boolean(id && supplierRecordsById(id, records).length > 1),
        duplicateBankAccount: Boolean(!supplierBankIsOptional(record) && bankKey && (records || []).filter(item => (
            !supplierBankIsOptional(item) && String(item?.bankAccount || '').trim().toLowerCase() === bankKey
        )).length > 1),
        duplicateEmployeeLink: Boolean(employeeKey && (records || []).filter(item => (
            normalizedPayeeAccountType(item) === 'employee-payee'
            && canonicalAccountKey(item?.linkedEmployeeUsername) === employeeKey
        )).length > 1),
        emptyRequiredBankAccount: Boolean(
            ['formal-supplier', 'company-payee'].includes(normalizedPayeeAccountType(record))
            && !supplierBankIsOptional(record)
            && !String(record?.bankAccount || '').trim()
        )
    };
}

function assertSupplierReadyForNewBusiness(record, records = suppliers) {
    const type = normalizedPayeeAccountType(record);
    if (!type) {
        const error = new Error('历史收款对象尚未分类，请由Admin先确认类型');
        error.statusCode = 409;
        error.code = 'supplier-unclassified';
        throw error;
    }
    const conflict = supplierIdentityConflict(record, records);
    if (conflict.duplicateId || conflict.duplicateBankAccount || conflict.duplicateEmployeeLink || conflict.emptyRequiredBankAccount) {
        const error = new Error('收款对象存在重复标识、重复银行账号、重复员工关联或必填银行账号缺失，修复前不得进入新业务');
        error.statusCode = 409;
        error.code = 'supplier-identity-conflict';
        throw error;
    }
    return record;
}

function supplierAdminView(record, state = currentDataState()) {
    return {
        ...record,
        classificationStatus: normalizedPayeeAccountType(record) ? 'classified' : 'unclassified',
        classificationVersion: supplierClassificationVersion(record),
        referenceCount: supplierReferenceCount(record, state),
        identityConflict: supplierIdentityConflict(record, state.suppliers)
    };
}

function commitSupplierMutation(next, action) {
    if (supplierMutationFailureActions.has(action)) {
        supplierMutationFailureActions.delete(action);
        throw new Error(`测试注入：收款对象${action}保存失败`);
    }
    saveDataState(next);
    assignDataState(next);
}

function payeeAccountByIdOrName(item) {
    const id = String(item?.payeeAccountId || '').trim();
    const selectable = record => {
        if (!record || record.enabled === false) return false;
        if (normalizedPayeeAccountType(record) !== 'employee-payee') return true;
        return Boolean(activeAccountByUsername(record.linkedEmployeeUsername));
    };
    if (id) {
        const record = uniqueSupplierById(id);
        if (!record || !selectable(record)) return null;
        return assertSupplierReadyForNewBusiness(record);
    }
    const name = normalizeText(item?.supplier || '');
    if (!name) return null;
    const candidates = (suppliers || []).filter(record => selectable(record) && normalizeText(record.name) === name);
    const requestedType = String(item?.payeeAccountType || '').trim();
    if (requestedType) {
        const record = candidates.find(candidate => normalizedPayeeAccountType(candidate) === requestedType) || null;
        return record ? assertSupplierReadyForNewBusiness(record) : null;
    }
    if (candidates.length === 1) return assertSupplierReadyForNewBusiness(candidates[0]);
    if (candidates.length > 1) {
        const error = new Error('收款对象名称对应多条主数据，请明确选择收款对象');
        error.statusCode = 409;
        error.code = 'duplicate-supplier-name';
        throw error;
    }
    return null;
}

function normalizeDebtCostPayeeItems(items) {
    if (!Array.isArray(items)) return items;
    return items.map((item, index) => {
        const label = `第${index + 1}条欠款成本`;
        const payeeAccountId = String(item?.payeeAccountId || '').trim();
        if (!payeeAccountId) {
            const error = new Error(`${label}请选择收款对象`);
            error.statusCode = 400;
            throw error;
        }
        const payee = uniqueSupplierById(payeeAccountId);
        if (!payee || payee.enabled === false) {
            const error = new Error(`${label}的收款对象不存在或已停用`);
            error.statusCode = 400;
            throw error;
        }
        assertSupplierReadyForNewBusiness(payee);
        const payeeAccountType = normalizedPayeeAccountType(payee);
        if (!invoicePolicy.debtPayeeEligible(payee)) {
            const error=new Error(label+'只能选择有效正式授权供应商');error.statusCode=400;throw error;
        }
        const submittedName = String(item?.supplier || '').trim();
        if (submittedName && normalizeText(submittedName) !== normalizeText(payee.name)) {
            const error = new Error(`${label}的名称与所选收款对象不一致`);
            error.statusCode = 400;
            throw error;
        }
        const submittedType = String(item?.payeeAccountType || '').trim();
        if (submittedType && submittedType !== payeeAccountType) {
            const error = new Error(`${label}的类型与所选收款对象不一致`);
            error.statusCode = 400;
            throw error;
        }
        return {
            ...item,
            supplier: String(payee.name || '').trim(),
            payeeAccountId: String(payee.id || '').trim(),
            payeeAccountType,
            linkedEmployeeUsername: ''
        };
    });
}

function payeeIdentityForItem(item) {
    const explicitType = String(item?.payeeAccountType || '').trim();
    if (PAYEE_ACCOUNT_TYPES.has(explicitType)) {
        return {
            type: explicitType,
            id: String(item?.payeeAccountId || '').trim(),
            linkedEmployeeUsername: String(item?.linkedEmployeeUsername || '').trim(),
            structured: true
        };
    }
    return { type: '', id: '', linkedEmployeeUsername: '', structured: false };
}

function payeeTypeLabel(identity, legacyReplacement, knownFormalSupplier) {
    if (identity.type === 'employee-payee') return '员工收款账号';
    if (identity.type === 'company-payee') return '公司收款账号';
    if (identity.type === 'formal-supplier') return '正式供应商';
    return '历史未分类';
}

function nextSupplierRecordId(records = suppliers) {
    const maximum = (records || []).reduce((max, record) => {
        const match = String(record?.id || '').match(/^SUP(\d+)$/i);
        return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return 'SUP' + String(maximum + 1).padStart(4, '0');
}

function snapshotDirectoryTree(rootDir) {
    if (!rootDir || !fs.existsSync(rootDir)) return { existed: false, files: [] };
    const files = [];
    const visit = dir => {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) visit(fullPath);
            else if (entry.isFile()) files.push({ relativePath: path.relative(rootDir, fullPath), content: fs.readFileSync(fullPath) });
        });
    };
    visit(rootDir);
    return { existed: true, files };
}

function restoreDirectoryTree(rootDir, snapshot) {
    if (fs.existsSync(rootDir)) fs.rmSync(rootDir, { recursive: true, force: true });
    if (!snapshot?.existed) return;
    snapshot.files.forEach(file => {
        const fullPath = path.join(rootDir, file.relativePath);
        ensureDir(path.dirname(fullPath));
        fs.writeFileSync(fullPath, file.content);
    });
}

function commitInvoiceTransaction({ appId, mutate, archive }) {
    const originalState = currentDataState();
    const nextState = cloneCurrentDataState();
    assignDataState(nextState);
    const app = applications.find(item => item.id === appId) || null;
    const archiveRoot = app ? projectArchiveDirForApp(app) : '';
    const archiveSnapshot = archiveRoot ? snapshotDirectoryTree(archiveRoot) : null;
    try {
        const result = mutate();
        if (invoiceReviewArchiveFailurePending) {
            invoiceReviewArchiveFailurePending = false;
            throw new Error('模拟发票审核归档失败');
        }
        if (archive) archive(result);
        if (invoiceReviewSaveFailurePending) {
            invoiceReviewSaveFailurePending = false;
            throw new Error('模拟发票审核业务保存失败');
        }
        if (invoiceReviewLogFailurePending) {
            invoiceReviewLogFailurePending = false;
            throw new Error('模拟发票审核日志保存失败');
        }
        saveDataState(currentDataState());
        return result;
    } catch (error) {
        assignDataState(originalState);
        if (archiveRoot) {
            try { restoreDirectoryTree(archiveRoot, archiveSnapshot); } catch (restoreError) {
                console.error('[发票事务] 归档回滚失败:', restoreError);
            }
        }
        throw error;
    }
}

function getInvoiceExpectedItems(filterUser = null) {
    const supplierNames = new Set((suppliers || []).map(s => normalizeText(s.name)));
    const rows = [];
    const debtCostUsed = new Map();
    (applications || []).forEach(app => {
        if (app.status === 'rejected' || app.status === 'closed-hidden') return;
        if (app.status !== 'approved') return;
        const approvedPayments = approvedPaymentsForApp(app.id);
        if (!approvedPayments.length) return;

        approvedPayments.forEach(pay => {
            const rowApplicant = pay.applicant || app.applicant || '';
            if (filterUser && rowApplicant !== filterUser && app.applicant !== filterUser) return;

            const hasPaymentItems = Array.isArray(pay.items);
            const sourceItems = hasPaymentItems ? pay.items : (app.items || []);
            (sourceItems || []).forEach((item, index) => {
                const supplier = item.supplier || item.content || item.item || '未填写';
                const expectedAmount = roundMoney(toMoney(item.amount));
                if (expectedAmount <= 0) return;
                const normalizedSupplier = normalizeText(supplier);
                const payeeIdentity = payeeIdentityForItem(item);
                const legacyReplacement = false;
                const isReplacementRow = payeeIdentity.structured
                    ? payeeIdentity.type === 'employee-payee' || payeeIdentity.type === 'company-payee'
                    : legacyReplacement;
                rows.push({
                    key: hasPaymentItems ? [app.id, pay.id, index].join(':') : app.id + ':' + index,
                    appId: app.id,
                    paymentId: pay.id || '',
                    paymentIds: pay.id ? [pay.id] : [],
                    paymentNo: pay.id || '',
                    projectName: app.projectName || app.id,
                    applicant: rowApplicant,
                    item: item.item || '',
                    content: item.content || '',
                    supplier,
                    supplierType: payeeTypeLabel(payeeIdentity, legacyReplacement, supplierNames.has(normalizedSupplier)),
                    isReplacementRow,
                    payeeAccountId: payeeIdentity.id,
                    payeeAccountType: payeeIdentity.type,
                    linkedEmployeeUsername: payeeIdentity.linkedEmployeeUsername,
                    isProxy: item.isProxy || '',
                    expectedAmount,
                    normalizedSupplier,
                    projectMonth: normalizeMonth(app.startDate || ''),
                    activityDateMissing: !String(app.startDate || '').trim(),
                    sourceType: hasPaymentItems ? 'payment' : 'application-fallback',
                    sourceId: hasPaymentItems ? (pay.id || '') : (app.id || ''),
                    sourceIndex: index
                });
            });

            const debtRepaymentRows = Array.isArray(pay.debtRepayments)
                ? pay.debtRepayments
                : (approvedPayments.indexOf(pay) === 0 ? (app.debtLinks || []).map(link => ({ debtId: link.debtId || '', debtLinkId: link.id || '', originalPrincipal: roundMoney(link.originalPrincipal), plannedPrincipal: roundMoney(link.principal), confirmedPrincipal: roundMoney(link.principal), allocatedCost: roundMoney(link.allocatedCost), costAllocations: link.costAllocations || [], legacy: true })) : []);
            debtRepaymentRows.forEach((detail, linkIndex) => {
                if (toMoney(detail.confirmedPrincipal) <= 0) return;
                (detail.costAllocations || []).forEach((cost, costIndex) => {
                    const supplier = cost.supplier || '未填写';
                    const debtRecord = (debts || []).find(record => record.id === detail.debtId);
                    const debtCosts = Array.isArray(debtRecord?.costItems) ? debtRecord.costItems : [];
                    const duplicateId = debtCosts.filter(item => String(item?.id || '') === String(cost.costItemId || '')).length !== 1;
                    const costItemIndex = Number.isInteger(cost.costItemIndex) && cost.costItemIndex >= 0 && cost.costItemIndex < debtCosts.length
                        ? cost.costItemIndex
                        : (!duplicateId ? debtCosts.findIndex(item => String(item?.id || '') === String(cost.costItemId || '')) : costIndex);
                    const costLimit = costItemIndex >= 0 ? toMoney(debtCosts[costItemIndex]?.amount) : toMoney(cost.amount);
                    const costKey = String(detail.debtId || '') + ':' + costItemIndex;
                    const costRemaining = Math.max(0, roundMoney(costLimit - toMoney(debtCostUsed.get(costKey))));
                    const expectedAmount = Math.min(roundMoney(toMoney(cost.amount)), costRemaining);
                    if (expectedAmount <= 0) return;
                    debtCostUsed.set(costKey, roundMoney(toMoney(debtCostUsed.get(costKey)) + expectedAmount));
                    const normalizedSupplier = normalizeText(supplier);
                    const payeeIdentity = payeeIdentityForItem(cost);
                    const legacyReplacement = false;
                    const isReplacementRow = payeeIdentity.structured
                        ? payeeIdentity.type === 'employee-payee' || payeeIdentity.type === 'company-payee'
                        : legacyReplacement;
                    rows.push({
                        key: [app.id, pay.id, 'debt', detail.debtLinkId || linkIndex, cost.costItemId || costIndex].join(':'), appId: app.id, paymentId: pay.id || '', paymentIds: pay.id ? [pay.id] : [], paymentNo: pay.id || '', projectName: app.projectName || app.id, applicant: rowApplicant,
                        item: cost.item || '欠款归还供应商成本', content: cost.content || '', supplier, supplierType: payeeTypeLabel(payeeIdentity, legacyReplacement, supplierNames.has(normalizedSupplier)), isReplacementRow, payeeAccountId: payeeIdentity.id, payeeAccountType: payeeIdentity.type, linkedEmployeeUsername: payeeIdentity.linkedEmployeeUsername, isProxy: '否', expectedAmount, normalizedSupplier,
                        projectMonth: normalizeMonth(app.startDate || ''), activityDateMissing: !String(app.startDate || '').trim(), sourceType: 'debt-repayment', sourceId: detail.debtId || '', sourceIndex: costIndex,
                        debtRepayment: { debtId: detail.debtId || '', debtLinkId: detail.debtLinkId || '', originalPrincipal: roundMoney(detail.originalPrincipal), principal: roundMoney(detail.confirmedPrincipal), plannedPrincipal: roundMoney(detail.plannedPrincipal), ratio: toMoney(detail.ratio), allocatedCost: roundMoney(detail.allocatedCost), realSupplier: supplier, legacy: Boolean(detail.legacy), note: detail.legacy ? '历史付款按既有口径只读展示。' : '按该次付款已确认归还金额比例向真实供应商核对成本票；不按本金或服务费索票。' }
                    });
                });
            });
        });
    });
    return rows;
}

function extractInvoiceFields(text) {
    const raw = String(text || '');
    const compact = raw.replace(/\r/g, '\n');
    const fields = {};
    const invoiceNoMatch = compact.match(/(?:发票号码|发票号|票据号码|号码|No\.?|NO\.?)\s*[:：]?\s*([A-Z0-9\-]{6,32})/i);
    if (invoiceNoMatch) fields.invoiceNo = invoiceNoMatch[1].trim();

    const dateMatch = compact.match(/((?:20\d{2}|19\d{2})[-年/\.]\d{1,2}[-月/\.]\d{1,2})/);
    if (dateMatch) fields.invoiceDate = dateMatch[1].replace(/[年月\.]/g, '-').replace('日', '');

    const sellerMatch = compact.match(/(?:销售方|开票方|收款方|供应商|卖方)(?:名称)?\s*[:：]?\s*([^\n,，;；]+?)(?=\s*(?:价税合计|合计金额|金额|小计|总计|开票日期|发票号码|发票号|$))/);
    if (sellerMatch) fields.sellerName = sellerMatch[1].trim();

    const knownSupplier = (suppliers || []).find(s => compact.includes(s.name));
    if (!fields.sellerName && knownSupplier) fields.sellerName = knownSupplier.name;

    const nameMatches = [...compact.matchAll(/名称\s*[:：]\s*([^\n,，;；]+)/g)].map(m => m[1].trim());
    if (nameMatches.length >= 1) fields.buyerName = nameMatches[0];
    if (!fields.sellerName && nameMatches.length >= 2) fields.sellerName = nameMatches[1];

    const amountMatches = [...compact.matchAll(/(?:价税合计|合计金额|金额|小计|总计)\s*[:：]?\s*[¥￥]?\s*([0-9]+(?:,[0-9]{3})*(?:\.\d{1,2})?)/g)];
    const amounts = amountMatches.map(m => parseInvoiceMoneyCandidate(m[1])).filter(n => n > 0);
    if (amounts.length) fields.amount = Math.max(...amounts);

    if (/替票|替代发票/.test(compact)) fields.invoiceType = '替票';
    else if (/收据|小票|购物|支付截图|付款截图/.test(compact)) fields.invoiceType = '员工碎票';
    else fields.invoiceType = '发票';

    return fields;
}

function normalizeInvoiceDate(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/(20\d{2}|19\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/);
    if (!match) return raw;
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function runLocalInvoiceOcr(filePath, callback) {
    if (!fs.existsSync(OCR_PYTHON) || !fs.existsSync(OCR_SCRIPT)) {
        callback(new Error(`本地OCR环境未找到，请运行 tools\\ocr\\install_ocr.ps1 修复，或设置 KSESSION_OCR_PYTHON / KSESSION_OCR_SCRIPT。当前 Python: ${OCR_PYTHON}；脚本: ${OCR_SCRIPT}`));
        return;
    }
    execFile(OCR_PYTHON, [OCR_SCRIPT, filePath], {
        windowsHide: true,
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 8,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    }, (err, stdout, stderr) => {
        if (err) {
            const message = stderr || stdout || err.message;
            callback(new Error(message));
            return;
        }
        try {
            const start = stdout.indexOf('{');
            const end = stdout.lastIndexOf('}');
            const parsed = JSON.parse(stdout.slice(start, end + 1));
            const extracted = {
                invoiceNo: parsed.invoiceNo || '',
                buyerName: parsed.buyerName || '',
                sellerName: parsed.sellerName || '',
                amount: parsed.amount || '',
                invoiceDate: normalizeInvoiceDate(parsed.invoiceDate || ''),
                invoiceType: parsed.invoiceType || '发票',
                rawText: parsed.rawText || ''
            };
            callback(null, extracted);
        } catch (parseErr) {
            callback(new Error('OCR输出解析失败：' + parseErr.message));
        }
    });
}

function analyzeInvoice(invoice, expectedRows = null) {
    expectedRows = expectedRows || getInvoiceExpectedItems();
    const invoiceNo = String(invoice.invoiceNo || '').trim();
    const buyerName = invoice.buyerName || '';
    const sellerName = invoice.sellerName || '';
    const amount = toMoney(invoice.amount);
    const duplicateInvoices = invoiceNo
        ? invoices.filter(inv => inv.id !== invoice.id && String(inv.invoiceNo || '').trim() === invoiceNo && isInvoiceOccupying(inv))
        : [];
    const boundKeys = Array.isArray(invoice.expectedKeys) && invoice.expectedKeys.length
        ? invoice.expectedKeys
        : (Array.isArray(invoice.detailAllocations) ? invoice.detailAllocations.map(row => row.key).filter(Boolean) : []);
    const boundRows = boundKeys.length ? expectedRows.filter(row => boundKeys.includes(row.key)) : [];
    const isBoundReplacement = boundRows.length > 0 && boundRows.every(row => row.isReplacementRow);
    const isBoundMultiDetail = boundRows.length > 1 || (Array.isArray(invoice.detailAllocations) && invoice.detailAllocations.length > 1);

    let candidates = expectedRows.map(row => {
        const nameScore = sellerName && row.normalizedSupplier
            ? (normalizeText(sellerName) === row.normalizedSupplier ? 100 : (normalizeText(sellerName).includes(row.normalizedSupplier) || row.normalizedSupplier.includes(normalizeText(sellerName)) ? 70 : 0))
            : 0;
        const amountDiff = Math.abs(row.expectedAmount - amount);
        const amountScore = amount > 0 ? Math.max(0, 100 - amountDiff / Math.max(row.expectedAmount, 1) * 100) : 0;
        const appScore = invoice.appId && invoice.appId === row.appId ? 30 : 0;
        return { ...row, nameScore, amountDiff, amountScore, score: nameScore + amountScore + appScore };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
    if (boundRows.length) {
        const boundTotal = boundRows.reduce((sum, row) => sum + toMoney(row.expectedAmount), 0);
        const boundCandidates = boundRows.map(row => ({
            ...row,
            nameScore: isBoundReplacement ? 100 : (sellerName && normalizeText(sellerName) === row.normalizedSupplier ? 100 : 0),
            amountDiff: Math.abs(boundTotal - amount),
            amountScore: amount > 0 ? Math.max(0, 100 - Math.abs(boundTotal - amount) / Math.max(boundTotal, 1) * 100) : 0,
            score: isBoundReplacement ? 230 : 200
        }));
        const otherCandidates = candidates.filter(row => !boundKeys.includes(row.key));
        candidates = [...boundCandidates, ...otherCandidates].slice(0, 5);
    }

    const best = candidates[0];
    const warnings = [];
    const buyerMismatch = !buyerMatchesCurrent(buyerName);
    if (!buyerName) warnings.push('缺少购买方名称，无法确认是否开给本公司');
    else if (buyerMismatch) warnings.push('购买方不一致：识别为“' + buyerName + '”，应为“' + (configuredBuyerForRead() || '尚未配置的购买方') + '”');
    if (!invoiceNo) warnings.push('缺少发票号码，无法做全系统去重');
    if (duplicateInvoices.length) warnings.push('发票号码重复：已被 ' + duplicateInvoices.map(i => i.id + (i.appId ? '/' + i.appId : '')).join('、') + ' 使用');
    if (!sellerName) warnings.push('缺少开票方名称');
    if (!amount) warnings.push('缺少发票金额');
    if (best && best.nameScore < 70 && !isBoundReplacement) warnings.push('开票方与项目供应商未精确匹配');
    if (best && best.amountDiff > 0.01 && !isBoundMultiDetail) warnings.push('金额与候选明细相差 ¥' + best.amountDiff.toFixed(2));

    let status = '待确认';
    if (duplicateInvoices.length) status = '重复风险';
    else if (!invoiceNo || !sellerName || !amount) status = '待补信息';
    else if (isBoundReplacement && !buyerMismatch) status = '匹配通过';
    else if (best && best.nameScore >= 70 && best.amountDiff <= 0.01) status = '匹配通过';
    else if (best) status = '需人工确认';

    if (!buyerName) status = '待补信息';
    else if (buyerMismatch && status === '匹配通过') status = '需人工确认';

    return {
        status,
        duplicate: duplicateInvoices.length > 0,
        warnings,
        suggestedMatch: best || null,
        candidates
    };
}

function invoiceMonth(value) {
    return normalizeMonth(value);
}

function currentYear() {
    return new Date().getFullYear();
}

function invoiceYear(value) {
    const match = String(value || '').match(/(20\d{2}|19\d{2})/);
    return match ? Number(match[1]) : 0;
}

function monthIndex(yyyyMm) {
    const match = String(yyyyMm || '').match(/(20\d{2}|19\d{2})-(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 12 + Number(match[2]);
}

function projectActivityYears(projectMonths = []) {
    return [...new Set((projectMonths || [])
        .map(month => {
            const match = String(month || '').match(/(20\d{2}|19\d{2})/);
            return match ? Number(match[1]) : 0;
        })
        .filter(Boolean))];
}

function invoiceWithinProjectActivityYear(invoiceDate, projectMonths = []) {
    const invYear = invoiceYear(invoiceDate);
    if (!invYear) return false;
    const years = projectActivityYears(projectMonths);
    if (!years.length) return false;
    return years.includes(invYear);
}

function isLuxuryInvoice(extracted) {
    const text = [
        extracted.invoiceType,
        extracted.sellerName,
        extracted.buyerName,
        extracted.rawText
    ].join(' ').toUpperCase();
    return LUXURY_KEYWORDS.some(word => text.includes(word.toUpperCase()));
}

function draftItemUsageAmount(item) {
    const reserved = toMoney(item.reservedAmount);
    if (reserved > 0) return reserved;
    const allocation = toMoney(item.allocationAmount);
    if (allocation > 0) return allocation;
    const amount = toMoney(item.amount);
    const available = toMoney(item.availableAmount);
    return available > 0 ? Math.min(amount, available) : amount;
}

function usedAmountByInvoiceNo(invoiceNo, options = {}) {
    const no = String(invoiceNo || '').trim();
    if (!no) return 0;
    const excludeDraftIds = new Set(Array.isArray(options.excludeDraftIds) ? options.excludeDraftIds : []);
    const invoiceUsed = invoices
        .filter(inv => String(inv.invoiceNo || '').trim() === no && isInvoiceOccupying(inv))
        .reduce((sum, inv) => sum + toMoney(inv.amount), 0);
    if (!options.includeDrafts) return invoiceUsed;
    const draftUsed = (invoiceDraftBatches || [])
        .filter(draft => isInvoiceDraftOccupying(draft) && !excludeDraftIds.has(draft.id))
        .flatMap(draft => draft.items || [])
        .filter(item => String(item.invoiceNo || '').trim() === no)
        .reduce((sum, item) => sum + draftItemUsageAmount(item), 0);
    return invoiceUsed + draftUsed;
}

function normalizeCandidateInvoiceAvailability(items) {
    const usedInBatch = new Map();
    return (items || []).map(item => {
        const no = String(item.invoiceNo || '').trim();
        if (!no) return item;
        const amount = toMoney(item.amount);
        const baseAvailable = toMoney(item.availableAmount) > 0
            ? Math.min(amount, toMoney(item.availableAmount))
            : Math.max(amount - toMoney(item.usedAmount), 0);
        const alreadyUsed = usedInBatch.get(no) || 0;
        const availableAmount = positiveMoney(baseAvailable - alreadyUsed);
        const nextItem = {
            ...item,
            availableAmount,
            allocationAmount: roundMoney(Math.min(toMoney(item.allocationAmount || amount), availableAmount))
        };
        if (availableAmount <= 0) {
            const warnings = [...(Array.isArray(item.warnings) ? item.warnings : []), '该发票号码已被待提交草稿、待审核或已确认记录占用'];
            nextItem.warnings = uniqueList(warnings);
            nextItem.reasonSummary = uniqueList([
                ...(Array.isArray(item.reasonSummary) ? item.reasonSummary : []),
                '重复发票：该发票号码已被待提交草稿、待审核或已确认记录占用'
            ]);
            nextItem.eligible = false;
            nextItem.checked = false;
            nextItem.resultText = '不符合（移除）';
        }
        usedInBatch.set(no, alreadyUsed + Math.min(amount, availableAmount));
        return nextItem;
    });
}

function firstInvoiceRejectionMessage(items, fallback = '请至少勾选一张符合规则的发票') {
    const rejected = (items || []).find(item => {
        return Array.isArray(item.warnings) && item.warnings.length
            || Array.isArray(item.reasonSummary) && item.reasonSummary.length;
    });
    if (!rejected) return fallback;
    return (rejected.reasonSummary || rejected.warnings || []).join('；') || fallback;
}

function findDuplicateDraftInvoiceNo(drafts) {
    const seen = new Map();
    for (const draft of drafts || []) {
        if (draft.noInvoice) continue;
        for (const item of draft.items || []) {
            const no = String(item.invoiceNo || '').trim();
            if (!no) continue;
            const refs = seen.get(no) || [];
            refs.push(draft.id || '-');
            seen.set(no, refs);
        }
    }
    for (const [invoiceNo, draftIds] of seen.entries()) {
        if (draftIds.length > 1) return { invoiceNo, draftIds: uniqueList(draftIds) };
    }
    return null;
}

function analyzeInvoiceBatchItem(extracted, expectedRow, remainingNeed, user) {
    const warnings = [];
    const invoiceNo = String(extracted.invoiceNo || '').trim();
    const totalAmount = toMoney(extracted.amount);
    const usedAmount = usedAmountByInvoiceNo(invoiceNo, { includeDrafts: true });
    const availableAmount = positiveMoney(totalAmount - usedAmount);
    const buyerOk = buyerMatchesCurrent(extracted.buyerName);
    const sellerOk = expectedRow ? normalizeText(extracted.sellerName) === expectedRow.normalizedSupplier : false;
    const withinActivityYear = invoiceWithinProjectActivityYear(extracted.invoiceDate, [expectedRow?.projectMonth]);
    const luxuryRisk = isLuxuryInvoice(extracted);
    const isAuthorizedEmployee = canCurrentUserUseReplacement(user?.username || '');
    const isPrivilegedUser = false; // Current live account authority is checked above.
    const isEmployeeAlt = !!(expectedRow && expectedRow.isReplacementRow && !sellerOk && (isAuthorizedEmployee || isPrivilegedUser));

    if (!invoiceNo) warnings.push('缺少发票号码');
    if (!extracted.buyerName) warnings.push('缺少购买方名称');
    else if (!buyerOk) warnings.push('购买方与 Admin 配置不一致或尚未配置');
    if (!extracted.sellerName) warnings.push('缺少销售方名称');
    if (expectedRow && !sellerOk && !isEmployeeAlt) warnings.push('销售方与授权供应商不一致');
    if (!withinActivityYear) warnings.push('发票日期不在项目活动当年内');
    if (luxuryRisk) warnings.push('疑似奢侈品采购，不允许作为发票种类');
    if (invoiceNo && usedAmount > 0) warnings.push('该发票号码已有使用记录，请从多余发票池使用剩余额，不能重新上传重复使用');
    if (invoiceNo && availableAmount <= 0) warnings.push('该发票号码金额已被全额使用');

    const canAutoAllocate = Boolean(expectedRow?.payeeAccountType) && invoiceNo && totalAmount > 0 && availableAmount > 0 && buyerOk && withinActivityYear && !luxuryRisk && (sellerOk || isEmployeeAlt);
    const allocationAmount = canAutoAllocate ? roundMoney(Math.min(remainingNeed, availableAmount)) : 0;
    const poolAmount = positiveMoney(availableAmount - allocationAmount);
    const status = warnings.length ? '待管理员审核' : '匹配通过';

    return {
        invoiceNo,
        buyerName: extracted.buyerName || '',
        sellerName: extracted.sellerName || '',
        invoiceDate: extracted.invoiceDate || '',
        invoiceType: isEmployeeAlt ? '替用发票' : (extracted.invoiceType || '发票'),
        amount: totalAmount,
        usedAmount,
        availableAmount,
        allocationAmount,
        poolAmount,
        poolOwnerType: isEmployeeAlt ? 'employee' : 'supplier',
        poolOwner: isEmployeeAlt ? (user?.username || '') : (expectedRow?.supplier || extracted.sellerName || ''),
        warnings,
        status,
        rawText: extracted.rawText || ''
    };
}

let pdfjsLoader = null;

async function loadPdfjs() {
    if (!pdfjsLoader) {
        pdfjsLoader = import('pdfjs-dist/legacy/build/pdf.mjs');
    }
    return pdfjsLoader;
}

async function extractPdfTextFast(filePath) {
    const variants = await extractPdfTextVariants(filePath);
    return variants.defaultText;
}

function normalizePdfCoordinateLine(line) {
    let text = String(line || '').trim();
    let last = '';
    while (last !== text) {
        last = text;
        text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
    }
    return text;
}

function buildPdfCoordinateText(items) {
    const tokens = (items || [])
        .map(item => {
            const transform = item.transform || [];
            return {
                text: String(item.str || '').trim(),
                x: Number(transform[4] || 0),
                y: Number(transform[5] || 0)
            };
        })
        .filter(item => item.text);
    const rows = [];
    const rowThreshold = 3;

    tokens.forEach(token => {
        let row = rows.find(item => Math.abs(item.y - token.y) <= rowThreshold);
        if (!row) {
            row = { y: token.y, items: [] };
            rows.push(row);
        }
        row.items.push(token);
    });

    return rows
        .sort((a, b) => b.y - a.y)
        .map(row => normalizePdfCoordinateLine(
            row.items
                .sort((a, b) => a.x - b.x)
                .map(item => item.text)
                .join('')
        ))
        .filter(Boolean)
        .join('\n')
        .trim();
}

async function extractPdfTextVariants(filePath) {
    const pdfjs = await loadPdfjs();
    const bytes = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjs.getDocument({
        data: bytes,
        disableWorker: true,
        useSystemFonts: true
    }).promise;

    let defaultText = '';
    let coordinateText = '';
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
        const page = await doc.getPage(pageNo);
        const content = await page.getTextContent();
        defaultText += content.items.map(item => item.str || '').join('\n') + '\n';
        coordinateText += buildPdfCoordinateText(content.items) + '\n';
        page.cleanup();
    }
    await doc.destroy();
    return {
        defaultText: defaultText.trim(),
        coordinateText: coordinateText.trim()
    };
}

function uniqueList(values) {
    return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function normalizeChineseInvoiceDate(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/(20\d{2}|19\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?/);
    if (!match) return raw;
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function extractInvoiceAmountFromSmallTotalZone(lines) {
    const normalizedLines = (lines || []).map(line => String(line || '').trim()).filter(Boolean);
    const badLineKeywords = ['年', '月', '日', '号码', '账号', '地址', '电话', '税号', '识别号', '开户', '银行', '身份证', '证件'];
    const readMoneyCandidates = (line) => {
        const text = String(line || '').trim();
        if (!text || /[A-Za-z]/.test(text) || /%/.test(text) || /\d{3,}\.\d{3,}/.test(text)) return [];
        if (badLineKeywords.some(keyword => text.includes(keyword))) return [];
        return [...text.matchAll(/\d+(?:[,，]\d{3})*(?:\.\d{1,2})?/g)]
            .map(match => parseInvoiceMoneyCandidate(match[0]))
            .filter(value => value > 0);
    };

    for (let i = 0; i < normalizedLines.length; i += 1) {
        const compactLine = normalizedLines[i].replace(/\s/g, '');
        if (!compactLine.includes('小写')) continue;

        const candidates = [];
        for (let j = i; j < Math.min(normalizedLines.length, i + 36); j += 1) {
            readMoneyCandidates(normalizedLines[j]).forEach(value => candidates.push(value));
        }
        if (candidates.length) return Math.max(...candidates);
    }
    return 0;
}

function extractChineseInvoiceFields(text) {
    const rawText = String(text || '');
    const joined = rawText.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
    const lines = rawText.replace(/\r/g, '\n').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const fields = {
        invoiceNo: '',
        buyerName: '',
        sellerName: '',
        amount: '',
        invoiceDate: '',
        invoiceType: '',
        rawText
    };
    const isInvoiceLabel = value => /^(名称|号码|日期|金额|价税合计|购买方|销售方|开票方|发票类型|项目名称|项目编号|匹配对象|规格型号|数量|不含税金额|税额|复核|开票人|OCR关键词)[:：]?$/.test(value)
        || /^(货物|应税劳务|服务名称)/.test(value);
    const hasCompanySuffix = value => /(?:有限责任公司|股份有限公司|有限公司|公司|个体工商户[）)]?|个体工商户)$/.test(value);
    const appendCompanyFragment = (value, part) => {
        const compact = String(part || '').replace(/\s/g, '');
        if (!compact || compact.length > 4) return value;
        const merged = value + compact;
        if (/有限公$/.test(value) && /^司/.test(compact)) return merged;
        if (/有限责任公$/.test(value) && /^司/.test(compact)) return merged;
        if (/股份有限公$/.test(value) && /^司/.test(compact)) return merged;
        if (/个体工商$/.test(value) && /^户/.test(compact)) return merged;
        if (/（个体工商$|\(个体工商$/.test(value) && /^户/.test(compact)) return merged;
        if (/个体工商户（?$|个体工商户\($/.test(value) && /^[）)]/.test(compact)) return merged;
        return value;
    };
    const readValueFromLines = (startIndex) => {
        let value = lines[startIndex].replace(/^[:：]\s*/, '').trim();
        for (let k = startIndex + 1; k < Math.min(startIndex + 4, lines.length); k += 1) {
            const part = lines[k].replace(/^[:：]\s*/, '').trim();
            if (!part || isInvoiceLabel(part)) break;
            const merged = appendCompanyFragment(value, part);
            if (merged !== value) {
                value = merged;
                continue;
            }
            const compact = String(part || '').replace(/\s/g, '');
            if (hasCompanySuffix(value) || !/[\u4e00-\u9fa5（）()]/.test(compact) || compact.length > 24) break;
            value += compact;
            if (hasCompanySuffix(value)) break;
        }
        return value;
    };
    const readLabelValue = (labelPattern) => {
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            if (!labelPattern.test(line)) continue;
            const inlineValue = line.replace(labelPattern, '').replace(/^[:：]\s*/, '').trim();
            if (inlineValue) return inlineValue;
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
                const value = lines[j].replace(/^[:：]\s*/, '').trim();
                if (value && !isInvoiceLabel(value)) {
                    return readValueFromLines(j);
                }
            }
        }
        return '';
    };

    const typeLine = rawText.split(/\n+/).find(line => /发票/.test(line));
    fields.invoiceType = typeLine ? typeLine.trim() : '发票';

    const invoiceNoMatch = joined.match(/发票号码[：:\s]*([A-Z0-9]{8,32})/i);
    if (invoiceNoMatch) fields.invoiceNo = invoiceNoMatch[1].trim();
    if (!fields.invoiceNo) {
        const fallbackNo = joined.match(/\b\d{20}\b/);
        if (fallbackNo) fields.invoiceNo = fallbackNo[0];
    }

    const dateMatch = joined.match(/开票日期[：:\s]*((?:20\d{2}|19\d{2})[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)/);
    if (dateMatch) fields.invoiceDate = normalizeChineseInvoiceDate(dateMatch[1]);
    if (!fields.invoiceDate) {
        const fallbackDate = joined.match(/(?:20\d{2}|19\d{2})[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?/);
        if (fallbackDate) fields.invoiceDate = normalizeChineseInvoiceDate(fallbackDate[0]);
    }

    const isUsableCompanyName = value => {
        const text = String(value || '').trim();
        return hasCompanySuffix(text) && !/(开户|银行|支行|账号|地址|电话)/.test(text);
    };
    const companyMatches = uniqueList([...joined.matchAll(/[\u4e00-\u9fa5A-Za-z0-9（）()·\-]{2,}(?:有限责任公司|股份有限公司|有限公司|公司|个体工商户)/g)]
        .map(match => match[0])
        .filter(isUsableCompanyName));
    const explicitBuyer = readLabelValue(/^(?:购买方|购方|买方)(?:名称)?\s*[:：]?/);
    const explicitSeller = readLabelValue(/^(?:销售方|销方|开票方|收款方|供应商|卖方)(?:名称)?\s*[:：]?/);
    const isLikelyBusinessName = value => {
        const text = String(value || '').replace(/^名称\s*[:：]\s*/, '').trim();
        return /[\u4e00-\u9fa5]{4,}/.test(text)
            && !isInvoiceLabel(text)
            && !/(统一社会信用代码|纳税人识别号|发票号码|开票日期|项目名称|规格型号|价税合计|开户|银行|账号|地址|电话)/.test(text)
            && !/^[A-Z0-9]{8,}$/.test(text)
            && !/[¥￥]|\d{4}年|%/.test(text);
    };
    const findSellerNearBuyer = () => {
        if (!fields.buyerName) return '';
        const buyerIndex = lines.findIndex(line => String(line || '').includes(fields.buyerName));
        if (buyerIndex < 0) return '';
        for (let j = buyerIndex + 1; j < Math.min(lines.length, buyerIndex + 8); j += 1) {
            const value = String(lines[j] || '').replace(/^名称\s*[:：]\s*/, '').trim();
            if (value === fields.buyerName) continue;
            if (isLikelyBusinessName(value)) return value;
        }
        return '';
    };
    fields.buyerName = (isUsableCompanyName(explicitBuyer) ? explicitBuyer : '')
        || companyMatches.find(name => buyerMatchesCurrent(name))
        || companyMatches[0]
        || '';
    fields.sellerName = (isUsableCompanyName(explicitSeller) && explicitSeller !== fields.buyerName ? explicitSeller : '')
        || companyMatches.find(name => name !== fields.buyerName)
        || findSellerNearBuyer()
        || '';

    const smallTotalAmount = extractInvoiceAmountFromSmallTotalZone(lines);
    if (smallTotalAmount > 0) {
        fields.amount = smallTotalAmount;
    } else {
        const moneyValues = [...joined.matchAll(/[¥￥]\s*([0-9]+(?:[,，]\d{3})*(?:\.\d{1,2})?)/g)]
            .map(match => parseInvoiceMoneyCandidate(match[1]))
            .filter(value => value > 0);
        if (moneyValues.length) {
            fields.amount = Math.max(...moneyValues);
        } else {
            const smallAmountMatch = joined.match(/[（(]\s*小\s*写\s*[）)]\s*[¥￥]?\s*([0-9]+(?:[,，]\d{3})*(?:\.\d{1,2})?)/);
            if (smallAmountMatch) fields.amount = parseInvoiceMoneyCandidate(smallAmountMatch[1]);
        }
    }

    return fields;
}

function hasUsefulPdfFields(fields) {
    const amount = Number(fields.amount || 0);
    const invoiceNo = String(fields.invoiceNo || '').trim();
    const invoiceDate = String(fields.invoiceDate || '').trim();
    const hasInvoiceNo = /^[A-Z0-9-]{8,32}$/i.test(invoiceNo);
    const hasDate = /^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(invoiceDate);
    return amount > 0 && hasInvoiceNo && hasDate && (!!fields.buyerName || !!fields.sellerName);
}

async function parseInvoiceAttachment(filePath) {
    const ext = path.extname(filePath || '').toLowerCase();
    let pdfError = null;

    if (ext === '.pdf') {
        try {
            const pdfTexts = await extractPdfTextVariants(filePath);
            const attempts = [
                { text: pdfTexts.defaultText, source: 'PDF文本解析' },
                { text: pdfTexts.coordinateText, source: 'PDF文本坐标重排' }
            ];
            const triedTexts = new Set();
            for (const attempt of attempts) {
                if (!attempt.text || triedTexts.has(attempt.text)) continue;
                triedTexts.add(attempt.text);
                const fields = extractChineseInvoiceFields(attempt.text);
                if (hasUsefulPdfFields(fields)) {
                    return { ...fields, parseSource: attempt.source };
                }
            }
            pdfError = new Error('PDF文本层字段不足');
        } catch (err) {
            pdfError = err;
        }
    }

    try {
        const fields = await runLocalInvoiceOcrAsync(filePath);
        return { ...fields, parseSource: 'OCR识别' };
    } catch (err) {
        if (pdfError) {
            err.message = `PDF解析失败：${pdfError.message}；OCR失败：${err.message}`;
        }
        throw err;
    }
}

function runLocalInvoiceOcrAsync(filePath) {
    return new Promise((resolve, reject) => {
        runLocalInvoiceOcr(filePath, (err, extracted) => err ? reject(err) : resolve(extracted));
    });
}

let ocrQueueRunning = false;

function publicOcrJob(job) {
    return {
        id: job.id,
        batchId: job.batchId,
        appId: job.appId,
        expectedKeys: job.expectedKeys || [],
        status: job.status,
        error: job.error || '',
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        attachment: job.attachment,
        item: job.item || null,
        projectClosure: job.projectClosure || null,
        paymentCorrection: job.paymentCorrection || null
    };
}

async function processInvoiceOcrQueue() {
    if (ocrQueueRunning) return;
    const job = invoiceOcrJobs.find(item => item.status === '待识别'
        && item.projectClosure?.result !== 'invalidated'
        && item.paymentCorrection?.result !== 'invalidated'
        && applications.find(app => app.id === item.appId)?.status !== 'closed');
    if (!job) return;

    ocrQueueRunning = true;
    let closedDuringProcessing = false;
    job.status = '识别中';
    job.updatedAt = new Date().toLocaleString('zh-CN');
    try {
        writeOcrJobManifest(job);
    } catch (archiveErr) {
        job.archiveError = archiveErr.message;
        console.error('[归档] OCR识别中清单写入失败:', archiveErr);
    }
    saveData();

    try {
        const extracted = await parseInvoiceAttachment(job.filePath);
        const currentJob = invoiceOcrJobs.find(item => item.id === job.id);
        if (applications.find(app => app.id === job.appId)?.status === 'closed' || currentJob?.paymentCorrection?.result === 'invalidated') {
            closedDuringProcessing = true;
            return;
        }
        const item = analyzeInvoiceCandidateForRows(extracted, job.selectedRows || [], { username: job.owner, role: job.ownerRole });
        job.attachment = normalizeAttachmentRecord(job.attachment, {
            state: '临时识别',
            linkedOcrJobId: job.id,
            linkedAppId: job.appId,
            uploadedBy: job.owner || '',
            uploadedAt: job.createdAt || ''
        });
        item.attachment = job.attachment;
        item.uploadedAt = job.createdAt;
        item.poolStartAt = job.createdAt;
        item.poolExpireAt = poolExpireAtFromStart(job.createdAt);
        item.parseSource = extracted.parseSource || '';
        item.reasonSummary = item.reasonSummary || [];
        if (item.parseSource && item.eligible) item.reasonSummary.push(item.parseSource + '完成');
        job.extracted = extracted;
        job.item = item;
        job.status = '已识别';
        job.error = '';
    } catch (ocrErr) {
        const message = ocrErr.message || String(ocrErr);
        job.attachment = normalizeAttachmentRecord(job.attachment, {
            state: '识别失败临时',
            linkedOcrJobId: job.id,
            linkedAppId: job.appId,
            uploadedBy: job.owner || '',
            uploadedAt: job.createdAt || ''
        });
        job.item = {
            invoiceNo: '',
            sellerName: '',
            buyerName: '',
            amount: 0,
            invoiceDate: '',
            eligible: false,
            checked: false,
            resultText: '不符合（移除）',
            warnings: ['OCR识别失败：' + message],
            reasonSummary: ['OCR识别失败：' + message],
            attachment: job.attachment,
            uploadedAt: job.createdAt,
            poolStartAt: job.createdAt,
            poolExpireAt: poolExpireAtFromStart(job.createdAt)
        };
        job.status = '识别失败需补录';
        job.error = message;
    } finally {
        if (closedDuringProcessing) {
            ocrQueueRunning = false;
            setImmediate(processInvoiceOcrQueue);
            return;
        }
        job.updatedAt = new Date().toLocaleString('zh-CN');
        try {
            writeOcrJobManifest(job);
        } catch (archiveErr) {
            job.archiveError = archiveErr.message;
            console.error('[归档] OCR识别结果清单写入失败:', archiveErr);
        }
        saveData();
        ocrQueueRunning = false;
        setImmediate(processInvoiceOcrQueue);
    }
}

function resumeInvoiceOcrQueue() {
    let changed = false;
    invoiceOcrJobs.forEach(job => {
        if (job.status === '识别中' && job.projectClosure?.result !== 'invalidated'
            && applications.find(app => app.id === job.appId)?.status !== 'closed') {
            job.status = '待识别';
            job.updatedAt = new Date().toLocaleString('zh-CN');
            changed = true;
        }
    });
    if (changed) saveData();
    if (invoiceOcrJobs.some(job => job.status === '待识别')) {
        setImmediate(processInvoiceOcrQueue);
    }
}

function csvCell(value) {
    const text = String(value ?? '');
    return '"' + text.replace(/"/g, '""') + '"';
}

function getExpectedRowsByKeys(keys, filterUser = null, summaryOptions = {}) {
    const keySet = new Set(Array.isArray(keys) ? keys : [keys].filter(Boolean));
    return buildInvoiceSummary(filterUser, summaryOptions).rows.filter(row => keySet.has(row.key));
}

function invoiceBatchSelectionError(rows) {
    if (!rows.length) return '请先选择项目和至少一条明细';
    const groupKey = row => `${row.isReplacementRow ? 'employee' : 'supplier'}:${row.normalizedSupplier || row.supplier || ''}`;
    const first = groupKey(rows[0]);
    return rows.some(row => groupKey(row) !== first)
        ? '同一批次只能选择同一供应商，或同一员工替票对象的多条明细；不同名称请分批上传。'
        : '';
}

function batchNeedTotal(rows) {
    return roundMoney(rows.reduce((sum, row) => sum + positiveMoney(row.missingAmount ?? row.expectedAmount), 0));
}

function normalizeMonth(value) {
    const match = String(value || '').match(/(20\d{2}|19\d{2})[-/年.](\d{1,2})/);
    if (!match) return '';
    return match[1] + '-' + String(match[2]).padStart(2, '0');
}

function canCurrentUserUseReplacement(username){return invoicePolicy.canOperatorUseReplacement(username,users);}
function configuredBuyerForRead(){return invoicePolicy.invoiceBuyerView(currentConfig()).invoiceBuyerName||'';}
function buyerMatchesCurrent(actual){const buyer=configuredBuyerForRead();return Boolean(buyer)&&invoicePolicy.normalizeInvoiceName(actual)===invoicePolicy.normalizeInvoiceName(buyer);}
function isSellerInSelectedRows(sellerName, selectedRows) {
    const normalizedSeller = normalizeText(sellerName);
    return selectedRows.some(row => !row.isReplacementRow && normalizedSeller && normalizedSeller === row.normalizedSupplier);
}

function invoicePoolMatchesRows(pool, selectedRows) {
    if (!pool || !selectedRows.length || !['employee','supplier'].includes(pool.ownerType)) return false;
    const poolOwner = normalizeText(pool.owner || '');
    if (pool.ownerType === 'employee') {
        const ownerAccount = (users || []).find(account => normalizeText(account.username) === poolOwner);
        if (ownerAccount && !accountIsActive(ownerAccount)) return false;
        return selectedRows.every(row => row.isReplacementRow && normalizeText(row.supplier) === poolOwner);
    }
    return selectedRows.every(row => !row.isReplacementRow && row.normalizedSupplier === poolOwner);
}

function findReusableInvoicePool(item, selectedRows, options = {}) {
    const invoiceNo = String(item.invoiceNo || '').trim();
    if (!invoiceNo) return null;
    const ownerType = String(item.poolOwnerType || '').trim();
    const owner = normalizeText(item.poolOwner || '');
    return buildInvoicePools(null, options).find(pool => {
        if (String(pool.invoiceNo || '').trim() !== invoiceNo) return false;
        if (toMoney(pool.remainingAmount) <= 0.01) return false;
        if (ownerType && pool.ownerType !== ownerType) return false;
        if (owner && normalizeText(pool.owner || '') !== owner) return false;
        if (!options.allowExpired && pool.isExpired) return false;
        return invoicePoolMatchesRows(pool, selectedRows);
    }) || null;
}

function analyzeInvoiceCandidateForRows(extracted, selectedRows, user, options = {}) {
    const warnings = [];
    const invoiceNo = String(extracted.invoiceNo || '').trim();
    const isPoolReuse = !!extracted.fromPool;
    const reusablePool = isPoolReuse ? findReusableInvoicePool(extracted, selectedRows, { excludeDraftIds: options.excludeDraftIds || [] }) : null;
    const expiredPool = isPoolReuse && !reusablePool
        ? findReusableInvoicePool(extracted, selectedRows, { excludeDraftIds: options.excludeDraftIds || [], allowExpired: true })
        : null;
    const canonical = reusablePool ? {
        ...extracted,
        invoiceNo: reusablePool.invoiceNo,
        buyerName: reusablePool.buyerName,
        sellerName: reusablePool.sellerName || reusablePool.owner,
        invoiceDate: reusablePool.invoiceDate,
        amount: reusablePool.invoiceTotalAmount,
        invoiceType: reusablePool.invoiceType || extracted.invoiceType || '发票'
    } : extracted;
    const amount = toMoney(canonical.amount);
    const usedAmount = usedAmountByInvoiceNo(invoiceNo, { includeDrafts: true, excludeDraftIds: options.excludeDraftIds || [] });
    const availableAmount = reusablePool
        ? roundMoney(Math.min(positiveMoney(amount - usedAmount), toMoney(reusablePool.remainingAmount)))
        : positiveMoney(amount - usedAmount);
    const buyerOk = buyerMatchesCurrent(canonical.buyerName);
    const sellerOk = isSellerInSelectedRows(canonical.sellerName, selectedRows);
    const projectMonths = selectedRows.map(row => row.projectMonth).filter(Boolean);
    const withinActivityYear = invoiceWithinProjectActivityYear(canonical.invoiceDate, projectMonths);
    const luxuryRisk = isLuxuryInvoice(canonical);
    const isAuthorizedEmployee = canCurrentUserUseReplacement(user?.username || '');
    const isPrivilegedUser = false; // Current live account authority is checked above.
    const replacementRows = selectedRows.filter(row => row.isReplacementRow);
    const canUseReplacement = (isAuthorizedEmployee || isPrivilegedUser) && !sellerOk && replacementRows.length > 0;
    const replacementOwner = replacementRows[0]?.supplier || user?.username || '';

    if (!invoiceNo) warnings.push('缺少发票号码');
    if (!buyerOk) warnings.push('购买方与 Admin 配置不一致或尚未配置');
    if (!canonical.sellerName) warnings.push('缺少销售方名称');
    if (invoiceNo && usedAmount > 0 && !isPoolReuse) warnings.push('该发票号码已有使用记录，请从多余发票池使用剩余额，不能重新上传重复使用');
    if (isPoolReuse && !reusablePool) {
        warnings.push(expiredPool?.isExpired ? '多余发票池已超过1个月共享有效期' : '多余发票池中没有可用于当前明细的剩余额');
    }
    if (!sellerOk && replacementRows.length && !canUseReplacement) warnings.push('当前登录账号不在替票授权名单，不能使用员工替票');
    if (!sellerOk && !replacementRows.length) warnings.push('销售方与所选授权供应商不一致，供应商发票必须名称一致');
    if (!withinActivityYear) warnings.push('发票日期不在项目活动当年内');
    if (invoiceNo && availableAmount <= 0) warnings.push('该发票号码金额已被全额使用');
    const requestedAllocation = toMoney(extracted.allocationAmount || extracted.reservedAmount || 0);
    if (isPoolReuse && reusablePool && requestedAllocation > availableAmount + 0.001) warnings.push(`共享余额不足，当前最多可用 ${availableAmount.toFixed(2)}`);
    if (luxuryRisk) warnings.push('疑似奢侈品采购，不允许通过');

    if(selectedRows.some(row=>!invoicePolicy.payeeSnapshotType(row)))warnings.push('所选历史明细缺少收款类型快照；不能按当前员工授权推断类型');
    const eligible = warnings.length === 0;
    const reasonSummary = warnings.length ? warnings.map(warning => {
        if (/发票号码金额已被全额使用|重复/.test(warning)) return '重复发票：' + warning;
        if (/销售方|供应商/.test(warning)) return '销售方名称错误：' + warning;
        if (/采购方/.test(warning)) return '采购方名称不符合：' + warning;
        if (/3个月|日期/.test(warning)) return '发票日期风险：' + warning;
        if (/替用发票|替票/.test(warning)) return '替票规则：' + warning;
        if (/奢侈品/.test(warning)) return '发票种类风险：' + warning;
        if (/OCR/.test(warning)) return 'OCR识别失败：' + warning;
        return '其他风险：' + warning;
    }) : [];
    return {
        invoiceNo,
        buyerName: canonical.buyerName || '',
        sellerName: canonical.sellerName || '',
        amount,
        usedAmount,
        availableAmount,
        invoiceDate: canonical.invoiceDate || '',
        invoiceType: canUseReplacement ? '替用发票' : (canonical.invoiceType || '发票'),
        eligible,
        checked: eligible,
        resultText: eligible ? '符合' : '不符合（移除）',
        warnings,
        reasonSummary,
        rawText: extracted.rawText || '',
        poolOwnerType: reusablePool?.ownerType || (canUseReplacement ? 'employee' : 'supplier'),
        poolOwner: reusablePool?.owner || (canUseReplacement ? replacementOwner : (extracted.sellerName || '')),
        poolStartAt: reusablePool?.poolStartAt || extracted.poolStartAt || extracted.uploadedAt || '',
        poolExpireAt: reusablePool?.poolExpireAt || extracted.poolExpireAt || '',
        fromPool: isPoolReuse,
        sourceInvoiceId: reusablePool?.sourceInvoiceId || ''
    };
}

function buildInvoiceSummary(filterUser = null, options = {}) {
    const excludeDraftIds = new Set(Array.isArray(options.excludeDraftIds) ? options.excludeDraftIds : []);
    const expectedRows = getInvoiceExpectedItems(filterUser);
    const allowedKeys = new Set(expectedRows.map(row => row.key));
    const scopedInvoices = invoices.filter(inv => {
        if (!filterUser) return true;
        if (inv.owner === filterUser || inv.createdBy === filterUser) return true;
        return inv.expectedKey && allowedKeys.has(inv.expectedKey);
    });
    const activeInvoices = scopedInvoices.filter(isInvoiceOccupying);
    const rows = expectedRows.map(row => {
        const matched = activeInvoices.filter(inv => {
            const allocations = Array.isArray(inv.detailAllocations) ? inv.detailAllocations : [];
            if (allocations.length) return allocations.some(item => item.key === row.key);
            if ((inv.expectedKeys || []).includes(row.key)) return true;
            if (inv.expectedKey && inv.expectedKey === row.key) return true;
            if (inv.appId && inv.appId !== row.appId) return false;
            return normalizeText(inv.sellerName) === row.normalizedSupplier;
        });
        const allocationForInvoice = inv => {
            const detail = (inv.detailAllocations || []).filter(item => item.key === row.key);
            return roundMoney(detail.length ? detail.reduce((sum, item) => sum + toMoney(item.amount), 0) : toMoney(inv.amount));
        };
        const confirmedAmount = roundMoney(matched.filter(inv => inv.status === '已确认').reduce((sum, inv) => sum + allocationForInvoice(inv), 0));
        const pendingAmount = roundMoney(matched.filter(inv => (inv.status || '待审核') === '待审核').reduce((sum, inv) => sum + allocationForInvoice(inv), 0));
        const invoiceAmount = roundMoney(confirmedAmount + pendingAmount);
        const missingAmount = positiveMoney(row.expectedAmount - invoiceAmount);
        return {
            ...row,
            invoiceAmount,
            confirmedAmount,
            pendingAmount,
            draftAmount: 0,
            occupiedAmount: invoiceAmount,
            missingAmount,
            matchedInvoices: matched.map(inv => {
                const detail = (inv.detailAllocations || []).filter(item => item.key === row.key);
                const amount = roundMoney(detail.length ? detail.reduce((s, item) => s + toMoney(item.amount), 0) : toMoney(inv.amount));
                return { id: inv.id, invoiceNo: inv.invoiceNo, amount, status: inv.status };
            }),
            matchedDrafts: [],
            status: invoiceAmount >= row.expectedAmount - 0.01 ? '已占用待确认' : (invoiceAmount > 0 ? '部分占用' : '缺票')
        };
    });
    const rowMap = new Map(rows.map(row => [row.key, row]));
    const activeDrafts = (invoiceDraftBatches || []).filter(draft => {
        if (!isInvoiceDraftOccupying(draft)) return false;
        if (excludeDraftIds.has(draft.id)) return false;
        if (!filterUser) return true;
        return draft.owner === filterUser || draft.createdBy === filterUser;
    });
    activeDrafts.forEach(draft => {
        const draftRows = (draft.expectedKeys || []).map(key => rowMap.get(key)).filter(row => row && row.appId === draft.appId);
        if (!draftRows.length) return;
        let remainingNeed = roundMoney(draftRows.reduce((sum, row) => sum + positiveMoney(row.missingAmount), 0));
        if (draft.noInvoice) {
            let allocationLeft = roundMoney(Math.min(remainingNeed, toMoney(draft.noInvoiceAmount || draft.checked)));
            draftRows.forEach(row => {
                if (allocationLeft <= 0 || row.missingAmount <= 0) return;
                const used = roundMoney(Math.min(toMoney(row.missingAmount), allocationLeft));
                if (used <= 0) return;
                row.draftAmount = roundMoney(toMoney(row.draftAmount) + used);
                row.occupiedAmount = roundMoney(toMoney(row.occupiedAmount) + used);
                row.missingAmount = positiveMoney(toMoney(row.missingAmount) - used);
                row.matchedDrafts.push({
                    id: draft.id,
                    invoiceNo: '无票提报',
                    amount: used,
                    status: draft.status || '草稿',
                    noInvoice: true
                });
                allocationLeft = positiveMoney(allocationLeft - used);
                remainingNeed = positiveMoney(remainingNeed - used);
            });
            return;
        }
        (draft.items || []).forEach(item => {
            if (remainingNeed <= 0) return;
            const available = draftItemUsageAmount(item);
            let allocationLeft = roundMoney(Math.min(remainingNeed, available));
            draftRows.forEach(row => {
                if (allocationLeft <= 0 || row.missingAmount <= 0) return;
                const used = roundMoney(Math.min(toMoney(row.missingAmount), allocationLeft));
                if (used <= 0) return;
                row.draftAmount = roundMoney(toMoney(row.draftAmount) + used);
                row.occupiedAmount = roundMoney(toMoney(row.occupiedAmount) + used);
                row.missingAmount = positiveMoney(toMoney(row.missingAmount) - used);
                row.matchedDrafts.push({
                    id: draft.id,
                    invoiceNo: item.invoiceNo || '',
                    amount: used,
                    status: draft.status || '草稿'
                });
                allocationLeft = positiveMoney(allocationLeft - used);
                remainingNeed = positiveMoney(remainingNeed - used);
            });
        });
    });
    rows.forEach(row => {
        row.status = row.occupiedAmount >= row.expectedAmount - 0.01
            ? '已占用待确认'
            : (row.occupiedAmount > 0 ? '部分占用' : '缺票');
    });
    const duplicateNos = {};
    scopedInvoices.filter(isInvoiceOccupying).forEach(inv => {
        const no = String(inv.invoiceNo || '').trim();
        if (!no) return;
        if (!duplicateNos[no]) duplicateNos[no] = [];
        duplicateNos[no].push(inv.id);
    });
    return {
        rows,
        duplicates: Object.entries(duplicateNos).filter(([, ids]) => ids.length > 1).map(([invoiceNo, ids]) => ({ invoiceNo, ids })),
        totals: {
            expected: rows.reduce((sum, row) => sum + row.expectedAmount, 0),
            invoiced: rows.reduce((sum, row) => sum + row.invoiceAmount, 0),
            confirmed: rows.reduce((sum, row) => sum + toMoney(row.confirmedAmount), 0),
            pendingAmount: rows.reduce((sum, row) => sum + toMoney(row.pendingAmount), 0),
            drafted: rows.reduce((sum, row) => sum + toMoney(row.draftAmount), 0),
            occupied: rows.reduce((sum, row) => sum + toMoney(row.occupiedAmount), 0),
            missing: rows.reduce((sum, row) => sum + row.missingAmount, 0),
            pending: scopedInvoices.filter(inv => inv.status === '待审核' && isInvoiceOccupying(inv)).length,
            rejected: scopedInvoices.filter(inv => inv.status === '已驳回').length,
            draftCount: activeDrafts.length
        },
        invoices: filterUser ? scopedInvoices.map(invoiceForEmployeeResponse) : scopedInvoices
    };
}

function invoiceForEmployeeResponse(invoice) {
    const result = sanitizeRecordForResponse(invoice);
    delete result.sourceInvoiceId;
    delete result.originalAuditRecordId;
    if (result.analysis && typeof result.analysis === 'object') delete result.analysis.sourceInvoiceId;
    if (result.fromPool) result.attachment = null;
    return result;
}

function invoiceAllocationAmountForKeys(inv, keySet) {
    if (!keySet || !keySet.size) return 0;
    const allocations = Array.isArray(inv.detailAllocations) && inv.detailAllocations.length
        ? inv.detailAllocations
        : invoiceKeysForServer(inv).map(key => ({ key, amount: inv.amount }));
    return roundMoney(allocations.reduce((sum, allocation) => {
        if (!keySet.has(allocation.key)) return sum;
        return sum + toMoney(allocation.amount);
    }, 0));
}

function invoicePoolIdentity(inv) {
    const invoiceNo = String(inv?.invoiceNo || '').trim();
    if (!invoiceNo) return '';
    const ownerType=invoicePolicy.poolSnapshotType(inv);
    if(!ownerType)return '';
    const owner = inv?.poolOwner || inv?.sellerName || '';
    return `${invoiceNo}|${ownerType}|${normalizeText(owner)}`;
}

function invoicePoolLedgerForRecord(inv, activeInvoices) {
    const identity = invoicePoolIdentity(inv);
    if (!identity) return null;
    const related = (activeInvoices || []).filter(item => invoicePoolIdentity(item) === identity);
    const totalAmount = roundMoney(Math.max(...related.map(item => toMoney(item.invoiceTotalAmount || item.amount)), toMoney(inv.invoiceTotalAmount || inv.amount)));
    const usedTotal = roundMoney(related.reduce((sum, item) => sum + toMoney(item.amount), 0));
    const currentAmount = toMoney(inv.amount);
    const usedExcludingCurrent = positiveMoney(usedTotal - currentAmount);
    const remainingAfter = positiveMoney(totalAmount - usedTotal);
    const starts = related
        .map(item => ({
            text: poolStartAtForRecord(item) || item.uploadedAt || item.createdAt || '',
            date: parseLocalDateTime(poolStartAtForRecord(item) || item.uploadedAt || item.createdAt || '')
        }))
        .filter(item => item.text);
    starts.sort((a, b) => {
        if (a.date && b.date) return a.date.getTime() - b.date.getTime();
        return String(a.text).localeCompare(String(b.text));
    });
    const firstPoolStartAt = starts[0]?.text || poolStartAtForRecord(inv) || inv.uploadedAt || inv.createdAt || '';
    const isPoolLedger = related.length > 1 || totalAmount > currentAmount + 0.01 || toMoney(inv.poolAmount) > 0.01 || !!inv.fromPool;
    const isPoolReuse = !!inv.fromPool || (!inv.attachment?.path && isPoolLedger);
    return {
        isPoolLedger,
        isPoolReuse,
        invoiceTotalAmount: totalAmount,
        currentAmount: roundMoney(currentAmount),
        usedExcludingCurrent,
        usedTotal,
        remainingAfter,
        poolStartAt: firstPoolStartAt,
        poolExpireAt: inv.poolExpireAt || poolExpireAtFromStart(firstPoolStartAt),
        relatedCount: related.length
    };
}

function isInvoiceAttachmentMissingRisk(inv) {
    if (inv.invoiceType === '无票提报') return false;
    if (inv.attachment?.path) return false;
    const total = toMoney(inv.invoiceTotalAmount || inv.amount);
    const amount = toMoney(inv.amount);
    return !(inv.fromPool || total > amount + 0.01);
}

function classifyRiskWarning(message) {
    const text = String(message || '');
    if (/无票/.test(text)) return { type: 'no_invoice', label: '无票说明' };
    if (/重复|发票号码.*使用|全额使用/.test(text)) return { type: 'duplicate_invoice', label: '重复发票' };
    if (/销售方|供应商|开票方/.test(text)) return { type: 'seller_mismatch', label: '销售方' };
    if (/购买方|采购方/.test(text)) return { type: 'buyer_mismatch', label: '购买方' };
    if (/日期|月份|年份|3个月/.test(text)) return { type: 'date_abnormal', label: '日期' };
    if (/金额|余额|超额|多余/.test(text)) return { type: 'amount_abnormal', label: '金额/余额' };
    if (/OCR|识别|缺少/.test(text)) return { type: 'ocr_incomplete', label: '识别不完整' };
    return { type: 'other', label: '其他风险' };
}

function uniqueRiskItems(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = [item.type, item.invoiceId, item.message].join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function riskItemsForInvoice(inv) {
    const items = [];
    const warnings = [
        ...(Array.isArray(inv.riskTips) ? inv.riskTips : []),
        ...(Array.isArray(inv.analysis?.warnings) ? inv.analysis.warnings : [])
    ].filter(Boolean);
    warnings.forEach(warning => {
        const risk = classifyRiskWarning(warning);
        items.push({
            ...risk,
            message: String(warning),
            invoiceId: inv.id || '',
            invoiceNo: inv.invoiceNo || '',
            appId: inv.appId || '',
            source: inv.invoiceNo || inv.invoiceType || inv.id || '发票记录'
        });
    });
    if (inv.invoiceType === '无票提报') {
        items.push({
            type: 'no_invoice',
            label: '无票说明',
            message: inv.employeeNote || inv.note || '无票提报，必须管理员人工审核',
            invoiceId: inv.id || '',
            invoiceNo: '',
            appId: inv.appId || '',
            source: '无票提报'
        });
    }
    if (isInvoiceAttachmentMissingRisk(inv)) {
        items.push({
            type: 'attachment_missing',
            label: '附件缺失',
            message: '该发票记录没有可查看附件',
            invoiceId: inv.id || '',
            invoiceNo: inv.invoiceNo || '',
            appId: inv.appId || '',
            source: inv.invoiceNo || inv.id || '发票记录'
        });
    }
    return uniqueRiskItems(items);
}

function riskLabelsForInvoice(inv) {
    return uniqueList(riskItemsForInvoice(inv).map(item => item.label));
}

function approvedPaymentsForApp(appId) {
    const id = String(appId || '').trim();
    if (!id) return [];
    return (payments || [])
        .filter(pay => pay.projectId === id && pay.status === 'approved');
}

function approvedPaymentIdsForApp(appId) {
    return uniqueList(approvedPaymentsForApp(appId)
        .map(pay => pay.id)
        .filter(Boolean));
}

function buildInvoiceSubmissions(filterUser = null) {
    const summary = buildInvoiceSummary(filterUser);
    const rowMap = new Map((summary.rows || []).map(row => [row.key, row]));
    const visibleInvoices = summary.invoices || [];
    const activeLedgerInvoices = visibleInvoices.filter(isInvoiceOccupying);
    const batches = new Map();

    visibleInvoices.forEach(inv => {
        const batchId = inv.batchId || inv.id || '未分批';
        if (!batches.has(batchId)) {
            batches.set(batchId, {
                batchId,
                appId: inv.appId || '',
                projectName: '',
                owner: inv.owner || inv.createdBy || '',
                createdBy: inv.createdBy || '',
                createdAt: inv.createdAt || '',
                updatedAt: inv.updatedAt || inv.createdAt || '',
                employeeNote: inv.employeeNote || inv.note || '',
                projectMonth: '',
                statuses: {},
                invoiceCount: 0,
                attachmentCount: 0,
                invoiceNos: [],
                invoiceAmount: 0,
                invoiceTotalAmount: 0,
                poolAmount: 0,
                noInvoiceAmount: 0,
                riskLabels: [],
                riskItems: [],
                allocations: [],
                invoices: [],
                projectClosure: null,
                paymentCorrection: null
            });
        }

        const batch = batches.get(batchId);
        if (inv.projectClosure?.result === 'invalidated') batch.projectClosure = inv.projectClosure;
        if (inv.paymentCorrection?.result === 'invalidated') batch.paymentCorrection = inv.paymentCorrection;
        const invoiceKeys = invoiceKeysForServer(inv);
        const firstRow = invoiceKeys.map(key => rowMap.get(key)).find(Boolean) || rowMap.get(inv.expectedKey);
        batch.projectName = batch.projectName || firstRow?.projectName || inv.projectName || inv.appId || '';
        batch.projectMonth = batch.projectMonth || firstRow?.projectMonth || '';
        batch.createdAt = batch.createdAt || inv.createdAt || '';
        batch.updatedAt = inv.updatedAt || batch.updatedAt || inv.createdAt || '';
        batch.employeeNote = batch.employeeNote || inv.employeeNote || inv.note || '';
        const status = inv.status || '待审核';
        batch.statuses[status] = (batch.statuses[status] || 0) + 1;
        batch.invoiceCount += 1;
        if (inv.attachment?.path) batch.attachmentCount += 1;
        if (inv.invoiceNo) batch.invoiceNos.push(inv.invoiceNo);
        batch.invoiceAmount += toMoney(inv.amount);
        batch.invoiceTotalAmount += toMoney(inv.invoiceTotalAmount || inv.amount);
        batch.poolAmount += toMoney(inv.poolAmount);
        if (inv.invoiceType === '无票提报') batch.noInvoiceAmount += toMoney(inv.amount);
        const poolLedger = invoicePoolLedgerForRecord(inv, activeLedgerInvoices);
        const invoiceRiskItems = riskItemsForInvoice(inv);
        batch.riskLabels.push(...invoiceRiskItems.map(item => item.label));
        batch.riskItems.push(...invoiceRiskItems);

        const allocations = Array.isArray(inv.detailAllocations) && inv.detailAllocations.length
            ? inv.detailAllocations
            : invoiceKeys.map(key => {
                const row = rowMap.get(key);
                return {
                    key,
                    supplier: row?.supplier || inv.sellerName || '',
                    item: row?.item || '',
                    content: row?.content || '',
                    amount: inv.amount
                };
            });
        allocations.forEach(allocation => {
            const row = rowMap.get(allocation.key);
            batch.allocations.push({
                key: allocation.key,
                supplier: allocation.supplier || row?.supplier || '',
                item: allocation.item || row?.item || '',
                content: allocation.content || row?.content || '',
                amount: toMoney(allocation.amount)
            });
        });
        batch.invoices.push({
            id: inv.id,
            invoiceNo: inv.invoiceNo || '',
            sellerName: inv.sellerName || '',
            buyerName: inv.buyerName || '',
            amount: roundMoney(inv.amount),
            invoiceTotalAmount: roundMoney(inv.invoiceTotalAmount || inv.amount),
            poolAmount: roundMoney(inv.poolAmount),
            invoiceDate: inv.invoiceDate || '',
            invoiceType: inv.invoiceType || '',
            status,
            fromPool: !!inv.fromPool,
            poolStartAt: inv.poolStartAt || '',
            poolExpireAt: inv.poolExpireAt || '',
            poolLedger,
            attachment: inv.attachment || null,
            note: inv.note || inv.employeeNote || '',
            riskLabels: invoiceRiskItems.map(item => item.label),
            riskItems: invoiceRiskItems,
            projectClosure: inv.projectClosure || null,
            paymentCorrection: inv.paymentCorrection || null
        });
    });

    return [...batches.values()].map(batch => {
        const statuses = Object.keys(batch.statuses);
        let status = '待审核';
        if (statuses.length === 1) status = statuses[0];
        else if (batch.statuses['已驳回']) status = '部分驳回';
        else if (batch.statuses['待审核']) status = '部分待审';
        else if (batch.statuses['已确认']) status = '部分确认';

        const allocationMap = new Map();
        batch.allocations.forEach(allocation => {
            const key = allocation.key || `${allocation.supplier}|${allocation.item}|${allocation.content}`;
            if (!allocationMap.has(key)) allocationMap.set(key, { ...allocation, amount: 0 });
            allocationMap.get(key).amount += toMoney(allocation.amount);
        });
        const allocations = [...allocationMap.values()].map(allocation => {
            const row = rowMap.get(allocation.key);
            return {
                ...allocation,
                amount: roundMoney(allocation.amount),
                expectedAmount: toMoney(row?.expectedAmount),
                confirmedOrPendingAmount: toMoney(row?.invoiceAmount),
                draftAmount: toMoney(row?.draftAmount),
                occupiedAmount: toMoney(row?.occupiedAmount),
                missingAmount: toMoney(row?.missingAmount),
                projectMonth: row?.projectMonth || ''
            };
        });
        const detailKeys = new Set(allocations.map(allocation => allocation.key).filter(Boolean));
        const detailRows = [...detailKeys].map(key => rowMap.get(key)).filter(Boolean);
        const expectedAmount = roundMoney(detailRows.reduce((sum, row) => sum + toMoney(row.expectedAmount), 0));
        const draftAmount = roundMoney(detailRows.reduce((sum, row) => sum + toMoney(row.draftAmount), 0));
        const occupiedAmount = roundMoney(detailRows.reduce((sum, row) => sum + toMoney(row.occupiedAmount), 0));
        const missingAmount = roundMoney(detailRows.reduce((sum, row) => sum + toMoney(row.missingAmount), 0));
        const confirmedAmount = roundMoney(visibleInvoices
            .filter(inv => inv.status === '已确认' && isInvoiceOccupying(inv))
            .reduce((sum, inv) => sum + invoiceAllocationAmountForKeys(inv, detailKeys), 0));
        const pendingAmount = roundMoney(visibleInvoices
            .filter(inv => inv.status === '待审核' && isInvoiceOccupying(inv))
            .reduce((sum, inv) => sum + invoiceAllocationAmountForKeys(inv, detailKeys), 0));
        const detailSummary = uniqueList(allocations.map(allocation => allocation.supplier).filter(Boolean)).join('、');
        const auditRecords = (invoiceAuditRecords || [])
            .filter(record => record.batchId === batch.batchId)
            .sort((a, b) => String(b.reviewedAt || '').localeCompare(String(a.reviewedAt || '')));
        const correctionPaymentIds = uniqueList(batch.invoices
            .filter(inv => inv?.paymentCorrection?.result === 'invalidated')
            .map(inv => inv.paymentCorrection.paymentId)
            .filter(Boolean));
        const paymentIds = correctionPaymentIds.length
            ? correctionPaymentIds
            : approvedPaymentIdsForApp(batch.appId);

        return {
            ...batch,
            status,
            paymentIds,
            paymentNo: paymentIds.join('、'),
            invoiceNos: uniqueList(batch.invoiceNos),
            invoiceAmount: roundMoney(batch.invoiceAmount),
            invoiceTotalAmount: roundMoney(batch.invoiceTotalAmount),
            poolAmount: roundMoney(batch.poolAmount),
            noInvoiceAmount: roundMoney(batch.noInvoiceAmount),
            projectMonth: batch.projectMonth || allocations.map(allocation => allocation.projectMonth).find(Boolean) || '',
            detailCount: detailKeys.size || allocations.length,
            detailSummary,
            expectedAmount,
            confirmedAmount,
            pendingAmount,
            draftAmount,
            occupiedAmount,
            missingAmount,
            riskLabels: uniqueList(batch.riskLabels),
            riskItems: uniqueRiskItems(batch.riskItems),
            riskCount: uniqueRiskItems(batch.riskItems).length,
            auditRecords,
            lastAuditRecord: auditRecords[0] || null,
            allocations
        };
    }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function createInvoiceAuditRecord({ user, batchId, status, note, targets, beforeStatuses }) {
    const allKeys = uniqueList((targets || []).flatMap(inv => invoiceKeysForServer(inv)));
    const rowMap = new Map(getInvoiceExpectedItems().map(row => [row.key, row]));
    const affectedDetails = allKeys.map(key => {
        const row = rowMap.get(key);
        return {
            key,
            appId: row?.appId || '',
            projectName: row?.projectName || '',
            supplier: row?.supplier || '',
            item: row?.item || '',
            content: row?.content || ''
        };
    });
    const firstTarget = targets?.[0] || {};
    const firstDetail = affectedDetails.find(Boolean) || {};
    const record = {
        id: 'AUDIT' + String(nextInvoiceAuditId++).padStart(4, '0'),
        batchId,
        appId: firstTarget.appId || firstDetail.appId || '',
        projectName: firstDetail.projectName || firstTarget.projectName || firstTarget.appId || '',
        submittedBy: firstTarget.createdBy || firstTarget.owner || '',
        owner: firstTarget.owner || '',
        reviewer: user?.username || '',
        action: status,
        note: note || '',
        reviewedAt: new Date().toLocaleString(),
        affectedInvoiceIds: (targets || []).map(inv => inv.id).filter(Boolean),
        affectedInvoiceNos: uniqueList((targets || []).map(inv => inv.invoiceNo).filter(Boolean)),
        affectedDetailKeys: allKeys,
        affectedDetails,
        beforeStatuses,
        afterStatus: status,
        invoiceCount: (targets || []).length,
        amount: roundMoney((targets || []).reduce((sum, inv) => sum + toMoney(inv.amount), 0))
    };
    invoiceAuditRecords.unshift(record);
    return record;
}

function invoiceKeysForServer(inv) {
    if (Array.isArray(inv.detailAllocations) && inv.detailAllocations.length) {
        return uniqueList(inv.detailAllocations.map(item => item.key));
    }
    if (Array.isArray(inv.expectedKeys) && inv.expectedKeys.length) return inv.expectedKeys;
    return [inv.expectedKey].filter(Boolean);
}

function buildInvoiceDrafts(filterUser = null, appId = '', options = {}) {
    const result = (invoiceDraftBatches || [])
        .filter(draft => (draft.status || '草稿') === '草稿')
        .filter(draft => draft.projectClosure?.result !== 'invalidated')
        .filter(draft => draft.paymentCorrection?.result !== 'invalidated')
        .filter(draft => applications.find(app => app.id === draft.appId)?.status !== 'closed')
        .filter(draft => !filterUser || draft.owner === filterUser || draft.createdBy === filterUser)
        .filter(draft => !appId || draft.appId === appId)
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    if (!filterUser || options.internal) return result;
    return result.map(draft => ({
        ...sanitizeRecordForResponse(draft),
        items: (draft.items || []).map(item => {
            const safe = sanitizeRecordForResponse(item);
            delete safe.sourceInvoiceId;
            if (safe.fromPool) delete safe.attachment;
            return safe;
        })
    }));
}

function buildInvoiceClosureEvidence(filterUser = null) {
    const canView = record => !filterUser || record.owner === filterUser || record.createdBy === filterUser || record.submittedBy === filterUser
        || applications.some(app => app.id === record.appId && app.applicant === filterUser);
    return {
        drafts: (invoiceDraftBatches || [])
            .filter(record => (record.projectClosure?.result === 'invalidated' || record.paymentCorrection?.result === 'invalidated') && canView(record))
            .map(sanitizeRecordForResponse),
        ocrJobs: (invoiceOcrJobs || [])
            .filter(record => (record.projectClosure?.result === 'invalidated' || record.paymentCorrection?.result === 'invalidated') && canView(record))
            .map(publicOcrJob),
        auditRecords: (invoiceAuditRecords || [])
            .filter(record => (record.projectClosure?.result === 'invalidated' || record.paymentCorrection?.result === 'invalidated') && canView(record))
            .map(sanitizeRecordForResponse)
    };
}

function createInvoicesFromDraftPayload(body, user, filterUser = null, sharedBatchId = '', summaryOptions = {}) {
    const expectedKeys = Array.isArray(body.expectedKeys) ? body.expectedKeys : [];
    const selectedRows = getExpectedRowsByKeys(expectedKeys, filterUser, summaryOptions).filter(row => row.appId === body.appId);
    const sourceItems = Array.isArray(body.items) ? body.items : [];
    const analyzedItems = normalizeCandidateInvoiceAvailability(sourceItems.map(item => {
        const checked = analyzeInvoiceCandidateForRows(item, selectedRows, user, summaryOptions);
        return {
            ...item,
            ...checked,
            attachment: item.attachment || null,
            rawText: item.rawText || checked.rawText || ''
        };
    }));
    const items = analyzedItems.filter(item => item.eligible);
    const isNoInvoiceDraft = !!body.noInvoice;

    if (!body.appId || !selectedRows.length) return { success: false, error: '请先选择项目和明细' };
    const selectionError = invoiceBatchSelectionError(selectedRows);
    if (selectionError) return { success: false, error: selectionError };
    if (!items.length && !isNoInvoiceDraft) return { success: false, error: firstInvoiceRejectionMessage(analyzedItems) };

    const need = batchNeedTotal(selectedRows);
    if (need <= 0) {
        return { success: false, error: '该明细已由待审核或已确认发票占用，请等待管理员审核后再操作' };
    }

    let remainingNeed = roundMoney(need);
    const rowRemaining = selectedRows.map(row => ({
        key: row.key,
        supplier: row.supplier,
        item: row.item,
        content: row.content,
        expectedAmount: positiveMoney(row.missingAmount ?? row.expectedAmount),
        remaining: positiveMoney(row.missingAmount ?? row.expectedAmount)
    }));
    const batchId = sharedBatchId || 'BATCH' + Date.now();
    const created = [];

    if (isNoInvoiceDraft) {
        const noInvoiceAmount = roundMoney(Math.min(toMoney(body.noInvoiceAmount || body.checked || need), need));
        if (noInvoiceAmount <= 0) return { success: false, error: '无票金额必须大于 0' };
        if (!String(body.employeeNote || '').trim()) return { success: false, error: '无票提报必须填写原因说明' };
        let allocationLeft = noInvoiceAmount;
        const detailAllocations = [];
        rowRemaining.forEach(row => {
            if (allocationLeft <= 0 || row.remaining <= 0) return;
            const used = roundMoney(Math.min(row.remaining, allocationLeft));
            if (used <= 0) return;
            row.remaining = positiveMoney(row.remaining - used);
            allocationLeft = positiveMoney(allocationLeft - used);
            detailAllocations.push({
                key: row.key,
                supplier: row.supplier,
                item: row.item,
                content: row.content,
                amount: used
            });
        });
        if (!detailAllocations.length) return { success: false, error: '当前明细没有可提报的缺口金额' };
        remainingNeed = positiveMoney(remainingNeed - noInvoiceAmount);
        const invoice = {
            id: 'INV' + String(nextInvoiceId++).padStart(4, '0'),
            batchId,
            invoiceNo: '',
            buyerName: '',
            sellerName: '无票提报',
            amount: noInvoiceAmount,
            invoiceTotalAmount: 0,
            poolAmount: 0,
            poolOwnerType: '',
            poolOwner: '',
            invoiceDate: '',
            invoiceType: '无票提报',
            appId: body.appId || '',
            expectedKey: detailAllocations[0]?.key || expectedKeys[0] || '',
            expectedKeys,
            detailAllocations,
            owner: user?.role === 'admin' || user?.role === 'approver' ? (body.owner || selectedRows[0]?.applicant || user?.username || '') : user?.username,
            riskTips: ['无票提报，必须管理员人工审核'],
            employeeNote: body.employeeNote || '',
            note: body.employeeNote || '',
            extractedText: '',
            attachment: null,
            createdBy: user?.username || '',
            createdAt: new Date().toLocaleString(),
            status: '待审核'
        };
        invoice.analysis = { status: '无票提报', warnings: ['无票提报，必须管理员人工审核'] };
        invoices.push(invoice);
        created.push(invoice);
        return {
            success: true,
            batchId,
            invoices: created,
            needTotal: need,
            submittedAmount: noInvoiceAmount,
            missingAmount: remainingNeed
        };
    }

    items.forEach(item => {
        if (remainingNeed <= 0) return;
        const rawAvailable = toMoney(item.availableAmount) > 0 ? roundMoney(toMoney(item.availableAmount)) : positiveMoney(toMoney(item.amount) - toMoney(item.usedAmount));
        const requestedAmount = toMoney(item.reservedAmount) > 0
            ? toMoney(item.reservedAmount)
            : (toMoney(item.allocationAmount) > 0 ? toMoney(item.allocationAmount) : rawAvailable);
        const available = roundMoney(Math.min(rawAvailable, requestedAmount));
        const allocation = roundMoney(Math.min(remainingNeed, available));
        const poolAmount = positiveMoney(rawAvailable - allocation);
        let allocationLeft = allocation;
        const detailAllocations = [];
        rowRemaining.forEach(row => {
            if (allocationLeft <= 0 || row.remaining <= 0) return;
            const used = roundMoney(Math.min(row.remaining, allocationLeft));
            if (used <= 0) return;
            row.remaining = positiveMoney(row.remaining - used);
            allocationLeft = positiveMoney(allocationLeft - used);
            detailAllocations.push({
                key: row.key,
                supplier: row.supplier,
                item: row.item,
                content: row.content,
                amount: used
            });
        });
        if (!detailAllocations.length || allocation <= 0) return;
        remainingNeed = positiveMoney(remainingNeed - allocation);
        const createdAt = new Date().toLocaleString('zh-CN');
        const poolStartAt = poolStartAtForRecord(item) || createdAt;
        const invoiceId = 'INV' + String(nextInvoiceId++).padStart(4, '0');
        const attachment = item.fromPool ? null : normalizeAttachmentRecord(item.attachment, {
            state: '待审核引用',
            linkedOcrJobId: item.ocrJobId || item.attachment?.linkedOcrJobId || '',
            linkedDraftId: item.attachment?.linkedDraftId || body.id || '',
            linkedInvoiceId: invoiceId,
            linkedAppId: body.appId || '',
            linkedBatchId: batchId,
            uploadedBy: item.attachment?.uploadedBy || item.createdBy || user?.username || '',
            uploadedAt: item.uploadedAt || item.attachment?.uploadedAt || poolStartAt,
            updatedAt: createdAt
        });
        if (attachment) syncOcrAttachmentState(attachment, '待审核引用', {
            linkedOcrJobId: item.ocrJobId || attachment.linkedOcrJobId || '',
            linkedDraftId: attachment.linkedDraftId || body.id || '',
            linkedInvoiceId: invoiceId,
            linkedAppId: body.appId || '',
            linkedBatchId: batchId,
            uploadedBy: attachment.uploadedBy || user?.username || '',
            uploadedAt: attachment.uploadedAt || poolStartAt,
            updatedAt: createdAt
        });
        const invoice = {
            id: invoiceId,
            batchId,
            invoiceNo: String(item.invoiceNo || '').trim(),
            buyerName: String(item.buyerName || '').trim(),
            sellerName: String(item.sellerName || '').trim(),
            amount: roundMoney(allocation),
            invoiceTotalAmount: toMoney(item.amount),
            poolAmount,
            poolOwnerType: item.poolOwnerType || 'supplier',
            poolOwner: item.poolOwner || item.sellerName || '',
            invoiceDate: item.invoiceDate || '',
            invoiceType: item.invoiceType || '发票',
            fromPool: !!item.fromPool,
            sourceInvoiceId: item.sourceInvoiceId || '',
            uploadedAt: item.uploadedAt || poolStartAt,
            poolStartAt,
            poolExpireAt: item.poolExpireAt || poolExpireAtFromStart(poolStartAt),
            appId: body.appId || '',
            expectedKey: detailAllocations[0]?.key || expectedKeys[0] || '',
            expectedKeys,
            detailAllocations,
            owner: user?.role === 'admin' || user?.role === 'approver' ? (body.owner || selectedRows[0]?.applicant || user?.username || '') : user?.username,
            riskTips: [],
            employeeNote: body.employeeNote || '',
            note: body.employeeNote || '',
            extractedText: item.rawText || '',
            attachment,
            createdBy: user?.username || '',
            createdAt,
            status: '待审核'
        };
        invoice.analysis = item.fromPool
            ? { status: '待审核', duplicate: false, warnings: [], source: '已确认真实供应商发票余额复用' }
            : analyzeInvoice(invoice, getInvoiceExpectedItems(filterUser));
        invoices.push(invoice);
        created.push(invoice);
    });

    if (!created.length) {
        return { success: false, error: '当前所选明细没有可提交的缺口金额' };
    }

    return {
        success: true,
        batchId,
        invoices: created,
        needTotal: need,
        submittedAmount: roundMoney(created.reduce((sum, inv) => sum + toMoney(inv.amount), 0)),
        missingAmount: remainingNeed
    };
}

function buildInvoicePools(filterUser = null, options = {}) {
    const excludeDraftIds = new Set(Array.isArray(options.excludeDraftIds) ? options.excludeDraftIds : []);
    const activeInvoices = invoices.filter(isInvoiceOccupying);
    const pools = new Map();
    const confirmedSources = activeInvoices.filter(inv => inv.status === '已确认' && !inv.fromPool && !inv.sourceInvoiceId);

    confirmedSources.forEach(inv => {
        const invoiceNo = String(inv.invoiceNo || '').trim();
        if (!invoiceNo) return;
        const ownerType=invoicePolicy.poolSnapshotType(inv);
        if(!ownerType)return;
        const owner = inv.poolOwner || inv.sellerName || '';
        const key = `${invoiceNo}|${ownerType}|${normalizeText(owner)}`;
        const invPoolStartAt = poolStartAtForRecord(inv);
        const invTiming = poolTiming(invPoolStartAt);
        const existing = pools.get(key);
        if (existing && toMoney(existing.invoiceTotalAmount) >= toMoney(inv.invoiceTotalAmount || inv.amount)) return;
        pools.set(key, {
            invoiceNo, ownerType, owner,
            sourceInvoiceId: inv.id || '',
            sourceOwner: inv.owner || inv.createdBy || '',
            sourceAppId: inv.appId || '',
            invoiceTotalAmount: roundMoney(toMoney(inv.invoiceTotalAmount || inv.amount)),
            usedAmount: 0, remainingAmount: 0,
            invoiceMonth: invoiceMonth(inv.invoiceDate) || '',
            poolMonth: invTiming.poolMonth || invoiceMonth(inv.invoiceDate) || '',
            uploadedAt: inv.uploadedAt || invPoolStartAt || '',
            poolStartAt: invTiming.poolStartAt || invPoolStartAt || '',
            poolExpireAt: inv.poolExpireAt || invTiming.poolExpireAt || '',
            availableUntil: inv.poolExpireAt || invTiming.poolExpireAt || '',
            isExpired: invTiming.isExpired, timeStatus: invTiming.timeStatus,
            invoiceDate: inv.invoiceDate || '', sellerName: inv.sellerName || owner,
            buyerName: inv.buyerName || '', invoiceType: inv.invoiceType || '',
            attachment: inv.attachment || null, note: inv.note || inv.employeeNote || '',
            status: '可用', usages: []
        });
    });

    activeInvoices.forEach(inv => {
        const key = invoicePoolIdentity(inv);
        const pool = pools.get(key);
        if (!pool) return;
        pool.usedAmount = roundMoney(pool.usedAmount + toMoney(inv.amount));
        pool.usages.push({
            id: inv.id,
            batchId: inv.batchId || '',
            appId: inv.appId || '',
            owner: inv.owner || inv.createdBy || '',
            amount: toMoney(inv.amount),
            status: inv.status || '待审核',
            createdAt: inv.createdAt || '',
            sourceInvoiceId: inv.sourceInvoiceId || '',
            detailAllocations: Array.isArray(inv.detailAllocations) ? inv.detailAllocations : []
        });
    });

    (invoiceDraftBatches || [])
        .filter(draft => (draft.status || '草稿') === '草稿')
        .filter(draft => !excludeDraftIds.has(draft.id))
        .forEach(draft => {
            (draft.items || []).forEach(item => {
                const invoiceNo = String(item.invoiceNo || '').trim();
                if (!invoiceNo) return;
                const ownerType=invoicePolicy.poolSnapshotType(item);
                if(!ownerType)return;
                const owner = item.poolOwner || item.sellerName || '';
                const key = `${invoiceNo}|${ownerType}|${normalizeText(owner)}`;
                const pool = pools.get(key);
                if (!pool) return;
                const amount = draftItemUsageAmount(item);
                if (amount <= 0) return;
                pool.usedAmount = roundMoney(pool.usedAmount + amount);
                pool.usages.push({
                    id: draft.id,
                    batchId: draft.submittedBatchId || '',
                    appId: draft.appId || '',
                    amount,
                    status: draft.status || '草稿',
                    createdAt: draft.createdAt || '',
                    poolStartAt: item.poolStartAt || '',
                    owner: draft.owner || draft.createdBy || '',
                    detailAllocations: Array.isArray(item.detailAllocations) ? item.detailAllocations : []
                });
            });
        });

    const built = [...pools.values()].map(pool => {
        const remainingAmount = positiveMoney(pool.invoiceTotalAmount - pool.usedAmount);
        const timing = poolTiming(pool.poolStartAt || pool.uploadedAt || pool.createdAt || '');
        return {
            ...pool,
            ...timing,
            availableUntil: timing.poolExpireAt || pool.availableUntil || '',
            remainingAmount,
            status: remainingAmount <= 0.01 ? '已用完' : (timing.isExpired ? '已过期' : '可用')
        };
    }).filter(pool => pool.remainingAmount > 0.01)
      .sort((a, b) => b.remainingAmount - a.remainingAmount || String(b.invoiceDate).localeCompare(String(a.invoiceDate)));
    if (!filterUser) return built;
    const allowedRows = getInvoiceExpectedItems(filterUser);
    const allowedSupplierNames = new Set(allowedRows.filter(row => !row.isReplacementRow).map(row => row.normalizedSupplier));
    const allowedEmployeeNames = new Set(allowedRows.filter(row => row.isReplacementRow).map(row => normalizeText(row.supplier)));
    return built.filter(pool => {
        if (pool.ownerType === 'supplier') return allowedSupplierNames.has(normalizeText(pool.owner));
        return pool.sourceOwner === filterUser && allowedEmployeeNames.has(normalizeText(pool.owner));
    }).map(pool => ({
        supplierName: pool.owner,
        invoiceNo: pool.invoiceNo,
        invoiceDate: pool.invoiceDate,
        remainingAmount: pool.remainingAmount,
        timeStatus: pool.timeStatus
    }));
}

// multer 配置 - 附件上传
function recoverMultipartUtf8Filename(value) {
    const raw = String(value || '');
    if (!/[\u0080-\u00ff]/.test(raw)) return raw;
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    if (decoded.includes('\ufffd')) return raw;
    return /[^\u0000-\u00ff]/.test(decoded) ? decoded : raw;
}

function sanitizeOriginalFilename(value, { recoverMultipart = false } = {}) {
    const basename = (recoverMultipart ? recoverMultipartUtf8Filename(value) : String(value || ''))
        .normalize('NFKC')
        .split(/[\\/]/)
        .pop()
        .replace(/[\u0000-\u001f\u007f<>:"|?*&]+/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/^[.\s]+|[.\s]+$/g, '')
        .slice(0, 180);
    return basename || '未命名附件';
}

function attachmentExtension(file) {
    return path.extname(sanitizeOriginalFilename(file?.originalname)).toLowerCase();
}

function createExtensionFilter(allowedExtensions, errorMessage) {
    return (req, file, cb) => {
        file.originalname = sanitizeOriginalFilename(file.originalname, { recoverMultipart: true });
        if (allowedExtensions.has(attachmentExtension(file))) cb(null, true);
        else cb(new Error(errorMessage));
    };
}

function uploadErrorMessage(err) {
    if (!err) return '';
    const messages = {
        LIMIT_FILE_SIZE: '单个附件不能超过 20MB',
        LIMIT_FILE_COUNT: '本次上传文件数量超过限制',
        LIMIT_UNEXPECTED_FILE: '上传字段不正确或文件数量超过限制',
        LIMIT_FIELD_COUNT: '上传附带字段数量超过限制',
        LIMIT_FIELD_KEY: '上传字段名称过长',
        LIMIT_FIELD_VALUE: '上传字段内容过长',
        LIMIT_PART_COUNT: '上传内容数量超过限制'
    };
    return messages[err.code] || err.message || '附件上传失败';
}

function rejectEmptyUpload(files) {
    const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
    return list.some(file => Number(file.size || 0) === 0) ? '不接受空文件' : '';
}

function uploadedFileContentError(files) {
    const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
    for (const file of list) {
        let header;
        let descriptor;
        try {
            descriptor = fs.openSync(file.path, 'r');
            header = Buffer.alloc(1024);
            const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
            header = header.subarray(0, bytesRead);
        } catch (err) {
            return `${file.originalname || '附件'} 无法读取`;
        } finally {
            if (descriptor !== undefined) {
                try { fs.closeSync(descriptor); } catch (e) {}
            }
        }

        const ext = attachmentExtension(file);
        const isPdf = header.includes(Buffer.from('%PDF-'));
        const isJpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
        const isPng = header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const isZip = header.length >= 4 && header[0] === 0x50 && header[1] === 0x4b && [0x03, 0x05, 0x07].includes(header[2]) && [0x04, 0x06, 0x08].includes(header[3]);
        const isOle = header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
        const valid = (ext === '.pdf' && isPdf)
            || ((ext === '.jpg' || ext === '.jpeg') && isJpeg)
            || (ext === '.png' && isPng)
            || ((ext === '.docx' || ext === '.xlsx') && isZip)
            || ((ext === '.doc' || ext === '.xls') && isOle);
        if (!valid) return `${file.originalname || '附件'} 的实际内容与文件格式不一致`;
    }
    return '';
}

function removeUploadedFiles(files) {
    const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
    list.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
        forgetTemporaryAttachment('/attachments/' + String(file.filename || ''));
    });
}

function forgetTemporaryAttachment(publicPath) {
    temporaryAttachmentOwners.delete(publicPath);
    temporaryAttachmentNames.delete(publicPath);
}

function rememberTemporaryAttachment(publicPath, username, originalName) {
    temporaryAttachmentOwners.set(publicPath, username);
    temporaryAttachmentNames.set(publicPath, originalName);
    const expiry = setTimeout(() => forgetTemporaryAttachment(publicPath), 24 * 60 * 60 * 1000);
    if (typeof expiry.unref === 'function') expiry.unref();
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, ATTACHMENTS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
        const filename = uniqueSuffix + attachmentExtension(file);
        const username = getCurrentUser(req)?.username || '';
        if (username) {
            rememberTemporaryAttachment('/attachments/' + filename, username, file.originalname);
        }
        cb(null, filename);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE, files: 1, fields: 0, parts: 2 },
    fileFilter: createExtensionFilter(GENERAL_ATTACHMENT_EXTENSIONS, '附件只接受 PDF、Word、Excel、PNG 和 JPG 格式')
});

function isAllowedInvoiceAttachment(file) {
    return INVOICE_ATTACHMENT_EXTENSIONS.has(attachmentExtension(file));
}

const invoiceUpload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_FILE_SIZE,
        files: MAX_INVOICE_BATCH_FILES,
        fields: INVOICE_UPLOAD_FIELD_LIMIT,
        parts: INVOICE_UPLOAD_FIELD_LIMIT + MAX_INVOICE_BATCH_FILES
    },
    fileFilter: (req, file, cb) => {
        file.originalname = sanitizeOriginalFilename(file.originalname, { recoverMultipart: true });
        if (isAllowedInvoiceAttachment(file)) cb(null, true);
        else cb(new Error('发票附件只接受 PDF、PNG 和 JPG 格式'));
    }
});

const invoiceSingleUpload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE, files: 1, fields: 2, parts: 4 },
    fileFilter: createExtensionFilter(INVOICE_ATTACHMENT_EXTENSIONS, '发票附件只接受 PDF、PNG 和 JPG 格式')
});

function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function createPasswordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, 32, 'sha256').toString('hex');
    return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${salt}$${derived}`;
}

function safeEqualText(left, right) {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyPassword(user, password) {
    const stored = String(user?.password || '').trim();
    const parts = stored.split('$');
    if (parts.length === 4 && parts[0] === 'pbkdf2-sha256') {
        const iterations = Number(parts[1]);
        if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 2000000 || !/^[0-9a-f]{32}$/i.test(parts[2]) || !/^[0-9a-f]{64}$/i.test(parts[3])) return false;
        const derived = crypto.pbkdf2Sync(String(password), parts[2], iterations, 32, 'sha256').toString('hex');
        return safeEqualText(derived, parts[3]);
    }
    return safeEqualText(stored, String(password))
        || safeEqualText(stored, hashPassword(password, user?.salt || SALT))
        || safeEqualText(stored, hashPassword(password, SALT));
}

function generateToken(username) {
    return crypto.randomBytes(32).toString('base64url');
}

function accountIsDeleted(account) {
    return Boolean(account?.deletedAt || account?.accountStatus === 'deleted');
}

function accountIsDisabled(account) {
    return !accountIsDeleted(account) && Boolean(account?.disabledAt || account?.accountStatus === 'disabled');
}

function accountIsActive(account) {
    return Boolean(account) && !accountIsDeleted(account) && !accountIsDisabled(account);
}

function accountLifecycleVersion(account) {
    const value = Number(account?.lifecycleVersion);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function activeAccountByUsername(username, records = users) {
    return (records || []).find(account => account.username === username && accountIsActive(account)) || null;
}

function safeUserLifecycleView(account) {
    return {
        username: String(account?.username || ''),
        role: String(account?.role || ''),
        created: account?.created || '',
        accountStatus: accountIsDeleted(account) ? 'deleted' : (accountIsDisabled(account) ? 'disabled' : 'active'),
        lifecycleVersion: accountLifecycleVersion(account),
        invoiceReplacementAllowed:account.invoiceReplacementAllowed===true,
        disabledAt: account?.disabledAt || '',
        disabledBy: account?.disabledBy || '',
        disabledReason: account?.disabledReason || '',
        passwordResetRequired: account?.passwordResetRequired === true,
        reenabledAt: account?.reenabledAt || '',
        reenabledBy: account?.reenabledBy || '',
        deletedAt: account?.deletedAt || '',
        deletedBy: account?.deletedBy || ''
    };
}

function revokeSessionsForUsername(username) {
    Object.entries(sessions).forEach(([token, session]) => {
        if (session?.username === username) delete sessions[token];
    });
}

function linkedEmployeePayee(records, username) {
    return (records || []).find(record => (
        normalizedPayeeAccountType(record) === 'employee-payee'
        && record.linkedEmployeeUsername === username
    )) || null;
}

function bankAccountExists(records, bankAccount, excludeId = '', target = null) {
    if (supplierBankIsOptional(target)) return false;
    const key = String(bankAccount || '').trim().toLowerCase();
    return Boolean(key) && (records || []).some(record => (
        record.id !== excludeId && !supplierBankIsOptional(record)
        && String(record.bankAccount || '').trim().toLowerCase() === key
    ));
}

function lifecycleReason(code, message, recordIds = []) {
    return { code, message, recordIds: [...new Set(recordIds.filter(Boolean))] };
}

function accountBusinessBlockers(username) {
    const reasons = [];
    const ownApplications = (applications || []).filter(record => record.applicant === username || record.owner === username);
    const activeApplications = ownApplications.filter(record => record.status !== 'closed');
    const pendingApplications = activeApplications.filter(record => ['pending', 'draft'].includes(record.status));
    if (pendingApplications.length) reasons.push(lifecycleReason('application-work', '仍有待处理项目申请或历史草稿', pendingApplications.map(record => record.id)));

    const ownProjectIds = new Set(ownApplications.map(record => record.id));
    const ownPayments = (payments || []).filter(record => record.applicant === username || record.owner === username || ownProjectIds.has(record.projectId));
    const pendingPayments = ownPayments.filter(record => ['pending', 'draft'].includes(record.status));
    if (pendingPayments.length) reasons.push(lifecycleReason('payment-work', '仍有待处理付款申请或历史草稿', pendingPayments.map(record => record.id)));
    const approvedProjectsWithoutPayment = activeApplications.filter(record => (
        record.status === 'approved' && approvedPaymentsForApp(record.id).length === 0
    ));
    if (approvedProjectsWithoutPayment.length) reasons.push(lifecycleReason(
        'payment-missing',
        '仍有已批准项目未形成有效付款记录',
        approvedProjectsWithoutPayment.map(record => record.id)
    ));

    const openDrafts = (invoiceDraftBatches || []).filter(record => (
        (record.owner === username || record.createdBy === username)
        && !['已提交', '已驳回', '已关闭'].includes(record.status)
        && record?.projectClosure?.result !== 'invalidated'
    ));
    if (openDrafts.length) reasons.push(lifecycleReason('invoice-draft', '仍有待处理发票草稿', openDrafts.map(record => record.id)));
    const pendingInvoices = (invoices || []).filter(record => (
        (record.owner === username || record.createdBy === username || ownProjectIds.has(record.appId))
        && record.status === '待审核'
        && record?.projectClosure?.result !== 'invalidated'
    ));
    if (pendingInvoices.length) reasons.push(lifecycleReason('invoice-review', '仍有待审核发票', pendingInvoices.map(record => record.id)));
    const pendingOcr = (invoiceOcrJobs || []).filter(record => (
        (record.owner === username || record.createdBy === username)
        && ['queued', 'pending', 'processing', '排队中', '识别中'].includes(record.status)
    ));
    if (pendingOcr.length) reasons.push(lifecycleReason('invoice-ocr', '仍有待处理发票识别任务', pendingOcr.map(record => record.id)));

    const invoiceSummary = buildInvoiceSummary(username);
    const gapRows = invoiceSummary.rows.filter(row => toMoney(row.missingAmount) > 0.009);
    if (gapRows.length) reasons.push(lifecycleReason('invoice-gap', '仍有发票缺口', gapRows.map(row => `${row.appId}:${row.key}`)));

    const ownDebts = (debts || []).filter(record => record.applicant === username || record.owner === username);
    const pendingDebts = ownDebts.filter(record => record.status === 'pending');
    if (pendingDebts.length) reasons.push(lifecycleReason('debt-review', '仍有待审核欠款', pendingDebts.map(record => record.id)));
    const outstandingDebts = ownDebts.filter(record => record.status === 'approved' && debtBalances(record, applications, payments).outstandingPrincipal > 0.009);
    if (outstandingDebts.length) reasons.push(lifecycleReason('debt-outstanding', '仍有未完成欠款工作', outstandingDebts.map(record => record.id)));
    return reasons;
}

function settlementContainsBonus(record, confirmationId, username) {
    if (record?.status !== 'locked' || record?.employee !== username) return false;
    return [...(record.businessBonusSnapshots || []), ...(record.executionBonusSnapshots || [])]
        .some(snapshot => snapshot?.confirmationId === confirmationId);
}

function requiredEmployeeReimbursements(username) {
    const usernameKey = String(username || '').trim().toLowerCase();
    const rows = [];
    (applications || []).filter(record => record.status === 'approved').forEach(application => {
        const payment = latestApprovedPayment(application.id, payments);
        if (!payment) return;
        (payment.items || []).forEach((item, itemIndex) => {
            const payeeAccountType = String(item?.payeeAccountType || '').trim();
            const linkedEmployeeUsername = String(item?.linkedEmployeeUsername || '').trim();
            const hasStructuredIdentity = Boolean(
                payeeAccountType
                || linkedEmployeeUsername
                || String(item?.payeeAccountId || '').trim()
            );
            const matches = hasStructuredIdentity
                ? payeeAccountType === 'employee-payee' && linkedEmployeeUsername.toLowerCase() === usernameKey
                : String(item?.supplier || '').trim().toLowerCase() === usernameKey;
            if (matches && toMoney(item?.amount) > 0) {
                rows.push({ paymentId: payment.id, itemIndex, sourceKey: `${payment.id}:${itemIndex}` });
            }
        });
    });
    return rows;
}

function settlementContainsReimbursement(record, source, username) {
    if (record?.status !== 'locked' || record?.employee !== username) return false;
    return (record.reimbursementSnapshots || []).some(snapshot => (
        String(snapshot?.sourceKey || '') === source.sourceKey
        || (String(snapshot?.paymentId || '') === String(source.paymentId) && Number(snapshot?.itemIndex) === source.itemIndex)
    ));
}

function accountDeletionBlockers(username) {
    const reasons = [...accountBusinessBlockers(username)];
    const projectIds = new Set((applications || []).filter(record => record.applicant === username || record.owner === username).map(record => record.id));
    const approvedProjectIds = [...projectIds].filter(projectId => (
        applications.some(record => record.id === projectId && record.status === 'approved')
        && payments.some(record => record.projectId === projectId && record.status === 'approved')
    ));
    const executionProjectIds = (payments || []).filter(record => (
        record.status === 'approved'
        && (record.executionParticipants || []).some(participant => participant.username === username)
    )).map(record => record.projectId);
    const requiredBonusProjectIds = [...new Set([...approvedProjectIds, ...executionProjectIds])];
    const lockedByProject = new Map((bonusConfirmations || []).filter(record => record.status === 'locked').map(record => [record.applicationId, record]));
    const missingBonus = requiredBonusProjectIds.filter(projectId => !lockedByProject.has(projectId));
    if (missingBonus.length) reasons.push(lifecycleReason('bonus-unconfirmed', '业务奖金或执行奖金尚未由管理员确认', missingBonus));

    const relevantBonuses = [...lockedByProject.values()].filter(record => (
        record.projectApplicant === username
        || (record.executionBonuses || []).some(item => item.username === username)
    ));
    const unsettled = relevantBonuses.filter(record => !(employeeSettlements || []).some(settlement => settlementContainsBonus(settlement, record.id, username)));
    if (unsettled.length) reasons.push(lifecycleReason('settlement-unconfirmed', '相关员工月结尚未由管理员确认', unsettled.map(record => record.id)));
    const unsettledReimbursements = requiredEmployeeReimbursements(username).filter(source => (
        !(employeeSettlements || []).some(settlement => settlementContainsReimbursement(settlement, source, username))
    ));
    if (unsettledReimbursements.length) reasons.push(lifecycleReason(
        'reimbursement-unconfirmed',
        '相关员工报销尚未由管理员月结确认',
        unsettledReimbursements.map(source => source.sourceKey)
    ));
    return reasons;
}

function assertLifecycleVersion(account, requestedVersion) {
    const version = Number(requestedVersion);
    if (!Number.isSafeInteger(version) || version !== accountLifecycleVersion(account)) {
        const error = new Error('账号状态已变更，请刷新后重试');
        error.statusCode = 409;
        throw error;
    }
}

function appendLifecycleAudit(next, { action, target, targetRole, operator, operatorRole, reason }) {
    const at = new Date().toLocaleString('zh-CN');
    next.accountLifecycleAuditRecords = Array.isArray(next.accountLifecycleAuditRecords) ? next.accountLifecycleAuditRecords : [];
    next.accountLifecycleAuditRecords.unshift({ action, target, targetRole, operator, operatorRole, time: at, reason });
    next.logs = Array.isArray(next.logs) ? next.logs : [];
    next.logs.unshift({ time: at, user: operator, action: `账号${action}`, detail: `${target}（${targetRole}） / 原因：${reason}` });
    if (next.logs.length > 500) next.logs.length = 500;
}

function commitAccountLifecycle({ username, expectedVersion, action, operator, reason, mutate }) {
    const current = users.find(account => account.username === username);
    if (!current) {
        const error = new Error('用户不存在');
        error.statusCode = 404;
        throw error;
    }
    assertLifecycleVersion(current, expectedVersion);
    const next = cloneCurrentDataState();
    const target = next.users.find(account => account.username === username);
    const result = mutate(next, target) || {};
    target.lifecycleVersion = accountLifecycleVersion(target) + 1;
    appendLifecycleAudit(next, {
        action, target: username, targetRole: target.role,
        operator: operator.username, operatorRole: operator.role, reason
    });
    if(result.permissionChange)next.accountLifecycleAuditRecords[0].permissionChange={...result.permissionChange};
    if (accountLifecycleSaveFailurePending) {
        accountLifecycleSaveFailurePending = false;
        throw new Error('测试注入：账号生命周期保存失败');
    }
    saveDataState(next);
    assignDataState(next);
    if (result.revokeSessions !== false) revokeSessionsForUsername(username);
    return { user: safeUserLifecycleView(target), ...result };
}

function tokenFromRequest(req) {
    const authHeader = String(req.headers['authorization'] || '');
    if (authHeader.startsWith('Bearer ')) return authHeader.slice('Bearer '.length).trim();
    const cookieHeader = String(req.headers.cookie || '');
    const sessionCookie = cookieHeader.split(';')
        .map(part => part.trim())
        .find(part => part.startsWith('k_session='));
    try {return sessionCookie ? decodeURIComponent(sessionCookie.slice('k_session='.length)) : '';}
    catch{return '';}
}

function sessionFromRequest(req) {
    const token = tokenFromRequest(req);
    if (!token) return null;
    const session = sessions[token];
    if (!session) return null;
    if (!session.expiresAt || session.expiresAt <= Date.now()) {
        delete sessions[token];
        return null;
    }
    const account = activeAccountByUsername(session.username);
    if (!account) {
        delete sessions[token];
        return null;
    }
    session.role = account.role;
    return { username: account.username, role: account.role, expiresAt: session.expiresAt };
}

function isAuthenticated(req) {
    return !!sessionFromRequest(req);
}

function getCurrentUser(req) {
    return sessionFromRequest(req);
}

function isReviewRole(user) {
    return user?.role === 'admin' || user?.role === 'approver';
}

function userOwnsApplication(user, app) {
    return !!user && !!app && (isReviewRole(user) || app.applicant === user.username || app.owner === user.username);
}

function userOwnsPayment(user, payment) {
    return !!user && !!payment && (
        isReviewRole(user)
        || payment.applicant === user.username
        || payment.owner === user.username
        || userOwnsApplication(user, appForPayment(payment))
    );
}

function isHistoricalPaymentDraft(payment) {
    return payment?.status === 'draft';
}

function analyzePaymentVersionGraph(projectPayments) {
    const rows = Array.isArray(projectPayments) ? projectPayments : [];
    const paymentById = new Map();
    const childrenById = new Map();
    const invalidReasons = [];
    rows.forEach(pay => {
        const id = String(pay?.id || '').trim();
        if (!id || paymentById.has(id)) invalidReasons.push('付款编号缺失或重复');
        else paymentById.set(id, pay);
    });
    rows.forEach(pay => {
        const id = String(pay?.id || '').trim();
        const previousPayId = String(pay?.previousPayId || '').trim();
        if (!id || !previousPayId) return;
        if (!paymentById.has(previousPayId)) {
            invalidReasons.push('付款版本引用了不存在的上一版：' + previousPayId);
            return;
        }
        const children = childrenById.get(previousPayId) || [];
        children.push(pay);
        childrenById.set(previousPayId, children);
        if (children.length > 1) invalidReasons.push('同一付款版本存在多个后续版本：' + previousPayId);
    });
    const rootById = new Map();
    rows.forEach(pay => {
        const startId = String(pay?.id || '').trim();
        if (!startId || rootById.has(startId)) return;
        let current = pay;
        const visited = new Set();
        while (current) {
            const currentId = String(current.id || '').trim();
            if (visited.has(currentId)) {
                invalidReasons.push('付款版本链存在循环引用：' + currentId);
                current = null;
                break;
            }
            visited.add(currentId);
            const previousPayId = String(current.previousPayId || '').trim();
            if (!previousPayId) break;
            current = paymentById.get(previousPayId) || null;
        }
        const rootId = current ? String(current.id || '').trim() : '';
        visited.forEach(id => rootById.set(id, rootId));
    });
    const openRootIds = new Set();
    const openRecords = [];
    rows.forEach(pay => {
        const id = String(pay?.id || '').trim();
        const hasChildren = (childrenById.get(id) || []).length > 0;
        const keepsChainOpen = pay.status === 'pending'
            || pay.status === 'approved'
            || (!hasChildren && pay.status !== 'closed' && !isHistoricalPaymentDraft(pay));
        if (!keepsChainOpen) return;
        const rootId = rootById.get(id) || id;
        openRootIds.add(rootId);
        openRecords.push(pay);
    });
    return {
        rows,
        paymentById,
        childrenById,
        rootById,
        openRootIds,
        openRecords,
        invalid: invalidReasons.length > 0,
        invalidReason: [...new Set(invalidReasons)].join('；')
    };
}

function projectPaymentVersionGraph(projectId) {
    return analyzePaymentVersionGraph(payments.filter(pay => pay.projectId === projectId));
}


function confirmedDebtPrincipalForPayment(payment, app) {
    if (Array.isArray(payment?.debtRepayments)) {
        return roundMoney(payment.debtRepayments.reduce((sum, detail) => sum + toMoney(detail?.confirmedPrincipal), 0));
    }
    return roundMoney((app?.debtLinks || []).reduce((sum, link) => sum + toMoney(link?.principal), 0));
}

function userOwnsDebt(user, debt) {
    return !!user && !!debt && (isReviewRole(user) || debt.applicant === user.username || debt.owner === user.username);
}

function normalizedAttachmentPublicPath(value) {
    const fullPath = attachmentFullPathFromPublicPath(value);
    return fullPath ? publicPathFromAttachmentFullPath(fullPath) : '';
}

function attachmentRecordMatches(record, publicPath) {
    if (!record || typeof record !== 'object') return false;
    const candidates = [record.path, record.originalPath, record.filename];
    return candidates.some(value => normalizedAttachmentPublicPath(value) === publicPath);
}

function attachmentListMatches(list, publicPath) {
    return (Array.isArray(list) ? list : []).some(record => attachmentRecordMatches(record, publicPath));
}

function canAccessAttachment(user, requestedPath) {
    if (!user) return false;
    const publicPath = normalizedAttachmentPublicPath(requestedPath);
    if (!publicPath) return false;
    if (isReviewRole(user)) return true;
    if (temporaryAttachmentOwners.get(publicPath) === user.username) return true;

    if (applications.some(app => userOwnsApplication(user, app) && attachmentListMatches(app.attachments, publicPath))) return true;
    if (payments.some(payment => userOwnsPayment(user, payment) && attachmentListMatches(payment.attachments, publicPath))) return true;
    if ((debts || []).some(debt => userOwnsDebt(user, debt) && attachmentListMatches(debt.attachments, publicPath))) return true;
    if (invoices.some(invoice => (
        (invoice.owner === user.username || invoice.createdBy === user.username || userOwnsApplication(user, appForInvoice(invoice)))
        && attachmentRecordMatches(invoice.attachment, publicPath)
    ))) return true;
    if ((invoiceOcrJobs || []).some(job => (
        (job.owner === user.username || job.createdBy === user.username || job.uploadedBy === user.username || userOwnsApplication(user, appForOcrJob(job)))
        && attachmentRecordMatches(job.attachment, publicPath)
    ))) return true;
    if ((invoiceDraftBatches || []).some(draft => (
        (draft.owner === user.username || draft.createdBy === user.username || userOwnsApplication(user, appForInvoiceDraft(draft)))
        && (attachmentRecordMatches(draft.attachment, publicPath)
            || (draft.items || []).some(item => attachmentRecordMatches(item.attachment, publicPath)))
    ))) return true;
    return false;
}

function sanitizeAttachmentForResponse(file) {
    if (!file || typeof file !== 'object') return file;
    const { archive, originalPath, ...safe } = file;
    return safe;
}

function findAttachmentRecord(publicPath) {
    const records = [];
    applications.forEach(record => records.push(...(record.attachments || [])));
    payments.forEach(record => records.push(...(record.attachments || [])));
    (debts || []).forEach(record => records.push(...(record.attachments || [])));
    invoices.forEach(record => records.push(record.attachment));
    (invoiceOcrJobs || []).forEach(record => records.push(record.attachment));
    (invoiceDraftBatches || []).forEach(record => {
        records.push(record.attachment);
        (record.items || []).forEach(item => records.push(item.attachment));
    });
    return records.find(record => attachmentRecordMatches(record, publicPath)) || null;
}

function attachmentDownloadName(publicPath, fullPath) {
    const record = findAttachmentRecord(publicPath);
    return sanitizeOriginalFilename(record?.originalName || record?.filename || temporaryAttachmentNames.get(publicPath) || path.basename(fullPath));
}

function contentDispositionForFilename(filename) {
    const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'attachment';
    const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return `inline; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}

function sanitizeRecordForResponse(record) {
    const safe = { ...record };
    delete safe.archive;
    delete safe.archiveError;
    if (Array.isArray(safe.attachments)) safe.attachments = safe.attachments.map(sanitizeAttachmentForResponse);
    if (safe.attachment) safe.attachment = sanitizeAttachmentForResponse(safe.attachment);
    return safe;
}

function sanitizeApplicationForResponse(record, eligibilityUsername = '') {
    const safe = sanitizeRecordForResponse(record);
    const reasons = projectConstraintReasons(record);
    if (reasons.length) safe.historyAnomaly = { label: '历史异常记录', reasons };
    if (record?.status === 'draft') safe.historyProjectDraft = { label: '历史项目草稿（只读）', readOnly: true };
    const eligibility = projectExtraDebtEligibility({
        originalProjectId: record?.id,
        username: eligibilityUsername || record?.applicant || '',
        applications,
        payments,
        bonusConfirmations
    });
    safe.debtExtraEligibility = { eligible: eligibility.eligible, reason: eligibility.reason };
    return safe;
}

function sanitizePaymentForResponse(record) {
    const safe = sanitizeRecordForResponse(record);
    if (isHistoricalPaymentDraft(record)) {
        safe.historyPaymentDraft = {
            label: '历史付款草稿（只读）',
            readOnly: true,
            reason: '付款草稿功能已停用；本记录仅保留历史原始证据，不占用付款入口且不进入下游。'
        };
    }
    return safe;
}

function dataForUser(user) {
    const visibleApplications = isReviewRole(user)
        ? applications
        : applications.filter(app => userOwnsApplication(user, app));
    const visibleAppIds = new Set(visibleApplications.map(app => app.id));
    const visiblePayments = isReviewRole(user)
        ? payments
        : payments.filter(payment => userOwnsPayment(user, payment) && visibleAppIds.has(payment.projectId));
    const visibleClosures = isReviewRole(user)
        ? projectClosureRecords
        : projectClosureRecords.filter(record => visibleAppIds.has(record.projectId));
    const visiblePaymentCorrections = isReviewRole(user)
        ? paymentCorrectionRecords
        : paymentCorrectionRecords.filter(record => visibleAppIds.has(record.projectId));
    return {
        applications: visibleApplications.map(app => sanitizeApplicationForResponse(app, isReviewRole(user) ? app.applicant : user?.username)),
        payments: visiblePayments.map(sanitizePaymentForResponse),
        projectClosureRecords: visibleClosures.map(sanitizeRecordForResponse),
        paymentCorrectionRecords: visiblePaymentCorrections.map(sanitizeRecordForResponse)
    };
}

function incomingAttachmentsAuthorized(user, attachments) {
    return (Array.isArray(attachments) ? attachments : []).every(file => (
        file && typeof file === 'object' && canAccessAttachment(user, file.path || file.filename)
    ));
}

function incomingInvoiceAttachmentsAuthorized(user, body) {
    const attachments = [];
    if (body?.attachment !== undefined && body.attachment !== null) attachments.push(body.attachment);
    (Array.isArray(body?.items) ? body.items : []).forEach(item => {
        if (item?.attachment !== undefined && item.attachment !== null) attachments.push(item.attachment);
    });
    return attachments.every(file => (
        file && typeof file === 'object' && canAccessAttachment(user, file.path || file.filename)
    ));
}

function isLoopbackAddress(address) {
    const value = String(address || '').trim().toLowerCase().split('%')[0];
    return value === '::1'
        || value === '127.0.0.1'
        || /^127(?:\.\d{1,3}){3}$/.test(value)
        || /^::ffff:127(?:\.\d{1,3}){3}$/.test(value);
}

function isLoopbackRequest(req) {
    return isLoopbackAddress(req.socket?.remoteAddress || req.connection?.remoteAddress);
}

function buildAuthoritativeStatsReport(searchParams = new URLSearchParams()) {
    const projectActivityMonth = app => isValidProjectActivityDate(app?.startDate) ? String(app.startDate).slice(0, 7) : null;
    const monthNumber = value => parseInt(String(value || '').slice(-2), 10) || 0;
    const yearNumber = value => parseInt(String(value || '').slice(0, 4), 10) || 0;
    const clampMonth = value => { const parsed = parseInt(value, 10); return parsed >= 1 && parsed <= 12 ? parsed : null; };
    const approvedApplications = applications.filter(app => app.status === 'approved');
    const missingActivityDates = approvedApplications.filter(app => !String(app.startDate || '').trim()).map(app => ({ id: app.id, projectName: app.projectName || '', applicant: app.applicant || app.owner || '', activityDateVersion: Number.isInteger(Number(app.activityDateVersion)) && Number(app.activityDateVersion) >= 0 ? Number(app.activityDateVersion) : 0 })).sort((a, b) => String(a.id).localeCompare(String(b.id), 'zh-CN'));
    const allRows = approvedApplications.map(app => ({ app, pay: latestApprovedPayment(app.id, payments), activityMonth: projectActivityMonth(app) })).filter(row => row.pay && row.activityMonth);
    const availableMonths = [...new Set(allRows.map(row => row.activityMonth))].sort();
    const availableYears = [...new Set(availableMonths.map(yearNumber))].filter(Boolean).sort((a, b) => a - b);
    const latestMonth = availableMonths.at(-1) || '';
    const chinaNow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    const rawStart = String(searchParams.get('startMonth') || '');
    const rawEnd = String(searchParams.get('endMonth') || '');
    const requestedYear = parseInt(searchParams.get('year'), 10) || yearNumber(rawStart) || yearNumber(rawEnd);
    const selectedYear = requestedYear > 0 ? requestedYear : (yearNumber(latestMonth) || Number(chinaNow.year));
    const defaultMonth = monthNumber(latestMonth) || Number(chinaNow.month);
    const startMonth = clampMonth(rawStart.includes('-') ? rawStart.slice(5, 7) : rawStart) || defaultMonth;
    const endMonth = clampMonth(rawEnd.includes('-') ? rawEnd.slice(5, 7) : rawEnd) || startMonth;
    if (startMonth > endMonth) throw Object.assign(new Error('起始月份不得晚于结束月份'), { statusCode: 400 });
    const rows = allRows.filter(row => yearNumber(row.activityMonth) === selectedYear && monthNumber(row.activityMonth) >= startMonth && monthNumber(row.activityMonth) <= endMonth);
    const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const round2 = value => Math.round(value * 100) / 100;
    const statsFor = ({ app, pay, activityMonth }) => {
        const items = Array.isArray(pay.kpiItems) ? pay.kpiItems : (Array.isArray(pay.items) ? pay.items : (app.items || []));
        const revenue = num(pay.contractAmount !== undefined ? pay.contractAmount : app.contractAmount);
        const tax = num(pay.taxAmount);
        let amount = 0; let serviceFee = 0; let proxyCost = 0;
        items.forEach(item => { const rowAmount = num(item.amount); const rowFee = num(item.serviceFee); amount += rowAmount; serviceFee += rowFee; if (String(item.isProxy || '').trim() === '是') proxyCost += rowAmount + rowFee; });
        const cost = amount + serviceFee + tax;
        const profit = revenue - cost;
        return { app, pay, activityMonth, revenue, tax, amount, serviceFee, proxyCost, cost, profit, kpi1: revenue > 0 ? profit / revenue : 0, kpi2: revenue - proxyCost > 0 ? profit / (revenue - proxyCost) : 0, proxyRatio: revenue - tax > 0 ? proxyCost / (revenue - tax) : 0 };
    };
    const stats = rows.map(statsFor);
    const byApplicant = {};
    stats.forEach(row => { const key = row.app.applicant || '未知'; const target = byApplicant[key] || (byApplicant[key] = { count: 0, revenue: 0, amount: 0, serviceFee: 0, tax: 0, cost: 0, proxyCost: 0 }); target.count += 1; ['revenue', 'amount', 'serviceFee', 'tax', 'cost', 'proxyCost'].forEach(field => { target[field] += row[field]; }); });
    Object.values(byApplicant).forEach(row => { row.profit = row.revenue - row.cost; row.kpi1 = row.revenue > 0 ? row.profit / row.revenue : 0; row.kpi2 = row.revenue - row.proxyCost > 0 ? row.profit / (row.revenue - row.proxyCost) : 0; row.proxyRatio = row.revenue - row.tax > 0 ? row.proxyCost / (row.revenue - row.tax) : 0; row.profitRate = row.kpi1; ['revenue', 'amount', 'serviceFee', 'tax', 'cost', 'proxyCost', 'profit'].forEach(field => { row[field] = round2(row[field]); }); });
    const bySupplier = {};
    rows.forEach(({ pay }) => { const seen = {}; (pay.items || []).forEach(item => { const key = item.supplier || '未知'; seen[key] = (seen[key] || 0) + num(item.amount); }); Object.entries(seen).forEach(([key, amount]) => { const target = bySupplier[key] || (bySupplier[key] = { total: 0, count: 0 }); target.total = round2(target.total + amount); target.count += 1; }); });
    const monthlyMap = {};
    stats.forEach(row => { const target = monthlyMap[row.activityMonth] || (monthlyMap[row.activityMonth] = { count: 0, revenue: 0, cost: 0 }); target.count += 1; target.revenue += row.revenue; target.cost += row.cost; });
    const monthly = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, row]) => ({ month, count: row.count, revenue: round2(row.revenue), cost: round2(row.cost), profit: round2(row.revenue - row.cost), profitRate: row.revenue > 0 ? round2((row.revenue - row.cost) / row.revenue * 100) : 0 }));
    const totalRevenue = stats.reduce((sum, row) => sum + row.revenue, 0); const totalCost = stats.reduce((sum, row) => sum + row.cost, 0); const totalTax = stats.reduce((sum, row) => sum + row.tax, 0);
    return { totalRevenue: round2(totalRevenue), totalCost: round2(totalCost), totalTax: round2(totalTax), netProfit: round2(totalRevenue - totalCost), avgProfitRate: totalRevenue > 0 ? round2((totalRevenue - totalCost) / totalRevenue * 100) : 0, byApplicant, bySupplier, monthly, appCount: rows.length, payCount: rows.length, missingActivityDates, sourceIds: rows.map(row => row.app.id), filter: { year: selectedYear, startMonth, endMonth, availableYears: availableYears.length ? availableYears : [selectedYear], availableMonths, label: startMonth === endMonth ? `${selectedYear}年${startMonth}月` : `${selectedYear}年${startMonth}月—${endMonth}月` } };
}

const bootstrapHandler=createBootstrapHandler({...startupOptions,getPort:()=>server.address()?.port,
    onInitialized:state=>{assignDataState(runtimeState(state));needsInitialization=false;}});
const configHandler=createConfigHandler({store:configStore,getCurrentUser,getLogs:()=>logs});
const server = http.createServer((req,res)=>{
  try { handleRequest(req,res); } catch(error) {
    console.error('Request failed:',error.message);
    if(!res.headersSent)res.writeHead(error.statusCode||500,{'Content-Type':'application/json; charset=utf-8'});
    if(!res.writableEnded)res.end(JSON.stringify({error:error.statusCode?error.message:'请求处理失败，请重试；如持续失败请联系管理员。'}));
  }
});
function handleRequest(req, res) {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Cache-Control','no-store');
    if(req.headers.origin && req.headers.origin!==((req.socket.encrypted?'https':'http')+'://'+req.headers.host)){res.writeHead(403);res.end(JSON.stringify({error:'拒绝跨来源请求'}));req.resume();return;}
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    if(bootstrapHandler(req,res))return;
    if(needsInitialization && String(req.url||'').startsWith('/api/')){res.writeHead(503);res.end(JSON.stringify({error:'请先在主机本机完成首次初始化'}));req.resume();return;}
    // 登录
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let payload = {};
            try {
                payload = JSON.parse(body || '{}');
            } catch (e) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: 'JSON格式错误' }));
                return;
            }
            const username = String(payload.username || '').trim();
            const password = String(payload.password || '');
            const user = users.find(u => accountIsActive(u) && String(u.username || '').trim() === username && verifyPassword(u, password));
            res.setHeader('Content-Type', 'application/json');
            if (user) {
                const token = generateToken(username);
                const expiresAt = Date.now() + SESSION_TTL_MS;
                sessions[token] = { username: username, role: user.role, expiresAt };
                res.setHeader('Set-Cookie', `k_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
                res.end(JSON.stringify({ success: true, username, role: user.role, token, expiresAt }));
            } else {
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // 登出
    if (req.url === '/api/logout' && req.method === 'POST') {
        const token = tokenFromRequest(req);
        if (token) delete sessions[token];
        res.setHeader('Set-Cookie', 'k_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // 验证token
    if (req.url === '/api/check-auth' && req.method === 'GET') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
            authenticated: !!user,
            username: user?.username,
            role: user?.role,
            capabilities: {
                invoiceTestReset: Boolean(user?.role === 'admin' && TEST_RESET_ENABLED && isLoopbackRequest(req))
            }
        }));
        return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const dangerousManagementPath = requestUrl.pathname === '/api/admin/exec' || requestUrl.pathname === '/api/admin/status';
    const fileSharePath = requestUrl.pathname === '/api/share' || requestUrl.pathname === '/api/download' || requestUrl.pathname === '/share' || requestUrl.pathname === '/share.html';
    if (dangerousManagementPath || fileSharePath) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
    }

    if (requestUrl.pathname.startsWith('/api/') && !isAuthenticated(req)) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(401);
        res.end(JSON.stringify({ error: '未登录' }));
        return;
    }

    if(configHandler(req,res))return;

    const standardEmployeeWritePaths = new Set([
        '/api/application', '/api/payment', '/api/debts', '/api/invoice-drafts',
        '/api/invoice-drafts/submit', '/api/invoices/ocr', '/api/invoices/ocr-batch-v2',
        '/api/invoices/batch-v2', '/api/invoices/ocr-batch', '/api/invoices/batch',
        '/api/invoices/analyze', '/api/invoices', '/api/upload'
    ]);
    const isStandardEmployeeWrite = (req.method === 'POST' && standardEmployeeWritePaths.has(requestUrl.pathname))
        || (req.method === 'DELETE' && /^\/api\/invoice-drafts\/[^/]+$/.test(requestUrl.pathname));
    if (isStandardEmployeeWrite) {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'user') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '审批岗和系统管理员不能使用标准员工创建、重提或草稿入口；历史本人记录仅供只读查看' }));
            return;
        }
    }

    if (requestUrl.pathname === '/api/debt-edit-lock' && (req.method === 'POST' || req.method === 'DELETE')) {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'user') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '审批岗和系统管理员不能取得或释放标准员工欠款编辑锁；历史本人记录仅供只读查看' }));
            return;
        }
    }

    if (requestUrl.pathname === '/api/exports' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const options = Object.fromEntries(requestUrl.searchParams.entries());
        if (options.module === 'ops') {
            try {
                const backups = listStructuredDataBackups({ backupsDir: BACKUPS_DIR });
                options.opsRecords = Array.isArray(backups) ? backups : (backups?.records || backups?.backups || []);
            } catch (error) {
                options.opsRecords = [];
            }
        }
        const resolveExportAttachment = async (attachment, limits = {}) => {
            const publicPath = String(attachment?.path || attachment?.originalPath || attachment?.filename || '').trim();
            if (!publicPath || !canAccessAttachment(user, publicPath)) return null;
            const fullPath = attachmentFullPathFromPublicPath(publicPath);
            if (!fullPath) return null;
            let stat;
            try { stat = await fs.promises.stat(fullPath); } catch (error) { return null; }
            if (!stat.isFile()) return null;
            if (Number.isFinite(Number(limits.maxBytes)) && stat.size > Number(limits.maxBytes)) throw Object.assign(new Error('授权附件超过导出大小上限'), { statusCode: 413 });
            let buffer;
            try { buffer = await fs.promises.readFile(fullPath); } catch (error) { return null; }
            return { path: fullPath, buffer, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
        };
        const exportFilterUser = isReviewRole(user) ? null : user.username;
        let exportState;
        try {
            exportState = {
                ...currentDataState(),
                debts: (debts || []).map(debt => debtView(debt, applications, payments)),
                invoices: options.module === 'invoice' && options.view === 'pool'
                    ? buildInvoicePools(exportFilterUser)
                    : buildInvoiceSummary(exportFilterUser).invoices,
                __exportDataReport: options.module === 'data' ? buildAuthoritativeStatsReport(requestUrl.searchParams) : null
            };
        } catch (error) {
            res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: error.message || '导出权威视图生成失败' }));
            return;
        }
        generateExport(exportState, user, options, { resolveAttachment: resolveExportAttachment })
            .then(result => {
                try {
                    const next = cloneCurrentDataState();
                    next.exportAuditRecords = Array.isArray(next.exportAuditRecords) ? next.exportAuditRecords : [];
                    next.exportAuditRecords.push(result.audit);
                    saveDataState(next);
                    assignDataState(next);
                } catch (saveError) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '导出审计保存失败，未返回文件' }));
                    return;
                }
                const encoded = encodeURIComponent(result.filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
                res.writeHead(200, {
                    'Content-Type': result.mime,
                    'Content-Length': result.buffer.length,
                    'Content-Disposition': `attachment; filename="export.${result.filename.split('.').pop()}"; filename*=UTF-8''${encoded}`,
                    'Cache-Control': 'no-store',
                    'X-Content-Type-Options': 'nosniff'
                });
                res.end(result.buffer);
            })
            .catch(error => {
                if (res.headersSent) return;
                res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify({ error: error.message || '导出生成失败' }));
            });
        return;
    }

    // 获取数据
    if (req.url === '/api/data') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(dataForUser(user)));
        return;
    }

    // 获取审批人列表
    if (req.url === '/api/approvers' && req.method === 'GET') {
        const approvers = users
            .filter(u => accountIsActive(u) && (u.role === 'admin' || u.role === 'approver'))
            .map(u => ({ username: u.username, role: u.role }));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(approvers));
        return;
    }

    if (req.url.startsWith('/api/execution-participants') && req.method === 'GET') {
        const user = getCurrentUser(req);
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const projectId = String(urlObj.searchParams.get('projectId') || '').trim();
        const app = applications.find(item => item.id === projectId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!app) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: '关联项目不存在' }));
            return;
        }
        if (user.role === 'user' && app.applicant !== user.username) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只能为本人申请的项目登记执行人员' }));
            return;
        }
        res.end(JSON.stringify({
            success: true,
            projectApplicant: app.applicant || '',
            users: employeeOptions(users, app.applicant)
        }));
        return;
    }

    // 用户列表（仅管理员）
    if (requestUrl.pathname === '/api/users' && req.method === 'GET') {
        const user = getCurrentUser(req);
        if (user && user.role === 'admin') {
            const includeLifecycle = requestUrl.searchParams.get('includeLifecycle') === '1';
            const safeUsers = users.filter(account => !accountIsDeleted(account)).map(account => (
                includeLifecycle ? safeUserLifecycleView(account) : {
                    username: account.username,
                    role: account.role,
                    created: account.created,
                    accountStatus: accountIsDisabled(account) ? 'disabled' : 'active',
                    lifecycleVersion: accountLifecycleVersion(account),
                    invoiceReplacementAllowed:account.invoiceReplacementAllowed===true
                }
            ));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(safeUsers));
        } else {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
        }
        return;
    }

    // 添加用户（仅管理员）
    if (req.url === '/api/users' && req.method === 'POST') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const username = String(body.username || '').trim();
            const password = String(body.password || '');
            const role = body.role;
            if (!username || !password.trim()) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '用户名和密码不能为空' }));
                return;
            }
            if (users.find(u => canonicalAccountKey(u.username) === canonicalAccountKey(username))) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '用户名已存在或已永久保留' }));
                return;
            }
            if (!['admin', 'approver', 'user'].includes(role || 'user')) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '用户角色无效' }));
                return;
            }
            const createPayeeAccount = body.createPayeeAccount === true;
            if (createPayeeAccount && (role || 'user') !== 'user') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '只有员工账号可以同步建立员工收款账号' }));
                return;
            }
            const payeeBankAccount = String(body.payeeBankAccount || '').trim();
            if (createPayeeAccount && suppliers.some(record => (
                !normalizedPayeeAccountType(record)
                && normalizeText(record.name) === normalizeText(username)
            ))) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '已存在同名历史收款对象，请先在原记录上完成分类和关联' }));
                return;
            }
            if (createPayeeAccount && bankAccountExists(suppliers, payeeBankAccount, '', {payeeAccountType:'employee-payee'})) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '银行账号已被其他收款对象使用' }));
                return;
            }
            if (createPayeeAccount && suppliers.some(record => normalizedPayeeAccountType(record) === 'employee-payee' && (normalizeText(record.name) === normalizeText(username) || record.linkedEmployeeUsername === username))) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该员工已存在关联收款账号' }));
                return;
            }
            try {
                const next = cloneCurrentDataState();
                const createdAt = new Date().toLocaleString('zh-CN');
                next.users.push({ username, password: createPasswordHash(password), role: role || 'user', created: createdAt, accountStatus: 'active', lifecycleVersion: 0, invoiceReplacementAllowed:false });
                let payeeAccount = null;
                if (createPayeeAccount) {
                    payeeAccount = {
                        id: nextSupplierRecordId(next.suppliers), name: username, bankAccount: payeeBankAccount,
                        taxNumber: '', payeeAccountType: 'employee-payee', linkedEmployeeUsername: username,
                        createdBy: user.username, created: createdAt, enabled: true
                    };
                    next.suppliers.push(payeeAccount);
                }
                next.logs.unshift({ time: createdAt, user: user.username, action: '添加用户', detail: `${username}（${role || 'user'}）${payeeAccount ? ' / 已建立关联员工收款账号' : ''}` });
                if (next.logs.length > 500) next.logs = next.logs.slice(0, 500);
                saveDataState(next);
                assignDataState(next);
                res.end(JSON.stringify({ success: true, payeeAccount }));
            } catch (saveError) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '用户与收款账号保存失败' }));
            }
        });
        return;
    }

    if (requestUrl.pathname === '/api/account-lifecycle-audit' && req.method === 'GET') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
        } else {
            const records = (accountLifecycleAuditRecords || []).map(record => ({
                time: record.time || '',
                target: record.target || '',
                targetRole: record.targetRole || '',
                action: record.action || '',
                operator: record.operator || '',
                operatorRole: record.operatorRole || '',
                reason: record.reason || ''
            }));
            res.end(JSON.stringify({ records }));
        }
        return;
    }

    const userLifecycleMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)\/(lifecycle|deactivate|activate|reset-password|invoice-replacement)$/);
    if (userLifecycleMatch) {
        const operator = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!operator || operator.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        const username = decodeURIComponent(userLifecycleMatch[1]);
        const action = userLifecycleMatch[2];
        const account = users.find(item => item.username === username);
        if (!account) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: '用户不存在' }));
            return;
        }
        if (action === 'lifecycle' && req.method === 'GET') {
            const blockers = account.role === 'user' ? accountBusinessBlockers(username) : [];
            const deletionBlockers = account.role === 'user' ? accountDeletionBlockers(username) : [];
            res.end(JSON.stringify({ user: safeUserLifecycleView(account), blockers, deletionBlockers }));
            return;
        }
        if (action === 'lifecycle') {
            res.writeHead(405);
            res.end(JSON.stringify({ error: '生命周期状态仅支持只读查询' }));
            return;
        }
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end(JSON.stringify({ error: '方法不允许' }));
            return;
        }
        parseJsonBody(req, (error, body) => {
            if (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const reason = String(body.reason || '').trim();
            if (!reason) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '必须填写操作原因' }));
                return;
            }
            try {
                let result;
                if(action==='invoice-replacement'){
                    result=commitAccountLifecycle({username,expectedVersion:body.expectedVersion,action:'invoice-replacement',operator,reason,
                        mutate:(next,target)=>{
                            const change=invoicePolicy.replacementPermissionPatch(operator.username,username,body.allowed,body.expectedVersion,next.users);
                            const before=target.invoiceReplacementAllowed===true;
                            Object.assign(target,change);
                            return {permissionChange:{before,after:target.invoiceReplacementAllowed}};
                        }});
                } else if (action === 'deactivate') {
                    if (username === operator.username) {
                        const conflict = new Error('不能停用当前登录管理员'); conflict.statusCode = 409; throw conflict;
                    }
                    if (!accountIsActive(account)) {
                        const conflict = new Error('账号当前不是有效状态'); conflict.statusCode = 409; throw conflict;
                    }
                    if (account.role === 'admin' && users.filter(item => item.role === 'admin' && accountIsActive(item)).length <= 1) {
                        const conflict = new Error('系统至少必须保留一个有效管理员'); conflict.statusCode = 409; throw conflict;
                    }
                    const blockers = account.role === 'user' ? accountBusinessBlockers(username) : [];
                    if (blockers.length) {
                        res.writeHead(409);
                        res.end(JSON.stringify({ error: '账号仍有未完成业务，不能停用', reasons: blockers }));
                        return;
                    }
                    result = commitAccountLifecycle({ username, expectedVersion: body.expectedVersion, action: '停用', operator, reason, mutate: (next, target) => {
                        const at = new Date().toLocaleString('zh-CN');
                        target.accountStatus = 'disabled'; target.disabledAt = at; target.disabledBy = operator.username; target.disabledReason = reason;
                        target.passwordResetRequired = body.securityReason === true;
                        const payee = linkedEmployeePayee(next.suppliers, username);
                        if (payee) { payee.enabled = false; payee.disabledAt = at; payee.disabledBy = operator.username; payee.disabledReason = reason; }
                    }});
                } else if (action === 'reset-password') {
                    if (accountIsDeleted(account)) { const conflict = new Error('已删除账号永不恢复'); conflict.statusCode = 409; throw conflict; }
                    const password = String(body.password || '');
                    if (!password.trim()) { const invalid = new Error('新密码不能为空'); invalid.statusCode = 400; throw invalid; }
                    result = commitAccountLifecycle({ username, expectedVersion: body.expectedVersion, action: '重置密码', operator, reason, mutate: (next, target) => {
                        target.password = createPasswordHash(password); target.passwordResetRequired = false;
                    }});
                } else if (action === 'activate') {
                    if (!accountIsDisabled(account)) { const conflict = new Error('账号当前不是停用状态'); conflict.statusCode = 409; throw conflict; }
                    if (account.passwordResetRequired === true) { const conflict = new Error('安全停用账号必须先重置密码'); conflict.statusCode = 409; throw conflict; }
                    result = commitAccountLifecycle({ username, expectedVersion: body.expectedVersion, action: '启用', operator, reason, mutate: (next, target) => {
                        const at = new Date().toLocaleString('zh-CN');
                        target.accountStatus = 'active'; target.disabledAt = ''; target.disabledBy = ''; target.disabledReason = '';
                        target.reenabledAt = at; target.reenabledBy = operator.username;
                        const payee = linkedEmployeePayee(next.suppliers, username);
                        if (payee) { payee.enabled = true; payee.disabledAt = ''; payee.disabledBy = ''; payee.disabledReason = ''; }
                    }});
                }
                res.end(JSON.stringify({ success: true, ...result }));
            } catch (lifecycleError) {
                res.writeHead(lifecycleError.statusCode || 500);
                res.end(JSON.stringify({ error: lifecycleError.message || '账号生命周期操作失败' }));
            }
        });
        return;
    }

    if (requestUrl.pathname.match(/^\/api\/users\/[^/]+$/) && req.method === 'PATCH') {
        const operator = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!operator || operator.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: '无权限' })); return; }
        const username = decodeURIComponent(requestUrl.pathname.split('/')[3] || '');
        parseJsonBody(req, (error, body) => {
            if (error) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON格式错误' })); return; }
            const role = String(body.role || '').trim();
            const reason = String(body.reason || '').trim();
            try {
                const account = users.find(item => item.username === username);
                if (!account) { const missing = new Error('用户不存在'); missing.statusCode = 404; throw missing; }
                if (accountIsDeleted(account)) { const conflict = new Error('已删除账号永不恢复'); conflict.statusCode = 409; throw conflict; }
                if (!['admin', 'approver', 'user'].includes(role)) { const invalid = new Error('用户角色无效'); invalid.statusCode = 400; throw invalid; }
                if (!reason) { const invalid = new Error('必须填写操作原因'); invalid.statusCode = 400; throw invalid; }
                if (username === operator.username && role !== 'admin') { const conflict = new Error('不能变更当前登录管理员角色'); conflict.statusCode = 409; throw conflict; }
                if (account.role === 'admin' && role !== 'admin' && accountIsActive(account) && users.filter(item => item.role === 'admin' && accountIsActive(item)).length <= 1) { const conflict = new Error('系统至少必须保留一个有效管理员'); conflict.statusCode = 409; throw conflict; }
                if (account.role === 'user' && role !== 'user') {
                    const blockers = accountBusinessBlockers(username);
                    if (blockers.length) { res.writeHead(409); res.end(JSON.stringify({ error: '员工仍有未完成业务，不能调整为其他角色', reasons: blockers })); return; }
                }
                const result = commitAccountLifecycle({ username, expectedVersion: body.expectedVersion, action: '变更角色', operator, reason, mutate: (next, target) => {
                    target.role = role;
                    const payee = linkedEmployeePayee(next.suppliers, username);
                    if (payee) payee.enabled = role === 'user' && accountIsActive(target);
                }});
                res.end(JSON.stringify({ success: true, ...result }));
            } catch (updateError) {
                res.writeHead(updateError.statusCode || 500);
                res.end(JSON.stringify({ error: updateError.message || '角色更新失败' }));
            }
        });
        return;
    }

    // 删除用户：仅对已停用员工做不可逆活跃目录移除，业务历史不删除。
    if (requestUrl.pathname.match(/^\/api\/users\/[^/]+$/) && req.method === 'DELETE') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        const username = decodeURIComponent(requestUrl.pathname.split('/')[3] || '');
        parseJsonBody(req, (error, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (error) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON格式错误' })); return; }
            const account = users.find(item => item.username === username);
            if (!account) { res.writeHead(404); res.end(JSON.stringify({ error: '用户不存在' })); return; }
            if (username === user.username) { res.writeHead(409); res.end(JSON.stringify({ error: '不能删除当前登录管理员' })); return; }
            if (account.role !== 'user') { res.writeHead(409); res.end(JSON.stringify({ error: '删除仅适用于已停用的普通员工账号' })); return; }
            if (!accountIsDisabled(account)) { res.writeHead(409); res.end(JSON.stringify({ error: '删除前必须先停用账号' })); return; }
            const reasons = accountDeletionBlockers(username);
            if (reasons.length) { res.writeHead(409); res.end(JSON.stringify({ error: '账号不满足删除门禁', reasons })); return; }
            const reason = String(body.reason || '').trim();
            if (!reason) { res.writeHead(400); res.end(JSON.stringify({ error: '必须填写删除原因' })); return; }
            try {
                const result = commitAccountLifecycle({ username, expectedVersion: body.expectedVersion, action: '删除', operator: user, reason, mutate: (next, target) => {
                    const at = new Date().toLocaleString('zh-CN');
                    target.accountStatus = 'deleted'; target.deletedAt = at; target.deletedBy = user.username; target.deletedReason = reason;
                    delete target.password; delete target.salt;
                    const payee = linkedEmployeePayee(next.suppliers, username);
                    if (payee) { payee.enabled = false; payee.deletedEmployeeAt = at; payee.lifecycleHistoricalOnly = true; }
                }});
                res.end(JSON.stringify({ success: true, ...result }));
            } catch (deleteError) {
                res.writeHead(deleteError.statusCode || 500);
                res.end(JSON.stringify({ error: deleteError.message || '用户删除失败' }));
            }
        });
        return;
    }

    // ========== 甲方资料库 V1 ==========
    if (requestUrl.pathname === '/api/clients' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const records = user?.role === 'admin'
            ? clients
            : clients.filter(client => client.enabled !== false).map(activeClientView);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ records }));
        return;
    }

    if (requestUrl.pathname === '/api/clients' && req.method === 'POST') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '只有 Admin 可以维护甲方资料' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            try {
                const id = 'CLIENT' + String(nextClientId).padStart(4, '0');
                const client = createClientRecord(body, { id, username: user.username, clients });
                clients.push(client);
                nextClientId += 1;
                saveData();
                logAction(user.username, '新增甲方', `${client.code} - ${client.fullName}`);
                res.end(JSON.stringify({ success: true, record: client }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message || '甲方资料校验失败' }));
            }
        });
        return;
    }

    const clientUpdateMatch = requestUrl.pathname.match(/^\/api\/clients\/([^/]+)$/);
    if (clientUpdateMatch && req.method === 'PUT') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '只有 Admin 可以维护甲方资料' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const id = decodeURIComponent(clientUpdateMatch[1]);
            const index = clients.findIndex(client => client.id === id);
            if (index < 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '甲方不存在' }));
                return;
            }
            try {
                const beforeEnabled = clients[index].enabled !== false;
                clients[index] = updateClientRecord(clients[index], body, { username: user.username, clients });
                saveData();
                const action = beforeEnabled === (clients[index].enabled !== false) ? '修改甲方' : (clients[index].enabled === false ? '停用甲方' : '启用甲方');
                logAction(user.username, action, `${clients[index].code} - ${clients[index].fullName}`);
                res.end(JSON.stringify({ success: true, record: clients[index] }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message || '甲方资料校验失败' }));
            }
        });
        return;
    }

    if (requestUrl.pathname === '/api/client-bindings/legacy' && req.method === 'GET') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '只有 Admin 可以确认历史甲方' }));
            return;
        }
        const records = [
            ...applications.filter(record => !record.clientId).map(record => ({
                type: 'application', id: record.id, partyA: record.partyA || '', title: record.projectName || '',
                applicant: record.applicant || '', status: record.status || '', createdAt: record.date || ''
            })),
            ...debts.filter(record => !record.clientId).map(record => ({
                type: 'debt', id: record.id, partyA: record.partyA || '', title: record.title || '',
                applicant: record.applicant || '', status: record.status || '', createdAt: record.createdAt || ''
            }))
        ];
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ records }));
        return;
    }

    const clientBindingMatch = requestUrl.pathname.match(/^\/api\/client-bindings\/(application|debt)\/([^/]+)$/);
    if (clientBindingMatch && req.method === 'PUT') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '只有 Admin 可以确认历史甲方' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            try {
                const type = clientBindingMatch[1];
                const id = decodeURIComponent(clientBindingMatch[2]);
                const collection = type === 'application' ? applications : debts;
                const record = collection.find(item => item.id === id);
                if (!record) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: '历史记录不存在' }));
                    return;
                }
                const client = resolveActiveClient(clients, body.clientId);
                bindLegacyClient(record, client, { username: user.username });
                saveData();
                logAction(user.username, '确认历史甲方', `${type}:${id} -> ${client.code}`);
                res.end(JSON.stringify({ success: true, record: sanitizeRecordForResponse(record) }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message || '历史甲方确认失败' }));
            }
        });
        return;
    }

    // ========== 配置管理 ==========
    // 获取配置
    // ========== 欠款申请与项目关联还款 V1 ==========
    if (requestUrl.pathname === '/api/debts' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const clientId = String(requestUrl.searchParams.get('clientId') || '').trim();
        const availableOnly = requestUrl.searchParams.get('available') === '1';
        let visible = isReviewRole(user) ? (debts || []) : (debts || []).filter(debt => userOwnsDebt(user, debt));
        let records = visible.map(debt => debtView(debt, applications, payments));
        if (availableOnly) records = records.filter(debt => (!clientId || debt.clientId === clientId) && debt.clientId && debt.status === 'approved' && debt.remainingPrincipal > 0);
        const totalVisible = records.length;
        const filterOptions = {
            years: [...new Set(records.map(record => normalizeMonth(record.createdAt || record.date || '').slice(0, 4)).filter(Boolean))].sort(),
            applicants: [...new Set(records.map(record => String(record.applicant || record.owner || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
            clients: [...new Set(records.map(record => String(record.clientId || '')).filter(Boolean))].sort(),
            projects: [...new Set(records.flatMap(record => (record.links || record.projectLinks || []).map(link => String(link.projectId || link.applicationId || '')).filter(Boolean)))].sort()
        };
        const applicant = String(requestUrl.searchParams.get('applicant') || '').trim();
        const status = String(requestUrl.searchParams.get('status') || '').trim();
        const projectId = String(requestUrl.searchParams.get('projectId') || '').trim();
        const query = String(requestUrl.searchParams.get('query') || '').trim().toLowerCase();
        const startMonth = String(requestUrl.searchParams.get('startMonth') || '').trim();
        const endMonth = String(requestUrl.searchParams.get('endMonth') || '').trim();
        const validMonth = value => !value || /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
        if (!validMonth(startMonth) || !validMonth(endMonth) || (startMonth && endMonth && startMonth > endMonth)) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '欠款筛选月份范围无效' }));
            return;
        }
        records = records.filter(record => {
            const month = normalizeMonth(record.createdAt || record.date || '');
            if (!availableOnly && clientId && String(record.clientId || '') !== clientId) return false;
            if (applicant && String(record.applicant || record.owner || '') !== applicant) return false;
            if (status && authoritativeDebtStatus(record) !== status) return false;
            if (projectId && !(record.links || record.projectLinks || []).some(link => String(link.projectId || link.applicationId || '') === projectId)) return false;
            if (startMonth && (!month || month < startMonth)) return false;
            if (endMonth && (!month || month > endMonth)) return false;
            if (query) {
                const text = [record.id, record.title, record.businessDescription, record.businessBasis, record.partyA, record.clientNameSnapshot].join(' ').toLowerCase();
                if (!text.includes(query)) return false;
            }
            return true;
        });
        const filteredTotal = records.length;
        const approvedForSummary = records.filter(record => record.status === 'approved');
        const summary = {
            totalPrincipal: roundMoney(approvedForSummary.reduce((sum, record) => sum + toMoney(record.principal), 0)),
            includedPrincipal: roundMoney(approvedForSummary.reduce((sum, record) => sum + toMoney(record.includedPrincipal), 0)),
            receivedPrincipal: roundMoney(approvedForSummary.reduce((sum, record) => sum + toMoney(record.receivedPrincipal), 0)),
            outstandingPrincipal: roundMoney(approvedForSummary.reduce((sum, record) => sum + toMoney(record.outstandingPrincipal), 0)),
            totalActualCost: roundMoney(approvedForSummary.reduce((sum, record) => sum + toMoney(record.totalActualCost), 0)),
            profit: roundMoney(approvedForSummary.reduce((sum, record) => sum + toMoney(record.profit), 0))
        };
        const pagingRequested = requestUrl.searchParams.has('page') || requestUrl.searchParams.has('pageSize');
        const page = Math.max(1, parseInt(requestUrl.searchParams.get('page') || '1', 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(requestUrl.searchParams.get('pageSize') || '20', 10) || 20));
        if (pagingRequested) records = records.slice((page - 1) * pageSize, page * pageSize);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            records: records.map(sanitizeRecordForResponse),
            pagination: { page: pagingRequested ? page : 1, pageSize: pagingRequested ? pageSize : Math.max(filteredTotal, 1), total: filteredTotal, totalPages: pagingRequested ? Math.max(1, Math.ceil(filteredTotal / pageSize)) : 1 },
            totalVisible,
            summary,
            filterOptions
        }));
        return;
    }

    if (requestUrl.pathname === '/api/debt-edit-lock' && req.method === 'POST') {
        const user = getCurrentUser(req);
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }
            const debtId = String(body?.debtId || '').trim();
            const draftToken = String(body?.draftToken || '').trim();
            const projectId = String(body?.projectId || '').trim();
            const debt = debts.find(item => item.id === debtId);
            if (!debtId || !draftToken) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing debt lock data' })); return; }
            try {
                if (projectId) assertProjectOpenForWrite(applications.find(item => item.id === projectId), '关联欠款');
            } catch (error) {
                res.writeHead(error.statusCode || 409); res.end(JSON.stringify({ error: error.message })); return;
            }
            if (!debt || debt.status !== 'approved' || debt.applicant !== user?.username) { res.writeHead(403); res.end(JSON.stringify({ error: 'No debt lock permission' })); return; }
            try {
                const lock = acquireDebtEditLock({ debtId, username: user.username, draftToken, projectId });
                res.end(JSON.stringify({ success: true, expiresAt: lock.expiresAt }));
            } catch (error) {
                res.writeHead(error.statusCode || 400); res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    if (requestUrl.pathname === '/api/debt-edit-lock' && req.method === 'DELETE') { const user=getCurrentUser(req);parseJsonBody(req,(err,body)=>{if(err){res.writeHead(400);res.end(JSON.stringify({error:'Invalid JSON'}));return;}releaseDebtEditLocks({username:user?.username,draftToken:String(body?.draftToken||''),debtId:String(body?.debtId||'')});res.end(JSON.stringify({success:true}));});return; }

    if (requestUrl.pathname === '/api/debts' && req.method === 'POST') {
        const user = getCurrentUser(req);
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            if (!incomingAttachmentsAuthorized(user, body.attachments)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '不能引用无权访问的附件' }));
                return;
            }
            if (!isValidApproverAccount(body.approver)) { res.writeHead(400); res.end(JSON.stringify({ error: '所选审批账号不存在或不具备审批权限' })); return; }
            try {
                const originalProjectId = body.type === 'project-extra' ? String(body.originalProjectId || '').trim() : '';
                const originalProject = originalProjectId ? assertProjectExtraDebtEligible({
                    originalProjectId,
                    username: user?.username,
                    requestedClientId: body.clientId,
                    applications,
                    payments,
                    bonusConfirmations
                }) : null;
                const client = resolveActiveClient(clients, originalProject ? originalProject.clientId : body.clientId);
                const normalizedCostItems = normalizeDebtCostPayeeItems(body.costItems);
                const id = 'DEBT' + String(nextDebtId).padStart(4, '0');
                const debtInput = applyClientSnapshot({ ...body, costItems: normalizedCostItems }, client);
                const debt = createDebtRecord(debtInput, {
                    id,
                    username: user.username,
                    taxRate: configuredTaxRate(),
                    applications,
                    payments,
                    bonusConfirmations
                });
                nextDebtId += 1;
                debts.push(debt);
                saveData();
                logAction(user.username, '提交欠款申请', `${debt.id} - ${debt.title}`);
                notifyDebtSubmitted(debt);
                res.end(JSON.stringify({ success: true, record: sanitizeRecordForResponse(debtView(debt, applications, payments)) }));
            } catch (error) {
                res.writeHead(error.statusCode || 400);
                res.end(JSON.stringify({ error: error.message || '欠款申请校验失败' }));
            }
        });
        return;
    }

    const debtReceiptMatch = requestUrl.pathname.match(/^\/api\/debt-repayments\/([^/]+)\/([^/]+)\/receipt$/);
    if (debtReceiptMatch && req.method === 'PUT') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '只有管理员可以确认甲方实际回款' }));
            return;
        }
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '欠款到账由关联项目的付款审批自动确认，不再支持手工登记' }));
        return;
    }

    const debtReviewMatch = requestUrl.pathname.match(/^\/api\/debts\/([^/]+)$/);
    if (debtReviewMatch && req.method === 'PUT') {
        const user = getCurrentUser(req);
        if (!isReviewRole(user)) {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '无权限审核欠款申请' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const debt = (debts || []).find(item => item.id === decodeURIComponent(debtReviewMatch[1]));
            if (!debt) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '未找到欠款申请' }));
                return;
            }
            const status = String(body.status || '').trim();
            if (debt.status !== 'pending' || !['approved', 'rejected'].includes(status)) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: `欠款状态不能从 ${debt.status || '未知'} 变更为 ${status || '空'}` }));
                return;
            }
            const now = new Date().toLocaleString('zh-CN');
            debt.status = status;
            debt.reviewedAt = now;
            debt.reviewedBy = user.username;
            debt.updatedAt = now;
            debt.reviewNote = String(body.note || '').trim();
            debt.reviewRecords = Array.isArray(debt.reviewRecords) ? debt.reviewRecords : [];
            debt.reviewRecords.push({ status, note: debt.reviewNote, reviewedBy: user.username, reviewedAt: now });
            saveData();
            logAction(user.username, status === 'approved' ? '欠款审核通过' : '欠款审核驳回', debt.id);
            notifyDebtResult(debt, user.username, status);
            res.end(JSON.stringify({ success: true, record: sanitizeRecordForResponse(debtView(debt, applications, payments)) }));
        });
        return;
    }

    // ========== 操作日志 ==========
    // ========== 备份管理 ==========
    // 获取备份列表（仅管理员）
    if (requestUrl.pathname === '/api/backups' && req.method === 'GET') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        try {
            const files = listStructuredDataBackups({ backupsDir: BACKUPS_DIR });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(files));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // 手动触发备份（仅管理员）
    if (requestUrl.pathname === '/api/backups' && req.method === 'POST') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        const executeBackup = () => {
            const result = createManualBackup();
            logAction(user.username, '结构化数据备份', result.success
                ? `${result.fileName}; sha256=${result.sha256}; rotation=${result.rotation?.status || 'unknown'}`
                : result.error);
            res.setHeader('Content-Type', 'application/json');
            if (!result.success) res.writeHead(500);
            res.end(JSON.stringify(result));
        };
        parseJsonBody(req, (error) => {
            if (error) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'JSON格式错误，未创建备份' }));
                return;
            }
            executeBackup();
        });
        return;
    }

    if (requestUrl.pathname === '/api/backups') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, POST' });
        res.end(JSON.stringify({ error: '方法不允许' }));
        return;
    }

    // 测试工具：发票数据归零（仅管理员，先备份，只清结构化发票数据，不删除附件）
    if (req.url === '/api/test/reset-invoice-data' && req.method === 'POST') {
        const user = getCurrentUser(req);
        if (!TEST_RESET_ENABLED || !isLoopbackRequest(req)) {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, error: 'Not Found' }));
            return;
        }
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ success: false, error: '仅管理员可执行测试归零' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: 'JSON格式错误' }));
                return;
            }
            if (body.confirm !== 'RESET_INVOICE_TEST_DATA') {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: '确认码错误，未执行归零' }));
                return;
            }
            const before = {
                invoices: invoices.length,
                invoiceOcrJobs: invoiceOcrJobs.length,
                invoiceDraftBatches: invoiceDraftBatches.length,
                invoiceAuditRecords: invoiceAuditRecords.length
            };
            const backup = createManualBackup();
            if (!backup.success) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: '归零前备份失败：' + backup.error }));
                return;
            }
            invoices = [];
            invoiceOcrJobs = [];
            invoiceDraftBatches = [];
            invoiceAuditRecords = [];
            nextInvoiceId = 1;
            nextOcrJobId = 1;
            nextInvoiceDraftId = 1;
            nextInvoiceAuditId = 1;
            logAction(user.username, '测试发票数据归零', `backup=${backup.file}; invoices=${before.invoices}; ocr=${before.invoiceOcrJobs}; drafts=${before.invoiceDraftBatches}; audits=${before.invoiceAuditRecords}; attachments保留`);
            res.end(JSON.stringify({
                success: true,
                backupFile: backup.file,
                cleared: before,
                kept: ['applications', 'payments', 'users', 'suppliers', 'attachments']
            }));
        });
        return;
    }

    // ========== 供应商管理 ==========
    // 获取供应商列表
    if (req.url === '/api/suppliers' && req.method === 'GET') {
        const user = getCurrentUser(req);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '未登录' }));
            return;
        }
        const visibleSuppliers = user?.role === 'admin'
            ? suppliers.map(supplier => supplierAdminView(supplier))
            : suppliers.filter(supplier => {
                if (supplier.enabled === false) return false;
                const type = normalizedPayeeAccountType(supplier);
                if (!type) return false;
                const conflict = supplierIdentityConflict(supplier);
                if (conflict.duplicateId || conflict.duplicateBankAccount || conflict.duplicateEmployeeLink || conflict.emptyRequiredBankAccount) return false;
                if (type !== 'employee-payee') return true;
                return Boolean(activeAccountByUsername(supplier.linkedEmployeeUsername));
            }).map(supplier => ({ id: supplier.id, name: supplier.name, payeeAccountType: normalizedPayeeAccountType(supplier) }));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(visibleSuppliers));
        return;
    }

    if (requestUrl.pathname.match(/^\/api\/suppliers\/[^/]+\/classify$/) && req.method === 'POST') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: '无权限' })); return; }
        const id = decodeURIComponent(requestUrl.pathname.split('/')[3] || '');
        let current;
        try { current = uniqueSupplierById(id); }
        catch (error) { res.writeHead(error.statusCode || 409); res.end(JSON.stringify({ error: error.message, code: error.code })); return; }
        if (!current) { res.writeHead(404); res.end(JSON.stringify({ error: '收款对象不存在' })); return; }
        parseJsonBody(req, (error, body) => {
            if (error) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON格式错误' })); return; }
            const payeeAccountType = String(body.payeeAccountType || '').trim();
            const linkedEmployeeUsername = String(body.linkedEmployeeUsername || '').trim();
            const reason = String(body.reason || '').trim();
            const expectedVersion = Number(body.expectedVersion);
            if (!PAYEE_ACCOUNT_TYPES.has(payeeAccountType)) { res.writeHead(400); res.end(JSON.stringify({ error: '收款账号类型无效' })); return; }
            if (!reason || reason.length > 300 || /[\r\n\t]/.test(reason)) { res.writeHead(400); res.end(JSON.stringify({ error: '分类原因必填、不得换行且不得超过300字' })); return; }
            if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== supplierClassificationVersion(current)) {
                res.writeHead(409); res.end(JSON.stringify({ error: '收款对象分类已变更，请刷新后重试', code: 'stale-classification-version' })); return;
            }
            if (!supplierBankIsOptional({...current, payeeAccountType}) && !String(current.bankAccount || '').trim()) {
                res.writeHead(400); res.end(JSON.stringify({ error: '正式供应商和公司收款对象必须先补充银行账号，才能确认分类' })); return;
            }
            let employee = null;
            if (payeeAccountType === 'employee-payee') {
                const employeeMatches = users.filter(record => canonicalAccountKey(record.username) === canonicalAccountKey(linkedEmployeeUsername));
                if (employeeMatches.length !== 1 || employeeMatches[0].role !== 'user' || !accountIsActive(employeeMatches[0])) {
                    res.writeHead(400); res.end(JSON.stringify({ error: '员工收款账号必须显式关联唯一的有效员工' })); return;
                }
                employee = employeeMatches[0];
                const alreadyLinked = suppliers.some(record => record !== current
                    && record.enabled !== false
                    && normalizedPayeeAccountType(record) === 'employee-payee'
                    && canonicalAccountKey(record.linkedEmployeeUsername) === canonicalAccountKey(employee.username));
                if (alreadyLinked) { res.writeHead(409); res.end(JSON.stringify({ error: '该员工已关联其他有效收款对象', code: 'employee-already-linked' })); return; }
            } else if (linkedEmployeeUsername) {
                res.writeHead(400); res.end(JSON.stringify({ error: '只有员工收款账号可以关联员工' })); return;
            }
            try {
                const next = cloneCurrentDataState();
                const target = uniqueSupplierById(id, next.suppliers);
                const oldType = normalizedPayeeAccountType(target);
                const oldLinkedEmployeeUsername = String(target.linkedEmployeeUsername || '').trim();
                const oldName = String(target.name || '');
                const newVersion = supplierClassificationVersion(target) + 1;
                target.payeeAccountType = payeeAccountType;
                target.linkedEmployeeUsername = employee ? employee.username : '';
                if (employee) target.name = employee.username;
                target.classificationVersion = newVersion;
                target.classifiedAt = new Date().toLocaleString('zh-CN');
                target.classifiedBy = user.username;
                next.supplierClassificationAuditRecords = Array.isArray(next.supplierClassificationAuditRecords) ? next.supplierClassificationAuditRecords : [];
                next.supplierClassificationAuditRecords.unshift({
                    id: `SUP-CLASS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
                    supplierId: target.id, operator: user.username, operatorRole: user.role, time: target.classifiedAt, reason,
                    oldType, newType: payeeAccountType,
                    oldLinkedEmployeeUsername, newLinkedEmployeeUsername: target.linkedEmployeeUsername,
                    oldName, newName: target.name,
                    oldVersion: newVersion - 1, newVersion
                });
                next.logs = Array.isArray(next.logs) ? next.logs : [];
                next.logs.unshift({ time: target.classifiedAt, user: user.username, action: '确认收款对象分类', detail: `${target.id} / ${oldType || '历史未分类'} -> ${payeeAccountType} / 原因：${reason}` });
                if (next.logs.length > 500) next.logs.length = 500;
                commitSupplierMutation(next, 'classify');
                res.end(JSON.stringify({ success: true, supplier: supplierAdminView(target) }));
            } catch (saveError) {
                res.writeHead(saveError.statusCode || 500);
                res.end(JSON.stringify({ error: saveError.statusCode ? saveError.message : '收款对象分类保存失败', code: saveError.code }));
            }
        });
        return;
    }

    // 添加供应商（任何已登录用户都可添加）
    if (req.url === '/api/suppliers' && req.method === 'POST') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        parseJsonBody(req, (error, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const name = String(body.name || '').trim();
            const bankAccount = String(body.bankAccount || '').trim();
            const taxNumber = String(body.taxNumber || '').trim();
            const payeeAccountType = String(body.payeeAccountType || 'formal-supplier').trim();
            const linkedEmployeeUsername = String(body.linkedEmployeeUsername || '').trim();
            if (!name || (!supplierBankIsOptional({name, payeeAccountType}) && !bankAccount)) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: !name ? '收款对象名称必填' : '正式供应商和公司收款对象的银行账号必填' }));
                return;
            }
            if (!PAYEE_ACCOUNT_TYPES.has(payeeAccountType)) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '收款账号类型无效' }));
                return;
            }
            if (payeeAccountType === 'employee-payee') {
                const employee = users.find(record => record.username === linkedEmployeeUsername && record.role === 'user' && accountIsActive(record));
                if (!employee || name !== employee.username) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '员工收款账号必须关联现有员工，且名称必须继承员工账号' }));
                    return;
                }
            } else if (linkedEmployeeUsername) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '只有员工收款账号可以关联员工' }));
                return;
            }
            if (payeeAccountType === 'employee-payee' && suppliers.some(record => (
                record.enabled !== false
                && normalizedPayeeAccountType(record) === 'employee-payee'
                && canonicalAccountKey(record.linkedEmployeeUsername) === canonicalAccountKey(linkedEmployeeUsername)
            ))) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该员工已存在关联收款账号' }));
                return;
            }
            if (suppliers.some(record => normalizedPayeeAccountType(record) === payeeAccountType && normalizeText(record.name) === normalizeText(name))) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '同类型收款账号名称已存在' }));
                return;
            }
            if (bankAccountExists(suppliers, bankAccount, '', {name, payeeAccountType})) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '银行账号已被其他收款对象使用' }));
                return;
            }
            const next = cloneCurrentDataState();
            const newSupplier = {
                id: nextSupplierRecordId(next.suppliers),
                name,
                bankAccount,
                taxNumber,
                payeeAccountType,
                linkedEmployeeUsername: payeeAccountType === 'employee-payee' ? linkedEmployeeUsername : '',
                enabled: true,
                createdBy: user.username,
                created: new Date().toLocaleString()
            };
            next.suppliers.push(newSupplier);
            next.logs.unshift({ time: new Date().toLocaleString('zh-CN'), user: user.username, action: '添加供应商', detail: name });
            if (next.logs.length > 500) next.logs = next.logs.slice(0, 500);
            try {
                if (supplierCreateSaveFailurePending) { supplierCreateSaveFailurePending = false; throw new Error('simulated supplier create save failure'); }
                saveDataState(next);
                assignDataState(next);
                res.end(JSON.stringify({ success: true, supplier: newSupplier }));
            } catch (saveError) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '收款对象保存失败' }));
            }
        });
        return;
    }

    if (requestUrl.pathname.match(/^\/api\/suppliers\/[^/]+$/) && req.method === 'PATCH') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') { res.writeHead(403); res.end(JSON.stringify({ error: '无权限' })); return; }
        const id = decodeURIComponent(requestUrl.pathname.split('/')[3] || '');
        parseJsonBody(req, (error, body) => {
            if (error) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON格式错误' })); return; }
            let current;
            try { current = uniqueSupplierById(id); }
            catch (conflict) { res.writeHead(conflict.statusCode || 409); res.end(JSON.stringify({ error: conflict.message, code: conflict.code })); return; }
            if (!current) { res.writeHead(404); res.end(JSON.stringify({ error: '收款对象不存在' })); return; }
            const bankAccount = String(body.bankAccount || '').trim();
            const taxNumber = String(body.taxNumber ?? current.taxNumber ?? '').trim();
            if (!bankAccount && !supplierBankIsOptional(current)) { res.writeHead(400); res.end(JSON.stringify({ error: '正式供应商和公司收款对象的银行账号必填' })); return; }
            if (bankAccountExists(suppliers, bankAccount, id, current)) { res.writeHead(409); res.end(JSON.stringify({ error: '银行账号已被其他收款对象使用' })); return; }
            try {
                const next = cloneCurrentDataState();
                const target = uniqueSupplierById(id, next.suppliers);
                target.bankAccount = bankAccount; target.taxNumber = taxNumber;
                target.updatedBy = user.username; target.updatedAt = new Date().toLocaleString('zh-CN');
                next.logs.unshift({ time: target.updatedAt, user: user.username, action: '修改收款账号', detail: `${target.id} / ${target.name}` });
                saveDataState(next); assignDataState(next);
                res.end(JSON.stringify({ success: true, supplier: target }));
            } catch (saveError) { res.writeHead(500); res.end(JSON.stringify({ error: '收款账号保存失败' })); }
        });
        return;
    }

    // 删除供应商（仅管理员）
    if (requestUrl.pathname.match(/^\/api\/suppliers\/[^/]+$/) && req.method === 'DELETE') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        const id = decodeURIComponent(requestUrl.pathname.split('/')[3] || '');
        let current;
        try { current = uniqueSupplierById(id); }
        catch (conflict) { res.writeHead(conflict.statusCode || 409); res.end(JSON.stringify({ error: conflict.message, code: conflict.code })); return; }
        if (!current) { res.writeHead(404); res.end(JSON.stringify({ error: '收款对象不存在' })); return; }
        if (normalizedPayeeAccountType(current) === 'employee-payee') {
            res.writeHead(409);
            res.end(JSON.stringify({ error: '关联员工收款账号不能独立删除或改名，请在用户生命周期中管理' }));
            return;
        }
        const referenceCount = supplierReferenceCount(current);
        if (referenceCount > 0) {
            res.writeHead(409);
            res.end(JSON.stringify({ error: '收款对象已被业务或审计记录引用，不得物理删除', code: 'supplier-referenced', referenceCount }));
            return;
        }
        try {
            const next = cloneCurrentDataState();
            const target = uniqueSupplierById(id, next.suppliers);
            const index = next.suppliers.indexOf(target);
            next.suppliers.splice(index, 1);
            const now = new Date().toLocaleString('zh-CN');
            next.logs = Array.isArray(next.logs) ? next.logs : [];
            next.logs.unshift({ time: now, user: user.username, action: '删除供应商', detail: `${target.id} / ${target.name}` });
            if (next.logs.length > 500) next.logs.length = 500;
            commitSupplierMutation(next, 'delete');
            res.end(JSON.stringify({ success: true }));
        } catch (saveError) {
            res.writeHead(saveError.statusCode || 500);
            res.end(JSON.stringify({ error: saveError.statusCode ? saveError.message : '收款对象删除保存失败', code: saveError.code }));
        }
        return;
    }

    // 附件上传
    if (req.url === '/api/upload' && req.method === 'POST') {
        upload.single('file')(req, res, (err) => {
            if (err) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                res.end(JSON.stringify({ error: uploadErrorMessage(err) }));
                return;
            }
            if (!req.file) {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                res.end(JSON.stringify({ error: '未上传文件' }));
                return;
            }
            const emptyError = rejectEmptyUpload(req.file);
            if (emptyError) {
                removeUploadedFiles(req.file);
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                res.end(JSON.stringify({ error: emptyError }));
                return;
            }
            const contentError = uploadedFileContentError(req.file);
            if (contentError) {
                removeUploadedFiles(req.file);
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(400);
                res.end(JSON.stringify({ error: contentError }));
                return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: true,
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: '/attachments/' + req.file.filename
            }));
        });
        return;
    }

    // ========== 发票审核 ==========
    if (req.url === '/api/invoice-summary' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(buildInvoiceSummary(filterUser)));
        return;
    }

    if (req.url === '/api/invoices' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        const summary = buildInvoiceSummary(filterUser);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            invoices: summary.invoices,
            summary,
            closureEvidence: buildInvoiceClosureEvidence(filterUser),
            role: user?.role,
            username: user?.username
        }));
        return;
    }

    if (req.url === '/api/invoice-submissions' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            success: true,
            submissions: buildInvoiceSubmissions(filterUser),
            role: user?.role,
            username: user?.username
        }));
        return;
    }

    if (req.url.startsWith('/api/invoice-audit-records') && req.method === 'GET') {
        const user = getCurrentUser(req);
        const isAdmin = user?.role === 'admin' || user?.role === 'approver';
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const batchId = urlObj.searchParams.get('batchId') || '';
        const records = (invoiceAuditRecords || [])
            .filter(record => !batchId || record.batchId === batchId)
            .filter(record => isAdmin || record.submittedBy === user?.username || record.owner === user?.username)
            .sort((a, b) => String(b.reviewedAt || '').localeCompare(String(a.reviewedAt || '')));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            success: true,
            records,
            role: user?.role,
            username: user?.username
        }));
        return;
    }

    // ========== 奖金确认锁定（仅管理员） ==========
    if (req.url.startsWith('/api/bonus-confirmations')) {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有管理员可以确认或查看锁定奖金' }));
            return;
        }

        if (req.method === 'GET') {
            const urlObj = new URL(req.url, 'http://127.0.0.1');
            const year = Number.parseInt(urlObj.searchParams.get('year'), 10);
            const month = Number.parseInt(urlObj.searchParams.get('month'), 10);
            const username = String(urlObj.searchParams.get('username') || '').trim();
            if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请选择有效的年份和月份' }));
                return;
            }
            res.end(JSON.stringify({
                success: true,
                confirmations: filterConfirmations(bonusConfirmations, { year, month, username })
            }));
            return;
        }

        if (req.method === 'POST' && req.url === '/api/bonus-confirmations') {
            parseJsonBody(req, (err, body) => {
                if (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'JSON格式错误' }));
                    return;
                }
                const applicationId = String(body?.applicationId || '').trim();
                try {
                    const record = commitLockedBonusConfirmation({ applicationId, body, user });
                    res.end(JSON.stringify({ success: true, confirmation: record }));
                } catch (error) {
                    res.writeHead(error.statusCode || 400);
                    res.end(JSON.stringify({ error: error.message || '奖金确认失败' }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: '奖金确认接口不存在' }));
        return;
    }

    // ========== 业务奖金试算预览（只读，仅管理员） ==========
    if (req.url.startsWith('/api/bonus-preview') && req.method === 'GET') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有管理员可以查看业务奖金试算' }));
            return;
        }
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const year = Number.parseInt(urlObj.searchParams.get('year'), 10);
        const month = Number.parseInt(urlObj.searchParams.get('month'), 10);
        const username = String(urlObj.searchParams.get('username') || '').trim();
        if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '请选择有效的年份和月份' }));
            return;
        }
        res.end(JSON.stringify({ success: true, preview: buildBonusPreview({ applications, payments, year, month, username, rules:currentConfig().bonusRules }) }));
        return;
    }

    // ========== 员工月度结算（仅管理员） ==========
    if (req.url === '/api/employee-settlements' && req.method === 'POST') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有管理员可以确认员工月度结算' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const closedPaymentSource = (Array.isArray(body?.selectedReimbursementSourceKeys) ? body.selectedReimbursementSourceKeys : [])
                .map(key => payments.find(payment => payment.id === String(key || '').split(':')[0]))
                .find(payment => applications.find(app => app.id === payment?.projectId)?.status === 'closed');
            if (closedPaymentSource) {
                const error = projectClosedError(closedPaymentSource.projectId, '确认员工月结');
                res.writeHead(error.statusCode);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            try {
                const record = commitLockedEmployeeSettlement({ body, user });
                res.end(JSON.stringify({ success: true, settlement: record }));
            } catch (error) {
                res.writeHead(error.statusCode || 400);
                res.end(JSON.stringify({ error: error.message || '员工月度结算确认失败' }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/employee-settlement-preview') && req.method === 'GET') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有管理员可以查看员工月度结算' }));
            return;
        }
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const year = Number.parseInt(urlObj.searchParams.get('year'), 10);
        const month = Number.parseInt(urlObj.searchParams.get('month'), 10);
        const username = String(urlObj.searchParams.get('username') || '').trim();
        if (!/^[2-9]\d{3}$/.test(urlObj.searchParams.get('year') || '') ||
            !/^\d{1,2}$/.test(urlObj.searchParams.get('month') || '') || !Number.isFinite(month) || month < 1 || month > 12) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '请选择有效的年份和月份' }));
            return;
        }
        res.end(JSON.stringify({
            success: true,
            availableYears: settlementAvailableYears(),
            preview: buildEmployeeSettlementPreview({
                applications,
                payments,
                bonusConfirmations,
                employeeSettlements,
                users,
                year,
                month,
                username
            })
        }));
        return;
    }

    // ========== 邮件提醒管理（仅管理员） ==========
    if (req.url.startsWith('/api/mail-reminders')) {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有管理员可以管理邮件提醒' }));
            return;
        }

        if (req.url === '/api/mail-reminders/config' && req.method === 'GET') {
            res.end(JSON.stringify({
                success: true,
                config: {
                    ...mailReminder.publicConfig(),
                    smtpSecretManagementAllowed: isLoopbackRequest(req)
                }
            }));
            return;
        }

        if (req.url === '/api/mail-reminders/config' && req.method === 'PUT') {
            parseJsonBody(req, (err, body) => {
                if (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'JSON格式错误' }));
                    return;
                }
                try {
                    const saved = mailReminder.savePublicConfig(body || {});
                    res.end(JSON.stringify({ success: true, config: saved }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: error.message || '邮件配置保存失败' }));
                }
            });
            return;
        }

        if (req.url === '/api/mail-reminders/smtp-secret' && req.method === 'PUT') {
            if (!isLoopbackRequest(req)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'SMTP授权码只能在服务器本机或SSH本地端口转发页面中更新' }));
                return;
            }
            parseJsonBody(req, (err, body) => {
                if (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'JSON格式错误' }));
                    return;
                }
                try {
                    const result = mailReminder.saveSmtpPassword(body?.smtpPassword);
                    res.end(JSON.stringify({ success: true, status: result.status }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: error.message || 'SMTP授权码安全存储失败' }));
                }
            });
            return;
        }

        if (req.url === '/api/mail-reminders/smtp-secret' && req.method === 'DELETE') {
            if (!isLoopbackRequest(req)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'SMTP授权码只能在服务器本机或SSH本地端口转发页面中清除' }));
                return;
            }
            parseJsonBody(req, (err, body) => {
                if (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'JSON格式错误' }));
                    return;
                }
                if (body?.confirmation !== 'CLEAR_STORED_SMTP_SECRET') {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '清除确认无效，未执行操作' }));
                    return;
                }
                try {
                    const result = mailReminder.clearSmtpPassword();
                    res.end(JSON.stringify({
                        success: true,
                        cleared: result.cleared,
                        status: result.status
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: error.message || 'SMTP授权码安全存储清除失败' }));
                }
            });
            return;
        }

        const mailUrl = new URL(req.url, 'http://127.0.0.1');

        if (mailUrl.pathname === '/api/mail-reminders/templates' && req.method === 'GET') {
            try {
                const filter = validateMailPeriodQuery(mailUrl.searchParams);
                const type = mailUrl.searchParams.get('type') || '';
                if (type && !MAIL_TYPE_DEFINITIONS.some(row => row.type === type)) throw new Error('邮件类型无效');
                const entities = mailTemplateEntities();
                if (type) {
                    const rows = entities[type].filter(row => mailMatchesPeriod(row, filter));
                    res.end(JSON.stringify({ success: true, types: MAIL_TYPE_DEFINITIONS, entities: { [type]: rows } }));
                } else {
                    if (filter.activityMonth || filter.employee) throw new Error('请先选择邮件类型');
                    res.end(JSON.stringify({ success: true, types: MAIL_TYPE_DEFINITIONS, entities }));
                }
            } catch (error) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: error.message })); }
            return;
        }

        if (mailUrl.pathname === '/api/mail-reminders/records' && req.method === 'GET') {
            try { res.end(JSON.stringify(mailRecordPage(mailUrl.searchParams))); }
            catch (error) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: error.message })); }
            return;
        }

        if (mailUrl.pathname === '/api/mail-reminders/template-test' && req.method === 'POST') {
            parseJsonBody(req, async (err, body) => {
                if (err) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'JSON格式错误' })); return; }
                const recipient = mailReminder.uniqueEmails(body?.recipient || '');
                if (!recipient.length) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: '请输入有效的测试收件邮箱' })); return; }
                try {
                    assertMailSelectionContext(body);
                    const payload = buildSavedMailPayload(String(body?.type || ''), String(body?.entityId || ''), body || {});
                    const testPayload = {
                        ...payload,
                        to: recipient,
                        subject: `[测试] ${String(payload.subject || '').replace(/^\[测试\]\s*/, '')}`
                    };
                    const result = await mailReminder.smtpSend(testPayload);
                    mailReminder.appendLog({
                        eventKey: `test:${Date.now()}`,
                        type: payload.type,
                        entityId: payload.entityId,
                        recipients: recipient,
                        status: result.success ? 'test_smtp_accepted' : 'test_failed',
                        error: result.error || ''
                    });
                    res.writeHead(result.success ? 200 : 502);
                    res.end(JSON.stringify({ success: result.success === true, result, subject: testPayload.subject, previewText: payload.text }));
                } catch (error) {
                    res.writeHead(error.statusCode || 400);
                    res.end(JSON.stringify({ success: false, error: error.message || '模板测试发送失败' }));
                }
            });
            return;
        }

        if (mailUrl.pathname === '/api/mail-reminders/send' && req.method === 'POST') {
            parseJsonBody(req, async (err, body) => {
                if (err) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'JSON格式错误' })); return; }
                const type = String(body?.type || '').trim();
                const definition = MAIL_TYPE_DEFINITIONS.find(item => item.type === type);
                if (!definition?.manual) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: '该邮件类型只能由业务成功事件自动触发' })); return; }
                try {
                    assertMailSelectionContext(body);
                    const payload = buildSavedMailPayload(type, String(body?.entityId || ''), body || {});
                    const result = await executeFormalMail(payload, { mode: 'manual', operator: user.username });
                    res.writeHead(mailHttpStatus(result));
                    res.end(JSON.stringify({ success: result.success === true, result }));
                } catch (error) {
                    res.writeHead(error.statusCode || 400);
                    res.end(JSON.stringify({ success: false, error: error.message || '正式发送失败' }));
                }
            });
            return;
        }

        const retryMatch = mailUrl.pathname.match(/^\/api\/mail-reminders\/records\/([^/]+)\/retry$/);
        if (retryMatch && req.method === 'POST') {
            parseJsonBody(req, async (err, body) => {
                if (err) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'JSON格式错误' })); return; }
                const original = (mailSendRecords || []).find(item => item.id === decodeURIComponent(retryMatch[1]));
                if (!original) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: '未找到原发送记录' })); return; }
                if (!['failed', 'skipped'].includes(original.status)) { res.writeHead(409); res.end(JSON.stringify({ success: false, error: '只有失败或明确未发送记录可以重试；待核实记录须先处理状态' })); return; }
                if ((mailSendRecords || []).some(item => item.eventKey === original.eventKey && item.status === 'smtp_accepted')) {
                    res.writeHead(409); res.end(JSON.stringify({ success: false, error: '该业务事件已有SMTP接受记录，不能按失败重试' })); return;
                }
                try {
                    const payload = buildSavedMailPayload(original.type, original.entityId, body || {});
                    const result = await executeFormalMail(payload, {
                        mode: 'retry',
                        operator: user.username,
                        originalRecordId: original.id,
                        allowRelatedAttempt: true
                    });
                    res.writeHead(mailHttpStatus(result));
                    res.end(JSON.stringify({ success: result.success === true, result }));
                } catch (error) {
                    res.writeHead(error.statusCode || 400);
                    res.end(JSON.stringify({ success: false, error: error.message || '失败重试失败' }));
                }
            });
            return;
        }

        const resendMatch = mailUrl.pathname.match(/^\/api\/mail-reminders\/records\/([^/]+)\/resend$/);
        if (resendMatch && req.method === 'POST') {
            parseJsonBody(req, async (err, body) => {
                if (err) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'JSON格式错误' })); return; }
                const reason = String(body?.reason || '').trim();
                const original = (mailSendRecords || []).find(item => item.id === decodeURIComponent(resendMatch[1]));
                if (!original) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: '未找到原发送记录' })); return; }
                if (original.status !== 'smtp_accepted') { res.writeHead(409); res.end(JSON.stringify({ success: false, error: '只有SMTP已接受的记录可以补发' })); return; }
                if (!reason) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: '补发原因必填' })); return; }
                try {
                    const payload = buildSavedMailPayload(original.type, original.entityId, body || {});
                    const result = await executeFormalMail(payload, {
                        mode: 'resend',
                        operator: user.username,
                        originalRecordId: original.id,
                        resendReason: reason,
                        allowRelatedAttempt: true
                    });
                    res.writeHead(mailHttpStatus(result));
                    res.end(JSON.stringify({ success: result.success === true, result }));
                } catch (error) {
                    res.writeHead(error.statusCode || 400);
                    res.end(JSON.stringify({ success: false, error: error.message || '补发失败' }));
                }
            });
            return;
        }

        const resolveMatch = mailUrl.pathname.match(/^\/api\/mail-reminders\/records\/([^/]+)\/resolve$/);
        if (resolveMatch && req.method === 'POST') {
            parseJsonBody(req, (err, body) => {
                if (err) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'JSON格式错误' })); return; }
                const original = (mailSendRecords || []).find(item => item.id === decodeURIComponent(resolveMatch[1]));
                const status = String(body?.status || '').trim();
                const reason = String(body?.reason || '').trim();
                if (!original) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: '未找到发送记录' })); return; }
                if (original.status !== 'pending_verification') { res.writeHead(409); res.end(JSON.stringify({ success: false, error: '只有发送结果待核实记录可以处理' })); return; }
                if (!['smtp_accepted', 'failed'].includes(status) || !reason) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: '请选择核实结果并填写核实原因' })); return; }
                try {
                    const record = updateMailSendRecord(original.id, {
                        status,
                        failureReason: status === 'failed' ? reason : '',
                        reasonCode: status === 'failed' ? 'admin_verified_failed' : '',
                        verification: { operator: user.username, verifiedAt: new Date().toISOString(), reason }
                    });
                    res.end(JSON.stringify({ success: true, record }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: '核实结果保存失败' }));
                }
            });
            return;
        }

        if (req.url === '/api/mail-reminders/logs' && req.method === 'GET') {
            res.end(JSON.stringify({ success: true, logs: mailReminder.readLogs(80) }));
            return;
        }

        if (req.url === '/api/mail-reminders/test' && req.method === 'POST') {
            parseJsonBody(req, (err, body) => {
                if (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'JSON格式错误' }));
                    return;
                }
                const recipients = mailReminder.uniqueEmails(body?.recipient || '');
                if (!recipients.length) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '请输入有效的测试收件邮箱' }));
                    return;
                }
                const message = mailReminder.renderSummaryEmail({
                    title: 'K⁺-SESSION SMTP 配置测试',
                    intro: '如果你收到这封邮件，说明 K⁺-SESSION 邮件发送配置可用。',
                    fields: [
                        { label: '测试发起人', value: user.username },
                        { label: '发送模式', value: '测试邮箱真实投递，不改变正式发送状态' },
                        { label: '测试时间', value: new Date().toLocaleString() }
                    ],
                    link: mailSystemLink('login.html'),
                    footer: '本邮件不包含附件。'
                });
                mailReminder.smtpSend({
                    type: 'test',
                    entityId: 'mail-test',
                    to: recipients,
                    subject: '[测试] [K⁺-SESSION邮件提醒] SMTP 配置测试',
                    ...message
                }).then(result => {
                    res.writeHead(result.success ? 200 : 502);
                    res.end(JSON.stringify({ success: result.success === true, result }));
                })
                    .catch(error => {
                        res.writeHead(500);
                        res.end(JSON.stringify({ success: false, error: error.message }));
                    });
            });
            return;
        }

        if (req.url === '/api/mail-reminders/monthly-gap' && req.method === 'POST') {
            parseJsonBody(req, (err, body) => {
                if (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'JSON格式错误' }));
                    return;
                }
                const username = String(body?.username || '').trim();
                const month = String(body?.month || '').trim();
                if (!username || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '请选择员工并填写 YYYY-MM 格式月份' }));
                    return;
                }
                const monthly = buildMonthlyGapReminder(username, month);
                const payload = buildSavedMailPayload('monthlyGap', `${username}:${month}`, { username, month });
                executeFormalMail(payload, { mode: 'manual', operator: user.username }).then(result => {
                    res.writeHead(mailHttpStatus(result));
                    res.end(JSON.stringify({
                        success: result.success === true,
                        result,
                        summary: { projectCount: monthly.projectCount, gapCount: monthly.gapRows.length, totals: monthly.totals }
                    }));
                }).catch(error => {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: error.message }));
                });
            });
            return;
        }

        if (req.url === '/api/mail-reminders/bonus-dry-run' && req.method === 'POST') {
            res.writeHead(410);
            res.end(JSON.stringify({ success: false, error: '旧奖金Dry-run接口已停用；请使用模板测试或正式手工发送接口' }));
            return;
        }

        if (req.url === '/api/mail-reminders/employee-settlement-dry-run' && req.method === 'POST') {
            res.writeHead(410);
            res.end(JSON.stringify({ success: false, error: '旧月结Dry-run接口已停用；请使用模板测试或正式手工发送接口' }));
            return;
        }

        const knownMailPath = [
            '/api/mail-reminders/config', '/api/mail-reminders/smtp-secret', '/api/mail-reminders/logs',
            '/api/mail-reminders/test', '/api/mail-reminders/monthly-gap', '/api/mail-reminders/bonus-dry-run',
            '/api/mail-reminders/employee-settlement-dry-run', '/api/mail-reminders/templates',
            '/api/mail-reminders/records', '/api/mail-reminders/template-test', '/api/mail-reminders/send'
        ].includes(mailUrl.pathname) || /^\/api\/mail-reminders\/records\/[^/]+\/(retry|resend|resolve)$/.test(mailUrl.pathname);
        res.writeHead(knownMailPath ? 405 : 404);
        res.end(JSON.stringify({ success: false, error: knownMailPath ? '邮件提醒接口方法不允许' : '邮件提醒接口不存在' }));
        return;
    }

    if (req.url.startsWith('/api/invoice-submissions/') && req.method === 'GET') {
        const user = getCurrentUser(req);
        const isAdmin = user?.role === 'admin' || user?.role === 'approver';
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const parts = urlObj.pathname.split('/');
        const batchId = decodeURIComponent(parts[3] || '');
        const action = parts[4] || '';
        if (action === 'attachment-package') {
            if (!isAdmin) {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: '只有管理员可以下载发票附件包' }));
                return;
            }
            const pkg = buildInvoiceAttachmentPackage(batchId);
            if (!pkg.files.length) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: '该批次没有可打包的发票附件' }));
                return;
            }
            const zipBuffer = createZipBuffer(pkg.files);
            const asciiName = `${safePathSegment(batchId || 'invoice-batch')}.zip`.replace(/[^\x20-\x7E]/g, '_');
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Length': zipBuffer.length,
                'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(pkg.zipName)}`
            });
            res.end(zipBuffer);
            return;
        }
    }

    if (req.url.startsWith('/api/invoice-submissions/') && req.method === 'PUT') {
        const user = getCurrentUser(req);
        const isAdmin = user?.role === 'admin' || user?.role === 'approver';
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!isAdmin) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有管理员可以审核发票批次' }));
            return;
        }
        const parts = req.url.split('/');
        const batchId = decodeURIComponent(parts[3] || '');
        parseJsonBody(req, (err, body) => {
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const status = body.status === '已确认' ? '已确认' : (body.status === '已驳回' ? '已驳回' : '');
            if (!status) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '审核状态无效' }));
                return;
            }
            const note = String(body.note || '').trim();
            if (status === '已驳回' && !note) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '驳回必须填写原因' }));
                return;
            }
            const targets = invoices.filter(inv => inv.batchId === batchId && (inv.status || '待审核') === '待审核');
            if (!targets.length) {
                const batchExists = invoices.some(inv => inv.batchId === batchId);
                res.writeHead(batchExists ? 409 : 404);
                res.end(JSON.stringify({ error: batchExists ? '该批次已完成审核，不得重复审批' : '未找到待审核批次' }));
                return;
            }
            const closedTarget = targets.find(inv => applications.find(app => app.id === inv.appId)?.status === 'closed');
            if (closedTarget) {
                const error = projectClosedError(closedTarget.appId, '审核发票');
                res.writeHead(error.statusCode);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            try {
                const result = commitInvoiceTransaction({
                    appId: targets[0].appId,
                    mutate: () => {
                        const transactionTargets = invoices.filter(inv => inv.batchId === batchId && (inv.status || '待审核') === '待审核');
                        if (transactionTargets.length !== targets.length) {
                            const error = new Error('发票批次状态已变更，请刷新后重试');
                            error.statusCode = 409;
                            throw error;
                        }
                        const beforeStatuses = transactionTargets.map(inv => ({ id: inv.id, status: inv.status || '待审核' }));
                        const auditRecord = createInvoiceAuditRecord({ user, batchId, status, note, targets: transactionTargets, beforeStatuses });
                        transactionTargets.forEach(inv => {
                            const updatedAt = new Date().toLocaleString('zh-CN');
                            inv.status = status;
                            inv.analysis = analyzeInvoice(inv, getInvoiceExpectedItems());
                            inv.updatedBy = user?.username || '';
                            inv.updatedAt = updatedAt;
                            inv.auditRecordId = auditRecord.id;
                            inv.reviewNote = note;
                            const attachmentState = status === '已确认' ? '已确认引用' : '已驳回引用';
                            inv.attachment = normalizeAttachmentRecord(inv.attachment, {
                                state: attachmentState,
                                linkedOcrJobId: inv.attachment?.linkedOcrJobId || '',
                                linkedDraftId: inv.attachment?.linkedDraftId || '',
                                linkedInvoiceId: inv.id || '',
                                linkedAppId: inv.appId || '',
                                linkedBatchId: inv.batchId || batchId,
                                uploadedBy: inv.attachment?.uploadedBy || inv.createdBy || inv.owner || '',
                                uploadedAt: inv.attachment?.uploadedAt || inv.uploadedAt || inv.createdAt || '',
                                updatedAt
                            });
                            if (inv.attachment) syncOcrAttachmentState(inv.attachment, attachmentState, {
                                linkedOcrJobId: inv.attachment.linkedOcrJobId || '',
                                linkedDraftId: inv.attachment.linkedDraftId || '',
                                linkedInvoiceId: inv.id || '',
                                linkedAppId: inv.appId || '',
                                linkedBatchId: inv.batchId || batchId,
                                uploadedBy: inv.attachment.uploadedBy || inv.createdBy || inv.owner || '',
                                uploadedAt: inv.attachment.uploadedAt || inv.uploadedAt || inv.createdAt || '',
                                updatedAt
                            });
                        });
                        appendLogWithoutSaving(user?.username || '?', '审核发票批次', `${batchId} / ${status} / ${transactionTargets.length}张 / ${auditRecord.id}`);
                        return { targets: transactionTargets, auditRecord };
                    },
                    archive: result => {
                        writeInvoiceBatchManifest(appForInvoice(result.targets[0]), batchId, result.targets);
                        writeInvoiceAuditArchive(result.auditRecord);
                    }
                });
                notifyInvoiceResult(batchId, status, note, user?.username || '', result.auditRecord.submittedBy || result.auditRecord.owner || '');
                res.end(JSON.stringify({ success: true, batchId, status, invoices: result.targets, auditRecord: result.auditRecord }));
            } catch (error) {
                console.error('[发票事务] 批次审核失败:', error.message);
                res.writeHead(error.statusCode || 500);
                res.end(JSON.stringify({ error: error.message || '发票批次审核失败' }));
            }
        });
        return;
    }

    if (req.url === '/api/invoice-pools' && req.method === 'GET') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            success: true,
            pools: buildInvoicePools(filterUser),
            role: user?.role,
            username: user?.username
        }));
        return;
    }

    if (req.url.startsWith('/api/invoice-drafts/submit') && req.method === 'POST') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const appId = String(body.appId || '').trim();
            try {
                const app = assertProjectOpenForWrite(applications.find(item => item.id === appId), '提交发票草稿');
                assertInvoiceActivityDate(app);
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            const drafts = buildInvoiceDrafts(filterUser, appId, { internal: true });
            if (!appId || !drafts.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '当前项目没有待提交发票草稿' }));
                return;
            }
            const duplicateDraftInvoice = findDuplicateDraftInvoiceNo(drafts);
            if (duplicateDraftInvoice) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    error: `项目待提交草稿中存在重复发票号码 ${duplicateDraftInvoice.invoiceNo}，涉及草稿：${duplicateDraftInvoice.draftIds.join('、')}。请先移除重复草稿后再提交审核。`
                }));
                return;
            }
            const draftIds = drafts.map(draft => draft.id);
            const invoiceStart = invoices.length;
            const nextInvoiceStart = nextInvoiceId;
            const batchId = 'BATCH' + Date.now();
            const created = [];
            for (const draft of drafts) {
                const result = createInvoicesFromDraftPayload(draft, user, filterUser, batchId, { excludeDraftIds: draftIds });
                if (!result.success) {
                    invoices.splice(invoiceStart);
                    nextInvoiceId = nextInvoiceStart;
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: result.error || '项目提交失败' }));
                    return;
                }
                created.push(...result.invoices);
            }
            drafts.forEach(draft => {
                draft.status = '已提交';
                draft.submittedBatchId = batchId;
                draft.submittedAt = new Date().toLocaleString();
                draft.updatedAt = draft.submittedAt;
            });
            try {
                archiveInvoiceBatchAttachments(appId, batchId, created, drafts);
            } catch (archiveErr) {
                console.error('[归档] 发票批次附件归档失败:', archiveErr);
                created.forEach(inv => inv.archiveError = archiveErr.message);
            }
            saveData();
            logAction(user?.username || '?', '提交项目发票审核', `${appId} / ${batchId} / ${created.length}张`);
            notifyInvoiceSubmitted(batchId);
            res.end(JSON.stringify({ success: true, appId, batchId, invoices: created }));
        });
        return;
    }

    if (req.url.startsWith('/api/invoice-drafts/') && req.method === 'DELETE') {
        const user = getCurrentUser(req);
        const id = decodeURIComponent(req.url.split('/')[3] || '');
        const index = invoiceDraftBatches.findIndex(draft => draft.id === id && (draft.status || '草稿') === '草稿');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (index === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: '未找到草稿' }));
            return;
        }
        const draft = invoiceDraftBatches[index];
        const isAdmin = user?.role === 'admin' || user?.role === 'approver';
        if (!isAdmin && draft.owner !== user?.username && draft.createdBy !== user?.username) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权删除该草稿' }));
            return;
        }
        try {
            assertProjectOpenForWrite(applications.find(app => app.id === draft.appId), '删除发票草稿');
        } catch (error) {
            res.writeHead(error.statusCode || 409);
            res.end(JSON.stringify({ error: error.message }));
            return;
        }
        const updatedAt = new Date().toLocaleString('zh-CN');
        (draft.items || []).forEach(item => {
            if (!item.attachment) return;
            item.attachment = normalizeAttachmentRecord(item.attachment, {
                state: '已移除临时',
                linkedOcrJobId: item.ocrJobId || item.attachment?.linkedOcrJobId || '',
                linkedDraftId: id,
                linkedInvoiceId: '',
                linkedAppId: draft.appId || '',
                linkedBatchId: '',
                uploadedBy: item.attachment?.uploadedBy || draft.createdBy || draft.owner || '',
                uploadedAt: item.attachment?.uploadedAt || item.uploadedAt || draft.createdAt || '',
                updatedAt
            });
            syncOcrAttachmentState(item.attachment, '已移除临时', {
                linkedOcrJobId: item.ocrJobId || item.attachment.linkedOcrJobId || '',
                linkedDraftId: id,
                linkedInvoiceId: '',
                linkedAppId: draft.appId || '',
                linkedBatchId: '',
                uploadedBy: item.attachment.uploadedBy || draft.createdBy || draft.owner || '',
                uploadedAt: item.attachment.uploadedAt || item.uploadedAt || draft.createdAt || '',
                updatedAt
            });
        });
        draft.status = '已删除';
        draft.deletedAt = updatedAt;
        draft.updatedAt = updatedAt;
        try {
            writeDraftManifest(draft);
        } catch (archiveErr) {
            draft.archiveError = archiveErr.message;
            console.error('[归档] 删除草稿清单写入失败:', archiveErr);
        }
        invoiceDraftBatches.splice(index, 1);
        saveData();
        logAction(user?.username || '?', '删除发票草稿', id);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    if (req.url.startsWith('/api/invoice-drafts') && req.method === 'GET') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const appId = urlObj.searchParams.get('appId') || '';
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            success: true,
            drafts: buildInvoiceDrafts(filterUser, appId),
            role: user?.role,
            username: user?.username
        }));
        return;
    }

    if (req.url === '/api/invoice-drafts' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            try {
                const app = assertProjectOpenForWrite(applications.find(item => item.id === body.appId), '保存发票草稿');
                assertInvoiceActivityDate(app);
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            if (!incomingInvoiceAttachmentsAuthorized(user, body)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '不能引用无权访问的附件' }));
                return;
            }
            const expectedKeys = Array.isArray(body.expectedKeys) ? body.expectedKeys : [];
            const selectedRows = getExpectedRowsByKeys(expectedKeys, filterUser).filter(row => row.appId === body.appId);
            const sourceItems = Array.isArray(body.items) ? body.items : [];
            const isNoInvoiceDraft = !!body.noInvoice;
            if (!body.appId || !selectedRows.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先选择项目和明细' }));
                return;
            }
            const selectionError = invoiceBatchSelectionError(selectedRows);
            if (selectionError) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: selectionError }));
                return;
            }
            const need = batchNeedTotal(selectedRows);
            if (need <= 0) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '该明细已由草稿、待审核或已确认发票占用，请先删除草稿或等待审核后再操作' }));
                return;
            }
            const analyzedItems = isNoInvoiceDraft ? [] : normalizeCandidateInvoiceAvailability(sourceItems.map(item => {
                const checked = analyzeInvoiceCandidateForRows(item, selectedRows, user);
                return {
                    ...item,
                    ...checked,
                    attachment: item.attachment || null,
                    rawText: item.rawText || checked.rawText || ''
                };
            }));
            let items = analyzedItems.filter(item => item.eligible);
            if (!isNoInvoiceDraft && !items.length) {
                const rejection = firstInvoiceRejectionMessage(analyzedItems);
                res.writeHead(sourceItems.some(item => item?.fromPool) && /余额|全额使用|没有可用/.test(rejection) ? 409 : 400);
                res.end(JSON.stringify({ error: rejection }));
                return;
            }
            let draftNeedLeft = roundMoney(need);
            if (!isNoInvoiceDraft) {
                items = items.map(item => {
                    const available = toMoney(item.availableAmount) > 0
                        ? roundMoney(toMoney(item.availableAmount))
                        : positiveMoney(toMoney(item.amount) - toMoney(item.usedAmount));
                    const requested = toMoney(item.allocationAmount) > 0
                        ? roundMoney(Math.min(toMoney(item.allocationAmount), available))
                        : available;
                    const reservedAmount = roundMoney(Math.min(draftNeedLeft, requested));
                    draftNeedLeft = positiveMoney(draftNeedLeft - reservedAmount);
                    return {
                        ...item,
                        reservedAmount,
                        allocationAmount: reservedAmount,
                        poolAmount: positiveMoney(available - reservedAmount)
                    };
                }).filter(item => toMoney(item.reservedAmount) > 0);
                if (!items.length) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '当前所选明细没有可保存的缺口金额' }));
                    return;
                }
            }
            let checked = roundMoney(items.reduce((sum, item) => sum + draftItemUsageAmount(item), 0));
            if (isNoInvoiceDraft) {
                checked = roundMoney(Math.min(toMoney(body.noInvoiceAmount || body.checked || need), need));
                if (checked <= 0) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '无票金额必须大于 0' }));
                    return;
                }
                if (!String(body.employeeNote || '').trim()) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '无票提报必须填写原因说明' }));
                    return;
                }
            }
            const draftId = 'DRAFT' + String(nextInvoiceDraftId++).padStart(4, '0');
            const now = new Date().toLocaleString('zh-CN');
            const draftItems = items.map(item => {
                const attachment = item.fromPool ? null : normalizeAttachmentRecord(item.attachment, {
                    state: '草稿引用',
                    linkedOcrJobId: item.ocrJobId || item.attachment?.linkedOcrJobId || '',
                    linkedDraftId: draftId,
                    linkedAppId: body.appId || '',
                    uploadedBy: item.attachment?.uploadedBy || user?.username || '',
                    uploadedAt: item.uploadedAt || item.attachment?.uploadedAt || now,
                    updatedAt: now
                });
                if (attachment) syncOcrAttachmentState(attachment, '草稿引用', {
                    linkedOcrJobId: item.ocrJobId || attachment.linkedOcrJobId || '',
                    linkedDraftId: draftId,
                    linkedAppId: body.appId || '',
                    uploadedBy: attachment.uploadedBy || user?.username || '',
                    uploadedAt: attachment.uploadedAt || now,
                    updatedAt: now
                });
                return { ...item, attachment };
            });
            const draft = {
                id: draftId,
                appId: body.appId || '',
                projectName: selectedRows[0]?.projectName || '',
                expectedKeys,
                detailLabel: body.detailLabel || '',
                need,
                checked,
                employeeNote: body.employeeNote || '',
                items: draftItems,
                noInvoice: isNoInvoiceDraft,
                noInvoiceAmount: isNoInvoiceDraft ? checked : 0,
                owner: user?.role === 'admin' || user?.role === 'approver' ? (body.owner || selectedRows[0]?.applicant || user?.username || '') : user?.username,
                createdBy: user?.username || '',
                createdAt: now,
                updatedAt: now,
                status: '草稿'
            };
            invoiceDraftBatches.push(draft);
            try {
                writeDraftManifest(draft);
            } catch (archiveErr) {
                draft.archiveError = archiveErr.message;
                console.error('[归档] 发票草稿清单写入失败:', archiveErr);
            }
            saveData();
            logAction(user?.username || '?', '保存发票草稿', `${draft.appId} / ${draft.id} / ${items.length}张`);
            res.end(JSON.stringify({ success: true, draft }));
        });
        return;
    }

    if (req.url === '/api/invoices/ocr' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const expectedRows = getInvoiceExpectedItems(user?.role === 'admin' || user?.role === 'approver' ? null : user?.username);
        invoiceSingleUpload.single('file')(req, res, (err) => {
            res.setHeader('Content-Type', 'application/json');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: uploadErrorMessage(err) }));
                return;
            }
            if (!req.file) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先选择发票附件' }));
                return;
            }
            const requestedAppId = String(req.body?.appId || projectIdFromExpectedKey(req.body?.expectedKey) || '').trim();
            try {
                if (!requestedAppId) {
                    const missingProject = new Error('单张OCR识别必须关联项目');
                    missingProject.statusCode = 400;
                    throw missingProject;
                }
                assertProjectOpenForWrite(applications.find(app => app.id === requestedAppId), '提交OCR识别');
            } catch (error) {
                removeUploadedFiles(req.file);
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            const emptyError = rejectEmptyUpload(req.file);
            if (emptyError) {
                removeUploadedFiles(req.file);
                res.writeHead(400);
                res.end(JSON.stringify({ error: emptyError }));
                return;
            }
            const contentError = uploadedFileContentError(req.file);
            if (contentError) {
                removeUploadedFiles(req.file);
                res.writeHead(400);
                res.end(JSON.stringify({ error: contentError }));
                return;
            }
            runLocalInvoiceOcr(req.file.path, (ocrErr, extracted) => {
                if (ocrErr) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'OCR识别失败：' + ocrErr.message }));
                    return;
                }
                const draft = {
                    invoiceNo: extracted.invoiceNo,
                    buyerName: extracted.buyerName,
                    sellerName: extracted.sellerName,
                    amount: extracted.amount,
                    invoiceDate: extracted.invoiceDate,
                    invoiceType: extracted.invoiceType
                };
                const now = new Date().toLocaleString('zh-CN');
                const attachment = normalizeAttachmentRecord({
                    success: true,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    path: '/attachments/' + req.file.filename
                }, {
                    state: '临时识别',
                    uploadedBy: user?.username || '',
                    uploadedAt: now
                });
                res.end(JSON.stringify({
                    success: true,
                    attachment,
                    extracted,
                    analysis: analyzeInvoice(draft, expectedRows)
                }));
            });
        });
        return;
    }

    if (req.url.startsWith('/api/invoices/ocr-jobs') && req.method === 'GET') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const batchId = parsedUrl.searchParams.get('batchId') || '';
        const jobs = invoiceOcrJobs.filter(job => {
            if (job.projectClosure?.result === 'invalidated') return false;
            if (job.paymentCorrection?.result === 'invalidated') return false;
            if (applications.find(app => app.id === job.appId)?.status === 'closed') return false;
            if (batchId && job.batchId !== batchId) return false;
            if (filterUser && job.owner !== filterUser) return false;
            return true;
        });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            success: true,
            batchId,
            jobs: jobs.map(publicOcrJob),
            done: jobs.length > 0 && jobs.every(job => job.status === '已识别' || job.status === '识别失败需补录')
        }));
        return;
    }

    if (req.url === '/api/invoices/ocr-batch-v2' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        invoiceUpload.array('files', MAX_INVOICE_BATCH_FILES)(req, res, async (err) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: uploadErrorMessage(err) }));
                return;
            }
            const appId = req.body.appId || '';
            try {
                assertProjectOpenForWrite(applications.find(app => app.id === appId), '提交OCR识别');
            } catch (error) {
                removeUploadedFiles(req.files);
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            const expectedKeys = Array.isArray(req.body.expectedKeys) ? req.body.expectedKeys : [req.body.expectedKeys].filter(Boolean);
            const selectedRows = getExpectedRowsByKeys(expectedKeys, filterUser).filter(row => row.appId === appId);
            if (!appId || !selectedRows.length) {
                removeUploadedFiles(req.files);
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先选择项目和至少一条明细' }));
                return;
            }
            const selectionError = invoiceBatchSelectionError(selectedRows);
            if (selectionError) {
                removeUploadedFiles(req.files);
                res.writeHead(400);
                res.end(JSON.stringify({ error: selectionError }));
                return;
            }
            if (!req.files || !req.files.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先选择 PDF、PNG 或 JPG 发票附件' }));
                return;
            }
            const emptyError = rejectEmptyUpload(req.files);
            if (emptyError) {
                removeUploadedFiles(req.files);
                res.writeHead(400);
                res.end(JSON.stringify({ error: emptyError }));
                return;
            }
            const contentError = uploadedFileContentError(req.files);
            if (contentError) {
                removeUploadedFiles(req.files);
                res.writeHead(400);
                res.end(JSON.stringify({ error: contentError }));
                return;
            }

            const batchId = 'OCRBATCH' + Date.now();
            const now = new Date().toLocaleString('zh-CN');
            const jobs = req.files.map(file => {
                const jobId = 'OCR' + String(nextOcrJobId++).padStart(5, '0');
                const job = {
                    id: jobId,
                    batchId,
                    appId,
                    expectedKeys,
                    selectedRows,
                    owner: user?.username || '',
                    ownerRole: user?.role || '',
                    status: '待识别',
                    filePath: file.path,
                    attachment: normalizeAttachmentRecord({
                        filename: file.filename,
                        originalName: file.originalname,
                        path: '/attachments/' + file.filename
                    }, {
                        state: '临时识别',
                        linkedOcrJobId: jobId,
                        linkedAppId: appId,
                        uploadedBy: user?.username || '',
                        uploadedAt: now
                    }),
                    item: null,
                    error: '',
                    createdAt: now,
                    updatedAt: now
                };
                invoiceOcrJobs.push(job);
                return job;
            });
            jobs.forEach(job => {
                try {
                    archiveOcrAttachment(job);
                } catch (archiveErr) {
                    job.archiveError = archiveErr.message;
                    console.error('[归档] OCR临时附件归档失败:', archiveErr);
                }
            });
            saveData();
            setImmediate(processInvoiceOcrQueue);
            res.end(JSON.stringify({
                success: true,
                appId,
                batchId,
                expectedKeys,
                selectedRows,
                needTotal: batchNeedTotal(selectedRows),
                jobs: jobs.map(publicOcrJob),
                items: [],
                ruleNote: '不符合原因固定显示为：重复发票、销售方名称错误、采购方名称不符合、发票日期风险、替票规则、发票种类风险、OCR识别失败。'
            }));
        });
        return;
    }

    if (req.url === '/api/invoices/batch-v2' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            try {
                const app = assertProjectOpenForWrite(applications.find(item => item.id === body.appId), '提交发票批次');
                assertInvoiceActivityDate(app);
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            if (!incomingInvoiceAttachmentsAuthorized(user, body)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '不能引用无权访问的附件' }));
                return;
            }
            const result = createInvoicesFromDraftPayload(body, user, filterUser);
            if (!result.success) {
                res.writeHead((body.items || []).some(item => item?.fromPool) && /余额|全额使用|没有可用/.test(result.error || '') ? 409 : 400);
                res.end(JSON.stringify({ error: result.error || '提交失败' }));
                return;
            }
            try {
                archiveInvoiceBatchAttachments(body.appId || result.invoices?.[0]?.appId || '', result.batchId, result.invoices || []);
            } catch (archiveErr) {
                console.error('[归档] 发票批次附件归档失败:', archiveErr);
                (result.invoices || []).forEach(inv => inv.archiveError = archiveErr.message);
            }
            saveData();
            logAction(user?.username || '?', '提交发票批次', `${body.appId} / ${result.batchId} / ${result.invoices.length}张`);
            res.end(JSON.stringify(result));
        });
        return;
    }

    if (false && req.url === '/api/invoices/batch-v2' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const filterUser = user?.role === 'admin' || user?.role === 'approver' ? null : user?.username;
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const expectedKeys = Array.isArray(body.expectedKeys) ? body.expectedKeys : [];
            const selectedRows = getExpectedRowsByKeys(expectedKeys, filterUser).filter(row => row.appId === body.appId);
            const sourceItems = Array.isArray(body.items) ? body.items : [];
            const items = sourceItems.map(item => {
                const checked = analyzeInvoiceCandidateForRows(item, selectedRows, user);
                return {
                    ...item,
                    ...checked,
                    attachment: item.attachment || null,
                    rawText: item.rawText || checked.rawText || ''
                };
            }).filter(item => item.eligible);
            if (!body.appId || !selectedRows.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先选择项目和明细' }));
                return;
            }
            const selectionError = invoiceBatchSelectionError(selectedRows);
            if (selectionError) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: selectionError }));
                return;
            }
            if (!items.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请至少勾选一张符合规则的发票' }));
                return;
            }

            const need = batchNeedTotal(selectedRows);
            if (need <= 0) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '该明细已由待审核或已确认发票占用，需等待管理员审核后再操作' }));
                return;
            }
            let remainingNeed = need;
            const rowRemaining = selectedRows.map(row => ({
                key: row.key,
                supplier: row.supplier,
                item: row.item,
                content: row.content,
                expectedAmount: toMoney(row.missingAmount ?? row.expectedAmount),
                remaining: toMoney(row.missingAmount ?? row.expectedAmount)
            }));
            const batchId = 'BATCH' + Date.now();
            const created = [];
            items.forEach(item => {
                const available = toMoney(item.availableAmount) > 0 ? toMoney(item.availableAmount) : Math.max(toMoney(item.amount) - toMoney(item.usedAmount), 0);
                const allocation = Math.min(remainingNeed, available);
                const poolAmount = Math.max(available - allocation, 0);
                let allocationLeft = allocation;
                const detailAllocations = [];
                rowRemaining.forEach(row => {
                    if (allocationLeft <= 0 || row.remaining <= 0) return;
                    const used = Math.min(row.remaining, allocationLeft);
                    row.remaining = Math.max(row.remaining - used, 0);
                    allocationLeft = Math.max(allocationLeft - used, 0);
                    detailAllocations.push({
                        key: row.key,
                        supplier: row.supplier,
                        item: row.item,
                        content: row.content,
                        amount: used
                    });
                });
                remainingNeed = Math.max(remainingNeed - allocation, 0);
                const createdAt = new Date().toLocaleString('zh-CN');
                const poolStartAt = poolStartAtForRecord(item) || createdAt;
                const invoice = {
                    id: 'INV' + String(nextInvoiceId++).padStart(4, '0'),
                    batchId,
                    invoiceNo: String(item.invoiceNo || '').trim(),
                    buyerName: String(item.buyerName || '').trim(),
                    sellerName: String(item.sellerName || '').trim(),
                    amount: allocation,
                    invoiceTotalAmount: toMoney(item.amount),
                    poolAmount,
                    poolOwnerType: item.poolOwnerType || 'supplier',
                    poolOwner: item.poolOwner || item.sellerName || '',
                    invoiceDate: item.invoiceDate || '',
                    invoiceType: item.invoiceType || '发票',
                    uploadedAt: item.uploadedAt || poolStartAt,
                    poolStartAt,
                    poolExpireAt: item.poolExpireAt || poolExpireAtFromStart(poolStartAt),
                    appId: body.appId || '',
                    expectedKey: detailAllocations[0]?.key || expectedKeys[0] || '',
                    expectedKeys,
                    detailAllocations,
                    owner: user?.role === 'admin' || user?.role === 'approver' ? (body.owner || selectedRows[0]?.applicant || user?.username || '') : user?.username,
                    riskTips: [],
                    employeeNote: body.employeeNote || '',
                    note: body.employeeNote || '',
                    extractedText: item.rawText || '',
                    attachment: item.attachment || null,
                    createdBy: user?.username || '',
                    createdAt,
                    status: '待审核'
                };
                invoice.analysis = analyzeInvoice(invoice, getInvoiceExpectedItems(filterUser));
                invoices.push(invoice);
                created.push(invoice);
            });
            saveData();
            logAction(user?.username || '?', '提交发票批次', `${body.appId} / ${batchId} / ${created.length}张`);
            res.end(JSON.stringify({
                success: true,
                batchId,
                invoices: created,
                needTotal: need,
                submittedAmount: created.reduce((sum, inv) => sum + toMoney(inv.amount), 0),
                missingAmount: remainingNeed
            }));
        });
        return;
    }

    if (req.url === '/api/invoices/ocr-batch' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const expectedRows = getInvoiceExpectedItems(user?.role === 'admin' || user?.role === 'approver' ? null : user?.username);
        invoiceUpload.array('files', MAX_INVOICE_BATCH_FILES)(req, res, async (err) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: uploadErrorMessage(err) }));
                return;
            }
            const requestedAppId = String(req.body?.appId || projectIdFromExpectedKey(req.body?.expectedKey) || '').trim();
            try {
                if (requestedAppId) assertProjectOpenForWrite(applications.find(app => app.id === requestedAppId), '提交OCR识别');
            } catch (error) {
                removeUploadedFiles(req.files);
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            if (!req.files || !req.files.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先选择 PDF、PNG 或 JPG 发票附件' }));
                return;
            }
            const emptyError = rejectEmptyUpload(req.files);
            if (emptyError) {
                removeUploadedFiles(req.files);
                res.writeHead(400);
                res.end(JSON.stringify({ error: emptyError }));
                return;
            }
            const contentError = uploadedFileContentError(req.files);
            if (contentError) {
                removeUploadedFiles(req.files);
                res.writeHead(400);
                res.end(JSON.stringify({ error: contentError }));
                return;
            }
            if (req.files.length > MAX_INVOICE_BATCH_FILES) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '单次最多识别 ' + MAX_INVOICE_BATCH_FILES + ' 张发票，请分批处理' }));
                return;
            }
            const expectedRow = expectedRows.find(row => row.key === req.body.expectedKey);
            if (!expectedRow) {
                removeUploadedFiles(req.files);
                res.writeHead(403);
                res.end(JSON.stringify({ error: '请先在右侧选择项目明细' }));
                return;
            }
            const uploadedAt = new Date().toLocaleString('zh-CN');
            let remainingNeed = Math.max(toMoney(expectedRow.missingAmount || expectedRow.expectedAmount), 0);
            const items = [];
            for (const file of req.files) {
                try {
                    const extracted = await parseInvoiceAttachment(file.path);
                    const item = analyzeInvoiceBatchItem(extracted, expectedRow, remainingNeed, user);
                    remainingNeed = Math.max(remainingNeed - item.allocationAmount, 0);
                    item.attachment = normalizeAttachmentRecord({
                        filename: file.filename,
                        originalName: file.originalname,
                        path: '/attachments/' + file.filename
                    }, {
                        state: '临时识别',
                        linkedAppId: expectedRow.appId || '',
                        uploadedBy: user?.username || '',
                        uploadedAt
                    });
                    items.push(item);
                } catch (ocrErr) {
                    items.push({
                        attachment: normalizeAttachmentRecord({
                            filename: file.filename,
                            originalName: file.originalname,
                            path: '/attachments/' + file.filename
                        }, {
                            state: '识别失败临时',
                            linkedAppId: expectedRow.appId || '',
                            uploadedBy: user?.username || '',
                            uploadedAt
                        }),
                        amount: 0,
                        allocationAmount: 0,
                        poolAmount: 0,
                        warnings: ['OCR识别失败：' + ocrErr.message],
                        status: '待管理员审核'
                    });
                }
            }
            res.end(JSON.stringify({
                success: true,
                expectedRow,
                items,
                remainingNeed,
                riskTips: items.flatMap(item => item.warnings || [])
            }));
        });
        return;
    }

    if (req.url === '/api/invoices/batch' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const expectedRows = getInvoiceExpectedItems(user?.role === 'admin' || user?.role === 'approver' ? null : user?.username);
        const expectedKeys = new Set(expectedRows.map(row => row.key));
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const requestedAppId = String(body.appId || projectIdFromExpectedKey(body.expectedKey) || '').trim();
            try {
                if (requestedAppId) assertProjectOpenForWrite(applications.find(app => app.id === requestedAppId), '提交发票批次');
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            if (!incomingInvoiceAttachmentsAuthorized(user, body)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '不能引用无权访问的附件' }));
                return;
            }
            if (!body.expectedKey || !expectedKeys.has(body.expectedKey)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '请先选择属于自己的项目明细' }));
                return;
            }
            const expectedRow = expectedRows.find(row => row.key === body.expectedKey);
            const sourceItems = Array.isArray(body.items) ? body.items : [];
            if (!sourceItems.length && !body.noInvoice) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '请先上传并识别发票，或选择无发票报销' }));
                return;
            }
            if (body.noInvoice && !String(body.employeeNote || '').trim()) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '无发票报销必须填写员工备注/情况说明' }));
                return;
            }
            const reusedItem = sourceItems.find(item => {
                const no = String(item.invoiceNo || '').trim();
                return no && usedAmountByInvoiceNo(no, { includeDrafts: true }) > 0;
            });
            if (reusedItem) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: `发票号码 ${String(reusedItem.invoiceNo || '').trim()} 已有使用记录，请从多余发票池使用剩余额，不能重新上传重复使用` }));
                return;
            }

            const created = [];
            sourceItems.forEach(item => {
                const amount = toMoney(item.allocationAmount || item.amount);
                if (amount <= 0 && !item.invoiceNo) return;
                const createdAt = new Date().toLocaleString('zh-CN');
                const invoiceId = 'INV' + String(nextInvoiceId++).padStart(4, '0');
                const attachment = normalizeAttachmentRecord(item.attachment, {
                    state: '待审核引用',
                    linkedOcrJobId: item.ocrJobId || item.attachment?.linkedOcrJobId || '',
                    linkedDraftId: item.attachment?.linkedDraftId || '',
                    linkedInvoiceId: invoiceId,
                    linkedAppId: body.appId || expectedRow?.appId || '',
                    linkedBatchId: '',
                    uploadedBy: item.attachment?.uploadedBy || user?.username || '',
                    uploadedAt: item.attachment?.uploadedAt || item.uploadedAt || createdAt,
                    updatedAt: createdAt
                });
                const invoice = {
                    id: invoiceId,
                    invoiceNo: String(item.invoiceNo || '').trim(),
                    buyerName: String(item.buyerName || '').trim(),
                    sellerName: String(item.sellerName || '').trim(),
                    amount,
                    invoiceTotalAmount: toMoney(item.amount),
                    poolAmount: toMoney(item.poolAmount),
                    poolOwnerType: item.poolOwnerType || '',
                    poolOwner: item.poolOwner || '',
                    invoiceDate: item.invoiceDate || '',
                    invoiceType: item.invoiceType || '发票',
                    appId: body.appId || expectedRow?.appId || '',
                    expectedKey: body.expectedKey,
                    owner: user?.role === 'admin' || user?.role === 'approver' ? (body.owner || expectedRow?.applicant || user?.username || '') : user?.username,
                    riskTips: Array.isArray(item.warnings) ? item.warnings : [],
                    employeeNote: body.employeeNote || '',
                    note: body.employeeNote || '',
                    extractedText: item.rawText || '',
                    attachment,
                    createdBy: user?.username || '',
                    createdAt,
                    status: '待审核'
                };
                invoice.analysis = analyzeInvoice(invoice, expectedRows);
                invoices.push(invoice);
                created.push(invoice);
            });

            if (body.noInvoice) {
                const invoice = {
                    id: 'INV' + String(nextInvoiceId++).padStart(4, '0'),
                    invoiceNo: '',
                    buyerName: '',
                    sellerName: '无发票报销',
                    amount: toMoney(body.noInvoiceAmount || expectedRow?.missingAmount || expectedRow?.expectedAmount),
                    invoiceTotalAmount: 0,
                    poolAmount: 0,
                    invoiceDate: '',
                    invoiceType: '无发票报销',
                    appId: body.appId || expectedRow?.appId || '',
                    expectedKey: body.expectedKey,
                    owner: user?.username || '',
                    riskTips: ['无发票报销，必须管理员人工审核'],
                    employeeNote: body.employeeNote || '',
                    note: body.employeeNote || '',
                    attachment: null,
                    createdBy: user?.username || '',
                    createdAt: new Date().toLocaleString(),
                    status: '待审核'
                };
                invoices.push(invoice);
                created.push(invoice);
            }

            saveData();
            logAction(user?.username || '?', '批量提交发票', (expectedRow?.appId || '') + ' / ' + created.length + '条');
            res.end(JSON.stringify({ success: true, invoices: created }));
        });
        return;
    }

    if (req.url.startsWith('/api/invoice-project-export') && req.method === 'GET') {
        const user = getCurrentUser(req);
        const urlObj = new URL(req.url, 'http://localhost');
        const appId = urlObj.searchParams.get('appId') || '';
        const expectedRows = getInvoiceExpectedItems(user?.role === 'admin' || user?.role === 'approver' ? null : user?.username);
        const rows = expectedRows.filter(row => !appId || row.appId === appId);
        const lines = [['项目名称', '项目金额', '对应发票号', '发票金额', '开票日期', '销售方', '购买方', '占用明细', '多余入库', '状态', '风险提示'].map(csvCell).join(',')];
        rows.forEach(row => {
            const matched = invoices.filter(inv => inv.expectedKey === row.key || (inv.appId === row.appId && normalizeText(inv.sellerName) === row.normalizedSupplier));
            if (!matched.length) {
                lines.push([row.projectName, row.expectedAmount, '', 0, '', row.supplier, '', row.item || row.content || '', 0, '缺票', ''].map(csvCell).join(','));
                return;
            }
            matched.forEach(inv => {
                lines.push([
                    row.projectName,
                    row.expectedAmount,
                    inv.invoiceNo || '',
                    inv.amount || 0,
                    inv.invoiceDate || '',
                    inv.sellerName || '',
                    inv.buyerName || '',
                    row.item || row.content || '',
                    inv.poolAmount || 0,
                    inv.status || '',
                    (inv.riskTips || inv.analysis?.warnings || []).join('；')
                ].map(csvCell).join(','));
            });
        });
        const csv = '\ufeff' + lines.join('\r\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="invoice-project-summary.csv"');
        res.end(csv);
        return;
    }

    if (req.url === '/api/invoices/analyze' && req.method === 'POST') {
        const user = getCurrentUser(req);
        const expectedRows = getInvoiceExpectedItems(user?.role === 'admin' || user?.role === 'approver' ? null : user?.username);
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const extracted = extractInvoiceFields(body.text || '');
            const draft = { ...body, ...extracted, amount: body.amount || extracted.amount };
            res.end(JSON.stringify({ extracted, analysis: analyzeInvoice(draft, expectedRows) }));
        });
        return;
    }

    if (req.url === '/api/invoices' && req.method === 'POST') {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '旧单张发票登记入口已关闭，请使用发票草稿与批次提交流程' }));
        return;
    }

    if (req.url.startsWith('/api/invoices/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '只有Admin可以对已确认发票执行纠错' }));
            return;
        }
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const invoice = invoices.find(inv => inv.id === id);
            if (!invoice) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '未找到发票' }));
                return;
            }
            if (invoice.status === '已关闭' || invoice.paymentCorrection?.result === 'invalidated') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该发票已因付款更正关闭，仅允许查看历史证据' }));
                return;
            }
            try {
                assertProjectOpenForWrite(applications.find(app => app.id === invoice.appId), '更新发票');
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            if (body.status !== '已驳回') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '旧发票更新入口已收口，仅支持Admin对已确认发票执行有原因纠错' }));
                return;
            }
            const reason = String(body.correctionReason || body.reason || '').trim();
            if (!reason) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '确认后纠错必须填写原因' }));
                return;
            }
            if (invoice.status !== '已确认') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '只有已确认发票可执行确认后纠错' }));
                return;
            }
            try {
                const result = commitInvoiceTransaction({
                    appId: invoice.appId,
                    mutate: () => {
                        const target = invoices.find(item => item.id === id);
                        if (!target || target.status !== '已确认') {
                            const error = new Error('发票状态已变更，请刷新后重试');
                            error.statusCode = 409;
                            throw error;
                        }
                        const originalAuditRecordId = target.auditRecordId || '';
                        const auditRecord = createInvoiceAuditRecord({
                            user, batchId: target.batchId || `CORRECTION-${target.id}`, status: '已驳回', note: reason,
                            targets: [target], beforeStatuses: [{ id: target.id, status: '已确认' }]
                        });
                        auditRecord.action = '确认后纠错';
                        auditRecord.originalAuditRecordId = originalAuditRecordId;
                        auditRecord.correctionReason = reason;
                        target.status = '已驳回';
                        target.originalAuditRecordId = originalAuditRecordId;
                        target.correctionAuditRecordId = auditRecord.id;
                        target.correctionReason = reason;
                        target.correctedBy = user.username;
                        target.correctedAt = auditRecord.reviewedAt;
                        target.updatedBy = user.username;
                        target.updatedAt = auditRecord.reviewedAt;
                        target.reviewNote = reason;
                        target.analysis = analyzeInvoice(target, getInvoiceExpectedItems());
                        appendLogWithoutSaving(user.username, '纠错已确认发票', `${target.id} / ${auditRecord.id} / ${reason}`);
                        return { target, auditRecord };
                    },
                    archive: result => writeInvoiceAuditArchive(result.auditRecord)
                });
                res.end(JSON.stringify({ success: true, invoice: result.target, auditRecord: result.auditRecord }));
            } catch (error) {
                res.writeHead(error.statusCode || 500);
                res.end(JSON.stringify({ error: error.message || '发票纠错失败' }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/invoices/') && req.method === 'DELETE') {
        const id = req.url.split('/')[3];
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '未找到发票' }));
            return;
        }
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '已递交发票不得物理删除；已确认发票请使用Admin有原因纠错' }));
        return;
    }

    // 提交申请 - 始终为 pending
    if (req.url === '/api/application' && req.method === 'POST') {
        const user = getCurrentUser(req);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let submitted;
            try {
                submitted = JSON.parse(body || '{}');
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            if (submitted.status === 'draft') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '项目草稿已停用，不能新建；历史项目草稿仅只读兼容' }));
                return;
            }
            if (!incomingAttachmentsAuthorized(user, submitted.attachments)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '不能引用无权访问的附件' }));
                return;
            }
            const data = { ...submitted };
            try {
                const client = resolveActiveClient(clients, submitted.clientId);
                applyClientSnapshot(data, client);
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message || '甲方校验失败' }));
                return;
            }
            const requestedDebtLinks = Array.isArray(submitted.debtLinks) ? submitted.debtLinks : [];
            const debtDraftToken = String(submitted.debtDraftToken || '').trim();
            delete data.debtDraftToken;
            delete data.id;
            delete data.date;
            delete data.approveTime;
            delete data.archive;
            delete data.archiveError;
            delete data.projectGroupId;
            delete data.revisionNo;
            data.applicant = user.username;
            data.owner = user.username;
            const previousAppId = data.previousAppId ? String(data.previousAppId).trim() : '';
            let previousApp = null;
            if (previousAppId) {
                previousApp = applications.find(app => app.id === previousAppId);
                if (!previousApp) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '上一版项目申请不存在，不能提交重提申请' }));
                    return;
                }
                try {
                    assertProjectOpenForWrite(previousApp, '重提项目');
                    assertProjectFinancialFactsUnlocked(currentDataState(), previousApp.id, '重提项目');
                } catch (error) {
                    res.writeHead(error.statusCode || 409);
                    res.end(JSON.stringify({ error: error.message }));
                    return;
                }
                if (!userOwnsApplication(user, previousApp)) {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: '不能重提他人的项目申请' }));
                    return;
                }
                if (previousApp.status === 'draft') {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '历史项目草稿（只读），不能重提' }));
                    return;
                }
                if (previousApp.status !== 'rejected') {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '只有已驳回项目可以重提' }));
                    return;
                }
                if (applications.some(app => app.previousAppId === previousApp.id)) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '该项目申请已经存在后续版本' }));
                    return;
                }
                data.previousAppId = previousApp.id;
                data.projectGroupId = previousApp.projectGroupId || previousApp.id;
                data.revisionNo = (parseInt(previousApp.revisionNo, 10) || 1) + 1;
            }
            const restoredRejectedDate = previousApp && String(previousApp.startDate || '') === String(data.startDate || '');
            if (submitted.approver && !isValidApproverAccount(submitted.approver)) { res.writeHead(400); res.end(JSON.stringify({ error: '所选审批账号不存在或不具备审批权限' })); return; }
            const submittedItems = Array.isArray(submitted.items) ? submitted.items : [];
            const debtMarkerItems = submittedItems.filter(item => (
                item?.isDebtRepayment
                || item?.supplier === DEBT_SUPPLIER_VALUE
                || item?.supplier === DEBT_SUPPLIER_LABEL
            ));
            if (debtMarkerItems.length && !requestedDebtLinks.length) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '选择欠款供应商时必须提交结构化欠款关联' }));
                return;
            }
            const ordinaryItems = submittedItems.filter(item => !(
                item?.isDebtRepayment
                || item?.supplier === DEBT_SUPPLIER_VALUE
                || item?.supplier === DEBT_SUPPLIER_LABEL
            ));
            const contractAmount = toMoney(submitted.contractAmount);
            data.contractAmount = contractAmount;
            data.total = contractAmount;
            try {data.taxRateSnapshot=configuredTaxRate();}
            catch(error){res.writeHead(error.statusCode||409);res.end(JSON.stringify({error:error.message}));return;}
            data.taxAmount = contractAmount > 0 ? contractAmount * data.taxRateSnapshot / (1 + data.taxRateSnapshot) : 0;
            let normalizedOrdinaryItems;
            try {
                normalizedOrdinaryItems = normalizeProjectFinancialItems(ordinaryItems);
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message || '项目成本明细校验失败' }));
                return;
            }
            try {
                assertDebtEditLocksAvailable(requestedDebtLinks, user.username, debtDraftToken);
                const pendingDebtLinkStart = nextDebtLinkId;
                let pendingDebtLinkOffset = 0;
                const debtLinks = createDebtLinks({
                    requestedLinks: requestedDebtLinks,
                    debts,
                    applications,
                    payments,
                    clientId: data.clientId,
                    username: user.username,
                    config: currentConfig(),
                    nextLinkId: () => 'DEBTLINK' + String(pendingDebtLinkStart + pendingDebtLinkOffset++).padStart(5, '0')
                });
                if (debtLinks.length) {
                    const debtKpiItems = buildDebtKpiItems(debtLinks);
                    data.debtLinks = debtLinks;
                    data.debtSubmissionSnapshot = debtLinks.map(link => ({ debtId: link.debtId, debtLinkId: link.id, debtPrincipal: link.originalPrincipal, includedPrincipal: link.principal, remainingPrincipal: link.submissionSnapshot?.remainingPrincipal, source: 'project-plan' }));
                    data.debtFinancials = {
                        debtPrincipal: roundMoney(debtLinks.reduce((sum, link) => sum + toMoney(link.principal), 0)),
                        debtServiceFee: roundMoney(debtLinks.reduce((sum, link) => sum + toMoney(link.serviceFee), 0)),
                        debtKpiCost: roundMoney(debtKpiItems.reduce((sum, item) => sum + toMoney(item.amount) + toMoney(item.serviceFee), 0)),
                        allocatedActualCost: roundMoney(debtLinks.reduce((sum, link) => sum + toMoney(link.allocatedCost), 0))
                    };
                    data.items = [...normalizedOrdinaryItems, ...debtKpiItems];
                } else {
                    data.items = normalizedOrdinaryItems;
                    delete data.debtLinks;
                    delete data.debtSubmissionSnapshot;
                    delete data.debtFinancials;
                }
                const constraintErrors = projectConstraintReasons(data, { submission: true });
                if (constraintErrors.length) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: constraintErrors.join('\n') }));
                    return;
                }
                if (!projectActivityDateInSubmissionWindow(data.startDate) && !restoredRejectedDate) {
                    const bounds = projectActivityDateBounds();
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: `活动日期必须在 ${bounds.min} 至 ${bounds.max} 之间；历史超界值仅保留原记录` }));
                    return;
                }
                nextDebtLinkId = pendingDebtLinkStart + pendingDebtLinkOffset;
            } catch (error) {
                res.writeHead(error.statusCode || 400);
                res.end(JSON.stringify({ error: error.message || '欠款关联校验失败' }));
                return;
            }
            data.id = 'APP' + String(nextAppId++).padStart(4, '0');
            let ordinaryItemNo = 0;
            data.items = (data.items || []).map(item => {
                if (item?.isDebtRepayment || item?.supplierType === 'system-debt') return item;
                ordinaryItemNo += 1;
                return { ...item, projectItemId: `${data.id}-ITEM-${String(ordinaryItemNo).padStart(2, '0')}` };
            });
            if (!data.projectGroupId) data.projectGroupId = data.id;
            if (!data.revisionNo) data.revisionNo = 1;
            data.date = new Date().toLocaleString();
            data.status = 'pending';
            applications.push(data);
            releaseDebtEditLocks({ username: user.username, draftToken: debtDraftToken });
            try {
                archiveApplicationAttachments(data);
            } catch (archiveErr) {
                console.error('[归档] 项目申请附件归档失败:', archiveErr);
                data.archiveError = archiveErr.message;
            }
            saveData();
            logAction(data.applicant || '?', '提交申请', data.id + ' - ' + (data.projectName || ''));
            notifyApplicationSubmitted(data);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, id: data.id, status: data.status, projectGroupId: data.projectGroupId, previousAppId: data.previousAppId || '', revisionNo: data.revisionNo }));
        });
        return;
    }

    if (/^\/api\/application\/[^/]+\/activity-date$/.test(req.url) && req.method === 'PUT') {
        const user = getCurrentUser(req);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '只有Admin可以依据原始证据补录历史项目活动日期' }));
            return;
        }
        const id = decodeURIComponent(req.url.split('/')[3] || '');
        parseJsonBody(req, (error, body) => {
            if (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const startDate = String(body.startDate || '').trim();
            const reason = String(body.reason || '').trim();
            const expectedVersion = body.expectedVersion;
            if (!isValidProjectActivityDate(startDate)) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '活动日期必须为有效日期' }));
                return;
            }
            const historicalBounds = historicalActivityDateBounds();
            if (startDate < historicalBounds.min || startDate > historicalBounds.max) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: `历史活动日期必须在已有历史年份与 ${historicalBounds.max.slice(0, 4)} 年上限内` }));
                return;
            }
            if (!reason) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '历史活动日期补录必须填写证据说明' }));
                return;
            }
            const current = applications.find(app => app.id === id);
            if (!current) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '未找到项目' }));
                return;
            }
            try {
                assertProjectFinancialFactsUnlocked(currentDataState(), current.id, '补录或更正项目活动日期');
            } catch (lockedError) {
                res.writeHead(lockedError.statusCode || 409);
                res.end(JSON.stringify({ error: lockedError.message }));
                return;
            }
            if (current.status !== 'approved') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '只允许补录已通过且当前缺少活动日期的历史项目' }));
                return;
            }
            const currentVersion = Number.isInteger(Number(current.activityDateVersion)) && Number(current.activityDateVersion) >= 0
                ? Number(current.activityDateVersion)
                : 0;
            if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '缺少有效的活动日期并发版本' }));
                return;
            }
            if (expectedVersion !== currentVersion) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '项目活动日期已被其他操作更新，请刷新后重试' }));
                return;
            }
            if (String(current.startDate || '').trim()) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该项目已有活动日期，不得通过历史补录入口覆盖' }));
                return;
            }
            try {
                const next = cloneCurrentDataState();
                const target = next.applications.find(app => app.id === id);
                const correctedAt = new Date().toLocaleString('zh-CN');
                const correction = {
                    projectId: id, oldValue: '', newValue: startDate, reason, operator: user.username,
                    operatorRole: user.role, correctedAt
                };
                target.startDate = startDate;
                target.activityDateVersion = currentVersion + 1;
                target.activityDateCorrections = Array.isArray(target.activityDateCorrections) ? target.activityDateCorrections : [];
                target.activityDateCorrections.push(correction);
                next.logs = Array.isArray(next.logs) ? next.logs : [];
                next.logs.unshift({ time: correctedAt, user: user.username, action: '补录历史项目活动日期', detail: `${id} / ${startDate} / ${reason}` });
                if (next.logs.length > 500) next.logs = next.logs.slice(0, 500);
                saveDataState(next);
                assignDataState(next);
                res.end(JSON.stringify({ success: true, application: target, correction }));
            } catch (saveError) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '历史活动日期补录保存失败' }));
            }
        });
        return;
    }

    // 审批申请
    if (req.url.startsWith('/api/application/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        const user = getCurrentUser(req);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let status;
            let reason = '';
            let confirmPendingSuppliers = false;
            try {
                const payload = JSON.parse(body || '{}');
                status = payload.status;
                reason = payload.reason;
                confirmPendingSuppliers = payload.confirmPendingSuppliers === true;
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const app = applications.find(a => a.id === id);
            if (!app) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '未找到' }));
                return;
            }
            if (app.status === 'draft') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '历史项目草稿（只读），不能操作' }));
                return;
            }
            if (status === 'closed') {
                try {
                    const result = closeProjectChainAtomically({ projectId: id, user, reason });
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({ success: true, idempotent: result.idempotent, historicalClosed: Boolean(result.historicalClosed), closure: result.closure }));
                } catch (error) {
                    res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: error.message || '项目整链关闭失败' }));
                }
                return;
            }
            if (!user || (user.role !== 'admin' && user.role !== 'approver')) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '无权限' }));
                return;
            }
            if (app.status === 'closed') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该项目已关闭，不能继续审批' }));
                return;
            }
            try {
                assertProjectFinancialFactsUnlocked(currentDataState(), app.id, '变更项目审批事实');
            } catch (lockedError) {
                res.writeHead(lockedError.statusCode || 409);
                res.end(JSON.stringify({ error: lockedError.message }));
                return;
            }
            const allowedTransitions = {
                pending: new Set(['approved', 'rejected'])
            };
            if (!allowedTransitions[app.status]?.has(status)) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: `项目状态不能从 ${app.status || '未知'} 变更为 ${status || '空'}` }));
                return;
            }
            const pendingSupplierItems = (app.items || []).filter(item => item?.supplierNameStatus === PROJECT_SUPPLIER_PENDING);
            if (status === 'approved' && pendingSupplierItems.length && !confirmPendingSuppliers) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '项目包含供应商名称待确认明细，审批人必须明确确认业务内容、待确认原因和预计金额' }));
                return;
            }
            const previousStatus = app.status;
            app.status = status;
            if (status === 'rejected') app.reviewNote = String(reason || '').trim();
            if (status === 'approved' && pendingSupplierItems.length) {
                app.pendingSupplierConfirmation = {
                    confirmedBy: user.username,
                    confirmedAt: new Date().toISOString(),
                    projectItemIds: pendingSupplierItems.map(item => item.projectItemId)
                };
            }
            (app.debtLinks || []).forEach(link => {
                if (status === 'approved') link.occupationStatus = toMoney(link.receivedPrincipal) > 0 ? 'partially_received' : 'included_pending_receipt';
                if (status === 'rejected') link.occupationStatus = 'released';
            });
            if (status === 'approved' || status === 'rejected') {
                app.approveTime = new Date().toLocaleString();
                app.reviewedBy = user.username;
            }
            try {
                writeApplicationManifest(app);
            } catch (archiveErr) {
                console.error('[归档] 项目申请状态写入归档失败:', archiveErr);
                app.archiveError = archiveErr.message;
            }
            saveData();
            logAction(user.username, '审批' + (status === 'approved' ? '通过' : '驳回'), id);
            if (previousStatus !== status && (status === 'approved' || status === 'rejected')) {
                notifyApplicationResult(app, user.username, status);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // 提交付款 - 始终为 pending
    if (req.url === '/api/payment' && req.method === 'POST') {
        const user = getCurrentUser(req);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(body || '{}');
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            if (data.status === 'draft') {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '付款 draft 功能已停用；历史付款草稿仅允许只读查看，不能新建或保存' }));
                return;
            }
            const relatedApp = applications.find(a => a.id === data.projectId);
            if (!relatedApp) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '关联项目不存在，不能提交付款' }));
                return;
            }
            try {
                assertProjectOpenForWrite(relatedApp, '提交付款');
                assertProjectFinancialFactsUnlocked(currentDataState(), relatedApp.id, data.previousPayId ? '重提付款' : '新建付款');
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            if (relatedApp.status !== 'approved') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '关联项目未审批通过，不能提交付款' }));
                return;
            }
            if (!userOwnsApplication(user, relatedApp) || relatedApp.applicant !== user.username) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '只能为本人已通过的项目提交付款' }));
                return;
            }
            if (!incomingAttachmentsAuthorized(user, data.attachments)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '不能引用无权访问的附件' }));
                return;
            }
            if (data.approver && !isValidApproverAccount(data.approver)) { res.writeHead(400); res.end(JSON.stringify({ error: '所选审批账号不存在或不具备审批权限' })); return; }
            const hasDebtLinks = Array.isArray(relatedApp.debtLinks) && relatedApp.debtLinks.length > 0;
            const previousPayId = data.previousPayId ? String(data.previousPayId).trim() : '';
            const projectPayments = payments.filter(payment => payment.projectId === data.projectId);
            const paymentGraph = analyzePaymentVersionGraph(projectPayments);
            if (paymentGraph.invalid) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该项目历史付款版本图异常，仅允许只读查看：' + paymentGraph.invalidReason }));
                return;
            }
            const openChainTips = paymentGraph.openRecords;
            if (!previousPayId && paymentGraph.openRootIds.size) {
                const existingPayment = openChainTips.find(payment => ['pending', 'approved'].includes(payment.status)) || openChainTips[openChainTips.length - 1];
                const statusText = existingPayment.status === 'approved' ? '已通过' : (existingPayment.status === 'pending' ? '待审批' : (existingPayment.status === 'rejected' ? '已驳回' : '已存在'));
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该项目已有付款业务链（' + existingPayment.id + '，' + statusText + '）；已驳回付款只能从原记录使用“重新编辑并提交”，不能新建独立付款申请' }));
                return;
            }
            if (previousPayId) {
                const previousPay = payments.find(pay => pay.id === previousPayId);
                if (!previousPay) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '上一版付款申请不存在，不能提交重提付款' }));
                    return;
                }
                if (previousPay.projectId !== data.projectId) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '重提付款必须关联同一个项目申请' }));
                    return;
                }
                if (!userOwnsPayment(user, previousPay) || previousPay.applicant !== user.username) {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: '不能重提他人的付款申请' }));
                    return;
                }
                if (isHistoricalPaymentDraft(previousPay)) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '历史付款草稿仅允许只读查看，不能重提或作为 previousPayId' }));
                    return;
                }
                const previousCorrection = paymentCorrectionFor(previousPay.id);
                const isCorrectedClosedPrevious = previousPay.status === 'closed' && Boolean(previousCorrection);
                if (previousPay.status !== 'rejected' && !isCorrectedClosedPrevious) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '只有已驳回付款或管理员已更正关闭的欠款归还付款可以沿原版本链重提' }));
                    return;
                }
                if (payments.some(pay => pay.previousPayId === previousPay.id)) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '该付款申请已经存在后续版本' }));
                    return;
                }
                const activePayment = openChainTips.find(pay => pay.id !== previousPay.id && ['pending', 'approved'].includes(pay.status));
                if (activePayment) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '该项目付款业务链已有' + (activePayment.status === 'approved' ? '已通过' : '待审批') + '记录（' + activePayment.id + '），不能继续重提' }));
                    return;
                }
                if (paymentGraph.openRootIds.size > 1) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: '该项目存在多条历史付款业务链，仅允许只读查看，不能继续新增版本' }));
                    return;
                }
                data.previousPayId = previousPay.id;
                data.revisionNo = (parseInt(previousPay.revisionNo, 10) || 1) + 1;
            } else {
                delete data.previousPayId;
                data.revisionNo = 1;
            }
            try {
                data.executionParticipants = normalizeExecutionParticipants(data.executionParticipants, {
                    users,
                    projectApplicant: relatedApp.applicant
                });
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message || '执行参与人员校验失败' }));
                return;
            }
            const submittedPaymentItems = Array.isArray(data.items) ? data.items : [];
            let paymentItems;
            try { paymentItems = normalizePaymentFinancialItems(submittedPaymentItems, relatedApp); }
            catch (error) { res.writeHead(error.statusCode || 400); res.end(JSON.stringify({ error: error.message || '付款明细校验失败', code: error.code })); return; }
            const forgedDebtPayment = paymentItems.find(item => (
                item?.isDebtRepayment
                || item?.supplier === DEBT_SUPPLIER_VALUE
                || item?.supplier === DEBT_SUPPLIER_LABEL
            ));
            if (forgedDebtPayment) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '欠款历史成本不得进入本次实际付款明细' }));
                return;
            }
            try {
            data.items = paymentItems;
            data.total = roundMoney(paymentItems.reduce((sum, item) => sum + toMoney(item.amount), 0));
            const projectTax = projectTaxSnapshot(relatedApp);
            data.contractAmount = toMoney(relatedApp.contractAmount);
            data.taxRateSnapshot = projectTax.taxRateSnapshot;
            data.taxAmount = projectTax.taxAmount;
            if (hasDebtLinks) {
                const requestedRepayments = Array.isArray(data.debtRepayments) ? data.debtRepayments : [];
                const linkIds = relatedApp.debtLinks.map(link => String(link.id));
                const seenDebtLinks = new Set();
                if (requestedRepayments.length !== linkIds.length) throw new Error('欠款归还明细必须逐笔填写（可填写 0）');
                const parsed = requestedRepayments.map(requested => { const debtLinkId=String(requested?.debtLinkId||'').trim(),link=relatedApp.debtLinks.find(item=>item.id===debtLinkId),text=String(requested?.confirmedPrincipal??'').trim();if(!link||seenDebtLinks.has(debtLinkId)||!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text))throw new Error('Invalid debt repayment');seenDebtLinks.add(debtLinkId);return {debtLinkId,link,confirmedPrincipal:roundMoney(text)}; });
                if (seenDebtLinks.size !== linkIds.length || linkIds.some(id => !seenDebtLinks.has(id))) throw new Error('Invalid debt repayment coverage');
                const candidate = { id:'__candidate__', projectId:relatedApp.id, status:'pending', debtRepayments:parsed.map(item=>({debtLinkId:item.debtLinkId,confirmedPrincipal:item.confirmedPrincipal})) };
                const candidatePayments = [...payments.filter(payment => !(payment.projectId === relatedApp.id && payment.status === 'pending')), candidate];
                const views = new Map();
                parsed.forEach(item => { const debt=debts.find(record=>record.id===item.link.debtId);if(!debt||debt.status!=='approved'||debt.applicant!==user.username||debt.clientId!==relatedApp.clientId)throw new Error('Invalid debt association');if(!views.has(debt.id))views.set(debt.id,debtView(debt,applications,candidatePayments)); });
                for (const [debtId,view] of views) if(toMoney(view.effectivePrincipal)>toMoney(view.principal)+.001){const error=new Error('Debt amount exceeds global available balance: '+debtId);error.statusCode=409;throw error;}
                data.debtRepayments=parsed.map(item=>{const debt=debts.find(record=>record.id===item.link.debtId),view=views.get(debt.id);return buildDebtPaymentSnapshot({debt,link:item.link,confirmedPrincipal:item.confirmedPrincipal,applications,payments,balanceAfter:view.remainingPrincipal});});
                data.kpiItems=[...paymentItems,...buildDebtPaymentKpiItems(data.debtRepayments,relatedApp.debtLinks)];
                data.debtHistory=data.debtRepayments.map(detail=>({...detail,note:'Debt repayment is excluded from company supplier cash payment.'}));
                data.debtSubmissionSnapshot=data.debtRepayments.map(detail=>({debtId:detail.debtId,debtLinkId:detail.debtLinkId,debtPrincipal:detail.originalPrincipal,plannedPrincipal:detail.plannedPrincipal,repaidPrincipal:detail.confirmedPrincipal,serviceFeeRateSnapshot:detail.serviceFeeRateSnapshot,serviceFee:detail.serviceFee,allocatedCost:detail.allocatedCost,remainingPrincipal:detail.remainingAfter,source:'pending-payment'}));
                data.actualPaymentTotal = roundMoney(paymentItems.reduce((sum, item) => sum + toMoney(item.amount) + toMoney(item.serviceFee), 0));
                data.total = roundMoney(paymentItems.reduce((sum, item) => sum + toMoney(item.amount), 0));
            } else {
                if (Array.isArray(data.debtRepayments) && data.debtRepayments.length) throw new Error('无关联欠款的项目不能提交欠款归还明细');
                delete data.debtRepayments;
                delete data.kpiItems;
                delete data.debtHistory;
                delete data.debtSubmissionSnapshot;
                delete data.actualPaymentTotal;
            }
            } catch (error) {
                res.writeHead(error.statusCode || 400);
                res.end(JSON.stringify({ error: error.message || '欠款归还明细校验失败' }));
                return;
            }
            data.id = 'PAY' + String(nextPayId++).padStart(4, '0');
            delete data.approveTime;
            delete data.archive;
            delete data.archiveError;
            data.applicant = user.username;
            data.owner = user.username;
            if (!data.revisionNo) data.revisionNo = 1;
            data.date = new Date().toLocaleString();
            data.status = 'pending';
            payments.push(data);
            try {
                archivePaymentAttachments(data, relatedApp);
            } catch (archiveErr) {
                console.error('[归档] 付款申请附件归档失败:', archiveErr);
                data.archiveError = archiveErr.message;
            }
            saveData();
            logAction(data.applicant || '?', '提交付款', data.id + ' - 项目' + (data.projectId || ''));
            notifyPaymentSubmitted(data, relatedApp);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, id: data.id, status: data.status, previousPayId: data.previousPayId || '', revisionNo: data.revisionNo }));
        });
        return;
    }

    const approvedDebtCorrectionMatch = req.url.match(/^\/api\/payment\/([^/]+)\/approved-debt-correction$/);
    if (approvedDebtCorrectionMatch && req.method === 'POST') {
        const user = getCurrentUser(req);
        parseJsonBody(req, (err, body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            try {
                const result = closeApprovedDebtPaymentAtomically({
                    paymentId: decodeURIComponent(approvedDebtCorrectionMatch[1]),
                    user,
                    reason: body?.reason
                });
                res.end(JSON.stringify({ success: true, idempotent: result.idempotent, correction: result.correction }));
            } catch (error) {
                res.writeHead(error.statusCode || 500);
                res.end(JSON.stringify({ error: error.message || '付款更正失败' }));
            }
        });
        return;
    }

    // 审批付款
    if (req.url.startsWith('/api/payment/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        const user = getCurrentUser(req);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let status;
            let reason = '';
            try {
                const payload = JSON.parse(body || '{}');
                status = payload.status;
                reason = String(payload.reason || payload.note || '').trim();
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'JSON格式错误' }));
                return;
            }
            const pay = payments.find(p => p.id === id);
            if (!pay) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: '未找到' }));
                return;
            }
            // 员工关闭自己的待审批付款需要特殊允许
            const isClosingOwnPayment = Boolean(user && status === 'closed' && pay.applicant === user.username && pay.status === 'pending');
            if (!user || (user.role !== 'admin' && user.role !== 'approver' && !isClosingOwnPayment)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '无权限' }));
                return;
            }
            // 只有admin和approver才能审批通过/驳回
            if (status !== 'closed' && user.role !== 'admin' && user.role !== 'approver') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: '无权限审批' }));
                return;
            }
            if (isHistoricalPaymentDraft(pay)) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '历史付款草稿仅允许只读查看，不能通过、驳回、关闭或重提' }));
                return;
            }
            const relatedApp = applications.find(a => a.id === pay.projectId);
            try {
                assertProjectOpenForWrite(relatedApp, '更新付款');
                assertProjectFinancialFactsUnlocked(currentDataState(), relatedApp?.id, '关闭、审批或驳回付款', pay.id);
            } catch (error) {
                res.writeHead(error.statusCode || 409);
                res.end(JSON.stringify({ error: error.message }));
                return;
            }
            const paymentGraph = projectPaymentVersionGraph(pay.projectId);
            if (paymentGraph.invalid || paymentGraph.openRootIds.size > 1) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: paymentGraph.invalid
                    ? '该项目历史付款版本图异常，仅允许只读查看：' + paymentGraph.invalidReason
                    : '该项目存在多条历史独立付款业务链，仅允许只读查看，不能审批、驳回或关闭' }));
                return;
            }
            if (relatedApp && relatedApp.status === 'closed') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '该项目已关闭，不能审批付款' }));
                return;
            }
            if (pay.status === 'closed') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: '该付款已关闭' }));
                return;
            }
            const allowedTransitions = {
                pending: new Set(['approved', 'rejected', 'closed']),
                rejected: new Set(['closed']),
                approved: new Set(['closed'])
            };
            if (!allowedTransitions[pay.status]?.has(status)) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: `付款状态不能从 ${pay.status || '未知'} 变更为 ${status || '空'}` }));
                return;
            }
            const previousStatus = pay.status;
            if (status === 'closed' && previousStatus === 'approved' && confirmedDebtPrincipalForPayment(pay, relatedApp) > 0) {
                res.writeHead(409);
                res.end(JSON.stringify({ error: '该付款已确认欠款归还，不能直接关闭；请由管理员使用“更正并关闭”处理' }));
                return;
            }
            pay.status = status;
            if (status === 'approved' || status === 'rejected') {
                pay.approveTime = new Date().toLocaleString();
                pay.reviewedBy = user.username;
            }
            if (status === 'rejected') pay.reviewNote = reason;
            if (status === 'closed') {
                pay.closedAt = new Date().toISOString();
                pay.closedBy = user.username;
                if (reason) pay.closeReason = reason;
            }
            if (status === 'approved' && previousStatus !== 'approved' && relatedApp) {
                confirmDebtLinksByPayment(relatedApp, pay, user.username, pay.approveTime);
            }
            try {
                writePaymentManifest(pay, relatedApp);
            } catch (archiveErr) {
                console.error('[归档] 付款申请状态写入归档失败:', archiveErr);
                pay.archiveError = archiveErr.message;
            }
            saveData();
            logAction(user.username, status === 'closed' ? '关闭付款' : ('付款' + (status === 'approved' ? '通过' : '驳回')), id);
            if (previousStatus !== status && (status === 'approved' || status === 'rejected' || status === 'closed')) {
                notifyPaymentResult(pay, relatedApp, user.username, status);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // ========== 统计报表 ==========
    const statsRequestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (statsRequestUrl.pathname === '/api/stats' && req.method === 'GET') {
        const user = getCurrentUser(req);
        if (!user || user.role !== 'admin') {
            res.writeHead(403);
            res.end(JSON.stringify({ error: '无权限' }));
            return;
        }

        try {
            const report = buildAuthoritativeStatsReport(statsRequestUrl.searchParams);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(report));
        } catch (error) {
            res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: error.message || '统计数据生成失败' }));
        }
        return;

    }

    // 静态文件只允许运行页面和主题样式，项目源码、数据、配置、日志及隐藏文件一律不对外提供。
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end('Method Not Allowed');
        return;
    }
    const staticRequestPath = requestUrl.pathname === '/' ? '/login.html' : requestUrl.pathname;
    const publicStaticFiles = new Map([
        ['/login.html', { file: 'login.html', type: 'text/html;charset=utf-8' }],
        ['/k-session-theme.css', { file: 'k-session-theme.css', type: 'text/css;charset=utf-8' }],
        ['/vendor/fflate.js', { file: 'node_modules/fflate/umd/index.js', type: 'text/javascript;charset=utf-8' }]
    ]);
    const authenticatedStaticFiles = new Map([
        ['/approval.html', { file: 'approval.html', type: 'text/html;charset=utf-8' }],
        ['/debt.html', { file: 'debt.html', type: 'text/html;charset=utf-8' }],
        ['/invoice.html', { file: 'invoice.html', type: 'text/html;charset=utf-8' }],
        ['/admin.html', { file: 'admin.html', type: 'text/html;charset=utf-8' }]
    ]);

    if (staticRequestPath.startsWith('/attachments/')) {
        const user = getCurrentUser(req);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '未登录' }));
            return;
        }
        if (!canAccessAttachment(user, staticRequestPath)) {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '无权访问该附件' }));
            return;
        }
        const fullPath = attachmentFullPathFromPublicPath(staticRequestPath);
        if (!fullPath) {
            res.writeHead(400);
            res.end('Bad attachment path');
            return;
        }
        fs.readFile(fullPath, (err, fileData) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            const ext = path.extname(fullPath).toLowerCase();
            const contentTypes = {
                '.pdf': 'application/pdf',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.xls': 'application/vnd.ms-excel',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            const downloadName = attachmentDownloadName(normalizedAttachmentPublicPath(staticRequestPath), fullPath);
            res.writeHead(200, {
                'Content-Type': contentTypes[ext] || 'application/octet-stream',
                'Content-Disposition': contentDispositionForFilename(downloadName),
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'private, no-store'
            });
            if (req.method === 'HEAD') res.end();
            else res.end(fileData);
        });
        return;
    }

    const publicEntry = publicStaticFiles.get(staticRequestPath);
    const protectedEntry = authenticatedStaticFiles.get(staticRequestPath);
    if (!publicEntry && !protectedEntry) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    if (protectedEntry && !isAuthenticated(req)) {
        res.writeHead(302, {
            Location: '/login.html',
            'Cache-Control': 'no-store',
            'Set-Cookie': 'k_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
        });
        res.end();
        return;
    }
    const entry = publicEntry || protectedEntry;
    fs.readFile(path.join(__dirname, entry.file), (err, fileData) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': entry.type,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': entry.type.startsWith('text/html') ? 'no-store' : 'public, max-age=3600'
        });
        if (req.method === 'HEAD') res.end();
        else res.end(fileData);
    });
    return;
}
server.listen(PORT,HOST,()=>{
    if(!needsInitialization&&process.env.KSESSION_SKIP_STARTUP_JOBS!=='1'){autoBackup();resumeInvoiceOcrQueue();}
    console.log('K⁺-SESSION running at http://'+HOST+':'+server.address().port);
});
server.on('error',error=>{console.error('Unable to start server:',error.code||error.message);process.exitCode=1;});
