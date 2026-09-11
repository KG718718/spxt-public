'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
let checks=0;
const check=(name,fn)=>{fn(); checks++; console.log('PASS '+name);};
const licensePath=path.join(root,'LICENSE');
check('approved root LICENSE exists',()=>assert.ok(fs.existsSync(licensePath),'root LICENSE is missing'));
const {validateProjectLicense}=require('../public-license-policy');
const fixture=()=>({
    manifest:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),
    lock:JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')),
    license:fs.readFileSync(licensePath,'utf8'),
    notices:fs.readFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),'utf8')
});
check('repository MIT metadata and original terms agree',()=>assert.equal(validateProjectLicense(fixture()).spdx,'MIT'));
check('project attribution is neutral',()=>assert.equal(validateProjectLicense(fixture()).attribution,'K-SESSION contributors'));
check('missing license fails',()=>{const f=fixture();f.license='';assert.throws(()=>validateProjectLicense(f));});
check('old UNLICENSED metadata fails',()=>{const f=fixture();f.manifest.license='UNLICENSED';assert.throws(()=>validateProjectLicense(f));});
check('lockfile mismatch fails',()=>{const f=fixture();f.lock.packages[''].license='ISC';assert.throws(()=>validateProjectLicense(f));});
check('missing root lock entry fails',()=>{const f=fixture();delete f.lock.packages[''];assert.throws(()=>validateProjectLicense(f));});
check('npm publish guard is preserved',()=>{const f=fixture();f.manifest.private=false;assert.throws(()=>validateProjectLicense(f));});
check('altered permission paragraph fails',()=>{const f=fixture();f.license=f.license.replace('free of charge','for a fee');assert.throws(()=>validateProjectLicense(f));});
check('missing warranty disclaimer fails',()=>{const f=fixture();f.license=f.license.slice(0,f.license.indexOf('THE SOFTWARE IS PROVIDED'));assert.throws(()=>validateProjectLicense(f));});
check('placeholder attribution fails',()=>{const f=fixture();f.license=f.license.replace('K-SESSION contributors','<COPYRIGHT HOLDER>');assert.throws(()=>validateProjectLicense(f));});
check('third party notice is mandatory',()=>{const f=fixture();f.notices='';assert.throws(()=>validateProjectLicense(f));});
check('line endings do not change legal terms',()=>{const f=fixture();const expected=validateProjectLicense(f).normalizedLicenseSha256;f.license=f.license.replace(/\n/g,'\r\n');assert.equal(validateProjectLicense(f).normalizedLicenseSha256,expected);});
check('validation never changes input',()=>{const f=fixture(),before=JSON.stringify(f);validateProjectLicense(f);assert.equal(JSON.stringify(f),before);});
check('third party notices cannot be replaced with project license',()=>{const f=fixture();f.notices=f.license;assert.throws(()=>validateProjectLicense(f));});
console.log('Public license checks: '+checks+' passed');
