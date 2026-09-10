const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SECRET_STATUS = Object.freeze({
    NONE: '未配置',
    ENVIRONMENT: '环境变量已配置',
    SECURE_STORE: '安全存储已配置'
});

const PROTECT_SCRIPT = [
    '$ErrorActionPreference = "Stop"',
    'Add-Type -AssemblyName System.Security',
    '$plainText = [Console]::In.ReadToEnd()',
    '$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($plainText)',
    '$protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect($plainBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
    '[Console]::Out.Write([Convert]::ToBase64String($protectedBytes))'
].join(';');

const UNPROTECT_SCRIPT = [
    '$ErrorActionPreference = "Stop"',
    'Add-Type -AssemblyName System.Security',
    '$protectedText = [Console]::In.ReadToEnd()',
    '$protectedBytes = [Convert]::FromBase64String($protectedText)',
    '$plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($protectedBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
    '[Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($plainBytes))'
].join(';');

function runDpapi(script, input) {
    if (process.platform !== 'win32') {
        throw new Error('SMTP授权码安全存储仅支持 Windows');
    }
    const result = spawnSync('powershell.exe', [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        script
    ], {
        input,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 1024 * 1024
    });
    if (result.error || result.status !== 0 || !result.stdout) {
        throw new Error('Windows DPAPI 操作失败');
    }
    return result.stdout;
}

function createSmtpSecretStore(baseDir) {
    const secretFile = process.env.KSESSION_SMTP_SECRET_FILE
        ? path.resolve(process.env.KSESSION_SMTP_SECRET_FILE)
        : path.join(baseDir, 'runtime', 'secrets', 'smtp-pass.dpapi');

    function hasStoredSecret() {
        try {
            const stat = fs.statSync(secretFile);
            return stat.isFile() && stat.size > 0;
        } catch (error) {
            return false;
        }
    }

    function status() {
        if (process.env.KSESSION_SMTP_PASS) return SECRET_STATUS.ENVIRONMENT;
        if (hasStoredSecret()) return SECRET_STATUS.SECURE_STORE;
        return SECRET_STATUS.NONE;
    }

    function save(secret) {
        const value = String(secret || '');
        if (!value.trim()) throw new Error('SMTP授权码不能为空');
        if (value.length > 4096) throw new Error('SMTP授权码长度超出限制');
        let protectedText;
        try {
            protectedText = runDpapi(PROTECT_SCRIPT, value);
        } catch (error) {
            throw new Error('SMTP授权码安全存储失败');
        }
        fs.mkdirSync(path.dirname(secretFile), { recursive: true });
        const temporaryFile = `${secretFile}.${process.pid}.tmp`;
        try {
            fs.writeFileSync(temporaryFile, protectedText, { encoding: 'utf8', mode: 0o600 });
            if (fs.existsSync(secretFile)) {
                fs.copyFileSync(temporaryFile, secretFile);
                fs.unlinkSync(temporaryFile);
            } else {
                fs.renameSync(temporaryFile, secretFile);
            }
        } catch (error) {
            try {
                if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
            } catch (cleanupError) {}
            throw new Error('SMTP授权码安全存储失败');
        }
        return { status: status() };
    }

    function clear() {
        const existed = hasStoredSecret();
        try {
            if (existed) fs.unlinkSync(secretFile);
        } catch (error) {
            throw new Error('SMTP授权码安全存储清除失败');
        }
        return { cleared: existed, status: status() };
    }

    function resolve() {
        if (process.env.KSESSION_SMTP_PASS) {
            return { value: process.env.KSESSION_SMTP_PASS, source: SECRET_STATUS.ENVIRONMENT };
        }
        if (!hasStoredSecret()) {
            return { value: '', source: SECRET_STATUS.NONE };
        }
        try {
            const protectedText = fs.readFileSync(secretFile, 'utf8').trim();
            const value = runDpapi(UNPROTECT_SCRIPT, protectedText);
            if (!value) throw new Error('empty');
            return { value, source: SECRET_STATUS.SECURE_STORE };
        } catch (error) {
            throw new Error('SMTP授权码安全存储无法解密，请在服务器本机重新配置');
        }
    }

    return {
        status,
        save,
        clear,
        resolve,
        hasStoredSecret
    };
}

module.exports = {
    createSmtpSecretStore,
    SECRET_STATUS
};
