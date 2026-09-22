'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

test('fresh identity generator is pinned and fails closed',()=>{
 const text=fs.readFileSync(path.join(__dirname,'../../windows-installer/fresh-identity.cjs'),'utf8');
 for(const value of ['e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','fresh-ci-baseline','historical-run-35514357007']) assert.match(text,new RegExp(value));
 assert.match(text,/JSON\.stringify\(actualInventory\) !== JSON\.stringify\(manifest\.payload\)/);
 assert.match(text,/validateBundle\(bundle\)/);
 assert.match(text,/flag: 'wx'/);
});
