# B4-T1A Result — Historical beta.1 identity evidence capability

状态：**BLOCKED — 云端真实取证失败，REGISTRY 根因修复已在本地完成**。主控尚未整合、push 或重跑该修复，也尚未取得历史 identity anchors；不能据此放行 T3 或报告 Batch 4 PASS。

## 已完成

- 复用默认分支已登记的 `setup-v3.yml` 作为 `workflow_dispatch` 入口，并新增独立 `historical-identity` job。该 job 仅允许 `workflow_dispatch`、公开仓库和开发分支 ref 同时成立时运行；push 事件绝不会进入历史 Artifact 下载/安装路径。job 权限仅 `contents: read`、`actions: read`。
- 下载、解包和安装只在 GitHub 托管 Windows runner 的合成 E 盘工作目录；严格定位唯一 `K-SESSION-Setup-1.1.0-beta.1.exe`，固定 32,988,254 bytes 和 SHA256 `49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8`。
- 使用 beta.1 已有静默参数安装到隔离 program/instance 路径；不启动业务服务、不创建账号/业务/附件、不发邮件。安装前拒绝既有登记、binding 或同名快捷方式。
- 从真实安装根的 `uninstall/installer-manifest.json`、`uninstall/build-info.json`、`program/manifest/runtime-manifest.json` 和 `program/K-SESSION.exe` 提取五个精确锚；不会读取 Artifact 外层 `build-info.json` 代替安装内身份。
- PowerShell 显式查询 HKCU 64/32 两视图，生成仅供私有临时调用的最小 snapshot；仅当两视图观测逐字段完全相同时折叠共享 HKCU 别名，再要求唯一登记和唯一 binding 且同 view，并调用现有 T1 `validate(snapshot, historical policy)`。缺失、差异、额外记录或 HKLM 污染均停止。
- 输出 profile 直接兼容后续 beta.2 identity bundle 的 `{id,sources,policy}` 输入。最终 evidence 为封闭 schema，仅含公开 ID、版本、固定键名、hash、计数和 PASS 结论；不含本地路径、用户名、环境变量、token、密码、registry 值或业务/附件正文。
- 卸载后验证 program、卸载登记和两个快捷方式清除，同时验证 beta.1 按产品契约保留 binding/instance；随后测试夹具仅删除自身精确 binding/instance 和下载/Setup/安装临时内容。预检发现的既有目录、输出或快捷方式不归任务所有，finally 不删除。
- workflow 只在成功时上传小型 `historical-identity-evidence.json`，保留 30 天；不上传 Artifact ZIP、Setup、安装目录、日志或 snapshot。Job Summary 仅写非敏感 ID/hash/结论。

## 调度入口返工

主控首次整合后实际调用 `gh workflow run setup-b4-historical-identity.yml --ref codex/windows-installer-v1.1` 返回 HTTP 404。原因是该独立 workflow 仅存在开发分支，尚未在默认分支登记，GitHub `workflow_dispatch` API 无法按文件名发现它；这不是取证脚本执行失败，历史 Artifact 未被下载或安装。

返工删除不可调度的独立 workflow，将同一 historical job 接入默认分支已有的 `setup-v3.yml`。静态测试固定以下门禁：push 触发存在但 historical job 条件必为 false；只有开发分支 manual dispatch 可以运行；historical job 仅有一次 upload-artifact，路径只能是 evidence JSON。现有 Setup job 的 push/manual 行为不改。

## 首次真实取证与诊断返工

开发分支最终源码 `4516203` 的 manual Setup run 35738365701 已实际启动；`historical-identity` job 106783536357 的静态与合成门禁通过，但真实取证步骤约 4 秒内只输出 `HISTORICAL_IDENTITY_BLOCKED` 后退出 1，未生成 evidence。该事实只能证明真实取证未通过，现有日志无法区分 hosted preflight、API metadata、下载、archive hash、解包、Setup 身份、安装、registry、锚收集、卸载、清理或最终输出中的哪一阶段，失败原因仍未知。

诊断返工把所有可能失败的执行边界划分为封闭 allowlist：`HOSTED_PREFLIGHT`、`API_METADATA`、`ARTIFACT_DOWNLOAD`、`ARCHIVE_HASH`、`EXTRACT`、`SETUP_IDENTITY`、`INSTALL`、`REGISTRY`、`COLLECT`、`UNINSTALL`、`CLEANUP`、`FINALIZE`。catch 只允许输出 `HISTORICAL_IDENTITY_BLOCKED_<PHASE>`，不读取或输出异常消息、URL、路径、用户名、registry 值、token 或业务内容；所有原有 fail-closed 门禁保持不变。需由主控整合后诊断重跑才能定位阶段。

诊断版随后由主控整合并运行：manual run 35741131048 / `historical-identity` job 106792140018 在越过安装后返回 `HISTORICAL_IDENTITY_BLOCKED_REGISTRY`。GitHub run API记录该次受测 head SHA 为 `7a87e13442ea797d172f9ca31e16b1619fbcd2c3`，必须与其他 run 或 commit 区分。

