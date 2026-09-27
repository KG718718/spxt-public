# Batch 4.5 Orchestration

## 当前最终停点：受控Win10 proof P02失败｜2026-09-27

**BLOCKED — CONTROLLED WINDOWS PRODUCTION DISCOVERY FAILED**。原T5主动BLOCKED回单，阶段A工具26d44ab、证据/RESULT c39cdaa，Master独立核验固定JSON、Git身份、生产网络blob三方相同，整合5b5de75/13caac8。实际Win10 build19045上P01=true；首次`runWindowsDiscovery()`固定`NETWORK_DISCOVERY_FAILED`，P02=false；P03—P08及实际private候选未测。依新版批准第4节停止，原T5再次冻结，T1—T4/QA维持冻结；无阶段B/Hosted/Final Full/QA。本轮Final Full0/1、QA Hosted0/1，QA2未授权；H1/H2历史2/2且无H3/H4。详见`CONTROLLED-WINDOWS-PROOF-STOP-20260927.md`与`evidence/controlled-windows-proof.json`。以下受控阶段和H2止损均为历史记录。


## 当前受控Windows证明阶段｜2026-09-27

网页版正式批准 `FINAL-COST-CONTROLLED-VALIDATION-APPROVAL.md`：禁止H3/H4或等价Hosted网络发现专项；H1/H2 2/2历史FAIL不撤销。仅恢复原T5 thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`/原b4-qa worktree/`codex/b45-t5-integration`，先执行阶段A真实Win10只读生产discovery proof，任务卡 `tasks/B45-T5-CONTROLLED-WINDOWS-PROOF.md`，准确回单Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；T1—T4/QA冻结。本机OS只读核实Windows10 Pro x64 build19045。proof PASS与Master安全Review之前不得改Hosted策略、不得Final Full。若本机`NETWORK_DISCOVERY_FAILED`立即停止。后续仅Final Full0/1、QA Hosted最多1次（QA2不预授权）；8.3环境能力按新决定另记，核心26/742零skip不变。生产网络/Server/Firewall/升级/业务边界不变。下方H2预算止损是历史证据，本次有限续行不增加H预算。


## 当前最终停点：H2预算止损｜2026-09-27

**BLOCKED — HOSTED_LAN DIAGNOSTIC BUDGET EXHAUSTED**。H2 Run36301876304@80ee1a88275a0ef631cef17d68ace8a69ceaacfa / job108570884334 / Artifact10925513024 FAIL，固定 `PRODUCTION_DISCOVERY_REJECT/DISCOVERY_COMMAND_FAILED`；JSON受测SHA/allowlist/privacy/哈希核验PASS。H1+H2专项2/2已耗尽，新增Full0/1和原QA0/2不得挪用；未到runner地址/双bind，未有最终beta.3 Setup Artifact/QA PASS。T5已收到STOP、冻结原thread/worktree/local b8e3440；T1—T4/QA维持冻结。详见 `HOSTED-STOPLOSS-H2-20260927.md` 与 `evidence/h2-run-36301876304.json`。下文H1/H2准入与运行文字为历史。


## 当前唯一活动工程续行：HOSTED_LAN｜2026-09-27

### H1准入 Review 与预登记

H2准入Review：原T5 H1返工主动RETURNED实现1f18017、报告b8e3440，Master核验旧失败确实混合发现抛错与结构错误；仅测试harness将四个既有生产固定错误码分别映射闭合reason，非法shape独立，未知异常INTERNAL，未读取/输出异常正文或环境信息。Master独立重跑LAN62/62、兼容事务45/45 fail0skip0，diff仅Hosted gate/测试/RESULT；整合3de2715、42a6c54。H1仍FAIL，实际固定生产code未知，生产发现规则不能在无证据下修改。H2作为最后一次专项，仅用于验证此最小诊断返工后的真实结果；预算目前H1已用1/2、H2待运行、新Full0/1、QA0/2。H2 FAIL即按批准停止，不挪Full/QA。

H2已dispatch：Run `36301876304` / source `80ee1a88275a0ef631cef17d68ace8a69ceaacfa` / attempt1 / mode `lan-hosted-diagnostic`。dispatch前local/origin/GitHub remote HEAD三者一致；H专项正式2/2，新Full0/1、QA0/2。结果PENDING；不得预判PASS或额外retry。


H1结果FAIL：Run36301442048@f026131 / job108569698585 / Artifact10925263790（459bytes，ZIP SHA256 16efa711232189daff8c2990259d0bb26410aa8bac43a992c0ac189020d7369d）。Master内存解包，严格单JSON allowlist/schema/source/privacy PASS；固定阶段 `PRODUCTION_DISCOVERY_REJECT/PRODUCTION_DISCOVERY_INVALID`，候选与端口计数均0，双bind未达。此码仍合并“发现抛错/结果结构无效”，实际根因UNKNOWN。原T5同线程返工：本地反例、更深封闭分类及最小安全修复，Master Review后才可H2。预算H1/2已用1次、H2剩1次、新Full0/1、QA0/2；禁止无修改retry。证据 `evidence/h1-run-36301442048.json`。


H1已dispatch：setup-v3.yml / mode `lan-hosted-diagnostic` / Run `36301442048` / 精确source `f026131e9d397e6910ad41f84fa238af49d409a4` / attempt1。dispatch前local、origin tracking、GitHub API remote三者HEAD一致，且GitHub远端workflow该ref可见手动入口。H专项正式使用1/2，新增Full0/1、QA0/2；结果PENDING，不能预判PASS或失败原因，原T5冻结待证。


原T5主动RETURNED：实现526f215、报告b81d93d；Master发现exact-source缺口退回原线程，返工4a5c7aa、报告6580002主动RETURNED。Master独立Review确认只改手动CI入口、Hosted测试门禁/专项反例、最终Artifact测试verifier及任务RESULT，生产网络/Server/Firewall/升级/身份零改；复验LAN含专项56/56、兼容事务45/45 fail0skip0，Node syntax及diff check PASS。四提交按序整合为b024df8、8fd929a、76b1bd7、bd26672，四个代码文件blob与T5冻结HEAD精确一致。T5状态 `INTEGRATED`，原工作树保留。当前H0/2、新Full0/1、QA0/2；H1仅可用已注册setup-v3.yml手动 `lan-hosted-diagnostic` / LAN分支，精确受测source为本次预登记最终治理HEAD，待push与三方HEAD一致后dispatch，随后回填Run/Artifact。H1不等于真实企业LAN验收；H1失败按固定stage/reason返原T5本地反例与最小修复，禁止无修改retry。


网页版方案A批准；历史Full2 Run36294405341@ac2b47de85aaac9545cf6f2a534603d7071ed5db FAIL于HOSTED_LAN，只有通用码，真实原因未知。原T5 thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`、原b4-qa工作树/本地分支、冻结HEAD `8e99b4d9895c05fe6454d3bb20b32378c7516685`恢复为 `DISPATCHED`，准确回单Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；返工卡 `tasks/B45-T5-HOSTED-LAN-DIAGNOSTIC.md`。T1—T4和QA原线程仍冻结。当前额外预算：HOSTED_LAN H0/2；H PASS后新增Full0/1；原QA Hosted0/2。历史专项4/4、D5 1/2、原Full2/2不可挪用。H1之前原T5 14项本地反例→Master Review；H1 PASS跳H2，H1 FAIL且唯一定位后修复Review再H2；H2 FAIL或新增Full FAIL立即止损。8.3旧回归110PASS/1SKIP独立待证，不混入LAN根因。未有beta.3最终Artifact，未到QA PASS或LAN HUMAN PENDING。完整新授权见 `HOSTED-LAN-CONTINUATION-APPROVAL.md`；下方旧阻塞及预算均为历史。


