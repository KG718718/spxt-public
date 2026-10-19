if(-not ('FreshSuspendedProcess' -as [type])){Add-Type -TypeDefinition @'
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public sealed class FreshSuspendedProcess {
 [StructLayout(LayoutKind.Sequential)] struct SA {public int Length;public IntPtr Descriptor;[MarshalAs(UnmanagedType.Bool)]public bool Inherit;}
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct SI {public int Size;public string Reserved,Desktop,Title;public uint X,Y,XSize,YSize,XCount,YCount,Fill,Flags;public short Show,ReservedSize;public IntPtr ReservedPtr,Input,Output,Error;}
 [StructLayout(LayoutKind.Sequential)] struct SIX {public SI Start;public IntPtr Attributes;}
 [StructLayout(LayoutKind.Sequential)] struct PI {public IntPtr Process,Thread;public uint ProcessId,ThreadId;}
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CreatePipe(out IntPtr read,out IntPtr write,ref SA sa,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetHandleInformation(IntPtr h,uint mask,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SIX si,out PI pi);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,uint flags,ref IntPtr size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr key,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
 [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h,uint timeout);
 [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h,out uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool IsProcessInJob(IntPtr process,IntPtr job,out bool result);
 IntPtr process,thread;SafeFileHandle outHandle,errHandle;bool initialClosed=true;public StreamReader Out,Err; public bool Resumed {get;private set;}
 public static bool LastStartHandlesClosed {get;private set;}
 public bool InJob(IntPtr job){bool result;if(!IsProcessInJob(process,job,out result))throw new InvalidOperationException("JOB_MEMBERSHIP_UNKNOWN");return result;}
 public IntPtr Handle {get{return process;}}
 public bool HasExited {get{return WaitForSingleObject(process,0)==0;}}
 public int ExitCode {get{uint c;if(!HasExited||!GetExitCodeProcess(process,out c))throw new InvalidOperationException("PROCESS_EXIT_UNKNOWN");return unchecked((int)c);}}
 static string Quote(string a){var b=new StringBuilder("\"");int n=0;foreach(char c in a){if(c=='\\'){n++;continue;}if(c=='\"')b.Append('\\',n*2+1).Append(c);else b.Append('\\',n).Append(c);n=0;}b.Append('\\',n*2).Append('"');return b.ToString();}
 public static FreshSuspendedProcess Start(string exe,string[] args,IDictionary environment,string cwd){
  IntPtr ro=IntPtr.Zero,wo=IntPtr.Zero,re=IntPtr.Zero,we=IntPtr.Zero,ri=IntPtr.Zero,wi=IntPtr.Zero,block=IntPtr.Zero,attributes=IntPtr.Zero,handles=IntPtr.Zero;PI pi=new PI();bool made=false,initialized=false,closed=true;FreshSuspendedProcess owner=null;LastStartHandlesClosed=false;
  try{var sa=new SA{Length=Marshal.SizeOf(typeof(SA)),Inherit=true};if(!CreatePipe(out ro,out wo,ref sa,0)||!CreatePipe(out re,out we,ref sa,0)||!CreatePipe(out ri,out wi,ref sa,0)||!SetHandleInformation(ro,1,0)||!SetHandleInformation(re,1,0)||!SetHandleInformation(wi,1,0))throw new InvalidOperationException("PROCESS_PIPE_FAILED");
   IntPtr size=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);if(size==IntPtr.Zero)throw new InvalidOperationException("PROCESS_ATTRIBUTES_FAILED");attributes=Marshal.AllocHGlobal(size);if(!InitializeProcThreadAttributeList(attributes,1,0,ref size))throw new InvalidOperationException("PROCESS_ATTRIBUTES_FAILED");initialized=true;
   handles=Marshal.AllocHGlobal(IntPtr.Size*3);Marshal.WriteIntPtr(handles,0,ri);Marshal.WriteIntPtr(handles,IntPtr.Size,wo);Marshal.WriteIntPtr(handles,IntPtr.Size*2,we);if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x20002,handles,(IntPtr)(IntPtr.Size*3),IntPtr.Zero,IntPtr.Zero))throw new InvalidOperationException("PROCESS_HANDLE_LIST_FAILED");
   var cmd=new StringBuilder(Quote(exe));foreach(var a in args)cmd.Append(' ').Append(Quote(a));var values=new SortedDictionary<string,string>(StringComparer.OrdinalIgnoreCase);foreach(DictionaryEntry e in environment)values[(string)e.Key]=(string)e.Value;var eb=new StringBuilder();foreach(var e in values)eb.Append(e.Key).Append('=').Append(e.Value).Append('\0');eb.Append('\0');block=Marshal.StringToHGlobalUni(eb.ToString());
   var si=new SIX{Start=new SI{Size=Marshal.SizeOf(typeof(SIX)),Flags=0x100,Input=ri,Output=wo,Error=we},Attributes=attributes};if(!CreateProcess(exe,cmd,IntPtr.Zero,IntPtr.Zero,true,0x08080404,block,cwd,ref si,out pi))throw new InvalidOperationException("PROCESS_START_FAILED");made=true;
   owner=new FreshSuspendedProcess{process=pi.Process,thread=pi.Thread};owner.outHandle=new SafeFileHandle(ro,true);ro=IntPtr.Zero;owner.Out=new StreamReader(new FileStream(owner.outHandle,FileAccess.Read),new UTF8Encoding(false,true));owner.errHandle=new SafeFileHandle(re,true);re=IntPtr.Zero;owner.Err=new StreamReader(new FileStream(owner.errHandle,FileAccess.Read),new UTF8Encoding(false,true));return owner;
  }catch{if(made){closed=TerminateProcess(pi.Process,124)&&closed;closed=(WaitForSingleObject(pi.Process,5000)==0)&&closed;if(owner!=null)closed=owner.Dispose()&&closed;else{closed=CloseHandle(pi.Thread)&&closed;closed=CloseHandle(pi.Process)&&closed;}}throw;}
  finally{foreach(var h in new[]{ro,wo,re,we,ri,wi})if(h!=IntPtr.Zero)closed=CloseHandle(h)&&closed;if(initialized)DeleteProcThreadAttributeList(attributes);if(attributes!=IntPtr.Zero)Marshal.FreeHGlobal(attributes);if(handles!=IntPtr.Zero)Marshal.FreeHGlobal(handles);if(block!=IntPtr.Zero)Marshal.FreeHGlobal(block);LastStartHandlesClosed=closed;if(owner!=null)owner.initialClosed=owner.initialClosed&&closed;}
 }
 public void Resume(){if(Resumed||ResumeThread(thread)==0xffffffff)throw new InvalidOperationException("PROCESS_RESUME_FAILED");Resumed=true;bool closed=CloseHandle(thread);initialClosed=initialClosed&&closed;if(closed)thread=IntPtr.Zero;}
 public void StopSuspendedRoot(){if(Resumed)throw new InvalidOperationException("UNASSIGNED_RUNNING_ROOT_REJECTED");if(!HasExited&&!TerminateProcess(process,124))throw new InvalidOperationException("PROCESS_STOP_FAILED");WaitForSingleObject(process,5000);}
 public bool Dispose(){bool ok=initialClosed;try{if(Out!=null)Out.Dispose();}catch{ok=false;}try{if(Err!=null)Err.Dispose();}catch{ok=false;}try{if(outHandle!=null){outHandle.Dispose();ok=outHandle.IsClosed&&ok;}}catch{ok=false;}try{if(errHandle!=null){errHandle.Dispose();ok=errHandle.IsClosed&&ok;}}catch{ok=false;}if(thread!=IntPtr.Zero){ok=CloseHandle(thread)&&ok;thread=IntPtr.Zero;}if(process!=IntPtr.Zero){ok=CloseHandle(process)&&ok;process=IntPtr.Zero;}return ok;}
}
'@}