根因是 HKCU 共享视图与原脚本计数假设冲突。beta.1 使用 `PrivilegesRequired=lowest`，[Inno 非管理员安装规则](https://jrsoftware.org/ishelp/topic_admininstallmode.htm)将卸载信息放在 HKCU；`ArchitecturesInstallIn64BitMode=x64os` 及 binding 的显式 `HKCU64` 表示名义 64 位视图。但 Microsoft WOW64 规则明确 `HKEY_CURRENT_USER\SOFTWARE` 在新系统为共享键，[Inno Same Application 文档](https://jrsoftware.org/ishelp/topic_sameappnotes.htm)也明确非管理员安装的 HKCU 在32/64位间共享。原脚本分别打开 Registry64/Registry32 后把同一物理登记追加两次，再因数量为2拒绝。

最小修复只将 32/64 两份字段逐项完全相同的 HKCU observation 识别为一个共享别名，并固定选择安装器名义上的64位 view；任一字段不同、缺失、额外记录、registration/binding view不一致，或 HKLM 32/64 任一视图出现同名登记，仍 fail closed。原始与规范化 snapshot 都只在 runner 私有临时目录存在并于清理阶段删除，不输出或上传路径及 registry 值。

主控整合上述修复为 `3c303dce64366ba55012d553e31e2d65ff14e760` 后触发 manual run 35744708122 / `historical-identity` job 106803581714；静态与合成门禁继续通过，真实步骤仍返回 `HISTORICAL_IDENTITY_BLOCKED_REGISTRY`。该结果不能证明是哪一个 registry 操作失败。本轮继续将这一阶段封闭细分为 `REGISTRY_HKLM`、`REGISTRY_HKCU_READ`、`REGISTRY_SNAPSHOT_WRITE`、`REGISTRY_NORMALIZE`、`REGISTRY_RESULT_READ`、`REGISTRY_UNIQUENESS`；catch 仍只输出固定 allowlist 中的阶段名，不输出异常正文或观测值。

## 本地验证

首次专项运行：12 项中 11 PASS、1 FAIL。失败为 evidence 严格 schema 反例向外透出 T1 `Rejection` 类型；已仅在新模块边界转换为稳定 `HistoricalIdentityError`，未修改 T1 或测试断言。

最终本地结果：

- historical-identity 专项：18 PASS，0 FAIL，0 SKIP；新增 registry 子阶段边界测试，并逐项合成验证所有诊断输出都属于固定 allowlist 且不含路径、用户信息、URL、registry 值或凭据标记。
- 既有 T1 upgrade-detection：43 PASS，0 FAIL，0 SKIP。
- 既有 T2 upgrade-preflight：19 PASS，0 FAIL，1 SKIP；SKIP 为当前开发机无 Windows file-symlink 创建权限，junction/深层链接反例仍通过，必须由 hosted Windows workflow 补实测。
- installer contract：`INSTALLER CONTRACT PASS`、`R2 DATA LOCATION CONTRACT PASS`。
- Node 三文件语法检查、PowerShell AST parse、workflow 静态权限/上传范围检查及 `git diff --check`：PASS。

## 未验证与风险

- 本任务未在开发机下载 Artifact 或保存发行包。云端首次真实 workflow 已失败且没有 evidence，历史 profile 中五个 hash 仍未知；只有诊断返工整合、重跑并得到成功 JSON 后才能固化这些锚。
- [Microsoft WOW64 registry 文档](https://learn.microsoft.com/en-us/windows/win32/winprog64/shared-registry-keys)说明共享键可把同一物理副本映射到两个逻辑视图；本修复在进入已批准 T1 契约前，仅折叠字段完全相同的 HKCU 共享别名，仍向 T1 提供唯一 view。若 hosted runner 返回任何差异或额外记录，workflow 仍将 `BLOCKED`，不能放宽为 commit/tree。
- GitHub Artifact API 若 digest/大小/attempt/expiry 等任一固定元数据变化、Artifact 已过期、下载 ZIP digest 或 Setup hash 不符、真实安装参数失败、安装内锚冲突、T1 单 policy 不通过或清理不完整，均 fail closed；不产出成功 evidence。
- 两代 Setup 仍为 unsigned development artifact。本任务只证明相对固定公开 Artifact 和 beta.2 未来内置锚的一致性，不提供发布者签名保证。

## 主控后续

Review 本任务追加 local commit 后重新整合到开发分支，通过默认分支已登记的 `setup-v3.yml` 对开发分支 ref 发起 manual dispatch。必须审查实际 Actions JSON、Run ID、Artifact ID、五个安装后 anchors、T1 PASS 和 cleanup PASS；云端失败则按稳定 BLOCKED 结论处理。本任务不接续 T3/T4。
