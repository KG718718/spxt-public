# Build-First R1 — 独立执行账本

基线：ba54b76280707655195e420c8ec9a3c18709a493；日期2026-10-15；唯一Master不变。旧ORCHESTRATION/C1—C3及冻结结果保留历史。本账本不重置旧预算。

| 任务 | 原Thread / 工作树 / 分支 | 状态 |
|---|---|---|
| R1构建定位、真实本地构建、测试/Smoke接线 | FRESH-T2 01a13948-7433-7571-8330-a09bfd12a0dc / bea7/public-source / codex/fresh-t2-installer-ci | DISPATCHED / 本地实施中；安全merge基线a02b76ff；真实Runtime/Helper/Launcher首轮已通过，尚未正式RETURN/最终Review |
| 独立QA | 尚未创建 | Candidate完整PASS后才准入 |

| 新预算槽位 | 已使用 | Run/source/control/阶段/cleanup |
|---|---|---|
| R1 Build Smoke | 0/1 | 未触发，本地真实构建+Review先行 |
| R1 Fresh Candidate | 0/2 | Smoke PASS后 |
| R1独立Final QA | 0/1 | Candidate PASS后同EXE |
| 旧Full/U27/LC01/其他Diagnostic | 0 | 不得使用 |

每轮Master独立Review/来源、模式、槽位、触发路径/预算/attempt/cleanup必须记录。Execution不得push/Hosted/后代，原工作树及未知文件保留。T1不恢复。Smoke失败冻结所有后续Hosted；Candidate两次失败或QA失败/UNKNOWN立即STOP。

初始真实构建与Master字节核验详见BUILD-FIRST-R1-LOCAL-PREFLIGHT.md；与C3构建相关代码同源但历史首因未复现，不能以本地PASS宣称C3根因已闭合。已识别父重复Helper13未固定Go环境及内层诊断丢失/identity写完前报PASS等封装缺口，原T2正补实际反例和最小修正；最终必须整条payload真实重放/本地全部门禁/独立Review后才Smoke。新R1独立workflow/trigger/slots草稿不是触发许可，不能在未RETURN时运行。
