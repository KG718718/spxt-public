# Windows installer v1.1 决策登记

## Batch 2B 实施中｜2026-09-17

用户已验收2A并授权 Portable Candidate：基线 f4da811，已fetch/fast-forward且干净。仅当前公开分支增量开发；同一新commit fresh Runtime→配对根Launcher→外置Beta instance/log→只读程序目录/移动/ZIP解包测试。默认LOCALAPPDATA/K-SESSION/Beta/instance，日志在其launcher-logs子目录（不与业务logs混用）；测试定向E盘隔离路径，不是Batch4最终数据策略。
本轮L2设计/实施入口 docs/tasks/windows-installer-v1.1/batch-2b。首版处于构建测试阶段，尚无2B PASS或正式Artifact结论；完整26套742项及最终Actions ZIP人工验收仍是门禁。不改业务，不做Setup/OCR/main/Release；测试只用合成身份/数据，不创建Agent/任务/工作树。以下为历史记录。

## Batch 2A 收口｜2026-09-17

**PASS — Windows 10 x64 Beta Track；等待上级验收，不自动进入 2B。** 最终代码 `1dc0efc0209aebb40916ccd94d0fd2b423ed9705` 已仅推开发分支。Go 1.27.1 GUI Launcher、固定包内 Node、实例/端口/Job 安全与 GitHub-first 交付完成；Win10 19045 实际 EXE L01—L17 + 6 项反例通过。用户人工确认打开页面、无 CMD、停止后不可访问；隔离日志 STOPPED，未发现 Launcher 残留。

