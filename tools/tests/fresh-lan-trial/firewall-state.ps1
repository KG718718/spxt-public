# Read-only canonical snapshots. Values remain in memory; callers persist only comparison booleans.
function Convert-FastFirewallStateValue($Value){
  if($null -eq $Value){return 'NULL'}
  if($Value -is [array]){return (@($Value|ForEach-Object{Convert-FastFirewallStateValue $_}|Sort-Object)|ConvertTo-Json -Compress)}
  if($Value -is [string] -or $Value -is [bool] -or $Value -is [byte] -or $Value -is [uint16] -or $Value -is [uint32] -or $Value -is [uint64] -or $Value -is [int16] -or $Value -is [int32] -or $Value -is [int64]){
    return ([ordered]@{type=$Value.GetType().FullName;value=$Value}|ConvertTo-Json -Compress)
  }
  throw 'FIREWALL_STATE_TYPE_UNKNOWN'
}
function Read-FastFirewallState {
  $taskState=[ordered]@{}
  foreach($taskStore in @('PersistentStore','ActiveStore')){
    $taskProfiles=@(Get-NetFirewallProfile -PolicyStore $taskStore -ErrorAction Stop|Sort-Object Name)
    if($taskProfiles.Count -ne 3 -or (@($taskProfiles|ForEach-Object{[string]$_.Name}) -join ',') -cne 'Domain,Private,Public'){throw 'FIREWALL_STATE_PROFILE_SET_UNKNOWN'}
    $taskRows=@()
    foreach($taskProfile in $taskProfiles){
      $taskProperties=@($taskProfile.CimInstanceProperties|Sort-Object Name)
      if($taskProperties.Count -lt 1 -or $taskProperties.Count -gt 128){throw 'FIREWALL_STATE_PROPERTIES_UNKNOWN'}
      $taskMap=[ordered]@{__profileName=[string]$taskProfile.Name}
      foreach($taskProperty in $taskProperties){
        if([string]$taskProperty.Name -notmatch '^[A-Za-z][A-Za-z0-9_]*$' -or $taskMap.Contains([string]$taskProperty.Name)){throw 'FIREWALL_STATE_PROPERTY_UNKNOWN'}
        $taskMap[[string]$taskProperty.Name]=Convert-FastFirewallStateValue $taskProperty.Value
      }
      $taskRows+=,$taskMap
    }
    $taskState[$taskStore]=$taskRows
  }
  $taskConnections=@(Get-NetConnectionProfile -ErrorAction Stop|Sort-Object InterfaceIndex,Name)
  if($taskConnections.Count -lt 1){throw 'NETWORK_PROFILE_STATE_UNKNOWN'}
  $taskState.connections=@($taskConnections|ForEach-Object{
    if($null -eq $_.InterfaceIndex -or [string]$_.NetworkCategory -notin @('Public','Private','DomainAuthenticated')){throw 'NETWORK_PROFILE_STATE_UNKNOWN'}
    [ordered]@{index=[int]$_.InterfaceIndex;category=[string]$_.NetworkCategory;name=[string]$_.Name}
  })
  return ($taskState|ConvertTo-Json -Depth 8 -Compress)
}
