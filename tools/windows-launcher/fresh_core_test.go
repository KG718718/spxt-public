//go:build fresh_trial_tests

package main

import (
	"strings"
	"testing"
)

func TestFreshLogonPlanIsCurrentUserInstalledOnly(t *testing.T) {
	before := freshTrial
	freshTrial = "1"
	defer func() { freshTrial = before }()
	exe, instance := `C:\Users\Synthetic\Programs\K-SESSION\program\K-SESSION.exe`, `D:\Synthetic Data\instance`
	command, err := logonCommand(exe, instance, true, true)
	if err != nil || command != `"`+exe+`" --logon --instance "`+instance+`"` {
		t.Fatalf("invalid command: %q %v", command, err)
	}
	for _, flags := range [][2]bool{{false, true}, {true, false}, {false, false}} {
		if _, err := logonCommand(exe, instance, flags[0], flags[1]); err == nil {
			t.Fatal("unverified installation accepted")
		}
	}
	for _, bad := range []string{"", `relative\instance`, `\\host\share`, `C:\safe\..\other`, `C:\safe\x" --stop`, `C:\safe\trailing `, `C:\safe\nul`, `C:\safe\file:stream`, "C:\\safe\\line\n", `C:\safe\`, `C:\safe\\instance`} {
		if _, err := logonCommand(exe, bad, true, true); err == nil {
			t.Fatalf("unsafe instance %q", bad)
		}
		if _, err := logonCommand(bad, instance, true, true); err == nil {
			t.Fatalf("unsafe executable %q", bad)
		}
	}
	if _, err := logonCommand(strings.ReplaceAll(exe, `\program\`, `\other\`), instance, true, true); err == nil {
		t.Fatal("unknown launcher location accepted")
	}
	freshTrial = ""
	if _, err := logonCommand(exe, instance, true, true); err == nil {
		t.Fatal("standard build accepted logon entry")
	}
}

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
	freshTrial = ""
	if matchesLANBinding(&lanConfig{}, candidate) != true {
		t.Fatal("historical unbound config behavior changed")
	}
}
