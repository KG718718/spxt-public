'use strict';
const { createHash } = require('node:crypto');

// Empty structure only. No financial thresholds, amounts or coefficients are preconfigured.
const DEFAULT_BONUS_RULES = Object.freeze({
    profitBands: Object.freeze([]),
    kpi2Bands: Object.freeze([])
});
const MAX_BANDS = 100; // Resource limit, not a business tariff.
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function configError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}
function invalid(message) { throw configError('BONUS_CONFIG_INVALID', message); }
function missing(message) { throw configError('BONUS_CONFIG_MISSING', message); }
function numeric(value, label, places, nonnegative = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (nonnegative && value < 0)) {
        invalid(label + '必须是有效数字' + (nonnegative ? '且不小于0' : ''));
    }
    const scale = 10 ** places;
    const scaled = value * scale;
    if (!Number.isSafeInteger(Math.round(scaled)) || Math.abs(scaled - Math.round(scaled)) > 1e-7) {
        invalid(label + '超出有效精度或数值范围');
    }
    return Object.is(value, -0) ? 0 : value;
}
function normalizeBands(input, name, valuePlaces, boundPlaces) {
    if (!Array.isArray(input)) invalid(name + '必须是档位列表');
    if (!input.length) missing(name + '尚未配置');
    if (input.length > MAX_BANDS) invalid(name + '档位数量过多');
    const allowed = new Set(['min', 'max', 'value', 'minInclusive', 'maxInclusive']);
    const bands = input.map((row, index) => {
        const label = name + '第' + (index + 1) + '档';
        if (!row || typeof row !== 'object' || Array.isArray(row)) invalid(label + '格式错误');
        if (Object.keys(row).some(key => !allowed.has(key))) invalid(label + '含未知字段');
        for (const key of ['min', 'max', 'value']) {
            if (!own(row, key)) invalid(label + '缺少' + key);
        }
        for (const key of ['minInclusive', 'maxInclusive']) {
            if (own(row, key) && typeof row[key] !== 'boolean') invalid(label + '边界选项格式错误');
        }
        const min = row.min === null ? null : numeric(row.min, label + '下限', boundPlaces);
        const max = row.max === null ? null : numeric(row.max, label + '上限', boundPlaces);
        if (min !== null && max !== null && min >= max) invalid(label + '上限必须大于下限');
        return {
            min, max, value: numeric(row.value, label + '金额或系数', valuePlaces, true),
            minInclusive: own(row, 'minInclusive') ? row.minInclusive : true,
            maxInclusive: own(row, 'maxInclusive') ? row.maxInclusive : false
        };
    });
    const contains = (row, value) =>
        (row.min === null || (row.minInclusive ? value >= row.min : value > row.min)) &&
        (row.max === null || (row.maxInclusive ? value <= row.max : value < row.max));
    for (let i = 0; i < bands.length; i += 1) {
        for (let j = i + 1; j < bands.length; j += 1) {
            const a = bands[i], b = bands[j];
            const lower = Math.max(a.min ?? -Infinity, b.min ?? -Infinity);
            const upper = Math.min(a.max ?? Infinity, b.max ?? Infinity);
            if (lower < upper || (lower === upper && contains(a, lower) && contains(b, lower))) {
                invalid(name + '第' + (i + 1) + '档与第' + (j + 1) + '档重叠');
            }
        }
    }
    return bands;
}
function validateBonusRules(raw) {
    if (raw === undefined || raw === null) missing('奖金参数尚未配置，请Admin配置');
    if (typeof raw !== 'object' || Array.isArray(raw)) invalid('奖金参数格式错误');
    const allowed = new Set(['profitBands', 'kpi2Bands', 'manualKpi2Threshold']);
    if (Object.keys(raw).some(key => !allowed.has(key))) invalid('奖金参数含未知字段');
    for (const key of allowed) {
        if (!own(raw, key)) missing('奖金参数尚未配置完整：' + key);
    }
    return {
        profitBands: normalizeBands(raw.profitBands, '利润基础奖金', 2, 2),
        kpi2Bands: normalizeBands(raw.kpi2Bands, 'KPI2调整系数', 6, 6),
        manualKpi2Threshold: numeric(raw.manualKpi2Threshold, '人工确认KPI2阈值', 6, true)
    };
}
function bonusRulesDigest(raw) {
    return createHash('sha256').update(JSON.stringify(validateBonusRules(raw)), 'utf8').digest('hex');
}
function inspectBonusRules(raw) {
    try {
        const rules = validateBonusRules(raw);
        return { ready: true, rules, rulesDigest: bonusRulesDigest(rules) };
    } catch (error) {
        if (!['BONUS_CONFIG_MISSING', 'BONUS_CONFIG_INVALID'].includes(error.code)) throw error;
        return { ready: false, code: error.code, message: error.message, rulesDigest: null };
    }
}
module.exports = { DEFAULT_BONUS_RULES, validateBonusRules, bonusRulesDigest, inspectBonusRules };
