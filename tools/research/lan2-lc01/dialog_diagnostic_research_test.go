//go:build lc01dialogresearch

// Research-only synthetic checks. This file is excluded from the normal suite
// and from the Windows test overlay unless lc01dialogresearch is set explicitly.
package main

import (
	"encoding/json"
	"testing"
	"time"
)

type r1Control struct {
	class, text       string
	handle            uintptr
	id                int
	ownerOK, parentOK bool
	visible, enabled  bool
}

func r1FoldControls(controls []r1Control) lcDialog {
	d := lcFixture()
	d.Text, d.ButtonClass = "", ""
	d.Button, d.ButtonID, d.TextCount, d.ButtonCount = 0, 0, 0, 0
	d.ParentOK, d.ButtonOwnerOK, d.Enabled = false, false, false
	for _, control := range controls {
		if control.class == "Static" && control.text != "" {
			d.TextCount++
			d.Text = control.text
		}
		if control.class == "Button" {
			d.ButtonCount++
			d.Button = control.handle
			d.ButtonClass = control.class
			d.ButtonID = control.id
			d.ButtonOwnerOK = control.ownerOK
			d.ParentOK = control.parentOK
			d.Visible = d.Visible && control.visible
			d.Enabled = control.enabled
		}
	}
	return d
}

func r1Body() r1Control {
	return r1Control{class: "Static", text: lcBusyText, visible: true, enabled: true}
}

func r1Button() r1Control {
	return r1Control{class: "Button", handle: 11, id: 1, ownerOK: true, parentOK: true, visible: true, enabled: true}
}

func TestR1EveryExactBusyFieldFailsClosed(t *testing.T) {
	mutations := []struct {
		name string
		fn   func(*lcDialog)
	}{
		{"pid-zero", func(d *lcDialog) { d.PID = 0 }},
		{"pid-mismatch", func(d *lcDialog) { d.ExpectedPID++ }},
		{"creation-zero", func(d *lcDialog) { d.Creation = 0 }},
		{"creation-mismatch", func(d *lcDialog) { d.ExpectedCreation++ }},
		{"window", func(d *lcDialog) { d.Window = 0 }},
		{"button", func(d *lcDialog) { d.Button = 0 }},
		{"thread", func(d *lcDialog) { d.ThreadOK = false }},
		{"class-query", func(d *lcDialog) { d.ClassOK = false }},
		{"image", func(d *lcDialog) { d.ImageOK = false }},
		{"live", func(d *lcDialog) { d.Live = false }},
		{"parent", func(d *lcDialog) { d.ParentOK = false }},
		{"button-owner", func(d *lcDialog) { d.ButtonOwnerOK = false }},
		{"visible", func(d *lcDialog) { d.Visible = false }},
		{"enabled", func(d *lcDialog) { d.Enabled = false }},
		{"class", func(d *lcDialog) { d.Class += "x" }},
		{"title", func(d *lcDialog) { d.Title += "x" }},
		{"text", func(d *lcDialog) { d.Text += "x" }},
		{"button-class", func(d *lcDialog) { d.ButtonClass += "x" }},
		{"button-id", func(d *lcDialog) { d.ButtonID++ }},
		{"text-count", func(d *lcDialog) { d.TextCount++ }},
		{"button-count", func(d *lcDialog) { d.ButtonCount++ }},
	}
	if !lcExactBusy(lcFixture()) {
		t.Fatal("exact fixture rejected")
	}
	for _, mutation := range mutations {
		t.Run(mutation.name, func(t *testing.T) {
			d := lcFixture()
			mutation.fn(&d)
			if lcExactBusy(d) {
				t.Fatal("changed exact field accepted")
			}
		})
	}
}

func TestR1MessageBoxControlShapesAreOrderIndependentOnlyWhenIconTextIsEmpty(t *testing.T) {
	emptyIcon := r1Control{class: "Static"}
	nonemptyIcon := r1Control{class: "Static", text: "synthetic-icon-buffer"}
	for _, controls := range [][]r1Control{
		{emptyIcon, r1Body(), r1Button()},
		{r1Body(), emptyIcon, r1Button()},
		{r1Button(), emptyIcon, r1Body()},
	} {
		if !lcExactBusy(r1FoldControls(controls)) {
			t.Fatal("empty icon static changed exact recognition")
		}
	}
	for _, controls := range [][]r1Control{
		{nonemptyIcon, r1Body(), r1Button()},
		{r1Body(), nonemptyIcon, r1Button()},
		{r1Button(), nonemptyIcon, r1Body()},
	} {
		d := r1FoldControls(controls)
		if d.TextCount != 2 || lcExactBusy(d) {
			t.Fatal("second nonempty static was not rejected")
		}
	}
}

