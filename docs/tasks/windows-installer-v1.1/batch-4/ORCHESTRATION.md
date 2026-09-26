# Batch 4 编排索引

当前：**QA门禁修复已整合 / 独立复审中**。原T4 local88ae624c4b315ea960c354286873326102143d43 → 主控b7704ab74fb19d270fc4711169aecdc3e5497bb7，主控共用static gate真实PASS、lifecycle15/15、文档8/8、diffcheck及产品等价检查PASS；相对F3仅5个CI/静态测试非文档文件变化。QA首轮36fbb7b已整合df948956并保留FAIL历史；确认QA idle/clean后主控把同一QA分支安全同步到b7704ab，现同一thread复审。QA Hosted仍0/2，只有收到HOSTED_READY后才显式运行qa-static。F3最终Artifact完整ZIP及EXE实际哈希均核验PASS，详情ARTIFACT-VERIFICATION.md；不会伪称其来源为修复commit。

当前QA发现：historical-identity静态测试旧workflow路由断言本地确定失败，历史job连续原生命令未逐条检查退出码，存在被后续成功掩盖风险；不能以F3绿色直接认定QA PASS。原T4已返工B4-T4-QA-GATE-20260926-06，从2b14985仅修CI静态门禁/契约，产品及生命周期全部冻结，禁止Hosted；卡tasks/B4-T4-QA-GATE-20260926.md。同一B4-QA继续独立审查与首失败证据核验。任何专用QA静态Hosted先Review，D5/F3预算不增加，不得用QA重跑Full。

当前：**F3 WORKFLOW PASS / B4-QA RUNNING**。F3 run36246132535@c8886e6b6d413c2fd73d6716621d07a80b337e58所有job/gate通过，setup11m44s；最终Artifact10907910968，SHA256 e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6，主控独立内容核验进行中。B4-QA thread `01a0de04-719c-7691-8b04-33d9d53596a0`，managed worktree `E:/CodexWorkspace/CodexWorktrees/b4-qa/public-source`，branch `codex/b4-qa`，baseline c8886e6；gpt-5.6-sol/medium，生产只读、仅报告可local commit，return target新主控。卡tasks/B4-QA.md；QA Hosted0/2，无额外run。原T4冻结2b14985；不清理任何旧工作树。

当前：**F3 RUNNING**，run36246132535@c8886e6b6d413c2fd73d6716621d07a80b337e58；主控三方HEAD/同D5实现核验完成。新增D5/F3预算各1/1已用；QA0/2未启动，等待Full实际报告。T4保持2b14985冻结。

当前：D5 run36245606056@22bacc5完整18阶段PASS，U22=PAYLOAD_HASH_REJECTED/UNCHANGED；Artifact10907850207白名单/hash/严格报告PASS。原T4已冻结2b14985；F3准备以同实现（仅后续治理文档）的开发分支精确HEAD显式运行Full。QA尚未创建；下方状态为历史。

## 当前U22｜D5 RUNNING

2026-09-26：B4-T4-U22-20260926-05已主动回单；local `2b149857e566153bc3d50427c59912d05c3e50af` → 主控Review/整合 `22bacc5d45278bdff838d5a002bf7121085751b3`。30/30专项及纯Go/PS AST/公开文档PASS。D5 run36245606056仅sequence运行，新增诊断1/1已用；F3/QA尚未启动。原thread/worktree保留冻结，主控继续跟踪至真实结果。下方派单/冻结状态保留为历史。

## 当前U22返工｜DISPATCHED

用户批准方案B，派单B4-T4-U22-20260926-05已发送原thread01a0cb6a-67cc-7c03-a68b-2727af8fce6e，return target01a0db0e-c950-79e0-8e11-07155e0742f2。继续原f8bd/public-source、codex/b4-t4-upgrade-lifecycle@58898b2，baseline a3c206c不变；主控Preflight a035cfc local/origin/API一致、两边tracked clean，仅既有未跟踪缓存。新增D5最小诊断1次/F3完整1次，QA既有2次不变。先本地反例/原因码/精确状态断言→主动回单或watchdog恢复→Review→整合→Hosted；尚未dispatch D5。下方冻结状态为历史，不重开T1/T1A/T2/T3/T4、不另建执行任务或工作树。

## 当前停点｜BLOCKED — HOSTED BUDGET EXHAUSTED

F2 run36214270618@23ab36b在U22固定marker断言失败；安全报告及Artifact10897445184已由主控核实，诊断4/4、Full2/2用尽。QA0/2不可替用，未创建QA。原B4-T4已向新主控主动确认停止，保持原thread/worktree/branch和local58898b2，不继续实现、测试、commit或Hosted。第四轮成果已Review/整合d7ef396；这不等于任务全生命周期或Batch验收完成。唯一ACTIVE Master仍01a0db0e-c950-79e0-8e11-07155e0742f2，旧Master只读历史。最新决定入口B4-STOPLOSS-DECISION-20260926.md；下文RUNNING/准入为历史。

## 当前执行授权｜2026-09-26

当前F2 RUNNING：run36214270618/source23ab36bff1e953e14fd5a213d1c9fb759997ee9c，D4后的实现未变，只增加治理文档，dispatch前local/origin/API一致。显式mode=full；诊断4/4、完整Setup2/2均已用，QA0/2。F2若失败则停止交网页版，不能用QA预算重跑full。QA尚未创建，待真实完整候选。

最新：D4 run36213904038@d7ef396已PASS，19阶段和唯一JSON Artifact10896079310严格验证；U21/U23均真实故障且UNCHANGED。获准进入剩余F2完整Setup；诊断4/4结束，Full尚1/2、QA0/2。下文D4 RUNNING为启动历史；尚无Full/QA/最终发行Artifact PASS。

当前：第四轮task58898b2主动RETURNED→REVIEWED→INTEGRATED为d7ef3964b8fdbf1979dc527e0b65fa202c398ab0；主控23/23契约、两项纯Go、PS AST及实现一致性通过。D4 run36213904038已显式mode=sequence启动，local/origin/API三方同SHA。诊断4/4已用，Full1/2已用，QA0/2；D4若仍FAIL则停止并交网页版，不绕用Full/QA。D4尚不能写PASS，历史REWORK见下。

