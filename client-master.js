function cleanClientText(value, maxLength, label) {
    const text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`);
    return text;
}

function normalizeClientName(value) {
    return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
}

function parseClientAliases(value) {
    const source = Array.isArray(value) ? value : String(value ?? '').split(/[，,、;；\n\r]+/);
    const aliases = [];
    const seen = new Set();
    source.forEach(item => {
        const alias = cleanClientText(item, 120, '甲方别名');
        if (!alias) return;
        const normalized = normalizeClientName(alias);
        if (seen.has(normalized)) return;
        seen.add(normalized);
        aliases.push(alias);
    });
    if (aliases.length > 20) throw new Error('甲方别名不能超过 20 个');
    return aliases;
}

function clientNames(client) {
    return [client?.fullName, ...(Array.isArray(client?.aliases) ? client.aliases : [])]
        .map(value => ({ value: String(value || '').trim(), normalized: normalizeClientName(value) }))
        .filter(item => item.normalized);
}

function validateClientInput(input, clients = [], currentId = '') {
    const fullName = cleanClientText(input?.fullName, 120, '甲方全称');
    const note = cleanClientText(input?.note, 500, '甲方备注');
    const aliases = parseClientAliases(input?.aliases);
    if (!fullName) throw new Error('甲方全称不能为空');

    const ownNames = clientNames({ fullName, aliases });
    const ownSeen = new Map();
    ownNames.forEach(item => {
        if (ownSeen.has(item.normalized)) {
            throw new Error(`甲方全称和别名不能重复：${item.value}`);
        }
        ownSeen.set(item.normalized, item.value);
    });

    const occupied = new Map();
    (clients || []).filter(client => client?.id !== currentId).forEach(client => {
        clientNames(client).forEach(item => occupied.set(item.normalized, client));
    });
    ownNames.forEach(item => {
        const conflict = occupied.get(item.normalized);
        if (conflict) {
            throw new Error(`甲方名称“${item.value}”已被 ${conflict.code || conflict.id || '其他甲方'} 使用`);
        }
    });

    return { fullName, aliases, note };
}

function createClientRecord(input, context) {
    const fields = validateClientInput(input, context.clients, '');
    const now = context.now || new Date().toLocaleString('zh-CN');
    return {
        id: context.id,
        code: context.id,
        ...fields,
        enabled: input?.enabled !== false,
        createdBy: context.username,
        createdAt: now,
        updatedBy: context.username,
        updatedAt: now
    };
}

function updateClientRecord(existing, input, context) {
    if (!existing) throw new Error('甲方不存在');
    const merged = {
        fullName: input?.fullName === undefined ? existing.fullName : input.fullName,
        aliases: input?.aliases === undefined ? existing.aliases : input.aliases,
        note: input?.note === undefined ? existing.note : input.note
    };
    const fields = validateClientInput(merged, context.clients, existing.id);
    const now = context.now || new Date().toLocaleString('zh-CN');
    return {
        ...existing,
        ...fields,
        enabled: input?.enabled === undefined ? existing.enabled !== false : input.enabled !== false,
        updatedBy: context.username,
        updatedAt: now
    };
}

function activeClientView(client) {
    return {
        id: client.id,
        code: client.code || client.id,
        fullName: client.fullName,
        displayName: client.fullName
    };
}

function resolveActiveClient(clients, clientId) {
    const id = String(clientId || '').trim();
    if (!id) throw new Error('请选择已启用甲方');
    const client = (clients || []).find(item => item.id === id);
    if (!client) throw new Error('所选甲方不存在');
    if (client.enabled === false) throw new Error('所选甲方已停用，请联系 Admin');
    return client;
}

function applyClientSnapshot(record, client) {
    record.clientId = client.id;
    record.clientNameSnapshot = client.fullName;
    record.partyA = client.fullName;
    return record;
}

function bindLegacyClient(record, client, context) {
    if (!record) throw new Error('历史记录不存在');
    if (record.clientId) throw new Error('该历史记录已确认甲方，不能重复绑定');
    const now = context.now || new Date().toLocaleString('zh-CN');
    const originalName = String(record.partyA || record.clientNameSnapshot || '').trim();
    record.clientId = client.id;
    record.clientNameSnapshot = originalName || client.fullName;
    if (!record.partyA) record.partyA = originalName || client.fullName;
    record.clientBindingAudit = {
        clientId: client.id,
        clientCodeSnapshot: client.code || client.id,
        clientFullNameSnapshot: client.fullName,
        originalNameSnapshot: originalName,
        confirmedBy: context.username,
        confirmedAt: now
    };
    return record;
}

module.exports = {
    activeClientView,
    applyClientSnapshot,
    bindLegacyClient,
    clientNames,
    createClientRecord,
    normalizeClientName,
    parseClientAliases,
    resolveActiveClient,
    updateClientRecord,
    validateClientInput
};
