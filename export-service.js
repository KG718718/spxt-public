const path = require('path');
const crypto = require('crypto');
const writeXlsxFile = require('write-excel-file/node');
const { zipSync, strToU8 } = require('fflate');
const { authoritativeDebtStatus } = require('./business-view-contract');

const EXPORT_VERSION = 'public-export-own-bonus-v1';
const MAX_EXPORT_RECORDS = 20000;
const MAX_EXPORT_BYTES = 25 * 1024 * 1024;
const DANGEROUS_CELL = /^[\t\r\n ]*[=+\-@]/;

function chinaParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return parts;
}

function chinaTimestamp(date = new Date()) {
    const p = chinaParts(date);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function chinaDateStamp(date = new Date()) {
    const p = chinaParts(date);
    return `${p.year}${p.month}${p.day}`;
}

function safeSpreadsheetText(value) {
    const text = String(value ?? '');
    return DANGEROUS_CELL.test(text) ? `'${text}` : text;
}

function csvCell(value) {
    const text = safeSpreadsheetText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return `"${text.replace(/"/g, '""')}"`;
}

function safeFilename(value, fallback = '导出') {
    const name = String(value || '').normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
    return name || fallback;
}

function isReviewRole(user) {
    return user?.role === 'admin' || user?.role === 'approver';
}

function ownedApplication(user, app) {
    return isReviewRole(user) || app?.applicant === user?.username || app?.owner === user?.username;
}

function employeeBonusExportRecord(row, username) {
    const ownBusiness = row.projectApplicant === username
        ? Number(row.businessBonus?.confirmedFinalBonus ?? row.totals?.businessBonus ?? 0) : 0;
    const ownExecution = sum((row.executionBonuses || []).filter(item => item.username === username), item => item.amount);
    // A new response projection, never a mutation of stored project totals.
    return {
        id: row.id, applicationId: row.applicationId, activityMonth: row.activityMonth,
        employee: username, status: row.status, confirmedAt: row.confirmedAt, lockedAt: row.lockedAt,
        totals: { businessBonus: ownBusiness, executionBonus: ownExecution,
            projectBonus: Math.round((ownBusiness + ownExecution) * 100) / 100 }
    };
}

function employeeSettlementExportRecord(row) {
    return {
        id: row.id, employee: row.employee, activityMonth: row.activityMonth,
        status: row.status, confirmedAt: row.confirmedAt, lockedAt: row.lockedAt,
        totals: {
            businessBonus: Number(row.totals?.businessBonus || 0),
            executionBonus: Number(row.totals?.executionBonus || 0),
            reimbursement: Number(row.totals?.reimbursement || 0),
            totalPayable: Number(row.totals?.totalPayable || 0)
        }
    };
}

function visibleState(state, user) {
    const applications = (state.applications || []).filter(app => ownedApplication(user, app));
    const appIds = new Set(applications.map(app => String(app.id || '')));
    const payments = (state.payments || []).filter(pay => isReviewRole(user) || pay.applicant === user.username || pay.owner === user.username || appIds.has(String(pay.projectId || '')));
    const paymentIds = new Set(payments.map(pay => String(pay.id || '')));
    const debts = (state.debts || []).filter(debt => isReviewRole(user) || debt.applicant === user.username || debt.owner === user.username);
    const invoices = (state.invoices || []).filter(inv => isReviewRole(user) || inv.owner === user.username || inv.createdBy === user.username || appIds.has(String(inv.appId || '')));
    const bonusConfirmations = (state.bonusConfirmations || []).filter(row => user.role === 'admin' || row.projectApplicant === user.username || (row.executionBonuses || []).some(item => item.username === user.username))
        .map(row => user.role === 'admin' ? row : employeeBonusExportRecord(row, user.username));
    const employeeSettlements = (state.employeeSettlements || []).filter(row => user.role === 'admin' || row.employee === user.username)
        .map(row => user.role === 'admin' ? row : employeeSettlementExportRecord(row));
    const projectClosureRecords = (state.projectClosureRecords || []).filter(row => appIds.has(String(row.projectId || row.applicationId || '')));
    const paymentCorrectionRecords = (state.paymentCorrectionRecords || []).filter(row => paymentIds.has(String(row.paymentId || row.payId || '')));
    return { applications, appIds, payments, paymentIds, debts, invoices, bonusConfirmations, employeeSettlements, projectClosureRecords, paymentCorrectionRecords, employeeBonusOnly: user.role === 'user' };
}

function monthOf(value) {
    const match = String(value || '').match(/^(\d{4})-(0[1-9]|1[0-2])/);
    return match ? `${match[1]}-${match[2]}` : '';
}

function matchesFilters(record, filters, statusReader = row => String(row.status || row.lifecycleStatus || ''), dateReader = row => row.startDate || row.activityMonth || row.createdAt || row.date || row.invoiceDate) {
    if (filters.status && statusReader(record) !== filters.status) return false;
    if (filters.applicant && String(record.applicant || record.owner || '') !== filters.applicant) return false;
    if (filters.clientId && String(record.clientId || '') !== filters.clientId) return false;
    if (filters.projectId) {
        const directProjectIds = [record.id, record.projectId, record.appId, record.applicationId].map(value => String(value || '')).filter(Boolean);
        const linkedProjectIds = (record.links || record.projectLinks || []).map(link => String(link.projectId || link.applicationId || '')).filter(Boolean);
        if (![...directProjectIds, ...linkedProjectIds].includes(filters.projectId)) return false;
    }
    const recordMonth = monthOf(dateReader(record));
    if (filters.startMonth && (!recordMonth || recordMonth < filters.startMonth)) return false;
    if (filters.endMonth && (!recordMonth || recordMonth > filters.endMonth)) return false;
    if (filters.query) {
        const haystack = Object.values(record).filter(value => ['string', 'number'].includes(typeof value)).join(' ').toLowerCase();
        if (!haystack.includes(filters.query.toLowerCase())) return false;
    }
    return true;
}

function filterRecords(records, options, idFields = ['id'], statusReader, dateReader) {
    let result = records.filter(row => matchesFilters(row, options.filters, statusReader, dateReader));
    if (options.filters.recordIds.length) {
        const allowed = new Set(options.filters.recordIds);
        result = result.filter(row => idFields.some(key => allowed.has(String(row[key] || ''))));
    }
    if (options.scope === 'detail') result = result.filter(row => idFields.some(key => String(row[key] || '') === options.recordId));
    if (result.length > MAX_EXPORT_RECORDS) throw Object.assign(new Error(`导出记录超过 ${MAX_EXPORT_RECORDS} 条上限，请缩小筛选范围`), { statusCode: 413 });
    return result;
}

function sum(items, getter) {
    return Math.round(items.reduce((total, item) => total + Number(getter(item) || 0), 0) * 100) / 100;
}

function sheet(name, columns, rows) {
    return { name, columns, rows };
}

function evidenceResults(record) {
    const values = [];
    const walk = value => {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') {
            if (value.result) values.push(String(value.result));
            Object.entries(value).forEach(([key, child]) => { if (key !== 'result') walk(child); });
        }
    };
    walk(record?.affected);
    return [...new Set(values)].join('；');
}

