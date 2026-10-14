//go:build windows && fresh_trial_tests

package main

import (
	"fmt"
	"strings"
	"testing"
)

func TestFreshEnvironmentAndNetworkBindingFailClosed(t *testing.T) {
	before := freshTrial
	freshTrial = "1"
	defer func() { freshTrial = before }()
	env := strings.Join(childEnvironmentFor(`D:\Synthetic`, `C:\App`, 8083, `C:\Windows`, true), "\n")
	if !strings.Contains(env, "KSESSION_FRESH_TRIAL=1") {
		t.Fatal("fresh child activation absent")
	}
	if strings.Contains(strings.Join(childEnvironmentFor(`D:\Synthetic`, `C:\App`, 8083, `C:\Windows`, false), "\n"), "KSESSION_FRESH_TRIAL") {
		t.Fatal("local child unexpectedly activated fresh LAN")
	}
	candidate := &lanCandidate{AdapterID: "11111111-1111-4111-8111-111111111111", InterfaceName: "Ethernet", Name: "Ethernet", Address: "192.168.40.10", PrefixLength: 24, Subnet: "192.168.40.0/24"}
	config := &lanConfig{Schema: 2, Enabled: true, InterfaceName: "Ethernet", Port: 8083, Binding: &lanBinding{AdapterID: "11111111-1111-4111-8111-111111111111", Address: candidate.Address, PrefixLength: 24, Subnet: candidate.Subnet}}
	if !matchesLANBinding(config, candidate) {
		t.Fatal("exact trusted binding rejected")
	}
	approvedEnv, approvalErr := freshApprovedEnvironment([]string{"KSESSION_FRESH_TRIAL=1"}, config)
	if approvalErr != nil || !strings.Contains(strings.Join(approvedEnv, "\n"), "KSESSION_FRESH_LAN_APPROVED_CONFIG=") {
		t.Fatal("approved snapshot absent", approvalErr)
	}
	disabled := *config
	disabled.Enabled = false
	disabledEnv, disabledErr := freshApprovedEnvironment(nil, &disabled)
	if disabledErr != nil || len(disabledEnv) != 0 {
		t.Fatal("disabled backend received LAN approval")
	}
	copy := *config
	binding := *config.Binding
	copy.Binding = &binding
	if !sameLANConfig(config, &copy) {
		t.Fatal("equal copied binding rejected")
	}
	for _, field := range []string{"address", "subnet", "prefix", "interface", "adapter"} {
		next := *candidate
		switch field {
		case "adapter":
			next.AdapterID = "22222222-2222-4222-8222-222222222222"
		case "address":
			next.Address = "192.168.40.11"
		case "subnet":
			next.Subnet = "192.168.41.0/24"
		case "prefix":
			next.PrefixLength = 25
		case "interface":
			next.InterfaceName = "Wi-Fi"
		}
		if matchesLANBinding(config, &next) {
			t.Fatal("changed network accepted: " + field)
		}
	}
	copy.Binding = nil
	if matchesLANBinding(&copy, candidate) {
		t.Fatal("missing binding accepted")
	}
	copy.Binding = &binding
	binding.AdapterID = "unknown"
	if matchesLANBinding(&copy, candidate) {
		t.Fatal("unknown adapter accepted")
	}
	testFreshPrebindTransitions(t)
	freshTrial = ""
	if matchesLANBinding(&lanConfig{}, candidate) != true {
		t.Fatal("historical unbound config behavior changed")
	}
}

