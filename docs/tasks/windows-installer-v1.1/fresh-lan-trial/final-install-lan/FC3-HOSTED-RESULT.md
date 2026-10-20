# FC3 RESULT — FAIL / CLEANUP_UNPROVEN / STOP

2026-10-20。**BLOCKED — FC3 F01 FAILED / CLEANUP_UNPROVEN。** 新Candidate1/1已耗尽；原唯一QA0/1 UNUSED—FROZEN，没有合格用户安装包，不再运行Hosted或工程修复。原FRESH-T2已正式RETURN并冻结。

- Run [39401060413](https://github.com/KG718718/spxt-public/actions/runs/39401060413) / attempt1；受测source `e7e381cdc6bcb5fd92cf8a5b03cd36940fff54b2`；trigger-only控制 `493e98c10c9446587ceacef1a15b3795eb7f76aa`。
- 安全Artifact `12253909942`，仅fresh-report.json；来源/Schema/API digest/ZIP单文件白名单核验通过。archive SHA256 `b988ceda27537e7f4c30b82021d1cc5ad05452955f3940ff7d4d4a7a95936d5b`，report SHA256 `2e33e42535c1f9c3ef7d8d81f3158a61237476ef0290d55d31f2e7ef2f655d38`。
- SOURCE准入和BUILD COMPLETE/PASS已通过。Hosted报告Setup SHA256 `49c3b0388ec3cf805bc910b92e1a3d16629dafdf45c1b3fae62c75daa16c7c55`，失败Artifact无EXE；不是用户交付证明。

## 已确认的停止位置

F01已实际执行五个拒绝调用：NONEMPTY_TARGET、EXISTING_INSTANCE、DESKTOP_SHORTCUT、STARTUP_SHORTCUT、OLD_BINDING。它们的固定拒绝分类符合既有expected()，但不等于整体F01及副作用检查PASS。最后OLD_BINDING为INNO_EXIT_INITIALIZE_FAILED / KSESSION_FRESH_REJECT_REGISTRATION，属于既有预期拒绝，不可把它单独当首因。

随后、正常FRESH_ACCEPT之前终止；FRESH_ACCEPT/Startup INSTALL_VERIFY未达到。因此本Run不能证明04dd TargetPath修复在真实正常安装中成功或失败，也不能重写历史TARGET_MISMATCH。F01尚未PASS，checks为空，F02—F09、安装后浏览器业务、26/742及QA均未到达。

## 恢复与不确定性

旧cleanup十项布尔均true，但扩展recovery中Binding=OWNERSHIP_UNKNOWN、GlobalRegistry=STATE_CHANGED，整体restored=false；两组字段分开保存，绝不把汇总布尔当完整恢复证明。Startup、产品登记、Desktop、Programs、ProgramFiles为ABSENT_UNCHANGED，工具链文件OWNED_REMOVED，其他已观察项SNAPSHOT_UNCHANGED。未知资源未获删除授权，VM销毁不替代恢复。

源码把当前最小故障范围收窄到OLD_BINDING之后的登记回读/一致性检查，或其精确owned fixture清理及删除后观察。现有安全报告没有区分BINDING_CHANGED与OWNED_BINDING_CLEANUP_FAILED；既有GitHub日志仅RAM解析，未观察到这些固定断言码，不保存raw。具体底层原因、测试问题还是产品问题仍UNKNOWN，不推断每项真实残留，也不宣称客户数据损坏。

下一步最小范围是定点核查OLD_BINDING合成夹具的登记一致性、所有权及回收链，并保留固定子阶段证据；需新的明确决策后才实施。本轮不修、不新跑、不追加额度。

## 代码与边界

实现/本地唯一P0仍d2c7da46，codeFP e959cece681e8187b42d5143e88a2f10c0cd5eeb02de44fc9458743c42f187d0；04dd生产修复及全部原安全门禁保留，失败后只记录治理，无生产或测试代码修改。原FC1/FC2及所有历史FAIL/UNKNOWN不改，所有工作树和未跟踪现场保留。

QA未启动；无FC4/retry/Smoke/专项/旧Full，不main/tag/Release/内部SPXT/真实业务/未知清理。实体Win10、可信物理LAN、UAC/Firewall授权、双设备、登录自启与GUI仍未认证。
