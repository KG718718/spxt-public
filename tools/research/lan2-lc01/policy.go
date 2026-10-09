// Research/test only. Copied verbatim into the beta4 test overlay; no production import.
package main

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const lcBusyText = "实例正被另一启动器或会话占用，或目录无法写入。未启动第二个后台。\r\n错误编号：INSTANCE_BUSY"
const lcProductTitle = "K⁺-SESSION"

func lcParseCounts(b []byte) (int, int, error) {
	bad := func() (int, int, error) { return 0, 0, errors.New("EVENT_LOG_INVALID") }
	if len(b) == 0 || len(b) > 1024*1024 {
		return bad()
	}
	ready, spawns := 0, 0
	for _, line := range strings.Split(strings.TrimSuffix(string(b), "\n"), "\n") {
		var row map[string]json.RawMessage
		if json.Unmarshal([]byte(line), &row) != nil {
			return bad()
		}
		var event string
		if json.Unmarshal(row["event"], &event) != nil || event == "" {
			return bad()
		}
		if event == "READY" {
			ready++
		}
		if event == "NODE_SPAWN" {
			spawns++
		}
	}
	return ready, spawns, nil
}

type lcDialog struct {
	PID, ExpectedPID                                          uint32
	Creation, ExpectedCreation                                uint64
	Window, Button                                            uintptr
	ThreadOK, ClassOK, ImageOK, Live, ParentOK, ButtonOwnerOK bool
	Visible, Enabled                                          bool
	Class, Title, Text, ButtonClass                           string
	ButtonID                                                  int
	TextCount, ButtonCount                                    int
}

func lcExactBusy(d lcDialog) bool {
	return d.PID != 0 && d.PID == d.ExpectedPID && d.Creation != 0 && d.Creation == d.ExpectedCreation &&
		d.Window != 0 && d.Button != 0 && d.ThreadOK && d.ClassOK && d.ImageOK && d.Live &&
		d.ParentOK && d.ButtonOwnerOK && d.Visible && d.Enabled && d.Class == "#32770" &&
		d.Title == lcProductTitle && d.Text == lcBusyText && d.ButtonClass == "Button" &&
		d.ButtonID == 1 && d.TextCount == 1 && d.ButtonCount == 1
}

type lcResult struct {
	Status, Path                                              string
	BusyClosed, NaturalExit, CleanupTerminated, HandlesClosed bool
	ExitCode                                                  uint32
}

// Every side effect is behind this boundary. Pure tests use a virtual clock and
// scripted observations; the Windows adapter is never invoked by policy tests.
type lcBoundary interface {
	Now() time.Duration
	Start() error
	Guards() error
	Inspect() (lcDialog, bool, error)
	Confirm(lcDialog) error
	Wait(time.Duration) (bool, uint32, error)
	Cleanup() (bool, error)
	Close() error
}

func lcRun(b lcBoundary, budget time.Duration) (result lcResult) {
	result = lcResult{Status: "FAIL", Path: "START_FAILED"}
	defer func() {
		terminated, err := b.Cleanup()
		result.CleanupTerminated = terminated
		if err != nil || terminated {
			result.Status = "FAIL"
			if err != nil {
				result.Path = "CLEANUP_FAILED"
			} else if result.Path == "DISPATCH_SUCCESS" || result.Path == "INSTANCE_BUSY_REJECTED" {
				result.Path = "CLEANUP_TERMINATED"
			}
		}
		if err := b.Close(); err != nil {
			result.Status = "FAIL"
			result.Path = "HANDLE_CLOSE_FAILED"
		} else {
			result.HandlesClosed = true
		}
	}()
	if budget <= 0 {
		result.Path = "INVALID_BUDGET"
		return
	}
	deadline := b.Now() + budget
	if b.Guards() != nil {
		result.Path = "SESSION_GUARD_FAILED"
		return
	}
	if b.Now() >= deadline {
		result.Path = "TIMEOUT"
		return
	}
	if b.Start() != nil {
		return
	}
	for {
		if b.Now() >= deadline {
			result.Path = "TIMEOUT"
			return
		}
		if b.Guards() != nil {
			result.Path = "SESSION_GUARD_FAILED"
			return
		}
		if b.Now() >= deadline {
			result.Path = "TIMEOUT"
			return
		}
		d, present, err := b.Inspect()
		if err != nil {
			result.Path = "WINDOW_IDENTITY_FAILED"
			return
		}
		if b.Now() >= deadline {
			result.Path = "TIMEOUT"
			return
		}
		if present {
			if result.BusyClosed || !lcExactBusy(d) {
				result.Path = "DIALOG_MISMATCH"
				return
			}
			if b.Confirm(d) != nil {
				result.Path = "DIALOG_CONFIRM_FAILED"
				return
			}
			result.BusyClosed = true
		}
		remaining := deadline - b.Now()
		if remaining <= 0 {
			result.Path = "TIMEOUT"
			return
		}
		if remaining > 20*time.Millisecond {
			remaining = 20 * time.Millisecond
		}
		exited, code, err := b.Wait(remaining)
		if err != nil {
			result.Path = "WAIT_FAILED"
			return
		}
		if b.Now() >= deadline {
			result.Path = "TIMEOUT"
			return
		}
		if !exited {
			continue
		}
		result.NaturalExit = true
		result.ExitCode = code
		if b.Guards() != nil {
			result.Path = "SESSION_GUARD_FAILED"
			return
		}
		if b.Now() >= deadline {
			result.Path = "TIMEOUT"
			return
		}
		if !result.BusyClosed && code == 0 {
			result.Status = "PASS"
			result.Path = "DISPATCH_SUCCESS"
			return
		}
		if result.BusyClosed && code == 1 {
			result.Status = "PASS"
			result.Path = "INSTANCE_BUSY_REJECTED"
			return
		}
		result.Path = "UNEXPECTED_EXIT"
		return
	}
}
