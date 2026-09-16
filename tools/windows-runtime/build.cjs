'use strict';
// Builds only from public Git blobs. A pending native-license gate retains staging,
// exits nonzero and intentionally does not emit a redistributable ZIP.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const {sha,safePath,inside,writeNew,writeJSON,inventory,productionEntries,cleanEnvironment,inspectPE,assertArchiveAllowed}=require('./common.cjs');
const [commit,outArg,toolArg,git]=process.argv.slice(2);
const repo=path.resolve(__dirname,'../..'),out=path.resolve(outArg),tool=path.resolve(toolArg);
if(process.platform!=='win32'||process.arch!=='x64')throw Error('Windows x64 required');
if(!/^[a-f0-9]{40}$/.test(commit)||inside(repo,out)||out===repo||!/^E:\\/i.test(out))throw Error('Unsafe source/output');
const temp=path.join(out,'temp');fs.mkdirSync(temp);
const env=cleanEnvironment(temp),node=path.join(tool,'node.exe');
function command(exe,args,extra={}){return cp.execFileSync(exe,args,{env,windowsHide:true,maxBuffer:32*1024*1024,timeout:180000,...extra});}
function blob(name){safePath(name);return command(git,['-C',repo,'show',commit+':'+name]);}
const json=name=>JSON.parse(blob(name));
const dist=json('tools/installer/distribution.json'),spec=json('tools/package-manifest.json'),lock=json('package-lock.json');
const report={sourceCommit:commit,sourceTree:command(git,['-C',repo,'rev-parse',commit+'^{tree}']).toString().trim(),platform:'win32-x64',os:{type:os.type(),release:os.release(),arch:os.arch()},checks:[],failures:[],artifact:null};
const stage=path.join(out,'KSESSION-RUNTIME'),app=path.join(stage,'app');
fs.mkdirSync(app,{recursive:true});
try {
  if(dist.nodeVersion!=='24.21.0'||sha(fs.readFileSync(node))!==dist.nodeExeSha256||process.execPath.toLowerCase()!==node.toLowerCase())throw Error('Pinned Node mismatch');
  report.nodeVersion=command(node,['--version']).toString().trim();
  if(report.nodeVersion!=='v'+dist.nodeVersion)throw Error('Actual Node version mismatch');
  const npm=path.join(tool,'node_modules/npm/bin/npm-cli.js');
  report.npmVersion=command(node,[npm,'--version']).toString().trim();
  const entries=productionEntries(lock);
  if(entries.length!==23)throw Error('Expected reviewed 23-package closure; inspect before changing baseline');
  if(spec.applicationFiles.length!==32)throw Error('Application allowlist changed');
  for(const name of spec.applicationFiles)writeNew(path.join(app,safePath(name)),blob(name));
  const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json')));
  if(JSON.stringify(pkg.dependencies)!==JSON.stringify(lock.packages[''].dependencies))throw Error('Root dependencies/lock mismatch');
  report.packageLockHash=sha(fs.readFileSync(path.join(app,'package-lock.json')));
  const userRC=path.join(out,'empty-user.npmrc'),globalRC=path.join(out,'empty-global.npmrc');
  writeNew(userRC,'');writeNew(globalRC,'');
  const flags=['ci','--omit=dev','--include=optional','--ignore-scripts','--bin-links=false','--audit=false','--fund=false','--strict-ssl=true','--registry=https://registry.npmjs.org/', '--userconfig='+userRC,'--globalconfig='+globalRC,'--cache='+path.join(out,'npm-cache')];
  console.log('Installing fresh production closure from public registry...');
  const npmLog=command(node,[npm,...flags],{cwd:app});writeNew(path.join(out,'npm-ci.log'),npmLog);
  if(sha(fs.readFileSync(path.join(app,'package-lock.json')))!==report.packageLockHash)throw Error('npm changed lockfile');
  // Verify the installed graph AND disk package directories; optional omission is not success.
  const actual=[];
  function packageDirs(base,rel='node_modules') {
    for(const e of fs.readdirSync(base,{withFileTypes:true})) {
      if(e.name==='.package-lock.json')continue;
      if(e.isSymbolicLink()||!e.isDirectory())throw Error('Unexpected node_modules entry');
      if(e.name.startsWith('@')) {
        for(const sub of fs.readdirSync(path.join(base,e.name),{withFileTypes:true})) {
          if(!sub.isDirectory()||sub.isSymbolicLink())throw Error('Unexpected scoped package');
          add(path.join(base,e.name,sub.name),rel+'/'+e.name+'/'+sub.name);
        }
      }else add(path.join(base,e.name),rel+'/'+e.name);
    }
  }
  function add(dir,rel){actual.push(rel);if(fs.existsSync(path.join(dir,'node_modules')))packageDirs(path.join(dir,'node_modules'),rel+'/node_modules');}
  packageDirs(path.join(app,'node_modules'));
  if(JSON.stringify(actual.sort())!==JSON.stringify(entries.map(e=>e.path).sort()))throw Error('Installed dependency set differs from closure');
  const sources=json('tools/dependency-license-sources.json').sources,dependencies=[],licenseItems=[];
  const noticeName=/^(licen[cs]e|copying|notices?|copyright|third[ ._-]*party[ ._-]*(?:licen[cs]es?|notices?))([ ._-].*)?$/i;
  for(const entry of entries) {
    const base=path.join(app,entry.path),p=JSON.parse(fs.readFileSync(path.join(base,'package.json')));
    const expectedName=entry.path.split('node_modules/').at(-1);
    if(p.name!==expectedName||p.version!==entry.version)throw Error('Installed package mismatch: '+entry.path);
    const lic=typeof p.license==='string'?p.license:p.license?.type||(p.licenses?.length===1?p.licenses[0].type:null);
    if((entry.license&&lic!==entry.license)||!['MIT','MIT-0','ISC','Apache-2.0'].includes(lic))throw Error('License metadata requires review: '+p.name);
    let notices=inventory(base).filter(f=>noticeName.test(path.posix.basename(f.path))).map(f=>({rel:f.path,bytes:fs.readFileSync(path.join(base,f.path))}));
    let mapping=null;
    if(!notices.some(n=>/^(licen[cs]e|copying)([._-].*)?$/i.test(path.posix.basename(n.rel)))) {
      mapping=sources[entry.path];
      if(!mapping||mapping.version!==entry.version||mapping.license!==lic)throw Error('Missing original license: '+p.name);
      const provider=path.join(app,safePath(mapping.providerPath));
      if(JSON.parse(fs.readFileSync(path.join(provider,'package.json'))).version!==mapping.providerVersion)throw Error('License provider mismatch');
      const bytes=fs.readFileSync(path.join(provider,safePath(mapping.file)));
      if(sha(bytes)!==mapping.sha256)throw Error('License source hash mismatch');
      notices.push({rel:'LICENSE.from-upstream-project',bytes});
    }
    const refs=[];
    for(const n of notices) {
      const rel='licenses/npm-packages/'+expectedName+'/'+n.rel;
      writeNew(path.join(stage,safePath(rel)),n.bytes);refs.push({path:rel,sha256:sha(n.bytes)});
    }
    dependencies.push({name:p.name,version:p.version,path:'app/'+entry.path,resolved:entry.resolved,integrity:entry.integrity,license:lic,licenseFiles:refs,licenseSource:mapping});
    licenseItems.push({name:p.name,version:p.version,license:lic,files:refs});
  }
  writeNew(path.join(stage,'runtime/node.exe'),fs.readFileSync(node));
  writeNew(path.join(stage,'licenses/node/LICENSE'),fs.readFileSync(path.join(tool,'LICENSE')));
  licenseItems.push({name:'Node.js',version:dist.nodeVersion,files:[{path:'licenses/node/LICENSE',sha256:sha(fs.readFileSync(path.join(tool,'LICENSE')))}]});
  writeJSON(path.join(stage,'manifest/dependencies.json'),dependencies);
  report.dependencies=dependencies.map(({name,version})=>({name,version}));
  report.dependencyCount=dependencies.length;
  report.nativeFiles=inventory(stage).filter(f=>/\.(exe|node|dll)$/i.test(f.path)).map(f=>({...f,...inspectPE(fs.readFileSync(path.join(stage,f.path)))}));
  const expectedNative='app/node_modules/@napi-rs/canvas-win32-x64-msvc/skia.win32-x64-msvc.node';
  if(!report.nativeFiles.some(f=>f.path===expectedNative))throw Error('Canvas native binding missing');
  report.pdfResources=inventory(path.join(app,'node_modules/pdfjs-dist')).filter(f=>/(^|\/)(cmaps|standard_fonts|wasm)\/|pdf\.worker.*\.mjs$/.test(f.path));
  for(const required of ['cmaps/','standard_fonts/','wasm/','legacy/build/pdf.worker.mjs'])if(!report.pdfResources.some(f=>f.path.includes(required)))throw Error('PDF resource missing: '+required);
  const probe=command(path.join(stage,'runtime/node.exe'),[path.resolve(__dirname,'../tests/windows-runtime/modules.cjs'),stage],{cwd:app});
  writeNew(path.join(out,'modules.json'),probe);report.moduleProbe=JSON.parse(probe);
  report.checks.push('pinned-node','source-blobs','fresh-npm-ci','exact-production-graph','original-package-notices','x64-PE','canvas-functional','pdf-dynamic-import','pdf-resource-inventory');
  report.license={nativeReview:'pending-before-distribution',nativeEvidence:[],reason:'Exact platform package maps to parent MIT; compiled Skia dependency notices are not yet established by approved source evidence.'};
  const payload=inventory(stage);
  const manifest={format:'k-session-runtime',manifestSchema:1,product:'K-SESSION',version:pkg.version,platform:'win32-x64',sourceRepository:'https://github.com/KG718718/spxt-public',sourceCommit:commit,sourceTree:report.sourceTree,nodeVersion:dist.nodeVersion,nodeHash:dist.nodeExeSha256,nodeArchiveHash:dist.nodeArchiveSha256,packageLockHash:report.packageLockHash,build:{npmVersion:report.npmVersion,os:report.os,flags:['ci','--omit=dev','--include=optional','--ignore-scripts','--bin-links=false'],toolFiles:inventory(__dirname)},dependencies,files:payload,licenses:licenseItems,nativeLicenseReview:report.license,instanceSchema:1,businessDataIncluded:false,launcherIncluded:false,ocrEngineIncluded:false,runtimeIncluded:true,entrypoint:'app/server.js',instanceContract:'Explicit external KSESSION_* paths required; prototype is not a launcher or installer.'};
  writeJSON(path.join(stage,'manifest/runtime-manifest.json'),manifest);
  const summed=inventory(stage);writeNew(path.join(stage,'hashes/SHA256SUMS.txt'),summed.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
  report.fileCount=summed.length+1;report.uncompressedBytes=inventory(stage).reduce((sum,f)=>sum+f.bytes,0);
  report.manifestHash=sha(fs.readFileSync(path.join(stage,'manifest/runtime-manifest.json')));
  const {verify}=require('./verify.cjs');verify(stage);report.checks.push('manifest-and-exact-file-set');
  // This gate is intentionally fail-closed. A later reviewed native license implementation
  // must supply exact component evidence; changing this string is not a review.
  assertArchiveAllowed(report.license);
  const {createRequire}=require('node:module');
  const {zipSync,unzipSync}=createRequire(path.join(app,'package.json'))('fflate');
  const contents=Object.fromEntries(inventory(stage).map(f=>['KSESSION-RUNTIME/'+f.path,[fs.readFileSync(path.join(stage,f.path)),{mtime:new Date('2026-01-01T00:00:00Z')}]]));
  const bytes=zipSync(contents,{level:6}),unpacked=unzipSync(bytes),files=inventory(stage);
  if(Object.keys(unpacked).length!==files.length)throw Error('ZIP file count mismatch');
  for(const f of files)if(sha(unpacked['KSESSION-RUNTIME/'+f.path])!==f.sha256)throw Error('ZIP roundtrip mismatch');
  const filename='K-SESSION-runtime-prototype-win-x64.zip';
  writeNew(path.join(out,'artifacts',filename),bytes);
  writeNew(path.join(out,'artifacts',filename+'.sha256'),sha(bytes)+'  '+filename+'\n');
  report.artifact={filename,bytes:bytes.length,sha256:sha(bytes)};
} catch(e) {report.failures.push(e.message);process.exitCode=1;}
finally {
  report.status=report.failures.length?'FAIL':'PASS';
  writeJSON(path.join(out,'build-report.json'),report);
  console.log(JSON.stringify({status:report.status,dependencyCount:report.dependencyCount,files:report.fileCount,failures:report.failures,artifact:report.artifact}));
}
