//go:build windows

package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestFirewallHelperFixedHashBeforeElevation(t *testing.T) {
	root := t.TempDir()
	helper := filepath.Join(root, "K-SESSION-Firewall.exe")
	if err := os.WriteFile(helper, []byte("synthetic reviewed helper"), 0600); err != nil {
		t.Fatal(err)
	}
	old := firewallHelperHash
	defer func() { firewallHelperHash = old }()
	firewallHelperHash = digest([]byte("synthetic reviewed helper"))
	c := &controller{root: root}
	if path, ok := c.helperPath(); !ok || path != helper {
		t.Fatal("matching fixed helper rejected")
	}
	if err := os.WriteFile(helper, []byte("tampered helper"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, ok := c.helperPath(); ok {
		t.Fatal("tampered helper accepted for elevation")
	}
}

func TestUACRejectionDoesNotStopLocalChildOrRetry(t *testing.T) {
	old := elevateFirewallBoundary
	defer func() { elevateFirewallBoundary = old }()
	calls := 0
	elevateFirewallBoundary = func(_ *controller, _ *lanConfig) bool { calls++; return false }
	child := &ownedChild{pid: 4242, port: 8083}
	c := &controller{lanConfig: &lanConfig{Schema: 1, Port: 8083, AdapterPreference: syntheticGUID}, child: child}
	c.enableFirewallAsync()
	waitPendingLAN(t, c)
	if !c.isLANBusy() {
		t.Fatal("UAC worker released serialization before UI consumption")
	}
	c.applyLANRefresh()
	if calls != 1 {
		t.Fatalf("elevation calls=%d", calls)
	}
	if c.child != child || c.child.pid != 4242 || c.child.port != 8083 {
		t.Fatal("UAC rejection changed Local child")
	}
}

func TestLANSettingsTransitionDoesNotBlockUIThread(t *testing.T) {
	oldConfigure, oldStart, oldSave := lanTransitionConfigureBoundary, lanTransitionStartBoundary, lanTransitionSaveConfigBoundary
	defer func() {
		lanTransitionConfigureBoundary = oldConfigure
		lanTransitionStartBoundary = oldStart
		lanTransitionSaveConfigBoundary = oldSave
	}()
	release := make(chan struct{})
	entered := make(chan struct{})
	calls := 0
	lanTransitionConfigureBoundary = func(c *controller, command string, _ string) (*lanConfig, error) {
		calls++
		if calls == 1 {
			close(entered)
		}
		if command != "configure" || c.child != nil {
			t.Error("own Local child was not detached before first range probe")
		}
		<-release
		return &lanConfig{Schema: 1, Port: 8080, AdapterPreference: syntheticGUID}, nil
	}
	lanTransitionStartBoundary = func(c *controller) error { c.child = &ownedChild{port: 8080}; c.ready = true; return nil }
	lanTransitionSaveConfigBoundary = func(_ *controller, _ *lanConfig) error { return nil }
	c := &controller{child: &ownedChild{port: 8080}, lanURL: "http://192.168.40.10:8080/login.html"}
	before := time.Now()
	c.startLANTransition("configure", syntheticGUID)
	if time.Since(before) > 50*time.Millisecond {
		t.Fatal("settings transition blocked UI caller")
	}
	if !c.isLANBusy() {
		t.Fatal("transition did not serialize settings")
	}
	if c.currentLANURL() != "" {
		t.Fatal("transition did not immediately revoke stale copy URL")
	}
	<-entered
	c.startLANTransition("configure", syntheticGUID)
	if calls != 1 {
		t.Fatal("second selection entered while first transition was pending")
	}
	close(release)
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		c.lanMu.Lock()
		pending := c.pendingLAN != nil
		c.lanMu.Unlock()
		if pending {
			break
		}
		time.Sleep(time.Millisecond)
	}
	if !c.isLANBusy() {
		t.Fatal("worker released serialization before UI consumed pending result")
	}
	c.startLANTransition("configure", syntheticGUID)
	if calls != 1 || c.currentLANURL() != "" {
		t.Fatal("pending result allowed a new selection or stale copy before UI consumption")
	}
	c.applyLANRefresh()
	if c.isLANBusy() || c.child == nil || !c.ready {
		t.Fatal("UI did not atomically consume transition result")
	}
}

func TestFirewallEnvironmentFailureIsFailClosed(t *testing.T) {
	root := t.TempDir()
	helper := filepath.Join(root, "K-SESSION-Firewall.exe")
	content := []byte("synthetic reviewed helper")
	if err := os.WriteFile(helper, content, 0600); err != nil {
		t.Fatal(err)
	}
	oldHash, oldEnvironment := firewallHelperHash, commandEnvironmentBoundary
	defer func() { firewallHelperHash = oldHash; commandEnvironmentBoundary = oldEnvironment }()
	firewallHelperHash = digest(content)
	commandEnvironmentBoundary = func(_ *controller) ([]string, error) { return nil, fmt.Errorf("synthetic environment failure") }
	c := &controller{root: root}
	if c.firewallAllowed(&lanConfig{Schema: 1, Port: 8080, AdapterPreference: syntheticGUID}) {
		t.Fatal("firewall status inherited ambient environment after allowlist construction failed")
	}
}

func TestTransitionStartFailureRestoresOldConfigAndService(t *testing.T) {
	oldConfigure, oldStart, oldSave := lanTransitionConfigureBoundary, lanTransitionStartBoundary, lanTransitionSaveConfigBoundary
	defer func() {
		lanTransitionConfigureBoundary = oldConfigure
		lanTransitionStartBoundary = oldStart
		lanTransitionSaveConfigBoundary = oldSave
	}()
	previous := &lanConfig{Schema: 1, Port: 8083, AdapterPreference: syntheticGUID}
	next := &lanConfig{Schema: 1, Port: 8084, AdapterPreference: "11111111-2222-4333-8444-555555555555"}
	lanTransitionConfigureBoundary = func(_ *controller, _, _ string) (*lanConfig, error) { copy := *next; return &copy, nil }
	saved := 0
	lanTransitionSaveConfigBoundary = func(_ *controller, config *lanConfig) error {
		if config.Port != previous.Port || config.AdapterPreference != previous.AdapterPreference {
			t.Fatal("rollback did not restore exact previous config")
		}
		saved++
		return nil
	}
	starts := 0
	lanTransitionStartBoundary = func(work *controller) error {
		starts++
		if starts == 1 {
			if work.lanConfig.Port != next.Port {
				t.Fatal("new config was not attempted first")
			}
			return fmt.Errorf("PORT_OCCUPIED")
		}
		if work.lanConfig.Port != previous.Port {
			t.Fatal("recovery attempted a port other than the exact previous config")
		}
		work.child = &ownedChild{port: previous.Port, pid: 4242}
		work.ready = true
		return nil
	}
	c := &controller{lanConfig: previous, child: &ownedChild{port: previous.Port}, lanURL: "http://192.168.40.10:8083/login.html"}
	c.startLANTransition("select", next.AdapterPreference)
	waitPendingLAN(t, c)
	if !c.isLANBusy() {
		t.Fatal("rollback result was exposed before UI consumption")
	}
	c.applyLANRefresh()
	if saved != 1 || starts != 2 || c.lanConfig == nil || c.lanConfig.Port != previous.Port || c.child == nil || c.child.port != previous.Port || !c.ready {
		t.Fatalf("old state not recovered: saved=%d starts=%d config=%+v child=%+v ready=%t", saved, starts, c.lanConfig, c.child, c.ready)
	}
}

func TestFirstTransitionStartFailureKeepsDeterminedPort(t *testing.T) {
	oldConfigure, oldStart, oldSave := lanTransitionConfigureBoundary, lanTransitionStartBoundary, lanTransitionSaveConfigBoundary
	defer func() {
		lanTransitionConfigureBoundary = oldConfigure
		lanTransitionStartBoundary = oldStart
		lanTransitionSaveConfigBoundary = oldSave
	}()
	next := &lanConfig{Schema: 1, Port: 8086, AdapterPreference: syntheticGUID}
	lanTransitionConfigureBoundary = func(_ *controller, _, _ string) (*lanConfig, error) { copy := *next; return &copy, nil }
	starts, saves := 0, 0
	lanTransitionStartBoundary = func(_ *controller) error { starts++; return fmt.Errorf("SERVER_START_FAILED") }
	lanTransitionSaveConfigBoundary = func(_ *controller, _ *lanConfig) error { saves++; return nil }
	c := &controller{lanURL: "http://192.168.40.10:8081/login.html"}
	c.startLANTransition("configure", syntheticGUID)
	waitPendingLAN(t, c)
	c.applyLANRefresh()
	if starts != 1 || saves != 0 || c.lanConfig == nil || c.lanConfig.Port != next.Port || c.child != nil || c.ready {
		t.Fatalf("first determined config was not retained exactly: starts=%d saves=%d config=%+v child=%+v ready=%t", starts, saves, c.lanConfig, c.child, c.ready)
	}
	if c.currentLANURL() != "" {
		t.Fatal("failed first transition restored a stale copy URL")
	}
}

func TestTransitionRejectsUnexpectedFallbackPort(t *testing.T) {
	oldConfigure, oldStart, oldSave := lanTransitionConfigureBoundary, lanTransitionStartBoundary, lanTransitionSaveConfigBoundary
	defer func() {
		lanTransitionConfigureBoundary = oldConfigure
		lanTransitionStartBoundary = oldStart
		lanTransitionSaveConfigBoundary = oldSave
	}()
	next := &lanConfig{Schema: 1, Port: 8086, AdapterPreference: syntheticGUID}
	lanTransitionConfigureBoundary = func(_ *controller, _, _ string) (*lanConfig, error) { copy := *next; return &copy, nil }
	lanTransitionStartBoundary = func(work *controller) error {
		work.child = &ownedChild{port: 8091, pid: 4242}
		work.ready = true
		return nil
	}
	lanTransitionSaveConfigBoundary = func(_ *controller, _ *lanConfig) error { return nil }
	c := &controller{}
	c.startLANTransition("configure", syntheticGUID)
	waitPendingLAN(t, c)
	c.applyLANRefresh()
	if c.child != nil || c.ready || c.lanConfig == nil || c.lanConfig.Port != next.Port || c.lanStatus != lanStartFailed {
		t.Fatalf("unexpected fallback listener was accepted: config=%+v child=%+v ready=%t status=%s", c.lanConfig, c.child, c.ready, c.lanStatus)
	}
}

func waitPendingLAN(t *testing.T, c *controller) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		c.lanMu.Lock()
		pending := c.pendingLAN != nil
		c.lanMu.Unlock()
		if pending {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("LAN worker did not publish a result")
}

func TestFailedRefreshRevokesStaleCopyURL(t *testing.T) {
	c := &controller{lanURL: "http://192.168.40.10:8083/login.html", pendingLAN: &lanRefreshResult{status: networkChanged, err: true}}
	c.applyLANRefresh()
	if c.currentLANURL() != "" {
		t.Fatal("stale DHCP URL remained copyable")
	}
}

func TestFreshDiscoveryMismatchRevokesCopyURL(t *testing.T) {
	port := 8083
	stale := &lanCandidate{AdapterID: syntheticGUID, Name: "Old Adapter", Address: "192.168.40.10", PrefixLength: 24, Subnet: "192.168.40.0/24"}
	c := &controller{
		lanBusy: true,
		lanURL:  "http://192.168.40.10:8083/login.html",
		pendingLAN: &lanRefreshResult{
			status:    networkChanged,
			config:    &lanConfig{Schema: 1, Port: port, AdapterPreference: syntheticGUID},
			discovery: &lanDiscovery{Schema: 1, Status: "NETWORK_CHANGED", Selected: nil},
			state:     &lanServerState{Schema: 1, Status: "LAN_SERVER_READY", Port: &port, Selected: stale},
		},
	}
	c.applyLANRefresh()
	if c.currentLANURL() != "" {
		t.Fatal("stale server-selected IP remained copyable without a matching fresh discovery candidate")
	}
	if address, subnet, url := freshLANPresentation(&lanRefreshResult{config: c.lanConfig, discovery: &lanDiscovery{Schema: 1, Status: "NETWORK_CHANGED"}, state: &lanServerState{Schema: 1, Port: &port, Selected: stale}}); address != "-" || subnet != "-" || url != "" {
		t.Fatalf("stale server-selected endpoint remained presented as current: address=%q subnet=%q url=%q", address, subnet, url)
	}
}

func TestFreshDiscoveryMatchPublishesURLWhenFirewallBlocked(t *testing.T) {
	port := 8083
	fresh := &lanCandidate{AdapterID: syntheticGUID, Name: "Current Adapter", Address: "192.168.40.11", PrefixLength: 24, Subnet: "192.168.40.0/24"}
	server := *fresh
	server.Name = ""
	c := &controller{
		lanBusy: true,
		pendingLAN: &lanRefreshResult{
			status:    firewallBlocked,
			config:    &lanConfig{Schema: 1, Port: port, AdapterPreference: syntheticGUID},
			discovery: &lanDiscovery{Schema: 1, Status: "SELECTED", Selected: fresh},
			state:     &lanServerState{Schema: 1, Status: "FIREWALL_BLOCKED", Port: &port, Selected: &server},
		},
	}
	c.applyLANRefresh()
	if got, want := c.currentLANURL(), "http://192.168.40.11:8083/login.html"; got != want {
		t.Fatalf("verified fresh address was not published for a non-address firewall gate: got %q want %q", got, want)
	}
	result := &lanRefreshResult{config: &lanConfig{Schema: 1, Port: port, AdapterPreference: syntheticGUID}, discovery: &lanDiscovery{Schema: 1, Status: "SELECTED", Selected: fresh}, state: &lanServerState{Schema: 1, Port: &port, Selected: &server}}
	if address, subnet, url := freshLANPresentation(result); address != fresh.Address || subnet != fresh.Subnet || url != "http://192.168.40.11:8083/login.html" {
		t.Fatalf("verified fresh endpoint was hidden: address=%q subnet=%q url=%q", address, subnet, url)
	}
}

func TestStrictLocalStatusAndActualPIDSocketOwnership(t *testing.T) {
	var listener net.Listener
	var port int
	for candidate := 8080; candidate <= 8099; candidate++ {
		l, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", candidate))
		if err == nil {
			listener = l
			port = candidate
			break
		}
	}
	if listener == nil {
		t.Skip("no owned loopback test port")
	}
	defer listener.Close()
	var body atomic.Value
	body.Store(fmt.Sprintf(`{"schema":1,"status":"LOCAL_ONLY","serverReady":false,"initializationRequired":false,"port":%d,"localListening":true,"lanListening":false,"localHealth":true,"lanHealth":false,"remoteBootstrapClosed":true,"selected":null}`, port))
	login := []byte("synthetic login")
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/login.html" {
			_, _ = w.Write(login)
			return
		}
		_, _ = w.Write([]byte(body.Load().(string)))
	})}
	defer server.Close()
	go server.Serve(listener)
	c := &controller{}
	state, err := c.serverState(port)
	if err != nil || state.Port == nil || *state.Port != port {
		t.Fatalf("strict status failed: %v", err)
	}
	if !ownsExactListeners(uint32(os.Getpid()), port, "", false) {
		t.Fatal("actual owned loopback listener not proven")
	}
	if !endpointHealthy("127.0.0.1", port, digest(login)) || endpointHealthy("127.0.0.1", port, digest([]byte("wrong"))) {
		t.Fatal("fresh Host self-probe did not bind to current login hash")
	}
	body.Store(`{"schema":1,"schema":1}`)
	if _, err = c.serverState(port); err == nil {
		t.Fatal("duplicate status field accepted")
	}
	body.Store(`{"schema":1}{"schema":1}`)
	if _, err = c.serverState(port); err == nil {
		t.Fatal("trailing status object accepted")
	}
	body.Store(fmt.Sprintf(`{"schema":1,"Status":"LOCAL_ONLY","serverReady":false,"initializationRequired":false,"port":%d,"localListening":true,"lanListening":false,"localHealth":true,"lanHealth":false,"remoteBootstrapClosed":true,"selected":null}`, port))
	if _, err = c.serverState(port); err == nil {
		t.Fatal("case-insensitive status key accepted")
	}
}

