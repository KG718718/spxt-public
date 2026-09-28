//go:build windows && amd64

// RESEARCH / NON-PRODUCTION / NOT PACKAGED.
// ABI entry point experiment only. No host API is called by main or tests.
package main

import (
	"errors"
	"path/filepath"
	"syscall"
	"unsafe"
)

const (
	afInet              = 2
	errorBufferOverflow = 111
	maxNativeBuffer     = 1024 * 1024
)

// Go's own Windows syscall package registers kernel32.dll as a system DLL.
// GetSystemDirectoryW supplies the trusted absolute System32 path; all other
// DLLs are loaded by absolute path, never by cwd or PATH.
func systemDLL(name string) (*syscall.DLL, error) {
	if name != "iphlpapi.dll" && name != "ole32.dll" {
		return nil, errors.New("DLL not allowlisted")
	}
	kernel := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel.NewProc("GetSystemDirectoryW")
	if err := proc.Find(); err != nil {
		return nil, errors.New("system directory API missing")
	}
	buf := make([]uint16, 32768)
	n, _, _ := proc.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if n == 0 || n >= uintptr(len(buf)) {
		return nil, errors.New("system directory unavailable")
	}
	root := syscall.UTF16ToString(buf[:n])
	if !filepath.IsAbs(root) {
		return nil, errors.New("system directory not absolute")
	}
	return syscall.LoadDLL(filepath.Join(root, name))
}

// nativeAPIEntryPoints confirms callable IP Helper exports with bounded
// allocations. It intentionally discards all host data and is NOT a complete
// collector: structure layouts, GUID/route mapping and NLM are still unproved.
// This function is never called by the research executable in phase 1.
func nativeAPIEntryPoints() error {
	dll, err := systemDLL("iphlpapi.dll")
	if err != nil {
		return errors.New("IP Helper unavailable")
	}
	defer dll.Release()
	adapters, err := dll.FindProc("GetAdaptersAddresses")
	if err != nil {
		return errors.New("adapter API unavailable")
	}
	routes, err := dll.FindProc("GetIpForwardTable2")
	if err != nil {
		return errors.New("route API unavailable")
	}
	freeTable, err := dll.FindProc("FreeMibTable")
	if err != nil {
		return errors.New("table release API unavailable")
	}
	size := uint32(15 * 1024)
	for attempt := 0; attempt < 3; attempt++ {
		if size == 0 || size > maxNativeBuffer {
			return errors.New("adapter buffer limit")
		}
		buf := make([]byte, size)
		code, _, _ := adapters.Call(afInet, 0, 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size)))
		if code == 0 {
			break
		}
		if code != errorBufferOverflow || attempt == 2 {
			return errors.New("adapter API failed")
		}
	}
	var table uintptr
	code, _, _ := routes.Call(afInet, uintptr(unsafe.Pointer(&table)))
	if code != 0 || table == 0 {
		return errors.New("route API failed")
	}
	freeTable.Call(table)
	return nil
}
