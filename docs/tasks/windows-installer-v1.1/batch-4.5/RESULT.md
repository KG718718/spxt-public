# Batch 4.5 当前结果

IN PROGRESS。方案A已正式批准：仅受验F3 beta.2精确安装后身份可进入beta.3，beta.1历史路线保持。appVersion1.0.0、DC1、Runtime identity schema及业务/instance结构不变。最终仍停 AUTOMATION PASS / QA PASS / LAN HUMAN PENDING；目前未到达。

Batch4用户Win10人工1—10 PASS已记录并推送9eaad01，受验Run36246132535/Artifact10907910968/source c8886e6b6d413c2fd73d6716621d07a80b337e58未修改。

T1网络发现/固定端口/config及严格JSON返工已Review整合，最新864e8f5，Master独立18/18 PASS。T2双listener/首Admin/selected subnet guard整合4b83380，Master13/13 PASS。T4 helper及R1—R3返工已整合b0e51b5，Master13顶层/29子用例、go vet PASS。T3 Launcher及R1已Review整合d623cdf/bf6f87d，Master在该统一HEAD独立Node37/37、Go25顶层+11子反例及vet PASS，fail0skip0。原T5独立beta.3升级路由/构建仍返工中。上述仅局部工程结论，真实LAN/Firewall/UAC未验证。

专项1 Run36280286553@bb497a8失败STATIC_GATE；专项2 Run36280914931@a55395d失败CLEANUP_VERIFY，历史安全报告保留。修复并Review后专项3 Run36281720897@tested b23eb269ecd0509e6dfde6f6bfb111d6d356ada2 PASS，Artifact10919206400。Master核验精确F3来源、五个非敏感身份锚及cleanup，证据固化0897383；原T5据此实现运行时离线可信bundle。预算专项3/4、Full0/2、QA0/2；剩余专项留待集成Review，不无修改retry。

独立早期QA @5825690为FAIL，两个P2分别是配置跨层解析不一致及既有精确自有规则早期异常未禁用。历史报告已整合704a9bd；T1/T4对应返工后，QA在精确b0e51b54744c944ce68a5730d9b8d279b72db9a0复验两个P2 PASS，报告4b9eae3已整合d82a698。此为局部复验，不是整个Batch QA PASS。T2孤立healthFailed缺陷定性已因生产链先撤销guard的证据撤回，没有因此修改生产代码。T3/T5接线Review问题由原线程修复中，详见REVIEW-LOG.md。

旧第27节BLOCKED已被方案A解除，历史决策卡保留；当前工程失败不等于产品决策阻塞。L01—L28/C01—C15、26/742、Runtime/Launcher/Portable/Setup、privacy/独立QA均需本Batch实际证据，不代填旧Batch结果。尚无beta.3 Artifact，不宣称LAN READY或第二设备可达。

最新整合：T3 fresh地址显示/复制修复59f0a9b+d967786经独立QA原反例3/3闭合（报告137e526），stop忙状态有界重试a226ed1由Master2/2+vet PASS。T5独立beta.3路线、完整登记快照/readback与终态清理marker已整合至e0fbbb1；独立QA两P2设计/本地合成复验PASS（报告d485b36），真实reg.exe/Setup仍PENDING。CI精确Go测试名单和既有Setup手动调度入口整合至eaebaf6，Master在该实际HEAD兼容wrapper44/44 fail0skip0。新workflow尚无单独调度记录，正式Hosted从已注册setup-v3入口使用独立LAN模式，不修改main。最后测试名单增量与执行回单仍在完成，未使用专项第4次。

唯一Master01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久只读。只操作公开repo与codex/lan-host-v1.1，未操作main/tag/Release或指定范围之外材料。详情ORCHESTRATION.md、REVIEW-LOG.md及各任务RESULT。
