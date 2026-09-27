param(
  [Parameter(Mandatory=$true)][string]$Helper,
  [Parameter(Mandatory=$true)][string]$Instance,
  [Parameter(Mandatory=$true)][string]$Program,
  [Parameter(Mandatory=$true)][string]$Output
)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){
  throw 'Hosted firewall context required'
}
$taskOutput=[IO.Path]::GetFullPath($Output)
if((Test-Path -LiteralPath $taskOutput) -or !(Test-Path -LiteralPath $Helper -PathType Leaf) -or
   !(Test-Path -LiteralPath $Program -PathType Leaf) -or !(Test-Path -LiteralPath $Instance -PathType Container)){
  throw 'Fresh output and installed candidate required'
}
Import-Module NetAdapter,NetConnection,NetTCPIP,NetSecurity -ErrorAction Stop
$taskRows=@()
foreach($taskAdapter in @(Get-NetAdapter -IncludeHidden -ErrorAction Stop|Where-Object Status -eq 'Up')){
  foreach($taskIp in @(Get-NetIPAddress -InterfaceIndex $taskAdapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue|Where-Object AddressState -eq 'Preferred')){
    if($taskIp.IPAddress -match '^10\.' -or $taskIp.IPAddress -match '^192\.168\.' -or $taskIp.IPAddress -match '^172\.(1[6-9]|2[0-9]|3[01])\.'){
      $taskRows+=@([pscustomobject]@{Adapter=$taskAdapter;Ip=$taskIp})
    }
  }
}
if($taskRows.Count -ne 1){throw 'Hosted firewall gate requires exactly one runner-owned private IPv4; fail closed'}
$taskAdapter=$taskRows[0].Adapter;$taskIp=$taskRows[0].Ip
$taskGuid=([string]$taskAdapter.InterfaceGuid).Trim('{}').ToLowerInvariant()
if($taskGuid -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'){throw 'Adapter GUID unavailable'}
$taskPrefix=[int]$taskIp.PrefixLength
$taskOctets=@($taskIp.IPAddress.Split('.')|ForEach-Object{[uint32]$_})
$taskAddress=[uint32](($taskOctets[0]-shl 24)-bor($taskOctets[1]-shl 16)-bor($taskOctets[2]-shl 8)-bor$taskOctets[3])
$taskMask=if($taskPrefix -eq 0){[uint32]0}else{[uint32]([uint32]::MaxValue -shl (32-$taskPrefix))}
$taskNetwork=[uint32]($taskAddress-band$taskMask)
$taskSubnet='{0}.{1}.{2}.{3}/{4}' -f (($taskNetwork-shr 24)-band 255),(($taskNetwork-shr 16)-band 255),(($taskNetwork-shr 8)-band 255),($taskNetwork-band 255),$taskPrefix
$taskMinimum=if($taskIp.IPAddress -match '^10\.'){8}elseif($taskIp.IPAddress -match '^172\.'){12}else{16}
if($taskPrefix -lt $taskMinimum -or $taskPrefix -gt 30){throw 'Runner private subnet is outside closed policy bounds'}
$taskConfig=Join-Path $Instance 'lan-deployment.json'
$taskOriginal=[IO.File]::ReadAllBytes($taskConfig)
$taskProductRule='KSESSION-LAN-Host-v1'
if(@(Get-NetFirewallRule -Name $taskProductRule -PolicyStore PersistentStore -ErrorAction SilentlyContinue).Count -ne 0){throw 'Unexpected pre-existing product rule'}
$taskHelperRejected=$false
try{
  [IO.File]::WriteAllText($taskConfig,(@{schema=1;port=8083;adapterPreference=$taskGuid}|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)))
  $taskOutputBytes=& $Helper enable --port 8083 --adapter-guid $taskGuid
  if($LASTEXITCODE -eq 23 -and (($taskOutputBytes -join '')|ConvertFrom-Json).code -eq 'NETWORK_UNSAFE'){$taskHelperRejected=$true}
}finally{
  [IO.File]::WriteAllBytes($taskConfig,$taskOriginal)
}
if(!$taskHelperRejected -or @(Get-NetFirewallRule -Name $taskProductRule -PolicyStore PersistentStore -ErrorAction SilentlyContinue).Count -ne 0){
  throw 'Production helper did not reject hosted virtual network before rule creation'
}

