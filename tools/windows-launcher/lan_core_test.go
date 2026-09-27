package main

import (
	"strings"
	"testing"
)

const syntheticGUID = "12345678-1234-1234-1234-123456789abc"

func readyFixture() readiness {
	port := 8083
	return readiness{
		ChildAlive: true, Ownership: true, AdapterValid: true, FirewallAllowed: true,
		Config: &lanConfig{Schema: 1, Port: port, AdapterPreference: syntheticGUID},
		Server: &lanServerState{Schema: 1, Status: "LAN_SERVER_READY", ServerReady: true, InitializationRequired: false, Port: &port, LocalListening: true, LANListening: true, LocalHealth: true, LANHealth: true, RemoteBootstrapClosed: true, Selected: &lanCandidate{AdapterID: syntheticGUID, Address: "192.168.40.10", PrefixLength: 24, Subnet: "192.168.40.0/24"}},
	}
}

func TestLANReadyRequiresEveryGate(t *testing.T) {
	if got := finalLANStatus(readyFixture()); got != lanReady {
		t.Fatalf("ready fixture: %s", got)
	}
	tests := []struct {
		name   string
		mutate func(*readiness)
	}{
		{"server running", func(r *readiness) { r.ChildAlive = false }},
		{"admin created", func(r *readiness) { r.Server.InitializationRequired = true }},
		{"adapter valid", func(r *readiness) { r.AdapterValid = false }},
		{"private IPv4", func(r *readiness) { r.Server.Selected.Address = "203.0.113.2" }},
		{"persisted port", func(r *readiness) { r.Config.Port = 9000 }},
		{"bind ownership", func(r *readiness) { r.Ownership = false }},
		{"LAN listener", func(r *readiness) { r.Server.LANListening = false }},
		{"Local health", func(r *readiness) { r.Server.LocalHealth = false }},
		{"Host LAN selftest", func(r *readiness) { r.Server.LANHealth = false }},
		{"Firewall", func(r *readiness) { r.FirewallAllowed = false }},
		{"remote bootstrap", func(r *readiness) { r.Server.RemoteBootstrapClosed = false }},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := readyFixture()
			tc.mutate(&r)
			if got := finalLANStatus(r); got == lanReady {
				t.Fatal("false LAN READY")
			}
		})
	}
}

func TestFixedServerStatusesMapToProductStates(t *testing.T) {
	for server, want := range map[string]string{"HOST_INITIALIZATION_REQUIRED": hostInitializationRequired, "NO_PRIVATE_LAN": noPrivateLAN, "MULTIPLE_LAN_ADAPTERS": multipleLANAdapters, "PORT_OCCUPIED": portOccupied, "LAN_START_FAILED": lanStartFailed, "LAN_HEALTH_FAILED": lanHealthFailed, "NETWORK_CHANGED": networkChanged} {
		r := readyFixture()
		r.Server.Status = server
		if got := finalLANStatus(r); got != want {
			t.Fatalf("%s => %s", server, got)
		}
	}
	r := readyFixture()
	r.Server.Status = "LAN_READY"
	if got := finalLANStatus(r); got == lanReady {
		t.Fatal("forged server status became LAN READY")
	}
}

func TestCandidateAndJSONAreStrict(t *testing.T) {
	good := &lanCandidate{AdapterID: syntheticGUID, Name: "Synthetic", Address: "192.168.1.4", PrefixLength: 24, Subnet: "192.168.1.0/24"}
	if !validCandidate(good) {
		t.Fatal("good candidate rejected")
	}
	for _, bad := range []*lanCandidate{{AdapterID: syntheticGUID, Name: "Synthetic", Address: "203.0.113.4", PrefixLength: 24, Subnet: "203.0.113.0/24"}, {AdapterID: syntheticGUID, Name: "Synthetic", Address: "192.168.1.4", PrefixLength: 8, Subnet: "192.0.0.0/8"}, {AdapterID: syntheticGUID, Name: "Synthetic", Address: "192.168.1.4", PrefixLength: 24, Subnet: "192.168.2.0/24"}, {AdapterID: syntheticGUID, Name: "Synthetic", Address: "192.168.1.4", PrefixLength: 25, Subnet: "192.168.1.0/24"}} {
		if validCandidate(bad) {
			t.Fatalf("unsafe candidate accepted: %+v", bad)
		}
	}
	var value map[string]any
	for _, source := range []string{`{"schema":1,"schema":1}`, `{"schema":1}{"schema":1}`, strings.Repeat(" ", 64*1024+1)} {
		if decodeStrictJSON([]byte(source), &value) == nil {
			t.Fatal("unsafe JSON accepted")
		}
	}
	if exactObjectKeys([]byte(`{"Schema":1}`), "schema") == nil {
		t.Fatal("case-insensitive key accepted")
	}
}

