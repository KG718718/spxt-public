//go:build windows

package main

import (
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unicode/utf16"
	"unsafe"
)

const (
	selectAdapterID  = 201
	confirmAdapterID = 205
	enableLANID      = 202
	copyLANID        = 203
	reselectPortID   = 204
)

func systemRootFromAPI() (string, error) {
	buffer := make([]uint16, 32768)
	r, _, e := kernel32.NewProc("GetSystemDirectoryW").Call(uintptr(unsafe.Pointer(&buffer[0])), uintptr(len(buffer)))
	if r == 0 || r >= uintptr(len(buffer)) {
		return "", e
	}
	system32 := syscall.UTF16ToString(buffer[:r])
	root := filepath.Dir(system32)
	if !filepath.IsAbs(root) || !strings.EqualFold(filepath.Base(system32), "System32") {
		return "", fmt.Errorf("system directory invalid")
	}
	return root, nil
}

func (c *controller) lanEnabled() bool { return validDigest(firewallHelperHash) }

func (c *controller) commandEnvironment() ([]string, error) {
	root, err := systemRootFromAPI()
	if err != nil {
		return nil, err
	}
	temp := filepath.Join(c.instance, "temp")
	return []string{
		"SystemRoot=" + root, "WINDIR=" + root, "PATH=" + filepath.Join(root, "System32"),
		"TEMP=" + temp, "TMP=" + temp, "USERPROFILE=" + temp, "APPDATA=" + temp, "LOCALAPPDATA=" + temp,
		"HOME=" + temp,
	}, nil
}

var commandEnvironmentBoundary = func(c *controller) ([]string, error) { return c.commandEnvironment() }

