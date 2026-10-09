package main

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestEventCountsAreStrict(t *testing.T) {
	b := []byte("{\"event\":\"START\"}\n{\"event\":\"NODE_SPAWN\"}\n{\"event\":\"READY\"}\n")
	r, s, e := lcParseCounts(b)
	if e != nil || r != 1 || s != 1 {
		t.Fatal("event counts")
	}
	for _, value := range []string{"", "null", "{}", "{\"event\":null}", "{\"event\":2}", "{\"event\":\"\"}", "{broken", string(b) + "{broken", strings.Repeat(" ", 1024*1024+1)} {
		if _, _, e := lcParseCounts([]byte(value)); e == nil {
			t.Fatal("invalid event log accepted")
		}
	}
}

func lcFixture() lcDialog {
	return lcDialog{PID: 71, ExpectedPID: 71, Creation: 19, ExpectedCreation: 19, Window: 10, Button: 11,
		ThreadOK: true, ClassOK: true, ImageOK: true, Live: true, ParentOK: true, ButtonOwnerOK: true,
		Visible: true, Enabled: true, Class: "#32770", Title: lcProductTitle, Text: lcBusyText,
		ButtonClass: "Button", ButtonID: 1, TextCount: 1, ButtonCount: 1}
}

type lcFake struct {
	clock                                                           time.Duration
	dialogs                                                         []lcDialog
	startErr, inspectErr, confirmErr, waitErr, cleanupErr, closeErr error
	guardFailAt, guards, waits, exitAt                              int
	code                                                            uint32
	started, exited, confirmed, closed                              bool
	forceCleanup, confirmIdentityChanged                            bool
	inspectCost, confirmCost                                        time.Duration
	trace                                                           []string
}