方案A保持批准；当前BLOCKED — HOSTED BUDGET EXHAUSTED。唯一Master/回单01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久只读。集成codex/lan-host-v1.1；Primary public-source。

|Task|Thread|worktree/branch|状态|依赖|
|---|---|---|---|---|
|B45-T5-PREFLIGHT|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5-preflight|已整合7bfbfd3；c06dcfe历史冻结|方案A已解除原阻塞|
|B45-T5-IDENTITY|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5|PASS / 固化0897383|专项3取证PASS|
|B45-T1|01a0e002-cbb8-77f1-bf0b-505a7a327007|f8bd/codex/b45-t1|INTEGRATED 864e8f5 / 冻结ca454f1|Master18/18；QA复验中|
|B45-T2|01a0e01c-ad06-7413-8572-bf1dbf2fbd11|lan-server/codex/b45-t2|INTEGRATED 4b83380 / 冻结30a1351|Master13/13 PASS|
|B45-T3|01a0e035-3eca-7993-9db1-795373d92537|lan-launcher/codex/b45-t3|INTEGRATED a226ed1 / 冻结6a2cae6|stale地址QA闭合；stop有界重试2/2+vet PASS|
|B45-T4|01a0e004-98a3-75b2-a2a1-3ffd0c6506c9|lan-firewall/codex/b45-t4|INTEGRATED b0e51b5 / 冻结aea2474|Master13+29、vet PASS；QA复验中|
|B45-T5-INTEGRATION|同T5|b4-qa/codex/b45-t5-integration|INTEGRATED 至1ec4678 / 冻结17aba5d|Master44/44、四文件overlay Go27/27+vet；真实Setup/Registry待Hosted|
|B45-QA|01a0e03a-15c9-7833-af1c-c05a8eca2126|lan-qa/阶段分支历史保留|T1/T4/T3缺陷复验PASS；T5设计及本地复验PASS|T3报告137e526、T5报告d485b36；真实Hosted与最终QA未完成|

