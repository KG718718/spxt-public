#!/usr/bin/env node
'use strict';

const {discoverWindowsLan, publicDiscoveryView, findAndReservePort, reservePersistedPort, LanNetworkError, freshTrialEnabled} = require('../../public-lan-network');
const {createLanConfigStore, LanConfigError, matchesTrustedBinding} = require('../../public-lan-config');

function exact(args, names) {
  if (args.length !== names.length * 2) throw new LanConfigError('CLI_ARGUMENT_INVALID', 'LAN CLI 参数非法。');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!names.includes(name) || Object.hasOwn(values, name) || !args[index + 1]) throw new LanConfigError('CLI_ARGUMENT_INVALID', 'LAN CLI 参数非法。');
    values[name] = args[index + 1];
  }
  return values;
}

async function main(argv, dependencies = {}) {
  const discover = dependencies.discoverWindowsLan || discoverWindowsLan;
  const view = dependencies.publicDiscoveryView || publicDiscoveryView;
  const reserve = dependencies.findAndReservePort || findAndReservePort;
  const reserveSaved = dependencies.reservePersistedPort || reservePersistedPort;
  const storeFactory = dependencies.createLanConfigStore || createLanConfigStore;
  try {
    const command = argv[0];
    if (command === 'discover') {
      if (argv.length !== 1) throw new LanNetworkError('CLI_ARGUMENT_INVALID', 'LAN CLI 参数非法。');
      const result = discover();
      return {exitCode: result.status === 'SELECTED' ? 0 : ['NEEDS_NETWORK_SELECTION', 'MULTIPLE_LAN_ADAPTERS'].includes(result.status) ? 10 : 12, value: view(result)};
    }
    if (command !== 'configure' && command !== 'select' && command !== 'reselect' && command !== 'enable' && command !== 'disable') throw new LanConfigError('CLI_ARGUMENT_INVALID', 'LAN CLI 命令非法。');
    const fresh = freshTrialEnabled();
    const args = exact(argv.slice(1), ['--instance-dir', '--interface-name', ...(fresh && command !== 'disable' ? ['--trusted-network'] : [])]);
    if (fresh && command !== 'disable' && args['--trusted-network'] !== 'true') throw new LanConfigError('TRUST_REQUIRED', '必须明确确认可信网络。');
    const store = storeFactory({instanceDirectory: args['--instance-dir']});
    const current = store.load();
    if (command === 'disable') {
      if (!current || current.interfaceName !== args['--interface-name']) throw new LanConfigError('LAN_CONFIG_INVALID', '保存的接口不匹配。');
      const config = store.save({...current, enabled: false});
      return {exitCode: 0, value: {schema: 2, status: 'SAVED', config, selected: null}};
    }
    const discovery = discover({interfaceName: args['--interface-name']});
    if (discovery.status !== 'SELECTED' || !discovery.selected) {
      return {exitCode: discovery.status === 'NETWORK_CHANGED' ? 11 : 12, value: view(discovery)};
    }
    if (command === 'configure' && current !== null) throw new LanConfigError('LAN_CONFIG_EXISTS', 'LAN 配置已存在，禁止隐式重新选端口。');
    if (command === 'reselect' && (!current || current.interfaceName !== discovery.selected.interfaceName)) throw new LanConfigError('LAN_CONFIG_INVALID', '保存的接口不匹配。');
    if (command !== 'configure' && !current) throw new LanConfigError('LAN_CONFIG_INVALID', 'LAN 配置不存在。');
    if ((command === 'enable' || command === 'disable') && current.interfaceName !== discovery.selected.interfaceName) throw new LanConfigError('LAN_CONFIG_INVALID', '保存的接口不匹配。');
    if (command === 'enable') {
      if (!matchesTrustedBinding(current, discovery.selected)) throw new LanConfigError('NETWORK_CHANGED', '受信网络已改变。');
      const config = store.save({...current, enabled: true});
      return {exitCode: 0, value: {schema: 2, status: 'SAVED', config, selected: view(discovery).selected}};
    }
    if (fresh && command === 'reselect' && !matchesTrustedBinding(current, discovery.selected)) throw new LanConfigError('NETWORK_CHANGED', '受信网络已改变。');
    const reservation = command === 'select'
      ? await reserveSaved({port: current.port, addresses: ['127.0.0.1', discovery.selected.address]})
      : await reserve({addresses: ['127.0.0.1', discovery.selected.address]});
    const port = command === 'select' ? current.port : reservation.port;
    await reservation.release(); // The Server performs the authoritative bind; a later race maps to PORT OCCUPIED.
    const selected = discovery.selected;
    const binding = fresh ? {adapterId: selected.adapterId, address: selected.address, prefixLength: selected.prefixLength, subnet: selected.subnet} : null;
    const config = store.save({schema: 2, port, enabled: false, interfaceName: selected.interfaceName, ...(binding ? {binding} : {})});
    return {exitCode: 0, value: {schema: 2, status: 'SAVED', config, selected: view(discovery).selected}};
  } catch (error) {
    return {exitCode: 20, value: {schema: 2, status: typeof error?.code === 'string' ? error.code : 'LAN_START_FAILED'}};
  }
}

module.exports = {main};
if (require.main === module) main(process.argv.slice(2)).then(result => {
  process.stdout.write(JSON.stringify(result.value) + '\n'); process.exitCode = result.exitCode;
});
