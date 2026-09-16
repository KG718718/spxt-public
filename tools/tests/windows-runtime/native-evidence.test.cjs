'use strict';
// Verifies collected evidence consistency, NOT legal permission or G1.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkedURL } = require('../../windows-runtime/collect-native-evidence.cjs');
const { sha, safePath, inside, writeJSON, inspectPE } = require('../../windows-runtime/common.cjs');
const evidence = path.resolve(process.argv[2]);
const stage = path.resolve(process.argv[3]);
const repo = path.resolve(__dirname, '../../..');
if (!/^E:\\/i.test(evidence) || inside(repo, evidence) || evidence === repo || inside(stage, evidence) || evidence === stage) throw Error('Evidence must be external E-drive directory');
let passed = 0;
function check(fn) { fn(); passed++; }
for (const url of ['http://registry.npmjs.org/x', 'https://evil.example/x', 'https://registry.npmjs.org.evil.example/x', 'https://user:secret@registry.npmjs.org/x', 'https://registry.npmjs.org:8080/x', 'file:///E:/secret']) check(() => assert.throws(() => checkedURL(url)));
check(() => assert.equal(checkedURL('https://registry.npmjs.org/@napi-rs/canvas/0.1.80').hostname, 'registry.npmjs.org'));
const read = file => fs.readFileSync(path.join(evidence, safePath(file)));
const json = file => JSON.parse(read(file));
const sources = json('sources.json');
for (const r of sources.records.filter(r => r.sha256)) check(() => assert.equal(sha(read(r.file)), r.sha256));
const tree = json('canvas/tree.json');
check(() => assert.equal(tree.truncated, false));
check(() => assert.equal(tree.tree.find(x => x.path === 'skia').sha, sources.skiaCommit));
check(() => assert.equal(tree.tree.some(x => x.path === 'Cargo.lock'), false));
const statements = [];
for (const [name, att] of [['canvas', 'canvas-attestations'], ['canvas-win32-x64-msvc', 'canvas-win32-attestations']]) {
  const metadata = json(`npm/${name}-0.1.80.json`);
  check(() => assert.equal(metadata.gitHead, sources.canvasCommit));
  check(() => assert.equal(metadata.version, '0.1.80'));
  const decoded = json(`npm/${att}.json`).attestations.map(a => JSON.parse(Buffer.from(a.bundle.dsseEnvelope.payload, 'base64')));
  const provenance = decoded.find(a => a.predicateType === 'https://slsa.dev/provenance/v1');
  check(() => assert.equal(provenance.subject[0].digest.sha512, Buffer.from(metadata.dist.integrity.slice(7), 'base64').toString('hex')));
  check(() => assert.equal(provenance.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit, sources.canvasCommit));
  statements.push({ name: metadata.name, resolvedDependencies: provenance.predicate.buildDefinition.resolvedDependencies, invocation: provenance.predicate.runDetails.metadata.invocationId });
}
const base = path.join(stage, 'app/node_modules/@napi-rs/canvas-win32-x64-msvc');
const binary = fs.readFileSync(path.join(base, 'skia.win32-x64-msvc.node'));
check(() => assert.equal(sha(binary), '30646342fc284109aa9542155287d37147c97132d5168cf621f851a9c69e0c99'));
const icu = fs.readFileSync(path.join(base, 'icudtl.dat'));
const release = json('canvas/skia-release.json');
check(() => assert.equal(release.assets.find(a => a.name === 'icudtl.dat').digest, 'sha256:' + sha(icu)));
const artifact = json('canvas/ci-artifacts.json').artifacts.find(a => a.name === 'bindings-x86_64-pc-windows-msvc');
check(() => assert.equal(artifact.expired, true));
const report = { passed, sources: sources.records.filter(r => r.sha256).length, unavailableSources: sources.records.filter(r => r.error), binary: { name: 'skia.win32-x64-msvc.node', bytes: binary.length, sha256: sha(binary), ...inspectPE(binary) }, icu: { bytes: icu.length, sha256: sha(icu) }, statements, signatureVerification: 'NOT PERFORMED; decoded metadata consistency only', distributionGate: 'FAIL: exact native component and notice closure remains incomplete', g1: 'NOT EXECUTED' };
writeJSON(path.join(evidence, 'native-review-check.json'), report);
console.log(JSON.stringify({ passed, collectedSources: report.sources, distributionGate: report.distributionGate, g1: report.g1 }));