$taskRule='KSESSION-HOSTED-API-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
$taskCreated=$null
try{
  $taskCreated=New-NetFirewallRule -Name $taskRule -DisplayName $taskRule -Group 'KSESSION-HOSTED-TEST' `
    -Description 'Disposable hosted NetSecurity API evidence' -Direction Inbound -Action Allow -Enabled False `
    -Profile Private -EdgeTraversalPolicy Block -Protocol TCP -LocalPort 8083 -RemoteAddress $taskSubnet `
    -Program $Program -InterfaceAlias $taskAdapter.Name -PolicyStore PersistentStore -ErrorAction Stop
  $taskRuleObject=@(Get-NetFirewallRule -Name $taskRule -PolicyStore PersistentStore -ErrorAction Stop)
  if($taskRuleObject.Count -ne 1 -or [string]$taskRuleObject[0].Enabled -ne 'False' -or [string]$taskRuleObject[0].Profile -ne 'Private' -or
      [string]$taskRuleObject[0].Direction -ne 'Inbound' -or [string]$taskRuleObject[0].Action -ne 'Allow' -or [string]$taskRuleObject[0].EdgeTraversalPolicy -ne 'Block'){
    throw 'Persistent rule identity mismatch'
  }
  $taskPort=@($taskRuleObject|Get-NetFirewallPortFilter -ErrorAction Stop)
  $taskApp=@($taskRuleObject|Get-NetFirewallApplicationFilter -ErrorAction Stop)
  $taskRemote=@($taskRuleObject|Get-NetFirewallAddressFilter -ErrorAction Stop)
  $taskInterface=@($taskRuleObject|Get-NetFirewallInterfaceFilter -ErrorAction Stop)
  if($taskPort.Count -ne 1 -or [string]$taskPort[0].Protocol -ne 'TCP' -or [string]$taskPort[0].LocalPort -ne '8083' -or
      $taskApp.Count -ne 1 -or [IO.Path]::GetFullPath([string]$taskApp[0].Program) -ne [IO.Path]::GetFullPath($Program) -or
      $taskRemote.Count -ne 1 -or [string]$taskRemote[0].RemoteAddress -ne $taskSubnet -or
      $taskInterface.Count -ne 1 -or [string]$taskInterface[0].InterfaceAlias -ne [string]$taskAdapter.Name){
    throw 'NetSecurity filter mismatch'
  }
  $taskRuleObject|Set-NetFirewallRule -Enabled True -ErrorAction Stop|Out-Null
  $taskActive=@(Get-NetFirewallRule -Name $taskRule -PolicyStore ActiveStore -ErrorAction Stop)
  if($taskActive.Count -ne 1 -or [string]$taskActive[0].Enabled -ne 'True'){throw 'ActiveStore did not contain enabled exact test rule'}
  $taskRuleObject|Set-NetFirewallRule -Enabled False -ErrorAction Stop|Out-Null
}finally{
  $taskCleanup=@(Get-NetFirewallRule -Name $taskRule -PolicyStore PersistentStore -ErrorAction SilentlyContinue)
  foreach($taskOwned in $taskCleanup){
    if([string]$taskOwned.Group -eq 'KSESSION-HOSTED-TEST' -and [string]$taskOwned.Description -eq 'Disposable hosted NetSecurity API evidence'){
      $taskOwned|Set-NetFirewallRule -Enabled False -ErrorAction SilentlyContinue|Out-Null
      $taskOwned|Remove-NetFirewallRule -ErrorAction SilentlyContinue
    }
  }
}
if(@(Get-NetFirewallRule -Name $taskRule -PolicyStore PersistentStore -ErrorAction SilentlyContinue).Count -ne 0 -or
   @(Get-NetFirewallRule -Name $taskRule -PolicyStore ActiveStore -ErrorAction SilentlyContinue).Count -ne 0){throw 'Hosted test rule cleanup failed'}
$taskReport=[ordered]@{schema=1;status='PASS';productionHelperHostedVirtualRejected=$true;productRuleCreated=$false;
  netSecurityPersistentExact=$true;netSecurityActiveStoreExact=$true;testRuleDisabledBeforeMutation=$true;testRuleCleanup=$true;
  profile='Private';direction='Inbound';protocol='TCP';port=8083;remoteScope='EXACT_RUNNER_PRIVATE_SUBNET';program='INSTALLED_RUNTIME_NODE';
  interface='EXACT_RUNNER_INTERFACE';edgeTraversal='Block';publicProfile=$false;remoteAny=$false;programAny=$false;
  globalFirewallProfileChanged=$false;realPhysicalLanClaim=$false}
New-Item -ItemType Directory -Path (Split-Path $taskOutput) -Force|Out-Null
[IO.File]::WriteAllText($taskOutput,($taskReport|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
