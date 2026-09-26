# K⁺-SESSION｜项目状态

## Batch 4 自动续行｜2026-09-26

用户已批准迁移完成后立即恢复原B4-T4。两份治理提交已仅推 `codex/windows-installer-v1.1`，local/origin/GitHub API均核验为 `159ee4163dd52c08584856521463a793eb6e5c7a`；治理push未触发完整Actions。唯一新主控及回单目标不变，旧主控改记 RETIRED — READ ONLY HISTORY。

当前先处理pre-baseline固定阶段诊断，原任务/工作树/branch/baseline/scope保留。最小诊断4、Full Setup2、QA Hosted2的剩余预算及当前状态见 [自主执行台账](docs/tasks/windows-installer-v1.1/batch-4/AUTONOMOUS-EXECUTION.md)。本节替代下文暂停与旧预算耗尽的当前效力，历史失败仍保留，不能预先宣称Batch4通过。

## 唯一工程主控迁移｜2026-09-26

用户批准 Phase 2 控制职责接管：唯一活动主控及回单目标为 `01a0db0e-c950-79e0-8e11-07155e0742f2`；旧主控 `019fa7e9-f46b-7192-9052-cd0aac7c2cc5` 标记 **RETIRED — AUTH FAILURE**，仅保留历史读取用途。当前主要目录继续使用本公开仓库；本轮仅治理文档及回单握手，不恢复 Batch 4 生产开发、Hosted 或 QA。

Batch 4 仍为 **BLOCKED / 未验收**，断点为第二次 sequence run `36145933140` 的 pre-baseline 固定阶段诊断缺口。B4-T1/T1A/T2/T3 已整合；B4-T4 局部返工已整合但生命周期未通过；B4-QA 尚未创建。迁移回执和独立接管验收见 [MASTER-MIGRATION.md](docs/tasks/windows-installer-v1.1/batch-4/MASTER-MIGRATION.md)，不把迁移通过写成 Batch 4 PASS。

## Batch 4 最新状态｜2026-09-25

公开开发分支 `codex/windows-installer-v1.1` 的受测提交为 `3ae73b7e4c37c1615c4867345883432d58150fbc`。经用户批准的第二次且仅 `mode=sequence` Hosted 诊断 run `36145933140` 已结束：完整 Setup 等其他作业均跳过，sequence 作业在生命周期测试的首个 `BASELINE` 阶段码之前失败；封闭 Artifact `10869846376` 只有 `status=FAIL, phases=[]`，未取得 U20 登记身份子原因。此前第一次 sequence run `36141099074` 则在诊断壳构建阶段失败，已本地修正并通过第二次构建。两次授权额度均已使用，禁止自行第三次运行或启动完整流水线。Batch 4 仍为 **BLOCKED / 未验收**；下一步须先解决 pre-baseline 安全诊断缺口并由用户另行批准 Hosted 验证。2026-09-25 用户补充 Execution / QA 双通道回单及主控 watchdog，已写入 AGENTS.md 与 MASTER-PLAN.md；执行任务的结束不自动等于主控收到回单或 Batch 通过，回单治理更新不授权继续托管诊断。详细证据见 `docs/tasks/windows-installer-v1.1/batch-4/ORCHESTRATION.md`。main、v1.0.0、Release、其他用途版本和真实数据未动。

## Batch 4 正式启动 / 编排阶段

用户批准 Safe Upgrade / Rollback / Data Lifecycle，限 beta.1→beta.2；公开仓库已设为当前项目主要目录，Preflight 起点 2839ba62220e53d126e9fb00757cd89ff89a1b83 与 GitHub 开发分支一致且干净。首次 Git 连接重置后经 GitHub API 核实。
采用一层独立 Execution / QA tasks，worktree 只使用当前项目已配置的 Codex managed worktree 根目录，执行只 local commit，主控统一 Review/整合/开发分支 push。主控不写实质实现。T2只读实例预检经一次主控对抗返工后已整合：专项19 PASS/1项因本机file symlink权限SKIP，startup 80 checks及installer contract通过；完整CI需补该链接实测。

T1旧安装身份校验经主控返工后已整合：43/43，采用beta.2固定hash的封闭historical+fresh identity bundle，不因相同commit/tree放宽。下一前置为T1A在受控GitHub Windows runner实际安装尚未过期的历史Artifact10606870944并提取仅非敏感anchors；未取得前不进入T3事务实现。
入口 docs/tasks/windows-installer-v1.1/batch-4/ORCHESTRATION.md；L2 Intent/Spec/Plan/Acceptance 已按本次批准任务书建立。文档检查点 b96543d 已推开发分支；T1/T2 独立执行任务已提交创建，均指定该基线与 E 盘 managed worktree，等待身份回报；实质实现由执行任务承担。未生成 beta.2、未执行本批完整门禁或人工验收，不能报告 Batch4 PASS。main/v1.0.0/Release 及其他用途版本禁止操作。后续任务按依赖派发，不自动进入下一 Batch。

## 工程主控决策边界补充｜2026-09-22

用户明确：网页版负责产品策划、架构分析/研究、Batch范围批准和最终验收；Codex为ENGINEERING ORCHESTRATOR，只能在已批准方案内做工程决定。产品/UX/业务/数据生命周期/安装升级行为/重大架构/主要技术栈/平台范围/Release策略或Batch扩围，必须按AGENTS.md五字段形成决策卡并停止相关实施，交回网页版决定。Execution遇到任务卡与代码冲突返回BLOCKED / NEED PARENT DECISION，不重定义需求。

只补公开治理文档；Batch3 PASS — Windows10 x64 Beta Track保持，不进入Batch4、不创建执行/QA/Agent/worktree、不改生产代码或历史构建身份。决策入口docs/tasks/windows-installer-v1.1/governance-20260922/DECISION.md。下方历史职责表述以本次边界约束为准。

## Batch 3 PASS / 协作治理已更新｜2026-09-21

用户本次任务书明确确认Batch3-R2人工1—10全部正常。结合受测e9417f036d0cdf736ff84682556a994040f0de0b / Setup35514357007 / Artifact10606870944既有D13/13、I29自动通过及26套742项0失败0跳过，正式记录 **Batch 3 PASS — Windows 10 x64 Beta Track**。I01/I02/I09由此次用户人工验收补齐；原Artifact的PENDING历史字段不重写。本轮仅归档，不重新测试或构建，不扩大为Win11、干净机或代码签名认证。

从下一获批Batch采用THREAD ORCHESTRATOR：主控拆分、独立Execution/风险对应QA、Review、整合、最终门禁和GitHub交付；实质代码/测试实现交执行对话，返工退回原任务。禁止默认sub-agent；一层对话树；获批Batch内允许一任务一临时worktree/local branch，执行只local commit且不push，主控统一整合/推送。详见AGENTS.md及docs/tasks/windows-installer-v1.1/governance-20260921/DECISION.md。内部执行不生成网页版交接卡，主控才生成；较大Batch用ORCHESTRATION.md恢复索引。

本轮只改公开文档，未创建Execution/QA/Agent/worktree，未进入Batch4。main/v1.0.0/Release冻结。本次文档提交不替代受测代码SHA；旧BLOCKED与旧规则段落均为历史时点，以下不覆盖本节。

