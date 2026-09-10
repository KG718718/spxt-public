'use strict';
// All values below are synthetic unit-test inputs, never installation defaults or seed data.
const assert = require('node:assert/strict');
const {
    SERVICE_FEE_DEFAULT_RATES, SERVICE_FEE_ITEM_OPTIONS,
    effectiveServiceFeeRates, validateServiceFeeRates, serviceFeeRateForItemName
} = require('../../service-fee-config');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const rates = () => ({ default: 0.08, '礼品采购': 0.18 });
const missing = fn => assert.throws(fn, error => error.code === 'SERVICE_FEE_CONFIG_MISSING');
const invalid = fn => assert.throws(fn, error => error.code === 'SERVICE_FEE_CONFIG_INVALID');

test('no built-in company rates', () => assert.deepEqual(SERVICE_FEE_DEFAULT_RATES, {}));
test('empty defaults cannot be modified', () => assert.equal(Object.isFrozen(SERVICE_FEE_DEFAULT_RATES), true));
test('cost item choices remain explicit and immutable', () => {
    assert.deepEqual(SERVICE_FEE_ITEM_OPTIONS, ['场地', '餐饮', '茶歇', '物料搭建', 'AV设备', '第三方人员', '礼品采购', '摄影摄像', '其他']);
    assert.equal(Object.isFrozen(SERVICE_FEE_ITEM_OPTIONS), true);
});
for (const [name, value] of [['undefined', undefined], ['null', null], ['empty object', {}]]) {
    test(name + ' can be read without manufacturing rates', () => assert.deepEqual(effectiveServiceFeeRates(value), {}));
    test(name + ' cannot be saved as complete configuration', () => missing(() => validateServiceFeeRates(value)));
    test(name + ' cannot be used for calculation', () => missing(() => serviceFeeRateForItemName(value, '场地')));
}
test('partial configuration reads only the supplied field', () => assert.deepEqual(effectiveServiceFeeRates({ default: 0.08 }), { default: 0.08 }));
test('base rate remains required', () => missing(() => validateServiceFeeRates({ '礼品采购': 0.18 })));
test('separate gift rate remains required', () => missing(() => validateServiceFeeRates({ default: 0.08 })));
test('partial configuration cannot calculate even an explicitly supplied item', () => missing(() => serviceFeeRateForItemName({ '场地': 0.04 }, '场地')));
test('complete configuration retains explicit values', () => assert.deepEqual(validateServiceFeeRates(rates()), rates()));
test('unspecified cost item uses Admin-configured base rate', () => assert.equal(serviceFeeRateForItemName(rates(), '场地'), 0.08));
test('gift uses explicit separate rate', () => assert.equal(serviceFeeRateForItemName(rates(), '礼品采购'), 0.18));
test('item-specific rate takes precedence', () => assert.equal(serviceFeeRateForItemName({ ...rates(), '场地': 0.04 }, '场地'), 0.04));
test('item-name trimming is preserved', () => assert.equal(serviceFeeRateForItemName({ ...rates(), '场地': 0.04 }, ' 场地 '), 0.04));
test('unknown item name retains configured base fallback', () => assert.equal(serviceFeeRateForItemName(rates(), 'unmapped-item'), 0.08));
test('empty item name retains configured base fallback', () => assert.equal(serviceFeeRateForItemName(rates(), ''), 0.08));
test('explicit zero base and gift are valid, not missing', () => {
    const config = { default: 0, '礼品采购': 0 };
    assert.deepEqual(validateServiceFeeRates(config), config);
    assert.equal(serviceFeeRateForItemName(config, '礼品采购'), 0);
    assert.equal(serviceFeeRateForItemName(config, '餐饮'), 0);
});
test('explicit zero override must not use nonzero base', () => assert.equal(serviceFeeRateForItemName({ ...rates(), '场地': 0 }, '场地'), 0));
test('inclusive upper boundary is preserved', () => assert.deepEqual(validateServiceFeeRates({ default: 1, '礼品采购': 1 }), { default: 1, '礼品采购': 1 }));
for (const [name, value] of [['empty string', ''], ['numeric string', '0.08'], ['null', null], ['undefined', undefined], ['true', true], ['false', false], ['negative', -0.01], ['over one', 1.01], ['NaN', NaN], ['Infinity', Infinity], ['negative Infinity', -Infinity], ['object', {}], ['array', []]]) {
    test('reject invalid rate: ' + name, () => {
        const config = { ...rates(), '场地': value };
        invalid(() => effectiveServiceFeeRates(config));
        invalid(() => validateServiceFeeRates(config));
        invalid(() => serviceFeeRateForItemName(config, '场地'));
    });
}
for (const [name, value] of [['array', []], ['string', 'rates'], ['number', 0], ['boolean', false]]) {
    test('reject invalid configuration structure: ' + name, () => {
        invalid(() => effectiveServiceFeeRates(value));
        invalid(() => validateServiceFeeRates(value));
    });
}
test('unknown configuration key cannot be silently accepted', () => invalid(() => effectiveServiceFeeRates({ ...rates(), typo: 0.04 })));
test('prototype-like JSON key is rejected', () => invalid(() => validateServiceFeeRates(JSON.parse('{"default":0.08,"礼品采购":0.18,"__proto__":0.04}'))));
test('inherited required fields do not count as configured', () => {
    const config = Object.create(rates());
    assert.deepEqual(effectiveServiceFeeRates(config), {});
    missing(() => validateServiceFeeRates(config));
});
test('no mutations or returned reference aliasing', () => {
    const config = Object.freeze({ ...rates(), '场地': 0.04 });
    const copy = { ...config };
    const result = validateServiceFeeRates(config);
    assert.notEqual(result, config);
    result.default = 0.03;
    serviceFeeRateForItemName(config, '场地');
    assert.deepEqual(config, copy);
});
test('base change does not override explicit item settings', () => {
    const config = { ...rates(), '场地': 0.04 };
    const before = validateServiceFeeRates(config);
    const after = validateServiceFeeRates({ ...config, default: 0.03 });
    assert.equal(serviceFeeRateForItemName(after, '场地'), 0.04);
    assert.equal(serviceFeeRateForItemName(after, '餐饮'), 0.03);
    assert.deepEqual(before, config);
});
test('validation errors retain input', () => {
    const config = { ...rates(), '场地': null };
    const before = { ...config };
    invalid(() => validateServiceFeeRates(config));
    assert.deepEqual(config, before);
});
let failed = 0;
for (const { name, fn } of tests) {
    try { fn(); console.log('PASS ' + name); }
    catch (error) { failed += 1; console.log('FAIL ' + name + ': ' + error.message); }
}
console.log('Public service fee configuration: ' + (tests.length - failed) + '/' + tests.length + ' passed.');
if (failed) throw new Error(failed + ' public service fee configuration test(s) failed');
