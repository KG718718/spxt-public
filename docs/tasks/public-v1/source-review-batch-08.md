# Batch 08: tax configuration and first-Admin HTTP handler

Date: 2026-09-11. Public-only, serial continuation of the approved L2 plan.

## Tax configuration

User confirmed Admin-configured tax with no preset percentage. In-memory source-function evidence: missing config returned a default instead of rejecting. New tax-config.js uses the existing config.taxRate, accepts explicit numeric zero, rejects blank/null/string/boolean/non-finite/negative values and inherited fields, allows settings to display unconfigured state, and never changes existing objects or snapshots. 26 synthetic core cases passed in memory. Nonnegative range and the inclusive-tax formula were not changed. Actual server and UI integration still pending.

## Bootstrap HTTP

Before implementation a module-presence probe failed: there was no public bootstrap HTTP handler. This is not represented as a real HTTP failure run. New handler reuses public-startup.js for storage; no second database or default users. Only GET/POST /api/setup, loopback socket + expected Host, same-origin POST, JSON, 8 KiB body cap and timeout. GET reveals only initialization state. Success returns no identity, password hash or token; callback receives persisted state. Unexpected filesystem errors return generic text. Callback failure preserves committed data and asks for restart, never rollback/delete/reinitialize.

The hosted-only test uses newly constructed fictional identities and isolated .test-work directories: bad Host/origin/method/content/body/role, zero write on failure, first valid creation, repeat/concurrency/restart, corrupt data/config and orphan assets, filesystem error redaction and runtime handoff failure. The test server hosts only this handler; it does not assert the full application server or login UI is complete. Four JavaScript files pass syntax checks. Cloud results to follow.

No source application files, real accounts/data, mail, company services or host were changed. No local public directory or artifact. No PR/main merge/Release/deployment.

## Hosted verification

Commit d58aa9fb5a554dd44e422d4792a71032c334dc25: [Windows CI 34565261706](https://github.com/KG718718/spxt-public/actions/runs/34565261706) succeeded. 382 checks across 13 files, including 30 actual bootstrap HTTP and 26 tax core checks; npm audit 0 vulnerabilities. This is not a complete application or installer test.
