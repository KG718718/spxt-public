'use strict';
const fs=require('node:fs'),path=require('node:path');
const {inventory,sha,safePath}=require('./common.cjs');
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
  return {files:actual.length,manifestHash:sha(fs.readFileSync(path.join(root,mf))),integrity:'PASS',distribution:m.nativeLicenseReview?.nativeReview==='complete'?'requires-separate-approval':'BLOCKED-native-license'};
}
module.exports={verify};
if(require.main===module)console.log(JSON.stringify(verify(process.argv[2])));