func TestR1AdditionalControlsFailClosed(t *testing.T) {
	base := []r1Control{r1Body(), r1Button()}
	if !lcExactBusy(r1FoldControls(append(base, r1Control{class: "Static"}))) {
		t.Fatal("empty static should not be counted by the current adapter model")
	}
	cases := []struct {
		name     string
		controls []r1Control
	}{
		{"extra-text-static", append(base, r1Control{class: "Static", text: "synthetic-extra"})},
		{"duplicate-button", append(base, r1Button())},
		{"wrong-button-id", []r1Control{r1Body(), func() r1Control { c := r1Button(); c.id = 2; return c }()}},
		{"wrong-button-parent", []r1Control{r1Body(), func() r1Control { c := r1Button(); c.parentOK = false; return c }()}},
		{"wrong-button-owner", []r1Control{r1Body(), func() r1Control { c := r1Button(); c.ownerOK = false; return c }()}},
		{"hidden-button", []r1Control{r1Body(), func() r1Control { c := r1Button(); c.visible = false; return c }()}},
		{"disabled-button", []r1Control{r1Body(), func() r1Control { c := r1Button(); c.enabled = false; return c }()}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if lcExactBusy(r1FoldControls(tc.controls)) {
				t.Fatal("unsafe control shape accepted")
			}
		})
	}
}

func r1SameForConfirm(original, now lcDialog) bool {
	return now == original && lcExactBusy(now)
}

func TestR1ImmediateRecheckRejectsEveryIdentityOrControlChange(t *testing.T) {
	original := lcFixture()
	mutations := []struct {
		name string
		fn   func(*lcDialog)
	}{
		{"pid", func(d *lcDialog) { d.PID++ }},
		{"creation", func(d *lcDialog) { d.Creation++ }},
		{"window", func(d *lcDialog) { d.Window++ }},
		{"thread", func(d *lcDialog) { d.ThreadOK = false }},
		{"image", func(d *lcDialog) { d.ImageOK = false }},
		{"live", func(d *lcDialog) { d.Live = false }},
		{"title", func(d *lcDialog) { d.Title += "x" }},
		{"body", func(d *lcDialog) { d.Text += "x" }},
		{"text-count", func(d *lcDialog) { d.TextCount++ }},
		{"button", func(d *lcDialog) { d.Button++ }},
		{"button-id", func(d *lcDialog) { d.ButtonID++ }},
		{"button-count", func(d *lcDialog) { d.ButtonCount++ }},
		{"button-parent", func(d *lcDialog) { d.ParentOK = false }},
		{"button-owner", func(d *lcDialog) { d.ButtonOwnerOK = false }},
	}
	if !r1SameForConfirm(original, original) {
		t.Fatal("unchanged exact observation rejected")
	}
	for _, mutation := range mutations {
		t.Run(mutation.name, func(t *testing.T) {
			now := original
			mutation.fn(&now)
			if r1SameForConfirm(original, now) {
				t.Fatal("changed observation accepted")
			}
		})
	}
}

func r1SkipConfirmed(confirmed uintptr, d lcDialog) bool {
	return confirmed != 0 && d.Window == confirmed && lcExactBusy(d)
}

func TestR1ConfirmedWindowSkipIsExactAndHandleBound(t *testing.T) {
	d := lcFixture()
	if !r1SkipConfirmed(d.Window, d) {
		t.Fatal("exact confirmed window not skipped")
	}
	changed := d
	changed.TextCount++
	if r1SkipConfirmed(d.Window, changed) {
		t.Fatal("changed confirmed window skipped")
	}
	other := d
	other.Window++
	if r1SkipConfirmed(d.Window, other) {
		t.Fatal("different window skipped")
	}
}

func TestR1SecondExactObservationAfterConfirmationIsMismatch(t *testing.T) {
	f := &lcFake{dialogs: []lcDialog{lcFixture(), lcFixture()}}
	r := lcRun(f, 100*time.Millisecond)
	if r.Status != "FAIL" || r.Path != "DIALOG_MISMATCH" || !r.BusyClosed || !f.confirmed {
		t.Fatal("repeat recognition semantics changed")
	}
	confirmCount := 0
	for _, step := range f.trace {
		if step == "confirm" {
			confirmCount++
		}
	}
	if confirmCount != 1 {
		t.Fatal("repeated dialog confirmed more than once")
	}
}

