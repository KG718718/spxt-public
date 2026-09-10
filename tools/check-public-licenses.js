'use strict';
// Hosted build-time inventory only. Never reads installation data or credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
if (process.env.GITHUB_ACTIONS !== 'true') throw Error('License inventory is restricted to the hosted candidate workspace.');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const reportRoot = path.join(root,'.test-work','license-report');
const allowedLicenses = new Set(['MIT','MIT-0','ISC','Apache-2.0']);
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const contained = (parent, child) => child.startsWith(parent+path.sep);
const packages=[], files=[], skipped=[];
const licenseSources=JSON.parse(fs.readFileSync(path.join(root,'tools','dependency-license-sources.json'),'utf8')).sources;
function collect(directory, relative='') {
    const output=[];
    for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
        if(entry.name==='node_modules'||entry.name==='.git') continue;
        const full=path.join(directory,entry.name),rel=path.posix.join(relative,entry.name);
        if(entry.isSymbolicLink()) continue;
        if(entry.isDirectory()) output.push(...collect(full,rel));
        else if(entry.isFile() && /^(licen[cs]e|copying|notice|copyright|third[._-]?party[._-](?:licen[cs]es?|notices?))([._-].*)?$/i.test(entry.name)) output.push({full,rel});
    }
    return output;
}
for (const [key,locked] of Object.entries(lock.packages||{})) {
    if(!key) continue;
    if(!key.startsWith('node_modules/')||key.split('/').some(x=>x==='..'||x==='')||key.includes('\\'))
        throw Error('Unexpected dependency path in lockfile');
    const directory=path.resolve(root,key),manifestPath=path.join(directory,'package.json');
    if(!contained(root,directory)) throw Error('Dependency escaped workspace');
    if(!fs.existsSync(manifestPath)) {
        if(locked.optional===true){skipped.push({path:key,version:locked.version,reason:'optional-not-installed-on-this-platform'});continue;}
        throw Error('Required dependency missing: '+key);
    }
    if(fs.lstatSync(directory).isSymbolicLink()||!contained(fs.realpathSync(root),fs.realpathSync(directory)))
        throw Error('Linked dependency is not an approved bundled dependency');
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    if(manifest.version!==locked.version) throw Error('Dependency version differs from lockfile: '+key);
    const license=typeof manifest.license==='string'?manifest.license:manifest.license?.type
        || (Array.isArray(manifest.licenses) && manifest.licenses.length===1 ? manifest.licenses[0]?.type : undefined);
    if(locked.license && license!==locked.license)throw Error('License metadata differs from lockfile: '+manifest.name);
    if(!allowedLicenses.has(license)) throw Error('License requires explicit review: '+manifest.name+' / '+license);
    let discovered=collect(directory), licenseSource=null;
    if(!discovered.some(x=>/^(licen[cs]e|copying)([._-].*)?$/i.test(path.posix.basename(x.rel)))) {
        const source=licenseSources[key];
        if(!source || source.version!==locked.version || source.license!==license)
            throw Error('Original license text not found: '+manifest.name);
        if(!source.providerPath.startsWith('node_modules/') || source.providerPath.split('/').includes('..') || source.providerPath.includes('\\') || path.basename(source.file)!==source.file)
            throw Error('Unsafe license source mapping');
        const provider=path.resolve(root,source.providerPath),providerManifest=JSON.parse(fs.readFileSync(path.join(provider,'package.json'),'utf8'));
        if(providerManifest.version!==source.providerVersion || lock.packages[source.providerPath]?.version!==source.providerVersion)
            throw Error('License provider version mismatch');
        const full=path.join(provider,source.file),bytes=fs.readFileSync(full);
        if(sha256(bytes)!==source.sha256)throw Error('Upstream license text changed; re-review required');
        discovered.push({full,rel:'LICENSE.from-upstream-project'});
        licenseSource=source;
    }
    const names=[];
    for(const entry of discovered) {
        if(fs.statSync(entry.full).size>2*1024*1024) throw Error('License text exceeds review size: '+manifest.name);
        const buffer=fs.readFileSync(entry.full);
        const outputPath=path.posix.join('licenses',key.slice('node_modules/'.length),entry.rel);
        files.push({outputPath,buffer});
        names.push({path:outputPath,bytes:buffer.length,sha256:sha256(buffer)});
    }
    packages.push({name:manifest.name,version:manifest.version,license,dependencyPath:key,licenseSource,licenseFiles:names});
}
fs.mkdirSync(path.dirname(reportRoot),{recursive:true});
fs.mkdirSync(reportRoot); // Refuse a stale report rather than overwriting evidence.
for(const file of files) {
    const target=path.resolve(reportRoot,file.outputPath);
    if(!contained(reportRoot,target)) throw Error('Unsafe notice output path');
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,file.buffer,{flag:'wx'});
}
const inventory={schemaVersion:1,target:process.platform+'-'+process.arch,lockSha256:sha256(fs.readFileSync(path.join(root,'package-lock.json'))),
    projectLicenseStatus:'pending-user-choice',nativeBinaryReview:'pending-before-distribution',packages,skippedOptional:skipped};
fs.writeFileSync(path.join(reportRoot,'inventory.json'),JSON.stringify(inventory,null,2)+'\n',{flag:'wx'});
const rows=packages.map(p=>'| '+p.name+' | '+p.version+' | '+p.license+' | '+p.licenseFiles.map(f=>'['+path.posix.basename(f.path)+']('+f.path+')').join(', ')+' |');
const notice='# Third-party notices — dependency inventory\n\n'+
    'This report contains the original license/notice files of dependencies installed for this hosted target. Their own terms continue to apply. It is not the application license and does not assert that a complete distribution has been validated.\n\n'+
    '| Package | Version | Declared license | Original files |\n|---|---|---|---|\n'+rows.join('\n')+
    '\n\nNot included in this inventory: the application license, separately distributed Node.js, optional OCR/Python/models, and later browser/assets dependencies. Review the exact final package and include their original notices before release. Platform-skipped optional packages are listed in inventory.json and are not asserted to be bundled.\n';
fs.writeFileSync(path.join(reportRoot,'THIRD_PARTY_NOTICES.md'),notice,{flag:'wx'});
console.log('Third-party license inventory: '+packages.length+' installed packages; '+files.length+' original license/notice files; '+skipped.length+' optional packages not installed.');
console.log('Project license and bundled native-component review remain pending; this package-level inventory is not release approval.');