func testFreshPrebindTransitions(t *testing.T) {
	oldNetwork, oldStatus, oldElevate := freshNetworkBoundary, freshFirewallStatusBoundary, elevateFirewallBoundary
	oldConfigure, oldStart, oldSave := lanTransitionConfigureBoundary, lanTransitionStartBoundary, lanTransitionSaveConfigBoundary
	oldRead, oldHash := freshStartConfigBoundary, firewallHelperHash
	defer func() {
		freshNetworkBoundary = oldNetwork
		freshFirewallStatusBoundary = oldStatus
		elevateFirewallBoundary = oldElevate
		lanTransitionConfigureBoundary = oldConfigure
		lanTransitionStartBoundary = oldStart
		lanTransitionSaveConfigBoundary = oldSave
		freshStartConfigBoundary = oldRead
		firewallHelperHash = oldHash
	}()
	fixture := func(enabled bool) *lanConfig {
		return &lanConfig{Schema: 2, Enabled: enabled, InterfaceName: "Ethernet", Port: 8083, Binding: &lanBinding{AdapterID: "11111111-1111-4111-8111-111111111111", Address: "192.168.40.10", PrefixLength: 24, Subnet: "192.168.40.0/24"}}
	}
	for _, scenario := range []string{"authorization-denied", "network-unknown", "authorization-ineffective", "network-changes-after-uac", "authorization-before-bind", "already-authorized", "start-failure-restores-local", "start-and-rollback-failure-no-residue"} {
		t.Run(scenario, func(t *testing.T) {
			events := []string{}
			authorized := scenario == "already-authorized"
			networkCalls := 0
			enabledBinds := 0
			freshNetworkBoundary = func(_ *controller, _ *lanConfig) bool {
				events = append(events, "network")
				networkCalls++
				return scenario != "network-unknown" && !(scenario == "network-changes-after-uac" && networkCalls > 1)
			}
			freshFirewallStatusBoundary = func(_ *controller, _ *lanConfig) bool { events = append(events, "status"); return authorized }
			elevateFirewallBoundary = func(_ *controller, _ *lanConfig) bool {
				events = append(events, "uac")
				if scenario == "authorization-denied" {
					return false
				}
				authorized = scenario != "authorization-ineffective"
				return true
			}
			previous := fixture(false)
			next := fixture(true)
			lanTransitionConfigureBoundary = func(_ *controller, command, _ string) (*lanConfig, error) {
				events = append(events, "configure")
				if command != "enable" {
					t.Error("unexpected action")
				}
				return next, nil
			}
			lanTransitionSaveConfigBoundary = func(work *controller, cfg *lanConfig) error {
				events = append(events, "rollback")
				if work.child != nil || work.ready {
					t.Error("partial child survived until rollback")
				}
				if !sameLANConfig(cfg, previous) {
					t.Error("trusted state changed during rollback")
				}
				if scenario == "start-and-rollback-failure-no-residue" {
					return fmt.Errorf("SYNTHETIC_SAVE_FAILURE")
				}
				return nil
			}
			lanTransitionStartBoundary = func(work *controller) error {
				if work.lanConfig.Enabled {
					events = append(events, "bind-lan")
					enabledBinds++
					if !authorized {
						t.Error("LAN bound before effective authorization")
					}
					work.child = &ownedChild{port: 8083}
					work.ready = true
					if strings.Contains(scenario, "start-") {
						return fmt.Errorf("SYNTHETIC_START_FAILURE")
					}
				} else {
					events = append(events, "bind-local")
					work.child = &ownedChild{port: 8083}
					work.ready = true
				}
				return nil
			}
			c := &controller{lanConfig: previous}
			c.startLANTransition("enable", "Ethernet")
			waitPendingLAN(t, c)
			result := c.consumeLANResult()
			if result == nil {
				t.Fatal("missing result")
			}
			trace := strings.Join(events, ",")
			if scenario == "authorization-before-bind" || scenario == "start-failure-restores-local" || scenario == "start-and-rollback-failure-no-residue" {
				if !strings.Contains(trace, "network,status,uac,network,status,bind-lan") {
					t.Fatalf("authorization order: %s", trace)
				}
			}
			if strings.Contains(scenario, "start-") {
				if enabledBinds != 1 {
					t.Fatal("authorized start was not attempted")
				}
				if scenario == "start-failure-restores-local" && (result.config.Enabled || result.child == nil || !result.ready || !strings.HasSuffix(trace, "rollback,bind-local")) {
					t.Fatalf("Local recovery failed: %s", trace)
				}
				if scenario == "start-and-rollback-failure-no-residue" && (result.child != nil || result.ready) {
					t.Fatal("failed rollback retained child")
				}
			} else if scenario == "authorization-before-bind" || scenario == "already-authorized" {
				if enabledBinds != 1 || result.child == nil || !result.config.Enabled {
					t.Fatal("authorized start rejected")
				}
			} else {
				if enabledBinds != 0 || result.config.Enabled || result.child == nil || !result.ready {
					t.Fatalf("denial did not recover disabled/Local: %s", trace)
				}
			}
			if scenario == "network-unknown" && strings.Contains(trace, "uac") {
				t.Fatal("unknown network requested authorization")
			}
			if scenario == "already-authorized" && strings.Contains(trace, "uac") {
				t.Fatal("valid existing rule requested UAC")
			}
		})
	}
	for _, scenario := range []string{"saved-start-status-denied", "logon-status-unknown", "saved-start-network-unknown"} {
		t.Run(scenario, func(t *testing.T) {
			statusCalls, uacCalls := 0, 0
			firewallHelperHash = strings.Repeat("a", 64)
			freshStartConfigBoundary = func(_ *controller) (*lanConfig, error) { return fixture(true), nil }
			freshNetworkBoundary = func(_ *controller, _ *lanConfig) bool { return scenario != "saved-start-network-unknown" }
			freshFirewallStatusBoundary = func(_ *controller, _ *lanConfig) bool { statusCalls++; return false }
			elevateFirewallBoundary = func(_ *controller, _ *lanConfig) bool { uacCalls++; return true }
			c := &controller{suppressUI: scenario == "logon-status-unknown"}
			err := c.start()
			if err == nil || (err.Error() != "FIREWALL_BLOCKED" && err.Error() != "NETWORK_CHANGED") {
				t.Fatalf("startup escaped prebind gate: %v", err)
			}
			if uacCalls != 0 || c.child != nil || c.ready {
				t.Fatal("startup elevated or retained child")
			}
			if scenario != "saved-start-network-unknown" && statusCalls != 1 {
				t.Fatal("startup did not read status exactly once")
			}
		})
	}
}
