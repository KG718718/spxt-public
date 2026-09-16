# K⁺-SESSION Windows Packaging Track — v1.1

状态：Batch0/1A/1B已批准；R3已提交/推送最终检查点a760f05。Batch1C-R4选型PASS：最新正式4.x为4.10.38；4.8.69/4.9.155/4.10.38各8样本三轮全过、与R3基线一致，推荐4.10.38 generic。实际隔离omit-optional安装无canvas/Skia/native；上游optional声明仍在，4.10.38的Node兼容提醒和历史major维护风险保留。仅完成选型/静态迁移计划，正式package/lock/server/构建门禁未改；须另批联合删除pdf-parse及完整闭包/业务回归/G1。R4三新报告与四状态文档未提交，不进入Batch2，不生成Runtime/Launcher/Setup/OCR/Release。详见batch-1c/PDF-4X-SELECTION.md、PDF-4X-MATRIX.json、PDF-MIGRATION-PLAN.md及CHATGPT-HANDOFF.md；原R1门禁不自动解除。
记录日期：2026-09-16。范围仅为公开仓库 [KG718718/spxt-public](https://github.com/KG718718/spxt-public)。

## 已确认基线与入口

- v1.0.0 是冻结的历史在线安装版；身份与资产见 [BATCH-00-BASELINE.md](BATCH-00-BASELINE.md)。
- 开发分支：`codex/windows-installer-v1.1`。
- 起点：公开版 main `84cbb324a4f63bef094d2c21d70eba841205a7a7`。
- 已确认决定与未决技术方案见 [DECISIONS.md](DECISIONS.md)。
- 验收门禁见 [ACCEPTANCE.md](ACCEPTANCE.md)。
- Batch 0 只建立文档和分支，不修改业务源码、Install.cmd、运行版本字段或构建配置。
- Batch 1A 历史入口：[Intent](batch-1a/intent.md)、[架构草案](batch-1a/spec.md)、[设计计划](batch-1a/plan.md)、[验收](batch-1a/acceptance.md)。其原始交付状态保留；后续批准以当前 Batch 1B 正式任务书和 Decisions 增量记录为准。
- Batch 1B设计入口：[Runtime Plan](batch-1b/RUNTIME-PLAN.md)、[Dependency Closure](batch-1b/DEPENDENCY-CLOSURE.md)、[Validation Plan](batch-1b/VALIDATION-PLAN.md)。原设计报告保留其交付时点状态，后续已获批准。
- Batch 1C入口：[RESULT](batch-1c/RESULT.md)、[网页版交接卡](batch-1c/CHATGPT-HANDOFF.md)。暂存Runtime和开发机诊断不等于完整G1通过。

## 最终产品目标（尚未实现）

面向 Windows 10/11 x64 的正式桌面安装软件。普通用户只下载一个安装程序，例如 `K-SESSION-Setup-x.x.x.exe`。

用户流程：

下载 → 双击安装 → 桌面快捷方式 → 双击启动 → 自动启动后台 → 自动打开页面 → 首次创建 Admin。

普通用户不得被要求安装 Node、npm 或 Git，不得被要求执行 npm install 或其他命令行、手工修改环境变量、手工启动后台服务，也不得保留 CMD 黑框作为运行前提。

核心程序安装完成后，无需联网下载 Node/npm 依赖即可运行；不能将联网补齐运行时伪装成离线闭包。OCR 属于单独阶段，Batch 0 不实施；OCR 的联网、资源和自动化边界须在其阶段明确。

## 边界与非目标

- 不改业务模型、审批逻辑、财务逻辑或权限模型。
- 不引入真实业务数据。
- 不预置用户、客户、供应商、项目、发票或公司配置；首次 Admin 由安装者创建。
- 不因为安装问题重写成 Electron。
- 不读取、比较、复制、修改其他用途版本；不访问其代码、配置、业务数据、内部账号、Token、API Key 或 Cookie。
- 不把零数据初始化当作清空已有数据的授权；升级、重装、重启和失败恢复必须保护已有数据。
- 若安装技术确实需要极少量业务入口适配，必须单独报告证据、影响和方案，由上级批准；不得自行扩大范围。
- 本轨道规划不等于执行后续 Batch、创建 Release、合并 main 或部署的授权。

## 版本与冻结策略

| 版本 | 定位 | 门禁 |
| --- | --- | --- |
| v1.0.0 | 历史在线安装版，冻结 | 禁止改 tag、删除版本、替换资产、覆盖原 ZIP、同名替换发行物、重写历史或 force push |
| v1.1.0-beta.1 | 后续候选版本计划 | 阶段实施、测试及独立发布授权后才可创建 |
| v1.1.0-beta.2 | 后续候选版本计划 | 同上，不代表自动承诺产出 |
| v1.1.0-rc.1 | 后续发布候选计划 | 完整门禁和已知风险复核 |
| v1.1.0 | 后续正式版本目标 | 必须先通过真实 Windows 干净环境验收，并获发布授权 |

旧版本安装体验问题不在 v1.0.0 原发行物上覆盖修复。Batch 0 不创建任何新 Release，不修改 package.json 等运行版本元数据。

## Windows 支持策略（目标，不是测试结论）

- 正式支持目标：Windows 11 x64、Windows 10 x64 的受维护版本。
- Windows 10 的具体版本、维护渠道和运行时支持组合尚待确认，不代表所有 Windows 10 均支持。
- 暂不承诺 Windows 11 ARM。
- 当前目标不包含 Windows 10 32-bit、Windows 8/8.1、Windows 7。
- Batch 0 不执行兼容性测试，不以既有 CI runner 成功替代普通用户干净机器验收。

## 后续 Batch 规划（本轮不执行）

| Batch | 范围 | 后续应形成的产物/门禁 |
| --- | --- | --- |
| 1 | Windows x64 Runtime 闭包 | 运行时、生产依赖、原生组件与资源清单；版本、来源、哈希、许可证与离线运行证据 |
| 2 | 桌面 Launcher | 启停、后台生命周期、页面打开、端口与重复启动方案；故障可诊断且无常驻 CMD |
| 3 | Setup.exe | 安装器技术经批准后实现；单文件安装与快捷方式，不要求用户开发环境 |
| 4 | 数据目录、升级、卸载 | 可写目录、备份、升级失败恢复及卸载保留数据的明确契约 |
| 5 | OCR 自动化 | 单独确定资源、安装、模型、网络与失败处理；不反向阻塞非 OCR 核心功能 |
| 6 | Windows 干净机器测试 | Windows 10/11 x64 目标矩阵的真实安装、首次启动、离线核心、升级与卸载证据 |
| 7 | CI、SBOM、许可证、代码签名、Release 管线 | 可追溯构建、依赖来源及许可审查、签名策略、校验和与发布门禁 |
| 8 | README、Release 页面及正式发布 | 用户下载入口、支持范围、安装说明与实际资产一致；获授权后发布 |

上述编号是规划顺序，不允许拖延必要的安全判断：Batch 1 在再分发依赖前就要核查许可证；Batch 3 实施前要明确 Batch 4 涉及的路径和数据保护接口，Batch 7 再统一管线产物。出现跨阶段阻塞应报告，不得擅自执行后续阶段。

## 执行与交付规则

每个 Batch 先确认范围、方案和验收标准，再实施。只提交审查过的公开资料；不纳入审计临时文件、本机配置或非公开资产。风险、失败与未测试项如实记录，不能以候选完成代替发布通过。

Batch 0/1A/1B已经获准，Batch 1C Runtime实施已执行但门禁未通过。当前停止于Batch 1C；不得以交接文档完成自动进入Batch 2、生成Launcher/Setup或开展新Batch。

### ChatGPT 网页版交接卡固定规则

从现在开始，每个Batch/子任务结束，自动在其对应任务目录额外生成CHATGPT-HANDOFF.md（本规则落地时先补当前1C），无须重复询问。该文件须独立、自包含，网页版不读取其他本地文件也能了解实际结果、技术事实、测试、未完成项、阻塞、Git状态、下一阶段准入和待上级决定事项。

默认800–1800中文字，保持下列固定格式；不放完整日志，没有的值写N/A，不编造。成功/失败/阻塞/有条件通过必须区分；文档子任务通过不能掩盖所在Batch失败，历史测试必须注明非本轮复测。

严禁Token、API Key、Cookie、密码、SMTP授权码、真实客户/发票/附件内容及其他用途版本内容。生成前进行内容检查，原RESULT、BUILD/VALIDATION REPORT、JSON evidence、logs、hashes全部保留，交接卡不替代原始证据。

每次生成后，最终回复必须以单独代码块完整输出文件全文。Windows允许时尝试将全文复制到剪贴板，例如：

```powershell
Get-Content -Raw "<CHATGPT-HANDOFF.md实际路径>" | Set-Clipboard
```

仅在复制成功后，最终回复首行写：“网页版交接卡已生成并复制到剪贴板，直接到 ChatGPT 网页版 Ctrl+V 即可。”

失败或环境不支持时，首行写：“网页版交接卡已生成，请复制下方代码块全部内容到 ChatGPT 网页版。”

剪贴板失败不导致Batch失败；不得虚报成功。本规则立即作为本项目后续所有Batch/子任务的固定执行标准，不等于允许继续实施或发布。

### ChatGPT 网页版交接卡固定模板

```text
===== CHATGPT HANDOFF BEGIN =====

项目：
K⁺-SESSION 公开版 Windows 一键安装重构

当前 Batch：
<Batch编号和名称>

结论：
<PASS / FAIL / BLOCKED / PASS WITH CONDITIONS>

一句话结论：
<1-3句话说明真正结果>

【本轮实际完成】
- ...

【关键数字 / 技术事实】
- source commit:
- HEAD:
- Node:
- npm:
- Runtime大小:
- 文件数:
- 生产依赖数:
- Artifact:
- SHA256:
没有的写 N/A，不要编造。

【实际测试结果】
- ...

【未完成 / 未验证】
- ...

【当前阻塞】
1. ...

【本轮修改范围】
- 新增：
- 修改：
- 明确未修改：

【Git状态】
- branch:
- HEAD:
- working tree:
- commit:
- push:
- PR:
- Release:
- main是否修改:
- v1.0.0是否修改:

【安全与边界】
- 是否访问内部版：
- 是否包含真实业务数据：
- 是否包含账号/Token/密码：
- 是否修改业务逻辑：

【下一阶段判断】
- 是否允许进入下一 Batch：
- 原因：

【需要 ChatGPT 网页版决定】
1. ...

【详细报告文件】
- RESULT.md
- 其他报告...

===== CHATGPT HANDOFF END =====
```
