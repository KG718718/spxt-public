'use strict';
// Synthetic, in-memory safety tests; no application instance or user files.
const assert = require('node:assert/strict');
const {safePath, productionEntries, inspectPE, assertArchiveAllowed, cleanEnvironment} = require('../../windows-runtime/common.cjs');
let checks = 0;
for (const name of ['../escape','C:/x','/x','a\\b','a//b','a/./b','a/../b','a:ads','CON.txt','a/NUL','a.','a ','']) {
  assert.throws(() => safePath(name)); checks++;
}
assert.equal(safePath('app/node_modules/@napi-rs/canvas/package.json'), 'app/node_modules/@napi-rs/canvas/package.json'); checks++;
const valid = {version:'1.0.0',resolved:'https://registry.npmjs.org/example/-/example-1.0.0.tgz',integrity:'sha512-'+Buffer.alloc(64).toString('base64')};
const lock = {lockfileVersion:3,packages:{'':{},'node_modules/example':valid,'node_modules/dev':{...valid,dev:true},'node_modules/foreign':{...valid,optional:true,os:['linux']}}};
assert.equal(productionEntries(lock).length,1); checks++;
for (const change of [{resolved:'https://example.com/x'},{resolved:'file:../x'},{integrity:null},{link:true}]) {
  assert.throws(()=>productionEntries({...lock,packages:{'':{},'node_modules/example':{...valid,...change}}})); checks++;
}
assert.throws(()=>productionEntries({...lock,packages:{'':{},'node_modules/../x':valid}})); checks++;
assert.throws(()=>inspectPE(Buffer.from('not PE'))); checks++;
assert.throws(()=>assertArchiveAllowed({nativeReview:'pending-before-distribution'})); checks++;
assert.throws(()=>assertArchiveAllowed({nativeReview:'complete'})); checks++;
assert.equal(assertArchiveAllowed({nativeReview:'complete',nativeEvidence:[{sha256:'a'.repeat(64),path:'licenses/native/NOTICE'}]}),true); checks++;
const env = cleanEnvironment('E:\\synthetic\\tmp', {SystemRoot:'C:\\Windows',NODE_PATH:'private',NODE_OPTIONS:'--require=private',NPM_TOKEN:'secret',npm_config_registry:'private'});
for (const k of ['NODE_PATH','NODE_OPTIONS','NPM_TOKEN','npm_config_registry']) {assert.equal(env[k],undefined);checks++;}
assert.equal(env.TEMP,'E:\\synthetic\\tmp'); checks++;
const jsLicense={route:'pure-js-npm',nativeReview:'NOT APPLICABLE TO NEW RUNTIME GRAPH',unresolvedDistributionItems:0,additionalNativeFiles:0,dependencyCount:20,originalNoticeCount:24,dependencyManifestHash:'a'.repeat(64),policyHash:'b'.repeat(64),nodeLicenseHash:'c'.repeat(64)};
assert.equal(assertArchiveAllowed(jsLicense),true);checks++;
for(const change of [{unresolvedDistributionItems:1},{additionalNativeFiles:1},{dependencyCount:19},{originalNoticeCount:23},{policyHash:''},{dependencyManifestHash:''},{nodeLicenseHash:''},{nativeReview:'complete'}]){assert.throws(()=>assertArchiveAllowed({...jsLicense,...change}));checks++;}
const optionalLock={...lock,packages:{...lock.packages,'node_modules/native':{...valid,optional:true}}};
assert.equal(productionEntries(optionalLock).length,2);checks++;
assert.equal(productionEntries(optionalLock,{omitOptional:true}).length,1);checks++;
console.log(JSON.stringify({suite:'runtime-guards',passed:checks}));
