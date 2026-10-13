'use strict';

const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

function replaceOnce(source,from,to){assert.equal(source.split(from).length-1,1,`expected one specialty anchor: ${from}`);return source.replace(from,to);}
const block=(name,text)=>`\n\t// U27_SPECIALTY_${name}_BEGIN\n${text}\n\t// U27_SPECIALTY_${name}_END`;

function deriveSpecialty(full){
  let out=replaceOnce(full,'func TestUpgradeLifecycle(t *testing.T) {','func TestU27Specialty(t *testing.T) {');
  out=replaceOnce(out,'\t"encoding/base64"','\t"bytes"\n\t"encoding/base64"');
  const deferAnchor='\t\tsequencePhaseActive = false\n\t}\n\tstartSequencePhase("PRE_ENV_READY")';
  const init=`\tspecialtyReport := u27SpecialtyInitial(os.Getenv("GITHUB_SHA"))
\tspecialtyReport["testSetupState"] = "PASS"
\tspecialtyReport["lifecyclePrefixState"] = "RUNNING"
\tdefer func() {
\t\tpanicked := recover()
\t\tif panicked != nil || t.Failed() {
\t\t\tif specialtyReport["lifecyclePrefixState"] == "RUNNING" {
\t\t\t\tspecialtyReport["status"], specialtyReport["stage"], specialtyReport["classification"] = "FAIL", "PREFIX", "PREFIX_LIFECYCLE_FAILED"
\t\t\t\tspecialtyReport["lifecyclePrefixState"] = "FAILED"
\t\t\t} else if specialtyReport["classification"] == "U27_DIAGNOSTIC_PASS_POSTSTATE_PENDING" {
\t\t\t\tspecialtyReport["status"], specialtyReport["stage"], specialtyReport["classification"] = "FAIL", "U27_PRE_INSTALL", "POST_SETUP_STATE_FAILED"
\t\t\t}
\t\t}
\t\tu27SpecialtyWrite(base, specialtyReport)
\t\tif panicked != nil { panic(panicked) }
\t}()
\tif sequenceDiagnostic || diagnostic { t.Fatal("U27 specialty requires the complete normal lifecycle prefix") }`;
  out=replaceOnce(out,deferAnchor,'\t\tsequencePhaseActive = false\n\t}'+block('INIT',init)+'\n\tstartSequencePhase("PRE_ENV_READY")');

  const u26Anchor='\tif !equalMaps(upgradedInstance, persistentInventory()) {\n\t\tt.Fatal("uninstall changed instance")\n\t}\n\trecord("U26", "real beta.4 uninstall retained complete instance")\n\tu27Result := runSetupRaw(targetBeta4)';
  const prestate=`\tu26Proof := u27SpecialtyGateProof{}
\tu26Inventory := persistentInventory()
\tu26Proof.ControlledExited, u26Proof.RootLockOpenClosed = true, true
\tu26Proof.InstanceUnchanged = equalMaps(upgradedInstance, u26Inventory)
\tif !u26Proof.InstanceUnchanged { t.Fatal("uninstall changed instance") }
\trecord("U26", "real beta.4 uninstall retained complete instance")
\tspecialtyReport["lifecyclePrefixState"] = "PASS"
\tprestate := observeU27SpecialtyPrestate(ps, target, instance, desktop, start, u26Proof)
\tspecialtyReport["prestate"] = prestate
\tif prestate["observationState"] != "COMPLETE" {
\t\tspecialtyReport["status"], specialtyReport["stage"], specialtyReport["classification"] = "UNKNOWN", "PRESTATE", "PRESTATE_UNKNOWN"
\t\tspecialtyReport["cleanupState"] = "CONTROLLED_ONLY"
\t\tt.Error("U27 specialty prestate unavailable")
\t\treturn
\t}
\tspecialtyReport["stage"] = "U27_PRE_INSTALL"`;
  out=replaceOnce(out,u26Anchor,block('PRESTATE',prestate).slice(1)+'\n\tu27Result := runSetupRaw(targetBeta4)');

  const observedAnchor='\treport["u27PreInstall"] = u27PreInstall\n\tif u27Result.logState != "OBSERVED" {';
  const observed=`\tspecialtyReport["u27PreInstall"] = u27PreInstall
\tspecialtyReport["cleanupState"] = "CONTROLLED_ONLY"
\tif u27PreInstall["status"] == "PASS" {
\t\tspecialtyReport["status"], specialtyReport["classification"] = "UNKNOWN", "U27_DIAGNOSTIC_PASS_POSTSTATE_PENDING"
\t} else if u27PreInstall["exitStatus"] == "INNO_EXIT_SUCCESS" {
\t\tspecialtyReport["status"], specialtyReport["classification"] = "FAIL", "U27_DIAGNOSTIC_FAILED"
\t} else {
\t\tspecialtyReport["status"], specialtyReport["classification"] = "FAIL", "U27_NON_SUCCESS"
\t}`;
  out=replaceOnce(out,observedAnchor,'\treport["u27PreInstall"] = u27PreInstall'+block('OBSERVED',observed)+'\n\tif u27Result.logState != "OBSERVED" {');

  const tailStart='\trecord("U27", "fresh beta.4 selected retained instance")';
  const testAfter='\n}\n\nfunc TestSafeCoreProbeFailure';
  const at=out.indexOf(tailStart),end=out.indexOf(testAfter,at);
  assert.ok(at>=0&&end>at,'expected U27 specialty tail anchors');
  const finish=`\trecord("U27", "fresh beta.4 selected retained instance")
\tspecialtyReport["status"], specialtyReport["stage"], specialtyReport["classification"] = "UNKNOWN", "COMPLETE", "SETUP_SUCCEEDED_CLONE_UNKNOWN"
\tspecialtyReport["lifecyclePrefixState"] = "PASS"
\tspecialtyReport["cleanupState"] = "CONTROLLED_ONLY"
\treturn`;
  out=out.slice(0,at)+finish+out.slice(end);
  out += `

func u27SpecialtyInitial(source string) map[string]any {
\treturn map[string]any{"schema": 1, "kind": "U27_SPECIALTY", "status": "FAIL", "stage": "PREFIX", "classification": "NOT_OBSERVED",
\t\t"sourceCommit": source, "testSetupState": "NOT_OBSERVED", "lifecyclePrefixState": "NOT_OBSERVED",
\t\t"networkState": map[string]string{"isolationState":"ISOLATED", "restorationState":"NOT_OBSERVED"},
\t\t"prestate": map[string]string{"observationState": "NOT_OBSERVED", "uninstallCompletionState": "NOT_OBSERVED",
\t\t\t"productRegistrationState": "NOT_OBSERVED", "bindingState": "NOT_OBSERVED", "installRootState": "NOT_OBSERVED", "programState": "NOT_OBSERVED",
\t\t\t"uninstallerState": "NOT_OBSERVED", "desktopShortcutState": "NOT_OBSERVED", "startShortcutState": "NOT_OBSERVED",
\t\t\t"controlledLauncherState": "NOT_OBSERVED", "controlledNodeState": "NOT_OBSERVED", "rootLockState": "NOT_OBSERVED", "instanceState": "NOT_OBSERVED"},
\t\t"u27PreInstall": u27NotObserved(source), "cleanupState": "NOT_OBSERVED"}
}

func u27SpecialtyWrite(base string, report map[string]any) {
\tb, err := json.MarshalIndent(report, "", "  ")
\tif err != nil { return }
\t_ = os.WriteFile(filepath.Join(base, "U27-SPECIALTY-REPORT.json"), append(b, '\\n'), 0600)
}

func u27SpecialtyPathState(file string) string {
\t_, err := os.Stat(file)
\tif err == nil { return "PRESENT" }
\tif os.IsNotExist(err) { return "ABSENT" }
\treturn "UNKNOWN"
}

func u27SpecialtyInstallRootState(root string) string {
\tinfo, err := os.Lstat(root)
\tif os.IsNotExist(err) { return "ABSENT" }
\tif err != nil { return "UNKNOWN" }
\tif !info.IsDir() { return "NON_DIRECTORY" }
\tentries, err := os.ReadDir(root)
\tif err != nil { return "UNKNOWN" }
\tif len(entries) == 0 { return "EMPTY_DIRECTORY" }
\treturn "NONEMPTY_DIRECTORY"
}

type u27SpecialtyGateProof struct { ControlledExited, RootLockOpenClosed, InstanceUnchanged bool }
type u27SpecialtyBinding struct { InstallRoot string; Instance string }

func u27StrictJSONString(raw json.RawMessage) (string, bool) {
\ttrimmed := bytes.TrimSpace(raw)
\tif len(trimmed) < 2 || trimmed[0] != '"' || trimmed[len(trimmed)-1] != '"' { return "", false }
\tvar value string
\tif json.Unmarshal(trimmed, &value) != nil { return "", false }
\treturn value, true
}

func u27StrictBinding(raw json.RawMessage) (*u27SpecialtyBinding, bool) {
\ttrimmed := bytes.TrimSpace(raw)
\tif string(trimmed) == "null" { return nil, true }
\tvar object map[string]json.RawMessage
\tif json.Unmarshal(trimmed, &object) != nil || len(object) != 2 { return nil, false }
\trootRaw, rootOK := object["installRoot"]; instanceRaw, instanceOK := object["instance"]
\tif !rootOK || !instanceOK { return nil, false }
\troot, rootValid := u27StrictJSONString(rootRaw); instance, instanceValid := u27StrictJSONString(instanceRaw)
\tif !rootValid || !instanceValid { return nil, false }
\treturn &u27SpecialtyBinding{InstallRoot: root, Instance: instance}, true
}

func u27SpecialtyApplyGateProof(state map[string]string, proof u27SpecialtyGateProof) {
\tif proof.ControlledExited { state["controlledLauncherState"], state["controlledNodeState"] = "EXITED", "EXITED" }
\tif proof.RootLockOpenClosed { state["rootLockState"] = "EXCLUSIVE_OPEN_CLOSED" }
\tif proof.InstanceUnchanged { state["instanceState"] = "UNCHANGED" }
}

func u27SpecialtyParseRegistry(decoded []byte, target, instance string) (string, string, bool) {
\tvar registry map[string]json.RawMessage
\tif json.Unmarshal(decoded, &registry) != nil || len(registry) != 5 { return "UNKNOWN", "UNKNOWN", false }
\t_, schemaOK := registry["schema"]; product64Raw, product64OK := registry["product64"]; product32Raw, product32OK := registry["product32"]
\tbinding64Raw, binding64OK := registry["binding64"]; binding32Raw, binding32OK := registry["binding32"]
\tvar schema int; var product64, product32 bool
\tbinding64, binding64Valid := u27StrictBinding(binding64Raw); binding32, binding32Valid := u27StrictBinding(binding32Raw)
\tschemaRaw := bytes.TrimSpace(registry["schema"]); product64Raw = bytes.TrimSpace(product64Raw); product32Raw = bytes.TrimSpace(product32Raw)
\tif !schemaOK || !product64OK || !product32OK || !binding64OK || !binding32OK || string(schemaRaw) != "1" || json.Unmarshal(schemaRaw, &schema) != nil || schema != 1 ||
\t\t(string(product64Raw) != "true" && string(product64Raw) != "false") ||
\t\t(string(product32Raw) != "true" && string(product32Raw) != "false") ||
\t\tjson.Unmarshal(product64Raw, &product64) != nil || json.Unmarshal(product32Raw, &product32) != nil || !binding64Valid || !binding32Valid {
\t\treturn "UNKNOWN", "UNKNOWN", false
\t}
\tproductState := "ABSENT"; if product64 || product32 { productState = "PRESENT" }
\tbindingState := "MISSING"
\tif binding64 != nil || binding32 != nil {
\t\texpected := binding64 != nil && sameFile(binding64.InstallRoot, target) && sameFile(binding64.Instance, instance)
\t\tif binding32 != nil { expected = expected && sameFile(binding32.InstallRoot, target) && sameFile(binding32.Instance, instance) }
\t\tif expected { bindingState = "EXPECTED" } else { bindingState = "MISMATCH" }
\t}
\treturn productState, bindingState, true
}

func observeU27SpecialtyPrestate(ps, target, instance, desktop, start string, proof u27SpecialtyGateProof) map[string]string {
\tstate := map[string]string{"observationState": "COMPLETE", "uninstallCompletionState": "UNKNOWN",
\t\t"productRegistrationState": "UNKNOWN", "bindingState": "UNKNOWN", "installRootState": u27SpecialtyInstallRootState(target),
\t\t"programState": u27SpecialtyPathState(filepath.Join(target, "program")),
\t\t"uninstallerState": u27SpecialtyPathState(filepath.Join(target, "uninstall", "unins000.exe")),
\t\t"desktopShortcutState": u27SpecialtyPathState(desktop), "startShortcutState": u27SpecialtyPathState(start),
\t\t"controlledLauncherState": "UNKNOWN", "controlledNodeState": "UNKNOWN", "rootLockState": "UNKNOWN", "instanceState": "UNKNOWN"}
\tu27SpecialtyApplyGateProof(state, proof)
\tscript := \`$p='Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\KSESSION-Beta-Installer-v1_is1';$b='Software\\KSESSION\\Beta\\InstallerBinding';$o=[ordered]@{schema=1;product64=$false;product32=$false;binding64=$null;binding32=$null};foreach($v in @('Registry64','Registry32')){$base=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,[Microsoft.Win32.RegistryView]::$v);try{$pk=$base.OpenSubKey($p,$false);$bk=$base.OpenSubKey($b,$false);try{$o['product'+$(if($v-eq'Registry64'){'64'}else{'32'})]=$null-ne$pk;if($null-ne$bk){$o['binding'+$(if($v-eq'Registry64'){'64'}else{'32'})]=[ordered]@{installRoot=[string]$bk.GetValue('InstallRoot');instance=[string]$bk.GetValue('Instance')}}}finally{if($null-ne$pk){$pk.Dispose()};if($null-ne$bk){$bk.Dispose()}}}finally{$base.Dispose()}};$j=$o|ConvertTo-Json -Depth 4 -Compress;[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($j))\`
\tc := exec.Command(ps, "-NoProfile", "-NonInteractive", "-Command", script)
\tc.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
\tvar stderr bytes.Buffer
\tc.Stderr = &stderr
\tencoded, err := c.Output()
\tif err == nil && stderr.Len() == 0 {
\t\tdecoded, decodeErr := base64.StdEncoding.DecodeString(strings.TrimSpace(string(encoded)))
\t\tif decodeErr == nil { if productState, bindingState, valid := u27SpecialtyParseRegistry(decoded, target, instance); valid {
\t\t\tstate["productRegistrationState"], state["bindingState"] = productState, bindingState
\t\t} }
\t}
\tfor _, key := range []string{"productRegistrationState", "bindingState", "installRootState", "programState", "uninstallerState", "desktopShortcutState", "startShortcutState", "controlledLauncherState", "controlledNodeState", "rootLockState", "instanceState"} {
\t\tif state[key] == "UNKNOWN" { state["observationState"] = "INCOMPLETE" }
\t}
\treturn state
}

func TestU27SpecialtyPurePrestate(t *testing.T) {
\tstate := map[string]string{"controlledLauncherState":"UNKNOWN", "controlledNodeState":"UNKNOWN", "rootLockState":"UNKNOWN", "instanceState":"UNKNOWN"}
\tu27SpecialtyApplyGateProof(state, u27SpecialtyGateProof{})
\tfor key, value := range state { if value != "UNKNOWN" { t.Fatalf("false gate proof changed %s", key) } }
\tu27SpecialtyApplyGateProof(state, u27SpecialtyGateProof{ControlledExited:true, RootLockOpenClosed:true, InstanceUnchanged:true})
\tif state["controlledLauncherState"] != "EXITED" || state["controlledNodeState"] != "EXITED" || state["rootLockState"] != "EXCLUSIVE_OPEN_CLOSED" || state["instanceState"] != "UNCHANGED" { t.Fatal("complete gate proof not applied") }
\troot := t.TempDir(); if u27SpecialtyInstallRootState(root) != "EMPTY_DIRECTORY" { t.Fatal("empty root state") }
\tfile := filepath.Join(root, "ordinary"); if os.WriteFile(file, []byte("x"), 0600) != nil || u27SpecialtyInstallRootState(root) != "NONEMPTY_DIRECTORY" { t.Fatal("nonempty root state") }
\tif u27SpecialtyInstallRootState(file) != "NON_DIRECTORY" || u27SpecialtyInstallRootState(filepath.Join(root,"absent")) != "ABSENT" { t.Fatal("typed root states") }
\tvalid := []byte(\`{"schema":1,"product64":false,"product32":false,"binding64":null,"binding32":null}\`)
\tif product, binding, ok := u27SpecialtyParseRegistry(valid, root, root); !ok || product != "ABSENT" || binding != "MISSING" { t.Fatal("strict registry valid case") }
\tinvalid := [][]byte{
\t\t[]byte(\`{"schema":1,"product64":null,"product32":false,"binding64":null,"binding32":null}\`),
\t\t[]byte(\`{"schema":1,"product64":false,"product32":false,"binding64":{"installRoot":null,"instance":"x"},"binding32":null}\`),
\t\t[]byte(\`{"schema":1,"product64":false,"binding64":null,"binding32":null}\`),
\t\t[]byte(\`{"schema":1,"product64":false,"product32":false,"binding64":null,"binding32":null,"extra":true}\`),
\t\t[]byte(\`{"schema":"1","product64":false,"product32":false,"binding64":null,"binding32":null}\`),
\t}
\tfor _, raw := range invalid { if product, binding, ok := u27SpecialtyParseRegistry(raw, root, root); ok || product != "UNKNOWN" || binding != "UNKNOWN" { t.Fatal("invalid registry schema accepted") } }
}
`;
  return out;
}

