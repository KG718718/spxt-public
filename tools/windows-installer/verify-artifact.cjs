'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sha,inventory}=require('../windows-runtime/common.cjs');
const [root,commit]=process.argv.slice(2);
const names=['K-SESSION-Setup-1.1.0-beta.1.exe','K-SESSION-Setup-1.1.0-beta.1.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','INSTALLER-TEST-REPORT.json','toolchain-verification.json','portable-test-report.json','public-regression.json','offline-network.json'];
assert.deepEqual(fs.readdirSync(root).sort(),names.sort());
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p).toString().replace(/^\uFEFF/,''));
const i=json('build-info.json');assert.equal(i.sourceCommit,commit);assert.equal(i.mode,'candidate');assert.equal(i.unsigned,true);
assert.equal(i.setupSha256,sha(read(names.find(n=>n.endsWith('.exe')))));
const regression=json('public-regression.json');assert.equal(regression.sourceCommit,commit);assert.equal(regression.testTotal,742);assert.equal(regression.fail,0);assert.equal(regression.skipped,0);assert.equal(regression.suitePass,26);
const tests=json('INSTALLER-TEST-REPORT.json');assert.equal(tests.sourceCommit,commit);assert.equal(tests.status,'AUTOMATED_PASS_HUMAN_PENDING');assert.equal(Object.keys(tests.checks).length,32);
assert.equal(tests.setupSha256,i.setupSha256);assert.equal(tests.unrelatedNodePreserved,true);assert.equal(tests.instanceDataPreserved,true);
const offline=json('offline-network.json');assert.equal(offline.sourceCommit,commit);assert.equal(offline.status,'PASS');assert.equal(offline.externalBefore,true);assert.equal(offline.externalDuring,false);assert.equal(offline.restored,true);assert.equal(offline.firewallChanged,false);
const pending=new Set(['I01','I02','I09']);
for(let n=1;n<=32;n++){const id='I'+String(n).padStart(2,'0');assert.equal(tests.checks[id]?.status,pending.has(id)?'PENDING':'PASS',id);assert.ok(tests.checks[id].method);}
assert.equal(Object.keys(tests.dataChecks).length,13);
for(let n=1;n<=13;n++){const id='D'+String(n).padStart(2,'0');assert.equal(tests.dataChecks[id]?.status,'PASS',id);assert.ok(tests.dataChecks[id].method);}
for(const f of inventory(root)){if(f.path.endsWith('.exe'))continue;const s=read(f.path).toString();assert.ok(!/"(?:password|token|smtpPass|cookie)"\s*:/i.test(s));}
console.log('SETUP ARTIFACT VERIFIED; NOT FINAL HUMAN ACCEPTANCE');
