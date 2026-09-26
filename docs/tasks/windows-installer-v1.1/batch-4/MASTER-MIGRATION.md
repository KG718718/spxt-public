# 工程主控迁移 — Phase 2

日期：2026-09-26。范围：仅本公开仓库的控制职责迁移，不恢复 Batch 4 生产开发。

## 唯一主控与发布边界

- 新主控：`01a0db0e-c950-79e0-8e11-07155e0742f2`，唯一派单、Review、Integration、Actions、QA、Handoff 入口。
- 旧主控：`019fa7e9-f46b-7192-9052-cd0aac7c2cc5`，**RETIRED — AUTH FAILURE**；仅历史读取，认证恢复不自动恢复控制权。
- 既有产品、安全、权限、测试、数据保护及发布门禁保持。此阶段不实现诊断、不测试安装、不触发 Actions、不创建 QA、不发布或合并 main。
- 历史任务卡中的旧主控地址由本记录及 AGENTS.md 的当前路由覆盖；旧回单保留原地址作为真实历史，不全局替换历史内容。

## 开发分支预检

- 集成分支：`codex/windows-installer-v1.1`。
- 迁移前本地 tip：`fae647e0d3c4e593c47c4e4c2f026decb73be9ff`。
- GitHub API 实时远端 tip：`44ce7d2013b138bb177f593a2e8f6c251f2ae6ee`。
- 本地 remote-tracking ref：`9e9a525957e888904c31c7f79a5050965a5e952f`，已过时，未 fetch 或修改此引用。
- 用户指定的 `git log --oneline origin/codex/windows-installer-v1.1..codex/windows-installer-v1.1` 返回 59 个提交；这是相对旧 tracking ref 的差异，不能当成 59 个未推送提交。
- 对实时远端 SHA 比较只多 `fae647e docs(installer): add execution return watchdog [skip ci]`，四份 Markdown，16 行新增、1 行删除；已审查，无生产代码或 workflow 变更。
- 本阶段公开主目录由 main 安全切至已有集成分支；main 引用及既有未跟踪目录保留。未推送。

## 活动执行路由

| 字段 | 值 |
| --- | --- |
| TASK ID | B4-T4 |
| Thread | `01a0cb6a-67cc-7c03-a68b-2727af8fce6e` |
| Local branch | `codex/b4-t4-upgrade-lifecycle` |
| 原始 baseline | `a3c206c48ef0bb95e054ab9a4784043a58f0ee56`；后续历史续行基线保留原记录 |
| 当前 local commit | `25b7f3c106dd96a2ecbe737afbbbf3f136fe0c2b` |
| Worktree | 复用原 f8bd 工作树，不移动、不新建 |
| Scope | 既有生命周期及故障注入范围不变；本阶段仅回单地址确认 |
| Return target | `01a0db0e-c950-79e0-8e11-07155e0742f2` |
| 迁移通知编号 | MASTER-MIGRATION-20260926-B4-T4-01 |
| 握手状态 | RETURNED — 2026-09-26 已主动送达，新主控已实际收到并核对通知编号与目标 ID |

B4-T1/T1A/T2/T3 的组件结果已整合，不因迁移重新激活。T3 正式 thread 注册异常继续使用原 worktree/local commit/RESULT 作为恢复证据。B4-QA 未创建，无活动 QA 地址需要迁移。

## Watchdog

主控每次恢复先核对非 COMPLETE 任务；优先核验主动回单的通知编号及目标 ID，再核对 thread、RESULT、worktree、branch、baseline、local commit 和测试证据。主动回单失败时记录 DELIVERY_RECOVERED 后进入 Review，不假称 RETURNED。迁移握手只证明地址和控制权切换，不重测、不倒填生产验收，不自行唤起 Batch 4。

## 验收状态

**PASS — 仅控制职责迁移及回单握手。**

- 旧主控已收到退役通知并在最新完成轮次明确确认：不再派单、修改、推送或操作 Actions；读取时为 idle。历史认证故障不再是防止双主控的唯一依赖，退役决定在认证恢复后仍有效。
- B4-T4 的迁移轮次 `01a0db23-6487-7ba2-8e9d-c2ab8737cddf` 已完成；执行方主动通过 `send_message_to_thread` 发送，工具目标核验一致，新主控实际收到 `MASTER-MIGRATION-20260926-B4-T4-01` 回单。它不是 DELIVERY_RECOVERED，也不是生产测试 PASS。
- 回单核实原工作树、branch、HEAD、baseline、scope 均未变；无文件修改、测试、Git 写操作或 Actions。当前仍等待新主控后续有授权的续行。
- 本阶段只修改 AGENTS.md、PROJECT.md、MASTER-PLAN.md、ORCHESTRATION.md 及本文件五份治理文档；无生产代码、测试代码或 workflow 修改。没有运行或重跑生产测试。
- 迁移通过不包含远端发布；治理变更仅本地保留，未 push，main/tag/Release 不变。

Batch 4 技术结论始终为 BLOCKED / 未验收；run `36145933140`、受测 commit `3ae73b7e4c37c1615c4867345883432d58150fbc`、Artifact `10869846376` 与 pre-baseline 断点均保持原记录。
