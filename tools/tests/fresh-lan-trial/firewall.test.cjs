'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
test('the same actual PS rule validator rejects active/cleanup filter mutation without delete',()=>{
 const source=fs.readFileSync(path.join(__dirname,'firewall-hosted.ps1'),'utf8'),start=source.indexOf('function Assert-Exact-Test-Rule('),end=source.indexOf("if(@(Find-ExactRule $taskRule 'PersistentStore')",start);assert.ok(start>=0&&end>start);const fn=source.slice(start,end);
 const script=`$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$taskRule='OWNED';$taskSubnet='192.168.40.0/24';$Program='C:\\Synthetic\\runtime\\node.exe';$taskAdapter=@{Name='Owned NIC'}
function Get-NetFirewallPortFilter {param([Parameter(ValueFromPipeline=$true)]$InputObject) process{[pscustomobject]@{Protocol='TCP';LocalPort=$global:port}}}
function Get-NetFirewallApplicationFilter {param([Parameter(ValueFromPipeline=$true)]$InputObject) process{[pscustomobject]@{Program=$global:programValue}}}
function Get-NetFirewallAddressFilter {param([Parameter(ValueFromPipeline=$true)]$InputObject) process{[pscustomobject]@{RemoteAddress=$global:subnetValue}}}
function Get-NetFirewallInterfaceFilter {param([Parameter(ValueFromPipeline=$true)]$InputObject) process{[pscustomobject]@{InterfaceAlias=$global:interfaceValue}}}
${fn}
$r=[pscustomobject]@{Name='OWNED';Group='KSESSION-HOSTED-TEST';Description='Disposable hosted NetSecurity API evidence';Profile='Private';Direction='Inbound';Action='Allow';EdgeTraversalPolicy='Block'}
$result=@();foreach($scenario in @('valid','program','port','subnet','interface')){
 $global:port='8083';$global:programValue=$Program;$global:subnetValue=$taskSubnet;$global:interfaceValue='Owned NIC'
 switch($scenario){'program'{$global:programValue='C:\\Unknown\\node.exe'}'port'{$global:port='8084'}'subnet'{$global:subnetValue='Any'}'interface'{$global:interfaceValue='Unknown NIC'}}
 $validated=$false;$deleted=$false;try{Assert-Exact-Test-Rule $r;$validated=$true;$deleted=$true}catch{}
 $result+=@{scenario=$scenario;validated=$validated;wouldDelete=$deleted}
};$result|ConvertTo-Json -Compress`;
 const exe=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');const raw=cp.execFileSync(exe,['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000});const rows=JSON.parse(raw);assert.equal(rows[0].validated,true);for(const row of rows.slice(1)){assert.equal(row.validated,false);assert.equal(row.wouldDelete,false);}assert.equal((source.match(/Assert-Exact-Test-Rule \$task/g)||[]).length,3);
});
