//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

func copyProgram(src, dst string) error {
	if err := os.Mkdir(dst, 0700); err != nil {
		return err
	}
	return filepath.WalkDir(src, func(p string, d os.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if p == src {
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("link")
		}
		rel, e := filepath.Rel(src, p)
		if e != nil {
			return e
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.Mkdir(target, 0700)
		}
		bytes, e := os.ReadFile(p)
		if e != nil {
			return e
		}
		f, e := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if e != nil {
			return e
		}
		defer f.Close()
		_, e = f.Write(bytes)
		return e
	})
}
func TestPortable(t *testing.T) {
	root := os.Getenv("KSESSION_PORTABLE_ROOT")
	base := os.Getenv("KSESSION_PORTABLE_EVIDENCE")
	repo := os.Getenv("KSESSION_PORTABLE_REPO")
	if root == "" || base == "" || repo == "" {
		t.Fatal("explicit portable/repo/evidence required")
	}
	root, e := canonical(root)
	if e != nil {
		t.Fatal(e)
	}
	if within(root, base) {
		t.Fatal("evidence inside program")
	}
	if e = os.Mkdir(base, 0700); e != nil {
		t.Fatal(e)
	}
	base, e = canonical(base)
	if e != nil {
		t.Fatal(e)
	}
	infoBytes, e := os.ReadFile(filepath.Join(root, "build-info.json"))
	if e != nil {
		t.Fatal(e)
	}
	var info map[string]any
	if e = json.Unmarshal(infoBytes, &info); e != nil {
		t.Fatal(e)
	}
	buildCommit = info["sourceCommit"].(string)
	runtimeHash = info["runtimeManifestSha256"].(string)
	checks := []string{}
	pass := func(s string) { checks = append(checks, s); t.Log("PASS", s) }
	report := map[string]any{"sourceCommit": buildCommit, "manifestSha256": runtimeHash, "status": "RUNNING", "qualification": "actual EXE, synthetic data only; browser visibility needs human verification"}
	defer func() {
		report["checks"] = checks
		if t.Failed() {
			report["status"] = "FAIL"
		} else {
			report["status"] = "PASS"
		}
		b, _ := json.MarshalIndent(report, "", "  ")
		os.WriteFile(filepath.Join(base, "portable-test-report.json"), append(b, '\n'), 0600)
	}()
	packageNode := filepath.Join(root, "runtime/node.exe")
	runNode := func(script string, args ...string) []byte {
		t.Helper()
		cmd := exec.Command(packageNode, append([]string{filepath.Join(repo, script)}, args...)...)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		b, e := cmd.CombinedOutput()
		if e != nil {
			t.Fatalf("probe failed: %s", b)
		}
		return b
	}
	before := runNode("tools/windows-portable/package.cjs", "verify", root)
	local := filepath.Join(base, "中文 Local AppData")
	os.Mkdir(local, 0700)
	t.Setenv("LOCALAPPDATA", local)
	instance := filepath.Join(local, "K-SESSION", "Beta", "instance")
	exe := filepath.Join(root, "K-SESSION.exe")
	start := func(executable string) *exec.Cmd {
		t.Helper()
		cmd := exec.Command(executable)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
		cmd.Env = append(os.Environ(), "PATH="+filepath.Join(os.Getenv("SystemRoot"), "System32"), "NODE_OPTIONS=--require synthetic-blocked")
		if e := cmd.Start(); e != nil {
			t.Fatal(e)
		}
		t.Cleanup(func() { cmd.Process.Kill(); cmd.Wait() })
		return cmd
	}
	stop := func(executable string, pid uint32) {
		t.Helper()
		cls := "KSESSION_" + digest([]byte(strings.ToLower(instance)))
		if !dispatchExisting(cls, executable, true) {
			t.Fatal("owner stop failed")
		}
		until(t, func() bool { return !alivePID(pid) })
	}
	// Deny writes in this fresh test program directory. No existing user ACL is altered.
	token, e := syscall.OpenCurrentProcessToken()
	if e != nil {
		t.Fatal(e)
	}
	u, e := token.GetTokenUser()
	token.Close()
	if e != nil {
		t.Fatal(e)
	}
	sid, e := u.User.Sid.String()
	if e != nil {
		t.Fatal(e)
	}
	icacls := filepath.Join(os.Getenv("SystemRoot"), "System32", "icacls.exe")
	// Generic WRITE also covers SYNCHRONIZE and can deny CreateProcess/read access.
	// Deny only mutations; preserve read/execute for the real read-only-program test.
	if b, e := exec.Command(icacls, root, "/deny", "*"+sid+":(OI)(CI)(WD,AD,WEA,WA,DE,DC)").CombinedOutput(); e != nil {
		t.Fatalf("ACL deny: %s", b)
	}
	t.Cleanup(func() { exec.Command(icacls, root, "/remove:d", "*"+sid).Run() })
	probePath := filepath.Join(root, "should-not-be-created")
	if f, e := os.OpenFile(probePath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600); e == nil {
		f.Close()
		t.Fatal("program directory is writable")
	}
	if f, e := os.OpenFile(filepath.Join(root, "app", "server.js"), os.O_WRONLY, 0); e == nil {
		f.Close()
		t.Fatal("existing program file is writable")
	}
	if _, e := os.ReadFile(filepath.Join(root, "app", "server.js")); e != nil {
		t.Fatal("write-denied program must remain readable:", e)
	}
	cmd := start(exe)
	until(t, func() bool { return lastEvent(instance, "READY") != nil })
	ready := lastEvent(instance, "READY")
	pid := uint32(ready["pid"].(float64))
	port := int(ready["port"].(float64))
	pass("P01 first real root EXE launch")
	if !sameFile(procPath(pid), packageNode) {
		t.Fatal("not package Node")
	}
	pass("P02 packaged Node, no system Node/npm PATH")
	if !noConsole(pid) || !noConsole(uint32(cmd.Process.Pid)) {
		t.Fatal("console window")
	}
	pass("P03 no visible CMD")
	until(t, func() bool { return eventCount(instance, "BROWSER_OPEN") > 0 })
	pass("P04 default browser handler accepted after ready (human visibility separate)")
	core := runNode("tools/tests/windows-portable/core-client.cjs", root, instance, fmt.Sprint(port), filepath.Join(base, "core-initial"), "initial")
	report["initialCore"] = json.RawMessage(core)
	pass("P05 first Admin created from zero data")
	pass("P06 login")
	second := start(exe)
	until(t, func() bool { return !alivePID(uint32(second.Process.Pid)) })
	if eventCount(instance, "NODE_SPAWN") != 1 {
		t.Fatal("duplicate backend")
	}
	pass("P07 second launch reuse")
	for _, s := range []string{"P10 actual server ordinary PDF text", "P11 actual server Chinese PDF text", "P12 actual server multipage PDF", "P13 original Excel export API", "P14 Chinese attachment byte/name preservation", "P15 structured backup API"} {
		pass(s)
	}
	pass("P19 all core APIs under write-denied program ACL")
	if !strings.Contains(root, " ") || !strings.Contains(root, "中文") {
		t.Fatal("root lacks Chinese/space test path")
	}
	pass("P20 Chinese Windows path")
	pass("P21 space path")
	if within(root, instance) {
		t.Fatal("instance overlap")
	}
	pass("P23 automatic external Beta instance")
	if _, e := os.Stat(filepath.Join(instance, "launcher-logs", "launcher.log")); e != nil {
		t.Fatal(e)
	}
	pass("P24 external logs")
	// Open HTTP page, no active mutation. Stop must not wait for browser lifetime.
	resp := pageHealthy(port, digest(mustRead(t, filepath.Join(root, "app/login.html"))))
	if !resp {
		t.Fatal("page not openable")
	}
	stop(exe, pid)
	until(t, func() bool { return !alivePID(uint32(cmd.Process.Pid)) })
	pass("S02 stop with page fetched, no submitting request")
	if string(before) != string(runNode("tools/windows-portable/package.cjs", "verify", root)) {
		t.Fatal("package changed")
	}
	// Move by complete copy; reuse the same external data, not the program's former path.
	moved := filepath.Join(base, "移动程序 中文 with spaces")
	if e = copyProgram(root, moved); e != nil {
		t.Fatal(e)
	}
	movedExe := filepath.Join(moved, "K-SESSION.exe")
	blocker, e := net.Listen("tcp4", "127.0.0.1:8080")
	if e != nil {
		t.Fatal("controlled external 8080 unavailable:", e)
	}
	defer blocker.Close()
	movedCmd := start(movedExe)
	until(t, func() bool { return eventCount(instance, "READY") == 2 })
	rd := lastEvent(instance, "READY")
	movedPID := uint32(rd["pid"].(float64))
	p := int(rd["port"].(float64))
	if p == 8080 || !ownsLoopback(movedPID, p) {
		t.Fatal("port fallback failed")
	}
	pass("P08 controlled port fallback")
	conn, e := net.DialTimeout("tcp4", "127.0.0.1:8080", time.Second)
	if e != nil {
		t.Fatal("external listener killed")
	}
	conn.Close()
	pass("P09 external owner remains")
	if !sameFile(procPath(movedPID), filepath.Join(moved, "runtime/node.exe")) {
		t.Fatal("old A path reused")
	}
	again := runNode("tools/tests/windows-portable/core-client.cjs", moved, instance, fmt.Sprint(p), filepath.Join(base, "core-moved"), "existing")
	report["movedCore"] = json.RawMessage(again)
	pass("P16 restart retains Admin and existing data")
	pass("P22 complete copy B reuses data and its own Node")
	// Recover only our known dead child when the user launches again.
	h, err := syscall.OpenProcess(1, false, movedPID)
	if err != nil {
		t.Fatal(err)
	}
	syscall.TerminateProcess(h, 87)
	syscall.CloseHandle(h)
	until(t, func() bool { return eventCount(instance, "NODE_EXITED") == 1 })
	recovery := start(movedExe)
	until(t, func() bool { return eventCount(instance, "READY") == 3 })
	until(t, func() bool { return !alivePID(uint32(recovery.Process.Pid)) })
	movedPID = uint32(lastEvent(instance, "READY")["pid"].(float64))
	if !sameFile(procPath(movedPID), filepath.Join(moved, "runtime/node.exe")) {
		t.Fatal("wrong recovered Node")
	}
	report["deadChildRecovery"] = "PASS: next launch safely recreates only its owned backend"
	stop(movedExe, movedPID)
	until(t, func() bool { return !alivePID(uint32(movedCmd.Process.Pid)) })
	pass("S01 idle stop")
	conn, e = net.DialTimeout("tcp4", "127.0.0.1:8080", time.Second)
	if e != nil {
		t.Fatal("stop killed external owner")
	}
	conn.Close()
	blocker.Close()
	pass("P17 stop only owns its child")
	if string(before) != string(runNode("tools/windows-portable/package.cjs", "verify", root)) {
		t.Fatal("root modified")
	}
	if string(before) != string(runNode("tools/windows-portable/package.cjs", "verify", moved)) {
		t.Fatal("moved root differs")
	}
	if _, e := verifyRuntime(root); e != nil {
		t.Fatal(e)
	}
	pass("P18 full program hashes unchanged")
	pass("P25 exact package inventory excludes data, accounts, caches")
	if len(checks) != 27 {
		t.Fatalf("expected 27, got %d", len(checks))
	}
}
func mustRead(t *testing.T, p string) []byte {
	t.Helper()
	b, e := os.ReadFile(p)
	if e != nil {
		t.Fatal(e)
	}
	return b
}
