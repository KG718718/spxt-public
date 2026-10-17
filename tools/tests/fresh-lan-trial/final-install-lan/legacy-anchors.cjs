'use strict';
const assert=require('node:assert/strict'),old=require('../install-candidate/contract.cjs');
// Authorization-time API snapshot verified by Master. Deleted known history is
// not an empty budget. Keep this new-profile fence separate from schema1 rules.
const ANCHORS=Object.freeze({
 [old.LEGACY[0]]:Object.freeze([
  Object.freeze({id:'38566205060',head_sha:'71ce988199b13a8ab47d4191cae66a2a0e09a087',display_title:'FreshTrial C1 76f574cad1ba68f488a406ffa87ef9ebcb0568be'}),
  Object.freeze({id:'38572354045',head_sha:'6483c9108ad3e7c764eba0a262836f0ea428b026',display_title:'FreshTrial C2 ca8302c32976645a83174d055dc22d1f620e5ea3'}),
  Object.freeze({id:'38578047457',head_sha:'73cf120bb87b691a0aca1d9750bcc416e86a7bea',display_title:'FreshTrial C3 de6c2312a9a827f57808d63dc9ac9614f2c0aa33'})
 ]),
 [old.LEGACY[1]]:Object.freeze([
  Object.freeze({id:'38674907559',head_sha:'f2195dd4191cf4a5341c09483a1d60e3cce8acd7',display_title:'FreshBuildR1 R1S1 c503fe094c07b9e1c7e33648072701461afd73be'}),
  Object.freeze({id:'38758814656',head_sha:'478d42d8c1d67ac1df442084f48817a9fa25a060',display_title:'FreshBuildR1 R1C1 656bc6236a8b523d74e0faa73947023d57d6aa80'}),
  Object.freeze({id:'38767500533',head_sha:'9eb28d84e232e9d6c73ad17af4cffd23ba8ae9a8',display_title:'FreshBuildR1 R1C2 990f605ed230d13e2bddde71e2071259a62ad2bf'})
 ])
});
function validate(histories){old.legacyBudget(histories);for(const [file,anchors]of Object.entries(ANCHORS)){
 const rows=histories[file];assert.deepEqual(rows.map(r=>String(r.id)).sort(),anchors.map(r=>r.id).sort(),'known history missing or replaced');
 for(const a of anchors){const r=rows.find(r=>String(r.id)===a.id);assert.equal(r.head_sha,a.head_sha);assert.equal(r.display_title,a.display_title);assert.equal(r.path,file);assert.equal(r.head_branch,'codex/lan-fresh-trial-v1.1');assert.equal(r.event,'push');assert.equal(r.run_attempt,1);assert.equal(r.status,'completed');assert.equal(r.conclusion,'failure');}
 }return true;}
module.exports={ANCHORS,validate};
