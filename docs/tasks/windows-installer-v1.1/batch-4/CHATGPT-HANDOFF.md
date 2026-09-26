===== CHATGPT HANDOFF BEGIN =====

项目：
K⁺-SESSION / SPXT 项目级主控迁移与公开版安装工程

当前 Batch：
Batch 4 — Safe Upgrade / Rollback / Data Lifecycle

结论：
BLOCKED — HOSTED BUDGET EXHAUSTED

一句话结论：
主控迁移已完成，原B4-T4已自动续行至最后一次完整Hosted；F2在U22失败，诊断和Full预算用尽，已停止。尚未达到AUTOMATION PASS / QA PASS / HUMAN PENDING。

【本轮实际完成】
- 唯一ACTIVE Master：01a0db0e-c950-79e0-8e11-07155e0742f2；旧019fa7e9-f46b-7192-9052-cd0aac7c2cc5永久RETIRED — READ ONLY HISTORY。
- 已Review并推送fae647e、159ee41治理提交；仅开发分支，未因此运行完整Actions。Primary保持public-source。
- 复用原T4/thread/worktree，不重做T1/T1A/T2/T3。完成固定pre-baseline诊断、夹具目录、UTF8写入、copy故障与失败退出保护、中文测试路径、事务manifest字段修复。
- 主动回单、Review、整合和watchdog均执行；T4已确认冻结local58898b2，等待新授权。

【关键数字 / 技术事实】
- source commit：23ab36bff1e953e14fd5a213d1c9fb759997ee9c
- HEAD：治理检查点490aea3e9801809e557f5cd5ed15b9941501e55d；本卡随后单独提交，最终HEAD见主控回执。
- F2 Run：36214270618；setup job：108326997302。
- Node：固定构建v24.21.0；npm：本卡未独立核实，N/A。
- 最终Runtime大小/文件数/生产依赖数：N/A，最终Artifact未生成。
- 失败Artifact：10897445184。
- Artifact SHA256：c6f01ed8ef890629feef8724ffbf9f04ef012e28f6168416ba94aa2792190bdb。

【实际测试结果】
- D4 run36213904038@d7ef396：19阶段PASS，含U21/U23真实故障、非零退出及旧状态不变；仅闭合JSON，隐私核验PASS。
- F2 fresh Setup：29自动PASS、I01/I02/I09人工PENDING；D01—D13 PASS。
- F2 U01/U02/U15/U16/U17/U18/U20/U21共8项PASS；U22失败后停止。
- F2断网期间externalDuring=false，restored=true；历史身份核验PASS。
- 主控本地23/23专项及纯Go/PS AST通过；执行npm26 files/failed0。本机专项有alias/symlink权限SKIP，不等于Hosted742/skip0。

【未完成 / 未验证】
U22精确恢复状态、后续U项、完整26/26及742 checks、最终Artifact privacy、独立B4-QA、最终beta.2 Setup Artifact均未完成；Win10人工未开始。D4旧payload故障诊断不能替代F2当前payload全项验收。

【当前阻塞】
1. 已确认：U22缺少预期KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED；实际exit4，记录prepared/native-copy-complete/postinstall-failed/rolled-back。marker断言先于exact state比较，不能宣称U22恢复已验证。
2. 证据推测：prepare早于暂存复制，错误payload hash在commit校验时拒绝，测试的“prepare失败”预期可能与实际顺序不符；尚缺固定事务子码和完整状态证据。
3. 新预算诊断4/4、Full2/2耗尽；QA0/2不能挪用。未新增Hosted或继续U22返工。

【本轮修改范围】
- 新增：固定诊断helper、治理台账与任务/决策卡。
- 修改：安装器既有失败语义、JSON编码、事务字段读取、相关安全诊断/反例及结果文档。
- 明确未修改：业务规则、schema/migration、数据生命周期、beta.1信任边界、平台和安装路线。

【Git状态】
- branch：codex/windows-installer-v1.1。
- HEAD：上述治理检查点已与origin/API核验一致；受测身份单独列示。
- working tree：治理检查点tracked clean；既有.test-work/、node_modules/未跟踪缓存保留。
- commit/push：已审查工程与治理提交仅同步开发分支，[skip ci]；运行均显式dispatch。
- PR/Release：未创建；main/v1.0.0未修改，仍84cbb324a4f63bef094d2c21d70eba841205a7a7。

【安全与边界】
- 仅恢复时登记原SPXT治理和工作区状态，未整理、提交或同步其仓库，未导入其源码/业务内容。
- 无真实业务数据、账号凭据、Token/密码/邮件；测试身份和附件均为合成。
- 未改变业务逻辑；未保存发行包到开发机，原工作树保留。

【下一阶段判断】
不进入Batch4.5，不交付Win10验收包。停止原因是用户设定预算边界，不能把局部通过写成Batch通过。

【需要 ChatGPT 网页版决定】
A维持冻结：无新增成本，继续无最终包。
B明确追加有界U22工程续行及预算：原T4先本地反例、固定事务子码/状态证据，主控Review后最小诊断及Full；建议最多各1次，仅为建议，尚未执行。保持“实际program改写前拒绝错误hash、旧owned/instance精确不变”的原验收目标，不降低门禁。
请选择是否批准B及具体次数；否则保持冻结。

【详细报告文件】
docs/tasks/windows-installer-v1.1/batch-4/
RESULT.md、UPGRADE-TEST-REPORT.md、AUTONOMOUS-EXECUTION.md、
ORCHESTRATION.md、B4-STOPLOSS-DECISION-20260926.md、
tasks/B4-T4-RESULT.md、HUMAN-ACCEPTANCE.md。

===== CHATGPT HANDOFF END =====