最新断点：D3 run36212532363结束FAIL，Artifact10896127812严格JSON通过；前17阶段+U21通过，U23固定POST_COPY_MARKER_MISSING/UNCHANGED，未证明post-copy注入。已向原B4-T4发送完整B4-T4-POSTCOPY-20260926-04卡，REWORK/DISPATCHED，从c717d8c继续；return target新主控不变。诊断剩1、Full剩1、QA剩2；禁止用full规避U23未定位问题。下方D3 RUNNING为启动历史。

当前：原T4第三轮2ed43cc及增量c717d8c主动RETURNED→REVIEWED→INTEGRATED，开发分支e6ae80d→b3ab597；主控中文路径14/14专项、纯Go两项、PS AST通过，生产身份/数据规则不变。D3 run36212532363@b3ab5978ca90be3fa5d3c5f793735fc42879ffc6已显式启动mode=sequence，19阶段含U21/U23；local/origin/API核验一致。预算剩诊断1、完整Setup1、QA2，先取D3证据再决定最后full；下方REWORK状态为历史。尚无最终安装包或QA PASS。

最新工程断点：F1 run36210201290@6fdb7ed1在U21失败，fault-copy意外success；fresh Setup、D13/13及U01/U02/U15—U18/U20已通过，后续未执行，网络恢复true。失败Artifact10895856282已核实；原T4第三轮B4-T4-COPY-FAULT-20260926-03已REWORK/DISPATCHED，继续4918e5b，不另建任务。预算剩诊断2、完整Setup1、QA2；先固定copy/post-copy故障证据和最小修复，禁止无修改retry。下文F1 RUNNING为派单时历史状态。

最新：D1 run36208733404@4319e086 FAIL；原T4第二轮4918e5b→9e070de4已主动RETURNED→REVIEWED→INTEGRATED，三处UTF8写入及固定诊断，生产身份门禁未改，主控22/22专项通过。D2 run36209825354@9e070de4已PASS，17阶段及封闭Artifact10895610527隐私校验通过。随后文档措辞修正通过主控npm26 files/failed0。F1完整Setup run36210201290@6fdb7ed1 RUNNING；诊断剩2/4，Full剩1/2，QA2/2未用。尚无完整Batch4或QA PASS结论。

用户已恢复Batch4。唯一ACTIVE ENGINEERING MASTER及return target为01a0db0e-c950-79e0-8e11-07155e0742f2；旧主控保持RETIRED — READ ONLY HISTORY。治理提交已推并核验159ee4163dd52c08584856521463a793eb6e5c7a。原B4-T4：B4-T4-PRE-BASELINE-20260926-01 已主动RETURNED、主控REVIEWED并INTEGRATED；task 867cc752 → integrated 4319e086。六文件闭合阶段诊断及夹具最小修复、主控13/13专项和PS AST通过，尚待Hosted，不代表Batch4通过。任务卡见tasks/B4-T4-PRE-BASELINE-20260926.md，Hosted预算及逐轮结果见AUTONOMOUS-EXECUTION.md。本节覆盖下文历史暂停，不改变历史测试结果。

授权：用户正式 Batch 4 任务书及本次启动指令；L2 / ENGINEERING ORCHESTRATOR。一层独立 Codex task threads，禁止普通 sub-agent。仅 KG718718/spxt-public。

当前唯一主控及回单目标：01a0db0e-c950-79e0-8e11-07155e0742f2。集成分支 codex/windows-installer-v1.1。
旧主控：019fa7e9-f46b-7192-9052-cd0aac7c2cc5，RETIRED — AUTH FAILURE，仅历史读取；下文旧 ID 不再作为活动回单或派单目标。

## 2026-09-26 Phase 2 当前控制状态

只执行主控迁移；Batch 4 生产开发、Hosted 及 QA 启动暂停。B4-T1/T1A/T2/T3 已整合，不重开；B4-T4 仍是唯一未关闭的既有执行任务，最新局部返工 `25b7f3c106dd96a2ecbe737afbbbf3f136fe0c2b` 对应实现已整合，整个生命周期仍 BLOCKED。第二次 sequence run `36145933140` 在首个 BASELINE 记录前失败，下一技术断点不变。B4-QA 尚未创建。

回单迁移与握手结果登记在 [MASTER-MIGRATION.md](MASTER-MIGRATION.md)。通知 `MASTER-MIGRATION-20260926-B4-T4-01` 已由原执行主动回单并被新主控实际接收，迁移握手 RETURNED / PASS；旧主控已明确确认退役。此结果不恢复 Batch 4 开发。本节优先于下列历史编排表及阶段记录，但不倒填或更改历史测试结论。

## 历史编排与证据

2026-09-25 回单规则补充：后续每次派单按AGENTS.md登记 TASK ID、执行/QA thread ID、主控 thread ID、worktree、local branch、baseline、状态；主动送达并核验后为 RETURNED，送达失败则 BLOCKED — RETURN DELIVERY FAILED，由主控 watchdog 从 thread/RESULT/worktree 恢复为 DELIVERY_RECOVERED 后再 Review。只有 REVIEWED 可整合或启动依赖任务。既有 B4-T4 最小诊断已由主控取得并审查，当前 Batch 4 因诊断额度用完仍 BLOCKED；本条不触发第三次 Hosted、完整流水线或新任务。
Preflight：公开仓库/正确分支/干净；本地与 GitHub API 远端均为 2839ba62220e53d126e9fb00757cd89ff89a1b83。首次 git ls-remote 连接重置，API 复核成功；不是身份不一致。

