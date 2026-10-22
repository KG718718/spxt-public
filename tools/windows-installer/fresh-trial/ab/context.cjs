'use strict';
const fs=require('node:fs'),path=require('node:path'),g=require('../../../tests/fresh-lan-trial/ab/contract.cjs');
function check(work,repo=path.resolve(__dirname,'../../../..'),env=process.env){return g.boundContext(repo,JSON.parse(fs.readFileSync(path.join(work,'context.json'))),env);}
module.exports={check};if(require.main===module){try{check(process.argv[2]);process.stdout.write('AB_CONTEXT_VALID');}catch{process.stderr.write('AB_CONTEXT_REJECTED\n');process.exitCode=1;}}
