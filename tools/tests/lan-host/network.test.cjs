'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const network = require('../../../public-lan-network');

const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';
const NON_UUID_VERSION_ID = 'abcdef01-2345-f789-0123-abcdef012345';

function adapter(overrides = {}) {
  return {Name: 'Ethernet', Description: 'Synthetic physical adapter', InterfaceGuid: ID1,
    Status: 'Up', HardwareInterface: true, Virtual: false, MediaType: '802.3', PhysicalMediaType: '802.3',
    Address: '192.168.10.23', PrefixLength: 24, AddressState: 'Preferred', NetworkCategory: 'Private',
    HasDefaultRoute: true, OnLinkPrefixes: ['192.168.10.0/24'], RouteMetric: 20, ...overrides};
}

function systemRuntimeFs(overrides = {}) {
  const realpathSync = value => overrides.realPath || value;
  realpathSync.native = realpathSync;
  return {
    lstatSync(value) {
      if (overrides.missing) { const error = new Error('missing'); error.code = 'ENOENT'; throw error; }
      const executable = /powershell\.exe$/i.test(value);
      return {isDirectory: () => !executable, isFile: () => executable,
        isSymbolicLink: () => Boolean(overrides.link && executable)};
    },
    realpathSync
  };
}

test('strict IPv4 normalization and RFC1918 subnet boundaries', () => {
  assert.equal(network.normalizeIPv4('::ffff:192.168.1.2'), '192.168.1.2');
  assert.equal(network.normalizeIPv4('::FFFF:10.1.2.3'), '10.1.2.3');
  for (const address of ['10.0.0.0', '10.255.255.255', '172.16.0.0', '172.31.255.255', '192.168.0.0', '192.168.255.255']) {
    assert.ok(network.privateBlock(address), address);
  }
  for (const address of ['9.255.255.255', '11.0.0.0', '172.15.255.255', '172.32.0.0', '192.167.255.255',
    '192.169.0.0', '127.0.0.1', '169.254.1.1', '8.8.8.8', '224.0.0.1', '999.1.1.1']) {
    assert.equal(network.privateBlock(address), null, address);
  }
  assert.equal(network.subnetFor('10.1.2.3', 7), null);
  assert.equal(network.subnetFor('172.16.3.4', 11), null);
  assert.equal(network.subnetFor('192.168.3.4', 15), null);
  assert.equal(network.subnetFor('192.168.3.4', 33), null);
  assert.deepEqual(network.subnetFor('192.168.3.4', 24), {address: '192.168.3.4', prefixLength: 24,
    network: '192.168.3.0', broadcast: '192.168.3.255', cidr: '192.168.3.0/24'});
  assert.equal(network.isAddressInSubnet('::ffff:192.168.3.99', '192.168.3.4', 24), true);
  assert.equal(network.isAddressInSubnet('192.168.4.1', '192.168.3.4', 24), false);
});

test('adapter qualification combines physical, state, route, profile and address evidence', () => {
  assert.equal(network.classifyAdapter(adapter()).accepted, true);
  assert.equal(network.classifyAdapter(adapter({HasDefaultRoute: false, OnLinkPrefixes: ['192.168.10.0/24']})).accepted, true,
    'an on-link LAN without a gateway remains valid');
  assert.equal(network.classifyAdapter(adapter({Name: 'Office uplink', Description: 'Ordinary device'})).accepted, true,
    'name regex is not required evidence when physical media is proven');
  for (const change of [
    {Status: 'Disconnected'}, {AddressState: undefined}, {HardwareInterface: false}, {Virtual: true}, {MediaType: 'Tunnel'},
    {Name: 'Docker Ethernet'}, {Description: 'Hyper-V Virtual Ethernet'}, {Address: '169.254.2.3'},
    {Address: '203.0.113.2'}, {Address: '127.0.0.1'}, {PrefixLength: 15}, {AddressState: 'Duplicate'},
    {NetworkCategory: 'Public'}, {NetworkCategory: null}, {HasDefaultRoute: false, OnLinkPrefixes: []},
    {HasDefaultRoute: false, OnLinkPrefixes: ['10.0.0.0/8']}, {InterfaceGuid: 'not-a-guid'}
  ]) assert.equal(network.classifyAdapter(adapter(change)).accepted, false, JSON.stringify(change));
});

