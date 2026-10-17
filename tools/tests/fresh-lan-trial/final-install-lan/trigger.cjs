'use strict';
// Pure generator only. No filesystem/network access or actual trigger writes.
const gate=require('./contract.cjs');
function serialize(env,input,history,facts,proof){gate.request(env,input,history,facts,proof);return JSON.stringify(Object.fromEntries(gate.INPUT.map(k=>[k,input[k]])),null,2)+'\n';}
module.exports={serialize};
