# FC2 FINAL — F01 / TARGET_MISMATCH / CLEANUP_UNPROVEN / STOP

2026-10-19。唯一 FC2 Run39215154383 / attempt1 已 FAIL。受测 source b6f44a09f2e54e39b1a55fd1dcf474ff19f6912d，trigger-only control 29e040394159d3bb0fff7a04406b3ea7ea3b2ac8；实现2fb10516、正式RETURN98b9ff30。未重跑、无其他Hosted，QA未启动。

## 已确认事实

- Source bootstrap 成功，指定FC1精确历史例外、标准Windows Hosted新Job绑定及来源合同在真实运行中通过。原FC1 SOURCE/CLEANUP_UNPROVEN与9null/NOT_OBSERVED永久保留，不追认恢复。
- 本轮BUILD COMPLETE/PASS，真实Setup已执行；Hosted Setup SHA256 b7a5ce6777a68444b2fc55a3e46b9bc8cbd440d0a5c6283c5b91962403f6a291。此EXE没有通过安装验收，不可交付。
- 失败stage F01 / reason CLEANUP_UNPROVEN，FRESH_ACCEPT=INNO_EXIT_INSTALL_FATAL。五项安装前拒绝分别保留预期固定拒绝标记，但整项F01没有PASS记录，checks为空。
- 启动项已创建、计算hash并移动；INSTALL_VERIFY依次通过目录、属性、expected hash和实际hash，完成COM初始化/打开，随后TARGET_READ → TARGET_MISMATCH。源码setup-beta4.iss的CompareText(Link.TargetPath, ExpandConstant('{app}\program\K-SESSION.exe'))不相等才产生该固定marker。
- ARGUMENTS/WORKDIR匹配及INI_WRITE未到达；没有证据将首因归为hash失败、COM初始化异常或INI保存异常。CLEANUP_VERIFY再次TARGET_MISMATCH，随后CLEANUP_IDENTITY_UNKNOWN。安全身份校验保持拒绝，未删除未知资源。
- buildDiagnostic内SUPERVISOR_JOB/CHILD_EXIT_FAILED是子CI失败的汇总，不是本轮已确认的Supervisor入口首因；本轮已越过旧FC1入口并真实到达F01。

## 恢复及未验证

cleanup 8项true；ownedRegistrationAbsent、ownedShortcutsAbsent为false。recovery：rules与compilerSettings为SNAPSHOT_UNCHANGED，compilerOwnedFiles为OWNED_REMOVED；productRegistration/binding/startup/desktop/programs/programFiles为OWNERSHIP_UNKNOWN，globalRegistry为STATE_CHANGED。这些不能证明整体恢复，也不能逐项等同“已证所有真实残留”。不扩大删除范围、不强制恢复未知资源。

F01未PASS，F02—F09、安装后浏览器业务、26 suites/742 checks、最终成功Artifact与独立QA未到达。真实Win10/UAC/物理Private网卡/第二设备/登录自启及第二Launcher交互仍HUMAN_PENDING，没有可供用户验收的合格安装包。

## 尚不能确定

实际TargetPath内容未记录，无法区分返回空值、路径表达/解析差异与实际错误目标，唯一底层原因仍UNKNOWN。不能未经实证认定SUBST、短路径或路径等价性就是唯一根因。本轮也不追认历史Run38767500533存在相同子因。

## 证据与停止

Artifact12169532445仅fresh-report.json；API metadata、archive digest、ZIP单JSON白名单、schema2/source/control/run/attempt独立核验PASS。archive SHA256 f03a64af0167cc93ca4c9752878b099c09ccf41c2c3954b638674b479f56a478；原report SHA256 2e56f81bfe3e758b3f535254ab5fbfbc0573538440e4476e47f1a6958ff14d28。原报告与安全metadata见同目录FC2-HOSTED-REPORT.json及FC2-ARTIFACT-METADATA.json。

最终 BLOCKED — FC2 F01 TARGET_MISMATCH / CLEANUP_UNPROVEN / CANDIDATE 2/2 EXHAUSTED。原唯一QA0/1 UNUSED—FROZEN，不借用、不重跑、不追加预算。原FRESH-T2已正式RETURN并冻结；工作树、未跟踪输出、分支和全部历史FAIL保留。不main/tag/Release/内部SPXT/真实数据/未知清理。

下一步只建议由网页版另行决定是否授权本地快捷方式目标身份与失败恢复的有界修复。应先证明目标的实际等价/非等价类别及资源所有权，不能直接放宽TargetPath校验；本轮不实施、不新增probe或Hosted。