function buildProjectSheets(view, options) {
    const apps = filterRecords(view.applications, options);
    const ids = new Set(apps.map(row => String(row.id || '')));
    const pays = view.payments.filter(row => ids.has(String(row.projectId || '')));
    const closures = view.projectClosureRecords.filter(row => ids.has(String(row.projectId || row.applicationId || '')));
    return {
        sheets: [
            sheet('项目', ['项目编号', '项目名称', '活动日期', '申请人', '审批人', '状态', '合同金额', '税费', '利润', 'KPI1', 'KPI2', '上一版'], apps.map(row => [row.id, row.projectName, row.startDate, row.applicant || row.owner, row.approver, row.status, Number(row.contractAmount || 0), Number(row.taxAmount || 0), Number(row.totalProfit ?? row.profit ?? 0), Number(row.kpi1 ?? row.profitRate ?? 0), Number(row.kpi2 ?? 0), row.previousAppId || ''])),
            sheet('项目明细', ['项目编号', '来源明细ID', '单项', '内容', '供应商', '是否代付', '金额', '服务费'], apps.flatMap(app => (app.items || []).map((item, index) => [app.id, item.projectItemId || `${app.id}:${index + 1}`, item.item, item.content, item.supplier, item.isProxy, Number(item.amount || 0), Number(item.serviceFee || 0)]))),
            sheet('审批与版本', ['项目编号', '当前状态', '审批时间', '审批人', '审批意见', '付款单数'], apps.map(app => [app.id, app.status, app.approveTime || '', app.reviewedBy || app.approver || '', app.reviewNote || '', pays.filter(pay => pay.projectId === app.id).length])),
            sheet('项目关闭证据', ['关闭记录ID', '项目编号', '关闭时间', '操作人', '原因', '结果'], closures.map(row => [row.id || '', row.projectId || row.applicationId || '', row.closedAt || row.createdAt || row.time || '', row.operator || row.closedBy || '', row.reason || row.note || '', row.result || row.status || evidenceResults(row) || '项目已关闭']))
        ],
        records: apps,
        amount: sum(apps, row => row.contractAmount),
        sourceIds: apps.map(row => row.id)
    };
}

function paymentVersionRows(allPayments, selectedPayments) {
    const byId = new Map();
    const children = new Map();
    for (const payment of allPayments) {
        const id = String(payment.id || '');
        if (id && !byId.has(id)) byId.set(id, payment);
    }
    for (const payment of byId.values()) {
        const parentId = String(payment.previousPayId || '');
        if (!parentId || !byId.has(parentId)) continue;
        const rows = children.get(parentId) || [];
        rows.push(payment);
        children.set(parentId, rows);
    }
    const included = new Set();
    const queue = selectedPayments.map(row => String(row.id || '')).filter(Boolean);
    while (queue.length) {
        const id = queue.shift();
        if (!id || included.has(id) || !byId.has(id)) continue;
        included.add(id);
        const payment = byId.get(id);
        const parentId = String(payment.previousPayId || '');
        if (parentId && byId.has(parentId)) queue.push(parentId);
        for (const child of children.get(id) || []) queue.push(String(child.id || ''));
    }
    const cycleIds = new Set();
    for (const startId of included) {
        const pathIds = [];
        const position = new Map();
        let currentId = startId;
        while (currentId && included.has(currentId) && byId.has(currentId)) {
            if (position.has(currentId)) {
                pathIds.slice(position.get(currentId)).forEach(id => cycleIds.add(id));
                break;
            }
            position.set(currentId, pathIds.length);
            pathIds.push(currentId);
            currentId = String(byId.get(currentId).previousPayId || '');
        }
    }
    return [...included].map(id => {
        const payment = byId.get(id);
        const parentId = String(payment.previousPayId || '');
        const childIds = (children.get(id) || []).map(row => String(row.id || ''));
        const anomalies = [];
        if (parentId && !byId.has(parentId)) anomalies.push(`悬空父版本：${parentId}`);
        if (childIds.length > 1) anomalies.push(`分叉后续版本：${childIds.join('、')}`);
        if (cycleIds.has(id)) anomalies.push('循环引用');
        return [id, payment.projectId || '', parentId, childIds.join('；'), payment.status || '', anomalies.join('；')];
    });
}

