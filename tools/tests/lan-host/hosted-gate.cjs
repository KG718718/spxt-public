'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const network = require('../../../public-lan-network');
const {createLanHostController, STATUS} = require('../../../public-lan-server');

function prefixFromNetmask(mask) {
  const parts = network.normalizeIPv4(mask)?.split('.').map(Number);
  if (!parts) return null;
  const bits = parts.map(part => part.toString(2).padStart(8, '0')).join('');
  if (!/^1*0*$/.test(bits)) return null;
  return bits.indexOf('0') < 0 ? 32 : bits.indexOf('0');
}

function runnerOwnedPrivateAddress() {
  const candidates = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      const address = network.normalizeIPv4(entry.address);
      const prefixLength = prefixFromNetmask(entry.netmask);
      if (!entry.internal && entry.family === 'IPv4' && address && network.privateBlock(address) && prefixLength !== null) {
        candidates.push({address, prefixLength});
      }
    }
  }
  assert.equal(candidates.length, 1, 'hosted harness requires one runner-owned private IPv4');
  return candidates[0];
}

function get(address, port) {
  return new Promise((resolve, reject) => {
    const request = http.get({host: address, port, path: '/login.html', headers: {Host: `${address}:${port}`}, timeout: 3000}, response => {
      response.resume(); response.once('end', () => resolve(response.statusCode));
    });
    request.once('timeout', () => request.destroy(Error('timeout')));
    request.once('error', reject);
  });
}

async function main(argv) {
  if (process.platform !== 'win32' || process.env.GITHUB_ACTIONS !== 'true' ||
      process.env.RUNNER_ENVIRONMENT !== 'github-hosted' || process.env.GITHUB_REPOSITORY !== 'KG718718/spxt-public') {
    throw Error('HOSTED_CONTEXT_REQUIRED');
  }
  if (argv.length !== 1) throw Error('OUTPUT_REQUIRED');
  const output = path.resolve(argv[0]);
  if (fs.existsSync(output)) throw Error('FRESH_OUTPUT_REQUIRED');

  const actual = network.discoverWindowsLan();
  assert.equal(actual.status, 'NO_PRIVATE_LAN', 'production discovery must reject the hosted virtual adapter');
  assert.equal(actual.candidates.length, 0);

  const syntheticGuid = '12345678-1234-1234-1234-123456789abc';
  const base = {Name: 'Synthetic Ethernet', Description: 'Synthetic physical fixture', InterfaceGuid: syntheticGuid,
    InterfaceIndex: 7, Status: 'Up', HardwareInterface: true, Virtual: false, MediaType: '802.3',
    PhysicalMediaType: 'Ethernet', Address: '192.168.44.10', PrefixLength: 24, AddressState: 'Preferred',
    NetworkCategory: 'Private', HasDefaultRoute: true, OnLinkPrefixes: ['192.168.44.0/24'], RouteMetric: 10};
  assert.equal(network.selectLanAdapter([base]).status, 'SELECTED');
  assert.equal(network.selectLanAdapter([{...base, Virtual: true, Description: 'Hyper-V virtual adapter'}]).status, 'NO_PRIVATE_LAN');

  const owned = runnerOwnedPrivateAddress();
  const selected = {adapterId: syntheticGuid, name: 'Runner-owned isolated bind', address: owned.address,
    prefixLength: owned.prefixLength, subnet: network.subnetFor(owned.address, owned.prefixLength).cidr, routeMetric: 0};
  let controller;
  let state;
  let port;
  for (let candidate = network.PORT_MIN; candidate <= network.PORT_MAX; candidate += 1) {
    controller = createLanHostController({
      needsInitialization: () => false,
      handler(req, res) { res.writeHead(200, {'Content-Type': 'text/plain'}); res.end('ok'); }
    });
    state = await controller.start({schema: 1, port: candidate, adapterPreference: syntheticGuid}, {status: 'SELECTED', selected});
    if (state.status === STATUS.LAN_SERVER_READY) { port = candidate; break; }
    await controller.close(); controller = null;
  }
  assert.ok(controller && port, 'runner-owned isolated dual bind failed');
  try {
    assert.equal(await get(owned.address, port), 200);
    assert.equal(state.localListening && state.lanListening && state.localHealth && state.lanHealth, true);
  } finally {
    await controller.close();
  }
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify({schema: 1, status: 'PASS', productionHostedAdapterRejected: true,
    syntheticStrictDiscovery: 'PASS', runnerOwnedPrivateBind: 'PASS', controllerHealth: 'PASS',
    productionDiscoveryUsedAsSuccess: false, firewallChanged: false, realLanClaim: false}, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write('{"status":"PASS","code":"HOSTED_LAN_ISOLATED"}\n');
}

main(process.argv.slice(2)).catch(() => {
  process.stdout.write('{"status":"FAIL","code":"HOSTED_LAN_GATE"}\n');
  process.exitCode = 1;
});
