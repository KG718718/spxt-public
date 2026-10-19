# FC2 INSTALL TARGET REPAIR — LOCAL ONLY

2026-10-19，用户批准原Master与原FRESH-T2/bea7本地自主Loop。基线d4cda79096a4778142dfdc4cab84a106fd4ac400。目标仅修复Fresh登录自启目标身份与安装中途失败的安全恢复，不新增研究Batch，不研究已通过Supervisor/Helper，不扩业务/LAN。

FC2 Run39215154383 / sourceb6f44a09 / control29e04039 / Artifact12169532445 / F01 INSTALL_VERIFY TARGET_MISMATCH / CLEANUP_UNPROVEN永久保留FAIL。FC1亦保持FAIL。Candidate2/2耗尽、QA0/1冻结；本轮Hosted0，禁止trigger/Actions/QA/retry。

原Execution在原独立工作树中核查setup-beta4.iss的CreateFreshStartup、FreshStartupMatches、DeinitializeSetup：实际Windows受控快捷方式创建前目标、创建后COM目标、移动后目标；物理目录、受控SUBST、短/长路径、规范化；空/错/不可达目标与同文件判断。只在证明同一受信任Launcher时允许经验证的规范化/文件身份比较；不同Launcher、未知reparse、损坏链接继续拒绝，不仅凭相似字符串或文件存在。

按真实创建顺序验证Startup/Registration/Binding/Desktop/Programs/ProgramFiles的本次安装所有权及GlobalRegistry变化来源。区分receipt明确归属、未知及缺观察，只清本次精确owned资源，不盲卸载、清未知登记/文件或伪造恢复PASS。

自主定位→最小生产修复→真实Windows快捷方式反例→失败恢复验证→完整同源EXE构建→Master独立Review。普通工程本地返工无需逐次审批。无普通subagent/后代Thread/新worktree；Execution不push或触发Hosted，由Master整合及非force开发分支同步。

日常Windows电脑仅可使用隔离自有fixture目录、受控SUBST/测试快捷方式和有确切所有权的合成资源；不得实际产品安装、借真实Startup/产品登记/业务数据做试验。需真实Setup而无安全可销毁本地环境时标NOT VERIFIED，不擅自安装/清理。不改main/tag/Release/内部SPXT/真实网络或Firewall。不得记录实际目标路径/路径hash长度、原始日志、PID、账户或业务信息；证据只固定类别/布尔及公开source/build身份。

最终一次回单：实际TargetPath差异类别；同一受信任Launcher是否已证；生产修改文件；可安全恢复和仍UNKNOWN资源；完整EXE构建；再次真实Fresh验收准入条件。历史FC2底层实际值未记录，不以本地复现追认为历史唯一根因。无法证明资源所有权/恢复或需改变原安全权限模型则保存证据返回；不继续Hosted。
