# K⁺-SESSION Windows Firewall Helper

此目录是 Batch 4.5 的最小 Windows Firewall helper。它不是通用防火墙工具，也不负责 UAC、Launcher UI、LAN listener 或网络发现。

## 固定接口

```text
K-SESSION-Firewall.exe status --port 8083 --adapter-guid 12345678-1234-1234-1234-123456789abc
K-SESSION-Firewall.exe enable --port 8083 --adapter-guid 12345678-1234-1234-1234-123456789abc
```

CLI 的 GUID 可含一对花括号并使用大小写；进入 helper 后统一为小写、无花括号。`lan-deployment.json` 必须已经保存 canonical GUID。除此之外不接受任何路径、程序、remote address、脚本或 shell 参数。Launcher 只可在用户主动点击“启用局域网访问”后，以 `ShellExecute(..., "runas", ...)` 单次调用 `enable`；UAC `ERROR_CANCELLED (1223)` 不重试，Local 服务保持运行并显示 `FIREWALL BLOCKED`。`status` 是只读动作，不修改规则。

helper 固定安装于 `<InstallRoot>\program\K-SESSION-Firewall.exe`，自行反推安装根目录。它拒绝 UNC、重解析点、路径层级不符、HKCU 安装登记/绑定不符、32/64 view 冲突、`uninstall\instance-binding.ini` 的 UTF-16LE Schema/InstallRoot/Instance 与登记不符、alternate-admin 导致当前 HKCU 无法证明原用户绑定、Runtime manifest/node/build-info 锚不符，以及 `instance\lan-deployment.json` 与 port/GUID 不符的请求。它不读取业务 `data.json`、附件、备份、账号或 secret。

防火墙规则固定为 `KSESSION-LAN-Host-v1`，仅允许自己的 `runtime\node.exe`、Inbound TCP、persisted port、Private profile、当前 selected 实体 Ethernet/Wi-Fi 的精确 RFC1918 subnet 和 interface alias，并固定阻止 edge traversal。状态检查不更新旧规则。用户再次主动执行 `enable` 时，只有固定 Name、DisplayName、Group、Description 都证明为本产品管理的规则才可最窄更新；更新先禁用规则，全部 filter 核验后才重新启用，失败保持禁用。同名未知规则拒绝。最终还要在 `ActiveStore` 确认规则有效，且 Private profile 未禁止本地入站规则；否则返回 blocked 并禁用本地规则。不会创建 Public/Any Remote/Any Program 规则，也不会关闭防火墙或修改全局 profile。

固定 PowerShell 由 `GetSystemDirectoryW` 定位，只从受保护的系统模块目录加载 NetAdapter、NetConnection、NetTCPIP 和 NetSecurity；不信任继承的 `SystemRoot`/`PATH`/`PSModulePath`，不使用临时脚本或 `ExecutionPolicy Bypass`。

## 构建接线

T5 必须用 Go 1.27.1、`-H windowsgui` 和以下精确参数构建；禁止 `unbuilt` 或仅凭版本号信任：

- `SourceCommit`
- `RuntimeManifestSha256`
- 固定 Node 24.21.0 `node.exe` SHA256
- `InstallerVersion=1.1.0-beta.3`

`build.ps1` 会运行本目录测试后才输出 helper。测试专用 harness 会以同名 mock cmdlet 执行未改写的嵌入脚本，验证真实脚本的分支、规则写入顺序和异常清理；生产 CLI 没有 mock 开关或任意脚本入口。T5 还需把 helper 加入候选 payload/manifest，保持固定安装相对路径，并在受控 Hosted Windows runner 验证真实规则。此目录的本地测试不创建、查询、修改或删除开发机防火墙规则，不代表 L22/L23 或端到端 LAN 已通过。

## 跨模块依赖

- T1：`instance\lan-deployment.json` 严格 schema `{schema:1,port,adapterPreference}`；GUID canonical 为小写无花括号，拒绝全零。
- T3：单次 UAC、拒绝授权后的 Local 保持、固定状态映射；不得在普通启动时调用 `enable`。
- T5：固定打包位置、构建锚注入、Artifact privacy 和实际 Windows Firewall 专项测试。

当 selected adapter 同时出现多个合法 IPv4/subnet 时 helper 会 fail-closed，不取第一项。若产品以后要允许用户在同一 GUID 下选择具体地址，必须先补充不接受任意 remote 的闭合跨模块契约。
