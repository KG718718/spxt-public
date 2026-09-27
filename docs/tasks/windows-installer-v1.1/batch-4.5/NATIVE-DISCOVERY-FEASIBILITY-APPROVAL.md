# Batch 4.5 — Native Windows Network Discovery Feasibility Gate

## 网页版批准边界｜2026-09-27

已批准 Route B **原生 Windows API/COM 有界可行性门槛**，不批准生产实现。唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；公开开发分支 `codex/lan-host-v1.1`；当前 Batch 仍 `BLOCKED — PRODUCTION DISCOVERY P02 FAILED`。本轮仅一名 Execution、一个任务 worktree、GPT-6 Sol/Medium、零 Hosted/Actions/Final Full/Final QA，最多一次当前 Win10 本机只读 research PoC。不得创建子 Agent、继续旧 PowerShell 微诊断或进入 beta.3 candidate build。

## 任务与生产冻结

唯一新任务 `B45-T6-NATIVE-FEASIBILITY`。原 T1—T5、QA 历史及冻结状态不改。生产 `public-lan-network.js`（含 Utility 一行）、Launcher/server/Firewall helper/Setup/beta.3 upgrade、package/Runtime manifest、program inventory、rollback、业务 schema/权限均不得修改。研究代码仅可放 `tools/research/windows-network-discovery/`，标为 `RESEARCH / NON-PRODUCTION / NOT PACKAGED`；不得进入 Runtime/Launcher/Setup/payload。Execution 仅 local commit 和主动向唯一 Master 回单，不得 push、整合或操作 main/tag/Release。

## 技术与安全门槛

必须分析并在获准的 research PoC 中尝试只读 `GetAdaptersAddresses(AF_INET)`、`GetIfEntry2/MIB_IF_ROW2`、`GetIpForwardTable2(AF_INET)`、`GetIpInterfaceEntry` 或等价接口，覆盖稳定 adapter identity、operational status、IPv4/前缀、介质/硬件、tunnel/virtual 信号、default/on-link route、route/interface metric。NLM COM 是关键：只读 network connection→adapter GUID→network category 的关联，多个连接/同 GUID 歧义必须拒绝；**仅明确 Private** 可接受，Public/Unknown/Domain 均不自动接受。NLM 或 IP Helper 失败、资料矛盾或部分缺失都 fail closed。

优先 pinned Go 1.27.1、Windows 系统 API、`CGO_ENABLED=0`、零外部依赖。不得 `go get` 或新增生产依赖。若 `golang.org/x/sys/windows` 才能安全且合理维护，只报告 `X_SYS_WINDOWS_RECOMMENDED`，说明所需 package、建议锁定版本、license、离线/cache/lock、字节与供应链影响；研究 PoC 临时用它也须 Master 先判定必要性。系统 DLL 只允许安全 System32 限定加载，不能搜索 cwd/PATH/可写目录。禁止 PowerShell、pwsh、cmd、netsh/ipconfig/route print/wmic 文本解析、Registry 猜测、第三方可执行程序、外网服务及任何网络/系统设置写入。

## 验证顺序与隐私

先源码安全 Review、F01—F15 合成反例、`go test`/`go vet`/build 通过；Master 独立 Review 后才可单独放行**最多一次**真实 Win10 PoC。F01—F15 分别覆盖空适配器、身份/IPv4/前缀非法、virtual/tunnel、缺路由、profile 歧义、Public/Unknown、NLM/IP Helper/COM 失败、JSON/字段白名单、数量/字节上限及部分数据 fail-closed，要求 fail0/skip0。实机前仅判当前进程 `ELEVATED` 或 `STANDARD_USER`；若 elevated，只能记 `NON_ADMIN_NOT_PROVEN`，不得修改 UAC/系统或称无需管理员。实机 PoC 只读，不得动 Firewall、Registry、route、profile、adapter、DNS、service、listener、端口或 COM 写接口。

Git 证据只允许固定 schema1 状态/布尔/枚举；不得保存 IP、GUID、MAC、adapter/network/hostname、route、gateway、DNS、用户/SID、COM/DLL/用户路径、原始 stdout/stderr 或这些值的 hash/长度。Go/Node PoC 中的网络信息只在进程内用于能力判断，证据输出字段必须白名单验证。Win11 只能记 `DOCUMENTED API COMPATIBILITY`，不能记实机 PASS。

## 判定与交付

只有 IP Helper 与 NLM 的完整资料/关联、Private 拒绝语义、普通用户实证、无 cgo/PowerShell/文本解析/不安全 DLL 加载、严格 JSON、fail-closed 与系统只读全部成立，才能写 `PASS — NATIVE FEASIBILITY PROVEN`。IP Helper 已证但 NLM/profile 未证为 `PARTIAL — NLM NOT PROVEN`；管理员必需、关联不能可靠、cgo/第三方复杂度或 DLL/Private 安全边界不可接受则 `FAIL — NATIVE ROUTE NOT ACCEPTABLE`，立即停止。

Execution 交付 `NATIVE-DISCOVERY-FEASIBILITY.md`、`NATIVE-DISCOVERY-FEASIBILITY-RESULT.md`、必要时研究源码/测试及固定去身份化 evidence；报告已证/未证、依赖与权限、Win10 结果、Win11 文档兼容、未来 production/Setup/manifest/rollback 修改面，并以 production helper→Node integration→packaging identity→Setup/rollback→Win10 proof→Final Full→QA→人工 LAN 的阶段列低/中/高复杂度。Master 独立核对 diff、依赖/cgo、DLL/COM、隐私、合成/build 与唯一实机证据，再仅整合/push 开发分支、生成网页交接并停。即使 PASS 也不自动进入生产或下一 Batch；下一轮必须交网页版决定。
