//go:build windows && fresh_trial_tests

package main

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestFreshFirewallBindingBeforeAnyMutation(t *testing.T) {
	for _, scenario := range []string{"exact-binding", "guid-changed", "ip-changed", "prefix-changed", "subnet-changed", "missing-binding", "public", "unknown-virtual", "unknown-hardware", "unknown-hidden", "route-unknown", "read-failure"} {
		t.Run(scenario, func(t *testing.T) {
			ps, err := systemPowerShell()
			if err != nil {
				t.Fatal(err)
			}
			directory := fixtureDir(t)
			events := filepath.Join(directory, "events.jsonl")
			guid, address, prefix, subnet := "12345678-1234-1234-1234-123456789abc", "192.168.10.23", "24", "192.168.10.0/24"
			override := `function Get-NetRoute {[CmdletBinding()]param($InterfaceIndex,$AddressFamily) [pscustomobject]@{DestinationPrefix='192.168.10.0/24';NextHop='0.0.0.0';State='Alive'}}` + "\n"
			switch scenario {
			case "guid-changed":
				guid = "22222222-2222-4222-8222-222222222222"
			case "ip-changed":
				address = "192.168.10.24"
			case "prefix-changed":
				prefix = "25"
			case "subnet-changed":
				subnet = "192.168.11.0/24"
			case "missing-binding":
				guid = ""
			case "unknown-virtual", "unknown-hardware", "unknown-hidden":
				property := map[string]string{"unknown-virtual": "Virtual", "unknown-hardware": "HardwareInterface", "unknown-hidden": "Hidden"}[scenario]
				override += `function Get-NetAdapter {[CmdletBinding()]param([switch]$IncludeHidden) $a=[pscustomobject]@{InterfaceGuid=[guid]'12345678-1234-1234-1234-123456789abc';Status='Up';HardwareInterface=$true;Virtual=$false;Hidden=$false;InterfaceType=6;Name='Ethernet';InterfaceDescription='Synthetic Ethernet';InterfaceIndex=7};$a.` + property + `=$null;$a}` + "\n"
			case "route-unknown":
				override = `function Get-NetRoute {[CmdletBinding()]param($InterfaceIndex,$AddressFamily) [pscustomobject]@{DestinationPrefix='192.168.10.0/24';NextHop='0.0.0.0';State='Unknown'}}` + "\n"
			case "read-failure":
				override += `function Get-NetIPAddress {[CmdletBinding()]param($InterfaceIndex,$AddressFamily) throw 'synthetic read failure'}` + "\n"
			}
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, ps, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", firewallMockHarness+"\n"+override+firewallScript)
			root := os.Getenv("SystemRoot")
			system32 := filepath.Join(root, "System32")
			cmd.Env = []string{"SystemRoot=" + root, "WINDIR=" + root, "PATH=" + system32, "PSModulePath=" + filepath.Join(system32, "WindowsPowerShell", "v1.0", "Modules"), "TEMP=" + directory, "TMP=" + directory,
				"KSESSION_FW_ACTION=enable", "KSESSION_FW_INTERFACE_NAME=Ethernet", "KSESSION_FW_PORT=8083", `KSESSION_FW_PROGRAM=C:\KSESSION\program\runtime\node.exe`,
				"KSESSION_FW_FRESH_TRIAL=1", "KSESSION_FW_ADAPTER_ID=" + guid, "KSESSION_FW_ADDRESS=" + address, "KSESSION_FW_PREFIX=" + prefix, "KSESSION_FW_SUBNET=" + subnet,
				"KSESSION_TEST_EVENT_FILE=" + events, "KSESSION_TEST_SCENARIO=" + scenario}
			output, err := cmd.CombinedOutput()
			if ctx.Err() != nil {
				t.Fatal(ctx.Err())
			}
			if scenario == "exact-binding" {
				if err != nil {
					t.Fatalf("exact binding rejected: %v %s", err, output)
				}
				data, readErr := os.ReadFile(events)
				if readErr != nil || !strings.Contains(string(data), "new-rule") {
					t.Fatal("synthetic mutation never reached")
				}
			} else {
				var exit *exec.ExitError
				if !errors.As(err, &exit) || (exit.ExitCode() != exitNetwork && exit.ExitCode() != exitBlocked) {
					t.Fatalf("unexpected rejection: %v %s", err, output)
				}
				if data, readErr := os.ReadFile(events); readErr == nil && len(data) > 0 {
					t.Fatalf("mutation before binding rejection: %s", data)
				} else if readErr != nil && !os.IsNotExist(readErr) {
					t.Fatal(readErr)
				}
			}
		})
	}
}
