'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {EventEmitter} = require('node:events');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const network = require('../../../public-lan-network');
const config = require('../../../public-lan-config');
const {main} = require('../../lan-host/launcher-cli.cjs');
const {createLanHostController} = require('../../../public-lan-server');
const {publicState} = require('../../../public-lan-server');
const id = '11111111-1111-4111-8111-111111111111';
function record(change = {}) { return {Name:'公司以太网', Description:'Synthetic Ethernet', InterfaceGuid:id, InterfaceIndex:7,
  Status:'Up', HardwareInterface:true, Virtual:false, Hidden:false, InterfaceType:6, MediaType:'802.3', PhysicalMediaType:'802.3',
  Address:'192.168.40.10', PrefixLength:24, AddressState:'Preferred', SkipAsSource:false, NetworkCategory:'Private',
  OnLinkPrefixes:['192.168.40.0/24'], ...change}; }
function runtimeFs(change = {}) {
  const realpathSync = p => change.redirect || p;
  return {lstatSync:p=>({isDirectory:()=>!p.endsWith('.exe'),isFile:()=>p.endsWith('.exe'),isSymbolicLink:()=>!!change.link}),realpathSync};
}
function discover(rows = [record()], change = {}) {
  return network.discoverWindowsLan({freshTrial:true, platform:'win32', systemRoot:'C:\\Windows', fs:runtimeFs(),
    spawnSync:()=>({status:0,stdout:JSON.stringify(rows),stderr:'',signal:null}), ...change});
}
const selected = () => discover().selected;
function saved(enabled = false) { const s=selected(); return {schema:2, enabled, interfaceName:s.interfaceName,port:8083,
  binding:{adapterId:s.adapterId,address:s.address,prefixLength:s.prefixLength,subnet:s.subnet}}; }
async function fresh(fn) { const before=process.env.KSESSION_FRESH_TRIAL; process.env.KSESSION_FRESH_TRIAL='1';
  try { return await fn(); } finally { if(before===undefined)delete process.env.KSESSION_FRESH_TRIAL;else process.env.KSESSION_FRESH_TRIAL=before; } }

