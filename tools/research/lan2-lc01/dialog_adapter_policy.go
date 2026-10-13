// Research/test only. This pure policy is embedded into the LC01 Windows test
// overlay; it is not imported by the production Launcher.
package main

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
	"dialogClassMatch", "dialogCountMatch", "structureMatch", "titleMatch", "controlSetMatch", "controlWindowMatch", "controlParentMatch", "bodyStyleMatch", "bodyIDMatch", "textMatch", "bodyCountMatch",
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

func lcChildEnumerationComplete(callbackFailed bool, children int, _ uintptr) bool {
	// EnumChildWindows documents that its return value is not used. Completion
	// is established by our bounded callback and a nonempty captured set.
	return !callbackFailed && children > 0
}

func lcDialogReasonIsInspectionFailure(reason string) bool {
	switch reason {
	case "DIALOG_NOT_PRESENT", "DIALOG_FIRST_MATCH", "DIALOG_MATCH":
		return false
	default:
		return true
	}
}

func lcDialogCaptureDecision(hasCurrent, failureFrozen, confirmed bool, reason string) (replace, freeze bool) {
	if failureFrozen {
		return false, true
	}
	if confirmed && hasCurrent && (reason == "DIALOG_NOT_PRESENT" || reason == "SECOND_NOT_LIVE") {
		return false, false
	}
	if lcDialogReasonIsInspectionFailure(reason) {
		return true, true
	}
	return true, false
}

func lcCompleteDialogRecheck(d lcDialogDiagnostic, same bool) lcDialogDiagnostic {
	out := lcDialogDiagnostic{}
	for key, value := range d {
		out[key] = value
	}
	if len(out) == 0 {
		out = lcNewDialogDiagnostic("stageRecheck", "classificationUnknown", true)
		lcSetDialogFact(out, "dialogAlreadyConfirmed", true, false)
	}
	lcSetDialogFact(out, "structureMatch", true, same)
	return lcFinishDialogDiagnostic(out)
}

func lcTopLevelCandidate(expectedPID, pid uint32, pidOK, visible, classOK bool, class string) (bool, bool, string) {
	if !pidOK || pid != expectedPID || !visible {
		return false, false, "IGNORED_UNSELECTED_WINDOW"
	}
	if !classOK {
		return false, true, "TOPLEVEL_CLASS_API_UNPROVEN"
	}
	if class != "#32770" {
		return false, true, "UNEXPECTED_TOPLEVEL_CLASS"
	}
	return true, false, "DIALOG_CANDIDATE"
}

func lcSortControlSnapshots(controls []lcControlSnapshot) {
	for i := 1; i < len(controls); i++ {
		for j := i; j > 0 && controls[j].Window < controls[j-1].Window; j-- {
			controls[j], controls[j-1] = controls[j-1], controls[j]
		}
	}
}

type lcControlSnapshot struct {
	Window                               uintptr
	PID                                  uint32
	WindowOK, ThreadOK, ClassOK, StyleOK bool
	Class                                string
	Style                                uint32
	ID                                   int
	IDOK                                 bool
	Parent                               uintptr
	ParentOK                             bool
	Visible, Enabled                     bool
	TextOK                               bool
	Text                                 string
	IconGetOK, IconImageOK               bool
	IconGet, IconImage                   uintptr
}

func lcSameDialog(a, b lcDialog) bool {
	if a.PID != b.PID || a.ExpectedPID != b.ExpectedPID || a.Creation != b.Creation || a.ExpectedCreation != b.ExpectedCreation ||
		a.Window != b.Window || a.Button != b.Button || a.ThreadOK != b.ThreadOK || a.ClassOK != b.ClassOK || a.ImageOK != b.ImageOK ||
		a.Live != b.Live || a.ParentOK != b.ParentOK || a.ButtonOwnerOK != b.ButtonOwnerOK || a.Visible != b.Visible || a.Enabled != b.Enabled ||
		a.Class != b.Class || a.Title != b.Title || a.Text != b.Text || a.ButtonClass != b.ButtonClass || a.ButtonID != b.ButtonID ||
		a.TextCount != b.TextCount || a.IconCount != b.IconCount || a.ButtonCount != b.ButtonCount || a.BodyStyleOK != b.BodyStyleOK ||
		a.BodyIDOK != b.BodyIDOK || a.BodyTextOK != b.BodyTextOK || a.IconStyleOK != b.IconStyleOK || a.IconIDOK != b.IconIDOK ||
		a.IconSemanticOK != b.IconSemanticOK || a.ButtonStyleOK != b.ButtonStyleOK || a.ControlsKnown != b.ControlsKnown || len(a.Controls) != len(b.Controls) {
		return false
	}
	for i := range a.Controls {
		if a.Controls[i] != b.Controls[i] {
			return false
		}
	}
	return true
}