function buildPaymentSheets(view, options) {
    const rows = filterRecords(view.payments, options);
    const applicationsById = new Map(view.applications.map(app => [String(app.id || ''), app]));
    const financialRows = rows.map(row => {
        const app = applicationsById.get(String(row.projectId || '')) || {};
        const items = Array.isArray(row.kpiItems) ? row.kpiItems : (Array.isArray(row.items) ? row.items : []);
        const contractAmount = Number(row.contractAmount ?? app.contractAmount ?? 0);
        const taxAmount = Number.isFinite(Number(row.taxAmount)) ? Number(row.taxAmount) : Number(app.taxAmount || 0);
        const itemAmount = sum(items, item => item.amount);
        const serviceFee = sum(items, item => item.serviceFee);
        const proxyCost = sum(items.filter(item => item.isProxy === '是'), item => Number(item.amount || 0) + Number(item.serviceFee || 0));
        const totalCost = Math.round((itemAmount + serviceFee + taxAmount) * 100) / 100;
        const profit = Math.round((contractAmount - totalCost) * 100) / 100;
        const kpi1 = contractAmount > 0 ? Math.round(profit / contractAmount * 10000) / 100 : 0;
        const kpi2 = contractAmount - proxyCost > 0 ? Math.round(profit / (contractAmount - proxyCost) * 10000) / 100 : 0;
        return [row.id, row.projectId, row.applicant || row.owner, row.date || row.createdAt, row.status, row.previousPayId || '', row.approveTime || '', row.reviewedBy || row.approver || '', (row.executionParticipants || []).map(item => `${item.username}:${item.contribution || ''}`).join('；'), contractAmount, itemAmount, serviceFee, taxAmount, totalCost, profit, kpi1, kpi2];
    });
    const detailRows = rows.flatMap(pay => [...(pay.items || []).map((item, index) => [pay.id, item.projectItemId || `${pay.id}:${index + 1}`, item.content, item.supplier, item.payeeAccountId || '', Number(item.amount || 0), Number(item.serviceFee || 0), item.debtId || '']), ...(pay.debtRepayments || []).map((item, index) => [pay.id, item.projectItemId || `${pay.id}:DEBT:${index + 1}`, '归还欠款', item.supplier || '', item.payeeAccountId || '', Number(item.confirmedPrincipal ?? item.principal ?? 0), Number(item.serviceFee || 0), item.debtId || ''])]);
    const versionRows = paymentVersionRows(view.payments, rows);
    const chainIds = new Set(versionRows.map(row => String(row[0] || '')));
    const corrections = view.paymentCorrectionRecords.filter(row => chainIds.has(String(row.paymentId || row.payId || '')));
    return {
        sheets: [
            sheet('付款', ['付款编号', '项目编号', '申请人', '日期', '状态', '上一版', '审批时间', '审批人', '项目执行人员', '合同金额', '明细金额', '服务费', '合同税费', '总成本', '利润', 'KPI1(%)', 'KPI2(%)'], financialRows),
            sheet('付款明细', ['付款编号', '来源明细ID', '内容', '供应商', '收款对象ID', '金额', '服务费', '欠款编号'], detailRows),
            sheet('付款版本链', ['付款编号', '项目编号', '上一版', '后续版本', '状态', '异常标记'], versionRows),
            sheet('付款更正证据', ['更正记录ID', '付款编号', '项目编号', '更正时间', '操作人', '原因', '结果', '原付款状态', '原确认欠款本金', '受影响发票'], corrections.map(row => [row.id || '', row.paymentId || row.payId || '', row.projectId || row.applicationId || '', row.correctedAt || row.createdAt || row.time || '', row.operator || row.correctedBy || '', row.reason || row.note || '', row.result || row.status || '已更正并关闭', row.originalPaymentStatus || '', Number(row.originalConfirmedDebtPrincipal || 0), (row.affectedInvoices || []).map(item => `${item.id || ''}/${item.invoiceNo || ''}/${item.originalStatus || ''}/${Number(item.originalAmount || 0)}`).join('；')]))
        ],
        records: rows,
        amount: sum(detailRows, row => Number(row[5] || 0) + Number(row[6] || 0)),
        sourceIds: rows.map(row => row.id)
    };
}

