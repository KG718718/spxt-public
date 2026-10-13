# LAN2-U27-R2 历史前缀静态等价方案

日期：2026-10-13

状态：`STATIC EQUIVALENCE APPROVED BY MASTER — IMPLEMENTATION AUTHORIZED / NOT YET RUN`

唯一回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`

## 结论

前一份 `LAN2-U27-R2-STATIC-EQUIVALENCE-STOP.md` 对“省略 TestSetup 的简化专项”结论不变：该方案不等价。经 Master 要求重审，如果专项保留历史完整 `TestSetup`，再以第二个独立 Go 进程执行完整正常 `TestUpgradeLifecycle` 前缀直至 U27，并保持原离线网络条件，则可以静态证明执行路径与历史 Run 在 U27 前等价；U27 后立即停止，不运行 U28—U30，也不进入 PRIVATE_SESSION、FIREWALL、公开 26/742、Artifact candidate 或 QA。

该方案不是完整 Full，但工作量和运行成本接近原 Full 的 `SETUP_BUILD + OFFLINE_LIFECYCLE` 段。Master 已确认按此边界实施；不得触发或扩展为 Full。

## 必须逐字保持的历史边界

1. 使用相同 accepted F3：Run `36246132535`、source `c8886e6b6d413c2fd73d6716621d07a80b337e58`、Artifact `10907910968`、EXE SHA256 `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6`；不得重编 beta2 或混搭。
2. 生成与历史 Full 相同的 candidate、fault-space、fault-permission、fault-cancel、fault-copy、fault-payload-hash、fault-post-copy 七个 beta4 Setup（`ci-beta4.ps1:64-70`）。删掉任一 fault/rollback 构建都会改变 U15—U23 前缀。
3. 在同一 adapter-disabled 区间保持所有初始 Up adapter 禁用、外网 socket false、loopback 保留和 `KSESSION_EXTERNAL_NETWORK_DISABLED=1`（`offline-ci-beta4.ps1:50-76`）。有网执行不等价。
4. 用两个顺序、独立的 Go test 进程：先完整 `^TestSetup$`，成功后再执行 `^TestU27Specialty$`。不能用同进程 `t.Run(TestSetup)` wrapper，因为历史在两个 `go test` 进程间结束了第一个 Go 进程，关闭其 cleanup、goroutine 与进程级资源。
5. `TestSetup` 使用现有 beta4 generated overlay 原字节，不改测试逻辑、清理或报告；其 stdout/stderr 重定向到不上传的私有临时文件，Actions/Artifact 只能收到固定安全状态。
6. U27 specialty 必须由正常 Full overlay 生成结果派生，明确拒绝 `KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC` 和 `KSESSION_BETA4_DIAGNOSTIC`。它保留完整 U01—U26 fault/rollback、真实升级、core、U05/U06、受控 Launcher/Node、锁和 inventory 路径，只在 U27 记录完成后 return。
7. U27 Setup 仍使用原 `exitCode == 0` 成功条件；R1 严格 13 字段 `U27_PRE_INSTALL` 只是附加诊断，不能改变成功条件或接受范围。

## 为什么保留 TestSetup 后可证明等价

| 项目 | 历史行为 | 专项约束 | 结论 |
|---|---|---|---|
| TestSetup 跨测试状态 | 历史先完整 TestSetup，再启动第二个 Go test 进程（`offline-ci-beta4.ps1:74-77`） | 保留相同顺序和独立进程边界 | 等价 |
| Finish Launcher/全局 RunningProduct | TestSetup 只显式等 finish Node；F3 `RunningProduct` 全局 WMI 检查所有符合 manifest/app 的 Launcher/Node（`setup_windows_test.go:699-705`; `setup.iss:286-309`） | 不绕过、不预清理，完整 TestSetup 的实际遗留状态原样进入第二进程 | 等价；遗留状态若阻断，专项必须如历史 fail closed |
| TestSetup BindingKey | fresh post-install 写 BindingKey；最后卸载可能保留（`setup-beta4.iss:157-174,767-768`） | 不预删 registry；第二进程看到与历史相同的 TestSetup 后状态 | 等价；显式 `/INSTANCE` 与 `/CONFIRMDATACHANGE=1` 仍走历史分支 |
| TestSetup 默认 LOCALAPPDATA/业务实例 | TestSetup 自己设置 profile，Go test 进程结束；业务实例按历史保留 | 独立第二进程再由生命周期设置其 E profile | 等价；不把同进程环境泄漏带入 lifecycle |
| ProductKey/快捷方式 | TestSetup 与 TestUpgradeLifecycle 均有原门禁 | 保留两边原门禁 | 等价；不以报告 PASS 标签代替实际检查 |
| 网络 | 两个历史测试都在相同离线区间 | 同一 PowerShell try 中先后运行两进程 | 等价 |
| U01—U23 | 正常 Full 分支包含 corruption、全部 fault fixtures、permission 和 rollback | 原样保留；两个 diagnostic env 必须不存在 | 等价 |
| U24/U25 | 实际快捷方式、ProductKey/BindingKey 及 32/64 alias 核验 | 原样保留 | 等价 |
| Launcher/Node/lock | 生命周期内受控进程等待退出、handle wait、根锁独占打开并关闭 | 原样保留，不 force kill、不新增等待 | 等价 |
| U26→U27 时序 | uninstaller `c.Run()`、原 EXE 消失、persistent inventory，随后立即 fresh Setup | 不等待 clone、不清理残留；只插入无副作用的固定只读状态采样 | 等价到可观察边界；clone 是否仍收尾必须保留 UNKNOWN |
| U28—U30 及 Full 外围 | 历史之后继续 reinstall launch/core、收尾、private session、Firewall、742、Artifact | U27 记录后 return，外围均不执行 | 不影响 U27 前缀；专项结果只解释 U27，不称 Full/candidate |

## U26 后允许的只读状态

在历史已有 `persistentInventory()` 完成之后、fresh Setup 之前，只允许固定枚举采样：

- controlled first Launcher/Node 是否已退出；
- 根 `.launcher.lock` 是否可独占打开并已关闭 probe handle；
- ProductKey 是否不存在；
- BindingKey 是否存在并仍精确指向 expected install root/instance；
- program、uninstaller、desktop/start shortcut 是否存在；
- instance inventory 是否与卸载前一致；
- uninstall completion 固定为 `UNKNOWN`，除非已有可信、非等待、非清理的正证据。原进程返回和 `unins000.exe` 消失不得升级为 clone complete。

采样失败或未知必须进入固定报告并 fail closed；仍可按历史时序执行 fresh Setup 以取得真实拒绝 marker/exit，但专项总状态不得因后续信息把 UNKNOWN 改为 PASS。不能删除残留、加固定 sleep、等待 clone、force kill 未知进程或重新释放资源后声称原本已释放。

## 安全报告与输出

- 唯一上传文件为固定 `U27-SPECIALTY-REPORT.json`；顶层只含固定 schema/source/stage/status/classification、固定 prestate 枚举及嵌套的 R1 严格 13 字段 `U27_PRE_INSTALL`。
- 不包含 raw stdout/stderr/log/error/message、路径、PID、账号、token、业务正文、hash 或 length。
- workflow 在运行前写 `NOT_OBSERVED/PREFIX_NOT_REACHED` 初始报告；这只是当前 run 的明确占位，不得用历史摘要默认 FAIL 冒充实际观察。
- TestSetup 和 Go lifecycle 的全部原输出写入不上传的临时文件。原 `t.Fatal`、raw error、`safeCoreProbe` 的 outputBytes/SHA 不进入 Actions 输出或 Artifact。
- TestSetup 失败时固定为 `PREFIX_TEST_SETUP_FAILED` 并停止第二进程；specialty 报告缺失、解析失败、额外字段、source 不符或任何 gate 失败均 fail closed。
- 清理只能关闭本测试创建且明确归属的 handle/process；force cleanup 不能把报告改为成功。

## 必要新增/修改范围

建议最小范围：

1. 新增 `tools/tests/windows-installer/beta4-upgrade/prepare-u27-specialty.cjs`：只从正常 Full harness 派生 specialty overlay，证明允许插入点外的 U01—U27 前缀字节不变。
2. 新增 `tools/tests/windows-installer/beta4-upgrade/u27-specialty.test.cjs`：覆盖前缀 diff、禁止两个 diagnostic 模式、U27 截断、prestate 状态机、失败报告和隐私反例。
3. 新增 `tools/windows-installer/beta4-upgrade/u27-specialty-report.cjs`：严格顶层 schema/verifier，嵌套复用现有 13 字段 U27 verifier。
4. 可能修改 `compatibility-report.cjs`，把新纯合成测试纳入本地 fail0skip0 门禁；不改变 C01—C15/LCK01—LCK14 含义。
5. 新增 `tools/windows-installer/beta4-upgrade/u27-specialty-ci.ps1`：复用必要 portable/identity/toolchain/七模式 build，进入原离线边界，按两个独立 Go 进程运行 TestSetup→specialty，吞掉原输出，只生成固定报告。
6. 新增独立 `.github/workflows/lan2-u27-specialty.yml`：`workflow_dispatch` 单一固定输入/marker、唯一开发分支、attempt 1、contents/actions read、只下载固定 F3、只上传一个 JSON；与 Full/QA/LC01 trigger/concurrency 互斥。
7. 治理文档。

不修改生产 Launcher/Setup/Node、F3 身份、事务、rollback、业务 schema、现有 Full/QA/LC01 工作流语义。当前没有修改上述文件。

## 成本与未证问题

- 必须构建 portable、toolchain、candidate 和六个 fault Setup，并完整执行 TestSetup 与 U01—U27；时间和 runner 成本接近原 Full 的 SETUP_BUILD + OFFLINE_LIFECYCLE，而不是轻量 fresh-install 探针。
- TestSetup 包含真实安装/卸载、visible Finish 路径和多个安全反例，仍可能先于 U27 失败；此时唯一一次专项不会到达 U27，但这是保持历史状态的必要代价，不能跳过。
- Inno clone 是否在 U26 点仍运行依然没有可信只读正证据，只能报告 UNKNOWN。专项能观察实际 fresh Setup 的 exit/marker，不能单凭一次结果证明 clone 是唯一根因。
- 专项 PASS 也只表示固定前缀与 U27 诊断门禁通过，不是 Full Candidate、最终 Artifact、产品发布或 LAN 认证。

## Master 决定

Master 已接受“完整 TestSetup + 完整 U01—U27 前缀 + 同一离线区间”的条件等价方案及其成本，授权在上述文件范围内实施和本地合成/编译验证；Hosted 仍由 Master 独立 Review 后决定，Execution 不得触发。
