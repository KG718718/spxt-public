'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..');
const FILES=Object.freeze({FIREWALL:['fresh_behavior_windows_test.go','fresh_policy_test.go'],LAUNCHER:['fresh_core_test.go','fresh_order_windows_test.go']});
function replacements(kind){assert.ok(Object.hasOwn(FILES,kind));const packageDir=kind==='FIREWALL'?'tools/windows-firewall':'tools/windows-launcher',out={};for(const name of FILES[kind]){const source=path.join(__dirname,name+'.in');assert.ok(fs.lstatSync(source).isFile()&&!fs.lstatSync(source).isSymbolicLink());out[path.join(repo,packageDir,name)]=source;}return out;}
function prepare(kind,file){assert.equal(fs.existsSync(file),false);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({Replace:replacements(kind)})+'\n',{flag:'wx'});return file;}
module.exports={FILES,replacements,prepare};if(require.main===module)process.stdout.write(prepare(process.argv[2],path.resolve(process.argv[3]))+'\n');
