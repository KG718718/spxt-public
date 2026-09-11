'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS '+name); }
check('application, npm lock and package manifest agree on 1.0.0', () => {
 const app=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json')),manifest=JSON.parse(read('tools/package-manifest.json'));
 assert.equal(app.version,'1.0.0');assert.equal(lock.version,app.version);assert.equal(lock.packages[''].version,app.version);assert.equal(manifest.version,app.version);
});
check('product introduction describes advertising OA and reconciliation', () => {
 const text=read('README.md');for(const word of ['K⁺-SESSION 1.0','广告公司','OA','财务核对','数据统计'])assert.ok(text.includes(word),word);
 assert.ok(JSON.parse(read('package.json')).description.includes('广告公司'));
});
check('introduction covers the implemented functional areas', () => {
 const text=read('README.md');for(const word of ['项目申请','付款申请','欠款','发票','奖金','月结','甲方','供应商','权限','邮件','导出','备份'])assert.ok(text.includes(word),word);
});
check('current Markdown omits deployment-origin narratives', () => {
 const files=[];function walk(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.md'))files.push(p);}}
 for(const e of fs.readdirSync(root,{withFileTypes:true}))if(e.isFile()&&e.name.endsWith('.md'))files.push(e.name);
 walk('docs');files.push('tools/installer/README-install.md');
 const forbidden=/\u516c\u53f8\u7248|\u516c\u53f8\u7cfb\u7edf|\u539f\u516c\u53f8|\u539f\u5355\u4f4d|\u5185\u90e8\u7cfb\u7edf|\u79c1\u6709\u4ed3\u5e93|(?:\b19\s*(?:\u4e3b\u673a|\u7cfb\u7edf|\u64cd\u4f5c)|\u572819\u4e0a)/;
 for(const p of files)assert.doesNotMatch(read(p),forbidden,p);
});
check('documentation contains no specific private endpoint', () => {
 for(const p of ['README.md','PROJECT.md','tools/installer/README-install.md'])assert.doesNotMatch(read(p),/\b10[.]10[.]0[.]19\b|CodexWorkspace|C:\\Users\\/);
});
check('new installs and accounting scope are explicit', () => {
 const text=read('README.md');assert.match(text,/零业务数据/);assert.match(text,/Admin/);assert.match(text,/银行/);assert.match(text,/不预置/);
});
check('future fixes, features and breaking versions are distinguished', () => {
 const text=read('docs/versioning.md');for(const v of ['1.0.0','1.0.1','1.1.0','2.0.0'])assert.ok(text.includes(v));assert.match(text,/备份/);assert.match(text,/不覆盖/);
 assert.match(read('CHANGELOG.md'),/1\.0\.0/);
});
check('installation guide preserves explicit port selection and local isolation', () => {
 const text=read('tools/installer/README-install.md');assert.match(text,/127\.0\.0\.1/);assert.match(text,/--port/);assert.match(text,/独立/);assert.match(text,/instance/);
});
console.log('Public product documentation and version: '+passed+' passed.');
