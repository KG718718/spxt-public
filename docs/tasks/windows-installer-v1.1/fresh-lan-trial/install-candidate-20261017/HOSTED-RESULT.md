# 唯一 IC1 — ENV 前检 FAIL / STOP

2026-10-17。**BLOCKED — IC1 ENV PRECHECK FAILED / COMPILER FILE OBSERVATION UNPROVEN。** 新 Candidate1/1已用，原独立QA0/1未调度并继续冻结。按用户 FAIL/UNKNOWN 立即停止：不修复、不重跑、不追加、不使用QA调试。

## 已核验事实

- Run `39005740755`，attempt1，conclusion failure；唯一workflow `.github/workflows/fresh-install-candidate.yml`。
- testedSource `878d770be0cbf44e7e81f4707a340510c84f3693`；control `0e4e4624db12b2eea381bf893fde89bebb30ceb3`；受审实现/本地构建 `849131c20282afcdc4d27fa5237fdf9b38865e8d`，同代码指纹43091f6233c1ca6ed093432591108fb9ac325e01d10c21c05630f4f7189d8f0a。
- 来源和预算绑定步骤 success；执行及最终化步骤 failure。严格安全报告 `stage=ENV`、`reason=CLEANUP_UNPROVEN`、`buildDiagnostic=NOT_STARTED/NOT_STARTED`、`checks=[]`、`setupSha256=null`、`setupDiagnostics=[]`。
- 失败发生于安装前环境/恢复观察；本 Run 没有开始 Payload/Setup 构建或执行产品安装。没有验证新 F01，也不能把它描述为本次再次安装失败。
- Artifact `12090752868`，名称 `install-20261017-safe-failure-39005740755`，只有 `fresh-report.json`，无EXE。来源、attempt、workflow/title、父提交/trigger-only差异、ZIP路径/条目/大小、API digest和schema2白名单独立验证通过。
- ZIP SHA256 `4ee435f798ea98261998751e6951285d61bd9e4f729f711c91b8af3613a1959d`；report SHA256 `e2a7fdad7f63fc48841687613e307db9cb49279ab4d343f7e63c150af5220575`。

## 分项恢复证据

| 分项 | 固定实际结果 |
| --- | --- |
| compilerOwnedFiles | OBSERVATION_FAILED |
| compilerSettings / globalRegistry / rules | SNAPSHOT_UNCHANGED |
| productRegistration / binding / startup / desktop / programs / programFiles | ABSENT_UNCHANGED |

十个cleanup布尔中，进程、Node、句柄、锁、规则、登记、快捷方式、drive和进程环境共9项true；`ownedToolchainAbsent=false`。该false说明工具链文件状态未证明，**不等于已发现工具链残留**。本次在构建/编译器安装之前就被拒绝，不把缺失观察改成PASS。规则快照在本Runner前后已知且相同，不追认旧Win10 QUERY_CIM_FAILED 已解决。

## 只读源码分析：事实与推测分开

`ci.ps1` 的ENV顺序为：解析physical work → 产品/全局登记/规则/编译器路径观察 → 设置快照 → 严格前检 → 才开始 BUILD。报告证明问题收窄到编译器文件观察/前态门禁，不是Setup的hash/COM/INI失败。具体底层异常、前后哪一侧读取失败及实际路径类别未写入本报告，不能编造。

已确认的源码不一致：产品观察使用 `KSESSION_FRESH_PHYSICAL_WORK`，而compiler前/后观察均使用 `Join-Path $taskWork 'inno/compiler'`，即逻辑工作路径。`Test-FreshObservationParent`只接受CANONICAL父目录；既有路径分类器会把SUBST或ALIAS判为非CANONICAL。工作流本身允许在无E盘时创建受控SUBST。因此，支持的SUBST环境下存在这两类路径处理不一致的代码缺口。

**基于证据的首要推测：** 本次逻辑路径可能被上述安全观察器拒绝。Artifact没有记录实际SUBST/ALIAS类别或创建映射标志，尚不足以断言它是本次唯一根因。没有在失败后运行任何新探针或反例来补证。

## 最小下一步建议，未实施

交网页版决定是否仅批准本地修正测试封装：compiler前后观察统一使用已验证的physical work，保持CANONICAL/reparse/所有权门禁；增加受控SUBST、物理路径、缺目录、未知映射及恢复反例。不得把SUBST无条件算安全、忽略观察失败或删除未知文件。当前不提出或触发新的Hosted；预算和后续实施均需新决定。

## 保留的通过项与未完成项

本轮本地实现、45专项/兼容、134 root、Go编译/vet、PS语法、同源完整P0及Master Review仍是其实际范围的PASS。P0 EXE33557167字节、SHAd2f01a824b62e0f00a60026a2d1b01b7000d582e6b9d6031e2cb2b0643ce18eb，1049文件/20依赖，仅本地构建资格。不能把它当成本Run的成功安装包。

实际安装、F01—F09、26 suites/742 checks、最终成功Artifact及独立QA未完成；历史F01根因仍UNKNOWN，所有历史FAIL及预算不改。没有合格用户包，不进入HUMAN_PENDING交付。原Execution/QA线程、工作树和未知未跟踪内容保留；无生产修复、内部SPXT、真实业务/凭据、main/tag/Release或清理操作。
