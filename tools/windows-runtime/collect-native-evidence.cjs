'use strict';
// Public-source evidence collection only. Never builds, executes downloaded code,
// changes a license gate, or treats retrieved files as distribution approval.
const fs = require('node:fs');
const path = require('node:path');
const { sha, inside, safePath, writeNew, writeJSON } = require('./common.cjs');
const canvasCommit = 'dda1b258dac667b4c66b94bbd4d70aa79ea4503a';
const skiaCommit = '1fdbea293a53b270e3f5e74c92cc6670d68412ff';
const allowedHosts = new Set(['registry.npmjs.org', 'api.github.com', 'raw.githubusercontent.com', 'chromium.googlesource.com', 'skia.googlesource.com']);
function checkedURL(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || !allowedHosts.has(u.hostname) || u.username || u.password || u.port) throw Error('Unapproved public source');
  return u;
}
async function collect(out) {
  const repo = path.resolve(__dirname, '../..');
  out = path.resolve(out);
  if (!/^E:\\/i.test(out) || out === repo || inside(repo, out)) throw Error('Use a fresh external E-drive evidence directory');
  fs.mkdirSync(out); // Existing output is never overwritten.
  const records = [];
  async function get(url, file, gitiles = false) {
    checkedURL(url); safePath(file);
    const record = { url, file, fetchedAt: new Date().toISOString() };
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'K-SESSION-public-native-evidence', Accept: 'application/json, text/plain, */*' } });
      record.httpStatus = response.status;
      const wire = Buffer.from(await response.arrayBuffer());
      record.responseSha256 = sha(wire);
      if (!response.ok) { record.error = 'HTTP ' + response.status; return null; }
      const bytes = gitiles ? Buffer.from(wire.toString('utf8').trim(), 'base64') : wire;
      if (gitiles) writeNew(path.join(out, file + '.base64'), wire);
      writeNew(path.join(out, file), bytes);
      record.bytes = bytes.length; record.sha256 = sha(bytes);
      return bytes;
    } catch (e) { record.error = e.name + ': ' + e.message; return null; }
    finally { records.push(record); }
  }
  try {
    const canvasBase = `https://raw.githubusercontent.com/Brooooooklyn/canvas/${canvasCommit}/`;
    const skiaBase = `https://raw.githubusercontent.com/google/skia/${skiaCommit}/`;
    for (const [url, file] of [
      ['https://registry.npmjs.org/@napi-rs/canvas/0.1.80', 'npm/canvas-0.1.80.json'],
      ['https://registry.npmjs.org/@napi-rs/canvas-win32-x64-msvc/0.1.80', 'npm/canvas-win32-x64-msvc-0.1.80.json'],
      [`https://api.github.com/repos/Brooooooklyn/canvas/git/trees/${canvasCommit}?recursive=1`, 'canvas/tree.json'],
      [`https://api.github.com/repos/google/skia/git/trees/${skiaCommit}?recursive=1`, 'skia/tree.json'],
      ['https://api.github.com/repos/Brooooooklyn/canvas/releases/tags/skia-1fdbea29', 'canvas/skia-release.json'],
      [`https://api.github.com/repos/Brooooooklyn/canvas/actions/runs?head_sha=${canvasCommit}&per_page=100`, 'canvas/actions-runs.json'],
      ['https://registry.npmjs.org/-/npm/v1/attestations/@napi-rs%2fcanvas@0.1.80', 'npm/canvas-attestations.json'],
      ['https://registry.npmjs.org/-/npm/v1/attestations/@napi-rs%2fcanvas-win32-x64-msvc@0.1.80', 'npm/canvas-win32-attestations.json'],
      ['https://api.github.com/repos/Brooooooklyn/canvas/actions/runs/17693234724/artifacts?per_page=100', 'canvas/ci-artifacts.json'],
    ]) await get(url, file);
    for (const f of ['LICENSE', '.gitmodules', 'Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', '.cargo/config.toml', 'build.rs', 'package.json', 'npm/win32-x64-msvc/package.json', 'scripts/utils.mjs', 'scripts/release-skia-binary.mjs', 'scripts/build-skia.js', '.github/workflows/CI.yaml', '.github/workflows/skia.yaml', '.github/actions/setup-rust/action.yaml']) await get(canvasBase + f, 'canvas/' + f);
    for (const f of ['LICENSE', 'DEPS', 'README.chromium', 'BUILD.gn', 'third_party/expat/LICENSE', 'third_party/harfbuzz/LICENSE', 'third_party/wuffs/LICENSE', 'third_party/icu/BUILD.gn', 'third_party/icu/SkLoadICU.cpp', 'third_party/libjxl/BUILD.gn', 'third_party/freetype2/BUILD.gn', 'third_party/libwebp/BUILD.gn', 'third_party/libpng/BUILD.gn', 'third_party/zlib/BUILD.gn']) await get(skiaBase + f, 'skia/' + f);
    // DEPS pins sources, but does NOT prove which objects are in the npm binary.
    const depsFile = path.join(out, 'skia/DEPS');
    const wanted = {
      brotli: ['LICENSE'], expat: ['expat/COPYING'], freetype: ['docs/FTL.TXT', 'docs/GPLv2.TXT', 'LICENSE.TXT'],
      harfbuzz: ['COPYING'], highway: ['LICENSE'], icu: ['LICENSE'],
      'libjpeg-turbo': ['LICENSE.md', 'README.ijg', 'jconfig.h.in'], libjxl: ['LICENSE', 'PATENTS'],
      libpng: ['LICENSE'], libwebp: ['COPYING', 'PATENTS'], wuffs: ['LICENSE'], zlib: ['LICENSE'],
    };
    if (fs.existsSync(depsFile)) {
      const deps = fs.readFileSync(depsFile, 'utf8');
      for (const [name, files] of Object.entries(wanted)) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = deps.match(new RegExp('"third_party/externals/' + escaped + '"\\s*:\\s*"(https://[^"@]+)@([a-f0-9]{40})"'));
        if (!match) { records.push({ component: name, error: 'No precise DEPS entry' }); continue; }
        for (const f of files) await get(`${match[1]}/+/${match[2]}/${f}?format=TEXT`, `third-party/${name}/${f}`, true);
      }
    }
  } finally {
    records.sort((a, b) => String(a.file || a.component).localeCompare(String(b.file || b.component), 'en'));
    writeJSON(path.join(out, 'sources.json'), { canvasCommit, skiaCommit, qualification: 'Partial public evidence; NOT license clearance or artifact attestation', records });
    console.log(JSON.stringify({ downloaded: records.filter(r => r.sha256).length, failed: records.filter(r => r.error).length, gate: 'NOT EVALUATED; collector never approves distribution' }));
  }
}
module.exports = { checkedURL };
if (require.main === module) collect(process.argv[2]).catch(e => { console.error(e.message); process.exitCode = 1; });
