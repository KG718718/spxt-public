# Batch 4.5 Hosted 止损决策｜2026-09-27

**BLOCKED — HOSTED BUDGET EXHAUSTED**。现有方案A继续有效；需要决定的是工程续行与诊断预算，尚无证据要求改产品、可信来源或安全策略。

## 已确认事实

- 最后专项：[Run36288039798](https://github.com/KG718718/spxt-public/actions/runs/36288039798)，job108532480363，attempt1，受测4f52e8759d8ddd20b2a9883fd267a98ced27fba1，setup-v3.yml / lan-diagnostic，FAIL。
- 固定阶段PORTABLE；tools/windows-firewall/build.ps1内部Go测试先于helper编译失败。有效夹具TestInstallIdentityAndTampering被HELPER_PATH_INVALID拒绝；TestBoundConfigMustMatchRequest被INSTANCE_BINDING_INVALID拒绝；TestRegistrationAndINIContracts/exact_registry_and_UTF16_INI_accepted被REGISTRATION_INVALID拒绝。
- 来源checkout及原F3下载/精确ZIP与EXE身份步骤PASS。日志中Runtime构建摘要PASS、20生产依赖、1044文件；这不是完整Runtime/Portable/Setup验证通过。后续Launcher、实际升级U22/U23、真实Registry/Firewall及26/742均未到达。
- Artifact10920906716只有lan-evidence/beta3-ci-stage.json，304字节，SHA256 f2f304399b124fcc0d0c62c8dc3a53945b84a7681f488bbfc77df2f616c576d4。Master内存读取，严格单文件/schema/受测source/FAIL/PORTABLE/DIAGNOSTIC和摘要隐私检查通过；未下载本地发行包。
- 证据固化evidence/diagnostic-run-36288039798.json。原失败日志和前三次历史均保留；本次失败不覆盖专项3的F3精确五锚取证PASS，也不能以取证PASS代替升级PASS。

## 推测与证据缺口

只读源码显示测试夹具使用t.TempDir，ci-lan.ps1及Firewall build.ps1未显式规范测试TEMP/TMP。Master先前在规范路径下局部测试通过，支持“测试路径表示与生产路径拒绝策略不一致”这一候选原因。Hosted实际TEMP、最终解析路径及具体拒绝分支没有记录，不能认定短名、reparse或任一单一因素为根因。止损后没有运行新反例、修复或Hosted。

前两次取证失败和本次构建夹具失败均揭示Hosted环境适配不足；若续行，必须先在本地用实际构建入口验证环境契约及安全反例，不能只重复包内单元测试。即使关闭这一失败，尚未到达的Setup、Registry、Firewall阶段仍可能暴露新问题，不承诺追加次数内必然通过。

## 预算账本

|类别|使用|结果|
|---|---|---|
|专项1|Run36280286553|FAIL / STATIC_GATE|
|专项2|Run36280914931|FAIL / CLEANUP_VERIFY|
|专项3|Run36281720897|PASS / F3身份取证|
|专项4|Run36288039798|FAIL / PORTABLE|
|Full|0/2|未运行|
|QA Hosted|0/2|未运行|

专项4/4耗尽；不得挪Full/QA预算绕过诊断止损。原T1—T5和QA线程/工作树保持冻结，不新建重复任务、不清理现场。唯一Master及原分支不变。

## 供网页版决定的方案

**A：有界工程续行（建议）**。明确授权原T5主责CI、必要时原T4协作，先补不含真实路径的固定分类诊断，以合成路径/短名/别名/异常TEMP等本地反例确认原因；只修构建/测试环境契约，不放宽生产路径、身份、binding或Firewall校验，不删测试或接受skip。Master Review后新增最小专项最多2次，每次代码或诊断有效修改后才可运行；通过专项再使用原Full最多2次、QA Hosted最多2次，额度不增加。新增专项耗尽即再次停止。真实Win10/第二设备仍人工门禁。

**B：保持停止**。不追加预算、不实施返工，保留当前公开提交、证据和原任务现场，等待后续决定。

A只是建议，尚未获得授权，不作为现有自主授权的一部分。两方案均保持唯一可信F3 beta.2→beta.3；appVersion1.0.0、DC1、Runtime identity schema、业务schema、AppId和instance结构不变，beta.1历史路径不改。不得main/tag/Release/Batch5/OCR，最终目标仍为AUTOMATION PASS / QA PASS / LAN HUMAN PENDING，当前未达到。
