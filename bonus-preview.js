'use strict';
const { DEFAULT_BONUS_RULES, inspectBonusRules } = require('./bonus-config');

function toNumber(value) {
    const parsed = Number.parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function roundRate(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 1000000) / 1000000;
}

function parseDate(value) {
    if (!value) return null;
    const parsed = new Date(String(value).replace(',', '').trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseYearMonth(value) {
    const date = parseDate(value);
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function latestApprovedPayment(projectId, payments = []) {
    return (payments || [])
        .filter(payment => payment?.projectId === projectId && payment?.status === 'approved')
        .sort((a, b) => {
            const timeDifference = (parseDate(b?.approveTime || b?.date)?.getTime() || 0) - (parseDate(a?.approveTime || a?.date)?.getTime() || 0);
            if (timeDifference) return timeDifference;
            const revisionDifference = toNumber(b?.revisionNo) - toNumber(a?.revisionNo);
            if (revisionDifference) return revisionDifference;
            return String(b?.id || '').localeCompare(String(a?.id || ''), 'zh-CN');
        })[0] || null;
}

function isProxyItem(item) {
    return String(item?.isProxy || '').trim() === '是';
}

function calculateProjectFinancials(application, payment) {
    const revenue = toNumber(payment?.contractAmount ?? application?.contractAmount);
    const tax = toNumber(payment?.taxAmount);
    let paymentAmount = 0;
    let serviceFee = 0;
    let proxyCost = 0;
    const financialItems = Array.isArray(payment?.kpiItems) ? payment.kpiItems : (payment?.items || []);
    financialItems.forEach(item => {
        const amount = toNumber(item?.amount);
        const fee = toNumber(item?.serviceFee);
        paymentAmount += amount;
        serviceFee += fee;
        if (isProxyItem(item)) proxyCost += amount + fee;
    });
    const totalCost = paymentAmount + serviceFee + tax;
    const profit = revenue - totalCost;
    const kpi2Base = revenue - proxyCost;
    return {
        revenue: roundMoney(revenue),
        paymentAmount: roundMoney(paymentAmount),
        serviceFee: roundMoney(serviceFee),
        tax: roundMoney(tax),
        totalCost: roundMoney(totalCost),
        proxyCost: roundMoney(proxyCost),
        profit: roundMoney(profit),
        kpi1: roundRate(revenue > 0 ? profit / revenue : 0),
        kpi2: roundRate(kpi2Base > 0 ? profit / kpi2Base : 0)
    };
}

function ruleMatches(value, rule) {
    const min = rule?.min === undefined || rule?.min === null ? -Infinity : toNumber(rule.min);
    const max = rule?.max === undefined || rule?.max === null ? Infinity : toNumber(rule.max);
    const aboveMin = rule?.minInclusive === false ? value > min : value >= min;
    const belowMax = rule?.maxInclusive === true ? value <= max : value < max;
    return aboveMin && belowMax;
}

function matchRule(value, rules = []) {
    return (rules || []).find(rule => ruleMatches(value, rule)) || null;
}

const CONFIRMED_PROJECT_EXAMPLES = Object.freeze([]); // Compatibility export; never a fallback.

function calculateProjectBonus(financials, rules = {}, context = {}) {
    const state = inspectBonusRules(rules);
    const pending = (message, code) => ({
        status: 'pending_confirmation', baseBonus: null, adjustmentRate: null, finalBonus: null,
        ruleSource: 'pending-confirmation', pendingReasons: [message],
        configurationError: code, rulesDigest: state.rulesDigest
    });
    if (!state.ready) return pending(state.message, state.code);
    if (typeof financials?.profit !== 'number' || !Number.isFinite(financials.profit)
        || typeof financials?.kpi2 !== 'number' || !Number.isFinite(financials.kpi2)) {
        return pending('项目利润或KPI2无效，不能试算奖金', 'BONUS_FINANCIALS_INVALID');
    }
    const profitRule = matchRule(financials.profit, state.rules.profitBands);
    const kpi2Rule = matchRule(financials.kpi2, state.rules.kpi2Bands);
    if (profitRule && kpi2Rule) {
        const baseBonus = roundMoney(profitRule.value);
        const adjustmentRate = roundRate(kpi2Rule.value);
        const product = baseBonus * adjustmentRate;
        if (!Number.isFinite(product) || !Number.isSafeInteger(Math.round(product * 100))) {
            return pending('奖金计算结果超出有效金额范围', 'BONUS_RESULT_INVALID');
        }
        return {
            status: 'calculated', baseBonus, adjustmentRate, finalBonus: roundMoney(product),
            ruleSource: 'configured-bands', pendingReasons: [], rulesDigest: state.rulesDigest
        };
    }
    const pendingReasons = [];
    if (!profitRule) pendingReasons.push('项目利润基础奖金档位待确认');
    const threshold = state.rules.manualKpi2Threshold;
    const pendingAdminConfirmation = Boolean(profitRule) && !kpi2Rule && financials.kpi2 < threshold;
    if (pendingAdminConfirmation) pendingReasons.push('KPI2低于当前配置的人工确认阈值，待管理员填写最终金额和确认备注');
    else if (!kpi2Rule) pendingReasons.push('KPI2调整比例档位待确认');
    return {
        status: pendingAdminConfirmation ? 'pending_admin_confirmation' : 'pending_confirmation',
        baseBonus: profitRule ? roundMoney(profitRule.value) : null,
        adjustmentRate: kpi2Rule ? roundRate(kpi2Rule.value) : null,
        finalBonus: null, ruleSource: 'pending-confirmation', pendingReasons,
        manualKpi2Threshold: threshold, rulesDigest: state.rulesDigest
    };
}

function normalizeAccount(value) {
    return String(value || '').trim().toLowerCase();
}

function buildProjectBonusRow(application, payment, rules = DEFAULT_BONUS_RULES, activityMonth = '') {
    const applicant = application?.applicant || payment?.applicant || '';
    const financials = calculateProjectFinancials(application, payment);
    const bonus = calculateProjectBonus(financials, rules, { applicationId: application?.id, applicant });
    const executionParticipants = (Array.isArray(payment?.executionParticipants) ? payment.executionParticipants : [])
        .map(participant => ({
            username: String(participant?.username || '').trim(),
            contribution: String(participant?.contribution || '').trim()
        }))
        .filter(participant => participant.username);
    return {
        applicant,
        applicationId: application?.id || '',
        projectName: application?.projectName || '',
        activityMonth,
        paymentId: payment?.id || '',
        paymentApplicant: payment?.applicant || '',
        executionParticipants,
        ...financials,
        ...bonus
    };
}

function buildBonusPreview({ applications = [], payments = [], year, month, username = '', rules = DEFAULT_BONUS_RULES }) {
    const selectedYear = Number.parseInt(year, 10);
    const selectedMonth = Number.parseInt(month, 10);
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const usernameFilter = normalizeAccount(username);
    let projectRows = [];
    (applications || []).forEach(application => {
        if (application?.status !== 'approved') return;
        const payment = latestApprovedPayment(application.id, payments);
        if (!payment) return;
        const activityMonth = parseYearMonth(application?.startDate);
        if (activityMonth !== monthKey) return;
        projectRows.push(buildProjectBonusRow(application, payment, rules, activityMonth));
    });
    if (usernameFilter) {
        projectRows = projectRows.filter(row => (
            normalizeAccount(row.applicant) === usernameFilter
            || (row.executionParticipants || []).some(participant => normalizeAccount(participant.username) === usernameFilter)
        ));
    }
    projectRows.sort((a, b) => `${a.applicant}|${a.applicationId}`.localeCompare(`${b.applicant}|${b.applicationId}`, 'zh-CN'));
    const bonusByEmployee = {};
    projectRows.forEach(row => {
        const key = row.applicant || '未知';
        if (!bonusByEmployee[key]) bonusByEmployee[key] = { username: key, projectCount: 0, calculatedCount: 0, pendingCount: 0, finalBonus: 0 };
        const summary = bonusByEmployee[key];
        summary.projectCount += 1;
        if (row.status === 'calculated') {
            summary.calculatedCount += 1;
            summary.finalBonus = roundMoney(summary.finalBonus + row.finalBonus);
        } else summary.pendingCount += 1;
    });
    return {
        filter: { year: selectedYear, month: selectedMonth, monthKey, username: username || '' },
        projectRows,
        bonusByEmployee
    };
}

module.exports = {
    CONFIRMED_PROJECT_EXAMPLES,
    DEFAULT_BONUS_RULES,
    buildBonusPreview,
    buildProjectBonusRow,
    calculateProjectBonus,
    calculateProjectFinancials,
    isProxyItem,
    latestApprovedPayment,
    matchRule,
    parseYearMonth,
    roundMoney,
    roundRate,
    ruleMatches,
    toNumber
};
