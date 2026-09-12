const DEBT_SUPPLIER_VALUE = '__debt_repayment__';
const DEBT_SUPPLIER_LABEL = '欠款（关联历史申请）';
const DEBT_AMOUNT_BASIS_TAX_INCLUSIVE = 'tax-inclusive-v1';
const { serviceFeeRateForItemName } = require('./service-fee-config');

function toNumber(value) {
    const parsed = Number.parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function positiveMoney(value) {
    return Math.max(0, roundMoney(value));
}

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

function assertMoney(value, label, { allowZero = false } = {}) {
    const text = String(value ?? '').trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
        throw new Error(`${label}必须是非负且最多两位小数`);
    }
    const amount = roundMoney(text);
    if (!allowZero && amount <= 0) throw new Error(`${label}必须大于 0`);
    return amount;
}

function calculateDebtFinancials({ principal, totalActualCost }) {
    const debtPrincipal = roundMoney(principal);
    const cost = roundMoney(totalActualCost);
    const profit = roundMoney(debtPrincipal - cost);
    const rate = debtPrincipal > 0 ? profit / debtPrincipal : 0;
    return {
        amountBasis: DEBT_AMOUNT_BASIS_TAX_INCLUSIVE,
        principal: debtPrincipal,
        totalActualCost: cost,
        contractAmount: debtPrincipal,
        taxAmount: 0,
        profit,
        kpi1: rate,
        kpi2: rate
    };
}

function activeApplicationStatus(status) {
    return status === 'pending' || status === 'approved';
}

function debtLinksForDebt(applications, debtId) {
    return (applications || []).flatMap(app => (
        activeApplicationStatus(app?.status)
            ? (app.debtLinks || []).filter(link => link.debtId === debtId).map(link => ({ app, link }))
            : []
    ));
}

function paymentsForProject(payments, projectId) {
    return (payments || []).filter(payment => payment?.projectId === projectId);
}

function approvedPaymentsForProject(payments, projectId) {
    return paymentsForProject(payments, projectId).filter(payment => payment.status === 'approved');
}

function paymentStatusForProject(payments, projectId) {
    const projectPayments = paymentsForProject(payments, projectId);
    if (projectPayments.some(payment => payment.status === 'approved')) return 'approved';
    if (projectPayments.some(payment => payment.status === 'pending')) return 'pending';
    if (projectPayments.some(payment => payment.status === 'rejected')) return 'rejected';
    if (projectPayments.some(payment => payment.status === 'closed')) return 'closed';
    return 'none';
}

function detailPrincipal(payment, linkId) {
    if (!Array.isArray(payment?.debtRepayments)) return null;
    const detail = payment.debtRepayments.find(item => String(item?.debtLinkId || '') === String(linkId || ''));
    return detail ? positiveMoney(detail.confirmedPrincipal) : 0;
}

function approvedPrincipalForLink(app, link, payments) {
    const projectPayments = paymentsForProject(payments, app?.id).filter(payment => payment?.status === 'approved');
    const detailed = projectPayments.filter(payment => Array.isArray(payment.debtRepayments));
    if (detailed.length || link?.confirmationMode === 'payment-detail-v1') {
        return roundMoney(detailed.reduce((sum, payment) => sum + positiveMoney(detailPrincipal(payment, link?.id)), 0));
    }
    if (projectPayments.length) return positiveMoney(link?.principal);
    return 0;
}

function pendingPrincipalForLink(app, link, payments) {
    const pending = paymentsForProject(payments, app?.id).filter(payment => payment?.status === 'pending' && Array.isArray(payment.debtRepayments));
    return roundMoney(pending.reduce((sum, payment) => sum + positiveMoney(detailPrincipal(payment, link?.id)), 0));
}

