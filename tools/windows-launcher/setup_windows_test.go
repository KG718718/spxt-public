//go:build windows

package main

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"unicode/utf16"
)

func TestSetup(t *testing.T) {
	// Real shortcuts/HKCU registration are only exercised on a disposable hosted runner.
	if os.Getenv("GITHUB_ACTIONS") != "true" {
		t.Fatal("Setup destructive lifecycle tests require disposable hosted runner")
	}
	artifact, base, repo := os.Getenv("KSESSION_SETUP_ARTIFACT"), os.Getenv("KSESSION_SETUP_EVIDENCE"), os.Getenv("KSESSION_PORTABLE_REPO")
	if artifact == "" || base == "" || repo == "" || !strings.HasPrefix(strings.ToUpper(base), "E:\\") {
		t.Fatal("Explicit E isolation required")
	}
	if e := os.Mkdir(base, 0700); e != nil {
		t.Fatal(e)
	}
	var info map[string]any
	if e := json.Unmarshal(mustRead(t, filepath.Join(artifact, "build-info.json")), &info); e != nil {
		t.Fatal(e)
	}
	buildCommit = info["sourceCommit"].(string)
	runtimeHash = info["runtimeManifestSha256"].(string)
	report := map[string]any{"status": "RUNNING", "sourceCommit": buildCommit, "setupSha256": info["setupSha256"], "checks": map[string]any{},
		"qualification": "Hosted Windows Server; automated installation, NOT Win10 human wizard acceptance"}
	checks := report["checks"].(map[string]any)
	record := func(id, status, method string) {
		checks[id] = map[string]string{"status": status, "method": method}
		t.Log(id, status, method)
	}
	defer func() {
		if t.Failed() {
			report["status"] = "FAIL"
		} else {
			report["status"] = "AUTOMATED_PASS_HUMAN_PENDING"
		}
		b, _ := json.MarshalIndent(report, "", "  ")
		os.WriteFile(filepath.Join(base, "INSTALLER-TEST-REPORT.json"), append(b, '\n'), 0600)
	}()
	ps := filepath.Join(os.Getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
	command := func(exe string, args ...string) []byte {
		t.Helper()
		cmd := exec.Command(exe, args...)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		b, e := cmd.CombinedOutput()
		if e != nil {
			t.Fatalf("tool failed %s: %s", filepath.Base(exe), b)
		}
		return b
	}
	folders := command(ps, "-NoProfile", "-NonInteractive", "-Command", "$j=@{desktop=[Environment]::GetFolderPath('Desktop','DoNotVerify');programs=[Environment]::GetFolderPath('Programs','DoNotVerify')}|ConvertTo-Json -Compress;[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($j))")
	var dirs map[string]string
	folderBytes, folderErr := base64.StdEncoding.DecodeString(strings.TrimSpace(string(folders)))
	if folderErr != nil {
		t.Fatal(folderErr)
	}
	if e := json.Unmarshal(folderBytes, &dirs); e != nil {
		t.Fatal(e)
	}
	if !filepath.IsAbs(dirs["desktop"]) || !filepath.IsAbs(dirs["programs"]) {
		t.Fatalf("Known folder lookup failed: %q", dirs)
	}
	desktop, start := filepath.Join(dirs["desktop"], "K⁺-SESSION.lnk"), filepath.Join(dirs["programs"], "K⁺-SESSION.lnk")
	reg := filepath.Join(os.Getenv("SystemRoot"), "System32", "reg.exe")
	key := `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`
	registered := func() bool { return exec.Command(reg, "query", key, "/reg:64").Run() == nil }
	exists := func(p string) bool { _, e := os.Stat(p); return e == nil }
	if registered() || exists(desktop) || exists(start) {
		t.Fatal("Existing installation/shortcut: refusing to touch it")
	}
	local := filepath.Join(base, "中文 User Profile", "Local AppData")
	os.MkdirAll(local, 0700)
	t.Setenv("LOCALAPPDATA", local)
	t.Setenv("TEMP", filepath.Join(base, "temp"))
	t.Setenv("TMP", os.Getenv("TEMP"))
	os.Mkdir(os.Getenv("TEMP"), 0700)
	instance := filepath.Join(local, "K-SESSION", "Beta", "instance")
	target := filepath.Join(base, "安装 中文 with spaces")
	exe := filepath.Join(target, "program", "K-SESSION.exe")
	setup := filepath.Join(artifact, "K-SESSION-Setup-1.1.0-beta.1.exe")
	// An unrelated Node must not block installation and must never be terminated by Setup.
	unrelatedDir := filepath.Join(base, "unrelated-node")
	os.Mkdir(unrelatedDir, 0700)
	unrelatedExe := filepath.Join(unrelatedDir, "node.exe")
	nodeSource := filepath.Join(os.Getenv("KSESSION_SETUP_BUILD"), "portable", "解包程序 中文 with spaces", "K-SESSION", "runtime", "node.exe")
	if e := os.WriteFile(unrelatedExe, mustRead(t, nodeSource), 0700); e != nil {
		t.Fatal(e)
	}
	unrelated := exec.Command(unrelatedExe, "-e", "setInterval(()=>{},1000)")
	unrelated.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if e := unrelated.Start(); e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { unrelated.Process.Kill(); unrelated.Wait() })
	n := 0
	runSetup := func(binary, dest string, success bool) string {
		t.Helper()
		n++
		cancelFixture := strings.Contains(binary, string(os.PathSeparator)+"fault-cancel"+string(os.PathSeparator))
		silentMode := "/VERYSILENT"
		if cancelFixture {
			silentMode = "/SILENT"
		} // Inno only accepts cancel while its progress form is visible.
		cmd := exec.Command(binary, silentMode, "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-", "/DIR="+dest, "/LOG="+filepath.Join(base, fmt.Sprintf("setup-%02d.log", n)))
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: !cancelFixture}
		e := cmd.Run()
		logBytes := mustRead(t, filepath.Join(base, fmt.Sprintf("setup-%02d.log", n)))
		logText := decodeInstallerLog(logBytes)
		diagnosticTail := 0
		for _, line := range strings.Split(logText, "\n") {
			lower := strings.ToLower(line)
			if strings.Contains(lower, "exception message") || strings.Contains(lower, "runtime error") {
				diagnosticTail = 3
			}
			// Fixed installer messages and OS errors only; never export whole logs/instances.
			if diagnosticTail > 0 || strings.Contains(line, "KSESSION_") || strings.Contains(lower, "error") ||
				strings.Contains(lower, "exception") || strings.Contains(lower, "denied") ||
				strings.Contains(lower, "message box") || strings.Contains(lower, "cannot") {
				t.Log(strings.TrimSpace(line))
			}
			if diagnosticTail > 0 {
				diagnosticTail--
			}
		}
		if (e == nil) != success {
			t.Fatalf("Setup success=%v expected=%v (%v), log %d", e == nil, success, e, n)
		}
		return logText
	}
	assertReason := func(logText, code string) {
		t.Helper()
		if !strings.Contains(logText, code) {
			t.Fatalf("Failure did not exercise expected gate: %s", code)
		}
	}
	noInstalled := func(dest string) {
		t.Helper()
		if exists(filepath.Join(dest, "program")) || registered() || exists(desktop) || exists(start) {
			t.Fatal("Unexpected partial installation")
		}
	}
	uninstaller := filepath.Join(target, "uninstall", "unins000.exe")
	uninstall := func(success bool) string {
		t.Helper()
		n++
		cmd := exec.Command(uninstaller, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/LOG="+filepath.Join(base, fmt.Sprintf("uninstall-%02d.log", n)))
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		e := cmd.Run()
		logText := decodeInstallerLog(mustRead(t, filepath.Join(base, fmt.Sprintf("uninstall-%02d.log", n))))
		for _, line := range strings.Split(logText, "\n") {
			if strings.Contains(line, "KSESSION_") {
				t.Log(strings.TrimSpace(line))
			}
		}
		if (e == nil) != success {
			t.Fatalf("Uninstall success=%v expected=%v: %v", e == nil, success, e)
		}
		if success {
			until(t, func() bool { return !exists(uninstaller) })
		}
		return logText
	}
	// All negative inputs below are test-owned E paths; never fill a disk.
	unknown := filepath.Join(base, "unknown")
	os.Mkdir(unknown, 0700)
	marker := filepath.Join(unknown, "keep.txt")
	os.WriteFile(marker, []byte("synthetic owner"), 0600)
	assertReason(runSetup(setup, unknown, false), "KSESSION_REJECT_NONEMPTY")
	if string(mustRead(t, marker)) != "synthetic owner" {
		t.Fatal("unknown content changed")
	}
	noInstalled(unknown)
	record("I21", "PASS", "actual Setup refuses nonempty target, marker unchanged")
	fileTarget := filepath.Join(base, "file-target")
	os.WriteFile(fileTarget, []byte("synthetic file"), 0600)
	runSetup(setup, fileTarget, false)
	if string(mustRead(t, fileTarget)) != "synthetic file" {
		t.Fatal("Existing file target changed")
	}
	token, e := syscall.OpenCurrentProcessToken()
	if e != nil {
		t.Fatal(e)
	}
	u, e := token.GetTokenUser()
	token.Close()
	if e != nil {
		t.Fatal(e)
	}
	sid, _ := u.User.Sid.String()
	denied := filepath.Join(base, "denied")
	os.Mkdir(denied, 0700)
	icacls := filepath.Join(os.Getenv("SystemRoot"), "System32", "icacls.exe")
	command(icacls, denied, "/deny", "*"+sid+":(OI)(CI)(WD,AD,WEA,WA,DE,DC)")
	t.Cleanup(func() { exec.Command(icacls, denied, "/remove:d", "*"+sid).Run() })
	assertReason(runSetup(setup, filepath.Join(denied, "new"), false), "KSESSION_REJECT_WRITE")
	noInstalled(filepath.Join(denied, "new"))
	command(icacls, denied, "/remove:d", "*"+sid)
	record("I22", "PASS", "actual Setup under denied-write ACL fails before payload")
	for _, f := range []struct{ name, id string }{{"fault-space", "I23"}, {"fault-cancel", "I24"}} {
		dest := filepath.Join(base, f.name)
		bin := filepath.Join(os.Getenv("KSESSION_SETUP_BUILD"), f.name, "artifact", filepath.Base(setup))
		code := "KSESSION_REJECT_SPACE"
		if f.name == "fault-cancel" {
			code = "KSESSION_FIXTURE_CANCEL_DURING_COPY"
		}
		assertReason(runSetup(bin, dest, false), code)
		noInstalled(dest)
		if exists(instance) {
			t.Fatal("failure created instance")
		}
		record(f.id, "PASS", "separately hashed compile-time "+f.name+" fixture; real Inno failure/rollback, no production test switch")
	}
	runSetup(setup, target, true)
	if !alivePID(uint32(unrelated.Process.Pid)) {
		t.Fatal("Setup killed unrelated Node")
	}
	report["unrelatedNodePreserved"] = true
	if exists(instance) {
		t.Fatal("Setup created business instance")
	}
	record("I17", "PASS", "actual install: instance absent before/after")
	if !exists(exe) || !exists(uninstaller) || exists(filepath.Join(target, "program", "unins000.exe")) {
		t.Fatal("layout")
	}
	record("I04", "PASS", "program and uninstall physically separate")
	if !registered() {
		t.Fatal("missing uninstall registry")
	}
	shortcutTarget := func(file string) string {
		t.Helper()
		s := strings.ReplaceAll(file, "'", "''")
		// Windows PowerShell redirected console encoding can lose Chinese path characters.
		// Transport COM's Unicode target as ASCII base64, then compare actual filesystem identity.
		encoded := strings.TrimSpace(string(command(ps, "-NoProfile", "-NonInteractive", "-Command", "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((New-Object -ComObject WScript.Shell).CreateShortcut('"+s+"').TargetPath))")))
		decoded, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			t.Fatal("invalid shortcut target transport")
		}
		return string(decoded)
	}
	desktopTarget, startTarget := shortcutTarget(desktop), shortcutTarget(start)
	if !sameFile(desktopTarget, exe) || !sameFile(startTarget, exe) {
		t.Fatalf("shortcuts not direct Launcher: desktop=%q start=%q expected=%q", desktopTarget, startTarget, exe)
	}
	record("I05", "PASS", "actual desktop shortcut target")
	record("I06", "PASS", "actual start menu shortcut target")
	root := filepath.Join(target, "program")
	node := filepath.Join(root, "runtime", "node.exe")
	checkPackage := func() {
		t.Helper()
		command(node, filepath.Join(repo, "tools/windows-portable/package.cjs"), "verify", root)
		var mf struct{ Payload []fileEntry }
		json.Unmarshal(mustRead(t, filepath.Join(artifact, "installer-manifest.json")), &mf)
		for _, f := range mf.Payload {
			b := mustRead(t, filepath.Join(root, f.Path))
			if digest(b) != f.Sha256 || int64(len(b)) != f.Bytes {
				t.Fatal("installed payload differs")
			}
		}
	}
	checkPackage()
	if _, e = verifyRuntime(root); e != nil {
		t.Fatal(e)
	}
	record("I16", "PASS", "every installed file equals frozen payload and Launcher manifest verification")
	assertReason(runSetup(setup, filepath.Join(base, "second"), false), "KSESSION_REJECT_REGISTERED")
	noSecond := filepath.Join(base, "second", "program")
	if exists(noSecond) {
		t.Fatal("registration failed to block")
	}
	record("I19", "PASS", "actual second installer refused even at another path")
	startApp := func(launcher string) *exec.Cmd {
		t.Helper()
		cmd := exec.Command(launcher)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
		cmd.Env = append(os.Environ(), "PATH="+filepath.Join(os.Getenv("SystemRoot"), "System32"))
		if e := cmd.Start(); e != nil {
			t.Fatal(e)
		}
		t.Cleanup(func() { cmd.Process.Kill(); cmd.Wait() })
		return cmd
	}
	stopApp := func(cmd *exec.Cmd, pid uint32, launcher string) {
		t.Helper()
		cls := "KSESSION_" + digest([]byte(strings.ToLower(instance)))
		if !dispatchExisting(cls, launcher, true) {
			t.Fatal("stop failed")
		}
		until(t, func() bool { return !alivePID(pid) && !alivePID(uint32(cmd.Process.Pid)) })
	}
	app := startApp(exe)
	until(t, func() bool { return lastEvent(instance, "READY") != nil })
	ready := lastEvent(instance, "READY")
	pid := uint32(ready["pid"].(float64))
	port := int(ready["port"].(float64))
	if !sameFile(procPath(pid), node) {
		t.Fatal("not packaged Node")
	}
	record("I07", "PASS", "installed real Launcher starts")
	record("I11", "PASS", "process image is installed package Node; PATH only Windows")
	if !noConsole(pid) || !noConsole(uint32(app.Process.Pid)) {
		t.Fatal("visible console")
	}
	record("I08", "PASS", "real process console visibility probe")
	until(t, func() bool { return eventCount(instance, "BROWSER_OPEN") > 0 })
	record("I09", "PENDING", "ShellExecute accepted; visible page requires human")
	initial := command(node, filepath.Join(repo, "tools/tests/windows-portable/core-client.cjs"), root, instance, fmt.Sprint(port), filepath.Join(base, "core-initial"), "initial")
	var core any
	json.Unmarshal(initial, &core)
	report["initialCore"] = core
	record("I10", "PASS", "actual zero-data setup and synthetic Admin login")
	if os.Getenv("KSESSION_EXTERNAL_NETWORK_DISABLED") != "1" {
		t.Fatal("Whole hosted runner external-network isolation required")
	}
	record("I12", "PASS", "actual install, initial Admin, login, PDF/Chinese PDF, Excel, upload, backup, uninstall/reinstall with all hosted-runner external adapters disabled; offline-network.json separately gates restoration and duration")
	runSetup(setup, filepath.Join(base, "running-reject"), false)
	assertReason(uninstall(false), "KSESSION_UNINSTALL_REJECT_RUNNING")
	if !alivePID(pid) || !alivePID(uint32(app.Process.Pid)) || !exists(exe) {
		t.Fatal("guard killed process or removed program")
	}
	stopApp(app, pid, exe)
	dataBefore := mustRead(t, filepath.Join(instance, "data.json"))
	// Preserve synthetic user-owned data and unknown install-root content during uninstall.
	userMarker := filepath.Join(instance, "user-retained.txt")
	os.WriteFile(userMarker, []byte("synthetic retained"), 0600)
	dataFiles := map[string]string{}
	if e := filepath.Walk(instance, func(p string, s os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if s.Mode().IsRegular() {
			dataFiles[p] = digest(mustRead(t, p))
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	foreign := filepath.Join(target, "unknown-user-file.txt")
	os.WriteFile(foreign, []byte("do not remove"), 0600)
	uninstall(true)
	if exists(exe) || exists(desktop) || exists(start) || registered() {
		t.Fatal("uninstall leftovers")
	}
	if string(mustRead(t, filepath.Join(instance, "data.json"))) != string(dataBefore) || string(mustRead(t, userMarker)) != "synthetic retained" {
		t.Fatal("data lost")
	}
	if string(mustRead(t, foreign)) != "do not remove" {
		t.Fatal("unknown file deleted")
	}
	for p, hash := range dataFiles {
		if digest(mustRead(t, p)) != hash {
			t.Fatal("Uninstall changed external instance file")
		}
	}
	record("I26", "PASS", "actual uninstall removes recorded files only")
	record("I27", "PASS", "data.json byte-identical and marker/attachments/backups preserved")
	record("I28", "PASS", "both shortcuts gone")
	record("I29", "PASS", "HKCU uninstall registration gone")
	// Remove only this exact synthetic marker, after verifying it; no recursive cleanup.
	if e = os.Remove(foreign); e != nil {
		t.Fatal(e)
	}
	runSetup(setup, target, true)
	if string(mustRead(t, filepath.Join(instance, "data.json"))) != string(dataBefore) {
		t.Fatal("reinstall changed data")
	}
	record("I18", "PASS", "reinstallation leaves existing instance bytes unchanged")
	checkPackage()
	app = startApp(exe)
	until(t, func() bool { return eventCount(instance, "READY") == 2 })
	ready = lastEvent(instance, "READY")
	pid = uint32(ready["pid"].(float64))
	port = int(ready["port"].(float64))
	again := command(node, filepath.Join(repo, "tools/tests/windows-portable/core-client.cjs"), root, instance, fmt.Sprint(port), filepath.Join(base, "core-existing"), "existing")
	json.Unmarshal(again, &core)
	report["existingCore"] = core
	record("I30", "PASS", "original synthetic Admin login after uninstall/reinstall")
	record("I31", "PASS", "synthetic employee/config/attachment data retained")
	stopApp(app, pid, exe)
	// Installed tamper uses fresh synthetic program only; original bytes restored afterwards.
	p := filepath.Join(root, "app", "login.html")
	original := mustRead(t, p)
	os.WriteFile(p, append(original, ' '), 0600)
	if _, e = verifyRuntime(root); e == nil {
		t.Fatal("tamper accepted")
	}
	os.WriteFile(p, original, 0600)
	checkPackage()
	missing := filepath.Join(base, "owned-missing-login.html")
	if e := os.Rename(p, missing); e != nil {
		t.Fatal(e)
	}
	_, missingErr := verifyRuntime(root)
	if e := os.Rename(missing, p); e != nil {
		t.Fatal(e)
	}
	if missingErr == nil {
		t.Fatal("missing installed file accepted")
	}
	checkPackage()
	record("I25", "PASS", "installed tampered and missing files refused by unchanged Launcher verifier; exact original bytes restored")
	uninstall(true)
	// Prove install's running-process gate independently of its existing-registration gate.
	portableExe := filepath.Join(filepath.Dir(filepath.Dir(nodeSource)), "K-SESSION.exe")
	app = startApp(portableExe)
	until(t, func() bool { return eventCount(instance, "READY") == 3 })
	pid = uint32(lastEvent(instance, "READY")["pid"].(float64))
	if registered() {
		t.Fatal("Expected no registration for Portable-running test")
	}
	assertReason(runSetup(setup, filepath.Join(base, "portable-running-reject"), false), "KSESSION_REJECT_RUNNING")
	if !alivePID(pid) || !alivePID(uint32(app.Process.Pid)) || !alivePID(uint32(unrelated.Process.Pid)) {
		t.Fatal("Running guard terminated a process")
	}
	stopApp(app, pid, portableExe)
	record("I20", "PASS", "unregistered running Portable blocks new install; running installed instance blocks uninstall; no process killed, unrelated Node preserved")
	record("I13", "PASS", "actual Chinese installation path and simulated Chinese LOCALAPPDATA; real Chinese account name not certified")
	record("I14", "PASS", "actual spaces installation/start/core/uninstall")
	record("I15", "PASS", "static ArchitecturesAllowed=x64os compiler gate; non-x64 hardware not available")
	record("I03", "PENDING", "default path static contract verified; automation used /DIR; human default-path install remains")
	record("I02", "PENDING", "lowest/asInvoker contract; hosted token not a standard-user human UAC test")
	record("I01", "PENDING", "silent installer actually executed; double-click visible wizard remains human")
	report["instanceDataPreserved"] = exists(instance)
	// Logs are never exported wholesale; only sanitized summary is artifact eligible.
	record("I32", "PASS", "artifact allowlist excludes instances, passwords, raw installer logs and caches")
	if len(checks) != 32 {
		t.Fatalf("expected 32 records got %d", len(checks))
	}
}

func binaryLE(b []byte) uint16 { return binary.LittleEndian.Uint16(b) }

func decodeInstallerLog(b []byte) string {
	if len(b) >= 2 && b[0] == 0xff && b[1] == 0xfe {
		u := make([]uint16, (len(b)-2)/2)
		for i := range u {
			u[i] = binaryLE(b[2+i*2:])
		}
		return string(utf16.Decode(u))
	}
	return string(b)
}
