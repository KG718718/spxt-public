package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const (
	helperName       = "K-SESSION-Firewall.exe"
	configName       = "lan-deployment.json"
	productName      = "K⁺-SESSION Beta"
	appVersion       = "1.0.0"
	runtimeNodeHash  = "ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32"
	ruleName         = "KSESSION-LAN-Host-v1"
	ruleDisplayName  = "K⁺-SESSION LAN Host (Private)"
	ruleGroup        = "K⁺-SESSION"
	ruleDescription  = "KSESSION_MANAGED_LAN_RULE_V1"
	exitInvalid      = 20
	exitInstallTrust = 21
	exitConfig       = 22
	exitNetwork      = 23
	exitRuleConflict = 24
	exitBlocked      = 25
	exitUnexpected   = 70
)

var (
	buildSourceCommit          = "unbuilt"
	buildRuntimeManifestSHA256 = "unbuilt"
	buildNodeSHA256            = "unbuilt"
	buildInstallerVersion      = "unbuilt"
	guidPattern                = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	hexHashPattern             = regexp.MustCompile(`^[0-9a-f]{64}$`)
)

type request struct {
	Action      string
	Port        int
	AdapterGUID string
}

type deploymentConfig struct {
	Schema            int    `json:"schema"`
	Port              int    `json:"port"`
	AdapterPreference string `json:"adapterPreference"`
}

type runtimeManifest struct {
	Format         string `json:"format"`
	ManifestSchema int    `json:"manifestSchema"`
	Platform       string `json:"platform"`
	SourceCommit   string `json:"sourceCommit"`
	NodeHash       string `json:"nodeHash"`
}

type installerBuildInfo struct {
	Product               string `json:"product"`
	InstallerVersion      string `json:"installerVersion"`
	AppVersion            string `json:"appVersion"`
	DataContractVersion   int    `json:"dataContractVersion"`
	SourceCommit          string `json:"sourceCommit"`
	RuntimeManifestSHA256 string `json:"runtimeManifestSha256"`
	NodeVersion           string `json:"nodeVersion"`
	Platform              string `json:"platform"`
	Architecture          string `json:"architecture"`
	InstanceBindingSchema int    `json:"instanceBindingSchema"`
}

type installAnchors struct {
	SourceCommit          string
	RuntimeManifestSHA256 string
	NodeSHA256            string
	InstallerVersion      string
}

type trustedInstall struct {
	InstallRoot string
	ProgramRoot string
	NodePath    string
}

type result struct {
	Schema int    `json:"schema"`
	Status string `json:"status"`
	Code   string `json:"code"`
}

type ruleDecision string

const (
	ruleCreate   ruleDecision = "CREATE"
	ruleNoChange ruleDecision = "NO_CHANGE"
	ruleUpdate   ruleDecision = "UPDATE"
	ruleBlocked  ruleDecision = "BLOCKED"
	ruleConflict ruleDecision = "CONFLICT"
)

type codedError struct {
	Exit int
	Code string
}

func (e *codedError) Error() string      { return e.Code }
func reject(exit int, code string) error { return &codedError{Exit: exit, Code: code} }

func parseRequest(args []string) (request, error) {
	var r request
	if len(args) != 5 || (args[0] != "status" && args[0] != "enable") {
		return r, reject(exitInvalid, "INVALID_INVOCATION")
	}
	r.Action = args[0]
	seen := map[string]bool{}
	for i := 1; i < len(args); i += 2 {
		key, value := args[i], args[i+1]
		if seen[key] || (key != "--port" && key != "--adapter-guid") {
			return request{}, reject(exitInvalid, "INVALID_INVOCATION")
		}
		seen[key] = true
		switch key {
		case "--port":
			if len(value) != 4 || value[0] == '+' || value[0] == '-' {
				return request{}, reject(exitInvalid, "INVALID_PORT")
			}
			port, err := strconv.Atoi(value)
			if err != nil || port < 8080 || port > 8099 {
				return request{}, reject(exitInvalid, "INVALID_PORT")
			}
			r.Port = port
		case "--adapter-guid":
			value = strings.ToLower(value)
			if strings.HasPrefix(value, "{") && strings.HasSuffix(value, "}") && len(value) == 38 {
				value = value[1 : len(value)-1]
			}
			if !validGUID(value) {
				return request{}, reject(exitInvalid, "INVALID_ADAPTER")
			}
			r.AdapterGUID = value
		}
	}
	if !seen["--port"] || !seen["--adapter-guid"] {
		return request{}, reject(exitInvalid, "INVALID_INVOCATION")
	}
	return r, nil
}

func validGUID(value string) bool {
	return guidPattern.MatchString(value) && value != "00000000-0000-0000-0000-000000000000"
}

