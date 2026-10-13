'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, `expected one harness marker: ${from}`);
  return source.replace(from, to);
}
function replaceCount(source, from, to, count) {
  assert.equal(source.split(from).length - 1, count, `expected ${count} harness markers: ${from}`);
  return source.replaceAll(from, to);
}
function injectFirewallIdentity(source, objectName) {
  const marker = '\truntimeHash = ' + objectName + '["runtimeManifestSha256"].(string)';
  return replaceOnce(source, marker, marker + '\n\tfirewallHelperHash = ' + objectName + '["firewallHelperSha256"].(string)');
}
function transformPortable(source) {
  return injectFirewallIdentity(replaceCount(source, 'tools/windows-portable/package.cjs',
    'tools/windows-portable/package-lan.cjs', 4), 'info');
}
function transformIntegration(source) { return injectFirewallIdentity(source, 'build'); }
function injectLockRelease(upgrade) {
  const gated = replaceCount(upgrade, '\t_ = app.Wait()',
    '\tif e := app.Wait(); e != nil { t.Fatal("launcher exit failed") }\n\twaitLauncherLockReleased(t, instance)', 3);
  return gated + '\nfunc waitLauncherLockReleased(t *testing.T, instance string) {\n' +
    '\tt.Helper()\n' +
    '\tlockPath := filepath.Join(instance, ".launcher.lock")\n' +
    '\tuntil(t, func() bool {\n' +
    '\t\th, err := syscall.CreateFile(syscall.StringToUTF16Ptr(lockPath), syscall.GENERIC_READ, 0, nil, syscall.OPEN_EXISTING, syscall.FILE_ATTRIBUTE_NORMAL, 0)\n' +
    '\t\tif err == syscall.Errno(32) || err == syscall.Errno(33) { return false }\n' +
    '\t\tif err != nil { t.Fatal("lock release probe failed") }\n' +
    '\t\tif e := syscall.CloseHandle(h); e != nil { t.Fatal("lock probe close failed") }\n' +
    '\t\treturn true\n' +
    '\t})\n' +
    '}\n';
}
function injectPersistentInstanceInventory(upgrade) {
  const firstPID = '\tpid := uint32(ready["pid"].(float64))';
  const control = `	controlledLaunchers := []uint32{uint32(app.Process.Pid)}
	controlledNodes := []uint32{pid}
	persistentInventory := func() map[string]string {
		for _, processID := range controlledLaunchers { requireControlledProcessExited(t, processID) }
		for _, processID := range controlledNodes { requireControlledProcessExited(t, processID) }
		waitLauncherLockReleased(t, instance)
		return walkPersistentInstance(t, instance)
	}`;
  upgrade = replaceOnce(upgrade, firstPID, firstPID + '\n' + control);
  upgrade = replaceCount(upgrade, '\tapp = startApp()',
    '\tapp = startApp()\n\tcontrolledLaunchers = append(controlledLaunchers, uint32(app.Process.Pid))', 2);
  upgrade = replaceCount(upgrade, '\tpid = uint32(ready["pid"].(float64))',
    '\tpid = uint32(ready["pid"].(float64))\n\tcontrolledNodes = append(controlledNodes, pid)', 2);
  upgrade = replaceCount(upgrade, 'walkHash(instance)', 'persistentInventory()', 11);
  return upgrade + `
func requireControlledProcessExited(t *testing.T, processID uint32) {
	t.Helper()
	h, err := syscall.OpenProcess(0x100000, false, processID)
	if err == syscall.Errno(87) { return } // no process with this controlled PID
	if err != nil { t.Fatal("controlled process state unavailable") }
	defer func() { if e := syscall.CloseHandle(h); e != nil { t.Fatal("controlled process handle close failed") } }()
	result, err := syscall.WaitForSingleObject(h, 0)
	if err != nil || result != 0 { t.Fatal("controlled process not exited") }
}

func walkPersistentInstance(t *testing.T, instance string) map[string]string {
	t.Helper()
	out := map[string]string{}
	err := filepath.Walk(instance, func(file string, info os.FileInfo, walkErr error) error {
		if walkErr != nil { return walkErr }
		relative, relErr := filepath.Rel(instance, file)
		if relErr != nil { return relErr }
		if relative == ".launcher.lock" {
			if !info.Mode().IsRegular() { return fmt.Errorf("runtime lock is not a regular file") }
			return nil
		}
		if info.IsDir() { return nil }
		if !info.Mode().IsRegular() { return fmt.Errorf("instance contains nonregular file") }
		out[filepath.ToSlash(relative)] = digest(mustRead(t, file))
		return nil
	})
	if err != nil { t.Fatal("persistent instance inventory failed") }
	return out
}
`;
}

