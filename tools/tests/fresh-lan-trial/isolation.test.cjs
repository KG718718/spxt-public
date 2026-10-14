'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{plan,parse}=require('./isolation.cjs');
const state={schema:1,created:true,runId:'123',drive:'E:',target:'C:\\Owned\\fresh-drive-123'};
test('only exact owned mapping may be removed; unknown/current changes preserve it',()=>{assert.equal(plan(state,parse('E:\\: => C:\\Owned\\fresh-drive-123\r\n')),'REMOVE_OWNED_MAPPING');for(const rows of [[],[{drive:'E:',target:'C:\\Unknown'}],[{drive:'E:',target:state.target},{drive:'E:',target:state.target}]])assert.equal(plan(state,rows),'REFUSE_UNKNOWN');assert.throws(()=>parse('unrecognized mapping format'));});
test('no created mapping means no unmap operation; early failures still need ownership',()=>{assert.equal(plan({...state,created:false,target:null},[]),'UNCHANGED');assert.equal(plan(state,[]),'REFUSE_UNKNOWN');assert.throws(()=>plan({...state,runId:'0'},[]));});
