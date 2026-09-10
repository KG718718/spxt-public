# Batch 06 — employee export privacy

This is a public candidate change, not an internal-system update or a release.

## Decision and prior evidence

The user confirmed that ordinary employees may export only their own business bonus, execution fee and monthly settlement amounts; Admin retains the complete authorized aggregate.

The failure-first synthetic case reproduced the defect: the execution employee's expected [business, execution, total] was [0, 25, 25], while the original module returned [150, 90, 240]. No real account, invoice, business data, attachment or production endpoint was used.

## Change

The public export module now constructs a minimal employee-owned projection BEFORE filtering. It does not pass the complete project bonus record or settlement snapshots into employee exports. Applicant business bonus uses its saved confirmed value; execution fees sum only exact matching employee entries. Admin retains the existing project aggregate.

The employee bonus sheet identifies the employee and their own total. Metadata contains only their own bonus sum, with settlement payable shown separately to avoid adding the same bonus twice. Hidden participants, notes, snapshots and attachments are excluded; employee bonus attachment export is rejected before file resolution. Stored records are not changed.

The existing supplier-statistics count is labelled 涉及付款单数, without changing its calculation. Bonus project filtering recognizes the stored applicationId. Invalid/empty identities and unknown roles are rejected.

## Tests

Thirty synthetic in-memory cases passed after the fix, including role isolation, detail/list/project/month/query filters, missing/zero/legacy confirmed values, CSV/JSON, metadata, no attachment reads, source immutability and spreadsheet formula-like text handling. A hosted Windows-only case tests actual XLSX generation and inspects its XML archive; its result is pending the next CI run.

The module tests do not claim complete server-route, HTTP, browser, packaged-installation or production validation. Server and page adaptation are still pending.

## License work

The user requested complete licensing for the packaged application. Project license selection and the authorized copyright attribution are pending user response. MIT is a proposal only, not yet applied. The current UNLICENSED marker does not mean an MIT or other open-source grant.

Third-party dependency names/versions, original license texts and notices must accompany whatever code/binaries are actually redistributed. No company identity is substituted into third-party copyright statements. Runtime, optional OCR models/components and any later assets must be reviewed separately before they enter a package. README, root LICENSE, package metadata and packaged copies must agree before release.

Sources: https://opensource.org/license/mit ; https://www.apache.org/licenses/LICENSE-2.0 ; https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository .

No local public copy, private Git history, company configuration or business data was written or uploaded. No PR, merge, Release, deployment or operational-host modification.