function injectRejectedSetupQuiescence(upgrade, target, source, oldVersion, newVersion) {
  upgrade = replaceOnce(upgrade,
    `\trunSetup(${target}, false)\n\trecord("U05", "real same-version Setup rejected")`,
    `\trunSetup(${target}, false)\n\tpostSameVersionInstance := persistentInventory()\n\tif !equalMaps(upgradedOwned, owned()) || !equalMaps(upgradedInstance, postSameVersionInstance) { t.Fatal("same-version rejection changed state") }\n\trecord("U05", "real same-version Setup rejected")`);
  upgrade = replaceOnce(upgrade,
    `\trunSetup(${source}, false)\n\trecord("U06", "real old ${oldVersion} Setup rejected downgrade over installed ${newVersion}")`,
    `\trunSetup(${source}, false)\n\tpostDowngradeInstance := persistentInventory()\n\tif !equalMaps(upgradedOwned, owned()) || !equalMaps(upgradedInstance, postDowngradeInstance) { t.Fatal("downgrade rejection changed state") }\n\trecord("U06", "real old ${oldVersion} Setup rejected downgrade over installed ${newVersion}")`);
  return upgrade;
}

function injectAutomatedSingleInstanceBaseline(upgrade) {
  upgrade = replaceOnce(upgrade, '\tchecks := map[string]map[string]string{}', `\tchecks := map[string]map[string]string{}
\tsingleInstanceBaseline := map[string]any{"schema": 1, "status": "FAIL", "qualification": "AUTOMATED_SINGLE_INSTANCE_BASELINE_ONLY", "observationCount": 0, "launcherAlive": false, "nodeAlive": false, "rootLockExclusive": false, "readyStable": false, "nodeSpawnStable": false, "secondLauncherStarted": false, "doubleLaunchProven": false}`);
  upgrade = replaceOnce(upgrade, '"status": "RUNNING", "checks": checks,',
    '"status": "RUNNING", "checks": checks, "singleInstanceBaseline": singleInstanceBaseline,');
  const firstPort = '\tport := int(ready["port"].(float64))';
  const observer = `\tsingleInstanceObservations := 0
\texpectedReady, expectedSpawn := eventCount(instance, "READY"), eventCount(instance, "NODE_SPAWN")
\tobserveSingleInstanceBaseline := func() {
\t\tif !alivePID(pid) { t.Fatal("controlled private Node not alive") }
\t\tif !alivePID(uint32(app.Process.Pid)) { t.Fatal("controlled first Launcher not alive") }
\t\trequireLauncherLockOccupied(t, instance)
\t\tif eventCount(instance, "READY") != expectedReady { t.Fatal("READY event count changed during controlled single-instance run") }
\t\tif eventCount(instance, "NODE_SPAWN") != expectedSpawn { t.Fatal("NODE_SPAWN event count changed during controlled single-instance run") }
\t\tsingleInstanceObservations++
\t}
\tobserveSingleInstanceBaseline()`;
  upgrade = replaceOnce(upgrade, firstPort, firstPort + '\n' + observer);
  upgrade = replaceCount(upgrade, '\tport = int(ready["port"].(float64))',
    '\tport = int(ready["port"].(float64))\n\texpectedReady, expectedSpawn = eventCount(instance, "READY"), eventCount(instance, "NODE_SPAWN")\n\tobserveSingleInstanceBaseline()', 2);
  const corePattern = /^(\tcoreProbe\([^\n]+\))$/gm;
  const coreMatches = upgrade.match(corePattern) || [];
  assert.equal(coreMatches.length, 3, 'expected three controlled lifecycle core probes');
  upgrade = upgrade.replace(corePattern, '$1\n\tobserveSingleInstanceBaseline()');
  upgrade = replaceOnce(upgrade, '\trecord("U02", "real running beta.2 rejected without terminating Launcher or private Node")',
    '\tobserveSingleInstanceBaseline()\n\trecord("U02", "real running beta.2 rejected without terminating Launcher or private Node")');
  upgrade = replaceOnce(upgrade, '\tif !diagnostic && (len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30") {',
    `\tif !diagnostic {
\t\tif singleInstanceObservations != 7 { t.Fatal("single-instance baseline observation count mismatch") }
\t\tsingleInstanceBaseline["status"] = "PASS"
\t\tsingleInstanceBaseline["observationCount"] = singleInstanceObservations
\t\tsingleInstanceBaseline["launcherAlive"] = true
\t\tsingleInstanceBaseline["nodeAlive"] = true
\t\tsingleInstanceBaseline["rootLockExclusive"] = true
\t\tsingleInstanceBaseline["readyStable"] = true
\t\tsingleInstanceBaseline["nodeSpawnStable"] = true
\t}
\tif !diagnostic && (len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30") {`);
  return upgrade + `
func requireLauncherLockOccupied(t *testing.T, instance string) {
\tt.Helper()
\th, err := syscall.CreateFile(syscall.StringToUTF16Ptr(filepath.Join(instance, ".launcher.lock")), syscall.GENERIC_READ, 0, nil, syscall.OPEN_EXISTING, syscall.FILE_ATTRIBUTE_NORMAL, 0)
\tif err == syscall.Errno(32) || err == syscall.Errno(33) { return }
\tif err == nil { if e := syscall.CloseHandle(h); e != nil { t.Fatal("lock probe close failed") } }
\tt.Fatal("running Launcher exclusive lock not proven")
}
`;
}

