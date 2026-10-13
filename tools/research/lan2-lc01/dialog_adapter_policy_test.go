package main

import (
	"encoding/json"
	"testing"
)

func lcR2BaseDiagnostic() lcDialogDiagnostic {
	d := lcNewDialogDiagnostic("stageEnumChildren", "classificationUnknown", true)
	for _, fact := range []string{"dialogPresent", "dialogHandlePresent", "threadQueryOK", "ownerPIDMatch", "creationMatch", "imageMatch", "liveMatch", "dialogClassMatch", "titleMatch", "dialogAlreadyConfirmed"} {
		lcSetDialogFact(d, fact, true, true)
	}
	return d
}

func lcR2Controls() []lcControlSnapshot {
	return []lcControlSnapshot{
		{Window: 13, PID: 71, ThreadOK: true, ClassOK: true, Class: "Button", StyleOK: true, Style: lcButtonStyleDefault, ID: 1, Parent: 10, Visible: true, Enabled: true},
		{Window: 11, PID: 71, ThreadOK: true, ClassOK: true, Class: "Static", StyleOK: true, Style: lcBodyStyleGroupNoPref, ID: -1, Parent: 10, Visible: true, Enabled: true, TextOK: true, Text: lcBusyText},
		{Window: 12, PID: 71, ThreadOK: true, ClassOK: true, Class: "Static", StyleOK: true, Style: lcIconStylePlain, ID: 20, Parent: 10, Visible: true, Enabled: true, IconGetOK: true, IconImageOK: true, IconGet: 91, IconImage: 91},
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
		{"body-id", "BODY_ID_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[1].ID = 0 }},
		{"body-text-api", "BODY_TEXT_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[1].TextOK = false }},
		{"body-text", "BODY_TEXT_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[1].Text += "x" }},
		{"icon-id", "ICON_ID_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].ID = 21 }},
		{"icon-get-api", "ICON_QUERY_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[2].IconGetOK = false }},
		{"icon-image-api", "ICON_QUERY_API_UNPROVEN", func(v *[]lcControlSnapshot) { (*v)[2].IconImageOK = false }},
		{"icon-zero", "ICON_SEMANTIC_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].IconGet, (*v)[2].IconImage = 0, 0 }},
		{"icon-disagree", "ICON_SEMANTIC_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].IconImage++ }},
		{"button-id", "BUTTON_ID_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[0].ID = 2 }},
		{"owner", "CONTROL_OWNER_MISMATCH", func(v *[]lcControlSnapshot) { (*v)[2].PID++ }},
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
