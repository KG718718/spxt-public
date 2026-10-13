# LC01-ID-R2 本地回单｜2026-10-13

状态：LOCAL RETURNED / MASTER REVIEW PENDING。没有 push、Actions、安装、真实 Launcher/Setup、注册表、网络或 Firewall 操作；LC01-ID-R2 专项仍 0/1，Full Candidate 0 次，Final QA 0 次。

## 已确认事实

- 外层不再调用 Windows PowerShell 5.1。正式路径只接受系统 Program Files/PowerShell/7/pwsh.exe，并检查完整路径各段无 reparse、Authenticode 为 Valid、签名主体属于 Microsoft Corporation；随后由同一文件执行 Core/主版本至少 7、IsPathFullyQualified API、UTF-8 与 K⁺ 非 ASCII 探针。任一项失败固定为安全 FAIL，不启动身份子流程。
- 本机没有上述系统安装路径。Codex bundled pwsh 只作为本地无安装测试执行器；测试明确证明该 cache 路径不能通过正式信任路径，不能据此宣称本机系统 pwsh 已认证。
- 子进程使用 ProcessStartInfo.ArgumentList 逐参数传递、UTF-8 stdout/stderr、总时限和输出上限。共享 probe 判定用 ReadAllText 明确区分零字节 stderr 与非空 stderr；两种反例均执行。私有原始输出不进入上传报告。
- 生成的身份 wrapper 在原单文件 allowlist 校验之后才写严格 sidecar；保留原 beta2 identity 规则。新增 LC01_IDENTITY_VALIDATION 与 LC01_LIFECYCLE 仅用于专项分类，写入旧历史 run report 时仍映射为原 COLLECT 语义。
- LC01 报告升级为 schema 2；schema 1 仍按原义可读。schema 2 独立保留 outer stage/runnerOutcome 与 inner classification/stage/reason。新报告严格绑定 testedCommit、F3 Run 36246132535、Artifact 10907910968、source commit 及 Setup SHA，并区分 NOT_STARTED、REPORT_MISSING、INITIAL_PLACEHOLDER、VERIFIED_BLOCKED、REPORT_INVALID、IDENTITY_VALIDATION_FAILED、LIFECYCLE_FAILED、UNKNOWN、PASS。reason 按分类和阶段精确派生，不接受任意大写字符串；额外或敏感字段拒绝。
- 没有解释器 proof 的 ENV/SOURCE/TOOLCHAIN 早期失败只记 `CHILD_NOT_STARTED`，不推断为信任拒绝；只有 parent 实际捕获并传入固定白名单原因时才区分信任、能力或 proof 拒绝。初始化报告固定为 `UNKNOWN / INITIAL_REPORT_UNFINALIZED`，不冒充事后分类。
- PASS 必须同时具备可信解释器证明、FINALIZE 进度、最终身份报告、五锚与 inventory、自然生命周期 PASS、cleanup PASS、inner/outer 一致；陈旧进度、失败或不一致不能升级 PASS。生命周期失败时只保留已经严格验证的固定身份摘要，不保留非法字段。

## 本地验收

- Node：lc01-hosted.test.cjs 与 second-launcher.test.cjs 共 21/21 PASS，fail 0、skip 0。
- 反例覆盖可信路径、reparse、签名、Core/版本/API/UTF-8/参数；未启动、缺报告、占位报告、原身份全部合法 BLOCKED 阶段、非法报告、commit/F3 不匹配、额外敏感字段、身份/生命周期失败及内外不一致。
- lc01-hosted.ps1 和最终生成 invoke-lc01.ps1 的 PowerShell Parser 均 PASS；两个 CJS node --check PASS；git diff --check PASS。
- 固定 Go 1.27.1，GOTOOLCHAIN=local、GOPROXY/GOSUMDB=off；fresh 专属目录 go test -c PASS。生成的 Windows 测试 EXE 未运行。

解释器 stub 测试要求调用方显式设置 `LC01_TEST_PWSH=<absolute-existing-test-pwsh>`；缺少或文件不存在直接 FAIL，不 skip、不下载。该参数只选择测试执行器，正式准入仍固定为系统 Program Files/PowerShell/7/pwsh.exe。

## 边界与剩余风险

本地 fixture 只能证明封装逻辑和失败分类，不能证明 GitHub Runner 实际具有满足路径、签名和能力要求的系统 pwsh，也不能证明 F3 安装、第二 Launcher 或 cleanup。历史 Run 37909613607 的具体失败原因仍 UNKNOWN；PowerShell 5.1 与 API 不兼容只是静态发现，不能追认为唯一根因。LAN-2 保持冻结，等待唯一 Master 独立 Review、整合和后续单次专项决定。
