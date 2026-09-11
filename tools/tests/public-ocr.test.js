'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'){console.log('SKIP hosted OCR parser');process.exit(0);}
const root=path.resolve(__dirname,'../..');
const result=cp.spawnSync('python',[path.join(__dirname,'public-ocr-parser.py')],{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
assert.equal(result.status,0);
const script=fs.readFileSync(path.join(root,'tools/ocr/ocr_invoice.py'),'utf8');
assert.match(script,/KSESSION_OCR_BUYER_NAME/);assert.doesNotMatch(script,/inputPath|spxt|苦瓜/i);
console.log('Public optional OCR parser: 8 checks passed; recognition engine not installed by this test.');