function effectivePrincipalForLink(app, link, payments) {
    const approved = approvedPrincipalForLink(app, link, payments);
    const pending = pendingPrincipalForLink(app, link, payments);
    if (pending > 0 || paymentsForProject(payments, app?.id).some(payment => payment?.status === 'pending' && Array.isArray(payment.debtRepayments))) {
        return roundMoney(approved + pending);
    }
    if (approved > 0 || paymentsForProject(payments, app?.id).some(payment => payment?.status === 'approved')) return approved;
    return positiveMoney(link?.principal);
}

function effectiveDebtEntries(debt, applications, payments = []) {
    return debtLinksForDebt(applications, debt?.id).map(({ app, link }) => {
        const approvedPrincipal = approvedPrincipalForLink(app, link, payments);
        const pendingPrincipal = pendingPrincipalForLink(app, link, payments);
        const hasPendingDetail = paymentsForProject(payments, app.id).some(payment => payment.status === 'pending' && Array.isArray(payment.debtRepayments));
        const effectivePrincipal = effectivePrincipalForLink(app, link, payments);
        return {
            app,
            link,
            approvedPrincipal,
            pendingPrincipal,
            effectivePrincipal,
            source: hasPendingDetail ? 'pending-payment' : (approvedPrincipal > 0 ? 'approved-payment' : 'project-plan')
        };
    });
}

function approvedDebtPrincipal(debtId, applications, payments = []) {
    return roundMoney(effectiveDebtEntries({ id: debtId }, applications, payments)
        .reduce((sum, entry) => sum + positiveMoney(entry.approvedPrincipal), 0));
}

function allocationAmountsByCostIndex(debt, allocations) {
    const costs = Array.isArray(debt?.costItems) ? debt.costItems : [];
    const result = costs.map(() => 0);
    const idCounts = costs.reduce((map, cost) => map.set(String(cost?.id || ''), (map.get(String(cost?.id || '')) || 0) + 1), new Map());
    (allocations || []).forEach((allocation, allocationIndex) => {
        const explicitIndex = Number.isInteger(allocation?.costItemIndex) ? allocation.costItemIndex : -1;
        const id = String(allocation?.costItemId || '');
        const uniqueIdIndex = id && idCounts.get(id) === 1 ? costs.findIndex(cost => String(cost?.id || '') === id) : -1;
        const index = explicitIndex >= 0 && explicitIndex < costs.length
            ? explicitIndex
            : (uniqueIdIndex >= 0 ? uniqueIdIndex : allocationIndex);
        if (index >= 0 && index < result.length) result[index] = roundMoney(result[index] + positiveMoney(allocation?.amount));
    });
    return result;
}

function costReservationTotals(debt, applications, payments = [], statuses = ['approved', 'pending']) {
    const costs = Array.isArray(debt?.costItems) ? debt.costItems : [];
    const totals = costs.map(() => 0);
    const allowed = new Set(statuses);
    const activeProjectIds = new Set((applications || []).filter(app => activeApplicationStatus(app?.status)).map(app => app.id));
    (payments || []).filter(payment => activeProjectIds.has(payment?.projectId) && allowed.has(payment?.status) && Array.isArray(payment.debtRepayments)).forEach(payment => {
        (payment.debtRepayments || []).filter(detail => detail?.debtId === debt?.id).forEach(detail => {
            allocationAmountsByCostIndex(debt, detail.costAllocations).forEach((amount, index) => {
                totals[index] = roundMoney(totals[index] + amount);
            });
        });
    });
    if (allowed.has('approved')) {
        effectiveDebtEntries(debt, applications, payments).forEach(entry => {
            const hasLegacyApprovedPayment = approvedPaymentsForProject(payments, entry.app.id)
                .some(payment => !Array.isArray(payment.debtRepayments));
            if (!hasLegacyApprovedPayment) return;
            allocationAmountsByCostIndex(debt, entry.link.costAllocations).forEach((amount, index) => {
                totals[index] = roundMoney(totals[index] + amount);
            });
        });
    }
    return totals.map((amount, index) => Math.min(positiveMoney(costs[index]?.amount), positiveMoney(amount)));
}

