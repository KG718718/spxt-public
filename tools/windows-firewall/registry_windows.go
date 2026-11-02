//go:build windows

package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf16"
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

func registryKeyExistsView(keyPath string, view uintptr) (bool, error) {
	keyPtr, _ := syscall.UTF16PtrFromString(keyPath)
	var key syscall.Handle
	r, _, _ := regOpenKeyExW.Call(hkeyCurrentUser, uintptr(unsafe.Pointer(keyPtr)), 0, keyQueryValue|view, uintptr(unsafe.Pointer(&key)))
	if r == errorFileMissing {
		return false, nil
	}
	if r != 0 {
		return false, syscall.Errno(r)
	}
	regCloseKey.Call(uintptr(key))
	return true, nil
}

type registryAccess struct {
	read      func(string, string, uintptr) (string, error)
	keyExists func(string, uintptr) (bool, error)
}

var nativeRegistry = registryAccess{read: readRegistryStringView, keyExists: registryKeyExistsView}

func registryValueMatches(name, got, want string) bool {
	switch name {
	case "InstallLocation", "InstallRoot", "Instance":
		return sameCleanLocalPath(got, want)
	case "UninstallString":
		return strings.EqualFold(got, want)
	default:
		return got == want
	}
}

func rejectConflicting32View(access registryAccess, keyPath string, expected map[string]string) error {
	exists, err := access.keyExists(keyPath, keyWow6432)
	if err != nil {
		return reject(exitConfig, "REGISTRY_VIEW_CONFLICT")
	}
	if !exists {
		return nil
	}
	for name, want := range expected {
		got, err := access.read(keyPath, name, keyWow6432)
		if err != nil || !registryValueMatches(name, got, want) {
			return reject(exitConfig, "REGISTRY_VIEW_CONFLICT")
		}
	}
	return nil
}

func parseInstanceBinding(data []byte) (map[string]string, error) {
	if len(data) < 2 || len(data) > 64*1024 || data[0] != 0xff || data[1] != 0xfe || (len(data)-2)%2 != 0 {
		return nil, errors.New("invalid binding encoding")
	}
	words := make([]uint16, (len(data)-2)/2)
	for i := range words {
		words[i] = uint16(data[2+i*2]) | uint16(data[3+i*2])<<8
	}
	text := string(utf16.Decode(words))
	if strings.ContainsRune(text, '\x00') {
		return nil, errors.New("invalid binding content")
	}
	values := map[string]string{}
	section := ""
	for _, raw := range strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n") {
		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			if line != "[Installation]" || section != "" {
				return nil, errors.New("invalid binding section")
			}
			section = "Installation"
			continue
		}
		if section != "Installation" {
			return nil, errors.New("binding value outside section")
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			return nil, errors.New("invalid binding value")
		}
		name, value := strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
		if (name != "Schema" && name != "InstallRoot" && name != "Instance") || value == "" {
			return nil, errors.New("unknown binding value")
		}
		if _, exists := values[name]; exists {
			return nil, errors.New("duplicate binding value")
		}
		values[name] = value
	}
	if section != "Installation" || len(values) != 3 || values["Schema"] != "1" {
		return nil, errors.New("incomplete binding")
	}
	return values, nil
}

func verifyInstanceBindingFileWith(install trustedInstall, instance string, readFile func(string) ([]byte, error)) error {
	path := filepath.Join(install.InstallRoot, "uninstall", "instance-binding.ini")
	if noReparse(path) != nil {
		return reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	data, err := readFile(path)
	if err != nil {
		return reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	values, err := parseInstanceBinding(data)
	if err != nil || !sameCleanLocalPath(values["InstallRoot"], install.InstallRoot) || !sameCleanLocalPath(values["Instance"], instance) {
		return reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	return nil
}

func verifyInstanceBindingFile(install trustedInstall, instance string) error {
	return verifyInstanceBindingFileWith(install, instance, os.ReadFile)
}

func verifyRegistrationWith(install trustedInstall, access registryAccess) (string, error) {
	const productKey = `Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`
	const bindingKey = `Software\KSESSION\Beta\InstallerBinding`
	displayName, err := access.read(productKey, "DisplayName", keyWow6464)
	if err != nil || displayName != productName {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	displayVersion, err := access.read(productKey, "DisplayVersion", keyWow6464)
	if err != nil || displayVersion != buildInstallerVersion {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	registeredRoot, err := access.read(productKey, "InstallLocation", keyWow6464)
	if err != nil || !sameCleanLocalPath(registeredRoot, install.InstallRoot) {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	uninstallString, err := access.read(productKey, "UninstallString", keyWow6464)
	expectedUninstaller := filepath.Join(install.InstallRoot, "uninstall", "unins000.exe")
	if err != nil || !strings.EqualFold(uninstallString, `"`+expectedUninstaller+`"`) || noReparse(expectedUninstaller) != nil {
		return "", reject(exitConfig, "REGISTRATION_INVALID")
	}
	bindingRoot, err := access.read(bindingKey, "InstallRoot", keyWow6464)
	if err != nil || !sameCleanLocalPath(bindingRoot, install.InstallRoot) {
		return "", reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	instance, err := access.read(bindingKey, "Instance", keyWow6464)
	if err != nil || instance == "" {
		return "", reject(exitConfig, "INSTALL_BINDING_INVALID")
	}
	if err := rejectConflicting32View(access, productKey, map[string]string{"InstallLocation": install.InstallRoot, "DisplayName": productName, "DisplayVersion": buildInstallerVersion, "UninstallString": `"` + expectedUninstaller + `"`}); err != nil {
		return "", err
	}
	if err := rejectConflicting32View(access, bindingKey, map[string]string{"InstallRoot": install.InstallRoot, "Instance": instance}); err != nil {
		return "", err
	}
	if err := verifyInstanceBindingFile(install, instance); err != nil {
		return "", err
	}
	return instance, nil
}

func verifyRegistration(install trustedInstall) (string, error) {
	return verifyRegistrationWith(install, nativeRegistry)
}
