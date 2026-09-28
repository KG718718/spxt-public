//go:build windows

package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// This harness shadows only the fixed Windows cmdlets used by firewallScript. The production
// script itself is executed unchanged and has no mock/test switch.
const firewallMockHarness = `
$script:eventFile=$env:KSESSION_TEST_EVENT_FILE
$script:scenario=$env:KSESSION_TEST_SCENARIO
$script:fault=$env:KSESSION_TEST_FAULT
$script:enableAttempted=$false
$script:rule=$null
$script:filters=@{
  port=[pscustomobject]@{Protocol='TCP';LocalPort='8083';RemotePort='Any'}
  app=[pscustomobject]@{Program='C:\KSESSION\program\runtime\node.exe'}
  address=[pscustomobject]@{RemoteAddress=@('192.168.10.0/24')}
  interface=[pscustomobject]@{InterfaceAlias=@('Ethernet')}
}
function Record-TestEvent([string]$event){
  $enabled=if($null-eq$script:rule){$null}else{[string]$script:rule.Enabled}
  @{event=$event;enabled=$enabled}|ConvertTo-Json -Compress|Add-Content -LiteralPath $script:eventFile -Encoding utf8
}
function New-TestRule([bool]$owned,[bool]$exact){
  $description=if($owned){'KSESSION_MANAGED_LAN_RULE_V1'}else{'UNKNOWN_OWNER'}
  $script:rule=[pscustomobject]@{DisplayName='K⁺-SESSION LAN Host (Private)';Group='K⁺-SESSION';Description=$description;Direction='Inbound';Action='Allow';Enabled='True';Profile='Private';EdgeTraversalPolicy='Block'}
  if(-not$exact){$script:filters.port.LocalPort='8082'}
}
if($script:scenario -in @('exact','stale','unknown','active-missing','gpo-blocked','fault-update','fault-enable')){
  New-TestRule ($script:scenario-ne'unknown') ($script:scenario-notin@('stale','fault-update','fault-enable'))
}
function Import-Module {[CmdletBinding()]param([Parameter(Position=0)]$Name,[switch]$Force)}
function Get-NetAdapter {[CmdletBinding()]param([switch]$IncludeHidden)
  $name=if($script:scenario-eq'renamed'){'Renamed Ethernet'}else{'Ethernet'}
  [pscustomobject]@{InterfaceGuid=[guid]'12345678-1234-1234-1234-123456789abc';Status='Up';HardwareInterface=$true;Virtual=$false;Hidden=$false;InterfaceType=6;Name=$name;InterfaceDescription='Synthetic physical Ethernet';InterfaceIndex=7}
}
function Get-NetConnectionProfile {[CmdletBinding()]param($InterfaceIndex)
  $category=if($script:scenario-eq'public'){'Public'}else{'Private'}
  [pscustomobject]@{NetworkCategory=$category}
}
function Get-NetIPAddress {[CmdletBinding()]param($InterfaceIndex,$AddressFamily)
  if($script:scenario-eq'wide-subnet'){$ip='172.16.1.2';$prefix=8}else{$ip='192.168.10.23';$prefix=24}
  [pscustomobject]@{IPAddress=$ip;PrefixLength=$prefix;AddressState='Preferred';SkipAsSource=$false}
}
function Get-NetRoute {[CmdletBinding()]param($InterfaceIndex,$AddressFamily)
  [pscustomobject]@{DestinationPrefix='192.168.10.0/24'}
}
function Get-NetFirewallProfile {[CmdletBinding()]param($Name,$PolicyStore)
  if($script:fault-eq'profile-query'){throw 'synthetic profile query failure'}
  $local=if($script:scenario-eq'gpo-blocked'){'False'}else{'True'}
  [pscustomobject]@{Enabled='True';AllowInboundRules='True';AllowLocalFirewallRules=$local}
}
function Get-NetFirewallRule {[CmdletBinding()]param($Name,$PolicyStore)
  if($PolicyStore-eq'ActiveStore'){
    if($script:fault-eq'active-query'){throw 'synthetic ActiveStore query failure'}
    if($script:scenario-eq'active-missing'){return}
    if($null-ne$script:rule-and[string]$script:rule.Enabled-eq'True'){$script:rule}
    return
  }
  if($script:fault-eq'final-get'-and$script:enableAttempted-and$null-ne$script:rule-and[string]$script:rule.Enabled-eq'True'){throw 'synthetic final query failure'}
  if($null-ne$script:rule){$script:rule}
}
function Get-NetFirewallPortFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject)process{$script:filters.port}}
function Get-NetFirewallApplicationFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject)process{$script:filters.app}}
function Get-NetFirewallAddressFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject)process{$script:filters.address}}
function Get-NetFirewallInterfaceFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject)process{$script:filters.interface}}
function New-NetFirewallRule {[CmdletBinding()]param($Name,$DisplayName,$Group,$Description,$Direction,$Action,$Enabled,$Profile,$EdgeTraversalPolicy,$Protocol,$LocalPort,$RemoteAddress,$Program,$InterfaceAlias,$PolicyStore)
  $script:rule=[pscustomobject]@{DisplayName=$DisplayName;Group=$Group;Description=$Description;Direction=$Direction;Action=$Action;Enabled=[string]$Enabled;Profile=$Profile;EdgeTraversalPolicy=$EdgeTraversalPolicy}
  $script:filters.port=[pscustomobject]@{Protocol=[string]$Protocol;LocalPort=[string]$LocalPort;RemotePort='Any'}
  $script:filters.app=[pscustomobject]@{Program=[string]$Program};$script:filters.address=[pscustomobject]@{RemoteAddress=@([string]$RemoteAddress)};$script:filters.interface=[pscustomobject]@{InterfaceAlias=@([string]$InterfaceAlias)}
  Record-TestEvent 'new-rule'
  $script:rule
}
function Set-NetFirewallRule {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject,$Name,$Direction,$Action,$Enabled,$Profile,$EdgeTraversalPolicy,$PolicyStore)process{
  if($PSBoundParameters.ContainsKey('Direction')){$script:rule.Direction=$Direction}
  if($PSBoundParameters.ContainsKey('Action')){$script:rule.Action=$Action}
  if($PSBoundParameters.ContainsKey('Profile')){$script:rule.Profile=$Profile}
  if($PSBoundParameters.ContainsKey('EdgeTraversalPolicy')){$script:rule.EdgeTraversalPolicy=$EdgeTraversalPolicy}
  if($PSBoundParameters.ContainsKey('Enabled')){$script:rule.Enabled=[string]$Enabled}
  if([string]$Enabled-eq'True'){$script:enableAttempted=$true}
  Record-TestEvent 'set-rule'
  if($script:fault-eq'update-before'-and[string]$Enabled-eq'False'){throw 'synthetic update failure'}
  if($script:fault-eq'enable-after'-and[string]$Enabled-eq'True'){throw 'synthetic enable failure'}
  $script:rule
}}
function Set-NetFirewallPortFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject,$Protocol,$LocalPort,$RemotePort)process{$script:filters.port.Protocol=[string]$Protocol;$script:filters.port.LocalPort=[string]$LocalPort;$script:filters.port.RemotePort=[string]$RemotePort;Record-TestEvent 'set-port';$script:filters.port}}
function Set-NetFirewallApplicationFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject,$Program)process{$script:filters.app.Program=[string]$Program;Record-TestEvent 'set-program';$script:filters.app}}
function Set-NetFirewallAddressFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject,$RemoteAddress)process{$script:filters.address.RemoteAddress=@([string]$RemoteAddress);Record-TestEvent 'set-remote';$script:filters.address}}
function Set-NetFirewallInterfaceFilter {[CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject,$InterfaceAlias)process{$script:filters.interface.InterfaceAlias=@([string]$InterfaceAlias);Record-TestEvent 'set-interface';$script:filters.interface}}
`

