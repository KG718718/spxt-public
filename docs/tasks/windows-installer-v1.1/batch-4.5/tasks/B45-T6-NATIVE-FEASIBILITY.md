# B45-T6-NATIVE-FEASIBILITY — Execution Task Card

你是执行任务，不是项目主控。

| 字段 | 固定值 |
| --- | --- |
| TASK ID / ROLE / PARENT | `B45-T6-NATIVE-FEASIBILITY` / Execution / Batch 4.5 LAN Host Deployment |
| 唯一 Master 与主动回单目标 | `01a0db0e-c950-79e0-8e11-07155e0742f2` |
| Execution thread | `01a0e33e-7152-7d92-bbc2-cbf06efaed94` |
| 公开仓库 | `KG718718/spxt-public` |
| 专属 worktree | `E:\CodexWorkspace\CodexWorktrees\1ed3\public-source` |
| local task branch | 从 detached baseline 建 `codex/b45-t6-native-feasibility`，仅本地，不 push |
| 经核实公开 baseline | `b00749acee445d0a81b90748df851f1190a33cf0` |
| 模型 | GPT-6 Sol / Medium，不用 Astra |
| 资源 | 唯一新 Execution / 唯一新 worktree；不创建子 Agent/任务/工作树 |

## 授权入口与单一目标

先读当前公开 `AGENTS.md`、`PROJECT.md`、`NETWORK-DISCOVERY-ARCHITECTURE-REVIEW.md`、`NETWORK-DISCOVERY-ARCHITECTURE-DECISION.md`，并以本卡及 Master 新批准文档 `NATIVE-DISCOVERY-FEASIBILITY-APPROVAL.md` 为当前授权。当前 worktree 基线早于批准文档提交，可从主控公共 checkout 的绝对路径只读查看，或以本卡全文为准；**不得为读取它修改 baseline 或 cherry-pick 治理提交**。

唯一目标：验证“现有 pinned Go 1.27.1 + Windows 原生只读 API/COM 是否能在普通用户权限下完整替代当前 PowerShell 网络发现”的可行性，形成 PASS/PARTIAL/FAIL 证据。当前 Batch 仍 P02 FAIL/BLOCKED；即使 feasibility PASS，也不能进入生产实现。

## 允许文件与禁止范围

允许在 `tools/research/windows-network-discovery/` 建 `RESEARCH / NON-PRODUCTION / NOT PACKAGED` 的 PoC 源码、合成测试、必要 research build 辅助；允许新增本任务 `NATIVE-DISCOVERY-FEASIBILITY.md`、`NATIVE-DISCOVERY-FEASIBILITY-RESULT.md`、安全固定 evidence 和任务 RESULT。只可使用明确合成身份/网络测试数据；真实数据仅进程内判断，不入文件/日志/回单。

禁止修改 `public-lan-network.js`（含 Utility 行）、Launcher/server/Firewall helper/Setup/beta.3 upgrade、package/Runtime manifest、program inventory、rollback、业务 schema/权限及任何安装/生产代码。PoC 不进入 Runtime、Launcher、Setup、payload 或 program inventory。零 Hosted、Actions、Final Full、Final QA；不得 main/tag/Release/force push。

## API/COM 与安全验收

只读评估 `GetAdaptersAddresses(AF_INET)`、`GetIfEntry2/MIB_IF_ROW2`、`GetIpForwardTable2(AF_INET)`、`GetIpInterfaceEntry` 或等价官方接口：stable adapter identity/GUID、operational status、IPv4、prefix、interface/media/hardware、tunnel/virtual 信号、default/on-link route、route+interface metric。NLM COM 必须查 network connection→adapter GUID→category，并说明多 connection 同 adapter、歧义、服务不可用时的封闭处理；只有明确 Private 可候选，Public/Unknown/Domain 都拒绝。

Go 目标 `CGO_ENABLED=0` 且无第三方依赖；系统 DLL 必须安全限定 System32，不经 cwd/PATH/可写目录。不准调用 PowerShell/pwsh、cmd/shell、netsh/ipconfig/route print/wmic 文本解析、Registry 猜网络、第三方执行程序或公网服务。不可 `go get`；若确需 `x/sys/windows`，仅报告 `X_SYS_WINDOWS_RECOMMENDED` 和包/锁定版本/license/offline/cache/字节/供应链影响，不自行加入生产；研究 PoC 临时依赖须先询 Master。

若需要管理员、无法安全 DLL 加载、profile 与 adapter 无法可靠关联、Private/Public 语义无法保持、只能靠文本解析、或 cgo/高风险 COM 库显著扩复杂度，即停止并 FAIL。IP Helper 已证而 NLM 尚未证则 PARTIAL；不能将文档 API 存在写成实机 PASS。Win11 仅 `DOCUMENTED API COMPATIBILITY`。

## 分阶段执行与一次实机限额

**阶段 1**：源码/接口安全分析，F01—F15 合成反例与 `go test`、`go vet`、build（fail0、skip0），local commit；先主动回单 Master 等 Review。F01—F15 覆盖 empty adapter、畸形 identity、非法 IPv4/prefix、virtual/tunnel、缺 route、歧义 profile、Public/Unknown、NLM/IP Helper/COM 故障、非法 JSON、字段白名单、数量/字节上限、partial data fail closed。合成测试仅使用明显虚构数据。

**阶段 2**：只有 Master 对阶段 1 的源码/合成/build/依赖/DLL/COM/隐私 Review PASS 并再次明确放行，才允许在当前真实 Win10 上运行**最多一次** research PoC。先将 elevation 只分类为 `ELEVATED`/`STANDARD_USER`；若 elevated，记录 `NON_ADMIN_NOT_PROVEN`，不改 UAC 或系统，不声称无需管理员。PoC 只读，不修改 Firewall、Registry、route、profile、adapter、DNS、Service，不起 listener、不 bind 端口、不调用 COM 写接口。不得重复试跑。

最终真实 evidence 只能有固定 schema1 和布尔/枚举能力结果，禁止 IP/GUID/MAC/adapter/network/hostname、route/gateway/DNS、用户名/SID、COM/DLL/本机路径、原始 stdout/stderr 或这些值的 hash/长度。PoC 输出白名单、无额外字段；Master 核验后才整合。

## 交付与回单

交付 `NATIVE-DISCOVERY-FEASIBILITY.md`、`NATIVE-DISCOVERY-FEASIBILITY-RESULT.md`、研究源码/测试及安全 evidence（如运行）。报告明确已证/未证、依赖/cgo/安全 DLL、普通用户权限、Win10 结果、Win11 文档兼容，以及将来 production helper、Node 集成、packaging identity、Setup/rollback、Win10 proof、Final Full、QA、人工 LAN 的阶段数和低/中/高复杂度。

只在本任务 worktree 修改并 local commit；不得 push/整合。每阶段结束前使用 `send_message_to_thread` 向准确 Master ID `01a0db0e-c950-79e0-8e11-07155e0742f2` 主动发送 TASK ID、状态、worktree、branch、local commit、diff、F01—F15/test/vet/build、依赖/cgo/DLL/COM、风险和是否请求放行一次 live，并核验工具返回目标 ID。若送达失败，在 RESULT 记完整回单和失败原因，标 `BLOCKED — RETURN DELIVERY FAILED / 主控未收到`；不伪称主动送达。Master watchdog 可读取本线程、RESULT、worktree 和 local commit 恢复。最终仅 `PASS — NATIVE FEASIBILITY PROVEN`、`PARTIAL — NLM NOT PROVEN` 或 `FAIL — NATIVE ROUTE NOT ACCEPTABLE`，随后停止等网页版。