预算：专项4/4、Full0/2、QA0/2。专项4失败，停止续行；身份取证计专项，不得运行无关Full。每次run前登记精确source/mode/budget，后记录result/Artifact，无修改不retry。

Execution local commit→主动send_message_to_thread准确Master；Master wait/read/RESULT/worktree/commit兜底，失败恢复记DELIVERY_RECOVERED。Review后才整合。旧预检主动回单已收、独立21/40/41反例与双server无listen检查通过；仅预检，不代替产品验证。

## 专项1预登记

T5主动RETURNED a5c974649627e5267cf616f757ad78ae5e648834；Master独立9/9+PS进程/AST PASS、旧workflow条件不变，Review整合a5466ef29cd1675444d9e299bb3ffda92039e833。下一次仅dispatch setup-v3.yml / codex/lan-host-v1.1 / mode=lan-identity，专项预算预留1/4；Full0/2、QA0/2。受测为包含本登记的精确HEAD（产品与a5466ef相同），dispatch后回填run/source；不因治理[skip ci]触发Full。T5代码冻结等待结果。

专项1已dispatch：Run36280286553 / source bb497a8f7ddbbd9e581db25b3f7c503270a9279f / mode=lan-identity，预算正式使用1/4，Full0/2、QA0/2；结果PENDING，禁止提前声称取证PASS。

专项1结果FAIL：Run36280286553/job108510690830，固定STATIC_GATE/BLOCKED_STATIC_GATE；Node9/9 PASS，PS process test的TEMP_PATH_UNSAFE停止，实际安装未运行。Artifact10918207525，ZIP SHA25621b1c2d82eaa974d96d5a6fb0d105c86394957711d957f1831a59fcaa97c2964，仅安全report，Master内存解包/严格schema/来源核验PASS。其他5job skipped。T5同线程R1最小修复测试临时路径假设，必须本地反例和Review后才专项2，尚未重试。预算正式专项1/4、Full0/2、QA0/2。

T1主动回单实现24a9095+报告56e6512+路径返工a698f94已Review整合def05c5/ec0800d/9b23ba6；Master独立15/15 PASS。T1冻结，T2仅自己的server/bootstrap入口接线；所有原业务权限/契约保持。