func TestEnvironmentLANModeIsExplicitAndAllowlisted(t *testing.T) {
	env := strings.Join(childEnvironmentFor(`X:\instance`, `X:\program\app`, 8083, `C:\Windows`, true), "\n")
	for _, want := range []string{"KSESSION_LAN_MODE=1", "KSESSION_HOST=127.0.0.1", "SystemRoot=C:\\Windows"} {
		if !strings.Contains(env, want) {
			t.Fatal("missing " + want)
		}
	}
	for _, bad := range []string{"NODE_OPTIONS", "SMTP_PASSWORD", "0.0.0.0"} {
		if strings.Contains(env, bad) {
			t.Fatal("unsafe env " + bad)
		}
	}
	legacy := strings.Join(childEnvironmentFor(`X:\instance`, `X:\program\app`, 8083, `C:\Windows`, false), "\n")
	if strings.Contains(legacy, "KSESSION_LAN_MODE") {
		t.Fatal("historical Local mode was changed to LAN")
	}
}

func TestExactListenerOwnershipRejectsWildcardThirdNICPortAndPIDImpersonationRows(t *testing.T) {
	good := []string{"127.0.0.1:8083", "192.168.40.10:8083"}
	if !exactListenerSet(good, 8083, "192.168.40.10", true) {
		t.Fatal("exact listeners rejected")
	}
	for _, extra := range []string{"0.0.0.0:8083", "10.0.0.8:8083", "192.168.40.10:8084"} {
		rows := append(append([]string{}, good...), extra)
		if exactListenerSet(rows, 8083, "192.168.40.10", true) {
			t.Fatal("unsafe listener accepted: " + extra)
		}
	}
	if exactListenerSet([]string{"127.0.0.1:8083"}, 8083, "192.168.40.10", true) {
		t.Fatal("missing child LAN listener accepted")
	}
	if exactListenerSet(append(good, good[1]), 8083, "192.168.40.10", true) {
		t.Fatal("duplicate listener row accepted")
	}
}

func TestCopyURLSourceIsOnlyCurrentPrivateEndpoint(t *testing.T) {
	if got := privateLANURL("192.168.40.10", 8083); got != "http://192.168.40.10:8083/login.html" {
		t.Fatal(got)
	}
	for _, bad := range []struct {
		ip   string
		port int
	}{{"203.0.113.2", 8083}, {"0.0.0.0", 8083}, {"192.168.40.10", 9000}} {
		if privateLANURL(bad.ip, bad.port) != "" {
			t.Fatal("unsafe URL copy source")
		}
	}
	if privateLANURL("192.168.40.11", 8083) == privateLANURL("192.168.40.10", 8083) {
		t.Fatal("DHCP address change kept stale URL")
	}
}

func TestPersistedPortNeverSilentlyFallsThroughRange(t *testing.T) {
	if first, last := launcherPortRange(nil); first != 8080 || last != 8099 {
		t.Fatal("first range changed")
	}
	if first, last := launcherPortRange(&lanConfig{Schema: 1, Port: 8087, AdapterPreference: syntheticGUID}); first != 8087 || last != 8087 {
		t.Fatal("persisted port could silently change")
	}
	if !keepControlForStartFailure(&lanConfig{Schema: 1, Port: 8087, AdapterPreference: syntheticGUID}, fail("PORT_OCCUPIED", "synthetic")) {
		t.Fatal("port conflict would close settings control")
	}
	if keepControlForStartFailure(nil, fail("PORT_OCCUPIED", "synthetic")) {
		t.Fatal("fresh unrelated start failure was masked")
	}
}