func (c *controller) runNodeCLI(script string, args ...string) ([]byte, int, error) {
	if !c.lanEnabled() {
		return nil, -1, fmt.Errorf("LAN build disabled")
	}
	node := filepath.Join(c.root, "runtime", "node.exe")
	app := filepath.Join(c.root, "app")
	full := filepath.Join(app, filepath.FromSlash(script))
	if !within(app, full) {
		return nil, -1, fmt.Errorf("unsafe script")
	}
	env, err := commandEnvironmentBoundary(c)
	if err != nil {
		return nil, -1, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	argv := append([]string{"--no-addons", full}, args...)
	cmd := exec.CommandContext(ctx, node, argv...)
	cmd.Dir = app
	cmd.Env = env
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.Output()
	if len(output) > 64*1024 {
		return nil, -1, fmt.Errorf("CLI output too large")
	}
	if ctx.Err() != nil {
		return nil, -1, ctx.Err()
	}
	exit := 0
	if err != nil {
		if x, ok := err.(*exec.ExitError); ok {
			exit = x.ExitCode()
		} else {
			return nil, -1, err
		}
	}
	return output, exit, nil
}

func (c *controller) readLANConfig() (*lanConfig, error) {
	output, exit, err := c.runNodeCLI("tools/lan-host/config-cli.cjs", "read", "--instance-dir", c.instance)
	if err != nil {
		return nil, err
	}
	var reply lanConfigReply
	if exactObjectKeys(output, "schema", "status", "config") != nil || decodeStrictJSON(output, &reply) != nil || reply.Schema != 1 {
		return nil, fmt.Errorf("invalid config reply")
	}
	if exit == 10 && reply.Status == "NOT_CONFIGURED" && reply.Config == nil {
		return nil, nil
	}
	if exit != 0 || reply.Status != "CONFIGURED" || reply.Config == nil || exactNestedKeys(output, "config", "schema", "port", "adapterPreference") != nil || reply.Config.Schema != 1 || reply.Config.Port < 8080 || reply.Config.Port > 8099 || !validGUID(reply.Config.AdapterPreference) {
		return nil, fmt.Errorf("config rejected")
	}
	return reply.Config, nil
}

func (c *controller) discoverLAN() (*lanDiscovery, error) {
	output, exit, err := c.runNodeCLI("tools/lan-host/launcher-cli.cjs", "discover")
	if err != nil {
		return nil, err
	}
	var reply lanDiscovery
	if exactObjectKeys(output, "schema", "status", "selected", "candidates", "hostName") != nil || exactArrayObjectKeys(output, "candidates", "adapterId", "name", "address", "prefixLength", "subnet") != nil || decodeStrictJSON(output, &reply) != nil || reply.Schema != 1 || (exit != 0 && exit != 10 && exit != 12) {
		return nil, fmt.Errorf("discovery rejected")
	}
	for index := range reply.Candidates {
		if !validCandidate(&reply.Candidates[index]) {
			return nil, fmt.Errorf("candidate rejected")
		}
	}
	if exit == 10 && (reply.Status != "MULTIPLE_LAN_ADAPTERS" || reply.Selected != nil || len(reply.Candidates) < 2) {
		return nil, fmt.Errorf("multiple selection invalid")
	}
	if exit == 12 && (reply.Status != "NO_PRIVATE_LAN" || reply.Selected != nil || len(reply.Candidates) != 0) {
		return nil, fmt.Errorf("empty selection invalid")
	}
	if exit == 0 && (reply.Status != "SELECTED" || reply.Selected == nil || exactNestedKeys(output, "selected", "adapterId", "name", "address", "prefixLength", "subnet") != nil) {
		return nil, fmt.Errorf("selection rejected")
	}
	return &reply, nil
}

func (c *controller) discoverPreferred(adapter string) (*lanDiscovery, error) {
	if !validGUID(adapter) {
		return nil, fmt.Errorf("adapter rejected")
	}
	output, exit, err := c.runNodeCLI("tools/lan-host/network-cli.cjs", "discover", "--adapter-preference", adapter)
	if err != nil {
		return nil, err
	}
	var reply lanDiscovery
	if exactObjectKeys(output, "schema", "status", "selected", "candidates", "hostName") != nil || exactArrayObjectKeys(output, "candidates", "adapterId", "name", "address", "prefixLength", "subnet") != nil || decodeStrictJSON(output, &reply) != nil || reply.Schema != 1 || (exit != 0 && exit != 11 && exit != 12) {
		return nil, fmt.Errorf("discovery rejected")
	}
	for index := range reply.Candidates {
		if !validCandidate(&reply.Candidates[index]) {
			return nil, fmt.Errorf("candidate rejected")
		}
	}
	if exit == 11 && (reply.Status != "NETWORK_CHANGED" || reply.Selected != nil) {
		return nil, fmt.Errorf("network change invalid")
	}
	if exit == 12 && (reply.Status != "NO_PRIVATE_LAN" || reply.Selected != nil) {
		return nil, fmt.Errorf("no LAN invalid")
	}
	if exit == 0 && (reply.Status != "SELECTED" || exactNestedKeys(output, "selected", "adapterId", "name", "address", "prefixLength", "subnet") != nil || !validCandidate(reply.Selected)) {
		return nil, fmt.Errorf("selection rejected")
	}
	return &reply, nil
}

type configureReply struct {
	Schema   int           `json:"schema"`
	Status   string        `json:"status"`
	Config   *lanConfig    `json:"config"`
	Selected *lanCandidate `json:"selected"`
}

func (c *controller) configureLAN(adapter string, reselect bool) (*lanConfig, error) {
	if !validGUID(adapter) {
		return nil, fmt.Errorf("adapter rejected")
	}
	command := "configure"
	if reselect {
		command = "reselect"
	}
	output, exit, err := c.runNodeCLI("tools/lan-host/launcher-cli.cjs", command, "--instance-dir", c.instance, "--adapter-guid", adapter)
	if err != nil {
		return nil, err
	}
	var reply configureReply
	if exactObjectKeys(output, "schema", "status", "config", "selected") != nil || exactNestedKeys(output, "config", "schema", "port", "adapterPreference") != nil || exactNestedKeys(output, "selected", "adapterId", "name", "address", "prefixLength", "subnet") != nil || decodeStrictJSON(output, &reply) != nil || exit != 0 || reply.Schema != 1 || reply.Status != "SAVED" || reply.Config == nil || reply.Selected == nil || !validCandidate(reply.Selected) || reply.Config.AdapterPreference != adapter {
		return nil, fmt.Errorf("configuration rejected")
	}
	return reply.Config, nil
}

func (c *controller) selectExistingAdapter(adapter string) (*lanConfig, error) {
	if !validGUID(adapter) {
		return nil, fmt.Errorf("adapter rejected")
	}
	output, exit, err := c.runNodeCLI("tools/lan-host/launcher-cli.cjs", "select", "--instance-dir", c.instance, "--adapter-guid", adapter)
	if err != nil {
		return nil, err
	}
	var reply configureReply
	if exactObjectKeys(output, "schema", "status", "config", "selected") != nil || exactNestedKeys(output, "config", "schema", "port", "adapterPreference") != nil || exactNestedKeys(output, "selected", "adapterId", "name", "address", "prefixLength", "subnet") != nil || decodeStrictJSON(output, &reply) != nil || exit != 0 || reply.Schema != 1 || reply.Status != "SAVED" || reply.Config == nil || reply.Config.AdapterPreference != adapter {
		return nil, fmt.Errorf("selection rejected")
	}
	return reply.Config, nil
}

func (c *controller) serverState(port int) (*lanServerState, error) {
	if port < 8080 || port > 8099 {
		return nil, fmt.Errorf("server absent")
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/api/lan/status", port)
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	req.Host = fmt.Sprintf("127.0.0.1:%d", port)
	req.Header.Set("Origin", "http://"+req.Host)
	client := &http.Client{Timeout: 900 * time.Millisecond, Transport: &http.Transport{Proxy: nil, DisableKeepAlives: true}}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("status rejected")
	}
	var state lanServerState
	bytes, readErr := io.ReadAll(io.LimitReader(res.Body, 64*1024+1))
	if readErr != nil || exactObjectKeys(bytes, "schema", "status", "serverReady", "initializationRequired", "port", "localListening", "lanListening", "localHealth", "lanHealth", "remoteBootstrapClosed", "selected") != nil || decodeStrictJSON(bytes, &state) != nil || state.Schema != 1 {
		return nil, fmt.Errorf("status invalid")
	}
	if state.Selected != nil && exactNestedKeys(bytes, "selected", "adapterId", "address", "prefixLength", "subnet") != nil {
		return nil, fmt.Errorf("status selection invalid")
	}
	return &state, nil
}

func ipv4RowsForPID(pid uint32) ([]string, error) {
	var size uint32
	proc := iphelper.NewProc("GetExtendedTcpTable")
	proc.Call(0, uintptr(unsafe.Pointer(&size)), 0, 2, 3, 0)
	if size < 4 || size > 16*1024*1024 {
		return nil, fmt.Errorf("TCP table invalid")
	}
	buffer := make([]byte, size)
	r, _, _ := proc.Call(uintptr(unsafe.Pointer(&buffer[0])), uintptr(unsafe.Pointer(&size)), 0, 2, 3, 0)
	if r != 0 {
		return nil, fmt.Errorf("TCP table unavailable")
	}
	count := int(binary.LittleEndian.Uint32(buffer))
	result := []string{}
	for i := 0; i < count; i++ {
		offset := 4 + i*24
		if offset+24 > len(buffer) {
			return nil, fmt.Errorf("TCP table truncated")
		}
		row := buffer[offset : offset+24]
		if binary.LittleEndian.Uint32(row[20:]) != pid {
			continue
		}
		address := fmt.Sprintf("%d.%d.%d.%d", row[4], row[5], row[6], row[7])
		port := int(binary.BigEndian.Uint16(row[8:10]))
		result = append(result, address+":"+strconv.Itoa(port))
	}
	return result, nil
}

func hasIPv6Listener(pid uint32) (bool, error) {
	var size uint32
	proc := iphelper.NewProc("GetExtendedTcpTable")
	proc.Call(0, uintptr(unsafe.Pointer(&size)), 0, 23, 3, 0)
	if size < 4 || size > 16*1024*1024 {
		return false, fmt.Errorf("TCP6 table invalid")
	}
	buffer := make([]byte, size)
	r, _, _ := proc.Call(uintptr(unsafe.Pointer(&buffer[0])), uintptr(unsafe.Pointer(&size)), 0, 23, 3, 0)
	if r != 0 {
		return false, fmt.Errorf("TCP6 table unavailable")
	}
	count := int(binary.LittleEndian.Uint32(buffer))
	for i := 0; i < count; i++ {
		offset := 4 + i*56
		if offset+56 > len(buffer) {
			return false, fmt.Errorf("TCP6 table truncated")
		}
		if binary.LittleEndian.Uint32(buffer[offset+52:offset+56]) == pid {
			return true, nil
		}
	}
	return false, nil
}

func ownsExactListeners(pid uint32, port int, selected string, lanListening bool) bool {
	rows, err := ipv4RowsForPID(pid)
	if err != nil {
		return false
	}
	if found, err := hasIPv6Listener(pid); err != nil || found {
		return false
	}
	return exactListenerSet(rows, port, selected, lanListening)
}

func (c *controller) helperPath() (string, bool) {
	if !c.lanEnabled() {
		return "", false
	}
	path := filepath.Join(c.root, "K-SESSION-Firewall.exe")
	info, err := os.Lstat(path)
	if err != nil || !info.Mode().IsRegular() || info.Mode()&os.ModeSymlink != 0 {
		return "", false
	}
	real, err := canonical(path)
	if err != nil || !strings.EqualFold(real, path) {
		return "", false
	}
	hash, err := hashFile(path)
	return path, err == nil && hash == firewallHelperHash
}

func (c *controller) firewallAllowed(config *lanConfig) bool {
	path, ok := c.helperPath()
	if !ok || config == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	env, err := commandEnvironmentBoundary(c)
	if err != nil {
		return false
	}
	cmd := exec.CommandContext(ctx, path, "status", "--port", strconv.Itoa(config.Port), "--adapter-guid", config.AdapterPreference)
	cmd.Dir = c.root
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd.Env = env
	output, err := cmd.Output()
	if err != nil || len(output) > 4096 {
		return false
	}
	var result struct {
		Schema int    `json:"schema"`
		Status string `json:"status"`
		Code   string `json:"code"`
	}
	return exactObjectKeys(output, "schema", "status", "code") == nil && decodeStrictJSON(output, &result) == nil && result.Schema == 1 && result.Status == "ALLOWED"
}

func (c *controller) elevateFirewall(config *lanConfig) bool {
	path, ok := c.helperPath()
	if !ok || config == nil {
		return false
	}
	type shellExecuteInfo struct {
		CbSize, Mask                      uint32
		Hwnd                              uintptr
		Verb, File, Parameters, Directory *uint16
		Show                              int32
		InstApp, IDList                   uintptr
		Class                             *uint16
		KeyClass                          uintptr
		HotKey                            uint32
		IconOrMonitor, Process            uintptr
	}
	params := "enable --port " + strconv.Itoa(config.Port) + " --adapter-guid " + config.AdapterPreference
	info := shellExecuteInfo{CbSize: uint32(unsafe.Sizeof(shellExecuteInfo{})), Mask: 0x40, Hwnd: c.hwnd, Verb: ptr("runas"), File: ptr(path), Parameters: ptr(params), Directory: ptr(c.root), Show: 0}
	r, _, _ := shell32.NewProc("ShellExecuteExW").Call(uintptr(unsafe.Pointer(&info)))
	if r == 0 || info.Process == 0 {
		return false
	}
	defer syscall.CloseHandle(syscall.Handle(info.Process))
	if status, _ := syscall.WaitForSingleObject(syscall.Handle(info.Process), 0xffffffff); status != 0 {
		return false
	}
	var code uint32
	if rr, _ := call(kernel32, "GetExitCodeProcess", info.Process, uintptr(unsafe.Pointer(&code))); rr == 0 {
		return false
	}
	return code == 0 && c.firewallAllowed(config)
}

func copyText(hwnd uintptr, value string) bool {
	if value == "" || strings.ContainsRune(value, '\x00') {
		return false
	}
	if r, _, _ := user32.NewProc("OpenClipboard").Call(hwnd); r == 0 {
		return false
	}
	defer user32.NewProc("CloseClipboard").Call()
	user32.NewProc("EmptyClipboard").Call()
	encoded := utf16.Encode([]rune(value + "\x00"))
	size := uintptr(len(encoded) * 2)
	h, _, _ := kernel32.NewProc("GlobalAlloc").Call(0x42, size)
	if h == 0 {
		return false
	}
	p, _, _ := kernel32.NewProc("GlobalLock").Call(h)
	if p == 0 {
		kernel32.NewProc("GlobalFree").Call(h)
		return false
	}
	var written uintptr
	if r, _, _ := kernel32.NewProc("WriteProcessMemory").Call(^uintptr(0), p, uintptr(unsafe.Pointer(&encoded[0])), size, uintptr(unsafe.Pointer(&written))); r == 0 || written != size {
		kernel32.NewProc("GlobalUnlock").Call(h)
		kernel32.NewProc("GlobalFree").Call(h)
		return false
	}
	kernel32.NewProc("GlobalUnlock").Call(h)
	if r, _, _ := user32.NewProc("SetClipboardData").Call(13, h); r == 0 {
		kernel32.NewProc("GlobalFree").Call(h)
		return false
	}
	return true
}

type lanRefreshResult struct {
	state            *lanServerState
	config           *lanConfig
	discovery        *lanDiscovery
	status           string
	firewall         bool
	ownership        bool
	suggestedAdapter string
	err              bool
	transition       bool
	child            *ownedChild
	ready            bool
}

var elevateFirewallBoundary = func(c *controller, config *lanConfig) bool { return c.elevateFirewall(config) }
var lanTransitionConfigureBoundary = func(c *controller, command, adapter string) (*lanConfig, error) {
	switch command {
	case "configure":
		return c.configureLAN(adapter, false)
	case "select":
		return c.selectExistingAdapter(adapter)
	case "reselect":
		return c.configureLAN(adapter, true)
	default:
		return nil, fmt.Errorf("transition rejected")
	}
}
var lanTransitionStartBoundary = func(c *controller) error { return c.start() }
var lanTransitionSaveConfigBoundary = func(c *controller, config *lanConfig) error { return c.saveConfig(config) }

func startExactLANConfig(c *controller, expected *lanConfig) error {
	if expected == nil {
		return fmt.Errorf("LAN_CONFIG_ABSENT")
	}
	if err := lanTransitionStartBoundary(c); err != nil {
		return err
	}
	if c.lanConfig == nil || c.lanConfig.Port != expected.Port || c.lanConfig.AdapterPreference != expected.AdapterPreference || c.child == nil || c.child.port != expected.Port || !c.ready {
		if c.child != nil {
			c.child.stop()
		}
		c.child = nil
		c.ready = false
		return fmt.Errorf("LAN_START_IDENTITY_MISMATCH")
	}
	return nil
}

func (c *controller) claimLANWork() bool {
	c.lanMu.Lock()
	defer c.lanMu.Unlock()
	if c.lanBusy {
		return false
	}
	c.lanBusy = true
	return true
}
func (c *controller) isLANBusy() bool { c.lanMu.Lock(); defer c.lanMu.Unlock(); return c.lanBusy }

func (c *controller) publishLANResult(result *lanRefreshResult) {
	c.lanMu.Lock()
	if c.lanBusy && c.pendingLAN == nil {
		c.pendingLAN = result
	}
	c.lanMu.Unlock()
	call(user32, "PostMessageW", c.hwnd, lanRefreshMsg, 0, 0)
}

func (c *controller) consumeLANResult() *lanRefreshResult {
	c.lanMu.Lock()
	defer c.lanMu.Unlock()
	result := c.pendingLAN
	if result != nil {
		c.pendingLAN = nil
		c.lanBusy = false
	}
	return result
}

func (c *controller) beginLANRefresh() {
	if !c.lanEnabled() || c.closing || c.child == nil || !c.ready {
		return
	}
	if time.Since(c.lastLANCheck) < 5*time.Second {
		return
	}
	c.lastLANCheck = time.Now()
	pid, port, process := c.child.pid, c.child.port, c.child.process
	c.lanMu.Lock()
	if c.lanBusy {
		c.lanMu.Unlock()
		return
	}
	c.lanBusy = true
	c.lanMu.Unlock()
	go func() {
		result := &lanRefreshResult{}
		state, err := c.serverState(port)
		if err != nil {
			result.err = true
			result.status = lanHealthFailed
		} else {
			result.state = state
			config, configErr := c.readLANConfig()
			if configErr != nil {
				result.err = true
				result.status = lanStartFailed
			} else {
				result.config = config
				if config == nil && !state.InitializationRequired {
					discovery, discoveryErr := c.discoverLAN()
					if discoveryErr != nil {
						result.err = true
						result.status = lanStartFailed
					} else {
						result.discovery = discovery
						switch discovery.Status {
						case "SELECTED":
							if discovery.Selected == nil {
								result.err = true
								result.status = lanStartFailed
							} else {
								result.suggestedAdapter = discovery.Selected.AdapterID
								result.status = networkChanged
							}
						case "MULTIPLE_LAN_ADAPTERS":
							result.status = multipleLANAdapters
						case "NO_PRIVATE_LAN":
							result.status = noPrivateLAN
						default:
							result.status = networkChanged
						}
					}
				} else if config == nil {
					result.status = hostInitializationRequired
				} else {
					discovery, discoveryErr := c.discoverPreferred(config.AdapterPreference)
					if discoveryErr == nil {
						result.discovery = discovery
					}
					adapterValid := discoveryErr == nil && discovery.Status == "SELECTED" && validCandidate(discovery.Selected) && validServerCandidate(state.Selected) && state.Selected.AdapterID == config.AdapterPreference && discovery.Selected.AdapterID == state.Selected.AdapterID && discovery.Selected.Address == state.Selected.Address && discovery.Selected.PrefixLength == state.Selected.PrefixLength && discovery.Selected.Subnet == state.Selected.Subnet
					selected := ""
					if state.Selected != nil {
						selected = state.Selected.Address
					}
					fresh := *state
					fresh.LocalHealth = state.LocalListening && endpointHealthy("127.0.0.1", port, c.loginHash)
					fresh.LANHealth = state.LANListening && privateIPv4(selected) && endpointHealthy(selected, port, c.loginHash)
					state = &fresh
					result.state = state
					alive := process != 0
					if alive {
						status, _ := syscall.WaitForSingleObject(process, 0)
						alive = status == 258
					}
					result.ownership = alive && ownsExactListeners(pid, port, selected, state.LANListening)
					if state.ServerReady && adapterValid && result.ownership {
						result.firewall = c.firewallAllowed(config)
					}
					result.status = finalLANStatus(readiness{ChildAlive: alive, Ownership: result.ownership, AdapterValid: adapterValid, FirewallAllowed: result.firewall, Config: config, Server: state})
				}
			}
		}
		c.publishLANResult(result)
	}()
}

func (c *controller) currentLANURL() string {
	c.lanMu.Lock()
	defer c.lanMu.Unlock()
	if c.lanBusy {
		return ""
	}
	return c.lanURL
}

func verifiedFreshLANEndpoint(result *lanRefreshResult) (*lanCandidate, int, bool) {
	if result == nil || result.config == nil || result.discovery == nil || result.discovery.Status != "SELECTED" || !validCandidate(result.discovery.Selected) || result.state == nil || result.state.Port == nil || !validServerCandidate(result.state.Selected) {
		return nil, 0, false
	}
	fresh, server := result.discovery.Selected, result.state.Selected
	if *result.state.Port != result.config.Port || fresh.AdapterID != result.config.AdapterPreference || server.AdapterID != fresh.AdapterID || server.Address != fresh.Address || server.PrefixLength != fresh.PrefixLength || server.Subnet != fresh.Subnet {
		return nil, 0, false
	}
	return fresh, result.config.Port, true
}

func (c *controller) applyLANRefresh() {
	result := c.consumeLANResult()
	if result == nil || c.closing {
		return
	}
	if result.transition {
		c.child = result.child
		c.ready = result.ready
		c.lanConfig = result.config
	}
	c.lanStatus = result.status
	if result.err && result.state == nil {
		c.lanURL = ""
		if result.status == portOccupied && result.config != nil {
			c.text(fmt.Sprintf("PORT OCCUPIED\r\n保存的 LAN 端口 %d 仍被占用；请主动重新寻找端口。", result.config.Port))
		} else {
			c.text(result.status + "\r\n本机服务与既有业务数据保持不变。")
		}
		c.lastLANCheck = time.Time{}
		return
	}
	if result.suggestedAdapter != "" {
		c.startLANTransition("configure", result.suggestedAdapter)
		return
	}
	if result.discovery != nil {
		c.lanCandidates = append([]lanCandidate(nil), result.discovery.Candidates...)
		call(user32, "SendMessageW", c.combo, 0x014B, 0, 0) // CB_RESETCONTENT
		for _, candidate := range c.lanCandidates {
			label := safeDisplay(candidate.Name) + " | " + candidate.Address + " | " + candidate.Subnet
			call(user32, "SendMessageW", c.combo, 0x0143, 0, uintptr(unsafe.Pointer(ptr(label)))) // CB_ADDSTRING
		}
		if len(c.lanCandidates) > 0 {
			call(user32, "SendMessageW", c.combo, 0x014E, 0, 0)
		}
	}
	c.lanConfig = result.config
	c.lanStatus = result.status
	c.lanURL = ""
	host, adapter, address, subnet := "-", "-", "-", "-"
	if name, err := os.Hostname(); err == nil {
		host = safeDisplay(name)
	}
	port := 0
	if result.discovery != nil {
		if result.discovery.HostName != "" {
			host = safeDisplay(result.discovery.HostName)
		}
		if result.discovery.Selected != nil {
			adapter = safeDisplay(result.discovery.Selected.Name)
		}
	}
	if result.state != nil {
		if result.state.Port != nil {
			port = *result.state.Port
		}
		if result.state.Selected != nil {
			address = result.state.Selected.Address
			subnet = result.state.Selected.Subnet
		}
	}
	if fresh, freshPort, ok := verifiedFreshLANEndpoint(result); ok {
		c.lanURL = privateLANURL(fresh.Address, freshPort)
	}
	localURL := "-"
	if c.child != nil {
		localURL = fmt.Sprintf("http://127.0.0.1:%d/login.html", c.child.port)
	}
	note := ""
	if result.status == lanReady {
		note = "\r\nHOST READY — EXTERNAL LAN ACCESS NOT CONFIRMED\r\n第二设备仍可能受公司 VLAN / Guest Wi-Fi / AP 隔离策略限制。"
	}
	c.text(fmt.Sprintf("%s\r\nHost: %s | Adapter: %s\r\nPrivate IPv4: %s | Subnet: %s | Port: %d\r\nLocal URL: %s\r\nLAN URL: %s\r\nListener: local=%t lan=%t | Firewall: %t | Health: local=%t lan=%t%s",
		result.status, host, adapter, address, subnet, port, localURL, emptyDash(c.lanURL), result.state != nil && result.state.LocalListening, result.state != nil && result.state.LANListening, result.firewall, result.state != nil && result.state.LocalHealth, result.state != nil && result.state.LANHealth, note))
}

func emptyDash(value string) string {
	if value == "" {
		return "-"
	}
	return value
}

func (c *controller) startLANTransition(command, adapter string) {
	if !validGUID(adapter) || !c.claimLANWork() {
		return
	}
	var previous *lanConfig
	if c.lanConfig != nil {
		copy := *c.lanConfig
		previous = &copy
	}
	oldChild := c.child
	c.child = nil
	c.ready = false
	c.lanURL = ""
	work := &controller{root: c.root, exe: c.exe, instance: c.instance, class: c.class, loginHash: c.loginHash, suppressUI: true}
	go func() {
		if oldChild != nil {
			oldChild.stop()
		}
		next, err := lanTransitionConfigureBoundary(work, command, adapter)
		restoredBeforeStart := false
		if err != nil {
			next = nil
			if previous != nil {
				if rollback := lanTransitionSaveConfigBoundary(work, previous); rollback != nil {
					err = rollback
				} else {
					next = previous
					restoredBeforeStart = true
				}
			}
		}
		if next == nil && err == nil {
			err = fmt.Errorf("LAN_CONFIG_ABSENT")
		}
		work.lanConfig = next
		var startErr error
		if next != nil {
			startErr = startExactLANConfig(work, next)
		}
		if next != nil && startErr != nil {
			err = startErr
			if previous != nil && !restoredBeforeStart {
				if rollback := lanTransitionSaveConfigBoundary(work, previous); rollback != nil {
					err = rollback
				} else {
					if work.child != nil {
						work.child.stop()
					}
					work.child = nil
					work.ready = false
					work.lanConfig = previous
					if recoveryErr := startExactLANConfig(work, previous); recoveryErr != nil {
						err = recoveryErr
					} else {
						err = fmt.Errorf("LAN_START_FAILED")
					}
				}
			}
		}
		status := networkChanged
		if err != nil {
			status = lanStartFailed
			if err.Error() == "PORT_OCCUPIED" {
				status = portOccupied
			}
		}
		c.publishLANResult(&lanRefreshResult{status: status, err: true, transition: true, child: work.child, ready: work.ready, config: work.lanConfig})
	}()
}

func (c *controller) selectAdapter() {
	if c.isLANBusy() {
		return
	}
	if len(c.lanCandidates) == 0 {
		return
	}
	r, _, _ := user32.NewProc("SendMessageW").Call(c.combo, 0x0147, 0, 0) // CB_GETCURSEL
	index := int32(r)
	if index < 0 || int(index) >= len(c.lanCandidates) {
		c.text("MULTIPLE LAN ADAPTERS\r\n请选择一个明确的 Adapter / IPv4 / Subnet。")
		return
	}
	selected := c.lanCandidates[index]
	command := "configure"
	if c.lanConfig != nil {
		command = "select"
	}
	c.startLANTransition(command, selected.AdapterID)
}

func (c *controller) enableFirewallAsync() {
	if c.isLANBusy() {
		return
	}
	if c.lanConfig == nil {
		c.text("FIREWALL BLOCKED\r\n请先完成首个 Admin 和 LAN 适配器配置。")
		return
	}
	if !c.claimLANWork() {
		return
	}
	go func() {
		config := *c.lanConfig
		ok := elevateFirewallBoundary(c, &config)
		status := networkChanged
		if !ok {
			status = firewallBlocked
		}
		c.publishLANResult(&lanRefreshResult{status: status, err: true})
	}()
}

func (c *controller) saveConfig(config *lanConfig) error {
	if config == nil {
		return fmt.Errorf("config absent")
	}
	output, exit, err := c.runNodeCLI("tools/lan-host/config-cli.cjs", "save", "--instance-dir", c.instance, "--port", strconv.Itoa(config.Port), "--adapter-preference", config.AdapterPreference)
	if err != nil || exit != 0 {
		return fmt.Errorf("save failed")
	}
	var reply lanConfigReply
	if exactObjectKeys(output, "schema", "status", "config") != nil || exactNestedKeys(output, "config", "schema", "port", "adapterPreference") != nil || decodeStrictJSON(output, &reply) != nil || reply.Status != "SAVED" {
		return fmt.Errorf("save rejected")
	}
	return nil
}

func (c *controller) reselectPort() {
	if c.isLANBusy() {
		return
	}
	if c.lanConfig == nil {
		return
	}
	r, _ := call(user32, "MessageBoxW", c.hwnd, uintptr(unsafe.Pointer(ptr("重新寻找端口会保存新端口并重启本后台。是否继续？"))), uintptr(unsafe.Pointer(ptr(product))), 0x24)
	if r != 6 {
		return
	}
	c.startLANTransition("reselect", c.lanConfig.AdapterPreference)
}
