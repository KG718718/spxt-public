'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function verifyResolvedModule(modulesRoot,resolved){
 assert.equal(typeof modulesRoot,'string');assert.equal(typeof resolved,'string');
 assert.ok(path.win32.isAbsolute(modulesRoot)&&path.win32.isAbsolute(resolved));
 const root=path.resolve(modulesRoot),actual=path.resolve(resolved),physicalRoot=fs.realpathSync.native(root),physicalFile=fs.realpathSync.native(actual);
 // Fresh callers supply a physically resolved owned Runtime. A new alias or
 // link after that boundary is unknown; never let realpath legitimize it.
 assert.equal(physicalRoot.toLowerCase(),root.toLowerCase());
 assert.equal(physicalFile.toLowerCase(),actual.toLowerCase());
 const relative=path.win32.relative(physicalRoot,physicalFile);
 assert.ok(relative!==''&&!path.win32.isAbsolute(relative)&&relative.split(/[\\/]/)[0]!=='..');
 assert.ok(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink());
 let current=root;const parts=relative.split(/[\\/]/);
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);const item=fs.lstatSync(current);assert.equal(item.isSymbolicLink(),false);
  assert.ok(i===parts.length-1?item.isFile():item.isDirectory());
 }
 return true;
}
module.exports={verifyResolvedModule};
if(require.main===module){try{assert.equal(process.argv.length,3);verifyResolvedModule(process.argv[2],require.resolve('multer'));process.stdout.write('FRESH_RUNTIME_DEPENDENCY_PASS\n');}catch{process.stderr.write('FRESH_RUNTIME_DEPENDENCY_REJECTED\n');process.exitCode=23;}}
