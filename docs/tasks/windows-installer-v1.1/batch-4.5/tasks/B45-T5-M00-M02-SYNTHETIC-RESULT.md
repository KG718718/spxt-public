# B45-T5-M00-M02-SYNTHETIC RESULT

## 结论

**PASS — 仅合成门禁。** M00—M02 安全 harness 与合成反例完成；真实 M00/M01/M02 一次也未运行。原 T5 再次冻结，等待 Master 独立 Review 与另行明确派单。

## 证据语义更正

旧 S01 固定 `STARTUP` 结果与历史证据原样保留，不删除、不改写、不重跑。因旧 S01 payload 含 `ConvertTo-Json`，其可证明范围仅为 `PRE_NETWORK_UTILITY_SERIALIZATION_STAGE`：无网络 cmdlet 或网络查询时已有 stderr；尚不能证明纯 PowerShell 启动本身报错。生产 P02 仍 FAIL，P03—P08 NOT REACHED。

## 实施和核验

- 原线程/原工作树 `codex/b45-t5-integration`，起点 `150ef216f91708f2af0041d832edabf94b6442f3`；依据公共根工作区正式 `CORRECTED-PRE-NETWORK-STDERR-APPROVAL.md` 第0—16节与 `B45-T5-M00-M02-SYNTHETIC.md`。未 checkout/cherry-pick 治理。
- `discovery-pre-network-layer.cjs` 沿用生产 `resolveSystemPowerShell()`、系统执行器、flags、cwd、env、timeout、maxBuffer，只替换固定 payload。M00 仅 PowerShell 语言基础与 .NET 固定 stdout；M01 只显式加载 `Microsoft.PowerShell.Utility` 后输出同一固定 JSON；M02 与历史 S01 的 `ConvertTo-Json` payload 精确一致。
- M00→条件 M01→条件 M02，任一失败立即停止。只有进程正常、exit0、无 signal、固定 stdout 有效且仅 stderr 非空，才归类 `SHELL_OR_ENVIRONMENT` / `UTILITY_MODULE_LOAD` / `UTILITY_SERIALIZATION`；其他失败为 `UNRESOLVED`。三层干净为 `PRE_NETWORK_PASS`。
- 最终报告严格只含 `schema/status/layer/M00/M01/M02` 六字段；M00 运行时 stdout 只与内存固定字符串精确比较，不保存正文。额外字段及不一致状态拒绝。纯合成证据 `evidence/pre-network-layer-synthetic.json` 包含四种固定层级结果，无真实输出、网络身份、路径、环境值及其 hash/长度。
- 新合成 13/13 PASS；连同已有 R/N/S 合成共 41/41 PASS、fail0、skip0。三个新增 JS `node --check` PASS；`git diff --cached --check` PASS。生产 `public-lan-network.js` blob 保持 `4e13e944472f845675fe73d176f063c4fe97f6ed`。
- 未调用新 live 入口，未修改生产或 Windows/Firewall/Registry/Service/Network/Profile/Route/DNS/Policy；未运行 Hosted、Final Full、QA。H1/H2 2/2、Final Full 0/1、Final QA 0/1 不变。
- 实现及合成证据 local commit：`a9abd822ad94ad756d23680a64484451d0e793e5`；RESULT 另行提交。不 push、不动 main/tag/Release；既有 `.test-work/` 保留。

## 后续门禁

合成 PASS 不能代替真实分层结论。仅 Master Review 通过并另行派单后，才可在当前 Win10 运行**一次** M00→条件 M01→条件 M02 链；任何阶段失败即停，生产 stderr fail-closed 不变。
