# Fresh Firewall Targeted Recovery R2 — 2026-10-15

用户正式批准仅本地定点修复自主 Loop，新增 Hosted 0。R1 Smoke Run38674907559 / source c503fe094c07b9e1c7e33648072701461afd73be / Artifact11946315115 保持 FAIL；固定 HELPER_FRESH_TESTS / GO_TEST_FAILED_TestFreshFirewallBindingBeforeAnyMutation，具体子场景及首因尚 UNKNOWN。Smoke1/1 已使用；Candidate0/2、QA0/1 未使用并冻结。旧 C1—C3、U27、LC01 不改写。

唯一 Master/return target：01a0db0e-c950-79e0-8e11-07155e0742f2。原 FRESH-T2 thread 01a13948-7433-7571-8330-a09bfd12a0dc；worktree E:\CodexWorkspace\CodexWorktrees\bea7\public-source；local branch codex/fresh-t2-installer-ci，执行基线 efaf1890c8f2b638ade74ed4c2b7d530c588dc2b。Master公开开发基线8831b8add956412f4c06954a7b92ca4a000512b4，集成分支 codex/lan-fresh-trial-v1.1。派单前核验两边 tracked clean，未知 .test-work/node_modules 保留。

范围：目标12子场景逐一确定性验证，重点 fresh_behavior_windows_test.go.in、firewall_behavior_windows_test.go、firewall_windows.go、build.ps1、prepare-policy-overlay.cjs 及固定 Go JSON诊断。允许最小模拟器/环境/overlay/构建封装修复；既有安全契约内的生产缺陷先给证据和最小建议。不得放宽绑定、身份、Private/LAN边界，删除场景、修改成功期望或忽略错误。真实系统防火墙/网络/注册表/安装及业务数据不操作。

验收：12场景全部PASS、原Firewall13及Fresh2、真实Helper/Launcher及完整payload构建和来源身份、环境恢复/owned cleanup、相关CJS/PS/Go/生成器fail0skip0，随后Master独立Review。必须构造针对Hosted/本地差异的反例；本地PASS不等于Hosted修复已证。新增报告只固定场景/枚举/布尔，不上传raw输出、错误正文、路径、网络或敏感信息。

仅原长期Execution，无sub-agent/后代/新worktree；Execution local commit、主动回准确Master，禁止push。Master Review后整合和非force同步唯一开发分支；不触碰任何trigger，不运行Hosted/Full/QA，不main/tag/Release/内部SPXT，不清历史。若首因未确定写UNKNOWN，不重复完整流水线碰运气；安全/产品例外立即停。最终回单：具体失败场景、证据/根因、测试或产品问题、修复SHA、本地结果、最小GitHub验证建议；交网页版后停。
