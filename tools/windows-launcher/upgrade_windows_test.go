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
		"KSESSION_FIXTURE_CANCEL_DURING_COPY", "KSESSION_FIXTURE_COPY_FAILURE", "KSESSION_FIXTURE_COPY_INJECTION_PREPARE_FAILED", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE",
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
		"KSESSION_UPGRADE_GATE_IDENTITY_REGISTRATION", "KSESSION_UPGRADE_GATE_IDENTITY_BINDING", "KSESSION_UPGRADE_GATE_IDENTITY_PATH",
		"KSESSION_UPGRADE_GATE_IDENTITY_MANIFEST", "KSESSION_UPGRADE_GATE_IDENTITY_PROGRAM", "KSESSION_UPGRADE_GATE_IDENTITY_BUILD",
		"KSESSION_UPGRADE_GATE_IDENTITY_RUNTIME", "KSESSION_UPGRADE_GATE_IDENTITY_LAUNCHER", "KSESSION_UPGRADE_GATE_IDENTITY_INTERNAL",
		"KSESSION_UPGRADE_GATE_ACCEPTED", "KSESSION_UPGRADE_REGISTRATION_REJECTED", "KSESSION_UPGRADE_ROLLBACK_FAILED", "KSESSION_UPGRADE_ROOT_MISMATCH",
		"KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED", "KSESSION_UPGRADE_COMMIT_UNKNOWN",
		"KSESSION_UPGRADE_INSTALLED_VERIFIED", "KSESSION_UPGRADE_NATIVE_COPY_COMPLETE", "KSESSION_UPGRADE_POSTINSTALL_FAILED",
		"KSESSION_UPGRADE_TRANSACTION_COMMITTED", "KSESSION_UPGRADE_TRANSACTION_PREPARED", "KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK", "KSESSION_UPGRADE_TRANSACTION_SWAPPED",
		"KSESSION_SEQUENCE_IDENTITY_ACCEPTED",
		"KSESSION_SEQUENCE_REGISTRATION_COUNT", "KSESSION_SEQUENCE_REGISTRATION_NAME", "KSESSION_SEQUENCE_REGISTRATION_VERSION", "KSESSION_SEQUENCE_REGISTRATION_NAME_VERSION", "KSESSION_SEQUENCE_REGISTRATION_SNAPSHOT",
		"KSESSION_SEQUENCE_REGISTRATION_CONFLICT", "KSESSION_SEQUENCE_REGISTRATION_UNINSTALL",
		"KSESSION_SEQUENCE_REGISTRATION_AMBIGUOUS", "KSESSION_SEQUENCE_REGISTRATION_INCONSISTENT",
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

func hasInstallerMarker(markers, expected string) bool {
	for _, marker := range strings.Split(markers, ",") {
		if marker == expected {
			return true
		}
	}
	return false
}

func postCopyDiagnosticFailure(markers string) string {
	if hasInstallerMarker(markers, "KSESSION_UPGRADE_TRANSACTION_COMMITTED") {
		return "POST_COPY_UNEXPECTED_FINALIZE"
	}
	if hasInstallerMarker(markers, "KSESSION_UPGRADE_ROLLBACK_FAILED") {
		return "POST_COPY_ROLLBACK_FAILED"
	}
	for _, stage := range []struct{ marker, failure string }{
		{"KSESSION_UPGRADE_GATE_ACCEPTED", "POST_COPY_GATE_NOT_ACCEPTED"},
		{"KSESSION_UPGRADE_TRANSACTION_PREPARED", "POST_COPY_PREPARE_FAILED"},
		{"KSESSION_UPGRADE_NATIVE_COPY_COMPLETE", "POST_COPY_NATIVE_COPY_NOT_REACHED"},
		{"KSESSION_UPGRADE_TRANSACTION_SWAPPED", "POST_COPY_COMMIT_FAILED"},
		{"KSESSION_UPGRADE_INSTALLED_VERIFIED", "POST_COPY_INSTALL_VERIFY_FAILED"},
		{"KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE", "POST_COPY_MARKER_MISSING"},
		{"KSESSION_UPGRADE_POSTINSTALL_FAILED", "POST_COPY_FAILURE_HANDLER_MISSING"},
		{"KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK", "POST_COPY_ROLLBACK_MARKER_MISSING"},
	} {
		if !hasInstallerMarker(markers, stage.marker) {
			return stage.failure
		}
	}
	return ""
}

