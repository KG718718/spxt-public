'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
function plan(state,mappings){
 assert.equal(state.schema,1);assert.equal(typeof state.created,'boolean');assert.match(state.runId,/^[1-9][0-9]*$/);assert.ok(Array.isArray(mappings));
 if(!state.created){assert.equal(state.target,null);return 'UNCHANGED';}
 assert.equal(typeof state.target,'string');assert.ok(path.win32.isAbsolute(state.target));assert.equal(state.drive,'E:');
 const rows=mappings.filter(r=>r.drive==='E:');if(rows.length!==1||typeof rows[0].target!=='string')return 'REFUSE_UNKNOWN';
 return path.win32.normalize(rows[0].target).replace(/[\\/]+$/,'').toLowerCase()===path.win32.normalize(state.target).replace(/[\\/]+$/,'').toLowerCase()?'REMOVE_OWNED_MAPPING':'REFUSE_UNKNOWN';
}
function parse(output){const rows=[];for(const line of String(output).split(/\r?\n/).filter(Boolean)){const m=line.match(/^([A-Z]):\\: => (.+)$/);assert.ok(m,'mapping inventory unknown');rows.push({drive:m[1]+':',target:m[2]});}return rows;}
module.exports={plan,parse};
