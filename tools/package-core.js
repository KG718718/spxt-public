'use strict';
// Application-core archive only. No Node/dependency/OCR binaries or existing instance.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {zipSync,unzipSync}=require('fflate');
const specification=require('./package-manifest.json');
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function validatePath(name){
 if(typeof name!=='string'||!name||name.includes('\\')||name.startsWith('/')||/[:\x00-\x1f\x7f]/.test(name)
  ||name.split('/').some(p=>!p||p==='.'||p==='..')
  ||/(^|\/)(?:\.git|node_modules|attachments|backups|runtime|logs|evidence|tests|\.test-work|seed)(?:\/|$)/i.test(name)
  ||/(^|\/)(?:data\.json|config\.json|mail-reminder\.config\.json|\.env)(?:$|\.)/i.test(name))throw Error('Forbidden package path: '+name);
 return name;
}
function reviewedPaths(){
 const names=specification.applicationFiles.map(validatePath);
 if(new Set(names).size!==names.length||!names.includes('LICENSE')||!names.includes('server.js'))throw Error('Invalid application allowlist');
 return names;
}
function readFileInside(root,name){
 let current=root;
 for(const part of name.split('/')){
  current=path.join(current,part);
  if(fs.lstatSync(current).isSymbolicLink())throw Error('Package source link refused: '+name);
 }
 const real=fs.realpathSync(current),relative=path.relative(root,real);
 if(relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!fs.statSync(real).isFile())throw Error('Source outside package root');
 return fs.readFileSync(real);
}
function buildCore(root){
 root=fs.realpathSync(root);
 const files={},records=[];
 for(const name of reviewedPaths()){
  const bytes=readFileInside(root,name);
  files['K-SESSION/'+name]=[bytes,{mtime:new Date(2026,0,1)}];
  records.push({path:name,bytes:bytes.length,sha256:sha256(bytes)});
 }
 const manifest={schemaVersion:1,brand:specification.brand,version:specification.version,
  distribution:'application-core-only',runtimeIncluded:false,businessDataIncluded:false,
  installableStandalone:false,files:records};
 files['K-SESSION/PACKAGE-MANIFEST.json']=[Buffer.from(JSON.stringify(manifest,null,2)+'\n'),{mtime:new Date(2026,0,1)}];
 const bytes=Buffer.from(zipSync(files,{level:9}));
 verifyCore(bytes);
 return {bytes,sha256:sha256(bytes),manifest};
}
function verifyCore(bytes){
 const entries=unzipSync(bytes);
 const manifestBytes=entries['K-SESSION/PACKAGE-MANIFEST.json'];
 if(!manifestBytes)throw Error('Package manifest missing');
 const manifest=JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
 if(manifest.schemaVersion!==1||manifest.brand!==specification.brand||manifest.version!==specification.version
  ||manifest.distribution!=='application-core-only'||manifest.runtimeIncluded!==false
  ||manifest.businessDataIncluded!==false||manifest.installableStandalone!==false||!Array.isArray(manifest.files))throw Error('Package boundary mismatch');
 const expected=reviewedPaths(),seen=new Set();
 if(manifest.files.length!==expected.length||Object.keys(entries).length!==expected.length+1)throw Error('Package entries mismatch');
 for(const record of manifest.files){
  const name=validatePath(record.path),value=entries['K-SESSION/'+name];
  if(!expected.includes(name)||seen.has(name)||!value||record.bytes!==value.length||record.sha256!==sha256(value))throw Error('Package checksum or allowlist mismatch: '+name);
  seen.add(name);
 }
 return manifest;
}
module.exports={buildCore,verifyCore,validatePath,sha256};
