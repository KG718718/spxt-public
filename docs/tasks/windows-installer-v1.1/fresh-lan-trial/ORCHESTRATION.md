# Fresh LAN Trial — 长期Thread编排

唯一Master/return target：01a0db0e-c950-79e0-8e11-07155e0742f2。公开集成codex/lan-fresh-trial-v1.1；初始核验3f4f63089106ddd3cf34e3d0573cbb0a67963d16。

| Task | 负责 | Thread/worktree/branch | 状态 | 依赖 |
|---|---|---|---|---|
| FRESH-T1 | 自动物理Private发现与登录自启的既有机制核对/实施/本地反例 | 01a13945-ee6b-75b0-94bd-d2dc1e367e17 / E:\\CodexWorkspace\\CodexWorktrees\\7b54\\public-source / codex/fresh-t1-deployment | RETURNED→REWORK→RETURNED→REVIEWED→INTEGRATED 7ffc019/4f846bf；基线d293f0a | T2构建/Startup/CI接线待验；详细FRESH-T1-MASTER-REVIEW.md |
| FRESH-T2 | fresh-only Setup、实际安装浏览器验收/报告/独立workflow | 01a13948-7433-7571-8330-a09bfd12a0dc / E:\\CodexWorkspace\\CodexWorktrees\\bea7\\public-source / codex/fresh-t2-installer-ci | RUNNING；基线0eee621 | 独立构建先行；最终接线依赖T1 Review |
| FRESH-QA | 独立审查及同EXE最终QA | 待登记 | PENDING | Candidate完整PASS |

先核对T1能否在原安全/权限/技术栈中闭合，不允许以新目标重开无限PS/Native诊断。首次网络预选不等于信任/开放。主控Review后才整合；返回失败由read_thread→RESULT→worktree/local commit兜底，登记DELIVERY_RECOVERED，不伪称主动送达。

## Hosted账本

Candidate0/3；FinalQA0/1；旧Full/U27/LC01/Diagnostic0。每次登记source/run/attempt/固定阶段/cleanup；45分钟上限。无触发记录。QA仅首完整Candidate PASS后下载同一个EXE。

原所有Execution/QA和worktrees冻结保留；禁止普通sub-agent、后代Thread、push、main/tag/Release、内部SPXT及清理未知文件。

## Master本地Review进度

T1 的授权前 bind 缺陷已由原 Thread 最小返工闭合，Master 实际独立复验并整合；最终 Review 结论以 FRESH-T1-MASTER-REVIEW.md 为准。四个新增测试保持原字节迁入 Fresh overlay，保留旧 13/28 静态测试身份。T2 保持 38 项源闭包及三 fresh 身份派生，已修正浏览器 clients 响应结构、员工项目附件关联、两阶段结果汇总、严格 Firewall filter 核对和安装日志编码接线；仍须完整本地回单与最终 Master Review，不凭草稿或 UI 活动标记 RETURNED。本地无现成受验 6.7.3 ISCC，ISS 实际编译 NOT_RUN，仅静态预处理；真实编译留获准 Candidate BUILD。工具缺失不是编译 PASS。

主控本地专项阶段性复验 105/105，追加汇总/观察/工具安全反例 6/6，均 fail0skip0；不是最终整体验收。原核心回归本机 Hosted-only 用例明示 SKIP，公开治理标签预检 FAIL 已仅以中性描述修复，原文档测试 8/8 PASS；完整核心 26/742 仍待 Candidate F08。没有真实本机安装、发行程序运行或网络/Firewall/Registry/登录启动项操作。
