const {
    DEFAULT_BONUS_RULES,
    buildProjectBonusRow,
    latestApprovedPayment,
    parseYearMonth,
    roundMoney
} = require('./bonus-preview');

const { validateBonusRules, bonusRulesDigest } = require('./bonus-config');
const BONUS_RULE_VERSION = 'business-bonus-public-v1';
const MAX_EXECUTION_PARTICIPANTS = 50;
const MAX_CONTRIBUTION_LENGTH = 200;
const MAX_CONFIRMATION_NOTE_LENGTH = 500;
const MAX_ZERO_REASON_LENGTH = 500;

function accountKey(value) {
    return String(value || '').trim().toLowerCase();
}

function activeEmployeeAccount(user) {
    return user?.role === 'user'
        && !user?.deletedAt
        && user?.accountStatus !== 'deleted'
        && !user?.disabledAt
        && user?.accountStatus !== 'disabled';
}

function employeeOptions(users = [], projectApplicant = '') {
    const applicantKey = accountKey(projectApplicant);
    return (users || [])
        .filter(activeEmployeeAccount)
        .map(user => String(user?.username || '').trim())
        .filter(Boolean)
        .filter(username => accountKey(username) !== applicantKey)
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function normalizeExecutionParticipants(input, { users = [], projectApplicant = '' } = {}) {
    if (input === undefined || input === null) return [];
    if (!Array.isArray(input)) throw new Error('执行参与人员格式错误');
    if (input.length > MAX_EXECUTION_PARTICIPANTS) {
        throw new Error(`执行参与人员不能超过${MAX_EXECUTION_PARTICIPANTS}人`);
    }

    const employeeMap = new Map(
        (users || [])
            .filter(activeEmployeeAccount)
            .map(user => [accountKey(user.username), String(user.username || '').trim()])
            .filter(([key, username]) => key && username)
    );
    const applicantKey = accountKey(projectApplicant);
    const seen = new Set();

    return input.map((participant, index) => {
        const usernameKey = accountKey(participant?.username);
        if (!usernameKey) throw new Error(`第${index + 1}名执行参与人员缺少员工账号`);
        const canonicalUsername = employeeMap.get(usernameKey);
        if (!canonicalUsername) throw new Error(`执行参与人员账号不存在或不是员工账号：${participant?.username || ''}`);
        if (usernameKey === applicantKey) throw new Error('项目申请人不能登记为执行参与人员');
        if (seen.has(usernameKey)) throw new Error(`执行参与人员不能重复：${canonicalUsername}`);
        seen.add(usernameKey);

        const contribution = String(participant?.contribution || '').trim();
        if (contribution.length > MAX_CONTRIBUTION_LENGTH) {
            throw new Error(`执行工作说明不能超过${MAX_CONTRIBUTION_LENGTH}字`);
        }
        return { username: canonicalUsername, contribution };
    });
}

function hasAtMostTwoDecimals(value) {
    const number = Number(value);
    return Number.isFinite(number) && Math.abs(number * 100 - Math.round(number * 100)) < 1e-7;
}

function parseMoney(value, label, { allowZero = false } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || (!allowZero && number <= 0)) {
        throw new Error(`${label}必须${allowZero ? '大于或等于0' : '大于0'}`);
    }
    if (!hasAtMostTwoDecimals(number)) throw new Error(`${label}最多保留两位小数`);
    return roundMoney(number);
}

function paymentParticipants(payment) {
    return (Array.isArray(payment?.executionParticipants) ? payment.executionParticipants : [])
        .map(participant => ({
            username: String(participant?.username || '').trim(),
            contribution: String(participant?.contribution || '').trim()
        }))
        .filter(participant => participant.username);
}

function buildBonusCandidate(application, payments = [], rules = DEFAULT_BONUS_RULES) {
    if (!application || application.status !== 'approved') throw new Error('项目未通过，不能确认奖金');
    const payment = latestApprovedPayment(application.id, payments);
    if (!payment) throw new Error('项目没有有效的已通过付款，不能确认奖金');
    const activityMonth = parseYearMonth(application.startDate);
    if (!activityMonth) throw new Error('项目缺少有效活动日期；请由Admin依据原始证据补录后再确认奖金');
    return {
        payment,
        row: buildProjectBonusRow(application, payment, rules, activityMonth)
    };
}

function ruleSnapshot(rules = DEFAULT_BONUS_RULES) {
    const normalized = validateBonusRules(rules);
    return {
        version: BONUS_RULE_VERSION,
        formula: {
            profit: '营业额 - 付款金额 - 服务费 - 税费',
            proxyCost: '代付金额 + 对应服务费',
            kpi2: '项目利润 / (营业额 - 代付成本)',
            finalBusinessBonus: '基础业务奖金 * KPI2调整比例'
        },
        profitBands: normalized.profitBands,
        kpi2Bands: normalized.kpi2Bands,
        manualKpi2Threshold: normalized.manualKpi2Threshold,
        rulesDigest: bonusRulesDigest(normalized)
    };
}

