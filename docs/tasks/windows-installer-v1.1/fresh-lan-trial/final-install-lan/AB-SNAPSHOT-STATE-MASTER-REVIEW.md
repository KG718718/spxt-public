# 历史快照状态误拒绝 — Master 独立复验

结论：本地修复及独立 Review PASS。Hosted 0，QA 冻结；不构成安装或 Candidate 准入。

修复源码：`918b5a1220dbee474e57678951e1bd925ed78a23`。原 FRESH-T2 RETURN：`d11aba211ce95e303768ddd8ca6d8d5796e6a84e`；Master 已在 `codex/lan-fresh-trial-v1.1` 快进整合。代码指纹：`1ea2d66fa4a45e28b2c7196a4bb00c7fe98089a67c0ad5cca3bc91ce57b2284a`。

## 已确认事实

原模块基线 `ee0e8788d2325b63d34c0e988b8d7f4409d5c367` 使用整数组 deepEqual，将稳定身份、调度状态和排列顺序混合比较。Master 用原模块离线回放，分别证明身份不变的 queued→waiting 和同集合乱序都会误报 HISTORY_SNAPSHOT_UNKNOWN。

现在按唯一 ID 对齐稳定身份，独立记录状态、顺序和 Runner 分配变化，再执行原阶段及审批门禁。重复 ID、额外未授权 Run、缺页、错误 Source/control/attempt、历史终态变化、缺失审批仍拒绝。未分配 Runner 的排队状态不等于可开始执行；执行阶段缺少 Runner 证据仍拒绝。较早的运行中响应不能掩盖后来观察到的失败或取消；审批前最后回读也检查终态。

固定诊断严格拒绝额外字段与语义矛盾；新版 Source 报告 PASS 必须含 JOBS/RUNS 各一个成功快照，内层失败、缺失或重复集合不能被外层 PASS 掩盖。旧 Source schema1/2、历史 identity/receipt 摘要及原生 Environment 审批要求保持。

## 实际复验

固定 Node `v24.21.0`，EXE SHA256 `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`。

| 独立复验范围 | 实际结果 |
| --- | --- |
| 身份、状态、顺序、分页及拒绝条件 | 35/35 PASS |
| 固定诊断与未知/失败观察 | 23/23 PASS |
| 原模块 Master 审批准备离线回放 | 6/6 PASS |
| Source 报告内外一致性及旧 schema | 11/11 PASS |
| Master 合计 | 75/75，fail0skip0 |
| T2 新回放22、原报告5、split8 | 35/35，fail0skip0 |

Master 套件直接调用固定源码中的原模块，API 边界仅为明确的离线响应；无网络调用、真实审批、安装或 GitHub 环境冒充。基线独立套件的30 PASS/5 FAIL保留，不能将全部5项笼统解释为历史事故原因。T2 的同源码原生 owned Job 证据证明自然退出、管道/句柄关闭、Job empty、父环境不变且没有强制终止；6个CJS语法及diff-check通过。

只修改6个现有准入/诊断及对应测试文件。生产、实际workflow/trigger、历史授权/Review/账本、Go分类协议逐范围核对未变。本轮没有重建EXE、运行26/742或验证安装/LAN；旧构建不转记为新源码产物。原线程、工作树、离线脚本和固定证据保留。

## 仍无法还原的历史事实

Run `39747285185` 当时两份快照的具体差异未保存，因此其唯一根因仍 UNKNOWN。该离线缺陷是已证实的代码问题，但不能证明它就是该 Run 的实际触发原因，也不能推断 GitHub 内部原因。

该 Run 的审批前取消、旧两条 Run、全部 FAIL/UNKNOWN 和预算消耗原样保留；Candidate 不返还、不重跑，QA不用于调试。未增加历史准入白名单、实际审批授权或触发文件。只完成本地工程与治理同步后停止，不修改 main/tag/Release，不访问内部 SPXT。

完整固定证据见同目录 `AB-SNAPSHOT-STATE-MASTER-REVIEW.json`、`AB-SNAPSHOT-STATE-LOCAL-EVIDENCE.json`。
