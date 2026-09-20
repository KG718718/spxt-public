//go:build windows

package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInstallDataSafety(t *testing.T) {
	base := t.TempDir()
	install := filepath.Join(base, "installed")
	data := filepath.Join(base, "业务 数据")
	for _, bad := range []string{`relative\data`, `C:\`, `\\server\share\data`, install, filepath.Join(install, "data"), base, os.Getenv("SystemRoot")} {
		if checkInstallInstance(install, bad, false) == 0 {
			t.Fatalf("unsafe path accepted: %q", bad)
		}
	}
	if checkInstallInstance(install, data, false) != 0 {
		t.Fatal("new local path rejected")
	}
	if _, e := os.Stat(data); !os.IsNotExist(e) {
		t.Fatal("check created data directory")
	}
	if checkInstallInstance(install, data, true) != 0 {
		t.Fatal("prepare failed")
	}
	if checkInstallInstance(install, data, false) != 0 {
		t.Fatal("owned uninitialized instance rejected")
	}
	unknown := filepath.Join(base, "unknown")
	os.Mkdir(unknown, 0700)
	os.WriteFile(filepath.Join(unknown, "keep.txt"), []byte("owned sentinel"), 0600)
	if checkInstallInstance(install, unknown, true) != 14 {
		t.Fatal("unknown nonempty accepted")
	}
	if _, e := os.Stat(filepath.Join(unknown, instanceMarker)); !os.IsNotExist(e) {
		t.Fatal("unknown directory changed")
	}
	os.WriteFile(filepath.Join(data, "config.json"), []byte(`{}`), 0600)
	if checkInstallInstance(install, data, false) != 14 {
		t.Fatal("orphaned configuration accepted")
	}
	valid := filepath.Join(base, "existing")
	os.Mkdir(valid, 0700)
	os.WriteFile(filepath.Join(valid, "data.json"), []byte(`{"users":[],"applications":[],"payments":[]}`), 0600)
	if checkInstallInstance(install, valid, false) != 0 {
		t.Fatal("existing instance rejected")
	}
	os.WriteFile(filepath.Join(valid, "data.json"), []byte(`{"users":null,"applications":[],"payments":[]}`), 0600)
	if checkInstallInstance(install, valid, false) != 14 {
		t.Fatal("invalid data accepted")
	}
}
