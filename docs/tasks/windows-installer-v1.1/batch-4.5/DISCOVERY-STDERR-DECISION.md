# Batch 4.5 — 真实Win10 stderr 来源决策卡｜2026-09-27

## 当前事实

原生产P01 PASS，P02 `NETWORK_DISCOVERY_FAILED`。获批的一次真实Win10只读诊断把生产拒绝条件确认为 `STDERR_NONEMPTY`：首次与唯一复核均进程成功、未超时、exit0、无signal、stdout有值且JSON可解析，stderr非空；N01—N05各一次也同类。详情见 `DISCOVERY-STDERR-STOP-20260927.md` 和两份固定JSON。生产blob未改、14/14合成测试PASS。当前固定8布尔无法指出stderr来自进程启动、模块解析还是查询，也无法证明它无害；不接受以“exit0”推断可忽略stderr。H1/H2 2/2耗尽；Final Full0/1、QA0/1未用。

## 技术约束与可选方案

A（建议）：新批准**至多一次本机只读、固定类别的stderr来源分层诊断**，不增加Hosted。原T5/原工作树、GPT-6 Sol/Medium。先Master Review只含合成反例与严格白名单的harness，再在同一Win10用经生产验证的系统PowerShell和原安全环境，最多三个有序、互斥的短命只读阶段：S01不调用网络模块的固定常量输出；若stderr空，再S02只解析/加载网络cmdlet但不查询；若仍空，再S03执行一个原批准只读查询。每阶段只记录PASS/FAIL、固定层级 `STARTUP / MODULE / QUERY / UNRESOLVED`、stderr是否为空、exit0、JSON可解析和是否有PowerShell错误记录的固定布尔；任何stderr/异常/网络/路径原文及其hash/长度都不存储或打印。不修改系统、网络或生产代码，不创建listener。S01—S03并非本次已获批准的N01—N05，必须由用户明确批准后才可运行。即使定位到层级，也只有证明错误类别与安全含义后才能做普通最小修复；需要更广诊断或安全放宽则再次停止。

B：维持当前冻结，不新增任何诊断；Batch4.5继续BLOCKED，Final Full/QA额度保留。未来由用户/网页版另定本地诊断方法或产品架构路线。

## 需要网页版决定

是否批准方案A的**一次本机S01—S03有界只读分层诊断**？批准仅是诊断授权，不批准忽略stderr、不放宽Private/virtual/VPN/Public/selected-subnet/system-PowerShell等安全门禁，也不授权Hosted H3/H4、Final Full提前运行。若不批准，执行方案B继续冻结。最终目标与停点仍是P01—P08真实Win10全部PASS且privateCandidatePresent=true后，唯一Final Full PASS、独立QA PASS、beta.3候选Artifact，然后停 `BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`。
