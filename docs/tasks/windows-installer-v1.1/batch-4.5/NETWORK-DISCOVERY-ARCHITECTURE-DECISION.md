# Batch 4.5 — 生产网络发现路线网页版决策卡

## 【当前事实】

Batch 4.5 仍 **BLOCKED — PRODUCTION DISCOVERY P02 FAILED**。M00/M01 PASS、M02 FAIL、M03 PASS；获批的一行 Utility 显式导入通过合成 F01—F12 12/12，但唯一真实 Win10 build19045 proof 在公开 source `bcf82b29a0ac322fb17f595fb428c3ea692fac99` 上 P01 PASS、P02 FAIL / `DISCOVERY_COMMAND_FAILED`，P03—P08 未到达。完整脚本的底层失败源未唯一确定，不能把 `privateCandidatePresent=false` 当成无 LAN。当前生产一行和 stderr fail-closed 原样保留；本轮只读评审没有运行测试、实机、Hosted 或 Actions。Final Full 0/1、Final QA 0/1 不动；无 beta.3 最终 Artifact。

## 【技术约束】

产品仍要求仅私有 IPv4、Private profile、真实以太网/Wi-Fi、排除 VPN/虚拟/隧道、selected subnet guard；未知信息一律拒绝。不得改 appVersion、业务 schema、升级可信来源或安装/回滚身份。现有 Go 1.27.1 离线构建和 Firewall helper 可作为工程模式，不能据此证明 Go 标准库已经安全实现 Network List Manager COM、无需管理员或能识别所有虚拟设备。微软官方 [IP Helper](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getadaptersaddresses)、[route table](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/nf-netioapi-getipforwardtable2) 和 [NLM Private category](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetwork-getcategory) 提供可评估接口；实机/权限尚未证明。详见 `NETWORK-DISCOVERY-ARCHITECTURE-REVIEW.md` 的逐项表和来源。

## 【可选方案及影响】

**A — 继续 PowerShell，重新定义封闭成功协议。** 初始改动面较小，仍需解决 cmdlet 警告/非终止错误/provider 异常/混合 stdout/部分结果。若继续任意 stderr 即失败，现有 P02 仍无通过证据；若改为严格 success envelope + exit0 优先于 stderr，这是安全协议变化，必须明确批准并以真实故障反例证明不会吞错。现有 Utility 行暂保留为已测基线，最终是否保留与新协议一起审查。

**B — 原生 Windows 只读 Network Discovery helper。** 可研究现有 Go 工具链 + IP Helper + NLM COM，在不调用 PowerShell、netsh 文本或公网服务的前提下读取 GUID/IPv4/前缀/介质/route/Private。优点是有机会摆脱已证明成本高的 PowerShell stream/模块差异；代价是 NLM COM、Go ABI/安全 DLL 加载、非管理员权限、虚拟设备辨认、严格 JSON 和新 EXE 的 program manifest/Setup/rollback 绑定均需证明。文档级 Win10/Win11 API 兼容不等于实机认证；如果需要管理员、cgo、复杂版本分支或不可审计新依赖，须再次返回网页版。新实现整合并获验时，应明确撤销旧 Utility 实验行或移除整段旧脚本，不让无效实验代码进入最终候选；本轮不得动它。

**C — 继续冻结。** 保留单机 beta 历史验收，Batch 4.5 和 LAN Host 继续 BLOCKED，不交付带失败 P02 的 beta.3；无新增工程和验证成本。此前投入不构成继续开发的理由。

## 【工程建议】

**有条件建议 B，但下一授权先限于 API/COM 可行性，不直接批准生产实现。** 第一门槛是普通用户权限下完整获取并可靠关联 Private profile、稳定 GUID、物理/虚拟状态、IPv4/前缀和 route；同时证明安全加载系统 DLL、可保持 fail-closed 与当前数据保护。若门槛失败或成本过高，立即停并在 A/C 间重选。推荐 B 是风险控制优先级，不是已经证明 B 更简单、更便宜或一定可行。

## 【需要网页版决定】

请选择一项并明确下一轮范围/预算：

1. **A**：批准 PowerShell 封闭协议设计；若要改变“stderr 非空即失败”，单独批准安全语义及验证条件。
2. **B（工程建议）**：先批准有界原生 API/COM 可行性门槛；其结果经 Master Review 后再决定是否批准生产 helper、实机 proof、Final Full/QA 和预算。
3. **C**：保持 Batch 4.5 冻结，LAN Host 暂缓。

本卡只申请后续决定；当前没有实施、额外诊断、Final Full/QA、main/tag/Release 授权。
