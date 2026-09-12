'use strict';
const fs=require('node:fs'),path=require('node:path'),{zipSync,unzipSync}=require('fflate');
const {buildCore,sha256}=require('./package-core');
function buildOnline(root,destination){
 if(process.env.GITHUB_ACTIONS!=='true')throw Error('Build online package only on authorized hosted runner');
 root=fs.realpathSync(root);if(fs.existsSync(destination))throw Error('Package destination must be new');
 const core=buildCore(root),entries=unzipSync(core.bytes),files={};
 for(const r of core.manifest.files)files['payload/'+r.path]=Buffer.from(entries['K-SESSION/'+r.path]);
 const payload={schemaVersion:1,product:'K-SESSION',brand:'K⁺-SESSION',version:core.manifest.version,instanceSchema:1,files:core.manifest.files};
 files['payload-manifest.json']=Buffer.from(JSON.stringify(payload,null,2)+'\n');
 for(const name of ['Install.cmd','Start.cmd','installer.js','launcher.js','install-common.js','distribution.json','README-install.md'])files[name]=fs.readFileSync(path.join(root,'tools','installer',name));
 for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md'])files[name]=fs.readFileSync(path.join(root,name));
 const manifest={schemaVersion:1,brand:'K⁺-SESSION',version:core.manifest.version,distribution:'online-installer-candidate',runtimeIncluded:false,businessDataIncluded:false,requiresFirstInstallNetwork:true,nodeVersion:'24.21.0',files:Object.entries(files).map(([name,b])=>({path:name,bytes:b.length,sha256:sha256(b)}))};
 files['PACKAGE-MANIFEST.json']=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
 fs.mkdirSync(destination,{recursive:true});
 const zipped={};for(const [name,bytes]of Object.entries(files)){const file=path.join(destination,...name.split('/'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});zipped['K-SESSION-Online-Setup/'+name]=[bytes,{mtime:new Date(2026,0,1)}];}
 const bytes=Buffer.from(zipSync(zipped,{level:9}));const verify=unzipSync(bytes);if(Object.keys(verify).length!==Object.keys(files).length)throw Error('Bundle file count mismatch');
 for(const [name,b]of Object.entries(files))if(sha256(verify['K-SESSION-Online-Setup/'+name])!==sha256(b))throw Error('Bundle verification failed');
 return {bytes,sha256:sha256(bytes),manifest};
}
module.exports={buildOnline};
