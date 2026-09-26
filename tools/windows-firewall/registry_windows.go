//go:build windows

package main

import (
	"errors"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

const (
	hkeyCurrentUser  = 0x80000001
	keyQueryValue    = 0x0001
	keyWow6464       = 0x0100
	keyWow6432       = 0x0200
	regSZ            = 1
	regExpandSZ      = 2
	errorFileMissing = 2
)

var (
	advapi32         = syscall.NewLazyDLL("advapi32.dll")
	regOpenKeyExW    = advapi32.NewProc("RegOpenKeyExW")
	regQueryValueExW = advapi32.NewProc("RegQueryValueExW")
	regCloseKey      = advapi32.NewProc("RegCloseKey")
)

func readRegistryStringView(keyPath, valueName string, view uintptr) (string, error) {
	keyPtr, _ := syscall.UTF16PtrFromString(keyPath)
	var key syscall.Handle
	r, _, _ := regOpenKeyExW.Call(hkeyCurrentUser, uintptr(unsafe.Pointer(keyPtr)), 0, keyQueryValue|view, uintptr(unsafe.Pointer(&key)))
	if r != 0 {
		return "", syscall.Errno(r)
	}
	defer regCloseKey.Call(uintptr(key))
	namePtr, _ := syscall.UTF16PtrFromString(valueName)
	var typ, size uint32
	r, _, _ = regQueryValueExW.Call(uintptr(key), uintptr(unsafe.Pointer(namePtr)), 0, uintptr(unsafe.Pointer(&typ)), 0, uintptr(unsafe.Pointer(&size)))
	if r != 0 || (typ != regSZ && typ != regExpandSZ) || size < 2 || size > 64*1024 || size%2 != 0 {
		if r == 0 {
			return "", errors.New("invalid registry value")
		}
		return "", syscall.Errno(r)
	}
	buf := make([]uint16, size/2)
	r, _, _ = regQueryValueExW.Call(uintptr(key), uintptr(unsafe.Pointer(namePtr)), 0, uintptr(unsafe.Pointer(&typ)), uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size)))
	if r != 0 {
		return "", syscall.Errno(r)
	}
	return strings.TrimRight(syscall.UTF16ToString(buf), "\x00"), nil
}

func readRegistryString(keyPath, valueName string) (string, error) {
	return readRegistryStringView(keyPath, valueName, keyWow6464)
}

func rejectConflicting32View(keyPath string, expected map[string]string) error {
	first, err := readRegistryStringView(keyPath, "InstallRoot", keyWow6432)
	if err != nil {
		if errno, ok := err.(syscall.Errno); ok && errno == errorFileMissing {
			return nil
		}
		return reject(exitConfig, "REGISTRY_VIEW_CONFLICT")
	}
	if !sameCleanLocalPath(first, expected["InstallRoot"]) {
		return reject(exitConfig, "REGISTRY_VIEW_CONFLICT")
	}
	for name, want := range expected {
		if name == "InstallRoot" {
			continue
		}
		got, err := readRegistryStringView(keyPath, name, keyWow6432)
		pathMismatch := name == "Instance" && !sameCleanLocalPath(got, want)
		stringMismatch := name != "Instance" && name != "UninstallString" && got != want
		uninstallMismatch := name == "UninstallString" && !strings.EqualFold(got, want)
		if err != nil || pathMismatch || stringMismatch || uninstallMismatch {
			return reject(exitConfig, "REGISTRY_VIEW_CONFLICT")
		}
	}
	return nil
}

func verifyRegistration(install trustedInstall) (string, error) {
	const productKey = `Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`
	const bindingKey = `Software\KSESSION\Beta\InstallerBinding`
	displayName, err := readRegistryString(productKey, "DisplayName")
	if err != nil || displayName != productName {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	displayVersion, err := readRegistryString(productKey, "DisplayVersion")
	if err != nil || displayVersion != buildInstallerVersion {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	registeredRoot, err := readRegistryString(productKey, "InstallLocation")
	if err != nil || !sameCleanLocalPath(registeredRoot, install.InstallRoot) {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	uninstallString, err := readRegistryString(productKey, "UninstallString")
	expectedUninstaller := filepath.Join(install.InstallRoot, "uninstall", "unins000.exe")
	if err != nil || !strings.EqualFold(uninstallString, `"`+expectedUninstaller+`"`) || noReparse(expectedUninstaller) != nil {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	bindingRoot, err := readRegistryString(bindingKey, "InstallRoot")
	if err != nil || !sameCleanLocalPath(bindingRoot, install.InstallRoot) {
		return "", reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	schema, err := readRegistryString(bindingKey, "Schema")
	if err == nil && schema != "1" {
		return "", reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	instance, err := readRegistryString(bindingKey, "Instance")
	if err != nil || instance == "" {
		return "", reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	if err := rejectConflicting32View(productKey, map[string]string{"InstallRoot": install.InstallRoot, "DisplayName": productName, "DisplayVersion": buildInstallerVersion, "UninstallString": `"` + expectedUninstaller + `"`}); err != nil {
		return "", err
	}
	if err := rejectConflicting32View(bindingKey, map[string]string{"InstallRoot": install.InstallRoot, "Instance": instance}); err != nil {
		return "", err
	}
	return instance, nil
}
