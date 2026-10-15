# FRESH-T2 R3 RETURN — LOCAL PASS / MASTER REVIEW PENDING

2026-10-15。原 FRESH-T2、原 bea7/public-source、codex/fresh-t2-installer-ci。本轮实现已冻结；仅本地提交与回单，Hosted 0/1、无真实 trigger、无 push/Actions。R1 Smoke 历史 FAIL 不改，Candidate 0/2、独立 QA 0/1 继续冻结。以下不构成 Hosted、完整 payload、Setup、安装或 LAN PASS。

## 已确认结果与来源

- 最终受测提交：`b6202d82b5c8b5a0013c369491674536e49b157b`。INIT 实际校验 HEAD、tracked clean、源码 blob 与 codeFingerprint 后才运行。所有本地报告明确 `execution=LOCAL`、`run.id=LOCAL`、attempt=1；LOCAL controlCommit 等于受测 source，不冒充 GitHub Run。
- codeFingerprint：`ce81d3fa0bad96459d120e50380922ee1cc53ee23dff275fab9fa8bb30069358`。沿用 R1 的 git ls-tree 算法，排除 docs/、AGENTS.md、PROJECT.md。此后只有报告提交，代码指纹应保持相同。
- 固定 Node 24.21.0：实际 runner 版本与 node.exe SHA256 均符合 distribution.json；固定 Go 1.27.1 windows/amd64，沿用已核验公开审计工具链，只读使用。
- 实际同一 R3 driver：overlay `go test -c`、`go vet` PASS；原 Firewall 13/13、Fresh 2/2（含全部 12 个精确子场景）、故障反例父测试 1/1 与四个精确子项 4/4 PASS，全部 fail0/skip0。
- 12 场景都为 COMPLETE，mockVerified、requiredReadsObserved、expectationMatched、pathProven 均 true；仅 exact-binding 的 mutationObserved=true（模拟写入），其余 false。四反例为 guid-changed_ADAPTER_ABORT、guid-changed_ROUTE_ABORT、unknown-virtual_ADAPTER_ABORT、guid-changed_MISSING_MOCK。
- Job Object 实际包含 runner 及后代；最终 runner 自然退出 0、stderr 空、Job ActiveProcesses=0；forcedTermination=false。外层环境原值恢复、owned temp/fixtures/cache/toolchain 目录删除均 true。外部只读工具链和既有 .test-work 历史不删除。
- 外层故意污染 NODE_OPTIONS、NODE_PATH、GOFLAGS、GOEXPERIMENT、GOPROXY、GOSUMDB 六变量；完整 driver PASS 后逐项实查与污染原值完全相同。控制 Node 的 INIT/CLEAN/finalize 也在单独保存/清空/恢复的 NODE_OPTIONS/NODE_PATH 中执行。
- 最终源码严格反例 14/14 fail0/skip0；实际 Job 正常/强制两例 PASS。新 CJS、全部 PS 及机器 YAML parse/inline PS parse PASS；git diff --check PASS。

## 实现边界

新增 `.github/workflows/fresh-firewall-r3.yml` 和 `tools/tests/fresh-lan-trial/firewall-r3/`，无旧 workflow/生产改动。只对新的集成分支 push + 新 trigger 路径生效；read-only permissions、固定 action commit、45 分钟 job、35 分钟执行步骤、共享互斥、不 cancel、不接受 attempt2。新契约要求唯一父 source、只有 trigger diff、精确标题/approvalMarker/指纹，API 总记录必须只有本次 Run；历史失败或取消均消耗唯一额度。Execution 未创建该 trigger。

原 shared Firewall13 blob 保持 `d75dce2f5780895da3bc9e99137f84ddf8b89d6a`；R2 原 12 场景模板 blob 保持 `2994781e4a1eaabd2440d7f5c08fd9c9271b0d98`，均与授权合并基线 ee171791 相同。生产 Go、业务、Setup、版本、安全、旧信任/事务/rollback 零 diff。

原13在 owned overlay 内仅三处固定单次替换：注册调用序号、传入序号、在原 inline 模拟 harness 与原生产脚本之间加入 mock guard。每次生成都逆向三替换并逐字比较原源码；原断言、期望码和生产脚本未改。实际 PowerShell guard 执行前检查全部17个 Cmdlet 为 inline function；Go invocation ledger 与 guard witness 要求精确一一对应、无重复。缺少证明固定 ORIGINAL13/EVIDENCE_INVALID，不能仅凭退出0通过。R2全12沿用其原 inline mock/reads/path 证明，四负例也执行原 R2 测试。

同一 Job 使用门文件保证 runner 被 Assign 后才启动 Go/PowerShell；正常 PASS 禁止终止 Job。异常、超时、stderr、进程归属/退出未知均不能 PASS。owned 清理先核验本次 marker/物理根、拒绝链接，完整遍历/摘要核对后只删本次 work；真实 junction 反例证明链接目标 sentinel 保留。

