package main

import (
	"bytes"
	"encoding/json"
	"testing"
)

const fakeGUID = "11111111-2222-4333-8444-555555555555"

func synthetic() observation {
	return observation{
		Schema: 1, IPHelperOK: true, NLMOK: true, COMOK: true,
		Adapters: []adapter{{GUID: fakeGUID, IPv4: "192.168.233.10", Prefix: 24, Oper: "UP", Media: "ETHERNET", Hardware: true, AddressState: "PREFERRED"}},
		Routes:   []route{{AdapterGUID: fakeGUID, Kind: "ON_LINK", Destination: "192.168.233.0/24", Metric: 10}},
		Profiles: []profile{{AdapterGUID: fakeGUID, Category: "PRIVATE"}},
	}
}

func TestF01EmptyAdapter(t *testing.T) { o := synthetic(); o.Adapters = nil; reject(t, o) }
func TestF02MalformedIdentity(t *testing.T) {
	o := synthetic()
	o.Adapters[0].GUID = "not-a-guid"
	reject(t, o)
}
func TestF03InvalidIPv4(t *testing.T) {
	o := synthetic()
	o.Adapters[0].IPv4 = "203.0.113.10"
	reject(t, o)
}
func TestF04InvalidPrefix(t *testing.T) {
	o := synthetic()
	o.Adapters[0].Prefix = 33
	reject(t, o)
	o = synthetic()
	o.Adapters[0].Prefix = 1
	reject(t, o)
}
func TestF05VirtualTunnel(t *testing.T) {
	for _, mutate := range []func(*adapter){func(a *adapter) { a.Virtual = true }, func(a *adapter) { a.Tunnel = true }, func(a *adapter) { a.Hardware = false }, func(a *adapter) { a.Media = "TUNNEL" }} {
		o := synthetic()
		mutate(&o.Adapters[0])
		reject(t, o)
	}
}
func TestF06MissingRoute(t *testing.T) {
	o := synthetic()
	o.Routes = nil
	reject(t, o)
	o = synthetic()
	o.Routes[0].Destination = "192.168.234.0/24"
	reject(t, o)
}
func TestF07AmbiguousProfile(t *testing.T) {
	o := synthetic()
	o.Profiles = append(o.Profiles, profile{AdapterGUID: fakeGUID, Category: "PRIVATE"})
	reject(t, o)
}
func TestF08PublicUnknownDomain(t *testing.T) {
	for _, category := range []string{"PUBLIC", "UNKNOWN", "DOMAIN"} {
		o := synthetic()
		o.Profiles[0].Category = category
		reject(t, o)
	}
}
func TestF09NLMUnavailable(t *testing.T)  { o := synthetic(); o.NLMOK = false; reject(t, o) }
func TestF10IPHelperFailure(t *testing.T) { o := synthetic(); o.IPHelperOK = false; reject(t, o) }
func TestF11COMFailure(t *testing.T)      { o := synthetic(); o.COMOK = false; reject(t, o) }
func TestF12InvalidJSONAndExtraOutput(t *testing.T) {
	for _, raw := range [][]byte{[]byte("{"), []byte(`{} {}`), []byte(`{"schema":1,"extra":true}`)} {
		if _, err := decodeObservation(raw); err == nil {
			t.Fatal("invalid input accepted")
		}
	}
}
func TestF13OutputWhitelist(t *testing.T) {
	o := synthetic()
	r, err := validate(o)
	if err != nil || !r.PrivateCandidatePresent {
		t.Fatal("synthetic control failed")
	}
	b, err := marshalSafe(r)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err = json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	if len(m) != 4 || !bytes.Contains(b, []byte(`"schema":1`)) {
		t.Fatal("output schema mismatch")
	}
	for _, key := range []string{"guid", "ipv4", "adapter", "route", "profile", "hostname"} {
		if bytes.Contains(bytes.ToLower(b), []byte(key)) {
			t.Fatal("identity leaked")
		}
	}
}
func TestF14CountAndByteLimits(t *testing.T) {
	o := synthetic()
	for len(o.Adapters) <= maxAdapters {
		o.Adapters = append(o.Adapters, o.Adapters[0])
	}
	reject(t, o)
	if _, err := decodeObservation(bytes.Repeat([]byte("x"), maxInputBytes+1)); err == nil {
		t.Fatal("oversize input")
	}
	if _, err := marshalSafe(safeResult{Schema: 1, Status: "UNSAFE", Stage: "VALIDATION"}); err == nil {
		t.Fatal("output enum")
	}
}
func TestF15PartialDataFailClosed(t *testing.T) {
	for _, mutate := range []func(*observation){func(o *observation) { o.Adapters[0].AddressState = "" }, func(o *observation) { o.Profiles = nil }, func(o *observation) { o.Routes[0].Kind = "" }} {
		o := synthetic()
		mutate(&o)
		reject(t, o)
	}
}

func reject(t *testing.T, o observation) {
	t.Helper()
	r, err := validate(o)
	if err == nil && r.PrivateCandidatePresent {
		t.Fatal("unsafe candidate accepted")
	}
}
