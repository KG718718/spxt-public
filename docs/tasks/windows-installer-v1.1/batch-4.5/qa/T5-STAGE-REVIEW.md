# B45-QA T5 Frozen Stage Review

## 结论

**FAIL / NEED REWORK（仅 T5 冻结阶段提交）**。本次只读审查的精确提交为：

- `fe7cb3c7167acdb82743104352d1d54ab3725997`
- `f053b907e08be75c75aed734a78fb4c39671d3b6`
- `dc45119263553a042f87f5eda82d414457184a8d`

确认两个 P2：升级失败时登记恢复不是精确、可验证的恢复；事务 `finalize` 在递归删除 recovery 失败后仍会进入依赖该 recovery 的 rollback。两项都违反既有“失败后精确恢复且不得混合版本”的门禁。此结论不包含 T5 工作树后续未冻结修改，也不是 Batch 4.5 最终 QA 结论。

## P2-1：登记恢复仅覆盖六个字符串值，且失败不可见

### 已确认事实

- `setup-beta3.iss:339-361` 的 `ReadUpgradeIdentity` 只保存 64 位 ProductKey 的 `DisplayName`、`DisplayVersion`、`InstallLocation`、`UninstallString`，以及 BindingKey 的 `InstallRoot`、`Instance`；32 位视图只做部分一致性检查，没有形成可恢复快照。
- `setup-beta3.iss:538-546` 的 `RestoreUpgradeRegistration` 只写回上述六值；所有 `RegWriteStringValue` 返回值均被忽略，也没有删除升级期间新增的 beta.3 值、恢复原值类型/缺失状态或执行恢复后 readback。
- `setup-beta3.iss:759-767` 只依据文件事务 CLI 的 rollback 结果记录 `KSESSION_UPGRADE_TRANSACTION_ROLLED_BACK`，随后调用无返回值的登记恢复过程。因此日志可以报告事务已回滚，但登记恢复实际失败或不完整。
- 冻结测试没有对完整 ProductKey/BindingKey 值集合、值类型、原本缺失值、写入失败和恢复后 readback 建立反例。

### 基于证据的影响判断

Inno 升级可能改写不在六值集合中的卸载登记元数据；`EstimatedSize` 等 Inno 管理值属于可能受影响字段示例，而不是本次静态审查已在真实注册表中复现的具体变化。当前实现无法证明 post-copy/finalize 失败后登记与 beta.2 精确一致，也无法排除 beta.3 残留值或写回失败造成的 program/registration 混合身份。

这与 `batch-4/SPEC.md:18-20` 的旧 program、installer metadata、registration、binding、shortcuts、business instance 精确保持/恢复及“无混合版本、半升级、双登记”要求冲突；`COMPATIBILITY-APPROVAL.md:10` 明确要求原 rollback/instance 保护不得削弱。

### 必须闭合

对安装器拥有的 ProductKey/BindingKey 建立严格的完整值名、值类型、值内容、存在/缺失状态及 registry view 快照；失败时移除 beta.3 新增值、恢复旧值并 readback。任一步失败必须固定返回 rollback failure，不能记录成功 marker。实际 Setup 故障矩阵须比较升级前后完整登记，而不只比较六个选定字符串。

## P2-2：`finalize` 清理失败会破坏唯一 recovery 后再尝试回滚

### 已确认事实

- `transaction.cjs:332-338` 在校验 beta.3 program/install-state 后，直接对唯一 recovery 目录执行 `fs.rmSync(..., {recursive:true, force:false})`；只有完整删除成功才返回 `TRANSACTION_COMMITTED`。
- 递归删除不是本事务定义的原子操作。删除中途异常时，CLI 返回失败，但 recovery 可能已经丢失部分 `program`、`uninstall`、shortcuts 或 journal。
- Setup 因 `finalize` 非零不会设置 `TransactionFinalized`，随后 `DeinitializeSetup` 会再次调用 `rollback`。该 rollback 此时依赖可能已被部分删除的同一 recovery。
- 冻结测试只覆盖正常 `finalize` 后 recovery 不存在；没有注入清理开始/中途失败，也没有验证该路径下 program、uninstall metadata、shortcuts、登记、binding 和 instance 的精确最终状态。

### 基于证据的影响判断

若清理已删除旧 program 或 old uninstall 的一部分再失败，后续 rollback 可能无法恢复 beta.2；结合 P2-1，最终可能形成 beta.3 program 配 beta.2/残留登记，或不完整旧 program。这里确认的是事务设计允许该失败状态且无测试闭合；本轮未在真实 Windows 文件系统注入该故障。

### 必须闭合

为提交点与 recovery 垃圾回收定义不会反向触发不可能 rollback 的语义，例如先建立持久、可判定的 commit 状态，再把提交后的 recovery 删除失败作为可重试清理，而不是失败安装回滚；或采用等价的、可证明仍保有完整恢复源的方案。至少增加 cleanup 开始和中途失败反例，验证不得出现混合版本，且日志/退出码与最终状态一致。

## 已确认的正向证据

- 受验 F3 beta.2 的 program manifest、inventory、Runtime manifest、Launcher、build-info 及 source/profile 锚已被固化并由独立 beta.2→beta.3 identity 路由使用；运行时不在线下载历史 Artifact。
- beta.1 不直接升级 beta.3、beta.3 same-version 拒绝及旧 beta.1→beta.2 历史实现仍保留。
- beta.3 打包链包含 Runtime、Launcher、firewall helper 及 helper hash；compatibility report 对 C01—C15 映射到精确测试名，而不是仅凭文本存在。
- `f053b907...` 修正了 workflow 的阶段报告/映射，但这些静态门禁不能覆盖上述两个原子性故障路径。

## 范围与证据限制

- 本轮使用 `git show` / `git grep` 审查精确冻结对象，没有 checkout 或执行冻结提交，也没有运行 Hosted、真实 Setup、注册表、UAC、Firewall、NIC 或 LAN；没有消耗专项/Full/QA Hosted 预算。
- `verify-artifact-beta3.cjs:59-64` 的隐私正则明确跳过 `.exe`。因此该 verifier 可以证明 Artifact 文件 allowlist 与非 EXE 文本扫描结果，但不能单独证明 Setup EXE 内不存在路径或敏感字符串；这是最终 Artifact privacy 证据限制，不作为本轮第三个已确认产品缺陷。
- 按主控边界，未重复报告 T5 工作树已知 WIP（旧 Portable/Launcher/Setup Go harness 尚需 package-lan/helperhash/versioned/compiled harness）及尚未 Review/整合的 T3。
- 最终整合候选仍须由同一 QA thread 基于精确新 baseline 复验；本报告不能转换为整体 PASS。
