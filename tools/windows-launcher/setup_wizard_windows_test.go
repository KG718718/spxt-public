//go:build windows

package main

import (
	"strings"
	"syscall"
	"unsafe"
)

// Disposable Setup CI only. Activate enabled Next/Install/Finish controls of this product's wizard.
// No modal error/risk dialogue is dismissed here; an unexpected page must time out and fail.
func advanceSetupWizard() {
	text := func(h uintptr) string {
		b := make([]uint16, 1024)
		call(user32, "GetWindowTextW", h, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
		return syscall.UTF16ToString(b)
	}
	callback := syscall.NewCallback(func(h uintptr, _ uintptr) uintptr {
		b := make([]uint16, 128)
		call(user32, "GetClassNameW", h, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
		if syscall.UTF16ToString(b) != "TWizardForm" || !strings.Contains(text(h), "SESSION") {
			return 1
		}
		child := syscall.NewCallback(func(c uintptr, _ uintptr) uintptr {
			visible, _ := call(user32, "IsWindowVisible", c)
			enabled, _ := call(user32, "IsWindowEnabled", c)
			label := strings.ReplaceAll(text(c), "&", "")
			if visible != 0 && enabled != 0 && (label == "Next >" || label == "Install" || label == "Finish") {
				call(user32, "PostMessageW", c, 0x00F5, 0, 0)
				return 0
			}
			return 1
		})
		call(user32, "EnumChildWindows", h, child, 0)
		return 1
	})
	call(user32, "EnumWindows", callback, 0)
}
