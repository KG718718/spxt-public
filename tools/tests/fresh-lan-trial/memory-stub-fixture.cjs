'use strict';
const path=require('node:path');
const repo=path.resolve(__dirname,'../../..');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
// Native Node and its stdin parser remain real. Only authored .ps1 Go/tool fixtures are simulated.
function bridge(){return `
. ${quote(path.join(__dirname,'memory-process.ps1'))}
$script:FixtureRealMemoryProcess=(Get-Item Function:Invoke-KSessionMemoryProcess).ScriptBlock
function Invoke-KSessionMemoryProcess([string]$Executable,[string[]]$Arguments,[int]$TimeoutSeconds=900,[string]$InputText=''){
 if([IO.Path]::GetExtension($Executable) -ieq '.ps1'){
  if([IO.Path]::GetFileName($Executable) -ieq 'node.ps1'){
   $fixed=@((Join-Path ${quote(__dirname)} ([IO.Path]::GetFileName($Arguments[0]))))+@($Arguments|Select-Object -Skip 1)
   & $script:FixtureRealMemoryProcess ${quote(process.execPath)} $fixed $TimeoutSeconds $InputText
   return
  }
  $fixtureOutput=@(& $Executable @Arguments)
  return [pscustomobject]@{ExitCode=$global:LASTEXITCODE;Stdout=($fixtureOutput -join [char]10);Stderr='';TimedOut=$false;ForcedTermination=$false;RootExited=$true;DescendantsEmpty='UNKNOWN'}
 }
 & $script:FixtureRealMemoryProcess $Executable $Arguments $TimeoutSeconds $InputText
}
`;}
module.exports={bridge,repo};
