# B45-T5 — M00—M02 纯.NET基线合成门禁

你是执行任务，不是项目主控。TASK ID `B45-T5-M00-M02-SYNTHETIC`；PARENT Batch4.5；唯一Master与准确回单目标 `01a0db0e-c950-79e0-8e11-07155e0742f2`。公开仓库 `KG718718/spxt-public`；继续原T5 thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`、原 `E:\CodexWorkspace\CodexWorktrees\b4-qa\public-source`、原本地 `codex/b45-t5-integration`，冻结HEAD `150ef216f91708f2af0041d832edabf94b6442f3`。集成基线由Master派单SHA提供。先读原工作树AGENTS.md、PROJECT.md、Batch4.5 SPEC/PLAN/ACCEPTANCE，再通过派单SHA完整读取`CORRECTED-PRE-NETWORK-STDERR-APPROVAL.md`第0—16节、本卡和历史S01 evidence/RESULT。不checkout/cherry-pick主控治理，不新建线程、工作树或分支。

**本卡仅解冻合成阶段。** 先更正报告语义：旧S01证据不删、不重写、不重跑；旧`STARTUP`结果仅解释为`PRE_NETWORK_UTILITY_SERIALIZATION_STAGE`，即无Get-Net*/网络查询时已有stderr，不能证明纯PowerShell启动。当前生产`public-lan-network.js` blob `4e13e944472f845675fe73d176f063c4fe97f6ed`继续冻结。H1/H2 2/2、Final Full0/1、Final QA0/1保持，不运行Actions。

仅可在`tools/tests/lan-host/`新增/改M00—M02短命只读harness、合成反例、固定白名单校验与本任务RESULT/纯合成证据。真实链将沿用经`resolveSystemPowerShell()`验证的系统exe与生产NoLogo/NoProfile/NonInteractive/ExecutionPolicy Bypass/WindowStyle Hidden/EncodedCommand、cwd/env/timeout/maxBuffer，仅替换payload。M00只用PowerShell语言基础及`[Console]::Out.Write('{"ok":true}')`，不得有ConvertTo-Json、Write-Output、Out-*、Get-*、Import-Module、网络命令或其他模块自动加载。M01仅在M00 PASS后显式`Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`并由.NET写固定JSON，不能查询网络或泄露模块信息。M02仅在M00/M01 PASS后用旧S01等价最小ConvertTo-Json序列化。任一失败即停，阶段最多一次；但**本卡严禁调用真实live入口**。

合成至少覆盖M00 stderr非空→SHELL_OR_ENVIRONMENT且停、M00干净/M01 stderr非空→UTILITY_MODULE_LOAD且停、M00/M01干净/M02 stderr非空→UTILITY_SERIALIZATION、三层干净→PRE_NETWORK_PASS；spawn error/timeout/nonzero/signal/固定stdout无效/异常均不得误判层级，必须UNRESOLVED；额外字段拒绝、正文不落报告、后续阶段未执行等。最终报告仅schema/status/layer/M00/M01/M02固定枚举与必要布尔，不能有自由文本。M00 stdout只在内存与固定`{"ok":true}`精确比较，不保存运行时原文。禁止保存stdout/stderr/异常/stack、路径/env值、IP/hostname/用户/网络身份或其hash/长度。合成测试fail0/skip0、Node syntax、diff-check PASS。

不修改生产代码、Windows/Firewall/Registry/Service/Network/Profile/Route/DNS/Policy，不安装模块或工具、不建立listener/port bind，不运行Hosted/Full/QA。保留local commit和RESULT；主动`send_message_to_thread`向准确Master发送结构化回单并核验目标，送达失败按AGENTS记录。完成合成后立即冻结待Master Review；只有Master另行派单才可执行**唯一一次**本机M00→条件M01→条件M02链。本轮GPT-6 Sol/Medium，不用Astra。
