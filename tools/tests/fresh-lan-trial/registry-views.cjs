'use strict';
const assert=require('node:assert/strict');
// HKCU\SOFTWARE is shared on supported Windows, except documented Classes children.
// A second view alias must have byte-identical full metadata, never a second identity.
function aliases(rows,key){assert.ok(Array.isArray(rows));const matching=rows.filter(r=>r.key===key);assert.ok(matching.length>=1&&matching.length<=2);assert.equal(new Set(matching.map(r=>r.view)).size,matching.length);for(const r of matching){assert.ok(['Registry32','Registry64'].includes(r.view));assert.deepEqual(r.values,matching[0].values);}assert.equal(rows.length,matching.length);return matching[0].values;}
module.exports={aliases};
