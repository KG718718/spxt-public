# K⁺-SESSION Windows Firewall Helper

此目录的最小 Windows Firewall helper 由 Batch LAN-2 复用。它不是通用防火墙工具，也不负责 UAC、Launcher UI、LAN listener 或候选网卡选择。用户先在 Launcher 明确选择接口；helper 仅在规则查询/启用时对这个已选接口做 fail-closed 安全复核。

## 固定接口

```text
K-SESSION-Firewall.exe status --port 8083 --interface-name Ethernet
K-SESSION-Firewall.exe enable --port 8083 --interface-name Ethernet
```

`interfaceName` 必须与 `lan-deployment.json` 中的名称逐字相同，且配置的 `enabled=true`。helper 拒绝空白、控制字符、明显虚拟/VPN 名称；不接受路径、程序、remote address、脚本或 shell 参数。Launcher 只可在用户主动点击“启用局域网访问”后，以 `ShellExecute(..., "runas", ...)` 单次调用 `enable`；UAC `ERROR_CANCELLED (1223)` 不重试，Local 服务保持运行并显示 `FIREWALL BLOCKED`。`status` 是只读动作，不修改规则。对 Launcher 的回执为 schema 2。

helper 固定安装于 `<InstallRoot>\program\K-SESSION-Firewall.exe`，自行反推安装根目录。它拒绝 UNC、重解析点、路径层级不符、HKCU 安装登记/绑定不符、32/64 view 冲突、`uninstall\instance-binding.ini` 的 UTF-16LE Schema/InstallRoot/Instance 与登记不符、alternate-admin 导致当前 HKCU 无法证明原用户绑定、Runtime manifest/node/build-info 锚不符，以及 `instance\lan-deployment.json` 与 port/interfaceName/enabled 不符的请求。它不读取业务 `data.json`、附件、备份、账号或 secret。

防火墙规则固定为 `KSESSION-LAN-Host-v1`，仅允许自己的 `runtime\node.exe`、Inbound TCP、persisted port、Private profile、当前 selected 实体 Ethernet/Wi-Fi 的精确 RFC1918 subnet 和 interface alias，并固定阻止 edge traversal。状态检查不更新旧规则。用户再次主动执行 `enable` 时，只有固定 Name、DisplayName、Group、Description 都证明为本产品管理的规则才可最窄更新；更新先禁用规则，全部 filter 核验后才重新启用，失败保持禁用。同名未知规则拒绝。最终还要在 `ActiveStore` 确认规则有效，且 Private profile 未禁止本地入站规则；否则返回 blocked 并禁用本地规则。不会创建 Public/Any Remote/Any Program 规则，也不会关闭防火墙或修改全局 profile。

固定 PowerShell 由 `GetSystemDirectoryW` 定位，只从受保护的系统模块目录加载 NetAdapter、NetConnection、NetTCPIP 和 NetSecurity；不信任继承的 `SystemRoot`/`PATH`/`PSModulePath`，不使用临时脚本或 `ExecutionPolicy Bypass`。这些命令只在已选接口的 Firewall 执行期核实物理网卡、Private profile、精确 IP/subnet/route 与规则，不参与 Node 候选枚举或自动决定可信公司网络；核实失败就拒绝授权。

## 构建接线

LAN-2 构建必须用 Go 1.27.1、`-H windowsgui` 和以下精确参数；禁止 `unbuilt` 或仅凭版本号信任：

- `SourceCommit`
- `RuntimeManifestSha256`
- 固定 Node 24.21.0 `node.exe` SHA256
- `InstallerVersion=1.1.0-beta.4`

`build.ps1` 会运行本目录测试后才输出 helper。测试专用 harness 会以同名 mock cmdlet 执行未改写的嵌入脚本，验证真实脚本的分支、规则写入顺序和异常清理；生产 CLI 没有 mock 开关或任意脚本入口。LAN-2 打包仍须把 helper 加入 payload/manifest，保持固定安装相对路径，并在受控 Hosted Windows runner 验证规则契约。此目录的本地测试不创建、查询、修改或删除开发机防火墙规则，不代表 L2-15/L2-16 或端到端 LAN 已通过。

## 跨模块依赖

- Node：`instance\lan-deployment.json` 严格 schema `{schema:2,enabled,interfaceName,port}`；不保存 IP。
- Launcher：单次 UAC、拒绝授权后的 Local 保持、固定状态映射；不得在普通启动时调用 `enable`。
- Installer：固定打包位置、构建锚注入、Artifact privacy 和 Windows Firewall 专项验证。

当 selected interface 同时出现多个合法 IPv4/subnet 时 helper 会 fail-closed，不取第一项。若产品以后要允许同一接口多地址中选择具体地址，必须先补充不接受任意 remote 的闭合跨模块契约。
