//go:build windows

package main

import (
	"fmt"
	"strings"
	"syscall"
	"unsafe"
)

// Disposable Setup CI only. Activate enabled Next/Install/Finish controls of this product's wizard.
// No modal error/risk dialogue is dismissed here; an unexpected page must time out and fail.
func advanceSetupWizard() []string {
	var observed []string
	text := func(h uintptr) string {
		b := make([]uint16, 1024)
		call(user32, "GetWindowTextW", h, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
		return syscall.UTF16ToString(b)
	}
	callback := syscall.NewCallback(func(h uintptr, _ uintptr) uintptr {
		b := make([]uint16, 128)
		call(user32, "GetClassNameW", h, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
		if !strings.Contains(text(h), "SESSION") {
			return 1
		}
		class := syscall.UTF16ToString(b)
		observed = append(observed, "product-window-class="+class)
		if class != "TWizardForm" {
			return 1
		}
		child := syscall.NewCallback(func(c uintptr, _ uintptr) uintptr {
			visible, _ := call(user32, "IsWindowVisible", c)
			enabled, _ := call(user32, "IsWindowEnabled", c)
			label := strings.ReplaceAll(text(c), "&", "")
			if visible != 0 && enabled != 0 && (label == "Next >" || label == "Install" || label == "Finish") {
				// Send the standard button notification to its actual parent. BM_CLICK can fail
				// on an inactive dialog in a hosted runner; no unexpected modal is accepted.
				parent, _ := call(user32, "GetParent", c)
				id, _ := call(user32, "GetDlgCtrlID", c)
				var response uintptr
				ok, _ := call(user32, "SendMessageTimeoutW", parent, 0x0111, id, c, 0x0002, 2000, uintptr(unsafe.Pointer(&response)))
				observed = append(observed, fmt.Sprintf("button=%s notified=%t", label, ok != 0))
				return 0
			}
			return 1
		})
		call(user32, "EnumChildWindows", h, child, 0)
		return 1
	})
	call(user32, "EnumWindows", callback, 0)
	return observed
}
