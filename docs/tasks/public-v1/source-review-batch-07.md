# Batch 07: approved MIT license and packaging evidence

Date: 2026-09-11. User resumed the paused public-packaging task after approving MIT. This batch uses the standard MIT text and neutral K-SESSION contributors attribution, without asserting a specific company ownership. Third-party attribution remains unchanged.

Before implementation, the new check failed because root LICENSE was missing. After in-memory implementation, 15 synthetic license checks passed: metadata and lock agreement, publication guard, original MIT text, attribution, missing/truncated/modified terms, independent third-party notice, CRLF compatibility and no input mutation. Three JavaScript files parse successfully. No public files or package were written on the development machine.

The hosted collector now validates the root license before output, includes LICENSE and project third-party notice, retains all dependency original notices and verifies persisted hashes/JSON. Root package and lock license change only to MIT; dependency versions are unchanged. The current CI result will be appended after the exact commit runs.

Scope: LICENSE, THIRD_PARTY_NOTICES.md, package.json, package-lock.json, tools/public-license-policy.js, tools/check-public-licenses.js, tools/tests/public-license.test.js, README.md, PROJECT.md, license documentation and this task evidence. No business rule, internal source, runtime data, host or service change. No PR, main merge, Release or deployment.

Still pending: native binary components, Node/OCR/assets license review and actual final distribution; complete server/pages, HTTP/browser, installation/upgrade/full restore and authorized two-machine LAN testing. The cloud license archive is not an application installer.

## Windows line-ending regression

First hosted run 34564584766 failed in the new license check: Git checkout supplied CRLF third-party notice text while the heading check expected LF. This was a checker compatibility defect, not missing permission terms. Normalize CRLF for notice validation and construct the CRLF license test from normalized LF; never rewrite original dependency notices. New Windows-notice regression added; 16 license cases pass with both LF and CRLF virtual checkout inputs. The first run is recorded as failed, not green.
