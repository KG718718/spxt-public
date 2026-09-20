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
DisableReadyPage=yes
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
Source: "{#Generated}\instance-binding.ini"; DestDir: "{app}\uninstall"; Flags: ignoreversion; AfterInstall: WriteInstanceBinding
Source: "{#Payload}\K-SESSION.exe"; DestName: "ksession-location-check.exe"; Flags: dontcopy

[Icons]
Name: "{userdesktop}\K⁺-SESSION"; Filename: "{app}\program\K-SESSION.exe"; Parameters: "--instance ""{code:SelectedInstance}"""; WorkingDir: "{app}\program"
Name: "{userprograms}\K⁺-SESSION"; Filename: "{app}\program\K-SESSION.exe"; Parameters: "--instance ""{code:SelectedInstance}"""; WorkingDir: "{app}\program"

[Run]
Filename: "{app}\program\K-SESSION.exe"; Parameters: "--instance ""{code:SelectedInstance}"""; Description: "启动 K⁺-SESSION"; Flags: nowait postinstall skipifsilent

[Code]
const
  ProductKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1';
  BindingKey = 'Software\KSESSION\Beta\InstallerBinding';
  RunningMessage = 'K⁺-SESSION 正在运行或实例被占用。请保存当前操作，使用 K⁺-SESSION 窗口“停止服务”，再继续安装/卸载。不会强制关闭程序。';
  ExistingMessage = '已检测到 K⁺-SESSION Beta，请先停止并卸载当前版本后再安装。业务数据会保留。';
var
  InstanceLock, LauncherLock, NodeLock: LongWord;
  DataPage: TInputDirWizardPage;
  PriorInstance, ConfirmedInstance, LocationChecker: String;
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

