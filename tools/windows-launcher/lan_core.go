package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"regexp"
	"strings"
	"unicode/utf16"
)

const (
	lanReady                   = "LAN READY"
	lanDisabled                = "LAN DISABLED"
	needsNetworkSelection      = "NEEDS NETWORK SELECTION"
	hostInitializationRequired = "HOST INITIALIZATION REQUIRED"
	noPrivateLAN               = "NO PRIVATE LAN"
	multipleLANAdapters        = "MULTIPLE LAN ADAPTERS"
	portOccupied               = "PORT OCCUPIED"
	firewallBlocked            = "FIREWALL BLOCKED"
	lanStartFailed             = "LAN START FAILED"
	lanHealthFailed            = "LAN HEALTH FAILED"
	networkChanged             = "NETWORK CHANGED"
)

var virtualInterfaceHint = regexp.MustCompile(`(?i)(\b(vpn|tunnel|tap|tun|wireguard|docker|wsl|virtual|vmware|virtualbox|loopback|bluetooth|teredo|isatap|6to4)\b|hyper[- ]?v|vethernet)`)

type lanCandidate struct {
	InterfaceName string `json:"interfaceName"`
	Name          string `json:"name"`
	Address       string `json:"address"`
	PrefixLength  int    `json:"prefixLength"`
	Subnet        string `json:"subnet"`
}

type lanDiscovery struct {
	Schema     int            `json:"schema"`
	Status     string         `json:"status"`
	Selected   *lanCandidate  `json:"selected"`
	Candidates []lanCandidate `json:"candidates"`
	HostName   string         `json:"hostName"`
}

type lanConfig struct {
	Schema        int    `json:"schema"`
	Enabled       bool   `json:"enabled"`
	InterfaceName string `json:"interfaceName"`
	Port          int    `json:"port"`
}

type lanConfigReply struct {
	Schema int        `json:"schema"`
	Status string     `json:"status"`
	Config *lanConfig `json:"config"`
}

type lanServerState struct {
	Schema                 int           `json:"schema"`
	Status                 string        `json:"status"`
	ServerReady            bool          `json:"serverReady"`
	InitializationRequired bool          `json:"initializationRequired"`
	Port                   *int          `json:"port"`
	LocalListening         bool          `json:"localListening"`
	LANListening           bool          `json:"lanListening"`
	LocalHealth            bool          `json:"localHealth"`
	LANHealth              bool          `json:"lanHealth"`
	RemoteBootstrapClosed  bool          `json:"remoteBootstrapClosed"`
	Selected               *lanCandidate `json:"selected"`
}

func validInterfaceName(value string) bool {
	if value == "" || value != strings.TrimSpace(value) || len(utf16.Encode([]rune(value))) > 128 {
		return false
	}
	for _, r := range value {
		if r < 0x20 || r == 0x7f || r == '\ufffd' {
			return false
		}
	}
	return !virtualInterfaceHint.MatchString(value)
}

func privateIPv4(value string) bool {
	ip := net.ParseIP(value)
	if ip == nil || ip.To4() == nil || strings.Contains(value, ":") {
		return false
	}
	v := ip.To4()
	return v[0] == 10 || (v[0] == 172 && v[1] >= 16 && v[1] <= 31) || (v[0] == 192 && v[1] == 168)
}

func validCandidate(value *lanCandidate) bool {
	if value == nil || !validInterfaceName(value.InterfaceName) || value.Name != value.InterfaceName || !privateIPv4(value.Address) || value.PrefixLength < 8 || value.PrefixLength > 30 {
		return false
	}
	ip, network, err := net.ParseCIDR(value.Subnet)
	if err != nil || ip.String() != network.IP.String() || !network.Contains(net.ParseIP(value.Address)) {
		return false
	}
	ones, bits := network.Mask.Size()
	if bits != 32 || ones != value.PrefixLength {
		return false
	}
	first := network.IP.To4()
	if first == nil || !privateIPv4(first.String()) {
		return false
	}
	last := append(net.IP(nil), first...)
	for i := range last {
		last[i] |= ^network.Mask[i]
	}
	return privateIPv4(last.String())
}

func validServerCandidate(value *lanCandidate) bool {
	if value == nil {
		return false
	}
	copy := *value
	copy.Name = copy.InterfaceName
	return validCandidate(&copy)
}

func decodeStrictJSON(data []byte, target any) error {
	if len(data) == 0 || len(data) > 64*1024 {
		return fmt.Errorf("invalid json size")
	}
	check := json.NewDecoder(strings.NewReader(string(data)))
	if err := checkJSONValue(check); err != nil {
		return err
	}
	if token, err := check.Token(); err != io.EOF || token != nil {
		return fmt.Errorf("trailing json")
	}
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return fmt.Errorf("trailing json")
	}
	return nil
}