function approvedCostForDebt(debt, applications, payments = []) {
    return roundMoney(costReservationTotals(debt, applications, payments, ['approved']).reduce((sum, amount) => sum + amount, 0));
}

function debtBalances(debt, applications, payments = []) {
    const entries = effectiveDebtEntries(debt, applications, payments);
    const effectivePrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.effectivePrincipal, 0));
    const projectPlannedPrincipal = roundMoney(entries.reduce((sum, entry) => sum + positiveMoney(entry.link.principal), 0));
    const includedPrincipal = roundMoney(entries.filter(entry => entry.app.status === 'approved')
        .reduce((sum, entry) => sum + entry.effectivePrincipal, 0));
    const receivedPrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.approvedPrincipal, 0));
    const pendingRepaymentPrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.pendingPrincipal, 0));
    const allocatedCost = debt?.principal > 0
        ? roundMoney(toNumber(debt.totalActualCost) * effectivePrincipal / toNumber(debt.principal))
        : 0;
    const receivedCost = approvedCostForDebt(debt, applications, payments);
    return {
        allocatedPrincipal: effectivePrincipal,
        effectivePrincipal,
        projectPlannedPrincipal,
        includedPrincipal,
        remainingPrincipal: positiveMoney(toNumber(debt?.principal) - effectivePrincipal),
        allocatedCost,
        remainingCost: positiveMoney(toNumber(debt?.totalActualCost) - allocatedCost),
        receivedPrincipal,
        receivedCost,
        pendingRepaymentPrincipal,
        pendingReceiptPrincipal: positiveMoney(effectivePrincipal - receivedPrincipal),
        outstandingPrincipal: positiveMoney(toNumber(debt?.principal) - receivedPrincipal)
    };
}

function paymentCostAllocations({ debt, confirmedPrincipal, applications, payments }) {
    const originalPrincipal = positiveMoney(debt?.principal);
    const priorPrincipal = roundMoney(effectiveDebtEntries(debt, applications, payments)
        .reduce((sum, entry) => sum + entry.approvedPrincipal + entry.pendingPrincipal, 0));
    const priorCosts = costReservationTotals(debt, applications, payments, ['approved', 'pending']);
    const isFinal = confirmedPrincipal > 0 && priorPrincipal + confirmedPrincipal >= originalPrincipal - 0.001;
    return (debt?.costItems || []).map((cost, costItemIndex) => {
        const remainingCost = positiveMoney(toNumber(cost.amount) - positiveMoney(priorCosts[costItemIndex]));
        const proportionalCost = originalPrincipal > 0 ? roundMoney(toNumber(cost.amount) * confirmedPrincipal / originalPrincipal) : 0;
        const amount = confirmedPrincipal <= 0 ? 0 : Math.min(remainingCost, isFinal ? remainingCost : proportionalCost);
        return {
            costItemId: cost.id || '',
            costItemIndex,
            item: cost.item || '',
            content: cost.content || '',
            supplier: cost.supplier || '',
            payeeAccountId: cost.payeeAccountId || '',
            payeeAccountType: cost.payeeAccountType || '',
            linkedEmployeeUsername: cost.linkedEmployeeUsername || '',
            amount
        };
    });
}