func hashBytes(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err = io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func isLocalAbsolute(path string) bool {
	if !filepath.IsAbs(path) || strings.HasPrefix(path, `\\`) || strings.HasPrefix(path, `\\?\`) || strings.HasPrefix(path, `\\.\`) {
		return false
	}
	volume := filepath.VolumeName(path)
	return len(volume) == 2 && volume[1] == ':'
}

func cleanLocal(path string) (string, error) {
	if !isLocalAbsolute(path) {
		return "", errors.New("not local absolute")
	}
	if filepath.Clean(path) != path {
		return "", errors.New("unclean path")
	}
	withoutVolume := strings.TrimPrefix(path, filepath.VolumeName(path))
	if strings.ContainsAny(withoutVolume, `:<>"|?*`) {
		return "", errors.New("unsafe path characters")
	}
	for _, r := range path {
		if r < 32 {
			return "", errors.New("unsafe path characters")
		}
	}
	for _, component := range strings.Split(withoutVolume, string(filepath.Separator)) {
		if component != "" && strings.TrimRight(component, ". ") != component {
			return "", errors.New("unsafe path component")
		}
	}
	abs, err := filepath.Abs(path)
	if err != nil || filepath.Clean(abs) != abs {
		return "", errors.New("unclean path")
	}
	return abs, nil
}

func sameCleanLocalPath(a, b string) bool {
	ca, errA := cleanLocal(a)
	cb, errB := cleanLocal(b)
	return errA == nil && errB == nil && strings.EqualFold(ca, cb)
}

func noReparse(path string) error {
	return noReparseWith(path, filepath.EvalSymlinks)
}

func noReparseWith(path string, evaluate func(string) (string, error)) error {
	clean, err := cleanLocal(path)
	if err != nil {
		return err
	}
	resolved, err := evaluate(clean)
	if err != nil || !strings.EqualFold(filepath.Clean(resolved), clean) {
		return errors.New("reparse path")
	}
	volume := filepath.VolumeName(clean) + string(filepath.Separator)
	rel, err := filepath.Rel(volume, clean)
	if err != nil {
		return err
	}
	current := volume
	for _, part := range strings.Split(rel, string(filepath.Separator)) {
		if part == "" || part == "." {
			continue
		}
		current = filepath.Join(current, part)
		info, err := os.Lstat(current)
		if err != nil || info.Mode()&os.ModeSymlink != 0 {
			return errors.New("linked or missing component")
		}
	}
	return nil
}

func within(parent, child string) bool {
	rel, err := filepath.Rel(parent, child)
	return err == nil && rel != "." && !filepath.IsAbs(rel) && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

func verifyUniqueJSON(data []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.UseNumber()
	var walk func() error
	walk = func() error {
		token, err := decoder.Token()
		if err != nil {
			return err
		}
		switch token {
		case json.Delim('{'):
			seen := map[string]bool{}
			for decoder.More() {
				nameToken, err := decoder.Token()
				if err != nil {
					return err
				}
				name, ok := nameToken.(string)
				if !ok || seen[name] {
					return errors.New("duplicate json key")
				}
				seen[name] = true
				if err := walk(); err != nil {
					return err
				}
			}
			_, err = decoder.Token()
			return err
		case json.Delim('['):
			for decoder.More() {
				if err := walk(); err != nil {
					return err
				}
			}
			_, err = decoder.Token()
			return err
		default:
			return nil
		}
	}
	if err := walk(); err != nil {
		return err
	}
	if _, err := decoder.Token(); !errors.Is(err, io.EOF) {
		return errors.New("trailing json")
	}
	return nil
}

func strictConfig(data []byte) (deploymentConfig, error) {
	var c deploymentConfig
	if err := verifyUniqueJSON(data); err != nil {
		return c, err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&c); err != nil {
		return c, err
	}
	if c.Schema != 1 || c.Port < 8080 || c.Port > 8099 || !validGUID(c.AdapterPreference) {
		return deploymentConfig{}, errors.New("invalid config")
	}
	return c, nil
}

func verifyInstall(executable string, anchors installAnchors) (trustedInstall, error) {
	var trusted trustedInstall
	if !regexp.MustCompile(`^[a-f0-9]{40}$`).MatchString(anchors.SourceCommit) ||
		!hexHashPattern.MatchString(anchors.RuntimeManifestSHA256) ||
		!hexHashPattern.MatchString(anchors.NodeSHA256) || anchors.InstallerVersion == "" || anchors.InstallerVersion == "unbuilt" {
		return trusted, reject(exitInstallTrust, "BUILD_ANCHORS_INVALID")
	}
	exe, err := cleanLocal(executable)
	if err != nil || !strings.EqualFold(filepath.Base(exe), helperName) || noReparse(exe) != nil {
		return trusted, reject(exitInstallTrust, "HELPER_PATH_INVALID")
	}
	program := filepath.Dir(exe)
	if !strings.EqualFold(filepath.Base(program), "program") {
		return trusted, reject(exitInstallTrust, "HELPER_PATH_INVALID")
	}
	root := filepath.Dir(program)
	node := filepath.Join(program, "runtime", "node.exe")
	manifestPath := filepath.Join(program, "manifest", "runtime-manifest.json")
	buildInfoPath := filepath.Join(root, "uninstall", "build-info.json")
	for _, path := range []string{root, program, node, manifestPath, buildInfoPath} {
		if noReparse(path) != nil {
			return trusted, reject(exitInstallTrust, "INSTALL_PATH_INVALID")
		}
	}
	manifestBytes, err := os.ReadFile(manifestPath)
	if err != nil || hashBytes(manifestBytes) != anchors.RuntimeManifestSHA256 || verifyUniqueJSON(manifestBytes) != nil {
		return trusted, reject(exitInstallTrust, "RUNTIME_IDENTITY_INVALID")
	}
	var manifest runtimeManifest
	if json.Unmarshal(manifestBytes, &manifest) != nil || manifest.Format != "k-session-runtime" || manifest.ManifestSchema != 1 ||
		manifest.Platform != "win32-x64" || manifest.SourceCommit != anchors.SourceCommit || manifest.NodeHash != anchors.NodeSHA256 {
		return trusted, reject(exitInstallTrust, "RUNTIME_IDENTITY_INVALID")
	}
	nodeHash, err := hashFile(node)
	if err != nil || nodeHash != anchors.NodeSHA256 {
		return trusted, reject(exitInstallTrust, "PROGRAM_IDENTITY_INVALID")
	}
	buildBytes, err := os.ReadFile(buildInfoPath)
	if err != nil || verifyUniqueJSON(buildBytes) != nil {
		return trusted, reject(exitInstallTrust, "INSTALL_METADATA_INVALID")
	}
	var info installerBuildInfo
	if json.Unmarshal(buildBytes, &info) != nil || info.Product != productName || info.InstallerVersion != anchors.InstallerVersion ||
		info.AppVersion != appVersion || info.DataContractVersion != 1 || info.SourceCommit != anchors.SourceCommit ||
		info.RuntimeManifestSHA256 != anchors.RuntimeManifestSHA256 || info.NodeVersion != "24.21.0" ||
		info.Platform != "windows" || info.Architecture != "x64" || info.InstanceBindingSchema != 1 {
		return trusted, reject(exitInstallTrust, "INSTALL_METADATA_INVALID")
	}
	trusted = trustedInstall{InstallRoot: root, ProgramRoot: program, NodePath: node}
	return trusted, nil
}

func validateProductionAnchors(anchors installAnchors) error {
	if anchors.NodeSHA256 != runtimeNodeHash || anchors.InstallerVersion != "1.1.0-beta.3" {
		return reject(exitInstallTrust, "BUILD_ANCHORS_INVALID")
	}
	return nil
}

func verifyBoundConfig(instance string, install trustedInstall, req request) error {
	cleanInstance, err := cleanLocal(instance)
	if err != nil || noReparse(cleanInstance) != nil || strings.EqualFold(cleanInstance, install.InstallRoot) || within(install.InstallRoot, cleanInstance) || within(cleanInstance, install.InstallRoot) {
		return reject(exitConfig, "INSTANCE_BINDING_INVALID")
	}
	configPath := filepath.Join(cleanInstance, configName)
	if noReparse(configPath) != nil {
		return reject(exitConfig, "LAN_CONFIG_INVALID")
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		return reject(exitConfig, "LAN_CONFIG_INVALID")
	}
	cfg, err := strictConfig(data)
	if err != nil || cfg.Port != req.Port || cfg.AdapterPreference != req.AdapterGUID {
		return reject(exitConfig, "LAN_CONFIG_MISMATCH")
	}
	return nil
}

func response(status, code string) []byte {
	b, _ := json.Marshal(result{Schema: 1, Status: status, Code: code})
	return append(b, '\n')
}

func describeError(err error) (int, []byte) {
	var coded *codedError
	if errors.As(err, &coded) {
		return coded.Exit, response("BLOCKED", coded.Code)
	}
	return exitUnexpected, response("BLOCKED", "UNEXPECTED_FAILURE")
}

func anchorsFromBuild() installAnchors {
	return installAnchors{
		SourceCommit: buildSourceCommit, RuntimeManifestSHA256: buildRuntimeManifestSHA256,
		NodeSHA256: buildNodeSHA256, InstallerVersion: buildInstallerVersion,
	}
}

func validateScriptResult(data []byte) (string, error) {
	if len(data) > 1024 || verifyUniqueJSON(data) != nil {
		return "", fmt.Errorf("invalid firewall response")
	}
	var value struct {
		Schema int    `json:"schema"`
		Status string `json:"status"`
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&value) != nil || value.Schema != 1 {
		return "", fmt.Errorf("invalid firewall response")
	}
	switch value.Status {
	case "ALLOWED", "ENABLED", "MISSING", "STALE":
		return value.Status, nil
	default:
		return "", fmt.Errorf("invalid firewall status")
	}
}

func decideRule(action string, exists, owned, exact bool) ruleDecision {
	if !exists {
		if action == "enable" {
			return ruleCreate
		}
		return ruleBlocked
	}
	if !owned {
		return ruleConflict
	}
	if exact {
		return ruleNoChange
	}
	if action == "enable" {
		return ruleUpdate
	}
	return ruleBlocked
}