func payloadHashDiagnosticFailure(markers string) string {
	if hasInstallerMarker(markers, "KSESSION_UPGRADE_COMMIT_UNKNOWN") {
		return "PAYLOAD_HASH_REASON_CONFLICT"
	}
	for _, unexpected := range []struct{ marker, failure string }{
		{"KSESSION_UPGRADE_TRANSACTION_COMMITTED", "PAYLOAD_HASH_UNEXPECTED_FINALIZE"},
		{"KSESSION_UPGRADE_INSTALLED_VERIFIED", "PAYLOAD_HASH_UNEXPECTED_VERIFY"},
		{"KSESSION_UPGRADE_TRANSACTION_SWAPPED", "PAYLOAD_HASH_UNEXPECTED_SWAP"},
	} {
		if hasInstallerMarker(markers, unexpected.marker) {
			return unexpected.failure
		}
	}
	for _, required := range []struct{ marker, failure string }{
		{"KSESSION_UPGRADE_GATE_ACCEPTED", "PAYLOAD_HASH_GATE_NOT_ACCEPTED"},
		{"KSESSION_UPGRADE_TRANSACTION_PREPARED", "PAYLOAD_HASH_PREPARE_NOT_REACHED"},
		{"KSESSION_UPGRADE_NATIVE_COPY_COMPLETE", "PAYLOAD_HASH_NATIVE_COPY_NOT_REACHED"},
		{"KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED", "PAYLOAD_HASH_REASON_MISSING"},
		{"KSESSION_UPGRADE_POSTINSTALL_FAILED", "PAYLOAD_HASH_FAILURE_HANDLER_MISSING"},
	} {
		if !hasInstallerMarker(markers, required.marker) {
			return required.failure
		}
	}
	if hasInstallerMarker(markers, "KSESSION_UPGRADE_ROLLBACK_FAILED") {
		return "PAYLOAD_HASH_ROLLBACK_FAILED"
	}
	if !hasInstallerMarker(markers, "KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK") {
		return "PAYLOAD_HASH_ROLLBACK_MARKER_MISSING"
	}
	return ""
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

func upgradeLifecycleInstance(base, sourceCommit string, sequenceDiagnostic bool) string {
	if sequenceDiagnostic {
		return filepath.Join(base, "sequence-instance-fixture", "synthetic-instance")
	}
	prefix := sourceCommit
	if len(prefix) > 12 {
		prefix = prefix[:12]
	}
	return filepath.Join(`D:\`, "KSESSION-B4-UPGRADE-"+prefix, "synthetic-instance")
}

func validateFreshInstanceFixture(instance string) error {
	if _, err := os.Lstat(instance); !os.IsNotExist(err) {
		return fmt.Errorf("instance fixture leaf already exists")
	}
	if _, err := os.Lstat(filepath.Dir(instance)); !os.IsNotExist(err) {
		return fmt.Errorf("instance fixture parent already exists")
	}
	return nil
}

func TestUpgradeLifecycleInstanceIsolation(t *testing.T) {
	base := ""
	if testWork := os.Getenv("KSESSION_TEST_WORK"); testWork != "" {
		var err error
		base, err = os.MkdirTemp(testWork, "upgrade-instance-isolation-")
		if err != nil {
			t.Fatal(err)
		}
	} else {
		base = t.TempDir()
	}
	oldSequenceLayout := filepath.Join(base, "synthetic-instance")
	if err := validateFreshInstanceFixture(oldSequenceLayout); err == nil {
		t.Fatal("old sequence layout must be rejected because its parent is the existing evidence root")
	}

	sequenceInstance := upgradeLifecycleInstance(base, strings.Repeat("a", 40), true)
	if filepath.Dir(sequenceInstance) == base {
		t.Fatal("sequence instance must use a new exclusive parent")
	}
	if err := validateFreshInstanceFixture(sequenceInstance); err != nil {
		t.Fatal("new sequence fixture should accept an absent exclusive parent and leaf")
	}
	if err := os.Mkdir(filepath.Dir(sequenceInstance), 0700); err != nil {
		t.Fatal(err)
	}
	if err := validateFreshInstanceFixture(sequenceInstance); err == nil {
		t.Fatal("existing sequence parent must remain rejected")
	}

	fullInstance := upgradeLifecycleInstance(base, "0123456789abcdef", false)
	wantFull := filepath.Join(`D:\`, "KSESSION-B4-UPGRADE-0123456789ab", "synthetic-instance")
	if fullInstance != wantFull {
		t.Fatal("full lifecycle fixture path changed")
	}
}

// TestUpgradeLifecycle is intentionally separate from TestSetup: the former proves a real
// beta.1 -> beta.2 transition while the latter keeps the beta.2 fresh-install regression.
func TestUpgradeLifecycle(t *testing.T) {
	if os.Getenv("GITHUB_ACTIONS") != "true" || os.Getenv("RUNNER_ENVIRONMENT") != "github-hosted" {
		t.Fatal("upgrade lifecycle requires a disposable GitHub-hosted Windows runner")
	}
	sequenceDiagnostic := os.Getenv("KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC") == "1"
	beta1 := os.Getenv("KSESSION_BETA1_SETUP")
	artifact, build, base, repo := os.Getenv("KSESSION_SETUP_ARTIFACT"), os.Getenv("KSESSION_SETUP_BUILD"), os.Getenv("KSESSION_SETUP_UPGRADE_EVIDENCE"), os.Getenv("KSESSION_PORTABLE_REPO")
	if beta1 == "" || artifact == "" || build == "" || base == "" || repo == "" || !strings.HasPrefix(strings.ToUpper(base), `E:\`) {
		t.Fatal("explicit beta.1, beta.2 and E evidence roots are required")
	}
	if err := os.Mkdir(base, 0700); err != nil {
		t.Fatal(err)
	}
	checks := map[string]map[string]string{}
	sequencePhases := []map[string]string{}
	sequencePhaseActive := false
	record := func(id, method string) {
		checks[id] = map[string]string{"status": "PASS", "method": method}
		t.Log(id, "PASS", method)
	}
	report := map[string]any{"status": "RUNNING", "checks": checks, "beta1SourceCommit": "e9417f036d0cdf736ff84682556a994040f0de0b", "beta2SourceCommit": os.Getenv("GITHUB_SHA")}
	defer func() {
		panicked := recover()
		failed := t.Failed() || panicked != nil
		file := "UPGRADE-TEST-REPORT.json"
		if sequenceDiagnostic {
			if failed && sequencePhaseActive && len(sequencePhases) > 0 {
				current := sequencePhases[len(sequencePhases)-1]
				current["result"] = "STAGE_FAILED"
				current["state"] = "STOPPED"
				sequencePhaseActive = false
			}
			file = "SEQUENCE-DIAGNOSTIC.json"
			report = map[string]any{"schema": 1, "status": "PASS", "phases": sequencePhases}
		}
		if failed {
			report["status"] = "FAIL"
		} else if !sequenceDiagnostic {
			report["status"] = "PASS"
		}
		b, _ := json.MarshalIndent(report, "", "  ")
		_ = os.WriteFile(filepath.Join(base, file), append(b, '\n'), 0600)
		if panicked != nil {
			panic(panicked)
		}
	}()
	startSequencePhase := func(phase string) {
		t.Helper()
		if !sequenceDiagnostic {
			return
		}
		if sequencePhaseActive {
			t.Fatal("sequence diagnostic phase overlap")
		}
		sequencePhases = append(sequencePhases, map[string]string{"phase": phase, "result": "STAGE_PENDING", "state": "RUNNING"})
		sequencePhaseActive = true
	}
	completeSequencePhase := func(phase, result, state string) {
		t.Helper()
		if !sequenceDiagnostic {
			return
		}
		if !sequencePhaseActive || len(sequencePhases) == 0 || sequencePhases[len(sequencePhases)-1]["phase"] != phase {
			t.Fatal("sequence diagnostic phase completion mismatch")
		}
		current := sequencePhases[len(sequencePhases)-1]
		current["result"] = result
		current["state"] = state
		sequencePhaseActive = false
	}
	startSequencePhase("PRE_ENV_READY")

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
	instance := upgradeLifecycleInstance(base, os.Getenv("GITHUB_SHA"), sequenceDiagnostic)
	if e = validateFreshInstanceFixture(instance); e != nil {
		t.Fatal(e)
	}
	completeSequencePhase("PRE_ENV_READY", "STAGE_COMPLETE", "COMPLETE")
	beta2 := filepath.Join(artifact, "K-SESSION-Setup-1.1.0-beta.2.exe")

	n := 0
	runSetupRaw := func(binary string) setupRunResult {
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
		_ = c.Run()
		elapsed := time.Since(startedAt).Milliseconds()
		exitCode, processStarted := -1, c.ProcessState != nil
		if processStarted {
			exitCode = c.ProcessState.ExitCode()
		}
		text := decodeInstallerLog(mustRead(t, log))
		return setupRunResult{logText: text, exitCode: exitCode, exitStatus: safeInnoExitStatus(exitCode, processStarted), elapsedMilliseconds: elapsed}
	}
	runSetup := func(binary string, want bool) setupRunResult {
		t.Helper()
		result := runSetupRaw(binary)
		if (result.exitCode == 0) != want {
			t.Fatalf("setup %s success=%v want=%v", filepath.Base(filepath.Dir(filepath.Dir(binary))), result.exitCode == 0, want)
		}
		return result
	}
	assertLog := func(result setupRunResult, marker string) {
		t.Helper()
		if !hasInstallerMarker(safeInstallerMarkers(result.logText), marker) {
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

	startSequencePhase("PRE_BETA1_INSTALL")
	runSetup(beta1, true)
	completeSequencePhase("PRE_BETA1_INSTALL", "STAGE_COMPLETE", "COMPLETE")
	startSequencePhase("PRE_REGISTRATION_ASSERT")
	assertRegistration("1.1.0-beta.1")
	record("U01", "fresh rebuilt beta.1 installed with real registration and binding")
	completeSequencePhase("PRE_REGISTRATION_ASSERT", "STAGE_COMPLETE", "COMPLETE")
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
	startSequencePhase("PRE_LAUNCH_READY")
	app := startApp()
	until(t, func() bool { return lastEvent(instance, "READY") != nil })
	ready := lastEvent(instance, "READY")
	pid := uint32(ready["pid"].(float64))
	port := int(ready["port"].(float64))
	node := filepath.Join(root, "runtime", "node.exe")
	completeSequencePhase("PRE_LAUNCH_READY", "STAGE_COMPLETE", "COMPLETE")
	startSequencePhase("PRE_BETA1_CORE_PROBE")
	coreProbe("BETA1_INITIAL", node, filepath.Join(repo, "tools/tests/windows-portable/core-client.cjs"), root, instance, fmt.Sprint(port), filepath.Join(base, "core-beta1"), "initial")
	completeSequencePhase("PRE_BETA1_CORE_PROBE", "STAGE_COMPLETE", "COMPLETE")
	startSequencePhase("PRE_U02_RUNNING_GUARD")
	runningLog := runSetup(beta2, false)
	assertLog(runningLog, "KSESSION_REJECT_RUNNING")
	if !alivePID(pid) || !alivePID(uint32(app.Process.Pid)) {
		t.Fatal("upgrade running guard terminated beta.1")
	}
	record("U02", "real running beta.1 rejected without terminating Launcher or private Node")
	completeSequencePhase("PRE_U02_RUNNING_GUARD", "STAGE_COMPLETE", "COMPLETE")
	startSequencePhase("PRE_BETA1_STOP")
	cls := "KSESSION_" + digest([]byte(strings.ToLower(instance)))
	if !dispatchExisting(cls, launcher, true) {
		t.Fatal("stop beta.1 failed")
	}
	until(t, func() bool { return !alivePID(pid) && !alivePID(uint32(app.Process.Pid)) })
	_ = app.Wait()
	completeSequencePhase("PRE_BETA1_STOP", "STAGE_COMPLETE", "COMPLETE")
	startSequencePhase("PRE_OWNED_STATE_SNAPSHOT")
	instanceStable := walkHash(instance)
	ownedStable := owned()
	completeSequencePhase("PRE_OWNED_STATE_SNAPSHOT", "STAGE_COMPLETE", "COMPLETE")
	probeSequenceIdentity := func(phase string) {
		t.Helper()
		startSequencePhase(phase)
		result := runSetup(beta2, false)
		reason := "IDENTITY_INTERNAL"
		markers := safeInstallerMarkers(result.logText)
		if hasInstallerMarker(markers, "KSESSION_SEQUENCE_IDENTITY_ACCEPTED") {
			reason = "IDENTITY_ACCEPTED"
		} else {
			for _, detail := range []string{"NAME_VERSION", "COUNT", "NAME", "VERSION", "SNAPSHOT", "CONFLICT", "UNINSTALL", "AMBIGUOUS", "INCONSISTENT"} {
				if hasInstallerMarker(markers, "KSESSION_SEQUENCE_REGISTRATION_"+detail) {
					reason = "IDENTITY_REGISTRATION_" + detail
					break
				}
			}
			for _, stage := range []string{"REGISTRATION", "BINDING", "PATH", "MANIFEST", "PROGRAM", "BUILD", "RUNTIME", "LAUNCHER", "INTERNAL"} {
				if reason == "IDENTITY_INTERNAL" && hasInstallerMarker(markers, "KSESSION_UPGRADE_GATE_IDENTITY_"+stage) {
					reason = "IDENTITY_" + stage
					break
				}
			}
		}
		state := "CHANGED"
		if equalMaps(instanceStable, walkHash(instance)) && equalMaps(ownedStable, owned()) {
			state = "UNCHANGED"
		}
		completeSequencePhase(phase, reason, state)
		if reason != "IDENTITY_ACCEPTED" || state != "UNCHANGED" {
			t.Fatalf("sequence identity phase %s rejected: result=%s state=%s", phase, reason, state)
		}
	}
	if sequenceDiagnostic {
		probeSequenceIdentity("BASELINE")
	}

	// Corruption gates are exercised against the real beta.1 installation and exact bytes are restored by the harness.
	for _, probe := range []struct{ id, file string }{{"U15", filepath.Join(instance, "data.json")}, {"U16", filepath.Join(target, "uninstall", "instance-binding.ini")}, {"U17", filepath.Join(root, "app", "login.html")}} {
		startSequencePhase(probe.id)
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
		probeResult := runSetup(beta2, false)
		phaseResult := map[string]string{"U15": "PREFLIGHT_REJECTED", "U16": "IDENTITY_BINDING", "U17": "IDENTITY_PROGRAM"}[probe.id]
		if sequenceDiagnostic {
			markers := safeInstallerMarkers(probeResult.logText)
			want := map[string]string{"U15": "KSESSION_UPGRADE_PREFLIGHT_REJECTED", "U16": "KSESSION_UPGRADE_GATE_IDENTITY_BINDING", "U17": "KSESSION_UPGRADE_GATE_IDENTITY_PROGRAM"}[probe.id]
			if !hasInstallerMarker(markers, want) {
				t.Fatalf("sequence mutation %s lacked fixed rejection", probe.id)
			}
		}
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
		completeSequencePhase(probe.id, phaseResult, "CONTROLLED_MUTATION")
		if sequenceDiagnostic {
			probeSequenceIdentity("AFTER_" + probe.id)
		}
	}

	fixtures := []struct{ id, dir, marker string }{{"U18", "fault-space", "KSESSION_REJECT_SPACE"}, {"U20", "fault-cancel", "KSESSION_FIXTURE_CANCEL_DURING_COPY"}, {"U21", "fault-copy", "KSESSION_FIXTURE_COPY_FAILURE"}, {"U22", "fault-payload-hash", "KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED"}, {"U23", "fault-post-copy", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE"}}
	if sequenceDiagnostic {
		fixtures = fixtures[:1]
	}
	for _, f := range fixtures {
		startSequencePhase(f.id)
		binary := filepath.Join(build, f.dir, "artifact", "K-SESSION-Setup-1.1.0-beta.2.exe")
		result := runSetupRaw(binary)
		markers := safeInstallerMarkers(result.logText)
		failure := ""
		if f.id == "U22" {
			failure = payloadHashDiagnosticFailure(markers)
		} else if !hasInstallerMarker(markers, f.marker) {
			failure = "FIXTURE_MARKER_MISSING"
		}
		state := "UNCHANGED"
		if !equalMaps(instanceStable, walkHash(instance)) || !equalMaps(ownedStable, owned()) {
			state = "CHANGED"
		}
		if result.exitCode == 0 {
			if f.id == "U22" {
				failure = "PAYLOAD_HASH_UNEXPECTED_SUCCESS"
			} else {
				failure = "FIXTURE_UNEXPECTED_SUCCESS"
			}
		}
		if failure != "" || state != "UNCHANGED" {
			t.Fatalf("%s diagnostic=%s state=%s %s", f.id, failure, state, safeSetupFailure(f.marker, result))
		}
		method := "real Inno fault fixture restored program, metadata, registration, binding, shortcuts and byte-identical instance"
		if f.id == "U22" {
			method = "target manifest hash mismatch rejected before program rewrite; old owned state and byte-identical instance retained"
		}
		record(f.id, method)
		completeSequencePhase(f.id, "SPACE_REJECTED", "UNCHANGED")
	}
	if sequenceDiagnostic {
		probeSequenceIdentity("U20_PRECOPY")
		startSequencePhase("U22")
		result := runSetupRaw(filepath.Join(build, "fault-payload-hash", "artifact", "K-SESSION-Setup-1.1.0-beta.2.exe"))
		markers := safeInstallerMarkers(result.logText)
		state := "UNCHANGED"
		if !equalMaps(instanceStable, walkHash(instance)) || !equalMaps(ownedStable, owned()) {
			state = "CHANGED"
		}
		failure := payloadHashDiagnosticFailure(markers)
		if result.exitCode == 0 {
			failure = "PAYLOAD_HASH_UNEXPECTED_SUCCESS"
		} else if state == "CHANGED" {
			failure = "PAYLOAD_HASH_STATE_CHANGED"
		}
		if failure != "" {
			completeSequencePhase("U22", failure, state)
			t.Fatal("closed payload hash diagnostic failed")
		}
		completeSequencePhase("U22", "PAYLOAD_HASH_REJECTED", "UNCHANGED")
		return
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
	copyPrepare := safeInstallerMarkers("KSESSION_FIXTURE_COPY_INJECTION_PREPARE_FAILED")
	if !hasInstallerMarker(copyPrepare, "KSESSION_FIXTURE_COPY_INJECTION_PREPARE_FAILED") || hasInstallerMarker(copyPrepare, "KSESSION_FIXTURE_COPY_FAILURE") {
		t.Fatal("copy injection preparation failure was confused with a real native copy failure")
	}
	postCopyStages := []string{
		"KSESSION_UPGRADE_GATE_ACCEPTED", "KSESSION_UPGRADE_TRANSACTION_PREPARED", "KSESSION_UPGRADE_NATIVE_COPY_COMPLETE",
		"KSESSION_UPGRADE_TRANSACTION_SWAPPED", "KSESSION_UPGRADE_INSTALLED_VERIFIED", "KSESSION_FIXTURE_POST_COPY_VERIFY_FAILURE",
		"KSESSION_UPGRADE_POSTINSTALL_FAILED", "KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK",
	}
	postCopyMarkers := safeInstallerMarkers(strings.Join(postCopyStages, " "))
	if postCopyDiagnosticFailure(postCopyMarkers) != "" {
		t.Fatal("complete post-copy diagnostic stages were rejected")
	}
	postCopyFailures := []string{
		"POST_COPY_GATE_NOT_ACCEPTED", "POST_COPY_PREPARE_FAILED", "POST_COPY_NATIVE_COPY_NOT_REACHED", "POST_COPY_COMMIT_FAILED",
		"POST_COPY_INSTALL_VERIFY_FAILED", "POST_COPY_MARKER_MISSING", "POST_COPY_FAILURE_HANDLER_MISSING", "POST_COPY_ROLLBACK_MARKER_MISSING",
	}
	for i, want := range postCopyFailures {
		markers := append([]string{}, postCopyStages[:i]...)
		markers = append(markers, postCopyStages[i+1:]...)
		if got := postCopyDiagnosticFailure(strings.Join(markers, ",")); got != want {
			t.Fatalf("post-copy diagnostic first-stage counterexample=%s want=%s", got, want)
		}
	}
	withFinalize := safeInstallerMarkers(strings.Join(append(postCopyStages, "KSESSION_UPGRADE_TRANSACTION_COMMITTED"), " "))
	if got := postCopyDiagnosticFailure(withFinalize); got != "POST_COPY_UNEXPECTED_FINALIZE" {
		t.Fatalf("post-copy diagnostic finalize counterexample=%s", got)
	}
	rollbackStages := append([]string{}, postCopyStages[:len(postCopyStages)-1]...)
	rollbackStages = append(rollbackStages, "KSESSION_UPGRADE_ROLLBACK_FAILED")
	rollbackFailed := safeInstallerMarkers(strings.Join(rollbackStages, " "))
	if got := postCopyDiagnosticFailure(rollbackFailed); got != "POST_COPY_ROLLBACK_FAILED" {
		t.Fatalf("post-copy diagnostic rollback counterexample=%s", got)
	}
	payloadStages := []string{
		"KSESSION_UPGRADE_GATE_ACCEPTED", "KSESSION_UPGRADE_TRANSACTION_PREPARED", "KSESSION_UPGRADE_NATIVE_COPY_COMPLETE",
		"KSESSION_UPGRADE_COMMIT_MANIFEST_HASH_REJECTED", "KSESSION_UPGRADE_POSTINSTALL_FAILED", "KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK",
	}
	if got := payloadHashDiagnosticFailure(safeInstallerMarkers(strings.Join(payloadStages, " "))); got != "" {
		t.Fatalf("complete payload-hash diagnostic rejected=%s", got)
	}
	conflictingPayload := safeInstallerMarkers(strings.Join(append(payloadStages, "KSESSION_UPGRADE_COMMIT_UNKNOWN"), " "))
	if got := payloadHashDiagnosticFailure(conflictingPayload); got != "PAYLOAD_HASH_REASON_CONFLICT" {
		t.Fatalf("payload-hash conflicting reason counterexample=%s", got)
	}
	if safeInstallerMarkers("KSESSION_UPGRADE_ROOT_MISMATCH KSESSION_REJECT_INSTANCE_LOCK") != "KSESSION_REJECT_INSTANCE_LOCK,KSESSION_UPGRADE_ROOT_MISMATCH" {
		t.Fatal("installer marker diagnostic omitted a fixed pre-space rejection")
	}
	gateDiagnostic := safeInstallerMarkers("path=C:\\private token=secret KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_CONFLICT raw-json={private}")
	if gateDiagnostic != "KSESSION_UPGRADE_GATE_PREFLIGHT_BINDING_CONFLICT" || strings.Contains(gateDiagnostic, "private") || strings.Contains(gateDiagnostic, "secret") {
		t.Fatal("upgrade gate diagnostic leaked unapproved details")
	}
	if safeInstallerMarkers("profile=fresh-ci-baseline hash=private KSESSION_UPGRADE_GATE_IDENTITY_BUILD") != "KSESSION_UPGRADE_GATE_IDENTITY_BUILD" {
		t.Fatal("upgrade identity stage diagnostic leaked anchor details")
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
