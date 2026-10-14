# Fresh LAN Trial — 长期Thread编排

唯一Master/return target：01a0db0e-c950-79e0-8e11-07155e0742f2。公开集成codex/lan-fresh-trial-v1.1；初始核验3f4f63089106ddd3cf34e3d0573cbb0a67963d16。

| Task | 负责 | Thread/worktree/branch | 状态 | 依赖 |
|---|---|---|---|---|
| FRESH-T1 | 自动物理Private发现与登录自启的既有机制核对/实施/本地反例 | 01a13945-ee6b-75b0-94bd-d2dc1e367e17 / E:\\CodexWorkspace\\CodexWorktrees\\7b54\\public-source / codex/fresh-t1-deployment | RETURNED→REWORK→RETURNED→REVIEWED→INTEGRATED 7ffc019/4f846bf；基线d293f0a | T2构建/Startup/CI接线待验；详细FRESH-T1-MASTER-REVIEW.md |
| FRESH-T2 | fresh-only Setup、实际安装浏览器验收/报告/独立workflow | 01a13948-7433-7571-8330-a09bfd12a0dc / E:\\CodexWorkspace\\CodexWorktrees\\bea7\\public-source / codex/fresh-t2-installer-ci | C1返工RETURNED→REVIEWED→INTEGRATED 5daa62c；受审68880d6c945b533df95af96c3bc59085c0b40bf3；首轮b9028c1/278858d/0a184d5保留 | C1-REWORK-MASTER-REVIEW.md；C2准入 |
| FRESH-QA | 独立审查及同EXE最终QA | 待登记 | PENDING | Candidate完整PASS |

先核对T1能否在原安全/权限/技术栈中闭合，不允许以新目标重开无限PS/Native诊断。首次网络预选不等于信任/开放。主控Review后才整合；返回失败由read_thread→RESULT→worktree/local commit兜底，登记DELIVERY_RECOVERED，不伪称主动送达。

## Hosted账本

Candidate1/3；FinalQA0/1；旧Full/U27/LC01/Diagnostic0。每次登记source/run/attempt/固定阶段/cleanup；45分钟上限。QA仅首完整Candidate PASS后下载同一个EXE。

| 槽位 | 受测 source / 控制提交 | Run / attempt | 当前结论 | cleanup |
|---|---|---|---|---|
| C1 | 76f574cad1ba68f488a406ffa87ef9ebcb0568be / 71ce988199b13a8ab47d4191cae66a2a0e09a087 | 38566205060 / 1 | FAIL — BUILD / LAUNCHER / COMMAND_FAILED；Artifact11896545773，安装未到达 | 10/10 true，Master 白名单验证 PASS |

原所有Execution/QA和worktrees冻结保留；禁止普通sub-agent、后代Thread、push、main/tag/Release、内部SPXT及清理未知文件。

## Master本地Review进度

T1 的授权前 bind 缺陷已由原 Thread 最小返工闭合，Master 实际独立复验并整合；最终 Review 结论以 FRESH-T1-MASTER-REVIEW.md 为准。四个新增测试保持原字节迁入 Fresh overlay，保留旧 13/28 静态测试身份。T2 保持 38 项源闭包及三 fresh 身份派生，已修正浏览器 clients 响应结构、员工项目附件关联、两阶段结果汇总、严格 Firewall filter 核对和安装日志编码接线；仍须完整本地回单与最终 Master Review，不凭草稿或 UI 活动标记 RETURNED。本地无现成受验 6.7.3 ISCC，ISS 实际编译 NOT_RUN，仅静态预处理；真实编译留获准 Candidate BUILD。工具缺失不是编译 PASS。

前述阶段性 105/105 与追加 6/6 保留。最终受审树 Master 独立 Fresh112 + beta.4兼容20 = 132/132，fail0skip0；安装态完整 overlay 仅编译/vet、三项纯 Go、CJS/PS/YAML/diff-check PASS。整合后的生产/测试文件与 a767d10 完全相同，追加原文档 8项检查 PASS（Node 子进程视为一项，组合总133/133），不冒称742。原核心回归本机 Hosted-only 用例明示 SKIP，公开治理标签预检 FAIL 已仅以中性描述修复；完整核心 26/742 仍待 Candidate F08。没有真实本机安装、发行程序运行或网络/Firewall/Registry/登录启动项操作。

## 首次 Candidate 准入

T1/T2 已独立 Review 并集成。三方 HEAD 核验后，仅创建 C1 单文件 trigger 控制提交；受测 source 绑定其已 Review 父提交，控制提交单列。旧 Full/LC01/U27 均不得触发。真实 ISS 编译、实际安装/API/ABI、安装后浏览器与全部 F01—F09 首次由 Candidate 验证；FAIL 先读固定报告/cleanup，触及强制停止则止损，否则仅在实际修复与复测/Review 后使用 C2/C3。首完整 PASS 即独立 QA 同 EXE，QA 前不创建虚假 PASS 或用户交付包。

## C1 后普通工程返工

历史 C1 FAIL 保留；安全报告证明全部 owned cleanup，故自动回原 FRESH-T2 原 bea7 任务树做本地最小定位/修复，不另开线程/工作树。原 LAUNCHER 跨多个命令、未上传子命令日志，C1根因不能唯一断言。现已实际复现合法alias被词法dependency guard误拒，改为Fresh物理目录及严格每段/边界校验，并修复八个固定实际构建子阶段报告；不是C1唯一原因已证。Master实际固定Node24.21/EXE SHA核验、Fresh118+兼容20=138/138 fail0skip0与PS/CJS/diff-check通过，7文件整合后与受审68880d6源码完全相同。Master 原 LAN44 本地44/44不是Hosted等价证明，详见 C1-RESULT.md和C1-REWORK-MASTER-REVIEW.md。C2 尚未触发，FinalQA仍0/1，未有可交付 EXE；不因剩余次数直接 retry。
