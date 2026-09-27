# B45-T4 RESULT — Minimal Windows Firewall Helper

## 结论

**PASS（Execution R2 本地实现与非提权反例）**。Master Review 与独立 QA 指出的启用后异常清理、真实脚本行为测试、32 位登记字段、INI binding、instance/root 相等路径，以及精确已启用规则在 ActiveStore/Profile 查询异常时未禁用的窗口均已修复。已新增独立 `tools/windows-firewall/` 最小 helper，实现闭合 CLI、安装/Runtime/绑定/config 信任校验、selected Private 实体网卡与 RFC1918 subnet 再验证，以及固定产品规则的只读状态和用户主动启用语义。

本结论不等于真实 Windows Firewall、UAC、Launcher 接线、Setup 打包、L22/L23 或端到端 LAN PASS。本任务没有在开发机创建、修改或删除防火墙规则，没有提权，没有运行 Actions。真实规则行为必须由 T5 在受控 Hosted Windows 专项中验证。

## 范围与文件

- 新增 `tools/windows-firewall/`：Go 1.27.1 标准库 helper、固定内嵌 PowerShell、构建脚本、测试专用隔离 cmdlet harness 和接口说明。
- 新增本文件。
- 未修改 Launcher/core、server、installer、workflow、Runtime schema、package/dependency 或业务文件。

## 固定接口与边界

- 仅接受 `status|enable --port 8080..8099 --adapter-guid <GUID>`；CLI GUID 可大小写/带一对花括号，内部 canonical 为小写无括号，拒绝全零。未知、重复、任意 program/path/remote/script/shell 参数拒绝。
- helper 固定位置 `<InstallRoot>\program\K-SESSION-Firewall.exe`；程序目标只能是同安装的 `program\runtime\node.exe`。从自身位置反推 root，不接受调用者提供路径。
- 逐层拒绝 UNC、非规范路径、ADS、重解析解析不一致；核验固定 HKCU AppId registration、32/64 view 无冲突（ProductKey 使用真实 `InstallLocation` 契约）、InstallRoot/Instance binding、uninstaller、UTF-16LE `uninstall/instance-binding.ini` 的 Schema/InstallRoot/Instance、beta.3 build-info、构建时 source/runtime manifest/node SHA 锚。已存在的32位key缺少任一字段按冲突拒绝，不能把字段缺失误当整键不存在；alternate-admin 无法证明原 HKCU 绑定时 fail-closed。
- 只读 `instance\lan-deployment.json` 且严格只允许 `{schema:1,port,adapterPreference}`；CLI 与 persisted port/GUID 必须完全一致。不读取业务 data、附件、备份、账号或 secret。
- PowerShell 由 `GetSystemDirectoryW` 定位，不信任继承的 SystemRoot/PATH/PSModulePath；只从系统目录固定加载 NetAdapter/NetConnection/NetTCPIP/NetSecurity。无 `cmd /c`、临时提权脚本、任意命令或 `ExecutionPolicy Bypass`，进程隐藏窗口；Go 构建固定 `-H windowsgui`。
- selected adapter 必须唯一、Up、非 Hidden、HardwareInterface、非 Virtual、Ethernet/Wi-Fi，名称/描述排除明显 VPN/virtual/tunnel/WSL/Docker/Hyper-V/TAP/TUN；NetworkCategory 必须 Private；唯一 Preferred/非 SkipAsSource RFC1918 IPv4；prefix 必须使整个 subnet 保持在相同私网块内，并存在该 NIC 的 on-link subnet route。无默认网关不作为硬门槛。
- 规则固定 Name/DisplayName/Group/Description，仅 Inbound TCP、persisted port、Private、selected interface alias、精确可信 subnet、固定 node.exe，EdgeTraversal Block。status 只读。未知同名规则冲突拒绝；已证明自有规则只在用户再次主动 enable 时更新。
- 新建/更新先保持 Disabled，全部 filters 核验后才 Enabled；`enable` 在确认规则为自有并持有 CIM object 后、调用任何可能抛错的 filter/ActiveStore/Profile 查询前即建立 cleanup 责任，后续任何异常均对该 object 做 best-effort Disabled。未知同名规则不写，status 始终不写，正常精确且 ActiveStore 有效时仍幂等零写。最终还核验 ActiveStore 中规则精确有效，Private profile Enabled 且未禁止本地/入站规则，否则 blocked 并禁用自有规则。
- 固定退出组：20 invocation、21 install trust、22 registration/binding/config、23 network unsafe、24 rule conflict、25 firewall blocked/operation、70 unexpected。UAC 1223 由 T3 映射 `FIREWALL BLOCKED`，不得重试且 Local 保持运行。

## 本地验证

使用已存在的固定 Go `go1.27.1 windows/amd64`，GOPROXY/GOSUMDB 关闭，独立 scratch cache：