function buildDebtPaymentSnapshot({ debt, link, confirmedPrincipal, applications, payments, balanceAfter }) {
    const amount = positiveMoney(confirmedPrincipal);
    const costAllocations = paymentCostAllocations({ debt, confirmedPrincipal: amount, applications, payments });
    const allocatedCost = roundMoney(costAllocations.reduce((sum, cost) => sum + positiveMoney(cost.amount), 0));
    const rate = toNumber(link?.serviceFeeRateSnapshot);
    return {
        debtId: debt.id,
        debtLinkId: link.id,
        debtTitle: debt.title || link.debtTitle || '',
        originalPrincipal: positiveMoney(debt.principal),
        plannedPrincipal: positiveMoney(link.principal),
        confirmedPrincipal: amount,
        serviceFeeRateSnapshot: rate,
        serviceFee: roundMoney(amount * rate),
        kpiCost: roundMoney(amount + amount * rate),
        ratio: debt.principal ? roundMoney(amount / toNumber(debt.principal)) : 0,
        allocatedCost,
        costAllocations,
        realSuppliers: [...new Set(costAllocations.map(cost => cost.supplier).filter(Boolean))],
        remainingAfter: positiveMoney(balanceAfter),
        submittedAt: new Date().toLocaleString('zh-CN')
    };
}
function normalizeCostItems(items) {
    if (!Array.isArray(items) || !items.length) throw new Error('请至少填写一条真实成本明细');
    return items.map((item, index) => ({
        id: String(item?.id || `COST${index + 1}`),
        item: String(item?.item || '').trim(),
        content: String(item?.content || '').trim(),
        supplier: String(item?.supplier || '').trim(),
        payeeAccountId: String(item?.payeeAccountId || '').trim(),
        payeeAccountType: String(item?.payeeAccountType || '').trim(),
        linkedEmployeeUsername: String(item?.linkedEmployeeUsername || '').trim(),
        amount: assertMoney(item?.amount, `第${index + 1}条实际成本`)
    })).map((item, index) => {
        if (!item.supplier) throw new Error(`第${index + 1}条真实供应商不能为空`);
        return item;
    });
}

function projectExtraDebtEligibility({ originalProjectId, username, requestedClientId = '', applications = [], payments = [], bonusConfirmations = [] }) {
    const projectId = String(originalProjectId || '').trim();
    const originalProject = (applications || []).find(app => app.id === projectId);
    if (!originalProject) return { eligible: false, statusCode: 400, reason: '关联原项目不存在', originalProject: null };
    if (originalProject.applicant !== username) return { eligible: false, reason: '项目额外欠款只能关联本人项目', originalProject };
    if (originalProject.status === 'closed') return { eligible: false, reason: `原项目 ${projectId} 已关闭，不能追加项目额外欠款；请改走无项目欠款并在业务说明中记录原项目编号`, originalProject };
    if (originalProject.status !== 'approved') return { eligible: false, reason: `项目额外欠款只能关联已通过的原项目；当前状态为 ${originalProject.status || '未知'}`, originalProject };
    if (!originalProject.clientId) return { eligible: false, statusCode: 400, reason: '原项目尚未确认稳定甲方，请先联系 Admin 逐条确认', originalProject };
    const submittedClientId = String(requestedClientId || '').trim();
    if (submittedClientId && submittedClientId !== originalProject.clientId) return { eligible: false, reason: '项目额外欠款的甲方必须由原项目继承，不能使用请求中的其他甲方', originalProject };
    const projectPaymentIds = new Set((payments || []).filter(payment => payment?.projectId === projectId).map(payment => String(payment?.id || '')).filter(Boolean));
    const finalizedBonus = (bonusConfirmations || []).find(record => {
        if (record?.status !== 'locked') return false;
        return String(record?.applicationId || '') === projectId || projectPaymentIds.has(String(record?.paymentId || ''));
    });
    if (finalizedBonus) return { eligible: false, reason: `原项目业务奖金或执行奖金已由 Admin 确认（${finalizedBonus.id || projectId}），不能追加项目额外欠款；请改走无项目欠款并在业务说明中记录原项目编号`, originalProject };
    return { eligible: true, reason: '', originalProject };
}

function assertProjectExtraDebtEligible(options) {
    const result = projectExtraDebtEligibility(options);
    if (!result.eligible) {
        const error = new Error(result.reason);
        error.statusCode = result.statusCode || 409;
        throw error;
    }
    return result.originalProject;
}

