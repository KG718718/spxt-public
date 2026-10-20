param([string]$RowsJson,[Parameter(Mandatory=$true)][string]$LauncherSha256,[switch]$Capture,[string]$ExpectedLauncher)
$ErrorActionPreference='Stop'
trap { [Console]::Error.WriteLine('SHORTCUT_IDENTITY_UNPROVEN'); exit 1 }
if($LauncherSha256 -cnotmatch '^[a-f0-9]{64}$'){exit 1}
# Test-only read-only Win32 oracle. No product process, write, registry or cleanup API.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using Microsoft.Win32.SafeHandles;
public static class FreshShortcutTarget {
 [StructLayout(LayoutKind.Sequential)] struct ID {public uint V0,V1,F0,F1,F2,F3;}
 [StructLayout(LayoutKind.Sequential)] struct ATTR {public uint Attributes,Tag;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CreateFile(string p,uint a,uint s,IntPtr sa,uint c,uint f,IntPtr t);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll",EntryPoint="GetFileInformationByHandleEx")] static extern bool FileId(IntPtr h,int c,out ID id,uint n);
 [DllImport("kernel32.dll",EntryPoint="GetFileInformationByHandleEx")] static extern bool Attributes(IntPtr h,int c,out ATTR a,uint n);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern uint GetLongPathName(string p,StringBuilder b,uint n);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern uint GetFinalPathNameByHandle(IntPtr h,StringBuilder b,uint n,uint f);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern uint QueryDosDevice(string p,StringBuilder b,int n);
 static bool Equal(string a,string b){return String.Equals(a,b,StringComparison.OrdinalIgnoreCase);}
 static bool Same(ID a,ID b){return a.V0==b.V0&&a.V1==b.V1&&a.F0==b.F0&&a.F1==b.F1&&a.F2==b.F2&&a.F3==b.F3&&(a.V0!=0||a.V1!=0)&&(a.F0!=0||a.F1!=0||a.F2!=0||a.F3!=0);}
 static string Value(ID a){return a.V0.ToString("x8")+a.V1.ToString("x8")+a.F0.ToString("x8")+a.F1.ToString("x8")+a.F2.ToString("x8")+a.F3.ToString("x8");}
 static bool ReadId(IntPtr h,bool directory,out ID id){id=new ID();ATTR a;return Attributes(h,9,out a,8)&&(a.Attributes&0x400)==0&&directory==((a.Attributes&0x10)!=0)&&FileId(h,18,out id,24)&&Same(id,id);}
 static IntPtr Open(string p,uint access,uint share,bool directory,List<IntPtr> handles){var h=CreateFile(p,access,share,IntPtr.Zero,3,0x200000u|(directory?0x2000000u:0),IntPtr.Zero);if(h==new IntPtr(-1))throw new IOException();handles.Add(h);return h;}
 static string Device(string p){var b=new StringBuilder(32768);uint n=QueryDosDevice(p.Substring(0,2),b,b.Capacity);if(n==0||n>=32768)throw new IOException();return b.ToString();}
 static string PhysicalDevice(string p){string d=Device(p);if(!Regex.IsMatch(d,@"^\\Device\\HarddiskVolume[0-9]+$"))throw new IOException();return d;}
 static string Final(IntPtr h){var b=new StringBuilder(32768);uint n=GetFinalPathNameByHandle(h,b,32768,0);string p=b.ToString();if(n==0||n>=32768||!p.StartsWith(@"\\?\")||p.Length<7||p[5]!=':'||p[6]!='\\')throw new IOException();return p.Substring(4);}
 static string Canonical(string p){
  if(String.IsNullOrEmpty(p)||p.IndexOf('\0')>=0||p.Length<3||p[1]!=':'||p[2]!='\\'||!Char.IsLetter(p[0]))throw new IOException();
  foreach(string part in p.Substring(3).Split('\\'))if(part.Length==0||part=="."||part==".."||part.EndsWith(".")||part.EndsWith(" ")||part.IndexOfAny(new[]{':','*','?'})>=0)throw new IOException();
  var b=new StringBuilder(32768);uint n=GetLongPathName(p,b,32768);if(n==0||n>=32768)throw new IOException();string result=b.ToString();if(!Equal(Path.GetPathRoot(p),Path.GetPathRoot(result))||!Equal(Path.GetFullPath(result),result))throw new IOException();return result;
 }
 static ID PinParents(string p,List<IntPtr> handles){
  string d=Path.GetDirectoryName(p);ID first=new ID();int count=0;
  while(true){if(++count>64)throw new IOException();var h=Open(d,0x80,3,true,handles);ID id;if(!ReadId(h,true,out id))throw new IOException();if(count==1)first=id;string parent=Path.GetDirectoryName(d);if(String.IsNullOrEmpty(parent))break;d=parent;}
  return first;
 }
 static string Hash(IntPtr h){using(var safe=new SafeFileHandle(h,false))using(var stream=new FileStream(safe,FileAccess.Read))using(var sha=SHA256.Create()){return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}}
 public static string Capture(string expected,string trustedHash){
  var handles=new List<IntPtr>();string result="";
  try{
   string e=Canonical(expected);if(!Equal(Path.GetFileName(e),"K-SESSION.exe"))throw new IOException();string ed=Device(e);
   ID parent=PinParents(e,handles),file;var h=Open(e,0x80000000,1,false,handles);if(!ReadId(h,false,out file))throw new IOException();
   string physical=Final(h),pd=PhysicalDevice(physical);if(!Same(parent,PinParents(physical,handles))||Hash(h)!=trustedHash)throw new IOException();
   var raw=Open(expected,0x80000000,1,false,handles);ID again;if(!ReadId(raw,false,out again)||!Same(file,again)||Device(e)!=ed||PhysicalDevice(physical)!=pd)throw new IOException();
   result=Value(file)+":"+Value(parent);
  }catch{result="";}finally{foreach(var h in handles)if(!CloseHandle(h))result="";}
  return result;
 }
 public static bool Matches(string actual,string expected,string trustedHash,string originalFile,string originalParent){
  var handles=new List<IntPtr>();bool result=false;
  try{
   string e=Canonical(expected),a=Canonical(actual);if(!Equal(Path.GetFileName(e),"K-SESSION.exe")||!Equal(Path.GetFileName(a),"K-SESSION.exe"))return false;
   string ed=Device(e),ad=Device(a);ID ep=PinParents(e,handles),ap=PinParents(a,handles);if(!Same(ep,ap)||Value(ep)!=originalParent)return false;
   var eh=Open(e,0x80000000,1,false,handles);var ah=Open(a,0x80000000,1,false,handles);ID ei,ai;
   if(!ReadId(eh,false,out ei)||!ReadId(ah,false,out ai)||!Same(ei,ai)||Value(ei)!=originalFile)return false;
   string physical=Final(eh);if(!Equal(physical,Final(ah)))return false;string pd=PhysicalDevice(physical);if(!Same(PinParents(physical,handles),ep))return false;
   if(!Equal(Path.GetPathRoot(a),Path.GetPathRoot(e))&&!Equal(Path.GetPathRoot(a),Path.GetPathRoot(physical)))return false;
   if(Hash(eh)!=trustedHash)return false;
   var eraw=Open(expected,0x80000000,1,false,handles);var araw=Open(actual,0x80000000,1,false,handles);ID again;
   if(!ReadId(eraw,false,out again)||!Same(ei,again)||!ReadId(araw,false,out again)||!Same(ei,again))return false;
   result=Device(e)==ed&&Device(a)==ad&&PhysicalDevice(physical)==pd;
  }catch{result=false;}finally{foreach(var h in handles)if(!CloseHandle(h))result=false;}
  return result;
 }
}
'@
if($Capture){
 if($RowsJson -or !$ExpectedLauncher){exit 1}
 $taskIdentity=[FreshShortcutTarget]::Capture($ExpectedLauncher,$LauncherSha256)
 if($taskIdentity -cnotmatch '^[a-f0-9]{48}:[a-f0-9]{48}$'){exit 1}
 [Console]::Out.Write($taskIdentity);exit 0
}
if($ExpectedLauncher){exit 1}
$taskRows=@(ConvertFrom-Json $RowsJson)
if($taskRows.Count -ne 3){exit 1}
$taskShell=New-Object -ComObject WScript.Shell
foreach($taskRow in $taskRows){
 $taskLink=$taskShell.CreateShortcut($taskRow.path)
 if($taskRow.fileId -cnotmatch '^[a-f0-9]{48}$' -or $taskRow.parentId -cnotmatch '^[a-f0-9]{48}$'){exit 1}
 if(-not [FreshShortcutTarget]::Matches([string]$taskLink.TargetPath,[string]$taskRow.target,$LauncherSha256,[string]$taskRow.fileId,[string]$taskRow.parentId) -or $taskLink.Arguments -cne $taskRow.args -or $taskLink.WorkingDirectory -ine $taskRow.workdir){exit 1}
}
