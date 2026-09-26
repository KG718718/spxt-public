# B45-T1 RESULT — Network Discovery / Adapter / Subnet / Port / Deployment Config

## 结论

**PASS（限 B45-T1 独立模块与本地反例范围）**。实现提交：`24a909561906bfaf9c31d32c0b8c5d9bb34accde`。未修改 `server.js`、`public-startup.js`、`public-bootstrap-http.js`、Go Launcher 核心、Setup、CI、版本或依赖；未运行 Hosted，未读取或输出开发机真实 NIC 信息，未连接真实业务，未修改注册表、防火墙或路由。

## 已完成

- `public-lan-network.js`
  - Windows 固定 PowerShell 发现脚本：无用户命令拼接、`NoProfile` / `NonInteractive` / hidden window，只读取 Adapter、IPv4、route 与 Network Profile；失败不回显原始 stderr 或路径。生产调用不依赖 PATH：只接受本地盘符根的 `X:\Windows` SystemRoot，校验目录及固定 `System32\WindowsPowerShell\v1.0\powershell.exe` 为非链接真实系统路径后使用完整路径启动。
  - PowerShell 子进程环境不继承用户 `PATH` / `PSModulePath`：只传 `SystemRoot`、`WINDIR`、`PATH=<System32>` 和 `PSModulePath=<系统 WindowsPowerShell Modules>`，工作目录固定 System32，避免 Launcher 受限 PATH 下找不到及用户模块搜索劫持。
  - 严格 RFC1918：仅 `10/8`、`172.16/12`、`192.168/16`；提供 IPv4-mapped normalization、prefix/subnet/broadcast 与 selected-subnet membership 函数。
  - 候选必须同时具备：规范 InterfaceGuid、Up、Preferred IPv4、实体硬件、Ethernet/Wi-Fi media、非明显虚拟、Private profile、匹配 on-link route 或 default route。默认网关不是硬条件；无网关但有 matching on-link route 的实体 LAN 可用。未确认 profile 时 fail closed。
  - 单候选自动选择；多候选不按 metric 猜测；保存偏好消失返回 `NETWORK_CHANGED`。同一实体 Adapter 出现多个合法 IPv4 时也不取第一项：无偏好返回全部候选与 `MULTIPLE_LAN_ADAPTERS`，有同 GUID 偏好仍返回 `NETWORK_CHANGED`。
  - Adapter preference canonical：输入发现侧可带花括号/大小写，持久值必须为小写、无花括号、32 hex 的 `8-4-4-4-12` InterfaceGuid；不限制 UUID version/variant，拒绝全零。不保存 IP。
  - 端口仅允许 8080—8099；监听组合必须包含 `127.0.0.1`，最多再加一个严格 RFC1918 地址，拒绝 `0.0.0.0`、Public、重复/映射重复和多个 LAN 地址。
  - `findAndReservePort()` 按序实际 `listen()`；`reservePersistedPort()` 只试保存端口，冲突返回 `PORT_OCCUPIED`，不换号。成功返回仍持有的 server handles；T2 可通过 `createServer(address, port)` 注入已配置 handler 的 HTTP server，从探测起持续持有到正式运行，避免“探测后释放再绑定”的竞争。
- `public-lan-config.js`
  - 固定文件 `instance/lan-deployment.json`；严格且仅允许 `{"schema":1,"port":8080..8099,"adapterPreference":"<canonical-guid>"}`，未知字段、IP、非法类型均拒绝。
  - Instance、配置文件及其真实路径/链接边界检查；拒绝 symlink/junction/hardlink。保存采用同目录 `wx` 临时文件、fsync、复读、外部变更检查和 rename；失败清理自己的临时文件并保持旧配置。
  - 不读写 `data.json` / `config.json`，测试验证合成业务文件逐字节不变。
- 受限 CLI
  - `node tools/lan-host/network-cli.cjs discover [--adapter-preference <guid>]`
  - `node tools/lan-host/config-cli.cjs read --instance-dir <absolute>`
  - `node tools/lan-host/config-cli.cjs save --instance-dir <absolute> --port <8080..8099> --adapter-preference <canonical-guid>`
  - 输出只含固定 schema/status、必要 Host/Adapter/IP/Subnet 或配置；不回显 instance 路径、PowerShell 原始诊断或异常正文，不接受任意 shell/命令。

## 测试证据

环境：Windows `10.0.19045.0`，本地 Node `v24.14.0`，固定发现脚本由 Windows PowerShell `5.1.19041.6456` parser 实际解析；这不冒充目标 Runtime Node `24.21.0`。

命令：

`node --test --test-reporter=spec tools/tests/lan-host/network.test.cjs tools/tests/lan-host/config.test.cjs`

