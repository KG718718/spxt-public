# LC01-ID-R2 有界测试封装修复与唯一专项授权

2026-10-13。唯一Master 01a0db0e-c950-79e0-8e11-07155e0742f2。

## 当前边界

用户明确批准本轮测试封装修复，本地无安装stub与Master Review通过、所有失败能够产生安全明确固定分类后，才可使用新增LC01-ID-R2 GitHub专项最多1次。不是恢复LAN-2；Full Candidate0次、Final QA0次、额外diagnostic Hosted0次，不retry、不挪预算。历史37909613607 IDENTITY FAIL和Full #4 FAIL/根因UNKNOWN原义保留，原专项1/1已用不重计。

集成分支codex/lan2-manual-host-v1.1；基线391506b01ef2a6850e009027084d786859076418，本地及GitHub远端核对一致。现有.test-work/node_modules未跟踪现场保留，不清理。F3 Artifact10907910968当前expired=false，expiresAt2026-10-26T13:55:32Z，不靠其永久在线设计升级信任。

## 执行登记

Task LC01-ID-R2；原长期Execution Thread 01a11f35-5133-7ab0-9101-d9d01a69ccea；worktree E:/CodexWorkspace/CodexWorktrees/lan2-lc01/public-source；local branch codex/lan2-lc01-launcher-lifecycle，local起点f879eac6fc06788ccdac2fc436d323bd9a6628f4。已核对四个目标封装文件与Master基线无diff，不强行merge旧任务树。难度困难（安全报告/异步子进程/Node-PS-Go），Sol medium，L1测试修复。已成功派单，状态DISPATCHED；回单目标仅上述新Master。Execution仅local commit，不push/Actions/后代任务。

## 批准规格

1. 内层使用经过验证PowerShell7/Core pwsh；可信系统安装路径、所需.NET API、UTF8及非ASCII保真均验证，不删除原身份与安全检查，不修改历史F3规则。
2. 保留outer结果，独立严格白名单inner分类，区分未启动、报告缺失、初始占位、经过验证BLOCKED阶段、报告非法、身份失败、生命周期失败；无法证明执行则UNKNOWN。Report存在本身不作为执行证据。
3. 源commit/F3绑定、结果一致性、敏感/额外字段拒绝、非法报告fail closed；不泄漏raw stdout/stderr/exception/stack/路径/PID/账号/token/cookie/registry/业务。PASS须身份、自然生命周期、cleanup全部证实。
4. 最小范围仅lc01-hosted.ps1、lc01-hosted-report.cjs、对应测试、必要prepare-lc01-hosted.cjs生成接线及治理。生产Launcher/Setup/Runtime/业务/identity profile与原beta2历史规则/事务/rollback/main/tag/Release禁止改。

## 验收及停止

无安装stub覆盖解释器验证、参数/编码、未启动/缺失/占位/非法报告、各BLOCKED阶段传递、commit/F3不符、敏感字段、内外不一致、禁止伪造成功；Go overlay固定Go1.27.1离线编译及局部回归全部fail0skip0。Master独立Review并整合，公开分支local/origin/GitHub三方一致，才保留一次精确trigger。不得安装软件、本机运行F3/Launcher或研究解包/VM；不碰内部SPXT或清理原树。

专项PASS或FAIL均保存固定证据/治理，立即停回网页版，LAN-2保持冻结；不申请追加预算、不自行进入Full。最终仅报告修复与source、local gates、Review、Run及固定阶段、F3/secondLauncher/cleanup事实和Final Full准入判断。
## Master预审返工（尚未Hosted）

原线程实现进入本地门禁后，Master发现待关闭封装缺口：原probe读取空stderr可能返回null却与空串不等；publish未保存实际outer阶段；inner.reason只有字符正则而非固定白名单；PASS路径允许陈旧progress阶段。已退原线程修实际代码并补共享函数反例，未清理、不新任务、不改生产。零/空字符串比较只做内存算例确认，不调用身份安装器。上述不代表历史Run唯一根因，不增加Hosted预算。当前状态REWORK/Review未通过，专项仍0/1。