function buildDebtSheets(view, options) {
    const rows = filterRecords(view.debts, options, ['id'], authoritativeDebtStatus);
    const historicalRows = rows.flatMap(row => (row.historicalLinks || []).flatMap(item => {
        const payments = Array.isArray(item.paymentDetails) ? item.paymentDetails : [];
        if (!payments.length) return [[row.id, item.projectId || item.applicationId || '', item.paymentId || '', Number(item.principal || item.includedPrincipal || 0), Number(item.confirmedPrincipal || item.receivedPrincipal || 0), Number(item.allocatedCost || 0), item.status || item.projectStatus || '']];
        return payments.map(payment => [row.id, item.projectId || item.applicationId || '', payment.paymentId || '', Number(item.principal || item.includedPrincipal || 0), Number(payment.principal ?? payment.confirmedPrincipal ?? payment.receivedPrincipal ?? 0), Number(payment.allocatedCost || 0), payment.status || item.status || item.projectStatus || '']);
    }));
    return {
        sheets: [
            sheet('欠款', ['欠款编号', '申请人', '审批人', '甲方', '事项', '本金', '供应商实际成本', '利润', '已计入项目', '已确认归还', '余额', '状态', '创建时间'], rows.map(row => [row.id, row.applicant || row.owner, row.approver, row.partyA || row.clientNameSnapshot, row.title || row.businessDescription, Number(row.principal || 0), Number(row.totalActualCost || 0), Number(row.profit || 0), Number(row.includedPrincipal || 0), Number(row.receivedPrincipal || 0), Number(row.outstandingPrincipal ?? (Number(row.principal || 0) - Number(row.receivedPrincipal || 0))), row.lifecycleStatus || row.status, row.createdAt || row.date])),
            sheet('关联与归还', ['欠款编号', '项目编号', '付款编号', '计入本金', '确认归还', '分摊成本', '状态'], rows.flatMap(row => (row.links || row.projectLinks || row.repayments || []).map(item => [row.id, item.projectId || item.applicationId || '', item.paymentId || '', Number(item.principal || item.includedPrincipal || 0), Number(item.confirmedPrincipal || item.receivedPrincipal || 0), Number(item.allocatedCost || 0), item.status || '']))),
            sheet('历史关联证据', ['欠款编号', '项目编号', '付款编号', '历史计入本金', '历史确认归还', '历史分摊成本', '历史状态'], historicalRows)
        ],
        records: rows,
        amount: sum(rows, row => row.principal),
        sourceIds: rows.map(row => row.id)
    };
}

function invoiceExpiryStatus(row, now = new Date()) {
    if (row?.isExpired === true || row?.status === '已过期' || row?.timeStatus === '已过期') return '已过期';
    if (row?.timeStatus) return row.timeStatus;
    let expireAt = row?.poolExpireAt || row?.availableUntil || '';
    if (!expireAt) {
        const startAt = row?.poolStartAt || row?.uploadedAt || row?.createdAt || row?.updatedAt || '';
        const parsedStart = startAt ? new Date(startAt) : null;
        if (parsedStart && !Number.isNaN(parsedStart.getTime())) {
            const calculated = new Date(parsedStart.getTime());
            calculated.setMonth(calculated.getMonth() + 1);
            expireAt = calculated;
        }
    }
    const parsedExpire = expireAt instanceof Date ? expireAt : (expireAt ? new Date(expireAt) : null);
    if (!parsedExpire || Number.isNaN(parsedExpire.getTime())) return '有效期未记录';
    return now.getTime() > parsedExpire.getTime() ? '已过期' : '共享期内';
}

function invoiceAvailableBalance(row) {
    if (row?.remainingAmount !== undefined && row?.remainingAmount !== null) return Number(row.remainingAmount || 0);
    const total = Number(row?.invoiceTotalAmount ?? row?.amount ?? 0);
    const allocated = Number(row?.allocatedAmount ?? row?.amount ?? 0);
    return Math.max(0, Math.round((total - allocated) * 100) / 100);
}

