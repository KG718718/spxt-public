# B4-QA — 最终 Batch 4 独立审查

你是独立只读 QA，不是项目主控，不是实现线程。
TASK ID: B4-QA / ROLE: QA / PARENT: Batch 4
唯一主控和主动回单目标: 01a0db0e-c950-79e0-8e11-07155e0742f2
难度L2；按用户/项目编排约束使用 gpt-5.6-sol / medium。
公开仓库 KG718718/spxt-public；受测commit c8886e6b6d413c2fd73d6716621d07a80b337e58。
专属工作目录 E:/CodexWorkspace/CodexWorktrees/b4-qa/public-source；local branch codex/b4-qa，从上述精确受测commit创建。所有命令显式使用此目录；不要操作项目Primary或原T4工作树。
原T4线程01a0cb6a-67cc-7c03-a68b-2727af8fce6e，local2b149857e566153bc3d50427c59912d05c3e50af；主控整合22bacc5d45278bdff838d5a002bf7121085751b3，之后至c8886e6只有文档。不要重开T1/T1A/T2/T3/T4，不创建后代对话、sub-agent或工作树。

## 已批准范围与证据
先读本工作树AGENTS.md、PROJECT.md及docs/tasks/windows-installer-v1.1/batch-4/{SPEC,PLAN,ACCEPTANCE,AUTONOMOUS-EXECUTION,ORCHESTRATION}.md和tasks/*RESULT.md。本卡的当前结果优先于工作树内历史RUNNING/STOP记录。
2026-09-26用户批准U22方案B：错误payload/program manifest hash必须在实际旧program替换前拒绝；故障后program/installer metadata/registration/binding/shortcuts/business instance精确保持或恢复。无需PrepareToInstall失败或旧KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED。允许Gate→Prepare/snapshot→native staging copy→commit validate→拒绝→rollback→exact state。不能用任意错误或rollback marker替代。
D5 run36245606056/job108414119580@22bacc5d45278bdff838d5a002bf7121085751b3：18阶段PASS，U22=PAYLOAD_HASH_REJECTED/UNCHANGED；Artifact10907850207，SHA256 a41830b6d8814a70fcf9b993de65d953f82f648a934517df7042233d9534c171；主控已独立验证严格schema/白名单/digest。D5使用exact beta.1旧payload，只是专项诊断。
F3 run36246132535/job108415569184@c8886e6b6d413c2fd73d6716621d07a80b337e58：工作流全部success（setup11m44s），历史身份job108415569036 success。所有Runtime/Launcher/Portable/Setup、完整regression、Artifact privacy步骤已通过。
最终Artifact10907910968，name K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58，size32538249，ZIP SHA256 e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6。主控正在独立以内存读取该Artifact；尚未把未知EXE SHA写成已核实。Artifact事实以GitHub原始报告为准。
历史identity Artifact10907372737，SHA2561929b28ddaed653b92a886efb1cc96388e16ad0a689fe4edce4d8aca55385db1。
主控审查缓存（只读指定安全JSON，存在后可读）在 E:/CodexWorkspace/01-Codex项目/2026-06-12-SPXT发票审核开发版/output/public-release-audit-20260916/public-source/.test-work/full-review-36246132535/ 。报告来源摘要将补发；不要把主控摘要代替独立代码审查。

## 审查/验收
1. 独立检查整个Batch4批准规格及最终代码，重点真实beta.1→beta.2而非伪装fresh、严格历史+fresh身份、不接受未知登记、不放宽reparse/路径/哈希门禁、不新建空instance掩盖旧数据。
2. U01—U30逐项PASS，I01/I02/I09仍HUMAN PENDING，其余I项及D01—D13 PASS；核对业务实例安装后首启前byte-identical、账号/附件升级与卸载重装可用、旧版恢复六类状态、唯一登记、快捷方式精确绑定、无UAC/不连接业务环境。
3. 特别U22：hash专有码的来源与fail-closed映射、Exec启动失败不能伪装61、validateStaged在old-program rename前、missing/unknown/conflicting stage或swap/finalize/rollback失败不能PASS；完整状态比较确实运行。测试是否弱化/假阳性须指出。U21/U23全流程保留。
4. 从F3 Artifact原始报告验证sourceCommit、U30、26suites/742checks/fail0/skip0、Runtime/Launcher/Portable/Setup同身份、offline恢复、隐私allowlist、EXE hash。禁止在开发机保存EXE/发行ZIP。可用gh API+fflate在内存审阅，安全JSON可保存本任务.test-work；不输出raw install logs、身份bundle细节、路径/凭据/业务内容。
5. 风险对应本地合成反例/静态测试可运行；不得真实安装、注册表/快捷方式/网络隔离/共享端口或实际业务连接。固定Go1.27.1可只读复用 E:/CodexWorkspace/CodexWorktrees/f8bd/public-source/.test-work/b4-t4-go-fast/go/bin/go.exe；缓存必须本QA.test-work，不共享可写cache。gofmt只检查不改生产。可用主控node_modules通过NODE_PATH等只读复用；不扩依赖或改lock。
6. Hosted只有主控可调度。当前D5/F3各1/1已用，QA0/2；你不得dispatch/retry。发现问题给具体file/line/触发条件/影响/证据，返回FAIL/BLOCKED并停在只读审查，不自行修复。
7. 不改任何生产/测试/workflow/规格；唯一允许提交 docs/tasks/windows-installer-v1.1/batch-4/tasks/B4-QA-RESULT.md，必须如实区分已验证/推断/未运行。可local commit报告，message含[skip ci]；禁止push/merge/PR/main/tag/Release/清理其他worktree/读取其他用途版本。
8. 最终自动化+独立QA通过只到BLOCKED — AUTOMATION PASS / QA PASS / HUMAN PENDING；不得替用户Win10验收，不进入Batch4.5。

完成后主动send_message_to_thread到新主控01a0db0e-c950-79e0-8e11-07155e0742f2（用户明确授权该工作流回单），字段：【TASK ID】【状态PASS/FAIL/BLOCKED】【完成内容】【修改文件】【测试结果】【local commit】【已知风险】【需要主控处理】。不生成网页版交接卡。主控同时会read thread/RESULT/commit watchdog兜底；不得因回单失败丢失结果。
