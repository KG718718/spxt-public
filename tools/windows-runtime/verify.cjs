'use strict';
const fs=require('node:fs'),path=require('node:path');
const {inventory,sha,safePath,assertArchiveAllowed,productionEntries}=require('./common.cjs');
function verify(root) {
  root=path.resolve(root);
  const actual=inventory(root),mf='manifest/runtime-manifest.json',hf='hashes/SHA256SUMS.txt';
  const m=JSON.parse(fs.readFileSync(path.join(root,mf)));
  if(m.format!=='k-session-runtime'||m.manifestSchema!==1||m.platform!=='win32-x64'||m.businessDataIncluded!==false||m.launcherIncluded!==false||m.ocrEngineIncluded!==false)throw Error('Unsupported manifest');
  const expected=new Map();
  for(const f of m.files){safePath(f.path);if(expected.has(f.path.toLowerCase())||[mf,hf].includes(f.path)||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Invalid manifest file');expected.set(f.path.toLowerCase(),f);}
  for(const f of actual) {
    if([mf,hf].includes(f.path))continue;
    const e=expected.get(f.path.toLowerCase());
    if(!e||e.path!==f.path||e.bytes!==f.bytes||e.sha256!==f.sha256)throw Error('Unexpected/changed file: '+f.path);
    expected.delete(f.path.toLowerCase());
    if(/^(?:instance|attachments|backups)\//i.test(f.path)||/^app\/(?:data\.json|config\.json|\.env|\.npmrc|mail-reminder\.config\.json|runtime\/|attachments\/|backups\/)/i.test(f.path))throw Error('Instance contamination');
  }
  if(expected.size)throw Error('Missing files: '+[...expected.keys()].join(','));
  const calculated=actual.filter(f=>f.path!==hf).map(f=>f.sha256+'  '+f.path).join('\n')+'\n';
  if(fs.readFileSync(path.join(root,hf),'utf8')!==calculated)throw Error('Hash inventory mismatch');
  if(sha(fs.readFileSync(path.join(root,'runtime/node.exe')))!==m.nodeHash||sha(fs.readFileSync(path.join(root,'app/package-lock.json')))!==m.packageLockHash)throw Error('Identity mismatch');
  let distribution='BLOCKED-native-license';
  if(m.nativeLicenseReview?.route==='pure-js-npm'){
    const license=m.nativeLicenseReview;assertArchiveAllowed(license);
    const hashFile=f=>sha(fs.readFileSync(path.join(root,f)));
    if(hashFile('manifest/dependencies.json')!==license.dependencyManifestHash||hashFile('manifest/closure-policy.json')!==license.policyHash||hashFile('licenses/node/LICENSE')!==license.nodeLicenseHash)throw Error('License proof identity mismatch');
    const policy=JSON.parse(fs.readFileSync(path.join(root,'manifest/closure-policy.json'))),lock=JSON.parse(fs.readFileSync(path.join(root,'app/package-lock.json')));
    const entries=productionEntries(lock,{omitOptional:true});
    if(m.packageLockHash!==policy.packageLockSha256||entries.length!==20||m.dependencies.length!==20)throw Error('Reviewed closure mismatch');
    if(actual.some(f=>/^app\/node_modules\//.test(f.path)&&(/(^|\/)(?:@napi-rs\/canvas[^/]*|canvas|pdf-parse)(?:\/|$)/i.test(f.path)||/\.(exe|node|dll|wasm)$/i.test(f.path))))throw Error('Forbidden production chain');
    for(const entry of entries){const dep=m.dependencies.find(d=>d.path==='app/'+entry.path),p=JSON.parse(fs.readFileSync(path.join(root,'app',entry.path,'package.json')));if(!dep||dep.version!==entry.version||p.name!==dep.name||p.version!==dep.version)throw Error('Actual dependency mismatch');}
    for(const entry of m.licenses)for(const f of entry.files){safePath(f.path);if(hashFile(f.path)!==f.sha256)throw Error('Original notice missing/changed');}
    for(const f of [...policy.requiredPdfResources,...policy.requiredPdfNotices])if(!actual.some(x=>x.path==='app/node_modules/pdfjs-dist/'+f))throw Error('PDF resource missing');
    distribution='prototype-license-closure-complete; tests and G1 remain separate';
  }
  return {files:actual.length,manifestHash:sha(fs.readFileSync(path.join(root,mf))),integrity:'PASS',distribution};
}
module.exports={verify};
if(require.main===module)console.log(JSON.stringify(verify(process.argv[2])));
