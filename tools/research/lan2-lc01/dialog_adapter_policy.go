// Research/test only. This pure policy is embedded into the LC01 Windows test
// overlay; it is not imported by the production Launcher.
package main

import "sort"

const (
	lcBodyStylePlain       uint32 = 0x50000000
	lcBodyStyleGroup       uint32 = 0x50020000
	lcBodyStyleNoPrefix    uint32 = 0x50000080
	lcBodyStyleGroupNoPref uint32 = 0x50020080
	lcIconStylePlain       uint32 = 0x50000003
	lcIconStyleGroup       uint32 = 0x50020003
	lcButtonStylePush      uint32 = 0x50010000
	lcButtonStyleDefault   uint32 = 0x50010001
	lcButtonStyleGroupPush uint32 = 0x50030000
	lcButtonStyleGroupDef  uint32 = 0x50030001
)

var lcDialogStages = []string{"stageEnumToplevel", "stageReadDialog", "stageEnumChildren", "stageRecheck", "stagePostIDOK", "stageWaitExit"}
var lcDialogClasses = []string{"classificationMatch", "classificationMismatch", "classificationUnknown", "classificationNotReached"}
var lcDialogFacts = []string{
	"dialogPresent", "dialogHandlePresent", "threadQueryOK", "ownerPIDMatch", "creationMatch", "imageMatch", "liveMatch",
	"dialogClassMatch", "titleMatch", "controlSetMatch", "bodyStyleMatch", "bodyIDMatch", "textMatch", "bodyCountMatch",
	"iconStyleMatch", "iconIDMatch", "iconSemanticMatch", "iconCountMatch", "buttonHandlePresent", "buttonIDMatch",
	"buttonClassMatch", "buttonStyleMatch", "buttonOwnerMatch", "buttonParentMatch", "visibleMatch", "enabledMatch",
	"buttonCountMatch", "dialogAlreadyConfirmed",
}

type lcDialogDiagnostic map[string]bool

func lcNewDialogDiagnostic(stage, classification string, reached bool) lcDialogDiagnostic {
	d := lcDialogDiagnostic{"schemaLC01DialogR2": true, "reached": reached}
	for _, key := range lcDialogStages {
		d[key] = key == stage
	}
	for _, key := range lcDialogClasses {
		d[key] = key == classification
	}
	for _, fact := range lcDialogFacts {
		d[fact+"Observed"] = false
		d[fact+"Match"] = false
	}
	return d
}

func lcNotReachedDialogDiagnostic(stage string) lcDialogDiagnostic {
	return lcNewDialogDiagnostic(stage, "classificationNotReached", false)
}

func lcSetDialogFact(d lcDialogDiagnostic, fact string, observed, match bool) bool {
	found := false
	for _, allowed := range lcDialogFacts {
		if allowed == fact {
			found = true
			break
		}
	}
	if !found || (match && !observed) {
		return false
	}
	d[fact+"Observed"] = observed
	d[fact+"Match"] = match
	return true
}

func lcMergeDialogFact(d lcDialogDiagnostic, fact string, observed, match bool) bool {
	if !observed {
		return lcSetDialogFact(d, fact, false, false)
	}
	keyObserved, keyMatch := fact+"Observed", fact+"Match"
	if d[keyObserved] {
		match = d[keyMatch] && match
	}
	return lcSetDialogFact(d, fact, true, match)
}

func lcFinishDialogDiagnostic(d lcDialogDiagnostic) lcDialogDiagnostic {
	for _, key := range lcDialogClasses {
		d[key] = false
	}
	if !d["reached"] {
		d["classificationNotReached"] = true
		return d
	}
	allObserved, allMatch := true, true
	for _, fact := range lcDialogFacts {
		if fact == "dialogAlreadyConfirmed" {
			continue
		}
		observed, match := d[fact+"Observed"], d[fact+"Match"]
		allObserved = allObserved && observed
		allMatch = allMatch && match
	}
	if !allObserved {
		d["classificationUnknown"] = true
	} else if allMatch {
		d["classificationMatch"] = true
	} else {
		d["classificationMismatch"] = true
	}
	return d
}

func lcDialogDiagnosticValid(d lcDialogDiagnostic) bool {
	wanted := lcNewDialogDiagnostic("stageEnumToplevel", "classificationUnknown", true)
	if len(d) != len(wanted) || !d["schemaLC01DialogR2"] {
		return false
	}
	for key := range d {
		if _, ok := wanted[key]; !ok {
			return false
		}
	}
	stageCount, classCount := 0, 0
	for _, key := range lcDialogStages {
		if d[key] {
			stageCount++
		}
	}
	for _, key := range lcDialogClasses {
		if d[key] {
			classCount++
		}
	}
	if stageCount != 1 || classCount != 1 {
		return false
	}
	allObserved, allMatch, anyObserved := true, true, false
	for _, fact := range lcDialogFacts {
		observed, match := d[fact+"Observed"], d[fact+"Match"]
		if match && !observed {
			return false
		}
		if fact != "dialogAlreadyConfirmed" {
			allObserved = allObserved && observed
			allMatch = allMatch && match
		}
		anyObserved = anyObserved || observed
	}
	if !d["reached"] {
		return d["classificationNotReached"] && !anyObserved
	}
	if !d["dialogAlreadyConfirmedObserved"] || d["classificationNotReached"] {
		return false
	}
	if !allObserved {
		return d["classificationUnknown"]
	}
	if allMatch {
		return d["classificationMatch"]
	}
	return d["classificationMismatch"]
}

