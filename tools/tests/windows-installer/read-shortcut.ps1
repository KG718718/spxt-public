param([Parameter(Mandatory=$true)][string]$PathBase64)
$ErrorActionPreference='Stop'
# Test-only Unicode reader. WScript.Shell's legacy shortcut filename conversion loses U+207A.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
[ComImport, Guid("00021401-0000-0000-C000-000000000046")]
class ShortcutObject {}
[ComImport, Guid("000214F9-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface UnicodeShortcut {
    void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int capacity, IntPtr findData, uint flags);
}
public static class ShortcutReader {
    public static string Read(string file) {
        object link = new ShortcutObject();
        try {
            ((IPersistFile)link).Load(file, 0);
            var buffer = new StringBuilder(32768);
            ((UnicodeShortcut)link).GetPath(buffer, buffer.Capacity, IntPtr.Zero, 0);
            return buffer.ToString();
        } finally { Marshal.FinalReleaseComObject(link); }
    }
}
'@
$taskFile=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PathBase64))
if(!(Test-Path -LiteralPath $taskFile -PathType Leaf)){throw 'Actual shortcut file missing'}
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([ShortcutReader]::Read($taskFile)))