结果：**15 tests / pass 15 / fail 0 / skipped 0**。覆盖 RFC1918 边界、APIPA/Public/mapped/非法 prefix、虚拟/断线/未确认 profile、无 gateway 但 on-link 有效、多 NIC、不猜测、多 IPv4、偏好消失、DHCP 地址变化、固定 PowerShell 参数与语法、受限 PATH 下完整系统 PowerShell 定位、空/伪造/缺失/重定向 SystemRoot 拒绝、封闭子进程环境、8080—8099 真实顺序 bind、实际第二 Node bind 失败，以及独立 .NET Socket 对抗：先在空闲端口取得 `BOUND` 阳性对照，再显式设置并读回 `ExclusiveAddressUse=false` / `ReuseAddress=true`，仅以 BIND/LISTEN 阶段 Windows 10048/10013 作为抢占被拒证据。另覆盖保存端口冲突不换号、明确重新搜索、范围耗尽、损坏/未知配置、真实目录 junction、配置 hardlink、原子 rename 失败、外部变更及业务文件不变。

Node 24.21.0 官方文档说明 `exclusive:true` 的定义是 cluster handle 不共享及端口共享尝试报错，并非 `SO_EXCLUSIVEADDRUSE` 名称承诺：<https://r2.nodejs.org/docs/latest-v24.x/api/net.html>。因此本结论依据实际 bind 与持续持有 handle；不声称能够抵抗已攻陷本机的所有恶意内核/进程行为。

相关只读回归命令：

`node --test --test-reporter=spec tools/tests/public-startup.test.js tools/tests/public-startup-filesystem.test.js tools/tests/windows-installer/upgrade-preflight/preflight.test.cjs`

结果：Node 汇总 **23 tests / pass 22 / fail 0 / skipped 1**，同时 `public-startup.test.js` 自报 **80 checks PASS**。唯一 skip 是既有 Windows file-symlink privilege 分支；真实 junction 覆盖通过。本任务自身 15 项无 skip。

静态：四个新增 CLI/模块 `node --check` 通过；`git diff --check` 通过。

## T2 / T3 / T4 / T5 接线清单

1. T2 必须把已配置 HTTP handler 的 server factory 传给 port reservation，并直接使用返回的两个 handles（`127.0.0.1` + `selected.address`）；不得释放后重新 probe/bind。保存端口冲突只显示 `PORT OCCUPIED`。正式 listen 后地址变化或 listener error 仍须保留原 port 并映射固定状态。
2. T2 的 remote peer guard 直接复用 `normalizeIPv4()` 与 `isAddressInSubnet(remote, selected.address, selected.prefixLength)`；不能复制一套宽松 RFC1918 判断。First Admin、本机门禁和 HTTP handler 不属于 T1，仍由 T2 实现。
3. T2 在现有 `startupOptions.priorFiles` 中加入固定 `instance/lan-deployment.json`，防止 `data.json` 缺失而 LAN 配置尚存时被误判 fresh install。`public-startup.js` 本体无须放宽 schema；本任务按授权只报告，未改共享启动文件。
4. T3 通过两个受限 CLI 发现/显示/保存；必须用可信 Windows OS API 提供真实 `SystemRoot` 给 Node 环境，不接受 UI/配置/CLI 自定义系统路径。必须转义展示 Host/Adapter 字符串。退出码：发现 `0=SELECTED`、`10=MULTIPLE_LAN_ADAPTERS`、`11=NETWORK_CHANGED`、`12=NO_PRIVATE_LAN`、`20=安全失败`；配置 `0=成功`、`10=NOT_CONFIGURED`、`20=安全失败`。用户明确“重新寻找可用端口”后才调用 find/save 新端口。
5. T4 严格读取同一 `lan-deployment.json`，GUID canonical 与上述一致；不得引入另一份 NIC/IP 可信逻辑或持久 IP。
6. T5 必须把 `public-lan-network.js`、`public-lan-config.js` 和所需 CLI 加入 Runtime/Setup 精确 allowlist、manifest/hash/打包测试；升级、卸载、重装及 rollback 必须保留该文件。现有 upgrade preflight 对 initialized instance 的未知普通文件会安全遍历并保留，不需放宽；uninitialized shape 不允许该文件，符合“先 Host 创建 Admin，再配置 LAN”的批准顺序。

## 已知限制 / 未完成

- 未在开发机执行真实 NIC discovery，避免把真实 Adapter/IP 带入测试或报告；仅使用合成 records，实际脚本只做 parser 验证。Win10 实机发现、DHCP/多 NIC 与 Private profile 行为仍须后续受控集成/人工验证，且不得把真实 NIC 收进 Hosted Artifact。
- 本地 Node 为 24.14.0；目标 Runtime 24.21.0 的相同测试须由 T5/Hosted 执行。本任务未消费专项、Full 或 QA Hosted 预算。
- 尚未接入 Server、Launcher、Firewall helper、Setup/升级/CI；本 PASS 不等于 L01—L28、Batch4.5 或 Artifact PASS。
- 一个 Adapter 多个合法 IPv4 当前安全停为 `NETWORK_CHANGED`/多候选。若产品要让用户在同一 Adapter 内临时选地址，需要 T2/T3 设计仅会话选择且仍不得持久化 IP；本任务未擅自增加该产品行为。
