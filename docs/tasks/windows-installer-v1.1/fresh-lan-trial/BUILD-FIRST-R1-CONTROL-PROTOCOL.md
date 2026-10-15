# Build-First R1 — Master控制协议

仅供Master构造最终受审控制提交，Execution不创建真实trigger、不运行Hosted。独立workflow `.github/workflows/fresh-build-first-r1.yml`；唯一触发文件 `docs/tasks/windows-installer-v1.1/fresh-lan-trial/build-first-r1-trigger.json`。旧hosted-trigger及C1/C2/C3不可复用。

控制提交必须只有一个父提交和该trigger一项diff；subject/full message必须精确为 `FreshBuildR1 SLOT TESTED_SOURCE`。`reviewedSource`必须等于控制提交父；Smoke/Candidate testedSource=reviewedSource；QA testedSource=已成功Candidate受测源码。approvalMarker为 `BUILD_FIRST_R1_MASTER_REVIEWED_SLOT_REVIEWED_SOURCE`。

trigger必须精确13个键：schema(1)、mode、slot、reviewedSource、testedSource、approvalMarker、smokeRunId、smokeArtifactId、firstCandidateRunId、firstCandidateArtifactId、candidateRunId、candidateArtifactId、candidateSetupSha256。未使用的引用必须空字符串，不能缺键或null。

| slot | mode | 必需引用 |
|---|---|---|
| R1S1 | SMOKE | 全部引用空；此前R1专用workflow无Run |
| R1C1 | CANDIDATE | 成功Smoke的run/artifact；代码指纹相同且祖先来源 |
| R1C2 | CANDIDATE | 成功Smoke；R1C1失败run+固定安全failure artifact；cleanup全true；执行代码指纹有变化及重新本地构建/Review |
| R1Q1 | QA | 成功Smoke；首个完整PASS Candidate的run/artifact/Setup SHA；同Candidate source，不重构 |

每个引用验证同R1workflow/path/branch/attempt1、artifact所属run/control、title/source、控制提交父子/trigger-only diff；报告严格验证并核验源代码指纹。不能用run.success替代完整报告。代码指纹覆盖所有tracked树项，仅精确排除docs/和根AGENTS.md、PROJECT.md。Candidate2的纯治理变化不算代码修改。

R1 workflow任何先前Run即使非法title/错误mode或slot/早期失败/取消/attempt重复也不忽略；未知预算立即拒绝。Smoke失败停止所有后续；首Candidate PASS不再允许第二；QA后恢复结束。中央账本总上限1 Smoke+2 Candidate+1 QA，45分钟。

Smoke成功Artifact名 `K-SESSION-build-first-r1-smoke-SOURCE`，只有smoke-report.json，不含可安装EXE。Candidate成功名 `K-SESSION-build-first-r1-candidate-SOURCE`，原严格7文件。QA成功名 `K-SESSION-build-first-r1-qa-SOURCE`，原fresh-report.json。失败名 `build-first-r1-safe-failure-RUN`，仅校验后的固定安全JSON；未知或早期报告不可充当C2安全失败前提。

Smoke只构建真实完整payload及Setup编译/identity、必要测试与恢复，不安装、不启动构建产品EXE、不运行F01—F09/浏览器；原44合成loopback测试不代表实际安装。独立BUILD_SMOKE_PASS不等于Candidate/安装/LAN PASS。只有旧严格Candidate+同EXE独立QA闭合才FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING。