func exactObjectKeys(data []byte, keys ...string) error {
	var value map[string]json.RawMessage
	if err := decodeStrictJSON(data, &value); err != nil {
		return err
	}
	if len(value) != len(keys) {
		return fmt.Errorf("unexpected json keys")
	}
	for _, key := range keys {
		if _, ok := value[key]; !ok {
			return fmt.Errorf("missing exact json key")
		}
	}
	return nil
}

func exactNestedKeys(data []byte, field string, keys ...string) error {
	var value map[string]json.RawMessage
	if err := decodeStrictJSON(data, &value); err != nil {
		return err
	}
	raw, ok := value[field]
	if !ok || len(raw) == 0 || raw[0] != '{' {
		return fmt.Errorf("missing nested object")
	}
	return exactObjectKeys(raw, keys...)
}
func exactArrayObjectKeys(data []byte, field string, keys ...string) error {
	var value map[string]json.RawMessage
	if err := decodeStrictJSON(data, &value); err != nil {
		return err
	}
	if len(value[field]) == 0 || value[field][0] != '[' {
		return fmt.Errorf("invalid array")
	}
	var rows []json.RawMessage
	if err := decodeStrictJSON(value[field], &rows); err != nil {
		return err
	}
	for _, row := range rows {
		if err := exactObjectKeys(row, keys...); err != nil {
			return err
		}
	}
	return nil
}

func checkJSONValue(decoder *json.Decoder) error {
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	delimiter, compound := token.(json.Delim)
	if !compound {
		return nil
	}
	switch delimiter {
	case '{':
		seen := map[string]bool{}
		for decoder.More() {
			keyToken, err := decoder.Token()
			if err != nil {
				return err
			}
			key, ok := keyToken.(string)
			if !ok || seen[key] {
				return fmt.Errorf("duplicate json key")
			}
			seen[key] = true
			if err := checkJSONValue(decoder); err != nil {
				return err
			}
		}
		end, err := decoder.Token()
		if err != nil || end != json.Delim('}') {
			return fmt.Errorf("invalid object")
		}
	case '[':
		for decoder.More() {
			if err := checkJSONValue(decoder); err != nil {
				return err
			}
		}
		end, err := decoder.Token()
		if err != nil || end != json.Delim(']') {
			return fmt.Errorf("invalid array")
		}
	default:
		return fmt.Errorf("invalid delimiter")
	}
	return nil
}

type readiness struct {
	ChildAlive, Ownership, AdapterValid, FirewallAllowed bool
	Config                                               *lanConfig
	Server                                               *lanServerState
}

func finalLANStatus(input readiness) string {
	s := input.Server
	if s == nil {
		return lanStartFailed
	}
	status := strings.ReplaceAll(s.Status, "_", " ")
	if s.InitializationRequired || status == hostInitializationRequired {
		return hostInitializationRequired
	}
	for _, fixed := range []string{lanDisabled, needsNetworkSelection, noPrivateLAN, multipleLANAdapters, portOccupied, lanStartFailed, lanHealthFailed, networkChanged} {
		if status == fixed {
			return fixed
		}
	}
	if status != "LAN SERVER READY" {
		return lanStartFailed
	}
	if !input.ChildAlive || input.Config == nil || input.Config.Schema != 2 || !input.Config.Enabled || input.Config.Port < 8080 || input.Config.Port > 8099 ||
		!validInterfaceName(input.Config.InterfaceName) || !input.AdapterValid || !validServerCandidate(s.Selected) ||
		s.Selected.InterfaceName != input.Config.InterfaceName || s.Port == nil || *s.Port != input.Config.Port ||
		!input.Ownership || !s.ServerReady || !s.LocalListening || !s.LANListening || !s.LocalHealth || !s.LANHealth || !s.RemoteBootstrapClosed {
		return lanHealthFailed
	}
	if !input.FirewallAllowed {
		return firewallBlocked
	}
	return lanReady
}

func safeDisplay(value string) string {
	value = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return ' '
		}
		return r
	}, value)
	value = strings.TrimSpace(value)
	if len([]rune(value)) > 256 {
		value = string([]rune(value)[:256])
	}
	return value
}

func exactListenerSet(rows []string, port int, selected string, lanListening bool) bool {
	expected := map[string]bool{fmt.Sprintf("127.0.0.1:%d", port): false}
	if lanListening {
		if !privateIPv4(selected) {
			return false
		}
		expected[fmt.Sprintf("%s:%d", selected, port)] = false
	}
	for _, row := range rows {
		if found, ok := expected[row]; !ok || found {
			return false
		}
		expected[row] = true
	}
	for _, found := range expected {
		if !found {
			return false
		}
	}
	return true
}

func privateLANURL(address string, port int) string {
	if !privateIPv4(address) || port < 8080 || port > 8099 {
		return ""
	}
	return fmt.Sprintf("http://%s:%d/login.html", address, port)
}

func launcherPortRange(config *lanConfig) (int, int) {
	if config != nil {
		return config.Port, config.Port
	}
	return 8080, 8099
}
func keepControlForStartFailure(config *lanConfig, err error) bool {
	return config != nil && err != nil && err.Error() == "PORT_OCCUPIED"
}