func (f *lcFake) Now() time.Duration { return f.clock }
func (f *lcFake) Start() error {
	f.trace = append(f.trace, "start")
	if f.startErr == nil {
		f.started = true
	}
	return f.startErr
}
func (f *lcFake) Guards() error {
	f.guards++
	f.trace = append(f.trace, "guards")
	if f.guardFailAt == f.guards {
		return errors.New("controlled session/lock/event/chain changed")
	}
	return nil
}
func (f *lcFake) Inspect() (lcDialog, bool, error) {
	f.clock += f.inspectCost
	f.trace = append(f.trace, "inspect")
	if f.inspectErr != nil {
		return lcDialog{}, false, f.inspectErr
	}
	if len(f.dialogs) == 0 {
		return lcDialog{}, false, nil
	}
	d := f.dialogs[0]
	f.dialogs = f.dialogs[1:]
	if d.Window == 0 {
		return lcDialog{}, false, nil
	}
	return d, true, nil
}
func (f *lcFake) Confirm(d lcDialog) error {
	f.trace = append(f.trace, "confirm")
	f.clock += f.confirmCost
	if f.confirmIdentityChanged {
		return errors.New("recheck changed PID/HWND/body/button")
	}
	if f.confirmErr == nil {
		f.confirmed = true
	}
	return f.confirmErr
}
func (f *lcFake) Wait(d time.Duration) (bool, uint32, error) {
	f.trace = append(f.trace, "wait")
	f.waits++
	f.clock += d
	if f.waitErr != nil {
		return false, 0, f.waitErr
	}
	if f.exitAt > 0 && f.waits >= f.exitAt {
		f.exited = true
		return true, f.code, nil
	}
	return false, 0, nil
}
func (f *lcFake) Cleanup() (bool, error) {
	f.trace = append(f.trace, "cleanup")
	return f.forceCleanup || (f.started && !f.exited), f.cleanupErr
}
func (f *lcFake) Close() error {
	f.trace = append(f.trace, "close")
	f.closed = f.closeErr == nil
	return f.closeErr
}
func lcAssert(t *testing.T, f *lcFake, status, path string) lcResult {
	t.Helper()
	r := lcRun(f, 100*time.Millisecond)
	if r.Status != status || r.Path != path {
		t.Fatalf("want %s/%s got %+v", status, path, r)
	}
	if len(f.trace) < 2 || f.trace[len(f.trace)-2] != "cleanup" || f.trace[len(f.trace)-1] != "close" {
		t.Fatal("cleanup/close order")
	}
	return r
}
func TestExactBusyCorpus(t *testing.T) {
	if !lcExactBusy(lcFixture()) {
		t.Fatal("exact synthetic busy rejected")
	}
	cases := map[string]func(*lcDialog){
		"other-PID": func(d *lcDialog) { d.PID++ }, "zero-PID": func(d *lcDialog) { d.PID = 0 },
		"PID-reuse": func(d *lcDialog) { d.Creation++ }, "zero-creation": func(d *lcDialog) { d.Creation = 0 },
		"owner-query-failure": func(d *lcDialog) { d.ThreadOK = false }, "class-query-failure": func(d *lcDialog) { d.ClassOK = false },
		"other-image": func(d *lcDialog) { d.ImageOK = false }, "exited-owner": func(d *lcDialog) { d.Live = false },
		"window-reused": func(d *lcDialog) { d.Window = 0 }, "no-button": func(d *lcDialog) { d.Button = 0 },
		"button-parent": func(d *lcDialog) { d.ParentOK = false }, "button-other-owner": func(d *lcDialog) { d.ButtonOwnerOK = false },
		"hidden": func(d *lcDialog) { d.Visible = false }, "disabled": func(d *lcDialog) { d.Enabled = false },
		"other-class": func(d *lcDialog) { d.Class = "TWizardForm" }, "other-title": func(d *lcDialog) { d.Title += " fake" },
		"substring-code": func(d *lcDialog) { d.Text = "INSTANCE_BUSY" }, "other-fault": func(d *lcDialog) { d.Text = "错误编号：RUNTIME_MISSING" },
		"prefix": func(d *lcDialog) { d.Text = "extra" + d.Text }, "suffix": func(d *lcDialog) { d.Text += "extra" },
		"nonstandard-button": func(d *lcDialog) { d.ButtonClass = "TButton" }, "wrong-control-ID": func(d *lcDialog) { d.ButtonID = 2 },
		"missing-body": func(d *lcDialog) { d.TextCount = 0 }, "multiple-text": func(d *lcDialog) { d.TextCount = 2 },
		"multiple-buttons": func(d *lcDialog) { d.ButtonCount = 2 },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			d := lcFixture()
			mutate(&d)
			if lcExactBusy(d) {
				t.Fatal("unsafe observation accepted")
			}
		})
	}
}
func TestDispatchSuccess(t *testing.T) {
	f := &lcFake{exitAt: 1}
	r := lcAssert(t, f, "PASS", "DISPATCH_SUCCESS")
	if f.confirmed || !r.NaturalExit || r.CleanupTerminated || !r.HandlesClosed {
		t.Fatal("dispatch exit proof")
	}
}
func TestPreciseBusyRejection(t *testing.T) {
	f := &lcFake{dialogs: []lcDialog{lcFixture()}, exitAt: 2, code: 1}
	r := lcAssert(t, f, "PASS", "INSTANCE_BUSY_REJECTED")
	if !f.confirmed || !r.BusyClosed || !r.NaturalExit || r.CleanupTerminated {
		t.Fatal("busy proof")
	}
}
func TestWindowNotPreparedThenBusy(t *testing.T) {
	lcAssert(t, &lcFake{dialogs: []lcDialog{{}, lcFixture()}, exitAt: 3, code: 1}, "PASS", "INSTANCE_BUSY_REJECTED")
}
func TestDispatchTimeoutThenPreciseBusy(t *testing.T) {
	lcAssert(t, &lcFake{dialogs: []lcDialog{{}, {}, lcFixture()}, exitAt: 4, code: 1}, "PASS", "INSTANCE_BUSY_REJECTED")
}
func TestWindowNotPreparedTimesOut(t *testing.T) { lcAssert(t, &lcFake{}, "FAIL", "TIMEOUT") }
func TestMissingBusyDialogNonzeroExit(t *testing.T) {
	lcAssert(t, &lcFake{exitAt: 1, code: 1}, "FAIL", "UNEXPECTED_EXIT")
}
func TestMismatchedDialogsNeverClicked(t *testing.T) {
	for _, text := range []string{"INSTANCE_BUSY", lcBusyText + " extra", "错误编号：ARGUMENT"} {
		d := lcFixture()
		d.Text = text
		f := &lcFake{dialogs: []lcDialog{d}, exitAt: 1, code: 1}
		lcAssert(t, f, "FAIL", "DIALOG_MISMATCH")
		if f.confirmed {
			t.Fatal("wrong dialog clicked")
		}
	}
}
func TestOtherPIDNeverClicked(t *testing.T) {
	d := lcFixture()
	d.PID++
	f := &lcFake{dialogs: []lcDialog{d}}
	lcAssert(t, f, "FAIL", "DIALOG_MISMATCH")
	if f.confirmed {
		t.Fatal("other PID clicked")
	}
}
func TestPIDReuseNeverClicked(t *testing.T) {
	d := lcFixture()
	d.Creation++
	f := &lcFake{dialogs: []lcDialog{d}}
	lcAssert(t, f, "FAIL", "DIALOG_MISMATCH")
	if f.confirmed {
		t.Fatal("reused PID clicked")
	}
}
func TestIdentityChangesBeforeConfirm(t *testing.T) {
	f := &lcFake{dialogs: []lcDialog{lcFixture()}, confirmIdentityChanged: true}
	lcAssert(t, f, "FAIL", "DIALOG_CONFIRM_FAILED")
	if f.confirmed {
		t.Fatal("changed identity clicked")
	}
}
func TestBusyDialogUnexpectedExitCode(t *testing.T) {
	for _, code := range []uint32{0, 2, 97, 0xffffffff} {
		lcAssert(t, &lcFake{dialogs: []lcDialog{lcFixture()}, exitAt: 1, code: code}, "FAIL", "UNEXPECTED_EXIT")
	}
}
func TestUnexpectedNonzeroExit(t *testing.T) {
	for _, code := range []uint32{2, 97, 0xffffffff} {
		lcAssert(t, &lcFake{exitAt: 1, code: code}, "FAIL", "UNEXPECTED_EXIT")
	}
}
func TestStartFailure(t *testing.T) {
	f := &lcFake{startErr: errors.New("synthetic")}
	r := lcAssert(t, f, "FAIL", "START_FAILED")
	if r.NaturalExit || r.CleanupTerminated {
		t.Fatal("failed start became exit")
	}
}
func TestTimeoutCleanupCannotPass(t *testing.T) {
	f := &lcFake{dialogs: []lcDialog{lcFixture()}}
	r := lcAssert(t, f, "FAIL", "TIMEOUT")
	if !r.CleanupTerminated || r.NaturalExit {
		t.Fatal("cleanup masqueraded as natural exit")
	}
}
func TestLateExitAtDeadlineCannotPass(t *testing.T) {
	lcAssert(t, &lcFake{exitAt: 5}, "FAIL", "TIMEOUT")
}
func TestSlowObservationCannotExtendBudget(t *testing.T) {
	lcAssert(t, &lcFake{exitAt: 1, inspectCost: 100 * time.Millisecond}, "FAIL", "TIMEOUT")
}
func TestSlowConfirmCannotExtendBudget(t *testing.T) {
	lcAssert(t, &lcFake{dialogs: []lcDialog{lcFixture()}, confirmCost: 100 * time.Millisecond, exitAt: 1, code: 1}, "FAIL", "TIMEOUT")
}
func TestSessionGuardsFailBeforeStart(t *testing.T) {
	f := &lcFake{guardFailAt: 1}
	lcAssert(t, f, "FAIL", "SESSION_GUARD_FAILED")
	if f.started {
		t.Fatal("started after failed preguard")
	}
}
func TestSessionGuardCorpus(t *testing.T) {
	for _, name := range []string{"first-Launcher-exited", "first-Node-exited", "lock-released", "extra-READY", "extra-NODE_SPAWN", "second-private-Node-chain", "owner-image-changed", "process-snapshot-error", "snapshot-close-error"} {
		t.Run(name, func(t *testing.T) { lcAssert(t, &lcFake{guardFailAt: 3, exitAt: 1}, "FAIL", "SESSION_GUARD_FAILED") })
	}
}
func TestGuardFailureDuringPolling(t *testing.T) {
	lcAssert(t, &lcFake{guardFailAt: 3}, "FAIL", "SESSION_GUARD_FAILED")
}
func TestMultipleDialogsFailClosed(t *testing.T) {
	lcAssert(t, &lcFake{dialogs: []lcDialog{lcFixture(), lcFixture()}, exitAt: 3, code: 1}, "FAIL", "DIALOG_MISMATCH")
}
func TestWindowInspectionError(t *testing.T) {
	lcAssert(t, &lcFake{inspectErr: errors.New("synthetic")}, "FAIL", "WINDOW_IDENTITY_FAILED")
}
func TestConfirmPostFailure(t *testing.T) {
	lcAssert(t, &lcFake{dialogs: []lcDialog{lcFixture()}, confirmErr: errors.New("synthetic")}, "FAIL", "DIALOG_CONFIRM_FAILED")
}
func TestWaitFailure(t *testing.T) {
	lcAssert(t, &lcFake{waitErr: errors.New("synthetic")}, "FAIL", "WAIT_FAILED")
}
func TestCleanupFailureCannotPass(t *testing.T) {
	lcAssert(t, &lcFake{exitAt: 1, cleanupErr: errors.New("synthetic")}, "FAIL", "CLEANUP_FAILED")
}
func TestForcedCleanupCannotPass(t *testing.T) {
	r := lcAssert(t, &lcFake{exitAt: 1, forceCleanup: true}, "FAIL", "CLEANUP_TERMINATED")
	if !r.CleanupTerminated {
		t.Fatal("cleanup not recorded")
	}
}
func TestCloseFailureCannotPass(t *testing.T) {
	r := lcAssert(t, &lcFake{exitAt: 1, closeErr: errors.New("synthetic")}, "FAIL", "HANDLE_CLOSE_FAILED")
	if r.HandlesClosed {
		t.Fatal("close failure hidden")
	}
}
func TestInvalidBudget(t *testing.T) {
	f := &lcFake{}
	r := lcRun(f, 0)
	if r.Status != "FAIL" || r.Path != "INVALID_BUDGET" || f.started || !f.closed {
		t.Fatal(r)
	}
}
