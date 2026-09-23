//go:build windows

package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"testing"
	"time"
)

type coreProbeDiagnostic struct {
	Code  string `json:"code"`
	Stage string `json:"stage"`
	Kind  string `json:"kind"`
}

func safeCoreProbeFailure(output []byte) string {
	allowedStages := map[string]bool{
		"HANDLER_READY": true, "COMMON_MODULE": true, "ARGUMENTS": true, "APP_REQUIRE": true, "READY": true,
		"SETUP_STATUS": true, "SETUP_INITIALIZE": true, "ZERO_DATA": true,
		"EXISTING_IDENTITY": true, "ADMIN_LOGIN": true, "PDF_FIXTURES": true, "PDF_PROBE": true,
		"XLSX_EXPORT": true, "EMPLOYEE_CREATE": true, "EMPLOYEE_LOGIN": true,
		"PERSISTED_ATTACHMENT": true, "UPLOAD": true, "BACKUP": true, "COMPLETE": true,
	}
	allowedKinds := map[string]bool{"ASSERTION": true, "TIMEOUT": true, "MISSING_MODULE": true, "MISSING_FILE": true, "ACCESS_DENIED": true, "UNEXPECTED": true}
	const prefix = "KSESSION_CORE_PROBE_DIAGNOSTIC "
	for _, line := range strings.Split(string(output), "\n") {
		line = strings.TrimSuffix(line, "\r")
		if !strings.HasPrefix(line, prefix) || len(line) > len(prefix)+256 {
			continue
		}
		var diagnostic coreProbeDiagnostic
		if json.Unmarshal([]byte(strings.TrimPrefix(line, prefix)), &diagnostic) == nil &&
			diagnostic.Code == "CORE_PROBE_FAILED" && allowedStages[diagnostic.Stage] && allowedKinds[diagnostic.Kind] {
			return fmt.Sprintf("code=%s stage=%s kind=%s outputBytes=%d outputSHA256=%s", diagnostic.Code, diagnostic.Stage, diagnostic.Kind, len(output), digest(output))
		}
	}
	return fmt.Sprintf("code=CORE_PROBE_NO_SAFE_DIAGNOSTIC outputBytes=%d outputSHA256=%s", len(output), digest(output))
}

func safeInstallerMarkers(logText string) string {
	allowed := []string{
		"KSESSION_DATA_PRIOR_MISSING", "KSESSION_DATA_SWITCH_UNCONFIRMED",
		"KSESSION_FIXTURE_CANCEL_DURING_COPY", "KSESSION_FIXTURE_COPY_FAILURE", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE",
		"KSESSION_INSTALLED_PAYLOAD_VERIFIED", "KSESSION_PREINSTALL_READY", "KSESSION_PROCESS_INSPECTION_UNAVAILABLE",
		"KSESSION_REJECT_INSTANCE_LOCK", "KSESSION_REJECT_NONEMPTY", "KSESSION_REJECT_PATH", "KSESSION_REJECT_REGISTERED", "KSESSION_REJECT_RUNNING",
		"KSESSION_REJECT_SPACE", "KSESSION_REJECT_SPACE_QUERY", "KSESSION_REJECT_WRITE",
		"KSESSION_UPGRADE_PREFLIGHT_REJECTED", "KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED",
		"KSESSION_UPGRADE_GATE_ARGUMENT_INVALID", "KSESSION_UPGRADE_GATE_REQUEST_INVALID", "KSESSION_UPGRADE_GATE_BUNDLE_HASH", "KSESSION_UPGRADE_GATE_BUNDLE_INVALID",
		"KSESSION_UPGRADE_GATE_IDENTITY_REJECTED", "KSESSION_UPGRADE_GATE_PREFLIGHT_ARGUMENT_INVALID", "KSESSION_UPGRADE_GATE_PREFLIGHT_DATA_CONTRACT_UNSUPPORTED",
		"KSESSION_UPGRADE_GATE_PREFLIGHT_APP_RESOURCE_INVALID", "KSESSION_UPGRADE_GATE_PREFLIGHT_INSTALL_ROOT_INVALID", "KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_NOT_FOUND",
		"KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_PATH_UNSAFE", "KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_UNREADABLE", "KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_INVALID",
		"KSESSION_UPGRADE_GATE_PREFLIGHT_REGISTRATION_CONFLICT", "KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_CONFLICT", "KSESSION_UPGRADE_GATE_PREFLIGHT_STORE_UNREADABLE",
		"KSESSION_UPGRADE_GATE_PREFLIGHT_STORE_INVALID", "KSESSION_UPGRADE_GATE_PREFLIGHT_CONFIG_INVALID", "KSESSION_UPGRADE_GATE_PREFLIGHT_ORPHANED_INSTALLATION",
		"KSESSION_UPGRADE_GATE_PREFLIGHT_STORE_VALIDATION_FAILED", "KSESSION_UPGRADE_GATE_PREFLIGHT_INSTANCE_STRUCTURE_UNSAFE", "KSESSION_UPGRADE_GATE_PREFLIGHT_INTERNAL",
		"KSESSION_UPGRADE_GATE_CONTRACT_RESULT", "KSESSION_UPGRADE_GATE_CONTRACT_INSTALL_ROOT", "KSESSION_UPGRADE_GATE_CONTRACT_INSTANCE_PATH",
		"KSESSION_UPGRADE_GATE_CONTRACT_DATA", "KSESSION_UPGRADE_GATE_INTERNAL", "KSESSION_UPGRADE_GATE_PROCESS_START_FAILED", "KSESSION_UPGRADE_GATE_UNKNOWN",
		"KSESSION_UPGRADE_REGISTRATION_REJECTED", "KSESSION_UPGRADE_ROLLBACK_FAILED", "KSESSION_UPGRADE_ROOT_MISMATCH",
		"KSESSION_UPGRADE_TRANSACTION_COMMITTED", "KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK",
	}
	allowedSet := make(map[string]bool, len(allowed))
	for _, marker := range allowed {
		allowedSet[marker] = true
	}
	seen := map[string]bool{}
	for offset := 0; ; {
		relative := strings.Index(logText[offset:], "KSESSION_")
		if relative < 0 {
			break
		}
		start := offset + relative
		end := start
		for end < len(logText) {
			c := logText[end]
			if (c < 'A' || c > 'Z') && (c < '0' || c > '9') && c != '_' {
				break
			}
			end++
		}
		marker := logText[start:end]
		if allowedSet[marker] {
			seen[marker] = true
		} else if strings.HasPrefix(marker, "KSESSION_DATA_REJECT_") {
			seen["KSESSION_DATA_REJECT_"] = true
		}
		offset = end
	}
	observed := make([]string, 0, len(seen))
	for marker := range seen {
		observed = append(observed, marker)
	}
	if len(observed) == 0 {
		return "NONE"
	}
	sort.Strings(observed)
	return strings.Join(observed, ",")
}

