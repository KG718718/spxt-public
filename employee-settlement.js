const {
    latestApprovedPayment,
    parseYearMonth,
    roundMoney,
    toNumber
} = require('./bonus-preview');

const EMPLOYEE_SETTLEMENT_RULE_VERSION = 'employee-settlement-public-v1';

function accountKey(value) {
    return String(value || '').trim().toLowerCase();
}

function employeeAccounts(users = []) {
    const accounts = new Map();
    (users || [])
        .filter(user => user?.role === 'user'
            && !user?.deletedAt
            && user?.accountStatus !== 'deleted')
        .forEach(user => {
            const username = String(user?.username || '').trim();
            const key = accountKey(username);
            if (key) accounts.set(key, username);
        });
    return accounts;
}

function businessSourceKey(confirmationId) {
    return `business:${String(confirmationId || '').trim()}`;
}

function executionSourceKey(confirmationId, username) {
    return `execution:${String(confirmationId || '').trim()}:${accountKey(username)}`;
}

function reimbursementSourceKey(paymentId, itemIndex) {
    return `${String(paymentId || '').trim()}:${Number.parseInt(itemIndex, 10)}`;
}

function confirmedBusinessBonusAmount(record) {
    const confirmedValue = record?.businessBonus?.confirmedFinalBonus;
    if (confirmedValue !== undefined && confirmedValue !== null && String(confirmedValue).trim() !== '') {
        return roundMoney(confirmedValue);
    }
    return roundMoney(record?.totals?.businessBonus);
}

function isYearMonth(value) {
    return /^20\d{2}-(0[1-9]|1[0-2])$/.test(String(value || '').trim());
}

function reimbursementEmployee(item, accounts) {
    const payeeAccountType = String(item?.payeeAccountType || '').trim();
    const linkedEmployeeUsername = String(item?.linkedEmployeeUsername || '').trim();
    const hasStructuredIdentity = Boolean(
        payeeAccountType
        || linkedEmployeeUsername
        || String(item?.payeeAccountId || '').trim()
    );
    if (hasStructuredIdentity) {
        if (payeeAccountType !== 'employee-payee') return '';
        return accounts.get(accountKey(linkedEmployeeUsername)) || '';
    }
    return accounts.get(accountKey(item?.supplier)) || '';
}

function claimedSettlementSources(records = []) {
    const claimed = new Set();
    (records || [])
        .filter(record => record?.status === 'locked' && record?.projectClosure?.result !== 'invalidated')
        .forEach(record => {
            (record.businessBonusSnapshots || []).forEach(item => claimed.add(item.sourceKey || businessSourceKey(item.confirmationId)));
            (record.executionBonusSnapshots || []).forEach(item => claimed.add(item.sourceKey || executionSourceKey(item.confirmationId, item.username)));
            (record.reimbursementSnapshots || []).forEach(item => claimed.add(item.sourceKey || reimbursementSourceKey(item.paymentId, item.itemIndex)));
        });
    return claimed;
}

function emptyEmployeeRow(username) {
    return {
        username,
        businessBonus: 0,
        executionBonus: 0,
        reimbursement: 0,
        confirmedReimbursement: 0,
        totalPayable: 0,
        lockedTotalPayable: 0,
        businessBonusCount: 0,
        executionBonusCount: 0,
        reimbursementCount: 0,
        settlementCount: 0,
        riskCount: 0
    };
}

function settlementRiskMessages(record, applications = [], payments = []) {
    const messages = [];
    (record?.reimbursementSnapshots || []).forEach(snapshot => {
        const payment = (payments || []).find(item => item?.id === snapshot?.paymentId);
        const application = (applications || []).find(item => item?.id === snapshot?.projectId);
        const latest = application ? latestApprovedPayment(application.id, payments) : null;
        if (!payment) messages.push(`${snapshot.sourceKey} 来源付款不存在`);
        else if (payment.status !== 'approved') messages.push(`${snapshot.sourceKey} 来源付款已${payment.status === 'closed' ? '关闭' : '失效'}`);
        else if (!application || application.status !== 'approved') messages.push(`${snapshot.sourceKey} 来源项目已失效`);
        else if (!latest || latest.id !== payment.id) messages.push(`${snapshot.sourceKey} 已不是当前有效付款版本`);
    });
    return [...new Set(messages)];
}

