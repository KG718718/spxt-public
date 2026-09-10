# Source review batch 05 — debt, backup and mail

Status: candidate only; not a complete installable application.

## Scope and exclusions

This batch uses reviewed source and synthetic test fixtures. It contains no installation accounts, clients, suppliers, payment records, invoices, attachments, private endpoints or mail credentials. Synthetic fixtures are test inputs only and must not be included in an installation data directory.

Included: debt-repayment.js, backup-service.js, mail-reminder.js, smtp-secret-store.js, three public tests, dependency metadata and hosted Windows CI steps. Export code, server routes, pages, installer, packaged distribution and release are not included.

## Reviewed behavior

- Debt formulas, permission inputs, approved/pending repayment distinctions, cost allocations, closed-project historical evidence and configured fee snapshots remain unchanged. Missing fee configuration is not treated as zero.
- Structured JSON backups retain source bytes and a SHA-256 manifest; rotation removes only verified generations. This is not yet proof of complete packaged restore.
- Mail defaults are disabled and dry-run, with no preconfigured SMTP provider, recipients or system URL. Public environment names use KSESSION_. The sender brand is K⁺-SESSION.
- Missing mail configuration means an unconfigured installation. Malformed or unreadable configuration now throws instead of silently falling back. Configuration saves validate, flush and atomically publish; injected failures retain previous configuration.
- SMTP passwords remain separate from mail configuration. Windows DPAPI storage code is retained with renamed public environment variables. Actual DPAPI persistence and real SMTP delivery have not been tested in this batch.
- Six dependencies use exact versions and the reviewed lockfile. No local dependency installation or public project folder was created.

## Evidence

Failure-first mail test reproduced acceptance of malformed configuration before the fix. After the fix, 18 synthetic memory-backed mail checks passed; no real mail was sent. Fifteen synthetic pure debt checks passed. Nine new backup filesystem checks are restricted to the hosted cloud test workspace and are pending this batch's CI result.

The preceding batch passed 237 checks in six files on hosted Windows, including actual filesystem initialization, restart and two-process first-admin contention:
https://github.com/KG718718/spxt-public/actions/runs/34460680038

These counts are not full HTTP, browser, installer or LAN acceptance.

## Significant pending decision: employee bonus exports

A read-only review found that the export visibility filter permits an execution participant to select the project's bonus record, but the bonus sheet subsequently uses full project totals. The server GET /api/exports path passes the complete bonus records to that export builder and does not add a bonus-only Admin gate.

A synthetic, in-memory JSON export reproduction used an execution employee entitled to 25, another execution employee entitled to 65, and the project applicant's business bonus of 150. The resulting employee export included applicant identity and totals 150 / 90 / 240, rather than only that employee's own 25. This is code and synthetic module evidence, not a production HTTP exploitation test or evidence of an actual disclosure.

The export implementation has NOT been uploaded. Proposed least-scope correction, pending user confirmation: ordinary employees export only their own business bonus, execution fee and settlement amounts; Admin retains the complete authorized overview. Do not silently change the visibility policy. No company installation or operational host is modified.

## Remaining gates

Obtain the export visibility decision, complete server and page adaptation, validate permissions through synthetic HTTP and real browser tests, finish a zero-data Windows package, and verify installation/restart/upgrade/restore. License, PR, merge and Release remain separate decisions. Do not call this batch a complete application or a release.