| Task | 职责 / 独占文件 | 依赖 | Thread / Worktree / commit | 状态 |
| --- | --- | --- | --- | --- |
| B4-T1 | 旧安装身份及版本识别；新增 tools/windows-installer/upgrade-detection/、对应专项测试、tasks/B4-T1-RESULT.md | b96543d 文档检查点 | thread 01a0c900-5811-7053-829d-49daa90e9c56；task commits 0afecb0+752ce3b；integrated 0a8e3a8+c79f114 | 主控Review PASS；43/43，封闭historical+fresh identity bundle已整合 |
| B4-T1A | 历史Artifact真实安装后identity取证；独立workflow/脚本/专项，不改Setup核心 | 523a522 | thread 01a0c931-f11f-7d02-8d76-cf402ed42098；worktree E:/CodexWorkspace/CodexWorktrees/bfe5/public-source；task commit 4084c9c；integrated 9009154 | 主控Review PASS；run 35781214911 / job 106927326670 成功，历史profile及5个exact anchors已固化；完整双来源bundle仍待T4 fresh baseline |
| B4-T2 | 只读实例预检；新增 tools/windows-installer/upgrade-preflight/、对应专项测试、tasks/B4-T2-RESULT.md | b96543d 文档检查点 | thread 01a0c900-5901-71f3-a961-24c634605ed4；worktree E:/CodexWorkspace/CodexWorktrees/2f94/public-source；task commits ff21397+8ec1c33；integrated 0e4e4b4+9d59809 | 主控 Review PASS；专项19 PASS/1权限SKIP，已整合；CI待补file symlink实测 |
| B4-T3 | 事务升级及失败恢复；独占 setup.iss/build.cjs/安装元数据与必要 Launcher 适配 | T1/T1A/T2 Review PASS；baseline 3de4b76 | client-new-thread:a3ff3b4d-d9dc-4b37-86dc-26dedc71d1fe；worktree E:/CodexWorkspace/CodexWorktrees/e98f/public-source；task commit e0dd777；integrated 072a349 | 主控 Review PASS；专项14/14，上游T1 45/45、T2 19 PASS/1权限SKIP；真实Inno生命周期留T4 |
| B4-T4 | 真实旧版重建、升级生命周期与故障注入；独占 CI/workflow/生命周期测试 | T3 集成 | recovery thread 01a0cb6a-67cc-7c03-a68b-2727af8fce6e；worktree E:/CodexWorkspace/CodexWorktrees/f8bd/public-source；task commits 7bc6ebf+eb0d786+cb2a6be+2c5d13a+6c42751+51294c5+564322f+5251bf8+97df48e+ab6f619+af8b6c4+e7982e2+b879d55+2e0155e+f6de973+a52594d+ddca778+6ed04c9+a1906b8+12eaaec+16af55d；integrated e85ca46+1dc306e+0c30b23+849986e+c63080f+237da06+3a9105d+25efdb8+6cb7769+61de717+2a03c20+6c62882+400319e+6bc0ea9+5c8bb07+a708727+ff2536b+d742fb2+2e8dcd5+90eb0e4+f288376 | 主控本地 Review PASS；第十九次 hosted 在 U20 固定命中 identity rejected；已按 Stop-Loss 增加固定身份阶段码和最小 Hosted Identity Diagnostic，未改接受条件；最多两轮最小诊断，暂不再跑完整流水线 |
| B4-QA | 独立只读生产代码审查与验证 | 最终集成候选 | 尚未创建 | 必须执行，未开始 |

困难任务：安装原子性、来源安全、数据保护及恢复均属高风险；所有执行/QA 使用 gpt-5.6-sol / medium。主控不写实质生产/测试代码。

执行使用 Codex managed worktree，必须在 E:/CodexWorkspace/CodexWorktrees 下，一任务一 codex/ 本地分支。首项报告 toplevel、origin、HEAD，必须匹配派单的精确 baseline；失败即停且不写文件。禁止自动 fetch、更换基线、push、merge 开发分支、main/tag/Release、创建子任务/Agent。

T1/T2 仅做独立 helper 与隔离测试，不改 setup.iss、Launcher core、workflow、业务源码或彼此目录。不得实际安装/卸载、更改 HKCU 正式安装登记、占用默认 Beta 实例或启停用户应用。合成临时证据仅在自己的 E 盘工作树忽略区；不提交实例/secret/二进制。T3/T4 涉及共享安装状态的实装测试只在受控 CI 中串行运行。

T1/T2 首轮不得 push；返回接口与限制后由主控审查再派 T3。实质冲突退原任务。后续阶段发新完整任务卡，不凭本表自行进入。

任务返回：TASK ID、PASS/FAIL/BLOCKED（规格冲突 NEED PARENT DECISION）、完成、文件、测试、local commit、风险、主控处理。内部任务不写网页版 Handoff；主控统一生成。

派单精确 baseline：b96543ddde2888513be2f2cc1f8e39a4831f1571，已 push 仅开发分支。指定本地任务分支 codex/b4-t1-upgrade-detection、codex/b4-t2-instance-preflight。create_thread 使用现有项目（公开版已为主要目录）、worktree、startingState=已批准开发分支，非上层仓库。
创建后 git worktree list 已发现 E:/CodexWorkspace/CodexWorktrees/2f94/public-source 和 E:/CodexWorkspace/CodexWorktrees/a536/public-source，均在正确 E 盘根且 HEAD=b96543d；当前尚不能将两个路径准确对应任务，等待执行首项回报后填入，不猜测。此时客户端创建ID不能用于 read/wait/send 的 threadId。

2026-09-22 T2 首轮 Review：提交只含 helper、专项与本任务报告，diff-check 通过；主控独立复跑专项 17/17、语法检查通过。反例审查发现 initialized instance 根下未知名称的 junction/symlink 未被全局树检查覆盖，与“实例不存在危险 reparse/symlink”不完全一致，故暂不整合，退原 T2 增加根级及深层未知路径反例并最小修复。binding 精确位置与 staged app 全依赖可信 hash 留给 T1/T3，不扩大 T2。

T2 返工复核：先得到 17 PASS/2 FAIL/1 SKIP 的预期失败证据，再改为完整 instance 元数据递归遍历；未知普通文件/目录仍接受，任意名称/深度的 reparse/symlink/特殊文件失败关闭，不读取未知文件正文。主控复跑 19 PASS/1 SKIP、startup 80 checks、installer/R2 contract、语法和diff-check均通过；file symlink 因本机权限跳过，T4 Windows CI需补实测，不把skip写成通过。

T1 首轮 Review：单策略严格校验专项27/27由主控复跑通过，但不能只信任T4本次fresh重建。实际用户来源是Run35514357007/Artifact10606870944，API核实head=e9417f0、success、未过期（2026-10-20）；动态build-info/Runtime环境令fresh与历史安装不保证字节相同。已退T1增加beta.2构建侧固定hash的封闭identity bundle，历史Artifact及同次fresh baseline均必须各自精确锚定；不因同commit/tree放宽。历史安装后identity提取列为T3/T4前置，Artifact过期前只持久化非敏感hash/evidence，长期不依赖下载。

