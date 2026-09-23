# Batch 4 编排索引

授权：用户正式 Batch 4 任务书及本次启动指令；L2 / ENGINEERING ORCHESTRATOR。一层独立 Codex task threads，禁止普通 sub-agent。仅 KG718718/spxt-public。

主控：019fa7e9-f46b-7192-9052-cd0aac7c2cc5。集成分支 codex/windows-installer-v1.1。
Preflight：公开仓库/正确分支/干净；本地与 GitHub API 远端均为 2839ba62220e53d126e9fb00757cd89ff89a1b83。首次 git ls-remote 连接重置，API 复核成功；不是身份不一致。

| Task | 职责 / 独占文件 | 依赖 | Thread / Worktree / commit | 状态 |
| --- | --- | --- | --- | --- |
| B4-T1 | 旧安装身份及版本识别；新增 tools/windows-installer/upgrade-detection/、对应专项测试、tasks/B4-T1-RESULT.md | b96543d 文档检查点 | thread 01a0c900-5811-7053-829d-49daa90e9c56；task commits 0afecb0+752ce3b；integrated 0a8e3a8+c79f114 | 主控Review PASS；43/43，封闭historical+fresh identity bundle已整合 |
| B4-T1A | 历史Artifact真实安装后identity取证；独立workflow/脚本/专项，不改Setup核心 | 523a522 | thread 01a0c931-f11f-7d02-8d76-cf402ed42098；worktree E:/CodexWorkspace/CodexWorktrees/bfe5/public-source；task commit 4084c9c；integrated 9009154 | 主控Review PASS；run 35781214911 / job 106927326670 成功，历史profile及5个exact anchors已固化；完整双来源bundle仍待T4 fresh baseline |
| B4-T2 | 只读实例预检；新增 tools/windows-installer/upgrade-preflight/、对应专项测试、tasks/B4-T2-RESULT.md | b96543d 文档检查点 | thread 01a0c900-5901-71f3-a961-24c634605ed4；worktree E:/CodexWorkspace/CodexWorktrees/2f94/public-source；task commits ff21397+8ec1c33；integrated 0e4e4b4+9d59809 | 主控 Review PASS；专项19 PASS/1权限SKIP，已整合；CI待补file symlink实测 |
| B4-T3 | 事务升级及失败恢复；独占 setup.iss/build.cjs/安装元数据与必要 Launcher 适配 | T1/T1A/T2 Review PASS；baseline 3de4b76 | client-new-thread:a3ff3b4d-d9dc-4b37-86dc-26dedc71d1fe；worktree E:/CodexWorkspace/CodexWorktrees/e98f/public-source；task commit e0dd777；integrated 072a349 | 主控 Review PASS；专项14/14，上游T1 45/45、T2 19 PASS/1权限SKIP；真实Inno生命周期留T4 |
| B4-T4 | 真实旧版重建、升级生命周期与故障注入；独占 CI/workflow/生命周期测试 | T3 集成 | recovery thread 01a0cb6a-67cc-7c03-a68b-2727af8fce6e；worktree E:/CodexWorkspace/CodexWorktrees/f8bd/public-source；task commits 7bc6ebf+eb0d786+cb2a6be+2c5d13a+6c42751+51294c5+564322f+5251bf8+97df48e+ab6f619；integrated e85ca46+1dc306e+0c30b23+849986e+c63080f+237da06+3a9105d+25efdb8+6cb7769+61de717 | 主控本地 Review PASS；前八次Actions失败事实已保留；卸载器自有状态清理已失败关闭，下一次Actions待运行 |
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

用户报告工作树自动回收开启、限制20。不得主动触发删除；记录任务 commit 和路径，未整合结果不得清理，派单前检查现存公开 worktree。若发现路径/结果被回收，停止，不伪造恢复。

最终门禁见 ACCEPTANCE.md。未获人工验收不得最终 PASS；不进入下一 Batch。所有产品/UX/schema/重大架构决策使用五字段卡交回网页版。
