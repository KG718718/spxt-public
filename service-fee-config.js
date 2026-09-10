'use strict';

const SERVICE_FEE_ITEM_OPTIONS = Object.freeze([
    '场地', '餐饮', '茶歇', '物料搭建', 'AV设备', '第三方人员', '礼品采购', '摄影摄像', '其他'
]);
// Compatibility export only: a new installation has no configured business rates.
const SERVICE_FEE_DEFAULT_RATES = Object.freeze({});
const SERVICE_FEE_CONFIG_KEYS = new Set(['default', ...SERVICE_FEE_ITEM_OPTIONS]);

function configurationError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function isUsableRate(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

// Reading an unconfigured installation is allowed; calculations require the validator below.
function effectiveServiceFeeRates(rawRates) {
    if (rawRates === undefined || rawRates === null) return {};
    if (typeof rawRates !== 'object' || Array.isArray(rawRates)) {
        throw configurationError('SERVICE_FEE_CONFIG_INVALID', '服务费率必须是费用单项与费率的对应表');
    }
    const result = {};
    for (const [key, value] of Object.entries(rawRates)) {
        if (!SERVICE_FEE_CONFIG_KEYS.has(key)) {
            throw configurationError('SERVICE_FEE_CONFIG_INVALID', `未知费用单项：${key}`);
        }
        if (!isUsableRate(value)) {
            throw configurationError('SERVICE_FEE_CONFIG_INVALID', `${key === 'default' ? '默认费率' : key}必须是0%至100%的有效费率`);
        }
        result[key] = value;
    }
    return result;
}

function validateServiceFeeRates(rawRates) {
    const result = effectiveServiceFeeRates(rawRates);
    for (const required of ['default', '礼品采购']) {
        if (!Object.prototype.hasOwnProperty.call(result, required)) {
            throw configurationError(
                'SERVICE_FEE_CONFIG_MISSING',
                `服务费率尚未配置完整，请Admin配置：${required === 'default' ? '默认费率' : required}`
            );
        }
    }
    return result;
}

function serviceFeeRateForItemName(rawRates, itemName) {
    const rates = validateServiceFeeRates(rawRates);
    const key = String(itemName || '').trim();
    return Object.prototype.hasOwnProperty.call(rates, key) ? rates[key] : rates.default;
}

module.exports = {
    SERVICE_FEE_DEFAULT_RATES, SERVICE_FEE_ITEM_OPTIONS,
    effectiveServiceFeeRates, serviceFeeRateForItemName, validateServiceFeeRates
};
