# Build-First Recovery R1 — 最终止损结果

日期2026-10-15。状态：**BLOCKED — BUILD-FIRST R1 SMOKE FAILED / HELPER FRESH TEST**。

## 唯一Hosted实际结果

- Run38674907559 / attempt1 / job116226183177；workflow `.github/workflows/fresh-build-first-r1.yml`。
- 受测source c503fe094c07b9e1c7e33648072701461afd73be；唯一trigger控制f2195dd4191cf4a5341c09483a1d60e3cce8acd7。后续治理HEAD不是受测source。
- 安全Artifact11946315115 / build-first-r1-safe-failure-38674907559，仅smoke-report.json；没有安装程序或成功包。
- 严格固定报告status=FAIL、reason=OUTER_FAILED，buildDiagnostic.stage=HELPER_FRESH_TESTS、classification=GO_TEST_FAILED_TestFreshFirewallBindingBeforeAnyMutation，script/line=null。
- 8项最终构建checks全部null、setupSha256=null，productExecuted=false、qualifiedForInstallation=false。
- ownedLauncherExited、ownedNodeExited、handlesClosed、lockReleased、ownedRulesAbsent、ownedRegistrationAbsent、ownedShortcutsAbsent、ownedToolchainAbsent、ownedDriveRestored、environmentRestored十项均true。

Master校验Artifact归属/run/control、唯一JSON文件/体积、严格schema/隐私白名单/source及Git代码指纹913b5e9a45eb2ac98cf1437c3812cbd3c7a1499710366a6ef64af4861a6833a6全部匹配。证据保留evidence/build-first-r1-smoke-report.json，原始私有输出不下载/上传。执行step和always finalizer结论failure；finalizer报告FAIL是保留真实失败，不等于cleanup失败，十项清理证据单独判定。

## 能与不能确认的原因

已确认原顶层Fresh Firewall绑定/变更前安全测试在Hosted失败，范围比C3 HELPER粗分类更小。具体哪个子场景、实际PowerShell/OS差异、测试封装还是生产脚本因素仍UNKNOWN；报告没有原始Go输出或子测试分类，不能猜测唯一原因，也不能称真实企业Firewall或生产安全缺陷已证。C3没有同样细分证据，不能追认为同一原因。

check=null代表未到最终Smoke汇总，不把前序阶段或本机成功移植成Hosted逐项PASS。ISCC/Setup identity未达到最终证明，安装/F01—F09/核心26-742/独立QA均未运行，不提供beta.4用户包。

## 本轮已完成及Review

原FRESH-T2正式RETURN401ea7f9/efaf1890，Master整合308a1269/acf72006；源码与受审逐项一致。固定工具链下真实完整payload已本地exit0/PASS，1049文件/20依赖、原Helper13两次/Fresh2、Launcher28两次/Fresh2、LAN44与身份/环境恢复已证，Master独立原函数核验实际字节/hash及158/158 fail0skip0，详见BUILD-FIRST-R1-MASTER-REVIEW.md。真实ISCC本地未运行，不伪称编译通过。

修正父Helper13的污染环境继承、固定子阶段透传/metadata完整后PASS/恢复失败、CI成功路径未初始化标志，并新建独立R1预算/来源/Smoke报告接线，未修改生产Go/业务/LAN安全/Setup/旧信任/事务/rollback，原13/28及旧成功条件保留。这些本地缺口有独立反例，但不追认C3唯一首因。

## 强制停止与资产

新预算Smoke1/1 FAIL；Candidate0/2、独立QA0/1记UNUSED — FROZEN，不创建QA，不借其他额度调试。旧C1—C3 3/3及LC01/U27/其他历史FAIL永久保留。原T2已明确回执确认冻结（idle），bea7任务树/分支/提交/.test-work保留；T1原归档/工作树缺失状态未恢复、不猜测未提交内容。没有额外Hosted/本机安装/产品EXE执行/真实网络/Firewall/Registry/Startup/业务数据操作或main/tag/Release/内部SPXT/未知清理。

正式用户基线仍受验F3 beta.2单机，LAN未发布/未认证。仅完成治理、证据、非force同步及网页版交接后STOP。后续修改/验证及预算须新决定，本轮不申请第二次Smoke或用Candidate续调。交接卡独立保留build-first-r1/CHATGPT-HANDOFF.md；旧根CHATGPT-HANDOFF.md仍为C1—C3历史，不覆盖。
