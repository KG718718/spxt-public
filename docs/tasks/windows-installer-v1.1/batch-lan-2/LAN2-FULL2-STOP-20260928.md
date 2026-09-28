# LAN-2 Full #2 止损｜2026-09-28

状态：`BLOCKED — FULL HOSTED BUDGET EXHAUSTED; OFFLINE_LIFECYCLE FAILED`。

## 已确认事实

- 唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；分支 `codex/lan2-manual-host-v1.1`。LAN2-T1/T2/T3 使用各自既有长期 Execution Thread、任务工作树和本地分支；工作树与历史证据保留。
- Full #1：Run `36379556816`，受测 `9ba5a337cc7c6d24a39d8ac21cec49280af8b7b4`，失败 Artifact `10951969499`，阶段 `FROZEN_REGRESSION`。历史 sequence 静态测试跨 job 误读；原 T3 local `e517c22` 经 Master Review 整合 `502c81d`。Full #1 仍记 FAIL，不追溯改写。
- Full #2：Run `36380488652`，受测 `f15170389a915dcf245c8ae721ef46d0d9201c38`，失败 Artifact `10952926928`，GitHub 结论 failure，固定阶段 `OFFLINE_LIFECYCLE`，`ci-test-environment.json` 也为该阶段 `PIPELINE_FAILED`，`environmentRestored=true`。
- Full #2 已越过受验 F3 beta.2 Setup 精确下载与哈希校验、LAN Node 44/44 fail0skip0、beta.4 兼容事务 45/45 fail0skip0、工具链/Setup 构建。安装报告为 `AUTOMATED_PASS_HUMAN_PENDING`；升级报告整体 `FAIL`，其中 U01/U02、U05—U25 的已记录项目为 PASS。局部 PASS 不能替代完整升级验收。
- 运行日志最后一个具体错误：读取 synthetic instance 的 `.launcher.lock` 时返回文件被其他进程占用；对应 `TestUpgradeLifecycle` FAIL。可能涉及进程退出与清单读取的时序，但**尚未证明唯一根因**，不得直接修改保护规则或把锁文件从安全清单排除。
- `offline-network.json` 总状态 FAIL，但固定字段为 `externalDuring=false`、`restored=true`、`firewallChanged=false`。它未证明网络隔离本身失败，也不能据此宣称完整 offline lifecycle PASS。
- 核心 26 suites/742 checks、最终 Artifact privacy、独立 QA 均未到达；无最终 beta.4 Setup Artifact。Full 2/2 已用，QA 0/1 未用且不得挪作调试。

## 停止边界

LAN2-T1/T2/T3 及工作树冻结保留；不再派返工、运行 Full/QA/Hosted 或交付 beta.4。只允许治理记录与唯一开发分支非 force push。不得操作 main、tag、Release，或进入 Batch5/OCR。Batch 4.5 保持 `FROZEN — LAN HOST DEFERRED`；现行可用基线仍为 Batch 4 受验 `1.1.0-beta.2` 单机轨道，LAN 未发布/未认证。

## 网页版需决定

方案 A：另批有界工程续行，明确新增 Full 额度和止损条件；原 LAN2-T3 在原 Thread/工作树先以锁文件占用反例定位进程生命周期，再由 Master Review 后决定是否调度新 Full。不得预设只靠忽略锁文件、睡眠或无修改 retry 可解决。

方案 B：冻结 LAN-2，保留本轮代码与证据，另行规划 LAN Host。

在获得新决定前，当前状态保持 `BLOCKED — FULL HOSTED BUDGET EXHAUSTED`。
