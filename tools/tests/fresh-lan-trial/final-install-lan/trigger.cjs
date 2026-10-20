'use strict';
// Returns JSON without trigger writes or network access. The exact FC2 exception
// also verifies authorization, reviewed fix blobs and ancestry through read-only Git.
const gate=require('./contract.cjs');
function serialize(env,input,history,facts,proof){const selected=input?.schema===3?require('./fc3-contract.cjs'):gate;selected.request(env,input,history,facts,proof);return JSON.stringify(Object.fromEntries(selected.INPUT.map(k=>[k,input[k]])),null,2)+'\n';}
module.exports={serialize};
