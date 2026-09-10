const fsDefault = require('fs');
const cryptoDefault = require('crypto');
const path = require('path');

const TYPE = 'structured-data';
const MANIFEST_VERSION = 1;
const NEW_NAME = /^data_(\d{8})_(\d{6})_(\d{3})_([a-z0-9-]{8,})\.json$/i;
const LEGACY_NAME = /^data_.+\.json$/i;

function chinaParts(input = new Date()) {
    const shifted = new Date(input.getTime() + 8 * 60 * 60 * 1000);
    return {
        year: shifted.getUTCFullYear(),
        month: String(shifted.getUTCMonth() + 1).padStart(2, '0'),
        day: String(shifted.getUTCDate()).padStart(2, '0'),
        hour: String(shifted.getUTCHours()).padStart(2, '0'),
        minute: String(shifted.getUTCMinutes()).padStart(2, '0'),
        second: String(shifted.getUTCSeconds()).padStart(2, '0'),
        millisecond: String(shifted.getUTCMilliseconds()).padStart(3, '0')
    };
}

function chinaLocalDate(input = new Date()) {
    const value = chinaParts(input);
    return `${value.year}-${value.month}-${value.day}`;
}

function chinaTimestamp(input = new Date()) {
    const value = chinaParts(input);
    return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}:${value.second}.${value.millisecond}+08:00`;
}

function sha256(bytes, cryptoImpl = cryptoDefault) {
    return cryptoImpl.createHash('sha256').update(bytes).digest('hex');
}

function safeUnlink(fsImpl, file) {
    try { if (fsImpl.existsSync(file)) fsImpl.unlinkSync(file); } catch {}
}

function makeId(cryptoImpl, supplied) {
    const raw = supplied ? supplied() : cryptoImpl.randomUUID();
    return String(raw).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 36) || cryptoImpl.randomBytes(8).toString('hex');
}

function validateManifest(manifest, fileName, bytes, digest) {
    return Boolean(manifest
        && manifest.manifestVersion === MANIFEST_VERSION
        && manifest.type === TYPE
        && manifest.fileName === fileName
        && manifest.bytes === bytes
        && manifest.sha256 === digest
        && typeof manifest.createdAt === 'string');
}

function listStructuredDataBackups(options) {
    const fsImpl = options.fs || fsDefault;
    const cryptoImpl = options.crypto || cryptoDefault;
    const backupsDir = path.resolve(options.backupsDir);
    if (!fsImpl.existsSync(backupsDir)) return [];
    const results = [];
    for (const fileName of fsImpl.readdirSync(backupsDir)) {
        if (!LEGACY_NAME.test(fileName) || fileName.endsWith('.manifest.json')) continue;
        const filePath = path.join(backupsDir, fileName);
        let stats;
        try { stats = fsImpl.statSync(filePath); } catch { continue; }
        if (!stats.isFile()) continue;
        const manifestPath = `${filePath}.manifest.json`;
        if (NEW_NAME.test(fileName) && fsImpl.existsSync(manifestPath)) {
            try {
                const bytes = fsImpl.readFileSync(filePath);
                JSON.parse(bytes.toString('utf8'));
                const digest = sha256(bytes, cryptoImpl);
                const manifest = JSON.parse(fsImpl.readFileSync(manifestPath, 'utf8'));
                if (!validateManifest(manifest, fileName, bytes.length, digest)) continue;
                results.push({
                    type: TYPE,
                    label: '结构化数据备份（仅 data.json）',
                    fileName,
                    createdAt: manifest.createdAt,
                    bytes: bytes.length,
                    sha256: digest,
                    verified: true,
                    rotation: manifest.rotation || { status: 'unknown' }
                });
            } catch {}
            continue;
        }
        if (!NEW_NAME.test(fileName)) {
            results.push({
                type: 'historical-unverified',
                label: '历史备份（未校验）',
                fileName,
                createdAt: stats.mtime.toISOString(),
                bytes: stats.size,
                sha256: null,
                verified: false,
                rotation: null
            });
        }
    }
    return results.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function rotationCandidates(fsImpl, cryptoImpl, backupsDir) {
    return fsImpl.readdirSync(backupsDir)
        .filter(fileName => NEW_NAME.test(fileName))
        .map(fileName => {
            const filePath = path.join(backupsDir, fileName);
            const manifestPath = `${filePath}.manifest.json`;
            try {
                const stats = fsImpl.statSync(filePath);
                if (!stats.isFile() || !fsImpl.existsSync(manifestPath)) return null;
                const bytes = fsImpl.readFileSync(filePath);
                JSON.parse(bytes.toString('utf8'));
                const digest = sha256(bytes, cryptoImpl);
                const manifest = JSON.parse(fsImpl.readFileSync(manifestPath, 'utf8'));
                if (!validateManifest(manifest, fileName, bytes.length, digest)) return null;
                const createdAtMs = Date.parse(manifest.createdAt);
                if (!Number.isFinite(createdAtMs)) return null;
                return { fileName, filePath, createdAt: manifest.createdAt, createdAtMs };
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.createdAtMs - a.createdAtMs || b.fileName.localeCompare(a.fileName));
}

function rotateBackups(options) {
    const { fs: fsImpl, crypto: cryptoImpl, backupsDir, maxBackups, protectedFileName } = options;
    const candidates = rotationCandidates(fsImpl, cryptoImpl, backupsDir);
    const removed = [];
    const warnings = [];
    const protectedPresent = candidates.some(item => item.fileName === protectedFileName);
    const deletionCandidates = protectedPresent
        ? candidates.filter(item => item.fileName !== protectedFileName).slice(Math.max(0, maxBackups - 1))
        : candidates.slice(maxBackups);
    for (const item of deletionCandidates) {
        try {
            fsImpl.unlinkSync(item.filePath);
            const manifestPath = `${item.filePath}.manifest.json`;
            if (fsImpl.existsSync(manifestPath)) fsImpl.unlinkSync(manifestPath);
            removed.push(item.fileName);
        } catch (error) {
            warnings.push(`${item.fileName}: ${error.message}`);
        }
    }
    if (warnings.length) return { status: 'warning', removed, warning: warnings.join('; ') };
    return { status: removed.length ? 'completed' : 'not-needed', removed, warning: null };
}

function createStructuredDataBackup(options) {
    const fsImpl = options.fs || fsDefault;
    const cryptoImpl = options.crypto || cryptoDefault;
    const dataFile = path.resolve(options.dataFile);
    const backupsDir = path.resolve(options.backupsDir);
    const maxBackups = Number.isInteger(options.maxBackups) ? options.maxBackups : 7;
    const now = options.now ? options.now() : new Date();
    let tempData = '';
    let tempManifest = '';
    let finalData = '';
    let finalManifest = '';
    try {
        const source = fsImpl.readFileSync(dataFile);
        JSON.parse(source.toString('utf8'));
        fsImpl.mkdirSync(backupsDir, { recursive: true });
        const value = chinaParts(now);
        let fileName;
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const id = makeId(cryptoImpl, options.randomId);
            fileName = `data_${value.year}${value.month}${value.day}_${value.hour}${value.minute}${value.second}_${value.millisecond}_${id}.json`;
            finalData = path.join(backupsDir, fileName);
            finalManifest = `${finalData}.manifest.json`;
            tempData = path.join(backupsDir, `.${fileName}.${process.pid}.${attempt}.tmp`);
            if (!fsImpl.existsSync(finalData) && !fsImpl.existsSync(tempData)) break;
            fileName = '';
        }
        if (!fileName) throw new Error('无法生成唯一备份文件名');
        fsImpl.writeFileSync(tempData, source, { flag: 'wx' });
        const reread = fsImpl.readFileSync(tempData);
        if (!reread.equals(source)) throw new Error('临时文件字节复核失败');
        JSON.parse(reread.toString('utf8'));
        const digest = sha256(reread, cryptoImpl);
        const manifest = {
            manifestVersion: MANIFEST_VERSION,
            type: TYPE,
            label: '结构化数据备份（仅 data.json）',
            fileName,
            createdAt: chinaTimestamp(now),
            bytes: reread.length,
            sha256: digest,
            source: 'data.json'
        };
        tempManifest = path.join(backupsDir, `.${fileName}.manifest.${process.pid}.tmp`);
        fsImpl.writeFileSync(tempManifest, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
        const checkedManifest = JSON.parse(fsImpl.readFileSync(tempManifest, 'utf8'));
        if (!validateManifest(checkedManifest, fileName, reread.length, digest)) throw new Error('备份元数据复核失败');
        fsImpl.renameSync(tempData, finalData);
        try { fsImpl.renameSync(tempManifest, finalManifest); } catch (error) {
            safeUnlink(fsImpl, finalData);
            throw error;
        }
        const rotation = rotateBackups({
            fs: fsImpl,
            crypto: cryptoImpl,
            backupsDir,
            maxBackups,
            protectedFileName: fileName
        });
        manifest.rotation = rotation;
        let updateTemp = '';
        try {
            updateTemp = `${finalManifest}.${process.pid}.tmp`;
            fsImpl.writeFileSync(updateTemp, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
            fsImpl.renameSync(updateTemp, finalManifest);
        } catch (error) {
            safeUnlink(fsImpl, updateTemp);
            rotation.status = 'warning';
            rotation.warning = [rotation.warning, `轮换结果元数据更新失败: ${error.message}`].filter(Boolean).join('; ');
        }
        if (!fsImpl.existsSync(finalData) || !fsImpl.existsSync(finalManifest)) {
            throw new Error('轮换后当前备份或清单缺失');
        }
        const finalBytes = fsImpl.readFileSync(finalData);
        const finalDigest = sha256(finalBytes, cryptoImpl);
        const finalCheckedManifest = JSON.parse(fsImpl.readFileSync(finalManifest, 'utf8'));
        if (!validateManifest(finalCheckedManifest, fileName, finalBytes.length, finalDigest)) {
            throw new Error('轮换后当前备份复核失败');
        }
        return {
            success: true,
            type: TYPE,
            label: manifest.label,
            fileName,
            createdAt: manifest.createdAt,
            bytes: reread.length,
            sha256: digest,
            verified: true,
            rotation
        };
    } catch (error) {
        safeUnlink(fsImpl, tempData);
        safeUnlink(fsImpl, tempManifest);
        return { success: false, type: TYPE, error: error.message };
    }
}

function writeMarkerAtomic(fsImpl, markerFile, value, randomId) {
    const temp = `${markerFile}.${process.pid}.${randomId}.tmp`;
    try {
        fsImpl.writeFileSync(temp, value, { flag: 'wx' });
        fsImpl.renameSync(temp, markerFile);
    } finally {
        safeUnlink(fsImpl, temp);
    }
}

function runDailyStructuredDataBackup(options) {
    const fsImpl = options.fs || fsDefault;
    const cryptoImpl = options.crypto || cryptoDefault;
    const now = options.now ? options.now() : new Date();
    const backupsDir = path.resolve(options.backupsDir);
    const markerFile = path.resolve(options.markerFile || path.join(backupsDir, '.last_successful_backup_date'));
    const today = chinaLocalDate(now);
    let previous = '';
    try { previous = fsImpl.readFileSync(markerFile, 'utf8').trim(); } catch {}
    if (previous === today) return { success: true, skipped: true, localDate: today };
    const result = createStructuredDataBackup({ ...options, now: () => now, fs: fsImpl, crypto: cryptoImpl });
    if (!result.success) return { ...result, localDate: today, markerUpdated: false };
    try {
        writeMarkerAtomic(fsImpl, markerFile, today, makeId(cryptoImpl));
        return { ...result, localDate: today, markerUpdated: true };
    } catch (error) {
        return { ...result, localDate: today, markerUpdated: false, markerWarning: error.message };
    }
}

module.exports = {
    TYPE,
    chinaLocalDate,
    createStructuredDataBackup,
    listStructuredDataBackups,
    runDailyStructuredDataBackup,
    sha256
};
