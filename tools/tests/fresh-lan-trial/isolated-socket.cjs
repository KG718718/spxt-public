'use strict';
// Actual sockets + installed request gate; synthetic discovery state only.
// This is NOT a production-trusted LAN or a physical adapter certification.
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {installedIdentity}=require('./installed-browser.cjs');
async function run({installRoot,sourceCommit}){
 const {program}=installedIdentity(installRoot,sourceCommit);
 const network=require(path.join(program,'app/public-lan-network.js'));
 const {createRequestGate}=require(path.join(program,'app/public-lan-server.js'));
 const addresses=[];for(const rows of Object.values(os.networkInterfaces()))for(const r of rows||[]){if(r.family==='IPv4'&&!r.internal){const prefix=network.prefixFromNetmask(r.netmask),subnet=network.subnetFor(r.address,prefix);if(subnet)addresses.push({address:r.address,prefixLength:prefix,subnet:subnet.cidr});}}
 assert.equal(addresses.length,1,'unique owned runner socket address required');
 const selected={...addresses[0],interfaceName:'ISOLATED_TEST_SOCKET',adapterId:'11111111-1111-4111-8111-111111111111'};
 let initialization=true,port,reservation;
 const sockets=new Set(),servers=[];
 const gate=createRequestGate({getState:()=>({selected,status:'LAN_SERVER_READY'}),needsInitialization:()=>initialization});
 try{
  reservation=await network.findAndReservePort({addresses:['127.0.0.1',selected.address],createServer(address){
   const s=http.createServer((req,res)=>gate({kind:address==='127.0.0.1'?'local':'lan',address},req,res,(_q,r)=>{r.writeHead(200,{'Content-Type':'application/json'});r.end('{"isolatedSocket":true}')}));
   s.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket))});servers.push(s);return s;
  }});port=reservation.port;assert.ok(port>=8080&&port<=8099);assert.equal(servers.length,2);assert.ok(servers.every(s=>s.listening));
  const local='http://127.0.0.1:'+port,remote='http://'+selected.address+':'+port;
  const call=async(origin,route)=>{const r=await fetch(origin+route,{headers:{Origin:origin,Connection:'close'},signal:AbortSignal.timeout(5000)});return {status:r.status,data:await r.json()}};
  assert.equal((await call(local,'/probe')).status,200);
  const before=await call(remote,'/api/setup');assert.equal(before.status,503);assert.equal(before.data.code,'HOST_INITIALIZATION_REQUIRED');
  initialization=false;
  const after=await call(remote,'/api/setup');assert.equal(after.status,403);assert.equal(after.data.code,'REMOTE_BOOTSTRAP_CLOSED');
  const denied=await call(remote,'/api/lan/status');assert.equal(denied.status,403);assert.equal(denied.data.code,'LOCAL_STATUS_ONLY');
  assert.equal((await call(remote,'/probe')).status,200);
 }finally{
  if(reservation)await reservation.release();
  assert.ok(servers.every(s=>!s.listening));assert.equal(sockets.size,0);
 }
 return {schema:1,kind:'FRESH_ISOLATED_SOCKET',sourceCommit,status:'PASS',method:'ACTUAL_INSTALLED_REQUEST_GATE_SYNTHETIC_DISCOVERY_STATE',productionLanTrusted:false,physicalCertification:false,dualListening:true,remoteBootstrapRejected:true,localReachable:true,remoteReachable:true,ownedSocketsClosed:true};
}
module.exports={run};
