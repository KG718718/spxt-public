# B45-T5 — Controlled Win10 Discovery Root-Cause

你是执行任务，不是项目主控。TASK ID：`B45-T5-WIN10-DISCOVERY-ROOT-CAUSE`；ROLE：原 B45-T5 Execution；PARENT：Batch 4.5。唯一主控及准确回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`。公开仓库 `KG718718/spxt-public`；原工作树 `E:\CodexWorkspace\CodexWorktrees\b4-qa\public-source`；原本地分支 `codex/b45-t5-integration`，冻结 HEAD `c39cdaafa9cd8b25468009318cca4dabcd4ecb67`。集成基线由主控派单时提供。先读原工作树 AGENTS.md、PROJECT.md、Batch 4.5 SPEC/PLAN/ACCEPTANCE，并以主控派单 SHA 读取完整 `CONTROLLED-DISCOVERY-ROOT-CAUSE-APPROVAL.md` 第 0—31 节及本卡。不新建线程、工作树或分支，不 checkout/cherry-pick 主控治理。

## 当前授权：仅合成分类反例

真实 Win10 Pro x64 build19045 已有 P01 PASS、P02 固定 `NETWORK_DISCOVERY_FAILED`，P03—P08 未到达。未修改生产 `public-lan-network.js` 的 Git blob 为 `4e13e944472f845675fe73d176f063c4fe97f6ed`，公开源码 SHA256 为 `7f2ac479b3bf2f06bf90b34257aeed59db94c3b00ddf81dabd8b997b8c1e241e`。H1/H2 2/2 已耗尽；Final Full 0/1、Final QA Hosted 0/1 未启用。旧失败结论与 evidence 保留。

只允许在 `tools/tests/lan-host/` 增加独立诊断 harness 和 R01—R10 合成反例，以及本任务 RESULT 与安全固定 JSON。第一阶段严禁改生产代码，尤其 `public-lan-network.js`；严禁调用真实 Windows discovery，严禁 Hosted/Final Full/QA。Harness 的未来真实模式必须通过原 `runWindowsDiscovery({spawnSync: wrapper})` 复用生产 `WINDOWS_DISCOVERY_SCRIPT`、`resolveSystemPowerShell()`、相同系统 PowerShell、args、cwd、env、timeout、maxBuffer；wrapper 原样返回真实 spawn 结果。不得通过模拟结果宣称真实 P02 PASS。

合成反例至少：R01 正常退出、空 stderr、有效 JSON；R02 spawn error；R03 timeout；R04 exit nonzero；R05 signal；R06 stderr nonempty；R07 stdout empty；R08 invalid JSON；R09 null process result；R10 unknown exception → INTERNAL。仅可记录 `processResultPresent/spawnError/timedOut/exitZero/signalPresent/stderrEmpty/stdoutPresent/jsonParseable` 固定布尔和审批书第 8 节闭合 reason。验证原始敏感文本不会进入报告或错误输出；不得记录 stdout/stderr/exception/stack、IP、网卡、GUID、MAC、hostname、route、DNS、gateway、PowerShell/用户路径及其 hash 或长度。运行合成测试须 fail0、skip0、Node syntax PASS、diff-check PASS。保留 local commit 与 RESULT；完成后主动 `send_message_to_thread` 给准确主控 ID，并核验返回目标。回单格式：【TASK ID】【状态 PASS/FAIL/BLOCKED】【完成内容】【修改文件】【测试结果】【local commit】【已知风险】【需要主控处理】。发送失败按 AGENTS 记录 `RETURN DELIVERY FAILED`，不声称送达。

完成合成反例后**再次冻结，等待主控 Review**。主控确认后才会对原线程派下一阶段：真实 Win10 一次只读 spawn 分类；必要时 N01—N05 阶段探针；一次完整生产脚本复核。根因获真实证据证明后，是否普通修复由主控判断；涉及审批书第 15 节架构/安全变化立即停止。普通最小修复、唯一 P01—P08 Proof、Final Full 0/1、独立 Final QA 0/1 各有后续独立门禁，本卡不提前授权跨越。
