# B45-T5 — M00—M02唯一真实Win10只读链

你是原B45-T5 Execution，不是项目主控。TASK ID `B45-T5-M00-M02-LIVE`；PARENT Batch4.5；唯一Master/准确回单目标 `01a0db0e-c950-79e0-8e11-07155e0742f2`。继续原thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`、原 `E:\CodexWorkspace\CodexWorktrees\b4-qa\public-source`、原`codex/b45-t5-integration`。合成冻结local HEAD `69cd3d1861523bc84881aa90b50333a2e5a29c06`（实现`a9abd822ad94ad756d23680a64484451d0e793e5`）。先读原AGENTS.md/PROJECT.md、Batch4.5 SPEC/PLAN/ACCEPTANCE、主控公共根目录完整`CORRECTED-PRE-NETWORK-STDERR-APPROVAL.md`第0—16节、`PRE-NETWORK-STDERR-INTERPRETATION.md`、合成RESULT及本卡。不新建线程/工作树/分支，不清理历史或改写旧S01证据。

Master已独立Review：M00纯PowerShell语言/.NET固定stdout，无ConvertTo-Json/模块/网络命令；M01仅显式`Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`并.NET输出；M02与历史S01 payload精确相同；真实执行器使用生产`resolveSystemPowerShell()`验证的exe/flags/cwd/env/timeout/maxBuffer。Master独立相关合成41/41 PASS、fail0skip0，固定六字段证据与生产blob`4e13e944472f845675fe73d176f063c4fe97f6ed`通过。上述两笔local commit保留。主控当前`.git`写入权限及GitHub写认证暂不可用，公开分支同步PENDING；这不扩大本地诊断次数。不得称已push。

现在**仅授权一次**当前Win10 Pro x64 build19045的既有`tools/tests/lan-host/discovery-pre-network-layer-live.cjs --approved-one-shot`真实链。运行前再核OS、生产blob、合成门禁、六字段白名单；前置不满足则不运行并BLOCKED回单。先M00纯.NET固定`{"ok":true}` stdout；M00 FAIL立即停止、不运行M01/M02。仅M00 PASS才M01显式Utility模块加载；M01 FAIL立即停止、不运行M02。仅M01 PASS才M02旧ConvertTo-Json序列化；M02完成即停。**整条链最多一次，不为确认结果重跑，也不单独补跑阶段。** 所有阶段只读；相同安全系统PowerShell及生产flags/cwd/env/timeout/maxBuffer，仅payload变化。

终端与证据只输出最终`schema/status/layer/M00/M01/M02`六字段固定JSON；layer只能SHELL_OR_ENVIRONMENT、UTILITY_MODULE_LOAD、UTILITY_SERIALIZATION、PRE_NETWORK_PASS、UNRESOLVED，阶段只能PASS/FAIL/NOT_RUN。不得保存或打印stdout/stderr/PowerShell错误/异常/stack、路径、环境值、IP/hostname/用户/网络信息或其hash/长度；M00运行时stdout仅与进程内固定字符串精确比较。严禁改生产`public-lan-network.js`、stderr fail-closed、Windows/Firewall/Registry/Service/Network/Profile/Route/DNS/Policy，不安装模块/工具、不listener/port bind，不运行Hosted/Actions/Final Full/QA，不用Astra。

完成后立即冻结原T5，保存安全证据与RESULT及local commit；主动`send_message_to_thread`向准确Master发结构化回单并核验目标，失败按AGENTS记DELIVERY FAILED。Master按正式决定第12—15节分析结论；此卡不授权生产修复、再次真实探针或恢复Final Full。H1/H2 2/2、Final Full0/1、Final QA0/1不变。