T1 返工复核：主控复跑43/43。bundle固定自身SHA，字段及批准来源闭合；historical/fresh各自exact anchors，只有受控证据证明完整fingerprint相同才可显式去重；第三identity、同commit/tree、动态build-info变化均拒绝。已整合。T1A串行取得历史Artifact实际安装后anchors；拿不到则BLOCKED，不进入T3。

2026-09-23 T1A 结项：主控核验 run 35781214911 精确 HEAD 3adc874；historical-identity job 106927326670 为 success，脱敏 evidence Artifact 10718411569，历史profile、5个exact anchors、T1单策略及卸载清理均PASS。执行提交4084c9c经主控复跑 historical 70/70、T1 45/45、T2 19 PASS/1权限SKIP和安装器契约后整合为9009154。该run的sibling setup job 106927326987因既有R1 READY GUI自动化超时而失败，故整个run结论仍为failure；不影响T1A局部证据，但不能冒充完整CI通过，继续作为既有独立backlog保留。

2026-09-23 T3 恢复与结项：Codex客户端创建返回client ID后未注册出正式thread ID，重启后仍未出现在任务列表；但managed worktree与本地分支完整保留，并已生成提交e0dd777和正式回单。主控核验worktree位于批准的E盘根、origin正确、基线3de4b76、工作树clean；独立复跑T3 14/14、T1 45/45、T2 19 PASS/1权限SKIP及diff-check，通过只读代码Review后整合为072a349。任务登记异常不冒充正式thread回单；真实Inno编译、注册表全值、快捷方式、取消/空间/ACL故障和U18—U30仍由T4验证。

2026-09-23 T4 本地结项：首个client任务未注册出正式thread，但managed worktree f8bd与未提交成果保留；主控在同一worktree创建恢复thread继续原目标，没有新建代码worktree。首轮Review发现U21故障未接入upgrade staging、U22 marker语义不符、U24/U25缺少成功升级后的真实快捷方式与注册表断言，退回同一执行任务修正。执行任务新增提交eb0d786；主控逐项代码复核，并独立复跑T4/T3 20/20、installer与R2 contract、固定Go测试包编译、diff-check通过后，整合为e85ca46+1dc306e。U01—U30仍全部是Actions pending，未写成PASS；下一步只允许主控push开发分支并保留首次hosted Windows结果，失败退回同一T4任务。f8bd仅余未跟踪.test-work/node_modules，未进入提交，不在未获删除确认时主动清理。

2026-09-23 T4 首次 hosted 结果与修正：run 35800072543 / job 106988166109 在 exact e9417f0 的历史 `ci.ps1` 自带可见向导 `TestSetup` READY/输入同步 COM timeout 处失败；failure Artifact 10725736587 已保存，未进入fresh identity、beta.2 build或U01—U30。未重跑或掩盖该失败。原T4执行任务增加exact beta.1 build-only闭包：固定commit/tree及12个关键blob，仍调用历史Runtime/Launcher/Portable、installer contract、Inno toolchain和candidate build，只跳过已证明不稳定的历史GUI回归；Setup/manifest/program inventory及工具链身份由新验证器失败关闭，最终U01—U30不变。主控独立复跑T4/T3 21/21、installer/R2 contract、CJS/PowerShell语法、固定Go包编译及diff-check后整合为0c30b23；修正后的hosted结果仍pending。

2026-09-23 T4 第二次 hosted 结果与修正：run 35802015923 / job 106994266165 在任何构建前由合并的source clean条件拒绝，无Artifact；错误为`Exact clean beta.1 checkout required`。根因范围收口为checkout与后续检查的Git换行配置不一致，但原条件无法区分具体子项。执行任务保留clean门禁，将top-level、commit、tree、tracked dirty及blob身份拆成固定错误码；所有Git读取显式使用`core.autocrlf=false`，合成仓库证明全局CRLF配置不再产生假dirty且真实tracked修改仍失败。主控独立复跑T4/T3 22/22、installer/R2 contract、CJS/PowerShell语法、固定Go包编译和diff-check后整合为849986e；下一次hosted结果仍pending。

2026-09-23 T4 第三次 hosted 结果与修正：run 35803383243 / job 106998595821 在任何构建前由固定错误码 `BETA1_SOURCE_TOPLEVEL_MISMATCH` 拒绝，无Artifact。证据表明GitHub Windows runner的E盘为subst映射：Git返回物理底层路径，Node保留E盘别名；两者实际指向同一仓库，但原字符串比较误判。执行任务将top-level和期望目录都经`fs.realpathSync.native`规范化，Windows再做大小写归一；合成junction别名测试证明同仓库别名接受，而子目录、错误根、错误commit/tree、tracked dirty仍失败关闭，`core.autocrlf=false`及12个关键blob检查不变。主控独立复跑T4/T3 22/22、installer/R2 contract、CJS语法、固定Go包编译和diff-check通过，整合为c63080f；下一次hosted结果仍pending。

2026-09-23 T4 第四次 hosted 结果与修正：Setup run 35804632918 / job 107002547301 已通过 exact beta.1 source、build-only、fresh identity及beta.2 Runtime/Launcher构建，在beta.2 Portable移动路径重启探针以`403 !== 200`失败；failure Artifact 10727636644 已由主控保存。根因是测试让员工在重启后读取一份仅上传、未关联业务记录的临时附件，而临时owner map按既有最小权限规则不跨重启，403才是正确结果；修正后员工403成为反例，重新登录的Admin下载同一文件为200且字节不变，未改服务端权限。并行Runtime run 35804632969 / job 107002547427 为25/26 suites：唯一失败是B4-T4公开报告引用其他环境触发既有隐私门禁；报告已改为自包含边界措辞，未放宽隐私正则。主控Review另发现新增独立check会把固定总数742改为743，退回同一任务把新断言并入既有check，最终真实Server HTTP仍25/25、T4/T3 23/23、文档隐私8/8、installer/R2 contract及diff-check通过，整合为237da06；下一次hosted结果仍pending。

