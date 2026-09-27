Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot '../../windows-firewall/test-environment.ps1')

function Save-KSessionProcessEnvironment([string[]]$Names) {
  $values=[ordered]@{}
  foreach($name in $Names){$values[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
  return [pscustomobject]@{Names=@($Names);Values=$values}
}

function Restore-KSessionProcessEnvironment($State) {
  foreach($name in $State.Names){
    $value=$State.Values[$name]
    if($null-eq$value){Remove-Item ("Env:"+$name) -ErrorAction SilentlyContinue}else{[Environment]::SetEnvironmentVariable($name,[string]$value,'Process')}
  }
}

function Test-KSessionProcessEnvironmentRestored($State) {
  foreach($name in $State.Names){
    if([Environment]::GetEnvironmentVariable($name,'Process') -cne $State.Values[$name]){return $false}
  }
  return $true
}

function Assert-KSessionProcessEnvironmentRestored($State) {
  if(!(Test-KSessionProcessEnvironmentRestored $State)){throw 'TEST_ENVIRONMENT_RESTORE_FAILED'}
}

function Invoke-KSessionWithRestoredEnvironment([string[]]$Names,[scriptblock]$Body) {
  $state=Save-KSessionProcessEnvironment $Names
  try{& $Body}finally{Restore-KSessionProcessEnvironment $state}
}

function Enter-KSessionLanNodeTestEnvironment([string]$OwnedParent,[string]$Leaf) {
  if($Leaf-notmatch'^node-[a-z0-9-]+-env$'){throw 'NODE_TEST_ROOT_LEAF_INVALID'}
  $parent=Resolve-KSessionFirewallPhysicalPath $OwnedParent
  if((Get-KSessionFirewallTestPathClass $parent)-ne'CANONICAL'){throw 'NODE_TEST_ROOT_PARENT_UNSAFE'}
  $root=Join-Path $parent $Leaf
  if(Test-Path -LiteralPath $root){throw 'NODE_TEST_ROOT_EXISTS'}
  New-Item -ItemType Directory -Path $root|Out-Null
  [IO.File]::WriteAllText((Join-Path $root '.ksession-lan-node-test-root'),"KSESSION_LAN_NODE_TEST_ROOT_V1`n",[Text.UTF8Encoding]::new($false))
  if((Get-KSessionFirewallTestPathClass $root)-ne'CANONICAL'){throw 'NODE_TEST_ROOT_UNSAFE'}
  $snapshot=Save-KSessionProcessEnvironment @('TEMP','TMP')
  $inputClass=Get-KSessionFirewallTestPathClass $env:TEMP
  $env:TEMP=$root;$env:TMP=$root
  return [pscustomobject]@{Root=$root;Snapshot=$snapshot;InputTempClass=$inputClass;SelectedRootClass='CANONICAL'}
}

function Exit-KSessionLanNodeTestEnvironment($State) {Restore-KSessionProcessEnvironment $State.Snapshot}

function Enter-KSessionLanCandidateTestEnvironment([string]$OwnedParent,[string]$Leaf) {
  if($Leaf-notmatch'^candidate-[a-z0-9-]+-env$'){throw 'CANDIDATE_TEST_ROOT_LEAF_INVALID'}
  $parent=Resolve-KSessionFirewallPhysicalPath $OwnedParent
  if((Get-KSessionFirewallTestPathClass $parent)-ne'CANONICAL'){throw 'CANDIDATE_TEST_ROOT_PARENT_UNSAFE'}
  $root=Join-Path $parent $Leaf
  if(Test-Path -LiteralPath $root){throw 'CANDIDATE_TEST_ROOT_EXISTS'}
  New-Item -ItemType Directory -Path $root|Out-Null
  [IO.File]::WriteAllText((Join-Path $root '.ksession-lan-candidate-test-root'),"KSESSION_LAN_CANDIDATE_TEST_ROOT_V1`n",[Text.UTF8Encoding]::new($false))
  foreach($name in @('temp','go-temp','go-cache')){New-Item -ItemType Directory -Path (Join-Path $root $name)|Out-Null}
  if((Get-KSessionFirewallTestPathClass $root)-ne'CANONICAL'){throw 'CANDIDATE_TEST_ROOT_UNSAFE'}
  $snapshot=Save-KSessionProcessEnvironment @('TEMP','TMP','GOTMPDIR','GOCACHE')
  $state=[pscustomobject]@{Root=$root;Snapshot=$snapshot;InputTempClass=(Get-KSessionFirewallTestPathClass $env:TEMP);InputTmpClass=(Get-KSessionFirewallTestPathClass $env:TMP);InputGoTmpClass=(Get-KSessionFirewallTestPathClass $env:GOTMPDIR);InputGoCacheClass=(Get-KSessionFirewallTestPathClass $env:GOCACHE);SelectedRootClass='CANONICAL'}
  $env:TEMP=Join-Path $root 'temp';$env:TMP=$env:TEMP;$env:GOTMPDIR=Join-Path $root 'go-temp';$env:GOCACHE=Join-Path $root 'go-cache'
  return $state
}

function Exit-KSessionLanCandidateTestEnvironment($State) {Restore-KSessionProcessEnvironment $State.Snapshot}

function Read-KSessionNodeTestSummary([string]$RawFile) {
  $values=@{}
  foreach($line in Get-Content -LiteralPath $RawFile){
    if($line-match'^# (tests|pass|fail|skipped) ([0-9]+)$'){$values[$matches[1]]=[int]$matches[2]}
  }
  $valid=@('tests','pass','fail','skipped')|ForEach-Object {$values.ContainsKey($_)}
  return [pscustomobject]@{Valid=($valid-notcontains$false);Tests=if($values.ContainsKey('tests')){$values.tests}else{-1};Pass=if($values.ContainsKey('pass')){$values.pass}else{-1};Fail=if($values.ContainsKey('fail')){$values.fail}else{-1};Skipped=if($values.ContainsKey('skipped')){$values.skipped}else{-1}}
}
