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
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		c.lanMu.Lock()
		busy := c.lanBusy
		c.lanMu.Unlock()
		if !busy {
			break
		}
		time.Sleep(time.Millisecond)
	}
	if calls != 1 {
		t.Fatalf("elevation calls=%d", calls)
	}
	if c.child != child || c.child.pid != 4242 || c.child.port != 8083 {
		t.Fatal("UAC rejection changed Local child")
	}
}

func TestLANSettingsTransitionDoesNotBlockUIThread(t *testing.T) {
	oldConfigure, oldStart := lanTransitionConfigureBoundary, lanTransitionStartBoundary
	defer func() { lanTransitionConfigureBoundary = oldConfigure; lanTransitionStartBoundary = oldStart }()
	release := make(chan struct{})
	lanTransitionConfigureBoundary = func(c *controller, command string, _ string) (*lanConfig, error) {
		if command != "configure" || c.child != nil {
			t.Error("own Local child was not detached before first range probe")
		}
		<-release
		return &lanConfig{Schema: 1, Port: 8080, AdapterPreference: syntheticGUID}, nil
	}
	lanTransitionStartBoundary = func(_ *controller) error { return nil }
	c := &controller{child: &ownedChild{port: 8080}}
	before := time.Now()
	c.startLANTransition("configure", syntheticGUID)
	if time.Since(before) > 50*time.Millisecond {
		t.Fatal("settings transition blocked UI caller")
	}
	if !c.isLANBusy() {
		t.Fatal("transition did not serialize settings")
	}
	close(release)
	deadline := time.Now().Add(time.Second)
	for c.isLANBusy() && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if c.isLANBusy() {
		t.Fatal("transition did not complete")
	}
}

func TestFailedRefreshRevokesStaleCopyURL(t *testing.T) {
	c := &controller{lanURL: "http://192.168.40.10:8083/login.html", pendingLAN: &lanRefreshResult{status: networkChanged, err: true}}
	c.applyLANRefresh()
	if c.currentLANURL() != "" {
		t.Fatal("stale DHCP URL remained copyable")
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
