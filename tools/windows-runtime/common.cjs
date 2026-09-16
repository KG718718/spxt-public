'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function safePath(value) {
  if (typeof value !== 'string' || !value || /[\\:\x00-\x1f]/.test(value) || value.startsWith('/')) throw Error('Unsafe relative path');
  for (const part of value.split('/')) {
    if (!part || part === '.' || part === '..' || /[. ]$/.test(part) || /[<>"|?*]/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) throw Error('Unsafe path component');
  }
  return value;
}
function inside(parent, child) {
  const r = path.relative(path.resolve(parent),path.resolve(child));
  return r !== '' && !r.startsWith('..'+path.sep) && r !== '..' && !path.isAbsolute(r);
}
function writeNew(file, value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,value,{flag:'wx'});
}
function writeJSON(file,value) {writeNew(file,JSON.stringify(value,null,2)+'\n');}
function inventory(root) {
  const result=[], seen=new Set();
  if (fs.lstatSync(root).isSymbolicLink()) throw Error('Linked package root');
  function walk(dir,rel='') {
    for (const name of fs.readdirSync(dir).sort()) {
      const p=safePath(rel?rel+'/'+name:name),full=path.join(dir,name),s=fs.lstatSync(full);
      if (s.isSymbolicLink() || !inside(root,fs.realpathSync(full))) throw Error('Link or escaped file: '+p);
      if (seen.has(p.toLowerCase())) throw Error('Case collision: '+p);
      seen.add(p.toLowerCase());
      if(s.isDirectory())walk(full,p);
      else if(s.isFile())result.push({path:p,bytes:s.size,sha256:sha(fs.readFileSync(full))});
      else throw Error('Unsupported file: '+p);
    }
  }
  walk(root);return result.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
function productionEntries(lock) {
  if(lock.lockfileVersion!==3 || !lock.packages?.[''])throw Error('Expected v3 lock');
  const entries=[];
  for(const [key,item] of Object.entries(lock.packages)) {
    if(!key)continue;
    safePath(key);
    if(!key.startsWith('node_modules/') || item.link)throw Error('Unsafe dependency path/link');
    if(item.dev)continue;
    const match=(values,want)=>!values || (!values.includes('!'+want) && (values.includes(want)||values.every(x=>x.startsWith('!'))));
    if(!match(item.os,'win32')||!match(item.cpu,'x64'))continue;
    const u=new URL(item.resolved);
    if(u.protocol!=='https:'||u.hostname!=='registry.npmjs.org'||u.port||u.username||u.password||u.search||u.hash||!/^sha512-[A-Za-z0-9+/]{86}==$/.test(item.integrity||''))throw Error('Untrusted or unlocked dependency: '+key);
    if(!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(item.version))throw Error('Unpinned dependency');
    entries.push({path:key,...item});
  }
  return entries;
}
function cleanEnvironment(temp, source=process.env) {
  const system=source.SystemRoot||source.SYSTEMROOT;
  if(!system)throw Error('Windows SystemRoot missing');
  // Allowlist, never copy credential/proxy/npm/NODE_* settings from the parent.
  return {SystemRoot:system,WINDIR:system,ComSpec:path.join(system,'System32','cmd.exe'),
    PATH:path.join(system,'System32')+';'+system+';'+path.join(system,'System32','WindowsPowerShell','v1.0'),
    TEMP:temp,TMP:temp,HOME:temp,USERPROFILE:temp,APPDATA:temp,LOCALAPPDATA:temp};
}
function inspectPE(b) {
  if(b.length<256||b.toString('ascii',0,2)!=='MZ')throw Error('Not PE');
  const pe=b.readUInt32LE(0x3c);
  if(pe+256>b.length||b.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('Invalid PE');
  const machine=b.readUInt16LE(pe+4),count=b.readUInt16LE(pe+6),opt=pe+24,size=b.readUInt16LE(pe+20);
  if(machine!==0x8664||b.readUInt16LE(opt)!==0x20b)throw Error('Not AMD64 PE32+');
  const sections=[];
  for(let i=0;i<count;i++){const o=opt+size+40*i;sections.push({rva:b.readUInt32LE(o+12),size:Math.max(b.readUInt32LE(o+8),b.readUInt32LE(o+16)),raw:b.readUInt32LE(o+20)});}
  function offset(rva){const s=sections.find(x=>rva>=x.rva&&rva<x.rva+x.size);if(!s)throw Error('Unmapped PE RVA');return s.raw+rva-s.rva;}
  function str(rva){const o=offset(rva),end=b.indexOf(0,o);if(end<o||end-o>256)throw Error('Invalid PE import');return b.toString('ascii',o,end);}
  const imports=[],delayImports=[];
  for(const [index,step,target,nameOffset] of [[1,20,imports,12],[13,32,delayImports,4]]) {
    const rva=b.readUInt32LE(opt+112+index*8);if(!rva)continue;
    let o=offset(rva);
    for(let n=0;n<1024;n++,o+=step){const name=b.readUInt32LE(o+nameOffset);if(!name)break;if(index===13&&!(b.readUInt32LE(o)&1))throw Error('Unsupported VA delay imports');target.push(str(name));}
  }
  return {machine:'AMD64',imports,delayImports};
}
function assertArchiveAllowed(license) {
  if(license.nativeReview!=='complete'||!Array.isArray(license.nativeEvidence)||!license.nativeEvidence.length)throw Error('Native license gate: review and exact component evidence required; no ZIP generated');
  for(const item of license.nativeEvidence)if(!/^[a-f0-9]{64}$/.test(item.sha256)||!safePath(item.path).startsWith('licenses/native/'))throw Error('Invalid native evidence');
  return true;
}
module.exports={sha,safePath,inside,writeNew,writeJSON,inventory,productionEntries,cleanEnvironment,inspectPE,assertArchiveAllowed};
