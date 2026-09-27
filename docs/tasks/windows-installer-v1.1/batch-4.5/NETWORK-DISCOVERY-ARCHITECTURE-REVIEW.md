# Batch 4.5 — Production Network Discovery Architecture Review

状态：**只读工程评审完成；Batch 4.5 仍 BLOCKED — PRODUCTION DISCOVERY P02 FAILED**。本报告是路线建议，不是实现授权或可用性认证。唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；分支 `codex/lan-host-v1.1`。

## 【当前事实】

- 历史真实 Win10 Pro x64 build19045：M00 PASS、M01 PASS、M02 FAIL、M03 PASS。显式加载 Utility 后最小序列化在一次进程级对照中干净；这**没有**定位完整网络发现的唯一根因。
- 已获批的生产变更仅在 `public-lan-network.js` 的 `WINDOWS_DISCOVERY_SCRIPT` 开头加入 `Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`；当前 Git blob 为 `c3208b47cd93cf92989622b633a98cf994ce8712`。F01—F12 合成 12/12 PASS。唯一实机 proof 的受测公开 source `bcf82b29a0ac322fb17f595fb428c3ea692fac99`：P01 PASS、P02 FAIL / `DISCOVERY_COMMAND_FAILED`，P03—P08 NOT_REACHED。`privateCandidatePresent=false` 是未到达，不能推断无私网候选。
- 当前脚本汇集 `Get-NetConnectionProfile`、两类 `Get-NetRoute`、`Get-NetAdapter -IncludeHidden`、`Get-NetIPAddress` 并序列化；Node 对 spawn 错误、非零退出、signal、trim 后非空 stderr 和 JSON 解析错误封闭拒绝。`classifyAdapter()` 另要求稳定 GUID、RFC1918 IPv4/合法前缀、Up/Preferred、硬件、非虚拟、以太网/Wi-Fi、匹配 on-link 或 default route、Private profile。多候选要求人工选择；持久化 adapter GUID 而非 IP。
- H1/H2 历史 2/2；不再增加 Hosted network diagnostic。Final Full 0/1、Final QA 0/1 未用。原 T5 冻结，无 beta.3 最终 Setup Artifact 或 LAN 人工验收。本轮未运行测试、实机探针或 Actions。

## 【PowerShell Route A】封闭成功协议

可设计固定版本 success envelope：脚本以 `$ErrorActionPreference='Stop'` 运行，明确 `try/catch`；每项必需查询必须检查异常与结果形态，绝不能用 `SilentlyContinue` 把必需资料缺失伪装成空候选；成功时 stdout 只有一份严格 JSON、固定 schema/status/记录上限，失败固定非零退出且无候选。Node 拒绝非零、signal、超时、混合 stdout、额外字段、非法类型、截断/畸形 JSON、缺少 profile/route 或任何未完成查询，并继续用现有候选安全过滤。警告、非终止错误、provider 异常与所有 PowerShell streams 的语义需要明确映射为失败；脚本内部不能仅因 `catch` 后还能 `ConvertTo-Json` 就宣称成功。

**决定点是 stderr。** 若仍保持“trim 后任何 stderr 非空即失败”，当前唯一实机 P02 仍未解决；协议改写本身没有通过证据。若允许“有效 success envelope + exit0 优先于 stderr”，就是**安全协议变化**，必须另批且先证明真实错误/警告不可能被忽略。尤其非终止错误、native/provider stderr、混合输出和部分结果必须各有故障反例；不能简单删除当前判定。现有 Utility 导入在继续 A 时暂保留作已测基线，但不能把它称为充分修复，最终保留需和新协议一并评审。

已有 Hosted discovery 和真实 Win10 discovery 失败；stderr 来源经多轮仍未闭合，M00—M03 只显示 Utility 自动加载/首次解析与最小路径相关，一行导入不足以通过完整脚本。这提高 A 的环境差异、回归与证据成本，**不证明 PowerShell 一定不可实现**。A 的初始文件面较小，但若解决 P02 需要放宽 stderr，安全审查反而较重。

## 【Native Windows Route B】只读原生 helper

