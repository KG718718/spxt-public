#!/usr/bin/env node
'use strict';

const {discoverWindowsLan, publicDiscoveryView, LanNetworkError} = require('../../public-lan-network');

function preference(argv) {
  if (!argv.length) return null;
  if (argv.length !== 2 || argv[0] !== '--adapter-preference') throw new LanNetworkError('CLI_ARGUMENT_INVALID', 'LAN CLI 参数非法。');
  return argv[1];
}

try {
  const command = process.argv[2];
  if (command !== 'discover') throw new LanNetworkError('CLI_ARGUMENT_INVALID', 'LAN CLI 命令非法。');
  const result = discoverWindowsLan({adapterPreference: preference(process.argv.slice(3))});
  process.stdout.write(JSON.stringify(publicDiscoveryView(result)) + '\n');
  process.exitCode = result.status === 'SELECTED' ? 0 : result.status === 'MULTIPLE_LAN_ADAPTERS' ? 10 : result.status === 'NETWORK_CHANGED' ? 11 : 12;
} catch (error) {
  const code = error instanceof LanNetworkError ? error.code : 'NETWORK_DISCOVERY_FAILED';
  process.stdout.write(JSON.stringify({schema: 1, status: code}) + '\n');
  process.exitCode = 20;
}
