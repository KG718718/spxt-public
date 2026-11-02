package main

import "testing"

func TestFreshParentResponsibilityPure(t *testing.T) {
	for _, tc := range []struct {
		name                           string
		allow, known, owner            bool
		nodes                          int
		want, ownedCalls, observeCalls string
	}{
		{"no_receipt", true, false, false, 0, "OWNERSHIP_UNKNOWN", "0", "0"},
		{"partial_receipt_after_create_failure", true, false, true, 1, "OWNED_REMOVED", "1", "0"},
		{"created_then_next_step_failed", true, true, true, 2, "OWNED_REMOVED", "1", "0"},
		{"preexisting_observe_only", true, true, false, 0, "SNAPSHOT_UNCHANGED", "0", "1"},
		{"unknown_existing_state", true, false, true, 0, "OWNERSHIP_UNKNOWN", "0", "0"},
		{"not_allowed", false, true, true, 2, "OWNERSHIP_UNKNOWN", "0", "0"},
		{"contradictory_nodes_without_owner", true, true, false, 1, "OWNERSHIP_UNKNOWN", "0", "0"},
		{"negative_nodes", true, true, true, -1, "OWNERSHIP_UNKNOWN", "0", "0"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ownedCalls, observeCalls := 0, 0
			got := freshRunParentResponsibility(tc.allow, tc.known, tc.owner, tc.nodes,
				func() string { ownedCalls++; return "OWNED_REMOVED" },
				func() string { observeCalls++; return "SNAPSHOT_UNCHANGED" })
			if got.State != tc.want || got.OwnedInvoked != (ownedCalls == 1) || got.ObserveInvoked != (observeCalls == 1) ||
				(tc.ownedCalls == "1") != (ownedCalls == 1) || (tc.observeCalls == "1") != (observeCalls == 1) {
				t.Fatal("PARENT_RESPONSIBILITY_MISMATCH")
			}
		})
	}
	ownedCalls, observedCalls := 0, 0
	parent := freshRunParentResponsibility(true, true, true, 1, func() string { ownedCalls++; return "OWNED_REMOVED" }, func() string { observedCalls++; return "SNAPSHOT_UNCHANGED" })
	child := freshRunParentResponsibility(true, false, true, 1, func() string { ownedCalls++; return "OWNERSHIP_UNKNOWN" }, func() string { observedCalls++; return "SNAPSHOT_UNCHANGED" })
	if parent.State != "OWNED_REMOVED" || child.State != "OWNERSHIP_UNKNOWN" || ownedCalls != 2 || observedCalls != 0 {
		t.Fatal("PARENT_CHILD_RESPONSIBILITY_LOST")
	}
	noFallback := freshRunParentResponsibility(true, true, true, 1, func() string { return "OWNERSHIP_UNKNOWN" }, func() string { t.Fatal("UNKNOWN_OWNER_OBSERVE_FALLBACK"); return "SNAPSHOT_UNCHANGED" })
	if noFallback.State != "OWNERSHIP_UNKNOWN" {
		t.Fatal("UNKNOWN_OWNER_ACCEPTED")
	}
	if freshRunParentResponsibility(true, false, true, 1, nil, nil).State != "OWNERSHIP_UNKNOWN" {
		t.Fatal("MISSING_OWNER_CALLBACK_ACCEPTED")
	}
	for _, step := range []struct{ name, outcome, failure, success string }{
		{"close", "FAIL", "CLOSE_FAILED", "PASS"},
		{"delete", "FAILED", "DELETE_FAILED", "OWNED_REMOVED"},
		{"partial_delete", "PARTIAL", "DELETE_FAILED", "OWNED_REMOVED"},
		{"observe", "UNPROVEN", "OBSERVATION_FAILED", "RESTORED"},
	} {
		t.Run("sticky_"+step.name, func(t *testing.T) {
			outcome, failure := freshStickyStep("NOT_ATTEMPTED", "", step.outcome, step.failure)
			outcome, failure = freshStickyStep(outcome, failure, step.success, "")
			if outcome != step.outcome || failure != step.failure {
				t.Fatal("FAILED_STEP_CLEARED")
			}
		})
	}
	if !freshOldOwnerRejected("RECEIPT_UNKNOWN") {
		t.Fatal("STALE_RECEIPT_REJECTION_LOST")
	}
	for _, state := range []string{"OWNED_REMOVED", "OBSERVATION_FAILED", "DELETE_FAILED", "CLOSE_FAILED", "STRUCTURED_STATE_CHANGED"} {
		if freshOldOwnerRejected(state) {
			t.Fatal("UNRELATED_FAILURE_ACCEPTED_AS_STALE_REJECTION")
		}
	}
	first := freshNativeCreationClass("CREATE_FAILED", "CREATED_NEW", "CREATE_UNPROVEN")
	first = freshFirstFailure(first, "TEMPORARY_CLOSE_UNPROVEN")
	if first != "CREATE_UNPROVEN" {
		t.Fatal("CREATE_FIRST_FAILURE_OVERWRITTEN_BY_LATER_CLOSE")
	}
	if freshNativeCreationClass("CLOSE_FAILED", "CREATED_NEW", "CREATE_UNPROVEN") != "TEMPORARY_CLOSE_UNPROVEN" {
		t.Fatal("PRIMARY_CLOSE_FAILURE_MISCLASSIFIED")
	}
}