## Batch 3-R2 数据与附件位置｜2026-09-20

当前 BLOCKED / 自动化通过、等待新包Win10人工十步。程序目录保持固定且隐藏，新增必要数据位置选择；外置安装绑定确保快捷方式/完成页/直接EXE一致。未知非空、系统/重解析点/交叠/不可写路径拒绝；卸载保留、重装恢复，不做数据迁移。

受测代码 e9417f036d0cdf736ff84682556a994040f0de0b：Setup35514357007、Runtime35514356958、Launcher35514356976、Portable35514356966全部成功。D13/13 PASS，I32中29 PASS+3人工待验；26套742项fail0 skip0。Artifact10606870944，Setup SHA256 49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8。文档归档不代表新构建；只推开发分支，未改main/v1.0.0/Release、业务代码或其他用途版本。入口 docs/tasks/windows-installer-v1.1/batch-3-r2/RESULT.md 和 CHATGPT-HANDOFF.md。R1六步已被本轮十步新需求取代，不继续旧包验收，不进入Batch4。以下为历史记录。

## Batch 3-R1 Setup UX收口｜2026-09-20

用户已补齐旧ff75923原始Setup的Win10人工十步，唯一续修为隐藏安装前路径确认页。R1仅调整Inno Ready页面及保留风险提示页的安装按钮，补默认目录实装检查和失败事件诊断；业务/Launcher生产/Runtime/数据策略不变。

最终受测c5705447b93ee64a6be56cbc67779ba844c2bfe8：Setup35509078762、Portable35509078684、Launcher35509078698、Runtime35509078708均SUCCESS；Setup26/742 fail0 skip0，32项中29 PASS、I01/I02/I09人工待验。新Artifact10604748884，EXE hash25b52591ecb0783869ef08d5f599d0d3fffd94cebd98a38d94e4657732ae4c40。默认目录实装和/DIR中文空格通过。首轮Portable第三次启动超时保留证据，诊断续行未复现，未宣称根因修复。

当前BLOCKED/等待新包六步人工复验，不能报告Batch3最终PASS。报告归档独立于受测源码；仅开发分支，不改main/v1.0.0/Release，不进入Batch4。最新入口batch-3/RESULT.md及CHATGPT-HANDOFF.md。以下为历史时点记录。

## Batch 3 已批准实施｜2026-09-20

用户正式任务书批准 Windows Setup Beta 实现，沿用 codex/windows-installer-v1.1，起点3733d99。L2入口 batch-3/intent.md、SPEC.md、PLAN.md、ACCEPTANCE.md；历史PROPOSAL保留。固定官方Inno6.7.3，当前用户免提权、program/uninstall分离、外置Beta数据、拒绝覆盖/运行中卸载；不改业务或Launcher契约。

受测ff759238b59f3a6076524f82b81d56690ae4e3d3：Setup35506827438、Portable35506827492、Launcher35506827463、Runtime35506827449全部通过；同commit fresh配对、实际CI断外网安装/核心/卸载/重装、26套742项0失败0跳过通过。原始Artifact10604780606。当前仍为BLOCKED/等待Win10本次安装器人工十步，I01/I02/I03/I09不能用CI代替；不是Batch3 PASS。报告归档不冒充重新构建。本批不进入Batch4/OCR/签名/main/Release。只操作公开版，未创建Agent/任务/worktree。

## 当前批准状态：Batch 2B PASS / Batch 3 方案待审｜2026-09-18

用户已重新完成本次 Actions 整包的 1–8 步人工验收：启动、自动开页、原账号登录、仅关闭浏览器、退出/停止、页面不可访问、重新启动、账号和数据保留均正常，未发现影响使用的异常。结合既有同 commit 自动化，Batch 2B 正式批准 PASS。受测源码仍为 `cfc329fb405b1c5e4881e96eb8f2b4f78e8af552`；Portable 35294691905 attempt2 / Artifact 10527372359 / 26套742项 fail0 skip0。当前仅归档结论，不重新构建或测试，不修改原 Artifact 的历史 PENDING 字段。

Batch 3 先提交六项范围方案（`docs/tasks/windows-installer-v1.1/batch-3/PROPOSAL.md`，仓库根相对路径），等待再次审批后实施；不是 Batch 3 实现通过。仅开发分支 codex/windows-installer-v1.1；main、v1.0.0 和现有 Release 不变，不自动进入后续 Batch。

`TEST-FLAKE — archive.updatedAt second-boundary stability` 单独登记于 `docs/tasks/windows-installer-v1.1/test-flake-archive-updated-at/TASK.md`，状态 OPEN / BACKLOG，不阻塞 Batch 3。保留断言和失败证据，不用简单 sleep 掩盖；未来单独定位修复。Win11/干净机、签名、事务排空并未因此获得验证。

以下均为历史时点记录；以本节及 Batch 2B 最新 RESULT 为当前状态。

## Batch 2B 自动化收口 / 人工验收待完成｜2026-09-18

状态 **PASS WITH CONDITIONS**。受测公开源码 cfc329fb405b1c5e4881e96eb8f2b4f78e8af552；Portable Actions 35294691905 attempt2全链通过，staging及全新ZIP解包各27项、公开26套742项0失败0跳过。Artifact 10527372359为成对整包，根Launcher绑定本次Runtime manifest；不得用本地包替代。Win10必须对本次Actions ZIP人工确认，2A反馈不复用；没有干净机/Win11认证。

保留attempt1既有archive.updatedAt跨秒断言失败；重跑未修改断言，未宣称该时间敏感测试已修复。停止不是事务排空保证。只改公开Launcher/打包/测试/文档，不改业务/main/v1.0.0，不做Setup/Release/OCR，不自动进入Batch3。完整身份、下载校验和剩余验收见batch-2b/RESULT.md与CHATGPT-HANDOFF.md；后续仅报告提交不代表重编译。以下为历史时点。

## Batch 2B 实施中｜2026-09-17

用户已验收2A并授权 Portable Candidate：基线 f4da811，已fetch/fast-forward且干净。仅当前公开分支增量开发；同一新commit fresh Runtime→配对根Launcher→外置Beta instance/log→只读程序目录/移动/ZIP解包测试。默认LOCALAPPDATA/K-SESSION/Beta/instance，日志在其launcher-logs子目录（不与业务logs混用）；测试定向E盘隔离路径，不是Batch4最终数据策略。
本轮L2设计/实施入口 docs/tasks/windows-installer-v1.1/batch-2b。首版处于构建测试阶段，尚无2B PASS或正式Artifact结论；完整26套742项及最终Actions ZIP人工验收仍是门禁。不改业务，不做Setup/OCR/main/Release；测试只用合成身份/数据，不创建Agent/任务/工作树。以下为历史记录。

## Batch 2A 收口｜2026-09-17

