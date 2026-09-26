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
| 最小诊断 Hosted | 4 | 2 | 2 |
| 完整 Batch 4 Setup Hosted | 2 | 0 | 2 |
| QA相关 Hosted | 2 | 0 | 2 |

| 轮次 | 类别 | 受测commit | run ID | 目的/变化/Review | 结果 |
| --- | --- | --- | --- | --- | --- |
| D1 | 最小诊断 | 4319e08694b6660477397102af20d95eb25062b4 | 36208733404 | 17阶段闭合报告、sequence专属夹具父目录；主控六文件Review及13/13契约、三份PS AST PASS | FAIL；八个PRE阶段完成，BASELINE=IDENTITY_REGISTRATION_VERSION/UNCHANGED；已扣1次 |
| D2 | 最小诊断 | 9e070de4efa7bc10118a7942c33d24b51cb326d0 | 36209825354 | 三处JSON显式UTF8、固定name/version/both原因；主控八文件Review、独立22/22专项PASS，生产detection/gate未改；local/origin/API同SHA | RUNNING；已扣1次 |

所有工程push带[skip ci]，用明确workflow_dispatch及mode扣减预算；不允许push隐式启动完整流水线。Full Setup本身同commit构建Runtime/Launcher/Portable/Setup和742门禁，无须为了名字另外触发重复流水线。每轮首失败证据保留，闭合Artifact不含原始日志/路径/凭据/业务内容。

D2等待期间主控整合目录补跑npm：首次26 files/failed1，定位为新任务卡的一处来源措辞触发既有公开文档门禁；只改为“仅阅读指定公开仓库材料”，范围约束不变，未修改测试。修正后26 files/failed0；本机hosted-only SKIP照常，不冒充742结果。D2不运行公开回归；Full必须使用含此文档修正的后续HEAD。

## 当前任务

B4-T4 / B4-T4-REGISTRATION-ENCODING-20260926-02：主动RETURNED → REVIEWED → INTEGRATED；task4918e5b49de3747e756fa05c9ef2b264c99214cf → integrated9e070de4efa7bc10118a7942c33d24b51cb326d0，原thread/worktree/branch及return target不变。固定1252/936合成反例证明旧编码损坏，65001边界旧/新保持；不是Hosted实际代码页取证。主控八文件Review、独立22/22专项通过，生产detection/gate未改；修正三处JSON编码并细分固定诊断，等待D2。D1 Artifact10895175510（upgrade-sequence-diagnostic-36208733404-1，digest f91d0d0f8b9f5cb06281fc48511f704158f6128ead1b4c1bfcc9c2956509e881）闭合validator通过；U15以后该轮未运行。完整任务卡见tasks/B4-T4-REGISTRATION-ENCODING-20260926.md。

B4-T4 / B4-T4-PRE-BASELINE-20260926-01：RETURNED → REVIEWED → INTEGRATED。主动回单已送达新主控；task commit 867cc752af00246c92a1f96b1916c576df7de0d5，整合commit 4319e08694b6660477397102af20d95eb25062b4。原thread 01a0cb6a-67cc-7c03-a68b-2727af8fce6e、原f8bd工作树、codex/b4-t4-upgrade-lifecycle及原始baseline不变。主控确认六文件完整diff、无产品/信任变化；独立复测13/13契约及三份PS AST PASS，整合实现与task commit一致。执行本地83 PASS/1 alias SKIP、preflight20 PASS/1权限SKIP、npm26 files/failed0、固定Go纯测试/编译通过；不等同Hosted742 PASS。QA未创建，等待完整候选。

主控Review：本地确认旧sequence夹具父目录即已建evidence根，导致安装前必然拒绝；新专属父目录方案仍保留父/leaf不存在约束。新报告validator出现大小写漏洞：小写status可绕过末项固定result/state检查，主控实际复现后退原T4修复，修正已通过可执行反例。以上不等同Hosted根因已验证。既有Go目录缺文件仅属本地工具缓存问题，执行复用已核验固定ZIP和完整解压目录，不改变工具版本、不下载新工具。Watchdog持续使用原thread状态及worktree/local commit核验，不另起任务。

传输记录：Git HTTPS两次连接github.com:443失败，GitHub API可用。主控通过GitHub Git对象API上传经Review的同一六文件，逐个blob/tree/commit SHA核验；tree=62297a19db960a25829672e5f3f4faaba1ae6b8d，commit严格等于4319e086，没有重建不同身份。仅fast-forward开发分支（force=false），未改远端配置/TLS/main/tag/Release。根据API确认同步本地origin跟踪ref；dispatch前local HEAD=origin=API=4319e086。随后显式mode=sequence创建D1，不是完整Actions。
