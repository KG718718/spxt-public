# Batch 4 编排索引

授权：用户正式 Batch 4 任务书及本次启动指令；L2 / ENGINEERING ORCHESTRATOR。一层独立 Codex task threads，禁止普通 sub-agent。仅 KG718718/spxt-public。

主控：019fa7e9-f46b-7192-9052-cd0aac7c2cc5。集成分支 codex/windows-installer-v1.1。
Preflight：公开仓库/正确分支/干净；本地与 GitHub API 远端均为 2839ba62220e53d126e9fb00757cd89ff89a1b83。首次 git ls-remote 连接重置，API 复核成功；不是身份不一致。

| Task | 职责 / 独占文件 | 依赖 | Thread / Worktree / commit | 状态 |
| --- | --- | --- | --- | --- |
| B4-T1 | 旧安装身份及版本识别；新增 tools/windows-installer/upgrade-detection/、对应专项测试、tasks/B4-T1-RESULT.md | b96543d 文档检查点 | thread 01a0c900-5811-7053-829d-49daa90e9c56；task commits 0afecb0+752ce3b；integrated 0a8e3a8+c79f114 | 主控Review PASS；43/43，封闭historical+fresh identity bundle已整合 |
| B4-T1A | 历史Artifact真实安装后identity取证；独立workflow/脚本/专项，不改Setup核心 | 523a522 | client-new-thread:1380b467-b3b4-4cb1-9a29-cb735f4193cf；worktree E:/CodexWorkspace/CodexWorktrees/bfe5/public-source；正式thread/branch待首项回报 | T3前置，已提交创建，等待身份回报 |
| B4-T2 | 只读实例预检；新增 tools/windows-installer/upgrade-preflight/、对应专项测试、tasks/B4-T2-RESULT.md | b96543d 文档检查点 | thread 01a0c900-5901-71f3-a961-24c634605ed4；worktree E:/CodexWorkspace/CodexWorktrees/2f94/public-source；task commits ff21397+8ec1c33；integrated 0e4e4b4+9d59809 | 主控 Review PASS；专项19 PASS/1权限SKIP，已整合；CI待补file symlink实测 |
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

2026-09-22 T2 首轮 Review：提交只含 helper、专项与本任务报告，diff-check 通过；主控独立复跑专项 17/17、语法检查通过。反例审查发现 initialized instance 根下未知名称的 junction/symlink 未被全局树检查覆盖，与“实例不存在危险 reparse/symlink”不完全一致，故暂不整合，退原 T2 增加根级及深层未知路径反例并最小修复。binding 精确位置与 staged app 全依赖可信 hash 留给 T1/T3，不扩大 T2。

T2 返工复核：先得到 17 PASS/2 FAIL/1 SKIP 的预期失败证据，再改为完整 instance 元数据递归遍历；未知普通文件/目录仍接受，任意名称/深度的 reparse/symlink/特殊文件失败关闭，不读取未知文件正文。主控复跑 19 PASS/1 SKIP、startup 80 checks、installer/R2 contract、语法和diff-check均通过；file symlink 因本机权限跳过，T4 Windows CI需补实测，不把skip写成通过。

T1 首轮 Review：单策略严格校验专项27/27由主控复跑通过，但不能只信任T4本次fresh重建。实际用户来源是Run35514357007/Artifact10606870944，API核实head=e9417f0、success、未过期（2026-10-20）；动态build-info/Runtime环境令fresh与历史安装不保证字节相同。已退T1增加beta.2构建侧固定hash的封闭identity bundle，历史Artifact及同次fresh baseline均必须各自精确锚定；不因同commit/tree放宽。历史安装后identity提取列为T3/T4前置，Artifact过期前只持久化非敏感hash/evidence，长期不依赖下载。

T1 返工复核：主控复跑43/43。bundle固定自身SHA，字段及批准来源闭合；historical/fresh各自exact anchors，只有受控证据证明完整fingerprint相同才可显式去重；第三identity、同commit/tree、动态build-info变化均拒绝。已整合。T1A串行取得历史Artifact实际安装后anchors；拿不到则BLOCKED，不进入T3。

用户报告工作树自动回收开启、限制20。不得主动触发删除；记录任务 commit 和路径，未整合结果不得清理，派单前检查现存公开 worktree。若发现路径/结果被回收，停止，不伪造恢复。

最终门禁见 ACCEPTANCE.md。未获人工验收不得最终 PASS；不进入下一 Batch。所有产品/UX/schema/重大架构决策使用五字段卡交回网页版。