可研究使用现有 pinned Go 1.27.1 Windows amd64 工具链编译独立 `K-SESSION-Network-Discovery.exe`。现有 Firewall helper 的 `go.mod` 没有外部模块，构建明确 `CGO_ENABLED=0`、离线代理/校验库、固定版本及 SHA；这证明**构建模式可复用**，不证明标准库已经实现所需 Windows API/COM 封装。Go 标准库 `net.Interfaces()` 不能独立提供 Windows Private/Public profile、完整路由和硬件/虚拟身份，不能作为等价替代。

| 必需资料 | 可评估的微软原生只读接口 | 尚需证明/处理 |
| --- | --- | --- |
| 稳定 adapter identity、名称、IPv4、前缀与地址状态 | `GetAdaptersAddresses(AF_INET)` 的 `IP_ADAPTER_ADDRESSES`/unicast 资料；`MIB_IF_ROW2` / `GetIfEntry2` 的 InterfaceGuid、Luid、IfType、OperStatus、硬件和物理介质字段 | GUID 与 NLM 连接如何可靠关联；tentative/duplicate 等地址状态不得误当 Preferred；地址变化/缓冲区变化时 fail closed。 |
| 物理 Ethernet/Wi-Fi 与虚拟/VPN/tunnel 排除 | `MIB_IF_ROW2` 的 Type、TunnelType、PhysicalMediumType、HardwareInterface、OperStatus；保留名称/描述拒绝提示 | 这些字段与名称线索不是不可伪造的“真实物理”证明；矛盾、未知类别一律拒绝，不能因有 RFC1918 地址便接受。 |
| on-link、default route、metric | `GetIpForwardTable2(AF_INET)` 的 route 前缀/NextHop/InterfaceLuid，`GetIpInterfaceEntry` 的 interface metric | 真正 route preference metric 为 route offset + interface metric；`IfIndex` 可变，不能持久化。须明确当前 JS 的 `RouteMetric` 排序语义和新值是否等价。 |
| Private/Public network profile | Network List Manager 的 `INetworkListManager::GetNetworkConnections` → `INetworkConnection::GetAdapterId`/`GetNetwork` → `INetwork::GetCategory` | NLM COM 关联、多个连接同 adapter、未知/Domain 类别、服务不可用或权限错误须保守拒绝；IP Helper **自身不提供** Private 判定。 |