**PASS — Windows 10 x64 Beta Track；等待上级验收，不自动进入 2B。** 最终代码 `1dc0efc0209aebb40916ccd94d0fd2b423ed9705` 已仅推开发分支。Go 1.27.1 GUI Launcher、固定包内 Node、实例/端口/Job 安全与 GitHub-first 交付完成；Win10 19045 实际 EXE L01—L17 + 6 项反例通过。用户人工确认打开页面、无 CMD、停止后不可访问；隔离日志 STOPPED，未发现 Launcher 残留。

Launcher Actions [35127971944](https://github.com/KG718718/spxt-public/actions/runs/35127971944) 与公开版完整回归 [35127971754](https://github.com/KG718718/spxt-public/actions/runs/35127971754) 均通过，后者 26/26 套、742 项、0失败/跳过。EXE 为 unsigned Artifact，非 Setup/Release；本机与 CI 的配对 manifest/EXE hash 不同，详见 [Batch 2A RESULT](docs/tasks/windows-installer-v1.1/batch-2a/RESULT.md)。没有修改业务、main、v1.0.0、Release，没有进入 2B/Setup/OCR。下面旧记录仅代表当时时点。

## R5A 验收状态｜2026-09-16

**PASS FOR WINDOWS 10 BETA TRACK，等待上级验收，不自动进入Batch2。** R5检查点a3fa006、精确Git锁字节修复/最终源码37586d2已仅推开发分支。Hosted 35112295648完整26/26套742项、0失败/跳过，文件/目录symlink通过；fresh20生产包无Canvas/Skia/addon，许可0未解决项。Win10 19045开发机staging及新解包各12项Smoke通过。Runtime ZIP 48,284,049字节，SHA256 bfb9581ef089ca7bd8a8d695d776a7c91a2407c871e1affbbe3b479e001c36e2，未发布；结果详见batch-1c/RESULT.md（PROJECT入口为docs/tasks/windows-installer-v1.1/batch-1c/RESULT.md）。

Win10是当前主要开发机测试平台，不是干净机认证；Win11待Setup Beta后社区实测，不承诺已支持。无Launcher/Setup/OCR实施、main/tag/Release操作。技术代码已提交；本次最终结果文档留工作区等待验收。下面策略和历史记录按各自时点解释。

## Batch 1C-R5A 续行授权｜2026-09-16

当前用户批准Windows10 x64 Beta优先，Win11转为Setup完成后社区实机验证，未验证前不承诺支持。允许先提交R5测试候选并只推开发分支；GitHub Hosted Windows补文件/目录symlink及原26套完整回归。通过后再fresh Runtime、许可、Win10开发机包内Node smoke、ZIP及全新解包复验。当前执行中，没有新的PASS或发行物结论；不进入Launcher/Setup/OCR/main/Release。

完整门禁见MASTER-PLAN/ACCEPTANCE/DECISIONS顶部R5A策略；该授权覆盖下面R5旧提交阻塞。仅复用当前公开目录，不访问其他用途版本，不创建Agent/工作树。

## Windows installer v1.1 / Batch 1C-R5｜2026-09-16

**R5未通过：完整回归门禁受Windows符号链接权限阻断；不等于已证PDF迁移回归。** R4已提交/仅推开发分支检查点f7dc474。工作区已精确迁移PDF.js4.10.38 generic并移除pdf-parse；fresh生产图20包、无Canvas/Skia/native，真实提取函数8样本三轮通过。26套原测试首轮23成功；浏览器/文档复验通过后25套完成，startup-filesystem在14项通过后symlink EPERM中止。未改系统权限、业务规则或测试断言。

R5尚未提交/推送，构建器适配为未验收草稿；没有新commit Runtime、ZIP、最终许可集合或G1。需有符号链接权限的隔离Windows环境补跑，不能宣称仅G1待验。未进入Batch2/Launcher/Setup/OCR/Release；main/v1.0.0不变。见[迁移结果](docs/tasks/windows-installer-v1.1/batch-1c/PDF-MIGRATION-RESULT.md)与[交接卡](docs/tasks/windows-installer-v1.1/batch-1c/CHATGPT-HANDOFF.md)。以下为历史记录。

## Windows installer v1.1 / Batch 1C-R4 版本选择｜2026-09-16

**PASS，推荐pdfjs-dist精确4.10.38 generic，正式迁移未获批、未执行。** 官方npm确认它是最后正式4.x；4.8.69/4.9.155/4.10.38以R3字节不变8样本各3轮均通过（72/72），文本/完整transform/页数与R3基线一致。隔离omit-optional安装各1包，实际native/canvas/Skia加载均0，前后hash不变。4.10.38每轮1条上游generic Node提醒保留，非DOM缺失错误；历史major维护承诺未取得，不能说绝对安全。官方3条公开包公告及精确版本查询均未命中候选。

R3七份报告及空白修正已普通提交/仅推开发分支；最终检查点/HEAD `a760f0544dc5b966bad33c91b38204f504f97bb2`，远端回查一致，main/v1.0.0未变。R4新增3份报告、修改4份状态MD，未额外提交推送。正式package/lock/server/32应用文件及构建器未改；实验依赖/样本/证据均留源码外E盘，无业务数据。后续需单独批准联合删除pdf-parse、generic入口/本地资源适配、完整生产图和测试/许可门禁重审；不进入Batch2，不做Launcher/Setup/OCR/Release。见[版本选择](docs/tasks/windows-installer-v1.1/batch-1c/PDF-4X-SELECTION.md)、[三轮矩阵](docs/tasks/windows-installer-v1.1/batch-1c/PDF-4X-MATRIX.json)、[静态迁移计划](docs/tasks/windows-installer-v1.1/batch-1c/PDF-MIGRATION-PLAN.md)、[交接卡](docs/tasks/windows-installer-v1.1/batch-1c/CHATGPT-HANDOFF.md)。下文为历史时点。

## Windows installer v1.1 / Batch 1C-R3 PDF架构Spike｜2026-09-16

R2八份文档已提交并仅推送开发分支检查点`8b177a0026f34067fb66a9ad5fa715a577ff56bc`，远端回查一致；main/v1.0.0未变。R3结论为 **PASS — viable text-only PDF alternative found**：官方pdfjs-dist4.8.69 generic在Node24、禁addon/文件白名单下，8类合成PDF三轮全过，canvas/Skia/native均无；这是历史版本的技术可行性，不是批准降级或无漏洞保证。5.4.296无canvas导入失败；6.3.289 legacy仍有DOM警告；其他纯JS候选问题详见报告。

正式业务、package/lock、构建门禁未改，原Runtime许可/G1阻塞保留；不进入Batch2。首轮父级第三方依赖解析越界已披露、作废并隔离重跑，未读内部业务代码/配置/数据。R3仅4份tracked MD修改、3新增报告/JSON，未提交/推送；实验与原始证据在E盘源码外。见[架构报告](docs/tasks/windows-installer-v1.1/batch-1c/PDF-ARCHITECTURE-SPIKE.md)、[安全比较](docs/tasks/windows-installer-v1.1/batch-1c/SECURITY-COMPARISON.md)、[交接卡](docs/tasks/windows-installer-v1.1/batch-1c/CHATGPT-HANDOFF.md)。等待上级选择迁移专项、最新PDF.js纯文本研究或返回R1，不自动实施。下文为历史时点。

## Windows installer v1.1 / Batch 1C-R2 依赖审计｜2026-09-16

R1的10份文档/工具已提交并推送检查点`2aeaa4089520a99829f1b9981b7b5ea2bfa9e295`到codex/windows-installer-v1.1。仅公开版135文件审计及原lock fresh安装完成：23生产包，pdfjs-dist有独立optional canvas路径，只导入其业务入口即可加载Skia，未加载pdf-parse。应用业务未发现pdf-parse调用，但原host-smoke确实调用PDFParse.getText，不能说整个源码树未用。

**Batch1C-R2 BLOCKED：删除条件D不成立，B亦未满足。** 未删依赖、未改package/lock或32应用文件、不做Runtime重建/ZIP、不进入Batch2。原R1三个许可缺项与Win11G1环境阻塞保留。报告7份MD修改+1新增MD尚未额外提交，HEAD/远端仍为R1检查点；外置证据不入Git。详见[结果](docs/tasks/windows-installer-v1.1/batch-1c/RESULT.md)、[依赖审计](docs/tasks/windows-installer-v1.1/batch-1c/DEPENDENCY-USAGE-AUDIT.md)、[交接卡](docs/tasks/windows-installer-v1.1/batch-1c/CHATGPT-HANDOFF.md)。以下为历史状态，不覆盖本节。

## Windows installer v1.1 / Batch 1C-R1 续行｜2026-09-16

已建立并推送检查点`468d62357fe4861a9a3015df23a7b6c1862b858a`到codex/windows-installer-v1.1（25文件），main/v1.0.0未动。随后仅收集公开原生来源和许可证据，54份原文及hash齐备，但Rust解析依赖、Skia实际链接来源/组件图、最终适用声明仍有3个未关闭分发工作项。**Batch 1C FAIL — native distribution evidence incomplete**；不生成ZIP、不改许可门禁、不进入Batch 2/3。

29守卫+14完整性反例复跑通过，新增75项证据一致性检查通过；旧Runtime1199文件hash不变。没有fresh Runtime构建或G1：当前是Windows10开发机，没有合格Win11环境，已编写22项G1准备说明。没有访问其他版本/真实数据、改业务代码或安装/发布。R1续行工具与报告仍未提交，HEAD为检查点；检查点push不代表R1报告已push。详见[本轮结果](docs/tasks/windows-installer-v1.1/batch-1c/RESULT.md)、[原生许可缺项](docs/tasks/windows-installer-v1.1/batch-1c/NATIVE-LICENSE-CLOSURE.md)、[交接卡](docs/tasks/windows-installer-v1.1/batch-1c/CHATGPT-HANDOFF.md)。以下历史状态不覆盖本节。

## 固定交付规则：网页版交接卡｜2026-09-16

用户确认每个Batch/子任务结束自动生成自包含CHATGPT-HANDOFF.md，最终回复完整代码块输出，并在Windows允许时复制到剪贴板；失败不改变技术验收结果。规则已写入公开AGENTS.md与Master Plan，立即生效。当前已补[Batch 1C交接卡](docs/tasks/windows-installer-v1.1/batch-1c/CHATGPT-HANDOFF.md)，原始报告与证据保留。本次仅文档规则落地，未复测、未构建、未进入新Batch；1C仍为FAIL，不放行Batch 2。

## Windows installer v1.1 / Batch 1C Runtime Prototype｜2026-09-16

用户已批准 Batch 1B，授权本轮 Runtime 实施，不授权 Launcher/Setup/Release。已新增独立构建/验证工具，只从公开 commit 49b3e35c68468b3c61e3ad19ed379ce057d17886 取件；32个应用文件不变，官方Node24.21.0/npm11.19.0及23个fresh生产依赖完成暂存组装，manifest/hash和原生/PDF加载通过。E盘源码外暂存1,199文件/194,275,955字节。

**Batch 1C FAIL，未放行Batch 2。** Canvas原生嵌入组件许可尚未闭合，构建器拒绝生成ZIP；当前仅Windows10开发机，不具备干净Win11离线G1证据。29项守卫、14项合成完整性反例、12项开发机功能诊断通过，不能替代正式G1。详见 [RESULT](docs/tasks/windows-installer-v1.1/batch-1c/RESULT.md)、[构建报告](docs/tasks/windows-installer-v1.1/batch-1c/RUNTIME-BUILD-REPORT.md)、[验证报告](docs/tasks/windows-installer-v1.1/batch-1c/VALIDATION-REPORT.md)。

没有修改业务源码/锁文件/原安装脚本，没有Runtime ZIP/Setup/Launcher，没有提交/推送/CI/PR/Release/合并/部署。main/v1.0.0未改；既有未提交1A/1B设计保留。合成实例只在E盘外置诊断目录，服务已停止。下一步先处理本批许可与目标环境门禁，不提前进入Batch 2/3。

## Windows installer v1.1 / Batch 1B 实施设计｜2026-09-16

用户正式任务书已批准 Batch 1A 的 Runtime 架构方向：私有 Node x64、原应用、构建阶段完整生产依赖和未来 Setup，保留外部浏览器；不采用 Electron/SEA/用户端 npm 安装。当前仅进入 Batch 1B 设计，不进入实现。

交付入口：[Runtime Plan](docs/tasks/windows-installer-v1.1/batch-1b/RUNTIME-PLAN.md)、[Dependency Closure](docs/tasks/windows-installer-v1.1/batch-1b/DEPENDENCY-CLOSURE.md)、[Validation Plan](docs/tasks/windows-installer-v1.1/batch-1b/VALIDATION-PLAN.md)。覆盖未来包布局、流水线输入输出/失败条件、23项静态生产依赖候选、原生/PDF资源/许可、Manifest、离线验证、容量预算与Batch 2门禁。

旧 Batch 1A 五文档原样保留，授权进展以本节及 Decisions 增量记录为准。当前 HEAD 仍为 49b3e35c68468b3c61e3ad19ed379ce057d17886，设计文档未提交。没有改业务源码、下载生产依赖、生成 Runtime/Setup、启动服务或运行实际功能测试；没有提交/推送/PR/CI/Release/合并/部署。原生许可及实际闭包/离线能力仍待实施核验，设计 PASS 不等于可以进入 Batch 2。下一步等待本轮架构验收。

## Windows installer v1.1 / Batch 1A 设计阶段｜2026-09-16

用户已验收 Batch 0，并授权 Architecture Decision，仅设计、不写代码。复用 codex/windows-installer-v1.1，已提交基线为 49b3e35c68468b3c61e3ad19ed379ce057d17886；v1.0.0/main 84cbb324a4f63bef094d2c21d70eba841205a7a7 保持冻结。

当前 [Batch 1A 设计](docs/tasks/windows-installer-v1.1/batch-1a/spec.md) 推荐私有 Node、原样应用与构建时生产依赖；仅为待评审建议。L2 [Intent](docs/tasks/windows-installer-v1.1/batch-1a/intent.md)、[Plan](docs/tasks/windows-installer-v1.1/batch-1a/plan.md)、[Acceptance](docs/tasks/windows-installer-v1.1/batch-1a/acceptance.md) 记录范围与门禁。

没有实施 Runtime 闭包、Launcher、Setup 或 OCR，没有修改业务源码或现有安装脚本；本轮无提交/推送/CI/PR/Release/合并/部署。文档草案在当前已授权公开源码副本待评审，不新增副本/工作树。下一步是架构评审，不是自动进入 Build。总目标见 [Master Plan](docs/tasks/windows-installer-v1.1/MASTER-PLAN.md)。以下旧阶段状态只代表历史，不覆盖本节。

## 1.0.0 正式发布阶段｜2026-09-12

用户已明确授权：仅本仓库创建 PR、合并 main，建立 v1.0.0 标签及带安装包、校验文件和更新说明的正式 Release。此前“未授权 PR/合并/Release”均为历史阶段限制，本节替代；不授权任何已安装实例的部署、更新或数据操作。

交付内容、发布日期及最终校验结果见 [v1.0.0 发布页](https://github.com/KG718718/spxt-public/releases/tag/v1.0.0)；执行与合并结果见 [PR #1](https://github.com/KG718718/spxt-public/pull/1) 和 [发布计划](docs/tasks/public-v1/batch-18-release-v1.md)。旧阶段测试只代表对应提交，不倒填为最终发布结果。

## 1.0.0 产品说明修订｜2026-09-11

定位：面向广告公司的OA、财务核对和数据统计系统。版本元数据统一1.0.0，公开说明只介绍本产品及使用边界。本轮不改业务和网络逻辑；云端复验已通过：[CI 34609338291](https://github.com/KG718718/spxt-public/actions/runs/34609338291)，26份核心测试/742项检查、23项安装、6项可选OCR，审计0漏洞；代码 f5d7663f8d699bbf32d719b1a28bf916188c3ae4。PR/main合并与v1.0.0正式发布另待明确授权。详见[修订记录](docs/tasks/public-v1/batch-17-product-v1-docs.md)。下文此前结果保持其对应提交，不冒充1.0.0新包的测试结果。


## 前一轮安装候选验收｜2026-09-11

**用户已确认在线安装方式；公开版在线安装候选完成，已保存在 GitHub。不是正式 Release 或生产部署。**

- 候选分支：codex/public-v1。实际验收代码：d2553434aa24b30339a9a24a2bdbed08f126a80b；随后治理文档同步不改变受测程序或安装 ZIP。
- [CI 34605839563](https://github.com/KG718718/spxt-public/actions/runs/34605839563) 三个任务均成功：核心 25 份 / 734 项套件报告检查，在线安装 23 项，可选 OCR 实际合成识别 6 项，依赖审计 0 漏洞。
- [下载在线安装候选](https://github.com/KG718718/spxt-public/actions/runs/34605839563/artifacts/10266950988)：首次联网取得锁定官方 Node 与 npm 依赖；包内不带运行二进制、实例、测试数据或截图。外层验收 artifact 与内层安装 ZIP 明确区分。
- 双击 Install.cmd 安装到独立目录，Start.cmd 启动；本机创建首个 Admin，零业务数据，购买方/税率/服务费/奖金/替票授权等由 Admin 明确配置。
- 程序版本、runtime、instance 分离；安装/运行互斥；陌生非空目录拒绝；同版本重装、下载校验失败、运行中安装拒绝不改实例；同数据结构升级保留旧程序，停机完整副本恢复已验。
- 本轮修复首次未配税率误报“初始化失败”、员工页空税率被隐式当 0 的展示路径；显式 0 仍有效，公式和历史快照不改。日历图标改为可读黑金样式，不改日期规则。
- MIT 正文与第三方声明保留，在线依赖原始许可随官方下载保留；不把未审查完的原生二进制放入 ZIP。未提供代码签名或离线整包。
- 所有实际安装、业务夹具、截图和恢复在 GitHub 托管 Windows。开发机只有内存转换/API操作，无本地公开源码、日志、ZIP或新工作树；没有真实数据写入或部署变更，无真实邮件。
- main 保持 7eb1ebe17450301aa0f290d55a5a0d3dd7ff2a6e；无 PR、main 合并、Release、部署。

证据与问题收口：[第16批回单](docs/tasks/public-v1/batch-16-online-installer.md)。安装说明：[指南](tools/installer/README-install.md)。Actions 产物保留 30 天，源码与说明在候选分支持续保留。

### 不属于本轮完成范围

真实双机 LAN/加密与防火墙、任意旧版数据迁移、异机 DPAPI 密钥恢复、系统服务、签名与正式发行需后续明确范围。默认回环访问不是 LAN 验收；HTTP 不是安全公网部署。上述事项不再混写成“用户尚未确认在线安装”。

## 以下为历史阶段记录

以下“待实现、暂停、最新、当前”等措辞只描述当时状态，不覆盖本页顶部。原证据保留，未执行的历史项目不会被倒填为通过。

## 最新执行状态｜2026-09-11 配置一致性组件通过

公开代码 af02673769410013887bcce08356a2513dde0ba8：托管 Windows [CI 34570119060](https://github.com/KG718718/spxt-public/actions/runs/34570119060) 通过17份/604项测试，失败0、依赖审计0。用户确认的配置与审计一次保存修复已在核心、HTTP处理器和启动校验完成，新增专项99项。详见[第12批记录](docs/tasks/public-v1/batch-12-config-atomicity.md)。

完整server/Admin页面接入、其余业务页面、跨模块整站验收和可用安装包仍未完成；本次通过不等于全部封装完成。下一步已明确，无需重复询问税率或本次修复许可；不执行部署。此前“等待用户确认”等条目均为历史断点。

## 当前有效进度｜2026-09-11

公开候选代码 2c5b451b4a50a64182db6305e5a237d7e9c729f3：托管 Windows [CI 34567916807](https://github.com/KG718718/spxt-public/actions/runs/34567916807) 已通过 15 份测试 / 505 项，依赖审计 0 漏洞。购买方/替票核心与启动验证已加入；首次安装/登录页面组件通过，完整业务服务和其余四页尚未完成，没有可用安装包。

税率已确认由 Admin 填写、不预置，核心与启动验证完成，完整服务/Admin/项目/欠款接入仍待完成。新增购买方配置/员工替票核心不等于授权管理与发票路由已接通。

完整服务只读核对另复现了配置保存后审计失败却返回400的合成反例；[保存一致性方案](docs/tasks/public-v1/config-atomicity-review.md) 已提交用户确认，本项尚未实施。当前完成成果已云端保存，相关存储改造等待确认；不把等待解释为已完成封装。

仍无 PR、main 合并、Release、部署、真实业务数据或正式主机操作。公开产物只保存在云端。以下为阶段证据/历史记录。

## 最新完成的安装/登录组件证据｜2026-09-11

代码 a23985d03739f13399922c68819b3e92572d4658，托管 Windows [CI 34567203069](https://github.com/KG718718/spxt-public/actions/runs/34567203069) 成功：14 份测试 / 434 项，依赖审计 0 漏洞。启动历史兼容补修已完成：已删除账号移除密码后仍能重启读取，不复活、不改历史；非法已有税率阻止启动，未配置不自动填写。

- 首次安装/登录页面组件：真实 Edge 15 项通过；实际初始化处理器写入仅一个自建 Admin，业务表为空。登录返回和跳转目标是明确标注的合成测试路由，不是完整系统认证验收。
- 1440×1000 和 390×844 截图已人工式视觉检查：文字可读，金色按钮深字，窄屏无横向溢出；失败/处理中有具体文字，正常页面无需悬停才可读。抽检对比度最低 9.35:1；不代表其他四页已通过。
- JS runtime 异常 0、非预期 console 异常 0；故意断网/403/503反例的网络错误单独保留，未冒充所有 console 条目均为空。
- 云端截图证据 artifact 10186449722，依赖许可 artifact 10186449112。许可专项27项，24个已安装依赖/34份原始声明；仍不等于原生二进制完整许可核验或可用安装包。
- 完整 server、其余四页/参数接入、跨模块 HTTP、安装升级/恢复、可选 OCR 和原生许可仍未收口。没有应用安装包，不改 main，无 PR/Release/部署，所有公开文件及证据仅保存云端。

## 2026-09-11 税率外显决定（用户已确认）

用户明确选择：由 Admin 填写，不预置 6%。未配置时阻止需要税率的新计算；合同税额公式和已保存的历史税率/税额快照不变。

来源 configuredTaxRate 在缺值或非法值时回退 0.06，欠款创建也有同类回退；公开版去除这两个回退，页面不得以占位值或 Number(null) 冒充配置。保留 config.taxRate，UI 百分比/服务端比例；不新增第二套税率字段。Admin 配置写入须验证真实数值、有限且非负（沿用既有非负范围，不擅自设定其他业务上限）；明确 0 有效。GET 配置允许未配置态进入设置，不能直接调用要求完整税率的新计算。

主控批准先固定原函数空配置仍返回默认值的反例，新增纯 tax-config.js 与合成测试，然后接入完整 server/Admin/项目/欠款消费者并验证 HTTP 与界面。这个核心子步骤不等于整站税率改造完成。不修改参考源码、真实数据或正式系统。


## 2026-09-11 许可证实现状态（最新）

用户已恢复公开版封装。根 MIT LICENSE、中性 K-SESSION contributors 署名、包与锁文件许可、第三方说明及自动门禁已实现；15 项内存许可反例检查通过，托管全量复验待本次提交后运行。主许可证不再待选择。

本节替代下文暂停及主许可待定记录；原生组件/Node/OCR/素材与完整服务、页面、安装升级和恢复仍未完成。没有应用安装包或 Release，不改 main、既有运行实例或任何业务资产。


## 2026-09-11 继续：MIT 许可证落地（当前决定）

用户已确认 MIT 并要求直接执行，本次明确恢复公开版封装。使用标准 MIT 正文，项目级中性署名采用 Copyright (c) 2026 K-SESSION contributors，不披露公司或真实个人名；这是项目贡献者集合署名，不推断任何具体公司权属。第三方作品仍保留原作者和原许可，不用项目 MIT 覆盖第三方条件。

本次允许根 LICENSE、package.json/锁文件根许可字段、README/第三方说明、许可核验和合成测试，全部只入公开候选。主控沿用已批准 L2 范围串行推进，不创建任务或本地副本。完整原生组件/Node/OCR/素材及最终包逐项核对仍需完成；不合并 main、不创建 PR/Release、不部署。


## 2026-09-10 暂停断点（优先于下文历史状态）

用户已确认采用 MIT，并要求直接落地；随后要求暂停。当前仅保存断点，不继续实现、测试、封装或发布。

- 最近已完成提交：d4553b650f546e8fc1504043fd46abc20662f3e4；导出修复的托管 CI 34464534559 通过 310 项，依赖审计 0 漏洞。该证据不等于完整系统/安装包通过。
- 本轮仅重读边界、当前公开文件与 MIT 官方正文；尚未新增根 LICENSE，package.json/package-lock.json 仍是 UNLICENSED，许可检查脚本和封装内容未改变。
- MIT 选择现已确认，不再重复询问。拟采用中性的 K-SESSION contributors 署名，不写公司/真实个人名；该措辞已在对话说明，但尚未落入许可证，不作公司权属已核实的断言。第三方原始署名继续保留。
- 恢复后：完成标准 MIT 正文及元数据/README/第三方说明一致性，补许可证检查并执行云端门禁；原生组件、Node/OCR/素材许可与完整服务/页面/安装包仍待完成。
- 当前任务已暂停，等待用户明确继续；不创建 PR、合并 main、Release 或部署，不修改内部代码/数据/配置/服务及正式主机，不在开发机保存公开副本。


## 2026-09-10 最新批准：完整公开化构建与云端验收

用户已确认上一轮提出的安全边界：首版Windows；损坏/不可读/关键结构非法的数据及配置拒绝启动、保留原件；只有真正首次安装可在主机本机创建首Admin，成功后关闭入口；公开版移除服务器命令执行类运维接口。允许仅在本公开仓库使用GitHub托管Windows完成自动测试、角色浏览器及候选包构建。

主控批准依照已经确认的品牌、零数据、购买方配置、员工替票授权、专属机制移除、服务费/奖金全部外显及本次安全边界，连续执行以下技术Plan，不再按普通子批次反复请求上传许可：
1. 安全加载/初始化与失败优先测试；本机同源限制、重复与并发拒绝、无默认凭据、已有数据/附件不覆写。首次缺data但残留已有业务资产时不自动当新安装。
2. 完整来源运行文件逐文件公开审查，白名单迁入候选；只在内存处理，不将公开版文件落地开发机。沿用现有Node架构与业务门禁，不复制真实配置、记录、私有工具、历史或媒体。
3. 接入服务端/Admin参数、购买方与员工替票权限，去掉已确认的专属名称及预置业务兜底。补全5个既有页面与必要设置入口，保持既有角色、公式、历史、附件和备份恢复规则。
4. 云端Windows runner执行纯合成单元、HTTP、权限、数据保存/恢复及跨模块回归；失败先修再重跑。工作流固定依赖和动作版本、contents只读、无真实secret/真实SMTP/生产连接，不启用自托管runner或额外付费资源。
5. 云端真实浏览器验证初始化、Admin/审批岗/员工5页关联流程与默认/焦点/悬停/禁用/弹窗/表格对比度；截图和结果只留云端。
6. 云端按允许清单构建候选ZIP，运行文件/依赖清单和SHA256随包；生产包排除测试、种子、业务文件、日志和已有配置。解包再验证零数据、初始化、重启和升级保留合成数据；OCR可选未安装必须明确提示。
7. 修复与现有确认一致的缺陷后重复相关门禁，保存云端证据。遇到需改变业务规则、重大安全方案、授权不足或真实双机验收不可执行时再与用户沟通。

本节替代下文历史“尚不运行CI/仅核心子步骤获批”的阶段限制；历史证据保留，不把旧未执行改成已通过。仍不授权PR、合并main、Release、正式部署或改既有实例；许可证/真实局域网双机设备待单独确认。税费范围按既有待决项处理，不能因本次批准猜测新税率。


更新：2026-09-10

## 当前状态

- 独立公开候选分支 `codex/public-v1` 持续构建中，尚不是可安装系统；main 未合并。
- 前一批提交 `8edf9f14a51a58b86b6788bce9de6141fb5551fe` 已在 GitHub 托管 Windows 通过 237 项检查（6 份测试），包含真实文件系统、重启、两进程首次初始化争用；不是完整 HTTP/浏览器验收。
- 本批提交 `207a2576fdcb19d5f3bb5dd975e5b1499513d14f` 纳入已审查的欠款、结构化备份、邮件与 SMTP 密码存储基础模块、精确依赖及 3 份合成测试。托管 Windows CI 已通过全部 279 项（9 份测试），依赖安装成功、npm audit 报告 0 漏洞；真实备份 9 项通过。
- 用户已确认员工只导出本人的奖金/执行费用/月结金额。公开 export-service.js 已修复并上传，Admin 完整汇总保持；提交 `031c2ef5a4de275879bb8c1da0194581c69bf686` 在托管 Windows 通过 310 项、10 份测试（含真实 XLSX 权限），依赖审计 0 漏洞。详情见 [Batch 06](docs/tasks/public-v1/source-review-batch-06.md)。
- 许可证已纳入封装门禁，当前云端生成 23 个依赖、31 份原始许可/声明清单；主许可证、版权署名与原生组件/最终包许可复核仍未完成。许可材料包不是应用安装包。
- 服务端、5 个页面、配置接入、完整权限/跨模块 HTTP 和真实浏览器、安装包/升级/完整恢复尚未完成。安全初始化核心不等于初始化页面和端到端入口已完成。
- 公开产物仅保存云端；未在开发机建立公开副本/工作树，未改内部代码、业务数据、配置、服务或正式主机。

## 云端实施范围

1. 逐文件审查，只提交可公开源码；重新建立使用文档，合成数据仅用于隔离测试，不附带到生产安装实例。
2. 将单位专用信息改为受校验的安装配置；补齐首次管理员初始化。
3. 保留模块之间的权限、金额、状态和审计关系；不扩建SaaS、多租户或数据库架构。
4. GitHub Actions上执行定向回归、秘密扫描、安装与打包检查；发行包留云端，不下载至开发机。
5. 干净环境和真实角色浏览器验收通过后，另经确认发布可用版本。

## 已确认的产品要求

- 产品名称为K⁺-SESSION，加号在K右上；移除预置组织的名称、Logo和真实信息，不自动更改仓库地址。
- 购买方名称不再预置预置组织，由Admin配置使用者自己的单位全称；服务端继续校验，未配置或购买方不匹配时不能提交发票。仅适用于公开版。
- 首次安装自行创建管理员，不预置公司账号或共享默认密码。初始化的安全细节仍需纳入Spec和Plan验收。
- OCR可选。具体安装依赖、未安装时可用范围和失败提示尚未实现与验证。
- 员工替票授权已获有条件确认：只将代码固定名单改为Admin在现有有效员工列表中配置，新账号默认未授权、员工不能自行更改；不能改变收款对象关联、角色/项目范围、发票校验、余票归属、历史记录或金额规则。尚未实现与回归验证。

- 公开版零业务数据交付已确认：不带原供应商、任何收款对象、甲方、员工、业务记录、附件、旧日志、备份或邮件配置/记录，也不附带改名后的旧数据或演示种子。新安装无预置账号；首个Admin由安装者创建，之后自行录入和关联主数据。基础类型/字段结构保留，功能不因此取消。

- 2026-09-10用户拒绝指定替代公司收款对象，选择去掉预置组织别名专属机制：公开版不保留该专属身份、欠款准入及银行信息豁免，不新增替代对象设置、不把特例转授所有公司收款对象。普通供应商与员工收款功能保留，不据此删除整个通用公司收款类型；尚未实现。

## 当前待确认

- 主 MIT 已确认并按项目贡献者中性署名落地；原生组件/素材与最终包分发权利仍需核对，不把包级声明当成最终许可验收。
- 真正双机局域网的测试设备、访问/加密方案及安装授权；云端 Windows 测试不替代此项。
- 税率已确认由 Admin 填写且不预设默认值，技术接入与回归待完成；不再重复询问同一范围。

首次初始化安全方案、首版 Windows 与云端验收执行权限已在本页顶部确认，不再重复列为待授权。

## 本次续行记录

2026-09-10：仅增量同步README、PROJECT及四份L2文件，登记上述用户决定，补充局域网测试计划与未验收项。未导入运行代码、创建安装包、进行网络测试或改动任何既有运行实例；公开资料仅保存在本仓库。随后用户确认购买方配置方案，并明确去掉预置组织名称和Logo。本次已同步该决定，尚未修改运行代码。下一步确认剩余替票授权等未决规格，再批准Plan进入构建。

2026-09-10本轮继续：完成账号创建、收款对象、发票资格及历史余票分类的只读关联核对；6项纯函数内存检查符合来源实现，非公开版HTTP或浏览器测试。Spec当时登记最小授权草案与公司收款别名依赖，未实现、未替用户批准。

随后用户确认员工替票授权方案，条件为“不要和现在冲突”。本次已记录条件并补入行为对照验收：等价授权下原有业务结果不变，授权开关只控制后续替票权限，不回写历史。公司收款别名仍待单独确认；整份Plan仍未获批准。未导入源码、未写本机公开文件、未改既有运行实例。下一项为公司收款固定别名的公开化方式。

2026-09-10补充确认：用户要求“收款对象，供应商都需要脱敏，别人收到后是0数据”。已明确为零业务数据安装包，而非将公司主数据改名后分发。更新协作边界、README、PROJECT及L2四份文件；只更新云端文档，尚无安装包，未清空任何现有系统。零数据安装与升级保留数据分开验收；旧别名依赖的代码公开化方式仍需处理，不能用空数据替代代码适配。

任务入口：[公开版L2](docs/tasks/public-v1/intent.md)。

## 2026-09-10 上传授权与前置检查

用户授权：确认脱敏成功后直接开始上传到本独立公开仓库。该授权只覆盖已完成公开审查的内容，不覆盖未审查原始代码、公司资料或私有提交历史；不等于批准尚未决定的产品规则、整份L2 Plan或发布可用安装包。

本轮重新核对：远端仍为7份Markdown规划文件，无运行源码、工作流或发行包；来源运行代码仍含固定购买方与员工名单、公司收款别名门禁及绑定历史项目的奖金算例。因此尚不能确认运行源码已脱敏，本轮未上传运行源码、原始历史或任何真实业务数据。已审查的公共文档与源码/发行包的验收必须分开表述。

后续在已批准方案内完成逐文件审查和公开化后，可按本次授权直接上传合格源码，不重复索要相同上传许可；云端运行测试和封装结果另行验收，不能先把未审查内容公开再删除。公司收款映射、奖金默认值与初始化等尚未决内容先按证据确认。仍不在开发机建立公开副本，不改既有运行实例。

## 2026-09-10 取消固定身份收款替代方案

用户回复“不，去掉”，取消刚才提出的“Admin指定一个自建公司对象替代原专属对象”的方案。本次只固定公开版删除该专属机制，不再新建替代配置或预置身份。来源的银行字段函数、欠款服务端准入和员工欠款下拉均有同一专属名称依赖，后续须成组移除，不可只删拒绝条件而放开所有公司收款对象。正常供应商、员工收款以及通用公司收款类型不在本次整体删除范围。

本轮增量更新5份云端Markdown，未上传运行源码、未宣称脱敏或测试通过，未删除内部公司对象或改动现有系统。上述最新决定覆盖历史段落中“公司收款映射待确认”的状态；其他未决规格与Plan门禁仍保留。条件上传授权继续有效。

## 2026-09-10 首批审查通过的基础源码上传

用户再次要求“继续上传”。本轮执行范围为两个原样基础模块及一份新编虚构单元测试，目标为[候选分支](https://github.com/KG718718/spxt-public/tree/codex/public-v1)，不是合并main或发布安装包。具体允许清单及主控技术子计划见Plan；其余产品未决项没有被改写成已批准。

上传前已逐行阅读、执行定向敏感标记检查、语法检查及24项内存单元测试，全部通过。测试只处理虚构传入记录，不读取业务数据、启动服务、写测试文件或访问网络。两个来源模块未修改业务逻辑，也不自动创建甲方/账号等记录。上传后核验进度记录在[本批审查记录](https://github.com/KG718718/spxt-public/blob/codex/public-v1/docs/tasks/public-v1/source-review-batch-01.md)。

仍未上传服务端、页面、奖金/服务费默认配置、附件/数据/日志、内部媒体与部署工具。固定身份机制删除等已确认改造尚未实现；无HTTP/浏览器、云端CI、安装、升级或局域网验收结论。既有运行实例不变；未创建本地公开副本、Agent或工作树。许可证及完整产品改造仍按待定规格处理，不宣称已形成可用开源发行版。

## 2026-09-10 业务参数外显确认与服务费核心续行

用户确认“不内置，全部外显”：公开版不带预置服务费率/奖金档位及相关业务系数，由Admin在页面配置；缺少参数不是零，历史快照和既有权限/公式不变。Spec已固定本项，不反复要求用户确认。主控批准仅先执行服务费配置核心子计划：失败优先、内存改造、审查后直接上传候选。奖金、页面及HTTP接入尚未完成，完整安装与发布门禁不变。本轮只在独立公开库记录，不改既有运行实例。

本子步骤完成：服务费核心与49项合成单测已上传，源码提交`cbe1e8a8b6abb34781de298eccc00dc5840c0658`。GitHub实际文件回读后，基础24项+服务费49项共73项测试通过，5个源码/测试文件SHA256一致，候选14项文件允许清单一致。证据见[Batch 02](https://github.com/KG718718/spxt-public/blob/codex/public-v1/docs/tasks/public-v1/source-review-batch-02.md)。

新模块没有公司费率；明确0、配置基础费率和按项覆盖保留，缺配置/非法值拒绝。以上仅纯内存模块测试，不是HTTP、页面、云端CI或安装验收。后续先接入Admin/服务端无默认兜底与奖金可见参数、快照及权限测试；源码上传子步骤不授权PR、合并或Release。

## 2026-09-10 奖金核心与配置快照关联完成

用户同意继续管理页面与奖金配置接入。核对发现server调用仍未传动态规则、Admin还引用固定阈值；因此先按已批准子计划完成可独立审查的奖金核心并固定Admin字段/调用清单，不上传未完成整体公开审查的server/admin文件，也不创建替代空壳页。

源码提交`77d5ff4c03e388c9bca19a289ece0706106a135d`：新增bonus-config.js，适配bonus-preview.js及execution-bonus.js，新编73项合成测试。移除预置业务表/历史算例与已确认移除的特名排除，配置缺失不试算，正常公式与人工确认流程保留；旧规则摘要确认409，完整参数进入奖金快照，输入及已返回快照不回写。

上传前73项专项通过；另外200组合成数据的财务计算、有效付款选择、显式同参数正常奖金结果与来源一致。上传后回读9个源码/测试哈希一致，候选19项文件允许清单一致，基础24+服务费49+奖金73共146项全部通过。以上均纯内存单元/差分，不是HTTP、浏览器、云端CI、完整月结、安装或局域网验收。见[Batch 03](https://github.com/KG718718/spxt-public/blob/codex/public-v1/docs/tasks/public-v1/source-review-batch-03.md)。

下一步：完成server.js/admin.html各自的逐段公开审查与参数接入，配置页不填预置业务值；服务器从config.bonusRules传到预览和锁定，页面回传rulesDigest并处理过期刷新；继续验证实时Admin权限、配置保存/审计/失败、历史展示及奖金/月结/邮件/导出关联。其他未决初始化、平台网络和许可证不因此被批准。

本轮仅更新公开仓库；未写本机公开文件或修改内部代码/真实数据、附件、配置、服务、正式主机；未新建Agent/任务/工作树、PR、合并、Release或发行包。

## 2026-09-10 持续执行预检：初始化与云端验收门禁

用户要求持续执行至完成，重大问题先沟通。本轮核对服务端启动、首次账号创建依赖、运行平台和公开版验收路径；未把持续执行解释为合并或发布授权。

已确认：使用原启动加载代码段及虚构内存文件完成4项检查。不存在文件返回空数据；非法JSON数据、非法JSON配置均仅记录错误后继续返回空状态；合法虚构数据仍保留。该检查没有启动完整服务、没有执行保存、没有读取真实数据或产生本地文件。

关键风险（基于上述证据的推测）：若公开版首次Admin创建仅按空用户列表判断，损坏的已有文件可能被误当成新安装，后续保存存在覆盖旧内容的风险。未发现或宣称任何真实实例已经丢失数据。此启动逻辑尚未上传公开候选。

建议提交用户确认的实现边界：
- 首版Windows，本机一次性创建Admin，无默认账号/密码；初始化后入口关闭，局域网不得抢先创建首个管理员。
- 真正首次缺少数据与已有文件损坏分开处理。已存在文件不可读、解析失败或关键结构非法时拒绝启动，保留原件，不自动重置；升级、重启不触发初始化。
- 公开版不携带服务器命令执行类运维入口；保留业务Admin、备份恢复与现有角色业务权限。原来源该类入口默认关闭，并非已证明匿名可执行。
- 完整HTTP、浏览器和封装测试需要云端隔离环境。建议批准仅本公开库GitHub托管Windows测试和候选包产物；只用虚构数据，不使用真实secrets、自托管runner、付费扩容或正式实例。本机不保留公开副本。
- 当前尚不创建CI工作流，不合并main、不创建PR或Release；许可证与实际局域网双机验收仍为发布前独立未决项。

当前可复核结果仍为6个核心模块、3份单测（146项）及200组合成差分，尚无可安装系统。方案与本次持续执行的完整技术Plan批准后，按服务端/页面→跨模块与安全→云端门禁→候选封装顺序继续，不在普通子步骤重复索要上传许可。

状态：初始化/平台与云端验收方案待用户确认；已通过核心成果保留。内部源文件、真实数据、附件、配置、服务及正式主机均未修改。公开记录仅保存在独立仓库。