function buildEmployeeSettlementPreview({
    applications = [],
    payments = [],
    bonusConfirmations = [],
    employeeSettlements = [],
    users = [],
    year,
    month,
    username = ''
}) {
    const selectedYear = Number.parseInt(year, 10);
    const selectedMonth = Number.parseInt(month, 10);
    const activityMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const selectedEmployeeKey = accountKey(username);
    const accounts = employeeAccounts(users);
    const employeeOptions = [...accounts.values()].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const employeeRowsByKey = new Map();
    const claimedSources = claimedSettlementSources(employeeSettlements);

    const ensureEmployee = value => {
        const key = accountKey(value);
        if (!key || !accounts.has(key)) return null;
        const canonical = accounts.get(key);
        if (!employeeRowsByKey.has(key)) employeeRowsByKey.set(key, emptyEmployeeRow(canonical));
        return employeeRowsByKey.get(key);
    };

    const businessBonusSources = [];
    const executionBonusSources = [];
    const reimbursementSources = [];

    const applicationsById = new Map((applications || []).map(application => [String(application?.id || ''), application]));
    (bonusConfirmations || [])
        .filter(record => {
            if (record?.status !== 'locked' || record?.projectClosure?.result === 'invalidated') return false;
            const application = applicationsById.get(String(record?.applicationId || ''));
            return application?.status === 'approved' && parseYearMonth(application?.startDate) === activityMonth;
        })
        .forEach(record => {
            const businessEmployee = ensureEmployee(record.projectApplicant);
            const businessAmount = confirmedBusinessBonusAmount(record);
            if (businessEmployee) {
                const sourceKey = businessSourceKey(record.id);
                businessEmployee.businessBonus = roundMoney(businessEmployee.businessBonus + businessAmount);
                businessEmployee.businessBonusCount += 1;
                businessBonusSources.push({
                    sourceKey,
                    available: !claimedSources.has(sourceKey),
                    username: businessEmployee.username,
                    confirmationId: record.id || '',
                    applicationId: record.applicationId || '',
                    projectName: record.projectName || '',
                    paymentId: record.paymentId || '',
                    amount: businessAmount,
                    confirmedAt: record.confirmedAt || ''
                });
            }

            (record.executionBonuses || []).forEach(item => {
                const executionEmployee = ensureEmployee(item?.username);
                if (!executionEmployee) return;
                const sourceKey = executionSourceKey(record.id, executionEmployee.username);
                const amount = roundMoney(item?.amount);
                executionEmployee.executionBonus = roundMoney(executionEmployee.executionBonus + amount);
                executionEmployee.executionBonusCount += 1;
                executionBonusSources.push({
                    sourceKey,
                    available: !claimedSources.has(sourceKey),
                    username: executionEmployee.username,
                    confirmationId: record.id || '',
                    applicationId: record.applicationId || '',
                    projectName: record.projectName || '',
                    paymentId: record.paymentId || '',
                    contribution: String(item?.contribution || '').trim(),
                    amount,
                    confirmedAt: record.confirmedAt || ''
                });
            });
        });

    (applications || []).forEach(application => {
        if (application?.status !== 'approved') return;
        const payment = latestApprovedPayment(application.id, payments);
        if (!payment) return;
        const sourceActivityMonth = parseYearMonth(application?.startDate);
        if (sourceActivityMonth !== activityMonth) return;

        (payment?.items || []).forEach((item, itemIndex) => {
            const employeeName = reimbursementEmployee(item, accounts);
            if (!employeeName) return;
            const amount = roundMoney(toNumber(item?.amount));
            if (amount <= 0) return;
            const sourceKey = reimbursementSourceKey(payment.id, itemIndex);
            const employee = ensureEmployee(employeeName);
            const available = !claimedSources.has(sourceKey);
            if (available) {
                employee.reimbursement = roundMoney(employee.reimbursement + amount);
                employee.reimbursementCount += 1;
            }
            reimbursementSources.push({
                username: employee.username,
                paymentId: payment.id || '',
                itemIndex,
                sourceKey,
                available,
                applicationId: application.id || '',
                projectName: application.projectName || '',
                activityMonth: sourceActivityMonth,
                item: String(item?.item || '').trim(),
                content: String(item?.content || '').trim(),
                supplier: String(item?.supplier || '').trim(),
                amount
            });
        });
    });

    const settlementRows = (employeeSettlements || [])
        .filter(record => record?.status === 'locked' && record?.activityMonth === activityMonth)
        .map(record => {
            const risks = settlementRiskMessages(record, applications, payments);
            const employee = ensureEmployee(record.employee);
            if (employee) {
                employee.confirmedReimbursement = roundMoney(employee.confirmedReimbursement + toNumber(record?.totals?.reimbursement));
                employee.lockedTotalPayable = roundMoney(employee.lockedTotalPayable + toNumber(record?.totals?.totalPayable));
                employee.settlementCount += 1;
                employee.riskCount += risks.length;
            }
            return { ...record, risks, riskCount: risks.length };
        });

    if (selectedEmployeeKey && !employeeRowsByKey.has(selectedEmployeeKey)) {
        const selectedName = accounts.get(selectedEmployeeKey);
        if (selectedName) employeeRowsByKey.set(selectedEmployeeKey, emptyEmployeeRow(selectedName));
    }

    const employeeRows = [...employeeRowsByKey.entries()]
        .filter(([key]) => !selectedEmployeeKey || key === selectedEmployeeKey)
        .map(([, row]) => ({
            ...row,
            totalPayable: row.lockedTotalPayable
        }))
        .sort((a, b) => a.username.localeCompare(b.username, 'zh-CN'));

    const sourceMatches = row => !selectedEmployeeKey || accountKey(row.username) === selectedEmployeeKey;
    const totals = employeeRows.reduce((result, row) => {
        result.businessBonus = roundMoney(result.businessBonus + row.businessBonus);
        result.executionBonus = roundMoney(result.executionBonus + row.executionBonus);
        result.reimbursement = roundMoney(result.reimbursement + row.reimbursement);
        result.confirmedReimbursement = roundMoney(result.confirmedReimbursement + row.confirmedReimbursement);
        result.totalPayable = roundMoney(result.totalPayable + row.totalPayable);
        return result;
    }, { businessBonus: 0, executionBonus: 0, reimbursement: 0, confirmedReimbursement: 0, totalPayable: 0 });

    return {
        filter: {
            year: selectedYear,
            month: selectedMonth,
            activityMonth,
            username: String(username || '').trim()
        },
        employeeOptions,
        employeeRows,
        totals,
        sources: {
            businessBonuses: businessBonusSources.filter(sourceMatches),
            executionBonuses: executionBonusSources.filter(sourceMatches),
            reimbursements: reimbursementSources.filter(sourceMatches)
        },
        settlements: settlementRows.filter(row => (
            !selectedEmployeeKey || accountKey(row.employee) === selectedEmployeeKey
        )),
        readOnly: false
    };
}