## 专项2预登记与R1 Review

T5主动返回deaa09742067081ad941a1c0b48e4f394a3eeb9b，Master Review只改测试临时目录选择与报告，不改生产取证/安全白名单/历史语义。整合be83e8ed1b6886790942f67a545e35c5c4894916；Master独立以合成短名TEMP且空RUNNER_TEMP运行pwsh7和WindowsPS5实际子进程测试均PASS，Node9/9 fail0 skip0。专项1实际TEMP字符没有记录，不把短名推测写成事实。

下一次仅setup-v3.yml / mode=lan-identity / codex/lan-host-v1.1，预留专项第2次；受测为包含本登记的精确HEAD，dispatch后回填run/source。预算此前1/4，dispatch后2/4；Full0/2、QA0/2。无修改重试禁令遵守。

T4主动返回3ab36ca；Master发现enable后查询异常绕过禁用，退回原线程R1修复，并要求执行实际嵌入PS脚本的隔离mock反例；未知规则/status不允许写。尚未整合，不能声称真实Firewall/UAC PASS。T2接口已Review接受，继续双监听实现。
专项2已dispatch：Run36280914931 / source a55395d7e06430be186705f09bf688ea89c75c20 / mode=lan-identity。专项2/4、Full0/2、QA0/2；静态9/9及PS gate通过，安装取证进行中，不预判PASS。

专项2结果FAIL：job108512416383，固定CLEANUP_VERIFY/BLOCKED_CLEANUP_VERIFY；Artifact10918108433仅report，ZIP SHA256 db40c63678b6219eb49bb6614fb80c2c528f10413eba097dca080a152b69a174。Master内存解包/schema/来源核验PASS；无成功identity evidence。原T5 R2继续本地反例/细化清理阶段，未预留或dispatch专项3。预算2/4、0/2、0/2。

## 专项3预登记

T5主动返回R2 4b08d354358d923d34ffb0e64af046e00f3154c3，Master审查确认仅修复cleanup StrictMode数组计数并细化闭合阶段，所有身份/清理PASS条件不变；整合e1d91a742023450e840ad58352220e7e37367b27。Master独立pwsh7/WinPS5进程、异步卸载、0/1/多项、保留反例PASS，Node9/9 fail0 skip0。旧historical71/71为Execution本轮报告，无历史语义改写。

下次仅setup-v3.yml / mode=lan-identity / codex/lan-host-v1.1，预留专项3；受测为包含本登记的精确HEAD，dispatch后回填。当前已用2/4，dispatch后3/4；Full0/2、QA0/2。不重建F3，不运行无关Full。

T4初版3ab36ca+R1 4f0c5c8经Review整合eb01df0+4150409；真实嵌入脚本隔离mock补齐、32view及INI binding/路径相等修复。Master独立Go复验进行中，真实Firewall/UAC未运行；T4暂冻结。此代码未被lan-identity运行，不代称该专项验证Firewall。
专项3 PASS：Run36281720897 / tested b23eb269ecd0509e6dfde6f6bfb111d6d356ada2 / Artifact10919206400，ZIP SHA256 7a00fcc150f16a8ad5cc2d6856c5488a0fa9a754941f2da3a5f43b3b141ec4c0。Master只在内存解包安全JSON，严格两文件allowlist/schema/来源/FINALIZE/CAPTURED及五锚/cleanup全真核验PASS，证据固化evidence/accepted-f3-beta2-identity.json与identity-run-36281720897.json。来源仍原F3，非fresh rebuild；生产可信bundle由原T5下阶段基于此固定证据实现，运行时不下载Artifact。预算专项3/4、Full0/2、QA0/2。

T2正式Review整合c00e58a+4b83380，Master13/13 fail0skip0。T4 Master12顶层+17子反例/go vet PASS；首轮Master未规范TEMP导致路径反例失败，修正独立测试环境规范路径后重跑通过，生产代码未因此改动。真实private NIC/Firewall/UAC仍未运行。

