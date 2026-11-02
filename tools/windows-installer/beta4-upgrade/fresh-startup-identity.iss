{ Fresh-only target identity and exact producer-object recovery.
  Unknown APIs, aliases and close failures reject. }
type
  TFreshFileId128 = record V0, V1, F0, F1, F2, F3: LongWord; end;
  TFreshAttributeTag = record Attributes, ReparseTag: LongWord; end;
  TFreshDirectoryPins = array[0..63] of LongWord;
  TFreshRenameInfo32 = record
    ReplaceIfExists, RootDirectory, FileNameBytes: LongWord;
    FileName: array[0..32767] of Char;
  end;
var
  FreshTargetReference: LongWord;
  FreshTargetRejected: Boolean;
  FreshTargetFailureStage: String;
  FreshTargetId, FreshTargetParentId: TFreshFileId128;
  FreshTargetLogical, FreshTargetPhysical, FreshTargetLogicalDevice, FreshTargetPhysicalDevice: String;
  FreshStartupReference: LongWord;
  FreshStartupOwnerId, FreshStartupParentId: TFreshFileId128;
  FreshStartupOwnerHash, FreshStartupOwnerPhysical, FreshStartupOwnerLogicalDevice, FreshStartupOwnerPhysicalDevice: String;
  FreshStartupOwnerPins: TFreshDirectoryPins;
  FreshStartupOwnerPinCount: Integer;

function FreshFileIdInfo(H: LongWord; C: Integer; var I: TFreshFileId128; N: LongWord): Boolean;
external 'GetFileInformationByHandleEx@kernel32.dll stdcall';
function FreshAttributeInfo(H: LongWord; C: Integer; var I: TFreshAttributeTag; N: LongWord): Boolean;
external 'GetFileInformationByHandleEx@kernel32.dll stdcall';
function FreshLongPath(P, Buffer: String; N: LongWord): LongWord;
external 'GetLongPathNameW@kernel32.dll stdcall';
function FreshFinalPath(H: LongWord; Buffer: String; N, Flags: LongWord): LongWord;
external 'GetFinalPathNameByHandleW@kernel32.dll stdcall';
function FreshQueryDevice(Name, Buffer: String; N: LongWord): LongWord;
external 'QueryDosDeviceW@kernel32.dll stdcall';
function FreshRenameHandle(H: LongWord; C: Integer; var Info: TFreshRenameInfo32; N: LongWord): Boolean;
external 'SetFileInformationByHandle@kernel32.dll stdcall';
function FreshDisposeHandle(H: LongWord; C: Integer; var DeleteFlag: Byte; N: LongWord): Boolean;
external 'SetFileInformationByHandle@kernel32.dll stdcall';
function FreshCurrentProcess: LongWord;
external 'GetCurrentProcess@kernel32.dll stdcall';
function FreshWow64(H: LongWord; var Value: LongWord): Boolean;
external 'IsWow64Process@kernel32.dll stdcall';

function FreshSameId(A, B: TFreshFileId128): Boolean;
begin
  Result := (A.V0 = B.V0) and (A.V1 = B.V1) and
    (A.F0 = B.F0) and (A.F1 = B.F1) and (A.F2 = B.F2) and (A.F3 = B.F3) and
    ((A.V0 <> 0) or (A.V1 <> 0)) and
    ((A.F0 <> 0) or (A.F1 <> 0) or (A.F2 <> 0) or (A.F3 <> 0));
end;

function FreshReadId(H: LongWord; Directory: Boolean; var I: TFreshFileId128): Boolean;
var A: TFreshAttributeTag;
begin
  Result := False;
  if not FreshAttributeInfo(H, 9, A, 8) then exit;
  if (A.Attributes and $400) <> 0 then exit;
  if Directory <> ((A.Attributes and $10) <> 0) then exit;
  if not FreshFileIdInfo(H, 18, I, 24) then exit;
  Result := FreshSameId(I, I);
end;

