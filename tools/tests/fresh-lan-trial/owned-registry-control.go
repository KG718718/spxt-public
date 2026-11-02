package main

// This control function has no platform dependency. The Windows parent entry
// calls it with its retained native creation receipt and real cleanup actions.
// A failed final create can still leave earlier created nodes to account for.
type freshParentControlResult struct {
	State          string
	OwnedInvoked   bool
	ObserveInvoked bool
}

func freshRunParentResponsibility(allow, known, hasOwner bool, createdNodes int, owned, observe func() string) freshParentControlResult {
	if !allow {
		return freshParentControlResult{State: "OWNERSHIP_UNKNOWN"}
	}
	if createdNodes < 0 || (createdNodes > 0 && !hasOwner) {
		return freshParentControlResult{State: "OWNERSHIP_UNKNOWN"}
	}
	if hasOwner && createdNodes > 0 {
		if owned == nil {
			return freshParentControlResult{State: "OWNERSHIP_UNKNOWN"}
		}
		return freshParentControlResult{State: owned(), OwnedInvoked: true}
	}
	if hasOwner || !known {
		return freshParentControlResult{State: "OWNERSHIP_UNKNOWN"}
	}
	if observe == nil {
		return freshParentControlResult{State: "OWNERSHIP_UNKNOWN"}
	}
	return freshParentControlResult{State: observe(), ObserveInvoked: true}
}

// A failed native step remains failed even if a later call has no work left.
func freshStickyStep(priorOutcome, priorFailure, nextOutcome, nextFailure string) (string, string) {
	if priorFailure != "" {
		return priorOutcome, priorFailure
	}
	return nextOutcome, nextFailure
}

// After the old creator handle has been closed, only its exact stale-receipt
// rejection proves the old owner cannot adopt a same-path replacement.
func freshOldOwnerRejected(state string) bool { return state == "RECEIPT_UNKNOWN" }

func freshNativeCreationClass(state, expected, fallback string) string {
	if state == expected {
		return "NONE"
	}
	if state == "CLOSE_FAILED" {
		return "TEMPORARY_CLOSE_UNPROVEN"
	}
	return fallback
}
func freshFirstFailure(prior, next string) string {
	if prior != "NONE" {
		return prior
	}
	return next
}
