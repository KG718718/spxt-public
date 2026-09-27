# Batch 4.5 Orchestration

方案A已批准，IN PROGRESS。唯一Master/回单01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久只读。集成codex/lan-host-v1.1；Primary public-source。

|Task|Thread|worktree/branch|状态|依赖|
|---|---|---|---|---|
|B45-T5-PREFLIGHT|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5-preflight|已整合7bfbfd3；c06dcfe历史冻结|方案A已解除原阻塞|
|B45-T5-IDENTITY|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5|PASS / 固化0897383|专项3取证PASS|
|B45-T1|01a0e002-cbb8-77f1-bf0b-505a7a327007|f8bd/codex/b45-t1|INTEGRATED 9b23ba6 / 冻结a698f94|Master15/15；T2接线|
|B45-T2|01a0e01c-ad06-7413-8572-bf1dbf2fbd11|lan-server/codex/b45-t2|INTEGRATED 4b83380 / 冻结30a1351|Master13/13 PASS|
|B45-T3|01a0e035-3eca-7993-9db1-795373d92537|lan-launcher/codex/b45-t3|DISPATCHED @4b83380|T1/T2/T4均整合|
|B45-T4|01a0e004-98a3-75b2-a2a1-3ffd0c6506c9|lan-firewall/codex/b45-t4|INTEGRATED 4150409 / 冻结4f0c5c8|Master12+17、vet PASS|
|B45-T5-INTEGRATION|同T5|b4-qa/codex/b45-t5-integration|DISPATCHED @0897383|精确F3已取证；T3并行独占Launcher|
|B45-QA|01a0e03a-15c9-7833-af1c-c05a8eca2126|lan-qa/codex/b45-qa|EARLY SECURITY AUDIT @5825690|仅审已整合T1/T2/T4；最终QA待候选|

预算：专项3/4、Full0/2、QA0/2。身份取证计专项；不得运行无关Full。每次run前登记精确source/mode/budget，后记录result/Artifact，无修改不retry。

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