2026-09-23 T4 第五次 hosted 结果与修正：候选0254bdd的Runtime run 35807722187与Portable run 35807722105均success；Setup run 35807722197 / job 107012151593在Setup编译前的upgrade-preflight专项中失败，failure Artifact 10728312842已由主控保存。所有预期业务分支均先收到`INSTALL_ROOT_INVALID`，根因是`samePath`只比较字符串，而hosted Runner的`E:`为subst卷根别名，`realpath(E:\\...)`返回物理路径。执行任务仅把路径比较和包含关系规范化到卷根物理身份，不解析或放行目录内部junction/reparse；新增合成subst反例证明同一安装根可接受，错误根、program/instance重叠及junction根仍失败关闭。主控逐项代码审查并独立复跑upgrade-preflight 20 PASS/1权限SKIP、installer/upgrade contract 9/9，通过后整合为3a9105d；修正后的hosted结果仍pending，U01—U30未写成PASS。

2026-09-23 T4 第六次 hosted 结果与修正：候选96d26f3的Runtime run 35810440373 success；Setup run 35810440453 / job 107020593126已越过preflight，完成exact beta.1重建/fresh identity、beta.2 Runtime/Launcher/Portable、Setup编译及部分真实Setup回归，最终在同版本beta.2再次运行场景缺少`KSESSION_REJECT_REGISTERED`而失败；failure Artifact 10729513518已由主控保存。根因是升级模式引入后，已有登记统一进入UpgradeMode，却未保留“当前beta.2已安装时明确拒绝重装”的产品分支；Inno仅抛出无原因EAbort，测试正确拒绝把它计为PASS。执行任务仅在登记读取完整且版本精确等于1.1.0-beta.2时记录拒绝原因并停止；beta.1登记仍继续走exact identity、preflight和可恢复事务。主控逐项Review并独立复跑T4/T3/transaction 10/10、upgrade-preflight 20 PASS/1权限SKIP及文档隐私8/8，整合为25efdb8；修正后的hosted结果仍pending，U01—U30未写成PASS。

2026-09-23 T4 第七次 hosted 结果与夹具修正：候选ed449ea的Runtime run 35812914508 success；Setup run 35812914595 / job 107028173471已通过fresh beta.2安装、Launcher/私有Node、合成Admin及数据/附件、运行中覆盖/卸载拒绝、停止后卸载及instance字节保留，最终在重装前由程序根非空门禁记录`KSESSION_REJECT_NONEMPTY`并失败；failure Artifact 10730302530，digest sha256:2f88eaf1b0131e7b72a380109d7e3f936615ea9d33ac3ea4574d484b74044fb8，已由主控保存。复核确认instance身份检查没有失败：测试为证明卸载不误删而在程序根放置合成未知文件，Inno因此保留空目录壳；测试删除文件后没有清理这些夹具壳，污染后续重装。执行任务只在验证未知文件确实保留后，逐个确认program、uninstall和测试根是普通、非链接且完全空的目录，再非递归删除；任一未知条目、文件、链接或读取错误均失败。Setup产品代码及未知非空目录、reparse、权限、重叠、exact升级门禁未放宽。主控逐项Review并独立复跑升级生命周期契约7/7、diff-check通过，整合为6cb7769；修正后的hosted结果仍pending，U01—U30未写成PASS。

2026-09-23 T4 第八次 hosted 结果与卸载修正：候选8913b1c的Runtime run 35814718986、Launcher run 35814718974、Portable run 35814718987均success；Setup run 35814718991 / job 107033683886再次通过fresh安装、Launcher、合成Admin/数据/附件、运行中拒绝、卸载及instance字节保留，随后严格夹具在uninstall目录发现安装器运行时创建但未被Inno文件清单追踪的`install-state.json`并失败；failure Artifact 10731770877，digest sha256:9d4d3c043b82c19ba475453964efef1ab198cf651eb138f453e8ac2a2b86e138，已由主控保存。执行任务增加卸载阶段精确自有状态清理：只处理该固定文件，缺失兼容，目录/reparse/属性异常/删除失败均停止，不枚举、不通配、不递归、不触碰instance。主控首次Review发现仅检查目标文件不足以防父级junction重定向，退回补完整普通目录祖先链校验及真实junction反例；外部状态文件必须字节不变、登记和程序仍存在。返工后主控逐项Review并独立复跑升级生命周期契约7/7、diff-check通过，整合为61de717；固定Inno 6.7.3编译、卸载回调与junction反例仍待下一次hosted验证，U01—U30未写成PASS。

2026-09-23 T4 第九次 hosted 结果与向导测试修正：候选add27a4的Runtime run 35818266817、Launcher run 35818267029、Portable run 35818266814均success；Setup run 35818266796 / job 107044402164已实际通过固定Inno 6.7.3编译、父目录junction拒绝、正常卸载精确删除`install-state.json`、正常重装及D07/I18/I30/I31/D13/I25/I20/I03，最后在可见GUI向导自动化超时；failure Artifact 10732089023，digest sha256:51ab60711af11e70614b4d1ba378b88fa424eaf0fd71923e59d42d5108bc76cc，已由主控保存。日志证明同步`SendMessageTimeoutW(WM_COMMAND)`仍在跨进程输入同步调用栈内时触发`PrepareToInstall`，未修改的`RunningProduct`调用WMI被COM明确拒绝，产品正确记录`KSESSION_PROCESS_INSPECTION_UNAVAILABLE`并fail-closed停留page11。执行任务仅把同一真实、可见、启用按钮及其实际parent/control ID的标准通知改为`PostMessageW`异步排队，并按本次向导唯一Next/Install/Finish标签防止轮询重复点击；未改WMI、fail-closed、向导页、完成页[Run]、timeout或断言。主控对照原始日志和完整diff确认可见流程仅出现一次Next、一次Install及后续Finish，独立Review通过，整合为2a03c20；异步消息泵真实行为仍须下一次hosted证明，U01—U30未写成PASS。

