'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {extract,generate}=require('./link-harness.cjs');
test('actual routines exactly once and only constant mapping changes',()=>{
 const root='E:\\CodexWorkspace\\outputs\\fresh-install-r2-link-'+'a'.repeat(32),g=generate(root);
 const source=fs.readFileSync(path.resolve(__dirname,'../../../windows-installer/beta4-upgrade/setup-beta4.iss'),'utf8').replace(/\r\n/g,'\n');
 for(const n of g.manifest.functions){const original=extract(source,n);assert.equal([...g.code.matchAll(new RegExp('^(?:function|procedure) '+n+'[(:;]','gm'))].length,1);assert.ok(g.code.includes(original.replace(/\bExpandConstant\(/g,'HarnessConstant(')));}
 assert.deepEqual([...g.code.matchAll(/^\[([^\]]+)\]/gm)].map(m=>m[1]),['Setup','Code']);assert.ok(g.code.includes("else RaiseException('HARNESS_CONSTANT_REJECTED')"));assert.ok(g.code.includes('CaseRoot, BetaInstance: String'));assert.doesNotMatch(g.code,/function BetaInstance/);
});
test('routine scanner handles inline, nested and quoted end tokens',()=>{const s="function A: String;\nbegin Result:='end;'; end;\nfunction B: Boolean;\nbegin try if True then begin Result:=True;end;except end;end;";assert.equal(extract(s,'A'),"function A: String;\nbegin Result:='end;'; end;");assert.equal((extract(s,'B').match(/function /g)||[]).length,1);assert.throws(()=>extract(s+'\n'+s,'A'));assert.throws(()=>extract('function A: String;begin','A'));});
test('unknown, existing-user and unbounded roots reject before generation',()=>{for(const p of ['C:\\Users\\user\\Startup','E:\\CodexWorkspace\\outputs\\other','E:\\CodexWorkspace\\outputs\\fresh-install-r2-link-'+'a'.repeat(32)+'\\..'])assert.throws(()=>generate(p));});