- `go test -count=1 -v ./...`：12 个顶层测试及19个关键子反例 PASS。除原参数/路径/身份/config/静态/AST测试外，测试专用 harness 通过 mock `Import-Module/Net*` cmdlet 执行未改写的实际 `firewallScript`，覆盖新建先禁用、已有精确幂等、旧自有规则闭合更新顺序、未知同名不写、Public/过宽CIDR拒绝、status不修复、ActiveStore/GPO无效，以及更新前、Enabled后、最终查询异常都以自有规则 Disabled 收尾；R2新增精确已启用自有规则的 Profile 查询抛错、ActiveStore rule 查询抛错两项，均固定25且最后事件为 Disabled。harness 不调用真实 NIC 或 Firewall cmdlet，生产无 mock 入口。
- registry/INI 合成反例覆盖：真实 ProductKey `InstallLocation`、已存在32位key字段缺失/冲突、严格 UTF-16LE Schema 1、重复键、INI/registry/root/instance不一致，以及 `instance == InstallRoot` 显式拒绝；未读取开发机真实登记。
- `go vet ./...`：PASS。
- `git diff --check`：PASS。
- 本机系统模块/命令只读元数据核对：四个固定 module manifest 存在；所用 firewall filter cmdlet、PolicyStore、InterfaceAlias、EdgeTraversalPolicy 参数存在；`MSFT_NetProtocolPortFilter.Protocol` 的本机 CIM 元数据类型为 String，因此生产精确比较 `TCP`，未无证据放宽为任意值或数字6。
- `build.ps1` 编译烟测：PASS；产生的仅是临时 unsigned component build，注入的是明确标注的合成 runtime manifest hash，不是候选 Artifact，验证后已删除。
- 临时 EXE 黑盒：恶意 action 退出 20；可信安装层级不符退出 21；PE Subsystem=2（Windows GUI）。没有进入网络/规则操作。

首轮本地反例曾发现 `..` lexical alias 在 `filepath.Abs` 前被清理导致测试失败；实现已改为标准化前拒绝。R1行为测试首轮又发现记录文件 BOM 解析和故障注入时机问题，均只修正测试 harness 后重跑；真实脚本最终查询异常用例随后验证出旧 catch 无法禁用的风险，改为保留已确认自有 CIM rule object 并在 catch 中直接 best-effort disable。以上均经后续测试闭合，不能写成实际 Windows Firewall PASS。

## T5 必须注入/集成

1. 用候选同一精确 `SourceCommit`、`RuntimeManifestSha256`、固定 Node SHA256、`InstallerVersion=1.1.0-beta.3` 调用 `build.ps1`；禁止 `unbuilt`、仅版本/commit 判断或合成 hash。
2. 将 helper 作为受审 payload 安装到固定 `program\K-SESSION-Firewall.exe`，纳入 program inventory/manifest 和卸载清单；不得让未提权用户替换的外部 helper/脚本成为提权入口。
3. 与 T1 最终 `lan-deployment.json` 严格 schema/GUID 契约复核；同一 GUID 出现多个合法 IPv4/subnet 时当前 helper fail-closed。若需选择具体地址，须另定闭合参数契约，不能接受任意 remote。
4. T3 仅在用户主动点击时单次 `ShellExecute runas enable`；普通启动只可 `status`。UAC 拒绝不重试，Local 正常、LAN `FIREWALL BLOCKED`。
5. Hosted 受控 Windows 专项必须实际验证：Private/精确 subnet/program/port/interface/edge block、ActiveStore、生效策略、同名未知规则、幂等、显式变更、失败后禁用、Public/Any 不出现、UAC 拒绝 Local 保持。相同失败不得无修改 retry。

## 已知缺口/风险

- 本地未执行真实 firewall rule 或 UAC；所有实际规则结论仍为 NOT RUN。
- helper 自身不可在运行中证明自身二进制 hash；必须由 T5 将它纳入已审查 payload manifest，并由已验证 Launcher/Setup 固定调用。
- 企业 GPO、第三方 endpoint security 或系统策略可使规则不进入 ActiveStore；设计会 fail-closed，不能保证第二设备可达，也不能绕过公司网络隔离。
- persisted adapter GUID 只标识 NIC，不标识同 NIC 的多个 IPv4；当前歧义时拒绝，不猜测。

## Git

- baseline：`abb49599ca431d017dd8e3a7a07331eabe9cc61f`
- branch：`codex/b45-t4`
- 初版 local commit：`3ab36ca983c0152505507a1290a75c5c011835a6`（Master Review 后未整合）。
- R1 local commit：`4f0c5c8951e399581031d7d6f4549939997433e9`（Master 已 Review/整合）。
- R2 local commit：冻结后由结构化回单精确登记；本文件不自引用未生成 SHA。
- push/main/tag/Release/Hosted：均未执行。
