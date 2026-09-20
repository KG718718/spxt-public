//go:build windows

package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
	"unicode/utf16"
	"unsafe"
)

var user32 = syscall.NewLazyDLL("user32.dll")
var kernel32 = syscall.NewLazyDLL("kernel32.dll")
var shell32 = syscall.NewLazyDLL("shell32.dll")
var iphelper = syscall.NewLazyDLL("iphlpapi.dll")

func ptr(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }
func call(d *syscall.LazyDLL, n string, a ...uintptr) (uintptr, error) {
	r, _, e := d.NewProc(n).Call(a...)
	if r == 0 {
		return r, e
	}
	return r, nil
}
func message(text string) {
	call(user32, "MessageBoxW", 0, uintptr(unsafe.Pointer(ptr(text))), uintptr(unsafe.Pointer(ptr(product))), 0x10)
}

type wc struct {
	Size, Style                        uint32
	Proc                               uintptr
	ClsExtra, WndExtra                 int32
	Instance, Icon, Cursor, Background uintptr
	Menu, Class                        *uint16
	SmallIcon                          uintptr
}
type point struct{ X, Y int32 }
type msg struct {
	Hwnd           uintptr
	Message        uint32
	WParam, LParam uintptr
	Time           uint32
	Pt             point
	Private        uint32
}

const openMsg = 0x8001
const stopMsg = 0x8002
const statusMsg = 0x8003

type ownedChild struct {
	process syscall.Handle
	job     syscall.Handle
	pid     uint32
	port    int
}
type controller struct {
	root, exe, instance, class, loginHash string
	lock                                  syscall.Handle
	log                                   *os.File
	hwnd, label                           uintptr
	child                                 *ownedChild
	ready                                 bool
	closing                               bool
}

var active *controller

