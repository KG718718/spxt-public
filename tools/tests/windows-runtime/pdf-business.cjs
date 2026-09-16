'use strict';
// Executes the verbatim extraction functions from the supplied server.js, not a replacement parser.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),crypto=require('node:crypto');
const [appArg,fixturesArg,mode='strict']=process.argv.slice(2),app=path.resolve(appArg),fixtures=path.resolve(fixturesArg);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const result={mode,node:process.version,serverHash:digest(fs.readFileSync(path.join(app,'server.js'))),warnings:[],errors:[],nativeLoads:[],canvasLoads:[],networkAttempts:[],cases:[]};
const out=process.stdout.write.bind(process.stdout);
for(const k of ['log','warn','error'])console[k]=(...args)=>result[k==='error'?'errors':'warnings'].push(args.map(String).join(' '));
const resolve=Module._resolveFilename;Module._resolveFilename=function(...args){const f=resolve.apply(this,args);if(typeof f==='string'&&/[\\/]node_modules[\\/]/.test(f)&&!f.toLowerCase().startsWith((app+path.sep).toLowerCase()))throw Error('Dependency escaped supplied application');return f;};
const load=Module._load;Module._load=function(id,...args){if(/canvas|skia/i.test(id))result.canvasLoads.push(id);return load.call(this,id,...args);};
const dlopen=process.dlopen;process.dlopen=function(m,f,...args){result.nativeLoads.push(path.relative(app,f));return dlopen.call(this,m,f,...args);};
const deny=name=>()=>{result.networkAttempts.push(name);throw Error('PDF test forbids network: '+name);};
for(const name of ['http','https'])for(const k of ['get','request'])require('node:'+name)[k]=deny(name+'.'+k);
require('node:net').Socket.prototype.connect=deny('net.connect');globalThis.fetch=deny('fetch');Module.syncBuiltinESMExports();
const source=fs.readFileSync(path.join(app,'server.js'),'utf8');
const begin=source.indexOf('let pdfjsLoader = null;'),end=source.indexOf('\nfunction uniqueList(',begin);
assert.ok(begin>0&&end>begin,'Expected exact server extraction section');
const text=source.slice(begin,end),m=new Module(path.join(app,'__runtime_pdf_test__.cjs'));m.filename=path.join(app,'__runtime_pdf_test__.cjs');m.paths=Module._nodeModulePaths(app);
m._compile("const fs=require('node:fs'),path=require('node:path');\n"+text+'\nmodule.exports={extractPdfTextVariants,buildPdfCoordinateText,loadPdfjs};',m.filename);
result.functionSourceHash=digest(text);
(async()=>{try{
 const api=await m.exports.loadPdfjs();result.pdfVersion=api.version;
 for(const sample of JSON.parse(fs.readFileSync(path.join(fixtures,'manifest.json')))){
  const file=path.join(fixtures,sample.file),row={file:sample.file,sha256:digest(fs.readFileSync(file))};assert.equal(row.sha256,sample.sha256);
  try{
   row.actualBusiness=await m.exports.extractPdfTextVariants(file);
   const pkg=path.dirname(Module.createRequire(m.filename).resolve('pdfjs-dist/package.json'));
   const task=api.getDocument({data:new Uint8Array(fs.readFileSync(file)),useSystemFonts:true,isEvalSupported:false,cMapUrl:pkg.replaceAll('\\','/')+'/cmaps/',cMapPacked:true,standardFontDataUrl:pkg.replaceAll('\\','/')+'/standard_fonts/',useWorkerFetch:false});
   try{const doc=await task.promise;row.pageCount=doc.numPages;row.pages=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);try{row.pages.push((await page.getTextContent()).items.map(t=>({str:t.str||'',transform:t.transform})));}finally{page.cleanup();}}}finally{await task.destroy();}
   const expected={defaultText:row.pages.map(p=>p.map(t=>t.str).join('\n')+'\n').join('').trim(),coordinateText:row.pages.map(p=>m.exports.buildPdfCoordinateText(p)+'\n').join('').trim()};
   if(mode==='strict')assert.deepEqual(row.actualBusiness,expected);
   row.matchesResourceConfiguredPath=JSON.stringify(row.actualBusiness)===JSON.stringify(expected);
   assert.equal(row.pageCount,sample.expectedPages);for(const tokens of sample.expectedText)for(const token of tokens)assert.ok(expected.defaultText.replace(/\s/g,'').includes(token.replace(/\s/g,'')));
   if(sample.expectedEmpty)assert.equal(row.actualBusiness.defaultText,'');row.pass=true;
  }catch(e){row.pass=false;row.error=e.message;}result.cases.push(row);
 }
 if(mode==='strict')assert.deepEqual(result.warnings,['Warning: Please use the `legacy` build in Node.js environments.']);
 // Parser failure must not poison the cached import or subsequent/concurrent documents.
 const originalRead=fs.readFileSync;let failed=false;
 fs.readFileSync=function(file,...args){if(file==='SYNTHETIC_INVALID_PDF')return Buffer.from('%PDF-1.7\ninvalid synthetic bytes');return originalRead.call(this,file,...args);};
 try{await m.exports.extractPdfTextVariants('SYNTHETIC_INVALID_PDF');}catch{failed=true;}finally{fs.readFileSync=originalRead;}
 assert.ok(failed);const good=path.join(fixtures,'01-english.pdf');const again=await Promise.all([m.exports.extractPdfTextVariants(good),m.exports.extractPdfTextVariants(good)]);assert.deepEqual(again[0],again[1]);result.errorRecoveryAndConcurrent=true;
 if(mode==='strict'){assert.equal(result.pdfVersion,'4.10.38');assert.ok(result.cases.every(r=>r.pass));assert.deepEqual(result.nativeLoads,[]);assert.deepEqual(result.canvasLoads,[]);assert.deepEqual(result.networkAttempts,[]);assert.deepEqual(result.errors,[]);
  assert.ok(result.warnings.every(w=>w==='Warning: Please use the `legacy` build in Node.js environments.'||w==='Warning: Indexing all PDF objects'),'Unknown PDF warning');
 }
 result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1;}finally{out(JSON.stringify(result));}})();
