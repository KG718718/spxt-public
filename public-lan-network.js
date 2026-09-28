'use strict';

const net = require('node:net');
const os = require('node:os');
const fsDefault = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const PORT_MIN = 8080;
const PORT_MAX = 8099;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIRTUAL_HINT = /(?:vpn|tunnel|tap|tun|wireguard|docker|wsl|virtual|vmware|virtualbox|loopback|bluetooth|teredo|isatap|6to4|hyper[- ]?v|vethernet)/i;
const PHYSICAL_MEDIA = /(?:802\.3|ethernet|native\s*802\.11|wireless\s*lan|wi-?fi)/i;
const INTERFACE_NAME_MAX = 128;

function interfaceName(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= INTERFACE_NAME_MAX
    && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value) && !VIRTUAL_HINT.test(value) ? value : null;
}

function prefixFromNetmask(value) {
  const mask = ipv4Number(value);
  if (mask === null) return null;
  let bits = 0, gap = false;
  for (let index = 31; index >= 0; index -= 1) {
    if ((mask >>> index) & 1) { if (gap) return null; bits += 1; }
    else gap = true;
  }
  return bits;
}

function nodeLanCandidates(interfaces = os.networkInterfaces()) {
  if (!interfaces || typeof interfaces !== 'object' || Array.isArray(interfaces)) fail('NETWORK_DISCOVERY_INVALID', '网络接口结果结构非法。');
  const candidates = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    if (!interfaceName(name) || !Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || entry.internal !== false || !['IPv4', 4].includes(entry.family)) continue;
      const address = normalizeIPv4(entry.address);
      const prefixLength = prefixFromNetmask(entry.netmask);
      const subnet = subnetFor(address, prefixLength);
      if (!subnet || prefixLength > 30 || address === subnet.network || address === subnet.broadcast) continue;
      if (entry.cidr !== undefined && entry.cidr !== `${address}/${prefixLength}`) continue;
      candidates.push(Object.freeze({interfaceName: name, name, address, prefixLength, subnet: subnet.cidr}));
    }
  }
  return candidates.sort((a, b) => a.interfaceName.localeCompare(b.interfaceName) || a.address.localeCompare(b.address));
}

function selectNodeLan(interfaces, preference = null) {
  if (preference !== null && !interfaceName(preference)) fail('LAN_CONFIG_INVALID', '保存的网络接口名称非法。');
  const candidates = nodeLanCandidates(interfaces);
  if (preference === null) return Object.freeze({status: candidates.length ? 'NEEDS_NETWORK_SELECTION' : 'NO_PRIVATE_LAN', selected: null, candidates});
  const matches = candidates.filter(candidate => candidate.interfaceName === preference);
  return Object.freeze({status: matches.length === 1 ? 'SELECTED' : 'NETWORK_CHANGED', selected: matches.length === 1 ? matches[0] : null, candidates});
}

const WINDOWS_DISCOVERY_SCRIPT = String.raw`$ErrorActionPreference='Stop'
Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop
$profiles=@{}; Get-NetConnectionProfile -ErrorAction Stop | ForEach-Object { $profiles[[int]$_.InterfaceIndex]=[string]$_.NetworkCategory }
$routes=@{}; Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop | Where-Object { $_.State -eq 'Alive' } | ForEach-Object { $i=[int]$_.InterfaceIndex; $m=[int]$_.RouteMetric; if(!$routes.ContainsKey($i) -or $m -lt $routes[$i]){$routes[$i]=$m} }
$onLink=@{}; Get-NetRoute -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.State -eq 'Alive' -and $_.NextHop -eq '0.0.0.0' -and $_.DestinationPrefix -ne '0.0.0.0/0' } | ForEach-Object { $i=[int]$_.InterfaceIndex; if(!$onLink.ContainsKey($i)){$onLink[$i]=@()}; $onLink[$i] += [string]$_.DestinationPrefix }
$result=@(); Get-NetAdapter -IncludeHidden -ErrorAction Stop | ForEach-Object {
  $a=$_; Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | ForEach-Object {
    $result += [pscustomobject]@{Name=[string]$a.Name;Description=[string]$a.InterfaceDescription;InterfaceGuid=[string]$a.InterfaceGuid;InterfaceIndex=[int]$a.ifIndex;Status=[string]$a.Status;HardwareInterface=[bool]$a.HardwareInterface;Virtual=[bool]$a.Virtual;MediaType=[string]$a.MediaType;PhysicalMediaType=[string]$a.NdisPhysicalMedium;Address=[string]$_.IPAddress;PrefixLength=[int]$_.PrefixLength;AddressState=[string]$_.AddressState;NetworkCategory=if($profiles.ContainsKey([int]$a.ifIndex)){$profiles[[int]$a.ifIndex]}else{$null};HasDefaultRoute=$routes.ContainsKey([int]$a.ifIndex);OnLinkPrefixes=if($onLink.ContainsKey([int]$a.ifIndex)){@($onLink[[int]$a.ifIndex])}else{@()};RouteMetric=if($routes.ContainsKey([int]$a.ifIndex)){$routes[[int]$a.ifIndex]}else{$null}}
  }
}; ConvertTo-Json -InputObject @($result) -Compress -Depth 3`;

