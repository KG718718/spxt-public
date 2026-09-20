#ifndef Payload
  #error Payload required
#endif
#ifndef Generated
  #error Generated required
#endif
#ifndef Output
  #error Output required
#endif
#include AddBackslash(Generated) + "identity.iss"
#if VER != EncodeVer(6, 7, 3)
  #error Exact Inno Setup 6.7.3 required
#endif
[Setup]
AppId=KSESSION-Beta-Installer-v1
AppName=K⁺-SESSION Beta
AppVersion=1.1.0-beta.1
AppVerName=K⁺-SESSION Beta — Installer 1.1.0-beta.1 (Unsigned)
VersionInfoVersion=1.1.0.0
VersionInfoDescription=K-SESSION Unsigned Beta Installer
DefaultDirName={localappdata}\Programs\K-SESSION-Beta
DefaultGroupName=K⁺-SESSION
PrivilegesRequired=lowest
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
MinVersion=10.0.10240
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableWelcomePage=yes
DisableReadyPage=no
UsePreviousAppDir=no
UsePreviousGroup=no
UsePreviousTasks=no
UninstallFilesDir={app}\uninstall
UninstallDisplayName=K⁺-SESSION Beta
UninstallDisplayIcon={app}\program\K-SESSION.exe
CloseApplications=no
RestartApplications=no
RestartIfNeededByRun=no
AlwaysRestart=no
SetupLogging=yes
WizardStyle=modern
Compression=lzma2
SolidCompression=yes
OutputDir={#Output}
OutputBaseFilename=K-SESSION-Setup-1.1.0-beta.1
InfoBeforeFile={#Generated}\install-info.txt

[Files]
#include AddBackslash(Generated) + "files.iss"
Source: "{#Generated}\build-info.json"; DestDir: "{app}\uninstall"; Flags: ignoreversion
Source: "{#Generated}\installer-manifest.json"; DestDir: "{app}\uninstall"; Flags: ignoreversion
Source: "{#Generated}\LICENSE-Inno-Setup.txt"; DestDir: "{app}\uninstall"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\K⁺-SESSION"; Filename: "{app}\program\K-SESSION.exe"; WorkingDir: "{app}\program"
Name: "{userprograms}\K⁺-SESSION"; Filename: "{app}\program\K-SESSION.exe"; WorkingDir: "{app}\program"

[Run]
Filename: "{app}\program\K-SESSION.exe"; Description: "启动 K⁺-SESSION"; Flags: nowait postinstall skipifsilent

[Code]
const
  ProductKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1';
  RunningMessage = 'K⁺-SESSION 正在运行或实例被占用。请保存当前操作，使用 K⁺-SESSION 窗口“停止服务”，再继续安装/卸载。不会强制关闭程序。';
  ExistingMessage = '已检测到 K⁺-SESSION Beta，请先停止并卸载当前版本后再安装。业务数据会保留。';
var
  InstanceLock, LauncherLock, NodeLock: LongWord;
#ifdef FaultCancel
  FaultCancelIssued: Boolean;
#endif
function CreateFileW(Name: String; Access, Share: LongWord; SA: LongWord; Creation, Flags, Template: LongWord): LongWord;
external 'CreateFileW@kernel32.dll stdcall';
function CloseHandle(H: LongWord): Boolean;
external 'CloseHandle@kernel32.dll stdcall';
function GetFileAttributesW(Name: String): LongWord;
external 'GetFileAttributesW@kernel32.dll stdcall';

procedure ReleaseLocks;
begin
  if InstanceLock <> 0 then begin CloseHandle(InstanceLock); InstanceLock := 0; end;
  if LauncherLock <> 0 then begin CloseHandle(LauncherLock); LauncherLock := 0; end;
  if NodeLock <> 0 then begin CloseHandle(NodeLock); NodeLock := 0; end;
end;

function Overlaps(A, B: String): Boolean;
begin
  A := Lowercase(AddBackslash(RemoveBackslashUnlessRoot(A)));
  B := Lowercase(AddBackslash(RemoveBackslashUnlessRoot(B)));
  Result := (Pos(A, B) = 1) or (Pos(B, A) = 1);
end;

function BetaInstance: String;
begin
  { Same LOCALAPPDATA contract as the unchanged Launcher; tests use a fresh E profile. }
  Result := AddBackslash(GetEnv('LOCALAPPDATA')) + 'K-SESSION\Beta\instance';
  if (Length(GetEnv('LOCALAPPDATA')) < 3) or (Copy(GetEnv('LOCALAPPDATA'), 2, 2) <> ':\') then
    RaiseException('无法定位当前用户数据目录。');
end;

function SafePath(P: String): Boolean;
var Q: String; Attr: LongWord;
begin
  Result := False;
  P := RemoveBackslashUnlessRoot(P);
  if (Length(P) < 7) or (Length(ExtractFileDrive(P)) <> 2) or (Copy(P, 2, 2) <> ':\') then exit;
  if CompareText(ExpandFileName(P), P) <> 0 then exit;
  if Overlaps(P, BetaInstance) then exit;
  if Overlaps(P, ExpandConstant('{win}')) then exit;
  Q := P;
  while Length(Q) > 3 do begin
    Attr := GetFileAttributesW(Q);
    if Attr <> $FFFFFFFF then begin
      if (Attr and $400) <> 0 then exit;
      if (Attr and $10) = 0 then exit;
    end;
    Q := ExtractFileDir(Q);
  end;
  Result := True;
end;

function NonEmpty(P: String): Boolean;
var F: TFindRec;
begin
  Result := False;
  if FindFirst(AddBackslash(P) + '*', F) then begin
    try
      repeat
        if (F.Name <> '.') and (F.Name <> '..') then begin Result := True; exit; end;
      until not FindNext(F);
    finally FindClose(F); end;
  end;
end;

function RunningProduct: Boolean;
var Locator, Service, Items, Item: Variant; I: Integer; P, R: String;
begin
  Result := True; { fail closed when process inspection is unavailable }
  try
    Locator := CreateOleObject('WbemScripting.SWbemLocator');
    Service := Locator.ConnectServer('', 'root\CIMV2');
    Items := Service.ExecQuery('SELECT Name,ExecutablePath FROM Win32_Process WHERE Name="K-SESSION.exe" OR Name="node.exe"');
    for I := 0 to Items.Count - 1 do begin
      Item := Items.ItemIndex(I);
      if not VarIsNull(Item.ExecutablePath) then begin
        P := String(Item.ExecutablePath);
        if CompareText(String(Item.Name), 'K-SESSION.exe') = 0 then begin
          R := ExtractFileDir(P);
          if FileExists(R + '\manifest\runtime-manifest.json') and FileExists(R + '\app\server.js') then exit;
        end else begin
          R := ExtractFileDir(ExtractFileDir(P));
          if FileExists(R + '\K-SESSION.exe') and FileExists(R + '\manifest\runtime-manifest.json') and FileExists(R + '\app\server.js') then exit;
        end;
      end else if CompareText(String(Item.Name), 'K-SESSION.exe') = 0 then exit;
    end;
    Result := False;
  except Log('KSESSION_PROCESS_INSPECTION_UNAVAILABLE: ' + GetExceptionMessage); end;
end;

function AcquireExistingInstanceLock: Boolean;
var P: String; H: LongWord;
begin
  Result := True;
  if InstanceLock <> 0 then exit;
  P := BetaInstance + '\.launcher.lock';
  if not FileExists(P) then exit; { never create or initialize an instance }
  if (GetFileAttributesW(P) and $400) <> 0 then begin Result := False; exit; end;
  H := CreateFileW(P, $C0000000, 0, 0, 3, $80, 0); { OPEN_EXISTING; no write }
  Result := H <> $FFFFFFFF;
  if Result then InstanceLock := H;
end;

function HasRegistration: Boolean;
begin
  Result := RegKeyExists(HKCU64, ProductKey) or RegKeyExists(HKCU32, ProductKey);
end;

function InitializeSetup: Boolean;
begin
  Result := False;
  if HasRegistration then begin Log('KSESSION_REJECT_REGISTERED'); SuppressibleMsgBox(ExistingMessage, mbError, MB_OK, IDOK); exit; end;
  if RunningProduct then begin Log('KSESSION_REJECT_RUNNING'); SuppressibleMsgBox(RunningMessage, mbError, MB_OK, IDOK); exit; end;
  Result := True;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var P, Ancestor, Probe: String; Free, Total: Int64; H: LongWord;
begin
  Result := '';
  ReleaseLocks;
  P := ExpandConstant('{app}');
  if not SafePath(P) then begin Log('KSESSION_REJECT_PATH'); Result := '安装路径无效、包含重解析点或与数据/系统目录重叠。'; exit; end;
  if HasRegistration then begin Result := ExistingMessage; exit; end;
  if FileExists(P) or (DirExists(P) and NonEmpty(P)) then begin Log('KSESSION_REJECT_NONEMPTY'); Result := '目标目录不是空目录，拒绝覆盖未知文件。'; exit; end;
  if FileExists(ExpandConstant('{userdesktop}\K⁺-SESSION.lnk')) or FileExists(ExpandConstant('{userprograms}\K⁺-SESSION.lnk')) then begin Result := '已有同名快捷方式，拒绝覆盖。请确认其来源后再安装。'; exit; end;
  if RunningProduct or not AcquireExistingInstanceLock then begin Result := RunningMessage; exit; end;
  Ancestor := P;
  while not DirExists(Ancestor) do Ancestor := ExtractFileDir(Ancestor);
  if not GetSpaceOnDisk64(Ancestor, Free, Total) then begin Log('KSESSION_REJECT_SPACE_QUERY'); Result := '无法确认可用磁盘空间。'; exit; end;
  if Free < {#RequiredBytes} then begin Log('KSESSION_REJECT_SPACE'); Result := '磁盘可用空间不足，未安装程序。'; exit; end;
  { DateSeparator and TimeSeparator are Char, never empty string variants. }
  Probe := AddBackslash(Ancestor) + 'ksession-write-probe-' + GetDateTimeString('yyyymmddhhnnss', '-', ':') + '.tmp';
  H := CreateFileW(Probe, $40000000, 0, 0, 1, $04000100, 0); { CREATE_NEW, delete-on-close }
  if H = $FFFFFFFF then begin Log('KSESSION_REJECT_WRITE'); Result := '当前用户没有目录写入权限。不会请求管理员权限。'; exit; end;
  CloseHandle(H);
  Log('KSESSION_PREINSTALL_READY');
end;

procedure EnsureAbsent(Rel: String);
begin
  if FileExists(ExpandConstant('{app}\program\') + Rel) or DirExists(ExpandConstant('{app}\program\') + Rel) then RaiseException('目标文件在检查后出现，拒绝覆盖。');
end;

procedure VerifyInstalled;
begin
#include AddBackslash(Generated) + "verify.iss"
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    VerifyInstalled;
    ReleaseLocks; { allow first start only after completed checks }
    Log('KSESSION_INSTALLED_PAYLOAD_VERIFIED');
  end;
end;

function LockExecutable(P: String; var H: LongWord): Boolean;
begin
  Result := True;
  if not FileExists(P) then exit;
  H := CreateFileW(P, 0, 4, 0, 3, $80, 0); { only FILE_SHARE_DELETE: block a new launch, allow logged delete }
  Result := H <> $FFFFFFFF;
  if not Result then H := 0;
end;

function InitializeUninstall: Boolean;
begin
  Result := False;
  if RunningProduct or not AcquireExistingInstanceLock then begin
    ReleaseLocks; SuppressibleMsgBox(RunningMessage, mbError, MB_OK, IDOK); exit;
  end;
  if not LockExecutable(ExpandConstant('{app}\program\K-SESSION.exe'), LauncherLock) or
     not LockExecutable(ExpandConstant('{app}\program\runtime\node.exe'), NodeLock) then begin
    ReleaseLocks; SuppressibleMsgBox(RunningMessage, mbError, MB_OK, IDOK); exit;
  end;
  Result := True;
end;

procedure DeinitializeSetup;
begin ReleaseLocks; end;
procedure DeinitializeUninstall;
begin ReleaseLocks; end;

#ifdef FaultCancel
procedure CurInstallProgressChanged(CurProgress, MaxProgress: Integer);
begin
  if not FaultCancelIssued and (CurProgress > 0) and (CurProgress < MaxProgress) then begin
    FaultCancelIssued := True;
    Log('KSESSION_FIXTURE_CANCEL_DURING_COPY');
    WizardForm.CancelButton.OnClick(WizardForm.CancelButton);
  end;
end;
procedure CancelButtonClick(CurPageID: Integer; var Cancel, Confirm: Boolean);
begin Cancel := True; Confirm := False; end;
#endif
