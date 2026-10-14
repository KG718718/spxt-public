'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {inventory,inside}=require('../../windows-runtime/common.cjs');
function scope(work){const realWork=fs.realpathSync(work),dir=path.join(work,'inno/compiler');assert.ok(inside(realWork,fs.realpathSync(dir)));assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);return dir;}
function snapshot(work){const dir=scope(work);const record={schema:1,kind:'OWNED_PORTABLE_COMPILER',files:inventory(dir)};fs.writeFileSync(path.join(work,'compiler-owned-files.json'),JSON.stringify(record)+'\n',{flag:'wx'});return record;}
function remove(work){const dir=scope(work),record=JSON.parse(fs.readFileSync(path.join(work,'compiler-owned-files.json')));assert.equal(record.schema,1);assert.equal(record.kind,'OWNED_PORTABLE_COMPILER');assert.deepEqual(inventory(dir),record.files);
 // Never a recursive delete command, never a wildcard or an unknown file.
 for(const f of record.files){const file=path.join(dir,f.path);assert.ok(inside(fs.realpathSync(work),fs.realpathSync(file)));assert.equal(fs.lstatSync(file).isSymbolicLink(),false);fs.unlinkSync(file);}
 function empty(p){for(const entry of fs.readdirSync(p,{withFileTypes:true})){assert.ok(entry.isDirectory()&&!entry.isSymbolicLink());empty(path.join(p,entry.name));}fs.rmdirSync(p);}empty(dir);assert.equal(fs.existsSync(dir),false);return true;
}
module.exports={snapshot,remove};if(require.main===module){const [mode,work]=process.argv.slice(2);try{assert.ok(['snapshot','remove'].includes(mode));module.exports[mode](work);}catch{process.stderr.write('OWNED_COMPILER_FILES_UNPROVEN\n');process.exitCode=1;}}