function buildInvoiceSheets(view, options, user) {
    const rows = filterRecords(view.invoices, options, ['id', 'sourceInvoiceId'], undefined, row => row.invoiceDate);
    if (options.view === 'pool') {
        if (user?.role !== 'admin') {
            return {
                sheets: [sheet('多余发票池', ['供应商全称', '发票号码', '发票日期', '当前可用余额', '有效期状态'], rows.map(row => [row.supplierName || row.sellerName || row.owner || '', row.invoiceNo || '', row.invoiceDate || '', invoiceAvailableBalance(row), invoiceExpiryStatus(row)]))],
                records: rows,
                amount: sum(rows, invoiceAvailableBalance),
                sourceIds: []
            };
        }
        return {
            sheets: [sheet('多余发票池', ['来源发票ID', '发票号码', '发票日期', '归属类型', '归属名称', '来源员工', '来源项目', '原票金额', '已占用', '可用余额', '有效期状态'], rows.map(row => [row.sourceInvoiceId || '', row.invoiceNo || '', row.invoiceDate || '', row.ownerType || '', row.owner || row.supplierName || row.sellerName || '', row.sourceOwner || '', row.sourceAppId || '', Number(row.invoiceTotalAmount || 0), Number(row.usedAmount || 0), invoiceAvailableBalance(row), invoiceExpiryStatus(row)]))],
            records: rows,
            amount: sum(rows, invoiceAvailableBalance),
            sourceIds: rows.map(row => row.sourceInvoiceId).filter(Boolean)
        };
    }
    if (user?.role !== 'admin') {
        return {
            sheets: [sheet('发票', ['供应商全称', '发票号码', '发票日期', '当前可用余额', '有效期状态'], rows.map(row => [row.sellerName || row.poolOwner || '', row.invoiceNo || '', row.invoiceDate || '', invoiceAvailableBalance(row), invoiceExpiryStatus(row)]))],
            records: rows,
            amount: sum(rows, invoiceAvailableBalance),
            sourceIds: []
        };
    }
    return {
        sheets: [
            sheet('发票', ['发票记录ID', '发票号码', '开票日期', '销售方', '购买方', '发票金额', '分配金额', '剩余金额', '项目编号', '付款编号', '状态', '所有人'], rows.map(row => [row.id, row.invoiceNo, row.invoiceDate, row.sellerName, row.buyerName, Number(row.invoiceTotalAmount ?? row.amount ?? 0), Number(row.allocatedAmount ?? row.amount ?? 0), Number(row.remainingAmount ?? 0), row.appId || row.projectId || '', row.paymentId || '', row.status, row.owner || row.createdBy || ''])),
            sheet('分配与附件', ['发票记录ID', '来源明细ID', '分配金额', '附件名', '附件路径标识'], rows.flatMap(row => {
                const allocations = (row.detailAllocations || []).length ? row.detailAllocations : [{ key: row.expectedKey || '', amount: row.allocatedAmount ?? row.amount ?? 0 }];
                return allocations.map(item => [row.id, item.key || item.sourceId || '', Number(item.amount || 0), row.attachment?.originalName || row.attachment?.filename || '', row.attachment?.path ? path.basename(row.attachment.path) : '']);
            }))
        ],
        records: rows,
        amount: sum(rows, row => row.invoiceTotalAmount ?? row.amount),
        sourceIds: rows.map(row => row.id)
    };
}

function buildAdminSheets(state, options) {
    const users = filterRecords((state.users || []).filter(row => !row.deletedAt && row.accountStatus !== 'deleted'), options, ['username']);
    const suppliers = filterRecords(state.suppliers || [], options);
    const audits = filterRecords(state.accountLifecycleAuditRecords || [], options, ['target']);
    const exportAudits = filterRecords(state.exportAuditRecords || [], options, ['id', 'operator']);
    return {
        sheets: [
            sheet('用户目录', ['用户名', '角色', '账号状态', '创建时间', '生命周期版本'], users.map(row => [row.username, row.role, row.accountStatus || (row.disabledAt ? 'disabled' : 'active'), row.created || '', Number(row.lifecycleVersion || 0)])),
            sheet('收款对象', ['对象ID', '名称', '类型', '关联员工', '银行账号维护状态', '税号', '状态'], suppliers.map(row => [row.id, row.name, row.payeeAccountType || 'formal-supplier', row.linkedEmployeeUsername || '', String(row.bankAccount || '').trim() ? '已维护' : '未维护（当前仅用于统计）', row.taxNumber || '', row.enabled === false ? '停用' : '有效'])),
            sheet('账号生命周期审计', ['时间', '目标账号', '当时角色', '动作', '操作人', '原因'], audits.map(row => [row.time, row.target, row.targetRole, row.action, row.operator, row.reason])),
            sheet('导出审计', ['审计ID', '生成时间', '操作人', '角色', '模块', '格式', '范围', '记录数', '文件大小', '文件SHA-256'], exportAudits.map(row => [row.id, row.createdAt, row.operator, row.role, row.module, row.format, row.scope, Number(row.recordCount || 0), Number(row.bytes || 0), row.sha256 || '']))
        ],
        records: [...users, ...suppliers, ...audits, ...exportAudits],
        amount: 0,
        sourceIds: [...users.map(row => row.username), ...suppliers.map(row => row.id), ...audits.map(row => row.target), ...exportAudits.map(row => row.id)].filter(Boolean)
    };
}

function buildDataSheets(view, options) {
    if (view.dataReport && Array.isArray(view.dataReport.monthly)) {
        const report = view.dataReport;
        const summaryRows = report.monthly.map(row => [row.month, row.count, row.revenue, row.cost, row.profit, row.profitRate]);
        const applicantRows = Object.entries(report.byApplicant || {}).map(([name, row]) => [name, row.count, row.revenue, row.amount, row.serviceFee, row.tax, row.cost, row.profit, row.kpi1, row.kpi2, row.proxyRatio]);
        const supplierRows = Object.entries(report.bySupplier || {}).map(([name, row]) => [name, row.count, row.total]);
        return {
            sheets: [
                sheet('期间总览', ['月份', '项目数', '营业额', '成本', '净利润', '利润率'], summaryRows),
                sheet('申请人统计', ['申请人', '项目数', '营业额', '明细金额', '服务费', '税费', '成本', '利润', 'KPI1', 'KPI2', '代付比例'], applicantRows),
                sheet('供应商统计', ['供应商', '涉及付款单数', '付款金额'], supplierRows),
                sheet('来源项目', ['项目编号'], (report.sourceIds || []).map(id => [id]))
            ],
            records: report.sourceIds || [], amount: Number(report.totalRevenue || 0), sourceIds: report.sourceIds || []
        };
    }
    const apps = filterRecords(view.applications.filter(row => row.status === 'approved'), options);
    const ids = new Set(apps.map(row => row.id));
    const pays = view.payments.filter(row => ids.has(row.projectId) && row.status === 'approved');
    const byMonth = new Map();
    apps.forEach(app => { const month = monthOf(app.startDate) || '未记录'; const entry = byMonth.get(month) || { month, projects: 0, revenue: 0, cost: 0 }; entry.projects += 1; entry.revenue += Number(app.contractAmount || 0); entry.cost += sum((pays.filter(pay => pay.projectId === app.id).at(-1)?.items || app.items || []), item => Number(item.amount || 0) + Number(item.serviceFee || 0)); byMonth.set(month, entry); });
    const summary = [...byMonth.values()].map(row => ({ ...row, profit: Math.round((row.revenue - row.cost) * 100) / 100 }));
    return { sheets: [sheet('期间总览', ['月份', '项目数', '营业额', '成本', '净利润'], summary.map(row => [row.month, row.projects, row.revenue, row.cost, row.profit])), ...buildProjectSheets({ ...view, applications: apps }, options).sheets.slice(0, 2)], records: apps, amount: sum(apps, row => row.contractAmount), sourceIds: apps.map(row => row.id) };
}

