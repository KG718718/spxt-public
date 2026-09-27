# B45-T5-UTILITY-CONTROLLED-PROOF RESULT

## 结论

**FAIL — 真实 Win10 production discovery 仍停在 P02。** 唯一一次 P01—P08 proof 返回 `DISCOVERY_COMMAND_FAILED`；P01 PASS，P02 FAIL，P03—P08 NOT_REACHED，`privateCandidatePresent=false` 只表示未到达候选判定，不证明没有私网候选。不得宣称最小 Utility 修复解决了生产发现问题。

## 身份与执行边界

- 执行角色：原 B45-T5 / `codex/b45-t5-integration`；唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`。
- 被测代码：公开集成分支 `codex/lan-host-v1.1` 的本地 HEAD、跟踪 ref 与 GitHub 远端 SHA 均为 `bcf82b29a0ac322fb17f595fb428c3ea692fac99`；生产 Git blob `c3208b47cd93cf92989622b633a98cf994ce8712`，证据中的生产文件 SHA-256 为 `c9267430e2a500bed546fec2b37dc140e46ba3ecb28438dc5ca60b6638e860bd`。
- 平台核对为 Windows NT 10.0.19045。调用前输出目标不存在；从原 T5 工作树以公开集成工作树中 proof 脚本的绝对路径调用一次，脚本从自身目录加载公开生产代码。无第二次运行或修改参数重试。
- 调用前 `node --check` 两个文件通过；F01—F12 与 proof 合成测试共 19/19 PASS、fail0、skip0。合成 PASS 不替代真实 proof。

## 固定证据

- `evidence/controlled-windows-proof-utility.json`：`schema=1`、`status=FAIL`、`platform=WINDOWS_10`、`reason=DISCOVERY_COMMAND_FAILED`、`P01=true`、`P02=false`、`P03`—`P08=false`、`privateCandidatePresent=false`。
- 使用公开脚本的 `validateReport` 和 `gitIdentity` 复核字段白名单、身份及固定停止结果，PASS。证据不含原始 stdout/stderr、网络身份、地址、设备路径或其 hash/长度。
- P02 已触发停止。未追加 PowerShell/网络诊断，未运行 Hosted、Final Full、QA、监听或绑定；生产代码未在本轮修改。历史 H1/H2 2/2、M03 1/1；Final Full 0/1、QA 0/1 保持。

## 后续

本任务冻结并交唯一 Master Review。底层命令失败原因仍未闭合，需要网页版新的有界决定；本回单不授权绕过 `stderr` fail-closed、修改生产或继续真实/Hosted 试跑。无 beta.3 最终 Artifact，也未到 LAN 人工验收。