2026-09-23 T4 第十次 hosted 结果与安全诊断增强：候选ca579e4的Runtime run 35820908796、Launcher run 35820908664、Portable run 35820908704均success；Setup run 35820908729 / job 107052341541真实通过可见向导Next→Install→Finish、D10及完整TestSetup，证明第九次异步修正有效。随后`TestUpgradeLifecycle`完成fresh rebuilt beta.1安装和真实registration/binding，U01 PASS，但首次beta.1 core probe仅以`tool node.exe failed`终止，现有wrapper丢弃CombinedOutput，无法从首失败证据判断具体断言；failure Artifact 10733961699，digest sha256:f4b65ce960f7720c19d4b11e1414e27624f441e05d62ae548cec2b238cfdb0ae，已由主控保存。静态对比确认当前core-client相对exact beta.1只在existing路径增加持久附件校验、在initial完成后保存附件文件名，本次失败的initial既有setup/login/PDF/XLSX/upload/backup契约未改变，故没有证据支持改期望或业务逻辑。执行任务只增加安全诊断：三处probe以固定外层阶段标识，内部只输出白名单阶段/错误类别；wrapper仅回显固定码、阶段、类别、总字节数及SHA256，不输出原始CombinedOutput、密码、token、Cookie、路径或正文，无合法marker则固定`CORE_PROBE_NO_SAFE_DIAGNOSTIC`失败。主控Review过滤器与反泄漏单测通过，整合为6c62882；下一次hosted为证据获取轮，U02—U30未写成PASS。

2026-09-23 T4 第十一次 hosted 结果与最早期诊断增强：候选f18b1fc的Setup run 35823498989 / job 107060182123再次完成fresh rebuilt beta.1安装、真实registration/binding并取得U01 PASS，随后仍在beta.1 initial core probe失败；安全摘要为`CORE_PROBE_NO_SAFE_DIAGNOSTIC`、outputBytes=787、outputSHA256=4307854f907ee5703aee7fc83e3daddcbf4e94ec2f23a95f5ea670c49449dda9，failure Artifact 10734241975，digest sha256:61402bee9ef7a9230e10c642b4ac1806832044da88bb8d6e75ae56ef6396666e，已由主控保存。该证据只证明异常发生在上一版IIFE错误处理器安装前，不能从字节数或哈希推断具体内容，U02—U30仍未执行。执行任务把单次安全handler前移到任何本地模块加载、参数派生和`createRequire`之前，按`COMMON_MODULE`、`ARGUMENTS`、`APP_REQUIRE`等固定白名单阶段分类；每次probe另由同一私有Node先执行`--check`，语法失败只记录固定错误码、字节数和SHA256。隔离反例已证明缺少common模块时仅输出一条`COMMON_MODULE/MISSING_MODULE` marker，且无message、stack或路径。主控Review确认未改产品代码、业务断言或升级期望，整合为400319e；下一次hosted仍是证据获取轮。

2026-09-23 T4 第十二次 hosted 结果与探针路径修正：候选4e1c3ad的Runtime run 35826316415、Launcher run 35826316328、Portable run 35826316418均success；Setup run 35826316453 / job 107068715241再次完成fresh rebuilt beta.1安装、registration/binding及U01 PASS，随后同一beta.1私有Node的`--check`返回`CORE_PROBE_SYNTAX_FAILED`、outputBytes=313、outputSHA256=51ec6854f2de44cfdb110625c54f0746dff25459bdc72fe9df89348409b20474；failure Artifact 10735128742，digest sha256:66e38a09eeda2d825f752803f7179723616d10eed9dde6975abecea594c05e6d，已由主控保存。执行任务用beta.1固定Node v24.21.0复现并证明：正确`tools/tests/windows-portable/core-client.cjs`可通过语法检查，原测试遗漏`tests`段的不存在路径产生完全相同的313字节及SHA256。因此不是语法兼容或业务失败；修正只补回三处路径，契约要求正确路径恰好三处并禁止旧路径，同Node语法门禁和全部升级断言保持不变。主控Review通过，整合为6bc0ea9；U02—U30仍等待hosted真实执行。

2026-09-23 T4 第十三次 hosted 结果与U18安全诊断：候选124d192的Runtime run 35828307756、Launcher run 35828307745、Portable run 35828307748均success；Setup run 35828307741 / job 107074848326的`TestSetup`完整PASS，升级生命周期真实取得U01、U02、U15、U16、U17 PASS，随后U18 fault-space因未出现`KSESSION_REJECT_SPACE`而停止；failure Artifact 10736682800，digest sha256:eb3f2330a88505353cd8c896cc5a555f96053d34e777bb7a6d36765e1d1c99d0，已由主控保存。fresh I23已用同一fault-space二进制命中空间门禁，Launcher正常停止只关闭锁句柄、不删除`.launcher.lock`，但failure Artifact不含原始Setup日志，现有证据不足以判断升级场景被哪个更早门禁截断。未猜测修改产品行为；执行任务仅增加固定白名单marker诊断、日志字节数与SHA256，未知标识、原文、路径、实例内容和秘密不输出。主控Review及反泄漏测试通过，整合为5c8bb07；U03—U14、U18—U30仍未写成PASS。

2026-09-23 T4 第十四次 hosted 结果与Inno退出码诊断：候选f8d51b7的Runtime run 35831228855、Launcher run 35831229052、Portable run 35831229038均success；Setup run 35831228916 / job 107084053271再次真实取得U01、U02、U15、U16、U17 PASS，U18仍缺少空间标识；安全摘要为`observedFixedMarkers=NONE`、logBytes=3267、logSHA256=e8a0283ae5c89e71b0837ed9dd065fa08d34c835e19911828f6fd273df8b3a8a，failure Artifact 10738100665，digest sha256:1a92df013e620858fe444877dd55b42492040ecbf79a67b11bca04d974801401，已由主控保存。日志无任何允许的产品marker，故不再假设某个产品门禁截断；脚本未配置SetupMutex，AppId也不能作为互斥冲突证据。执行任务只增加Inno官方0—8退出码固定分类、整数退出码、耗时及既有marker/长度/哈希；未知码统一分类，raw错误、日志、路径和秘密不输出。主控Review及合成反泄漏测试通过，整合为a708727；下一轮用于区分初始化失败、Prepare拒绝与其他启动层异常。

