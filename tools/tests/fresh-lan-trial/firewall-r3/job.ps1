if(-not ('FirewallR3Job' -as [type])){Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class FirewallR3Job {
 [StructLayout(LayoutKind.Sequential)] struct Limits { public long ProcessTime,JobTime; public uint Flags; public UIntPtr Min,Max; public uint ActiveLimit; public UIntPtr Affinity; public uint Priority,Scheduling; }
 [StructLayout(LayoutKind.Sequential)] struct IO { public ulong ReadOps,WriteOps,OtherOps,ReadBytes,WriteBytes,OtherBytes; }
 [StructLayout(LayoutKind.Sequential)] struct Extended { public Limits Basic; public IO IO; public UIntPtr ProcessMemory,JobMemory,PeakProcess,PeakJob; }
 [StructLayout(LayoutKind.Sequential)] struct Accounting { public long User,Kernel,PeriodUser,PeriodKernel;public uint Faults,Total,Active,Terminated; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr sa,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int type,ref Extended info,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job,int type,out Accounting info,uint size,IntPtr length);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateJobObject(IntPtr job,uint code);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
 public static IntPtr Create(){var j=CreateJobObject(IntPtr.Zero,null);if(j==IntPtr.Zero)throw new Win32Exception();var e=new Extended();e.Basic.Flags=0x2000;if(!SetInformationJobObject(j,9,ref e,(uint)Marshal.SizeOf(e))){CloseHandle(j);throw new Win32Exception();}return j;}
 public static void Assign(IntPtr j,IntPtr p){if(!AssignProcessToJobObject(j,p))throw new Win32Exception();}
 public static uint Active(IntPtr j){Accounting a;if(!QueryInformationJobObject(j,1,out a,(uint)Marshal.SizeOf(typeof(Accounting)),IntPtr.Zero))throw new Win32Exception();return a.Active;}
 public static void Stop(IntPtr j){if(!TerminateJobObject(j,124))throw new Win32Exception();}
}
'@}
function Wait-FirewallR3JobEmpty($Handle){for($taskR3Wait=0;$taskR3Wait -lt 100;$taskR3Wait++){if([FirewallR3Job]::Active($Handle) -eq 0){return $true};Start-Sleep -Milliseconds 100};return $false}
