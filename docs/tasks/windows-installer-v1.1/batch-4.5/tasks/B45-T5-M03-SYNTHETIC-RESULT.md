# B45-T5-M03-SYNTHETIC RESULT

## 结论

**BLOCKED / NEED PARENT DECISION — 不能以现有获批观察接口可靠区分同一 PowerShell 进程的模块加载 stderr 与序列化 stderr。** 本阶段未实现或运行真实 M03 harness；未调用真实 PowerShell。原 T5 冻结，等待 Master 判断是否批准一种能够证明完整捕获且不改变安全语义的阶段内观测机制，或修改诊断目标；本 Execution 不自行扩大方案。

## 已确认事实与合成反例

- 原工作树/分支 `codex/b45-t5-integration`，起点 `2a36277003060e132032831bdf8a312cabec8f1e`；正式依据 `GIT-RECOVERY-M03-APPROVAL.md`。生产 `public-lan-network.js` blob 保持 `4e13e944472f845675fe73d176f063c4fe97f6ed`。
- 当前生产安全调用使用同步子进程结果，只提供子进程整体 `stdout` 与 `stderr`。对合成 T02（模块阶段写 stderr）和 T03（序列化阶段写 stderr），分别构造不同的内部来源，但可见的进程结果完全相同；安全分类器均只能返回闭合 `UNRESOLVED`。因此 T02 的 `MODULE_LOAD_FAIL` 与 T03 的 `SERIALIZATION_FAIL` **未满足**，不能将 8 项测试通过误称为 M03 分层门禁通过。
- 合成 T01 进程干净可给出固定 `EXPLICIT_IMPORT_SERIALIZATION_PASS`；T04 非零退出、T05 超时、T06 spawn 错误、T07 非固定输出均闭合为 `UNRESOLVED`；T08 额外报告字段拒绝。最小证据 `evidence/m03-aggregate-ambiguity-synthetic.json` 只含固定枚举，未存正文或敏感值。
- M03 不可用跨 `stdout`/`stderr` 两管道的事件顺序或延时来推断阶段。PowerShell 的[流重定向说明](https://learn.microsoft.com/en-gb/powershell/module/microsoft.powershell.core/about/about_redirection?view=powershell-5.1)描述的是 PowerShell 流重定向；[.NET `Console.SetError`](https://learn.microsoft.com/en-us/dotnet/api/system.console.seterror?view=netframework-4.8.1)只规定替换 `Console.Error` 的 `TextWriter`。目前没有证据证明任一方法能不改变受验行为且完整覆盖 PowerShell host/模块可能写出的所有进程级 stderr。此处是基于现有证据的工程限制，不断言所有未来实现都不可能。
- 新增纯合成 8/8 PASS；连同已有安全合成共 49/49 PASS、fail0、skip0；新增 JS 语法 PASS、diff-check PASS。**这验证的是歧义与保守闭合，不是 M03-T02/T03 验收通过。**

## 范围与后续

- 只增 `tools/tests/lan-host/m03-aggregate-limit.cjs`、其测试和固定合成证据；没有改生产、历史 M00—M02/S01 证据或系统网络/Firewall/Registry。没有真实 M03、Hosted、Actions、Final Full、Final QA。H1/H2 2/2、Final Full 0/1、Final QA 0/1 不变；P02 仍 FAIL，P03—P08 NOT_REACHED。
- 本地实现/证据 commit `c1c1019fb92abcb303d22ff0fec155a209d9a49d`；RESULT 另行提交。Execution 不 push、不动 main/tag/Release；既有 `.test-work/` 保留。
- Master 需要决定：提供可 Review、能证实完整阶段归因且不掩盖原始 stderr 的新观测设计，或将唯一真实 M03 的目标收窄为进程级 `UNRESOLVED` 诊断。未获明确决定前不能运行 live，也不能修改 stderr fail-closed。
