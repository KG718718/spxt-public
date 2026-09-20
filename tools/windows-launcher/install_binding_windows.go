//go:build windows

package main

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

const bindingKey = `Software\KSESSION\Beta\InstallerBinding`
const instanceMarker = ".ksession-instance-v1"
const instanceMarkerText = "K-SESSION empty instance v1\n"

func preference(name string) (string, error) {
	var k syscall.Handle
	err := syscall.RegOpenKeyEx(syscall.HKEY_CURRENT_USER, ptr(bindingKey), 0, syscall.KEY_READ|0x0100, &k)
	if err == syscall.ERROR_FILE_NOT_FOUND {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	defer syscall.RegCloseKey(k)
	var typ, n uint32
	err = syscall.RegQueryValueEx(k, ptr(name), nil, &typ, nil, &n)
	if err == syscall.ERROR_FILE_NOT_FOUND {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	if typ != syscall.REG_SZ || n < 2 || n > 65536 || n%2 != 0 {
		return "", fail("BINDING_INVALID", "安装数据位置配置无效。")
	}
	b := make([]uint16, n/2)
	if err = syscall.RegQueryValueEx(k, ptr(name), nil, &typ, (*byte)(unsafe.Pointer(&b[0])), &n); err != nil {
		return "", err
	}
	return syscall.UTF16ToString(b), nil
}
func iniValue(file, key string) string {
	b := make([]uint16, 32768)
	n, _, _ := kernel32.NewProc("GetPrivateProfileStringW").Call(uintptr(unsafe.Pointer(ptr("Installation"))), uintptr(unsafe.Pointer(ptr(key))), 0, uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)), uintptr(unsafe.Pointer(ptr(file))))
	if n >= uintptr(len(b)-1) {
		return ""
	}
	return syscall.UTF16ToString(b[:n])
}
func cleanLocalPath(p string) bool {
	if len(p) < 4 || p[1:3] != `:\` || !filepath.IsAbs(p) || !strings.EqualFold(filepath.Clean(p), p) {
		return false
	}
	if !((p[0] >= 'A' && p[0] <= 'Z') || (p[0] >= 'a' && p[0] <= 'z')) {
		return false
	}
	for _, part := range strings.Split(p[3:], `\`) {
		for _, c := range part {
			if c < 32 {
				return false
			}
		}
		if part == "" || strings.TrimRight(part, ". ") != part || strings.ContainsAny(part, "<>:\"/|?*\x00\r\n") {
			return false
		}
		base := strings.ToUpper(strings.SplitN(part, ".", 2)[0])
		if base == "CON" || base == "PRN" || base == "AUX" || base == "NUL" || (len(base) == 4 && (strings.HasPrefix(base, "COM") || strings.HasPrefix(base, "LPT")) && base[3] >= '1' && base[3] <= '9') {
			return false
		}
	}
	drive, _, _ := kernel32.NewProc("GetDriveTypeW").Call(uintptr(unsafe.Pointer(ptr(p[:3]))))
	return drive == 3
}
func noReparse(p string) bool {
	for q := p; ; q = filepath.Dir(q) {
		a, e := syscall.GetFileAttributes(ptr(q))
		if e == nil && a&syscall.FILE_ATTRIBUTE_REPARSE_POINT != 0 {
			return false
		}
		if e != nil && e != syscall.ERROR_FILE_NOT_FOUND && e != syscall.ERROR_PATH_NOT_FOUND {
			return false
		}
		if filepath.Dir(q) == q {
			break
		}
	}
	return true
}

// Check before creation. Return stable non-sensitive process exit codes to Inno.
func checkInstallInstance(install, data string, prepare bool) int {
	if !cleanLocalPath(install) || !cleanLocalPath(data) {
		return 10
	}
	if within(install, data) || within(data, install) {
		return 11
	}
	for _, protected := range []string{os.Getenv("SystemRoot"), os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramW6432")} {
		if protected != "" && (within(protected, data) || within(data, protected)) {
			return 12
		}
	}
	if !noReparse(install) || !noReparse(data) {
		return 13
	}
	entries, err := os.ReadDir(data)
	if err != nil && !os.IsNotExist(err) {
		return 15
	}
	hasData := false
	if err == nil && len(entries) > 0 {
		// Walk names/attributes only, never attachment contents. Reparse children cannot escape instance.
		if filepath.WalkDir(data, func(p string, d os.DirEntry, e error) error {
			if e != nil {
				return e
			}
			a, e := syscall.GetFileAttributes(ptr(p))
			if e != nil {
				return e
			}
			if a&syscall.FILE_ATTRIBUTE_REPARSE_POINT != 0 {
				return syscall.EINVAL
			}
			return nil
		}) != nil {
			return 13
		}
		f, e := os.Open(filepath.Join(data, "data.json"))
		if e == nil {
			var state map[string]json.RawMessage
			dec := json.NewDecoder(f)
			e = dec.Decode(&state)
			var extra any
			end := dec.Decode(&extra)
			f.Close()
			if e != nil || end != io.EOF || state == nil {
				return 14
			}
			for _, key := range []string{"users", "applications", "payments"} {
				var rows []map[string]json.RawMessage
				raw := state[key]
				if len(raw) == 0 || string(raw) == "null" || json.Unmarshal(raw, &rows) != nil {
					return 14
				}
				for _, row := range rows {
					if row == nil {
						return 14
					}
				}
			}
			hasData = true
		} else {
			marker, e := os.ReadFile(filepath.Join(data, instanceMarker))
			if e != nil || string(marker) != instanceMarkerText {
				return 14
			}
			for _, entry := range entries {
				switch entry.Name() {
				case instanceMarker, ".launcher.lock", "launcher-logs", "temp":
				default:
					return 14
				}
			}
		}
	}
	ancestor := data
	for {
		s, e := os.Stat(ancestor)
		if e == nil {
			if !s.IsDir() {
				return 15
			}
			break
		}
		if !os.IsNotExist(e) {
			return 15
		}
		next := filepath.Dir(ancestor)
		if next == ancestor {
			return 15
		}
		ancestor = next
	}
	probe, e := os.CreateTemp(ancestor, ".ksession-location-check-")
	if e != nil {
		return 15
	}
	name := probe.Name()
	probe.Close()
	if os.Remove(name) != nil {
		return 15
	}
	if prepare {
		if e = os.MkdirAll(data, 0700); e != nil {
			return 15
		}
		if !noReparse(data) {
			return 13
		}
		if !hasData {
			marker := filepath.Join(data, instanceMarker)
			f, e := os.OpenFile(marker, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
			if e == nil {
				_, e = f.WriteString(instanceMarkerText)
				f.Close()
				if e != nil {
					return 15
				}
			} else if !os.IsExist(e) {
				return 15
			}
		}
	}
	return 0
}
func installedInstance(root, requested string) (string, error) {
	parent := filepath.Dir(root)
	binding := filepath.Join(parent, "uninstall", "instance-binding.ini")
	remembered, e := preference("InstallRoot")
	if e != nil {
		return "", fail("BINDING_INVALID", "无法读取安装数据位置。请重新安装并选择原数据目录。")
	}
	_, hasBinding := os.Lstat(binding)
	_, hasMarker := os.Stat(filepath.Join(parent, "uninstall", "installer-manifest.json"))
	installed := strings.EqualFold(root, filepath.Join(remembered, "program")) || hasBinding == nil || hasMarker == nil
	if !installed {
		return requested, nil
	}
	bad := func() (string, error) {
		return "", fail("BINDING_INVALID", "安装数据位置绑定缺失、异常或与启动参数冲突。不会切换为空目录；请重新安装并选择原数据位置。")
	}
	if hasBinding != nil || !noReparse(binding) || iniValue(binding, "Schema") != "1" || !strings.EqualFold(iniValue(binding, "InstallRoot"), parent) {
		return bad()
	}
	data := iniValue(binding, "Instance")
	if strings.EqualFold(remembered, parent) {
		last, err := preference("Instance")
		if err != nil || !strings.EqualFold(last, data) {
			return bad()
		}
	}
	if requested != "" && !strings.EqualFold(requested, data) {
		return bad()
	}
	if s, e := os.Stat(data); e != nil || !s.IsDir() {
		return bad()
	}
	if checkInstallInstance(parent, data, false) != 0 {
		return bad()
	}
	return data, nil
}
