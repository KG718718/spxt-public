# Identity stays in memory. Only a receipt created by the outer isolation owner
# can authorize resolving a SUBST work root; resolving an arbitrary alias is insufficient.
if(-not ('FreshWorkDirectoryNative' -as [type])){
 Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class FreshWorkDirectoryNative {
 [StructLayout(LayoutKind.Sequential)] public struct Info { public uint Attr; public System.Runtime.InteropServices.ComTypes.FILETIME Created,Accessed,Written; public uint Volume,SizeHigh,SizeLow,Links,IndexHigh,IndexLow; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern SafeFileHandle CreateFile(string name,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info info);
 public static SafeFileHandle Open(string path) { var h=CreateFile(path,0x80,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero); if(h.IsInvalid){h.Dispose();throw new InvalidOperationException("WORK_HANDLE_UNKNOWN");}return h; }
 public static string Identity(SafeFileHandle h) { Info i;if(h.IsClosed||!GetFileInformationByHandle(h,out i)||(i.Attr&0x400)!=0||(i.Attr&0x10)==0)throw new InvalidOperationException("WORK_IDENTITY_UNKNOWN");return i.Volume.ToString("X8")+i.IndexHigh.ToString("X8")+i.IndexLow.ToString("X8"); }
}
'@
}
function Get-FreshNativeDevice([string]$Drive){
 $taskDevice=[Text.StringBuilder]::new(32768)
 if([KSessionFirewallPathNative]::QueryDosDevice($Drive,$taskDevice,$taskDevice.Capacity) -eq 0){throw 'WORK_DEVICE_UNKNOWN'}
 return $taskDevice.ToString()
}
function New-FreshPhysicalWorkBinding([string]$Work,$Receipt,[string]$RunId,[string]$ExpectedTarget){
 if((($Receipt.PSObject.Properties.Name|Sort-Object) -join ',') -cne 'created,drive,runId,schema,target' -or $Receipt.schema -ne 1 -or $Receipt.runId -cne $RunId -or $Receipt.created -isnot [bool] -or $Receipt.drive -cnotmatch '^[A-Z]:$'){throw 'WORK_RECEIPT_INVALID'}
 $taskWork=[IO.Path]::GetFullPath($Work)
 if([IO.Path]::GetPathRoot($taskWork).TrimEnd('\') -cne $Receipt.drive -or $taskWork -ine $Work -or $taskWork.Length -le 3){throw 'WORK_ROOT_INVALID'}
 $taskDevice=Get-FreshNativeDevice $Receipt.drive
 if($Receipt.created){
  if($Receipt.target -isnot [string] -or [IO.Path]::GetFullPath($Receipt.target) -ine [IO.Path]::GetFullPath($ExpectedTarget) -or (Get-KSessionFirewallTestPathClass $ExpectedTarget) -ne 'CANONICAL' -or $taskDevice -ine ('\??\'+$ExpectedTarget.TrimEnd('\')) -or (Get-KSessionFirewallTestPathClass $taskWork) -ne 'SUBST'){throw 'WORK_MAPPING_UNOWNED'}
  $taskPhysical=Join-Path $ExpectedTarget $taskWork.Substring(3)
 }else{
  if($null -ne $Receipt.target -or $taskDevice -cnotmatch '^\\Device\\HarddiskVolume[0-9]+$' -or (Get-KSessionFirewallTestPathClass $taskWork) -ne 'CANONICAL'){throw 'WORK_PHYSICAL_UNPROVEN'}
  $taskPhysical=$taskWork
 }
 if((Get-KSessionFirewallTestPathClass $taskPhysical) -ne 'CANONICAL' -or (Resolve-KSessionFirewallPhysicalPath $taskWork) -ine $taskPhysical){throw 'WORK_CANONICAL_UNPROVEN'}
 $taskPhysicalDrive=[IO.Path]::GetPathRoot($taskPhysical).TrimEnd('\');$taskPhysicalDevice=Get-FreshNativeDevice $taskPhysicalDrive
 if($taskPhysicalDevice -cnotmatch '^\\Device\\HarddiskVolume[0-9]+$'){throw 'WORK_PHYSICAL_DEVICE_UNPROVEN'}
 $taskHandle=[FreshWorkDirectoryNative]::Open($taskPhysical)
 try{$taskIdentity=[FreshWorkDirectoryNative]::Identity($taskHandle)}catch{$taskHandle.Dispose();throw 'WORK_IDENTITY_UNKNOWN'}
 return [pscustomobject]@{work=$taskWork;physical=$taskPhysical;drive=$Receipt.drive;device=$taskDevice;physicalDrive=$taskPhysicalDrive;physicalDevice=$taskPhysicalDevice;handle=$taskHandle;identity=$taskIdentity}
}
function Test-FreshPinnedWorkDirectory($Binding){
 try{
  if($null -eq $Binding -or (Get-FreshNativeDevice $Binding.physicalDrive) -cne $Binding.physicalDevice -or (Get-KSessionFirewallTestPathClass $Binding.physical) -ne 'CANONICAL' -or [FreshWorkDirectoryNative]::Identity($Binding.handle) -cne $Binding.identity){return $false}
  $taskNow=[FreshWorkDirectoryNative]::Open($Binding.physical);try{return ([FreshWorkDirectoryNative]::Identity($taskNow) -ceq $Binding.identity)}finally{$taskNow.Dispose()}
 }catch{return $false}
}
function Test-FreshPhysicalWorkBinding($Binding){try{return ((Test-FreshPinnedWorkDirectory $Binding) -and (Get-FreshNativeDevice $Binding.drive) -ceq $Binding.device -and (Resolve-KSessionFirewallPhysicalPath $Binding.work) -ieq $Binding.physical)}catch{return $false}}
function Close-FreshPhysicalWorkBinding($Binding){if($null -ne $Binding){$Binding.handle.Dispose()}}
function Get-FreshPhysicalNode($Binding,[string]$Node){
 if(!(Test-FreshPhysicalWorkBinding $Binding)){throw 'WORK_NODE_MAPPING_UNKNOWN'}
 $taskRelative=[IO.Path]::GetRelativePath($Binding.work,$Node)
 if($taskRelative.StartsWith('..') -or [IO.Path]::IsPathRooted($taskRelative)){throw 'WORK_NODE_OUTSIDE'}
 return (Join-Path $Binding.physical $taskRelative)
}
function Read-FreshPhysicalWorkBinding([string]$Work){
 if($Work -ine 'E:\fresh-trial' -or !$env:FRESH_CONTROL_ROOT -or !$env:GITHUB_RUN_ID){throw 'WORK_CONTROL_REQUIRED'}
 $taskReceipt=Get-Content -LiteralPath (Join-Path $env:FRESH_CONTROL_ROOT 'isolation-private.json') -Raw|ConvertFrom-Json
 if($taskReceipt.drive -cne 'E:'){throw 'WORK_CONTROL_DRIVE_INVALID'}
 return (New-FreshPhysicalWorkBinding $Work $taskReceipt $env:GITHUB_RUN_ID (Join-Path $env:RUNNER_TEMP ('fresh-drive-'+$env:GITHUB_RUN_ID)))
}
function Get-FreshCompilerObservation($Binding){
 if(!(Test-FreshPhysicalWorkBinding $Binding)){return (New-FreshObservation $false $false)}
 return (Get-FreshPathObservation (Join-Path $Binding.physical 'inno/compiler'))
}
