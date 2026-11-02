package main

import (
	"fmt"
	"strings"
)

// Setup owns the current-user Startup shortcut. This planner never writes it.
// The installed launcher still validates Binding, manifest and exclusive lock.
func logonCommand(exe, instance string, installed, pathsVerified bool) (string, error) {
	if freshTrial != "1" || !installed || !pathsVerified || !safeLogonPath(exe) || !safeLogonPath(instance) || !strings.HasSuffix(strings.ToLower(exe), `\program\k-session.exe`) {
		return "", fmt.Errorf("LOGON_IDENTITY_REJECTED")
	}
	return fmt.Sprintf(`"%s" --logon --instance "%s"`, exe, instance), nil
}

func safeLogonPath(value string) bool {
	if len(value) < 4 || !((value[0] >= 'A' && value[0] <= 'Z') || (value[0] >= 'a' && value[0] <= 'z')) || value[1:3] != `:\` || len(value) > 240 {
		return false
	}
	for _, part := range strings.Split(value[3:], `\`) {
		if part == "" || part == "." || part == ".." || strings.TrimRight(part, ". ") != part || strings.ContainsAny(part, "<>:\"/|?*\x00\r\n") {
			return false
		}
		for _, r := range part {
			if r < 32 || r == 0x7f {
				return false
			}
		}
		base := strings.ToUpper(strings.SplitN(part, ".", 2)[0])
		if base == "CON" || base == "PRN" || base == "AUX" || base == "NUL" || (len(base) == 4 && (strings.HasPrefix(base, "COM") || strings.HasPrefix(base, "LPT")) && base[3] >= '1' && base[3] <= '9') {
			return false
		}
	}
	return true
}
