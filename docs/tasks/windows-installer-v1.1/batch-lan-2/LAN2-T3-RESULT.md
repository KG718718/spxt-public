# LAN2-T3 执行回单（2026-09-28）

> 当前追加状态：`RETURNED — LOCAL SYNTHETIC PASS; PARENT INTEGRATION PENDING`。下方独立基线与集成反例均为历史结果；本任务最新验证为集成 `56aed68` 源码只读快照上的 45/45 与 C01—C15 PASS，仍需 Master 整合本次修复并独立复跑。

## 状态

`RETURNED — LOCAL SYNTHETIC PASS; PARENT INTEGRATION AND HOSTED PENDING`。本回单仅覆盖独立工作树中的 beta.4 信任、事务、Setup、CI 静态与合成验证；未运行 Hosted/Actions、真实 Setup、真实升级或用户 LAN 验收，不能记 Batch LAN-2 自动验收 PASS。

## 基线与范围

- 基线：`43914744c0b74031fb2d20c849c7500408e0a85a`；任务分支：`codex/lan2-t3-beta4-upgrade`。
- 仅新增 `tools/windows-installer/beta4-upgrade/**`、`tools/tests/windows-installer/beta4-upgrade/**`、`.github/workflows/lan2-beta4-v1.1.yml` 和本 RESULT。来源为主控 checkout 的未提交草稿，经本任务独立检查和修正；原草稿本身不作为验收。
- 受信任 F3 beta.2 固定来源：source `c8886e6b6d413c2fd73d6716621d07a80b337e58`、Run `36246132535`、Artifact `10907910968`。runtime 信任依赖仓库中固定的五项身份锚，不在线查询 Artifact。workflow 在 Hosted 实际升级验收时下载并校验受验 Setup 的 archive 大小、SHA256、Setup 大小、SHA256；历史 Artifact 不保证永久可下载，因此这是后续 Full/QA 的可用性风险，不是运行时信任前提。

## 已确认的本地结果

- `node --test --test-concurrency=1` 执行兼容与事务两个套件：45 tests、45 pass、0 fail、0 skipped。`compatibility-report.cjs` 输出 C01—C15 全部 PASS，且 fail/skipped 为 0。
- 10 个 beta.4 CJS 文件 `node --check` 全 PASS；beta.4 PowerShell 文件用 PowerShell Parser 检查通过；暂存 diff-check 见提交核对。
- 固定策略仅允许 F3 beta.2→beta.4；合成覆盖未知 beta.2、beta.1、beta.3、beta.4 same-version、降级拒绝。事务测试覆盖旧状态精确锚、故障回滚、metadata、快捷方式，以及 instance、账号、附件、schema 2 `lan-deployment.json` 中 interfaceName/port 保持。
- workflow 静态核对：仅 `full`/`qa`，仓库 `KG718718/spxt-public` 与分支 `codex/lan2-manual-host-v1.1` 固定，隔离 checkout 精确 SHA，最终 Artifact 隐私 allowlist，未增加诊断入口。beta.4 构建强制 Portable Node 44/44。

## 主控整合前必须核对

- 当前冻结基线中的 T2 `tools/windows-portable/ci-lan.ps1` 仍要求 37/37；主控 checkout 的 T2 未提交草稿已改为 44/44。T3 的本地测试允许前后两个接口阶段，beta.4 构建和 Artifact 核验始终只接受 44/44。主控须在整合 T2 后复测并确认最终为 44/44；不能把此任务的 45/45 当作 Portable 44/44。
- T1 Node 与 T2 Launcher/Firewall/Portable 的正式提交、Full（最多 2）及独立 QA（最多 1）均待主控调度；本任务未消费 Hosted 预算。
- 完整 workflow 仍依赖历史受验 beta.2 Setup 下载进行真实升级验证。若 Artifact 不可取得，不得换成未经精确取证的 fresh rebuild，也不能宣称升级验收完成；应交主控处理可信测试输入。

## 未改变的边界

未改 beta.2 或旧 beta.3 文件/证据，未改 Batch 4/4.5 文档、业务 schema、AppId、实例数据。未 push、合并、建 tag/Release，未执行真实网络探针或 Firewall UAC。

## 追加返工：集成名单反例（2026-09-28）

