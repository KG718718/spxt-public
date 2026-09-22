# K⁺-SESSION 协作边界

本仓库维护面向广告公司的 OA、财务核对和数据统计系统。

- 文档、源码、测试结果和交付物以本仓库、GitHub Actions及Releases为事实来源。禁止另建完整clone或在开发机保存发行包；已批准的THREAD ORCHESTRATION Batch可按下述规则建立临时Git worktree，不复制其他用途版本。
- 发布前审查实际文件及Git来源，不导入未经审查的代码、提交历史、真实业务数据、身份、附件、凭据、网络地址、设备路径或含真实信息的媒体。
- 测试仅使用明确合成的数据和身份；不连接实际业务部署、不发送真实邮件。
- 新安装零业务数据：无预置员工、客户、供应商、收款对象、业务记录或演示种子；首个Admin由安装者创建。
- 零数据不是清空指令。升级、重启、重装、恢复和初始化失败不得覆盖已有用户数据。
- 金额公式、权限、审批、冻结、占用及审计按已确认规格执行；产品规则变化需证据和明确确认，不通过删除校验简化实现。
- 沿用L0/L1/L2分级；普通文档及版本标签调整不扩大业务范围，高风险及跨模块变化先确认规格和Plan。
- 后续修改使用codex/前缀分支。测试通过与PR、main合并、标签、Release、部署分别记录，后者按明确授权执行。
- 不擅自新增付费资源、永久云开发环境或自托管runner；独立执行/QA对话仅限下述用户已授权的Batch范围。默认禁止普通sub-agent及collaboration.spawn_agent，除非用户未来另行明确批准。
- CI默认只读权限，无真实凭据、业务数据或生产连接；没有证据不得宣称测试通过或支持公网部署。
- 版本遵守docs/versioning.md；发布内容不覆盖同一已发行版本，保留兼容性说明与可追溯证据。

## THREAD ORCHESTRATOR：2026-09-21用户决定

自下一获批Batch开始生效；本轮只归档Batch3验收及更新规则，不启动Batch4，不创建实际对话或worktree。本节是公开项目的明确专项授权，取代“不得另建工作树”“未经逐次询问不得新增任务”的绝对限制；不取消Batch规格/Plan审批、安全或发布门禁，不改全工作区及其他项目规则。

### 主控与一层对话树

#### 网页版与工程主控决策边界（2026-09-22用户补充）

- ChatGPT网页版承担产品策划、架构分析、方案比较与研究、Batch范围批准及最终验收层职责。
- Codex主控身份为 **ENGINEERING ORCHESTRATOR**，不是产品决策者；THREAD ORCHESTRATOR指其执行对话编排方式，不授予产品决定权。
- 产品功能取舍、用户体验方向、业务规则变化、数据生命周期策略变化、安装/升级产品行为变化、架构路线重大变化、引入新主要技术栈、支持平台范围变化、Release策略及明显扩大当前Batch范围的方案，主控均不得自行作最终决定。
- 出现这些决策点，主控必须依据可复核证据整理【当前事实】【技术约束】【可选方案】【各方案影响】【需要网页版决定的问题】，通过CHATGPT-HANDOFF或专项决策卡交回网页版；停止该决策点及依赖其结论的实施，不用“实现细节”名义先行改变产品。收到明确批准并写回任务规格后才能恢复该部分。
- 主控可自行决定的范围仅限已批准方案内的工程拆分、文件/模块分工、测试安排、Thread调度、worktree安排、非产品性质实现细节及CI/Git/Artifact工程流程。不能据此扩大权限或取消既有发布授权、安全与验收门禁。
- Execution Thread权限更低，不得改变产品、架构或Batch目标；任务卡与实际代码冲突时，返回 **BLOCKED / NEED PARENT DECISION**，附事实与冲突位置，不自行重新定义需求。主控先判断是否只是获批方案内工程问题；若涉及上述决策范围，继续上报网页版，不自行替其决定。
- 主控的Review/完整测试是工程核验，不等同于网页版最终验收。没有实际收到的网页版决定，不得写成已批准；不假设与网页版存在自动同步通道。

- 主控负责接收网页版任务书、依赖分析、拆分/派单/跟踪、Review diff/测试/风险、整合、风险对应QA、最终完整门禁、Git commit/push、Actions及最终CHATGPT-HANDOFF。
- 主控默认不得亲自实现生产代码、安装器、Launcher、Runtime、迁移或测试体系的实质修改；应派给独立Execution Thread。实质问题退回原执行对话修复，不由主控顺手重写。
- 主控可直接处理任务拆解、Review、状态文档、ORCHESTRATION.md、明显非实质merge conflict、最终整合及上述Git/Actions/交接事务；冲突涉及行为或规格时退回执行对话。
- 使用create_thread、send_message_to_thread、read_thread、wait_threads建立独立Codex执行对话树；这些是工具机制名称，不要求执行对话自行寻找其他协作方式。接口不可用时报告阻塞，不擅自改用sub-agent或主控实施。
- 只允许一层：主控 → Execution Thread / QA Thread。只有主控有拆分权；执行/QA不得创建后代对话、Agent或擅自新增worktree。
- 每任务唯一ID（如B4-T1、B4-T2、B4-QA），登记实际thread ID、父Batch和回单主控。示例不是批准启动Batch4。

### 工作树、并行与Git权限

