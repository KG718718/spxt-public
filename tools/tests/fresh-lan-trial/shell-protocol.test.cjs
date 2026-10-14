'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{json}=require('./shell-protocol.cjs');
test('actual UTF16 command + strict UTF8 JSON protocol preserves Chinese paths without CIM/network calls',()=>{const r=json("@{node='C:\\测试 Installed 中文\\runtime\\node.exe';parent=1}|ConvertTo-Json -Compress");assert.deepEqual(r,{node:'C:\\测试 Installed 中文\\runtime\\node.exe',parent:1});assert.throws(()=>json("[Console]::Error.WriteLine('synthetic stderr');@{safe=$true}|ConvertTo-Json -Compress"));});
