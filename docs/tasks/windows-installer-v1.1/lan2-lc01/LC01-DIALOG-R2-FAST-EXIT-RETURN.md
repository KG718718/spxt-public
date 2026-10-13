# LC01-DIALOG-R2 FAST EXIT RETURN

**状态：LOCAL RETURN — MASTER REVIEW PENDING**

## 本地提交

- 修正提交：`090b432`（`test: accept proven LC01 rapid dispatch exit`）
- 分支：`codex/lan2-lc01-launcher-lifecycle`
- 前序 R2 回单：`c2f81b6`

## 已确认事实

1. 第二 Launcher 可以在第一次 `Inspect` 开始时已经自然退出。Windows adapter 此时如实记录 `SECOND_NOT_LIVE`：`DialogFirst.liveMatchObserved=true`、`liveMatchMatch=false`，`DialogRecheck` 为 `NOT_REACHED`。
2. `lcRun` 随后仍通过受控 `Wait` 取得自然退出和 exit code；当 exit code 为 0、未确认 Busy 弹窗、无强制清理且会话门禁保持时，合法路径是 `DISPATCH_SUCCESS`。
3. 前序 schema 3 Publisher 只允许 `DISPATCH_SUCCESS` 携带 `DIALOG_NOT_PRESENT`，会拒绝上述真实可达的合法快速退出报告。这是报告校验回归，不是产品根因证据。

## 最小修正

schema 3 仅在既有完整 PASS 契约全部成立时，允许 `DISPATCH_SUCCESS` 携带精确 `SECOND_NOT_LIVE` 诊断：

- `second.Status=PASS`
- `second.Path=DISPATCH_SUCCESS`
- `NaturalExit=true`
- `ExitCode=0`
- `BusyClosed=false`
- `CleanupTerminated=false`
- `HandlesClosed=true`
- `modalProof=NOT_EXERCISED`
- lifecycle 的 first/node identity、exclusive lock、noSecondBackend、first natural exit、node exit、quiescence、handles 与 cleanup 原有门禁全部保持
- `DialogFirst` 必须处于 `stageEnumChildren` / `classificationUnknown`
- 仅 `liveMatch` 和 `dialogAlreadyConfirmed` 为已观测且 false；其他控件事实全部未观测
- `DialogRecheck` 必须为 `NOT_REACHED`

没有伪造 `dialogPresent` 查询，没有把诊断改成 MATCH，也没有增加新 reason。schema 1/2 未修改。

## 反例与验证

- 共享 `lcRun` fake 覆盖首次 Inspect 发现已退出、随后受控 Wait 得到自然 exit 0，并验证原始安全诊断保留。
- 同形 exit 1、exit 259、未自然退出/超时、Wait error、强制清理、退出后 guard 失败和未知窗口错误全部 FAIL。
- Publisher 端到端读取完整 identity/lifecycle 文件后保留 `SECOND_NOT_LIVE` 并产出 PASS；伪装为 exit 1/259、`NaturalExit=false`、强制清理、未知控件诊断、guard failure 或额外观测字段均拒绝。
- 固定 Go 1.27.1：顶层 54/54、含子测试 206/206 PASS；`go vet` PASS。
- Node 联合 26/26 PASS，fail 0、skip 0；CJS syntax 与 `git diff --check` PASS。
- LC01 Hosted 与 beta2-to-beta4 两条 Windows amd64 overlay 均重新生成并离线 `go test -c` PASS；生成 EXE 未运行。

## 边界

本轮未修改生产 Launcher、workflow、schema 1/2 或既有身份/生命周期产品逻辑；未运行真实窗口、F3、Launcher、安装/解包、VM、网络、Actions、Hosted、Full 或 QA；未 push、同步或合并。历史 Run `38362515475` 的具体失败字段与根因仍为 `UNKNOWN`，专项预算仍为 0/1。
