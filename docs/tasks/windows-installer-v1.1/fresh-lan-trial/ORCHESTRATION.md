# Fresh LAN Trial — 长期Thread编排

唯一Master/return target：01a0db0e-c950-79e0-8e11-07155e0742f2。公开集成codex/lan-fresh-trial-v1.1；初始核验3f4f63089106ddd3cf34e3d0573cbb0a67963d16。

| Task | 负责 | Thread/worktree/branch | 状态 | 依赖 |
|---|---|---|---|---|
| FRESH-T1 | 自动物理Private发现与登录自启的既有机制核对/实施/本地反例 | 01a13945-ee6b-75b0-94bd-d2dc1e367e17 / E:\\CodexWorkspace\\CodexWorktrees\\7b54\\public-source / codex/fresh-t1-deployment | DISPATCHED；基线d293f0a | 批准规格 |
| FRESH-T2 | fresh-only Setup、实际安装浏览器验收/报告/独立workflow | 01a13948-7433-7571-8330-a09bfd12a0dc / E:\\CodexWorkspace\\CodexWorktrees\\bea7\\public-source / codex/fresh-t2-installer-ci | DISPATCHED；基线0eee621 | 独立构建先行；最终接线依赖T1 Review |
| FRESH-QA | 独立审查及同EXE最终QA | 待登记 | PENDING | Candidate完整PASS |

先核对T1能否在原安全/权限/技术栈中闭合，不允许以新目标重开无限PS/Native诊断。首次网络预选不等于信任/开放。主控Review后才整合；返回失败由read_thread→RESULT→worktree/local commit兜底，登记DELIVERY_RECOVERED，不伪称主动送达。

## Hosted账本

Candidate0/3；FinalQA0/1；旧Full/U27/LC01/Diagnostic0。每次登记source/run/attempt/固定阶段/cleanup；45分钟上限。无触发记录。QA仅首完整Candidate PASS后下载同一个EXE。

原所有Execution/QA和worktrees冻结保留；禁止普通sub-agent、后代Thread、push、main/tag/Release、内部SPXT及清理未知文件。
