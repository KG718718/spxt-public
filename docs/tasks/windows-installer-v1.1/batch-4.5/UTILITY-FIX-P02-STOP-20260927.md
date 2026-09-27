# Batch 4.5 — Utility 最小修复后受控 Win10 P02 止损

**BLOCKED — CONTROLLED WINDOWS PRODUCTION DISCOVERY FAILED。** 网页版仅批准的 `WINDOWS_DISCOVERY_SCRIPT` 一行 Utility 显式导入已由原 T5 完成 F01—F12 12/12 合成/静态检查、Master 独立 Review，整合 `b4bd6b0`/`d9e9afd`，随治理 `bcf82b29a0ac322fb17f595fb428c3ea692fac99` 非 force 推至唯一公开开发分支。生产 diff 精确一行；新生产 Git blob `c3208b47cd93cf92989622b633a98cf994ce8712`，其余安全契约不变。

在真实 Windows 10 Pro x64 build19045 上，原 T5 从原工作树**仅一次**调用已推公开集成提交的受控 proof 入口。固定证据 `evidence/controlled-windows-proof-utility.json` 已由 Master 检查字段白名单、sourceCommit `bcf82b29a0ac322fb17f595fb428c3ea692fac99` 和生产文件 SHA-256 `c9267430e2a500bed546fec2b37dc140e46ba3ecb28438dc5ca60b6638e860bd`：`status=FAIL`，`reason=DISCOVERY_COMMAND_FAILED`，P01=true，P02=false；P03—P08 未到达，`privateCandidatePresent=false` 仅表示未到达候选判断，**不证明没有私网**。原 T5 local `192cd81` 的两文件证据/RESULT 经 Review 后整合为 `79f2ad8`。运行前 F01—F12 和 proof 合成共 19/19 PASS，不能代替实机失败。

M00/M01 历史 PASS、M02 历史 FAIL、M03 最小显式导入+序列化 PASS（1/1）均保留。新 P02 结果说明该一行改动**不足以使完整生产 discovery 通过**；固定分类仍不足以归因具体网络 cmdlet、模块加载或环境。原始 stdout/stderr、异常、IP、网卡、路径、网络身份及其 hash/长度均未保存。生产 stderr 非空 fail closed、系统 PowerShell/受限环境、Private/Public/VPN/virtual 等规则未放宽。

依最新批准第 11 节，T5 立即冻结。不得重跑 P01—P08，增加 M04/M05/新 S、显式导入 NetTCPIP/NetAdapter、忽略 stderr、增加 Hosted 网络诊断、动用 Final Full 或 QA。H1/H2 历史 2/2、M03 1/1；Final Full **0/1**、Final QA **0/1**仍未用。无 beta.3 最终 Artifact，未到 LAN HUMAN PENDING。后续仅治理收尾与网页版决策，见 `UTILITY-FIX-P02-DECISION.md`；不进入 Batch5/OCR/main/tag/Release。
