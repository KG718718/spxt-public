# B45-T5 Controlled Windows Production Discovery Proof 结果

## 结论

**BLOCKED / NEED PARENT DECISION。** 当前未修改的生产 `public-lan-network.js` 在受控 Windows 10 Pro x64 build 19045 上实际执行发现命令时返回固定 `NETWORK_DISCOVERY_FAILED`。本任务按批准卡立即停止；不能把此前 GitHub Hosted 的失败归因于 Hosted 独有环境，也不能进入阶段 B 或 Final Full。该结果不证明 LAN 产品设计失败，具体系统命令失败原因仍未知。

## 身份与边界

- 原任务工作树本地基线：`b8e3440358af1ca5f2d46455d052d77c211a4a46`
- Proof 工具提交：`26d44ab2e0bc1859d03394b7d9461c6ef8a707b1`
- 当前生产网络源码与本地基线的 Git blob 身份相同：`4e13e944472f845675fe73d176f063c4fe97f6ed`
- 固定证据：`docs/tasks/windows-installer-v1.1/batch-4.5/evidence/controlled-windows-proof.json`
- 证据中的生产源码 SHA256：`7f2ac479b3bf2f06bf90b34257aeed59db94c3b00ddf81dabd8b997b8c1e241e`
- Hosted H1/H2 历史 2/2 用尽；本任务未运行 Hosted、Final Full 或 QA。

## 实际结果

| 门禁 | 结果 |
| --- | --- |
| P01 安全系统 PowerShell 路径 | PASS；实际 `resolveSystemPowerShell()` 返回 |
| P02 Windows discovery 命令 | FAIL；实际 `runWindowsDiscovery()` 抛固定 `NETWORK_DISCOVERY_FAILED`，证据只记 `DISCOVERY_COMMAND_FAILED` |
| P03—P08 | NOT REACHED；固定 JSON 中为 `false`，不能视为失败原因或通过证据 |
| privateCandidatePresent | NOT MEASURED；固定 JSON 中为 `false`，不能推断没有 private 地址 |

Proof 工具先在内存保护 listener 创建入口，再调用当前生产函数。`runWindowsDiscovery()` 首次失败后未调用 `discoverWindowsLan()`，也未继续任何后续网络测试。Proof 工具未输出或保存原始系统命令 stdout/stderr 或异常正文。报告仅含固定 schema/status/platform/reason、Git 身份、P01—P08 布尔及 `privateCandidatePresent` 布尔；不含网络身份、系统路径或其 hash/长度。源码 SHA 仅对应公开生产文件，不对应网络输出。

## 本地合成反例与停止点

真实 proof 前，窄工具合成测试 7/7、fail 0、skip 0：覆盖 P01—P08 成功形状、`NETWORK_DISCOVERY_FAILED` 立即停止、无 private 候选、非法返回结构、只在内存比较前后状态、虚拟/VPN/tunnel 与 RFC1918 边界、报告额外字段与伪成功拒绝、非 Windows 10 停止。Node 语法与 `git diff --check` 通过。

因实际本机得到 `NETWORK_DISCOVERY_FAILED`，批准卡要求立即停止。本任务没有继续运行完整 LAN、兼容/事务或 Firewall 本地测试；前一任务的 62/62、45/45 与 Firewall 既有证据均不得冒充本轮复测。没有修改生产网络、Firewall、Registry、网卡、路由、DNS、网络 Profile 或 listener，也没有执行任何 Hosted。

## 需要 Master 处理

保留当前证据并提交网页版判断下一步生产发现诊断范围。只有获得新的具体授权、查明系统命令失败原因并重新完成受控 proof 后，才可考虑阶段 B；现有 Final Full 额度不能用于替代诊断。