Launcher Actions [35127971944](https://github.com/KG718718/spxt-public/actions/runs/35127971944) 与公开版完整回归 [35127971754](https://github.com/KG718718/spxt-public/actions/runs/35127971754) 均通过，后者 26/26 套、742 项、0失败/跳过。EXE 为 unsigned Artifact，非 Setup/Release；本机与 CI 的配对 manifest/EXE hash 不同，详见 [Batch 2A RESULT](batch-2a/RESULT.md)。没有修改业务、main、v1.0.0、Release，没有进入 2B/Setup/OCR。下面旧记录仅代表当时时点。

## R5A 验收状态｜2026-09-16

**PASS FOR WINDOWS 10 BETA TRACK，等待上级验收，不自动进入Batch2。** R5检查点a3fa006、精确Git锁字节修复/最终源码37586d2已仅推开发分支。Hosted 35112295648完整26/26套742项、0失败/跳过，文件/目录symlink通过；fresh20生产包无Canvas/Skia/addon，许可0未解决项。Win10 19045开发机staging及新解包各12项Smoke通过。Runtime ZIP 48,284,049字节，SHA256 bfb9581ef089ca7bd8a8d695d776a7c91a2407c871e1affbbe3b479e001c36e2，未发布；结果详见batch-1c/RESULT.md（PROJECT入口为docs/tasks/windows-installer-v1.1/batch-1c/RESULT.md）。

Win10是当前主要开发机测试平台，不是干净机认证；Win11待Setup Beta后社区实测，不承诺已支持。无Launcher/Setup/OCR实施、main/tag/Release操作。技术代码已提交；本次最终结果文档留工作区等待验收。下面策略和历史记录按各自时点解释。

## 当前生效策略：R5A / Windows 10 Beta 优先（2026-09-16）

用户已批准：阶段1以Windows 10 x64为主要测试平台，先完成一键安装Beta；Windows 11 x64预期兼容，尚待社区实机验证，不是已验证支持。Win11不再阻塞本次Runtime及Batch2准入。Windows10 32-bit、8/8.1、7不支持，ARM不作承诺。

本轮允许R5测试候选检查点，仅推codex/windows-installer-v1.1；用GitHub Hosted Windows Server验证文件/目录symlink及原26套测试，不替代消费版Windows验证。26/26全部完成且无skip，PDF迁移/生产图/许可闭包、当前Win10开发机包内Node smoke、Runtime ZIP及全新解包复验全部通过后，可报告PASS FOR WINDOWS 10 BETA TRACK；仍需上级批准进入Batch2。

Runtime不是普通用户安装软件，本轮不发Release/Pre-release，不改main/tag/v1.0.0，不做Launcher/Setup/OCR。未来Batch2/3完成后，才规划K-SESSION-Setup-1.1.0-beta.1.exe Pre-release和WINDOWS-11-TESTING.md（下载/hash/安装/功能/诊断反馈，不含业务数据或凭据）。当前不生成该社区指南，不宣称干净机认证。Windows10具体版本/系统更新渠道与生命周期风险仍需正式发布前明确。

本节覆盖下文以及历史Batch1A/1B/1C材料中的Win11当前阻塞和“测试通过才可提交候选”的旧要求；原历史事实保留。

日期：2026-09-16。以下已确认项来源为用户 Batch 0 任务授权；未决项不构成技术选型批准。

## 已确认决定

| 编号 | 决定 |
| --- | --- |
| WIN-001 | 唯一目标仓库为 KG718718/spxt-public，只处理公开版，不研究其他用途版本 |
| WIN-002 | v1.0.0 为历史在线安装版，tag/Release/资产冻结；旧安装体验问题不覆盖原发行物修复 |
| WIN-003 | 从已核验公开 main 84cbb324a4f63bef094d2c21d70eba841205a7a7 建立 codex/windows-installer-v1.1 |
| WIN-004 | 最终目标为单 EXE 安装、桌面启动、自动后台与浏览器、首次创建 Admin，无开发环境或手工命令要求 |
| WIN-005 | 安装完成后核心无需联网下载 Node/npm 依赖；OCR 是单独阶段 |
| WIN-006 | 不改业务、审批、财务、权限模型，不重写成 Electron；必要入口适配单独报批 |
| WIN-007 | 新安装零预置用户/客户/供应商/项目/发票/公司配置；已有数据不得以零数据为由清空 |
| WIN-008 | 目标 Windows 11 x64 和 Windows 10 x64 受维护版本；ARM 不承诺，32-bit/8/8.1/7 不属于当前目标 |
| WIN-009 | 候选版本计划 beta.1 → beta.2 → rc.1 → 1.1.0；正式版本必须先有真实干净 Windows 验收 |
| WIN-010 | Batch 0 仅分支和规划文档；当轮允许仅推新开发分支，不允许 main 推送/合并、新 Release、业务修改或后续 Batch 实施 |
| WIN-011 | Batch 1B 正式任务书确认 Batch 1A 架构方向：私有 Node x64 + 原应用 + 构建阶段完整生产 node_modules + 未来 Setup；保留外部浏览器，不采用 Electron、Node SEA 或用户端安装 Node/npm/依赖 |
| WIN-012 | 当前 Batch 1B 仅实施设计，输出 Runtime/依赖/验证/结果四文档；不写代码、不下载生产依赖、不生成 Runtime/Setup、不进入 Batch 2；实现与后续授权仍未通过 |

## 未决技术方案（没有批准实施）

历史：2026-09-16 Batch 1A 交付时，[架构草案](batch-1a/spec.md) 尚待评审。此后用户正式 Batch 1B 任务书已确认其中的 Runtime 架构方向（WIN-011），并授权细化 [实施计划](batch-1b/RUNTIME-PLAN.md)。原交付文件不倒填验收；下面具体工具、路径与版本等事项仍未获实施批准。本轮不提交、推送或构建。

| 事项 | 当前状态 | 后续需要的证据/决定 |
| --- | --- | --- |
| Runtime 闭包 | 尚未实施 | Node 版本、生产依赖、原生组件、资源、再分发许可、离线能力与大小 |
| Launcher 技术 | 未选定 | Windows 进程生命周期、无黑框、重复启动、浏览器打开、异常诊断和端口处理方案 |
| 安装器工具 | 未选定 | Inno Setup 可作为候选，不是既定方案；未创建 .iss 或其他安装器实现 |
| 安装范围与权限 | 未选定 | 每用户/全机安装、提权需求、快捷方式、程序与可写数据目录边界 |
| 升级/卸载/恢复 | 未选定 | 数据保留、备份验证、版本兼容、失败恢复与卸载契约 |
| Windows 10 支持清单 | 待明确 | 受维护版本/渠道及 Runtime 支持依据和真实验收矩阵 |
| OCR 自动化 | 后续 Batch 5 | 引擎、模型、资源许可、在线/离线策略、失败与可选组件边界 |
| 签名与发行管线 | 后续 Batch 7 | 签名身份/费用授权、构建可追溯、SBOM、许可证、校验和、恶意软件误报处理 |

## 继续前的约束

Batch 0 不因已有历史安装脚本或候选工具而提前修复/实现。后续有证据表明必要的安装适配涉及业务入口时，应提交最小变更清单、风险与验证方案，等待上级决定。

Batch 0 冻结只建立工作规则，没有擅自改变 GitHub 权限、仓库保护、签名凭据或发布设置。当前仅 Batch 1B 实施设计获授权；Runtime 实现和 Batch 2 仍需另行授权，不自动继续。
