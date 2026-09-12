'use strict';
function taxError(code,message,statusCode){
    const error=new Error(message);error.code=code;error.statusCode=statusCode;return error;
}
function validateTaxRate(value){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)
        throw taxError('TAX_INVALID','税率必须由 Admin 填写为非负有限数值；空白不是 0。',400);
    return value;
}
function hasTaxRate(config){
    return config!==null&&typeof config==='object'&&!Array.isArray(config)&&Object.hasOwn(config,'taxRate');
}
function taxRateForCalculation(config){
    if(!hasTaxRate(config)) throw taxError('TAX_NOT_CONFIGURED','尚未配置税率，请联系 Admin 完成配置后再提交。',409);
    return validateTaxRate(config.taxRate);
}
function taxConfigurationForResponse(config){
    if(!hasTaxRate(config)) return {taxRate:null,taxRateConfigured:false};
    return {taxRate:validateTaxRate(config.taxRate),taxRateConfigured:true};
}
module.exports={validateTaxRate,taxRateForCalculation,taxConfigurationForResponse};
