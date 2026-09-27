# B45-QA T5 R2 Retest

## 结论

**PASS（仅 T5 原两个 P2 的设计与本地合成复验）**。精确冻结公开 HEAD：`51d4f7f420628b2fe69f535baff828e140519a9e`；重点审查提交：

- `e894881b283f283501071ebf8f01fd4eed36ad11`
- `b2471bbabeac6b3983768bfdb7a7439dce5f6ec8`

原 `T5-STAGE-REVIEW.md` 的阶段 FAIL 作为历史保留，不改写。文件事务原子性 P2 已由可执行合成反例闭合；登记恢复 P2 已在代码顺序、完整快照/readback 契约及失败固定非 PASS 层面闭合，但本机未调用真实 Windows Registry API，也未运行实际 Setup。真实双视图 `reg.exe export/import` 和安装失败生命周期仍是 Hosted 门禁 PENDING，不能据本报告宣称实机完整登记恢复 PASS。

## P2-1：完整登记快照、恢复及失败语义

### 已确认的设计闭合

- `ReadUpgradeIdentity` 在进入升级前调用 `SnapshotUpgradeRegistration`；64 位 ProductKey/BindingKey 必须存在并完整导出，32 位两键分别记录原始存在/缺失状态，存在时完整导出。
- 每个 `.reg` 快照在任何登记删除前均检查普通文件、非目录、非 reparse、非空 SHA-256 且内容 hash 与内存锚一致。`FaultRegistryRestore` 的合成损坏发生在校验之前、删除之前，因此快照异常不会先破坏当前登记。
- 恢复先删除 ProductKey/BindingKey 的 64/32 位完整键，消除 beta.3 新增值；随后只导入升级前实际存在的完整快照。原本缺失的 32 位键必须继续缺失。
- import 后重新导出四个视图中原本存在的键，并与原快照 SHA-256 比较；因此值名、值类型、值内容及子键集合的差异都会导致恢复失败。实际导出字节稳定性仍须由真实 Windows 门禁确认。
- `DeinitializeSetup` 的顺序已固定为：文件 rollback 成功 → 登记 restore/readback 成功 → `complete-rollback` 成功 → 才记录 `KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK`。文件、登记或完成清理任一步失败只记录 `KSESSION_UPGRADE_ROLLBACK_FAILED`，不再假报成功。

### 本地证据边界

静态定向测试 `beta3 rollback snapshots complete registry views and restores registration only after file rollback`：1/1 PASS。该测试验证完整快照符号、hash/reparse 校验先于删除、删除/import/readback 顺序、故障 marker 及成功日志顺序；它不执行真实 `reg.exe`、HKCU32/HKCU64 或 Inno Setup。

## P2-2：提交点、清理失败及幂等恢复

### 已确认的设计闭合

- `finalize` 在任何 recovery rename/delete 前先以 `wx` 创建 install-root 外置 `COMMITTED` marker。marker 一旦存在，`rollback` 固定以 `PHASE_INVALID` 拒绝，不能因 journal 被部分删除而反向恢复 beta.2。
- recovery rename、首次删除、删除中途丢失 journal、或 marker 最终删除失败时，`finalize` 返回成功但明确标记 `TRANSACTION_COMMITTED_RECOVERY_PENDING`；beta.3 program/install-state 保持不变。再次 `finalize` 只继续幂等清理，不执行 rollback。
- 文件 rollback 完成后 journal 固定为 `ROLLED_BACK` 并保留 recovery，供登记恢复。登记确认后 `completeRollback` 先建立外置 `ROLLED_BACK` marker，再清理 recovery；journal 部分删除或清理异常时可再次进入，且不会重新交换 program。
- commit 内部 fault 的实际 CLI 链已覆盖：commit 返回固定 `COMMIT_FAILED_ROLLED_BACK` → 显式 rollback 验证并返回 registry pending → complete-rollback 清理完成，旧 install-state 保持精确字节。

### 本地测试结果

本机 Node `v24.14.0`（不是目标 Runtime `24.21.0`）运行：

```text
node --test tools/tests/windows-installer/beta3-upgrade/transaction.test.cjs
tests 25 | pass 25 | fail 0 | skipped 0

node --test --test-name-pattern="beta3 rollback snapshots complete registry views" \
  tools/tests/windows-installer/beta3-upgrade/compatibility.test.cjs
tests 1 | pass 1 | fail 0 | skipped 0
```

25 项包含三个 commit fault、install-state write/rename fault、CLI rollback/complete 链、commit marker 后 recovery rename failure、首次/中途 committed cleanup failure、journal 删除、rollback cleanup failure及重入。`node --check` 两个事务文件与相关 `git diff --check` 均 PASS。

## 范围与剩余门禁

- 本轮没有运行真实 Registry、NIC、Firewall、UAC、Setup EXE 或 Hosted；没有消耗专项/Full/QA Hosted 预算。所有数据、路径和故障均为合成。
- 登记恢复的真实结论仍需 Hosted 实际 beta.2→beta.3 fault Setup：比较升级前后 ProductKey/BindingKey 的 64/32 位完整值集合、类型、内容和原始缺失状态，并确认 restore failure 固定非 PASS。
- T5 仍在另行完善 CI 名单与派生 harness；本轮未读取或修改其 WIP，也未重复 T3 已关闭问题。
- 本 PASS 不是 T5 整体完成、Artifact privacy PASS 或 Batch 4.5 最终 QA，不授权 push、main、tag、Release 或跳过后续完整门禁。
