// Test-only controller. No product, registry, Startup or global ACL operations.
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public sealed class FreshFailureDirectory : IDisposable {
 [StructLayout(LayoutKind.Sequential)] struct US {public ushort Length,MaximumLength;public IntPtr Buffer;}
 [StructLayout(LayoutKind.Sequential)] struct OA {public int Length;public IntPtr Root,ObjectName;public uint Attributes;public IntPtr Security,Quality;}
 [StructLayout(LayoutKind.Sequential)] struct IOS {public IntPtr Status,Information;}
 [StructLayout(LayoutKind.Sequential)] struct Info {public uint Attr;public System.Runtime.InteropServices.ComTypes.FILETIME Created,Access,Written;public uint Volume,High,Low,Links,IndexHigh,IndexLow;}
 [DllImport("ntdll.dll")] static extern int NtCreateFile(out SafeFileHandle h,uint access,ref OA oa,out IOS io,IntPtr allocation,uint attr,uint share,uint disposition,uint options,IntPtr ea,uint length);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFile(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info info);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetFileInformationByHandle(SafeFileHandle h,int cls,ref int value,uint bytes);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateDirectory(string path,IntPtr security);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetFileAttributes(string path);
 [DllImport("advapi32.dll",SetLastError=true)] static extern uint GetSecurityInfo(SafeFileHandle h,int type,uint info,out IntPtr owner,out IntPtr group,out IntPtr dacl,out IntPtr sacl,out IntPtr descriptor);
 [DllImport("advapi32.dll",SetLastError=true)] static extern uint SetSecurityInfo(SafeFileHandle h,int type,uint info,IntPtr owner,IntPtr group,IntPtr dacl,IntPtr sacl);
 [DllImport("advapi32.dll")] static extern uint GetSecurityDescriptorLength(IntPtr descriptor);
 [DllImport("advapi32.dll")] static extern bool GetSecurityDescriptorDacl(IntPtr descriptor,out bool present,out IntPtr dacl,out bool defaulted);
 [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
 SafeFileHandle parent,handle;
 byte[] original,expected;
 string identity;
 bool ready,retired;
 public string Path {get;private set;}
 public bool CreatedNew {get;private set;}
 public bool Ready {get{return ready;}}
 public string CreationFailure {get;private set;}
 static string Identity(SafeFileHandle h){Info i;if(h==null||h.IsClosed||h.IsInvalid||!GetFileInformationByHandle(h,out i)||(i.Attr&0x410)!=0x10||i.Links!=1)throw new InvalidOperationException("IDENTITY_UNKNOWN");return i.Volume.ToString("X8")+i.IndexHigh.ToString("X8")+i.IndexLow.ToString("X8");}
 static byte[] ReadSecurity(SafeFileHandle h){IntPtr o,g,d,s,p;uint rc=GetSecurityInfo(h,1,7,out o,out g,out d,out s,out p);if(rc!=0||p==IntPtr.Zero)throw new InvalidOperationException("ACL_OBSERVATION_FAILED");try{uint n=GetSecurityDescriptorLength(p);if(n<20||n>65536)throw new InvalidOperationException("ACL_BOUND");byte[] b=new byte[n];Marshal.Copy(p,b,0,(int)n);return b;}finally{LocalFree(p);}}
 static byte[] Dacl(byte[] sd){var raw=new RawSecurityDescriptor(sd,0);if(raw.DiscretionaryAcl==null)throw new InvalidOperationException("NULL_DACL_REJECTED");byte[] b=new byte[raw.DiscretionaryAcl.BinaryLength];raw.DiscretionaryAcl.GetBinaryForm(b,0);return b;}
 static bool Equal(byte[] a,byte[] b){var x=new RawSecurityDescriptor(a,0);var y=new RawSecurityDescriptor(b,0);return x.Owner!=null&&x.Group!=null&&x.Owner.Equals(y.Owner)&&x.Group.Equals(y.Group)&&Dacl(a).SequenceEqual(Dacl(b))&&((x.ControlFlags&ControlFlags.DiscretionaryAclProtected)==(y.ControlFlags&ControlFlags.DiscretionaryAclProtected));}
 static void WriteSecurity(SafeFileHandle h,byte[] sd){IntPtr p=Marshal.AllocHGlobal(sd.Length);try{Marshal.Copy(sd,0,p,sd.Length);bool present,def;IntPtr d;if(!GetSecurityDescriptorDacl(p,out present,out d,out def)||!present||d==IntPtr.Zero)throw new InvalidOperationException("ACL_INVALID");uint flags=4|((new RawSecurityDescriptor(sd,0).ControlFlags&ControlFlags.DiscretionaryAclProtected)!=0?0x80000000u:0x20000000u);if(SetSecurityInfo(h,1,flags,IntPtr.Zero,IntPtr.Zero,d,IntPtr.Zero)!=0)throw new InvalidOperationException("ACL_WRITE_FAILED");}finally{Marshal.FreeHGlobal(p);}}
 static bool Absent(string path){uint a=GetFileAttributes(path);if(a!=0xffffffff)return false;int e=Marshal.GetLastWin32Error();if(e!=2&&e!=3)throw new InvalidOperationException("ABSENCE_UNKNOWN");return true;}
 public static FreshFailureDirectory Create(string basePath,string name){return CreateCore(basePath,name,0);}
 public static FreshFailureDirectory ControlledInterruptedCreate(string basePath,string name,int checkpoint){if(checkpoint!=1&&checkpoint!=2)throw new InvalidOperationException("CHECKPOINT_REJECTED");return CreateCore(basePath,name,checkpoint);}
 static FreshFailureDirectory CreateCore(string basePath,string name,int checkpoint){
  if(!System.Text.RegularExpressions.Regex.IsMatch(name,"^ab-failure-[a-f0-9]{32}$")||!System.IO.Path.IsPathRooted(basePath))throw new InvalidOperationException("PATH_REJECTED");
  var r=new FreshFailureDirectory();r.Path=System.IO.Path.Combine(basePath,name);
  r.parent=CreateFile(basePath,0x80,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero);
  try{Identity(r.parent);if(!Absent(r.Path))throw new InvalidOperationException("PRESTATE_PRESENT");
   IntPtr text=Marshal.StringToHGlobalUni(name),usPtr=IntPtr.Zero;
   try{var us=new US{Length=(ushort)(name.Length*2),MaximumLength=(ushort)(name.Length*2+2),Buffer=text};usPtr=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(US)));Marshal.StructureToPtr(us,usPtr,false);var oa=new OA{Length=Marshal.SizeOf(typeof(OA)),Root=r.parent.DangerousGetHandle(),ObjectName=usPtr,Attributes=0x40};IOS io;int status=NtCreateFile(out r.handle,0x001700a1,ref oa,out io,IntPtr.Zero,0x10,3,2,0x21,IntPtr.Zero,0);if(status!=0||io.Information.ToInt64()!=2)throw new InvalidOperationException("EXCLUSIVE_CREATE_FAILED");r.CreatedNew=true;r.identity=Identity(r.handle);
   }finally{if(usPtr!=IntPtr.Zero)Marshal.FreeHGlobal(usPtr);Marshal.FreeHGlobal(text);}
   r.original=ReadSecurity(r.handle);if(checkpoint==1)throw new InvalidOperationException("CONTROLLED_INTERRUPTION");var security=new DirectorySecurity();security.SetSecurityDescriptorBinaryForm(r.original);security.AddAccessRule(new FileSystemAccessRule(WindowsIdentity.GetCurrent().User,FileSystemRights.CreateDirectories,InheritanceFlags.None,PropagationFlags.None,AccessControlType.Deny));r.expected=security.GetSecurityDescriptorBinaryForm();
   WriteSecurity(r.handle,r.expected);if(checkpoint==2)throw new InvalidOperationException("CONTROLLED_INTERRUPTION");if(!Equal(ReadSecurity(r.handle),r.expected))throw new InvalidOperationException("ACL_READBACK_FAILED");r.ready=true;return r;
  }catch{if(r.CreatedNew){r.CreationFailure="CREATION_INCOMPLETE";return r;}r.Dispose();throw;}
 }
 public bool FileProbe(){if(!ready||Identity(handle)!=identity||!Equal(ReadSecurity(handle),expected))return false;string p=System.IO.Path.Combine(Path,"ksession-write-probe-controlled.tmp");using(var h=CreateFile(p,0x40000000,0,IntPtr.Zero,1,0x04000100,IntPtr.Zero)){if(h.IsInvalid)return false;}return Absent(p);}
 public bool ChildCreateDenied(){if(!ready||Identity(handle)!=identity)return false;bool made=CreateDirectory(System.IO.Path.Combine(Path,"controlled-child"),IntPtr.Zero);int error=Marshal.GetLastWin32Error();if(made)throw new InvalidOperationException("CHILD_UNEXPECTEDLY_CREATED");return error==5;}
 public string Restore(){
  if(retired)return Absent(Path)?"OWNED_REMOVED":"RETIRED_CHANGED";
  if(!CreatedNew||original==null||Identity(handle)!=identity)return "OWNERSHIP_UNKNOWN";
  byte[] current=ReadSecurity(handle);bool applied=expected!=null&&Equal(current,expected);
  if(!applied&&(ready||!Equal(current,original)))return "ACL_CHANGED";
  if(Directory.EnumerateFileSystemEntries(Path).Any())return "UNOWNED_CHILDREN_PRESENT";
  if(applied)WriteSecurity(handle,original);if(!Equal(ReadSecurity(handle),original))return "ACL_RESTORE_UNPROVEN";
  int remove=1;if(!SetFileInformationByHandle(handle,4,ref remove,4))return "DELETE_FAILED";
  handle.Dispose();if(!Absent(Path))return "POST_ABSENCE_UNPROVEN";retired=true;ready=false;return "OWNED_REMOVED";
 }
 // Controller tests deliberately mutate only this private object's DACL.
 // A separate actor must reverse its change before owner recovery is possible.
 public void ControlledAclChange(){var security=new DirectorySecurity();security.SetSecurityDescriptorBinaryForm(expected);security.AddAccessRule(new FileSystemAccessRule(WindowsIdentity.GetCurrent().User,FileSystemRights.WriteAttributes,AccessControlType.Deny));WriteSecurity(handle,security.GetSecurityDescriptorBinaryForm());}
 public void ControlledActorUndo(){WriteSecurity(handle,expected);}
 public void Dispose(){if(handle!=null)handle.Dispose();if(parent!=null)parent.Dispose();}
}
