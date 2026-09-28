# Batch LAN-2 — Manual Adapter LAN Host

## 授权与基线

用户于 2026-09-28 明确授权新独立 Batch。Batch 4.5 保持 `FROZEN — LAN HOST DEFERRED`，其代码、研究、失败证据不改写。唯一集成分支 `codex/lan2-manual-host-v1.1` 从冻结 HEAD `43914744c0b74031fb2d20c849c7500408e0a85a` 建立。不得修改 main、v1.0.0、Batch 4 历史或 beta.2 受验 Artifact；不得 tag/Release/force push。唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`，旧 Master 永久只读。

## 产品契约

候选安装器 `K-SESSION-Setup-1.1.0-beta.4.exe`，appVersion 1.0.0、dataContractVersion 1、业务 schema 与 AppId 不变。直接升级仅受验 F3 beta.2→beta.4；beta.3 不发布且不作为可信来源。必须复用精确 beta.2 身份、事务、rollback、instance/账号/附件保护，不重定义 Batch 4 或 Batch 4.5 证据。

LAN 开启由 Host 用户显式操作：本机创建首 Admin→打开局域网设置→从 Node `os.networkInterfaces()` 枚举的合法 RFC1918 IPv4 候选中选公司/家庭网络→勾选可信非公共/访客网络确认→按 8080—8099 真实 bind 找端口并保存→用户点击开启→必要时一次 Firewall UAC→Launcher 展示 LAN URL→第二设备浏览器访问。即使单候选也不自动启用。客户无需 Agent/Codex/ChatGPT/Node/npm/Git/命令行。

候选仅非 internal IPv4，合法 netmask/prefix，10/8、172.16/12、192.168/16；拒绝 loopback、APIPA、公网及名称明显的 VPN/Tunnel/WSL/Docker/Hyper-V/VMware/VirtualBox/TAP/TUN/Loopback。候选列表与用户选择不依赖 PowerShell Get-Net*、NLM、Native IP Helper 或 Windows Public/Private profile 自动发现。用户选定后保存 interfaceName 和配置身份、port、enabled preference，不保存 IP；每次启动重新验证该接口及唯一合法地址。接口消失、改名、无合法地址或多地址歧义为 `NETWORK_CHANGED`，不得自动换网卡。selected IP + netmask 计算子网，只监听 `127.0.0.1:<port>` 与 `<selected-IP>:<port>`，禁止 `0.0.0.0`。

第一次在 8080—8099 真实 exclusive bind 后持久化 port。保存端口冲突显示 `PORT OCCUPIED`，不得漂移；只有用户明确要求重新选端口才更改。独立 deployment config 语义 schema 2，含 enabled/interfaceName/port；不改 `data.json`。升级、卸载、重装保留配置；DHCP 改变时重算 URL 与 subnet。

首 Admin 仅 Host loopback 可创建；未初始化时 LAN 客户端得 `HOST_INITIALIZATION_REQUIRED`。LAN remote peer 必须处于所选子网，不能只依赖 Firewall。沿用 Batch 4.5 Firewall helper：Inbound TCP、精确 port、Private profile、选中子网受控范围、Host executable；不得 Public/Any Port/Any Program。Setup 不要求管理员，仅用户点击开启时可请求 UAC；拒绝后 Local 正常、LAN 显示 `FIREWALL BLOCKED`。不自动更改 Windows Network Profile，Public 环境提示用户检查 Private 设置。

Launcher 展示 Host Name、Selected Network、IPv4、Subnet、Port、Local/LAN URL 和状态；提供复制 LAN URL、修改网络、重新选端口、开启/关闭 LAN。状态至少 `LAN DISABLED`、`NEEDS NETWORK SELECTION`、`HOST INITIALIZATION REQUIRED`、`NETWORK CHANGED`、`PORT OCCUPIED`、`FIREWALL BLOCKED`、`LAN START FAILED`、`LAN READY`、`HOST READY — EXTERNAL ACCESS NOT CONFIRMED`。只有 Admin 初始化、选中接口/IPv4/subnet/port有效、两个明确监听成功、LAN URL Host self-test、peer guard 和 Firewall 状态满足，才显示 `LAN READY`；Host 自测不等于外部设备可达。

正常 LAN 生产路径不得调用 Batch 4.5 `WINDOWS_DISCOVERY_SCRIPT`。旧 Utility 实验行 `NOT APPROVED FOR RELEASE`，不进入 beta.4 有效生产路径。历史 Git/报告证据保留。

## 验证与止点

验收矩阵见 `ACCEPTANCE.md`。真实 Win10 可做只读接口枚举、当前 RFC1918 接口选择、ephemeral bind、本机/LAN self-test、启停 listener；不得自行改 Windows profile、route、DNS、系统配置，或未经用户操作触发 Firewall UAC。真实 Firewall/UAC 和第二设备为最终用户人工验收。Hosted 仅 build/synthetic/upgrade/rollback/26/742/Artifact/privacy/installer，不为 Hosted 虚拟网卡开发兼容逻辑。Full Candidate 最多 2 次，Final QA 最多 1 次；同一失败不得无修改 retry。

普通工程问题 Master 自主定位、修复、Review、测试。仅产品/安全行为改变、新主技术栈或管理员权限、schema/权限模型、beta.2可信来源改变、连续无法安全恢复或最终候选完成，才返回网页版。最终自动停 `BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`，不自动进入 Batch5/OCR/main/tag/Release。
