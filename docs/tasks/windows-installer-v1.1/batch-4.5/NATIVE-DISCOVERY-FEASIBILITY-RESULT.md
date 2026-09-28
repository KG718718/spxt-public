# B45-T6-NATIVE-FEASIBILITY 阶段 1 结果

状态：`FAIL — NATIVE ROUTE NOT ACCEPTABLE / LIVE NOT REQUESTED`（本轮有界 PoC；不推断原生 API 永远不可行）。唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`。专属 worktree `E:\CodexWorkspace\CodexWorktrees\1ed3\public-source`，local branch `codex/b45-t6-native-feasibility`，baseline `b00749acee445d0a81b90748df851f1190a33cf0`。

变更仅为 `tools/research/windows-network-discovery/` 与本任务两份报告。研究 EXE 主入口总是输出固定拒绝并退出 71；没有 live 模式，没有调用系统网络 API。原生入口实验函数未运行。没有改生产 `public-lan-network.js`/Utility 行、manifest、Setup、Firewall、Runtime、Launcher 或业务数据。

阶段 1 使用固定 Go `go version go1.27.1 windows/amd64`，`GOOS=windows`、`GOARCH=amd64`、`CGO_ENABLED=0`、`GOTOOLCHAIN=local`、`GOPROXY=off`、`GOSUMDB=off`、`GOENV=off`，本任务独立 GOCACHE/GOTMPDIR。`go test -count=1 ./...`：F01—F15 共 15/15 PASS，fail0、skip0；`go vet ./...` exit0；`go build -trimpath -buildvcs=false` exit0。EXE 和构建缓存仅存本任务未跟踪的 `.test-work`，未运行、未打包、未提交。测试只使用虚构 GUID 与地址。

F01 空适配器；F02 畸形 GUID；F03 非私有 IPv4；F04 非法/跨私有块前缀；F05 虚拟/隧道/非硬件/错误介质；F06 无 route/不匹配 on-link；F07 同 adapter 多 Private 歧义；F08 Public/Unknown/Domain；F09 NLM 不可用；F10 IP Helper 失败；F11 COM 失败；F12 非法/多份 JSON、额外字段；F13 固定输出白名单；F14 数量/字节限制；F15 部分数据。均只验证合成模型。

未证：任何真实 IP Helper 调用或其解析、NLM COM、profile 关联、普通用户权限、完整生产筛选等价、Win10/Win11 行为。依据任务卡 `PARTIAL` 需要 IP Helper 实际可行已证，此处不满足；不能标 PASS/PARTIAL。四个 IP Helper 接口的结构解析及四接口 NLM COM 的手写 ABI/生命周期尚未闭合，补齐已超出本轮小 PoC；唯一实机额度不能用于入口 smoke test。因此按本轮约束止损为 FAIL，不请求 live。Master Review 后交网页版决定后续 A/C 或重新定义 B 的依赖/预算。Final Full0/1、Final QA0/1 不动，无 beta.3 最终 Artifact。
