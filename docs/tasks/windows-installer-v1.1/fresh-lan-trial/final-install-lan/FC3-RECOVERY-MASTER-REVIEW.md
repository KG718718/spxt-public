# FC3 Recovery & Install Closure — Master final review

**LOCAL REPAIR / BUILD REVIEW PASS — COMPLETE SPLIT ACCEPTANCE NOT READY.**

唯一 Master 已独立核验原 FRESH-T2 的 RETURN `54f4da7c40327fa05948acc6fcd6a34ef3cbe770`，并 ff-only 整合。受审实现及唯一完整构建来源为 `461c75886bc16bcc1c493e1678f32e90f5643bca`，代码指纹 `e02e66821e9a7833aaee98e841a67c2b62630077641896e791ea407a68f286d3`。RETURN 仅新增三个回单文档，不改变实现。

## 六项结论

1. **OLD_BINDING 历史确切首因仍 UNKNOWN。** Run `39401060413` 的登记拒绝符合预期；异常位于其后、正常 FRESH_ACCEPT 之前。原报告缺少回读/删除子阶段，无法在不重跑的情况下追认唯一原因。独立私有对象控制证明原清理脚本可以正常执行，不能认定原删除必然权限失败。
2. **确认测试缺陷，未确认产品改写登记。** Master 和 T2 分别复现旧 `reg add` 接受另一 actor 已创建的空键，旧清理随后采用该键。已改 native CREATED_NEW 回执、持续创建句柄、父键归属、四视图结构比较、精确类型/值/子键和固定失败报告；原文输出摘要比较被替换。历史究竟是文本误判、真实变化还是清理错误仍不可判定。本轮草稿中的 null/属性名称遮蔽问题也已修复，不能追认为旧 Run 根因。
3. **本轮私有 Binding/Global 恢复已证，旧 Runner 未证。** Master 最终源码独立 PS 32 项及真实私有登记/Global 恢复 PASS，Job、句柄、管道和环境正常收尾。未知登记、额外值、外部修改、部分创建、删除后观察缺失和退休后重建仍拒绝。原 Binding OWNERSHIP_UNKNOWN / GlobalRegistry STATE_CHANGED 永久保留。此 fixture 仍限独占受控环境：最后验证到路径删除并非原子 compare-and-delete，不能宣称消除所有并发写窗口，更不能用于清理未知资源。
4. **A/B 角色入口及严格聚合已准备，完整流程尚未就绪。** A 首次调用正常 Fresh Setup，B 保留五项拒绝；两边各自提供证据，不能用 B 覆盖 A 的失败。新入口在 Setup 前绑定 role/source/同一 EXE；新 schema3 与历史 schema2 分离。缺 B、未知恢复、同 Job、来源/EXE 不符及额外字段均拒绝。但 **B 缺可信真实失败安装恢复 producer**；当前返回 FAILED_INSTALL_RECOVERY_NOT_READY，五拒绝和 FILE surrogate 不能替代。实际双 VM workflow、CI/schema、来源准入、同 EXE 传递与外层恢复发布也未激活。没有创建下一运行槽位或 workflow。
5. **完整 EXE 构建和独立字节复核 PASS。** Runtime / Helper / Launcher / ISCC；Node 24.21.0、Go 1.27.1、Inno 6.7.3。1049 文件、147,923,786 payload 字节、20 依赖，Manifest、sidecar、许可证及生成 ISS 全部独立核验。EXE 33,558,037 字节，SHA256 `5b035291510df36bfa489265a4fd7516a23353ea90cf4f9977e3671fbec21a9d`，仅本地 BUILD 参考身份，无安装验收资格。Master 最终独立 CJS 177/177、Root 142/142、PS 32 和聚合五反例均通过，fail0skip0。原 Go 8 父/43 子、vet 与 Fresh CJS 274 的来源保留为 f1187e02；Go/overlay 输入与最终来源逐字节一致，不改写其来源。真实安装、安装后业务、F01—F09、26/742、QA 和实体 LAN **NOT VERIFIED**。
6. **目前不能触发下一次 Candidate。** 先完成可信失败安装恢复路径及完整独立环境接线，再通过本地安全门禁和 Master Review。届时最少可考虑一个含 A/B 两个标准 Windows Job 的 Candidate Run；原唯一同 EXE QA 仍只能在完整 Candidate、恢复及产物全部合格后解冻。这是后续预算建议，当前没有新增/预留授权。标准 Hosted 每 Job 新 VM 的设计依据见 [GitHub 官方说明](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)，本轮没有实际运行两个 VM，不以目录分离冒充隔离。

## Review 与收尾边界

Master 的首次扩大串行集合未获得完整汇总、非零结束，原 FAIL 和资源退出证明保留于 `FC3-RECOVERY-MASTER-EVIDENCE.json`，不计为通过；最终按本轮改动范围独立检查、并核验 Execution 全集合来源。未更改生产单测超时或安全期望换取 PASS。

实现仅修改 11 个测试/验收接线文件。04dd 的三个生产文件、生产 Launcher/Firewall/业务、实际 workflow/trigger、FC1/FC2/FC3 来源合同、旧账本及历史失败报告均保持。未实际安装或执行产品，未触碰真实产品登记、Startup、网络或内部 SPXT，未清理未知资源。

本轮 Hosted **0**；Candidate 耗尽，原 QA **0/1 UNUSED—FROZEN**。原 T2 RETURN 后冻结，工作树和所有失败现场保留。仅非 force 同步当前开发分支后停止，不 main/tag/Release。

完整六项 Execution 回单：[FC3-RECOVERY-EXECUTION-RETURN.md](FC3-RECOVERY-EXECUTION-RETURN.md)。独立证据：[FC3-RECOVERY-MASTER-EVIDENCE.json](FC3-RECOVERY-MASTER-EVIDENCE.json)。这些是本地 Review 记录，**不是新运行准入 token**。
