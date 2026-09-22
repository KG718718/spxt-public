# Upgrade detection helper contract

This helper is a fail-closed, read-only gate for the single approved upgrade path: `1.1.0-beta.1` to `1.1.0-beta.2`. It is not wired into `setup.iss` by B4-T1.

## Trusted input

T4 must fresh-build beta.1 from `e9417f036d0cdf736ff84682556a994040f0de0b` (tree `5da66cb9b73dfa307948634634bfab2cfaaead12`) and produce a policy matching the fields enforced by `validatePolicy`. T3 packages that policy, `cli.cjs`, `index.cjs`, and the beta.2 payload's pinned Node 24.21.0 executable inside beta.2 Setup. Generated Inno code pins the SHA-256 of the exact policy bytes and invokes:

```text
node.exe cli.cjs --policy <extracted-policy.json> --policy-sha256 <pinned-64-hex> --snapshot <registry-snapshot.json>
```

The policy is an independent beta.2 build input. A manifest or policy read only from the old installation is not a trust anchor. The helper rejects a policy without exact beta.1 source/tree, program-manifest, program-inventory, build-info, Runtime-manifest and Launcher hashes.

## Caller snapshot and result

T3 must query only these current-user registry keys in both the 64-bit and 32-bit views, reject read/type errors, and create a private temporary snapshot containing `registrations` and `bindings`. There must be exactly one registration and one binding in the same view:

- `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\KSESSION-Beta-Installer-v1_is1`
- `HKCU\Software\KSESSION\Beta\InstallerBinding`

The snapshot fields are exact and closed: registration `view/key/displayName/displayVersion/installLocation/uninstallString`; binding `view/key/installRoot/instance`. The helper rejects extra fields. T3 must create the snapshot under Setup's private temporary directory, never log it, close it before invocation, and delete it immediately afterward. The helper then reads installation metadata and hashes every file below `<InstallRoot>\program`. It does not read `data.json`, `config.json`, attachments, backups or secrets, and writes nothing.

Exit `0` emits one JSON line with `status=PASS`, the verified install/instance paths, source and target versions, and data-contract version. T3 may use the exit code as the Inno gate and independently re-read the already-validated binding; it must not log the success JSON because it contains local paths. All non-zero exits are rejection. Stable exit groups are: 20 registration, 21 version, 22 uninstall metadata, 23 binding, 24 path, 26 manifest, 27 program payload, 28 Runtime, 29 Launcher, 30 source/build/data contract, 40 trusted policy, 64 invocation and 70 unexpected failure.

Failure output contains only a stable code and a generic Chinese diagnostic; it omits paths, registry values, file contents and hashes.

## Security boundary and limitations

- The beta.2-generated policy hash is the trust anchor; the old manifest never authenticates itself.
- Registry discovery stays in T3/Inno because Node has no approved native registry dependency. The helper treats the minimal snapshot as caller input and cross-checks it against the independently anchored on-disk identity. A snapshot alone can never pass.
- The helper validates identity and eligibility only. T2 owns instance-content preflight; T3 owns running-state checks and the recoverable install transaction.
- The approved beta.1 lacks `dataContractVersion`; it is mapped to DC1 only when every exact beta.1 source/build anchor matches. No old metadata or business data is written.
- Both beta installers are unsigned development artifacts. This helper detects changes relative to the pinned fresh rebuild; it does not provide publisher authenticity or code-signing assurance.
- TOCTOU remains between preflight and copy. T3 must hold the existing process/instance locks and re-run identity checks immediately before mutation or otherwise bind the verified file handles into its transaction.
- T3 must protect the temporary snapshot from replacement between registry read and helper open. This component does not claim that a normal pathname prevents a same-user race.
- An attacker able to replace the running unsigned beta.2 Setup and all embedded anchors is outside this helper's guarantee.