function createDebtRecord(input, context) {
    const type = input?.type === 'project-extra' ? 'project-extra' : 'standalone';
    let clientId = String(input?.clientId || '').trim();
    let clientNameSnapshot = String(input?.clientNameSnapshot || input?.partyA || '').trim();
    let partyA = String(input?.partyA || '').trim();
    const title = String(input?.title || '').trim();
    const businessDescription = String(input?.businessDescription || '').trim();
    const businessBasis = String(input?.businessBasis || '').trim();
    const approver = String(input?.approver || '').trim();
    if (!title) throw new Error('欠款事项不能为空');
    if (!businessDescription) throw new Error('业务说明与证明不能为空');
    if (!approver) throw new Error('审批人不能为空');

    const costItems = normalizeCostItems((input?.costItems || []).map(item => ({ ...item, id: '' })));
    const totalActualCost = roundMoney(costItems.reduce((sum, item) => sum + item.amount, 0));
    const principal = assertMoney(input?.principal, '含税欠款金额');
    const financials = calculateDebtFinancials({ principal, totalActualCost });
    if (financials.profit < 0) throw new Error('欠款利润不能为负数');

    let originalProjectId = '';
    let reason = '';
    if (type === 'project-extra') {
        originalProjectId = String(input?.originalProjectId || '').trim();
        reason = String(input?.reason || '').trim();
        const originalProject = assertProjectExtraDebtEligible({
            originalProjectId,
            username: context.username,
            requestedClientId: clientId,
            applications: context.applications,
            payments: context.payments,
            bonusConfirmations: context.bonusConfirmations
        });
        clientId = String(originalProject.clientId || '').trim();
        clientNameSnapshot = String(originalProject.clientNameSnapshot || originalProject.partyA || '').trim();
        partyA = String(originalProject.partyA || originalProject.clientNameSnapshot || '').trim();
        if (!reason) throw new Error('项目额外欠款必须填写追加原因');
    }
    if (!clientId || !clientNameSnapshot || !partyA) throw new Error('请选择已启用甲方');

    const now = context.now || new Date().toLocaleString('zh-CN');
    return {
        id: context.id,
        type,
        title,
        businessDescription,
        businessBasis,
        clientId,
        clientNameSnapshot,
        partyA,
        originalProjectId,
        reason,
        applicant: context.username,
        owner: context.username,
        approver,
        costItems,
        attachments: Array.isArray(input?.attachments) ? input.attachments : [],
        ...financials,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        reviewRecords: []
    };
}

function resolveServiceFeeRate(config, itemName) {
    return serviceFeeRateForItemName(config?.serviceFeeRates, itemName);
}