type firewallEvent struct {
	Event   string  `json:"event"`
	Enabled *string `json:"enabled"`
}

func runFirewallBehavior(t *testing.T, action, scenario, fault string) (int, []firewallEvent) {
	t.Helper()
	powershell, err := systemPowerShell()
	if err != nil {
		t.Fatal(err)
	}
	eventFile := filepath.Join(fixtureDir(t), "events.jsonl")
	cmd := exec.Command(powershell, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", firewallMockHarness+"\n"+firewallScript)
	cmd.Env = append(os.Environ(),
		"KSESSION_FW_ACTION="+action,
		"KSESSION_FW_INTERFACE_NAME="+testInterfaceName,
		"KSESSION_FW_PORT=8083",
		`KSESSION_FW_PROGRAM=C:\KSESSION\program\runtime\node.exe`,
		"KSESSION_TEST_EVENT_FILE="+eventFile,
		"KSESSION_TEST_SCENARIO="+scenario,
		"KSESSION_TEST_FAULT="+fault,
	)
	output, runErr := cmd.CombinedOutput()
	exit := 0
	if runErr != nil {
		var ee *exec.ExitError
		if !errors.As(runErr, &ee) {
			t.Fatalf("PowerShell harness failed: %v\n%s", runErr, output)
		}
		exit = ee.ExitCode()
	}
	events := []firewallEvent{}
	file, err := os.Open(eventFile)
	if err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			var event firewallEvent
			line := bytes.TrimPrefix(scanner.Bytes(), []byte{0xef, 0xbb, 0xbf})
			if err := json.Unmarshal(line, &event); err != nil {
				t.Fatalf("event decode: %v (%q)", err, scanner.Text())
			}
			events = append(events, event)
		}
		if err := scanner.Err(); err != nil {
			t.Fatal(err)
		}
	} else if !os.IsNotExist(err) {
		t.Fatal(err)
	}
	return exit, events
}

