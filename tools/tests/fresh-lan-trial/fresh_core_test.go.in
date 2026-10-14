//go:build fresh_trial_tests

package main

import (
	"strings"
	"testing"
)

func TestFreshLogonPlanIsCurrentUserInstalledOnly(t *testing.T) {
	before := freshTrial
	freshTrial = "1"
	defer func() { freshTrial = before }()
	exe, instance := `C:\Users\Synthetic\Programs\K-SESSION\program\K-SESSION.exe`, `D:\Synthetic Data\instance`
	command, err := logonCommand(exe, instance, true, true)
	if err != nil || command != `"`+exe+`" --logon --instance "`+instance+`"` {
		t.Fatalf("invalid command: %q %v", command, err)
	}
	for _, flags := range [][2]bool{{false, true}, {true, false}, {false, false}} {
		if _, err := logonCommand(exe, instance, flags[0], flags[1]); err == nil {
			t.Fatal("unverified installation accepted")
		}
	}
	for _, bad := range []string{"", `relative\instance`, `\\host\share`, `C:\safe\..\other`, `C:\safe\x" --stop`, `C:\safe\trailing `, `C:\safe\nul`, `C:\safe\file:stream`, "C:\\safe\\line\n", `C:\safe\`, `C:\safe\\instance`} {
		if _, err := logonCommand(exe, bad, true, true); err == nil {
			t.Fatalf("unsafe instance %q", bad)
		}
		if _, err := logonCommand(bad, instance, true, true); err == nil {
			t.Fatalf("unsafe executable %q", bad)
		}
	}
	if _, err := logonCommand(strings.ReplaceAll(exe, `\program\`, `\other\`), instance, true, true); err == nil {
		t.Fatal("unknown launcher location accepted")
	}
	freshTrial = ""
	if _, err := logonCommand(exe, instance, true, true); err == nil {
		t.Fatal("standard build accepted logon entry")
	}
}
