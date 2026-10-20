'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function prepare(out){
 out=path.resolve(out);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
 const target=path.resolve(__dirname,'../../windows-launcher/fresh_installed_windows_test.go');
 const overlay=path.join(out,'fresh_installed_windows_test.go');
 fs.writeFileSync(overlay,fs.readFileSync(path.join(__dirname,'installed-hosted_windows_test.go.in'),'utf8').replace('__FRESH_STARTUP_STAGES_JSON__',JSON.stringify(require('./install-r2/startup-stages.cjs'))));
 const file=path.join(out,'overlay.json');fs.writeFileSync(file,JSON.stringify({Replace:{...require('./prepare-policy-overlay.cjs').replacements('LAUNCHER'),[target]:overlay,[path.resolve(__dirname,'../../windows-launcher/fresh_installed_recovery_windows_test.go')]:path.resolve(__dirname,'installed-recovery_windows_test.go.in'),[path.resolve(__dirname,'../../windows-launcher/fresh_owned_registry_windows_test.go')]:path.resolve(__dirname,'owned-registry_windows_test.go.in')}})+'\n',{flag:'wx'});return file;
}
module.exports={prepare};if(require.main===module)process.stdout.write(prepare(process.argv[2])+'\n');