function FreshDevice(P: String; var Device: String): Boolean;
var B: String; N: LongWord; I: Integer;
begin
  Result := False; Device := '';
  if (Length(P) < 3) or (Copy(P, 2, 2) <> ':\') then exit;
  B := StringOfChar(#0, 32768); N := FreshQueryDevice(Copy(P, 1, 2), B, 32768);
  if (N = 0) or (N >= 32768) then exit;
  for I := 1 to Length(B) do if B[I] = #0 then begin
    Device := Copy(B, 1, I - 1); Result := Device <> ''; exit;
  end;
end;

function FreshPhysicalDevice(P: String; var Device: String): Boolean;
var I: Integer; Tail: String;
begin
  Result := False;
  if not FreshDevice(P, Device) then exit;
  if Copy(Device, 1, 22) <> '\Device\HarddiskVolume' then exit;
  Tail := Copy(Device, 23, Length(Device)); if Tail = '' then exit;
  for I := 1 to Length(Tail) do if (Tail[I] < '0') or (Tail[I] > '9') then exit;
  Result := True;
end;

function FreshHandlePath(H: LongWord; var P: String): Boolean;
var B: String; N: LongWord;
begin
  Result := False; P := ''; B := StringOfChar(#0, 32768);
  N := FreshFinalPath(H, B, 32768, 0);
  if (N = 0) or (N >= 32768) then exit;
  P := Copy(B, 1, N);
  if Copy(P, 1, 4) <> '\\?\' then exit;
  P := Copy(P, 5, Length(P));
  Result := (Length(P) >= 3) and (Copy(P, 2, 2) = ':\') and
    (CompareText(ExpandFileName(P), P) = 0);
end;

function FreshClosePins(var Pins: TFreshDirectoryPins; var Count: Integer): Boolean;
begin
  Result := True;
  while Count > 0 do begin
    Count := Count - 1;
    if not CloseHandle(Pins[Count]) then Result := False;
    Pins[Count] := 0;
  end;
end;

function FreshPinDirectories(P: String; var Pins: TFreshDirectoryPins; var Count: Integer): Boolean;
var H: LongWord; I: TFreshFileId128; Q: String;
begin
  Result := False; Count := 0;
  if not FreshSafeDirectoryChain(P) then exit;
  P := RemoveBackslashUnlessRoot(P);
  while True do begin
    if Count >= 64 then exit;
    H := CreateFileW(P, $80, 3, 0, 3, $02200000, 0);
    if H = $FFFFFFFF then exit;
    Pins[Count] := H; Count := Count + 1;
    if not FreshReadId(H, True, I) then exit;
    if Length(P) = 3 then break;
    Q := ExtractFileDir(P); if Q = P then exit; P := Q;
  end;
  Result := True;
end;

function FreshCanonicalLongFile(P: String; var Canonical: String): Boolean;
var B: String; N: LongWord; I: Integer;
begin
  Result := False; Canonical := '';
  if (Length(P) < 4) or (Copy(P, 2, 2) <> ':\') or (Pos(#0, P) <> 0) or
    (Pos('\.\', P) <> 0) or (Pos('\..\', P) <> 0) then exit;
  if (P[Length(P)] = '.') or (P[Length(P)] = ' ') or
    (Pos(':', Copy(P, 3, Length(P))) <> 0) or (Pos('*', P) <> 0) or (Pos('?', P) <> 0) then exit;
  for I := 4 to Length(P) do
    if (P[I] = '\') and ((P[I-1] = '.') or (P[I-1] = ' ')) then exit;
  B := StringOfChar(#0, 32768); N := FreshLongPath(P, B, 32768);
  if (N = 0) or (N >= 32768) then exit;
  Canonical := Copy(B, 1, N);
  Result := (CompareText(ExtractFileDrive(Canonical), ExtractFileDrive(P)) = 0) and
    (CompareText(ExpandFileName(Canonical), Canonical) = 0) and
    FreshSafeDirectoryChain(ExtractFileDir(Canonical));
end;

function FreshReleaseTrustedStartupTarget: Boolean;
begin
  Result := True;
  if FreshTargetReference <> 0 then begin
    Result := CloseHandle(FreshTargetReference); FreshTargetReference := 0;
  end;
  FreshTargetLogical := ''; FreshTargetPhysical := '';
  FreshTargetRejected := False;
end;

function FreshBindTrustedStartupTarget: Boolean;
var E, P, LD, PD, NowDevice: String; R, M: LongWord;
    I, J, Parent: TFreshFileId128; Pins, PhysicalPins: TFreshDirectoryPins; Count, PhysicalCount: Integer;
begin
  Result := False; R := 0; M := 0; Count := 0; PhysicalCount := 0;
  FreshTargetFailureStage := 'TRUSTED_REFERENCE';
  try
    if FreshTargetRejected then exit;
    FreshTargetFailureStage := 'PATH_CHECK';
    if not FreshCanonicalLongFile(ExpandConstant('{app}\program\K-SESSION.exe'), E) then exit;
    if CompareText(ExtractFileName(E), 'K-SESSION.exe') <> 0 then exit;
    if FreshTargetReference <> 0 then begin
      FreshTargetFailureStage := 'TRUSTED_REFERENCE';
      if (CompareText(E, FreshTargetLogical) <> 0) or
        not FreshReadId(FreshTargetReference, False, I) or not FreshSameId(I, FreshTargetId) or
        not FreshHandlePath(FreshTargetReference, P) or (CompareText(P, FreshTargetPhysical) <> 0) then exit;
      FreshTargetFailureStage := 'MAPPING';
      if not FreshDevice(E, NowDevice) or (NowDevice <> FreshTargetLogicalDevice) then exit;
      if not FreshPhysicalDevice(P, NowDevice) or (NowDevice <> FreshTargetPhysicalDevice) then exit;
      Result := True; exit;
    end;
    FreshTargetFailureStage := 'MAPPING';
    if not FreshDevice(E, LD) then exit;
    FreshTargetFailureStage := 'FILE_IDENTITY';
    if not FreshPinDirectories(ExtractFileDir(E), Pins, Count) then exit;
    if not FreshReadId(Pins[0], True, Parent) then exit;
    R := CreateFileW(E, $80000000, 1, 0, 3, $00200000, 0);
    if R = $FFFFFFFF then begin R := 0; exit; end;
    if not FreshReadId(R, False, I) or not FreshHandlePath(R, P) or not FreshPhysicalDevice(P, PD) then exit;
    if not FreshPinDirectories(ExtractFileDir(P), PhysicalPins, PhysicalCount) or
      not FreshReadId(PhysicalPins[0], True, J) or not FreshSameId(Parent, J) then exit;
    FreshTargetFailureStage := 'HASH';
    if GetSHA256OfFile(P) <> '{#LauncherSha256}' then exit;
    { Retained data-read access, not a metadata-only handle: continuously deny writes.
      Fresh install/failed-install only; legacy uninstall target policy is unchanged. }
    FreshTargetFailureStage := 'TRUSTED_REFERENCE';
    M := CreateFileW(E, $80000000, 5, 0, 3, $00200000, 0);
    if M = $FFFFFFFF then begin M := 0; exit; end;
    if not FreshReadId(M, False, J) or not FreshSameId(I, J) then exit;
    FreshTargetFailureStage := 'MAPPING';
    if not FreshDevice(E, NowDevice) or (NowDevice <> LD) then exit;
    if not FreshPhysicalDevice(P, NowDevice) or (NowDevice <> PD) then exit;
    if not CloseHandle(R) then begin FreshTargetFailureStage := 'HANDLE_CLEANUP'; R := 0; exit; end; R := 0;
    FreshTargetReference := M; M := 0; FreshTargetId := I; FreshTargetParentId := Parent;
    FreshTargetLogical := E; FreshTargetPhysical := P;
    FreshTargetLogicalDevice := LD; FreshTargetPhysicalDevice := PD; Result := True;
  finally
    if (R <> 0) and not CloseHandle(R) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if (M <> 0) and not CloseHandle(M) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if not FreshClosePins(PhysicalPins, PhysicalCount) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if not FreshClosePins(Pins, Count) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if not Result then begin
      if FreshTargetReference <> 0 then
        if not CloseHandle(FreshTargetReference) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
      FreshTargetReference := 0; FreshTargetRejected := True;
    end;
  end;
end;

function FreshTrustedStartupTarget(Actual: String): Boolean;
var Expected, E, A, EP, AP, ED, AD, PD, NowDevice: String;
    EH, AH, RH, ARH: LongWord; EI, AI, EDir, ADir, Again: TFreshFileId128;
    ECount, ACount, PCount: Integer; EPins, APins, PPins: TFreshDirectoryPins;
begin
  Result := False; EH := 0; AH := 0; RH := 0; ARH := 0; ECount := 0; ACount := 0; PCount := 0;
  Expected := ExpandConstant('{app}\program\K-SESSION.exe');
  FreshTargetFailureStage := 'PATH_CHECK';
  try
    if not FreshCanonicalLongFile(Expected, E) or not FreshCanonicalLongFile(Actual, A) then exit;
    if not FreshBindTrustedStartupTarget then exit;
    FreshTargetFailureStage := 'PATH_CHECK';
    if CompareText(ExtractFileName(E), 'K-SESSION.exe') <> 0 then exit;
    if CompareText(ExtractFileName(A), ExtractFileName(E)) <> 0 then exit;
    FreshTargetFailureStage := 'MAPPING';
    if not FreshDevice(E, ED) or not FreshDevice(A, AD) then exit;
    FreshTargetFailureStage := 'FILE_IDENTITY';
    if not FreshPinDirectories(ExtractFileDir(E), EPins, ECount) or
       not FreshPinDirectories(ExtractFileDir(A), APins, ACount) then exit;
    if not FreshReadId(EPins[0], True, EDir) or not FreshReadId(APins[0], True, ADir) or
       not FreshSameId(EDir, ADir) or not FreshSameId(EDir, FreshTargetParentId) then exit;
    EH := CreateFileW(E, $80000000, 1, 0, 3, $00200000, 0); if EH = $FFFFFFFF then begin EH := 0; exit; end;
    AH := CreateFileW(A, $80000000, 1, 0, 3, $00200000, 0); if AH = $FFFFFFFF then begin AH := 0; exit; end;
    if not FreshReadId(EH, False, EI) or not FreshReadId(AH, False, AI) or not FreshSameId(EI, AI) then exit;
    if not FreshSameId(EI, FreshTargetId) then exit;
    if not FreshHandlePath(EH, EP) or not FreshHandlePath(AH, AP) or (CompareText(EP, AP) <> 0) then exit;
    if not FreshPhysicalDevice(EP, PD) then exit;
    if not FreshPinDirectories(ExtractFileDir(EP), PPins, PCount) or
       not FreshReadId(PPins[0], True, Again) or not FreshSameId(EDir, Again) then exit;
    { Only the expected drive spelling or its proved physical drive is accepted. }
    FreshTargetFailureStage := 'MAPPING';
    if (CompareText(ExtractFileDrive(A), ExtractFileDrive(E)) <> 0) and
       (CompareText(ExtractFileDrive(A), ExtractFileDrive(EP)) <> 0) then exit;
    FreshTargetFailureStage := 'TRUSTED_REFERENCE';
    if CompareText(EP, FreshTargetPhysical) <> 0 then exit;
    FreshTargetFailureStage := 'HASH';
    if GetSHA256OfFile(EP) <> '{#LauncherSha256}' then exit;
    FreshTargetFailureStage := 'FILE_IDENTITY';
    RH := CreateFileW(Expected, $80000000, 1, 0, 3, $00200000, 0); if RH = $FFFFFFFF then begin RH := 0; exit; end;
    if not FreshReadId(RH, False, Again) or not FreshSameId(EI, Again) then exit;
    ARH := CreateFileW(Actual, $80000000, 1, 0, 3, $00200000, 0); if ARH = $FFFFFFFF then begin ARH := 0; exit; end;
    if not FreshReadId(ARH, False, Again) or not FreshSameId(EI, Again) then exit;
    FreshTargetFailureStage := 'MAPPING';
    if not FreshDevice(E, NowDevice) or (NowDevice <> ED) then exit;
    if not FreshDevice(A, NowDevice) or (NowDevice <> AD) then exit;
    if not FreshPhysicalDevice(EP, NowDevice) or (NowDevice <> PD) then exit;
    FreshTargetFailureStage := 'PATH_CHECK';
    if not FreshSafeDirectoryChain(ExtractFileDir(E)) or not FreshSafeDirectoryChain(ExtractFileDir(A)) then exit;
    Result := True;
  finally
    if (RH <> 0) and not CloseHandle(RH) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if (ARH <> 0) and not CloseHandle(ARH) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if (AH <> 0) and not CloseHandle(AH) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if (EH <> 0) and not CloseHandle(EH) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if not FreshClosePins(APins, ACount) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if not FreshClosePins(EPins, ECount) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
    if not FreshClosePins(PPins, PCount) then begin Result := False; FreshTargetFailureStage := 'HANDLE_CLEANUP'; end;
  end;
end;

function FreshReleaseStartupOwner: Boolean;
begin
  Result := True;
  if FreshStartupReference <> 0 then begin
    Result := CloseHandle(FreshStartupReference); FreshStartupReference := 0;
  end;
  if not FreshClosePins(FreshStartupOwnerPins, FreshStartupOwnerPinCount) then Result := False;
  FreshStartupOwnerHash := ''; FreshStartupOwnerPhysical := '';
end;

function FreshPrepareStartupOwner: Boolean;
var P, Parent: String;
begin
  Result := False;
  if (FreshStartupReference <> 0) or (FreshStartupOwnerPinCount <> 0) then exit;
  P := FreshStartupPath;
  if not FreshStartupAbsent or not FreshDevice(P, FreshStartupOwnerLogicalDevice) then exit;
  if not FreshPinDirectories(ExtractFileDir(P), FreshStartupOwnerPins, FreshStartupOwnerPinCount) then exit;
  if not FreshReadId(FreshStartupOwnerPins[0], True, FreshStartupParentId) or
    not FreshHandlePath(FreshStartupOwnerPins[0], Parent) or
    not FreshPhysicalDevice(Parent, FreshStartupOwnerPhysicalDevice) then exit;
  FreshStartupOwnerPhysical := AddBackslash(Parent) + ExtractFileName(P);
  Result := True;
end;

function FreshCaptureStartupProducer(Tmp: String): Boolean;
var R, M: LongWord; I, J: TFreshFileId128; Path, Device, NowDevice, Hash: String;
    Pins: TFreshDirectoryPins; Count: Integer;
begin
  Result := False; R := 0; M := 0; Count := 0;
  try
    if (FreshStartupReference <> 0) or (FreshStartupOwnerPinCount = 0) then exit;
    if not FreshSafeDirectoryChain(ExtractFileDir(Tmp)) then exit;
    R := CreateFileW(Tmp, $80000000, 1, 0, 3, $00200000, 0);
    if R = $FFFFFFFF then begin R := 0; exit; end;
    if not FreshReadId(R, False, I) or not FreshHandlePath(R, Path) or
      not FreshPhysicalDevice(Path, Device) then exit;
    if not FreshPinDirectories(ExtractFileDir(Path), Pins, Count) then exit;
    Hash := GetSHA256OfFile(Path); if Hash = '' then exit;
    M := CreateFileW(Tmp, $80000000, 5, 0, 3, $00200000, 0);
    if M = $FFFFFFFF then begin M := 0; exit; end;
    if not FreshReadId(M, False, J) or not FreshSameId(I, J) then exit;
    if not FreshPhysicalDevice(Path, NowDevice) or (NowDevice <> Device) then exit;
    if not CloseHandle(R) then begin R := 0; exit; end; R := 0;
    FreshStartupReference := M; M := 0; FreshStartupOwnerId := I; FreshStartupOwnerHash := Hash;
    FreshStartupHash := Hash; Result := True;
  finally
    if (R <> 0) and not CloseHandle(R) then Result := False;
    if (M <> 0) and not CloseHandle(M) then Result := False;
    if not FreshClosePins(Pins, Count) then Result := False;
    if not Result then if not FreshReleaseStartupOwner then Result := False;
  end;
end;

function FreshMoveStartupProducer(Tmp: String): Boolean;
var D, Wow: LongWord; I: TFreshFileId128; Info: TFreshRenameInfo32;
    P, NowDevice: String; N, Index: Integer;
begin
  Result := False; D := 0; Wow := 0;
  try
    { Existing pinned Inno 6.7.3 engine is PE32 on required x64 Windows.
      Reject another ABI instead of applying an incorrectly aligned native record. }
    if not FreshWow64(FreshCurrentProcess, Wow) or (Wow <> 1) then exit;
    if (FreshStartupReference = 0) or not FreshStartupAbsent then exit;
    if not FreshDevice(FreshStartupPath, NowDevice) or (NowDevice <> FreshStartupOwnerLogicalDevice) then exit;
    if not FreshReadId(FreshStartupReference, False, I) or not FreshSameId(I, FreshStartupOwnerId) then exit;
    D := CreateFileW(Tmp, $10080, 5, 0, 3, $00200000, 0);
    if D = $FFFFFFFF then begin D := 0; exit; end;
    if not FreshReadId(D, False, I) or not FreshSameId(I, FreshStartupOwnerId) then exit;
    P := FreshStartupPath; N := Length(P); if (N = 0) or (N > 32767) then exit;
    Info.ReplaceIfExists := 0; Info.RootDirectory := 0; Info.FileNameBytes := N * 2;
    for Index := 1 to N do Info.FileName[Index-1] := P[Index];
    if not FreshRenameHandle(D, 3, Info, 12 + N * 2) then exit;
    FreshStartupCreated := True; { native move happened even if a later proof/close fails }
    FreshStartupStage('LINK_MOVED');
    if not FreshHandlePath(FreshStartupReference, P) or (CompareText(P, FreshStartupOwnerPhysical) <> 0) then exit;
    if not FreshDevice(FreshStartupPath, NowDevice) or (NowDevice <> FreshStartupOwnerLogicalDevice) then exit;
    Result := True;
  finally
    if (D <> 0) and not CloseHandle(D) then Result := False;
  end;
end;

function FreshRemoveOwnedStartup: Boolean;
var D, HashPin: LongWord; I, Parent: TFreshFileId128; P, Device: String; Flag: Byte;
    Pins: TFreshDirectoryPins; Count: Integer;
begin
  Result := False; D := 0; HashPin := 0; Count := 0;
  try
    if (FreshStartupReference = 0) or (FreshStartupOwnerHash = '') then exit;
    if not FreshReadId(FreshStartupReference, False, I) or not FreshSameId(I, FreshStartupOwnerId) then exit;
    if not FreshDevice(FreshStartupPath, Device) or (Device <> FreshStartupOwnerLogicalDevice) then exit;
    if not FreshPhysicalDevice(FreshStartupOwnerPhysical, Device) or (Device <> FreshStartupOwnerPhysicalDevice) then exit;
    if not FreshPinDirectories(ExtractFileDir(FreshStartupPath), Pins, Count) or
      not FreshReadId(Pins[0], True, Parent) or not FreshSameId(Parent, FreshStartupParentId) then exit;
    HashPin := CreateFileW(FreshStartupPath, $80000000, 1, 0, 3, $00200000, 0);
    if HashPin = $FFFFFFFF then begin HashPin := 0; exit; end;
    if not FreshReadId(HashPin, False, I) or not FreshSameId(I, FreshStartupOwnerId) or
      not FreshHandlePath(HashPin, P) or (CompareText(P, FreshStartupOwnerPhysical) <> 0) then exit;
    if GetSHA256OfFile(P) <> FreshStartupOwnerHash then exit;
    if not CloseHandle(HashPin) then begin HashPin := 0; exit; end; HashPin := 0;
    D := CreateFileW(FreshStartupPath, $10080, 5, 0, 3, $00200000, 0);
    if D = $FFFFFFFF then begin D := 0; exit; end;
    if not FreshReadId(D, False, I) or not FreshSameId(I, FreshStartupOwnerId) then exit;
    if not FreshHandlePath(D, P) or (CompareText(P, FreshStartupOwnerPhysical) <> 0) then exit;
    { The producer's uninterrupted GENERIC_READ reference denies all content writes.
      Deletion acts on the checked original object, never on a later path replacement. }
    Flag := 1;
    if not FreshDisposeHandle(D, 4, Flag, 1) then exit;
    if not CloseHandle(D) then begin D := 0; exit; end; D := 0;
    if not FreshReleaseStartupOwner then exit;
    Result := FreshStartupAbsent;
  finally
    if (HashPin <> 0) and not CloseHandle(HashPin) then Result := False;
    if (D <> 0) and not CloseHandle(D) then Result := False;
    if not FreshClosePins(Pins, Count) then Result := False;
  end;
end;
