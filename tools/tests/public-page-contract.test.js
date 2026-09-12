'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');let count=0;
for(const file of ['admin.html','approval.html','debt.html','invoice.html']){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 assert.doesNotMatch(text,/10\.10\.0\.19|SPXT|苦瓜|\b(?:KG|lily|amy|cici|ryan|rayn)\b|0\.06|35%/i,file+' private defaults');count++;
 assert.doesNotMatch(text,/<script[^>]+src=["']https?:/i,file+' remote runtime');count++;
 for(const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim()){new vm.Script(match[1],{filename:file});count++;}
}
const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
assert.match(admin,/renderConfig\(group\)/);assert.match(admin,/invoice-replacement/);assert.match(admin,/rulesDigest:\s*row\.rulesDigest/);count+=3;
console.log('Public page static tests: '+count+' passed.');