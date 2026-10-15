# Build-First R1 — 独立执行账本

基线：ba54b76280707655195e420c8ec9a3c18709a493；日期2026-10-15；唯一Master不变。旧ORCHESTRATION/C1—C3及冻结结果保留历史。本账本不重置旧预算。

| 任务 | 原Thread / 工作树 / 分支 | 状态 |
|---|---|---|
| R1构建定位、真实本地构建、测试/Smoke接线 | FRESH-T2 01a13948-7433-7571-8330-a09bfd12a0dc / bea7/public-source / codex/fresh-t2-installer-ci | RETURNED→REVIEWED→INTEGRATED；401ea7f9→308a1269、efaf1890→acf72006；原树冻结保留 |
| 独立QA | 尚未创建 | Candidate完整PASS后才准入 |

| 新预算槽位 | 已使用 | Run/source/control/阶段/cleanup |
|---|---|---|
| R1 Build Smoke | 1/1 | Run38674907559 / attempt1 / source c503fe094c07b9e1c7e33648072701461afd73be / control f2195dd4191cf4a5341c09483a1d60e3cce8acd7；FAIL / HELPER_FRESH_TESTS / GO_TEST_FAILED_TestFreshFirewallBindingBeforeAnyMutation，Artifact11946315115，cleanup10/10true |
| R1 Fresh Candidate | 0/2 | UNUSED — FROZEN；Smoke FAIL，不得挪作调试 |
| R1独立Final QA | 0/1 | UNUSED — FROZEN；未创建独立QA Thread |
| 旧Full/U27/LC01/其他Diagnostic | 0 | 不得使用 |

每轮Master独立Review/来源、模式、槽位、触发路径/预算/attempt/cleanup必须记录。Execution不得push/Hosted/后代，原工作树及未知文件保留。T1不恢复。Smoke失败冻结所有后续Hosted；Candidate两次失败或QA失败/UNKNOWN立即STOP。

初始真实构建与Master字节核验详见BUILD-FIRST-R1-LOCAL-PREFLIGHT.md；与C3构建相关代码同源但历史首因未复现，不能以本地PASS宣称C3根因已闭合。已识别父重复Helper13未固定Go环境及内层诊断丢失/identity写完前报PASS等封装缺口，原T2正补实际反例和最小修正；最终必须整条payload真实重放/本地全部门禁/独立Review后才Smoke。新R1独立workflow/trigger/slots草稿不是触发许可，不能在未RETURN时运行。

上段为实施过程记录。最终401ea7f9完整真实payload已exit0/PASS，Master实际158/158及完整1049文件身份核验PASS，父污染环境和外层恢复true，详见BUILD-FIRST-R1-MASTER-REVIEW.md。ISCC本地NOT_RUN，Smoke可验证真实Setup编译但不安装；不是Candidate。当前只允许三方同步后的中央R1S1一次，尚无真实trigger，不准提前使用Candidate或QA。

中央最新记录：本地/跟踪/GitHub source c503fe09三方一致、R1历史实际0 Run已核验；建立且仅改变13键新trigger，控制f2195dd4非force同步三方一致。唯一Run38674907559已IN_PROGRESS，Smoke1/1消耗，Candidate0/2、QA0/1不动，不重复触发。上段“尚无trigger”保留为触发前历史；本Run受测source与后续治理SHA分开。任何Smoke FAIL立即冻结后续Hosted，只治理保全。

最终更新：Run已completed/failure，唯一R1实际Run已核验，无retry；固定报告statusFAIL/reasonOUTER_FAILED，精确已知top-level测试如表，子场景/底层原因UNKNOWN。8项最终checks全null、setupSha=null、productExecuted=false、qualifiedForInstallation=false；cleanup10/10true通过来源/指纹/白名单验证。立即STOP，原T2收到冻结通知，不返工/不本地或实机追加测试/不Hosted，原树及未知文件保留；QA未创建。仅Master治理/非force同步。上段IN_PROGRESS是历史，不允许绕过本止损点。详见BUILD-FIRST-R1-RESULT.md。
