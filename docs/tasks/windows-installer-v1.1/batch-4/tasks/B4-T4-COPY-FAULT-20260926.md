# B4-T4 U21 copy 故障返工卡

TASK ID B4-T4；派单编号 B4-T4-COPY-FAULT-20260926-03。你是执行任务，不是项目主控。Batch4，困难/L2，gpt-5.6-sol / medium。继续原thread01a0cb6a-67cc-7c03-a68b-2727af8fce6e、原E:/CodexWorkspace/CodexWorktrees/f8bd/public-source、codex/b4-t4-upgrade-lifecycle@4918e5b49de3747e756fa05c9ef2b264c99214cf，原baseline不变。唯一return target和工程主控01a0db0e-c950-79e0-8e11-07155e0742f2；旧主控永久退役。先读主控公开目录最新AGENTS/PROJECT、SPEC/PLAN/ACCEPTANCE/AUTONOMOUS-EXECUTION；只读取指定公开材料，不另建任务/worktree/Agent，不fetch/rebase，不重做T1/T1A/T2/T3。

## 本轮已证实

第二轮task4918e5b已整合9e070de4，D2 run36209825354 / Artifact10895610527为17阶段PASS：BASELINE、AFTER_U15/U16/U17、U20_PRECOPY全部IDENTITY_ACCEPTED/UNCHANGED，编码修复已在真实Inno序列越过原门禁。D2后仅治理文档变动和一处公开文档措辞修正；主控npm26 files/failed0。

F1完整run36210201290 / setup job108314941067 / tested6fdb7ed19467ac64a80c2f4824b4dfe0431fc62d FAILURE。历史identity job通过；TestSetup PASS（90.75s），I01/I02/I09仍人工PENDING，其余29项PASS，D01—D13全PASS。TestUpgradeLifecycle完成U01/U02/U15/U16/U17/U18/U20，U20取消故障已恢复exact owned state和byte-identical instance。随后U21在upgrade_windows_test.go:610进入runSetup(fault-copy,false)，内部返回“setup fault-copy success=true want=false”；尚未assert fixed marker，也未比较U21恢复状态。不能把后续U项或完整Batch视为通过。公开742回归及最终Artifact隐私门禁未执行。

失败Artifact10895856282，setup-failure-evidence-6fdb7ed19467ac64a80c2f4824b4dfe0431fc62d-1，digest4ec029dc062e530f8d6bc26f88e04c42dc0c7674cc2e5747f11b58a0a19765af。安全报告在主控目录.test-work/full-review-36210201290/{INSTALLER-TEST-REPORT.json,UPGRADE-TEST-REPORT.json,offline-network.json}；网络证据externalDuring=false/restored=true，失败不代表网络未恢复。不要下载或保存发行包，不输出request/log/合成凭据正文。

## 单一目标与证据路径

定位真实copy故障fixture为何返回success，完成可证明的最小修复，保持既有“失败恢复旧版、数据不变”产品规则。当前BeforeUpgradeCopy在FaultCopy+UpgradeMode首次调用设置FaultCopyIssued、写固定marker后RaiseException；build.cjs的upgrade Files entry有BeforeInstall钩子并传/DFaultCopy=1。F1的runSetup在退出结果不符合预期时立即Fatal，所以现有回单缺钩子是否触发、退出码和固定marker等关键证据；先补安全闭合诊断，不能只猜其根因。
官方线索（尚不是根因结论）：BeforeInstall异常及ssPostInstall异常不一定等同退出安装；Abort官方明确只有列出的事件才退出。请核对固定Inno6.7.3真实行为/官方源码，同时审查同源FaultPostCopy和生产post-copy失败传播，避免最后一次full被同一机制的后续故障截断。文档：
https://jrsoftware.org/ishelp/topic_isxfunc_abort.htm
https://jrsoftware.org/ishelp/topic_scriptinstall.htm
https://jrsoftware.org/ishelp/topic_setupexitcodes.htm
https://jrsoftware.org/ishelp/topic_installorder.htm
不要把copy故障改成cancel或仅自定义非零退出码来伪造PASS；必须证明实际故障发生、预期停止及旧程序/metadata/登记/binding/shortcuts/instance保持。不得删断言、跳过U21/U23、用新fresh install冒充升级、不放宽身份。

本轮剩余预算：最小诊断2次（D1/D2已用）、完整Setup1次（F1已用）、QA2次未用。优先准备能解决U21及同源post-copy异常语义的最小Hosted诊断，主控Review后才dispatch；不直接重跑full，不把full失败归QA预算。诊断设计须只跑所需fixture/阶段、固定且闭合结果、无发行物或私有日志上传，不演变成另一套安装路线。若已有证据足以本地确定修复，也须明确哪些仅合成/静态、哪些需Hosted实测，不编造本地Inno运行。

## 允许范围及验收

允许tools/windows-installer/setup.iss、build.cjs及相关测试，仅copy故障注入/既有失败传播与恢复语义的工程修复；tools/windows-launcher/upgrade_windows_test.go的安全报告与专项目标；必要最小诊断脚本/helper和.github/workflows/setup-v3.yml的显式互斥诊断入口；tools/tests/windows-installer/相关反例；本任务RESULT。生产detection/gate、批准身份bundle、业务/app schema/DC1、数据生命周期、UX、平台、技术路线、版本/工具链不变。恢复既定失败拒绝语义不等于批准新的产品行为；若需要改变产品或无法安全恢复则带证据回主控决策。
先失败证据/本地可执行反例→最小修复→对应正反例；PS AST、Node syntax、相关契约和npm test；改Go则固定Go的gofmt、纯测试和compile-only。不得在开发机执行真实安装生命周期、写真实登记/快捷方式或网络隔离。测试仅合成数据，无真实账号、附件、凭据或邮件。
只local commit，信息含[sequence-diagnostic] [skip ci]；不push/Actions/main/tag/Release。回单写清证实与推测、改变文件、测试实际计数和SKIP、local commit、最小Hosted运行入口/预期闭合输出/工程风险，主动send_message_to_thread精确新主控ID并核验；失败写RESULT等watchdog恢复。普通工程持续自动处理；只有用户明确的产品/UX/schema/migration/生命周期/信任安全放宽/路线/平台变更、预算耗尽或无法安全恢复才提交决策。

