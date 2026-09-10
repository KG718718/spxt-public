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

## 2026-09-10 依赖许可缺项修复记录

首次托管检查 34463871251 在 @napi-rs/canvas-win32-x64-msvc@0.1.80 未随包附 LICENSE 时按预期失败，后续测试未执行，不记通过。已核对该平台包与 @napi-rs/canvas@0.1.80 的 npm 元数据：同一官方仓库、同一 gitHead dda1b258dac667b4c66b94bbd4d70aa79ea4503a。父包附带该提交的原始 MIT 正文。

新增精确映射，仅允许该包/版本使用同版本父包原始 LICENSE，SHA-256 必须为 8802fecf9da4367bc23bcf20b21cc143785fc6c92b152f3fa7fbe6ce08d344d6；任何版本或正文改变均要求重新审查，不给所有缺文件依赖通用豁免。原第三方作者署名保留。

这只补齐 npm 包层级正文来源；该原生图形二进制还涉及 Skia 等原生组件，完整封装前必须继续核对其实际分发许可/声明。inventory 明确 nativeBinaryReview=pending-before-distribution，不将本次包层级检查标成完整原生二进制合规通过。

The second hosted run passed all 310 functional checks (10 test files), including the actual XLSX archive privacy check, but the license step failed because busboy@1.6.0 and streamsearch@1.1.0 use the legacy single-entry licenses array rather than license. Exact-version publisher metadata confirms type MIT. The checker now recognizes that single-entry format while still requiring lockfile agreement and original license text; unknown or ambiguous licenses still fail.
