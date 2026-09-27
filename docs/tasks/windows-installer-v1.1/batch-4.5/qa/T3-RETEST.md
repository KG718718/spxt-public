# B45-QA T3 R2 Retest

## 结论

**PASS（仅 T3 原 stale LAN URL P2 精确复验）**。精确整合基线：`d967786492b9100ec267f9bc5fb4aeac76abb2e7`；审查新增整合提交：

- `59f0a9bfa7090847e84ee689d536f38c939860d0`（来源 `77fc8cc`）
- `d967786492b9100ec267f9bc5fb4aeac76abb2e7`（来源 `3babad0`）

原 `T3-INTEGRATION-REVIEW.md` 的阶段 FAIL 作为历史保留，不改写。本 PASS 只闭合该 P2，不是 Batch 4.5 最终 QA，也不覆盖仍在返工的 T5。

## 静态复验

`verifiedFreshLANEndpoint` / `freshLANPresentation` 现在要求以下事实同时成立才生成可展示、可复制的 LAN URL：

- config、fresh discovery、Server state 和 state port 均存在；
- fresh discovery 的状态精确为 `SELECTED`；
- fresh candidate 与 Server candidate 均通过 private IPv4/CIDR/GUID校验；
- state port 等于 persisted config port；
- fresh adapter GUID 等于 persisted preference；
- Server 与 fresh discovery 的 GUID、IPv4、prefix length、subnet 全部一致。

`applyLANRefresh` 不再直接从可能过期的 `state.Selected` 重建地址，而只消费上述校验结果。因此 `NETWORK_CHANGED`、fresh selected 缺失或任一身份字段不匹配时，address/subnet 显示为 `-`，复制源为空。

修复没有把展示条件错误扩大为所有门禁必须 `LAN READY`：当 fresh adapter/IP/subnet/port 仍精确可信、仅 Firewall 状态为 `FIREWALL BLOCKED` 时，当前地址仍可展示和复制，符合既有 UX 边界。

## 定向测试

使用固定 Go `go1.27.1 windows/amd64`、独立 QA cache 和原 QA overlay，只运行风险对应三项：

```text
=== RUN   TestFreshDiscoveryMismatchRevokesCopyURL
--- PASS: TestFreshDiscoveryMismatchRevokesCopyURL (0.00s)
=== RUN   TestFreshDiscoveryMatchPublishesURLWhenFirewallBlocked
--- PASS: TestFreshDiscoveryMatchPublishesURLWhenFirewallBlocked (0.00s)
=== RUN   TestQAChangedNetworkCannotRepublishOldServerURL
--- PASS: TestQAChangedNetworkCannotRepublishOldServerURL (0.00s)
PASS
ok   ksession/windows-launcher
```

其中第三项是原先在 `bf6f87d` 上失败的同一最小反例：fresh discovery 为 `NETWORK_CHANGED/selected=nil`，Server state 仍含旧 `192.168.40.10`。本基线下 `currentLANURL()` 已保持为空。第二项验证 fresh `192.168.40.11/24` 与 Server/config 精确一致、仅 FirewallBlocked 时 URL 仍为当前地址。

## 范围限制

- Master 已完成四项定向测试；本 QA 未无理由重复全套 Node/Go/vet。
- 本轮只使用合成内存结构和零句柄 UI 调用；未读取或修改真实 NIC、Registry、Firewall、UAC、业务实例或发行 EXE，未运行 Hosted，未消耗专项/Full/QA Hosted 预算。
- 已撤回的 TCP table class 猜测不属于本轮缺陷，也未重新打开。
- 最终整合候选仍须执行完整独立 QA；本报告不授权 push、main、tag 或 Release。