function createLockedEmployeeSettlement({
    id,
    employee,
    activityMonth,
    selectedReimbursementSourceKeys = [],
    applications = [],
    payments = [],
    bonusConfirmations = [],
    employeeSettlements = [],
    users = [],
    confirmedBy = '',
    confirmedAt = new Date().toLocaleString('zh-CN')
}) {
    const accounts = employeeAccounts(users);
    const employeeName = accounts.get(accountKey(employee));
    if (!employeeName) throw new Error('员工账号不存在或不能进入员工结算');
    if (!isYearMonth(activityMonth)) throw new Error('业务归属月份格式错误');
    if (!Array.isArray(selectedReimbursementSourceKeys)) throw new Error('报销来源格式错误');
    if ((employeeSettlements || []).some(record => (
        record?.status === 'locked'
        && record?.projectClosure?.result !== 'invalidated'
        && accountKey(record?.employee) === accountKey(employeeName)
        && record?.activityMonth === activityMonth
    ))) {
        const error = new Error(`${employeeName} 的 ${activityMonth} 业务归属月份已有锁定结算，不能重复确认`);
        error.statusCode = 409;
        throw error;
    }

    const preview = buildEmployeeSettlementPreview({
        applications,
        payments,
        bonusConfirmations,
        employeeSettlements,
        users,
        year: Number.parseInt(activityMonth.slice(0, 4), 10),
        month: Number.parseInt(activityMonth.slice(5, 7), 10),
        username: employeeName
    });
    const requestedKeys = [...new Set((selectedReimbursementSourceKeys || []).map(value => String(value || '').trim()).filter(Boolean))];
    if (requestedKeys.length !== (selectedReimbursementSourceKeys || []).length) {
        throw new Error('报销来源不能重复或为空');
    }
    const availableReimbursements = new Map(
        (preview.sources.reimbursements || []).filter(item => item.available).map(item => [item.sourceKey, item])
    );
    const invalidKey = requestedKeys.find(key => !availableReimbursements.has(key));
    if (invalidKey) throw new Error(`报销来源已失效、已锁定或不属于该员工：${invalidKey}`);

    const businessBonusSnapshots = (preview.sources.businessBonuses || [])
        .filter(item => item.available)
        .map(item => ({
            sourceKey: item.sourceKey,
            confirmationId: item.confirmationId,
            applicationId: item.applicationId,
            projectName: item.projectName,
            paymentId: item.paymentId,
            amount: item.amount
        }));
    const executionBonusSnapshots = (preview.sources.executionBonuses || [])
        .filter(item => item.available)
        .map(item => ({
            sourceKey: item.sourceKey,
            confirmationId: item.confirmationId,
            applicationId: item.applicationId,
            projectName: item.projectName,
            paymentId: item.paymentId,
            contribution: item.contribution,
            username: item.username,
            amount: item.amount
        }));
    const reimbursementSnapshots = [...availableReimbursements.values()].map(item => {
        return {
            sourceKey: item.sourceKey,
            paymentId: item.paymentId,
            itemIndex: item.itemIndex,
            projectId: item.applicationId,
            projectName: item.projectName,
            activityMonth: item.activityMonth,
            supplier: item.supplier,
            item: item.item,
            content: item.content,
            amount: item.amount
        };
    });
    if (!businessBonusSnapshots.length && !executionBonusSnapshots.length && !reimbursementSnapshots.length) {
        throw new Error('当前没有可锁定的奖金或报销来源');
    }

    const businessBonus = roundMoney(businessBonusSnapshots.reduce((sum, item) => sum + item.amount, 0));
    const executionBonus = roundMoney(executionBonusSnapshots.reduce((sum, item) => sum + item.amount, 0));
    const reimbursement = roundMoney(reimbursementSnapshots.reduce((sum, item) => sum + item.amount, 0));
    return {
        id,
        status: 'locked',
        employee: employeeName,
        activityMonth,
        settlementMonth: activityMonth,
        businessBonusSnapshots,
        executionBonusSnapshots,
        reimbursementSnapshots,
        totals: {
            businessBonus,
            executionBonus,
            reimbursement,
            totalPayable: roundMoney(businessBonus + executionBonus + reimbursement)
        },
        ruleVersion: EMPLOYEE_SETTLEMENT_RULE_VERSION,
        confirmedBy: String(confirmedBy || '').trim(),
        confirmedAt
    };
}

module.exports = {
    EMPLOYEE_SETTLEMENT_RULE_VERSION,
    accountKey,
    buildEmployeeSettlementPreview,
    businessSourceKey,
    claimedSettlementSources,
    createLockedEmployeeSettlement,
    employeeAccounts,
    executionSourceKey,
    reimbursementSourceKey,
    settlementRiskMessages
};
