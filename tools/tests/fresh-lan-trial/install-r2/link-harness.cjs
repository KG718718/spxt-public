'use strict';
// Source-only generator. Executing the generated driver requires Master safety review.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../../..');
function extract(source,name){
 const header=new RegExp('^(?:function|procedure) '+name+'(?:[(:;])','gm'),matches=[...source.matchAll(header)];assert.equal(matches.length,1,'unique reviewed routine: '+name);const start=matches[0].index;let depth=0,started=false;
 const tokens=/\{[^]*?\}|\(\*[^]*?\*\)|\/\/[^\n]*|'(?:''|[^'])*'|\b[A-Za-z_][A-Za-z0-9_]*\b/g;tokens.lastIndex=start;
 for(let m;(m=tokens.exec(source));){if(!/^[A-Za-z_]/.test(m[0]))continue;const word=m[0].toLowerCase();if(['begin','try','case'].includes(word)){started=true;depth++;}else if(word==='end'&&started&&--depth===0){let end=tokens.lastIndex;assert.equal(source[end],';');return source.slice(start,end+1);}}
 throw Error('balanced reviewed routine required');
}
function generate(root,launcherHash='762ed3eafcb6bf5b3bb6b176094771c21e8308f9bd86476a9f395e006482c96c',aliases=['R:','S:']){
 assert.match(root,/^E:\\CodexWorkspace\\outputs\\fresh-install-r2-link-[a-f0-9]{32}$/);assert.ok(!root.includes("'"));
 const source=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/setup-beta4.iss'),'utf8').replace(/\r\n/g,'\n');
 const names=['FreshStartupStage','FreshSafeDirectoryChain','FreshStartupPath','FreshFileAbsent','FreshStartupAbsent','FreshStartupMatches','CreateFreshStartup'];
 assert.match(launcherHash,/^[a-f0-9]{64}$/);
 assert.equal(aliases.length,2);for(const alias of aliases)assert.match(alias,/^[R-Z]:$/);assert.notEqual(aliases[0],aliases[1]);
 const identity=fs.readFileSync(path.join(repo,'tools/windows-installer/beta4-upgrade/fresh-startup-identity.iss'),'utf8').replace(/\r\n/g,'\n');
 const body=names.map(n=>extract(source,n));body.splice(5,0,identity);const deinit=extract(source,'DeinitializeSetup');const fresh=deinit.match(/#ifdef FreshTrial\n([^]*?)#endif/);assert.ok(fresh);
 const fragments=body.join('\n\n')+'\nprocedure HarnessCleanup;\nbegin\n'+fresh[1]+'end;\n';
 const mapped=fragments.replace(/\bExpandConstant\(/g,'HarnessConstant(');
 const code=`#define LauncherSha256 "${launcherHash}"
[Setup]
AppName=Owned Inno COM Link Contract Test
AppVersion=1
AppId=KSESSION-Owned-Link-Contract-Only
DefaultDirName=${root}\\never-installed
CreateAppDir=no
Uninstallable=no
CreateUninstallRegKey=no
PrivilegesRequired=lowest
DisableStartupPrompt=yes
OutputDir=${root}\\driver
OutputBaseFilename=owned-link-contract
Compression=none
[Code]
var CaseRoot, BetaInstance: String; FreshStartupHash, FreshStartupContext, FreshStartupLastContext, FreshStartupLastStage, FreshStartupFirstFailureContext, FreshStartupFirstFailureStage, FreshStartupCleanupFailureStage: String; FreshStartupCleanupVerified: Boolean; FreshStartupCreated, FreshInstallCompleted: Boolean;
function GetFileAttributesW(Name: String): LongWord;
external 'GetFileAttributesW@kernel32.dll stdcall';
function CreateFileW(Name: String; Access, Share, Security, Creation, Flags, Template: LongWord): LongWord;
external 'CreateFileW@kernel32.dll stdcall';
function CloseHandle(H: LongWord): Boolean;
external 'CloseHandle@kernel32.dll stdcall';
function DLLGetLastError: LongWord;
external 'GetLastError@kernel32.dll stdcall';
function MoveFileW(Existing, NewName: String): Boolean;
external 'MoveFileW@kernel32.dll stdcall';
function HarnessConstant(Value: String): String;
begin
 Result := '';
 if Value = '{userstartup}' then Result := CaseRoot+'\\startup'
 else if Value = '{userstartup}\\K-SESSION Fresh Trial.lnk' then Result := CaseRoot+'\\startup\\K-SESSION Fresh Trial.lnk'
 else if Value = '{tmp}\\ksession-fresh-startup.lnk' then Result := CaseRoot+'\\temp\\ksession-fresh-startup.lnk'
 else if Value = '{app}\\program\\K-SESSION.exe' then Result := CaseRoot+'\\app\\program\\K-SESSION.exe'
 else if Value = '{app}\\program' then Result := CaseRoot+'\\app\\program'
 else if Value = '{app}\\uninstall\\fresh-startup.ini' then Result := CaseRoot+'\\app\\uninstall\\fresh-startup.ini'
 else RaiseException('HARNESS_CONSTANT_REJECTED');
end;
${mapped}
function HarnessBoolean(Value: Boolean): String;
begin if Value then Result:='true' else Result:='false'; end;
${fs.readFileSync(path.join(__dirname,'target-matrix.iss.in'),'utf8').replaceAll('@OWNED_ROOT@',root).replaceAll('@ALIAS@',aliases[0]).replaceAll('@OTHER_ALIAS@',aliases[1])}
${fs.readFileSync(path.join(__dirname,'link-matrix.iss.in'),'utf8').replaceAll('@OWNED_ROOT@',root).replace(/\bB\(/g,'HarnessBoolean(').replace(/function CreateFileW[^]*?external 'CloseHandle@kernel32\.dll stdcall';/,'')}
`;
 return {code,manifest:{schema:2,kind:'OWNED_INNO_COM_SOURCE',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),identityIncludeSha256:crypto.createHash('sha256').update(identity).digest('hex'),fragmentsSha256:crypto.createHash('sha256').update(fragments).digest('hex'),functions:names,constantMappingOnly:true,includesFreshDeinitializeBranch:true,registration:false,realStartup:false,productExecution:false}};
}
module.exports={extract,generate};if(require.main===module){const root=process.argv[2];assert.equal(process.argv.length,3);const marker=JSON.parse(fs.readFileSync(path.join(root,'.owned-link-driver.json')));assert.equal(marker.kind,'OWNED_LINK_DRIVER');const generated=generate(root,undefined,marker.aliases);assert.deepEqual([...generated.code.matchAll(/^\[([^\]]+)\]/gm)].map(m=>m[1]),['Setup','Code']);assert.doesNotMatch(generated.code,/\b(?:Exec|ShellExec|RegWrite[A-Za-z]*|RegDelete[A-Za-z]*)\s*\(/i);fs.writeFileSync(path.join(root,'source.iss'),generated.code,{flag:'wx'});fs.writeFileSync(path.join(root,'source-receipt.json'),JSON.stringify(generated.manifest)+'\n',{flag:'wx'});}
