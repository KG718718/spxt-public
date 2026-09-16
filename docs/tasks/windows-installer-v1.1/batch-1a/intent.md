# Batch 1A — Architecture Decision / Intent

日期：2026-09-16。级别：L2；阶段：Design，禁止 Build。

## 授权与状态

用户已验收 Batch 0，并授权“进入 Batch 1A Architecture Decision，仅设计，不写代码”。本轮意图已确认进入设计，不等于用户已接受本文档链中的技术建议。

仅限 KG718718/spxt-public；复用 codex/windows-installer-v1.1，设计基线 HEAD 为 49b3e35c68468b3c61e3ad19ed379ce057d17886。v1.0.0/main 仍为 84cbb324a4f63bef094d2c21d70eba841205a7a7。

## 问题与目标

现有 Install.cmd 在用户电脑下载 Node，installer.js 在用户电脑安装 npm 依赖。目标是把这些准备移动到可信构建阶段，让未来安装程序随包交付核心运行闭包，而不是继续改造在线安装体验。

本轮交付：有源码证据的方案对比、推荐架构、运行时边界、构建/用户依赖分类、资源清单契约、跨阶段约束、风险和后续验证门禁。不会生成或验证任何 Runtime 包。

## 范围

- 阅读公开源代码、锁文件和公开官方技术资料。
- 形成 [spec.md](spec.md) 架构草案、[plan.md](plan.md) 设计步骤与后续准入、[acceptance.md](acceptance.md) 设计检查记录。
- 增量登记公开 PROJECT、Master Plan 和 Decisions，不重写历史。
- 不新增工作树、子 Agent 或任务；不读取其他用途版本或真实数据。
- 不改 JS/HTML/CSS/CMD/JSON/YAML/Python，不安装依赖、不启动服务、不打包、不运行安装器或业务测试、不触发 CI。
- 本轮不提交或推送 Git，不创建 PR、Release，不合并或部署。

## 完成条件

设计建议与用户已确认要求严格分开；重大适配点有具体源码证据；留有可执行的未来验收标准，但不提前执行。交付后停在设计评审，不自动进入实现。