test('selection never guesses among multiple LANs and preserves adapter identity across DHCP changes', () => {
  const second = adapter({Name: 'Wi-Fi', InterfaceGuid: ID2, Address: '10.20.30.40', PrefixLength: 24,
    MediaType: 'Native 802.11', PhysicalMediaType: 'Wireless LAN', HasDefaultRoute: false,
    OnLinkPrefixes: ['10.20.30.0/24'], RouteMetric: 5});
  const multiple = network.selectLanAdapter([adapter(), second]);
  assert.equal(multiple.status, 'MULTIPLE_LAN_ADAPTERS'); assert.equal(multiple.selected, null); assert.equal(multiple.candidates.length, 2);
  const preferred = network.selectLanAdapter([adapter(), second], ID1);
  assert.equal(preferred.status, 'SELECTED'); assert.equal(preferred.selected.adapterId, ID1);
  const missing = network.selectLanAdapter([second], ID1);
  assert.equal(missing.status, 'NETWORK_CHANGED'); assert.equal(missing.selected, null);
  const dhcp = network.selectLanAdapter([adapter({Address: '192.168.10.88'})], ID1);
  assert.equal(dhcp.status, 'SELECTED'); assert.equal(dhcp.selected.address, '192.168.10.88');
  assert.equal(network.selectLanAdapter([]).status, 'NO_PRIVATE_LAN');
  assert.throws(() => network.selectLanAdapter([adapter()], 'bad preference'), {code: 'LAN_CONFIG_INVALID'});
  assert.equal(network.adapterId('{ABCDEF01-2345-F789-0123-ABCDEF012345}'), NON_UUID_VERSION_ID);
  const secondAddress = adapter({Address: '192.168.10.99'});
  assert.equal(network.selectLanAdapter([adapter(), secondAddress]).status, 'MULTIPLE_LAN_ADAPTERS');
  assert.equal(network.selectLanAdapter([adapter(), secondAddress], ID1).status, 'NETWORK_CHANGED',
    'one saved adapter identity cannot silently choose among multiple valid addresses');
});

