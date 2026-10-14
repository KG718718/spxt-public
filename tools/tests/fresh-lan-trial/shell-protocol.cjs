'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process');
const PREFIX="$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);";
function json(script){const r=cp.spawnSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(PREFIX+script,'utf16le').toString('base64')],{windowsHide:true,encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']});assert.equal(r.status,0);assert.equal((r.stderr||'').trim(),'');return JSON.parse(r.stdout);}
module.exports={PREFIX,json};
