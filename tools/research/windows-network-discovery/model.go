// RESEARCH / NON-PRODUCTION / NOT PACKAGED.
// This package accepts synthetic observations only. It does not query the host.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/netip"
	"regexp"
	"strings"
)

const maxAdapters = 32
const maxRoutes = 128
const maxProfiles = 64
const maxInputBytes = 64 * 1024
const maxOutputBytes = 4 * 1024

var guidPattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// These are synthetic intermediate observations. A future native collector must
// prove every field rather than silently supplying zero values.
type adapter struct {
	GUID         string `json:"guid"`
	IPv4         string `json:"ipv4"`
	Prefix       int    `json:"prefix"`
	Oper         string `json:"oper"`
	Media        string `json:"media"`
	Hardware     bool   `json:"hardware"`
	Virtual      bool   `json:"virtual"`
	Tunnel       bool   `json:"tunnel"`
	AddressState string `json:"addressState"`
}
type route struct {
	AdapterGUID string `json:"adapterGuid"`
	Kind        string `json:"kind"`
	Destination string `json:"destination"`
	Metric      uint32 `json:"metric"`
}
type profile struct {
	AdapterGUID string `json:"adapterGuid"`
	Category    string `json:"category"`
}
type observation struct {
	Schema     int       `json:"schema"`
	Adapters   []adapter `json:"adapters"`
	Routes     []route   `json:"routes"`
	Profiles   []profile `json:"profiles"`
	IPHelperOK bool      `json:"ipHelperOK"`
	NLMOK      bool      `json:"nlmOK"`
	COMOK      bool      `json:"comOK"`
}
type safeResult struct {
	Schema                  int    `json:"schema"`
	Status                  string `json:"status"`
	Stage                   string `json:"stage"`
	PrivateCandidatePresent bool   `json:"privateCandidatePresent"`
}

func decodeObservation(raw []byte) (observation, error) {
	var o observation
	if len(raw) == 0 || len(raw) > maxInputBytes {
		return o, errors.New("input size")
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(&o); err != nil {
		return o, errors.New("invalid input")
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return o, errors.New("extra input")
	}
	if len(o.Adapters) > maxAdapters || len(o.Routes) > maxRoutes || len(o.Profiles) > maxProfiles {
		return o, errors.New("count limit")
	}
	if o.Schema != 1 {
		return o, errors.New("schema")
	}
	return o, nil
}

func validate(o observation) (safeResult, error) {
	r := safeResult{Schema: 1, Status: "REJECT", Stage: "VALIDATION"}
	if o.Schema != 1 || !o.IPHelperOK || !o.NLMOK || !o.COMOK {
		return r, errors.New("incomplete source")
	}
	if len(o.Adapters) == 0 || len(o.Adapters) > maxAdapters || len(o.Routes) > maxRoutes || len(o.Profiles) > maxProfiles {
		return r, errors.New("collection size")
	}
	for _, rt := range o.Routes {
		p, err := netip.ParsePrefix(rt.Destination)
		if !guidPattern.MatchString(rt.AdapterGUID) || (rt.Kind != "ON_LINK" && rt.Kind != "DEFAULT") || err != nil || !p.Addr().Is4() || p != p.Masked() {
			return r, errors.New("route shape")
		}
		if rt.Kind == "DEFAULT" && rt.Destination != "0.0.0.0/0" {
			return r, errors.New("default route shape")
		}
	}
	for _, p := range o.Profiles {
		if !guidPattern.MatchString(p.AdapterGUID) || (p.Category != "PRIVATE" && p.Category != "PUBLIC" && p.Category != "DOMAIN" && p.Category != "UNKNOWN") {
			return r, errors.New("profile shape")
		}
	}
	for _, a := range o.Adapters {
		if !guidPattern.MatchString(a.GUID) || a.GUID == "00000000-0000-0000-0000-000000000000" {
			return r, errors.New("identity")
		}
		ip, err := netip.ParseAddr(a.IPv4)
		blockBits := privateBlockBits(ip)
		if err != nil || !ip.Is4() || blockBits == 0 || a.Prefix < blockBits || a.Prefix > 32 {
			return r, errors.New("address")
		}
		subnet := netip.PrefixFrom(ip, a.Prefix).Masked()
		if a.Oper != "UP" || a.AddressState != "PREFERRED" {
			continue
		}
		if !a.Hardware || a.Virtual || a.Tunnel || (a.Media != "ETHERNET" && a.Media != "WIFI") {
			continue
		}
		matchedRoute := false
		for _, rt := range o.Routes {
			if strings.EqualFold(rt.AdapterGUID, a.GUID) && (rt.Kind == "DEFAULT" || (rt.Kind == "ON_LINK" && rt.Destination == subnet.String())) {
				matchedRoute = true
			}
		}
		if !matchedRoute {
			continue
		}
		matchedProfile := 0
		for _, p := range o.Profiles {
			if strings.EqualFold(p.AdapterGUID, a.GUID) {
				matchedProfile++
				if p.Category != "PRIVATE" {
					return r, errors.New("non-private or ambiguous profile")
				}
			}
		}
		if matchedProfile == 1 {
			r.Status = "SYNTHETIC_ONLY"
			r.Stage = "SYNTHETIC"
			r.PrivateCandidatePresent = true
		}
		if matchedProfile > 1 {
			return safeResult{Schema: 1, Status: "REJECT", Stage: "VALIDATION"}, errors.New("ambiguous profile")
		}
	}
	return r, nil
}

func privateBlockBits(ip netip.Addr) int {
	if netip.MustParsePrefix("10.0.0.0/8").Contains(ip) {
		return 8
	}
	if netip.MustParsePrefix("172.16.0.0/12").Contains(ip) {
		return 12
	}
	if netip.MustParsePrefix("192.168.0.0/16").Contains(ip) {
		return 16
	}
	return 0
}

func marshalSafe(r safeResult) ([]byte, error) {
	if r.Schema != 1 || (r.Status != "SYNTHETIC_ONLY" && r.Status != "REJECT") || (r.Stage != "VALIDATION" && r.Stage != "SYNTHETIC") {
		return nil, errors.New("invalid output")
	}
	b, err := json.Marshal(r)
	if err != nil || len(b) > maxOutputBytes {
		return nil, errors.New("output size")
	}
	return b, nil
}
