'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'../../../..');
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');

test('workflow rebuilds exact beta.1 and supplies a closed fresh plus historical bundle',()=>{
 const y=read('.github/workflows/setup-v3.yml'),rebuild=read('tools/windows-installer/rebuild-beta1.ps1'),source=read('tools/windows-installer/verify-beta1-source.cjs'),verify=read('tools/windows-installer/verify-beta1-build.cjs'),offline=read('tools/windows-installer/offline-ci.ps1');
 for(const marker of ['checkout --detach e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','fresh-identity.cjs','KSESSION_APPROVED_IDENTITY_BUNDLE','KSESSION_BETA1_SETUP'])assert.match(y,new RegExp(marker));
 assert.match(y,/rebuild-beta1\.ps1 -Source E:\/beta1-source -Work E:\/beta1-build/);
 assert.doesNotMatch(y,/beta1-source\/tools\/windows-installer\/ci\.ps1/);
 assert.doesNotMatch(rebuild,/windows-installer\/ci\.ps1|offline-ci\.ps1|TestSetup/);
 for(const marker of ['windows-portable/ci.ps1','windows-installer/toolchain.ps1','windows-installer/build.cjs','verify-beta1-source.cjs','verify-beta1-build.cjs','candidate'])assert.match(rebuild,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','BETA1_SOURCE_TOPLEVEL_MISMATCH','BETA1_SOURCE_COMMIT_MISMATCH','BETA1_SOURCE_TREE_MISMATCH','BETA1_SOURCE_TRACKED_DIRTY','core.autocrlf=false','--untracked-files=no'])assert.match(source,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['K-SESSION-Setup-1.1.0-beta.1.exe','programInventorySha256','historicalGuiRegression','NOT_RUN_BUILD_ONLY'])assert.match(verify,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.ok(y.indexOf('fresh-identity.cjs')>y.indexOf('rebuild-beta1.ps1'));
 assert.match(y,/setup-source\/tools\/windows-installer\/ci\.ps1/);
 assert.match(offline,/\^TestUpgradeLifecycle\$/);
});

test('hosted gate makes file-symlink coverage mandatory and runs both real lifecycles offline',()=>{
 const ci=read('tools/windows-installer/ci.ps1'),offline=read('tools/windows-installer/offline-ci.ps1'),setup=read('.github/workflows/setup-v3.yml'),portable=read('.github/workflows/portable-v2b.yml'),hosted=read('tools/tests/windows-runtime/hosted-gate.cjs');
 assert.match(ci,/KSESSION_REQUIRE_FILE_SYMLINK='1'/);assert.match(ci,/upgrade-preflight\/preflight\.test\.cjs/);
 assert.match(offline,/\^TestSetup\$/);assert.match(offline,/\^TestUpgradeLifecycle\$/);
 assert.match(offline,/taskTick -lt 600/);
 assert.match(setup,/testTotal -ne 742/);assert.match(portable,/testTotal -ne 742/);assert.match(hosted,/testTotal:suites\.reduce/);
});

test('identity stop-loss workflow runs only the exact beta1 identity diagnostic',()=>{
 const workflow=read('.github/workflows/setup-v3.yml'),script=read('tools/windows-installer/identity-diagnostic.ps1'),helper=read('tools/windows-installer/identity-diagnostic.cjs');
 const setup=workflow.slice(workflow.indexOf('  setup:'),workflow.indexOf('  identity:'));
 const identity=workflow.slice(workflow.indexOf('  identity:'),workflow.indexOf('  sequence:'));
 assert.match(workflow,/workflow_dispatch:[\s\S]*mode:[\s\S]*required: false[\s\S]*default: identity[\s\S]*options:[\s\S]*- identity[\s\S]*- sequence[\s\S]*- full/);
 assert.match(setup,/github\.event_name == 'push'[\s\S]*\[identity-diagnostic\][\s\S]*\[sequence-diagnostic\][\s\S]*github\.event_name == 'workflow_dispatch' && inputs\.mode == 'full'/);
 assert.match(identity,/github\.event_name == 'workflow_dispatch' && \(inputs\.mode == '' \|\| inputs\.mode == 'identity'\)/);
 assert.match(workflow,/historical-identity:[\s\S]*if: github\.event_name == 'workflow_dispatch' && inputs\.mode == 'full'/);
 for(const marker of ['workflow_dispatch','persist-credentials: false','rebuild-beta1.ps1','e9417f036d0cdf736ff84682556a994040f0de0b','5da66cb9b73dfa307948634634bfab2cfaaead12','fresh-identity.cjs','identity-diagnostic.ps1','IDENTITY-DIAGNOSTIC.json','Fixed summary only'])assert.match(workflow,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const forbidden of ['windows-installer/ci.ps1','windows-portable/ci.ps1','npm test','hosted-gate.cjs','fault-cancel','testTotal','742'])assert.doesNotMatch(identity,new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const retained of ['tools/windows-installer/ci.ps1','hosted-gate.cjs regression','testTotal -ne 742','fault-cancel'])assert.match(setup,new RegExp(retained.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['github-hosted','Start-Process','Registry64','private-request.json','Remove-Item'])assert.match(script,new RegExp(marker));
 assert.match(script,/\^IDENTITY_\(ACCEPTED\|REGISTRATION\|BINDING\|PATH\|MANIFEST\|PROGRAM\|BUILD\|RUNTIME\|LAUNCHER\|INTERNAL\)\$/);
 assert.doesNotMatch(script,/Write-Output \$taskSnapshot|Write-Output \$taskRequest|Get-Content -LiteralPath \$taskLog/);
 for(const marker of ['safeIdentityReason','IDENTITY_ACCEPTED','IDENTITY_INTERNAL','flag: \'wx\'','PREFLIGHT_OK'])assert.match(helper,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(helper,/console\.error|error\.message|error\.stack|JSON\.stringify\(request/);
});

test('U15-U20 sequence diagnostic is manual, pre-transaction, closed, and does not build current portable or run regression',()=>{
 const workflow=read('.github/workflows/setup-v3.yml'),script=read('tools/windows-installer/sequence-diagnostic.ps1'),pathHelper=read('tools/windows-installer/sequence-diagnostic-path.ps1'),helper=read('tools/windows-installer/sequence-identity.cjs'),build=read('tools/windows-installer/build.cjs'),iss=read('tools/windows-installer/setup.iss'),go=read('tools/windows-launcher/upgrade_windows_test.go');
 const sequence=workflow.slice(workflow.indexOf('  sequence:'),workflow.indexOf('  historical-identity:'));
 assert.match(sequence,/github\.event_name == 'workflow_dispatch' && inputs\.mode == 'sequence'/);
 for(const marker of ['rebuild-beta1.ps1','sequence-diagnostic.ps1','SEQUENCE-DIAGNOSTIC.json','upgrade-sequence-diagnostic-','Fixed sequence summary only','persist-credentials: false'])assert.match(sequence,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const forbidden of ['windows-installer/ci.ps1','windows-portable/ci.ps1','npm test','hosted-gate.cjs','inputs.mode == \'full\'','testTotal','742'])assert.doesNotMatch(sequence,new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['HOSTED_SEQUENCE_DIAGNOSTIC_REQUIRED','sequence-gate','sequence-space','KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC','SEQUENCE-DIAGNOSTIC.json','SEQUENCE_REPORT_UNSAFE'])assert.match(script,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(script,/& \$taskGo test[^\n]*\*> \$null/);
 assert.doesNotMatch(script,/Write-Output|Write-Host|Get-Content[^\n]*(private-request|private-setup|\.log)/i);
 assert.match(script,/sequence-diagnostic-path\.ps1/);assert.match(script,/Test-KSessionFixedEPath/);
 assert.match(pathHelper,/IsPathFullyQualified/);assert.match(pathHelper,/GetPathRoot/);assert.doesNotMatch(pathHelper,/-match|-notmatch/);
 assert.match(build,/payloadCommit=sequenceDiagnostic\?'e9417f036d0cdf736ff84682556a994040f0de0b':commit/);
 assert.match(build,/SEQUENCE DIAGNOSTIC - NEVER DISTRIBUTE OR INSTALL OUTSIDE DISPOSABLE HOST/);
 for(const marker of ['REGISTRATION_COUNT','VERSION_UNSUPPORTED','SNAPSHOT_INVALID','REGISTRATION_CONFLICT','UNINSTALL_METADATA_INVALID','IDENTITY_REGISTRATION_AMBIGUOUS','IDENTITY_REGISTRATION_INCONSISTENT'])assert.match(helper,new RegExp(marker));
 assert.doesNotMatch(helper,/console\.|error\.message|error\.stack|process\.stdout|process\.stderr/);
 const gateStop=iss.indexOf("Log('KSESSION_SEQUENCE_IDENTITY_ACCEPTED')"),transaction=iss.indexOf('if not PrepareUpgradeTransaction');
 assert.ok(gateStop>iss.indexOf('if not RunUpgradeGate')&&transaction>gateStop);
 for(const marker of ['KSESSION_SEQUENCE_REGISTRATION_COUNT','KSESSION_SEQUENCE_REGISTRATION_VERSION','KSESSION_SEQUENCE_REGISTRATION_SNAPSHOT','KSESSION_SEQUENCE_REGISTRATION_CONFLICT','KSESSION_SEQUENCE_REGISTRATION_UNINSTALL','KSESSION_SEQUENCE_REGISTRATION_AMBIGUOUS','KSESSION_SEQUENCE_REGISTRATION_INCONSISTENT'])assert.match(iss,new RegExp(marker));
 for(const marker of ['BASELINE','"AFTER_" + probe.id','U20_PRECOPY','sequencePhases','CONTROLLED_MUTATION'])assert.match(go,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(go,/if sequenceDiagnostic \{\s*fixtures = fixtures\[:1\]/);
});

test('sequence diagnostic executes the fixed E-volume path boundary',()=>{
 const helper=path.join(repo,'tools/windows-installer/sequence-diagnostic-path.ps1').replaceAll("'","''");
 const command=String.raw`. '${helper}';$cases=@(
  @{value='E:\synthetic';want=$true},@{value='E:/synthetic';want=$true},
  @{value='C:\synthetic';want=$false},@{value='E:relative';want=$false},
  @{value='EE:\synthetic';want=$false},@{value='\\server\share';want=$false},
  @{value='\\?\E:\synthetic';want=$false}
 );foreach($case in $cases){if((Test-KSessionFixedEPath $case.value)-ne $case.want){exit 7}};'PATH_CONTRACT_PASS'`;
 const result=cp.spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'PATH_CONTRACT_PASS');assert.equal(result.stderr,'');
});

test('sequence diagnostic entry accepts E paths and rejects other drive prefixes before writes',()=>{
 const script=path.join(repo,'tools/windows-installer/sequence-diagnostic.ps1');
 const env={...process.env,GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',GITHUB_REPOSITORY:'KG718718/spxt-public'};
 const run=values=>cp.spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',script,'-Work',values[0],'-Beta1Build',values[1],'-Bundle',values[2],'-Node',values[3],'-Commit','0'.repeat(40)],{encoding:'utf8',windowsHide:true,env});
 const accepted=run([String.raw`E:\sequence-contract-work`,String.raw`E:\sequence-contract-beta1`,String.raw`E:\sequence-contract-bundle.json`,String.raw`E:\sequence-contract-node.exe`]);
 assert.notEqual(accepted.status,0);assert.match(accepted.stderr,/SEQUENCE_DIAGNOSTIC_INPUT_INVALID/);
 for(const values of [
  [String.raw`C:\sequence-contract-work`,String.raw`E:\beta1`,String.raw`E:\bundle`,String.raw`E:\node`],
  [String.raw`EE:\sequence-contract-work`,String.raw`E:\beta1`,String.raw`E:\bundle`,String.raw`E:\node`],
  ['E:relative',String.raw`E:\beta1`,String.raw`E:\bundle`,String.raw`E:\node`]
 ]){
  const rejected=run(values);assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/FIXED_E_VOLUME_REQUIRED/);
  assert.doesNotMatch(rejected.stderr,/Invalid pattern|Illegal backslash/i);
 }
 assert.doesNotMatch(accepted.stderr,/Invalid pattern|Illegal backslash/i);
});

test('real lifecycle has U01-U30 and all five required recoverable failure fixtures',()=>{
 const go=read('tools/windows-launcher/upgrade_windows_test.go'),build=read('tools/windows-installer/build.cjs'),iss=read('tools/windows-installer/setup.iss'),gate=read('tools/windows-installer/upgrade-gate/index.cjs'),cli=read('tools/windows-installer/upgrade-gate/cli.cjs');
 for(let n=1;n<=30;n++)assert.match(go,new RegExp(`U${String(n).padStart(2,'0')}`));
 for(const mode of ['fault-space','fault-permission','fault-cancel','fault-copy','fault-payload-hash','fault-post-copy'])assert.match(build,new RegExp(mode));
 assert.match(build,/Check: IsUpgradeInstall; BeforeInstall: BeforeUpgradeCopy/);
 assert.match(iss,/procedure BeforeUpgradeCopy\(Rel: String\)/);assert.match(iss,/KSESSION_FIXTURE_COPY_FAILURE/);assert.match(iss,/KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE/);
 for(const marker of ['KSESSION_UPGRADE_ROOT_MISMATCH','KSESSION_REJECT_INSTANCE_LOCK'])assert.match(iss,new RegExp(`Log\\('${marker}'\\)`));
 assert.match(iss,/if RunningProduct then begin Log\('KSESSION_REJECT_RUNNING'\); Result := RunningMessage; exit; end;/);
 assert.match(iss,/function SameInstallRoot\(A, B: String\): Boolean;[\s\S]*Result := CompareText\(RemoveBackslashUnlessRoot\(A\), RemoveBackslashUnlessRoot\(B\)\) = 0;/);
 assert.match(iss,/if not SameInstallRoot\(P, PriorInstallRoot\) then begin Log\('KSESSION_UPGRADE_ROOT_MISMATCH'\)/);
 assert.match(iss,/not SameInstallRoot\(R, ExpandConstant\('\{app\}'\)\)/);
 assert.doesNotMatch(iss,/CompareText\(P, PriorInstallRoot\)/);
 const request=iss.slice(iss.indexOf('function WriteUpgradeRequest'),iss.indexOf('function WriteUpgradePlan'));
 const plan=iss.slice(iss.indexOf('function WriteUpgradePlan'),iss.indexOf('function RunUpgradeGate'));
 for(const block of [request,plan]){
  assert.match(block,/R := RemoveBackslashUnlessRoot\(PriorInstallRoot\)/);
  assert.match(block,/JsonEscape\(R\)/);
 }
 assert.match(request,/"installLocation":"' \+ JsonEscape\(PriorInstallRoot\)/);
 assert.doesNotMatch(request,/"preflight":\{"installRoot":"' \+ JsonEscape\(PriorInstallRoot\)/);
 for(const code of ['ARGUMENT_INVALID','DATA_CONTRACT_UNSUPPORTED','APP_RESOURCE_INVALID','INSTALL_ROOT_INVALID','INSTANCE_NOT_FOUND','INSTANCE_PATH_UNSAFE','INSTANCE_UNREADABLE','BINDING_INVALID','REGISTRATION_CONFLICT','BINDING_CONFLICT','STORE_UNREADABLE','STORE_INVALID','CONFIG_INVALID','ORPHANED_INSTALLATION','STORE_VALIDATION_FAILED','INSTANCE_STRUCTURE_UNSAFE']){
  const marker=`PREFLIGHT_${code}`;assert.match(gate,new RegExp(`'${code}'`));assert.match(cli,new RegExp(marker));assert.match(iss,new RegExp(`KSESSION_UPGRADE_GATE_${marker}`));assert.match(go,new RegExp(`KSESSION_UPGRADE_GATE_${marker}`));
 }
 for(const marker of ['PREFLIGHT_INTERNAL','CONTRACT_RESULT','CONTRACT_INSTALL_ROOT','CONTRACT_INSTANCE_PATH','CONTRACT_DATA']){
  assert.match(gate,new RegExp(marker));assert.match(cli,new RegExp(marker));assert.match(iss,new RegExp(`KSESSION_UPGRADE_GATE_${marker}`));assert.match(go,new RegExp(`KSESSION_UPGRADE_GATE_${marker}`));
 }
 for(const stage of ['REGISTRATION','BINDING','PATH','MANIFEST','PROGRAM','BUILD','RUNTIME','LAUNCHER','INTERNAL']){
  const marker=`IDENTITY_${stage}`;assert.match(gate,new RegExp(marker));assert.match(cli,new RegExp(marker));assert.match(iss,new RegExp(`KSESSION_UPGRADE_GATE_${marker}`));assert.match(go,new RegExp(`KSESSION_UPGRADE_GATE_${marker}`));
 }
 assert.match(cli,/error instanceof GateError \? \(exits\[error\.reason\] \|\| 49\) : 49/);
 assert.doesNotMatch(iss,/error\.message|process\.stdout|raw-json/);
 assert.match(go,/fault-payload-hash", "KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED"/);
 assert.match(go,/instanceStable/);assert.match(go,/ownedStable/);assert.match(go,/core-beta1/);assert.match(go,/core-beta2/);assert.match(go,/core-reinstall/);
});

test('successful upgrade asserts real shortcut targets, arguments, and normalized registry identity before U24/U25 PASS',()=>{
 const go=read('tools/windows-launcher/upgrade_windows_test.go');
 const u24=go.indexOf('record("U24"'),u25=go.indexOf('record("U25"');
 assert.ok(u24>go.indexOf('readShortcut(link, false)'));assert.ok(u24>go.indexOf('readShortcut(link, true)'));
 assert.ok(u25>go.indexOf('assertRegistration("1.1.0-beta.2")'));
 for(const marker of ['row.Registration.DisplayVersion != wantVersion','state.Machine != 0','len(state.Rows) < 1','32/64 registry aliases conflict'])assert.match(go,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(go,/runSetup\(beta1, true\)\s+assertRegistration\("1\.1\.0-beta\.1"\)\s+record\("U01"/);
 assert.match(go,/assertRegistration\("1\.1\.0-beta\.2"\)/);
});

test('artifact allowlist requires the closed thirty-check upgrade report',()=>{
 const verify=read('tools/windows-installer/verify-artifact.cjs');
 assert.match(verify,/UPGRADE-TEST-REPORT\.json/);assert.match(verify,/Object\.keys\(upgrade\.checks\)\.length,30/);
});

test('portable restart expires temporary attachment ownership while admin verifies persisted bytes',()=>{
 const core=read('tools/tests/windows-portable/core-client.cjs');
 for(const marker of ['UNATTACHED_UPLOAD_EMPLOYEE_ACCESS_MUST_EXPIRE_AFTER_RESTART','PERSISTED_ATTACHMENT_ADMIN_DOWNLOAD_FAILED','employeeDownload.status,403','adminDownload.status,200','Buffer.from(await adminDownload.arrayBuffer()),prior'])assert.match(core,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.ok(core.indexOf('employeeDownload.status,403')<core.indexOf('adminDownload.status,200'));
 for(const marker of ['KSESSION_CORE_PROBE_DIAGNOSTIC','CORE_PROBE_FAILED','diagnosticWritten','fs.writeSync','uncaughtException','unhandledRejection','COMMON_MODULE','ARGUMENTS','APP_REQUIRE','SETUP_STATUS','PDF_PROBE','XLSX_EXPORT','UPLOAD','BACKUP'])assert.match(core,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(core,/CORE_TEST_FAILED|console\.error\([^\n]*e\.message/);
 const upgrade=read('tools/windows-launcher/upgrade_windows_test.go');
 for(const marker of ['safeCoreProbeFailure(output)','CORE_PROBE_NO_SAFE_DIAGNOSTIC','CORE_PROBE_SYNTAX_FAILED','exec.Command(exe, "--check", args[0])','outputBytes=%d','outputSHA256=%s','TestCoreProbeTopLevelDiagnostic','coreProbe("BETA1_INITIAL"','coreProbe("BETA2_EXISTING"','coreProbe("REINSTALL_EXISTING"'])assert.match(upgrade,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['safeSetupFailure(marker, result)','safeInstallerMarkers(result.logText)','observedFixedMarkers=%s','innoExitCode=%d','innoExitStatus=%s','elapsedMilliseconds=%d','logBytes=%d','logSHA256=%s','KSESSION_REJECT_SPACE_QUERY','KSESSION_UPGRADE_ROOT_MISMATCH','KSESSION_REJECT_INSTANCE_LOCK','safeInnoExitStatus(exitCode, processStarted)','INNO_EXIT_INITIALIZE_FAILED','INNO_EXIT_PREPARE_REJECTED','INNO_EXIT_UNEXPECTED_NONZERO','PROCESS_START_FAILED','unsafe Setup output escaped diagnostic filter'])assert.match(upgrade,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.equal((upgrade.match(/tools\/tests\/windows-portable\/core-client\.cjs/g)||[]).length,3);
 assert.doesNotMatch(upgrade,/tools\/windows-portable\/core-client\.cjs/);
 assert.doesNotMatch(upgrade,/core probe phase=%s failed: %s[^\n]*string\(output\)/);
});

test('uninstaller removes only its exact ordinary state file before the fixture removes verified-empty shells',()=>{
 const go=read('tools/windows-launcher/setup_windows_test.go');
 const wizard=read('tools/windows-launcher/setup_wizard_windows_test.go');
 const removeForeign=go.indexOf('os.Remove(foreign)'),reinstall=go.indexOf('runSetup(setup, target, true)',removeForeign);
 assert.ok(removeForeign>=0&&reinstall>removeForeign);
 const cleanup=go.slice(removeForeign,reinstall);
 for(const marker of ['os.Lstat(dir)','info.Mode()&os.ModeSymlink','os.ReadDir(dir)','len(entries) != 0','os.Remove(dir)',
  'filepath.Join(target, "program")','filepath.Join(target, "uninstall")','removeEmptyFixtureDir(target)'])assert.match(cleanup,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(cleanup,/RemoveAll/);
 const iss=read('tools/windows-installer/setup.iss');
 assert.match(iss,/DirExists\(P\) and NonEmpty\(P\)[\s\S]*KSESSION_REJECT_NONEMPTY/);
 const safeChain=iss.slice(iss.indexOf('function SafeDirectoryChain'),iss.indexOf('function SafePath'));
 for(const marker of ['GetFileAttributesW(Q)','while Length(Q) > 3','(Attr and $400) <> 0','Q := ExtractFileDir(Q)'])assert.match(safeChain,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 const uninstall=iss.slice(iss.indexOf('procedure CurUninstallStepChanged'),iss.indexOf('procedure DeinitializeSetup'));
 for(const marker of ["CurUninstallStep <> usUninstall","{app}\\uninstall\\install-state.json","SafeDirectoryChain(ExtractFileDir(P))","GetFileAttributesW(P)",
  "GetLastErrorCode","(ErrorCode = 2) or (ErrorCode = 3)","(Attr and $400) <> 0","DeleteFile(P)",
  "KSESSION_UNINSTALL_STATE_REMOVED"])assert.match(uninstall,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.ok(uninstall.indexOf('SafeDirectoryChain(ExtractFileDir(P))')<uninstall.indexOf('DeleteFile(P)'));
 assert.doesNotMatch(uninstall,/DelTree|RemoveAll|FindFirst|FindNext/);
 for(const marker of ['junction-uninstall-target','"mklink", "/J"','stateBeforeReject','KSESSION_UNINSTALL_STATE_REJECTED','rejected uninstall changed redirected state'])assert.match(go,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(go,/uninstall left installer-owned state/);
 assert.doesNotMatch(go,/RemoveAll/);
 assert.doesNotMatch(go,/record\("I12", "PASS", "[^"]*uninstall/);
 const wizardClick=wizard.slice(wizard.indexOf('if visible != 0 && enabled != 0'),wizard.indexOf('call(user32, "EnumChildWindows"'));
 for(const marker of ['queuedSetupWizardLabels[label]','GetParent','GetDlgCtrlID','PostMessageW','0x0111','id&0xffff','button=%s queued=%t'])assert.match(wizardClick,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(wizardClick,/SendMessageTimeoutW|Sleep/);
 assert.ok(wizardClick.indexOf('visible != 0 && enabled != 0')<wizardClick.indexOf('PostMessageW'));
});