function createDebtLinks({ requestedLinks, debts, applications, payments = [], clientId, username, config, nextLinkId }) {
    const seen = new Set();
    return (requestedLinks || []).map((requested, index) => {
        const debtId = String(requested?.debtId || '').trim();
        if (!debtId) throw new Error(`第${index + 1}条欠款关联缺少欠款编号`);
        if (seen.has(debtId)) throw new Error(`同一项目不能重复关联欠款 ${debtId}；请合并金额`);
        seen.add(debtId);
        const debt = (debts || []).find(item => item.id === debtId);
        if (!debt) throw new Error(`欠款 ${debtId} 不存在`);
        if (debt.status !== 'approved') throw new Error(`欠款 ${debtId} 尚未审核通过`);
        if (debt.applicant !== username) throw new Error(`无权关联欠款 ${debtId}`);
        if (!clientId || !debt.clientId) throw new Error(`欠款 ${debtId} 尚未确认稳定甲方，请先联系 Admin 逐条确认`);
        if (debt.clientId !== clientId) throw new Error(`欠款 ${debtId} 与项目甲方不一致`);

        const balances = debtBalances(debt, applications, payments);
        const principal = assertMoney(requested?.principal, `欠款 ${debtId} 本次归还本金`);
        if (principal > balances.remainingPrincipal + 0.001) throw new Error(`欠款 ${debtId} 归还本金超过剩余额度`);
        const isFinal = Math.abs(principal - balances.remainingPrincipal) < 0.01;
        const ratio = principal / toNumber(debt.principal);
        const costAllocations = (debt.costItems || []).map(cost => {
            const prior = debtLinksForDebt(applications, debt.id).reduce((sum, entry) => {
                const found = (entry.link.costAllocations || []).find(item => item.costItemId === cost.id);
                return sum + toNumber(found?.amount);
            }, 0);
            const amount = isFinal
                ? positiveMoney(toNumber(cost.amount) - prior)
                : roundMoney(toNumber(cost.amount) * ratio);
            return {
                costItemId: cost.id,
                item: cost.item || '',
                content: cost.content || '',
                supplier: cost.supplier,
                payeeAccountId: cost.payeeAccountId || '',
                payeeAccountType: cost.payeeAccountType || '',
                linkedEmployeeUsername: cost.linkedEmployeeUsername || '',
                originalAmount: roundMoney(cost.amount),
                amount
            };
        });
        const allocatedCost = roundMoney(costAllocations.reduce((sum, item) => sum + item.amount, 0));
        if (allocatedCost > balances.remainingCost + 0.01) throw new Error(`欠款 ${debtId} 分摊成本超过剩余成本`);
        const itemName = String(requested?.itemName || '其他').trim() || '其他';
        const content = String(requested?.content || '').trim();
        const serviceFeeRateSnapshot = resolveServiceFeeRate(config, itemName);
        const serviceFee = roundMoney(principal * serviceFeeRateSnapshot);
        const linkId = nextLinkId();
        const now = new Date().toLocaleString('zh-CN');
        return {
            id: linkId,
            debtId,
            debtTitle: debt.title || '',
            itemName,
            content,
            principal,
            originalPrincipal: roundMoney(debt.principal),
            serviceFeeRateSnapshot,
            serviceFee,
            kpiCost: roundMoney(principal + serviceFee),
            ratio,
            allocatedCost,
            costAllocations,
            realSuppliers: [...new Set(costAllocations.map(item => item.supplier).filter(Boolean))],
            linkedAt: now,
            occupationStatus: 'reserved',
            receivedPrincipal: 0,
            receiptRecords: [],
            receivedAt: '',
            submissionSnapshot: {
                debtPrincipal: roundMoney(debt.principal),
                includedPrincipal: principal,
                remainingPrincipal: positiveMoney(balances.remainingPrincipal - principal),
                source: 'project-plan'
            }
        };
    });
}

function debtKpiItem(link, amount = link?.principal, serviceFee = link?.serviceFee) {
    return {
        item: link?.itemName || '其他',
        content: !link?.content
            ? '归还欠款'
            : (String(link.content).startsWith('归还欠款') ? link.content : `归还欠款：${link.content}`),
        supplier: DEBT_SUPPLIER_LABEL,
        supplierType: 'system-debt',
        amount: roundMoney(amount),
        serviceFee: roundMoney(serviceFee),
        isProxy: '是',
        isDebtRepayment: true,
        debtId: link?.debtId,
        debtLinkId: link?.id
    };
}

function buildDebtKpiItems(links) {
    return (links || []).map(link => debtKpiItem(link));
}

function buildDebtPaymentKpiItems(repayments, links) {
    return (repayments || []).map(detail => {
        const link = (links || []).find(item => String(item?.id || '') === String(detail?.debtLinkId || '')) || detail;
        return debtKpiItem(link, detail?.confirmedPrincipal, detail?.serviceFee);
    });
}