function injectU27PreInstallDiagnostic(upgrade) {
  upgrade = replaceOnce(upgrade, `type setupRunResult struct {
	logText             string
	exitCode            int
	exitStatus          string
	elapsedMilliseconds int64
}`, `type setupRunResult struct {
	logText             string
	logState            string
	processStarted      bool
	exitCode            int
	exitStatus          string
	elapsedMilliseconds int64
}`);
  upgrade = replaceOnce(upgrade, `		_ = c.Run()
		elapsed := time.Since(startedAt).Milliseconds()
		exitCode, processStarted := -1, c.ProcessState != nil
		if processStarted {
			exitCode = c.ProcessState.ExitCode()
		}
		text := decodeInstallerLog(mustRead(t, log))
		return setupRunResult{logText: text, exitCode: exitCode, exitStatus: safeInnoExitStatus(exitCode, processStarted), elapsedMilliseconds: elapsed}`, `		_ = c.Run()
		elapsed := time.Since(startedAt).Milliseconds()
		exitCode, processStarted := -1, c.ProcessState != nil
		if processStarted {
			exitCode = c.ProcessState.ExitCode()
		}
		text, logState := "", "OBSERVED"
		logBytes, logErr := os.ReadFile(log)
		if logErr != nil {
			if os.IsNotExist(logErr) { logState = "MISSING" } else { logState = "READ_FAILED" }
		} else {
			text = decodeInstallerLog(logBytes)
		}
		return setupRunResult{logText: text, logState: logState, processStarted: processStarted, exitCode: exitCode,
			exitStatus: safeInnoExitStatus(exitCode, processStarted), elapsedMilliseconds: elapsed}`);
  upgrade = replaceOnce(upgrade, `		result := runSetupRaw(binary)
		if (result.exitCode == 0) != want {`, `		result := runSetupRaw(binary)
		if result.logState != "OBSERVED" {
			t.Fatalf("setup diagnostic unavailable processStarted=%t logState=%s exitStatus=%s", result.processStarted, result.logState, result.exitStatus)
		}
		if (result.exitCode == 0) != want {`);
  const reportLine = '\treport := map[string]any{"status": "RUNNING", "checks": checks, "beta2SourceCommit": "c8886e6b6d413c2fd73d6716621d07a80b337e58", "beta4SourceCommit": os.Getenv("GITHUB_SHA")}';
  upgrade = replaceOnce(upgrade, reportLine, reportLine + '\n' +
    '\tu27PreInstall := u27NotObserved(os.Getenv("GITHUB_SHA"))\n\treport["u27PreInstall"] = u27PreInstall');
  upgrade = replaceOnce(upgrade, '\trecord("U26", "real beta.4 uninstall retained complete instance")\n\trunSetup(targetBeta4, true)',
    `\trecord("U26", "real beta.4 uninstall retained complete instance")
	u27Result := runSetupRaw(targetBeta4)
	u27PreInstall = u27PreInstallDiagnostic(u27Result, os.Getenv("GITHUB_SHA"))
	report["u27PreInstall"] = u27PreInstall
	if u27Result.logState != "OBSERVED" {
		t.Fatalf("U27_PRE_INSTALL diagnostic unavailable processStarted=%t logState=%s exitStatus=%s", u27Result.processStarted, u27Result.logState, u27Result.exitStatus)
	}
	if (u27Result.exitCode == 0) != true {
		t.Fatalf("setup targetBeta4 success=%v want=true; U27_PRE_INSTALL classification=%s exitStatus=%s markerState=%s",
			u27Result.exitCode == 0, u27PreInstall["classification"], u27PreInstall["exitStatus"], u27PreInstall["markerState"])
	}
	if u27PreInstall["status"] != "PASS" {
		t.Fatalf("U27_PRE_INSTALL failed classification=%s processState=%s logState=%s exitStatus=%s markerState=%s",
			u27PreInstall["classification"], u27PreInstall["processState"], u27PreInstall["logState"],
			u27PreInstall["exitStatus"], u27PreInstall["markerState"])
	}`);
  return upgrade + `
func u27NotObserved(source string) map[string]any {
	return map[string]any{"schema": 1, "phase": "U27_PRE_INSTALL", "status": "FAIL", "classification": "NOT_OBSERVED",
		"sourceCommit": source, "processState": "NOT_OBSERVED", "logState": "NOT_OBSERVED", "exitStatus": "NOT_OBSERVED",
		"markerState": "NOT_OBSERVED", "observedMarkers": []string{}, "preInstallState": "NOT_OBSERVED",
		"copyState": "NOT_OBSERVED", "postInstallVerificationState": "NOT_OBSERVED"}
}

func u27PreInstallDiagnostic(result setupRunResult, source string) map[string]any {
	report := u27NotObserved(source)
	processState := "STARTED"
	if !result.processStarted { processState = "START_FAILED" }
	report["processState"], report["logState"], report["exitStatus"] = processState, result.logState, result.exitStatus
	markers := []string{}
	if result.logState == "OBSERVED" {
		fixed := safeInstallerMarkers(result.logText)
		if fixed != "NONE" { markers = strings.Split(fixed, ",") }
	}
	report["observedMarkers"] = markers
	if len(markers) > 0 { report["markerState"] = "OBSERVED" }
	if !result.processStarted {
		report["classification"] = "PROCESS_START_FAILED"
		return report
	}
	if result.logState != "OBSERVED" {
		if result.logState == "MISSING" { report["classification"] = "LOG_MISSING" } else if result.logState == "READ_FAILED" { report["classification"] = "LOG_READ_FAILED" }
		report["preInstallState"], report["copyState"], report["postInstallVerificationState"] = "UNKNOWN", "UNKNOWN", "UNKNOWN"
		return report
	}
	pre, installed, dataReject, postFailure, upgradeMarker, unexpected := false, false, false, false, false, false
	preRejects := 0
	for _, marker := range markers {
		if marker == "KSESSION_PREINSTALL_READY" { pre = true }
		if marker == "KSESSION_INSTALLED_PAYLOAD_VERIFIED" { installed = true }
		if marker == "KSESSION_DATA_REJECT_" { dataReject = true }
		if marker == "KSESSION_UPGRADE_POSTINSTALL_FAILED" { postFailure = true }
		if u27DefinitePreInstallRejection(marker) { preRejects++ }
		if strings.HasPrefix(marker, "KSESSION_UPGRADE_") && !u27DefinitePreInstallRejection(marker) && marker != "KSESSION_UPGRADE_POSTINSTALL_FAILED" { upgradeMarker = true }
		if marker != "KSESSION_PREINSTALL_READY" && marker != "KSESSION_INSTALLED_PAYLOAD_VERIFIED" && marker != "KSESSION_PROCESS_INSPECTION_UNAVAILABLE" && marker != "KSESSION_DATA_REJECT_" && marker != "KSESSION_UPGRADE_POSTINSTALL_FAILED" && !u27DefinitePreInstallRejection(marker) { unexpected = true }
	}
	success := result.exitStatus == "INNO_EXIT_SUCCESS"
	if pre { report["preInstallState"] = "PASS" } else { report["preInstallState"] = "UNKNOWN" }
	if installed || postFailure { report["copyState"] = "PASS" } else { report["copyState"] = "UNKNOWN" }
	if installed { report["postInstallVerificationState"] = "PASS" } else if postFailure { report["postInstallVerificationState"] = "FAILED" } else { report["postInstallVerificationState"] = "UNKNOWN" }
	ambiguous := preRejects > 1 || (preRejects > 0 && (pre || dataReject || postFailure || installed)) || upgradeMarker || unexpected
	if success && pre && installed && !ambiguous {
		report["status"], report["classification"] = "PASS", "SUCCESS"
		report["preInstallState"], report["copyState"], report["postInstallVerificationState"] = "PASS", "PASS", "PASS"
	} else if ambiguous {
		report["classification"] = "UNKNOWN"
	} else if !success && installed {
		report["classification"] = "LATE_FAILURE_AFTER_VERIFICATION"
	} else if postFailure {
		report["classification"] = "POSTINSTALL_FAILED"
	} else if dataReject {
		report["classification"] = "DATA_REJECTED_PHASE_UNKNOWN"
	} else if preRejects == 1 && !pre {
		report["classification"], report["preInstallState"] = "PREINSTALL_REJECTED", "REJECTED"
		report["copyState"], report["postInstallVerificationState"] = "NOT_OBSERVED", "NOT_OBSERVED"
	} else if pre {
		if success { report["classification"] = "UNKNOWN" } else { report["classification"] = "ABNORMAL_EXIT_AFTER_PREINSTALL" }
	} else {
		report["classification"] = "UNKNOWN"
		report["preInstallState"], report["copyState"], report["postInstallVerificationState"] = "UNKNOWN", "UNKNOWN", "UNKNOWN"
	}
	return report
}

func u27DefinitePreInstallRejection(marker string) bool {
	switch marker {
	case "KSESSION_DATA_PRIOR_MISSING", "KSESSION_DATA_SWITCH_UNCONFIRMED", "KSESSION_REJECT_INSTANCE_LOCK",
		"KSESSION_REJECT_NONEMPTY", "KSESSION_REJECT_PATH", "KSESSION_REJECT_REGISTERED", "KSESSION_REJECT_RUNNING",
		"KSESSION_REJECT_SPACE", "KSESSION_REJECT_SPACE_QUERY", "KSESSION_REJECT_WRITE", "KSESSION_UPGRADE_PREFLIGHT_REJECTED",
		"KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED", "KSESSION_UPGRADE_REGISTRATION_REJECTED", "KSESSION_UPGRADE_ROOT_MISMATCH":
		return true
	}
	return false
}
`;
}

