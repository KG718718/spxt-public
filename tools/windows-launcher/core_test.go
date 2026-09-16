package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRelativePathSafety(t *testing.T) {
	for _, p := range []string{"../x", "a/../../x", "/x", "C:/x", "a\\b", "a//b", "a/./b", "a. /b", "x?y"} {
		if safeRel(p) {
			t.Errorf("accepted %q", p)
		}
	}
	for _, p := range []string{"app/server.js", "licenses/npm-packages/x/LICENSE"} {
		if !safeRel(p) {
			t.Error(p)
		}
	}
}
func TestEnvironmentAllowlist(t *testing.T) {
	t.Setenv("NODE_OPTIONS", "--require evil")
	t.Setenv("KSESSION_HOST", "0.0.0.0")
	t.Setenv("SMTP_PASSWORD", "private-sentinel")
	env := strings.Join(childEnvironment(t.TempDir(), "app", 8080), "\n")
	for _, bad := range []string{"evil", "private-sentinel", "0.0.0.0", "NODE_OPTIONS"} {
		if strings.Contains(env, bad) {
			t.Error("leaked " + bad)
		}
	}
	for _, want := range []string{"KSESSION_HOST=127.0.0.1", "KSESSION_MAIL_ENABLED=0", "KSESSION_MAIL_DRY_RUN=1"} {
		if !strings.Contains(env, want) {
			t.Error("missing " + want)
		}
	}
}
func TestInstanceOutsidePackage(t *testing.T) {
	root := filepath.Join(t.TempDir(), "package")
	os.Mkdir(root, 0700)
	for _, bad := range []string{root, filepath.Join(root, "instance"), filepath.Dir(root)} {
		if _, e := instancePath(root, bad); e == nil {
			t.Error("accepted overlap")
		}
	}
}
func TestRuntimeMissing(t *testing.T) {
	if _, e := verifyRuntime(t.TempDir()); e == nil {
		t.Error("missing runtime accepted")
	}
}
