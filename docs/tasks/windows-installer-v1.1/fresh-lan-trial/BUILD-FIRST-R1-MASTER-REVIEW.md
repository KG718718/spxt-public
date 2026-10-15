# Build-First R1 — Master独立Review / Smoke准入

2026-10-15，结论：**REVIEW PASS / BUILD SMOKE ADMISSION**。仅本地工程与构建门禁通过，不是Hosted、Setup安装、Candidate或LAN通过。

## 来源与整合

原唯一FRESH-T2长期Thread主动正式RETURN，准确Master目标已核验。安全merge基线a02b76ff，实施401ea7f926be2c2123e6922fd5081ae0935bf30b、报告efaf1890c8f2b638ade74ed4c2b7d530c588dc2b；原bea7工作树tracked clean，仅.test-work保留。仅cherry-pick两笔自有提交，映射308a126953ea483ee8a370c6de90b55ab66e0124、acf7200639ce2a4a5607a0d9e5d851581efdd862；不重复整合a02merge及依赖。Master核验所有tools/.github/生产文件与受审源完全相同；Root额外仅治理。

## 已证缺口与范围

父重复Helper13与旧父Launcher28同类：子pwsh固定环境不会回传，旧父block实际native mock继承污染CGO/flags/toolchain。新Fresh payload固定windows/amd64、CGO0/local/offline、清空flags，snapshot/finally包含fixture/temp/cache/pinned Node并严格复核恢复；原13/28名单、成功谓词和strict Go report未削弱。C3 HELPER粗边界包含该重复组，但历史首因仍UNKNOWN。

Helper新增固定INPUT/ENV/原13/Fresh overlay/Fresh2/compile/identity及重复组阶段与白名单分类，只允许原固定测试名，无raw输出/路径/PID/env/网络正文；identity写完及环境退出后才完整PASS，Exit失败固定ENV_RESTORE_FAILED。CI未初始化script:taskFailed的成功路径缺口有纯PS反例并修复，不据此追认C3原因。旧单元反例将未发布任务SHA换为公开ca8302源，同原68880d6对应文件Git blob完全相同1e142cc1ac0e892daac81af61bf5912a0d555488，未改变期望。

只改构建/封装/报告/测试与独立workflow。生产Launcher/helper Go、Node业务/LAN生产、Setup/升级可信身份/事务/rollback、业务schema、原13/28和原workflow零改。用户授权的普通工程范围内，无需产品或安全例外。

## Master实际独立复验

固定Node24.21.0/EXE SHA验证后，在最终401ea冻结源码实际执行Fresh+R1 138/138、原beta4兼容20/20，总158/158 fail0skip0。覆盖原13/2等精确集、实际脚本九情形、旧父污染/新隔离恢复、早期未知Run/取消/attempt计数、Smoke不可冒充Candidate/外层失败不复活、同EXE QA实际原identity块及原七文件ZIP提取分支。另独立CJS15语法、YAML uniqueKeys/单分支单trigger/只读权限/固定Actions SHA/45与35分钟检查PASS；PS文件及内联共9项parse通过。原安装态Go overlay test-c/vet已核验PASS（没有执行安装测试），生产Go零diff；真正Helper与Launcher编译见下一段。

实际401ea完整build-payload以真实固定NodeDir/GoRoot、精确Git Runtime工具字节、owned新输出、污染父环境执行：exit0，原Helper13及重复13、Fresh2、原Launcher28及重复28、Fresh2、Node44全部fail0skip0，package.finish/verify成功。Master再调用原package-lan.verify独立读取实际全部文件，核对报告与真实身份相同：1049文件/147923786字节/20依赖；manifest2532f4832d0240110e0a890869f30f9fba0cad82a89e177da7d4e765a1839b02，Helper6b15c9cc951634607c40bd908d5e7517360b89578fad39a467903cca38909bae，Launcher19fdb38e88b57fb7ea064a5d2cb479beb80125d344d45805f4ceea7cd14f55f7。实际PE/长度/hash/源码/三方profile链和Fresh两组严格报告通过，父污染环境与外层恢复true。原fixed摘要副本见evidence/build-first-r1-local-*.json；私有raw日志不上传。不是旧aaaa/两文件fixture。末尾PAYLOAD_REPORT/COMMAND_FAILED是预写进度，不替代exit0/真实报告；CI在真实Setup identity后另写COMPLETE/PASS。

## 新预算与安全准入

新workflow fresh-build-first-r1.yml、新trigger、独立R1S1/R1C1/R1C2/R1Q1及严格13键控制协议；同workflow任何实际早期/非法标题/取消/attempt均不能过滤掉重领。旧C1—C3 3/3 FAIL及其他冻结预算不动。Source/control/run/artifact/唯一parent/trigger-only diff、同源代码指纹、Smoke全cleanup均验证；代码指纹覆盖所有tracked执行树，仅排除纯docs/AGENTS/PROJECT。C1必须Smoke相同代码；C2必须安全失败/全cleanup和实际代码变化及重新Review；首CandidatePASS禁第二。QA下载同一Candidate EXE字节，独立QA Thread届时另登记。

Smoke只真实payload+Setup编译/identity/必要测试和恢复，不安装、不启动产品、不运行F01—F09/浏览器，只上传严格JSON，不上传客户EXE；外层失败/UNKNOWN不能PASS。共享ci/finalize默认路径保留，R1显式分支不放宽原Candidate完整成功条件。旧全部工作流触发分支/路径已核对不会因fresh代码或新trigger误触发。

当前Smoke0/1、Candidate0/2、QA0/1。三方HEAD核验后只准中央R1S1一次；FAIL立即STOP，PASS才按授权继续。真实ISCC本地NOT_RUN、安装/F01—F09/核心26-742/QA未通过；实际GUI/UAC/物理Private/授权/双设备/登录/第二Launcher仍待实体测试。无本机产品安装/EXE执行、系统网络/Firewall/Registry/Startup或内部SPXT操作，不main/tag/Release/清理未知文件。C3首因UNKNOWN与旧FAIL永久保留。