上述 API 文档支持 Vista+ 的接口级兼容，因此 Win10 build19045 和 Win11 x64 **预期**使用同一契约；这是文档推断，未做 Win11 或本机非管理员真实验证。`GetCategory` 是只读查询，不是 Firewall 放行证明；Firewall、listener 和 selected-subnet guard 继续独立执行。Microsoft 的 [GetAdaptersAddresses](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getadaptersaddresses)、[adapter structure](https://learn.microsoft.com/en-us/windows/win32/api/iptypes/ns-iptypes-ip_adapter_addresses_lh)、[unicast structure](https://learn.microsoft.com/en-us/windows/win32/api/iptypes/ns-iptypes-ip_adapter_unicast_address_lh)、[MIB_IF_ROW2](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/ns-netioapi-mib_if_row2)、[route table](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/nf-netioapi-getipforwardtable2)、[route metric](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/ns-netioapi-mib_ipforward_row2)、[NLM connections](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetworklistmanager-getnetworkconnections)、[adapter GUID](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetworkconnection-getadapterid) 与 [category](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetwork-getcategory) 是本表依据。

**依赖/权限判定。** Windows API 文档存在并不等于 Go 标准库可以安全、低复杂度调用它们；NLM COM 互操作是 B 的关键成本和架构不确定项。不得凭本次源码阅读声称无需管理员权限；目标是普通用户可读，未来必须在受控非管理员 Win10 上证明。若需要管理员权限或改变网络服务/配置，B 不得直接实施。先尝试已固定工具链 + 标准库 + 系统 API 且无 cgo；若必须引入 `golang.org/x/sys/windows`，须先提出版本、官方 Go 模块许可证、离线缓存/锁定、Runtime/Setup 字节影响与供应链 Review；本轮不加依赖。Go [syscall 文档](https://pkg.go.dev/syscall?GOOS=windows)明确警告按裸 DLL 名载入可能产生 DLL 预加载风险，必须用系统目录限定加载方式或经审查的安全 API 包，不能照搬不安全调用。若 COM/cgo/新库/系统权限导致成本超界，应回到网页版选择 A 或 C。

**进程与输出契约。** 固定安装目录 + 受信 program manifest/hash 的唯一 EXE，Node `spawn` 不经 shell、无任意参数/脚本/用户输入，`windowsHide`、超时、最大输出、受限 cwd/env；helper 只查询系统，不绑定端口、不写配置/注册表/Firewall/网络。stdout 只允许一个 schema 1/status OK/adapters 的严格 JSON 对象；Node 校验精确字段白名单、类型、GUID、IPv4/前缀、enum、数组与字节上限、互相一致性，再调用现有安全候选逻辑；非零/超时/signal/异常/多余输出/缺 API/无法确认 Private 都拒绝。stderr 不是业务协议，不能把任意 stderr 解释为成功。日志/Artifact 只记固定阶段和状态，不记录地址、GUID、hostname、路径或原始流。

**安装身份。** `tools/package-manifest.json` 当前包含 JS discovery 和 CLI；Firewall helper 经 pinned build、SHA、`build-info.json`、program inventory/manifest、安装器 staging 事务 hash 校验。新 helper 若真正进入产品，应新增独立构建与固定身份，进入 payload inventory、program manifest/build-info、Runtime/Launcher binding、Setup staged validation、回滚旧程序精确恢复和升级路径回归；不是“多复制一个 EXE”。不得改变 appVersion、data contract、业务 schema 或受验 beta.2→beta.3 精确来源。改用 B 时，一行 Utility 导入应在新实现**集成并获验之前**保留现状作历史基线；切换最终候选时应通过明确 diff 撤销这行实验性生产修改或移除整个旧脚本，并保留 Git/证据历史，不留下不可达的实验代码。

## 【Freeze Route C】继续冻结

不追加实现、实机或 Hosted 成本；Batch 4.5 保持 BLOCKED，LAN Host 不宣称可用。已通过的单机 beta 轨道是独立历史验收，不能把带 P02 FAIL 的 beta.3/LAN 候选交付为可用。若 B 的 COM/权限/依赖成本过高，且 A 必须削弱或复杂化成功协议才能推进，C 是合理止损；此前投入不是继续开发的理由。当前 Utility 一行只作为失败历史保留，若未来不再发 LAN 候选，需在另行批准的交付处理里决定是否清除实验代码，本轮不撤销。

## 【安全比较与验证成本】

| 维度 | A：PowerShell 封闭协议 | B：原生只读 helper | C：冻结 |
| --- | --- | --- | --- |
| 实现复杂度 | 中—高：脚本各流/非终止错误与成功协议需证明 | 高：IP Helper + NLM COM + Go ABI/内存边界 | 低：无实现 |
| 预计修改文件 | 网络 JS、CLI/合成测试、协议/文档；若必要还触及包装 | 新 Go helper/构建/测试、网络 JS/CLI、portable/Launcher、manifest、beta.3 Setup/事务/回滚、CI/文档 | 治理文档 |
| 新增依赖 | 预期无；依赖系统 Windows PowerShell/模块 | 理想无外部依赖；是否需 `x/sys/windows`/cgo 尚未证明 | 无 |
| Win10 build19045 | 现有实现实机 P02 FAIL；新协议待证明 | API 文档兼容；非管理员/COM/真实行为待证明 | LAN 不提供 |
| Win11 x64 | 模块可用性与真实行为未认证 | 同一 API 契约预期；实机未认证 | LAN 不提供 |
| 管理员权限 | 目标不需要；现有失败未归因为权限 | 目标不需要；NLM COM 实测待证，若需要即止 | 无新增权限 |
| 安全边界 | 若放宽 stderr 为安全协议变化；Public/VPN/虚拟与 subnet 规则须保留 | 不依赖 PowerShell；仍须 NLM Private、物理判断和 subnet fail closed | LAN 不开放 |
| virtual/VPN/Public 识别 | 当前脚本/JS 具备过滤，但完整发现失败 | API 字段可组合；未知/矛盾必须拒绝，不能保证自动识别所有伪装设备 | 不暴露 LAN |
| fail-closed 能力 | 可设计，但真实错误与警告映射须证明 | 可设计：任一 API/身份/解析失败则拒绝 | 固有冻结 |
| CI 可测性 | 合成错误流和协议可测；Hosted 网络不作实机认证 | 合成 API/输出、构建和身份可测；Hosted 网络不作实机认证 | 文档核验 |
| 真实 Win10 可测性 | 有机器；新协议需获批一次完整 proof | 有机器；普通用户 API 权限、Private/多网卡/故障 proof 必需 | 不再试跑 |
| 未来维护成本 | 中—高：模块/stream/provider/环境差异 | 中—高：Win32/COM ABI 与打包身份，但避免 PS 模块差异；减成本尚待证 | 低工程成本、LAN 价值延后 |
| 安装包体积影响 | 低：脚本/JS 变化 | 中：新增 EXE；具体字节待构建测量 | 无 |
| 升级/rollback 影响 | 低—中：程序脚本变更，仍须回归 | 高：新增受信二进制及 payload/manifest/事务/恢复锚 | 无新升级路径 |
| 预计额外工程轮数 | 中：协议设计→合成→实机→整体验收；非数字预算 | 高：API 可行性→实现→打包身份→实机→整体验收；非数字预算 | 无工程轮次 |
| 预计 Hosted 需求 | 本轮 0；若实现获批才讨论合成/Final Full，不能复用诊断额度 | 本轮 0；若实现获批才讨论构建/集成/Final Full，不能用 Hosted 代替实机 | 0 |
| 主要风险 | 误把 stderr 中真实错误当成功；反复受环境差异影响 | NLM COM/非管理员/ABI 与虚拟识别复杂度、身份/回滚遗漏 | LAN Host 延期 |

## 【Win10 / Win11兼容、依赖与打包影响】

微软相关 API 多数最低支持 Vista，文档级覆盖目标 Win10/Win11；**实际实现的 ABI、NLM 权限、企业策略、网络分类与 Win11 行为均未认证**。A 使用系统 PowerShell 与官方模块，不新增发行 EXE，但真实 Win10 已失败。B 可复用 pinned Go 版本与离线构建思路，却须把 COM/外部模块/签名和实际新增字节作为准入问题；不能声称一定单一静态 EXE、零新依赖或长期成本更低。两条路线都不能用 Hosted runner 作为真实企业 LAN/Win11 认证。

## 【推荐实施路线及理由】

**有条件推荐 B 作为下一轮优先的有界可行性路线，随后再决定是否完整实施。** 理由：它有机会消除已耗费多轮仍未闭合的 PowerShell stream/模块行为，同时保留现有 stderr fail-closed，而不是先放宽失败判定。此推荐不是 B 已可行、无管理员或更便宜的结论。第一关必须证明只读 NLM Private 关联、非管理员权限、安全系统 DLL 加载、无外部依赖或可审计的固定依赖、以及现有筛选语义；任一不成立或代价过高立即停，交网页版在 A/C 间重选。A 只有在可证明封闭成功协议能拒绝真实错误，且明确批准任何 stderr 判定变化时，才值得实施。C 始终保留。

## 【若实施，最小 Batch 范围】

本轮**不实施**。若网页版批准 B，可先单独授权原 Execution 在原工作树写一份不进入生产的 API/COM 可行性设计与固定合成反例，明确非管理员/Win10 proof 的一次性范围和预算；Master Review 再决定是否升级成具体生产任务卡。生产任务卡至少包含 API 数据映射、严格 JSON/固定进程、身份/manifest/Setup/rollback、Public/VPN/virtual/selected subnet 反例、升级兼容、Win10 非管理员 proof、Win11 文档与人工边界、独立 QA，且重定 Final Full/QA 准入。若路线或安全模型变化，重新交网页版，不由工程主控自行扩权。

## 【需要网页版决定】

选择：A（批准重新设计 PowerShell 封闭协议，并**单独决定** stderr 成功判定能否变化及验证预算）、B（批准有界原生 API/COM 可行性，再以结果决定生产实现与预算）、或 C（保持 Batch 4.5 冻结）。当前仅有只读评审授权；任何选择都不是本报告的自动实施命令。
