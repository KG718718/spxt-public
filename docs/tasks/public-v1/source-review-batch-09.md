# Batch 09: startup compatibility and configured tax validation

Date: 2026-09-11. Public-only correction within the approved L2 plan.

## Source-backed conflict

Read-only source account deletion preserves a user tombstone but deletes password and salt. Public startup previously required a nonempty password for every user. A synthetic restart case failed with STORE_INVALID before correction. No production file or account was read; this is not evidence of a real data-loss incident.

Startup now permits an absent credential only for an existing deleted tombstone, recognized by the existing accountStatus/deletedAt semantics. Active and disabled accounts still require credentials. An explicitly malformed credential, unknown role or duplicate username remains invalid. Names, history, status, business facts, counters and file bytes are untouched; existing data never reopens first-Admin setup.

## Tax configuration

User confirmed Admin entry with no preset rate. Before correction validateConfig({taxRate:null}) incorrectly succeeded; the assertion failed with "Missing expected exception". Startup now delegates present taxRate to the same tax-config validator. Missing configuration stays readable as unconfigured; explicit numeric zero is valid; invalid values refuse startup without modifying data/config. Saved historical tax snapshots are unchanged.

## Evidence

- Pure in-memory startup suite: 65 checks passed after both failures were fixed; earlier suite contained 46.
- Seven new hosted-only HTTP cases cover two deleted-account markers and five persisted tax values. They verify setup GET/POST outcomes and unchanged real fixture file hashes. Full cloud rerun pending this commit.
- The HTTP server still hosts only the initialization handler, not the full application. Full login, deletion through the business API, five pages and packaging remain pending.
- All fixture identities and amounts are synthetic. No source system files, business assets, services or production host were changed. No local public checkout/file/artifact, PR, main merge, Release or deployment.

## Hosted result

Commit 64f02003a901d3567a631ae80a9df3866bb0277a passed [Windows CI 34565987061](https://github.com/KG718718/spxt-public/actions/runs/34565987061): 408 checks in 13 test files, startup 65 and bootstrap HTTP 37, npm audit 0 vulnerabilities. No full application/browser/installer claim.
