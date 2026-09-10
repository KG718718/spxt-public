const fsDefault = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readOptionalJson } = require('./public-startup');
const { createSmtpSecretStore } = require('./smtp-secret-store');

const DEFAULT_CONFIG = {
    enabled: false,
    dryRun: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    senderName: 'K⁺-SESSION 审批提醒',
    senderAddress: '',
    publicBaseUrl: '',
    timeoutMs: 10000,
    accountEmails: {},
    reviewRecipients: {
        debt: [],
        application: [],
        payment: [],
        invoice: []
    },
    reminderTypes: {
        debtTodo: true,
        debtResult: true,
        applicationTodo: true,
        applicationResult: true,
        paymentTodo: true,
        paymentResult: true,
        invoiceTodo: true,
        invoiceResult: true,
        businessBonus: true,
        executionExpense: true,
        employeeSettlement: true,
        monthlyGap: true
    }
};

function uniqueEmails(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [values])
        .flatMap(value => String(value || '').split(/[;,，；\s]+/))
        .map(value => value.trim().toLowerCase())
        .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        .filter(value => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
}

function maskEmail(value) {
    const email = String(value || '');
    const at = email.indexOf('@');
    if (at <= 1) return email ? '***' : '';
    return `${email.slice(0, 2)}***${email.slice(Math.max(2, at - 1))}`;
}

