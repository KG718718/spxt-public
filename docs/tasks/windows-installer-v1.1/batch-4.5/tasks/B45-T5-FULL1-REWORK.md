你是执行任务，不是项目主控。TASK B45-T5 / FULL1-REWORK；PARENT Batch4.5。唯一Master及主动回单target01a0db0e-c950-79e0-8e11-07155e0742f2。模型gpt-5.6-sol/medium。原thread01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9、原E:/CodexWorkspace/CodexWorktrees/b4-qa/public-source、codex/b45-t5-integration，不创建thread/agent/worktree。BASELINE本地冻结b67cbb6e4bb2ddadd92ddf6ee12885198979ed19；主控受测集成f139a429b56aab53b84727fad58838619e40f4ee的tools/.github/生产代码与该基线一致（治理文档不同）。先preflight核对，不reset/clean/丢未跟踪；旧提交保留，所有增量append commit，不amend已回传SHA。

先读Primary当前AGENTS/PROJECT、batch-4.5/SPEC/COMPATIBILITY-APPROVAL/DIAGNOSTIC-EXTENSION-APPROVAL（尤其第12节）及本卡；当前任务卡覆盖工作树旧止损。D5 Run36292597156@98b030d PASS：environment13/driver5/Go13/真实compile，四JSON privacy PASS。D预算1/2，历史专项4/4。Full1 Run36292822541@f139a429b56aab53b84727fad58838619e40f4ee / job108546037365 FAIL；Artifact10922344270仅stage PORTABLE/FULL/FAIL，sha31c53b74b3b6ff76784578ed41e7dfef8ec495421535ff2797614b03d37bcbcc。Full1已经越过Firewall test/compile、Launcher build/test；之后LAN Node37项31PASS/6FAIL/skip0，config.test.cjs合法fixture被LAN_CONFIG_PATH_INVALID拒绝（safeInstance realpath与resolved不等）。真实Setup/U22/U23/Registry/Firewall未到达。Full1/2、QA0/2。

任务：按批准第12节，对此前未到达的LAN config/L gate测试环境失败完成安全本地对照、最小测试/CI环境修复和固定诊断，返回Master Review；不得直接重试或借用QA。可读取该公开Run日志，但只记录固定stage/reason/测试计数，不提交raw路径/用户名/runner原始日志/业务正文。不要将D5旧问题恢复为失败：本次是后续Node fixture的新拒绝，先证据再定因。

观察待证：config.test fixture使用os.tmpdir；ci-lan在同一PowerShell进程调用Launcher build.ps1，它将TEMP/TMP/GOTMPDIR留在由work派生的目录；E盘可能映射/别名，Node realpath会发现差异。不得把推测直接认定Hosted唯一根因。使用自有合成目录/junction及必要纯路径模拟，本地复现合法物理路径PASS、别名路径固定拒绝，并验证实际CI调用顺序的环境影响。不要改public-lan-config.js生产safeInstance，不接受链接/任意路径，不将拒绝改warning/skip或吞失败。

允许范围：tools/windows-portable/ci-lan.ps1中后续测试环境安全设置与恢复；现有tools/windows-firewall/test-environment.ps1中可复用测试辅助（生产Go五文件仍冻结）；必要tools/tests/lan-host新增独立测试环境/编排契约反例及固定安全报告；必要beta3 CI接线只为明确同类测试环境，须先报告原因。原config.test.cjs等断言语义保留，优先只修测试环境；若需改夹具先说明。生产JS/Go/安装器/业务schema/身份路由不在范围，发现真实生产缺陷先回Master判断。无EXE/ZIP发行包下载或构建保存到开发机，无真实NIC/Firewall/registry/UAC/业务访问。

必须：原37 LAN tests规范环境37/37 fail0skip0；原失败可控反例；非法别名/junction仍拒绝且原字节不变；整个PowerShell调用链环境契约验证及恢复；相关新增测试零skip；若改D5辅助重跑13环境+5driver+Go13+vet，不重复无关全量；compatibility wrapper45保持；diff/安全白名单/五生产文件冻结。进一步检查同一测试TEMP问题是否影响后续版本化兼容/回归的调用，有限闭合已确认环境问题，不改历史beta1测试/证据含义。

任务结束写tasks/B45-T5-FULL1-REWORK-RESULT.md，仅自身授权local commits[skip ci]；不得push/main/tag/Release/Hosted，不发网页版交接卡。主动send_message_to_thread精确Master并核验target后RETURNED，回单含TASK/状态/完成/文件/测试/local commit/风险/主控处理；失败写RESULT并标待Master读取。冻结交付SHA。若无法本地安全定位或需额外Hosted诊断才能决定，BLOCKED/NEED PARENT DECISION，不消耗Full2。Master独立Review后才决定剩余最后Full2。