function debtLifecycleStatus(debt, balances, links) {
    if (debt?.status === 'pending') return { key: 'pending', text: '待审批' };
    if (debt?.status === 'rejected') return { key: 'rejected', text: '已驳回' };
    if (debt?.status !== 'approved') return { key: debt?.status || 'unknown', text: debt?.status || '未知状态' };
    if (balances.receivedPrincipal >= toNumber(debt.principal) - 0.001) return { key: 'completed', text: '已完成' };
    if (balances.receivedPrincipal > 0) return { key: 'partially_completed', text: '部分完成' };
    if (balances.effectivePrincipal <= 0) return { key: 'awaiting_project', text: '待计入项目' };
    if (links.some(link => link.projectStatus === 'pending')) return { key: 'in_progress', text: '进行中' };
    if (links.some(link => link.projectStatus === 'approved' && link.paymentStatus !== 'approved')) return { key: 'awaiting_repayment', text: '待还款' };
    return { key: 'in_progress', text: '进行中' };
}

function historicalDebtLinks(debt, applications, payments = []) {
    return (applications || []).flatMap(app => {
        if (app?.status !== 'closed') return [];
        return (app.debtLinks || []).filter(link => link?.debtId === debt?.id).map(link => {
            const paymentDetails = paymentsForProject(payments, app.id).map(payment => {
                const detail = Array.isArray(payment?.debtRepayments)
                    ? payment.debtRepayments.find(item => String(item?.debtLinkId || '') === String(link?.id || ''))
                    : null;
                const legacyApproved = payment?.status === 'approved' && !Array.isArray(payment?.debtRepayments);
                return {
                    paymentId: payment?.id || '',
                    status: payment?.status || '',
                    principal: positiveMoney(detail ? detail.confirmedPrincipal : (legacyApproved ? link?.principal : 0)),
                    allocatedCost: positiveMoney(detail ? detail.allocatedCost : (legacyApproved ? link?.allocatedCost : 0)),
                    debtRepayments: Array.isArray(payment?.debtRepayments) ? payment.debtRepayments : null,
                    debtSubmissionSnapshot: Array.isArray(payment?.debtSubmissionSnapshot) ? payment.debtSubmissionSnapshot : null,
                    attachments: Array.isArray(payment?.attachments) ? payment.attachments : [],
                    projectClosure: payment?.projectClosure || null,
                    approvedAt: payment?.approveTime || payment?.updatedAt || ''
                };
            });
            const projectSnapshot = Array.isArray(app.debtSubmissionSnapshot)
                ? app.debtSubmissionSnapshot.find(item => String(item?.debtLinkId || '') === String(link?.id || '')) || null
                : null;
            const closureAudit = link.projectClosure || app.projectClosure || null;
            return {
                ...link,
                projectId: app.id || '',
                projectName: app.projectName || '',
                projectStatus: app.status || '',
                originalProjectStatus: app.projectClosure?.originalStatus || '',
                application: app,
                debtLink: link,
                projectSnapshot,
                projectClosure: closureAudit,
                closureAudit,
                paymentDetails
            };
        });
    });
}

function debtView(debt, applications, payments = []) {
    const balances = debtBalances(debt, applications, payments);
    const links = effectiveDebtEntries(debt, applications, payments).map(entry => ({
        ...entry.link,
        projectId: entry.app.id,
        projectName: entry.app.projectName || '',
        projectStatus: entry.app.status,
        paymentStatus: paymentStatusForProject(payments, entry.app.id),
        paymentId: approvedPaymentsForProject(payments, entry.app.id)[0]?.id || '',
        paymentIds: approvedPaymentsForProject(payments, entry.app.id).map(payment => payment.id).filter(Boolean),
        paymentDetails: approvedPaymentsForProject(payments, entry.app.id).map(payment => ({ paymentId: payment.id || '', status: payment.status, principal: positiveMoney((Array.isArray(payment.debtRepayments) ? payment.debtRepayments.find(item => String(item?.debtLinkId || '') === String(entry.link.id || ''))?.confirmedPrincipal : entry.link.principal)), allocatedCost: positiveMoney((Array.isArray(payment.debtRepayments) ? payment.debtRepayments.find(item => String(item?.debtLinkId || '') === String(entry.link.id || ''))?.allocatedCost : entry.link.allocatedCost)), approvedAt: payment.approveTime || payment.updatedAt || '' })),
        effectivePrincipal: entry.effectivePrincipal,
        approvedPrincipal: entry.approvedPrincipal,
        pendingPrincipal: entry.pendingPrincipal,
        effectiveSource: entry.source,
        receivedPrincipal: entry.approvedPrincipal,
        occupationStatus: entry.source === 'pending-payment' ? 'pending_repayment' : (entry.approvedPrincipal > 0 ? 'partially_received' : (entry.app.status === 'approved' ? 'included_pending_repayment' : 'reserved'))
    }));
    const historicalLinks = historicalDebtLinks(debt, applications, payments);
    const lifecycle = debtLifecycleStatus(debt, balances, links);
    return { ...debt, ...balances, lifecycleStatus: lifecycle.key, lifecycleStatusText: lifecycle.text, links, historicalLinks };
}

