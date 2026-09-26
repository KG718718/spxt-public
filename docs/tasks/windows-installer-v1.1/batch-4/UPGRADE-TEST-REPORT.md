# Batch 4 测试报告

## 最终工程验收结果

**BLOCKED — AUTOMATION PASS / QA PASS / HUMAN PENDING**。

| 轮次 | source / Run / Artifact | 实际结果 |
| --- | --- | --- |
| D5 | 22bacc5d45278bdff838d5a002bf7121085751b3 /36245606056 /10907850207 | 18阶段全部闭合；U22专用hash拒绝、无旧program swap、六类旧状态精确不变 |
| F3产品 | c8886e6b6d413c2fd73d6716621d07a80b337e58 /36246132535 /10907910968 | U01—U30 PASS，26 suites/742 checks/fail0/skip0；Runtime/Launcher/Portable/Setup、29项I自动检查、D01—D13、offline和Artifact privacy PASS |
| QA1 | 4f95e981c6b765e3ab225778508801eadbc20df3 /36249047967 /10908731584 | 仅qa-static 34s PASS，其余4 jobs skipped；历史静态门禁逐条非零即停与真实反例闭合 |

F3原historical静态测试70/69/1的假绿由QA首轮FAIL发现；原T4仅修CI/静态测试并用QA1补证，产品/构建/payload/身份及生命周期输入完全未改。首失败日志与独立报告保留，不追溯伪称原测试通过。最终QA localcaf034f→主控e124722 PASS。

主控独立内存重算ZIP SHA256 e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6，EXE SHA256877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6，12文件白名单与安全报告PASS。I01/I02/I09仍人工PENDING；Win10十步见HUMAN-ACCEPTANCE.md。以下为前轮历史报告，其“尚无/当前”用语指当时状态。

状态：**BLOCKED / D4 PASS / F2 FAIL / HOSTED BUDGET EXHAUSTED**。尚无完整Batch4 PASS或最终beta.2 Setup Artifact。各轮身份独立，不合并局部PASS冒充最终全项通过。

| 轮次 | Run / source | 实际结果 |
| --- | --- | --- |
| D1 | 36208733404 / 4319e08694b6660477397102af20d95eb25062b4 | PRE八阶段完成；BASELINE=IDENTITY_REGISTRATION_VERSION/UNCHANGED |
| D2 | 36209825354 / 9e070de4efa7bc10118a7942c33d24b51cb326d0 | 17阶段PASS；身份恢复及U20_PRECOPY均接受且UNCHANGED |
| F1 | 36210201290 / 6fdb7ed19467ac64a80c2f4824b4dfe0431fc62d | fresh Setup29自动PASS/3人工PENDING，D01—D13 PASS；U01/U02/U15—U18/U20 PASS后U21意外success；后续未执行 |
| D3 | 36212532363 / b3ab5978ca90be3fa5d3c5f793735fc42879ffc6 | 前17阶段+U21 COPY_FAILED/UNCHANGED；U23 POST_COPY_MARKER_MISSING/UNCHANGED |
| D4 | 36213904038 / d7ef3964b8fdbf1979dc527e0b65fa202c398ab0 | PASS；19阶段，U23八节点齐全、非零退出且UNCHANGED |
| F2 | 36214270618 / 23ab36bff1e953e14fd5a213d1c9fb759997ee9c | fresh Setup29自动PASS/3人工PENDING、D13/13；U01/U02/U15/U16/U17/U18/U20/U21八项PASS；U22期望prepare-failure marker缺失，后续未执行 |

F2首失败：upgrade_windows_test.go:653，KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED缺失；实际GATE_ACCEPTED、TRANSACTION_PREPARED、NATIVE_COPY_COMPLETE、POSTINSTALL_FAILED、TRANSACTION_ROLLED_BACK，exit4，耗时9610ms。主控只读取固定诊断，未将原始安装日志保存到开发机或另行上传。U22 marker断言先于exact owned/instance状态比较，故不能以rollback marker替代恢复验收。

F2失败Artifact10897445184（digestc6f01ed8ef890629feef8724ffbf9f04ef012e28f6168416ba94aa2792190bdb），INSTALLER report source精确匹配受测commit，UPGRADE status FAIL且只有八项checks。offline status FAIL反映生命周期失败，但externalDuring=false、restored=true、firewallChanged=false。报告中的受测候选EXE SHA256为d82401a7128e362558f10130498e1c161e952eb4875ad69ce8d5595cd525dd72；不是已交付最终Artifact。公开742回归、最终privacy和Setup上传步骤均SKIPPED（不是通过）。历史identity job108326997379 PASS；不代替其余门禁。

F1 offline证据externalDuring=false、restored=true；失败未导致网络遗留隔离。F1未执行742回归或最终Artifact隐私门禁。D2/D3闭合JSON通过严格字段/顺序/固定枚举及报告隐私审查，不能替代发行Artifact privacy。

当前本地：主控生命周期+事务23/23、纯Go两项、PS AST PASS；执行联合89项88 PASS/1本机alias SKIP，preflight21项20 PASS/1本机symlink权限SKIP，npm26 files/failed0。这些本机SKIP不满足Hosted skip0要求，也不冒充742 checks。

beta.1始终由固定公开e9417f036d0cdf736ff84682556a994040f0de0b fresh重建；最小sequence只使用其payload做故障路径诊断，不证明当前beta.2成功升级。历史Batch3结果不代表本批通过。最终U01—U30、Runtime/Launcher/Portable/Setup、26/742、privacy和独立QA必须有最终候选证据；人工验收仍见HUMAN-ACCEPTANCE.md，未开始。
