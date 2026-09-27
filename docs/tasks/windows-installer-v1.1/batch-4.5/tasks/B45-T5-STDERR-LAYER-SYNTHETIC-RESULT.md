# B45-T5-STDERR-LAYER-SYNTHETIC RESULT

## 结论

**PASS — 仅合成门禁。** S01—S03 分层 harness 与 D01—D12 合成反例已完成。尚未运行真实 S01/S02/S03，不能判断真实 stderr 首次出现层级；原 T5 再次冻结，等待唯一 Master Review 与下一阶段明确派单。

## 实施与核验

- 原工作树 `codex/b45-t5-integration` 起点 `285b9c2deebc3ab1276a370d0579a3d007356927`；治理依据 `a29e6a9216417df3258de275af3b409d89fcd123`，未 checkout/cherry-pick。
- 新增 `discovery-stderr-layer.cjs`：通过原生产 `resolveSystemPowerShell()` 取得安全系统执行器；沿用生产的 executable、参数、cwd、env、timeout、maxBuffer，仅使用三个固定只读 payload。S01 仅常量 JSON；S02 仅解析四个固定网络 cmdlet 是否可用；S03 仅执行一次最小 `Get-NetConnectionProfile`，结果在进程内丢弃。
- 链仅按 S01→条件 S02→条件 S03 运行；失败立即停止。只有进程正常、exit0、无 signal、固定 JSON 有效且仅 stderr 非空时才归因 STARTUP/MODULE/QUERY；其他故障归 UNRESOLVED。最终报告严格为 schema/status/layer/S01/S02/S03/stderrEmpty 七字段；拒绝额外字段或不一致状态。
- 独立 live 入口要求显式 `--approved-one-shot` 与 Win10 build19045；本阶段**未调用该入口**。这不是额度自动控制器，真实链仍须 Master Review 后另行派单且仅调用一次。
- D01—D12 全部通过；连同前期 R/N 合成测试共 28/28 PASS，fail0、skip0。三个新增 JS `node --check` PASS；`git diff --cached --check` PASS。
- 纯合成证据 `evidence/stderr-layer-synthetic.json` 只含四种固定层级结果，测试逐项比对及白名单验证通过；未保存 stdout/stderr/异常正文或真实网络与设备身份。
- 生产 `public-lan-network.js` 未改，blob 仍 `4e13e944472f845675fe73d176f063c4fe97f6ed`。未运行真实分层链、Hosted、Final Full 或 QA；未修改 Windows/Firewall/Registry/Service/Network/Profile/Policy。
- 实现及合成证据 local commit：`690e007a3191c7dbc5282c0e3a690449c6878cb0`。RESULT 单独提交；未 push。既有 `.test-work/` 未清理或提交。

## 保留风险

真实 P02 仍 FAIL，P03—P08 NOT REACHED；stderr 底层来源仍未证。H1/H2 2/2、Final Full 0/1、Final QA 0/1 不变。不得将合成分层 PASS 当作真实诊断结果，或据此放宽生产 stderr fail-closed。
