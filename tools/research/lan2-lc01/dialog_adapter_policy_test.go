package main

import (
	"encoding/json"
	"testing"
)

func lcR2BaseDiagnostic() lcDialogDiagnostic {
	d := lcNewDialogDiagnostic("stageEnumChildren", "classificationUnknown", true)
	for _, fact := range []string{"dialogPresent", "dialogHandlePresent", "threadQueryOK", "ownerPIDMatch", "creationMatch", "imageMatch", "liveMatch", "dialogClassMatch", "dialogCountMatch", "structureMatch", "titleMatch", "dialogAlreadyConfirmed"} {
		lcSetDialogFact(d, fact, true, true)
	}
	return d
}

func lcR2Controls() []lcControlSnapshot {
	return []lcControlSnapshot{
		{Window: 13, WindowOK: true, PID: 71, ThreadOK: true, ClassOK: true, Class: "Button", StyleOK: true, Style: lcButtonStyleDefault, ID: 1, IDOK: true, Parent: 10, ParentOK: true, Visible: true, Enabled: true},
		{Window: 11, WindowOK: true, PID: 71, ThreadOK: true, ClassOK: true, Class: "Static", StyleOK: true, Style: lcBodyStyleGroupNoPref, ID: -1, IDOK: true, Parent: 10, ParentOK: true, Visible: true, Enabled: true, TextOK: true, Text: lcBusyText},
		{Window: 12, WindowOK: true, PID: 71, ThreadOK: true, ClassOK: true, Class: "Static", StyleOK: true, Style: lcIconStylePlain, ID: 20, IDOK: true, Parent: 10, ParentOK: true, Visible: true, Enabled: true, IconGetOK: true, IconImageOK: true, IconGet: 91, IconImage: 91},
	}
}

func TestR2ExactControlSetAllowsOnlyFrozenStylesAndSemanticIcon(t *testing.T) {
	bodyStyles := []uint32{lcBodyStylePlain, lcBodyStyleGroup, lcBodyStyleNoPrefix, lcBodyStyleGroupNoPref}
	buttonStyles := []uint32{lcButtonStylePush, lcButtonStyleDefault, lcButtonStyleGroupPush, lcButtonStyleGroupDef}
	iconStyles := []uint32{lcIconStylePlain, lcIconStyleGroup}
	for _, bodyStyle := range bodyStyles {
		for _, iconStyle := range iconStyles {
			for _, buttonStyle := range buttonStyles {
				controls := lcR2Controls()
				controls[1].Style, controls[2].Style, controls[0].Style = bodyStyle, iconStyle, buttonStyle
				d, diagnostic, reason := lcClassifyDialogControls(lcFixture(), controls, lcR2BaseDiagnostic())
				if !lcExactBusy(d) || reason != "DIALOG_MATCH" || !diagnostic["classificationMatch"] || !lcDialogDiagnosticValid(diagnostic) {
					t.Fatal("frozen style combination rejected")
				}
			}
		}
	}
}

func TestR2IconWMGetTextDoesNotEnterBodyCount(t *testing.T) {
	controls := lcR2Controls()
	controls[2].TextOK, controls[2].Text = true, "synthetic-nonempty-icon-buffer"
	d, diagnostic, reason := lcClassifyDialogControls(lcFixture(), controls, lcR2BaseDiagnostic())
	if !lcExactBusy(d) || d.TextCount != 1 || d.IconCount != 1 || reason != "DIALOG_MATCH" || !diagnostic["classificationMatch"] {
		t.Fatal("proven icon entered body count")
	}
}

