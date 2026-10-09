package main
import("testing";"time")
func TestHostedThirtySecondBudget(t *testing.T){
 f:=&lcFake{exitAt:1250,code:0}
 r:=lcRun(f,30*time.Second)
 if r.Status!="PASS"||r.Path!="DISPATCH_SUCCESS"||f.clock<=20*time.Second||f.clock>=30*time.Second{t.Fatal("bounded late legal exit")}
 f=&lcFake{exitAt:2000,code:0};r=lcRun(f,30*time.Second)
 if r.Status!="FAIL"||r.Path!="TIMEOUT"||!r.CleanupTerminated||!r.HandlesClosed{t.Fatal("deadline must reject")}
 f=&lcFake{dialogs:[]lcDialog{lcFixture()},inspectCost:31*time.Second};r=lcRun(f,30*time.Second)
 if r.Status!="FAIL"||r.Path!="TIMEOUT"||f.confirmed{t.Fatal("no late modal confirmation")}
}
