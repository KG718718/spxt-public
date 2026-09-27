# Batch 4.5 Full2止损决策｜2026-09-27

**BLOCKED — FULL HOSTED BUDGET EXHAUSTED**。用户DIAGNOSTIC-EXTENSION-APPROVAL.md第13节明确“Full #2仍失败：停止并返回网页版”。本卡不是新增授权；停止后未执行新反例、修复或Hosted，仅读取公开证据和治理收尾。

## 已确认事实

- 唯一Master01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久RETIRED — READ ONLY HISTORY。Primary public-source，集成codex/lan-host-v1.1；原线程/工作树保留。
- D5 Run36292597156@98b030d1fa5c2ca091ac266069ea9d624d3177a5 / Artifact10922139870 PASS。真实Firewall build入口、环境13、driver5、Go13 fail0skip0及compile通过，生产五文件冻结。
- Full1 Run36292822541@f139a429b56aab53b84727fad58838619e40f4ee / Artifact10922344270 FAIL/PORTABLE，后续LAN Node37中6项配置路径拒绝。原T5受控物理测试环境及恢复修复，经Master原37/兼容45/异常恢复等独立Review，整合7ec9be7+a954578。历史失败保留。
- Full2 Run36294405341/job108550465763/attempt1，source ac2b47de85aaac9545cf6f2a534603d7071ed5db，source tree aaf78df3374fac48e9dac117faceee2c0dd80482，FAIL/HOSTED_LAN。Node24.21.0、Go1.27.1、Inno6.7.3。
- Full2安全Artifact10923547080，名称lan-host-failure-full-ac2b47de85aaac9545cf6f2a534603d7071ed5db-1，1082bytes，SHA256 e77aec5c2923c6c1dbc7bdbd541bf4745a0018c0c134c20891d92efd6c034092。Master内存解包三JSON，严格allowlist/schema/source/计数/固定字段/privacy PASS；不在开发机保存发行包。
- 本轮实际通过Portable整段自动门禁、LAN Node37/37 fail0skip0、兼容45/45 fail0skip0；candidate环境selectedRootClass=CANONICAL、environmentRestored=true。Setup候选及六个fault模式已编译，尚未实际安装/升级。
- 日志记录候选installedProgram1049files/147494318bytes；候选Setup33524169bytes、SHA25666a0d17cbdb0ee77774782e3ccffe35b95093e307aae5a3dafb698f7cc206786。仅Hosted临时构建事实，无最终候选Artifact，不提供这些临时构建作为验收下载。
- 冻结旧升级回归111tests/110PASS/0FAIL/1SKIP；跳过为“8.3 internal path alias is not treated as a volume-root alias”，原因usable 8.3 alias unavailable。原测试/证据语义未改，不能记零skip或整个旧回归完全PASS。
- 实际Setup/U22/U23/Registry恢复/NetSecurity、production sessions、本Batch26/742、最终Artifact privacy及独立最终QA均未到达。不是AUTOMATION PASS / QA PASS / LAN HUMAN PENDING。

## 技术约束与未知

tools/tests/lan-host/hosted-gate.cjs只在全部成功后写报告；统一catch仅输出HOSTED_LAN_GATE。当前证据不能区分：生产发现的严格拒绝检查、runner自有private IPv4候选数量、隔离dual-bind、controller健康、HTTP探测或清理失败。缺少阶段/封闭reason，不能唯一定位；没有证据支持放宽虚拟网卡、Public、0.0.0.0或真实LAN安全规则。不能用开发机真实网卡实验代替受控Hosted。8.3缺口同样未获豁免，不删除/改skip为PASS。

## 预算与冻结

历史专项4/4；扩展D5/D6已用1/2；Full已用2/2；QA Hosted0/2。D6剩额仅属于原Firewall问题，不转给新LAN门禁；QA不能调试Full。原T5主动确认冻结local8e99b4d9895c05fe6454d3bb20b32378c7516685，无新测试/修改/Hosted；T1—T4及QA维持既有冻结。没有清理worktree或未跟踪目录，没有main/tag/Release/force push。

## 选项与影响

A（建议，尚未授权）：原T5继续负责，只补HOSTED_LAN固定阶段/原因和必要合成对照；生产发现/网卡/绑定/权限策略不变。先本地可复现反例与Master Review，再新增该门禁专用Hosted最多2次；定位并通过后新增Full最多1次，QA保留原2次。不同失败必须有有效诊断/修复，无修改不retry，任一额度耗尽再停。同步明确8.3真实别名证据如何补齐：优先受控环境满足原用例，历史skip如实保留，未经另批不得降低零skip要求。此方案仍不能保证后续未到达阶段一次通过。

B：维持当前停止，不新增预算或实施。保留所有源码、证据和原任务现场。

## 需要网页版决定

是否批准A的原线程/安全边界不变的工程范围及新增“LAN门禁诊断2 + Full1”预算；8.3补证策略若无法维持原验收语义，须再次决定，当前无豁免。或选择B保持停止。未收到明确批准前不执行A；不进入Batch5/OCR/main/tag/Release。

证据：evidence/d5-run-36292597156.json、full1-run-36292822541.json、full1-master-review-8e99.json、full2-run-36294405341.json、full2-log-facts-36294405341.json；完整账本ORCHESTRATION.md/REVIEW-LOG.md。最终网页版卡见full2-stoploss/CHATGPT-HANDOFF.md，原根目录旧卡保留为历史。
