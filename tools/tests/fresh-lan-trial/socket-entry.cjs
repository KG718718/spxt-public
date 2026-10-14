'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {run}=require('./isolated-socket.cjs');
async function main(){assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.GITHUB_REPOSITORY,'KG718718/spxt-public');const [installRoot,sourceCommit,output]=process.argv.slice(2);assert.equal(process.argv.slice(2).length,3);assert.equal(sourceCommit,process.env.KSESSION_FRESH_TESTED_SOURCE);assert.equal(fs.existsSync(output),false);fs.writeFileSync(output,JSON.stringify(await run({installRoot,sourceCommit}))+'\n',{flag:'wx'});}
main().catch(()=>{process.stderr.write('FRESH_TRIAL_ISOLATED_SOCKET_FAILED\n');process.exitCode=1;});