function buildBonusSheets(view, options) {
    const confirmations = filterRecords(view.bonusConfirmations, options, ['id', 'applicationId']);
    const settlements = filterRecords(view.employeeSettlements, options);
    const ownOnly = view.employeeBonusOnly === true;
    const columns = ['确认ID', '项目ID', '归属月份', ownOnly ? '员工' : '项目申请人',
        '业务奖金', ownOnly ? '执行费用' : '执行奖金', ownOnly ? '本人合计' : '合计', '状态', '锁定时间'];
    return {
        sheets: [
            sheet('项目奖金', columns, confirmations.map(row => [
                row.id, row.applicationId, row.activityMonth, ownOnly ? row.employee : row.projectApplicant,
                Number(row.totals?.businessBonus ?? row.businessBonus?.confirmedFinalBonus ?? 0),
                Number(row.totals?.executionBonus || 0), Number(row.totals?.projectBonus ?? row.totals?.total ?? 0),
                row.status, row.confirmedAt || row.lockedAt || ''
            ])),
            sheet('员工月结', ['结算ID', '员工', '归属月份', '业务奖金', ownOnly ? '执行费用' : '执行奖金',
                '报销', '应发合计', '状态', '锁定时间'], settlements.map(row => [
                row.id, row.employee, row.activityMonth, Number(row.totals?.businessBonus || 0),
                Number(row.totals?.executionBonus || 0), Number(row.totals?.reimbursement || 0),
                Number(row.totals?.totalPayable || 0), row.status, row.confirmedAt || row.lockedAt || ''
            ]))
        ],
        records: [...confirmations, ...settlements],
        amount: sum(confirmations, row => row.totals?.projectBonus ?? row.totals?.total),
        settlementAmount: sum(settlements, row => row.totals?.totalPayable),
        sourceIds: [...confirmations.map(row => row.id), ...settlements.map(row => row.id)]
    };
}

function buildMailSheets(state, options) {
    const rows = filterRecords(state.mailSendRecords || [], options);
    return { sheets: [sheet('邮件记录', ['记录ID', '类型', '业务记录', '收件对象', '时间', '投递结果', '失败原因', 'Dry-run'], rows.map(row => [row.id, row.type, row.businessId || row.recordId || '', Array.isArray(row.recipients) ? row.recipients.join('；') : row.recipient || row.to || '', row.createdAt || row.time || row.sentAt || '', row.status || row.result || '', row.error || row.failureReason || '', row.dryRun === true ? '是' : '否']))], records: rows, amount: 0, sourceIds: rows.map(row => row.id).filter(Boolean) };
}

function buildOpsSheets(state, options) {
    const rows = filterRecords(options.opsRecords || [], options, ['fileName', 'id']);
    return { sheets: [sheet('备份与恢复', ['类型', '名称', '创建时间', 'SHA-256', '大小', '验证状态', '版本'], rows.map(row => [row.type || 'structured-data', row.fileName || row.id || '', row.createdAt || row.time || '', row.sha256 || '', Number(row.bytes || row.size || 0), row.verificationStatus || row.status || '', row.version || '']))], records: rows, amount: 0, sourceIds: rows.map(row => row.fileName || row.id).filter(Boolean) };
}

const BUILDERS = { project: buildProjectSheets, payment: buildPaymentSheets, debt: buildDebtSheets, data: buildDataSheets, bonus: buildBonusSheets };

