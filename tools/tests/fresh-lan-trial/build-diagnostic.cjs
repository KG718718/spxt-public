'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const STAGES=['NOT_STARTED','RUNTIME','HELPER','HELPER_INPUT','HELPER_ENVIRONMENT','HELPER_STANDARD_TESTS','HELPER_FRESH_OVERLAY','HELPER_FRESH_TESTS','HELPER_COMPILE','HELPER_IDENTITY','HELPER_COMPLETE','HELPER_UNIT_POLICY','HELPER_UNIT_GO_JSON','HELPER_UNIT_REPORT','BUILD_ENVIRONMENT','LAUNCHER','LAUNCHER_IDENTITY','LAUNCHER_STANDARD_TESTS','LAUNCHER_FRESH_TESTS','LAUNCHER_COMPILE','LAUNCHER_UNIT','LAUNCHER_UNIT_ENVIRONMENT','LAUNCHER_UNIT_POLICY','LAUNCHER_UNIT_GO_JSON','LAUNCHER_UNIT_REPORT','PAYLOAD_ASSEMBLY','LAN_NODE','PAYLOAD_REPORT','TOOLCHAIN','ISCC','ASSEMBLY','SMOKE_IDENTITY','BROWSER_TOOL','COMPLETE'];
const UNIT_CLASSES=['GO_JSON_INVALID','GO_JSON_MISSING','GO_JSON_UNREADABLE','GO_COMMAND_FAILED','GO_TESTS_FAILED','GO_TESTS_SKIPPED','GO_PACKAGE_FAILED','GO_EXPECTED_SET_MISMATCH',...[...require('../lan-host/expected-go-tests.cjs').LAUNCHER,...require('../lan-host/expected-go-tests.cjs').FIREWALL,...require('./helper-go-diagnostic.cjs').FRESH].map(name=>'GO_TEST_FAILED_'+name)];
const SCENE_SCHEMA=require('./fresh-scenario-diagnostic.cjs');
const SCENE_CLASSES=SCENE_SCHEMA.SCENARIOS.flatMap(scene=>[...SCENE_SCHEMA.PHASES.filter(phase=>phase!=='COMPLETE').flatMap(phase=>SCENE_SCHEMA.EXITS.map(exit=>'GO_FRESH_SCENARIO_FAILED_'+scene+'_'+phase+'_'+exit)),'GO_FRESH_SCENARIO_FAILED_'+scene+'_UNKNOWN_UNKNOWN']);
const CLASSES=['NOT_STARTED','PASS','COMMAND_FAILED','ENV_RESTORE_FAILED','TOOLCHAIN_IDENTITY_REJECTED','SCRIPT_SYNTAX','UNKNOWN_IDENTIFIER','TYPE_MISMATCH','PREPROCESSOR_REJECTED','OUTPUT_IDENTITY_REJECTED','UNKNOWN',...UNIT_CLASSES,...SCENE_CLASSES];
function validate(d){assert.deepEqual(Object.keys(d).sort(),['stage','classification','script','line'].sort());assert.ok(STAGES.includes(d.stage));assert.ok(CLASSES.includes(d.classification));assert.ok(d.script===null||['SETUP_SCRIPT','GENERATED_SCRIPT'].includes(d.script));assert.ok(d.line===null||(Number.isSafeInteger(d.line)&&d.line>=1&&d.line<=10000));assert.equal(d.script===null,d.line===null);if(d.script)assert.equal(d.stage,'ISCC');if(UNIT_CLASSES.includes(d.classification)){assert.ok(['LAUNCHER_UNIT_GO_JSON','HELPER_STANDARD_TESTS','HELPER_FRESH_TESTS','HELPER_UNIT_GO_JSON'].includes(d.stage));if(d.classification.startsWith('GO_TEST_FAILED_')){const names=d.stage==='LAUNCHER_UNIT_GO_JSON'?require('../lan-host/expected-go-tests.cjs').LAUNCHER:d.stage==='HELPER_FRESH_TESTS'?require('./helper-go-diagnostic.cjs').FRESH:require('../lan-host/expected-go-tests.cjs').FIREWALL;assert.ok(names.includes(d.classification.slice('GO_TEST_FAILED_'.length)));}}if(SCENE_CLASSES.includes(d.classification))assert.equal(d.stage,'HELPER_FRESH_TESTS');if(d.classification==='ENV_RESTORE_FAILED')assert.ok(['LAUNCHER_UNIT_ENVIRONMENT','HELPER_ENVIRONMENT','BUILD_ENVIRONMENT'].includes(d.stage));return d;}
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
