'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const network = require('../../../public-lan-network');

const physical = address => ({family: 'IPv4', internal: false, address, netmask: '255.255.255.0', cidr: `${address}/24`});

test('Node enumeration requires explicit selection even with one candidate', () => {
  const interfaces = {'公司网络': [physical('192.168.2.8')]};
  const list = network.selectNodeLan(interfaces);
  assert.equal(list.status, 'NEEDS_NETWORK_SELECTION');
  assert.equal(list.selected, null);
  assert.deepEqual(list.candidates[0], {interfaceName: '公司网络', name: '公司网络', address: '192.168.2.8', prefixLength: 24, subnet: '192.168.2.0/24'});
  const selected = network.selectNodeLan(interfaces, '公司网络');
  assert.equal(selected.status, 'SELECTED');
  assert.equal(network.publicDiscoveryView(selected).schema, 2);
});

test('saved interface is re-resolved and ambiguity fails closed', () => {
  assert.equal(network.selectNodeLan({'公司网络': [physical('10.2.3.9')]}, '公司网络').selected.address, '10.2.3.9');
  assert.equal(network.selectNodeLan({'公司网络': [physical('10.2.4.10')]}, '公司网络').selected.address, '10.2.4.10');
  assert.equal(network.selectNodeLan({'其他网络': [physical('10.2.3.9')]}, '公司网络').status, 'NETWORK_CHANGED');
  assert.equal(network.selectNodeLan({'公司网络': [physical('10.2.3.9'), physical('10.2.4.10')]}, '公司网络').status, 'NETWORK_CHANGED');
});

test('invalid masks, public addresses, internal and virtual interfaces are excluded', () => {
  const bad = {...physical('192.168.1.4'), netmask: '255.0.255.0'};
  const result = network.selectNodeLan({
    'VPN Tunnel': [physical('10.0.0.2')], 'vEthernet (WSL)': [physical('172.16.1.2')],
    'MyVPNAdapter': [physical('10.0.0.3')], 'DockerNAT': [physical('172.16.1.3')],
    'Ethernet': [bad, physical('8.8.8.8'), {...physical('10.2.3.4'), internal: true},
      physical('192.168.1.0'), physical('192.168.1.255'), physical('192.168.1.8')]
  });
  assert.deepEqual(result.candidates.map(candidate => candidate.address), ['192.168.1.8']);
  for (const name of ['', ' Ethernet', 'Ethernet\n', 'x'.repeat(129), 'Docker Network', 'MyVPNAdapter', 'DockerNAT']) {
    assert.equal(network.interfaceName(name), null);
  }
});

test('production discovery entry does not invoke legacy PowerShell', () => {
  const modulePath = require.resolve('../../../public-lan-network');
  const source = `
    const child = require('node:child_process');
    child.spawnSync = () => { throw Error('LEGACY_POWERSHELL_CALLED'); };
    const network = require(${JSON.stringify(modulePath)});
    const result = network.discoverWindowsLan({platform:'win32',networkInterfaces:()=>({Ethernet:[{
      family:'IPv4',internal:false,address:'192.168.4.9',netmask:'255.255.255.0',cidr:'192.168.4.9/24'
    }]})});
    if (result.status !== 'NEEDS_NETWORK_SELECTION' || result.selected !== null) process.exit(2);
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['-e', source], {timeout: 15000, windowsHide: true}));
});
