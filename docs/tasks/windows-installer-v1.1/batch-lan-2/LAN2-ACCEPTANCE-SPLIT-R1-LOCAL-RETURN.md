# LAN2-ACCEPTANCE-SPLIT-R1 本地回单

日期：2026-10-13  
状态：`LOCAL IMPLEMENTATION PASS — MASTER REVIEW REQUIRED / FULL NOT RUN`  
唯一回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`

## 结论

已按授权完成 Full 自动验收与人工验收分层。Full 生成器不再启动第二 Launcher，也不再调用弹窗识别、按钮确认或自然退出路径；它只证明受控第一 Launcher、原 private Node、根锁独占、READY/NODE_SPAWN 稳定及既有生命周期/数据门禁。实际第二 Launcher、弹窗、按钮、自然退出和真实双启动全部固定为 `HUMAN_PENDING`。

本回单仅证明本地实现与合成门禁通过。没有运行 Hosted、Full Candidate 或 Final QA，没有生成 `AUTOMATION_PASS_HUMAN_PENDING` 的真实 Artifact 报告。Full Candidate 仍为 0/1，Final QA 仍为 0/1。

## 已确认事实

- 原分支与 Master 基线以普通 merge 同步，未 reset、clean 或 rebase；merge commit：`605c52e67017c172cdf943356d253d03b5c3ea22`。
- 实现 commit：`282e9bed4c75ce76cae3f68491ac335dbd82ff96`，提交信息含 `[skip ci]`。
- 仅改 Full 测试生成器、验收报告/Artifact verifier 和对应测试；未改 `.github`、生产 Launcher、Setup、Node、业务/schema、身份、事务或 rollback。
- 旧 LC01 GUI adapter、历史测试和失败证据保留；本次没有继续 GUI 研究或执行真实 Launcher。
- Artifact verifier 每次都先重新验证既有实际门禁，再创建或验证 `beta4-acceptance.json`；已有报告不可被覆盖，缺/额外文件、不同 source、任一自动 FAIL/UNKNOWN、人工伪造 PASS 均拒绝。
- 历史 LCK03 合成门禁必须精确为 `{status:"PASS",method:"node:test exact passed-subtest mapping"}`；FAIL、UNKNOWN、缺 method 或伪装成真实 Launcher 方法均拒绝。该静态 PASS 只表示旧合成门禁仍通过，实际 LCK03 仍是 `HUMAN_PENDING`。

## 固定验收矩阵

真实 Full 报告只有在下列自动项全部从实际 Artifact 证据得到 `PASS` 时，才允许总状态 `AUTOMATION_PASS_HUMAN_PENDING`：

`portable`、`setupLifecycle`、`upgradeU01U30`、`singleInstanceBaseline`、`firstLauncherAlive`、`privateNodeAlive`、`rootLockExclusive`、`readyStable`、`nodeSpawnStable`、`u05u06StateInvariant`、`persistentInventoryQuiescence`、`compatibilityC01C15`、`historicalLCK03SyntheticGate`、`offlineLifecycle`、`privateSession`、`firewallHosted`、`publicRegression26Suites742Checks`、`artifactPrivacyAndIdentity`。

以下项目固定为 `HUMAN_PENDING`，不得由自动报告改成 PASS：

`firstAdminCreationAndBrowserLogin`、`twoAccountConcurrentReadSaveAttachment`、`originalBackgroundStableDuringSecondLaunch`、`actualSecondLauncherStart`、`dialogText`、`dialogButton`、`secondLauncherNaturalExit`、`doubleLaunchBehavior`、`normalExitRestartDataRetained`、`visibleInstallerWizard`、`visibleShellLaunchPage`、`physicalWindows10`、`realAdapterSelection`、`uacPrompt`、`firewallAuthorization`、`physicalSecondDevice`、`lanEndToEnd`。

锁矩阵中 LCK01、LCK02、LCK04—LCK14 的自动证据必须 PASS；LCK03 的历史 node:test 合成门禁必须 PASS，但报告中的实际 LCK03 固定为 `HUMAN_PENDING`。报告同时固定 `secondLauncherStarted=false`、`doubleLaunchProven=false`、`enterpriseLanCertified=false`。

## 本地验证

- 最终 commit 绑定的兼容/事务/锁/验收报告：75/75 PASS，fail0、skip0；LCK03 原始 method 精确匹配。
- 最终 commit 的拆分/历史第二 Launcher 测试：6/6 PASS，fail0、skip0。与上项合计为同一五文件集 81/81。
- 历史 LC01 测试：20/20 PASS，fail0、skip0。
- 固定 Go `go1.27.1 windows/amd64`：全新生成 overlay 编译 PASS；生成的 `upgrade_windows_test.go` 不含 `checkSecondLauncher`、`secondResult`、`PostMessageW` 或 `DialogReason`。生成 EXE 未运行。
- 5 个相关 CJS `node --check` PASS；`git diff --check` PASS。
- 未执行本地公开回归 26 suites/742 checks，因为该门禁属于真实 Full Artifact；verifier 仍精确要求 26/742、fail0、skip0，不能由本地固定值替代。

## SHA256

- `prepare-hosted-harness.cjs`：`f75214cfb45a90c6a8c6a544e5c8bca115f6540e27f896d19e5061e678f1d898`
- `acceptance-report.cjs`：`422b1a583bfe5756583e7a5f45952e1ab289a4356930618dda766750bb58bf5b`
- `verify-artifact-beta4.cjs`：`283ae842fc7bece66418b60e6e2695a7b232f262d7a0dce3ddf8c5251792961f`
- `final-acceptance.test.cjs`：`89f85a1c649c016e73f9ac934bb550f5d5668b59faecf64e64763c936b9fdc79`
- `second-launcher.test.cjs`：`c1408d83550a731bf465b8847a01c8a4fa827a58f6273b1894c84e125fd68fb2`
- 本地兼容报告 `.test-work/acceptance-split-r1-compatibility-282e9be.json`：`2ea60c18f6614b9afe7fae07d2db21b352d2899d64af930b3d4ea08709e64c0a`
- 最终生成 `upgrade_windows_test.go`：`137f856abdb11146b86c4ca22137d875ba0f8f9b1b3a7d827a1fa9664cc27f57`

## 未验证与风险

- 未运行真实安装、升级、Launcher、Setup、解包、VM、网络系统操作或业务数据访问。
- 未证明实际第二 Launcher 会显示精确弹窗、按钮可用并自然退出；历史 Full #4 与 LC01 FAIL/UNKNOWN 不变。
- 未证明物理 Win10、真实网卡选择、UAC、Firewall 授权或第二设备 LAN。
- 真实 Artifact 的 26/742、U01—U30、Firewall、offline、private session、privacy/identity 仍须未来唯一 Full 实际通过；本地合成 PASS 不能替代。
- 下一步只能由 Master 独立 Review；本线程不得 push、运行 Hosted/Full/QA 或追加预算。
