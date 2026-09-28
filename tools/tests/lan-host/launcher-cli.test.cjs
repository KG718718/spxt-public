'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {main} = require('../../lan-host/launcher-cli.cjs');

const name = 'Ethernet';
const selected = {interfaceName: name, name: 'Synthetic Ethernet', address: '192.168.40.10', prefixLength: 24, subnet: '192.168.40.0/24'};
function deps(current) {
  const calls = {reserved: 0, saved: []};
  return {calls, value: {
    discoverWindowsLan: () => ({status:'SELECTED', selected, candidates:[selected]}),
    publicDiscoveryView: value => ({schema:2, status:value.status, selected:value.selected, candidates:value.candidates, hostName:'SYNTHETIC-HOST'}),
    findAndReservePort: async options => { calls.reserved++; assert.deepEqual(options.addresses,['127.0.0.1',selected.address]); return {port:8083, async release(){}}; },
    reservePersistedPort: async options => { calls.reserved++; assert.equal(options.port,current.port); return {port:options.port,async release(){}}; },
    createLanConfigStore: () => ({load:()=>current, save:value => { calls.saved.push(value); return value; }})
  }};
}

test('multiple adapters are returned without guessing or persistence', async () => {
  const d=deps(null); d.value.discoverWindowsLan=()=>({status:'NEEDS_NETWORK_SELECTION',selected:null,candidates:[selected,{...selected,interfaceName:'Wi-Fi',address:'10.0.0.8',subnet:'10.0.0.0/24'}]});
  const result=await main(['discover'],d.value); assert.equal(result.exitCode,10); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0);
});

test('first configure searches once and saves only after reservation release', async () => {
  const d=deps(null); const result=await main(['configure','--instance-dir','X:\\synthetic','--interface-name',name],d.value);
  assert.equal(result.exitCode,0); assert.equal(d.calls.reserved,1); assert.deepEqual(d.calls.saved,[{schema:2,enabled:false,interfaceName:name,port:8083}]);
});

test('existing config cannot silently change port through configure', async () => {
  const d=deps({schema:2,enabled:true,interfaceName:name,port:8088}); const result=await main(['configure','--instance-dir','X:\\synthetic','--interface-name',name],d.value);
  assert.equal(result.exitCode,20); assert.equal(result.value.status,'LAN_CONFIG_EXISTS'); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0);
});

test('explicit reselect is separate and rejects another adapter identity', async () => {
  const d=deps({schema:2,enabled:true,interfaceName:'Wi-Fi',port:8088}); const result=await main(['reselect','--instance-dir','X:\\synthetic','--interface-name',name],d.value);
  assert.equal(result.exitCode,20); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0);
});

test('selecting another interface preserves the port but requires another enable action',async()=>{
  const current={schema:2,enabled:true,interfaceName:'Wi-Fi',port:8088};const d=deps(current);const result=await main(['select','--instance-dir','X:\\synthetic','--interface-name',name],d.value);
  assert.equal(result.exitCode,0);assert.deepEqual(d.calls.saved,[{schema:2,enabled:false,interfaceName:name,port:8088}]);
});

test('explicit port reselection disables LAN until the new port is enabled',async()=>{
  const current={schema:2,enabled:true,interfaceName:name,port:8088};const d=deps(current);
  const result=await main(['reselect','--instance-dir','X:\\synthetic','--interface-name',name],d.value);
  assert.equal(result.exitCode,0);
  assert.deepEqual(d.calls.saved,[{schema:2,enabled:false,interfaceName:name,port:8083}]);
});

test('enable is explicit; disable remains possible after interface disappears', async () => {
  const current={schema:2,enabled:false,interfaceName:name,port:8088};
  const enabled=deps(current);
  const on=await main(['enable','--instance-dir','X:\\synthetic','--interface-name',name],enabled.value);
  assert.equal(on.exitCode,0);
  assert.deepEqual(enabled.calls.saved,[{...current,enabled:true}]);
  const disabled=deps({...current,enabled:true});
  disabled.value.discoverWindowsLan=()=>{throw Error('interface missing');};
  const off=await main(['disable','--instance-dir','X:\\synthetic','--interface-name',name],disabled.value);
  assert.equal(off.exitCode,0);
  assert.deepEqual(disabled.calls.saved,[current]);
});

test('unknown and duplicate arguments fail closed without network or save', async () => {
  for(const args of [
    ['configure','--instance-dir','X:\\synthetic','--interface-name',name,'--program','evil.exe'],
    ['configure','--instance-dir','X:\\synthetic','--interface-name',name,'--interface-name',name]
  ]) { const d=deps(null); const result=await main(args,d.value); assert.equal(result.exitCode,20); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0); }
});
