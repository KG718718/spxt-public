'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
(async()=>{
  const stage=path.resolve(process.argv[2]),app=path.join(stage,'app'),load=createRequire(path.join(app,'package.json'));
  assert.equal(process.execPath.toLowerCase(),path.join(stage,'runtime/node.exe').toLowerCase());
  assert.equal(process.arch,'x64');assert.equal(process.version,'v24.21.0');
  const resolved={};
  for(const name of ['@napi-rs/canvas','@napi-rs/canvas-win32-x64-msvc','pdf-parse','pdfjs-dist/legacy/build/pdf.mjs','write-excel-file/node','fflate','multer','nodemailer']) {
    const file=load.resolve(name);assert.ok(file.startsWith(app+path.sep));resolved[name]=path.relative(stage,file).replaceAll('\\','/');
  }
  const canvas=load('@napi-rs/canvas'),image=canvas.createCanvas(16,16),ctx=image.getContext('2d');ctx.fillStyle='#d5af60';ctx.fillRect(0,0,16,16);
  const png=image.toBuffer('image/png');assert.equal(png.subarray(1,4).toString(),'PNG');
  const decoded=await canvas.loadImage(png);assert.equal(decoded.width,16);
  const parse=load('pdf-parse');assert.equal(typeof parse.PDFParse,'function');
  const pdfjs=await import(pathToFileURL(load.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);assert.equal(typeof pdfjs.getDocument,'function');
  console.log(JSON.stringify({node:process.version,arch:process.arch,resolved,canvasRoundTrip:'PASS',pdfParseLoad:'PASS',pdfDynamicImport:'PASS',qualification:'Windows build-host probe, not clean Windows 11/offline G1'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
