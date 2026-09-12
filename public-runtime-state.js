'use strict';
const {newEmptyState,validateState}=require('./public-startup');
// Read-only upgrade normalization. Never fills business records or changes stored snapshots.
function runtimeState(input){
    validateState(input);
    const state={...newEmptyState(),...input};
    const mappings=[
        ['nextAppId','applications','APP'],['nextPayId','payments','PAY'],
        ['nextDebtId','debts','DEBT'],['nextClientId','clients','CLIENT'],
        ['nextInvoiceId','invoices','INV'],['nextOcrJobId','invoiceOcrJobs','OCR'],
        ['nextInvoiceDraftId','invoiceDraftBatches','DRAFT'],['nextInvoiceAuditId','invoiceAuditRecords','AUDIT'],
        ['nextBonusConfirmationId','bonusConfirmations','BONUS'],
        ['nextEmployeeSettlementId','employeeSettlements','SETTLE'],['nextMailSendId','mailSendRecords','MAIL']
    ];
    for(const [counter,collection,prefix] of mappings){
        const pattern=new RegExp('^'+prefix+'(\\d+)$');
        const maximum=state[collection].reduce((max,row)=>{
            const match=String(row.id||'').match(pattern);
            if(!match)return max;
            const number=Number(match[1]);
            if(!Number.isSafeInteger(number)||number<0)throw Error('Unsafe business identifier in '+collection);
            return Math.max(max,number);
        },0);
        const minimum=maximum+1;
        if(Object.hasOwn(input,counter)&&input[counter]<minimum)
            throw Error('Business counter conflicts with saved records: '+counter+'. Restore a consistent backup; no automatic reset.');
        if(!Object.hasOwn(input,counter))state[counter]=minimum;
        if(!Number.isSafeInteger(state[counter]))throw Error('Business counter exhausted: '+counter);
    }
    const maximumLink=state.applications.flatMap(app=>app.debtLinks||[]).reduce((max,row)=>{
        const match=String(row.id||'').match(/^DEBTLINK(\d+)$/);
        return match?Math.max(max,Number(match[1])):max;
    },0);
    if(Object.hasOwn(input,'nextDebtLinkId')&&input.nextDebtLinkId<=maximumLink)throw Error('Debt link counter conflicts with saved records.');
    if(!Object.hasOwn(input,'nextDebtLinkId'))state.nextDebtLinkId=maximumLink+1;
    if(!Number.isSafeInteger(state.nextDebtLinkId))throw Error('Debt link counter exhausted.');
    return state;
}
module.exports={runtimeState};