type r1Diagnostic struct {
	Schema                 string `json:"schema"`
	Stage                  string `json:"stage"`
	Classification         string `json:"classification"`
	Reached                *bool  `json:"reached"`
	DialogPresent          *bool  `json:"dialogPresent"`
	DialogHandlePresent    *bool  `json:"dialogHandlePresent"`
	ThreadQueryOK          *bool  `json:"threadQueryOK"`
	OwnerPIDMatch          *bool  `json:"ownerPIDMatch"`
	CreationMatch          *bool  `json:"creationMatch"`
	ImageMatch             *bool  `json:"imageMatch"`
	LiveMatch              *bool  `json:"liveMatch"`
	ClassMatch             *bool  `json:"classMatch"`
	TitleMatch             *bool  `json:"titleMatch"`
	TextMatch              *bool  `json:"textMatch"`
	ButtonHandlePresent    *bool  `json:"buttonHandlePresent"`
	ButtonIDMatch          *bool  `json:"buttonIDMatch"`
	ButtonClassMatch       *bool  `json:"buttonClassMatch"`
	ButtonOwnerMatch       *bool  `json:"buttonOwnerMatch"`
	ButtonParentMatch      *bool  `json:"buttonParentMatch"`
	VisibleMatch           *bool  `json:"visibleMatch"`
	EnabledMatch           *bool  `json:"enabledMatch"`
	TextCountMatch         *bool  `json:"textCountMatch"`
	ButtonCountMatch       *bool  `json:"buttonCountMatch"`
	DialogAlreadyConfirmed *bool  `json:"dialogAlreadyConfirmed"`
}

var r1DiagnosticKeys = map[string]bool{
	"schema": true, "stage": true, "classification": true, "reached": true,
	"dialogPresent": true, "dialogHandlePresent": true, "threadQueryOK": true,
	"ownerPIDMatch": true, "creationMatch": true, "imageMatch": true, "liveMatch": true,
	"classMatch": true, "titleMatch": true, "textMatch": true, "buttonHandlePresent": true,
	"buttonIDMatch": true, "buttonClassMatch": true, "buttonOwnerMatch": true,
	"buttonParentMatch": true, "visibleMatch": true, "enabledMatch": true,
	"textCountMatch": true, "buttonCountMatch": true, "dialogAlreadyConfirmed": true,
}

func (row r1Diagnostic) r1Proofs() []*bool {
	return []*bool{row.DialogPresent, row.DialogHandlePresent, row.ThreadQueryOK, row.OwnerPIDMatch,
		row.CreationMatch, row.ImageMatch, row.LiveMatch, row.ClassMatch, row.TitleMatch,
		row.TextMatch, row.ButtonHandlePresent, row.ButtonIDMatch, row.ButtonClassMatch,
		row.ButtonOwnerMatch, row.ButtonParentMatch, row.VisibleMatch, row.EnabledMatch,
		row.TextCountMatch, row.ButtonCountMatch}
}

func r1ValidateDiagnostic(raw []byte) string {
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil {
		return "UNKNOWN"
	}
	if len(fields) != len(r1DiagnosticKeys) {
		return "UNKNOWN"
	}
	for key := range fields {
		if !r1DiagnosticKeys[key] {
			return "UNKNOWN"
		}
	}
	var row r1Diagnostic
	if json.Unmarshal(raw, &row) != nil || row.Schema != "LC01-DIALOG-R1" {
		return "UNKNOWN"
	}
	validStage := map[string]bool{"ENUM_TOPLEVEL": true, "READ_DIALOG": true, "ENUM_CHILDREN": true, "RECHECK": true, "POST_IDOK": true, "WAIT_EXIT": true}
	validClass := map[string]bool{"MATCH": true, "MISMATCH": true, "UNKNOWN": true, "NOT_REACHED": true}
	if !validStage[row.Stage] || !validClass[row.Classification] || row.Reached == nil {
		return "UNKNOWN"
	}
	if !*row.Reached {
		if row.Classification != "NOT_REACHED" || row.DialogAlreadyConfirmed != nil {
			return "UNKNOWN"
		}
		for _, proof := range row.r1Proofs() {
			if proof != nil {
				return "UNKNOWN"
			}
		}
		return "NOT_REACHED"
	}
	if row.Classification == "NOT_REACHED" || row.DialogAlreadyConfirmed == nil {
		return "UNKNOWN"
	}
	allObserved, allTrue := true, true
	for _, proof := range row.r1Proofs() {
		if proof == nil {
			allObserved = false
			continue
		}
		allTrue = allTrue && *proof
	}
	if !allObserved {
		if row.Classification == "UNKNOWN" {
			return "UNKNOWN"
		}
		return "UNKNOWN"
	}
	if allTrue && row.Classification == "MATCH" {
		return "MATCH"
	}
	if !allTrue && row.Classification == "MISMATCH" {
		return "MISMATCH"
	}
	return "UNKNOWN"
}

