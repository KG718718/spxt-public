# LAN-2 Final Full #4 止损｜2026-09-28

状态：`BLOCKED — FINAL FULL #4 FAILED / OFFLINE_LIFECYCLE SECOND LAUNCHER TIMEOUT`。

## 固定事实

- 网页版只批准一次 `.launcher.lock` 运行期控制与持久业务清单分层修正。原 LAN2-T3 长期 Thread/原工作树主动回单 local `197932d`/`bfa84d3`，Master Review 整合 `d135f64`/`003cdb3`。仅 beta.4 测试 overlay、反例与报告改变；生产 Launcher、Setup、beta.2→beta.4 可信身份、事务、rollback、业务 schema 均未改。
- Master 在整合分支独立验证 lock 27/27、兼容 72/72 fail0skip0、C01—C15/LCK01—LCK14 PASS；生成 Go overlay 后固定 Go 1.27.1 离线编译 PASS。这些本地门禁不等于真实 Hosted 生命周期通过。
- 唯一 Final Full #4 Run `36388264496`，受测 source `2e9294d9a61426dac428f7c8ff8a12d36a4bbbb8`，失败 Artifact `10955343405`。GitHub conclusion failure；固定 `beta4-ci-stage.json` 为 `OFFLINE_LIFECYCLE FAIL`，`ci-test-environment.json` 为 `PIPELINE_FAILED`、environmentRestored=true。
- 实际 `TestUpgradeLifecycle` 中 U01 PASS 后，新增的第二 Launcher 有界退出门禁报固定 `second Launcher did not exit`，随后测试 FAIL。U05/U06、后续 persistent inventory、rollback/uninstall/reinstall 均未到达。现有证据不能判定第二 Launcher 是否取得了锁，也不能证明是产品故障还是测试预期/交互时序问题；不推断唯一根因。
- `BETA4-INSTALLER-TEST-REPORT.json` 局部状态 `AUTOMATED_PASS_HUMAN_PENDING`，升级总报告 FAIL。`offline-network.json` 总状态 FAIL，但固定 externalDuring=false、restored=true、firewallChanged=false；`lan-node-test-environment.json` PASS。不得把局部 PASS 改称候选通过。
- 核心 26/742、最终 Artifact privacy、独立 Final QA 均未到达；无 beta.4 最终 Setup Artifact。Full #1—#3 原失败历史与 Artifact 均保留。

## 立即停止

用户明确规定 Full #4 任何失败均停止。Final Full #4 1/1 已用，Final QA 0/1 未用且不得挪作调试；不申请 Full #5、不新增 Diagnostic Hosted、不再派生产或测试返工。T1/T2/T3、原长期 Thread、任务分支、工作树与固定证据全部冻结保留。仅治理文档收尾并非 force push `codex/lan2-manual-host-v1.1`；不得操作 main、tag、Release、Batch5、OCR。

Batch 4.5 仍为 `FROZEN — LAN HOST DEFERRED`。正式用户基线仍是受验 `1.1.0-beta.2` 单机轨道；LAN-2 beta.4 不是交付候选，LAN 未发布/未认证，也未进入 LAN HUMAN PENDING。下一步由网页版决定是否另立有界范围与预算或冻结 LAN-2；当前授权不能继续。
