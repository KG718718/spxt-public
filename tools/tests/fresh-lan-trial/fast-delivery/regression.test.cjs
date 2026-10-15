'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{parse}=require('./regression.cjs');
const names=Array.from({length:26},(_,i)=>'public-synthetic-'+String(i).padStart(2,'0')+'.test.js');
const text=names.map((n,i)=>'\nRUN '+n+'\nPublic synthetic '+(i===25?42:28)+' checks passed').join('');
test('same26 and exact742 are required in memory',()=>{const r=parse(text,'',0,names);assert.equal(r.status,'PASS');assert.equal(r.pass,742);assert.equal(r.rawOutputStored,false);assert.equal('stdoutSha256'in r,false);assert.equal('stderrSha256'in r,false);});
test('missing duplicate extra skipped failed unknown or wrong count cannot pass',()=>{
  for(const data of [text.replace('\nRUN '+names[0],'\nRUN unknown'),text.replace('42 checks','41 checks'),text+'\nRUN extra\nPublic extra 0 checks passed',text.replace('RUN '+names[2],'RUN '+names[1]),text.replace('Public synthetic 28 checks passed','SKIP synthetic')])assert.equal(parse(data,'',0,names).status,'FAIL');
  for(const exit of [1,null])assert.equal(parse(text,'',exit,names).status,'FAIL');assert.equal(parse(text,'FAIL '+names[0]+': fixed failure',0,names).status,'FAIL');
});