function stripAllowedSpecialty(full,specialty){
  let normalized=specialty.replace('func TestU27Specialty(t *testing.T) {','func TestUpgradeLifecycle(t *testing.T) {');
  normalized=normalized.replace(/\n\t\/\/ U27_SPECIALTY_(?:INIT|OBSERVED)_BEGIN[\s\S]*?\n\t\/\/ U27_SPECIALTY_(?:INIT|OBSERVED)_END/g,'');
  normalized=normalized.replace(/\t\/\/ U27_SPECIALTY_PRESTATE_BEGIN[\s\S]*?\n\t\/\/ U27_SPECIALTY_PRESTATE_END/,
    '\tif !equalMaps(upgradedInstance, persistentInventory()) {\n\t\tt.Fatal("uninstall changed instance")\n\t}\n\trecord("U26", "real beta.4 uninstall retained complete instance")');
  const end='\trecord("U27", "fresh beta.4 selected retained instance")';
  const start='func TestUpgradeLifecycle(t *testing.T) {';
  return {full:full.slice(full.indexOf(start),full.indexOf(end)+end.length),
    specialty:normalized.slice(normalized.indexOf(start),normalized.indexOf(end)+end.length)};
}

function main(argv){
  assert.equal(argv.length,2,'launcher source and fresh specialty output required');
  const launcher=path.resolve(argv[0]),output=path.resolve(argv[1]),fullOut=path.join(output,'full-normal');
  assert.equal(fs.existsSync(output),false,'fresh specialty output required');fs.mkdirSync(output,{recursive:false});
  cp.execFileSync(process.execPath,[path.join(__dirname,'prepare-hosted-harness.cjs'),launcher,fullOut],{windowsHide:true,stdio:'pipe'});
  const full=fs.readFileSync(path.join(fullOut,'upgrade_windows_test.go'),'utf8').replaceAll('\r\n','\n');
  const specialty=deriveSpecialty(full),comparison=stripAllowedSpecialty(full,specialty);
  assert.equal(comparison.specialty,comparison.full,'specialty changed the historical U01-U27 prefix outside approved insertions');
  assert.doesNotMatch(specialty,/record\("U28"|record\("U29"|record\("U30"/);
  assert.match(specialty,/func TestU27Specialty\(/);assert.doesNotMatch(specialty,/func TestUpgradeLifecycle\(/);
  for(const name of ['setup_windows_test.go','portable_windows_test.go','integration_windows_test.go'])fs.copyFileSync(path.join(fullOut,name),path.join(output,name),fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(output,'upgrade_windows_test.go'),specialty,{flag:'wx'});
  process.stdout.write('{"status":"PASS","harness":"u27-specialty-historical-prefix"}\n');
}

if(require.main===module)main(process.argv.slice(2));
module.exports={deriveSpecialty,stripAllowedSpecialty};
