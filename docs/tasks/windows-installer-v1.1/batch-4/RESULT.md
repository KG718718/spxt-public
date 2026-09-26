# Batch 4 当前结果

状态：**BLOCKED — AUTOMATION PASS / QA PASS / HUMAN PENDING**。

## 交付结论

用户批准的U22方案B已落实：manifest hash不符在实际旧program替换前拒绝，故障后program、installer metadata、registration、binding、shortcuts和business instance精确保持/恢复，不再绑定旧PrepareToInstall marker。D5专项、F3真实生命周期、完整公开回归、Artifact核验和独立QA已闭合。Win10人工尚未开始；不进入Batch4.5，不发布main/tag/Release。

## 三条可追溯证据链

| 证据 | 来源 | 结论 |
| --- | --- | --- |
| D5最小U22诊断 | 22bacc5d45278bdff838d5a002bf7121085751b3 / run36245606056 / Artifact10907850207 | 18阶段PASS，U22=PAYLOAD_HASH_REJECTED/UNCHANGED |
| F3候选产品与Artifact | c8886e6b6d413c2fd73d6716621d07a80b337e58 / run36246132535 / Artifact10907910968 | U01—U30、同来源Runtime/Launcher/Portable/Setup、26/742/fail0/skip0、29项I自动检查+D01—D13、offline和privacy PASS |
| QA1静态门禁补证 | 4f95e981c6b765e3ab225778508801eadbc20df3 / run36249047967 / Artifact10908731584 | 仅qa-static，34s PASS，其余4 jobs skipped，真实首失败停止反例及共用门禁执行通过 |

F3 historical job108415569036曾实际70 tests/69 pass/1 fail，却被后续成功命令掩盖为success。首次独立QA明确FAIL；首失败报告保留，未改写旧日志。原T4仅修5个非文档CI/静态测试文件，产品、构建、payload、身份和生命周期输入逐字节不变；主控与同一QA独立复审后，使用QA第1次额度完成专用门禁补证。因此F3安装包可继续作为候选，来源仍严格为c8886e6，不得称由后续QA提交构建。

## 最终Artifact

[下载原始Setup Artifact](https://github.com/KG718718/spxt-public/actions/runs/36246132535/artifacts/10907910968)

- 名称：K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58。
- ZIP：32,538,249 bytes；SHA256 e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6。
- EXE：K-SESSION-Setup-1.1.0-beta.2.exe，33,018,840 bytes；SHA256 877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6。
- Node24.21.0、Go1.27.1、Inno6.7.3；安装program 1,042 files /143,784,221 bytes；unsigned开发候选。
- 主控完整ZIP/EXE仅内存读取并独立重算hash；12文件allowlist及安全报告逐项核验PASS，未把发行包保存到开发机。
- GitHub API有效期：2026-10-26T13:55:32Z（北京时间2026-10-26 21:55:32）；保留期不等于Release。

## 独立QA与工程复测

B4-QA thread01a0de04-719c-7691-8b04-33d9d53596a0；最终local caf034f527e85e7cb4c0f0a410fcb392bfa701ca，主控整合e12472285d34c0b255d4c7168290cfd39b4db5d2，仅报告文件。首轮FAIL→受限返工→HOSTED_READY→QA1→最终PASS均在tasks/B4-QA-RESULT.md保留。

主控U22专项30/30、纯Go两项、PS AST、公开文档8/8 PASS；CI修复后共享静态门禁实际PASS、lifecycle15/15。QA独立historical71/71、lifecycle15/15及共享helper PASS。早先本地alias/symlink权限SKIP不冒充Hosted742/skip0；最终26/742由F3原始报告证明。

## 主控、预算与停点

唯一ACTIVE Master为01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master019fa7e9-f46b-7192-9052-cd0aac7c2cc5永久退役只读。治理fae647e、159ee41已Review并仅推开发分支。Primary public-source；原SPXT仓库分支/修改/未跟踪内容未整理。原T4与f8bd复用，T1/T1A/T2/T3未重启。

首次恢复预算D1—D4为4/4、F1—F2为2/2；方案B追加D5为1/1、F3为1/1；QA为1/2、剩1且不再使用。没有将QA当Full重试。无新PR/main/tag/Release；既有工作树与缓存保留。后续仅等待用户Win10人工反馈；不自动处理Batch4.5。

详细证据：UPGRADE-TEST-REPORT.md、ARTIFACT-VERIFICATION.md、AUTONOMOUS-EXECUTION.md、ORCHESTRATION.md、tasks/B4-T4-RESULT.md、tasks/B4-QA-RESULT.md。历史F2止损另见B4-STOPLOSS-DECISION-20260926.md。
