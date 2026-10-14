'use strict';
// Separate entry: no accepted-F3 input and no fault modes.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
const args=process.argv.slice(2);
assert.equal(args.length,4,'portable compiler output sourceCommit required');
const r=spawnSync(process.execPath,[path.join(__dirname,'../beta4-upgrade/build-beta4.cjs'),...args,'fresh-trial'],
 {stdio:'inherit',windowsHide:true});
process.exit(r.status===0?0:1);