func (c *controller) event(code string, fields map[string]any) {
	if c.log == nil {
		return
	}
	entry := map[string]any{"time": time.Now().UTC().Format(time.RFC3339Nano), "event": code}
	// Explicit allowlist: never write arbitrary errors, environment, HTTP bodies or child output.
	for _, k := range []string{"pid", "port", "node", "commit", "runtimeVersion", "code", "result"} {
		if v, ok := fields[k]; ok {
			entry[k] = v
		}
	}
	b, _ := json.Marshal(entry)
	c.log.Write(append(b, '\n'))
	c.log.Sync()
}
func (c *controller) text(s string) {
	call(user32, "SetWindowTextW", c.label, uintptr(unsafe.Pointer(ptr(s))))
}
func (ch *ownedChild) alive() bool {
	r, _ := syscall.WaitForSingleObject(ch.process, 0)
	return r == 258
}
func (ch *ownedChild) stop() {
	if ch == nil {
		return
	}
	// Kernel-held Job and process handles, never a PID read from disk.
	if ch.job != 0 {
		syscall.CloseHandle(ch.job)
		ch.job = 0
	}
	if ch.process != 0 {
		syscall.WaitForSingleObject(ch.process, 5000)
		syscall.CloseHandle(ch.process)
		ch.process = 0
	}
}
func spawnNode(node, app, instance string, port int) (*ownedChild, error) {
	j, e := call(kernel32, "CreateJobObjectW", 0, 0)
	if j == 0 {
		return nil, e
	}
	// JOBOBJECT_EXTENDED_LIMIT_INFORMATION x64, LimitFlags offset16.
	limits := make([]byte, 144)
	binary.LittleEndian.PutUint32(limits[16:], 0x2000)
	if r, e := call(kernel32, "SetInformationJobObject", j, 9, uintptr(unsafe.Pointer(&limits[0])), uintptr(len(limits))); r == 0 {
		syscall.CloseHandle(syscall.Handle(j))
		return nil, e
	}
	env := utf16.Encode([]rune(strings.Join(childEnvironment(instance, app, port), "\x00") + "\x00\x00"))
	command := syscall.EscapeArg(node) + " --no-addons " + syscall.EscapeArg(filepath.Join(app, "server.js"))
	si := syscall.StartupInfo{Cb: uint32(unsafe.Sizeof(syscall.StartupInfo{})), Flags: 1, ShowWindow: 0}
	var pi syscall.ProcessInformation
	e = syscall.CreateProcess(ptr(node), ptr(command), nil, nil, false, 0x08000000|0x4|0x400, &env[0], ptr(app), &si, &pi)
	if e != nil {
		syscall.CloseHandle(syscall.Handle(j))
		return nil, e
	}
	ch := &ownedChild{pi.Process, syscall.Handle(j), pi.ProcessId, port}
	if r, e := call(kernel32, "AssignProcessToJobObject", j, uintptr(pi.Process)); r == 0 {
		syscall.TerminateProcess(pi.Process, 1)
		syscall.CloseHandle(pi.Thread)
		ch.stop()
		return nil, e
	}
	r, _, er := kernel32.NewProc("ResumeThread").Call(uintptr(pi.Thread))
	syscall.CloseHandle(pi.Thread)
	if r == 0xffffffff {
		ch.stop()
		return nil, er
	}
	return ch, nil
}
func ownsLoopback(pid uint32, port int) bool {
	var size uint32
	p := iphelper.NewProc("GetExtendedTcpTable")
	p.Call(0, uintptr(unsafe.Pointer(&size)), 0, 2, 3, 0)
	if size < 4 || size > 16*1024*1024 {
		return false
	}
	b := make([]byte, size)
	r, _, _ := p.Call(uintptr(unsafe.Pointer(&b[0])), uintptr(unsafe.Pointer(&size)), 0, 2, 3, 0)
	if r != 0 {
		return false
	}
	found := false
	n := int(binary.LittleEndian.Uint32(b))
	for i := 0; i < n; i++ {
		at := 4 + i*24
		if at+24 > len(b) {
			return false
		}
		row := b[at : at+24]
		if binary.LittleEndian.Uint32(row[20:]) != pid {
			continue
		}
		// OWNER_PID_LISTENER table: state/address/port/remote/remotePort/PID.
		if row[4] != 127 || row[5] != 0 || row[6] != 0 || row[7] != 1 {
			return false
		}
		if int(binary.BigEndian.Uint16(row[8:10])) == port {
			found = true
		}
	}
	return found
}
func (c *controller) healthy() bool {
	return c.child != nil && c.child.alive() && ownsLoopback(c.child.pid, c.child.port) && pageHealthy(c.child.port, c.loginHash)
}
func (c *controller) openBrowser() {
	if !c.ready || !c.healthy() {
		c.event("OPEN_REFUSED", nil)
		return
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/login.html", c.child.port)
	r, _, _ := shell32.NewProc("ShellExecuteW").Call(c.hwnd, uintptr(unsafe.Pointer(ptr("open"))), uintptr(unsafe.Pointer(ptr(url))), 0, 0, 1)
	if r <= 32 {
		c.event("BROWSER_FAILED", map[string]any{"code": r})
		c.text("服务已启动，但浏览器无法打开。请访问：\r\n" + url)
		return
	}
	c.event("BROWSER_OPEN", map[string]any{"port": c.child.port, "result": "ShellExecute accepted"})
}
func (c *controller) cleanup() {
	if c.closing {
		return
	}
	c.closing = true
	c.ready = false
	if c.child != nil {
		pid := c.child.pid
		c.child.stop()
		c.child = nil
		c.event("STOPPED", map[string]any{"pid": pid})
	}
	if c.lock != 0 {
		syscall.CloseHandle(c.lock)
		c.lock = 0
	}
	if c.log != nil {
		c.log.Close()
		c.log = nil
	}
}
func windowProc(hwnd uintptr, m uint32, w, l uintptr) uintptr {
	c := active
	switch m {
	case openMsg:
		if c != nil {
			// A second launch may recover a dead child, never replace a live untrusted service.
			if c.child != nil && !c.child.alive() {
				c.child.stop()
				c.child = nil
				c.ready = false
			}
			if c.child == nil && !c.closing {
				if e := c.start(); e != nil {
					c.event("FAILED", map[string]any{"code": e.Error()})
					c.text("后台重新启动失败，请保存诊断信息后重试。")
					return 0
				}
			}
			c.openBrowser()
			call(user32, "ShowWindow", hwnd, 5)
			call(user32, "SetForegroundWindow", hwnd)
		}
		return 1
	case statusMsg:
		if c != nil && c.ready && c.child != nil {
			return uintptr(c.child.pid)
		}
		return 0
	case stopMsg:
		if c != nil {
			c.cleanup()
		}
		call(user32, "DestroyWindow", hwnd)
		return 1
	case 0x111:
		if w&0xffff == 101 {
			c.openBrowser()
			return 0
		}
		if w&0xffff != 102 {
			break
		}
		fallthrough
	case 0x10:
		r, _ := call(user32, "MessageBoxW", hwnd, uintptr(unsafe.Pointer(ptr("停止 K⁺-SESSION 后台并退出？\r\n请先保存页面中的操作。浏览器页面将无法继续访问。"))), uintptr(unsafe.Pointer(ptr(product))), 0x24)
		if r == 6 {
			c.cleanup()
			call(user32, "DestroyWindow", hwnd)
		}
		return 0
	case 0x11:
		return 1 // WM_QUERYENDSESSION
	case 0x16:
		if w != 0 {
			c.cleanup()
		}
		return 0
	case 0x113:
		if c.ready && c.child != nil && !c.child.alive() {
			pid := c.child.pid
			c.child.stop()
			c.child = nil
			c.ready = false
			c.event("NODE_EXITED", map[string]any{"pid": pid})
			c.text("后台服务意外退出。请关闭此窗口后重新启动。\r\n现有数据不会被删除。")
		}
		return 0
	case 2:
		call(user32, "PostQuitMessage", 0)
		return 0
	}
	r, _, _ := user32.NewProc("DefWindowProcW").Call(hwnd, uintptr(m), w, l)
	return r
}
func sameWindowOwner(hwnd uintptr, exe string) bool {
	var pid uint32
	call(user32, "GetWindowThreadProcessId", hwnd, uintptr(unsafe.Pointer(&pid)))
	h, e := syscall.OpenProcess(0x1000, false, pid)
	if e != nil {
		return false
	}
	defer syscall.CloseHandle(h)
	b := make([]uint16, 32768)
	size := uint32(len(b))
	r, _ := call(kernel32, "QueryFullProcessImageNameW", uintptr(h), 0, uintptr(unsafe.Pointer(&b[0])), uintptr(unsafe.Pointer(&size)))
	return r != 0 && sameFile(syscall.UTF16ToString(b[:size]), exe)
}
func dispatchExisting(class, exe string, stop bool) bool {
	for i := 0; i < 100; i++ {
		hwnd, _ := call(user32, "FindWindowW", uintptr(unsafe.Pointer(ptr(class))), 0)
		if hwnd != 0 && sameWindowOwner(hwnd, exe) {
			var reply uintptr
			m := uintptr(openMsg)
			if stop {
				m = stopMsg
			}
			r, _ := call(user32, "SendMessageTimeoutW", hwnd, m, 0, 0, 2, 15000, uintptr(unsafe.Pointer(&reply)))
			return r != 0 && reply == 1
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}
func (c *controller) makeWindow() error {
	inst, _ := call(kernel32, "GetModuleHandleW", 0)
	cls := wc{Size: uint32(unsafe.Sizeof(wc{})), Proc: syscall.NewCallback(windowProc), Instance: inst, Background: 6, Class: ptr(c.class)}
	if r, e := call(user32, "RegisterClassExW", uintptr(unsafe.Pointer(&cls))); r == 0 {
		return e
	}
	title := product + " — " + buildVersion + " " + buildCommit[:min(len(buildCommit), 8)]
	hwnd, e := call(user32, "CreateWindowExW", 0, uintptr(unsafe.Pointer(ptr(c.class))), uintptr(unsafe.Pointer(ptr(title))), 0x00ca0000, 200, 200, 590, 215, 0, 0, inst, 0)
	if hwnd == 0 {
		return e
	}
	c.hwnd = hwnd
	c.label, _ = call(user32, "CreateWindowExW", 0, uintptr(unsafe.Pointer(ptr("STATIC"))), uintptr(unsafe.Pointer(ptr("正在校验并启动…"))), 0x50000000, 20, 20, 545, 75, hwnd, 0, inst, 0)
	for _, b := range []struct {
		id, x uintptr
		text  string
	}{{101, 20, "打开系统页面"}, {102, 210, "停止服务并退出"}} {
		call(user32, "CreateWindowExW", 0, uintptr(unsafe.Pointer(ptr("BUTTON"))), uintptr(unsafe.Pointer(ptr(b.text))), 0x50010000, b.x, 110, 170, 35, hwnd, b.id, inst, 0)
	}
	call(user32, "ShowWindow", hwnd, 5)
	// First ShowWindow can inherit SW_HIDE from the parent STARTUPINFO.
	// The user-facing control panel must remain reachable even from a hidden parent.
	call(user32, "ShowWindow", hwnd, 5)
	call(user32, "UpdateWindow", hwnd)
	call(user32, "SetTimer", hwnd, 1, 500, 0)
	return nil
}
func (c *controller) start() error {
	node := filepath.Join(c.root, "runtime", "node.exe")
	app := filepath.Join(c.root, "app")
	for port := 8080; port <= 8099; port++ {
		l, e := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
		if e != nil {
			continue
		}
		l.Close()
		ch, e := spawnNode(node, app, c.instance, port)
		if e != nil {
			return fail("SERVER_START_FAILED", "后台无法启动，请检查安全软件提示和 launcher.log。")
		}
		c.child = ch
		c.event("NODE_SPAWN", map[string]any{"pid": ch.pid, "node": node, "port": port})
		end := time.Now().Add(15 * time.Second)
		for time.Now().Before(end) && ch.alive() {
			if c.healthy() {
				c.ready = true
				c.event("READY", map[string]any{"pid": ch.pid, "port": port})
				c.text(fmt.Sprintf("后台已启动：http://127.0.0.1:%d/login.html\r\n关闭浏览器不会停止后台。停止请使用下方按钮。", port))
				c.openBrowser()
				return nil
			}
			time.Sleep(100 * time.Millisecond)
		}
		ch.stop()
		c.child = nil
		// Retry only when the selected port is now occupied (bind race); never loop on corrupted data.
		l, e = net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
		if e == nil {
			l.Close()
			return fail("SERVER_START_FAILED", "后台未能就绪。请检查现有实例数据及安全软件；不会覆盖数据。")
		}
	}
	return fail("PORT_UNAVAILABLE", "8080—8099 端口均不可用，请关闭冲突软件或联系管理员；未结束其他进程。")
}
func run() error {
	runtime.LockOSThread()
	exe, e := os.Executable()
	if e != nil {
		return fail("RUNTIME_MISSING", "无法定位启动器。")
	}
	exe, e = canonical(exe)
	if e != nil {
		return e
	}
	root := filepath.Dir(exe)
	request := ""
	stop := false
	for i := 1; i < len(os.Args); i++ {
		switch os.Args[i] {
		case "--instance":
			i++
			if i >= len(os.Args) {
				return fail("ARGUMENT", "缺少实例目录。")
			}
			request = os.Args[i]
		case "--stop":
			stop = true
		default:
			return fail("ARGUMENT", "不支持的启动参数。")
		}
	}
	request, e = installedInstance(root, request)
	if e != nil {
		return e
	}
	instance, e := instancePath(root, request)
	if e != nil {
		return e
	}
	class := "KSESSION_" + digest([]byte(strings.ToLower(instance)))
	lock, e := syscall.CreateFile(ptr(filepath.Join(instance, ".launcher.lock")), syscall.GENERIC_READ|syscall.GENERIC_WRITE, 0, nil, syscall.OPEN_ALWAYS, syscall.FILE_ATTRIBUTE_NORMAL, 0)
	if e != nil {
		if e == syscall.Errno(32) && dispatchExisting(class, exe, stop) {
			return nil
		}
		return fail("INSTANCE_BUSY", "实例正被另一启动器或会话占用，或目录无法写入。未启动第二个后台。")
	}
	c := &controller{root: root, exe: exe, instance: instance, class: class, lock: lock}
	active = c
	defer c.cleanup()
	if stop {
		return nil
	}
	if e = os.MkdirAll(filepath.Join(instance, "temp"), 0700); e != nil {
		return fail("INSTANCE_UNWRITABLE", "无法创建实例临时目录。")
	}
	if e = os.MkdirAll(filepath.Join(instance, "launcher-logs"), 0700); e != nil {
		return fail("INSTANCE_UNWRITABLE", "无法创建外置日志目录。")
	}
	c.log, e = os.OpenFile(filepath.Join(instance, "launcher-logs", "launcher.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if e != nil {
		return fail("INSTANCE_UNWRITABLE", "无法写入 launcher.log。")
	}
	m, e := verifyRuntime(root)
	if e != nil {
		c.event("FAILED", map[string]any{"code": e.Error()})
		return e
	}
	c.loginHash, e = hashFile(filepath.Join(root, "app", "login.html"))
	if e != nil {
		return e
	}
	c.event("START", map[string]any{"commit": buildCommit, "runtimeVersion": m.Version})
	if e = c.makeWindow(); e != nil {
		return fail("WINDOW_FAILED", "无法创建启动控制窗口。")
	}
	// UI starts before backend, no unchecked command or URL accepted through the message channel.
	if e = c.start(); e != nil {
		c.event("FAILED", map[string]any{"code": e.Error()})
		call(user32, "DestroyWindow", c.hwnd)
		return e
	}
	var mmsg msg
	for {
		r, _, _ := user32.NewProc("GetMessageW").Call(uintptr(unsafe.Pointer(&mmsg)), 0, 0, 0)
		if r == 0 || int32(r) == -1 {
			break
		}
		call(user32, "TranslateMessage", uintptr(unsafe.Pointer(&mmsg)))
		call(user32, "DispatchMessageW", uintptr(unsafe.Pointer(&mmsg)))
	}
	return nil
}
func main() {
	// Installer-only hidden validation: no UI, server, instance initialization or credential output.
	if len(os.Args) > 1 && (os.Args[1] == "--check-install-instance" || os.Args[1] == "--prepare-install-instance") {
		if len(os.Args) != 4 {
			os.Exit(10)
		}
		os.Exit(checkInstallInstance(os.Args[2], os.Args[3], os.Args[1] == "--prepare-install-instance"))
	}
	if e := run(); e != nil {
		if f, ok := e.(*fault); ok {
			message(f.Message + "\r\n错误编号：" + f.Code)
		} else {
			message("启动未完成。请检查文件权限或重新取得完整程序包。")
		}
		os.Exit(1)
	}
}
