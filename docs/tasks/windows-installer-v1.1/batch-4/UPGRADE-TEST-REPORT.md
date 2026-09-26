# Batch 4 测试报告
状态：PARTIAL / D4 PASS / F2 PENDING。已有真实Hosted局部证据，尚无完整Batch4 PASS或最终beta.2 Setup Artifact。各轮身份独立，不合并局部PASS冒充最终全项通过。

| 轮次 | Run / source | 实际结果 |
| --- | --- | --- |
| D1 | 36208733404 / 4319e08694b6660477397102af20d95eb25062b4 | PRE八阶段完成；BASELINE=IDENTITY_REGISTRATION_VERSION/UNCHANGED |
| D2 | 36209825354 / 9e070de4efa7bc10118a7942c33d24b51cb326d0 | 17阶段PASS；身份恢复及U20_PRECOPY均接受且UNCHANGED |
| F1 | 36210201290 / 6fdb7ed19467ac64a80c2f4824b4dfe0431fc62d | fresh Setup29自动PASS/3人工PENDING，D01—D13 PASS；U01/U02/U15—U18/U20 PASS后U21意外success；后续未执行 |
| D3 | 36212532363 / b3ab5978ca90be3fa5d3c5f793735fc42879ffc6 | 前17阶段+U21 COPY_FAILED/UNCHANGED；U23 POST_COPY_MARKER_MISSING/UNCHANGED |
| D4 | 36213904038 / d7ef3964b8fdbf1979dc527e0b65fa202c398ab0 | PASS；19阶段，U23八节点齐全、非零退出且UNCHANGED |

F1 offline证据externalDuring=false、restored=true；失败未导致网络遗留隔离。F1未执行742回归或最终Artifact隐私门禁。D2/D3闭合JSON通过严格字段/顺序/固定枚举及报告隐私审查，不能替代发行Artifact privacy。

当前本地：主控生命周期+事务23/23、纯Go两项、PS AST PASS；执行联合89项88 PASS/1本机alias SKIP，preflight21项20 PASS/1本机symlink权限SKIP，npm26 files/failed0。这些本机SKIP不满足Hosted skip0要求，也不冒充742 checks。

beta.1始终由固定公开e9417f036d0cdf736ff84682556a994040f0de0b fresh重建；最小sequence只使用其payload做故障路径诊断，不证明当前beta.2成功升级。历史Batch3结果不代表本批通过。最终U01—U30、Runtime/Launcher/Portable/Setup、26/742、privacy和独立QA必须有最终候选证据；人工验收仍见HUMAN-ACCEPTANCE.md，未开始。
