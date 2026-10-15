# Fresh Firewall R3 — Master Independent Review PASS / Hosted PENDING

2026-10-15。仅专项准入，不是 Payload/Setup/安装/产品验收。

## 来源与回单

原FRESH-T2 Thread 01a13948-7433-7571-8330-a09bfd12a0dc 已向唯一Master 01a0db0e-c950-79e0-8e11-07155e0742f2 主动正式RETURN。原bea7工作树保留，tracked clean，仅旧.test-work保留。受测实现 b6202d82b5c8b5a0013c369491674536e49b157b，报告2d694f240055e247799b3c7cf785b6a08bbb91d7。

Master受审整合：b397717b→56afe61f；765bdb15→d2295c15；7830d2d5→bb37879e；b6202d82→e40e6044；报告2d694f24→9e18a542。git diff核验受审与整合tools/.github完全相同。代码指纹 ce81d3fa0bad96459d120e50380922ee1cc53ee23dff275fab9fa8bb30069358；排除治理文档算法沿用R1，R3不复用旧预算。

## Master实际独立验证

- 对clean 2d694f24（代码与b620相同）运行同一R3 driver：固定Node24.21.0 EXE hash、Go1.27.1；实际overlay test-c及vet PASS；原13/13、精确Fresh2/2、12/12场景、4/4故障反例，fail0skip0。
- 外层故意污染6个Node/Go变量；driver正常退出0，污染值精确恢复，Master自身原环境也精确恢复。Job empty=true、runner自然退出0/stderr空、forcedTermination=false；owned temp/fixtures/cache/toolchain移除true。不是静态编译冒充实际执行。
- 独立Node严格反例14/14 PASS，含完整12观察、未知/超时/启动失败、来源/敏感额外字段/矛盾/隐藏child failure/显式首失败保留/实际派生PS解析/真实junction拒绝。
- 独立实际Job正常/强制两例PASS：子代归属已实证，正常退出不强杀；强制例naturalSuccess=false，不能伪装产品PASS。
- CJS语法、3个PS脚本、YAML机器parse与单job/45分钟/只读权限/唯一fresh分支及新trigger路径结构、diff-check PASS；旧工作流触发路径互斥已机器读取核验。
- 固定安全证据见本目录FRESH-FIREWALL-R3-MASTER-LOCAL-REPORT.json、MASTER-ENV-PROOF.json、MASTER-JOB-PROOF.json。仅安全固定字段；raw日志仍私有、本地自建control保留，不上传原始内容。

## 边界与安全审查

R2的12场景/原13源码及生产Helper/Launcher/Runtime/Setup/业务/身份/事务/rollback/旧workflow均无修改。R3仅新增11个测试/专用workflow文件。原13派生overlay仅三处固定插入mock guard及逐调用证明，反向还原严格等于原源码；guard在生产script之前验证所有网络/Firewall函数为inline mock，Import-Module亦为mock，无真实规则调用。Fresh mock guard保持R2原样；模拟exact-binding mutation=true不代表系统规则改变。

每个场景固定8字段；early spawn/timeout布尔UNKNOWN，不把无观察写false；COMPLETE仍严格原协议/退出类别/读证据。缺失/重复/非法GoJSON/隐蔽失败/报告extra字段均fail closed。收尾保留首个已证失败和已观察场景；报告齐全但runner异常/强杀/环境或job未证均不能PASS。

本地首轮b397717b的ORIGINAL13 FAIL保留：R3新增JS replacement误解释特殊替换符，已函数replacement及真实解析反例闭合；不是历史R1/C3首因，不能据本地PASS宣称Hosted已修复。R1历史子场景与首因仍UNKNOWN。

## 唯一Hosted准入与停点

R3 0/1，只有Master非force同步及三方HEAD/source/trigger核验后触发独立fresh-firewall-r3.yml。单一新trigger、固定审批标记、唯一parent、只改trigger、source代码指纹、Run ID/attempt1、API历史只有本次Run；Artifact只单文件安全JSON。无实际trigger写入前不消耗额度。

任何PASS/FAIL后均STOP回网页。Smoke1/1历史FAIL、Candidate0/2/QA0/1冻结，旧Full/U27/LC01/其他0；不产品构建安装/内部SPXT/main/tag/Release/未知清理。原Execution已冻结，后续预算由网页另批。