function createLockedBonusConfirmation({
    id,
    application,
    payments = [],
    existingConfirmations = [],
    body = {},
    confirmedBy = '',
    confirmedAt = new Date().toLocaleString('zh-CN'),
    rules = DEFAULT_BONUS_RULES
}) {
    if ((existingConfirmations || []).some(record => (
        record?.applicationId === application?.id && record?.status === 'locked'
    ))) {
        const error = new Error('该项目奖金已经确认锁定，不能重复确认');
        error.statusCode = 409;
        throw error;
    }

    const { payment, row } = buildBonusCandidate(application, payments, rules);
    if (!row.rulesDigest || typeof body.rulesDigest !== 'string' || body.rulesDigest !== row.rulesDigest) {
        const error = new Error('奖金规则未配置或已变化，请刷新预览后重新确认');
        error.statusCode = 409;
        throw error;
    }
    if (String(body.paymentId || '') !== String(payment.id || '')) {
        throw new Error('付款记录已经变化，请刷新后重新确认');
    }

    const participants = paymentParticipants(payment);
    const amountRows = Array.isArray(body.executionBonuses) ? body.executionBonuses : [];
    const amountMap = new Map();
    amountRows.forEach(item => {
        const key = accountKey(item?.username);
        if (!key) throw new Error('执行奖金缺少员工账号');
        if (amountMap.has(key)) throw new Error(`执行奖金人员不能重复：${item?.username || ''}`);
        const amount = parseMoney(item?.amount, `员工${item?.username || ''}的执行奖金`, { allowZero: true });
        const zeroReason = String(item?.zeroReason || '').trim();
        if (zeroReason.length > MAX_ZERO_REASON_LENGTH) {
            throw new Error(`员工${item?.username || ''}的0元执行奖金原因不能超过${MAX_ZERO_REASON_LENGTH}字`);
        }
        if (amount === 0 && !zeroReason) {
            throw new Error(`员工${item?.username || ''}的执行奖金金额为0时必须填写原因`);
        }
        amountMap.set(key, { amount, zeroReason });
    });
    if (amountMap.size !== participants.length || participants.some(item => !amountMap.has(accountKey(item.username)))) {
        throw new Error('执行奖金人员必须与付款申请登记人员一致');
    }

    const note = String(body.confirmationNote || '').trim();
    if (note.length > MAX_CONFIRMATION_NOTE_LENGTH) {
        throw new Error(`确认备注不能超过${MAX_CONFIRMATION_NOTE_LENGTH}字`);
    }

    if (body.finalBusinessBonus === undefined || body.finalBusinessBonus === null || String(body.finalBusinessBonus).trim() === '') {
        throw new Error('必须填写最终业务奖金金额');
    }
    const requestedBusinessBonus = parseMoney(body.finalBusinessBonus, '最终业务奖金金额', { allowZero: true });

    let confirmedBusinessBonus;
    let confirmationMode;
    if (row.status === 'calculated') {
        confirmedBusinessBonus = requestedBusinessBonus;
        confirmationMode = confirmedBusinessBonus === row.finalBonus ? 'calculated' : 'manual_adjustment';
    } else if (row.status === 'pending_admin_confirmation' && row.kpi2 < row.manualKpi2Threshold) {
        confirmedBusinessBonus = requestedBusinessBonus;
        confirmationMode = 'manual_below_kpi2_threshold';
        if (!note) throw new Error('KPI2低于当前配置的人工确认阈值时必须填写确认备注');
    } else {
        throw new Error('当前项目奖金规则不完整，不能确认锁定');
    }

    const executionBonuses = participants.map(participant => ({
        username: participant.username,
        contribution: participant.contribution,
        amount: amountMap.get(accountKey(participant.username)).amount,
        zeroReason: amountMap.get(accountKey(participant.username)).zeroReason
    }));
    const executionBonusTotal = roundMoney(executionBonuses.reduce((sum, item) => sum + item.amount, 0));

    return {
        id,
        status: 'locked',
        applicationId: row.applicationId,
        projectName: row.projectName,
        activityMonth: row.activityMonth,
        projectApplicant: row.applicant,
        paymentId: row.paymentId,
        paymentApplicant: row.paymentApplicant,
        financials: {
            revenue: row.revenue,
            paymentAmount: row.paymentAmount,
            serviceFee: row.serviceFee,
            tax: row.tax,
            totalCost: row.totalCost,
            proxyCost: row.proxyCost,
            profit: row.profit,
            kpi1: row.kpi1,
            kpi2: row.kpi2
        },
        businessBonus: {
            calculationStatus: row.status,
            baseBonus: row.baseBonus,
            adjustmentRate: row.adjustmentRate,
            trialFinalBonus: row.finalBonus,
            confirmedFinalBonus: confirmedBusinessBonus,
            confirmationMode,
            confirmationNote: note
        },
        executionBonuses,
        totals: {
            businessBonus: confirmedBusinessBonus,
            executionBonus: executionBonusTotal,
            projectBonus: roundMoney(confirmedBusinessBonus + executionBonusTotal)
        },
        ruleSnapshot: ruleSnapshot(rules),
        confirmedBy: String(confirmedBy || '').trim(),
        confirmedAt
    };
}

function filterConfirmations(records = [], { year, month, username = '' } = {}) {
    const monthKey = `${Number.parseInt(year, 10)}-${String(Number.parseInt(month, 10)).padStart(2, '0')}`;
    const usernameKey = accountKey(username);
    return (records || []).filter(record => {
        if (record?.activityMonth !== monthKey) return false;
        if (!usernameKey) return true;
        return accountKey(record?.projectApplicant) === usernameKey
            || (record?.executionBonuses || []).some(item => accountKey(item?.username) === usernameKey);
    });
}

module.exports = {
    BONUS_RULE_VERSION,
    buildBonusCandidate,
    createLockedBonusConfirmation,
    employeeOptions,
    filterConfirmations,
    normalizeExecutionParticipants,
    paymentParticipants
};
