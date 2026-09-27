# Batch 4.5 — M03 PASS 后最小生产修复正式批准

网页版批准最小生产修复方案 A。原 B45-T5/原工作树、唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`、集成分支 `codex/lan-host-v1.1` 不变。真实 Win10 历史 M00/M01 PASS、M02 FAIL，唯一 M03 同进程显式 Utility 导入后最小序列化 PASS（1/1）；这允许最小修复，不证明完整 discovery 已恢复。

**唯一生产改动**：在 `public-lan-network.js` 的 `WINDOWS_DISCOVERY_SCRIPT` 中 `$ErrorActionPreference='Stop'` 之后、任何 `Get-Net*` 与 `ConvertTo-Json` 之前，仅加 `Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop` 一行。不得顺便导入 NetTCPIP、NetAdapter 或其他模块，不改网络筛选、listener、Firewall、升级、0.0.0.0、业务逻辑或业务数据。

保持 `resolveSystemPowerShell()`、系统 powershell.exe、安全 SystemRoot/WINDIR/System32 PATH/受限 PSModulePath、NoLogo/NoProfile/NonInteractive/ExecutionPolicy Bypass/WindowStyle Hidden、15 秒 timeout、1 MiB maxBuffer、windowsHide、固定 cwd/env。不得全量继承 `process.env`、增加用户/第三方模块路径、管理员权限、模块安装、Windows 配置或持久 ExecutionPolicy 改动。`String(result.stderr || '').trim()` 非空即 `NETWORK_DISCOVERY_FAILED` 的 fail-closed 不变；不忽略 warning 或仅凭 exit0 放行。

原 T5 先完成 F01—F12 合成/静态测试：导入早于网络 cmdlet 和 JSON；模块加载失败、stderr、非零退出、signal、无效 JSON 均拒绝；PSModulePath、用户模块路径、adapter/Public/VPN/virtual、无 0.0.0.0 变化。要求 fail0、skip0、语法和 diff-check PASS。Master 独立确认生产 diff 仅一行及必要测试后，整合、仅推公开开发分支。**Review/push 前不得执行真实 P01—P08。**

之后只允许当前真实 Windows 10 Pro x64 build19045 对修改后的**真实生产代码**做一次 Controlled Windows Production Discovery Proof。P01 系统 PowerShell 安全路径、P02 完整 discovery、P03 records 解析、P04 adapter 结构、P05 virtual/VPN/tunnel 拒绝、P06 RFC1918、P07 无 listener、P08 无 Windows 网络状态改变必须全部 PASS，且 `privateCandidatePresent=true`。若 P02 仍 `NETWORK_DISCOVERY_FAILED` 或任一核心门禁不满足，立即停止记录固定事实交网页版；不得再加 M04/M05/新 S、网络模块导入、Hosted 网络诊断或提前 Full/QA。

若受控 P01—P08 全 PASS，停止 stderr 微诊断，按现存预算顺序使用 Final Full **0/1**、Final QA **0/1**。Full 尽可能覆盖 Runtime、Launcher、Portable、Setup、beta.2→beta.3、C01—C15、U22/U23、Registry、binding、Firewall、LAN synthetic/isolated、lifecycle、核心 26/742、Artifact privacy；Full FAIL 即停。Full PASS 后独立 QA 用 GPT-6 Sol/High 一次；QA FAIL 即停，不预授权 QA2。额外 8.3 历史 110 PASS/0 FAIL/1 SKIP 若真实 Win10 和 Hosted 均无能力，记 `ENVIRONMENT_CAPABILITY_NOT_AVAILABLE`，不冒称 PASS；核心 26/742 仍 fail0、skip0。

全部受控 proof、Final Full、Final QA PASS 且 beta.3 Candidate Artifact 生成后，停在 `BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`，等待真实 Win10 Host 与同 LAN 第二设备人工验收。不得进入 Batch5/OCR/main/tag/Release。Master/T5 GPT-6 Sol/Medium，不使用 Astra，除非新的产品/架构级安全冲突。H1/H2 历史 2/2、M03 1/1 不扩额。