安全报告固定单 JSON：source/control/codeFingerprint/run/schema 严格绑定，13/Fresh2/负例父计数分组，12×8字段与四负例精确顺序/数量，拒绝额外字段与隐私载荷。GO_START/TIMEOUT 未观察布尔值映射 UNKNOWN；未执行项 NOT_REACHED。正常 Go JSON 复用旧严格 classifier，隐蔽子失败、未知 action/字段、缺失/重复子项均拒绝。首个明确失败及已知场景在后续 outer/cleanup 失败时保留；已有失败即使计数矛盾地全 PASS 也不能提升。合法早期失败只有固定 SOURCE/UNKNOWN 安全 schema。

## 可复核命令和本地证据

固定 `$NodePinned`、`$GoPinned` 使用本次已核验工具路径；`$Control` 是新建且唯一的本地 control 目录，其 context 绑定当前 clean 提交及 git ls-tree 指纹。

```powershell
& $NodePinned --test tools/tests/fresh-lan-trial/firewall-r3/contract.test.cjs
& pwsh -NoProfile -File tools/tests/fresh-lan-trial/firewall-r3/job.test.ps1 -Node $NodePinned -Evidence $NewOwnedEvidence
& ./tools/tests/fresh-lan-trial/firewall-r3/driver.ps1 -ControlRoot $Control -Local -Node $NodePinned -Go $GoPinned
```

driver 实际执行（cwd=tools/windows-firewall）：

```text
go test -c -overlay <owned overlay.json> -tags fresh_trial_tests -o <owned scope.test.exe> .
go vet -overlay <owned overlay.json> -tags fresh_trial_tests .
go test -overlay <owned overlay.json> -tags fresh_trial_tests -json -count=1 -run ^(<原13精确名称>)$ .
go test -overlay <owned overlay.json> -tags fresh_trial_tests -json -count=1 -run ^(TestFreshStrictBindingAndStandardSchemaIsolation|TestFreshFirewallBindingBeforeAnyMutation)$ .
go test -overlay <owned overlay.json> -tags fresh_trial_tests -json -count=1 -run ^(TestFreshFirewallHarnessCannotMaskInfrastructureFailure)$ .
```

完整原13名单由 expected-go-tests.cjs 导入，Fresh2 名单由 helper-go-diagnostic.cjs 导入，不以动态发现或少跑测试代替。环境固定 windows/amd64、CGO0、GOTOOLCHAIN=local、GOPROXY/GOSUMDB/GOENV/GOWORK=off，测试期间 GOFLAGS/GOEXPERIMENT/NODE_OPTIONS/NODE_PATH 清空。

- 最终 control：`.test-work/firewall-r3-local-0e5235fc-99f3-4568-a6bc-fb378d1fffbc/`，其中 `publish/` 仅有 `firewall-r3-report.json`；verify 实际通过。`outer-environment-proof.json` 固定记录六变量精确恢复。private raw 留在 control，不上传。
- Job 正常/强制证据：`.test-work/firewall-r3-job-20b4b42cbb8f44d3b9650f8f3ab0428c/result.json`。
- 便于 Review 的最终安全 JSON 同字节副本：`FRESH-FIREWALL-R3-T2-LOCAL-REPORT.json`，SHA256 `3d7a81625e442805ffae2ce750850ae443592387a230f87e5e9f5dac3282064a`。
- 本地首轮 b397717b FAIL 原样保留：`FRESH-FIREWALL-R3-T2-FIRST-LOCAL-FAIL.json`，SHA256 `d4e790fa54ed1b102c4587be77861e0ccf4c49a73abd3e53945a6890c2a63f4e`。该轮 ORIGINAL13 为12PASS/1FAIL，Fresh2/12/4仍PASS，完整场景及正常 Job/清理证据均保留。已确认是新 R3 guard 的 JS 字符串替换误解释 `$'`，导致派生 PS 解析失败；函数 replacement 修正与真实派生 PS parse 反例已加入。不是 R1/C3 历史根因证明。
- 中间 clean 提交 765bdb15、7830d2d5 各完整 driver PASS，原 control 和安全 JSON 保留；最终结论绑定最终 b6202d82，不用中间 PASS 代替最终测试。

## RETURN 与下一步边界

实现提交依次：b397717b、765bdb15、7830d2d5、b6202d82。授权合并提交 ee171791（父含724df0f3）不属于新实现。此 RESULT 与两个安全 JSON 另作报告提交，不改实现。

Execution 正式 RETURN 并冻结。Master 独立 Review/独立实际复测仍待完成；只由 Master 在相同代码指纹、三方 HEAD 和预算核验后创建唯一控制提交/触发 Hosted。本回单不执行这些动作，不申请新预算，不继续扩展诊断。历史 FAIL、UNKNOWN、冻结预算与物理验收未证均保留。
