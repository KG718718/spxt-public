# Batch 4.5 Orchestration

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