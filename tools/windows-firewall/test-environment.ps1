Set-StrictMode -Version Latest

if(-not ('KSessionFirewallPathNative' -as [type])){
  Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class KSessionFirewallPathNative {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern uint GetLongPathName(string path, StringBuilder output, int size);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern uint GetShortPathName(string path, StringBuilder output, int size);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern uint QueryDosDevice(string device, StringBuilder output, int size);
}
'@
}

function Resolve-KSessionFirewallPhysicalPath([string]$Path) {
  $full=[IO.Path]::GetFullPath($Path);$drive=[IO.Path]::GetPathRoot($full).TrimEnd('\')
  $device=[Text.StringBuilder]::new(32768);$count=[KSessionFirewallPathNative]::QueryDosDevice($drive,$device,$device.Capacity)
  if($count -eq 0){throw 'TEST_ROOT_VOLUME_INVALID'}
  $target=$device.ToString()
  if($target.StartsWith('\??\') -and $target.Substring(4) -match '^[A-Za-z]:\\'){$full=Join-KSessionSubstTarget $target $full}
  $long=[Text.StringBuilder]::new(32768);$longCount=[KSessionFirewallPathNative]::GetLongPathName($full,$long,$long.Capacity)
  if($longCount -eq 0){throw 'TEST_ROOT_LONG_PATH_INVALID'}
  return $long.ToString()
}

function Join-KSessionSubstTarget([string]$Target,[string]$FullPath) {
  $base=$Target.Substring(4).TrimEnd('\')
  $relative=$FullPath.Substring(3).TrimStart('\')
  if($relative -eq ''){return $base}
  return [IO.Path]::Combine($base,$relative)
}

function Get-KSessionFirewallTestPathClass([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -notmatch '^[A-Za-z]:\\') { return 'NONLOCAL' }
  try { $full=[IO.Path]::GetFullPath($Path) } catch { return 'INVALID' }
  if ($full -cne $Path -and $full -ine $Path) { return 'NONCANONICAL' }
  if (!(Test-Path -LiteralPath $full -PathType Container)) { return 'MISSING' }
  try {
    $physical=Resolve-KSessionFirewallPhysicalPath $full
    if($physical -ine $full){
      $drive=[IO.Path]::GetPathRoot($full).TrimEnd('\');$device=[Text.StringBuilder]::new(32768)
      [void][KSessionFirewallPathNative]::QueryDosDevice($drive,$device,$device.Capacity)
      if($device.ToString().StartsWith('\??\')){return 'SUBST'}
      return 'ALIAS'
    }
    $resolved=(Resolve-Path -LiteralPath $full -ErrorAction Stop).ProviderPath
    if ($resolved -ine $full) { return 'ALIAS' }
    $current=[IO.Path]::GetPathRoot($full)
    foreach($part in $full.Substring($current.Length).Split([IO.Path]::DirectorySeparatorChar,[StringSplitOptions]::RemoveEmptyEntries)) {
      $current=Join-Path $current $part
      if(([IO.File]::GetAttributes($current) -band [IO.FileAttributes]::ReparsePoint) -ne 0){return 'REPARSE'}
    }
  } catch { return 'INVALID' }
  return 'CANONICAL'
}

function Enter-KSessionFirewallTestEnvironment([string]$OwnedParent,[string]$Leaf) {
  if($Leaf -notmatch '^firewall-[a-z0-9-]+-env$'){throw 'TEST_ROOT_LEAF_INVALID'}
  $parent=[IO.Path]::GetFullPath($OwnedParent)
  if((Get-KSessionFirewallTestPathClass $parent) -ne 'CANONICAL'){throw 'TEST_ROOT_PARENT_UNSAFE'}
  $root=Join-Path $parent $Leaf
  if(Test-Path -LiteralPath $root){throw 'TEST_ROOT_EXISTS'}
  New-Item -ItemType Directory -Path $root | Out-Null
  [IO.File]::WriteAllText((Join-Path $root '.ksession-firewall-test-root'),"KSESSION_FIREWALL_TEST_ROOT_V1`n",[Text.UTF8Encoding]::new($false))
  foreach($name in @('temp','go-temp','go-cache','fixtures')){New-Item -ItemType Directory -Path (Join-Path $root $name)|Out-Null}
  if((Get-KSessionFirewallTestPathClass $root) -ne 'CANONICAL'){throw 'TEST_ROOT_UNSAFE'}
  $state=[ordered]@{Root=$root;InputTempClass=(Get-KSessionFirewallTestPathClass $env:TEMP);TEMP=$env:TEMP;TMP=$env:TMP;GOTMPDIR=$env:GOTMPDIR;GOCACHE=$env:GOCACHE;Fixture=$env:KSESSION_FIREWALL_TEST_ROOT}
  $env:TEMP=Join-Path $root 'temp';$env:TMP=$env:TEMP;$env:GOTMPDIR=Join-Path $root 'go-temp';$env:GOCACHE=Join-Path $root 'go-cache';$env:KSESSION_FIREWALL_TEST_ROOT=Join-Path $root 'fixtures'
  return [pscustomobject]$state
}

function Exit-KSessionFirewallTestEnvironment($State) {
  foreach($name in @('TEMP','TMP','GOTMPDIR','GOCACHE')){
    $value=$State.$name;if($null -eq $value){Remove-Item "Env:$name" -ErrorAction SilentlyContinue}else{Set-Item "Env:$name" $value}
  }
  if($null -eq $State.Fixture){Remove-Item Env:KSESSION_FIREWALL_TEST_ROOT -ErrorAction SilentlyContinue}else{$env:KSESSION_FIREWALL_TEST_ROOT=$State.Fixture}
}

function Read-KSessionGoTestSummary([string]$RawFile) {
  $events=@();$invalid=$false
  foreach($line in Get-Content -LiteralPath $RawFile){try{$events+=($line|ConvertFrom-Json -ErrorAction Stop)}catch{$invalid=$true}}
  $failed=@($events|ForEach-Object {if($_.Action -eq 'fail' -and $null-ne$_.PSObject.Properties['Test']){[string]$_.Test}})
  $skipped=@($events|ForEach-Object {if($_.Action -eq 'skip' -and $null-ne$_.PSObject.Properties['Test']){[string]$_.Test}})
  $passed=@($events|ForEach-Object {if($_.Action -eq 'pass' -and $null-ne$_.PSObject.Properties['Test'] -and $_.Test -notmatch '/'){[string]$_.Test}}|Select-Object -Unique)
  $packagePass=@($events|Where-Object {$_.Action -eq 'pass' -and $null-eq$_.PSObject.Properties['Test']}).Count
  $packageFail=@($events|Where-Object {$_.Action -eq 'fail' -and $null-eq$_.PSObject.Properties['Test']}).Count
  return [pscustomobject]@{JSONInvalid=$invalid;Passed=$passed;FailedNames=$failed;SkippedNames=$skipped;PackagePass=$packagePass;PackageFail=$packageFail}
}