func eventNames(events []firewallEvent) string {
	names := make([]string, len(events))
	for i, event := range events {
		names[i] = event.Event
	}
	return strings.Join(names, ",")
}

func requireDisabledLast(t *testing.T, events []firewallEvent) {
	t.Helper()
	if len(events) == 0 || events[len(events)-1].Enabled == nil || *events[len(events)-1].Enabled != "False" {
		t.Fatalf("rule not left disabled: %#v", events)
	}
}

func TestFirewallScriptBehaviorWithIsolatedCmdletHarness(t *testing.T) {
	t.Run("new rule is disabled until final verification", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "new", "")
		if exit != 0 {
			t.Fatalf("exit %d", exit)
		}
		if got := eventNames(events); got != "new-rule,set-rule,set-port,set-program,set-remote,set-interface,set-rule" {
			t.Fatalf("sequence %s", got)
		}
		if events[0].Enabled == nil || *events[0].Enabled != "False" {
			t.Fatal("new rule was not initially disabled")
		}
	})
	t.Run("exact existing rule is idempotent", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "exact", "")
		if exit != 0 || len(events) != 0 {
			t.Fatalf("exit=%d events=%#v", exit, events)
		}
	})
	t.Run("owned stale rule updates in closed order", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "stale", "")
		if exit != 0 {
			t.Fatalf("exit %d", exit)
		}
		if got := eventNames(events); got != "set-rule,set-port,set-program,set-remote,set-interface,set-rule" {
			t.Fatalf("sequence %s", got)
		}
		if events[0].Enabled == nil || *events[0].Enabled != "False" {
			t.Fatal("update did not disable first")
		}
	})
	t.Run("unknown same-name rule is never written", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "unknown", "")
		if exit != exitRuleConflict || len(events) != 0 {
			t.Fatalf("exit=%d events=%#v", exit, events)
		}
	})
	t.Run("public profile is rejected without writes", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "public", "")
		if exit != exitNetwork || len(events) != 0 {
			t.Fatalf("exit=%d events=%#v", exit, events)
		}
	})
	t.Run("renamed selected interface is rejected without writes", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "renamed", "")
		if exit != exitNetwork || len(events) != 0 {
			t.Fatalf("exit=%d events=%#v", exit, events)
		}
	})
	t.Run("overwide RFC1918 prefix is rejected", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "enable", "wide-subnet", "")
		if exit != exitNetwork || len(events) != 0 {
			t.Fatalf("exit=%d events=%#v", exit, events)
		}
	})
	t.Run("status never repairs ineffective ActiveStore", func(t *testing.T) {
		exit, events := runFirewallBehavior(t, "status", "active-missing", "")
		if exit != 10 || len(events) != 0 {
			t.Fatalf("exit=%d events=%#v", exit, events)
		}
	})
	for _, scenario := range []string{"active-missing", "gpo-blocked"} {
		scenario := scenario
		t.Run(scenario+" enable fails closed", func(t *testing.T) {
			exit, events := runFirewallBehavior(t, "enable", scenario, "")
			if exit != exitBlocked {
				t.Fatalf("exit %d", exit)
			}
			requireDisabledLast(t, events)
		})
	}
	for _, fault := range []string{"update-before", "enable-after", "final-get"} {
		fault := fault
		t.Run(fault+" exception fails closed", func(t *testing.T) {
			exit, events := runFirewallBehavior(t, "enable", "fault-enable", fault)
			if exit != exitBlocked {
				t.Fatalf("exit %d events=%#v", exit, events)
			}
			requireDisabledLast(t, events)
		})
	}
	for _, fault := range []string{"profile-query", "active-query"} {
		fault := fault
		t.Run("exact existing "+fault+" exception disables owned rule", func(t *testing.T) {
			exit, events := runFirewallBehavior(t, "enable", "exact", fault)
			if exit != exitBlocked {
				t.Fatalf("exit %d events=%#v", exit, events)
			}
			requireDisabledLast(t, events)
		})
	}
}
