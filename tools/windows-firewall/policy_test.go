package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

const testGUID = "12345678-1234-1234-1234-123456789abc"

func TestRequestWhitelistAndCanonicalGUID(t *testing.T) {
	valid := [][]string{
		{"status", "--port", "8080", "--adapter-guid", testGUID},
		{"enable", "--adapter-guid", "{12345678-1234-1234-1234-123456789ABC}", "--port", "8099"},
	}
	for _, args := range valid {
		r, err := parseRequest(args)
		if err != nil || r.AdapterGUID != testGUID {
			t.Fatalf("valid request rejected: %#v %v", args, err)
		}
	}
	malicious := [][]string{
		{}, {"delete", "--port", "8080", "--adapter-guid", testGUID},
		{"enable", "--port", "8080", "--program", `C:\evil.exe`},
		{"enable", "--port", "8080", "--remote", "Any"},
		{"enable", "--port", "8080", "--adapter-guid", testGUID, "--script", "Remove-NetFirewallRule"},
		{"enable", "--port", "8080", "--adapter-guid", testGUID, "extra"},
		{"enable", "--port", "8080;Stop-Process", "--adapter-guid", testGUID},
		{"enable", "--port", "8079", "--adapter-guid", testGUID},
		{"enable", "--port", "8100", "--adapter-guid", testGUID},
		{"enable", "--port", "08080", "--adapter-guid", testGUID},
		{"enable", "--port", "8080", "--adapter-guid", "00000000-0000-0000-0000-000000000000"},
		{"enable", "--port", "8080", "--adapter-guid", "../../adapter"},
		{"enable", "--port", "8080", "--adapter-guid", testGUID, "--port", "8081"},
	}
	for _, args := range malicious {
		if _, err := parseRequest(args); err == nil {
			t.Fatalf("unsafe request accepted: %#v", args)
		}
	}
}

func TestStrictDeploymentConfig(t *testing.T) {
	good := []byte(`{"schema":1,"port":8083,"adapterPreference":"` + testGUID + `"}`)
	cfg, err := strictConfig(good)
	if err != nil || cfg.Port != 8083 {
		t.Fatalf("good config: %#v %v", cfg, err)
	}
	bad := [][]byte{
		[]byte(`{"schema":1,"port":8083,"adapterPreference":"` + testGUID + `","remote":"Any"}`),
		[]byte(`{"schema":1,"port":8083,"port":8084,"adapterPreference":"` + testGUID + `"}`),
		[]byte(`{"schema":1,"port":8083,"adapterPreference":"{12345678-1234-1234-1234-123456789ABC}"}`),
		[]byte(`{"schema":1,"port":80,"adapterPreference":"` + testGUID + `"}`),
	}
	for _, data := range bad {
		if _, err := strictConfig(data); err == nil {
			t.Fatalf("unsafe config accepted: %s", data)
		}
	}
}

func put(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0600); err != nil {
		t.Fatal(err)
	}
}

func fixture(t *testing.T) (string, trustedInstall, installAnchors) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "K-SESSION-Beta")
	program := filepath.Join(root, "program")
	exe := filepath.Join(program, helperName)
	node := []byte("synthetic node fixture")
	nodeHash := hashBytes(node)
	manifest := map[string]any{"format": "k-session-runtime", "manifestSchema": 1, "platform": "win32-x64", "sourceCommit": strings.Repeat("a", 40), "nodeHash": nodeHash}
	manifestBytes, _ := json.Marshal(manifest)
	info := installerBuildInfo{Product: productName, InstallerVersion: "1.1.0-beta.3", AppVersion: appVersion,
		DataContractVersion: 1, SourceCommit: strings.Repeat("a", 40), RuntimeManifestSHA256: hashBytes(manifestBytes), NodeVersion: "24.21.0",
		Platform: "windows", Architecture: "x64", InstanceBindingSchema: 1}
	infoBytes, _ := json.Marshal(info)
	put(t, exe, []byte("synthetic helper"))
	put(t, filepath.Join(program, "runtime", "node.exe"), node)
	put(t, filepath.Join(program, "manifest", "runtime-manifest.json"), manifestBytes)
	put(t, filepath.Join(root, "uninstall", "build-info.json"), infoBytes)
	anchors := installAnchors{SourceCommit: strings.Repeat("a", 40), RuntimeManifestSHA256: hashBytes(manifestBytes), NodeSHA256: nodeHash, InstallerVersion: "1.1.0-beta.3"}
	return exe, trustedInstall{InstallRoot: root, ProgramRoot: program, NodePath: filepath.Join(program, "runtime", "node.exe")}, anchors
}