test('Fresh unique physical Private candidate is preselected; multiple and zero never guess',()=>{
  assert.equal(discover().status,'SELECTED'); assert.equal(selected().interfaceName,'公司以太网');
  const second=record({Name:'Wi-Fi',InterfaceGuid:'22222222-2222-4222-8222-222222222222',InterfaceIndex:8});
  const many=discover([record(),second]);assert.equal(many.status,'MULTIPLE_LAN_ADAPTERS');assert.equal(many.selected,null);
  assert.equal(discover([]).status,'NO_PRIVATE_LAN');
  assert.equal(discover([record(),second],{interfaceName:'Wi-Fi'}).selected.name,'Wi-Fi');
  assert.equal(discover([record(),record({Address:'192.168.40.11'})],{interfaceName:'公司以太网'}).status,'NETWORK_CHANGED');
  assert.equal(discover([record(),record({Address:'192.168.40.11'})]).status,'MULTIPLE_LAN_ADAPTERS');
  assert.throws(()=>discover([record(),record()]),{code:'NETWORK_DISCOVERY_INVALID'});
});
test('immutable Fresh payload marker cannot be disabled by missing or forged inherited environment',()=>{
  const file=path.join(__dirname,'../../../public-lan-network.js');
  const source=fs.readFileSync(file,'utf8');
  assert.equal(source.split('const FRESH_TRIAL_BUILD = false;').length,2,'T2 replacement must be exact and unique');
  for(const value of [undefined,'','0','false','1','../../manual']) {
    const context={module:{exports:{}},require:createRequire(file),process:{env:value===undefined?{}:{KSESSION_FRESH_TRIAL:value}}};
    vm.runInNewContext(source.replace('const FRESH_TRIAL_BUILD = false;','const FRESH_TRIAL_BUILD = true;'),context);
    assert.equal(context.module.exports.freshTrialEnabled(),true);
  }
});
test('Fresh production marker overrides false test options and cannot fall back to manual interfaces',()=>{
  const file=path.join(__dirname,'../../../public-lan-network.js'),nativeRequire=createRequire(file);
  const context={module:{exports:{}},Buffer,process:{env:{},platform:'win32'},require:nativeRequire};
  vm.runInNewContext(fs.readFileSync(file,'utf8').replace('const FRESH_TRIAL_BUILD = false;','const FRESH_TRIAL_BUILD = true;'),context);
  const result=context.module.exports.discoverWindowsLan({freshTrial:false,platform:'win32',systemRoot:'C:\\Windows',fs:runtimeFs(),
    interfaces:{Untrusted:[]},networkInterfaces:()=>assert.fail('manual fallback'),spawnSync:()=>({status:0,stdout:JSON.stringify([record()]),stderr:''})});
  assert.equal(result.status,'SELECTED');assert.equal(result.selected.adapterId,id);
});
for(const [name,change] of Object.entries({Public:{NetworkCategory:'Public'},Domain:{NetworkCategory:'DomainAuthenticated'},
  unknownProfile:{NetworkCategory:null},virtual:{Virtual:true},unknownVirtual:{Virtual:null},hidden:{Hidden:true},unknownHidden:{Hidden:null},
  nonHardware:{HardwareInterface:false},unknownHardware:{HardwareInterface:null},vpn:{Description:'VPN adapter'},tunnel:{InterfaceType:131},
  unknownType:{InterfaceType:0},skipSource:{SkipAsSource:true},unknownSkipSource:{SkipAsSource:null},down:{Status:'Down'},
  unknownAddressState:{AddressState:'Unknown'},publicAddress:{Address:'8.8.8.8'},networkAddress:{Address:'192.168.40.0'},
  broadcast:{Address:'192.168.40.255'},tooBroad:{PrefixLength:15},hostPrefix:{PrefixLength:32},stringPrefix:{PrefixLength:'24'},
  routeMissing:{OnLinkPrefixes:[]},wrongRoute:{OnLinkPrefixes:['10.0.0.0/8']},unknownIndex:{InterfaceIndex:0},
  badGuid:{InterfaceGuid:'invalid'},badName:{Name:'Ethernet\n'}})) {
  test(`Fresh rejects ${name}`,()=>assert.equal(discover([record(change)]).selected,null));
}
for(const [name,result] of Object.entries({stderr:{status:0,stderr:'warning',stdout:'[]'},whitespaceStderr:{status:0,stderr:' ',stdout:'[]'},
  error:{status:0,error:Error('failure'),stdout:'[]'},nonzero:{status:1,stdout:'[]'},signal:{status:0,signal:'SIGTERM',stdout:'[]'},
  malformed:{status:0,stdout:'not JSON'},null:{status:0,stdout:'null'},object:{status:0,stdout:'{}'},
  duplicate:{status:0,stdout:'[{"Virtual":true,"Virtual":false}]'},encoding:{status:0,stdout:'["\ufffd"]'}})) {
  test(`Fresh discovery fails closed on ${name}`,()=>assert.throws(()=>discover([],{spawnSync:()=>result}),{code:'NETWORK_DISCOVERY_FAILED'}));
}
test('Fresh illegal output schema and unsafe system paths are refused',()=>{
  for(const rows of [[null],[1],[[]],[{}],[record({extra:true})]])assert.throws(()=>discover(rows),{code:'NETWORK_DISCOVERY_INVALID'});
  for(const root of ['','C:\\Users\\someone\\Windows','\\\\host\\Windows','C:\\Windows\\..\\Windows'])
    assert.throws(()=>discover([],{systemRoot:root}),{code:'NETWORK_SYSTEM_RUNTIME_INVALID'});
  for(const change of [{link:true},{redirect:'C:\\Users\\someone\\powershell.exe'}])
    assert.throws(()=>discover([],{fs:runtimeFs(change)}),{code:'NETWORK_SYSTEM_RUNTIME_INVALID'});
});
test('Fresh fixed invocation discards user environment and uses only absolute system modules',()=>{
  let call;
  discover([record()],{spawnSync:(exe,args,options)=>{call={exe,args,options};return {status:0,stdout:JSON.stringify([record()]),stderr:''};}});
  assert.equal(call.exe,'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.equal(call.options.windowsHide,true);assert.equal(call.options.timeout,15000);
  assert.deepEqual(Object.keys(call.options.env).sort(),['PATH','PSModulePath','SystemRoot','WINDIR']);
  assert.equal(call.options.env.PSModulePath,'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
  assert.equal(Buffer.from(call.args.at(-1),'base64').toString('utf16le'),network.FRESH_DISCOVERY_SCRIPT);
  for(const module of ['NetAdapter','NetConnection','NetTCPIP','Microsoft.PowerShell.Utility'])assert.ok(network.FRESH_DISCOVERY_SCRIPT.includes(`\\${module}\\${module}.psd1`));
  assert.doesNotMatch(network.FRESH_DISCOVERY_SCRIPT,/SilentlyContinue.*Get-Net|ErrorAction SilentlyContinue|runas|NetSecurity|Set-Net|New-Net/);
  assert.doesNotMatch(network.FRESH_DISCOVERY_SCRIPT,/New-Object/);
  assert.ok(network.FRESH_DISCOVERY_SCRIPT.indexOf('Import-Module') < network.FRESH_DISCOVERY_SCRIPT.indexOf('Get-NetAdapter'));
});
test('Fresh script syntax and isolated cmdlet harness execute without any network probe',()=>{
  const harness=String.raw`$ErrorActionPreference='Stop'
function Import-Module { param($Name,[switch]$Force,$ErrorAction) if($Name -notlike ($env:SystemRoot+'\System32\WindowsPowerShell\v1.0\Modules\*')){throw 'unsafe import'} }
function Get-NetAdapter { param([switch]$IncludeHidden,$ErrorAction) [pscustomobject]@{Name='Synthetic Ethernet';InterfaceDescription='Synthetic';InterfaceGuid='11111111-1111-4111-8111-111111111111';ifIndex=7;Status='Up';HardwareInterface=$true;Virtual=$false;Hidden=$false;InterfaceType=6;MediaType='802.3';NdisPhysicalMedium='802.3'} }
function Get-NetConnectionProfile { param($ErrorAction) [pscustomobject]@{InterfaceIndex=7;NetworkCategory='Private'} }
function Get-NetIPAddress { param($AddressFamily,$ErrorAction) [pscustomobject]@{InterfaceIndex=7;IPAddress='192.168.40.10';PrefixLength=24;AddressState='Preferred';SkipAsSource=$false} }
function Get-NetRoute { param($AddressFamily,$ErrorAction) [pscustomobject]@{InterfaceIndex=7;NextHop='0.0.0.0';State='Alive';DestinationPrefix='192.168.40.0/24'} }
`;
  const source=harness+network.FRESH_DISCOVERY_SCRIPT;
  const result=spawnSync(path.win32.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
    ['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(source,'utf16le').toString('base64')],
    {windowsHide:true,encoding:'utf8',timeout:15000,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,
      PATH:path.win32.join(process.env.SystemRoot,'System32'),PSModulePath:path.win32.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','Modules')}});
  assert.equal(result.status,0,result.stderr); assert.equal(result.stderr,'');
  assert.equal(discover(JSON.parse(result.stdout)).status,'SELECTED');
});
test('Fresh trust is mandatory before persistence and enable; network changes cannot be silently adopted',async()=>fresh(async()=>{
  let current=null,saves=0,reserves=0;
  let s=selected();
  const deps={discoverWindowsLan:()=>({status:'SELECTED',selected:s,candidates:[s]}),
    createLanConfigStore:()=>({load:()=>current,save:c=>(saves++,current=config.validateLanConfig(c))}),
    findAndReservePort:async()=>({port:8083,release:async()=>{reserves++;}})};
  const args=['--instance-dir','C:\\Synthetic','--interface-name',s.interfaceName];
  assert.notEqual((await main(['configure',...args],deps)).exitCode,0);assert.equal(saves,0);assert.equal(reserves,0);
  assert.equal((await main(['configure',...args,'--trusted-network','false'],deps)).exitCode,20);assert.equal(saves,0);
  assert.equal((await main(['configure',...args,'--trusted-network','true'],deps)).exitCode,0);assert.equal(current.enabled,false);assert.equal(reserves,1);
  assert.equal((await main(['enable',...args],deps)).exitCode,20);assert.equal(current.enabled,false);
  assert.equal((await main(['enable',...args,'--trusted-network','true'],deps)).exitCode,0);assert.equal(current.enabled,true);
  const original=JSON.stringify(current);s={...s,address:'192.168.40.11'};
  assert.equal((await main(['enable',...args,'--trusted-network','true'],deps)).value.status,'NETWORK_CHANGED');assert.equal(JSON.stringify(current),original);
}));
test('Fresh config binding rejects damaged schema, missing identity and network changes',async()=>fresh(async()=>{
  const c=saved(true),s=selected();assert.deepEqual(config.validateLanConfig(c),c);assert.equal(config.matchesTrustedBinding(c,s),true);
  for(const field of ['adapterId','address','prefixLength','subnet']) {
    const bad={...c,binding:{...c.binding,[field]:null}};assert.throws(()=>config.validateLanConfig(bad),{code:'LAN_CONFIG_INVALID'});
    assert.equal(config.matchesTrustedBinding(c,{...s,[field]:field==='prefixLength'?25:'changed'}),false);
  }
  const {binding,...legacy}=c;assert.throws(()=>config.validateLanConfig(legacy),{code:'LAN_CONFIG_INVALID'});
  assert.equal(config.matchesTrustedBinding(legacy,s),false);
  assert.throws(()=>config.validateLanConfig({...c,binding:{...c.binding,extra:true}}),{code:'LAN_CONFIG_INVALID'});
}));
test('Fresh actual GUID survives public discovery and server status boundaries',async()=>fresh(async()=>{
  const s=selected();assert.equal(network.publicDiscoveryView({status:'SELECTED',selected:s,candidates:[s]}).selected.adapterId,id);
  assert.equal(publicState({selected:s},()=>false).selected.adapterId,id);
  const c=saved(true);assert.equal(config.matchesTrustedBinding(c,{...s,adapterId:'22222222-2222-4222-8222-222222222222'}),false);
}));
test('Fresh runtime re-read rejects config disappearance, corruption and any changed trusted setting',async()=>fresh(async()=>{
  const expected=saved(true);assert.equal(config.matchesTrustedConfig(expected,JSON.parse(JSON.stringify(expected))),true);
  assert.equal(config.matchesTrustedConfig(expected,null),false);
  for(const changed of [{...expected,enabled:false},{...expected,port:8084},{...expected,interfaceName:'Wi-Fi'},
    {...expected,binding:{...expected.binding,address:'192.168.40.11'}},{...expected,binding:{...expected.binding,adapterId:'22222222-2222-4222-8222-222222222222'}}])
    assert.equal(config.matchesTrustedConfig(expected,changed),false);
  assert.throws(()=>config.validateLanConfig({...expected,binding:null}),{code:'LAN_CONFIG_INVALID'});
}));
test('standard configuration preserves the original exact schema and rejects Fresh-only binding',()=>{
  assert.notEqual(process.env.KSESSION_FRESH_TRIAL,'1');
  assert.throws(()=>config.validateLanConfig(saved()),{code:'LAN_CONFIG_INVALID'});
});
test('Fresh server refuses changed or untrusted recovery and closes an old LAN before revocation completes',async()=>fresh(async()=>{
  const events=[];class Fake extends EventEmitter { constructor(address){super();this.address=address;this.listening=true;}
    close(cb){events.push('close:'+this.address);this.listening=false;cb();}closeAllConnections(){} }
  const controller=createLanHostController({handler(){},needsInitialization:()=>false,probe:async()=>true,
    reservePersistedPort:async o=>{events.push('reserve:'+o.addresses.join(','));return {servers:o.addresses.map(a=>new Fake(a)),release:async()=>{}};}});
  const c=saved(true),s=selected(),d={status:'SELECTED',selected:s,candidates:[s]};
  await controller.start(c,d);assert.equal(controller.state().lanListening,true);
  await controller.reconcile({...d,selected:{...s,address:'192.168.40.11'}},c);
  assert.equal(controller.state().lanListening,false);assert.equal(controller.state().selected,null);assert.ok(events.includes('close:'+s.address));
  await controller.close();
  const other=createLanHostController({handler(){},needsInitialization:()=>false,probe:async()=>true,
    reservePersistedPort:async o=>{assert.deepEqual(o.addresses,['127.0.0.1']);return {servers:[new Fake('127.0.0.1')],release:async()=>{}};}});
  await other.start({...c,binding:null},d);assert.equal(other.state().lanListening,false);await other.close();
}));
test('Fresh persisted port conflict never searches or changes the trusted binding',async()=>fresh(async()=>{
  const c=saved(),original=JSON.stringify(c);let calls=0;
  const result=await main(['select','--instance-dir','C:\\Synthetic','--interface-name',c.interfaceName,'--trusted-network','true'],{
    discoverWindowsLan:()=>({status:'SELECTED',selected:selected(),candidates:[selected()]}),
    createLanConfigStore:()=>({load:()=>c,save:()=>assert.fail('must not save')}),
    reservePersistedPort:async options=>{calls++;assert.equal(options.port,c.port);throw Object.assign(Error('occupied'),{code:'PORT_OCCUPIED'});},
    findAndReservePort:()=>assert.fail('must not search')});
  assert.equal(result.value.status,'PORT_OCCUPIED');assert.equal(calls,1);assert.equal(JSON.stringify(c),original);
}));