function injectSecondLauncherLockRejection(upgrade) {
  const marker = '\tport := int(ready["port"].(float64))';
  const proof = `	readyBeforeSecond := eventCount(instance, "READY")
	spawnBeforeSecond := eventCount(instance, "NODE_SPAWN")
	secondResult := checkSecondLauncher(t, launcher, instance, uint32(app.Process.Pid), pid, readyBeforeSecond, spawnBeforeSecond)
	if secondResult.Status != "PASS" || !secondResult.NaturalExit || secondResult.CleanupTerminated || !secondResult.HandlesClosed { t.Fatal("second Launcher exit not proven") }
	if !alivePID(pid) || !alivePID(uint32(app.Process.Pid)) { t.Fatal("second Launcher displaced controlled session") }
	requireLauncherLockOccupied(t, instance)
	if eventCount(instance, "READY") != readyBeforeSecond || eventCount(instance, "NODE_SPAWN") != spawnBeforeSecond { t.Fatal("second Launcher started a private Node session") }`;
  upgrade = replaceOnce(upgrade, marker, marker + '\n' + proof);
  return upgrade + `
func requireLauncherLockOccupied(t *testing.T, instance string) {
	t.Helper()
	h, err := syscall.CreateFile(syscall.StringToUTF16Ptr(filepath.Join(instance, ".launcher.lock")), syscall.GENERIC_READ, 0, nil, syscall.OPEN_EXISTING, syscall.FILE_ATTRIBUTE_NORMAL, 0)
	if err == syscall.Errno(32) || err == syscall.Errno(33) { return }
  if err == nil { if e := syscall.CloseHandle(h); e != nil { t.Fatal("lock probe close failed") } }
	t.Fatal("running Launcher did not retain exclusive lock")
}
`;
}