func TestInstallIdentityAndTampering(t *testing.T) {
	exe, _, anchors := fixture(t)
	install, err := verifyInstall(exe, anchors)
	if err != nil || filepath.Base(install.ProgramRoot) != "program" {
		t.Fatalf("valid fixture rejected: %#v %v", install, err)
	}
	put(t, filepath.Join(install.ProgramRoot, "runtime", "node.exe"), []byte("replaced node"))
	if _, err := verifyInstall(exe, anchors); err == nil {
		t.Fatal("replaced program accepted")
	}
	if _, err := verifyInstall(`\\server\share\program\`+helperName, anchors); err == nil {
		t.Fatal("UNC helper accepted")
	}
	if _, err := verifyInstall(filepath.Join(filepath.Dir(exe), "renamed.exe"), anchors); err == nil {
		t.Fatal("renamed helper accepted")
	}
}

func TestReparseResolutionMismatchIsRejected(t *testing.T) {
	path := filepath.Join(t.TempDir(), "plain-file")
	put(t, path, []byte("fixture"))
	err := noReparseWith(path, func(string) (string, error) { return filepath.Join(filepath.Dir(path), "different-file"), nil })
	if err == nil {
		t.Fatal("reparse resolution mismatch accepted")
	}
}

func TestCleanPathComparisonRejectsLexicalAliases(t *testing.T) {
	root := t.TempDir()
	if !sameCleanLocalPath(root, root) {
		t.Fatal("identical clean paths differ")
	}
	if sameCleanLocalPath(root, root+string(filepath.Separator)+"child"+string(filepath.Separator)+"..") {
		t.Fatal("dot-dot alias accepted")
	}
	if sameCleanLocalPath(root, root+":stream") {
		t.Fatal("alternate data stream accepted")
	}
}

func TestBoundConfigMustMatchRequest(t *testing.T) {
	_, install, _ := fixture(t)
	instance := filepath.Join(t.TempDir(), "instance")
	put(t, filepath.Join(instance, configName), []byte(`{"schema":1,"port":8083,"adapterPreference":"`+testGUID+`"}`))
	if err := verifyBoundConfig(instance, install, request{Action: "enable", Port: 8083, AdapterGUID: testGUID}); err != nil {
		t.Fatal(err)
	}
	if err := verifyBoundConfig(instance, install, request{Action: "enable", Port: 8084, AdapterGUID: testGUID}); err == nil {
		t.Fatal("mismatched port accepted")
	}
	if err := verifyBoundConfig(instance, install, request{Action: "enable", Port: 8083, AdapterGUID: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}); err == nil {
		t.Fatal("mismatched adapter accepted")
	}
}

func TestRuleOwnershipAndIdempotencyPolicy(t *testing.T) {
	cases := []struct {
		action               string
		exists, owned, exact bool
		want                 ruleDecision
	}{
		{"status", false, false, false, ruleBlocked}, {"enable", false, false, false, ruleCreate},
		{"status", true, false, false, ruleConflict}, {"enable", true, false, false, ruleConflict},
		{"status", true, true, true, ruleNoChange}, {"enable", true, true, true, ruleNoChange},
		{"status", true, true, false, ruleBlocked}, {"enable", true, true, false, ruleUpdate},
	}
	for _, c := range cases {
		if got := decideRule(c.action, c.exists, c.owned, c.exact); got != c.want {
			t.Fatalf("%+v: got %s", c, got)
		}
	}
}

func TestEmbeddedFirewallScriptIsClosed(t *testing.T) {
	required := []string{"-Direction Inbound", "-Profile Private", "-EdgeTraversalPolicy Block", "-Protocol TCP", "-RemoteAddress $subnet", "-Program $program", "KSESSION_MANAGED_LAN_RULE_V1", "Get-NetConnectionProfile", "SUBNET_ROUTE_MISSING", "minimumPrefix=12", "minimumPrefix=16", "-PolicyStore ActiveStore", "AllowLocalFirewallRules", "-Enabled False"}
	for _, text := range required {
		if !strings.Contains(firewallScript, text) {
			t.Fatalf("missing fixed guard %q", text)
		}
	}
	for _, forbidden := range []string{"cmd /c", "-Profile Public", "-RemoteAddress Any", "Remove-NetFirewallRule", "Set-NetFirewallProfile", "Disable-NetFirewallRule", "Invoke-Expression", "Start-Process", "EncodedCommand"} {
		if strings.Contains(strings.ToLower(firewallScript), strings.ToLower(forbidden)) {
			t.Fatalf("forbidden operation %q", forbidden)
		}
	}
	disable := strings.Index(firewallScript, "Set-NetFirewallRule -Name $ruleName -Direction Inbound -Action Allow -Enabled False")
	changeRemote := strings.Index(firewallScript, "Set-NetFirewallAddressFilter -RemoteAddress $subnet")
	enable := strings.LastIndex(firewallScript, "Set-NetFirewallRule -Name $ruleName -Enabled True")
	if disable < 0 || changeRemote <= disable || enable <= changeRemote {
		t.Fatal("rule update is not disable-update-verify-enable")
	}
}

func TestEmbeddedFirewallScriptParses(t *testing.T) {
	powershell, err := systemPowerShell()
	if err != nil {
		t.Fatal(err)
	}
	parser := `$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput($env:KSESSION_TEST_SCRIPT,[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){$errors|ForEach-Object{$_.Message};exit 1}`
	cmd := exec.Command(powershell, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", parser)
	cmd.Env = append(os.Environ(), "KSESSION_TEST_SCRIPT="+firewallScript)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("PowerShell parse failed: %v\n%s", err, output)
	}
}

func TestStatusOutputAllowlist(t *testing.T) {
	for _, status := range []string{"ALLOWED", "ENABLED", "MISSING", "STALE"} {
		if got, err := validateScriptResult([]byte(`{"schema":1,"status":"` + status + `"}`)); err != nil || got != status {
			t.Fatalf("%s %v", got, err)
		}
	}
	for _, bad := range [][]byte{[]byte(`{"schema":1,"status":"PUBLIC"}`), []byte(`{"schema":1,"status":"ALLOWED","program":"C:\\evil.exe"}`), []byte(`{"schema":1,"status":"ALLOWED","status":"ENABLED"}`)} {
		if _, err := validateScriptResult(bad); err == nil {
			t.Fatalf("unsafe output accepted: %s", bad)
		}
	}
}
