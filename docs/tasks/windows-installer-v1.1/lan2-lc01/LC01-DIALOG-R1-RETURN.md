# LC01-DIALOG-R1 RETURN

**状态：RETURNED — MASTER REVIEW REQUIRED**

## 本地提交

- 研究提交：`96cccff`（`test: document LC01 dialog mismatch hypotheses`）
- 分支：`codex/lan2-lc01-launcher-lifecycle`
- 基线：`7093862b82d9252ffbd4d667643d5183dd93dd57`

## 已确认事实

1. 受验 F3 `c8886e6b6d413c2fd73d6716621d07a80b337e58` 的标题、INSTANCE_BUSY 消息和错误编号拼接结果，与 `lcProductTitle`、`lcBusyText` 逐字相同。
2. 当前 `policy.go` 与 Windows adapter 分别与受验 source `95a03c484d`、Master baseline `e2a5d10e496` 相同；本轮未修改它们。
3. Run `38362515475` 的 `BusyClosed=false` 加 `DIALOG_MISMATCH` 表明首次 `Inspect` 返回 present 后 `lcExactBusy` 为 false，`Confirm` 未成功执行；不是关闭后重复识别分支。
4. 现有报告没有逐字段值，不能确定哪一项精确条件失败。

## 基于证据的假设

当前最强假设是 MessageBox 图标 Static 与正文 Static 被现有折叠逻辑同时计为非空文本，导致 `TextCount==2`；`d.Text` 还会随枚举顺序覆盖。纯合成反例已证明该机制可以稳定导致拒绝，但没有真实 Windows 控件树证据，不能称为根因。

## 产物

- `LC01-DIALOG-R1-REVIEW.md`：源码结论、故障路径边界、真实 Windows 白名单诊断设计、最小修改建议、Hosted/人工边界。
- `dialog_diagnostic_research_test.go`：显式 build tag 隔离的字段、控件顺序、重复识别、确认前重读和严格诊断 schema 反例。
- `dialog-source-review.test.cjs`：F3 来源、受验 source/Master baseline 一致性和 adapter 静态语义核对。

诊断 schema 只允许固定 stage、固定分类和逐条件 `true/false/null`，不允许原始标题、正文、路径、PID、HWND、句柄、长度、哈希或网络身份。MATCH/MISMATCH/UNKNOWN/NOT_REACHED 与观测完整性严格一致；`dialogAlreadyConfirmed` 仅记录分支状态，不参与控件匹配判定。

## 本地验证

- 固定 Go 1.27.1、`GOTOOLCHAIN=local`、`GOPROXY=off`、`GOSUMDB=off`：默认 suite PASS。
- 同环境 `-tags lc01dialogresearch`：研究 suite PASS。
- `node --test tools/research/lan2-lc01/*.test.cjs`：39/39 PASS。
- `git diff --cached --check` PASS；提交前确认现有 policy、policy tests、Windows adapter 无 diff。

## 边界

本轮没有改生产、policy、Windows adapter、workflow 或既有验收结论；没有运行真实 Windows probe、F3、Launcher、安装/解包、VM、网络、Actions、Full 或 QA；没有推送、清理、同步或合并 Master。Hosted 预算仍冻结，根因仍 UNKNOWN。

本线程在本地回单后停止，等待 Master 独立 Review。
