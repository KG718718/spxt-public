'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const [app,fixtures]=process.argv.slice(2),source=fs.readFileSync(path.join(app,'server.js'),'utf8');
const begin=source.indexOf('let pdfjsLoader = null;'),end=source.indexOf('\nfunction uniqueList(',begin);assert.ok(begin>0&&end>begin);
const warnings=[];console.log=console.warn=(...v)=>warnings.push(v.map(String).join(' '));
const m=new Module(path.join(app,'__portable_probe__.cjs'));m.filename=path.join(app,'__portable_probe__.cjs');m.paths=Module._nodeModulePaths(app);
m._compile("const fs=require('node:fs'),path=require('node:path');\n"+source.slice(begin,end)+'\nmodule.exports={extractPdfTextVariants,loadPdfjs};',m.filename);
const network=[];const deny=()=>{network.push('blocked');throw Error('No external network permitted');};
for(const n of ['http','https'])for(const k of ['get','request'])require('node:'+n)[k]=deny;require('node:net').Socket.prototype.connect=deny;globalThis.fetch=deny;Module.syncBuiltinESMExports();
(async()=>{
 const rows=[],api=await m.exports.loadPdfjs();assert.equal(api.version,'4.10.38');
 for(const [f,tokens,count] of [['english.pdf',['SYNTHETIC','12345.67'],1],['chinese.pdf',['合成中文测试金额','12345.67'],1],['multipage.pdf',['PAGE ONE','PAGE TWO','PAGE THREE','300.00'],3]]){
  const p=path.join(fixtures,f),result=await m.exports.extractPdfTextVariants(p);
  for(const token of tokens)assert.ok(result.defaultText.replace(/\s/g,'').includes(token.replace(/\s/g,'')),f+' missing '+token);
  const task=api.getDocument({data:new Uint8Array(fs.readFileSync(p)),isEvalSupported:false,useSystemFonts:true});const d=await task.promise;assert.equal(d.numPages,count);await task.destroy();rows.push({file:f,pages:count,status:'PASS'});
 }
 assert.deepEqual(network,[]);process.stdout.write(JSON.stringify({status:'PASS',cases:rows,warnings,network}));
})().catch(e=>{process.stderr.write(e.message);process.exitCode=1;});
