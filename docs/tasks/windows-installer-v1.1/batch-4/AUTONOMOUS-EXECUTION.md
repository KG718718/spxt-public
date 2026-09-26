# Batch 4 自主工程续行与 Hosted 预算

授权日期：2026-09-26；用户 MASTER MIGRATION FINALIZE + RESUME BATCH 4。唯一ACTIVE ENGINEERING MASTER：01a0db0e-c950-79e0-8e11-07155e0742f2。旧主控019fa7e9-f46b-7192-9052-cd0aac7c2cc5为RETIRED — READ ONLY HISTORY，无派单/Review/Integration/Push/Actions/QA权。

本授权替代Phase2暂停及历史“两次sequence用尽后不得继续”的当前限制，不改写历史事实。原任务及工作树复用；治理提交fae647e、159ee41已审查并仅推开发分支，local/origin/API三方核验159ee4163dd52c08584856521463a793eb6e5c7a；未因此触发完整Actions。

## 执行链和停点

Execution → Return/Watchdog → Review → Rework → Integration → 最小Hosted诊断 → 根因及最小修复 → 专项PASS → Full Batch4 → B4-QA → 最终Artifact。普通工程问题自动处理，不逐次申请。主控不写实质生产或测试实现，返工原Execution。

只有产品/UX/schema/migration/数据生命周期/放宽beta.1可信身份/接受未知登记/安全放宽/安装技术路线/平台范围变化、Hosted预算耗尽、无法安全恢复，才停止依赖工作并提交五字段网页版决策卡。

终点：U01—U30 PASS；Runtime/Launcher/Portable/Setup PASS；26/26 suites、742 checks、fail0、skip0；Artifact privacy PASS；B4-QA PASS；同受测身份beta.2最终Setup Artifact。随后BLOCKED — AUTOMATION PASS / QA PASS / HUMAN PENDING，等待Win10人工，不进入Batch4.5/main/tag/Release。

## 本授权剩余预算台账

本表仅统计本次新批准预算，历史run36145933140等不重复扣减。每次显式dispatch前记录目的与受测commit，拿到run ID后扣减；禁止同失败无修改retry，禁止把失败归为QA以规避分类预算。API未创建run需证据确认才不计；失败/取消的已创建run仍计一次。

| 类别 | 上限 | 已用 | 剩余 |
| --- | --- | --- | --- |
| 最小诊断 Hosted | 4 | 0 | 4 |
| 完整 Batch 4 Setup Hosted | 2 | 0 | 2 |
| QA相关 Hosted | 2 | 0 | 2 |

| 轮次 | 类别 | 受测commit | run ID | 目的/变化/Review | 结果 |
| --- | --- | --- | --- | --- | --- |

所有工程push带[skip ci]，用明确workflow_dispatch及mode扣减预算；不允许push隐式启动完整流水线。Full Setup本身同commit构建Runtime/Launcher/Portable/Setup和742门禁，无须为了名字另外触发重复流水线。每轮首失败证据保留，闭合Artifact不含原始日志/路径/凭据/业务内容。

## 当前任务

B4-T4 / B4-T4-PRE-BASELINE-20260926-01：DISPATCHED。原thread 01a0cb6a-67cc-7c03-a68b-2727af8fce6e，原f8bd工作树，codex/b4-t4-upgrade-lifecycle@25b7f3c。原始baseline及历史续行不变。唯一return target为新主控；本次先pre-baseline固定阶段诊断及已证实夹具问题最小修复，参见tasks/B4-T4-PRE-BASELINE-20260926.md。QA未创建，等待完整候选。

