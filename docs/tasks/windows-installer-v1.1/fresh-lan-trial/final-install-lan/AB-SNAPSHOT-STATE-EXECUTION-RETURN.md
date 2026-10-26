# Snapshot State Closure — Execution RETURN

本地最小修复完成并冻结；正式离线定向复验 **35/35 PASS，fail0/skip0**。这只是源码与本地验证结果，Master 独立 Review 尚待单独结论，不构成真实 Candidate、安装或交付准入。

- 实现 source：`918b5a1220dbee474e57678951e1bd925ed78a23`；tree：`c8652e7f05f2c3d473a32b33178df3af6377a5a6`。
- code fingerprint：`1ea2d66fa4a45e28b2c7196a4bb00c7fe98089a67c0ad5cca3bc91ce57b2284a`。
- 基线：`ee0e8788d2325b63d34c0e988b8d7f4409d5c367`；原模块 blob：`18d9d2f4c770806ff0c2faf5f21dced3b2bfb94e`。
- 固定 Node：`v24.21.0`；EXE SHA256：`ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`。

## 已确认的修复与验证

改动前先用原模块离线复现三类误拒绝：当前 Run queued→waiting、Job queued→waiting，以及相同 Run 集合逆序，原结果分别为 HISTORY_SNAPSHOT_UNKNOWN、JOB_STATE_UNKNOWN、HISTORY_SNAPSHOT_UNKNOWN。固定结果保留在本目录配套 JSON 的 originalOfflineReplay；私人脚本及原固定证据保留在原工作树 `.test-work/snapshot-state-original-replay.*`。未保存原始 API 响应。

`pages()` 仍完整分页并读取两轮，按唯一 ID 对齐并比较稳定身份；状态、结论、列表顺序及 runner 分配变化单独形成固定诊断。任何重复 ID、身份变化、缺失身份、总数漂移、缺页、API 不可观察与历史终态变化仍拒绝。返回最新观察；此前已观察的当前 Run/Job 失败、取消或非法状态不能被后来的 running 响应隐藏。历史两条 completed/cancelled、唯一当前 Run、原 history/receipt 摘要合同及外部 Master 原生审批绑定保持。

排队且尚未执行的 Job 可缺 runner 字段，这不代表实际执行资格；in_progress 或成功终态仍要求实际 runner 数据并经过原阶段门禁。失败或取消的未分配 Job 优先明确拒绝。Master 最后一次历史回读也检查终态，不能用未变的身份摘要掩盖取消。

SOURCE schema3 公开诊断只包含固定分类和布尔/null，严格拒绝额外字段及分类矛盾。外层 SOURCE_ADMITTED/PASS 必须恰含 JOBS/RUNS 各一个成功快照；空证据、缺失、重复集合、内层 FAIL/UNKNOWN 均拒绝。bootstrap 不再自动把失败分类重写成成功；schema1/2 历史语义保持。比较身份稳定的 PASS 只表示两次观察一致性，后续阶段、来源、审批条件仍必须通过。

正式复验绑定上述 source，工作区受控文件在执行前后干净：新增 snapshot-state 22 项、既有报告 5 项、split 8 项；6 个改动 CJS 语法及 diff-check 通过。使用现有原生 owned Job 封装，先分配后恢复执行，根进程自然退出、stderr 空、pipes/handles 关闭、Job empty、无强制终止，父环境未变。测试输出原文只在内存。SOURCE 固定报告实际 JSON 写读及实际 early CLI 序列化已覆盖，没有伪造 GITHUB_ACTIONS 进入真实流程。

## 不确定性与停点

历史 Run `39747285185` 的精确快照差异及唯一底层原因仍 **UNKNOWN**；离线复现只能证明原实现存在误拒绝条件，不能追认该 Run 必然由这些条件导致。原两个重复 Run、第三 Run 的全部 FAIL/UNKNOWN、账本及耗用事实保留；没有把第三 Run 加入历史准入白名单，没有新增预算。QA 继续 UNUSED—FROZEN。

仅 6 个源码/测试文件改变（详见配套 JSON）。生产代码、workflow、trigger、实际授权/Review、历史结果/账本、Go 分类协议均未改。本轮 Hosted 0、真实审批 0、Environment 写入 0，无 push、完整 EXE 构建、Go/业务回归或真实产品安装；无接口变化需要扩大回归。旧 EXE 仍只属于 source `3d256a019f99126ac25298955a7ef9bb229eeb07`，不转记为本源码产物。本轮未验证新源码完整 EXE、安装、LAN 或 QA，不能交付用户包。

本 RETURN 交原 Master 独立离线复验、Review 与治理整合；Execution 保留原线程、原树、全部私人证据并冻结，不自行同步远端或开展后续 Hosted。