func lcBodyStyle(style uint32) bool {
	switch style {
	case lcBodyStylePlain, lcBodyStyleGroup, lcBodyStyleNoPrefix, lcBodyStyleGroupNoPref:
		return true
	}
	return false
}

func lcIconStyle(style uint32) bool { return style == lcIconStylePlain || style == lcIconStyleGroup }

func lcButtonStyle(style uint32) bool {
	switch style {
	case lcButtonStylePush, lcButtonStyleDefault, lcButtonStyleGroupPush, lcButtonStyleGroupDef:
		return true
	}
	return false
}

func lcBodyID(id int) bool { return id == -1 || id == 65535 }

type lcControlSnapshot struct {
	Window                     uintptr
	PID                        uint32
	ThreadOK, ClassOK, StyleOK bool
	Class                      string
	Style                      uint32
	ID                         int
	Parent                     uintptr
	Visible, Enabled           bool
	TextOK                     bool
	Text                       string
	IconGetOK, IconImageOK     bool
	IconGet, IconImage         uintptr
}

func lcClassifyDialogControls(d lcDialog, controls []lcControlSnapshot, diagnostic lcDialogDiagnostic) (lcDialog, lcDialogDiagnostic, string) {
	d.Text, d.ButtonClass = "", ""
	d.Button, d.ButtonID, d.TextCount, d.IconCount, d.ButtonCount = 0, 0, 0, 0, 0
	d.BodyStyleOK, d.BodyIDOK, d.BodyTextOK, d.IconStyleOK, d.IconIDOK, d.IconSemanticOK, d.ButtonStyleOK = false, false, false, false, false, false, false
	d.ControlsKnown, d.ParentOK, d.ButtonOwnerOK, d.Enabled = true, true, true, true
	d.Controls = append([]lcControlSnapshot(nil), controls...)
	sort.Slice(d.Controls, func(i, j int) bool { return d.Controls[i].Window < d.Controls[j].Window })

	allClassObserved, allClassesKnown := true, true
	allStyleObserved, allStylesKnown := true, true
	allOwnerObserved, allOwnersMatch := true, true
	allParentsMatch, allVisible, allEnabled := true, true, true
	bodyIDs, bodyTexts, iconIDs, iconSemantics, buttonIDs, buttonStyles := true, true, true, true, true, true
	unknownClass, unknownStaticStyle, unknownButtonStyle := false, false, false
	bodyTextAPI, iconAPI := true, true
	for _, control := range d.Controls {
		allClassObserved = allClassObserved && control.ClassOK
		allOwnerObserved = allOwnerObserved && control.ThreadOK
		if control.ThreadOK {
			allOwnersMatch = allOwnersMatch && control.PID == d.PID
		}
		if !control.ClassOK {
			continue
		}
		allStyleObserved = allStyleObserved && control.StyleOK
		if !control.StyleOK {
			continue
		}
		allParentsMatch = allParentsMatch && control.Parent == d.Window
		allVisible = allVisible && control.Visible
		allEnabled = allEnabled && control.Enabled
		switch control.Class {
		case "Static":
			if lcBodyStyle(control.Style) {
				d.TextCount++
				d.BodyStyleOK = true
				bodyIDs = bodyIDs && lcBodyID(control.ID)
				bodyTextAPI = bodyTextAPI && control.TextOK
				bodyTexts = bodyTexts && control.TextOK && control.Text == lcBusyText
				if d.TextCount == 1 {
					d.Text = control.Text
				}
			} else if lcIconStyle(control.Style) {
				d.IconCount++
				d.IconStyleOK = true
				iconIDs = iconIDs && control.ID == 20
				iconAPI = iconAPI && control.IconGetOK && control.IconImageOK
				iconSemantics = iconSemantics && control.IconGetOK && control.IconImageOK && control.IconGet != 0 && control.IconGet == control.IconImage
			} else {
				unknownStaticStyle = true
				allStylesKnown = false
			}
		case "Button":
			d.ButtonCount++
			d.Button = control.Window
			d.ButtonClass = control.Class
			d.ButtonID = control.ID
			if !lcButtonStyle(control.Style) {
				unknownButtonStyle = true
				allStylesKnown = false
			}
			buttonStyles = buttonStyles && lcButtonStyle(control.Style)
			buttonIDs = buttonIDs && control.ID == 1
		default:
			unknownClass = true
			allClassesKnown = false
		}
	}

	d.BodyIDOK = d.TextCount > 0 && bodyIDs
	d.BodyTextOK = d.TextCount > 0 && bodyTextAPI
	d.IconIDOK = d.IconCount > 0 && iconIDs
	d.IconSemanticOK = d.IconCount > 0 && iconSemantics
	d.ButtonStyleOK = d.ButtonCount > 0 && buttonStyles
	d.ParentOK = len(d.Controls) > 0 && allParentsMatch
	d.ButtonOwnerOK = len(d.Controls) > 0 && allOwnerObserved && allOwnersMatch
	d.Visible = d.Visible && len(d.Controls) > 0 && allVisible
	d.Enabled = len(d.Controls) > 0 && allEnabled
	d.ControlsKnown = allClassObserved && allClassesKnown && allStyleObserved && allStylesKnown

	lcSetDialogFact(diagnostic, "controlSetMatch", allClassObserved && allStyleObserved, d.ControlsKnown)
	lcMergeDialogFact(diagnostic, "ownerPIDMatch", allOwnerObserved, allOwnersMatch)
	lcSetDialogFact(diagnostic, "bodyStyleMatch", d.TextCount > 0, d.BodyStyleOK)
	lcSetDialogFact(diagnostic, "bodyIDMatch", d.TextCount > 0, d.BodyIDOK)
	lcSetDialogFact(diagnostic, "textMatch", d.TextCount > 0 && bodyTextAPI, d.TextCount > 0 && bodyTexts)
	lcSetDialogFact(diagnostic, "bodyCountMatch", true, d.TextCount == 1)
	lcSetDialogFact(diagnostic, "iconStyleMatch", d.IconCount > 0, d.IconStyleOK)
	lcSetDialogFact(diagnostic, "iconIDMatch", d.IconCount > 0, d.IconIDOK)
	lcSetDialogFact(diagnostic, "iconSemanticMatch", d.IconCount > 0 && iconAPI, d.IconCount > 0 && iconSemantics)
	lcSetDialogFact(diagnostic, "iconCountMatch", true, d.IconCount == 1)
	lcSetDialogFact(diagnostic, "buttonHandlePresent", true, d.ButtonCount == 1 && d.Button != 0)
	lcSetDialogFact(diagnostic, "buttonIDMatch", d.ButtonCount > 0, d.ButtonCount > 0 && buttonIDs)
	lcSetDialogFact(diagnostic, "buttonClassMatch", d.ButtonCount > 0, d.ButtonCount > 0)
	lcSetDialogFact(diagnostic, "buttonStyleMatch", d.ButtonCount > 0, d.ButtonStyleOK)
	lcSetDialogFact(diagnostic, "buttonOwnerMatch", d.ButtonCount > 0 && allOwnerObserved, d.ButtonCount > 0 && allOwnersMatch)
	lcSetDialogFact(diagnostic, "buttonParentMatch", d.ButtonCount > 0, d.ButtonCount > 0 && allParentsMatch)
	lcSetDialogFact(diagnostic, "visibleMatch", len(d.Controls) > 0, d.Visible)
	lcSetDialogFact(diagnostic, "enabledMatch", len(d.Controls) > 0, d.Enabled)
	lcSetDialogFact(diagnostic, "buttonCountMatch", true, d.ButtonCount == 1)

	reason := "DIALOG_FIELDS_MISMATCH"
	switch {
	case !allClassObserved:
		reason = "CONTROL_CLASS_API_UNPROVEN"
	case !allStyleObserved:
		reason = "CONTROL_STYLE_API_UNPROVEN"
	case !allOwnerObserved:
		reason = "CONTROL_OWNER_API_UNPROVEN"
	case unknownClass:
		reason = "UNKNOWN_CONTROL_CLASS"
	case unknownStaticStyle:
		reason = "UNKNOWN_STATIC_STYLE"
	case unknownButtonStyle:
		reason = "UNKNOWN_BUTTON_STYLE"
	case d.TextCount != 1:
		reason = "BODY_COUNT_MISMATCH"
	case !d.BodyIDOK:
		reason = "BODY_ID_MISMATCH"
	case !bodyTextAPI:
		reason = "BODY_TEXT_API_UNPROVEN"
	case !bodyTexts:
		reason = "BODY_TEXT_MISMATCH"
	case d.IconCount != 1:
		reason = "ICON_COUNT_MISMATCH"
	case !d.IconIDOK:
		reason = "ICON_ID_MISMATCH"
	case !iconAPI:
		reason = "ICON_QUERY_API_UNPROVEN"
	case !d.IconSemanticOK:
		reason = "ICON_SEMANTIC_MISMATCH"
	case d.ButtonCount != 1:
		reason = "BUTTON_COUNT_MISMATCH"
	case !buttonIDs:
		reason = "BUTTON_ID_MISMATCH"
	case !d.ButtonStyleOK:
		reason = "BUTTON_STYLE_MISMATCH"
	case !allOwnersMatch:
		reason = "CONTROL_OWNER_MISMATCH"
	case !allParentsMatch:
		reason = "CONTROL_PARENT_MISMATCH"
	case !allVisible:
		reason = "CONTROL_VISIBLE_MISMATCH"
	case !allEnabled:
		reason = "CONTROL_ENABLED_MISMATCH"
	default:
		reason = "DIALOG_MATCH"
	}
	return d, lcFinishDialogDiagnostic(diagnostic), reason
}
