# B45-QA Early Security Retest

## 结论

**PASS（仅原两个 P2 的早期安全复验）**。精确 baseline：`b0e51b54744c944ce68a5730d9b8d279b72db9a0`，branch：`codex/b45-qa-r1`。T1 的 Node/Go 配置解析对同一组字节已严格一致；T4 的既有精确启用规则在 Profile 或 ActiveStore 查询异常时会禁用已确认自有规则。旧 `EARLY-SECURITY-REVIEW.md` 的 baseline FAIL 作为历史保留，不改写。

本 PASS 不是 Batch 4.5 整体 QA PASS，不覆盖尚在实施/集成的 T3、T5，也不代替真实 Win10、UAC、Firewall、Private NIC、第二设备、Hosted、Full Candidate、Artifact privacy 或 26/742 回归。

## P2-1：严格 LAN 配置跨层一致性

使用完全相同的 13 组 JSON bytes 分别调用当前 Node `createLanConfigStore` 与当前 Go `strictConfig`：

|Corpus|Node|Go|
|---|---|---|
|canonical exact keys|ACCEPT|ACCEPT|
|escaped canonical key `\u0073chema`|ACCEPT|ACCEPT|
|直接 duplicate key|REJECT|REJECT|
|escaped-equivalent duplicate key|REJECT|REJECT|
|`Schema` / `PORT` / `AdapterPreference` 大小写变体|REJECT|REJECT|
|`8080.0` / `8.08e3` / `schema:1e0`|REJECT|REJECT|
|前导零 `08080` / 负零 `-0`|REJECT|REJECT|
|尾随第二 JSON value|REJECT|REJECT|

结果：原重复 key last-wins 及后续发现的数值词法/字段大小写分歧均未复现。Node 的标准生成仍输出固定三字段 canonical JSON；损坏配置拒绝及原文件不覆盖由定向测试覆盖。

证据：

- `node .test-work/b45-qa/corpus-retest.cjs`：13/13 与期望一致。
- Go 1.27.1 使用 overlay 仅注入 QA 测试、不改仓库 tests/production；`TestQAEarlyRetestSameByteCorpus`：13/13 PASS。
- `node --test tools/tests/lan-host/config.test.cjs tools/tests/lan-host/network.test.cjs`：18/18 PASS，fail 0，skip 0。本机 Node `24.14.0`，不冒充目标 `24.21.0`。

## P2-2：Firewall ActiveStore/Profile 异常清理

复用早期未改写生产 `firewallScript` 的隔离 cmdlet harness，对 owned/exact/Enabled 既有规则注入 ActiveStore/Profile 查询异常：

- 原 QA 最小反例现输出 exit 25 / `FIREWALL_OPERATION_FAILED`，并记录 `set-rule, Enabled=False`；不再出现旧版空事件。
- 仓库 `exact existing profile-query exception disables owned rule` 与 `exact existing active-query exception disables owned rule` 均 PASS。
- 正常 exact existing 仍幂等零写；`status` 仍只读；unknown same-name rule 仍零写冲突拒绝。

证据：

- `node .test-work/b45-qa/repro-t4.cjs`：`status:25`，最后事件 `enabled:"False"`。
- 指定 Go 1.27.1、独立规范绝对路径 `GOCACHE/GOTMPDIR/TEMP`：相关 verbose 测试 PASS；`go test -count=1 -overlay=<QA overlay> ./...` PASS；`go vet -overlay=<QA overlay> ./...` PASS。
- 全程只运行合成/mock；未查询或修改真实 NIC、Firewall、注册表，未提权。

## 残余边界

- T2 `healthFailed()` 孤立线索已在旧报告撤回，本轮不重开，也没有新证据推翻该撤回。
- helper 的真实 UAC/Windows Firewall cmdlet/ActiveStore/GPO行为仍是 NOT RUN；隔离 harness 不能替代真实系统验证。
- 未检查 T3/T5 未完成内容、最终构建接线、目标 Node、真实 LAN 双设备、升级生命周期或 Artifact。正式 LAN Candidate 出现后必须在同一 QA thread 更新 baseline 并执行完整 B45-QA。
- 本复验未使用 Hosted，不授权 push、main、tag 或 Release。
