'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function safeRelative(name){
 if(typeof name!=='string'||!name||name.includes('\\')||path.isAbsolute(name)||/[:\x00-\x1f\x7f]/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(p))||/(^|\/)\.env($|\.)/i.test(name))throw Error('Unsafe relative path');
 return name;
}
function noLinks(p){
 let q=path.resolve(p),parts=[];while(true){parts.push(q);const parent=path.dirname(q);if(parent===q)break;q=parent;}
 for(const x of parts.reverse())if(fs.existsSync(x)&&fs.lstatSync(x).isSymbolicLink())throw Error('Linked path refused: '+x);
}
function inside(root,relative){safeRelative(relative);const p=path.resolve(root,...relative.split('/'));const r=path.relative(root,p);if(r.startsWith('..')||path.isAbsolute(r))throw Error('Outside installation');noLinks(p);return p;}
function list(root,prefix=''){noLinks(root);const result=[];for(const e of fs.readdirSync(root,{withFileTypes:true})){const rel=prefix+e.name,p=path.join(root,e.name);if(e.isSymbolicLink())throw Error('Source link refused');if(e.isDirectory())result.push(...list(p,rel+'/'));else if(e.isFile())result.push(rel);else throw Error('Special file refused');}return result.sort();}
function dependencies(version,save=false){
 const dir=inside(version,'app/node_modules'),files=list(dir).map(name=>({path:name,sha256:sha(fs.readFileSync(inside(dir,name)))}));
 const dest=inside(version,'dependency-manifest.json');
 if(save){fs.writeFileSync(dest,JSON.stringify({schema:1,files},null,2)+'\n',{flag:'wx'});}
 else{const expected=readJSON(dest);if(expected.schema!==1||JSON.stringify(expected.files)!==JSON.stringify(files))throw Error('Installed dependency checksum mismatch; recover or reinstall into a new clean directory');}
 return files.length;
}
function readJSON(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function validateManifest(m){
 if(m.schemaVersion!==1||m.product!=='K-SESSION'||m.instanceSchema!==1||!Array.isArray(m.files)||m.files.length!==32)throw Error('Unsupported payload manifest');
 const names=new Set();for(const f of m.files){safeRelative(f.path);if(names.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256)||/(^|\/)(node_modules|attachments|backups|runtime|data\.json|config\.json|\.git)(\/|$)/i.test(f.path))throw Error('Invalid payload manifest');names.add(f.path);}
 if(!names.has('server.js')||!names.has('LICENSE')||!names.has('package-lock.json'))throw Error('Incomplete payload');return m;
}
function verifyFiles(root,m,installed=false){
 validateManifest(m);
 for(const r of m.files){const p=inside(root,r.path),b=fs.readFileSync(p);if(b.length!==r.bytes||sha(b)!==r.sha256)throw Error('Payload checksum mismatch: '+r.path);}
 if(!installed){const expected=m.files.map(x=>x.path).sort();if(JSON.stringify(list(root))!==JSON.stringify(expected))throw Error('Unexpected payload files');}
 return m;
}
function verifyPayload(bundle){return verifyFiles(path.join(bundle,'payload'),readJSON(inside(bundle,'payload-manifest.json')));}
function verifyNpm(app){
 const lock=readJSON(inside(app,'package-lock.json'));if(lock.lockfileVersion!==3||!lock.packages)throw Error('Locked npm v3 manifest required');
 for(const [name,p]of Object.entries(lock.packages)){if(!name)continue;if(!/^https:\/\/registry\.npmjs\.org\/[^?#]+$/.test(p.resolved||'')||!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(p.integrity||'')||p.link)throw Error('Non-official or unpinned dependency refused: '+name);}
}
function atomicJSON(file,value){noLinks(file);const tmp=file+'.'+crypto.randomBytes(10).toString('hex')+'.tmp';const fd=fs.openSync(tmp,'wx');try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}try{fs.renameSync(tmp,file);}catch(e){fs.unlinkSync(tmp);throw e;}}
function acquire(root,purpose){
 const file=inside(root,'.lifecycle.lock'),text=JSON.stringify({pid:process.pid,purpose,nonce:crypto.randomBytes(16).toString('hex'),createdAt:new Date().toISOString()});
 let fd;try{fd=fs.openSync(file,'wx');}catch(e){if(e.code==='EEXIST')throw Error('Installation lock exists: application or installation is running. If a prior process crashed, verify it has stopped before manually removing only .lifecycle.lock.');throw e;}
 try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 return ()=>{if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===text)fs.unlinkSync(file);};
}
function args(argv,allowed){const result={};for(let i=0;i<argv.length;i++){const key=argv[i];if(!Object.hasOwn(allowed,key)||Object.hasOwn(result,key))throw Error('Unknown or duplicate option: '+key);if(allowed[key]){if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Missing value: '+key);result[key]=argv[++i];}else result[key]=true;}return result;}
function verifyRoot(root){noLinks(root);const m=readJSON(inside(root,'install.json'));if(m.schema!==1||m.product!=='K-SESSION')throw Error('Unrecognized installation');return m;}
module.exports={sha,safeRelative,noLinks,inside,list,readJSON,validateManifest,verifyFiles,verifyPayload,verifyNpm,dependencies,atomicJSON,acquire,args,verifyRoot};