function confirmDebtLinksByPayment(app, payment, reviewer, now = new Date().toLocaleString('zh-CN')) {
    if (!app || app.status !== 'approved' || !payment || payment.status !== 'approved') return [];
    const details = Array.isArray(payment.debtRepayments) ? payment.debtRepayments : null;
    if (!details) {
        return (app.debtLinks || []).map(link => {
            const principal = positiveMoney(link.principal);
            const previous = Math.min(principal, positiveMoney(link.receivedPrincipal));
            const delta = positiveMoney(principal - previous);
            link.receivedPrincipal = principal;
            link.receiptRecords = Array.isArray(link.receiptRecords) ? link.receiptRecords : [];
            if (delta > 0) link.receiptRecords.push({ amount: delta, confirmedBy: reviewer, confirmedAt: now, source: 'payment-approved', paymentId: payment.id || '' });
            link.receivedAt = now;
            link.occupationStatus = 'received';
            return { linkId: link.id, debtId: link.debtId, amount: delta };
        });
    }
    return details.map(detail => {
        const link = (app.debtLinks || []).find(item => item.id === detail.debtLinkId);
        if (!link) return null;
        const amount = positiveMoney(detail.confirmedPrincipal);
        const prior = positiveMoney(link.receivedPrincipal);
        link.confirmationMode = 'payment-detail-v1';
        link.receivedPrincipal = roundMoney(prior + amount);
        link.receiptRecords = Array.isArray(link.receiptRecords) ? link.receiptRecords : [];
        if (amount > 0) link.receiptRecords.push({ amount, allocatedCost: positiveMoney(detail.allocatedCost), confirmedBy: reviewer, confirmedAt: now, source: 'payment-approved-detail', paymentId: payment.id || '' });
        link.receivedAt = amount > 0 ? now : link.receivedAt || '';
        link.occupationStatus = link.receivedPrincipal > 0 ? 'partially_received' : 'included_pending_repayment';
        return { linkId: link.id, debtId: link.debtId, amount };
    }).filter(Boolean);
}
module.exports = {
    DEBT_AMOUNT_BASIS_TAX_INCLUSIVE,
    DEBT_SUPPLIER_LABEL,
    DEBT_SUPPLIER_VALUE,
    activeApplicationStatus,
    assertMoney,
    buildDebtKpiItems,
    buildDebtPaymentKpiItems,
    buildDebtPaymentSnapshot,
    calculateDebtFinancials,
    confirmDebtLinksByPayment,
    costReservationTotals,
    createDebtLinks,
    createDebtRecord,
    assertProjectExtraDebtEligible,
    debtBalances,
    effectiveDebtEntries,
    debtLifecycleStatus,
    debtView,
    normalizeText,
    positiveMoney,
    projectExtraDebtEligibility,
    resolveServiceFeeRate,
    roundMoney,
    toNumber
};
