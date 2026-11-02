# 原生登记恢复专项结果 · 2026-11-02

**FAIL — NORMAL_RECEIPT / PRESTATE_UNPROVEN**。专项在创建任何登记对象前停止。实际 Windows 创建、替换拒绝、删除、登记句柄关闭及恢复回读均未得到验证。

| 身份 | 值 |
|---|---|
| 原执行线程本地提交 | `06c9c11250f66611f15098e6d6ef6defa458085a`，祖先 `d774ef51` 保留 |
| 受测公开 Source | `e3df4eaa6a6bb0742ecf2f4ff11db2b7b61325af` |
| Source tree | `00ecde3e8ca4b383673bd7ceb95c180a1c62bfa3` |
| 仅触发的 control | `0a453fd23f325c6ac7bad75606199a72862c54b3` |
| Run / attempt | [41396108321 / 1](https://github.com/KG718718/spxt-public/actions/runs/41396108321) |
| Windows Job | [125117667113](https://github.com/KG718718/spxt-public/actions/runs/41396108321/job/125117667113) |
| 安全证据 Artifact | [13119303105](https://github.com/KG718718/spxt-public/actions/runs/41396108321/artifacts/13119303105) |
| Artifact ZIP SHA256 | `c1c78876ccc4433714f4d06f711b17ac2e5b25a0051622252d62fd828858347e` |

原线程完成替换句柄关闭结果检查、创建收据、异常责任与定向反例。Master 核对原执行树与集成树相关 Git blob，独立复跑 10 项报告反例和 18 项准入检查，并用固定 Go 1.27.1 仅编译集成后的专项测试程序。原线程的纯 Go 父测试及 12 个具名子场景通过。日常开发机没有执行原生测试或产品 Setup。

**实际首错。** 原生审批、唯一 Run、受测来源和独立 Windows Job 已核验。Hosted 测试程序编译通过。首个场景读取预定子路径的四视图初始状态，得到 `prestateKnown=false`、`receiptNodes=0`。源码在调用原生创建函数前返回。此时 `prestateAbsent=false` 不能证明该路径存在。观察器的具体失败子类没有写入报告，无法从既有证据确定是进程、读取、序列化还是解析失败。

| 要求 | 本 Run 实际结论 |
|---|---|
| 父子创建与回执 | 未调用创建函数，无创建回执 |
| 部分创建失败后的责任 | NOT_RUN |
| 同路径替换、旧收据拒绝和新对象保留 | NOT_RUN |
| 精确 owned 删除 | NOT_ATTEMPTED |
| 原生登记句柄关闭 | NOT_ATTEMPTED |
| 删除后四视图恢复回读 | NOT_ATTEMPTED |
| 首错、后续错误 | 首错为 PRESTATE_UNPROVEN。后续场景均停止，没有观察到登记清理动作或其结果 |

**外围收尾。** 测试进程报告 `forcedTermination=false`、`pipesClosed=true`、`handlesClosed=true`、`jobEmpty=true`，进程环境恢复为 true。测试进程未满足“自然且零退出码”门禁，整体 FAIL。这些句柄是监督器句柄，不能代替登记句柄的关闭证明。

Master 下载原始 ZIP，逐字节核对 GitHub digest，确认唯一成员为 `result.json`，并用受审 validator 复核完整失败报告、Source/control/Run/Job 绑定、白名单以及后续场景 NOT_RUN。原始固定字段见 [NATIVE-REGISTRY-EVIDENCE.json](./NATIVE-REGISTRY-EVIDENCE.json)。

专项 Hosted **1/1 已用**。完整 Candidate **不具备准入条件**，独立 QA 冻结，历史 v3 恢复仍 UNKNOWN。此次没有运行 Setup、Launcher 或业务，没有产生安装包。