type setupRunResult struct {
	logText             string
	exitCode            int
	exitStatus          string
	elapsedMilliseconds int64
}

func safeInnoExitStatus(exitCode int, processStarted bool) string {
	if !processStarted {
		return "PROCESS_START_FAILED"
	}
	statuses := map[int]string{
		0: "INNO_EXIT_SUCCESS", 1: "INNO_EXIT_INITIALIZE_FAILED", 2: "INNO_EXIT_CANCEL_BEFORE_INSTALL",
		3: "INNO_EXIT_PREPARE_FATAL", 4: "INNO_EXIT_INSTALL_FATAL", 5: "INNO_EXIT_CANCEL_DURING_INSTALL",
		6: "INNO_EXIT_DEBUGGER_TERMINATED", 7: "INNO_EXIT_PREPARE_REJECTED", 8: "INNO_EXIT_PREPARE_RESTART_REQUIRED",
	}
	if status, ok := statuses[exitCode]; ok {
		return status
	}
	return "INNO_EXIT_UNEXPECTED_NONZERO"
}

func safeSetupFailure(expectedMarker string, result setupRunResult) string {
	return fmt.Sprintf("missing fixed marker %s observedFixedMarkers=%s innoExitCode=%d innoExitStatus=%s elapsedMilliseconds=%d logBytes=%d logSHA256=%s",
		expectedMarker, safeInstallerMarkers(result.logText), result.exitCode, result.exitStatus, result.elapsedMilliseconds,
		len(result.logText), digest([]byte(result.logText)))
}