B45-T3 DISPATCHED：thread01a0e035-3eca-7993-9db1-795373d92537，managed lan-launcher/public-source，branch codex/b45-t3，精确baseline4b83380c5a6ebe6090af69415c9191c18779c4d1；模型gpt-5.6-sol/medium。完整任务卡tasks/B45-T3.md。只改Launcher及授权局部CLI，T1/T2/T4共享模块冻结待原线程返工。唯一回单Master不变。
T5-INTEGRATION原线程/原worktree继续，保留旧codex/b45-t5@4b08d35，按0897383建立阶段branch codex/b45-t5-integration；精确任务卡tasks/B45-T5-INTEGRATION.md。T3独占Launcher/build.ps1，T5独占Runtime/Portable/Setup/CI，共享构建接口经Master协调。

独立B45-QA早期安全审查已派：thread01a0e03a-15c9-7833-af1c-c05a8eca2126，model gpt-5.6-sol/medium，专属lan-qa工作树/branch，baseline582569083fe9773ddd11115ba9ba698f7f2c8d29。禁止生产修改和Hosted，只回可复现缺陷及文档，整体QA不得提前PASS。T3构建接口已确认并转T5：可选FirewallHelperSha256严格64lowercasehex，beta3必传真实helperhash；历史Local为空保持闭合。

早期QA回单305344e已Review整合704a9bd，结论FAIL保留。T1 R2/R3 ff1f6fd/ca454f1整合aeac5fe/864e8f5；T4 R2/R3 ba399b8/aea2474整合48934de/b0e51b5。Master独立Node18/18、Go13顶层29子用例及vet PASS。同一QA线程/工作树保存旧分支，阶段分支codex/b45-qa-r1精确baseline b0e51b54744c944ce68a5730d9b8d279b72db9a0继续原缺陷corpus/mock复验；无新Hosted，无真实NIC/firewall/registry操作。

## 专项4预登记：最后集成诊断

原T5正式返回最终代码ae92ed6b660dea514f35725e7ecd0a64d8a2ff92与报告17aba5da455838d7a20e75e4160f597d291200a0，经Review整合50ad515/1ec4678。Master在统一树实际生成四文件版本化Go overlay、固定Go1.27.1精确Launcher27/27 fail0skip0及overlay vet PASS；此前兼容wrapper44/44及T4/Node证据保留。原beta.1历史源码未重写，appVersion/DC1/Runtime schema/业务schema不变。

下一次仅已注册setup-v3.yml / codex/lan-host-v1.1 / mode=lan-diagnostic，调用本分支LAN reusable workflow。只构建candidate、fault-payload-hash、fault-post-copy，验证目标Runtime/Launcher/Portable、实际U22拒绝/U23回滚/受验F3成功升级以及受控Hosted网络与NetSecurity API。真实物理LAN/第二设备仍人工门禁；不因runner合成adapter替代而宣称真实LAN PASS。

当前已用专项3/4，预留最后第4次；Full0/2、QA0/2。受测为含本预登记的精确公开HEAD，dispatch后记录run/source。失败先保留证据，不无修改retry、不挪Full/QA预算绕过专项止损。成功后才按批准范围继续Full与最终QA。T3/T5当前冻结等待实际诊断；尚未宣称本Batch自动化PASS。

专项4已dispatch：Run36288039798 / job108532480363 / source 4f52e8759d8ddd20b2a9883fd267a98ced27fba1 / setup-v3.yml / mode=lan-diagnostic / attempt1。API确认远端与本地受测HEAD一致，原F3 Artifact10907910968 expired=false、大小32538249及原Run/source匹配。预算正式专项4/4、Full0/2、QA0/2；当前IN PROGRESS，结果及Artifact待回填，不预判PASS。

