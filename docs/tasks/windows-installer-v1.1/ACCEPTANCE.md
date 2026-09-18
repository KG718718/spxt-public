# Windows installer v1.1 验收门禁

## 当前批准状态：Batch 2B PASS / Batch 3 方案待审｜2026-09-18

用户已重新完成本次 Actions 整包的 1–8 步人工验收：启动、自动开页、原账号登录、仅关闭浏览器、退出/停止、页面不可访问、重新启动、账号和数据保留均正常，未发现影响使用的异常。结合既有同 commit 自动化，Batch 2B 正式批准 PASS。受测源码仍为 `cfc329fb405b1c5e4881e96eb8f2b4f78e8af552`；Portable 35294691905 attempt2 / Artifact 10527372359 / 26套742项 fail0 skip0。当前仅归档结论，不重新构建或测试，不修改原 Artifact 的历史 PENDING 字段。

Batch 3 先提交六项范围方案（`docs/tasks/windows-installer-v1.1/batch-3/PROPOSAL.md`，仓库根相对路径），等待再次审批后实施；不是 Batch 3 实现通过。仅开发分支 codex/windows-installer-v1.1；main、v1.0.0 和现有 Release 不变，不自动进入后续 Batch。

`TEST-FLAKE — archive.updatedAt second-boundary stability` 单独登记于 `docs/tasks/windows-installer-v1.1/test-flake-archive-updated-at/TASK.md`，状态 OPEN / BACKLOG，不阻塞 Batch 3。保留断言和失败证据，不用简单 sleep 掩盖；未来单独定位修复。Win11/干净机、签名、事务排空并未因此获得验证。

以下均为历史时点记录；以本节及 Batch 2B 最新 RESULT 为当前状态。

## Batch 2B 自动化收口 / 人工验收待完成｜2026-09-18

状态 **PASS WITH CONDITIONS**。受测公开源码 cfc329fb405b1c5e4881e96eb8f2b4f78e8af552；Portable Actions 35294691905 attempt2全链通过，staging及全新ZIP解包各27项、公开26套742项0失败0跳过。Artifact 10527372359为成对整包，根Launcher绑定本次Runtime manifest；不得用本地包替代。Win10必须对本次Actions ZIP人工确认，2A反馈不复用；没有干净机/Win11认证。

保留attempt1既有archive.updatedAt跨秒断言失败；重跑未修改断言，未宣称该时间敏感测试已修复。停止不是事务排空保证。只改公开Launcher/打包/测试/文档，不改业务/main/v1.0.0，不做Setup/Release/OCR，不自动进入Batch3。完整身份、下载校验和剩余验收见batch-2b/RESULT.md与CHATGPT-HANDOFF.md；后续仅报告提交不代表重编译。以下为历史时点。

## 当前生效策略：R5A / Windows 10 Beta 优先（2026-09-16）

用户已批准：阶段1以Windows 10 x64为主要测试平台，先完成一键安装Beta；Windows 11 x64预期兼容，尚待社区实机验证，不是已验证支持。Win11不再阻塞本次Runtime及Batch2准入。Windows10 32-bit、8/8.1、7不支持，ARM不作承诺。

本轮允许R5测试候选检查点，仅推codex/windows-installer-v1.1；用GitHub Hosted Windows Server验证文件/目录symlink及原26套测试，不替代消费版Windows验证。26/26全部完成且无skip，PDF迁移/生产图/许可闭包、当前Win10开发机包内Node smoke、Runtime ZIP及全新解包复验全部通过后，可报告PASS FOR WINDOWS 10 BETA TRACK；仍需上级批准进入Batch2。

Runtime不是普通用户安装软件，本轮不发Release/Pre-release，不改main/tag/v1.0.0，不做Launcher/Setup/OCR。未来Batch2/3完成后，才规划K-SESSION-Setup-1.1.0-beta.1.exe Pre-release和WINDOWS-11-TESTING.md（下载/hash/安装/功能/诊断反馈，不含业务数据或凭据）。当前不生成该社区指南，不宣称干净机认证。Windows10具体版本/系统更新渠道与生命周期风险仍需正式发布前明确。

本节覆盖下文以及历史Batch1A/1B/1C材料中的Win11当前阻塞和“测试通过才可提交候选”的旧要求；原历史事实保留。

本文件定义验收标准，不宣称尚未实施的功能已经通过。

## Batch 0 完成门禁

- 重新只读核验公开 main、v1.0.0 tag、正式 Release、安装 ZIP 名称及实际 SHA256，与用户指定基线一致。
- v1.0.0 tag、Release 和资产未修改，main 未改写或合并。
- 从已核实 main 建立独立 codex/windows-installer-v1.1 开发分支。
- MASTER-PLAN.md、BATCH-00-BASELINE.md、ACCEPTANCE.md、DECISIONS.md 建立，包含已确认目标、边界、阶段、支持与版本策略。
- 分支相对基线只增加任务规划 Markdown，不包含业务源码修改、业务数据、本机私有配置或审计临时产物。
- 没有实施 Setup.exe、Runtime 闭包、Launcher、OCR 或 Install.cmd 修复，没有提前进入 Batch 1。
- 没有读取、比较、导出或修改其他用途版本。
- 生成单独交付的 BATCH-00-RESULT.md，包含提交后的实际 HEAD、git status、差异统计、推送状态和遗留问题。
- 若推送，仅推送新开发分支；不创建 PR/Release、不触发人工发布、不合并、不部署。
- 完成后停止，等待上级验收。

## 后续正式产品验收（Batch 0 不执行）

1. 在目标 Windows 干净环境中，仅下载一个 K-SESSION-Setup-x.x.x.exe；无预装 Node/npm/Git/Python 或其他开发环境的前提。
2. 双击安装完成后出现桌面快捷方式；双击快捷方式自动启动后台并打开页面，无常驻 CMD 黑框。
3. 普通用户不执行命令、不改环境变量、不手工复制运行文件、不手工启动后台。
4. 核心程序不依赖安装后联网下载 Node/npm 依赖；断网核心验收和可选联网功能区分记录。
5. 新安装零预置账号与业务数据，安装者通过页面创建第一个 Admin；不包含真实身份、配置、凭据或网络地址。
6. 既有业务模型、权限、审批、财务与历史快照规则不变；必要入口适配必须有单独审批记录和针对性回归。
7. 实测中文/空格路径、普通用户权限、数据目录写入、端口冲突、重复启动、进程退出和可诊断失败。
8. 升级、失败回滚、重装与卸载的数据保留行为有明确契约和验证，不能静默清空用户数据。
9. OCR 单独验收其依赖、模型、下载与失败行为，不把 OCR 未覆盖项混写为核心安装通过。
10. 依赖来源、SBOM、许可证、原生组件、校验和、代码签名策略、构建到资产可追溯性完成审查。
11. Windows 11 x64 与 Windows 10 x64 受维护版本逐项记录版本/构建号、权限、网络条件、测试步骤及结果；ARM 和旧系统不冒称已支持。
12. README、Release、文件名、版本、安装说明和实际用户体验一致；真实干净机器未通过前禁止正式 v1.1.0 Release。

## 证据规则

- 分清“已验证”“仅代码分析”“目标”“未测试”，不以测试夹具冒充真实用户机器。
- 每个后续 Batch 的失败、未决问题和重大风险必须保留，不以跳过测试标绿。
- CI 成功、安装验证、Release 创建和部署是不同事件，分别报告。
- 本轮只做文档、Git 范围和基线不变检查；不宣称业务或 Windows 安装回归已重新运行。
