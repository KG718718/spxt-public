# B45-QA T3 Integration Review

## 结论

**FAIL / NEED REWORK（仅 T3 整合阶段）**。精确基线 `bf6f87ded76b8591899accdbfb47cfde746c9f3a`；只读审查 T3 整合提交：

- `d623cdfffb2e916890b770d6297fdf9839a3a412`
- `bf6f87ded76b8591899accdbfb47cfde746c9f3a`

确认一个 P2：fresh discovery 已判定网络变化、当前适配器身份不再可信时，Launcher UI 仍会从 Server 的旧 `state.Selected` 重建可复制 LAN URL。该结果违反 DHCP/网络变化后不得继续发布旧地址的要求。本结论不是 Batch 4.5 最终 QA，也不覆盖尚在返工的 T5。

## P2：`NETWORK CHANGED` 后仍可复制旧 LAN URL

### 已确认事实

- `lan_windows.go:555-578` 每次刷新执行 `discoverPreferred`。当 fresh discovery 不再得到匹配的 adapter/IP/subnet 时，`adapterValid` 为 false，但 `result.state` 仍保留此前从 Server status 取得的旧 `Selected`。
- `lan_windows.go:606-615` 只在 `result.err && result.state == nil` 时清空并提前返回；fresh discovery 不匹配但 Server 仍返回旧 state 的路径不会进入该分支。
- `lan_windows.go:647-655` 随后不检查 fresh discovery 是否仍与 config/state 一致，也不检查 `NETWORK_CHANGED`，直接用旧 `result.state.Selected.Address` 和 port 重建 `c.lanURL`。
- `lan_windows.go:586-592` 在 pending result 被 UI 消费、`lanBusy` 清除后直接返回该 URL；“复制局域网地址”按钮因此可复制旧 IP。

### 最小合成反例

通过 Go overlay 注入一个仅内存/UI 状态反例：

- persisted config：GUID `01234567-89ab-4cde-8f01-23456789abcd`、port `8083`；
- fresh discovery：`NETWORK_CHANGED`、`selected=nil`；
- Server 旧 state：仍含 `192.168.40.10/24`；
- 调用 `applyLANRefresh()` 后读取 `currentLANURL()`。

实际结果：

```text
=== RUN   TestQAChangedNetworkCannotRepublishOldServerURL
NETWORK CHANGED republished stale LAN URL: "http://192.168.40.10:8083/login.html"
--- FAIL: TestQAChangedNetworkCannotRepublishOldServerURL
FAIL ksession/windows-launcher
```

测试使用固定 Go `go1.27.1 windows/amd64`，只使用合成结构和零句柄 UI 调用；未读取或修改真实 NIC、注册表、Firewall、UAC 或业务实例。

### 影响与闭合条件

DHCP 变化、适配器消失或 fresh adapter identity/IP/subnet 不匹配的短窗口内，UI 虽显示非就绪状态，却仍可向用户提供过期地址，违背“每次重新读取当前地址”和网络变化后撤销旧复制源的安全/UX门禁。

最小闭合条件：只有 fresh discovery 已证明当前 selected 与 persisted config、Server state 的 GUID/IP/prefix/subnet 一致时，才允许从该 state 发布或复制 LAN URL；`NETWORK_CHANGED` 或缺少可信 fresh 证据时保持 URL 为空。不能据此扩大为所有非 `LAN READY` 都隐藏地址：例如当前 adapter/IP 仍经 fresh 校验、仅 Firewall 单独阻塞的既有展示语义不在本缺陷范围。

## 已确认的正向证据

- 首个 Admin 后的自动发现、多网卡显式选择、持久端口冲突不静默换号、显式重选确认、设置 worker 串行及 UI 消费前持续持锁的控制流已接入。
- `LAN READY` 聚合包含 child、config、adapter、port、Server listener/health、fresh Local/LAN probe、PID listener ownership、Firewall 和 remote-bootstrap 门禁；旧复制 URL 在 transition 启动及无 state 的失败刷新中会撤销。
- helper 使用固定路径与 Launcher 内嵌 hash；普通刷新只调用 `status`，用户点击才单次 `runas enable`；受限 Node CLI 环境不继承任意宿主环境。
- Master 已独立取得 Node 37 / Go 25+11 / vet fail 0、skip 0；本阶段没有无理由重复相同全套测试。

## 撤回线索与范围限制

- 审查中曾错误假设 `GetExtendedTcpTable` 的 table class `3` 为 `OWNER_PID_ALL`。Windows 枚举中 class `3` 实为 `OWNER_PID_LISTENER`，`OWNER_PID_ALL` 为 `5`；“已建立连接被当成额外 listener”线索已撤回，不是缺陷，也未进入结论。
- 本轮未运行真实 NIC discovery、双 listener、UAC、Firewall、第二设备、发行 EXE 或 Hosted；未消耗专项/Full/QA Hosted 预算。
- T5 两项 P2 仍在原执行线程返工，本报告未重复扫描其 WIP。T3 修复整合后须在同一 QA thread 以精确新 baseline 复验。
