# Upgrade detection helper contract

This helper is a fail-closed, read-only gate for the single approved upgrade path: `1.1.0-beta.1` to `1.1.0-beta.2`. B4-T1 does not wire it into `setup.iss`.

## Approved identity bundle

The old installation cannot authenticate itself. Generated beta.2 Inno code must pin the SHA-256 of the exact identity-bundle bytes. The bundle is closed and covers both approved sources:

- `historical-run-35514357007`: exact on-disk anchors extracted after installing Artifact 10606870944 in controlled GitHub Windows CI.
- `fresh-ci-baseline`: exact on-disk anchors extracted from T4's same-run fresh build of commit `e9417f036d0cdf736ff84682556a994040f0de0b` (tree `5da66cb9b73dfa307948634634bfab2cfaaead12`).

Each profile contains `id`, `sources`, and the existing strict `policy`. Every policy pins the program-manifest, program-inventory, uninstall build-info, Runtime-manifest and Launcher hashes as well as the fixed source/tree/version/DC contract. Commit/tree alone never approves an identity. Unknown profile IDs, fields, wildcards, duplicate IDs, duplicate complete fingerprints, missing sources and more than two profiles are rejected.

Normally the bundle has two profiles, each with its matching one-element `sources`. If controlled evidence proves the historical and fresh complete anchor fingerprints are identical, the bundle must deduplicate them to one `historical-run-35514357007` profile whose ordered `sources` is `['historical-run-35514357007','fresh-ci-baseline']`. Two profiles with the same fingerprint are invalid; this prevents a byte-identical installation from becoming an ambiguous match.

T3 packages the bundle, `cli.cjs`, `index.cjs`, and the beta.2 payload's pinned Node 24.21.0 executable. It invokes the helper once:

```text
node.exe cli.cjs --bundle <identity-bundle.json> --bundle-sha256 <pinned-64-hex> --snapshot <registry-snapshot.json>
```

Artifact 10606870944 is a temporary evidence source, not a runtime dependency. Its currently recorded expiry is 2026-10-20. Historical extraction must complete in controlled GitHub Windows CI before expiry; do not download or retain the release package on a development machine. Persist only reviewed, non-sensitive identity hashes/evidence in the repository or beta.2 build inputs. If exact post-install anchors cannot be obtained, stop as `BLOCKED / NEED PARENT DECISION`; do not broaden a policy. The fresh rebuild remains required for U10 and does not replace the historical installed identity.

## Caller snapshot and result

T3 must query only these current-user registry keys in both the 64-bit and 32-bit views, reject read/type errors, and create a private temporary snapshot containing `registrations` and `bindings`. There must be exactly one registration and one binding in the same view:

- `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`
- `HKCU\Software\KSESSION\Beta\InstallerBinding`

The snapshot fields are exact and closed: registration `view/key/displayName/displayVersion/installLocation/uninstallString`; binding `view/key/installRoot/instance`. T3 must create it under Setup's private temporary directory, never log it, close it before invocation, and delete it immediately afterward. The helper reads installation metadata and hashes every file below `<InstallRoot>\program`. It does not read `data.json`, `config.json`, attachments, backups or secrets, and writes nothing.

Success requires exactly one distinct identity profile to pass every single-policy check. Exit `0` emits one JSON line with the non-sensitive `profileId`, verified install/instance paths, versions and DC. T3 must not log the success JSON because it contains local paths. A no-match response is the generic `IDENTITY_NOT_APPROVED`; it does not expose per-profile failures. Stable rejection groups are: 20 registration, 21 version, 22 uninstall metadata, 23 binding, 24 path, 26 manifest, 27 program payload, 28 Runtime, 29 Launcher, 30 source/build/DC, 31 no approved identity, 40 bundle bytes, 41 bundle schema/ambiguity, 64 invocation and 70 unexpected failure.

## Security boundary and limitations

- The beta.2-pinned bundle hash is the trust anchor. A snapshot, old manifest, fresh build or commit/tree alone can never pass.
- Registry discovery stays in T3/Inno because Node has no approved native registry dependency. The snapshot is caller input and is cross-checked against the independently anchored on-disk identity.
- T2 owns instance-content preflight. T3 owns fixed-drive/system-path checks, running-state checks and the recoverable transaction.
- The approved beta.1 lacks `dataContractVersion`; it maps to DC1 only after one complete exact identity matches. No old metadata or business data is written.
- Both installers are unsigned development artifacts. This detects changes relative to approved anchors; it does not provide publisher authenticity or code-signing assurance.
- TOCTOU remains between preflight and copy. T3 must protect the temporary snapshot, hold the process/instance locks, and re-run identity validation immediately before mutation or bind verified file handles into its transaction.
- An attacker able to replace the running unsigned beta.2 Setup and all embedded anchors is outside this helper's guarantee.
