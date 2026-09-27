# B45-T5-M03-PROCESS-SYNTHETIC RESULT

## 结论

**PASS — 仅获批方案A的进程级合成门禁。** M03-T01—T08 通过；真实 M03 一次也未运行，原 T5 再次冻结待 Master 独立 Review 与另行派单。该结果不证明 stderr 的同进程阶段来源。

## 范围与实现

- 原线程/原工作树 `codex/b45-t5-integration` 起点 `c1fdf2581dcb8394d7b12d26ebbbf4f1f690988a`。依据网页版新批准的进程级方案A及公共根 `M03-ATTRIBUTION-DECISION.md`；不再按旧 M03 阶段归因目标验收。历史 S01、M00—M02 与 `m03-aggregate-ambiguity-synthetic.json` 保留原貌。
- 新 harness `m03-process-control.cjs` 使用生产 `resolveSystemPowerShell()` 和同一安全系统 PowerShell、flags、cwd、env、timeout、maxBuffer；固定只读 payload 在**同一进程**先显式 `Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`，再执行与 M02 等价的 `ConvertTo-Json -Compress`。无 Get-Net*/网络查询或系统修改。
- 只观察整进程 spawn error、exit、signal、固定 stdout 和聚合 stderr。全部满足且 stderr 已证实为空才给 `EXPLICIT_IMPORT_SERIALIZATION_PASS`；聚合 stderr 非空或任一其他条件不满足一律 `UNRESOLVED`，不生成模块/序列化阶段失败标签。
- 最终报告严格为 `schema/status/result/stderrEmpty` 四字段，`stderrEmpty` 仅布尔。其 `false` 的安全语义是“**未证明为空**”：既可对应已观察到非空，也可对应 spawn 无可判定 stderr；单独的 `false` **不能**被解释为已观察到 stderr 字节。运行时正文、错误、路径和身份不进入报告。live 入口需另行派单及显式参数，本阶段未调用。

## 测试与证据

- T01 clean→PASS；T02/T03 两种假设来源的聚合 stderr 均→UNRESOLVED；T04 非零 exit、T05 timeout、T06 spawn error、T07 非固定 stdout 均→UNRESOLVED；T08 额外字段拒绝。新合成 10/10 PASS，包含 payload/固定参数与证据核验；相关全套 59/59 PASS、fail0、skip0。
- 三个新增 JS `node --check` PASS，`git diff --cached --check` PASS；固定合成证据 `evidence/m03-process-synthetic.json` 只含四字段布尔/枚举。没有调用真实 M03/Hosted/Actions/Final Full/QA。
- 生产 `public-lan-network.js` blob 仍 `4e13e944472f845675fe73d176f063c4fe97f6ed`，stderr fail-closed 未改。P02 仍 FAIL，P03—P08 NOT_REACHED；H1/H2 2/2、Final Full 0/1、QA 0/1 不变。
- 实现与合成证据 local commit：`9810f29d7020a3d9258e2bc7088f1b65e244bef2`；RESULT 单独提交。Execution 不 push、不动 main/tag/Release；既有 `.test-work/` 保留。
