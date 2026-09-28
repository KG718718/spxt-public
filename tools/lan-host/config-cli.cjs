#!/usr/bin/env node
'use strict';

const {LanConfigError, createLanConfigStore} = require('../../public-lan-config');

function exact(args, names) {
  if (args.length !== names.length * 2) throw new LanConfigError('CLI_ARGUMENT_INVALID', 'LAN CLI 参数非法。');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!names.includes(name) || Object.hasOwn(values, name) || typeof args[index + 1] !== 'string' || !args[index + 1]) {
      throw new LanConfigError('CLI_ARGUMENT_INVALID', 'LAN CLI 参数非法。');
    }
    values[name] = args[index + 1];
  }
  return values;
}

function output(value) { process.stdout.write(JSON.stringify(value) + '\n'); }

try {
  const command = process.argv[2];
  if (command === 'read') {
    const args = exact(process.argv.slice(3), ['--instance-dir']);
    const config = createLanConfigStore({instanceDirectory: args['--instance-dir']}).load();
    output({schema: 2, status: config ? 'CONFIGURED' : 'NOT_CONFIGURED', config});
    process.exitCode = config ? 0 : 10;
  } else if (command === 'save') {
    const args = exact(process.argv.slice(3), ['--instance-dir', '--port', '--interface-name', '--enabled']);
    if (!/^\d{4}$/.test(args['--port'])) throw new LanConfigError('LAN_CONFIG_INVALID', 'LAN 配置参数非法。');
    if (!['true', 'false'].includes(args['--enabled'])) throw new LanConfigError('LAN_CONFIG_INVALID', 'LAN 配置参数非法。');
    const store = createLanConfigStore({instanceDirectory: args['--instance-dir']});
    const config = store.save({schema: 2, port: Number(args['--port']), interfaceName: args['--interface-name'], enabled: args['--enabled'] === 'true'});
    output({schema: 2, status: 'SAVED', config});
  } else {
    throw new LanConfigError('CLI_ARGUMENT_INVALID', 'LAN CLI 命令非法。');
  }
} catch (error) {
  const code = error instanceof LanConfigError ? error.code : 'LAN_CONFIG_INTERNAL';
  output({schema: 2, status: code});
  process.exitCode = 20;
}
