# FC3 Recovery & Install Closure — Execution RETURN

本轮本地登记修复、完整同源构建及原 Master 独立 Review **PASS**，原 FRESH-T2 正式 **RETURN / 冻结**。完整 A/B 安装闭环仍 **NOT READY**；历史 FC3 首因及真实恢复仍未证。Hosted 新增 0，Candidate 耗尽、原 QA 未使用且冻结。

最终实现/唯一 P0 来源：`461c75886bc16bcc1c493e1678f32e90f5643bca`；tree `b16c7b7ba586b74feb5c0a2500a4c7431660de64`；代码指纹 `e02e66821e9a7833aaee98e841a67c2b62630077641896e791ea407a68f286d3`。授权治理基线 `951cab58a8b4238a73abf69d2ca24afadaac06cd`。

1. **OLD_BINDING 确切原因：UNKNOWN。** 原 Run `39401060413/attempt1` 的 OLD_BINDING 退出与登记拒绝 marker 均符合预期；失败范围仍是该拒绝之后、正常 FRESH_ACCEPT 之前的回读/fixture 回收/后观察，旧报告没有足够固定子型。真实正常安装未到达。原清理脚本仅将键名替换为独立私有 GUID 后，真实 Windows 控制可成功删除并恢复；不能认定“原基键只读”就是历史首因，也不能用当前本地成功回填旧结果。

2. **已证测试归属缺口，未证历史产品变化。** 独立合成 actor 先创建空键后，旧 `reg add` 仍成功，旧清理器继而删除它，证明 created 布尔值不等于独占创建回执。现改为 native `CREATED_NEW`、持续创建句柄、精确类型/值/子键检查、四视图结构化比较及固定独立诊断报告。文本摘要比较已替换，但历史是否仅文本差异仍 UNKNOWN。草稿新增规范化曾出现数组 null 丢失、Keys/Values 属性遮蔽，已修复并保留定点反例；这些是本轮草稿问题，不追认为历史首因。完全等价重写不保证产生可观察时间戳差异，不宣称完整外部写审计。

3. **私有受控 Binding/Global 恢复已证；历史整体恢复未证。** 新回执逐层记录自建父键，不通过全路径创建暗中采用父资源；部分创建、退休后重建、外部删除/替换、额外值/子键和错类型均有真实私有对象反例。只有持续创建凭据及精确预期内容允许回收，自建父键也逐项对照创建前四视图；缺观察和未知资源保留。最终源码 PS 32 项及真实私有 Global 前后恢复 PASS。Go 8 父/43 子及 vet 在 `f1187e02` PASS，其三个 Go/overlay 文件与最终来源逐字节相同；同来源完整 Fresh CJS 274/274 PASS。Master 在最终来源独立 CJS 177/177、Root 142/142、PS 32 项、聚合反例和源码 Review PASS。路径删除仍不是原子 compare-and-delete：最后内容校验到删除的并发修改窗口不能称已消除，仅限独占受控 fixture；实际未知资源不得删除。原 FC3 的 Binding `OWNERSHIP_UNKNOWN`、GlobalRegistry `STATE_CHANGED` 不变。

4. **正常安装优先的入口/聚合组件已准备，完整 A/B NOT READY。** 真实 Go 入口消费 A/B role：A 的首个 Setup 调用为 FRESH_ACCEPT，跳过五 fixture；B 保留全部五拒绝，仅提供 F01 后两项 witness。新 schema3 part 与旧 schema2 分开；既有 Hosted 测试入口消费新 role，并在 Setup 前严格绑定 role/source/EXE。聚合分别验证 A/B 完整集合及恢复，拒绝缺 B、伪 PASS、覆盖 A 失败、登记全 NOT_STARTED、同 Job、EXE/source 不符与未知字段；要求受审 workflow 字节摘要和两个标准 Windows Job 的当前 API 绑定，目录不同不能证明 HKCU 隔离。**B 缺少可信的真实中途失败安装恢复 producer**，当前入口强制报告 `FAILED_INSTALL_RECOVERY_NOT_READY`；五拒绝及 FILE surrogate 均不能替代。Fresh 禁 fault/sequence 构建条件未放宽。实际 CI/schema、source admission、双 VM workflow/同 EXE 传递及外层恢复发布尚未激活，不具备 Candidate 准入；没有创建新 workflow 或运行槽位。未来聚合可由 Master 读证据完成，不因此增加 Hosted 聚合作业。

5. **唯一最终同源完整 EXE 构建及字节复核 PASS，仅构建资格。** Node 24.21.0、Go 1.27.1、Inno 6.7.3；Runtime、Helper、Launcher、ISCC 完整构建。EXE **33,558,037 字节**，SHA256 `5b035291510df36bfa489265a4fd7516a23353ea90cf4f9977e3671fbec21a9d`。1049 文件、147,923,786 payload 字节、20 依赖、manifest、sidecar、许可证及生成 ISS 均经 T2 和 Master 独立逐字节核验；内外 Job 自然结束/empty、stderr 空、环境恢复，未强制终止、未安装或执行产品。原始 P0 报告 SHA256 `a6719aac9648d80e49fb9264f1778c76de532cae3e5554b95c5cc87b6f618818`。真实正常安装、Startup 实机目标、F01—F09 整体验收、安装后浏览器 26/742、QA 与物理 LAN 仍未验证，无合格用户安装包。

6. **下一次真实 Candidate 的最小准入及预算：当前不具备。** 必须先补齐 B 的可信中途失败安装恢复 producer，保持真实所有权/缺观察拒绝；完成受审的双独立干净标准 Windows VM/Job、同 EXE、精确 source/schema/外层恢复接线及独立 Review。随后须用户明确新增授权及覆盖 A/B 至少两个 Hosted Windows 作业的预算，不复用旧 FC3、不得擅建 FC4、不得挪原 QA。原唯一 QA 仍只可能在完整 Candidate/恢复/产物合格后使用同一 EXE。当前无预留、无 trigger、无 Actions/QA/push；生产三文件、实际 workflow/trigger、真实历史 contracts/账本/FAIL 均未改，不触碰真实产品登记/Startup/业务或未知清理。

证据：`FC3-RECOVERY-LOCAL-BUILD.json` 为原始 P0 报告；`FC3-RECOVERY-LOCAL-EVIDENCE.json` 保留来源、原控制/碰撞、私有恢复、Go/PS/CJS、内外 Job、完整字节身份及明确限制。该证据不是新的 Master 准入 token，也不是 Hosted 安装或物理 LAN 认证。