2026-09-23 T4 第十五次 hosted 结果与Prepare分支诊断：候选9f90a8b的Runtime run 35833689522、Launcher run 35833689479、Portable run 35833689481均success；Setup run 35833689471 / job 107092001596再次真实取得U01、U02、U15、U16、U17 PASS，U18安全摘要为`innoExitCode=7 innoExitStatus=INNO_EXIT_PREPARE_REJECTED elapsedMilliseconds=359 observedFixedMarkers=NONE logBytes=3267 logSHA256=27e5288388d1b9bcda4ed5f7c9d476c6512db4d60ddd385d1cbad5cd72527a20`；failure Artifact 10738927441，digest sha256:d47bde04e5dca95e682ab50de8657c6bb87631d21ed40fa6617f3346b5760088，已由主控保存。该证据排除初始化失败，但仍只能把未标记返回点收窄为安装根不一致、程序仍运行或实例锁不可获取，359ms不能安全区分。执行任务未更改fixture、拒绝条件或U18预期，只为三种原因增加固定且不含路径的marker。主控逐行Review并复跑升级契约7/7、diff-check通过，整合为ff2536b；本机缺少Go命令，未重复宣称执行任务已通过的Go专项为主控复跑结果。下一轮只用于精确识别pre-space拒绝分支。

2026-09-23 T4 第十六次 hosted 结果与安装根表示修正：候选16c87d5的Runtime run 35837361989、Launcher run 35837361944、Portable run 35837361979均success；Setup run 35837361953 / job 107103915266再次真实取得U01、U02、U15、U16、U17 PASS，U18固定命中`KSESSION_UPGRADE_ROOT_MISMATCH`，exit 7、耗时363ms；failure Artifact 10739829655，digest sha256:ace48d0320140dee5d7c3ae42216a526b37390442c89ee57e950c33e27591166，已由主控保存。执行任务核对Inno Setup 6.7.3源码：自动卸载登记以`AddBackslash(WizardDirValue)`写`InstallLocation`，而同一`{app}`及harness `/DIR`无尾反斜杠；原始字符串比较因此误拒绝同一目录。修正仅用`RemoveBackslashUnlessRoot`统一尾分隔符，不接受不同目录、subst、短路径或重解析别名；U01前新增beta.1登记/binding/instance真实文件身份断言，beta.2登记复核沿用同规则。主控逐行Review并复跑升级契约7/7、公开测试26文件fail0及diff-check，整合为d742fb2；本机缺少Go命令，未冒充主控Go复跑。U18空间故障与状态相等仍须下一轮hosted证明。

2026-09-23 T4 第十七次 hosted 结果与U20内部表示修正：候选88fa2f5的Runtime run 35841262332、Launcher run 35841262470、Portable run 35841262414均success；Setup run 35841262430 / job 107116614557取得U01、U02、U15—U18 PASS，U18首次真实证明空间不足后program、metadata、registration、binding、shortcuts及instance完整恢复；随后U20 fault-cancel在复制前固定命中`KSESSION_UPGRADE_PREFLIGHT_REJECTED`，failure Artifact 10742285228，digest sha256:101e3c8910f8b2ee9972330cd1118f166cdc3595dbf7e2579076d67c8b7f65d0，已由主控保存。代码契约证明detection helper返回去尾分隔符的identity.installRoot，而request/plan继续携带Inno登记原值，严格cross-helper一致性检查因此拒绝。修正只规范化内部request/plan的installRoot，snapshot保留原登记值，preflight/gate/transaction、取消和rollback条件均未放宽。主控逐行Review并复跑升级契约7/7、公开测试26文件fail0及diff-check，整合为2e8dcd5；U20真实复制取消与完整回滚仍须下一轮hosted证明。

2026-09-23 T4 第十八次 hosted 结果与gate reason-code诊断：候选eaa2435的Runtime run 35843571283 success；Setup run 35843571342 / job 107124188994再次取得U01、U02、U15—U18 PASS，但U20仍以`KSESSION_UPGRADE_PREFLIGHT_REJECTED`在复制前停止，failure Artifact 10742583830，digest sha256:a13c74df6cd36659c8b885ec3f02020c56197cfbf69c104ebe1de4d6923d47af，已由主控保存。逐字段审计确认U20是序列中首次完整执行upgrade gate，U18在空间门禁更早退出，既有统一标记无法安全区分identity、preflight固定原因或cross-helper字段；继续直接改路径会是猜测。执行任务仅将固定preflight错误及cross-helper字段映射为白名单进程退出码和Inno marker，未知值归internal，不输出raw错误、路径、JSON、stdout或秘密；所有gate/preflight接受条件、取消和rollback均未改。主控逐行Review并复跑lifecycle/gate 13/13、公开测试26文件fail0及diff-check，整合为90eb0e4；下一轮只用于取得唯一固定reason marker。

2026-09-23 T4 Identity Gate Stop-Loss：第十九次 Setup run 35846952206 / job 107135286484 取得 U01、U02、U15—U18 PASS，U20 在复制前固定命中 `KSESSION_UPGRADE_GATE_IDENTITY_REJECTED`；failure Artifact 10744014234 已保留。用户批准停止用完整 Runtime→Launcher→Portable→Setup→Regression 流水线取单个诊断码。原 T4 worktree 保留，任务提交 16af55d 经主控只读 Review 及 identity/detection/gate/lifecycle 契约 60/60 复跑后整合为 f288376：新增固定 `IDENTITY_*` 阶段码和手动最小 Hosted Identity Diagnostic，只重建/实装 exact fresh beta.1 并调用当前 detection/gate identity 部分；Artifact 仅含 schema/status/reason，临时 request 与安装日志不上传。最多允许两轮最小 Hosted 诊断；取得唯一阶段、完成最小修复且最小诊断 PASS 前，禁止再次运行完整 Batch 4。

2026-09-23 T4 Identity Stop-Loss 结果：第一轮最小 Hosted 诊断 run 35860479890 固定命中 `IDENTITY_PATH`；确认 GitHub Runner 的 `E:` 为 subst 卷别名，路径身份比较误拒绝合法卷根。最小修复后，第二轮且最后一轮最小诊断 run 35862632387 返回 `IDENTITY_ACCEPTED`，未放宽目录内部 reparse、短路径、不同目录或hash门禁。随后按批准流程仅运行一次完整 Setup run 35863240935：U01、U02、U15—U18 PASS，U20 在复制前固定命中新的 `KSESSION_UPGRADE_GATE_IDENTITY_REGISTRATION`；完整回归、Artifact隐私门禁和最终Setup Artifact均未执行。两轮通用身份诊断额度与一次完整复验均已用完；当前停止 Actions 循环，不启动B4-QA，不猜测修改登记规则，等待是否批准“U15—U18→U20最小序列登记诊断”的上级决定。