func TestFirewallHelperAbsentHashKeepsHistoricalLocalMode(t *testing.T) {
	old := firewallHelperHash
	defer func() { firewallHelperHash = old }()
	firewallHelperHash = ""
	c := &controller{root: t.TempDir()}
	if c.lanEnabled() {
		t.Fatal("legacy build opened LAN mode")
	}
	if _, ok := c.helperPath(); ok {
		t.Fatal("legacy build trusted helper")
	}
}

func TestStopDispatchRetriesBusyOwnedWindow(t *testing.T) {
	oldAttempt, oldTimeout, oldRetry := dispatchExistingAttemptBoundary, dispatchExistingTimeout, dispatchExistingRetry
	defer func() {
		dispatchExistingAttemptBoundary = oldAttempt
		dispatchExistingTimeout = oldTimeout
		dispatchExistingRetry = oldRetry
	}()
	dispatchExistingTimeout = 100 * time.Millisecond
	dispatchExistingRetry = time.Millisecond
	calls := 0
	dispatchExistingAttemptBoundary = func(class, exe string, stop bool, timeout time.Duration) existingDispatchOutcome {
		calls++
		if class != "synthetic-class" || exe != "synthetic.exe" || !stop || timeout <= 0 || timeout > dispatchExistingTimeout {
			t.Fatal("dispatch boundary received an unsafe request")
		}
		if calls == 1 {
			return dispatchBusy
		}
		return dispatchAccepted
	}
	if !dispatchExisting("synthetic-class", "synthetic.exe", true) || calls != 2 {
		t.Fatalf("busy stop was not retried to acceptance: calls=%d", calls)
	}
}

func TestStopDispatchKeepsStrictOverallTimeout(t *testing.T) {
	oldAttempt, oldTimeout, oldRetry := dispatchExistingAttemptBoundary, dispatchExistingTimeout, dispatchExistingRetry
	defer func() {
		dispatchExistingAttemptBoundary = oldAttempt
		dispatchExistingTimeout = oldTimeout
		dispatchExistingRetry = oldRetry
	}()
	dispatchExistingTimeout = 20 * time.Millisecond
	dispatchExistingRetry = time.Millisecond
	calls := 0
	dispatchExistingAttemptBoundary = func(_, _ string, stop bool, timeout time.Duration) existingDispatchOutcome {
		calls++
		if !stop || timeout <= 0 || timeout > dispatchExistingTimeout {
			t.Fatal("stop retry escaped its strict remaining timeout")
		}
		return dispatchBusy
	}
	started := time.Now()
	if dispatchExisting("synthetic-class", "synthetic.exe", true) {
		t.Fatal("permanently busy window reported stop accepted")
	}
	if elapsed := time.Since(started); elapsed > 250*time.Millisecond || calls < 2 {
		t.Fatalf("stop retry did not remain bounded: elapsed=%s calls=%d", elapsed, calls)
	}
}
