'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {main} = require('../../lan-host/launcher-cli.cjs');

const guid = '12345678-1234-1234-1234-123456789abc';
const selected = {adapterId: guid, name: 'Synthetic Ethernet', address: '192.168.40.10', prefixLength: 24, subnet: '192.168.40.0/24'};
function deps(current) {
  const calls = {reserved: 0, saved: []};
  return {calls, value: {
    discoverWindowsLan: () => ({status:'SELECTED', selected, candidates:[selected]}),
    publicDiscoveryView: value => ({schema:1, status:value.status, selected:value.selected, candidates:value.candidates, hostName:'SYNTHETIC-HOST'}),
    findAndReservePort: async options => { calls.reserved++; assert.deepEqual(options.addresses,['127.0.0.1',selected.address]); return {port:8083, async release(){}}; },
    reservePersistedPort: async options => { calls.reserved++; assert.equal(options.port,current.port); return {port:options.port,async release(){}}; },
    createLanConfigStore: () => ({load:()=>current, save:value => { calls.saved.push(value); return value; }})
  }};
}

test('multiple adapters are returned without guessing or persistence', async () => {
  const d=deps(null); d.value.discoverWindowsLan=()=>({status:'MULTIPLE_LAN_ADAPTERS',selected:null,candidates:[selected,{...selected,adapterId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',address:'10.0.0.8',subnet:'10.0.0.0/24'}]});
  const result=await main(['discover'],d.value); assert.equal(result.exitCode,10); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0);
});

test('first configure searches once and saves only after reservation release', async () => {
  const d=deps(null); const result=await main(['configure','--instance-dir','X:\\synthetic','--adapter-guid',guid],d.value);
  assert.equal(result.exitCode,0); assert.equal(d.calls.reserved,1); assert.deepEqual(d.calls.saved,[{schema:1,port:8083,adapterPreference:guid}]);
});

test('existing config cannot silently change port through configure', async () => {
  const d=deps({schema:1,port:8088,adapterPreference:guid}); const result=await main(['configure','--instance-dir','X:\\synthetic','--adapter-guid',guid],d.value);
  assert.equal(result.exitCode,20); assert.equal(result.value.status,'LAN_CONFIG_EXISTS'); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0);
});

test('explicit reselect is separate and rejects another adapter identity', async () => {
  const d=deps({schema:1,port:8088,adapterPreference:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}); const result=await main(['reselect','--instance-dir','X:\\synthetic','--adapter-guid',guid],d.value);
  assert.equal(result.exitCode,20); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0);
});

test('explicit adapter selection preserves the persisted port',async()=>{
  const current={schema:1,port:8088,adapterPreference:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};const d=deps(current);const result=await main(['select','--instance-dir','X:\\synthetic','--adapter-guid',guid],d.value);
  assert.equal(result.exitCode,0);assert.deepEqual(d.calls.saved,[{schema:1,port:8088,adapterPreference:guid}]);
});

test('unknown and duplicate arguments fail closed without network or save', async () => {
  for(const args of [
    ['configure','--instance-dir','X:\\synthetic','--adapter-guid',guid,'--program','evil.exe'],
    ['configure','--instance-dir','X:\\synthetic','--adapter-guid',guid,'--adapter-guid',guid]
  ]) { const d=deps(null); const result=await main(args,d.value); assert.equal(result.exitCode,20); assert.equal(d.calls.reserved,0); assert.equal(d.calls.saved.length,0); }
});