func TestR1DiagnosticSchemaFailsClosed(t *testing.T) {
	truth, falsity := true, false
	valid := r1Diagnostic{Schema: "LC01-DIALOG-R1", Stage: "ENUM_CHILDREN", Classification: "MISMATCH", Reached: &truth,
		DialogPresent: &truth, DialogHandlePresent: &truth, ThreadQueryOK: &truth, OwnerPIDMatch: &truth,
		CreationMatch: &truth, ImageMatch: &truth, LiveMatch: &truth, ClassMatch: &truth, TitleMatch: &truth,
		TextMatch: &truth, ButtonHandlePresent: &truth, ButtonIDMatch: &truth, ButtonClassMatch: &truth,
		ButtonOwnerMatch: &truth, ButtonParentMatch: &truth, VisibleMatch: &truth, EnabledMatch: &truth,
		TextCountMatch: &falsity, ButtonCountMatch: &truth, DialogAlreadyConfirmed: &falsity}
	raw, err := json.Marshal(valid)
	if err != nil || r1ValidateDiagnostic(raw) != "MISMATCH" {
		t.Fatal("valid fixed diagnostic rejected")
	}
	match := valid
	match.Classification = "MATCH"
	match.TextCountMatch = &truth
	matchRaw, _ := json.Marshal(match)
	if r1ValidateDiagnostic(matchRaw) != "MATCH" {
		t.Fatal("complete match rejected")
	}
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil {
		t.Fatal("test fixture decode")
	}
	delete(fields, "textMatch")
	missing, _ := json.Marshal(fields)
	if r1ValidateDiagnostic(missing) != "UNKNOWN" {
		t.Fatal("missing observation inferred")
	}
	fields["textMatch"] = json.RawMessage("true")
	fields["rawText"] = json.RawMessage(`"forbidden"`)
	unknown, _ := json.Marshal(fields)
	if r1ValidateDiagnostic(unknown) != "UNKNOWN" {
		t.Fatal("unknown diagnostic field accepted")
	}
	delete(fields, "rawText")
	fields["textMatch"] = json.RawMessage(`"true"`)
	wrongType, _ := json.Marshal(fields)
	if r1ValidateDiagnostic(wrongType) != "UNKNOWN" {
		t.Fatal("wrong diagnostic field type accepted")
	}
	fields = map[string]json.RawMessage{}
	if json.Unmarshal(raw, &fields) != nil {
		t.Fatal("test fixture decode")
	}
	fields["classification"] = json.RawMessage(`"MATCH"`)
	contradictory, _ := json.Marshal(fields)
	if r1ValidateDiagnostic(contradictory) != "UNKNOWN" {
		t.Fatal("contradictory match accepted")
	}
	fields["classification"] = json.RawMessage(`"MISMATCH"`)
	fields["textCountMatch"] = json.RawMessage("true")
	contradictory, _ = json.Marshal(fields)
	if r1ValidateDiagnostic(contradictory) != "UNKNOWN" {
		t.Fatal("contradictory mismatch accepted")
	}
	fields["classification"] = json.RawMessage(`"UNKNOWN"`)
	fields["textCountMatch"] = json.RawMessage("null")
	partial, _ := json.Marshal(fields)
	if r1ValidateDiagnostic(partial) != "UNKNOWN" {
		t.Fatal("partial observation did not remain unknown")
	}
	notReached := r1Diagnostic{Schema: "LC01-DIALOG-R1", Stage: "POST_IDOK", Classification: "NOT_REACHED", Reached: &falsity}
	notReachedRaw, _ := json.Marshal(notReached)
	if r1ValidateDiagnostic(notReachedRaw) != "NOT_REACHED" {
		t.Fatal("not-reached semantics lost")
	}
	notReached.TitleMatch = &truth
	notReachedRaw, _ = json.Marshal(notReached)
	if r1ValidateDiagnostic(notReachedRaw) != "UNKNOWN" {
		t.Fatal("not-reached record carried inferred observation")
	}
}