func lcClassifyDialogControls(d lcDialog, controls []lcControlSnapshot, diagnostic lcDialogDiagnostic) (lcDialog, lcDialogDiagnostic, string) {
	d.Text, d.ButtonClass = "", ""
	d.Button, d.ButtonID, d.TextCount, d.IconCount, d.ButtonCount = 0, 0, 0, 0, 0
	d.BodyStyleOK, d.BodyIDOK, d.BodyTextOK, d.IconStyleOK, d.IconIDOK, d.IconSemanticOK, d.ButtonStyleOK = false, false, false, false, false, false, false
	d.ControlsKnown, d.ParentOK, d.ButtonOwnerOK, d.Enabled = true, true, true, true
	d.Controls = append([]lcControlSnapshot(nil), controls...)
	lcSortControlSnapshots(d.Controls)

	allClassObserved, allClassesKnown := true, true
	allStyleObserved, allStylesKnown := true, true
	allWindowObserved := true
	allOwnerObserved, allOwnersMatch := true, true
	allParentObserved, allParentsMatch, allVisible, allEnabled := true, true, true, true
	bodyIDObserved, bodyIDs, bodyTexts := true, true, true
	iconIDObserved, iconIDs, iconSemantics := true, true, true
	buttonIDObserved, buttonIDs, buttonStyles := true, true, true
	unknownClass, unknownStaticStyle, unknownButtonStyle := false, false, false
	bodyTextAPI, iconAPI := true, true
	for _, control := range d.Controls {
		allWindowObserved = allWindowObserved && control.WindowOK
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
		allParentObserved = allParentObserved && control.ParentOK
		if control.ParentOK {
			allParentsMatch = allParentsMatch && control.Parent == d.Window
		}
		allVisible = allVisible && control.Visible
		allEnabled = allEnabled && control.Enabled
		switch control.Class {
		case "Static":
			if lcBodyStyle(control.Style) {
				d.TextCount++
				d.BodyStyleOK = true
				bodyIDObserved = bodyIDObserved && control.IDOK
				bodyIDs = bodyIDs && lcBodyID(control.ID)
				bodyTextAPI = bodyTextAPI && control.TextOK
				bodyTexts = bodyTexts && control.TextOK && control.Text == lcBusyText
				if d.TextCount == 1 {
					d.Text = control.Text
				}
			} else if lcIconStyle(control.Style) {
				d.IconCount++
				d.IconStyleOK = true
				iconIDObserved = iconIDObserved && control.IDOK
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
			buttonIDObserved = buttonIDObserved && control.IDOK
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

	d.BodyIDOK = d.TextCount > 0 && bodyIDObserved && bodyIDs
	d.BodyTextOK = d.TextCount > 0 && bodyTextAPI
	d.IconIDOK = d.IconCount > 0 && iconIDObserved && iconIDs
	d.IconSemanticOK = d.IconCount > 0 && iconSemantics
	d.ButtonStyleOK = d.ButtonCount > 0 && buttonStyles
	d.ParentOK = len(d.Controls) > 0 && allParentObserved && allParentsMatch
	d.ButtonOwnerOK = len(d.Controls) > 0 && allOwnerObserved && allOwnersMatch
	d.Visible = d.Visible && len(d.Controls) > 0 && allVisible
	d.Enabled = len(d.Controls) > 0 && allEnabled
	d.ControlsKnown = allWindowObserved && allClassObserved && allClassesKnown && allStyleObserved && allStylesKnown

	lcSetDialogFact(diagnostic, "controlSetMatch", allClassObserved && allStyleObserved, d.ControlsKnown)
	lcSetDialogFact(diagnostic, "controlWindowMatch", allWindowObserved, allWindowObserved)
	lcSetDialogFact(diagnostic, "controlParentMatch", len(d.Controls) > 0 && allParentObserved, len(d.Controls) > 0 && allParentsMatch)
	lcMergeDialogFact(diagnostic, "ownerPIDMatch", allOwnerObserved, allOwnersMatch)
	lcSetDialogFact(diagnostic, "bodyStyleMatch", d.TextCount > 0, d.BodyStyleOK)
	lcSetDialogFact(diagnostic, "bodyIDMatch", d.TextCount > 0 && bodyIDObserved, d.BodyIDOK)
	lcSetDialogFact(diagnostic, "textMatch", d.TextCount > 0 && bodyTextAPI, d.TextCount > 0 && bodyTexts)
	lcSetDialogFact(diagnostic, "bodyCountMatch", true, d.TextCount == 1)
	lcSetDialogFact(diagnostic, "iconStyleMatch", d.IconCount > 0, d.IconStyleOK)
	lcSetDialogFact(diagnostic, "iconIDMatch", d.IconCount > 0 && iconIDObserved, d.IconIDOK)
	lcSetDialogFact(diagnostic, "iconSemanticMatch", d.IconCount > 0 && iconAPI, d.IconCount > 0 && iconSemantics)
	lcSetDialogFact(diagnostic, "iconCountMatch", true, d.IconCount == 1)
	lcSetDialogFact(diagnostic, "buttonHandlePresent", true, d.ButtonCount == 1 && d.Button != 0)
	lcSetDialogFact(diagnostic, "buttonIDMatch", d.ButtonCount > 0 && buttonIDObserved, d.ButtonCount > 0 && buttonIDs)
	lcSetDialogFact(diagnostic, "buttonClassMatch", d.ButtonCount > 0, d.ButtonCount > 0)
	lcSetDialogFact(diagnostic, "buttonStyleMatch", d.ButtonCount > 0, d.ButtonStyleOK)
	lcSetDialogFact(diagnostic, "buttonOwnerMatch", d.ButtonCount > 0 && allOwnerObserved, d.ButtonCount > 0 && allOwnersMatch)
	lcSetDialogFact(diagnostic, "buttonParentMatch", d.ButtonCount > 0 && allParentObserved, d.ButtonCount > 0 && allParentsMatch)
	lcSetDialogFact(diagnostic, "visibleMatch", len(d.Controls) > 0, d.Visible)
	lcSetDialogFact(diagnostic, "enabledMatch", len(d.Controls) > 0, d.Enabled)
	lcSetDialogFact(diagnostic, "buttonCountMatch", true, d.ButtonCount == 1)

	reason := "DIALOG_FIELDS_MISMATCH"
	switch {
	case !allWindowObserved:
		reason = "CONTROL_WINDOW_API_UNPROVEN"
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
	case !bodyIDObserved:
		reason = "BODY_ID_API_UNPROVEN"
	case !d.BodyIDOK:
		reason = "BODY_ID_MISMATCH"
	case !bodyTextAPI:
		reason = "BODY_TEXT_API_UNPROVEN"
	case !bodyTexts:
		reason = "BODY_TEXT_MISMATCH"
	case d.IconCount != 1:
		reason = "ICON_COUNT_MISMATCH"
	case !iconIDObserved:
		reason = "ICON_ID_API_UNPROVEN"
	case !d.IconIDOK:
		reason = "ICON_ID_MISMATCH"
	case !iconAPI:
		reason = "ICON_QUERY_API_UNPROVEN"
	case !d.IconSemanticOK:
		reason = "ICON_SEMANTIC_MISMATCH"
	case d.ButtonCount != 1:
		reason = "BUTTON_COUNT_MISMATCH"
	case !buttonIDObserved:
		reason = "BUTTON_ID_API_UNPROVEN"
	case !buttonIDs:
		reason = "BUTTON_ID_MISMATCH"
	case !d.ButtonStyleOK:
		reason = "BUTTON_STYLE_MISMATCH"
	case !allOwnersMatch:
		reason = "CONTROL_OWNER_MISMATCH"
	case !allParentObserved:
		reason = "CONTROL_PARENT_API_UNPROVEN"
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
