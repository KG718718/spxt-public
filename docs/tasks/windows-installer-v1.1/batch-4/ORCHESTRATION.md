# Batch 4 编排索引

授权：用户正式 Batch 4 任务书及本次启动指令；L2 / ENGINEERING ORCHESTRATOR。一层独立 Codex task threads，禁止普通 sub-agent。仅 KG718718/spxt-public。

主控：019fa7e9-f46b-7192-9052-cd0aac7c2cc5。集成分支 codex/windows-installer-v1.1。
Preflight：公开仓库/正确分支/干净；本地与 GitHub API 远端均为 2839ba62220e53d126e9fb00757cd89ff89a1b83。首次 git ls-remote 连接重置，API 复核成功；不是身份不一致。

| Task | 职责 / 独占文件 | 依赖 | Thread / Worktree / commit | 状态 |
| --- | --- | --- | --- | --- |
| B4-T1 | 旧安装身份及版本识别；新增 tools/windows-installer/upgrade-detection/、对应专项测试、tasks/B4-T1-RESULT.md | b96543d 文档检查点 | client-new-thread:9346dec5-2644-4601-99dc-8f37bee3a347；正式 thread ID 待建立 | 已提交创建，等待首项身份回报 |
| B4-T2 | 只读实例预检；新增 tools/windows-installer/upgrade-preflight/、对应专项测试、tasks/B4-T2-RESULT.md | b96543d 文档检查点 | client-new-thread:f0149694-daf1-4205-bfae-e8afdaba0f14；正式 thread ID 待建立 | 已提交创建，等待首项身份回报 |
| B4-T3 | 事务升级及失败恢复；独占 setup.iss/build.cjs/安装元数据与必要 Launcher 适配 | T1/T2 Review | 尚未创建 | 等待依赖 |
| B4-T4 | 真实旧版重建、升级生命周期与故障注入；独占 CI/workflow/生命周期测试 | T3 集成 | 尚未创建 | 等待依赖 |
| B4-QA | 独立只读生产代码审查与验证 | 最终集成候选 | 尚未创建 | 必须执行，未开始 |

困难任务：安装原子性、来源安全、数据保护及恢复均属高风险；所有执行/QA 使用 gpt-5.6-sol / medium。主控不写实质生产/测试代码。

执行使用 Codex managed worktree，必须在 E:/CodexWorkspace/CodexWorktrees 下，一任务一 codex/ 本地分支。首项报告 toplevel、origin、HEAD，必须匹配派单的精确 baseline；失败即停且不写文件。禁止自动 fetch、更换基线、push、merge 开发分支、main/tag/Release、创建子任务/Agent。

T1/T2 仅做独立 helper 与隔离测试，不改 setup.iss、Launcher core、workflow、业务源码或彼此目录。不得实际安装/卸载、更改 HKCU 正式安装登记、占用默认 Beta 实例或启停用户应用。合成临时证据仅在自己的 E 盘工作树忽略区；不提交实例/secret/二进制。T3/T4 涉及共享安装状态的实装测试只在受控 CI 中串行运行。

T1/T2 首轮不得 push；返回接口与限制后由主控审查再派 T3。实质冲突退原任务。后续阶段发新完整任务卡，不凭本表自行进入。

任务返回：TASK ID、PASS/FAIL/BLOCKED（规格冲突 NEED PARENT DECISION）、完成、文件、测试、local commit、风险、主控处理。内部任务不写网页版 Handoff；主控统一生成。

派单精确 baseline：b96543ddde2888513be2f2cc1f8e39a4831f1571，已 push 仅开发分支。指定本地任务分支 codex/b4-t1-upgrade-detection、codex/b4-t2-instance-preflight。create_thread 使用现有项目（公开版已为主要目录）、worktree、startingState=已批准开发分支，非上层仓库。
创建后 git worktree list 已发现 E:/CodexWorkspace/CodexWorktrees/2f94/public-source 和 E:/CodexWorkspace/CodexWorktrees/a536/public-source，均在正确 E 盘根且 HEAD=b96543d；当前尚不能将两个路径准确对应任务，等待执行首项回报后填入，不猜测。此时客户端创建ID不能用于 read/wait/send 的 threadId。

用户报告工作树自动回收开启、限制20。不得主动触发删除；记录任务 commit 和路径，未整合结果不得清理，派单前检查现存公开 worktree。若发现路径/结果被回收，停止，不伪造恢复。

最终门禁见 ACCEPTANCE.md。未获人工验收不得最终 PASS；不进入下一 Batch。所有产品/UX/schema/重大架构决策使用五字段卡交回网页版。