function normalizeOptions(raw) {
    const module = String(raw.module || '').toLowerCase();
    const format = String(raw.format || 'xlsx').toLowerCase();
    const scope = String(raw.scope || 'current').toLowerCase();
    if (!['project', 'payment', 'debt', 'invoice', 'admin', 'data', 'bonus', 'mail', 'ops'].includes(module)) throw Object.assign(new Error('导出模块无效'), { statusCode: 400 });
    if (!['xlsx', 'csv', 'zip', 'json'].includes(format)) throw Object.assign(new Error('导出格式无效'), { statusCode: 400 });
    if (!['current', 'detail', 'all', 'attachments'].includes(scope)) throw Object.assign(new Error('导出范围无效'), { statusCode: 400 });
    if (scope === 'detail' && !raw.recordId) throw Object.assign(new Error('详情导出必须指定来源记录'), { statusCode: 400 });
    const validMonth = value => !value || /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
    if (!validMonth(raw.startMonth) || !validMonth(raw.endMonth) || (raw.startMonth && raw.endMonth && raw.startMonth > raw.endMonth)) throw Object.assign(new Error('导出月份范围无效'), { statusCode: 400 });
    const recordIds = String(raw.recordIds || '').split(',').map(value => value.trim()).filter(Boolean);
    if (recordIds.length > MAX_EXPORT_RECORDS) throw Object.assign(new Error('当前筛选记录编号超过上限'), { statusCode: 413 });
    return { module, format, scope, recordId: String(raw.recordId || ''), filters: { status: String(raw.status || ''), startMonth: String(raw.startMonth || ''), endMonth: String(raw.endMonth || ''), query: String(raw.query || '').trim(), applicant: String(raw.applicant || ''), clientId: String(raw.clientId || ''), projectId: String(raw.projectId || ''), recordIds }, opsRecords: raw.opsRecords || [] };
}

function authorize(user, options) {
    if (!user) throw Object.assign(new Error('未登录'), { statusCode: 401 });
    if (typeof user.username !== 'string' || !user.username.trim() || !['admin', 'approver', 'user'].includes(user.role)) throw Object.assign(new Error('账号身份无效'), { statusCode: 403 });
    if (options.module === 'bonus' && user.role !== 'admin' && (options.format === 'zip' || options.scope === 'attachments')) throw Object.assign(new Error('员工奖金导出仅含本人金额，不包含附件'), { statusCode: 403 });
    if (user.role === 'user' && options.scope === 'all') throw Object.assign(new Error('员工不能导出授权全量'), { statusCode: 403 });
    if (['admin', 'data', 'mail', 'ops'].includes(options.module) && user.role !== 'admin') throw Object.assign(new Error('当前角色无权导出该模块'), { statusCode: 403 });
    if (options.module === 'bonus' && !['admin', 'user'].includes(user.role)) throw Object.assign(new Error('当前角色无权导出该模块'), { statusCode: 403 });
    if (options.module === 'invoice' && options.format === 'zip' && user.role !== 'admin') throw Object.assign(new Error('仅系统管理员可导出发票附件'), { statusCode: 403 });
    if (options.format === 'zip' && options.scope !== 'attachments' && options.module !== 'ops') throw Object.assign(new Error('ZIP仅用于附件包或运维清单'), { statusCode: 400 });
}

function buildDataset(state, user, rawOptions) {
    const options = normalizeOptions(rawOptions);
    authorize(user, options);
    const view = { ...visibleState(state, user), dataReport: state.__exportDataReport || null };
    let result;
    if (options.module === 'admin') result = buildAdminSheets(state, options);
    else if (options.module === 'mail') result = buildMailSheets(state, options);
    else if (options.module === 'ops') result = buildOpsSheets(state, options);
    else if (options.module === 'invoice') result = buildInvoiceSheets(view, options, user);
    else result = BUILDERS[options.module](view, options);
    if (options.scope === 'detail' && result.records.length === 0) throw Object.assign(new Error('记录不存在或当前角色无权导出'), { statusCode: 403 });
    const restrictedInvoiceExport = options.module === 'invoice' && user.role !== 'admin';
    const expandedRows = result.sheets.reduce((count, item) => count + item.rows.length, 0)
        + (restrictedInvoiceExport ? 0 : attachmentObjects({ records: result.records }).length);
    if (expandedRows > MAX_EXPORT_RECORDS) throw Object.assign(new Error(`导出展开行与附件超过 ${MAX_EXPORT_RECORDS} 条上限，请缩小筛选范围`), { statusCode: 413 });
    const generatedAt = chinaTimestamp();
    const metadata = restrictedInvoiceExport
        ? {
            '导出类型': `${options.module}/${options.format}/${options.scope}`,
            '生成时间': generatedAt,
            '时区': 'Asia/Shanghai',
            '口径版本': EXPORT_VERSION,
            '记录数': result.records.length,
            '金额汇总': result.amount
        }
        : {
            '导出类型': `${options.module}/${options.format}/${options.scope}`,
            '筛选条件': JSON.stringify(options.filters),
            '生成时间': generatedAt,
            '时区': 'Asia/Shanghai',
            '操作者': user.username,
            '角色': user.role,
            '口径版本': EXPORT_VERSION,
            '记录数': result.records.length,
            '展开行与附件数': expandedRows,
            '金额汇总': result.amount,
            '来源ID': result.sourceIds.join('；')
        };
    if (options.module === 'bonus' && user.role === 'user') metadata['月结应发合计'] = result.settlementAmount;
    return { ...result, metadata, options };
}

function xlsxCell(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return { value, type: Number, format: '#,##0.00' };
    if (typeof value === 'boolean') return value;
    return safeSpreadsheetText(value);
}