function appendSecondLauncherHelpers(upgrade, repo) {
  const policy = fs.readFileSync(path.join(repo, 'tools/research/lan2-lc01/policy.go'), 'utf8').replaceAll('\r\n', '\n');
  const dialog = fs.readFileSync(path.join(repo, 'tools/research/lan2-lc01/dialog_adapter_policy.go'), 'utf8').replaceAll('\r\n', '\n');
  const windows = fs.readFileSync(path.join(__dirname, 'second-launcher-windows.go.in'), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(policy.split('const lcBusyText').length, 2);
  assert.equal(dialog.split('const (\n\tlcBodyStylePlain').length, 2);
  assert.equal(windows.split('type lcPinned').length, 2);
  upgrade = replaceOnce(upgrade, '\t"time"', '\t"time"\n\t"errors"\n\t"sync"\n\t"unicode/utf16"\n\t"unsafe"');
  return upgrade + '\n' + policy.slice(policy.indexOf('const lcBusyText')) + '\n' + dialog.slice(dialog.indexOf('const (\n\tlcBodyStylePlain')) + '\n' + windows.slice(windows.indexOf('type lcPinned'));
}

function main(argv) {
  assert.equal(argv.length, 2, 'launcher source and fresh output required');
  const launcher = path.resolve(argv[0]), output = path.resolve(argv[1]);
  const repo = path.resolve(launcher, '../..');
  assert.equal(fs.existsSync(output), false, 'fresh harness output required');
  fs.mkdirSync(output, {recursive: false});

  let setup = fs.readFileSync(path.join(launcher, 'setup_windows_test.go'), 'utf8').replaceAll('\r\n', '\n');
  setup = replaceOnce(setup, 'K-SESSION-Setup-1.1.0-beta.2.exe', 'K-SESSION-Setup-1.1.0-beta.4.exe');
  setup = replaceOnce(setup, 'INSTALLER-TEST-REPORT.json', 'BETA4-INSTALLER-TEST-REPORT.json');
  setup = replaceCount(setup, 'tools/windows-portable/package.cjs', 'tools/windows-portable/package-lan.cjs', 2);
  setup = injectFirewallIdentity(setup, 'info');
  fs.writeFileSync(path.join(output, 'setup_windows_test.go'), setup, {flag: 'wx'});

  let upgrade = fs.readFileSync(path.join(launcher, 'upgrade_windows_test.go'), 'utf8').replaceAll('\r\n', '\n');
  upgrade = upgrade.replaceAll('beta.1', '__KSESSION_SOURCE_VERSION__');
  upgrade = upgrade.replaceAll('beta.2', 'beta.4');
  upgrade = upgrade.replaceAll('__KSESSION_SOURCE_VERSION__', 'beta.2');
  upgrade = upgrade.replaceAll('beta1', '__KSESSION_SOURCE_TOKEN__');
  upgrade = upgrade.replaceAll('beta2', 'targetBeta4');
  upgrade = upgrade.replaceAll('__KSESSION_SOURCE_TOKEN__', 'sourceBeta2');
  upgrade = upgrade.replaceAll('BETA1', '__KSESSION_SOURCE_UPPER__');
  upgrade = upgrade.replaceAll('BETA2', 'TARGET_BETA4');
  upgrade = upgrade.replaceAll('__KSESSION_SOURCE_UPPER__', 'SOURCE_BETA2');
  upgrade = upgrade.replaceAll('KSESSION_SOURCE_BETA2_SETUP', 'KSESSION_BETA2_SETUP');
  upgrade = upgrade.replaceAll('sourceBeta2SourceCommit', 'beta2SourceCommit');
  upgrade = upgrade.replaceAll('targetBeta4SourceCommit', 'beta4SourceCommit');
  upgrade = upgrade.replaceAll('e9417f036d0cdf736ff84682556a994040f0de0b', 'c8886e6b6d413c2fd73d6716621d07a80b337e58');
  upgrade = replaceOnce(upgrade, 'UPGRADE-TEST-REPORT.json', 'BETA4-UPGRADE-TEST-REPORT.json');
  upgrade = replaceOnce(upgrade, 'tools/windows-portable/package.cjs', 'tools/windows-portable/package-lan.cjs');
  upgrade = replaceOnce(upgrade, 'fresh rebuilt beta.2 installed with real registration and binding',
    'accepted F3 beta.2 installed with exact registration and binding');
  upgrade = replaceOnce(upgrade, 'real fresh rebuilt beta.2 upgraded in place to beta.4',
    'accepted F3 beta.2 upgraded in place to beta.4');
  const registryFingerprint = '\t\tfor _, row := range []struct{ name, key string }{{"registration", productKey}, {"binding", bindingKey}} {\n' +
    '\t\t\tb, e := exec.Command(reg, "query", row.key, "/s", "/reg:64").CombinedOutput()\n' +
    '\t\t\tif e != nil {\n\t\t\t\tt.Fatal("missing " + row.name)\n\t\t\t}\n' +
    '\t\t\tout["$"+row.name] = digest(b)\n\t\t}';
  const closedFingerprint = '\t\tfor _, row := range []struct{ name, key, view string; required bool }{\n' +
    '\t\t\t{"registration-64", productKey, "64", true}, {"binding-64", bindingKey, "64", true},\n' +
    '\t\t\t{"registration-32", productKey, "32", false}, {"binding-32", bindingKey, "32", false},\n\t\t} {\n' +
    '\t\t\tb, e := exec.Command(reg, "query", row.key, "/s", "/reg:"+row.view).CombinedOutput()\n' +
    '\t\t\tif e != nil {\n\t\t\t\tif row.required { t.Fatal("missing " + row.name) }\n' +
    '\t\t\t\tout["$"+row.name] = "ABSENT"\n\t\t\t\tcontinue\n\t\t\t}\n' +
    '\t\t\tout["$"+row.name] = digest(b)\n\t\t}';
  upgrade = replaceOnce(upgrade, registryFingerprint, closedFingerprint);
  const lanConfigText = JSON.stringify({schema: 2, enabled: true, interfaceName: 'Ethernet', port: 8083}) + '\n';
  const {validateLanConfig} = require(path.join(repo, 'public-lan-config.js'));
  assert.deepEqual(validateLanConfig(JSON.parse(lanConfigText)),
    {schema: 2, enabled: true, interfaceName: 'Ethernet', port: 8083});
  upgrade = replaceOnce(upgrade, '\tinstanceStable := walkHash(instance)',
    '\tlanConfig := []byte(' + JSON.stringify(lanConfigText) + ')\n' +
    '\tif e = os.WriteFile(filepath.Join(instance, "lan-deployment.json"), lanConfig, 0600); e != nil { t.Fatal(e) }\n' +
    '\tinstanceStable := walkHash(instance)');
  upgrade = replaceOnce(upgrade, '\tsequenceDiagnostic := os.Getenv("KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC") == "1"',
    '\tsequenceDiagnostic := os.Getenv("KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC") == "1"\n' +
    '\tdiagnostic := os.Getenv("KSESSION_BETA4_DIAGNOSTIC") == "1"');
  const fixturesLine = '\tfixtures := []struct{ id, dir, marker string }{{"U18", "fault-space", "KSESSION_REJECT_SPACE"}, {"U20", "fault-cancel", "KSESSION_FIXTURE_CANCEL_DURING_COPY"}, {"U21", "fault-copy", "KSESSION_FIXTURE_COPY_FAILURE"}, {"U22", "fault-payload-hash", "KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED"}, {"U23", "fault-post-copy", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE"}}';
  upgrade = replaceOnce(upgrade, fixturesLine, fixturesLine + '\n' +
    '\tif diagnostic { fixtures = []struct{ id, dir, marker string }{{"U22", "fault-payload-hash", "KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED"}, {"U23", "fault-post-copy", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE"}} }');
  const permissionStart = upgrade.indexOf('\t// Permission failure uses the normal payload');
  const permissionEnd = upgrade.indexOf('\n\trunSetup(targetBeta4, true)', permissionStart);
  assert.ok(permissionStart >= 0 && permissionEnd > permissionStart);
  upgrade = upgrade.slice(0, permissionStart) + '\tif !diagnostic {\n' +
    upgrade.slice(permissionStart, permissionEnd) + '\n\t}' + upgrade.slice(permissionEnd);
  upgrade = replaceOnce(upgrade, '\tif len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30" {',
    '\tif diagnostic { _, u22 := checks["U22"]; _, u23 := checks["U23"]; if !u22 || !u23 || len(checks) < 21 { t.Fatal("diagnostic coverage incomplete") } }\n' +
    '\tif !diagnostic && (len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30") {');
  // Stop/Wait and the exclusive lock probe establish quiescence. Only the
  // volatile root lock is omitted from persistent business byte comparison;
  // every other instance file remains in the inventory.
  upgrade = injectLockRelease(upgrade);
  upgrade = injectPersistentInstanceInventory(upgrade);
  upgrade = injectRejectedSetupQuiescence(upgrade, 'targetBeta4', 'sourceBeta2', 'beta.2', 'beta.4');
  upgrade = injectU27PreInstallDiagnostic(upgrade);
  upgrade = injectAutomatedSingleInstanceBaseline(upgrade);
  assert.match(upgrade, /KSESSION_BETA2_SETUP/);
  assert.match(upgrade, /K-SESSION-Setup-1\.1\.0-beta\.4\.exe/);
  assert.match(upgrade, /state\["upgradeFrom"\] != "1\.1\.0-beta\.2"/);
  assert.match(upgrade, /package-lan\.cjs/);
  assert.match(upgrade, /lan-deployment\.json/);
  assert.match(upgrade, /registration-32/);
  assert.match(upgrade, /lanConfig := \[\]byte\("\{\\"schema\\":2,\\"enabled\\":true,\\"interfaceName\\":\\"Ethernet\\",\\"port\\":8083\}\\n"\)/);
  assert.doesNotMatch(upgrade, /1\.1\.0-beta\.1|KSESSION_BETA1_SETUP|e9417f036d0cdf736ff84682556a994040f0de0b/);
  fs.writeFileSync(path.join(output, 'upgrade_windows_test.go'), upgrade, {flag: 'wx'});
  fs.writeFileSync(path.join(output, 'portable_windows_test.go'),
    transformPortable(fs.readFileSync(path.join(launcher, 'portable_windows_test.go'), 'utf8').replaceAll('\r\n', '\n')), {flag: 'wx'});
  fs.writeFileSync(path.join(output, 'integration_windows_test.go'),
    transformIntegration(fs.readFileSync(path.join(launcher, 'integration_windows_test.go'), 'utf8').replaceAll('\r\n', '\n')), {flag: 'wx'});
  process.stdout.write('{"status":"PASS","harness":"beta2-to-beta4"}\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {injectFirewallIdentity, injectLockRelease, injectPersistentInstanceInventory, injectRejectedSetupQuiescence, injectU27PreInstallDiagnostic, injectAutomatedSingleInstanceBaseline, injectSecondLauncherLockRejection, appendSecondLauncherHelpers, transformIntegration, transformPortable};
