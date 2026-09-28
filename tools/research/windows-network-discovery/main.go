// RESEARCH / NON-PRODUCTION / NOT PACKAGED.
package main

import "os"

// Deliberately has no live mode. A host-reading PoC requires a separate review
// and explicit authorization. Do not use this executable in production.
func main() {
	b, _ := marshalSafe(safeResult{Schema: 1, Status: "REJECT", Stage: "VALIDATION"})
	os.Stdout.Write(append(b, '\n'))
	os.Exit(71)
}
