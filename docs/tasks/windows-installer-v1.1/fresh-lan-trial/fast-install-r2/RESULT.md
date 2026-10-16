# FAST INSTALL RECOVERY R2 — 最终本地结果

2026-10-16。**BUILD PASS / LOCAL IMPLEMENTATION REVIEW PASS / INSTALLATION & FULL RECOVERY NOT PROVEN / HOSTED FROZEN。**

## 用户要求的六项结论

1. **F01 实际原因：UNKNOWN。** 历史 Run38767500533 只有 INSTALL_FATAL、PREINSTALL_READY 与 FRESH_STARTUP_CLEANUP_UNKNOWN，不能唯一归因。原函数在受控 Win10 可通过；本轮补齐下一次实际失败时可区分的创建、移动、目录/属性、hash、COM/Target/Arguments/WorkingDirectory、INI 和 cleanup 固定阶段。未假定产品根因后进行投机修复。
2. **修改范围：** 实现提交 `4e7f58e8341bc69822570838a1716667fb8e654b` 共33个代码/测试文件。唯一生产文件 `tools/windows-installer/beta4-upgrade/setup-beta4.iss` 的 Fresh 诊断；其余为安装测试、预注册资源收尾、schema2 固定报告/生成器/CI/验证器和反例。明细见该提交及 MASTER-REVIEW。生产 Launcher、Helper、Node、业务、身份信任、版本、事务/rollback、安全契约、workflow/trigger 均未修改。
3. **完整 EXE：真实构建 PASS。** source `4e7f58e8341bc69822570838a1716667fb8e654b`，tree `e85f572f2414222deb67dd15d4bb14a32df7cd14`。EXE `33554844` 字节，SHA256 `1b4e7723d3f1b6d466bc78cdaed25d63a8eed9c87782efe64dcea41af7ac9111`。完整 payload 1049 文件、147923786 字节、20 个生产依赖；Node24.21.0 / Go1.27.1 / Inno6.7.3。Master 独立重新核验 EXE/manifest/实际 payload 与来源一致。
4. **实际 Windows 安装：NOT_RUN。** 当前日常 Win10 没有获证的专用产品安装隔离环境，未运行 Fresh 产品安装/产品 EXE。真实14场景 Inno/COM driver 只写新 owned 输出树，返回于 InitializeSetup，不能替代安装后验收。
5. **失败安装恢复：未全部证明。** 受控链接/receipt、部分写入/外来替换反例、finally7类故障和 Node/Go/PS 环境恢复已证；真实完整安装失败恢复未运行，早期无 receipt 资源保持 UNKNOWN/PRESERVED。真实规则只读观测为 QUERY_CIM_FAILED / NOT_PROVEN，无规则修改；不能宣称所有真实系统状态恢复 PASS。
6. **下一次 Candidate：无无条件准入，且本轮无预算。** 本地构建和有限 Review 已具备，但真实安装、真实规则快照与失败收尾尚需受控隔离环境证明。建议网页版统一决定是否新增一次完整 Candidate，并要求所有权/规则/隔离前检不通过即在产品执行前 STOP；若失败或 UNKNOWN，不交付、不自动重跑。旧已耗尽槽位不能重置复用，QA仍需 Candidate 完整通过后另行恢复。

## 本轮实际验证

Master 独立：CJS28/28、root134/134、Windows Recovery5顶层、PS22/22、finally7/7，fail0skip0，source-bound；Job 退出/句柄/管道/环境恢复符合，未强杀取得 PASS。Execution：Go6顶层/26子项、LAN50、权限47、真实Inno14、完整P0 Helper13+Fresh2 / Launcher28+Fresh2 / Node44，通过范围见配套固定证据。

安装后的 F01—F09、完整26 suites/742 checks、Artifact privacy最终门禁、独立QA、真实物理LAN/用户登录自启未在本轮验证。没有 GitHub Artifact 或可交付用户包；不标记 FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING。

## 本机产物与治理

仅本地构建证据 EXE：`E:\CodexWorkspace\outputs\fresh-install-r2-p0-90ad468326c74e9db59692459c4cb45f\setup\artifact\K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`。它是未安装验收的 unsigned development artifact，不作为用户安装建议。

原 FRESH-T2 Thread `01a13948-7433-7571-8330-a09bfd12a0dc` / bea7 工作树已正式 RETURN 并冻结；报告提交 `b748b359d2f97dd53e9856ace501b6c741abba50`，Master ff-only 整合，原现场保留。唯一 Master 不变；无普通 sub-agent/后代/新工作树。公开分支 `codex/lan-fresh-trial-v1.1`，只允许治理及非force同步，不触发任何 Actions。

本轮 Hosted0。Candidate2/2耗尽、QA0/1冻结不变；Run38767500533及所有历史FAIL/UNKNOWN保留。原F3 beta.2单机PASS不变。无内部SPXT、真实业务数据、账号凭据、main/tag/Release、未知清理。

证据入口：`MASTER-REVIEW.md`、`MASTER-LOCAL-PROOF.json`；上级目录 `FAST-INSTALL-R2-T2-RESULT.md` 及六份专属固定JSON。旧FAST V1证据/账本/交接卡未覆盖。
