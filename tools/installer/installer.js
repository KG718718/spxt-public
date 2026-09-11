'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),readline=require('node:readline/promises');
const C=require('./install-common');
async function main(){
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('Windows x64 is required');
 const a=C.args(process.argv.slice(2),{'--target':true,'--runtime':true,'--archive':true});
 const bundle=__dirname,m=C.verifyPayload(bundle),dist=C.readJSON(C.inside(bundle,'distribution.json'));C.verifyNpm(path.join(bundle,'payload'));
 if(dist.nodeVersion!=='24.21.0'||dist.nodeUrl!=='https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip'||dist.npmRegistry!=='https://registry.npmjs.org/')throw Error('Unsupported distribution');
 if(!a['--runtime']||!a['--archive'])throw Error('Run Install.cmd to obtain the verified official Node runtime');
 const runtime=path.resolve(a['--runtime']),archive=path.resolve(a['--archive']);C.noLinks(runtime);C.noLinks(archive);
 if(C.sha(fs.readFileSync(archive))!==dist.nodeArchiveSha256)throw Error('Node archive checksum mismatch');
 const node=C.inside(runtime,'node.exe');if(C.sha(fs.readFileSync(node))!==dist.nodeExeSha256)throw Error('Node executable checksum mismatch');
 if(cp.execFileSync(node,['--version'],{encoding:'utf8',windowsHide:true}).trim()!=='v'+dist.nodeVersion)throw Error('Node version mismatch');
 if(!fs.existsSync(C.inside(runtime,'LICENSE'))||!fs.existsSync(C.inside(runtime,'node_modules/npm/bin/npm-cli.js')))throw Error('Incomplete official Node runtime');
 let requested=a['--target'];
 if(!requested){if(!process.stdin.isTTY)throw Error('Provide --target for noninteractive installation');const r=readline.createInterface({input:process.stdin,output:process.stdout});try{requested=(await r.question('Install directory (blank = '+path.resolve(bundle,'../K-SESSION')+'): ')).trim()||path.resolve(bundle,'../K-SESSION');}finally{r.close();}}
 const target=path.resolve(requested);C.noLinks(target);
 if(target===path.parse(target).root||target.startsWith('\\\\')||target===bundle||target.startsWith(bundle+path.sep)||bundle.startsWith(target+path.sep))throw Error('Unsafe destination: choose a separate local installation directory');
 if(fs.existsSync(target)){if(!fs.statSync(target).isDirectory())throw Error('Destination is not a directory');if(fs.readdirSync(target).length)C.verifyRoot(target);}else fs.mkdirSync(target,{recursive:true});
 const release=C.sha(fs.readFileSync(path.join(bundle,'payload-manifest.json'))),unlock=C.acquire(target,'installation');
 try{
  const marker=C.inside(target,'install.json');if(!fs.existsSync(marker))C.atomicJSON(marker,{schema:1,product:'K-SESSION'});
  const oldActivePath=C.inside(target,'active.json'),oldActive=fs.existsSync(oldActivePath)?fs.readFileSync(oldActivePath,'utf8'):null;
  if(oldActive!==null){const old=JSON.parse(oldActive);if(old.instanceSchema!==m.instanceSchema)throw Error('Different instance schema requires an independently reviewed migration, not this installer');}
  const files=['launcher.js','install-common.js','Start.cmd'];
  for(const f of files){const dest=C.inside(target,f);if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(fs.readFileSync(C.inside(bundle,f))))throw Error('Installed launcher differs; stop and review installer compatibility before upgrading');}
  const targetRuntime=C.inside(target,'runtime');
  if(fs.existsSync(targetRuntime)){if(C.sha(fs.readFileSync(C.inside(targetRuntime,'node.exe')))!==dist.nodeExeSha256)throw Error('Existing runtime version or checksum mismatch');}
  const versions=C.inside(target,'versions');fs.mkdirSync(versions,{recursive:true});const version=C.inside(versions,release);
  const stage=C.inside(target,'.staging-'+require('node:crypto').randomBytes(12).toString('hex'));fs.mkdirSync(stage);
  if(fs.existsSync(version)){C.verifyFiles(C.inside(version,'app'),m,true);C.dependencies(version);}
  else {
   const app=C.inside(stage,'app');fs.cpSync(path.join(bundle,'payload'),app,{recursive:true,force:false,errorOnExist:true});C.verifyFiles(app,m);
   const npm=C.inside(runtime,'node_modules/npm/bin/npm-cli.js'),emptyRC=path.join(stage,'empty.npmrc');fs.writeFileSync(emptyRC,'',{flag:'wx'});const globalRC=path.join(stage,'empty.global.npmrc');fs.writeFileSync(globalRC,'',{flag:'wx'});
   console.log('Installing pinned dependencies from https://registry.npmjs.org/ (lifecycle scripts disabled)...');
   const result=cp.spawnSync(node,[npm,'ci','--omit=dev','--ignore-scripts','--no-fund','--no-audit','--strict-ssl=true','--registry=https://registry.npmjs.org/','--userconfig='+emptyRC,'--globalconfig='+globalRC,'--cache='+path.join(stage,'npm-cache')],{cwd:app,windowsHide:true,stdio:'inherit',timeout:600000,env:{...process.env,NODE_ENV:'production'}});
   if(result.error||result.status!==0)throw Error('Dependency installation failed; previous active version and instance unchanged');
   C.verifyFiles(app,m,true);
   cp.execFileSync(node,['-e',"for(const n of Object.keys(require('./package.json').dependencies))require(n);console.log('Dependency load check passed');"],{cwd:app,windowsHide:true,timeout:60000,stdio:'inherit'});
   const prepared=C.inside(stage,'version');fs.mkdirSync(prepared);fs.renameSync(app,path.join(prepared,'app'));fs.copyFileSync(path.join(bundle,'payload-manifest.json'),path.join(prepared,'payload-manifest.json'),fs.constants.COPYFILE_EXCL);
   C.dependencies(prepared,true);fs.renameSync(prepared,version);
  }
  if(!fs.existsSync(targetRuntime)){C.list(runtime);const stagedRuntime=path.join(stage,'runtime');fs.cpSync(runtime,stagedRuntime,{recursive:true,force:false,errorOnExist:true});if(C.sha(fs.readFileSync(path.join(stagedRuntime,'node.exe')))!==dist.nodeExeSha256)throw Error('Copied runtime checksum mismatch');fs.renameSync(stagedRuntime,targetRuntime);}
  for(const f of files){const dest=C.inside(target,f);if(!fs.existsSync(dest))fs.copyFileSync(C.inside(bundle,f),dest,fs.constants.COPYFILE_EXCL);}
  const now=fs.existsSync(oldActivePath)?fs.readFileSync(oldActivePath,'utf8'):null;if(now!==oldActive)throw Error('Active version changed unexpectedly; not switching');
  C.atomicJSON(C.inside(target,'installation.json'),{schema:1,product:'K-SESSION',bootstrapArchive:archive,nodeVersion:dist.nodeVersion,nodeArchiveSha256:dist.nodeArchiveSha256,nodeExeSha256:dist.nodeExeSha256,nodeSource:dist.nodeUrl,payloadRelease:release,installedAt:new Date().toISOString()});
  C.atomicJSON(oldActivePath,{schema:1,product:'K-SESSION',release,instanceSchema:m.instanceSchema,nodeVersion:dist.nodeVersion,nodeExeSha256:dist.nodeExeSha256});
  console.log('Installation verified: '+target);console.log('Run Start.cmd. The first Admin is created locally; no account or business data is bundled.');
  console.log('Earlier versions, existing instance and failed staging evidence are preserved. No firewall, service, PATH or security policy was changed.');
 }finally{unlock();}
}
if(require.main===module)main().catch(e=>{console.error('INSTALL FAILED: '+e.message);process.exitCode=1;});
module.exports={main};