function sanitizeText(value) {
    return String(value ?? '')
        .replace(/(?:[A-Za-z]:\\|file:\/\/)[^\s<>"']+/gi, '[本地路径已隐藏]')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .trim();
}

function escapeHtml(value) {
    return sanitizeText(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderSummaryEmail({ title, intro = '', fields = [], rows = [], link = '', footer = '' }) {
    const cleanTitle = sanitizeText(title);
    const cleanIntro = sanitizeText(intro);
    const cleanLink = /^https?:\/\//i.test(String(link || '')) ? String(link).trim() : '';
    const cleanFields = (fields || []).map(item => ({
        label: sanitizeText(item?.label),
        value: sanitizeText(item?.value)
    })).filter(item => item.label && item.value);
    const cleanRows = (rows || []).map(row => ({
        label: sanitizeText(row?.label),
        value: sanitizeText(row?.value)
    })).filter(row => row.label || row.value);

    const textLines = [cleanTitle, cleanIntro, '']
        .concat(cleanFields.map(item => `${item.label}：${item.value}`));
    if (cleanRows.length) {
        textLines.push('', '明细：', ...cleanRows.map(row => `- ${row.label}${row.label && row.value ? '：' : ''}${row.value}`));
    }
    if (cleanLink) textLines.push('', `系统入口：${cleanLink}`);
    if (footer) textLines.push('', sanitizeText(footer));

    const fieldHtml = cleanFields.map(item => `
        <tr>
            <td style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:700;white-space:nowrap">${escapeHtml(item.label)}</td>
            <td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(item.value)}</td>
        </tr>`).join('');
    const rowsHtml = cleanRows.length ? `
        <h3 style="margin:22px 0 8px">明细</h3>
        <table style="width:100%;border-collapse:collapse">
            ${cleanRows.map(row => `<tr><td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(row.label)}</td><td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(row.value)}</td></tr>`).join('')}
        </table>` : '';
    const linkHtml = cleanLink ? `<p style="margin-top:22px"><a href="${escapeHtml(cleanLink)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:4px">进入 K⁺-SESSION</a></p>` : '';

    return {
        text: textLines.filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n').trim(),
        html: `<!doctype html><html><body style="font-family:Arial,'Microsoft YaHei',sans-serif;color:#111;line-height:1.6"><div style="max-width:760px;margin:0 auto;padding:24px"><h2 style="margin:0 0 12px">${escapeHtml(cleanTitle)}</h2>${cleanIntro ? `<p>${escapeHtml(cleanIntro)}</p>` : ''}<table style="width:100%;border-collapse:collapse">${fieldHtml}</table>${rowsHtml}${linkHtml}${footer ? `<p style="margin-top:24px;color:#666;font-size:13px">${escapeHtml(footer)}</p>` : ''}</div></body></html>`
    };
}

function validateMailConfig(raw) {
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const invalid = () => { throw Object.assign(new Error('邮件配置结构非法；不会按默认配置覆盖原文件。'), { code: 'MAIL_CONFIG_INVALID' }); };
    if (!object(raw)) invalid();
    for (const key of ['accountEmails', 'reviewRecipients', 'reminderTypes']) {
        if (Object.hasOwn(raw, key) && !object(raw[key])) invalid();
    }
    for (const key of ['enabled', 'dryRun', 'formalEnabled', 'smtpSecure']) {
        if (Object.hasOwn(raw, key) && typeof raw[key] !== 'boolean') invalid();
    }
    for (const key of ['smtpHost', 'senderName', 'senderAddress', 'publicBaseUrl']) {
        if (Object.hasOwn(raw, key) && typeof raw[key] !== 'string') invalid();
    }
    if (Object.hasOwn(raw, 'smtpPort') && (!Number.isInteger(raw.smtpPort) || raw.smtpPort < 1 || raw.smtpPort > 65535)) invalid();
    if (Object.hasOwn(raw, 'timeoutMs') && (!Number.isFinite(raw.timeoutMs) || raw.timeoutMs < 3000 || raw.timeoutMs > 30000)) invalid();
    if (Object.values(raw.accountEmails || {}).some(value => typeof value !== 'string')) invalid();
    if (Object.values(raw.reviewRecipients || {}).some(value => !Array.isArray(value) || value.some(item => typeof item !== 'string'))) invalid();
    if (Object.values(raw.reminderTypes || {}).some(value => typeof value !== 'boolean')) invalid();
    return raw;
}

function mergeConfig(raw = {}) {
    const merged = {
        ...DEFAULT_CONFIG,
        ...raw,
        accountEmails: { ...DEFAULT_CONFIG.accountEmails, ...(raw.accountEmails || {}) },
        reviewRecipients: {
            ...DEFAULT_CONFIG.reviewRecipients,
            ...(raw.reviewRecipients || {})
        },
        reminderTypes: {
            ...DEFAULT_CONFIG.reminderTypes,
            ...(raw.reminderTypes || {})
        }
    };
    merged.formalEnabled = raw.formalEnabled === undefined
        ? Boolean(raw.enabled) && raw.dryRun === false
        : raw.formalEnabled === true;
    return merged;
}

function createMailReminderService(baseDir, options = {}) {
    const fs = options.fs || fsDefault;
    const env = options.env || process.env;
    const configFile = env.KSESSION_MAIL_CONFIG_FILE || path.join(baseDir, 'mail-reminder.config.json');
    const logFile = env.KSESSION_MAIL_LOG_FILE || path.join(baseDir, 'logs', 'mail-reminders.log');
    const smtpSecretStore = options.secretStore || createSmtpSecretStore(baseDir);
    const pendingEventKeys = new Set();

    function loadConfig() {
        const stored = readOptionalJson(configFile, '邮件配置', fs);
        const local = stored.exists ? validateMailConfig(stored.value) : {};
        const merged = mergeConfig(local);
        if (env.KSESSION_MAIL_ENABLED !== undefined) merged.enabled = /^(1|true|yes)$/i.test(env.KSESSION_MAIL_ENABLED);
        if (env.KSESSION_MAIL_DRY_RUN !== undefined) merged.dryRun = /^(1|true|yes)$/i.test(env.KSESSION_MAIL_DRY_RUN);
        if (env.KSESSION_MAIL_FORMAL_ENABLED !== undefined) {
            merged.formalEnabled = /^(1|true|yes)$/i.test(env.KSESSION_MAIL_FORMAL_ENABLED);
        } else if (env.KSESSION_MAIL_ENABLED !== undefined || env.KSESSION_MAIL_DRY_RUN !== undefined) {
            merged.formalEnabled = Boolean(merged.enabled) && merged.dryRun === false;
        }
        if (env.KSESSION_SMTP_HOST) merged.smtpHost = env.KSESSION_SMTP_HOST;
        if (env.KSESSION_SMTP_PORT) merged.smtpPort = Number(env.KSESSION_SMTP_PORT) || merged.smtpPort;
        if (env.KSESSION_SMTP_SECURE !== undefined) merged.smtpSecure = /^(1|true|yes)$/i.test(env.KSESSION_SMTP_SECURE);
        if (env.KSESSION_MAIL_FROM_ADDRESS) merged.senderAddress = env.KSESSION_MAIL_FROM_ADDRESS;
        if (env.KSESSION_MAIL_FROM_NAME) merged.senderName = env.KSESSION_MAIL_FROM_NAME;
        if (env.KSESSION_PUBLIC_BASE_URL) merged.publicBaseUrl = env.KSESSION_PUBLIC_BASE_URL;
        return merged;
    }

    function appendLog(entry) {
        try {
            fs.mkdirSync(path.dirname(logFile), { recursive: true });
            const safeEntry = {
                time: new Date().toISOString(),
                eventKey: sanitizeText(entry.eventKey),
                type: sanitizeText(entry.type),
                entityId: sanitizeText(entry.entityId),
                recipients: uniqueEmails(entry.recipients || []).map(maskEmail),
                status: sanitizeText(entry.status),
                error: sanitizeText(entry.error).slice(0, 500)
            };
            fs.appendFileSync(logFile, `${JSON.stringify(safeEntry)}\n`, 'utf8');
        } catch (error) {
            console.error('[邮件提醒] 写入日志失败:', error.message);
        }
    }

    function readLogs(limit = 50) {
        try {
            if (!fs.existsSync(logFile)) return [];
            return fs.readFileSync(logFile, 'utf8')
                .split(/\r?\n/)
                .filter(Boolean)
                .slice(-Math.min(Math.max(Number(limit) || 50, 1), 200))
                .reverse()
                .map(line => {
                    try { return JSON.parse(line); } catch (error) { return null; }
                })
                .filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    function publicConfig() {
        const cfg = loadConfig();
        return {
            enabled: !!cfg.enabled,
            dryRun: !!cfg.dryRun,
            formalEnabled: cfg.formalEnabled === true,
            smtpHost: cfg.smtpHost,
            smtpPort: Number(cfg.smtpPort) || 465,
            smtpSecure: cfg.smtpSecure !== false,
            senderName: cfg.senderName,
            senderAddress: cfg.senderAddress,
            publicBaseUrl: cfg.publicBaseUrl,
            timeoutMs: Number(cfg.timeoutMs) || 10000,
            accountEmails: cfg.accountEmails || {},
            reviewRecipients: cfg.reviewRecipients || DEFAULT_CONFIG.reviewRecipients,
            reminderTypes: cfg.reminderTypes || DEFAULT_CONFIG.reminderTypes,
            smtpUserConfigured: !!env.KSESSION_SMTP_USER,
            smtpPasswordConfigured: smtpSecretStore.status() !== '未配置',
            smtpPasswordStatus: smtpSecretStore.status(),
            configFileExists: fs.existsSync(configFile)
        };
    }

    function savePublicConfig(input = {}) {
        const current = loadConfig();
        const formalEnabled = input.formalEnabled === undefined
            ? (input.enabled === true && input.dryRun === false)
            : input.formalEnabled === true;
        const allowed = {
            formalEnabled,
            enabled: input.enabled === undefined ? formalEnabled : input.enabled === true,
            dryRun: input.dryRun === undefined ? false : input.dryRun !== false,
            smtpHost: sanitizeText(input.smtpHost || current.smtpHost),
            smtpPort: Number(input.smtpPort) || 465,
            smtpSecure: input.smtpSecure !== false,
            senderName: sanitizeText(input.senderName || current.senderName),
            senderAddress: uniqueEmails(input.senderAddress || '')[0] || '',
            publicBaseUrl: /^https?:\/\//i.test(String(input.publicBaseUrl || '')) ? String(input.publicBaseUrl).trim().replace(/\/$/, '') : current.publicBaseUrl,
            timeoutMs: Math.min(Math.max(Number(input.timeoutMs) || 10000, 3000), 30000),
            accountEmails: {},
            reviewRecipients: {
                debt: uniqueEmails(input.reviewRecipients?.debt || []),
                application: uniqueEmails(input.reviewRecipients?.application || []),
                payment: uniqueEmails(input.reviewRecipients?.payment || []),
                invoice: uniqueEmails(input.reviewRecipients?.invoice || [])
            },
            reminderTypes: {
                ...DEFAULT_CONFIG.reminderTypes,
                ...(input.reminderTypes || {})
            }
        };
        Object.entries(input.accountEmails || {}).forEach(([username, email]) => {
            const safeUsername = sanitizeText(username);
            const safeEmail = uniqueEmails(email)[0];
            if (safeUsername && safeEmail) allowed.accountEmails[safeUsername] = safeEmail;
        });
        validateMailConfig(allowed);
        fs.mkdirSync(path.dirname(configFile), { recursive: true });
        const temporaryFile = configFile + '.' + crypto.randomBytes(16).toString('hex') + '.tmp';
        let descriptor;
        try {
            descriptor = fs.openSync(temporaryFile, 'wx', 0o600);
            fs.writeFileSync(descriptor, JSON.stringify(allowed, null, 2), 'utf8');
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = undefined;
            validateMailConfig(JSON.parse(fs.readFileSync(temporaryFile, 'utf8')));
            fs.renameSync(temporaryFile, configFile);
        } finally {
            if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch {} }
            try { fs.unlinkSync(temporaryFile); } catch (error) { if (error.code !== 'ENOENT') console.error('[邮件配置] 临时文件清理失败'); }
        }
        return publicConfig();
    }

    function saveSmtpPassword(value) {
        return smtpSecretStore.save(value);
    }

    function clearSmtpPassword() {
        return smtpSecretStore.clear();
    }

    function emailForUsername(username) {
        const cfg = loadConfig();
        const target = String(username || '').trim().toLowerCase();
        const entry = Object.entries(cfg.accountEmails || {}).find(([name]) => String(name).trim().toLowerCase() === target);
        return entry ? uniqueEmails(entry[1])[0] || '' : '';
    }

    function recipientsForReview(type, approver = '') {
        const cfg = loadConfig();
        return uniqueEmails([
            emailForUsername(approver),
            ...(cfg.reviewRecipients?.[type] || [])
        ]);
    }

    function typeEnabled(type) {
        const cfg = loadConfig();
        return cfg.reminderTypes?.[type] !== false;
    }

    function formalPreflight(type, to) {
        const cfg = loadConfig();
        const recipients = uniqueEmails(to);
        if (cfg.formalEnabled !== true) {
            return { allowed: false, status: 'skipped', reasonCode: 'global_disabled', reason: '正式发送总开关已关闭', recipients };
        }
        if (!typeEnabled(type)) {
            return { allowed: false, status: 'skipped', reasonCode: 'type_disabled', reason: '对应邮件类型开关已关闭', recipients };
        }
        if (!recipients.length) {
            return { allowed: false, status: 'skipped', reasonCode: 'no_recipient', reason: '没有有效收件邮箱', recipients };
        }
        return { allowed: true, status: 'ready', reasonCode: '', reason: '', recipients };
    }

    function safeSmtpError(error) {
        return /^SMTP授权码安全存储无法解密/.test(String(error?.message || ''))
            ? 'SMTP授权码安全存储无法解密，请在服务器本机重新配置'
            : /^SMTP账号或授权码未/.test(String(error?.message || ''))
                ? 'SMTP账号或授权码未配置'
                : /^缺少 nodemailer 依赖/.test(String(error?.message || ''))
                    ? '缺少邮件发送依赖，请联系系统管理员'
                    : 'SMTP邮件发送失败，请检查邮件配置和网络';
    }

    async function smtpSend({ type, entityId, to, subject, text, html }) {
        const cfg = loadConfig();
        const recipients = uniqueEmails(to);
        if (!recipients.length) return { success: false, error: '没有有效收件邮箱', recipients };
        try {
            if (!String(cfg.smtpHost || '').trim()) throw new Error('SMTP服务器未配置');
            const smtpUser = env.KSESSION_SMTP_USER || cfg.senderAddress;
            const smtpSecret = smtpSecretStore.resolve();
            const smtpPass = smtpSecret.value;
            if (!smtpUser || !smtpPass) throw new Error('SMTP账号或授权码未配置');
            const cleanSubject = sanitizeText(subject).slice(0, 180);
            const cleanText = sanitizeText(text);
            const testTransportFile = env.KSESSION_ENABLE_TEST_RESET === '1'
                ? String(env.KSESSION_MAIL_TEST_TRANSPORT_FILE || '').trim()
                : '';
            let info;
            if (testTransportFile) {
                if (env.KSESSION_MAIL_TEST_TRANSPORT_MODE === 'fail') throw new Error('隔离假SMTP模拟失败');
                fs.mkdirSync(path.dirname(testTransportFile), { recursive: true });
                const messageId = `isolated-${Date.now()}-${Math.random().toString(16).slice(2)}@k-session.test`;
                fs.appendFileSync(testTransportFile, `${JSON.stringify({
                    time: new Date().toISOString(),
                    type: sanitizeText(type),
                    entityId: sanitizeText(entityId),
                    from: { name: sanitizeText(cfg.senderName || 'K⁺-SESSION 审批提醒'), address: cfg.senderAddress || smtpUser },
                    to: recipients,
                    subject: cleanSubject,
                    text: cleanText,
                    html: String(html || ''),
                    messageId
                })}\n`, 'utf8');
                info = { messageId };
            } else {
                let nodemailer;
                try {
                    nodemailer = require('nodemailer');
                } catch (error) {
                    throw new Error('缺少 nodemailer 依赖，请先执行 npm install');
                }
                const timeout = Math.min(Math.max(Number(cfg.timeoutMs) || 10000, 3000), 30000);
                const transporter = nodemailer.createTransport({
                    host: cfg.smtpHost,
                    port: Number(cfg.smtpPort) || 465,
                    secure: cfg.smtpSecure !== false,
                    auth: { user: smtpUser, pass: smtpPass },
                    connectionTimeout: timeout,
                    greetingTimeout: timeout,
                    socketTimeout: timeout
                });
                info = await transporter.sendMail({
                    from: { name: sanitizeText(cfg.senderName || 'K⁺-SESSION 审批提醒'), address: cfg.senderAddress || smtpUser },
                    to: recipients,
                    subject: cleanSubject,
                    text: cleanText,
                    html: String(html || '')
                });
            }
            return { success: true, messageId: sanitizeText(info.messageId), recipients };
        } catch (error) {
            return { success: false, error: safeSmtpError(error), recipients };
        }
    }

    async function send({ eventKey, type, entityId, to, subject, text, html, forceDryRun = false }) {
        const cfg = loadConfig();
        const recipients = uniqueEmails(to);
        const baseLog = { eventKey, type, entityId, recipients };
        if (!cfg.enabled && !forceDryRun) {
            appendLog({ ...baseLog, status: 'disabled' });
            return { success: false, skipped: true, reason: '邮件提醒未启用' };
        }
        if (!typeEnabled(type) && !forceDryRun) {
            appendLog({ ...baseLog, status: 'type_disabled' });
            return { success: false, skipped: true, reason: '该提醒类型未启用' };
        }
        if (!recipients.length && !forceDryRun) {
            appendLog({ ...baseLog, status: 'no_recipient' });
            return { success: false, skipped: true, reason: '没有有效收件人' };
        }
        if (eventKey && pendingEventKeys.has(eventKey)) {
            appendLog({ ...baseLog, status: 'duplicate_suppressed' });
            return { success: false, skipped: true, reason: '相同提醒正在处理' };
        }
        if (eventKey) pendingEventKeys.add(eventKey);
        try {
            if (cfg.dryRun || forceDryRun) {
                appendLog({ ...baseLog, status: 'dry_run' });
                return { success: true, dryRun: true, forcedDryRun: !!forceDryRun, recipients };
            }
            const info = await smtpSend({ type, entityId, to: recipients, subject, text, html });
            if (!info.success) throw new Error(info.error);
            appendLog({ ...baseLog, status: 'sent' });
            return { success: true, messageId: info.messageId, recipients };
        } catch (error) {
            const safeError = safeSmtpError(error);
            appendLog({ ...baseLog, status: 'failed', error: safeError });
            console.error(`[邮件提醒] ${type || 'unknown'} 发送失败: ${safeError}`);
            return { success: false, error: safeError };
        } finally {
            if (eventKey) pendingEventKeys.delete(eventKey);
        }
    }

    return {
        loadConfig,
        publicConfig,
        savePublicConfig,
        saveSmtpPassword,
        clearSmtpPassword,
        emailForUsername,
        recipientsForReview,
        typeEnabled,
        formalPreflight,
        smtpSend,
        send,
        readLogs,
        appendLog,
        renderSummaryEmail,
        uniqueEmails
    };
}

module.exports = {
    createMailReminderService,
    renderSummaryEmail,
    uniqueEmails
};