专项4结果FAIL：Run36288039798/job108532480363，固定PORTABLE。Firewall build.ps1的Go测试在三个有效夹具失败（HELPER_PATH_INVALID / INSTANCE_BINDING_INVALID / REGISTRATION_INVALID），尚未编译helper或进行Launcher/Setup/真实升级。Artifact10920906716仅lan-evidence/beta3-ci-stage.json，304bytes，ZIP SHA256 f2f304399b124fcc0d0c62c8dc3a53945b84a7681f488bbfc77df2f616c576d4，Master内存解包、唯一文件、封闭schema/source/status/mode/stage及privacy PASS。专项4/4、Full0/2、QA0/2；全体原线程/工作树冻结，T5/T3/QA已发停止通知，T1/T2/T4此前已冻结。只做证据与治理收尾，无生产返工、无额外测试/Hosted。等待网页版明确有界续行决定。

## Diagnostic Extension：D5/D6授权

用户明确批准19节续行决定，原专项4/4历史保留；新增D5/D6合计0/2，Full0/2、QA0/2。当前BLOCKED历史结论不改为PASS，但原T5按tasks/B45-T5-DIAGNOSTIC-EXTENSION.md恢复本地定位/测试环境/白名单诊断，其他任务冻结待需要。T5 thread01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9，原b4-qa/public-source，原codex/b45-t5-integration，baseline17aba5da455838d7a20e75e4160f597d291200a0；Master核验其tools/.github/核心LAN代码与公开0e9543479bce2e41eae75d15b6e332179e1d0101无差异。准确return target01a0db0e-c950-79e0-8e11-07155e0742f2。状态DISPATCHED；尚未Hosted。规则以DIAGNOSTIC-EXTENSION-APPROVAL.md为准，先原入口本地反例/Go全测/vet/diff/privacy/生产契约逐字节Review，再决定D5。

T5定位计划主动已收，状态RUNNING。Master接受仅_test.go fixture协作需求，明确由原T5直接改policy_test.go和必要firewall_behavior_windows_test.go测试根/反例，生产5文件冻结；不启新T4任务，不创建重复worktree。D5/D6仍0/2，未确认根因。

原T5实现3459a5987f8aa77c5c26fc0efbbc04d45ba17950冻结供Review；Master独立环境13及兼容45PASS，但真实build/driver在不同owned测试根FAIL。状态REWORK，尚未整合该实现/运行D5。原线程复现最小修复，特别区分事件记录环境与生产Firewall拒绝，不改安全策略。新增D0/2、Full0/2、QA0/2。

## D5最终本地Review与预登记

原T5主动RETURNED并冻结b67cbb6e4bb2ddadd92ddf6ee12885198979ed19。Master取得准确回单后独立复验：环境13/13、driver反例5/5、实际build入口Go13顶层fail0skip0/package PASS/真实compile PASS、固定Go1.27.1 vet PASS、兼容wrapper45/45 fail0skip0、diff/privacy PASS。五个Firewall生产源文件/go.mod与原baseline逐字节不变；原路径/Registry/binding/CLI白名单及原拒绝语义未放宽。11类对照完整，实际8.3本机UNAVAILABLE如实保留。原3459失败和原Hosted未知路径事实不改写。安全证据evidence/d5-master-review-b67c.json。

状态RETURNED→REVIEWED→INTEGRATED；正式90cdc0f/7e5e7f8/b67cbb6分别整合45dfc76/3187c41/f8f9340。原T5冻结等待Hosted，其他线程仍冻结。下一次只dispatch已注册setup-v3.yml / codex/lan-host-v1.1 / mode=lan-diagnostic-extension，预留Diagnostic Extension D5第1/2次；受测为包含本登记的精确HEAD，dispatch后记录run/source。D5真实构建仅TEST_BUILD_ONLY，不生成发行Artifact；上传仅四个固定JSON，不上传raw日志/路径/程序。当前历史专项4/4、新D0/2、Full0/2、QA0/2；D5结果未出，不预判当前阻塞或全Batch通过。

D5已dispatch：Run36292597156 / source98b030d1fa5c2ca091ac266069ea9d624d3177a5 / setup-v3.yml / mode=lan-diagnostic-extension / attempt1。dispatch前local/origin/API远端三者精确一致；Diagnostic Extension正式使用1/2，历史专项4/4、Full0/2、QA0/2。当前PENDING，原T5冻结，不预判通过。

