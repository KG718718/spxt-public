# GOV-20260921 — Batch3验收与THREAD ORCHESTRATOR

状态：用户已批准，纯文档落地。来源：2026-09-21“项目协作治理调整”正式任务书；起点954109c0bdb2e7112286b27f78eac30b587f339e。

## 验收事实

用户确认R2人工1—10全部正常。结合e9417f036d0cdf736ff84682556a994040f0de0b的Setup35514357007 / Artifact10606870944、D13/13、I29自动通过及26套742项fail0 skip0，正式归档Batch 3 PASS — Windows 10 x64 Beta Track。I01/I02/I09由用户人工反馈补齐，不改原JSON，不重建。未认证Win11、干净机或签名；既有独立测试flake待办不改变。

## 决定及授权范围

- 下一获批Batch开始：主控只编排、Review、状态文档、整合、最终门禁/Git/Actions/交接；实质生产/安装/Launcher/Runtime/迁移/测试实现派独立Execution Thread，返工回原线程。
- 独立task接口形成一层执行/QA树，只有主控拆分；禁止默认sub-agent/spawn_agent。QA按风险创建，默认不改生产实现。
- 已批准THREAD ORCHESTRATION Batch允许临时一任务一worktree/local branch；不额外clone，执行仅local commit、不push、不合并主开发分支。主控审查后统一整合/推送并安全清理已整合临时工作树。
- 共享端口/进程/instance/注册表仍需协调；独立文件/资源且无依赖才并行，不强拆任务。
- 自包含任务卡、八字段精简回单和简短ORCHESTRATION索引按AGENTS.md执行。内部Thread不写网页版交接卡，主控或明确独立验收任务才写。
- 公共安全、合成数据、GitHub-first、CI权限、版本/Artifact追溯及main/v1.0.0/Release冻结全部保留。执行local commit是内部成果，不冲突于主控对外GitHub-first交付。

## 本轮限制和核验

只修改公开AGENTS、Master Plan、PROJECT、R2验收状态及本决策/交接卡；不修改工作区全局规则或其他用途项目。没有实际Execution/QA/sub-agent/worktree；没有生产代码/测试体系变更、构建或运行实例变化；没有Batch4/main/tag/Release。

交付前核验仅允许Markdown差异、git diff --check、规则交叉一致性、构建身份保留及敏感内容边界；不为文档改动重跑742项或重建安装包。实际治理执行效果要在后续获批Batch验证，不能宣称本轮已实测线程编排。