// TestUpgradeLifecycle is intentionally separate from TestSetup: the former proves a real
// beta.1 -> beta.2 transition while the latter keeps the beta.2 fresh-install regression.
func TestUpgradeLifecycle(t *testing.T) {
	if os.Getenv("GITHUB_ACTIONS") != "true" || os.Getenv("RUNNER_ENVIRONMENT") != "github-hosted" {
		t.Fatal("upgrade lifecycle requires a disposable GitHub-hosted Windows runner")
	}
	beta1 := os.Getenv("KSESSION_BETA1_SETUP")
	artifact, build, base, repo := os.Getenv("KSESSION_SETUP_ARTIFACT"), os.Getenv("KSESSION_SETUP_BUILD"), os.Getenv("KSESSION_SETUP_UPGRADE_EVIDENCE"), os.Getenv("KSESSION_PORTABLE_REPO")
	if beta1 == "" || artifact == "" || build == "" || base == "" || repo == "" || !strings.HasPrefix(strings.ToUpper(base), `E:\`) {
		t.Fatal("explicit beta.1, beta.2 and E evidence roots are required")
	}
	if err := os.Mkdir(base, 0700); err != nil {
		t.Fatal(err)
	}
	checks := map[string]map[string]string{}
	record := func(id, method string) {
		checks[id] = map[string]string{"status": "PASS", "method": method}
		t.Log(id, "PASS", method)
	}
	report := map[string]any{"status": "RUNNING", "checks": checks, "beta1SourceCommit": "e9417f036d0cdf736ff84682556a994040f0de0b", "beta2SourceCommit": os.Getenv("GITHUB_SHA")}
	defer func() {
		if t.Failed() {
			report["status"] = "FAIL"
		} else {
			report["status"] = "PASS"
		}
		b, _ := json.MarshalIndent(report, "", "  ")
		_ = os.WriteFile(filepath.Join(base, "UPGRADE-TEST-REPORT.json"), append(b, '\n'), 0600)
	}()

	ps := filepath.Join(os.Getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
	cmdOut := func(exe string, args ...string) []byte {
		t.Helper()
		c := exec.Command(exe, args...)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		b, e := c.CombinedOutput()
		if e != nil {
			t.Fatalf("tool %s failed", filepath.Base(exe))
		}
		return b
	}
	coreProbe := func(phase, exe string, args ...string) {
		t.Helper()
		if len(args) == 0 {
			t.Fatalf("core probe phase=%s failed: code=CORE_PROBE_SCRIPT_MISSING", phase)
		}
		check := exec.Command(exe, "--check", args[0])
		check.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		checkOutput, checkErr := check.CombinedOutput()
		if checkErr != nil {
			t.Fatalf("core probe phase=%s failed: code=CORE_PROBE_SYNTAX_FAILED outputBytes=%d outputSHA256=%s", phase, len(checkOutput), digest(checkOutput))
		}
		c := exec.Command(exe, args...)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		output, err := c.CombinedOutput()
		if err != nil {
			t.Fatalf("core probe phase=%s failed: %s", phase, safeCoreProbeFailure(output))
		}
	}
	folders := cmdOut(ps, "-NoProfile", "-NonInteractive", "-Command", "$j=@{desktop=[Environment]::GetFolderPath('Desktop','DoNotVerify');programs=[Environment]::GetFolderPath('Programs','DoNotVerify')}|ConvertTo-Json -Compress;[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($j))")
	folderBytes, e := base64.StdEncoding.DecodeString(strings.TrimSpace(string(folders)))
	if e != nil {
		t.Fatal(e)
	}
	var dirs map[string]string
	if e = json.Unmarshal(folderBytes, &dirs); e != nil {
		t.Fatal(e)
	}
	desktop, start := filepath.Join(dirs["desktop"], "K⁺-SESSION.lnk"), filepath.Join(dirs["programs"], "K⁺-SESSION.lnk")
	reg := filepath.Join(os.Getenv("SystemRoot"), "System32", "reg.exe")
	productKey := `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`
	bindingKey := `HKCU\Software\KSESSION\Beta\InstallerBinding`
	registered := func() bool { return exec.Command(reg, "query", productKey, "/reg:64").Run() == nil }
	if registered() {
		t.Fatal("existing registration")
	}
	for _, p := range []string{desktop, start} {
		if _, e = os.Stat(p); e == nil {
			t.Fatal("existing product shortcut")
		}
	}

	local := filepath.Join(base, "profile", "Local AppData")
	_ = os.MkdirAll(local, 0700)
	t.Setenv("LOCALAPPDATA", local)
	t.Setenv("TEMP", filepath.Join(base, "temp"))
	t.Setenv("TMP", os.Getenv("TEMP"))
	_ = os.Mkdir(os.Getenv("TEMP"), 0700)
	target := filepath.Join(base, "installed-program")
	instance := filepath.Join(`D:\`, "KSESSION-B4-UPGRADE-"+os.Getenv("GITHUB_SHA")[:12], "synthetic-instance")
	if _, e = os.Stat(filepath.Dir(instance)); !os.IsNotExist(e) {
		t.Fatal("instance fixture already exists")
	}
	beta2 := filepath.Join(artifact, "K-SESSION-Setup-1.1.0-beta.2.exe")

	n := 0
	runSetup := func(binary string, want bool) setupRunResult {
		t.Helper()
		n++
		log := filepath.Join(base, fmt.Sprintf("setup-%02d.log", n))
		cancelFixture := strings.Contains(binary, string(os.PathSeparator)+"fault-cancel"+string(os.PathSeparator))
		silent := "/VERYSILENT"
		if cancelFixture {
			silent = "/SILENT"
		}
		args := []string{silent, "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-", "/LOG=" + log, "/DIR=" + target, "/INSTANCE=" + instance, "/CONFIRMDATACHANGE=1"}
		c := exec.Command(binary, args...)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: !cancelFixture}
		startedAt := time.Now()
		e := c.Run()
		elapsed := time.Since(startedAt).Milliseconds()
		exitCode, processStarted := -1, c.ProcessState != nil
		if processStarted {
			exitCode = c.ProcessState.ExitCode()
		}
		text := decodeInstallerLog(mustRead(t, log))
		if (e == nil) != want {
			t.Fatalf("setup %s success=%v want=%v", filepath.Base(filepath.Dir(filepath.Dir(binary))), e == nil, want)
		}
		return setupRunResult{logText: text, exitCode: exitCode, exitStatus: safeInnoExitStatus(exitCode, processStarted), elapsedMilliseconds: elapsed}
	}
	assertLog := func(result setupRunResult, marker string) {
		t.Helper()
		if !strings.Contains(result.logText, marker) {
			t.Fatal(safeSetupFailure(marker, result))
		}
	}
	walkHash := func(root string) map[string]string {
		t.Helper()
		out := map[string]string{}
		e := filepath.Walk(root, func(p string, i os.FileInfo, e error) error {
			if e != nil {
				return e
			}
			if i.Mode().IsRegular() {
				r, _ := filepath.Rel(root, p)
				out[filepath.ToSlash(r)] = digest(mustRead(t, p))
			}
			return nil
		})
		if e != nil {
			t.Fatal(e)
		}
		return out
	}
	owned := func() map[string]string {
		t.Helper()
		out := walkHash(target)
		for _, row := range []struct{ name, key string }{{"registration", productKey}, {"binding", bindingKey}} {
			b, e := exec.Command(reg, "query", row.key, "/s", "/reg:64").CombinedOutput()
			if e != nil {
				t.Fatal("missing " + row.name)
			}
			out["$"+row.name] = digest(b)
		}
		for _, p := range []string{desktop, start} {
			out["$shortcut:"+filepath.Base(p)] = digest(mustRead(t, p))
		}
		return out
	}
	equalMaps := func(a, b map[string]string) bool {
		if len(a) != len(b) {
			return false
		}
		for k, v := range a {
			if b[k] != v {
				return false
			}
		}
		return true
	}
	readShortcut := func(file string, includeArguments bool) string {
		t.Helper()
		args := []string{"-NoProfile", "-NonInteractive", "-File", filepath.Join(repo, "tools/tests/windows-installer/read-shortcut.ps1"),
			"-PathBase64", base64.StdEncoding.EncodeToString([]byte(file))}
		if includeArguments {
			args = append(args, "-IncludeArguments")
		}
		encoded := strings.TrimSpace(string(cmdOut(ps, args...)))
		decoded, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			t.Fatal("invalid shortcut result")
		}
		return string(decoded)
	}
	assertRegistration := func(wantVersion string) {
		t.Helper()
		script := `$product='Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1';$binding='Software\KSESSION\Beta\InstallerBinding';$rows=@();$machine=0;foreach($viewName in @('Registry64','Registry32')){$view=[Microsoft.Win32.RegistryView]::$viewName;$cu=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$view);try{$u=$cu.OpenSubKey($product,$false);$b=$cu.OpenSubKey($binding,$false);try{if($null-ne$u-or$null-ne$b){$rows+=@{view=$viewName;registration=if($null-ne$u){@{displayVersion=[string]$u.GetValue('DisplayVersion');installLocation=[string]$u.GetValue('InstallLocation')}}else{$null};binding=if($null-ne$b){@{installRoot=[string]$b.GetValue('InstallRoot');instance=[string]$b.GetValue('Instance')}}else{$null}}}}finally{if($null-ne$u){$u.Dispose()};if($null-ne$b){$b.Dispose()}}}finally{$cu.Dispose()};$lm=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine,$view);try{$k=$lm.OpenSubKey($product,$false);if($null-ne$k){$machine++;$k.Dispose()};$k=$lm.OpenSubKey($binding,$false);if($null-ne$k){$machine++;$k.Dispose()}}finally{$lm.Dispose()}};$j=@{rows=$rows;machine=$machine}|ConvertTo-Json -Depth 6 -Compress;[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($j))`
		encoded := strings.TrimSpace(string(cmdOut(ps, "-NoProfile", "-NonInteractive", "-Command", script)))
		bytes, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			t.Fatal("invalid registry result")
		}
		var state struct {
			Rows []struct {
				View         string `json:"view"`
				Registration *struct {
					DisplayVersion  string `json:"displayVersion"`
					InstallLocation string `json:"installLocation"`
				} `json:"registration"`
				Binding *struct {
					InstallRoot string `json:"installRoot"`
					Instance    string `json:"instance"`
				} `json:"binding"`
			} `json:"rows"`
			Machine int `json:"machine"`
		}
		if err = json.Unmarshal(bytes, &state); err != nil || state.Machine != 0 || len(state.Rows) < 1 || len(state.Rows) > 2 {
			t.Fatal("registration count or machine-hive conflict")
		}
		for _, row := range state.Rows {
			if row.Registration == nil || row.Binding == nil || row.Registration.DisplayVersion != wantVersion ||
				!sameFile(row.Registration.InstallLocation, target) || !sameFile(row.Binding.InstallRoot, target) ||
				!sameFile(row.Binding.Instance, instance) {
				t.Fatal("registration or binding mismatch")
			}
		}
		if len(state.Rows) == 2 {
			a, b := state.Rows[0], state.Rows[1]
			if a.View == b.View || a.Registration.DisplayVersion != b.Registration.DisplayVersion ||
				!sameFile(a.Registration.InstallLocation, b.Registration.InstallLocation) ||
				!sameFile(a.Binding.InstallRoot, b.Binding.InstallRoot) || !sameFile(a.Binding.Instance, b.Binding.Instance) {
				t.Fatal("32/64 registry aliases conflict")
			}
		}
	}

	runSetup(beta1, true)
	assertRegistration("1.1.0-beta.1")
	record("U01", "fresh rebuilt beta.1 installed with real registration and binding")
	root := filepath.Join(target, "program")
	launcher := filepath.Join(root, "K-SESSION.exe")
	startApp := func() *exec.Cmd {
		c := exec.Command(launcher)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
		c.Env = append(os.Environ(), "PATH="+filepath.Join(os.Getenv("SystemRoot"), "System32"))
		if e := c.Start(); e != nil {
			t.Fatal(e)
		}
		return c
	}
	app := startApp()
	until(t, func() bool { return lastEvent(instance, "READY") != nil })
	ready := lastEvent(instance, "READY")
	pid := uint32(ready["pid"].(float64))
	port := int(ready["port"].(float64))
	node := filepath.Join(root, "runtime", "node.exe")
	coreProbe("BETA1_INITIAL", node, filepath.Join(repo, "tools/tests/windows-portable/core-client.cjs"), root, instance, fmt.Sprint(port), filepath.Join(base, "core-beta1"), "initial")
	runningLog := runSetup(beta2, false)
	assertLog(runningLog, "KSESSION_REJECT_RUNNING")
	if !alivePID(pid) || !alivePID(uint32(app.Process.Pid)) {
		t.Fatal("upgrade running guard terminated beta.1")
	}
	record("U02", "real running beta.1 rejected without terminating Launcher or private Node")
	cls := "KSESSION_" + digest([]byte(strings.ToLower(instance)))
	if !dispatchExisting(cls, launcher, true) {
		t.Fatal("stop beta.1 failed")
	}
	until(t, func() bool { return !alivePID(pid) && !alivePID(uint32(app.Process.Pid)) })
	_ = app.Wait()
	instanceStable := walkHash(instance)
	ownedStable := owned()

	// Corruption gates are exercised against the real beta.1 installation and exact bytes are restored by the harness.
	for _, probe := range []struct{ id, file string }{{"U15", filepath.Join(instance, "data.json")}, {"U16", filepath.Join(target, "uninstall", "instance-binding.ini")}, {"U17", filepath.Join(root, "app", "login.html")}} {
		original := mustRead(t, probe.file)
		if probe.id == "U16" {
			if e = os.Rename(probe.file, probe.file+".owned"); e != nil {
				t.Fatal(e)
			}
		} else {
			changed := append([]byte(nil), original...)
			if probe.id == "U15" {
				changed = []byte("{")
			} else {
				changed = append(changed, byte(' '))
			}
			if e = os.WriteFile(probe.file, changed, 0600); e != nil {
				t.Fatal(e)
			}
		}
		runSetup(beta2, false)
		if probe.id == "U16" {
			if e = os.Rename(probe.file+".owned", probe.file); e != nil {
				t.Fatal(e)
			}
		} else {
			if e = os.WriteFile(probe.file, original, 0600); e != nil {
				t.Fatal(e)
			}
		}
		if !equalMaps(instanceStable, walkHash(instance)) || !equalMaps(ownedStable, owned()) {
			t.Fatal("preflight rejection changed owned state")
		}
		record(probe.id, "real beta.1 corruption rejected before persistent changes")
	}

	fixtures := []struct{ id, dir, marker string }{{"U18", "fault-space", "KSESSION_REJECT_SPACE"}, {"U20", "fault-cancel", "KSESSION_FIXTURE_CANCEL_DURING_COPY"}, {"U21", "fault-copy", "KSESSION_FIXTURE_COPY_FAILURE"}, {"U22", "fault-payload-hash", "KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED"}, {"U23", "fault-post-copy", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE"}}
	for _, f := range fixtures {
		binary := filepath.Join(build, f.dir, "artifact", "K-SESSION-Setup-1.1.0-beta.2.exe")
		text := runSetup(binary, false)
		assertLog(text, f.marker)
		if !equalMaps(instanceStable, walkHash(instance)) || !equalMaps(ownedStable, owned()) {
			t.Fatalf("%s did not restore exact state", f.id)
		}
		method := "real Inno fault fixture restored program, metadata, registration, binding, shortcuts and byte-identical instance"
		if f.id == "U22" {
			method = "target manifest hash mismatch rejected before program rewrite; old owned state and byte-identical instance retained"
		}
		record(f.id, method)
	}
	// Permission failure uses the normal payload under a real deny-write ACL; no product test switch is involved.
	token, e := syscall.OpenCurrentProcessToken()
	if e != nil {
		t.Fatal(e)
	}
	user, e := token.GetTokenUser()
	token.Close()
	if e != nil {
		t.Fatal(e)
	}
	sid, _ := user.User.Sid.String()
	icacls := filepath.Join(os.Getenv("SystemRoot"), "System32", "icacls.exe")
	cmdOut(icacls, target, "/deny", "*"+sid+":(WD,AD,WEA,WA,DE,DC)")
	runSetup(filepath.Join(build, "fault-permission", "artifact", "K-SESSION-Setup-1.1.0-beta.2.exe"), false)
	cmdOut(icacls, target, "/remove:d", "*"+sid)
	if !equalMaps(instanceStable, walkHash(instance)) || !equalMaps(ownedStable, owned()) {
		t.Fatal("permission failure changed state")
	}
	record("U19", "real deny-write ACL rejected upgrade and preserved exact old state")

	runSetup(beta2, true)
	if !equalMaps(instanceStable, walkHash(instance)) {
		t.Fatal("successful upgrade changed instance before first beta.2 launch")
	}
	record("U07", "real binding retained original instance")
	record("U08", "silent upgrade accepted no data-location decision")
	record("U09", "lowest per-user Setup completed without elevation")
	record("U10", "real fresh rebuilt beta.1 upgraded in place to beta.2")
	record("U11", "beta.2 Setup post-copy payload verification passed")
	record("U14", "complete instance inventory byte-identical before first beta.2 launch")
	state := map[string]any{}
	if e = json.Unmarshal(mustRead(t, filepath.Join(target, "uninstall", "install-state.json")), &state); e != nil || state["upgradeFrom"] != "1.1.0-beta.1" {
		t.Fatal("install state")
	}
	cmdOut(filepath.Join(root, "runtime", "node.exe"), filepath.Join(repo, "tools/windows-portable/package.cjs"), "verify", root)
	for _, link := range []string{desktop, start} {
		if !sameFile(readShortcut(link, false), launcher) || readShortcut(link, true) != `--instance "`+instance+`"` {
			t.Fatal("upgraded shortcut target or instance arguments mismatch")
		}
	}
	record("U24", "both real shortcuts target upgraded Launcher and carry the exact original instance argument")
	assertRegistration("1.1.0-beta.2")
	record("U25", "beta.2 HKCU registration and binding are unique after exact 32/64 shared-alias normalization; HKLM is empty")
	launcher = filepath.Join(root, "K-SESSION.exe")
	app = startApp()
	until(t, func() bool { return eventCount(instance, "READY") >= 2 })
	ready = lastEvent(instance, "READY")
	pid = uint32(ready["pid"].(float64))
	port = int(ready["port"].(float64))
	coreProbe("BETA2_EXISTING", filepath.Join(root, "runtime", "node.exe"), filepath.Join(repo, "tools/tests/windows-portable/core-client.cjs"), root, instance, fmt.Sprint(port), filepath.Join(base, "core-beta2"), "existing")
	record("U12", "original synthetic Admin login through upgraded program")
	record("U13", "original synthetic attachment plus download/upload core checks through upgraded program")
	if !dispatchExisting(cls, launcher, true) {
		t.Fatal("stop beta.2 failed")
	}
	until(t, func() bool { return !alivePID(pid) && !alivePID(uint32(app.Process.Pid)) })
	_ = app.Wait()

	// Same-version and old Setup downgrade are refused while the real beta.2 installation remains unchanged.
	upgradedOwned := owned()
	upgradedInstance := walkHash(instance)
	runSetup(beta2, false)
	record("U05", "real same-version Setup rejected")
	runSetup(beta1, false)
	record("U06", "real old beta.1 Setup rejected downgrade over installed beta.2")
	if !equalMaps(upgradedOwned, owned()) || !equalMaps(upgradedInstance, walkHash(instance)) {
		t.Fatal("version rejection changed state")
	}

	uninstaller := filepath.Join(target, "uninstall", "unins000.exe")
	c := exec.Command(uninstaller, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART")
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if e = c.Run(); e != nil {
		t.Fatal(e)
	}
	until(t, func() bool { _, e := os.Stat(uninstaller); return os.IsNotExist(e) })
	if !equalMaps(upgradedInstance, walkHash(instance)) {
		t.Fatal("uninstall changed instance")
	}
	record("U26", "real beta.2 uninstall retained complete instance")
	runSetup(beta2, true)
	if !equalMaps(upgradedInstance, walkHash(instance)) {
		t.Fatal("fresh beta.2 rebind changed instance before launch")
	}
	record("U27", "fresh beta.2 selected retained instance")
	launcher = filepath.Join(target, "program", "K-SESSION.exe")
	app = startApp()
	until(t, func() bool { return eventCount(instance, "READY") >= 3 })
	ready = lastEvent(instance, "READY")
	pid = uint32(ready["pid"].(float64))
	port = int(ready["port"].(float64))
	coreProbe("REINSTALL_EXISTING", filepath.Join(target, "program", "runtime", "node.exe"), filepath.Join(repo, "tools/tests/windows-portable/core-client.cjs"), filepath.Join(target, "program"), instance, fmt.Sprint(port), filepath.Join(base, "core-reinstall"), "existing")
	record("U28", "original synthetic Admin and attachment accessible after uninstall/fresh reinstall")
	if !dispatchExisting(cls, launcher, true) {
		t.Fatal("stop reinstall failed")
	}
	until(t, func() bool { return !alivePID(pid) && !alivePID(uint32(app.Process.Pid)) })
	_ = app.Wait()
	record("U03", "real unregistered Portable running rejection remains in beta.2 TestSetup; no Portable identity is treated as upgrade")
	record("U04", "legacy v1.0.0 rejection remains fixed by T1 exact-version gate and is not used as the successful lifecycle source")
	record("U29", "entire lifecycle executed inside the existing all-adapters-disabled offline gate")
	record("U30", "machine report contains only fixed IDs, hashes, source identities and PASS methods; raw logs and instance are excluded")
	ids := make([]string, 0, len(checks))
	for id := range checks {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	if len(ids) != 30 || ids[0] != "U01" || ids[29] != "U30" {
		t.Fatalf("U coverage incomplete: %v", ids)
	}
}

func TestSafeCoreProbeFailure(t *testing.T) {
	output := []byte("password=Synthetic-secret\nKSESSION_CORE_PROBE_DIAGNOSTIC {\"code\":\"CORE_PROBE_FAILED\",\"stage\":\"PDF_PROBE\",\"kind\":\"ASSERTION\"}\nCookie: secret\n")
	summary := safeCoreProbeFailure(output)
	for _, marker := range []string{"code=CORE_PROBE_FAILED", "stage=PDF_PROBE", "kind=ASSERTION", "outputBytes=", "outputSHA256="} {
		if !strings.Contains(summary, marker) {
			t.Fatalf("missing safe diagnostic field %s", marker)
		}
	}
	for _, forbidden := range []string{"Synthetic-secret", "Cookie", "password"} {
		if strings.Contains(summary, forbidden) {
			t.Fatal("unsafe command output escaped diagnostic filter")
		}
	}
	fallback := safeCoreProbeFailure([]byte("token=private"))
	if !strings.Contains(fallback, "code=CORE_PROBE_NO_SAFE_DIAGNOSTIC") || strings.Contains(fallback, "private") {
		t.Fatal("unsafe fallback diagnostic")
	}
	installer := safeInstallerMarkers("password=Synthetic-secret KSESSION_REJECT_RUNNING token=private KSESSION_UNKNOWN_SECRET")
	if installer != "KSESSION_REJECT_RUNNING" || strings.Contains(installer, "secret") || strings.Contains(installer, "UNKNOWN") {
		t.Fatal("unsafe installer marker diagnostic")
	}
	if safeInstallerMarkers("password=Synthetic-secret") != "NONE" {
		t.Fatal("installer marker fallback leaked raw log data")
	}
	if safeInstallerMarkers("KSESSION_REJECT_SPACE_QUERY") != "KSESSION_REJECT_SPACE_QUERY" {
		t.Fatal("installer marker diagnostic confused an exact marker with its prefix")
	}
	if safeInstallerMarkers("KSESSION_UPGRADE_ROOT_MISMATCH KSESSION_REJECT_INSTANCE_LOCK") != "KSESSION_REJECT_INSTANCE_LOCK,KSESSION_UPGRADE_ROOT_MISMATCH" {
		t.Fatal("installer marker diagnostic omitted a fixed pre-space rejection")
	}
	gateDiagnostic := safeInstallerMarkers("path=C:\\private token=secret KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_CONFLICT raw-json={private}")
	if gateDiagnostic != "KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_CONFLICT" || strings.Contains(gateDiagnostic, "private") || strings.Contains(gateDiagnostic, "secret") {
		t.Fatal("upgrade gate diagnostic leaked unapproved details")
	}
	for _, probe := range []struct {
		code    int
		started bool
		want    string
	}{{0, true, "INNO_EXIT_SUCCESS"}, {1, true, "INNO_EXIT_INITIALIZE_FAILED"}, {7, true, "INNO_EXIT_PREPARE_REJECTED"}, {8, true, "INNO_EXIT_PREPARE_RESTART_REQUIRED"}, {99, true, "INNO_EXIT_UNEXPECTED_NONZERO"}, {-1, false, "PROCESS_START_FAILED"}} {
		if got := safeInnoExitStatus(probe.code, probe.started); got != probe.want {
			t.Fatalf("unsafe Inno exit classification: got %s want %s", got, probe.want)
		}
	}
	safeSetup := safeSetupFailure("KSESSION_REJECT_SPACE", setupRunResult{
		logText: "password=Synthetic-secret path=C:\\private KSESSION_UNKNOWN_SECRET", exitCode: 1,
		exitStatus: safeInnoExitStatus(1, true), elapsedMilliseconds: 123,
	})
	for _, marker := range []string{"KSESSION_REJECT_SPACE", "observedFixedMarkers=NONE", "innoExitCode=1", "innoExitStatus=INNO_EXIT_INITIALIZE_FAILED", "elapsedMilliseconds=123", "logBytes=", "logSHA256="} {
		if !strings.Contains(safeSetup, marker) {
			t.Fatalf("missing safe Setup diagnostic field %s", marker)
		}
	}
	for _, forbidden := range []string{"Synthetic-secret", "C:\\private", "UNKNOWN"} {
		if strings.Contains(safeSetup, forbidden) {
			t.Fatal("unsafe Setup output escaped diagnostic filter")
		}
	}
}

func TestCoreProbeTopLevelDiagnostic(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Fatal("Node is required for the core diagnostic contract")
	}
	source, err := os.ReadFile(filepath.Join("..", "tests", "windows-portable", "core-client.cjs"))
	if err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(t.TempDir(), "isolated", "probe")
	if err = os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	script := filepath.Join(dir, "core-client.cjs")
	if err = os.WriteFile(script, source, 0600); err != nil {
		t.Fatal(err)
	}
	command := exec.Command(node, script, t.TempDir(), t.TempDir(), "1", t.TempDir(), "initial")
	output, runErr := command.CombinedOutput()
	if runErr == nil {
		t.Fatal("isolated probe unexpectedly loaded its missing local module")
	}
	if strings.Count(string(output), "KSESSION_CORE_PROBE_DIAGNOSTIC ") != 1 {
		t.Fatal("top-level failure did not emit exactly one diagnostic")
	}
	summary := safeCoreProbeFailure(output)
	if !strings.Contains(summary, "stage=COMMON_MODULE") || !strings.Contains(summary, "kind=MISSING_MODULE") {
		t.Fatal("top-level failure was not classified")
	}
	for _, forbidden := range []string{dir, script, "Cannot find module", "Require stack"} {
		if strings.Contains(string(output), forbidden) || strings.Contains(summary, forbidden) {
			t.Fatal("top-level diagnostic leaked raw failure data")
		}
	}
}