async function toXlsx(dataset) {
    const metadataRows = [['字段', '值'], ...Object.entries(dataset.metadata)];
    const sheets = [
        { sheet: '导出说明', data: metadataRows.map(row => row.map(xlsxCell)), columns: [{ width: 24 }, { width: 80 }] },
        ...dataset.sheets.map(item => ({ sheet: item.name.slice(0, 31), data: [item.columns, ...item.rows].map(row => row.map(xlsxCell)), columns: item.columns.map(() => ({ width: 22 })) }))
    ];
    const buffer = await writeXlsxFile(sheets, { fontFamily: 'Microsoft YaHei', fontSize: 10 }).toBuffer();
    if (buffer.length > MAX_EXPORT_BYTES) throw Object.assign(new Error('导出文件超过大小上限，请缩小筛选范围'), { statusCode: 413 });
    return buffer;
}

function toCsv(dataset) {
    const sections = dataset.sheets.length ? dataset.sheets : [sheet('数据', [], [])];
    const rows = [['# 导出元数据', ''], ...Object.entries(dataset.metadata)];
    for (const section of sections) rows.push([], [`# 数据表：${section.name}`], section.columns, ...section.rows);
    const buffer = Buffer.from('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'utf8');
    if (buffer.length > MAX_EXPORT_BYTES) throw Object.assign(new Error('导出文件超过大小上限'), { statusCode: 413 });
    return buffer;
}

function attachmentObjects(dataset) {
    const files = [];
    for (const record of dataset.records) {
        for (const item of [record.attachment, ...(record.attachments || [])].filter(Boolean)) {
            files.push({ sourceId: record.id || record.username || '', attachment: item });
        }
    }
    return files;
}

async function toZip(dataset, resolveAttachment) {
    const entries = {};
    const manifest = [];
    const usedNames = new Set();
    let attachmentBytes = 0;
    for (const row of attachmentObjects(dataset)) {
        const resolved = await resolveAttachment(row.attachment, { maxBytes: MAX_EXPORT_BYTES - attachmentBytes });
        if (!resolved || !Buffer.isBuffer(resolved.buffer)) throw Object.assign(new Error(`授权附件缺失或不可读取：${row.sourceId || '未知来源'}`), { statusCode: 409 });
        if (resolved.buffer.length > MAX_EXPORT_BYTES) throw Object.assign(new Error('附件未压缩大小超过上限，请缩小范围'), { statusCode: 413 });
        let name = safeFilename(row.attachment.originalName || row.attachment.filename || path.basename(resolved.path), '附件');
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        let candidate = `${safeFilename(row.sourceId, '来源')}/${name}`;
        let suffix = 2;
        while (usedNames.has(candidate)) candidate = `${safeFilename(row.sourceId, '来源')}/${base}-${suffix++}${ext}`;
        usedNames.add(candidate);
        entries[candidate] = new Uint8Array(resolved.buffer);
        attachmentBytes += resolved.buffer.length;
        manifest.push({ sourceId: row.sourceId, fileName: candidate, bytes: resolved.buffer.length, sha256: resolved.sha256 });
        if (attachmentBytes > MAX_EXPORT_BYTES) throw Object.assign(new Error('附件包未压缩总大小超过上限，请缩小范围'), { statusCode: 413 });
    }
    const manifestBytes = strToU8(JSON.stringify({ metadata: dataset.metadata, files: manifest }, null, 2));
    const uncompressedBytes = attachmentBytes + manifestBytes.byteLength;
    if (uncompressedBytes > MAX_EXPORT_BYTES) throw Object.assign(new Error('附件包未压缩总大小超过上限，请缩小范围'), { statusCode: 413 });
    entries['manifest.json'] = manifestBytes;
    const zipped = Buffer.from(zipSync(entries, { level: 6 }));
    if (zipped.length > MAX_EXPORT_BYTES) throw Object.assign(new Error('附件包超过大小上限，请缩小范围'), { statusCode: 413 });
    return zipped;
}

async function generateExport(state, user, rawOptions, helpers = {}) {
    const dataset = buildDataset(state, user, rawOptions);
    let buffer;
    let mime;
    let extension = dataset.options.format;
    if (dataset.options.format === 'xlsx') {
        buffer = await toXlsx(dataset);
        mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (dataset.options.format === 'csv') {
        buffer = toCsv(dataset);
        mime = 'text/csv; charset=utf-8';
    } else if (dataset.options.format === 'zip') {
        buffer = await toZip(dataset, helpers.resolveAttachment || (() => null));
        mime = 'application/zip';
    } else {
        buffer = Buffer.from(JSON.stringify({ metadata: dataset.metadata, sheets: dataset.sheets }, null, 2), 'utf8');
        if (buffer.length > MAX_EXPORT_BYTES) throw Object.assign(new Error('JSON导出超过大小上限，请缩小筛选范围'), { statusCode: 413 });
        mime = 'application/json; charset=utf-8';
        extension = 'json';
    }
    return {
        buffer, mime,
        filename: `${safeFilename(dataset.options.module)}-${chinaDateStamp()}.${extension}`,
        audit: {
            id: `EXPORT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            createdAt: dataset.metadata['生成时间'],
            time: dataset.metadata['生成时间'],
            operator: user.username,
            role: user.role,
            module: dataset.options.module,
            format: dataset.options.format,
            type: dataset.metadata['导出类型'],
            scope: dataset.options.scope,
            recordCount: dataset.records.length,
            bytes: buffer.length,
            sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
            result: 'file-generated-ready-for-response'
        },
        metadata: dataset.metadata
    };
}

module.exports = { EXPORT_VERSION, MAX_EXPORT_BYTES, buildDataset, generateExport, safeSpreadsheetText, chinaTimestamp };
