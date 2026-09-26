# B4-QA Result — Final Batch 4 Independent Review

状态：**FAIL — CI 门禁假绿；不是已确认的安装器产品缺陷。**

受测提交：`c8886e6b6d413c2fd73d6716621d07a80b337e58`；tree `0f298af80c1cbdf3835f39aca265cbcdb859bea6`。QA 工作树/分支为 `E:/CodexWorkspace/CodexWorktrees/b4-qa/public-source` / `codex/b4-qa`。本任务未修改生产、测试或 workflow，未调度 Hosted，未下载或保存发行 ZIP/EXE，未操作注册表、快捷方式、默认实例或真实业务环境。

## 阻断问题

### [P1] historical-identity 静态门禁的真实失败被 PowerShell 后续成功命令覆盖

- `.github/workflows/setup-v3.yml:225` 已把 `historical-identity` 限定为 `workflow_dispatch && inputs.mode == 'full'`。
- `tools/tests/windows-installer/historical-identity/historical-identity.test.cjs:254` 仍精确要求旧条件（没有 `inputs.mode == 'full'`），因此在受测提交上稳定失败。
- QA 串行复跑全部 installer Node 专项：**183 tests / 180 pass / 1 fail / 2 skip**；唯一失败即上述断言。两个 skip 分别为本机 Windows file-symlink 权限与不可用 8.3 alias，未冒充通过。
- GitHub F3 原始 job `108415569036` 的 `Static and synthetic historical identity gates` 日志同样明确记录该文件 **70 tests / 69 pass / 1 fail**，随后继续运行 detection、preflight 和 contract；步骤最终仍为 success。
- 直接原因是 `.github/workflows/setup-v3.yml:240-246` 连续执行多条原生 `node` 命令，但未逐条检查 `$LASTEXITCODE`；最后一个 contract 命令成功，覆盖了前面失败状态。因此 run `36246132535` / historical job success 不能证明“静态与合成 historical identity gates 全部通过”。

影响：F3 的 workflow/job success 是假绿，违反“测试不得弱化/假阳性”和最终独立 QA 门禁。即使 historical 实际取证随后成功、Setup 生命周期也通过，当前提交仍不能标记 `QA PASS` 或 `AUTOMATION PASS / QA PASS / HUMAN PENDING`。

最小返工及复验要求：

1. 仅更新该 workflow 静态步骤和对应契约测试：断言应包含 `inputs.mode == 'full'`；每条原生命令必须在非零时立即终止（逐条检查 `$LASTEXITCODE`，或等价、可执行且失败关闭的实现）。
2. 加入可执行反例，证明“前一原生命令非零、后一命令成功”时整步仍失败，不能只做文本匹配。
3. 用现有 QA Hosted 额度跑专用门禁复验，不得冒充 Full。若 diff 严格只涉及 workflow/测试且所有 Artifact 影响文件相对 `c8886e6` 逐字节不变，QA 判断无需重跑 Full 或重建 Setup；应保留 F3 Artifact 的 `c8886e6` 来源身份，并单独记录后续 QA 门禁修复提交及产品/build 输入无差异证据。若返工触及生产、构建、payload、身份策略或生命周期断言，则必须回到主控按预算重新决定，不能沿用本结论。

## 已确认的正向证据

- U22 实现顺序已独立代码审查：`upgrade-transaction/index.cjs` 的 `commit()` 在任何旧 program rename 前调用 `validateStaged()`；manifest bytes hash 不等于 plan 时专用 `STAGE_MANIFEST_HASH`，CLI 仅该真实 `TransactionError` 返回 61。Setup 只有在进程实际启动且退出码为 61 时记录专用 marker；启动失败、其他身份错误及未知错误不能伪装。
- U22 本地反例与真实生命周期均比较旧安装完整 `program/uninstall` 文件、HKCU registration/binding、两个快捷方式和完整 instance 文件 hash；同时拒绝缺 gate/prepare/native-copy、出现 swap/verify/finalize、未知/冲突原因、failure handler 缺失及 rollback failure/missing marker。QA 聚焦 Go 测试与 compile-only 使用固定 Go 1.27.1 均 PASS。
- D5 `36245606056@22bacc5d45278bdff838d5a002bf7121085751b3` 的 18 阶段安全报告与主控既有严格验证表明 `U22=PAYLOAD_HASH_REJECTED/UNCHANGED`；这是 exact beta.1 payload 专项，不替代 Full。
- F3 原始安全 JSON（来自 Artifact `10907910968`）交叉核对：六份报告 source identity 均为 `c8886e6`；U01—U30 均 PASS；I01/I02/I09 PENDING、其余 I 项及 D01—D13 PASS；26 suites / 742 checks / fail 0 / skip 0；Portable 与离线恢复 PASS。实例在升级结束、首次 beta.2 启动前完整 inventory byte-identical；原合成 Admin/附件在升级及卸载重装后可用。
- F3 build-info 声明 Setup EXE SHA256 `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6`；同 run 的 artifact verifier 实际从构建目录读取 EXE 重算并通过。QA 未在开发机保存/重哈希 EXE。GitHub Artifact API 核对 `10907910968` 名称、source SHA、size `32538249`、未过期及 ZIP digest `e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6` 一致。
- 本地公开回归：`npm test` 为 26 files / failed 0；本地 hosted-only 项按设计 SKIP，不写成 742。installer Node 专项除上述唯一真实失败外其余通过；Go 聚焦测试与 compile-only PASS。安全报告封闭字段、U/I/D 集合、commit/tree、offline 状态及回归计数交叉检查 PASS。

## 判断边界

- 已确认事实：当前唯一阻断是可复现的静态门禁失败及 workflow 假绿；F3 产品生命周期和 Artifact 原始报告提供 U01—U30 等正向证据。
- 基于证据的判断：该缺陷位于测试/workflow 层，现有证据未显示安装器产品行为失败；严格限定的门禁修复可以不消耗 Full 额度。
- 未完成：B4-QA PASS、Win10 人工 I01/I02/I09。不得进入 Batch 4.5、main、tag 或 Release。

