# GOV-20260922 — 网页版与工程主控职责边界

来源：2026-09-22用户“补充治理原则：网页版与Codex工程主控职责边界”。状态：用户已决定，文档落地；基线48b1d509c645fa04eb0b6c4f85128a513c79748d。

## 正式决定

网页版是产品策划、架构分析、方案比较与研究、Batch范围批准和最终验收层；Codex是ENGINEERING ORCHESTRATOR，不是产品决策者。2026-09-21的独立Thread编排、临时worktree及工程Git权限不扩展为产品批准权。

功能取舍、UX、业务规则、数据生命周期、安装/升级产品行为、重大架构、主要技术栈、平台支持范围、Release策略及明显Batch扩围，均须主控提供以下五字段，停止该决策点及依赖实施并交回网页版：

【当前事实】
【技术约束】
【可选方案】
【各方案影响】
【需要网页版决定的问题】

证据、推测、建议应区分；用CHATGPT-HANDOFF或专项决策卡交接，收到明确批准后写回任务规格，不假设自动同步。

Codex自行决定仅限获批方案内工程拆分、文件/模块分工、测试、Thread/worktree安排、非产品实现细节及CI/Git/Artifact流程；Review通过不能代替最终产品验收。Execution不得改产品/架构/Batch目标；规格与代码冲突返回BLOCKED / NEED PARENT DECISION，主控按该边界继续分级上报。

## 范围及核验

只修改公开AGENTS、PROJECT、MASTER-PLAN，并新增本记录和交接卡；不改旧验收/测试证据、不改代码或工作区全局规则，不创建任务/Agent/worktree。Batch3 PASS — Windows10 x64 Beta Track保持，不进入Batch4。仅文档范围、五字段/权限覆盖、一致性及git diff --check检查；不复跑业务测试或重建安装包。按现行GitHub-first规则只提交/推送开发分支，不动main/tag/Release。
