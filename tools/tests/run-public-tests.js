'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const directory = __dirname;
const files = fs.readdirSync(directory).filter(name => /^public-.+\.test\.js$/.test(name)).sort();
if (!files.length) throw Error('No public tests found');
let failures = 0;
for (const file of files) {
    console.log('\nRUN ' + file);
    const result = spawnSync(process.execPath, [path.join(directory, file)], {
        cwd: path.resolve(directory, '../..'), stdio: 'inherit', windowsHide: true,
        timeout: 240000, env: { ...process.env, TZ: 'Asia/Shanghai' }
    });
    if (result.error || result.status !== 0) {
        console.error('FAIL ' + file + ': ' + (result.error?.message || result.status));
        failures++;
    }
}
console.log('Public test files: ' + files.length + '; failed: ' + failures);
if (failures) process.exitCode = 1;
