'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sha,inventory}=require('../windows-runtime/common.cjs');
const [root,commit]=process.argv.slice(2);
const names=['K-SESSION-Setup-1.1.0-beta.1.exe','K-SESSION-Setup-1.1.0-beta.1.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','INSTALLER-TEST-REPORT.json','toolchain-verification.json','portable-test-report.json','public-regression.json'];
assert.deepEqual(fs.readdirSync(root).sort(),names.sort());
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p).toString().replace(/^\uFEFF/,''));
const i=json('build-info.json');assert.equal(i.sourceCommit,commit);assert.equal(i.mode,'candidate');assert.equal(i.unsigned,true);
assert.equal(i.setupSha256,sha(read(names.find(n=>n.endsWith('.exe')))));
const regression=json('public-regression.json');assert.equal(regression.sourceCommit,commit);assert.equal(regression.testTotal,742);assert.equal(regression.fail,0);assert.equal(regression.skipped,0);assert.equal(regression.suitePass,26);
const tests=json('INSTALLER-TEST-REPORT.json');assert.equal(tests.sourceCommit,commit);assert.equal(tests.status,'AUTOMATED_PASS_HUMAN_PENDING');assert.equal(Object.keys(tests.checks).length,32);
for(const f of inventory(root)){if(f.path.endsWith('.exe'))continue;const s=read(f.path).toString();assert.ok(!/"(?:password|token|smtpPass|cookie)"\s*:/i.test(s));}
console.log('SETUP ARTIFACT VERIFIED; NOT FINAL HUMAN ACCEPTANCE');
