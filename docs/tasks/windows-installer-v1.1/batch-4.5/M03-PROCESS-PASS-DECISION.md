# Batch 4.5 — M03 PASS 后的最小生产修复决策卡

## 当前事实

真实 Win10 Pro x64 build19045 的唯一 M03 已运行一次，额度 **1/1**；固定四字段证据为 `{"schema":1,"status":"PASS","result":"EXPLICIT_IMPORT_SERIALIZATION_PASS","stderrEmpty":true}`。Master 已核对原 T5 的唯一 live 调用、固定证据、RESULT、仅两文件 local commit `26ec72a`，并整合为 `c1ae5a0`。M00 纯 .NET PASS；M01 独立进程显式 Utility 加载 PASS；M02 独立进程旧等价 ConvertTo-Json FAIL；M03 同一进程显式 Utility 加载后最小 ConvertTo-Json PASS。`stderrEmpty=true` 按现有生产相同的 `trim()` 判定成立，不是零字节证明，原始 stderr 按隐私规则未保存。生产 `public-lan-network.js` blob 仍 `4e13e944472f845675fe73d176f063c4fe97f6ed`，P02 仍 FAIL，P03—P08 未到达。

## 基于证据的推断与限制

显式预加载后该次最小序列化能够按当前进程判定干净完成，支持“Utility 自动加载/首次命令解析路径与旧 M02 的 stderr 有关”的假说。M02 与 M03 是不同进程、不同时间的调用；现有证据**不证明**这是唯一根因，也不证明完整生产发现的 `Get-Net*` 等命令没有另一个错误。不得忽略生产 stderr 或将 P02 写为 PASS。

## 提请网页版批准的最小方案

**建议 A：只在 `WINDOWS_DISCOVERY_SCRIPT` 开头、任何网络 cmdlet 与 `ConvertTo-Json` 之前，增加 `Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`；其余生产脚本、系统 PowerShell 解析、参数、`PSModulePath` 限定、超时、输出协议、stderr fail-closed、Private/VPN/虚拟网卡及 selected subnet 安全规则一律不改。** 该模块提供 `ConvertTo-Json`；[Microsoft 的 Windows PowerShell 5.1 文档](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json?view=powershell-5.1)明确其归属。现有 `resolveSystemPowerShell()` 固定系统 `powershell.exe` 且把子进程 `PSModulePath` 限为 Windows 系统模块目录；[Microsoft 模块路径说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_psmodulepath?view=powershell-7.6)说明系统模块默认位置和路径搜索机制。实际 M03 未记录模块文件路径，因此“本次实际加载文件的精确来源”**未单独取证**；实现 Review 须静态确认没有用户模块路径或路径覆盖，异常继续 fail closed。

此改动不计划修改 `PSModulePath`、安装模块或申请/增加管理员权限。Windows PowerShell 5.1 默认随 Windows 10 及以上客户端提供，见[微软版本说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_windows_powershell_5.1?view=powershell-5.1)；这是 Win10/Win11 的文档级兼容依据，**不是 Win11 实机通过证据**。显式导入在本机最小 M03 已通过，但完整发现能否通过仍须修复后的受控 Win10 P01—P08 实证。

批准 A 后的工程顺序限定为：原 T5 最小生产改动及合成反例 → Master Review → 一次获批 Controlled Win10 P01—P08（须全 PASS、`privateCandidatePresent=true`）→ 才考虑现存 Final Full 0/1、Final QA 0/1。若 P02 仍失败，按现有证据停止交网页版；**不追加** M04/M05/新 S/Hosted network diagnostic，也不忽略 stderr。

## 需要网页版决定

是否批准上述**一行显式 Utility 导入**作为受控生产修复，并在 Master Review 后按原安全边界执行一次 P01—P08？当前只提交方案，**未实施生产改动，也未运行 P01—P08、Final Full 或 QA**。若不批准，保持冻结。M03 1/1 后没有任何新增 PowerShell 微诊断额度。