test('PowerShell discovery is fixed, hidden, non-interactive and returns only parsed records', () => {
  let invocation;
  const records = network.runWindowsDiscovery({platform: 'win32', systemRoot: 'C:\\Windows', fs: systemRuntimeFs(), spawnSync(file, args, options) {
    invocation = {file, args, options}; return {status: 0, signal: null, stderr: '', stdout: JSON.stringify(adapter())};
  }});
  assert.equal(records.length, 1); assert.equal(records[0].Address, '192.168.10.23');
  assert.equal(invocation.file, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual(invocation.args.slice(0, 7), ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden']);
  assert.equal(invocation.args[7], '-EncodedCommand'); assert.match(invocation.args[8], /^[A-Za-z0-9+/=]+$/);
  assert.equal(invocation.options.windowsHide, true); assert.equal(invocation.options.timeout, 15000);
  assert.equal(invocation.options.cwd, 'C:\\Windows\\System32');
  assert.deepEqual(invocation.options.env, {SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows',
    PATH: 'C:\\Windows\\System32', PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'});
  assert.throws(() => network.runWindowsDiscovery({platform: 'win32', systemRoot: 'C:\\Windows', fs: systemRuntimeFs(),
    spawnSync: () => ({status: 1, stderr: 'private path'})}),
    error => error.code === 'NETWORK_DISCOVERY_FAILED' && !error.message.includes('private path'));
  assert.throws(() => network.parsePowerShellRecords('not json'), {code: 'NETWORK_DISCOVERY_FAILED'});
  const view = network.publicDiscoveryView(network.selectLanAdapter([adapter()]));
  assert.deepEqual(Object.keys(view).sort(), ['candidates', 'hostName', 'schema', 'selected', 'status']);
  assert.deepEqual(Object.keys(view.selected).sort(), ['adapterId', 'address', 'name', 'prefixLength', 'subnet']);
});

test('system PowerShell resolution rejects empty, forged, missing and redirected roots', () => {
  const resolved = network.resolveSystemPowerShell({systemRoot: 'D:\\Windows', fs: systemRuntimeFs()});
  assert.equal(resolved.executable, 'D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.equal(resolved.environment.PATH, 'D:\\Windows\\System32');
  for (const systemRoot of ['', 'powershell.exe', 'C:\\Users\\Public\\Windows', '\\\\server\\Windows', 'C:\\Windows\\..\\evil']) {
    assert.throws(() => network.resolveSystemPowerShell({systemRoot, fs: systemRuntimeFs()}), {code: 'NETWORK_SYSTEM_RUNTIME_INVALID'});
  }
  assert.throws(() => network.resolveSystemPowerShell({systemRoot: 'C:\\Windows', fs: systemRuntimeFs({missing: true})}),
    {code: 'NETWORK_SYSTEM_RUNTIME_INVALID'});
  assert.throws(() => network.resolveSystemPowerShell({systemRoot: 'C:\\Windows', fs: systemRuntimeFs({link: true})}),
    {code: 'NETWORK_SYSTEM_RUNTIME_INVALID'});
  assert.throws(() => network.resolveSystemPowerShell({systemRoot: 'C:\\Windows', fs: systemRuntimeFs({realPath: 'C:\\Other'})}),
    {code: 'NETWORK_SYSTEM_RUNTIME_INVALID'});
});

test('fixed Windows discovery script passes the PowerShell parser without executing discovery', () => {
  assert.equal(process.platform, 'win32', 'Batch 4.5 network tests require Windows');
  const parser = "$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput($env:KSESSION_LAN_SCRIPT_SOURCE,[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){exit 7}";
  const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', parser], {
    encoding: 'utf8', windowsHide: true, timeout: 10000,
    env: {...process.env, KSESSION_LAN_SCRIPT_SOURCE: network.WINDOWS_DISCOVERY_SCRIPT}
  });
  assert.equal(result.status, 0, 'fixed discovery script must parse');
  assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
});

function rawListen(port) {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({host: '127.0.0.1', port, exclusive: true}, () => resolve(server));
  });
}
function close(server) { return new Promise(resolve => server.close(resolve)); }
function dotNetReuseBind(port) {
  const script = String.raw`$ErrorActionPreference="Stop"
$text=[string]$env:KSESSION_REUSE_TEST_PORT
if($text -notmatch '^80(?:8\d|9\d)$'){exit 8}
$socket=[System.Net.Sockets.Socket]::new([System.Net.Sockets.AddressFamily]::InterNetwork,[System.Net.Sockets.SocketType]::Stream,[System.Net.Sockets.ProtocolType]::Tcp)
try {
  $socket.ExclusiveAddressUse=$false
  $socket.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket,[System.Net.Sockets.SocketOptionName]::ReuseAddress,$true)
  $reuse=[int]$socket.GetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket,[System.Net.Sockets.SocketOptionName]::ReuseAddress)
  if($socket.ExclusiveAddressUse -or $reuse -eq 0){[Console]::Write('SETUP_FAILED');exit 9}
  try {$socket.Bind([System.Net.IPEndPoint]::new([System.Net.IPAddress]::Loopback,[int]$text))}
  catch [System.Net.Sockets.SocketException] {[Console]::Write('REJECTED:BIND:'+([int]$_.Exception.SocketErrorCode));exit 0}
  try {$socket.Listen(1)}
  catch [System.Net.Sockets.SocketException] {[Console]::Write('REJECTED:LISTEN:'+([int]$_.Exception.SocketErrorCode));exit 0}
  [Console]::Write('BOUND')
} finally {$socket.Dispose()}`;
  return spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], {
    encoding: 'utf8', windowsHide: true, timeout: 10000,
    env: {...process.env, KSESSION_REUSE_TEST_PORT: String(port)}
  });
}
async function freePorts() {
  const free = [];
  for (let port = network.PORT_MIN; port <= network.PORT_MAX; port += 1) {
    try { const server = await rawListen(port); await close(server); free.push(port); } catch {}
  }
  return free;
}