2026-09-25 用户选择继续公开版 Batch 4，批准且仅批准“U15—U18→U20 最小序列登记身份诊断”。复用原 B4-T4 执行任务和 f8bd 工作树，不新建任务/工作树；先在隔离合成环境复现 U15—U18 对登记/绑定的影响，再调用 U20 复制前身份门禁，仅输出固定白名单阶段码与不含路径、正文、hash原值或凭据的摘要。此专项不再运行完整 Runtime→Launcher→Portable→Setup→Regression 流水线，不修改身份接受条件、业务规则、真实数据、main、v1.0.0 或 Release。主控 Review 执行改动和本地专项测试后，至多启动一次该最小 Hosted 序列诊断；若仍无法定位唯一原因，停止并回报，不循环重跑。诊断结果不得冒充 U20 或 Batch 4 PASS；是否实施修复及何时复跑完整门禁，依据诊断证据另行判断，涉及产品/数据生命周期决定时交回上级。

2026-09-25 B4-T4 首轮回单未自动送达主控；主控从原执行任务及 f8bd 工作树核得 local commit `e5f8c7184c4b83a4f9da35847a4a4c20b5d31799`，仅为最小序列诊断工具的本地实现，Hosted 未运行。主控只读 Review 发现 `sequence-diagnostic.ps1` 的 E 盘路径正则末尾为孤立反斜杠；以合法 E 盘路径运行该表达式可复现 PowerShell `Invalid pattern`。已退回原 B4-T4 执行任务做最小修正及可执行正反例测试；修正验收前禁止推送或触发一次性 Hosted 诊断。此项不是 U20 或 Batch 4 PASS。

2026-09-25 回单补救：本次主控 thread ID 为 `019fa7e9-f46b-7192-9052-cd0aac7c2cc5`，原 B4-T4 thread ID 为 `01a0cb6a-67cc-7c03-a68b-2727af8fce6e`。已向原任务补派精确主控 ID，要求结束前主动发送结构化回单并核验送达；失败则在任务 RESULT 与最终回复明确标记“主控未收到／待主控读取”。公开仓库 AGENTS.md 已固定为后续派单规则。执行任务结束或 UI 显示完成本身不自动构成主控验收，也不得据此自动继续 Hosted、合并或发布。

随后主控实际收到 B4-T4 结构化回单：路径门禁返工 local commit `3e059b813022be2b8bba5156d4db7c328cc27e44`，执行任务报告本地专项通过、Hosted 未运行、未 push。主控尚未 Review 此提交，回单送达只恢复交接，不构成代码验收或授权启动诊断。

2026-09-25 主控随后完成只读 Review、专项 19/19 复跑、Go 1.27.1 格式与 compile-only 验证，将执行提交整合到公开开发分支 `412f4cafb6d13372bdec84161cc17b3eca30e891` 并推送；提交尾部 `[skip ci]`，未自动启动完整流水线。手动唯一一次 `setup-v3.yml mode=sequence` run `36141099074` / sequence job `108090866148` 在 `SEQUENCE_GATE_BUILD_FAILED` 停止，Setup/full/identity/historical jobs 全部 skipped；无 `SEQUENCE-DIAGNOSTIC.json`，未进入 U15—U20，也未取得登记身份子原因。主控静态 Review 发现 `build.cjs` 序列模式已把 `pr/pv.sourceCommit` 比较 beta.1 payloadCommit，却仍把 beta.1 `zip-identity.sourceCommit` 比较当前诊断 commit；这是可复核的构建身份冲突，但因 build stdout/stderr 被抑制，尚非运行日志确认的唯一根因。已退回原 B4-T4 做最小修正和本地反例；本次一次性 Hosted 额度已使用，不自行发起第二次，等待后续决定。U20、完整回归、Batch 4 均未 PASS。

原 B4-T4 已将返工提交 `25b7f3c106dd96a2ecbe737afbbbf3f136fe0c2b` 主动回单至主控：仅把序列模式的 ZIP sourceCommit 比较改为 `payloadCommit`，保留 ZIP SHA 校验；普通 candidate/fault 仍以当前 commit 比较。主控逐行 Review，并复跑生命周期/门禁专项 19/19、Node syntax 与 diff-check，均通过；该修正只说明本地构建身份断言已收口，未经过第二次 Hosted 证实。第二次手动诊断须取得上级明确允许，不能因本地修复自行重试。

2026-09-25 用户明确批准第二次且仅 `mode=sequence` 最小 Hosted 诊断。主控核对公开开发分支本地与远端同为 `3ae73b7e4c37c1615c4867345883432d58150fbc` 后，手动触发 run `36145933140` / sequence job `108106992593`；setup、identity、historical-identity 均 skipped。exact beta.1 重建后，两个专项诊断壳构建已越过前次 ZIP 身份断言；生命周期测试最终以固定 `SEQUENCE_LIFECYCLE_FAILED` 退出。唯一上传的 Artifact `10869846376`（`upgrade-sequence-diagnostic-36145933140-1`，209 字节）解包后仅有 `{"phases":[],"schema":1,"status":"FAIL"}`。由此只可确认失败在首个 `BASELINE` 阶段记录之前；不能确认真实 beta.1 安装、U15—U18 序列或 U20 identity 已执行，更不能推断登记身份子原因。两次获批的 sequence run 均已用完，停止所有自动重试和完整流水线；若后续需继续，应先设计不泄露路径/日志/身份值的 pre-baseline 固定阶段诊断，并取得新的 Hosted 运行授权。Batch 4 仍 BLOCKED / 未验收。

用户报告工作树自动回收开启、限制20。不得主动触发删除；记录任务 commit 和路径，未整合结果不得清理，派单前检查现存公开 worktree。若发现路径/结果被回收，停止，不伪造恢复。

最终门禁见 ACCEPTANCE.md。未获人工验收不得最终 PASS；不进入下一 Batch。所有产品/UX/schema/重大架构决策使用五字段卡交回网页版。