- 主控集成 HEAD `61c86522eacbe3688ad7ca09ca6eebd2ec825f3e` 的只读快照显示：T2 固定名单为 Launcher 精确 28 项、Firewall 精确 13 项；原 T3 测试只把固定名单与构建命令相比，未独立钉住新名单。现已在本任务测试中逐项硬编码新 28/13 名单，并分别与固定名单、Launcher 构建命令、Firewall Go 顶层测试集合做深度相等断言；不接受旧/新两套名单。
- 集成反例：T2 `tools/windows-launcher/build.ps1:22` 仍调用旧的 27 项 Launcher 名单，含已删除的 `TestUACRejectionDoesNotStopLocalChildOrRetry`，缺少 `TestFirewallInterfaceNameArgumentIsQuoted`、`TestEnableRejectionRestoresDisabledPreferenceAndLocalChild`。本任务不修改该 T2 文件。
- 在 `61c8652` 的 Git archive 只读源码快照中覆盖本任务修正后的 T3 测试运行完整 compatibility+transaction：45 tests、44 pass、1 fail、0 skipped；唯一失败正是上述精确名单断言。C01—C15 报告据 fail-closed 规则为 FAIL（全部检查标 FAIL），不得称 45/45 或 C01—C15 PASS。该测试快照不是 Git worktree，未修改集成 checkout。
- 已将 T2 接口问题主动报送唯一 Master。待 T2/主控修正 `build.ps1` 后须在新集成 SHA 上重跑 45/45 与 C01—C15；旧基线的 45/45 结果不能代替此次集成验证。

## 第二次返工：双锚提取反例（2026-09-28）

- 主控已将 T2 构建名单修复整合为 `4cc6044`，T3 精确名单断言整合为 `2bd885a`/`56aed68`。`56aed68` 的 Launcher 构建命令采用 `-run '^Test(...)$'`；原 T3 提取正则只接受缺少 `^` 的旧文本，因此 `assert.ok(group)` 失败。此为 T3 静态测试缺陷，不是 T2 名单再次不一致。
- 仅在 T3 `compatibility.test.cjs` 将提取正则改为同时精确要求 `^` 与 `$`；加入缺起始锚、缺结束锚各一条反例，均要求无法匹配。原 Launcher 28 项、Firewall 13 项逐项深度相等断言保留。
- 从集成 `56aed68d08d8bd635f8b381d313a2f40889b9563` 创建无 `.git` 的只读源码快照，仅覆盖本任务修正后的 T3 测试文件，运行完整 `compatibility-report.cjs`：45 tests、45 pass、0 fail、0 skipped，C01—C15 报告 `PASS`。未运行 Hosted/Actions；本地源码快照测试不替代 Master 在新集成 SHA 的独立复验。

## 已登记 workflow 手动入口返工（2026-09-28）

- 远端预检由 Master 确认：新建的 `lan2-beta4-v1.1.yml` 尚未登记在 GitHub workflow 列表，无法直接以 `gh workflow run` 调度。本轮授权在已登记的 `.github/workflows/setup-v3.yml` 最小增加 `lan2-full`/`lan2-qa` 两个手动 mode 与独立 caller job；仅在仓库 `KG718718/spxt-public`、分支 `codex/lan2-manual-host-v1.1`、`workflow_dispatch`、对应 mode 下调用 `./.github/workflows/lan2-beta4-v1.1.yml`，分别映射为 `full`/`qa`。原 Batch 4/4.5 modes/jobs 条件及调用语义未改。
- T3 静态测试精确断言 caller job 全部文本、两个 option 恰各一次、callee `workflow_call` 输入与 candidate 的仓库/分支/mode 限制。PyYAML `BaseLoader` 对 caller/callee 两份 YAML 解析通过；T3 CJS 语法通过。
- 在集成 `56aed68d08d8bd635f8b381d313a2f40889b9563` 的无 `.git` 源码快照中仅覆盖本轮 caller 与 T3 测试文件，完整 `compatibility-report.cjs` 为 45 tests、45 pass、0 fail、0 skipped，C01—C15 报告 `PASS`。这是本地静态/合成验证；Master Review、整合、push 后才可按预算调度 Full 0/2，本任务未运行 Hosted。