class LanNetworkError extends Error {
  constructor(code, message) { super(message); this.name = 'LanNetworkError'; this.code = code; }
}

function fail(code, message) { throw new LanNetworkError(code, message); }

function normalizeIPv4(value) {
  if (typeof value !== 'string') return null;
  let address = value.trim().toLowerCase();
  if (address.startsWith('::ffff:')) address = address.slice(7);
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return null;
  const parts = address.split('.').map(Number);
  if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts.join('.');
}

function ipv4Number(value) {
  const address = normalizeIPv4(value);
  if (!address) return null;
  return address.split('.').reduce((result, part) => ((result << 8) | Number(part)) >>> 0, 0);
}

function privateBlock(address) {
  const number = ipv4Number(address);
  if (number === null) return null;
  if (((number & 0xff000000) >>> 0) === 0x0a000000) return {base: 0x0a000000, prefix: 8};
  if (((number & 0xfff00000) >>> 0) === 0xac100000) return {base: 0xac100000, prefix: 12};
  if (((number & 0xffff0000) >>> 0) === 0xc0a80000) return {base: 0xc0a80000, prefix: 16};
  return null;
}

function prefixMask(prefixLength) {
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) return null;
  return prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
}

function numberIPv4(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

function subnetFor(address, prefixLength) {
  const normalized = normalizeIPv4(address);
  const number = ipv4Number(normalized);
  const mask = prefixMask(prefixLength);
  const block = privateBlock(normalized);
  if (number === null || mask === null || !block || prefixLength < block.prefix) return null;
  const network = (number & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const blockMask = prefixMask(block.prefix);
  if (((network & blockMask) >>> 0) !== block.base || ((broadcast & blockMask) >>> 0) !== block.base) return null;
  return Object.freeze({address: normalized, prefixLength, network: numberIPv4(network), broadcast: numberIPv4(broadcast), cidr: numberIPv4(network) + '/' + prefixLength});
}

function isAddressInSubnet(address, subnetAddress, prefixLength) {
  const peer = ipv4Number(address);
  const subnet = subnetFor(subnetAddress, prefixLength);
  const mask = prefixMask(prefixLength);
  return peer !== null && subnet !== null && ((peer & mask) >>> 0) === ipv4Number(subnet.network);
}

function adapterId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase();
  return GUID.test(normalized) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(normalized) ? normalized : null;
}

function finiteMetric(value) {
  return Number.isInteger(value) && value >= 0 ? value : Number.MAX_SAFE_INTEGER;
}

function classifyAdapter(raw) {
  if (!raw || typeof raw !== 'object') return {accepted: false, reason: 'INVALID'};
  const id = adapterId(raw.InterfaceGuid ?? raw.interfaceGuid ?? raw.adapterId);
  const name = String(raw.Name ?? raw.name ?? '').trim();
  const description = String(raw.Description ?? raw.description ?? '').trim();
  const status = String(raw.Status ?? raw.status ?? '');
  const address = normalizeIPv4(raw.Address ?? raw.address);
  const prefixLength = Number(raw.PrefixLength ?? raw.prefixLength);
  const subnet = subnetFor(address, prefixLength);
  const media = [raw.MediaType, raw.mediaType, raw.PhysicalMediaType, raw.physicalMediaType].filter(Boolean).join(' ');
  if (!id || !name || !address || !subnet) return {accepted: false, reason: 'IDENTITY_OR_ADDRESS'};
  if (status.toLowerCase() !== 'up' || String(raw.AddressState ?? raw.addressState ?? '').toLowerCase() !== 'preferred') return {accepted: false, reason: 'DISCONNECTED'};
  if (raw.HardwareInterface !== true && raw.hardwareInterface !== true) return {accepted: false, reason: 'NOT_HARDWARE'};
  if (raw.Virtual === true || raw.virtual === true) return {accepted: false, reason: 'VIRTUAL'};
  if (!PHYSICAL_MEDIA.test(media)) return {accepted: false, reason: 'MEDIA'};
  if (VIRTUAL_HINT.test(name + ' ' + description + ' ' + media)) return {accepted: false, reason: 'VIRTUAL'};
  const prefixes = raw.OnLinkPrefixes ?? raw.onLinkPrefixes ?? [];
  const matchingOnLink = (Array.isArray(prefixes) ? prefixes : [prefixes]).some(prefix => String(prefix).toLowerCase() === subnet.cidr.toLowerCase());
  if (!matchingOnLink && raw.HasOnLinkRoute !== true && raw.hasOnLinkRoute !== true
      && raw.HasDefaultRoute !== true && raw.hasDefaultRoute !== true) return {accepted: false, reason: 'NO_ROUTE'};
  if (String(raw.NetworkCategory ?? raw.networkCategory ?? '').toLowerCase() !== 'private') return {accepted: false, reason: 'PROFILE_NOT_PRIVATE'};
  return {accepted: true, candidate: Object.freeze({
    adapterId: id, name: name.slice(0, 256), address, prefixLength,
    subnet: subnet.cidr, routeMetric: finiteMetric(raw.RouteMetric ?? raw.routeMetric)
  })};
}

function selectLanAdapter(records, preference = null) {
  if (!Array.isArray(records)) fail('NETWORK_DISCOVERY_INVALID', '网络发现结果结构非法。');
  const candidates = [];
  const seen = new Set();
  for (const raw of records) {
    const result = classifyAdapter(raw);
    if (!result.accepted) continue;
    const key = result.candidate.adapterId + '|' + result.candidate.address;
    if (!seen.has(key)) { seen.add(key); candidates.push(result.candidate); }
  }
  candidates.sort((a, b) => a.routeMetric - b.routeMetric || a.name.localeCompare(b.name) || a.address.localeCompare(b.address));
  const preferred = preference === null || preference === undefined ? null : adapterId(preference);
  if (preference !== null && preference !== undefined && !preferred) fail('LAN_CONFIG_INVALID', '保存的网络适配器标识非法。');
  if (preferred) {
    const matches = candidates.filter(candidate => candidate.adapterId === preferred);
    const selected = matches.length === 1 ? matches[0] : null;
    return Object.freeze({status: selected ? 'SELECTED' : 'NETWORK_CHANGED', selected, candidates});
  }
  if (!candidates.length) return Object.freeze({status: 'NO_PRIVATE_LAN', selected: null, candidates});
  if (candidates.length > 1) return Object.freeze({status: 'MULTIPLE_LAN_ADAPTERS', selected: null, candidates});
  return Object.freeze({status: 'SELECTED', selected: candidates[0], candidates});
}

function parsePowerShellRecords(stdout) {
  let value;
  try { value = JSON.parse(String(stdout || '').replace(/^\ufeff/, '')); }
  catch { fail('NETWORK_DISCOVERY_FAILED', 'Windows 网络信息无法安全解析。'); }
  if (value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function sameWindowsPath(left, right) {
  return path.win32.normalize(left).toLowerCase() === path.win32.normalize(right).toLowerCase();
}

function resolveSystemPowerShell(options = {}) {
  const fs = options.fs || fsDefault;
  const supplied = options.systemRoot ?? process.env.SystemRoot;
  if (typeof supplied !== 'string' || !/^[a-z]:\\windows\\?$/i.test(supplied)) {
    fail('NETWORK_SYSTEM_RUNTIME_INVALID', 'Windows 系统运行时路径无法确认，LAN 已保持关闭。');
  }
  const systemRoot = path.win32.normalize(supplied).replace(/[\\/]$/, '');
  const executable = path.win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    const rootStat = fs.lstatSync(systemRoot);
    const executableStat = fs.lstatSync(executable);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !executableStat.isFile() || executableStat.isSymbolicLink()) throw Error('unsafe');
    const realRoot = fs.realpathSync.native ? fs.realpathSync.native(systemRoot) : fs.realpathSync(systemRoot);
    const realExecutable = fs.realpathSync.native ? fs.realpathSync.native(executable) : fs.realpathSync(executable);
    if (!sameWindowsPath(realRoot, systemRoot) || !sameWindowsPath(realExecutable, executable)) throw Error('redirected');
  } catch {
    fail('NETWORK_SYSTEM_RUNTIME_INVALID', 'Windows 系统 PowerShell 无法安全确认，LAN 已保持关闭。');
  }
  return Object.freeze({
    systemRoot, executable,
    environment: Object.freeze({
      SystemRoot: systemRoot,
      WINDIR: systemRoot,
      PATH: path.win32.join(systemRoot, 'System32'),
      PSModulePath: path.win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules')
    })
  });
}

function runWindowsDiscovery(options = {}) {
  if ((options.platform || process.platform) !== 'win32') fail('NETWORK_PLATFORM_UNSUPPORTED', 'LAN Host 网络发现仅支持 Windows。');
  const runtime = resolveSystemPowerShell(options);
  const encoded = Buffer.from(WINDOWS_DISCOVERY_SCRIPT, 'utf16le').toString('base64');
  const run = options.spawnSync || spawnSync;
  const result = run(runtime.executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
    encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024,
    cwd: path.win32.join(runtime.systemRoot, 'System32'), env: runtime.environment
  });
  if (!result || result.error || result.status !== 0 || result.signal || String(result.stderr || '').trim()) {
    fail('NETWORK_DISCOVERY_FAILED', 'Windows 网络状态无法确认，LAN 已保持关闭。');
  }
  return parsePowerShellRecords(result.stdout);
}

