# 安装前观察与首错保留 — 本地停止结果

状态：`BLOCKED — LOCAL FIXTURE RECOVERY UNPROVEN`。2026-10-27。

## 1. 已复现缺陷及修复范围

原 `install-split.cjs` 在已经得到更早内层失败后，用后续 admission 未观察覆盖首错。Master 核验历史安全报告原始字节，并独立运行原 execute/inner/ciFinish/finalize 链的 13 项合成反例，fail0skip0。迭代中发现新 gateStates 的 transfer/native 失败仍可能被接受为内层成功，已退回原线程修正，13 项复验通过。以上是局部证据，不是最终整体 Review PASS。

原线程在 WIP 中加入原始登记观察固定分类、即时首错、独立后续 gateStates，保留旧 schema 读取；内层 WinPS 与外层 pwsh 的实际函数对同一私有中文夹具进行四视图内容对照。原始登记内容不输出、不上传。没有修改生产安装器、Launcher、Runtime 或业务安全条件。

## 2. 新发现的本地恢复阻塞及仍未知事实

原线程正式回单：v3 `TestFreshAbParentReceiptPrivate` 在私有 parent 和带类型值 child 创建后、显式 cleanup 前出现 `INDEPENDENT_PRIVATE_TYPED_CONTENT_MISMATCH`。当时只 defer close。Master 只读确认 close 只关闭注册表句柄，不执行删除，因此该失败尝试没有精确 owned 删除及恢复后观察证明。

原线程随后只读观察到同前缀私有键存在。前缀本身不能证明该键就是本次失败对象，其归属、状态及恢复保持 UNKNOWN，未删除或修改。后续加入 `t.Cleanup`，按精确 owned child→parent 清理并核验 close；v6 定向通过且同前缀数量未增加。这只能证明后一次尝试，不能追认 v3 已恢复。

Master 收到上述恢复缺口后停止新增系统夹具测试、完整构建及工程扩展，仅保全证据。历史 Run40286717015 的底层观察首因仍 UNKNOWN；FAIL、恢复未证及已耗预算永久保留，不回填。

v3 只保存了固定对比失败，未保存两侧结构差异，故其精确原因也保持 UNKNOWN。随后源码检查发现外层类型值表示为 kind/value 对象，内层为二元素数组；这是基于源码的可能解释。v4 加入内存规范化后通过，v5 改为实际 pwsh/WinPS 与中文键后通过，v6 加入失败时精确清理后通过；不能将后续通过追认成 v3 唯一根因或恢复证明。上述执行结果仅存在于原线程工具输出及正式 RETURN，本轮没有独立专属执行结果文件，不把未跟踪材料冒充恢复回执。

## 3. 原模块首错保留

Master 独立 13/13：父登记/Setup 首错经实际 split→CI→finalize 保留，叠加报告读取与清理失败分别保留；矛盾状态不能成为 PASS。原线程另报告 A/B 合成链 16/16，原模块实际解释器边界和私有夹具若干定向通过。

最后一轮组合测试因安全 STOP 中断。没有完成最终全套回归与完整独立 Review，不能把局部结果合称全门禁 PASS。v3 的真实失败及恢复缺口不得以 v6 的成功覆盖。

## 4. QA 接线

WIP 已加入原 FQ1 的 schema4 受限 A/B 来源兼容、同 EXE/Source/Artifact 读取接线；旧 FQ1 定向 17/17、新来源合同 3/3 为原线程报告结果。上游与下游代码尚未完成最终整体独立验收，状态为 **NOT READY FOR EXECUTION**。QA 0/1 继续冻结；没有触发 QA、Hosted 或修改真实触发/授权/预算账本。

## 5. 源码与构建身份

- 原线程本地 WIP：`01075664b4d9c381c20b047c9a33c63d569d286e`，15 个测试/验收接线文件；未 push，未整合到主控分支，未完成最终 Review。
- 主控分支仅保存授权与本停止治理记录，原线程、原工作树和未跟踪材料保留。
- 本轮最终受审 Source：**无**；完整同源 EXE：**未运行**；本轮 EXE SHA256：**N/A**。旧构建不能改标成本轮结果。
- Hosted 新增 0，QA 新增 0；当前 Candidate 已耗，QA 冻结。真实 Setup、安装后业务、LAN 均未在本轮执行。

无 main/tag/Release、内部 SPXT、未知资源清理或普通 sub-agent。后续需先处理本地失败夹具的归属与恢复未证边界；本记录不授权任何清理、测试或 Hosted。

固定摘要见同目录 `AB-OBSERVATION-CLOSURE-RESULT.json`。局部测试细节来源为原长期线程正式 RETURN 与 Master 本地独立回放；不将缺失的原始测量补写为证据。
