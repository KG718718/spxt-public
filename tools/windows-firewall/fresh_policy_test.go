//go:build fresh_trial_tests

package main

import (
	"encoding/json"
	"strings"
	"testing"
)

const freshConfigJSON = `{"schema":2,"enabled":true,"interfaceName":"Ethernet","port":8083,"binding":{"adapterId":"12345678-1234-1234-1234-123456789abc","address":"192.168.10.23","prefixLength":24,"subnet":"192.168.10.0/24"}}`

func TestFreshStrictBindingAndStandardSchemaIsolation(t *testing.T) {
	before := buildFreshTrial
	defer func() { buildFreshTrial = before }()
	buildFreshTrial = ""
	if _, err := strictConfig([]byte(freshConfigJSON)); err == nil {
		t.Fatal("standard accepted fresh fifth field")
	}
	buildFreshTrial = "1"
	cfg, err := strictConfig([]byte(freshConfigJSON))
	if err != nil || !validNetworkBinding(cfg.Binding) {
		t.Fatal("fresh strict binding rejected", err)
	}
	for _, bad := range []string{
		`{"schema":2,"enabled":true,"interfaceName":"Ethernet","port":8083}`,
		strings.Replace(freshConfigJSON, `"enabled":true`, `"enabled":null`, 1),
		strings.Replace(freshConfigJSON, `"prefixLength":24`, `"prefixLength":24.0`, 1),
		strings.Replace(freshConfigJSON, `"prefixLength":24`, `"prefixLength":null`, 1),
		strings.Replace(freshConfigJSON, `"adapterId":`, `"AdapterId":`, 1),
		strings.Replace(freshConfigJSON, `"address":`, `"address":"192.168.10.24","address":`, 1),
		strings.Replace(freshConfigJSON, `"binding":{`, `"binding":{"extra":true,`, 1),
		strings.Replace(freshConfigJSON, `"adapterId":"12345678-1234-1234-1234-123456789abc"`, `"adapterId":null`, 1),
		freshConfigJSON + `{}`,
	} {
		if _, err := strictConfig([]byte(bad)); err == nil {
			t.Fatal("unsafe fresh config accepted", bad)
		}
	}
	for _, change := range []networkBinding{
		{AdapterID: "unknown", Address: "192.168.10.23", PrefixLength: 24, Subnet: "192.168.10.0/24"},
		{AdapterID: cfg.Binding.AdapterID, Address: "8.8.8.8", PrefixLength: 24, Subnet: "8.8.8.0/24"},
		{AdapterID: cfg.Binding.AdapterID, Address: "192.168.10.23", PrefixLength: 15, Subnet: "192.168.0.0/15"},
		{AdapterID: cfg.Binding.AdapterID, Address: "192.168.10.0", PrefixLength: 24, Subnet: "192.168.10.0/24"},
		{AdapterID: cfg.Binding.AdapterID, Address: "192.168.10.255", PrefixLength: 24, Subnet: "192.168.10.0/24"},
		{AdapterID: cfg.Binding.AdapterID, Address: "192.168.10.23", PrefixLength: 24, Subnet: "192.168.10.1/24"},
	} {
		next := cfg
		next.Binding = &change
		raw, _ := json.Marshal(next)
		if _, err := strictConfig(raw); err == nil {
			t.Fatal("unsafe binding accepted", string(raw))
		}
	}
	if validNetworkBinding(nil) {
		t.Fatal("nil binding accepted")
	}
}
