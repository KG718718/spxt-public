# B45-T6 原生网络发现可行性：阶段 1 接口审查

状态：`STAGE 1 — NOT PROVEN`。本报告是 `RESEARCH / NON-PRODUCTION / NOT PACKAGED`，不是生产 helper 或真实 Win10 验收。基线 `b00749acee445d0a81b90748df851f1190a33cf0`；生产 P02 仍 FAIL。阶段 1 没有调用任何本机网络 API，也没有运行研究 EXE。`native_windows.go` 仅编译安全加载和两个 IP Helper 入口的实验代码，`main` 固定拒绝并退出 71。

## 已证与未证

- **已证（源码/合成）**：pinned Go 1.27.1 Windows amd64、`CGO_ENABLED=0`、`GOPROXY=off`、零第三方模块下，本研究模块的 F01—F15、`go vet` 和 build 通过。`systemDLL` 仅接受固定 `iphlpapi.dll` / `ole32.dll`，经 Go 已登记为系统 DLL 的 `kernel32.dll` 调用 `GetSystemDirectoryW`，再以绝对系统目录路径加载。不存在 cwd/PATH 拼装。此结论是源码和编译层级，尚未运行该函数。
- **未证（阻止 live）**：`IP_ADAPTER_ADDRESSES_LH` 与 unicast 链表的指针/长度/地址状态解析、`MIB_IF_ROW2` 的 GUID/LUID/硬件/虚拟/介质、`MIB_IPFORWARD_ROW2` 与 `MIB_IPINTERFACE_ROW` 的路由和完整 metric、NLM COM 连接→adapter GUID→Private 关联。`GetIfEntry2`、`GetIpInterfaceEntry` 仅在设计中，源码未调用。普通用户权限、Win10 真实返回、NLM 服务/策略失败路径、Win11 实机均未证。
- **不能推断**：`go build` 只证明 ABI 调用代码能编译，不证明结构布局、运行时调用安全、完整 IP Helper 能力或可行性 PASS。当前合成模型仍缺生产的名称/描述虚拟线索、真实 route state、候选排序和 selected subnet guard；它的 `SYNTHETIC_ONLY` 不等于生产候选 OK。

## 原生接口映射与安全门槛

| 需求 | 官方接口 | 待闭合的具体点 |
| --- | --- | --- |
| GUID、IPv4/前缀、DAD 状态 | `GetAdaptersAddresses(AF_INET)` / unicast 地址 | 变长链表、UTF-16/指针边界、`OnLinkPrefixLength`、`DadState`；缓冲增长上限与全部结果形态 |
| 操作状态、真实/虚拟/隧道 | `GetIfEntry2` / `MIB_IF_ROW2` | GUID/LUID 对齐、`OperStatus`、`Type`、`TunnelType`、`HardwareInterface`、`PhysicalMediumType`；未知/矛盾拒绝 |
| default/on-link、metric | `GetIpForwardTable2(AF_INET)` + `GetIpInterfaceEntry` | route 前缀须匹配候选 subnet 或有效 default；route metric + interface metric 与当前 JS 的排序语义差异需审查 |
| Private 分类 | NLM `GetNetworkConnections` → `GetAdapterId` → `GetNetwork` → `GetCategory` | `IDispatch` vtable 顺序、COM apartment/引用释放、枚举边界、同 adapter 多 connection；仅唯一明确 Private 通过，Public/Domain/Unknown/歧义/服务失败拒绝 |

微软文档：[GetAdaptersAddresses](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getadaptersaddresses)、[IP_ADAPTER_ADDRESSES](https://learn.microsoft.com/en-us/windows/win32/api/iptypes/ns-iptypes-ip_adapter_addresses_lh)、[GetIfEntry2](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/nf-netioapi-getifentry2)、[MIB_IF_ROW2](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/ns-netioapi-mib_if_row2)、[GetIpForwardTable2](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/nf-netioapi-getipforwardtable2)、[GetIpInterfaceEntry](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/nf-netioapi-getipinterfaceentry)、[NLM enumeration](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetworklistmanager-getnetworkconnections)、[adapter GUID](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetworkconnection-getadapterid)、[category](https://learn.microsoft.com/en-us/windows/win32/api/netlistmgr/nf-netlistmgr-inetwork-getcategory)。本机 Windows SDK 10.0.26100 的 `netioapi.h` / `netlistmgr.h` 提供了结构和 `IDispatch` 方法顺序参考，但源码没有盲转结构或调用 COM。

**权限与兼容**：GetCategory 是只读，与 SetCategory 的管理员写权限不能混同。官方接口的 Vista+ 支持给 Win10/Win11 提供 `DOCUMENTED API COMPATIBILITY`，不证明普通用户或任一目标环境运行通过。NLM 可能给同 GUID 多条连接；只要分类不一致、数量越界或无法关联，整次拒绝，不把缺 profile 当空候选。实际 Windows 网络变化也可能在 IP Helper 与 NLM 两次读取之间发生，需重复一致性校验或保守拒绝。

SDK 头文件给出的最小 ABI 链不是一次函数调用：`MIB_IF_ROW2` 要以 LUID/IfIndex 作为入参、整结构作为输出；`MIB_IPINTERFACE_ROW` 先填 `ADDRESS_FAMILY` 与 LUID，再读 interface metric；`MIB_IPFORWARD_TABLE2` 是变长表，需按官方分配/释放契约逐项验证 `MIB_IPFORWARD_ROW2`。NLM 的 `INetworkListManager`、`IEnumNetworkConnections`、`INetworkConnection`、`INetwork` 均继承 `IDispatch`，手写 Go vtable 需要逐方法顺序、HRESULT、GUID 和 apartment 生命周期核对。`GetNetworkConnections`→`Next`→`GetAdapterId`→`GetNetwork`→`GetCategory` 涉及四种接口引用及各分支的 Release，误用可能导致错误关联或进程内存错误。本轮没有可审计且无外部依赖的完整绑定实现，不能以 SDK 方法存在代替调用验证。

## 依赖、成本与下一门槛

当前 `go.mod` 无第三方依赖，未 `go get`，无 cgo。尚不能说标准库足以安全完成 NLM COM。若经审查确认必须引入 `golang.org/x/sys/windows`，先报告 `X_SYS_WINDOWS_RECOMMENDED` 并由 Master/网页版决定精确版本、BSD-3-Clause 许可、离线 module zip/go.sum/缓存锁定、新字节与供应链审查；本任务没有添加它。

后续若批准继续，至少需：① 完整 ABI/COM 只读采集与故障反例（高）；② Master 源码/合成/构建与隐私 Review（中）；③ 仅一次标准用户 Win10 固定 schema proof（中）；④ 独立授权后才可能做生产 helper、Node 严格协议、program manifest/构建身份、Setup/事务/rollback（高）；⑤ 生产 Win10 proof、Final Full、独立 QA、人工 LAN（高）。这些不是当前执行许可或预算。Win11 仅文档兼容，没有实机结论。

**本轮止损依据**：四个 IP Helper 接口的完整结构解析与 NLM 的四接口 COM 生命周期均缺失，唯一真实 Win10 运行限额只能用于完整问题，不能拿入口 smoke test 消耗。直接补齐手写 ABI 已超出“小 PoC”可审查复杂度；自行引入 COM/x/sys/cgo 则越过任务卡依赖门槛。由此本轮约束下为 `FAIL — NATIVE ROUTE NOT ACCEPTABLE`；这是本次有界证据的结论，不是 Windows 原生方案永远不可行的证明。
