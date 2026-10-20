'use strict';
// Explicit fault injection: the real native close succeeds; only its reported
// return value is changed. This is not evidence of a real OS CloseHandle fault.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {generate,extract}=require('./link-harness.cjs');
function generateCounter(root,aliases){
 const g=generate(root,undefined,aliases);let code=g.code;
 const original=extract(code,'FreshStartupMatches');assert.equal((original.match(/CloseHandle\(Pin\)/g)||[]).length,1);
 code=code.replace(original,original.replace('CloseHandle(Pin)','HarnessInjectedPinClose(Pin)'));
 const wrapper=`var HarnessInjectClose, HarnessActualClose: Boolean;
function HarnessInjectedPinClose(H: LongWord): Boolean;
begin
 Result:=CloseHandle(H);
 if HarnessInjectClose then begin HarnessActualClose:=Result;HarnessInjectClose:=False;Result:=False;end;
end;
`;
 code=code.replace('function FreshStartupMatches(',wrapper+'function FreshStartupMatches(');
 const initialize=extract(code,'InitializeSetup');
 code=code.replace(initialize,`function InitializeSetup: Boolean;
var Accepted, NegativeAccepted, Closed, Proven, NegativeProven: Boolean; WrongHash: String;
begin
 Result:=False;CaseRoot:='${root}\\close-counter';BetaInstance:=CaseRoot+'\\instance';
 ForceDirectories(CaseRoot+'\\startup');ForceDirectories(CaseRoot+'\\temp');ForceDirectories(CaseRoot+'\\app\\program');ForceDirectories(CaseRoot+'\\app\\uninstall');
 if not FileCopy('${root}\\trusted-launcher.exe',HarnessConstant('{app}\\program\\K-SESSION.exe'),True) then RaiseException('COUNTER_COPY_FAILED');
 CreateFreshStartup;HarnessInjectClose:=True;HarnessActualClose:=False;FreshStartupContext:='INSTALL_VERIFY';
 Accepted:=FreshStartupMatches(FreshStartupHash);
 Proven:=not Accepted and HarnessActualClose and not HarnessInjectClose and (FreshStartupLastStage='VERIFY_EXCEPTION') and (FreshStartupFirstFailureStage='VERIFY_EXCEPTION');
 FreshStartupFirstFailureStage:='';FreshStartupFirstFailureContext:='';FreshStartupLastStage:='';FreshStartupContext:='INSTALL_VERIFY';
 WrongHash:='0'+Copy(FreshStartupHash,2,63);if Copy(FreshStartupHash,1,1)='0' then WrongHash:='1'+Copy(FreshStartupHash,2,63);
 HarnessInjectClose:=True;HarnessActualClose:=False;NegativeAccepted:=FreshStartupMatches(WrongHash);
 NegativeProven:=not NegativeAccepted and HarnessActualClose and not HarnessInjectClose and (FreshStartupLastStage='HASH_MISMATCH') and (FreshStartupFirstFailureStage='HASH_MISMATCH');
 Closed:=FreshReleaseStartupOwner;Closed:=FreshReleaseTrustedStartupTarget and Closed;
 SaveStringToFile('${root}\\close-counter.json','{"schema":1,"kind":"CONTROLLED_CLOSE_RETURN_INJECTION","reportedCloseFailureInjected":true,"actualNativeCloseSucceeded":'+HarnessBoolean(HarnessActualClose)+',"accepted":'+HarnessBoolean(Accepted)+',"failureBeforeMatchedProven":'+HarnessBoolean(Proven)+',"priorRejectionPreserved":'+HarnessBoolean(NegativeProven)+',"negativeAccepted":'+HarnessBoolean(NegativeAccepted)+',"remainingHandlesClosed":'+HarnessBoolean(Closed)+',"allPassed":'+HarnessBoolean(Proven and NegativeProven and Closed)+'}',False);
end;`);
 code=code.replace('OutputBaseFilename=owned-link-contract','OutputBaseFilename=owned-close-counter');
 return {code,receipt:{schema:1,kind:'CONTROLLED_CLOSE_RETURN_INJECTION_SOURCE',productionSourceSha256:g.manifest.sourceSha256,identityIncludeSha256:g.manifest.identityIncludeSha256,originalMatchesSha256:crypto.createHash('sha256').update(original).digest('hex'),oneCloseReturnInjection:true,actualNativeCloseStillCalled:true,productInstalled:false}};
}
module.exports={generateCounter};if(require.main===module){const root=process.argv[2],marker=JSON.parse(fs.readFileSync(path.join(root,'.owned-link-driver.json')));assert.equal(marker.kind,'OWNED_LINK_DRIVER');const g=generateCounter(root,marker.aliases);fs.writeFileSync(path.join(root,'close-counter.iss'),g.code,{flag:'wx'});fs.writeFileSync(path.join(root,'close-counter-source.json'),JSON.stringify(g.receipt),{flag:'wx'});}
