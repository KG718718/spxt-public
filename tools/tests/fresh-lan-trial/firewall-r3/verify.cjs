'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),schema=require('./report.cjs'),{validateEarly}=require('./finalize.cjs');
function verify(dir,expected){assert.deepEqual(fs.readdirSync(dir).sort(),[schema.FILE]);const file=path.join(dir,schema.FILE),s=fs.lstatSync(file);assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=128*1024);const r=JSON.parse(fs.readFileSync(file,'utf8'));return r.kind==='FRESH_FIREWALL_R3_EARLY'?validateEarly(r,expected):schema.validate(r,expected);}
module.exports={verify};
if(require.main===module)try{const [dir,controlCommit,id,sourceCommit]=process.argv.slice(2);verify(dir,{execution:'HOSTED',controlCommit,run:{id,attempt:1},...(sourceCommit?{sourceCommit}:{})});process.stdout.write('FIREWALL_R3_SAFE_REPORT_VERIFIED\n');}catch{process.stderr.write('FIREWALL_R3_SAFE_REPORT_REJECTED\n');process.exitCode=1;}
