package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

var buildCommit = "unbuilt"
var runtimeHash = "unbuilt"

const product = "K⁺-SESSION"
const buildVersion = "launcher development build / Batch 2A"

type fileEntry struct {
	Path   string
	Bytes  int64
	Sha256 string
}
type manifest struct {
	Format               string
	ManifestSchema       int
	Platform             string
	SourceCommit         string
	Version              string
	Files                []fileEntry
	BusinessDataIncluded bool
}
type fault struct {
	Code    string
	Message string
}

func (f *fault) Error() string    { return f.Code }
func fail(code, msg string) error { return &fault{code, msg} }
func digest(b []byte) string      { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func hashFile(p string) (string, error) {
	f, e := os.Open(p)
	if e != nil {
		return "", e
	}
	defer f.Close()
	h := sha256.New()
	_, e = io.Copy(h, f)
	return hex.EncodeToString(h.Sum(nil)), e
}
func within(parent, child string) bool {
	r, e := filepath.Rel(parent, child)
	return e == nil && (r == "." || (!filepath.IsAbs(r) && r != ".." && !strings.HasPrefix(r, ".."+string(os.PathSeparator))))
}
func canonical(p string) (string, error) {
	a, e := filepath.Abs(p)
	if e != nil {
		return "", e
	}
	return filepath.EvalSymlinks(a)
}
func safeRel(p string) bool {
	if p == "" || strings.ContainsAny(p, "\\:\x00") || strings.HasPrefix(p, "/") {
		return false
	}
	for _, c := range strings.Split(p, "/") {
		if c == "" || c == "." || c == ".." || strings.ContainsAny(c, "<>\"|?*") || strings.TrimRight(c, ". ") != c {
			return false
		}
	}
	return true
}
func verifyRuntime(root string) (manifest, error) {
	var m manifest
	node := filepath.Join(root, "runtime", "node.exe")
	if _, e := os.Stat(node); e != nil {
		return m, fail("NODE_MISSING", "包内 node.exe 缺失，请重新取得完整 Runtime。")
	}
	if _, e := os.Stat(filepath.Join(root, "app", "server.js")); e != nil {
		return m, fail("RUNTIME_MISSING", "应用文件缺失，请重新取得完整 Runtime。")
	}
	mf := filepath.Join(root, "manifest", "runtime-manifest.json")
	b, e := os.ReadFile(mf)
	if e != nil {
		return m, fail("RUNTIME_MISSING", "Runtime 清单缺失。")
	}
	bad := func() (manifest, error) {
		return m, fail("RUNTIME_INVALID", "Runtime 校验失败，文件缺失、变更或路径异常；未启动后台。")
	}
	if digest(b) != runtimeHash || json.Unmarshal(b, &m) != nil || m.Format != "k-session-runtime" || m.ManifestSchema != 1 || m.Platform != "win32-x64" || m.BusinessDataIncluded {
		return bad()
	}
	expected := map[string]fileEntry{}
	for _, f := range m.Files {
		if !safeRel(f.Path) || len(f.Sha256) != 64 {
			return bad()
		}
		key := strings.ToLower(f.Path)
		if _, ok := expected[key]; ok {
			return bad()
		}
		expected[key] = f
	}
	expected["manifest/runtime-manifest.json"] = fileEntry{"manifest/runtime-manifest.json", int64(len(b)), digest(b)}
	// Hash list is build evidence, manifest is the pinned authority. It must exist but cannot self-hash.
	if s, e := os.Stat(filepath.Join(root, "hashes", "SHA256SUMS.txt")); e != nil || s.Size() == 0 {
		return bad()
	}
	for _, dir := range []string{"app", "runtime", "licenses", "manifest", "hashes"} {
		e = filepath.WalkDir(filepath.Join(root, dir), func(p string, d os.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.Type()&os.ModeSymlink != 0 {
				return fmt.Errorf("link")
			}
			real, err := canonical(p)
			if err != nil || !strings.EqualFold(real, p) {
				return fmt.Errorf("reparse")
			}
			if d.IsDir() {
				return nil
			}
			if !d.Type().IsRegular() {
				return fmt.Errorf("special")
			}
			rel, _ := filepath.Rel(root, p)
			rel = filepath.ToSlash(rel)
			if rel == "hashes/SHA256SUMS.txt" {
				return nil
			}
			f, ok := expected[strings.ToLower(rel)]
			s, err := d.Info()
			if err != nil {
				return err
			}
			h, err := hashFile(p)
			if !ok || err != nil || f.Path != rel || s.Size() != f.Bytes || h != f.Sha256 {
				return fmt.Errorf("hash")
			}
			delete(expected, strings.ToLower(rel))
			return nil
		})
		if e != nil {
			return bad()
		}
	}
	if len(expected) != 0 {
		return bad()
	}
	return m, nil
}
func instancePath(root, requested string) (string, error) {
	if requested == "" {
		requested = root + "-instance"
	}
	abs, e := filepath.Abs(requested)
	if e != nil {
		return "", e
	}
	if within(root, abs) || within(abs, root) {
		return "", fail("INSTANCE_INVALID", "实例数据必须放在程序包外的独立目录。")
	}
	if e = os.MkdirAll(abs, 0700); e != nil {
		return "", fail("INSTANCE_UNWRITABLE", "实例目录不可写，请选择有写入权限的独立目录。")
	}
	real, e := canonical(abs)
	if e != nil || !strings.EqualFold(real, abs) {
		return "", fail("INSTANCE_INVALID", "实例路径含链接或重解析点，请使用真实目录。")
	}
	for _, child := range []string{".launcher.lock", "launcher.log", "temp"} {
		p := filepath.Join(real, child)
		if _, err := os.Lstat(p); err == nil {
			resolved, err := canonical(p)
			if err != nil || !strings.EqualFold(resolved, p) {
				return "", fail("INSTANCE_INVALID", "实例控制路径包含链接；未写入或启动。")
			}
		}
	}
	f, e := os.CreateTemp(real, ".write-check-")
	if e != nil {
		return "", fail("INSTANCE_UNWRITABLE", "实例目录不可写，请检查磁盘空间和目录权限。")
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return real, nil
}
func childEnvironment(instance, app string, port int) []string {
	sys := os.Getenv("SystemRoot")
	temp := filepath.Join(instance, "temp")
	env := map[string]string{"SystemRoot": sys, "WINDIR": sys, "PATH": filepath.Join(sys, "System32"), "TEMP": temp, "TMP": temp,
		"USERPROFILE": temp, "APPDATA": temp, "LOCALAPPDATA": temp, "HOME": temp,
		"PORT": fmt.Sprint(port), "KSESSION_HOST": "127.0.0.1",
		"KSESSION_DATA_FILE": filepath.Join(instance, "data.json"), "KSESSION_CONFIG_FILE": filepath.Join(instance, "config.json"),
		"KSESSION_ATTACHMENTS_DIR": filepath.Join(instance, "attachments"), "KSESSION_BACKUPS_DIR": filepath.Join(instance, "backups"),
		"KSESSION_MAIL_CONFIG_FILE": filepath.Join(instance, "mail-reminder.config.json"), "KSESSION_MAIL_LOG_FILE": filepath.Join(instance, "logs", "mail.log"),
		"KSESSION_SMTP_SECRET_FILE": filepath.Join(instance, "runtime", "secrets", "smtp-pass.dpapi"),
		"KSESSION_OCR_PYTHON":       filepath.Join(instance, "absent-python.exe"), "KSESSION_OCR_SCRIPT": filepath.Join(app, "tools", "ocr", "ocr_invoice.py"),
		"KSESSION_MAIL_ENABLED": "0", "KSESSION_MAIL_FORMAL_ENABLED": "0", "KSESSION_MAIL_DRY_RUN": "1", "KSESSION_SKIP_STARTUP_JOBS": "1"}
	keys := make([]string, 0, len(env))
	for k := range env {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	result := []string{}
	for _, k := range keys {
		result = append(result, k+"="+env[k])
	}
	return result
}
func pageHealthy(port int, want string) bool {
	client := &http.Client{Timeout: 700 * time.Millisecond, Transport: &http.Transport{Proxy: nil, DisableKeepAlives: true}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, e := client.Get(fmt.Sprintf("http://127.0.0.1:%d/login.html", port))
	if e != nil {
		return false
	}
	defer res.Body.Close()
	b, e := io.ReadAll(io.LimitReader(res.Body, 2*1024*1024))
	return e == nil && res.StatusCode == 200 && digest(b) == want
}
