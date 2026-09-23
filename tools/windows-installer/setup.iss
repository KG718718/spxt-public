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
AppVersion=1.1.0-beta.2
AppVerName=K⁺-SESSION Beta — Installer 1.1.0-beta.2 (Unsigned)
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
OutputBaseFilename=K-SESSION-Setup-1.1.0-beta.2
InfoBeforeFile={#Generated}\install-info.txt

[Files]
#include AddBackslash(Generated) + "files.iss"
Source: "{#Generated}\build-info.json"; DestDir: "{app}\uninstall"; Flags: ignoreversion; Check: IsFreshInstall
Source: "{#Generated}\installer-manifest.json"; DestDir: "{app}\uninstall"; Flags: ignoreversion; Check: IsFreshInstall
Source: "{#Generated}\build-info.json"; DestDir: "{tmp}\ksession-upgrade-v1\metadata"; Flags: ignoreversion; Check: IsUpgradeInstall
Source: "{#Generated}\installer-manifest.json"; DestDir: "{tmp}\ksession-upgrade-v1\metadata"; Flags: ignoreversion; Check: IsUpgradeInstall
Source: "{#Generated}\LICENSE-Inno-Setup.txt"; DestDir: "{app}\uninstall"; Flags: ignoreversion
Source: "{#Generated}\instance-binding.ini"; DestDir: "{app}\uninstall"; Flags: ignoreversion; AfterInstall: WriteInstanceBinding; Check: IsFreshInstall
Source: "{#Payload}\K-SESSION.exe"; DestName: "ksession-location-check.exe"; Flags: dontcopy
Source: "{#Payload}\runtime\node.exe"; DestName: "ksession-beta2-node.exe"; Flags: dontcopy
Source: "{#Generated}\approved-identity-bundle.json"; Flags: dontcopy
Source: "{#Generated}\upgrade-detection.cjs"; Flags: dontcopy
Source: "{#Generated}\upgrade-preflight.cjs"; Flags: dontcopy
Source: "{#Generated}\upgrade-gate.cjs"; Flags: dontcopy
Source: "{#Generated}\upgrade-gate-cli.cjs"; Flags: dontcopy
Source: "{#Generated}\upgrade-transaction.cjs"; Flags: dontcopy
Source: "{#Generated}\upgrade-transaction-cli.cjs"; Flags: dontcopy
Source: "{#Generated}\runtime-common.cjs"; Flags: dontcopy
Source: "{#Generated}\public-startup.js"; Flags: dontcopy
Source: "{#Generated}\public-config-store.js"; Flags: dontcopy
Source: "{#Generated}\tax-config.js"; Flags: dontcopy
Source: "{#Generated}\invoice-access-policy.js"; Flags: dontcopy
Source: "{#Generated}\service-fee-config.js"; Flags: dontcopy
Source: "{#Generated}\bonus-config.js"; Flags: dontcopy

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
  UpgradePage: TOutputMsgWizardPage;
  PriorInstance, ConfirmedInstance, LocationChecker: String;
  UpgradeMode, TransactionPrepared, TransactionSwapped, TransactionFinalized: Boolean;
  PriorDisplayName, PriorDisplayVersion, PriorInstallRoot, PriorUninstallString: String;
  PriorBindingRoot, PriorBindingInstance, UpgradeRequest, UpgradePlan: String;
#ifdef FaultCancel
  FaultCancelIssued: Boolean;
#endif
#ifdef FaultCopy
  FaultCopyIssued: Boolean;
#endif
function CreateFileW(Name: String; Access, Share: LongWord; SA: LongWord; Creation, Flags, Template: LongWord): LongWord;
external 'CreateFileW@kernel32.dll stdcall';
function CloseHandle(H: LongWord): Boolean;
external 'CloseHandle@kernel32.dll stdcall';
function GetFileAttributesW(Name: String): LongWord;
external 'GetFileAttributesW@kernel32.dll stdcall';
function GetLastErrorCode: LongWord;
external 'GetLastError@kernel32.dll stdcall';

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
  else if UpgradeMode then Result := PriorBindingInstance
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
  if UpgradeMode then begin PriorInstance := PriorBindingInstance; Saved := PriorBindingInstance; end
  else begin
    Saved := LegacyInstance;
    if RegQueryStringValue(HKCU64, BindingKey, 'Instance', PriorInstance) and (PriorInstance <> '') then Saved := PriorInstance
    else if DirExists(Saved) then PriorInstance := Saved;
  end;
  DataPage := CreateInputDirPage(wpInfoBefore, '业务数据与附件保存位置', '请选择长期稳定的数据目录（不是程序安装目录）',
    '项目附件、发票附件、备份及业务数据会保存在这里。'#13#10 +
    '卸载K⁺-SESSION不会删除这里的数据，请选择长期稳定的位置。'#13#10 +
    '选择其他位置不会自动移动原有数据；原账号和附件仍留在原位置。', False, '');
  DataPage.Add('业务数据与附件目录：');
  DataPage.Values[0] := Saved;
  Saved := ExpandConstant('{param:INSTANCE|}');
  if Saved <> '' then DataPage.Values[0] := Saved;
  UpgradePage := CreateOutputMsgPage(wpInfoBefore, '升级现有 K⁺-SESSION Beta', '将沿用原业务数据与附件位置',
    '原数据位置：' + PriorBindingInstance + #13#10#13#10 + '升级不会移动或删除业务数据与附件。');
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := (UpgradeMode and (PageID = DataPage.ID)) or ((not UpgradeMode) and (PageID = UpgradePage.ID));
end;

function IsFreshInstall: Boolean;
begin Result := not UpgradeMode; end;
function IsUpgradeInstall: Boolean;
begin Result := UpgradeMode; end;

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

function SafeDirectoryChain(P: String): Boolean;
var Q: String; Attr: LongWord;
begin
  Result := False;
  P := RemoveBackslashUnlessRoot(P);
  if (Length(P) < 7) or (Length(ExtractFileDrive(P)) <> 2) or (Copy(P, 2, 2) <> ':\') then exit;
  if CompareText(ExpandFileName(P), P) <> 0 then exit;
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

function SafePath(P: String): Boolean;
begin
  Result := False;
  if not SafeDirectoryChain(P) then exit;
  P := RemoveBackslashUnlessRoot(P);
  if Overlaps(P, BetaInstance) then exit;
  if Overlaps(P, ExpandConstant('{win}')) then exit;
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
  if not FileExists(P) then begin
    Result := not UpgradeMode; { upgrade requires an existing lock object; never create one }
    exit;
  end;
  if (GetFileAttributesW(P) and $400) <> 0 then begin Result := False; exit; end;
  H := CreateFileW(P, $C0000000, 0, 0, 3, $80, 0); { OPEN_EXISTING; no write }
  Result := H <> $FFFFFFFF;
  if Result then InstanceLock := H;
end;

function HasRegistration: Boolean;
begin
  Result := RegKeyExists(HKCU64, ProductKey) or RegKeyExists(HKCU32, ProductKey);
end;

function JsonEscape(S: String): String;
begin
  Result := S;
  StringChangeEx(Result, '\', '\\', True);
  StringChangeEx(Result, '"', '\"', True);
end;

function ReadUpgradeIdentity: Boolean;
var N, V, R, U, BR, BI: String;
begin
  Result := False;
  if not RegQueryStringValue(HKCU64, ProductKey, 'DisplayName', PriorDisplayName) or
     not RegQueryStringValue(HKCU64, ProductKey, 'DisplayVersion', PriorDisplayVersion) or
     not RegQueryStringValue(HKCU64, ProductKey, 'InstallLocation', PriorInstallRoot) or
     not RegQueryStringValue(HKCU64, ProductKey, 'UninstallString', PriorUninstallString) or
     not RegQueryStringValue(HKCU64, BindingKey, 'InstallRoot', PriorBindingRoot) or
     not RegQueryStringValue(HKCU64, BindingKey, 'Instance', PriorBindingInstance) then exit;
  if RegQueryStringValue(HKCU32, ProductKey, 'DisplayName', N) then begin
    if not RegQueryStringValue(HKCU32, ProductKey, 'DisplayVersion', V) or
       not RegQueryStringValue(HKCU32, ProductKey, 'InstallLocation', R) or
       not RegQueryStringValue(HKCU32, ProductKey, 'UninstallString', U) or
       (N <> PriorDisplayName) or (V <> PriorDisplayVersion) or (CompareText(R, PriorInstallRoot) <> 0) or
       (CompareText(U, PriorUninstallString) <> 0) then exit;
  end;
  if RegQueryStringValue(HKCU32, BindingKey, 'InstallRoot', BR) then begin
    if not RegQueryStringValue(HKCU32, BindingKey, 'Instance', BI) or
       (CompareText(BR, PriorBindingRoot) <> 0) or (CompareText(BI, PriorBindingInstance) <> 0) then exit;
  end;
  Result := (PriorDisplayName = 'K⁺-SESSION Beta') and (PriorDisplayVersion <> '') and
    (PriorInstallRoot <> '') and (PriorBindingRoot <> '') and (PriorBindingInstance <> '');
end;

procedure ExtractUpgradeTools;
begin
  ExtractTemporaryFile('ksession-beta2-node.exe');
  ExtractTemporaryFile('approved-identity-bundle.json');
  ExtractTemporaryFile('upgrade-detection.cjs');
  ExtractTemporaryFile('upgrade-preflight.cjs');
  ExtractTemporaryFile('upgrade-gate.cjs');
  ExtractTemporaryFile('upgrade-gate-cli.cjs');
  ExtractTemporaryFile('upgrade-transaction.cjs');
  ExtractTemporaryFile('upgrade-transaction-cli.cjs');
  ExtractTemporaryFile('runtime-common.cjs');
  ExtractTemporaryFile('public-startup.js');
  ExtractTemporaryFile('public-config-store.js');
  ExtractTemporaryFile('tax-config.js');
  ExtractTemporaryFile('invoice-access-policy.js');
  ExtractTemporaryFile('service-fee-config.js');
  ExtractTemporaryFile('bonus-config.js');
end;

function RunNode(Script, Args: String): Boolean;
var Code: Integer;
begin
  Result := Exec(ExpandConstant('{tmp}\ksession-beta2-node.exe'), '"' + ExpandConstant('{tmp}\') + Script + '" ' + Args,
    ExpandConstant('{tmp}'), SW_HIDE, ewWaitUntilTerminated, Code) and (Code = 0);
end;

function WriteUpgradeRequest: Boolean;
var S: String;
begin
  UpgradeRequest := ExpandConstant('{tmp}\ksession-upgrade-request.json');
  S := '{"schema":1,"snapshot":{"registrations":[{"view":"64","key":"' + JsonEscape(ProductKey) +
    '","displayName":"' + JsonEscape(PriorDisplayName) + '","displayVersion":"' + JsonEscape(PriorDisplayVersion) +
    '","installLocation":"' + JsonEscape(PriorInstallRoot) + '","uninstallString":"' + JsonEscape(PriorUninstallString) +
    '"}],"bindings":[{"view":"64","key":"' + JsonEscape(BindingKey) + '","installRoot":"' + JsonEscape(PriorBindingRoot) +
    '","instance":"' + JsonEscape(PriorBindingInstance) + '"}]},"preflight":{"installRoot":"' + JsonEscape(PriorInstallRoot) +
    '","instancePath":"' + JsonEscape(PriorBindingInstance) + '","bindingFile":"' + JsonEscape(AddBackslash(PriorInstallRoot) + 'uninstall\instance-binding.ini') +
    '","registeredInstallRoot":"' + JsonEscape(PriorBindingRoot) + '","registeredInstance":"' + JsonEscape(PriorBindingInstance) +
    '","dataContractVersion":"1","appRoot":"' + JsonEscape(ExpandConstant('{tmp}')) + '"}}';
  Result := SaveStringToFile(UpgradeRequest, S, False);
end;

function WriteUpgradePlan: Boolean;
var S: String;
begin
  UpgradePlan := ExpandConstant('{tmp}\ksession-upgrade-plan.json');
  S := '{"schema":1,"installRoot":"' + JsonEscape(PriorInstallRoot) + '","instancePath":"' + JsonEscape(PriorBindingInstance) +
    '","stagedProgram":"' + JsonEscape(ExpandConstant('{tmp}\ksession-upgrade-v1\program')) +
    '","stagedMetadata":"' + JsonEscape(ExpandConstant('{tmp}\ksession-upgrade-v1\metadata')) +
    '","desktopShortcut":"' + JsonEscape(ExpandConstant('{userdesktop}\K⁺-SESSION.lnk')) +
    '","startMenuShortcut":"' + JsonEscape(ExpandConstant('{userprograms}\K⁺-SESSION.lnk')) +
    '","sourceCommit":"{#SourceCommit}","runtimeManifestHash":"{#RuntimeManifestSha256}","launcherHash":"{#LauncherSha256}","programManifestHash":"{#ProgramManifestSha256}","instanceBindingSchema":1,"upgradeFrom":"1.1.0-beta.1","upgradeTo":"1.1.0-beta.2"}';
  Result := SaveStringToFile(UpgradePlan, S, False);
end;

function RunUpgradeGate: Boolean;
begin
  Result := False;
  ExtractUpgradeTools;
  if not WriteUpgradeRequest then exit;
  Result := RunNode('upgrade-gate-cli.cjs', '--request "' + UpgradeRequest + '" "' +
    ExpandConstant('{tmp}\approved-identity-bundle.json') + '" "{#IdentityBundleSha256}"');
end;

function PrepareUpgradeTransaction: Boolean;
begin
  Result := False;
  if not WriteUpgradePlan then exit;
  Result := RunNode('upgrade-transaction-cli.cjs', 'prepare "' + UpgradePlan + '"');
  if Result then TransactionPrepared := True;
end;

function WriteFreshInstallState: Boolean;
var S, P: String;
begin
  P := ExpandConstant('{app}\uninstall\install-state.json');
  S := '{"schema":1,"installerVersion":"1.1.0-beta.2","appVersion":"1.0.0","dataContractVersion":1,' +
    '"sourceCommit":"{#SourceCommit}","runtimeManifestHash":"{#RuntimeManifestSha256}","launcherHash":"{#LauncherSha256}",' +
    '"programManifestHash":"{#ProgramManifestSha256}","instanceBindingSchema":1,"installRoot":"' +
    JsonEscape(ExpandConstant('{app}')) + '","instancePath":"' + JsonEscape(BetaInstance) +
    '","upgradeFrom":"fresh","upgradeTo":"1.1.0-beta.2"}';
  Result := SaveStringToFile(P, S, False);
end;

procedure RestoreUpgradeRegistration;
begin
  RegWriteStringValue(HKCU64, ProductKey, 'DisplayName', PriorDisplayName);
  RegWriteStringValue(HKCU64, ProductKey, 'DisplayVersion', PriorDisplayVersion);
  RegWriteStringValue(HKCU64, ProductKey, 'InstallLocation', PriorInstallRoot);
  RegWriteStringValue(HKCU64, ProductKey, 'UninstallString', PriorUninstallString);
  RegWriteStringValue(HKCU64, BindingKey, 'InstallRoot', PriorBindingRoot);
  RegWriteStringValue(HKCU64, BindingKey, 'Instance', PriorBindingInstance);
end;

function VerifyFinalRegistration: Boolean;
var V, R, I, S, V32, R32: String;
begin
  Result := False;
  if not RegQueryStringValue(HKCU64, ProductKey, 'DisplayVersion', V) or (V <> '1.1.0-beta.2') or
     not RegQueryStringValue(HKCU64, ProductKey, 'InstallLocation', R) or (CompareText(R, ExpandConstant('{app}')) <> 0) or
     not RegQueryStringValue(HKCU64, BindingKey, 'Instance', I) or (CompareText(I, PriorBindingInstance) <> 0) then exit;
  if RegQueryStringValue(HKCU32, ProductKey, 'DisplayVersion', V32) then begin
    if not RegQueryStringValue(HKCU32, ProductKey, 'InstallLocation', R32) or (V32 <> V) or (CompareText(R32, R) <> 0) then exit;
  end;
  S := GetIniString('Installation', 'Schema', '', ExpandConstant('{app}\uninstall\instance-binding.ini'));
  R := GetIniString('Installation', 'InstallRoot', '', ExpandConstant('{app}\uninstall\instance-binding.ini'));
  I := GetIniString('Installation', 'Instance', '', ExpandConstant('{app}\uninstall\instance-binding.ini'));
  Result := (S = '1') and (CompareText(R, ExpandConstant('{app}')) = 0) and (CompareText(I, PriorBindingInstance) = 0);
end;

function InitializeSetup: Boolean;
begin
  Result := False;
  if RunningProduct then begin Log('KSESSION_REJECT_RUNNING'); SuppressibleMsgBox(RunningMessage, mbError, MB_OK, IDOK); exit; end;
  UpgradeMode := HasRegistration;
  if UpgradeMode and not ReadUpgradeIdentity then begin
    Log('KSESSION_UPGRADE_REGISTRATION_REJECTED');
    SuppressibleMsgBox('现有安装登记缺失、冲突或损坏，无法安全升级。不会修改现有程序或数据。', mbError, MB_OK, IDOK); exit;
  end;
  if UpgradeMode and (PriorDisplayVersion = '1.1.0-beta.2') then begin
    Log('KSESSION_REJECT_REGISTERED');
    SuppressibleMsgBox(ExistingMessage, mbError, MB_OK, IDOK); exit;
  end;
  Result := True;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var P, Ancestor, Probe: String; Free, Total: Int64; H: LongWord;
begin
  Result := '';
  ReleaseLocks;
  P := ExpandConstant('{app}');
  if not UpgradeMode then begin
    Result := CheckDataLocation(False); if Result <> '' then exit;
    if not ConfirmDataChoice then begin Log('KSESSION_DATA_SWITCH_UNCONFIRMED'); Result := '未确认使用另一数据位置（不会自动迁移）。'; exit; end;
  end;
  if not SafePath(P) then begin Log('KSESSION_REJECT_PATH'); Result := '安装路径无效、包含重解析点或与数据/系统目录重叠。'; exit; end;
  if UpgradeMode then begin
    if CompareText(P, PriorInstallRoot) <> 0 then begin Log('KSESSION_UPGRADE_ROOT_MISMATCH'); Result := '升级安装目录与原登记不一致，已拒绝。'; exit; end;
  end else begin
    if HasRegistration then begin Result := ExistingMessage; exit; end;
    if FileExists(P) or (DirExists(P) and NonEmpty(P)) then begin Log('KSESSION_REJECT_NONEMPTY'); Result := '目标目录不是空目录，拒绝覆盖未知文件。'; exit; end;
    if FileExists(ExpandConstant('{userdesktop}\K⁺-SESSION.lnk')) or FileExists(ExpandConstant('{userprograms}\K⁺-SESSION.lnk')) then begin Result := '已有同名快捷方式，拒绝覆盖。请确认其来源后再安装。'; exit; end;
  end;
  if RunningProduct then begin Log('KSESSION_REJECT_RUNNING'); Result := RunningMessage; exit; end;
  if not AcquireExistingInstanceLock then begin Log('KSESSION_REJECT_INSTANCE_LOCK'); Result := RunningMessage; exit; end;
  Ancestor := P;
  while not DirExists(Ancestor) do Ancestor := ExtractFileDir(Ancestor);
  if not GetSpaceOnDisk64(Ancestor, Free, Total) then begin Log('KSESSION_REJECT_SPACE_QUERY'); Result := '无法确认可用磁盘空间。'; exit; end;
  if Free < {#RequiredBytes} then begin Log('KSESSION_REJECT_SPACE'); Result := '磁盘可用空间不足，未安装程序。'; exit; end;
  { DateSeparator and TimeSeparator are Char, never empty string variants. }
  Probe := AddBackslash(Ancestor) + 'ksession-write-probe-' + GetDateTimeString('yyyymmddhhnnss', '-', ':') + '.tmp';
  H := CreateFileW(Probe, $40000000, 0, 0, 1, $04000100, 0); { CREATE_NEW, delete-on-close }
  if H = $FFFFFFFF then begin Log('KSESSION_REJECT_WRITE'); Result := '当前用户没有目录写入权限。不会请求管理员权限。'; exit; end;
  CloseHandle(H);
  if UpgradeMode then begin
    if not RunUpgradeGate then begin Log('KSESSION_UPGRADE_PREFLIGHT_REJECTED'); Result := '现有安装、数据绑定或业务实例未通过安全升级检查；未修改现有程序或数据。'; exit; end;
    if not PrepareUpgradeTransaction then begin Log('KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED'); Result := '无法建立可恢复升级事务；未修改现有程序或数据。'; exit; end;
  end;
  Log('KSESSION_PREINSTALL_READY');
end;

procedure EnsureAbsent(Rel: String);
begin
  if FileExists(ExpandConstant('{app}\program\') + Rel) or DirExists(ExpandConstant('{app}\program\') + Rel) then RaiseException('目标文件在检查后出现，拒绝覆盖。');
end;

procedure BeforeUpgradeCopy(Rel: String);
begin
#ifdef FaultCopy
  if UpgradeMode and not FaultCopyIssued then begin
    FaultCopyIssued := True;
    Log('KSESSION_FIXTURE_COPY_FAILURE: ' + Rel);
    RaiseException('受控复制故障。');
  end;
#endif
end;

procedure VerifyInstalled;
begin
#include AddBackslash(Generated) + "verify.iss"
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    if UpgradeMode then begin
      if not RunNode('upgrade-transaction-cli.cjs', 'commit "' + UpgradePlan + '"') then
        RaiseException('升级提交失败；旧程序恢复结果请查看安装日志。');
      TransactionSwapped := True;
    end;
    VerifyInstalled;
#ifdef FaultPostCopy
    if UpgradeMode then begin
      Log('KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE');
      RaiseException('受控安装后校验故障。');
    end;
#endif
    if (not UpgradeMode) and (CheckDataLocation(True) <> '') then RaiseException('无法准备所选数据位置；不会改写已有数据。');
    if (not UpgradeMode) and not WriteFreshInstallState then RaiseException('无法保存安装状态。');
    if not RegWriteStringValue(HKCU64, BindingKey, 'InstallRoot', ExpandConstant('{app}')) or
       not RegWriteStringValue(HKCU64, BindingKey, 'Instance', BetaInstance) then RaiseException('无法记录上次数据位置。');
    if UpgradeMode then begin
      if not FileExists(ExpandConstant('{userdesktop}\K⁺-SESSION.lnk')) or
         not FileExists(ExpandConstant('{userprograms}\K⁺-SESSION.lnk')) then
        RaiseException('升级后的快捷方式验证失败。');
      if not VerifyFinalRegistration then RaiseException('升级后的安装登记或数据绑定验证失败。');
      if not RunNode('upgrade-transaction-cli.cjs', 'finalize "' + UpgradePlan + '"') then
        RaiseException('升级终态验证失败；将尝试恢复旧程序。');
      TransactionFinalized := True;
      Log('KSESSION_UPGRADE_TRANSACTION_COMMITTED');
    end;
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

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var P: String; Attr, ErrorCode: LongWord;
begin
  if CurUninstallStep <> usUninstall then exit;
  P := ExpandConstant('{app}\uninstall\install-state.json');
  if not SafeDirectoryChain(ExtractFileDir(P)) then begin
    Log('KSESSION_UNINSTALL_STATE_REJECTED');
    RaiseException('安装状态目录异常，拒绝删除。');
  end;
  Attr := GetFileAttributesW(P);
  if Attr = $FFFFFFFF then begin
    ErrorCode := GetLastErrorCode;
    if (ErrorCode = 2) or (ErrorCode = 3) then exit; { file/path not found }
    Log('KSESSION_UNINSTALL_STATE_REJECTED');
    RaiseException('无法检查安装状态文件，拒绝继续卸载。');
  end;
  if ((Attr and $400) <> 0) or ((Attr and $10) <> 0) then begin
    Log('KSESSION_UNINSTALL_STATE_REJECTED');
    RaiseException('安装状态文件异常，拒绝删除。');
  end;
  if not DeleteFile(P) then begin
    Log('KSESSION_UNINSTALL_STATE_DELETE_FAILED');
    RaiseException('无法删除安装状态文件。');
  end;
  Log('KSESSION_UNINSTALL_STATE_REMOVED');
end;

procedure DeinitializeSetup;
begin
  if UpgradeMode and TransactionPrepared and not TransactionFinalized then begin
    if RunNode('upgrade-transaction-cli.cjs', 'rollback "' + UpgradePlan + '"') then begin
      Log('KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK');
    end else Log('KSESSION_UPGRADE_ROLLBACK_FAILED');
    { commit may already have completed its filesystem rollback and removed the journal }
    RestoreUpgradeRegistration;
  end;
  ReleaseLocks;
end;
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