function discoverWindowsLan(options = {}) {
  if ((options.platform || process.platform) !== 'win32' && !options.interfaces) fail('NETWORK_PLATFORM_UNSUPPORTED', 'LAN Host 网络发现仅支持 Windows。');
  return selectNodeLan(options.interfaces || (options.networkInterfaces || os.networkInterfaces)(), options.interfaceName ?? null);
}

function listen(server, address, port) {
  return new Promise((resolve, reject) => {
    const onError = error => { cleanup(); reject(error); };
    const onListening = () => { cleanup(); resolve(); };
    const cleanup = () => { server.off('error', onError); server.off('listening', onListening); };
    server.once('error', onError); server.once('listening', onListening);
    server.listen({host: address, port, exclusive: true});
  });
}

function close(server) {
  return new Promise(resolve => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}

async function reservePort(options = {}) {
  const port = options.port;
  const addresses = options.addresses;
  if (!Number.isInteger(port) || port < PORT_MIN || port > PORT_MAX) fail('PORT_INVALID', '端口非法。');
  const normalizedAddresses = Array.isArray(addresses) ? addresses.map(normalizeIPv4) : [];
  if (!normalizedAddresses.length || normalizedAddresses.length > 2 || !normalizedAddresses.includes('127.0.0.1')
      || new Set(normalizedAddresses).size !== normalizedAddresses.length
      || normalizedAddresses.some(address => !address || (address !== '127.0.0.1' && !privateBlock(address)))) {
    fail('LISTENER_ADDRESS_INVALID', '监听地址非法。');
  }
  const createServer = options.createServer || (() => net.createServer(socket => socket.destroy()));
  const servers = [];
  try {
    for (const address of normalizedAddresses) {
      const server = createServer(address, port);
      // `exclusive` controls Node cluster handle sharing. Availability is proven only
      // by this real listen succeeding while the returned handle stays open.
      await listen(server, address, port);
      servers.push(server);
    }
  } catch (error) {
    await Promise.all(servers.map(close));
    const occupied = error && ['EADDRINUSE', 'EACCES'].includes(error.code);
    throw new LanNetworkError(occupied ? 'PORT_OCCUPIED' : 'LAN_START_FAILED', occupied ? 'LAN PORT OCCUPIED' : 'LAN listener 启动失败。');
  }
  let released = false;
  return Object.freeze({port, addresses: normalizedAddresses, servers: Object.freeze(servers.slice()),
    async release() { if (released) return; released = true; await Promise.all(servers.map(close)); }});
}

async function findAndReservePort(options = {}) {
  const start = options.start ?? PORT_MIN;
  const end = options.end ?? PORT_MAX;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < PORT_MIN || end > PORT_MAX || start > end) fail('PORT_RANGE_INVALID', '端口搜索范围非法。');
  for (let port = start; port <= end; port += 1) {
    try { return await reservePort({...options, port}); }
    catch (error) { if (error.code !== 'PORT_OCCUPIED') throw error; }
  }
  fail('PORT_RANGE_EXHAUSTED', '8080—8099 均不可绑定。');
}

async function reservePersistedPort(options = {}) {
  if (!Number.isInteger(options.port) || options.port < PORT_MIN || options.port > PORT_MAX) fail('LAN_CONFIG_INVALID', '保存的端口非法。');
  return reservePort(options);
}

function publicDiscoveryView(result) {
  const view = candidate => ({interfaceName: candidate.interfaceName, name: candidate.name, address: candidate.address,
    prefixLength: candidate.prefixLength, subnet: candidate.subnet});
  return {schema: 2, status: result.status, selected: result.selected ? view(result.selected) : null, candidates: result.candidates.map(view), hostName: os.hostname()};
}

module.exports = {
  PORT_MIN, PORT_MAX, WINDOWS_DISCOVERY_SCRIPT, LanNetworkError,
  normalizeIPv4, ipv4Number, privateBlock, prefixMask, subnetFor, isAddressInSubnet,
  interfaceName, prefixFromNetmask, nodeLanCandidates, selectNodeLan,
  adapterId, classifyAdapter, selectLanAdapter, parsePowerShellRecords, resolveSystemPowerShell,
  runWindowsDiscovery, discoverWindowsLan, reservePort, findAndReservePort,
  reservePersistedPort, publicDiscoveryView
};
