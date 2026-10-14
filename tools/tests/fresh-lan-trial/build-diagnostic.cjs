'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const STAGES=['NOT_STARTED','RUNTIME','HELPER','LAUNCHER','TOOLCHAIN','ISCC','ASSEMBLY','BROWSER_TOOL','COMPLETE'];
const CLASSES=['NOT_STARTED','PASS','COMMAND_FAILED','TOOLCHAIN_IDENTITY_REJECTED','SCRIPT_SYNTAX','UNKNOWN_IDENTIFIER','TYPE_MISMATCH','PREPROCESSOR_REJECTED','OUTPUT_IDENTITY_REJECTED','UNKNOWN'];
function validate(d){assert.deepEqual(Object.keys(d).sort(),['stage','classification','script','line'].sort());assert.ok(STAGES.includes(d.stage));assert.ok(CLASSES.includes(d.classification));assert.ok(d.script===null||['SETUP_SCRIPT','GENERATED_SCRIPT'].includes(d.script));assert.ok(d.line===null||(Number.isSafeInteger(d.line)&&d.line>=1&&d.line<=10000));assert.equal(d.script===null,d.line===null);if(d.script)assert.equal(d.stage,'ISCC');return d;}
function compiler(output,status,{setupScript,generated}){
 const d={stage:'ISCC',classification:status===0?'PASS':'UNKNOWN',script:null,line:null};if(status===0)return d;
 for(const line of String(output).split(/\r?\n/)){
  const match=line.match(/^Error on line ([0-9]+) in (.+?):\s+(.*)$/i);if(!match)continue;
  const file=path.win32.normalize(match[2].replace(/^"|"$/g,'')).toLowerCase(),n=Number(match[1]);
  if(file===path.win32.normalize(setupScript).toLowerCase())d.script='SETUP_SCRIPT';
  else if(['identity.iss','files.iss','verify.iss'].some(name=>file===path.win32.join(generated,name).toLowerCase()))d.script='GENERATED_SCRIPT';
  else continue;
  if(!Number.isSafeInteger(n)||n<1||n>10000){d.script=null;continue;}d.line=n;
  const text=match[3];d.classification=/unknown identifier/i.test(text)?'UNKNOWN_IDENTIFIER':/type mismatch/i.test(text)?'TYPE_MISMATCH':/syntax error|semicolon expected|invalid prototype/i.test(text)?'SCRIPT_SYNTAX':/#error|preprocessor|undefined identifier/i.test(text)?'PREPROCESSOR_REJECTED':'UNKNOWN';break;
 }
 return validate(d);
}
module.exports={STAGES,CLASSES,validate,compiler};