## D5 PASS / Full1准入与预登记

Run36292597156 / source98b030d1fa5c2ca091ac266069ea9d624d3177a5 / Artifact10922139870（1180bytes），SHA25660dd6656612fa510b35f769124f27a221fb0d817270278e6da8e0aa5043faa99。Master内存解包，四个精确JSON文件/schema/封闭字段/来源/计数及privacy核验PASS。Hosted原始TEMP/TMP为NONCANONICAL、GOTMPDIR为NONLOCAL，owned physical测试根下environment13/driver5/Go13 fail0skip0/package PASS/真实compile PASS。仅TEST_BUILD_ONLY；历史Run的精确路径仍未知，不倒推旧Run唯一根因。证据evidence/d5-run-36292597156.json。

Master确认当前Firewall fixture/build阻塞已越过。T1—T5已整合，局部QA缺陷已关闭，D5修改仅测试环境/诊断，生产五文件冻结；完整candidate的真实Runtime→helper→Launcher构建身份链、固定F3五锚/离线升级、既有U30与C15及全26/742门禁未削弱。F3 Artifact10907910968 API仍expired=false且原Run/source/大小一致；只在Hosted下载原包，不fresh rebuild。满足Full1工程准入，不等于候选PASS。

下一次仅setup-v3.yml / codex/lan-host-v1.1 / mode=lan-full，预留Full第1/2次，精确受测为包含本登记的公开HEAD，dispatch后回填。历史专项4/4、Diagnostic Extension1/2（D6未用）、Full当前0/2、QA0/2。Full1若有此前未到达的纯工程失败，按批准第12节本地反例→最小修复→Review后再Full2，不借预算；若失败性质不在授权内或需额外诊断而无相应额度则停止决策。仅FullPASS后启动原独立QA最终阶段。未运行真实Win10物理LAN/第二设备，不提前标LAN HUMAN PENDING。

Full1已dispatch：Run36292822541 / sourcef139a429b56aab53b84727fad58838619e40f4ee / setup-v3.yml / mode=lan-full / attempt1。local/origin/API远端精确一致后启动，Full正式使用1/2；历史专项4/4、扩展D1/2、QA0/2。结果PENDING，不预判真实Setup或最终候选通过。

## Full1 FAIL / 原T5有界返工

Run36292822541 / sourcef139a429b56aab53b84727fad58838619e40f4ee / Artifact10922344270，296bytes，SHA25631c53b74b3b6ff76784578ed41e7dfef8ec495421535ff2797614b03d37bcbcc。Master内存解包唯一stage.json、闭合schema/source/FULL/FAIL/PORTABLE与privacy PASS。Firewall测试及compile、Launcher测试及build已越过；后续原LAN Node37项31PASS/6FAIL/skip0，六个config fixture为LAN_CONFIG_PATH_INVALID；尚未Setup/U22/U23/Registry/Firewall/最终回归。此为此前未到达的后续L/config门禁工程失败，不撤销D5结论。

Master在同一f139a42原37名单、本地Node24.14.0独立对照：规范physical TEMP/TMP为37/37 PASS；指向同一自有合成根的junction为31PASS6FAIL，六个失败名称与Hosted一致，仍固定LAN_CONFIG_PATH_INVALID。原业务合成字节/夹具保护测试未改，生产safeInstance拒绝符合契约。Hosted具体映射值仍未知，不写成唯一根因。证据evidence/full1-master-config-counterexample.json。初次只选五文件31项对照亦精确复现，随后补齐Launcher6项得到实际37，未隐藏初测范围。

