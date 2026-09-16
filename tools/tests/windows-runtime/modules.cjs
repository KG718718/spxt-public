'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),{createRequire}=Module,{pathToFileURL}=require('node:url');
(async()=>{
  const stage=path.resolve(process.argv[2]),app=path.join(stage,'app'),load=createRequire(path.join(app,'package.json'));
  assert.equal(process.execPath.toLowerCase(),path.join(stage,'runtime/node.exe').toLowerCase());
  assert.equal(process.arch,'x64');assert.equal(process.version,'v24.21.0');
  const resolved={};
  const native=[],canvas=[],warnings=[],original=Module._load,dlopen=process.dlopen,log=console.log;
  Module._load=function(id,...args){if(/canvas|skia|pdf-parse/i.test(id))canvas.push(id);return original.call(this,id,...args);};
  process.dlopen=function(m,f,...args){native.push(f);return dlopen.call(this,m,f,...args);};
  console.log=(...args)=>warnings.push(args.join(' '));console.warn=console.log;
  for(const name of ['pdfjs-dist/build/pdf.mjs','write-excel-file/node','fflate','multer','nodemailer']) {
    const file=load.resolve(name);assert.ok(file.startsWith(app+path.sep));resolved[name]=path.relative(stage,file).replaceAll('\\','/');
  }
  for(const name of ['write-excel-file/node','fflate','multer','nodemailer'])load(name);
  const pdfjs=await import(pathToFileURL(load.resolve('pdfjs-dist/build/pdf.mjs')).href);assert.equal(typeof pdfjs.getDocument,'function');assert.equal(pdfjs.version,'4.10.38');
  for(const name of ['@napi-rs/canvas','@napi-rs/canvas-win32-x64-msvc','pdf-parse'])assert.equal(fs.existsSync(path.join(app,'node_modules',name)),false);
  assert.deepEqual(native,[]);assert.deepEqual(canvas,[]);assert.deepEqual(warnings,['Warning: Please use the `legacy` build in Node.js environments.']);
  log(JSON.stringify({node:process.version,arch:process.arch,resolved,nativeLoads:native,canvasLoads:canvas,warnings,pdfDynamicImport:'PASS',qualification:'Module probe only; functional PDF verified separately via server function and API'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