- 用户已批准的THREAD ORCHESTRATION Batch内，主控可为改代码的任务创建临时Git worktree：一个任务一个worktree，一个codex/前缀local task branch；基线必须是已核实公开commit，不额外clone。
- 执行对话只改自己任务worktree及授权文件、运行测试，可local commit冻结结果；禁止push/force push、合并主开发分支、操作main/tag/Release。内部local commit是待Review成果，不是最终GitHub验收版本。
- 主控Review后统一整合到codex/windows-installer-v1.1，完成整合后清理该Batch登记的临时worktree。先核对精确路径、已整合commit、干净状态及证据保留，不force删除、不删除未整合结果/用户数据；有残留或范围不明则停止报告。
- worktree只隔离Git文件/暂存区，不隔离端口、进程、注册表或instance等共享资源。任务卡必须分配互不冲突的资源，无法隔离时串行。
- 主控主动判断并行：模块/文件独立、资源不冲突且无未完成输出依赖时可并行；同一核心文件、同一端口/instance/注册表、结构依赖、迁移/升级顺序链必须串行。不为并行强行拆分。
- 主控负责最终整合、完整测试、commit、开发分支push、Actions和报告；main/tag/Release仍需单独明确授权，禁止force push。

### 自包含Execution Task Card

每次派单必须提供完整任务卡，不依赖主控聊天历史猜测：

- TASK ID / ROLE / PARENT BATCH / BASELINE COMMIT。
- 来源主控及回单目标thread、公开仓库/工作目录、local task branch；首句明确“你是执行任务，不是项目主控”（QA声明只读审查角色）。
- 单一目标、允许修改范围、禁止修改范围、批准规格/Plan入口、验收条件、必须运行的测试。
- Git/worktree规则、共享资源分配、停止条件、最终回报格式；任务难度、依据及模型/推理强度按适用工作区规则填写。
- 先读当前公开AGENTS.md/PROJECT.md和指定材料；工作树旧规则不得替代主控明确提供的最新已批准规则，不读取其他用途版本。

Execution Thread只回传主控以下字段，详细证据留任务文档/测试结果，不生成完整网页版交接卡：

【TASK ID】
【状态 PASS / FAIL / BLOCKED；规格冲突注明BLOCKED / NEED PARENT DECISION】
【完成内容】
【修改文件】
【测试结果】
【local commit】
【已知风险】
【需要主控处理】

### QA与任务索引

- 集成后主控按风险判断是否创建独立<Batch>-QA对话，并记录依据。QA读取批准规格、最终整合diff，执行验收，检查边界、测试是否被削弱、数据保护及Git/Artifact身份。
- QA默认不得修改生产代码，不得自行修复实现；问题回主控，由主控退给原Execution Thread。QA的只读范围是任务约束，不宣称工具已提供独立权限沙箱。
- 每个较大Batch建立简短ORCHESTRATION.md，仅记录Task ID、负责内容、thread、worktree/local commit、状态、依赖、QA状态；在派单/返工/集成/停止时同步，以便恢复。不复制长技术报告。

## 固定交付规则：ChatGPT 网页版交接卡

## Batch 2A起：GitHub-first（2026-09-17）

- 正式审查仓库KG718718/spxt-public，分支codex/windows-installer-v1.1。主控每个对外可审查阶段必须commit并仅push该开发分支；内部Execution只提交local task branch，不push。最终验收仍以主控整合后的GitHub版本为准，本地未提交状态不是正式验收版本。
- EXE/ZIP/大型Runtime/非敏感日志使用GitHub Actions Artifact，不提交Git。验收必需证据必须可在GitHub获取。
- 主控交接卡保持精简，默认800—1800中文字，必须写branch、受测commit SHA、Actions run ID、Artifact名称及结论；结果文档提交与受测代码提交区分，不能自引用伪造SHA。
- main、v1.0.0、正式Release冻结，禁止force push；每批完成即停，不自动进入下批。
- 以上替代旧“结果文档仅留本地”等交接策略；完整原始技术证据和交接卡/剪贴板规则保留。

2026-09-21修订：只有主控完成整个Batch（含失败、阻塞、纯文档交付）或用户明确要求独立网页版验收的任务，才在对应任务目录生成CHATGPT-HANDOFF.md。内部Execution/QA Thread不生成网页版交接卡，只按上面格式回主控；原技术证据仍保留。不得用同一根目录文件覆盖其他任务交接历史。

- 内容必须独立、自包含，默认800–1800中文字；明确实际完成、未完成、事实/测试、阻塞、Git状态、下一Batch准入和上级决策点。缺失数字写N/A，旧测试注明来源，不得冒充本轮复测。
- 固定字段与起止标记使用 [Master Plan 的完整模板](docs/tasks/windows-installer-v1.1/MASTER-PLAN.md#chatgpt-网页版交接卡固定模板)。非安装任务仅替换项目/任务名称，保留字段，无关值填N/A。
- 禁止包含Token、API Key、Cookie、密码、SMTP授权码、真实客户数据、真实发票或附件内容、其他用途版本内容；不因要“自包含”而读取这些材料。
- 最终回复必须在单独代码块中完整输出该文件，不能仅给链接或摘要。Windows允许时，将该文件全文复制到剪贴板；仅复制本卡，不附带其他文件，失败不影响Batch技术结论。
- 复制成功时，最终回复最上方必须写：“网页版交接卡已生成并复制到剪贴板，直接到 ChatGPT 网页版 Ctrl+V 即可。”
- 复制失败或不可用时，最终回复最上方必须写：“网页版交接卡已生成，请复制下方代码块全部内容到 ChatGPT 网页版。”
- RESULT.md、BUILD REPORT、VALIDATION REPORT、JSON evidence、logs、hashes等原始证据必须保留；本卡不替代技术证据，不自动授权下一阶段或发布。
