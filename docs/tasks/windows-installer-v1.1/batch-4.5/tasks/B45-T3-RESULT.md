# B45-T3 RESULT — Launcher LAN UX / Host Status

## 结论

**PASS（限 B45-T3 Launcher/CLI 实现与合成本地验证）**。Launcher 已接入 T1 网络/配置与 T2 本机只读状态，聚合固定 LAN 状态、11 项 `LAN READY` 门禁、当前 Host/Adapter/IPv4/Subnet/Port/Local URL/LAN URL、复制地址、多网卡明确选择、确认重选端口及 T4 helper 单次提权入口。未执行 Hosted、真实 NIC、真实 UAC/Firewall 或第二设备访问；不代表 L01—L28、Artifact、完整回归或 Batch 4.5 PASS。

## 实现与安全边界

- 新增 `tools/lan-host/launcher-cli.cjs`：只提供 `discover|configure|select|reselect` 闭合命令。首次配置在停止自己精确 owned child 后调用 T1 实际 8080—8099 reserve，释放 probe 后保存并由正式 Server 再 bind；竞态仍映射 `PORT OCCUPIED`，不声称句柄传递。`select` 保留原 port；`reselect` 只在用户确认后范围重选。未知/重复/任意 path/program 参数拒绝。
- Launcher 的 LAN 构建只在内嵌合法 `FirewallHelperSha256` 时启用；空 hash 保留旧纯 Local 模式。构建接口固定 `-FirewallHelperSha256 <lowercase sha256>`，供 T5 按 Runtime→helper→Launcher→Portable/Setup 顺序接线；Runtime identity schema 不变。
- Node 与受限 CLI 的 `SystemRoot` 来自 `GetSystemDirectoryW`，不信任继承环境；子进程只传 allowlist，不传 `NODE_OPTIONS`、secret/token/cookie、任意 shell。日志不再记录 Node 绝对路径，也不记录 Host/NIC/IP/Subnet。
- 精确 socket ownership 同时读取 IPv4/IPv6 owner PID listener 表：最终 child 只能持有 `127.0.0.1:<port>` 与当前 selected private IPv4 同 port；wildcard、第三 NIC、其他 port、重复行及任何 IPv6 listener 均拒绝 `LAN READY`。
- 每次最终聚合重新执行 Local login hash probe 与当前 LAN URL login hash self-probe，不仅使用 T2 缓存 health。Host self-test 仅显示 `HOST READY — EXTERNAL LAN ACCESS NOT CONFIRMED`，明确 VLAN/Guest/AP 隔离风险，不冒充第二设备通过。
- `/api/lan/status`、T1 discovery/config 与 T4 status JSON 均校验精确大小写 key、重复 key、未知字段、尾随对象及嵌套对象结构；Server status 缺少 Adapter Name 时从同轮 T1 discovery 按 GUID/IP/prefix/subnet 关联，不放宽状态 schema。
- `LAN READY` 仅在 Server alive、Admin 已建、adapter/private IP、persisted port、精确 ownership/bind、LAN listener、fresh Local health、fresh Host LAN self-test、Firewall allowed、remote bootstrap closed 全部满足时出现；未知/伪造 Server status 不可升级为 READY。
- 多 NIC 不猜测；显示 Adapter Name/IPv4/Subnet 后由用户明确选择。DHCP 每轮从本机状态重算，IP 不持久化；失败或网络变化先撤销可复制旧 URL。
- 保存 port 被占用时不静默换号、不杀外部进程、不新增临时 Local 端口；Launcher 控制窗口保留并显示保存 port，只有用户确认“重新寻找可用端口”才更改。设置过渡在后台串行，先停止自己的 child，UI 消息线程不等待 CLI/重启。
- helper 固定 `program/K-SESSION-Firewall.exe`，调用前校验真实普通文件、无 reparse、SHA 与 Launcher 内嵌值一致。普通刷新只执行 `status`；只有用户点击才单次 `ShellExecuteExW runas enable`。UAC 拒绝不重试且不停止 Local child；不接受任意 exe/remote/script/PowerShell 参数。

## 修改文件

- `tools/windows-launcher/build.ps1`
- `tools/windows-launcher/core.go`
- `tools/windows-launcher/main_windows.go`
- `tools/windows-launcher/lan_core.go`
- `tools/windows-launcher/lan_windows.go`
- `tools/windows-launcher/lan_core_test.go`
- `tools/windows-launcher/lan_windows_test.go`
- `tools/lan-host/launcher-cli.cjs`
- `tools/tests/lan-host/launcher-cli.test.cjs`
- 本结果文件

未修改 T1/T2/T4 生产模块、Server/bootstrap、Firewall helper、installer/Runtime/workflow、业务 schema、instance 结构或版本。

## 本地验证

环境：Windows 10 `10.0.19045.0`；固定 Go `go1.27.1 windows/amd64`；本机 Node `v24.14.0`。只使用合成身份/地址/目录与 owned loopback 端口；未读取真实 NIC/登记/Firewall，未提权。

1. Launcher Go 专项及既有安全单测：**21 个选定顶层测试 PASS**（其中 `LAN READY` 11 个逐项缺失反例全部非 READY），fail 0 / skip 0。覆盖两种启动模式、固定状态、strict JSON/CIDR、wildcard/第三 NIC/其他 port/IPv6/伪 PID 行拒绝、fresh self-probe、stale URL 撤销、复制源、persisted port 不 fallback、控制窗口保留、helper 篡改、UAC 拒绝 Local 不变、设置后台串行与首次 probe 前释放自己的 child。
2. `go vet ./...`：PASS。
3. `node --test` Launcher CLI + T1 network/config + T2 server/server-startup：**32 tests / pass 32 / fail 0 / skipped 0**。
4. 固定 Go 的 Windows GUI Launcher 编译烟测（合成 commit/runtime/helper hash）：PASS；临时 EXE 与 cache 已删除，不作为发行物。
5. `build.ps1` PowerShell parser、`node --check tools/lan-host/launcher-cli.cjs`、`git diff --check`：PASS。

另尝试包含 `server-runtime.test.cjs` 的本地组合时，其中 2 项因本工作树没有 `multer`/完整 `node_modules` 而在加载 `server.js` 前失败；没有下载依赖或把环境失败冒充实现失败。T2 非 runtime 的 10 项及其余 T1/Launcher 22 项随后独立通过；目标 Runtime 24.21.0 与完整依赖由 T5/Hosted 复验。

## 已知限制 / T5 与人工后续

- T5 必须先构建 T4 helper，再把其真实 SHA256 传给 Launcher `-FirewallHelperSha256`；把 helper、`tools/lan-host/launcher-cli.cjs` 及 T1 CLI/模块加入候选 allowlist/inventory/Setup，并验证 build-info/program manifest/rollback/卸载重装保持。
- 真实 Win10 NIC discovery、多 NIC 交互、DHCP、真实双 listener、真实 UAC 1223、Firewall ActiveStore/Private 精确规则、第二设备与双客户端均为 NOT RUN；须由受控 Hosted/最终人工阶段完成。
- 本地 Node 不是目标 Runtime 24.21.0；完整 Launcher/Portable/Setup/26套742项未由本任务运行。本任务未消费 Hosted 预算，未 push/main/tag/Release。

## Git

- baseline：`4b83380c5a6ebe6090af69415c9191c18779c4d1`
- branch：`codex/b45-t3`
- local commit：由结构化回单填写最终 SHA
- push/main/tag/Release/Hosted：均未执行