test('real loopback binds prove collision, ordered search, persistence and exhaustion', {timeout: 30000}, async () => {
  const initiallyFree = await freePorts();
  assert.ok(initiallyFree.length >= 2, 'this local test needs two free ports in 8080-8099');
  const occupiedPort = initiallyFree[0];
  const positive = dotNetReuseBind(occupiedPort);
  assert.equal(positive.status, 0, 'independent .NET positive control must complete: ' + JSON.stringify({
    signal: positive.signal, stdout: positive.stdout, stderr: positive.stderr, error: positive.error?.code
  }));
  assert.equal(positive.stdout, 'BOUND', 'the .NET probe must bind the same endpoint when it is actually free');
  assert.equal(positive.stderr, '');
  const occupant = await rawListen(occupiedPort);
  let reservation;
  try {
    const reuse = dotNetReuseBind(occupiedPort);
    assert.equal(reuse.status, 0, 'independent .NET reuse probe must complete');
    assert.match(reuse.stdout, /^REJECTED:(?:BIND|LISTEN):(?:10048|10013)$/,
      'only address-in-use/access-denied at bind/listen proves that the held endpoint was rejected');
    assert.equal(reuse.stderr, '');
    reservation = await network.findAndReservePort({addresses: ['127.0.0.1'], start: occupiedPort, end: network.PORT_MAX});
    assert.ok(reservation.port > occupiedPort, 'search must advance after a real failed bind');
    await assert.rejects(network.reservePersistedPort({addresses: ['127.0.0.1'], port: occupiedPort}), {code: 'PORT_OCCUPIED'});
    assert.equal(occupiedPort, initiallyFree[0], 'persisted collision does not silently mutate the requested port');
    await assert.rejects(rawListen(reservation.port), error => ['EADDRINUSE', 'EACCES'].includes(error.code));
    await reservation.release(); reservation = null;

    const explicitlyFound = await network.findAndReservePort({addresses: ['127.0.0.1'], start: occupiedPort, end: network.PORT_MAX});
    assert.notEqual(explicitlyFound.port, occupiedPort, 'an explicit new search may select another port');
    await explicitlyFound.release();
  } finally {
    if (reservation) await reservation.release();
    await close(occupant);
  }

  const holders = [];
  try {
    for (const port of await freePorts()) holders.push(await rawListen(port));
    await assert.rejects(network.findAndReservePort({addresses: ['127.0.0.1']}), {code: 'PORT_RANGE_EXHAUSTED'});
  } finally { await Promise.all(holders.map(close)); }
});

test('port API rejects unsafe ranges and duplicate or non-IPv4 listener targets', async () => {
  await assert.rejects(network.findAndReservePort({addresses: ['127.0.0.1'], start: 8079}), {code: 'PORT_RANGE_INVALID'});
  await assert.rejects(network.reservePort({addresses: ['0.0.0.0'], port: 8080}), {code: 'LISTENER_ADDRESS_INVALID'});
  await assert.rejects(network.reservePort({addresses: ['192.168.1.2'], port: 8080}), {code: 'LISTENER_ADDRESS_INVALID'});
  await assert.rejects(network.reservePort({addresses: ['127.0.0.1', '192.168.1.2', '10.0.0.2'], port: 8080}), {code: 'LISTENER_ADDRESS_INVALID'});
  await assert.rejects(network.reservePort({addresses: ['127.0.0.1', '127.0.0.1'], port: 8080}), {code: 'LISTENER_ADDRESS_INVALID'});
  await assert.rejects(network.reservePort({addresses: ['127.0.0.1', '::ffff:127.0.0.1'], port: 8080}), {code: 'LISTENER_ADDRESS_INVALID'});
});

test('CLI source has a closed command and does not emit raw diagnostics', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../lan-host/network-cli.cjs'), 'utf8');
  assert.match(source, /command !== 'discover'/);
  assert.doesNotMatch(source, /stderr|error\.message|process\.env|execSync|shell\s*:/);
});
