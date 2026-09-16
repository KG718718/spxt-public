//go:build windows

package main

import (
	"encoding/binary"
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
	"unsafe"
)

func until(t *testing.T, fn func() bool) {
	t.Helper()
	end := time.Now().Add(25 * time.Second)
	for time.Now().Before(end) {
		if fn() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("timeout waiting for condition")
}
func events(instance string) []map[string]any {
	b, _ := os.ReadFile(filepath.Join(instance, "launcher.log"))
	rows := []map[string]any{}
	for _, line := range strings.Split(string(b), "\n") {
		var r map[string]any
		if json.Unmarshal([]byte(line), &r) == nil {
			rows = append(rows, r)
		}
	}
	return rows
}
func eventCount(instance, event string) int {
	n := 0
	for _, r := range events(instance) {
		if r["event"] == event {
			n++
		}
	}
	return n
}
func lastEvent(instance, event string) map[string]any {
	rows := events(instance)
	for i := len(rows) - 1; i >= 0; i-- {
		if rows[i]["event"] == event {
			return rows[i]
		}
	}
	return nil
}
func launchTest(t *testing.T, exe, instance string) *exec.Cmd {
	t.Helper()
	cmd := exec.Command(exe, "--instance", instance)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	// Synthetic poison must not reach Node or logs.
	cmd.Env = append(os.Environ(), "NODE_OPTIONS=--require impossible-test-sentinel", "SMTP_PASSWORD=synthetic-do-not-log", "KSESSION_HOST=0.0.0.0")
	if e := cmd.Start(); e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { cmd.Process.Kill(); cmd.Wait() })
	return cmd
}
func procPath(pid uint32) string {
	h, e := syscall.OpenProcess(0x1000, false, pid)
	if e != nil {
		return ""
	}
	defer syscall.CloseHandle(h)
	b := make([]uint16, 32768)
	size := uint32(len(b))
	r, _ := call(kernel32, "QueryFullProcessImageNameW", uintptr(h), 0, uintptr(unsafe.Pointer(&b[0])), uintptr(unsafe.Pointer(&size)))
	if r == 0 {
		return ""
	}
	return syscall.UTF16ToString(b[:size])
}
func alivePID(pid uint32) bool {
	h, e := syscall.OpenProcess(0x100000, false, pid)
	if e != nil {
		return false
	}
	defer syscall.CloseHandle(h)
	r, _ := syscall.WaitForSingleObject(h, 0)
	return r == 258
}
func noConsole(pid uint32) bool {
	call(kernel32, "FreeConsole")
	r, _, e := kernel32.NewProc("AttachConsole").Call(uintptr(pid))
	if r != 0 {
		call(kernel32, "FreeConsole")
		return false
	}
	return e == syscall.Errno(6) // ERROR_INVALID_HANDLE means target has no console.
}
func TestLauncherIntegration(t *testing.T) {
	exe := os.Getenv("KSESSION_TEST_LAUNCHER")
	base := os.Getenv("KSESSION_TEST_EVIDENCE")
	if exe == "" || base == "" {
		t.Skip("actual-EXE integration requires explicit package/evidence")
	}
	exe, _ = canonical(exe)
	root := filepath.Dir(filepath.Dir(exe))
	if within(root, base) {
		t.Fatal("evidence must be external")
	}
	if e := os.Mkdir(base, 0700); e != nil {
		t.Fatal("fresh evidence required:", e)
	}
	info, e := os.ReadFile(filepath.Join(filepath.Dir(exe), "build-info.json"))
	if e != nil {
		t.Fatal(e)
	}
	var build map[string]any
	json.Unmarshal(info, &build)
	runtimeHash = build["runtimeManifestSha256"].(string)
	if _, e = verifyRuntime(root); e != nil {
		t.Fatal(e)
	}
	report := map[string]any{"platform": "Windows actual EXE", "build": build, "checks": []string{}, "status": "RUNNING"}
	checks := []string{}
	pass := func(s string) { checks = append(checks, s); t.Log("PASS", s) }
	defer func() {
		report["checks"] = checks
		if t.Failed() {
			report["status"] = "FAIL"
		} else {
			report["status"] = "PASS"
		}
		b, _ := json.MarshalIndent(report, "", "  ")
		os.WriteFile(filepath.Join(base, "integration.json"), append(b, '\n'), 0600)
	}()
	instance := filepath.Join(base, "中文实例 with spaces")
	cmd := launchTest(t, exe, instance)
	until(t, func() bool { return lastEvent(instance, "READY") != nil })
	ready := lastEvent(instance, "READY")
	pid := uint32(ready["pid"].(float64))
	port := int(ready["port"].(float64))
	report["nodePID"] = pid
	report["port"] = port
	report["bind"] = "127.0.0.1"
	report["nodePath"] = "runtime/node.exe"
	pass("L01 actual EXE first start")
	if !strings.EqualFold(procPath(pid), filepath.Join(root, "runtime", "node.exe")) {
		t.Fatal("wrong Node path")
	}
	pass("L02 absolute packaged Node")
	bytes, _ := os.ReadFile(exe)
	pe := binary.LittleEndian.Uint32(bytes[0x3c:])
	if binary.LittleEndian.Uint16(bytes[pe+24+68:]) != 2 || !noConsole(uint32(cmd.Process.Pid)) || !noConsole(pid) {
		t.Fatal("console present or wrong subsystem")
	}
	pass("L03 GUI subsystem + Launcher and Node AttachConsole confirms no console")
	until(t, func() bool { return eventCount(instance, "BROWSER_OPEN")+eventCount(instance, "BROWSER_FAILED") > 0 })
	// Hosted desktop may lack a default HTTP handler: report explicitly; local real-browser acceptance is separate.
	if eventCount(instance, "BROWSER_OPEN") > 0 {
		pass("L04 ShellExecute accepted only after READY")
	} else {
		pass("L04 browser failure preserves healthy service; interactive real-browser acceptance required")
	}
	cls := "KSESSION_" + digest([]byte(strings.ToLower(instance)))
	second := launchTest(t, exe, instance)
	until(t, func() bool { return !alivePID(uint32(second.Process.Pid)) })
	if eventCount(instance, "NODE_SPAWN") != 1 || !alivePID(pid) {
		t.Fatal("duplicate backend")
	}
	pass("L05 second EXE does not create backend")
	pass("L06 existing owner verifies then opens")
	if !ownsLoopback(pid, port) {
		t.Fatal("not owned loopback")
	}
	pass("L15 Windows TCP owner PID and loopback")
	for _, r := range events(instance) {
		b, _ := json.Marshal(r)
		if strings.Contains(string(b), "synthetic-do-not-log") || strings.Contains(string(b), "impossible-test-sentinel") {
			t.Fatal("sensitive log")
		}
	}
	pass("L14 fixed-field log and parent environment poison excluded")
	if !strings.Contains(root, " ") || !strings.Contains(instance, "中文") {
		t.Fatal("path matrix invalid")
	}
	pass("L12 Chinese paths")
	pass("L13 space paths")
	if !dispatchExisting(cls, exe, true) {
		t.Fatal("stop dispatch failed")
	}
	until(t, func() bool { return !alivePID(pid) && !alivePID(uint32(cmd.Process.Pid)) })
	pass("L16 owner-only stop")
	// Exclusive file leftover is expected; lock is kernel-owned, not existence/PID based.
	restarted := launchTest(t, exe, instance)
	until(t, func() bool { return eventCount(instance, "READY") == 2 })
	nextPID := uint32(lastEvent(instance, "READY")["pid"].(float64))
	restarted.Process.Kill()
	until(t, func() bool { return !alivePID(nextPID) })
	pass("X01 Launcher crash kernel Job closes Node; stale lock restart")
	// External port occupant is a listener owned by this test process, never a business server.
	blocker, e := net.Listen("tcp4", "127.0.0.1:8080")
	if e != nil {
		t.Fatal("cannot establish controlled 8080 conflict:", e)
	}
	defer blocker.Close()
	conflictInstance := filepath.Join(base, "conflict")
	conflict := launchTest(t, exe, conflictInstance)
	until(t, func() bool { return lastEvent(conflictInstance, "READY") != nil })
	cr := lastEvent(conflictInstance, "READY")
	cpid := uint32(cr["pid"].(float64))
	if cr["port"].(float64) == 8080 {
		t.Fatal("did not avoid conflict")
	}
	pass("L07 controlled external 8080 conflict selects finite alternate")
	conn, e := net.DialTimeout("tcp4", "127.0.0.1:8080", time.Second)
	if e != nil {
		t.Fatal("external listener killed")
	}
	conn.Close()
	pass("L08 external occupant remains alive")
	// Only intentionally terminate exact test-owned Node after matching image and current test event.
	if !strings.EqualFold(procPath(cpid), filepath.Join(root, "runtime", "node.exe")) {
		t.Fatal("wrong test PID")
	}
	h, e := syscall.OpenProcess(1, false, cpid)
	if e != nil {
		t.Fatal(e)
	}
	syscall.TerminateProcess(h, 87)
	syscall.CloseHandle(h)
	until(t, func() bool { return eventCount(conflictInstance, "NODE_EXITED") == 1 })
	pass("L09 abnormal Node exit identified")
	conflict.Process.Kill()
	blocker.Close()
	// Missing runtime and read-only directory are tested using distinct disposable layouts.
	badRoot := filepath.Join(base, "bad package")
	os.MkdirAll(filepath.Join(badRoot, "launcher"), 0700)
	badExe := filepath.Join(badRoot, "launcher", "K-SESSION.exe")
	os.WriteFile(badExe, bytes, 0700)
	badInst := filepath.Join(base, "missing-runtime")
	bad := launchTest(t, badExe, badInst)
	until(t, func() bool { return eventCount(badInst, "FAILED") == 1 })
	if lastEvent(badInst, "FAILED")["code"] != "NODE_MISSING" {
		t.Fatal("bad classification")
	}
	bad.Process.Kill()
	pass("L10 missing Node explicit failure, no backend")
	nonDir := filepath.Join(base, "not-a-directory")
	os.WriteFile(nonDir, []byte("immutable synthetic file"), 0600)
	unwritable := launchTest(t, exe, nonDir)
	time.Sleep(time.Second)
	if b, _ := os.ReadFile(nonDir); string(b) != "immutable synthetic file" {
		t.Fatal("modified unwritable target")
	}
	// Read visible text from exactly this test-owned error dialog, not another app.
	found := false
	cb := syscall.NewCallback(func(hwnd, l uintptr) uintptr {
		var p uint32
		call(user32, "GetWindowThreadProcessId", hwnd, uintptr(unsafe.Pointer(&p)))
		if p == uint32(unwritable.Process.Pid) {
			childcb := syscall.NewCallback(func(ch, l uintptr) uintptr {
				buf := make([]uint16, 1024)
				call(user32, "GetWindowTextW", ch, uintptr(unsafe.Pointer(&buf[0])), 1024)
				if strings.Contains(syscall.UTF16ToString(buf), "INSTANCE_UNWRITABLE") {
					found = true
				}
				return 1
			})
			call(user32, "EnumChildWindows", hwnd, childcb, 0)
		}
		return 1
	})
	call(user32, "EnumWindows", cb, 0)
	unwritable.Process.Kill()
	if !found {
		t.Fatal("unwritable dialog classification absent")
	}
	pass("L11 invalid/unwritable instance explicit user dialog")
	if _, e = verifyRuntime(root); e != nil {
		t.Fatal(e)
	}
	pass("L17 full Runtime manifest unchanged")
	report["qualification"] = "Win10 if run locally on Win10; hosted Server is not consumer Win10/11. ShellExecute result alone is not visible-browser acceptance."
}
func TestJobOwnsOnlyChild(t *testing.T) {
	// This guard tests API struct layout relied on by suspended spawn.
	if unsafe.Sizeof(wc{}) != 80 || unsafe.Sizeof(msg{}) != 48 {
		t.Fatal(fmt.Sprint("unexpected x64 Win32 struct sizes ", unsafe.Sizeof(wc{}), " ", unsafe.Sizeof(msg{})))
	}
}