func TestR2ControlCounterexamplesFailClosed(t *testing.T) {
	cases := []struct {
		name, reason string
		mutate       func(*[]lcControlSnapshot)
	}{
		{"unknown-class", "UNKNOWN_CONTROL_CLASS", func(v *[]lcControlSnapshot) { (*v)[1].Class = "Synthetic" }},
		{"unknown-static-style", "UNKNOWN_STATIC_STYLE", func(v *[]lcControlSnapshot) { (*v)[1].Style |= 0x40 }},
		{"unknown-button-style", "UNKNOWN_BUTTON_STYLE", func(v *[]lcControlSnapshot) { (*v)[0].Style |= 0x40 }},
		{"class-api", "CONTROL_CLASS_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].ClassOK = false }},
		{"style-api", "CONTROL_STYLE_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].StyleOK = false }},
		{"owner-api", "CONTROL_OWNER_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].ThreadOK = false }},
		{"window-invalid", "CONTROL_WINDOW_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].WindowOK = false }},
		{"body-id-api", "BODY_ID_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].ID, (*v)[1].IDOK = 0, false }},
		{"body-id", "BODY_ID_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[1].ID = 2 }},
		{"body-text-api", "BODY_TEXT_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].TextOK = false }},
		{"body-text", "BODY_TEXT_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[1].Text += "x" }},
		{"icon-id-api", "ICON_ID_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[2].ID, (*v)[2].IDOK = 0, false }},
		{"icon-id", "ICON_ID_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].ID = 21 }},
		{"icon-get-api", "ICON_QUERY_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[2].IconGetOK = false }},
		{"icon-image-api", "ICON_QUERY_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[2].IconImageOK = false }},
		{"icon-zero", "ICON_SEMANTIC_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].IconGet, (*v)[2].IconImage = 0, 0 }},
		{"icon-disagree", "ICON_SEMANTIC_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].IconImage++ }},
		{"button-id-api", "BUTTON_ID_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[0].ID, (*v)[0].IDOK = 0, false }},
		{"button-id", "BUTTON_ID_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[0].ID = 2 }},
		{"owner", "CONTROL_OWNER_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].PID++ }},
		{"parent-api", "CONTROL_PARENT_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[2].Parent, (*v)[2].ParentOK = 0, false }},
		{"parent", "CONTROL_PARENT_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].Parent++ }},
		{"hidden", "CONTROL_VISIBLE_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].Visible = false }},
		{"disabled", "CONTROL_ENABLED_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[0].Enabled = false }},
		{"missing-body", "BODY_COUNT_MISMATCH", func(v *[]lcControlSnapshot) { *v = append((*v)[:1], (*v)[2:]...) }},
		{"missing-icon", "ICON_COUNT_MISMATCH", func(v *[]lcControlSnapshot) { *v = (*v)[:2] }},
		{"missing-button", "BUTTON_COUNT_MISMATCH", func(v *[]lcControlSnapshot) { *v = (*v)[1:] }},
		{"duplicate-body", "BODY_COUNT_MISMATCH", func(v *[]lcControlSnapshot) { c := (*v)[1]; c.Window = 14; *v = append(*v, c) }},
		{"duplicate-icon", "ICON_COUNT_MISMATCH", func(v *[]lcControlSnapshot) { c := (*v)[2]; c.Window = 14; *v = append(*v, c) }},
		{"duplicate-button", "BUTTON_COUNT_MISMATCH", func(v *[]lcControlSnapshot) { c := (*v)[0]; c.Window = 14; *v = append(*v, c) }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			controls := lcR2Controls()
			tc.mutate(&controls)
			d, diagnostic, reason := lcClassifyDialogControls(lcFixture(), controls, lcR2BaseDiagnostic())
			valid := lcDialogDiagnosticValid(diagnostic)
			if lcExactBusy(d) || reason != tc.reason || diagnostic["classificationMatch"] || !valid {
				t.Fatalf("counterexample classification changed: reason=%s exact=%t match=%t valid=%t", reason, lcExactBusy(d), diagnostic["classificationMatch"], valid)
			}
		})
	}
}

func TestR2PublicDiagnosticIsBooleanOnlyAndStrict(t *testing.T) {
	_, diagnostic, _ := lcClassifyDialogControls(lcFixture(), lcR2Controls(), lcR2BaseDiagnostic())
	raw, err := json.Marshal(diagnostic)
	if err != nil {
		t.Fatal("diagnostic marshal")
	}
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil || len(fields) != len(diagnostic) {
		t.Fatal("diagnostic keys")
	}
	for key, value := range fields {
		if string(value) != "true" && string(value) != "false" {
			t.Fatalf("nonboolean diagnostic value: %s", key)
		}
	}
	bad := diagnostic
	bad["rawText"] = true
	if lcDialogDiagnosticValid(bad) {
		t.Fatal("extra diagnostic key accepted")
	}
}

func TestR2EnumerationAndTopLevelSelectionStayWithinTarget(t *testing.T) {
	if !lcChildEnumerationComplete(false, 3, 0) {
		t.Fatal("documented unused child-enumeration return rejected")
	}
	for _, tc := range []struct {
		name                                      string
		pid                                       uint32
		pidOK, visible, classOK, selected, failed bool
		class, reason                             string
	}{
		{"unreadable-unrelated", 0, false, true, false, false, false, "", "IGNORED_UNSELECTED_WINDOW"},
		{"other-process", 72, true, true, false, false, false, "Synthetic", "IGNORED_UNSELECTED_WINDOW"},
		{"hidden-second-helper", 71, true, false, false, false, false, "Synthetic", "IGNORED_UNSELECTED_WINDOW"},
		{"selected-class-api", 71, true, true, false, false, true, "", "TOPLEVEL_CLASS_API_UNPROVEN"},
		{"selected-unknown-class", 71, true, true, true, false, true, "Synthetic", "UNEXPECTED_TOPLEVEL_CLASS"},
		{"selected-dialog", 71, true, true, true, true, false, "#32770", "DIALOG_CANDIDATE"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			selected, failed, reason := lcTopLevelCandidate(71, tc.pid, tc.pidOK, tc.visible, tc.classOK, tc.class)
			if selected != tc.selected || failed != tc.failed || reason != tc.reason {
				t.Fatal("top-level selection changed")
			}
		})
	}
	if lcChildEnumerationComplete(true, 3, 1) || lcChildEnumerationComplete(false, 0, 1) {
		t.Fatal("failed or empty child enumeration accepted")
	}
}

func TestR2RecheckUsesSortedCompleteInMemoryStructure(t *testing.T) {
	controls := lcR2Controls()
	original, _, _ := lcClassifyDialogControls(lcFixture(), controls, lcR2BaseDiagnostic())
	reversed := []lcControlSnapshot{controls[2], controls[1], controls[0]}
	reordered, _, _ := lcClassifyDialogControls(lcFixture(), reversed, lcR2BaseDiagnostic())
	if !lcSameDialog(original, reordered) {
		t.Fatal("unordered equivalent control set changed")
	}
	mutations := []struct {
		name string
		idx  int
		fn   func(*lcControlSnapshot)
	}{
		{"hwnd", 1, func(v *lcControlSnapshot) { v.Window++ }},
		{"window-valid", 1, func(v *lcControlSnapshot) { v.WindowOK = false }},
		{"pid", 1, func(v *lcControlSnapshot) { v.PID++ }},
		{"thread-api", 1, func(v *lcControlSnapshot) { v.ThreadOK = false }},
		{"class-api", 1, func(v *lcControlSnapshot) { v.ClassOK = false }},
		{"style-api", 1, func(v *lcControlSnapshot) { v.StyleOK = false }},
		{"class", 1, func(v *lcControlSnapshot) { v.Class += "x" }},
		{"style", 1, func(v *lcControlSnapshot) { v.Style++ }},
		{"id", 1, func(v *lcControlSnapshot) { v.ID++ }},
		{"id-api", 1, func(v *lcControlSnapshot) { v.IDOK = false }},
		{"parent", 1, func(v *lcControlSnapshot) { v.Parent++ }},
		{"parent-api", 1, func(v *lcControlSnapshot) { v.ParentOK = false }},
		{"visible", 1, func(v *lcControlSnapshot) { v.Visible = false }},
		{"enabled", 1, func(v *lcControlSnapshot) { v.Enabled = false }},
		{"text-api", 0, func(v *lcControlSnapshot) { v.TextOK = false }},
		{"text", 0, func(v *lcControlSnapshot) { v.Text += "x" }},
		{"icon-get-api", 1, func(v *lcControlSnapshot) { v.IconGetOK = false }},
		{"icon-image-api", 1, func(v *lcControlSnapshot) { v.IconImageOK = false }},
		{"icon-get", 1, func(v *lcControlSnapshot) { v.IconGet++ }},
		{"icon-image", 1, func(v *lcControlSnapshot) { v.IconImage++ }},
	}
	for _, mutation := range mutations {
		t.Run(mutation.name, func(t *testing.T) {
			changed := original
			changed.Controls = append([]lcControlSnapshot(nil), original.Controls...)
			mutation.fn(&changed.Controls[mutation.idx])
			lcSortControlSnapshots(changed.Controls)
			if lcSameDialog(original, changed) {
				t.Fatal("recheck ignored changed raw control field")
			}
		})
	}
	changed := original
	changed.Creation++
	if lcSameDialog(original, changed) {
		t.Fatal("recheck ignored process creation anchor")
	}
}
