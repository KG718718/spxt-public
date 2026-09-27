'use strict';
const Module=require('node:module');
const path=require('node:path');
const original=Module._load;
Module._load=function(request,parent,isMain){
  const loaded=original.apply(this,arguments);
  if(parent?.filename&&path.basename(parent.filename)==='server.js'&&request==='./public-lan-server'){
    const raw=process.env.KSESSION_TEST_DISCOVERY;
    if(!raw)throw Error('TEST_DISCOVERY_REQUIRED');
    const selected=JSON.parse(raw);
    const result=Object.freeze({status:'SELECTED',selected:Object.freeze(selected),candidates:Object.freeze([Object.freeze(selected)])});
    return Object.freeze({...loaded,discoverLanInWorker:async()=>result,discoverWindowsLan:()=>result});
  }
  return loaded;
};