按用户批准第12节，B45-T5原thread01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9/原b4-qa/codex/b45-t5-integration从冻结b67cbb6继续REWORK，完整卡tasks/B45-T5-FULL1-REWORK.md，准确return target01a0db0e-c950-79e0-8e11-07155e0742f2。本地baseline的tools/.github/生产config与受测f139a42无diff。只处理测试环境/CI接线，生产路径及安全契约冻结，禁止直接Hosted或amend已返回SHA。先本地对照→最小修复→Master Review，证据充分才Full2；否则止损。当前历史专项4/4、扩展D1/2、Full1/2、QA0/2；未使用D6或Full2，最终QA仍冻结。
## Full2最终预登记 / Full1返工Review PASS

原T5主动RETURNED冻结8e99b4d9895c05fe6454d3bb20b32378c7516685，实现cf4848a173535d746344d89be69d0c0ef3f8d04f；Master核对thread/worktree/两个local commit和完整回单。独立复验environment7checks、原37名单physical37PASS/junction31PASS6预期拒绝/skip0；兼容wrapper45/45 fail0skip0；额外实际注入Launcher环境变更后throw，finally完整恢复及candidate外层恢复均PASS。4脚本AST、13个workflow内嵌PS块、YAML小diff人工结构、diff/privacy PASS；未安装或宣称第三方YAML parser。生产JS、原config断言、Firewall五文件、Launcher build逻辑与冻结基线逐字节一致。证据evidence/full1-master-review-8e99.json。

状态RETURNED→REVIEWED→INTEGRATED；cf4848a/8e99b4d分别整合7ec9be74e1353c871c12f73a635d55871128e030/a9545783b4051f2e8358fc438efa072fa7237a94。修复只隔离并恢复ci-lan/ci-beta3及回归测试环境，增加封闭诊断和必需PASS计数，不改变产品接受条件；原T5冻结，其他原线程/工作树保持。

依批准第12—13节，当前新问题已能本地安全定位和复现，无须增加专项Hosted。下一次仅setup-v3.yml / codex/lan-host-v1.1 / mode=lan-full，预留最后Full第2/2次；精确受测为包含本登记的公开HEAD，dispatch后回填run/source。当前历史专项4/4、D1/2、Full1/2、QA0/2，D6未用。Full2仍失败必须停止交网页版，不挪D6/QA续调；FullPASS后才原独立QA最终阶段。当前尚无最终beta3 Artifact或LAN HUMAN PENDING结论。

Full2已dispatch：Run36294405341 / sourceac2b47de85aaac9545cf6f2a534603d7071ed5db / setup-v3.yml / mode=lan-full / attempt1。local/origin/API远端精确一致后启动，Full正式2/2；历史专项4/4、Diagnostic Extension1/2、QA0/2。当前PENDING；失败即停止，未授权第三次Full，不能挪用D6或QA。

## Full2 FAIL / 最终停止

Run36294405341@ac2b47de85aaac9545cf6f2a534603d7071ed5db / Artifact10923547080（1082bytes，SHA256e77aec5c2923c6c1dbc7bdbd541bf4745a0018c0c134c20891d92efd6c034092），固定HOSTED_LAN/FAIL/FULL；三JSON来源/allowlist/privacy PASS，环境恢复true，LAN37/37 PASS。公开日志确认Portable自动门禁和兼容45/45通过、7个Setup模式构建完成；尚未执行实际Setup生命周期或后续Firewall/26/742/最终QA。旧冻结回归110PASS/1SKIP，原8.3实际别名不可用，不伪称全PASS。通用HOSTED_LAN_GATE缺少细分原因，没有唯一根因；停止后不再反例/返工/Hosted，只读证据归档。

最终状态BLOCKED — FULL HOSTED BUDGET EXHAUSTED。预算历史4/4、D1/2、Full2/2、QA0/2；D6/QA不挪用。T5收到STOP并主动确认原worktree/local8e99b4d冻结，原T1—T4与QA保持既有冻结，未清理任何现场。决定与选择详见HOSTED-STOPLOSS-FULL2-20260927.md；原历史CHATGPT-HANDOFF保留，新卡full2-stoploss/CHATGPT-HANDOFF.md。唯一Master/Primary/集成分支不变，未main/tag/Release，不进入Batch5；等待新明确授权。