function LegacyInstance: String;
begin
  { Same LOCALAPPDATA contract as the unchanged Launcher; tests use a fresh E profile. }
  Result := AddBackslash(GetEnv('LOCALAPPDATA')) + 'K-SESSION\Beta\instance';
  if (Length(GetEnv('LOCALAPPDATA')) < 3) or (Copy(GetEnv('LOCALAPPDATA'), 2, 2) <> ':\') then
    RaiseException('无法定位当前用户数据目录。');
end;

function SelectedInstance(Param: String): String;
begin
  if IsUninstaller then
    Result := GetIniString('Installation', 'Instance', '', ExpandConstant('{app}\uninstall\instance-binding.ini'))
  else Result := DataPage.Values[0];
end;

function BetaInstance: String;
begin
  Result := SelectedInstance('');
  if Result = '' then RaiseException('数据位置绑定缺失；不会使用其他默认目录。');
end;

procedure InitializeWizard;
var Saved: String;
begin
  PriorInstance := '';
  Saved := LegacyInstance;
  if RegQueryStringValue(HKCU64, BindingKey, 'Instance', PriorInstance) and (PriorInstance <> '') then Saved := PriorInstance
  else if DirExists(Saved) then PriorInstance := Saved;
  DataPage := CreateInputDirPage(wpInfoBefore, '业务数据与附件保存位置', '请选择长期稳定的数据目录（不是程序安装目录）',
    '项目附件、发票附件、备份及业务数据会保存在这里。'#13#10 +
    '卸载K⁺-SESSION不会删除这里的数据，请选择长期稳定的位置。'#13#10 +
    '选择其他位置不会自动移动原有数据；原账号和附件仍留在原位置。', False, '');
  DataPage.Add('业务数据与附件目录：');
  DataPage.Values[0] := Saved;
  Saved := ExpandConstant('{param:INSTANCE|}');
  if Saved <> '' then DataPage.Values[0] := Saved;
end;

function CheckDataLocation(Prepare: Boolean): String;
var Code: Integer; Mode: String;
begin
  Result := '';
  if (PriorInstance <> '') and (CompareText(BetaInstance, PriorInstance) = 0) and not DirExists(PriorInstance) then begin
    Log('KSESSION_DATA_PRIOR_MISSING'); Result := '上次数据目录不可用。请先恢复磁盘或重新选择；不会静默创建空目录。'; exit;
  end;
  if LocationChecker = '' then begin
    ExtractTemporaryFile('ksession-location-check.exe'); LocationChecker := ExpandConstant('{tmp}\ksession-location-check.exe');
  end;
  Mode := '--check-install-instance'; if Prepare then Mode := '--prepare-install-instance';
  if not Exec(LocationChecker, Mode + ' "' + WizardDirValue + '" "' + BetaInstance + '"', '', SW_HIDE, ewWaitUntilTerminated, Code) then Code := 99;
  if Code <> 0 then begin
    Log('KSESSION_DATA_REJECT_' + IntToStr(Code));
    case Code of
      10: Result := '请选择绝对本地固定盘路径，不使用网络、盘根或特殊字符路径。';
      11: Result := '业务数据不能放在程序安装目录内，也不能与程序目录交叠。';
      12: Result := '不能使用Windows系统或Program Files目录保存业务数据。';
      13: Result := '数据路径包含链接、重解析点或不可安全访问的内容，已拒绝。';
      14: Result := '所选目录非空且不是可识别的K⁺-SESSION实例，或数据结构损坏。不会删除或初始化其内容。';
      15: Result := '所选数据位置不可写或不可访问。不会请求管理员权限。';
      else Result := '无法验证数据目录；安装已停止。';
    end;
  end;
end;

function ConfirmDataChoice: Boolean;
begin
  Result := True;
  if (PriorInstance <> '') and (CompareText(BetaInstance, PriorInstance) <> 0) and (CompareText(ConfirmedInstance, BetaInstance) <> 0) then begin
    if WizardSilent then Result := ExpandConstant('{param:CONFIRMDATACHANGE|0}') = '1'
    else Result := MsgBox('这是另一个数据位置，不会自动移动原账号、附件或业务数据。确认使用新位置？', mbConfirmation, MB_YESNO) = IDYES;
    if Result then ConfirmedInstance := BetaInstance;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var Error: String;
begin
  Result := True;
  { Silent installs use PrepareToInstall's error return, never a blocking custom MsgBox. }
  if WizardSilent then exit;
  if CurPageID = DataPage.ID then begin
    Error := CheckDataLocation(False);
    if Error <> '' then begin MsgBox(Error, mbError, MB_OK); Result := False; exit; end;
    Result := ConfirmDataChoice;
  end;
end;

procedure WriteInstanceBinding;
var P: String;
begin
  P := ExpandConstant('{app}\uninstall\instance-binding.ini');
  if not SetIniString('Installation', 'Schema', '1', P) or
     not SetIniString('Installation', 'InstallRoot', ExpandConstant('{app}'), P) or
     not SetIniString('Installation', 'Instance', BetaInstance, P) then RaiseException('无法保存安装数据目录绑定。');
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
  Result := CheckDataLocation(False); if Result <> '' then exit;
  if not ConfirmDataChoice then begin Log('KSESSION_DATA_SWITCH_UNCONFIRMED'); Result := '未确认使用另一数据位置（不会自动迁移）。'; exit; end;
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
    if CheckDataLocation(True) <> '' then RaiseException('无法准备所选数据位置；不会改写已有数据。');
    if not RegWriteStringValue(HKCU64, BindingKey, 'InstallRoot', ExpandConstant('{app}')) or
       not RegWriteStringValue(HKCU64, BindingKey, 'Instance', BetaInstance) then RaiseException('无法记录上次数据位置。');
    ReleaseLocks; { allow first start only after completed checks }
    Log('KSESSION_INSTALLED_PAYLOAD_VERIFIED');
    Log('KSESSION_DESKTOP_LINK=' + ExpandConstant('{userdesktop}\K⁺-SESSION.lnk'));
    Log('KSESSION_START_LINK=' + ExpandConstant('{userprograms}\K⁺-SESSION.lnk'));
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
  if SelectedInstance('') = '' then begin SuppressibleMsgBox('数据绑定缺失，请先修复安装记录；不会猜测其他数据位置。', mbError, MB_OK, IDOK); exit; end;
  if not UninstallSilent then
    if MsgBox('K⁺-SESSION业务数据与附件不会被删除。请先保存并停止服务。继续卸载程序？', mbConfirmation, MB_YESNO) <> IDYES then exit;
  if RunningProduct or not AcquireExistingInstanceLock then begin
    Log('KSESSION_UNINSTALL_REJECT_RUNNING');
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

procedure CurPageChanged(CurPageID: Integer);
begin
  Log('KSESSION_WIZARD_PAGE_' + IntToStr(CurPageID));
  if CurPageID = DataPage.ID then
    WizardForm.NextButton.Caption := SetupMessage(msgButtonInstall);
end;

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
