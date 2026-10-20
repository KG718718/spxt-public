# FC3 EXECUTION RETURN — LOCAL PREPARATION PASS / FROZEN

2026-10-20。**本地最小接线、门禁、同源完整构建及 Master 独立 Review 通过；尚未触发 FC3，未消耗 Candidate 或 QA，不是实际安装验收通过。**

授权固定 `412a3e60c8e00709b39bf91071db6d317db897b8`，实现及构建 source `d2c7da4603054f45e6a97812b42f74a4119af21e`，tree `47218c1584d556c110136cb7f5bb6646f67ae246`，code fingerprint `e959cece681e8187b42d5143e88a2f10c0cd5eeb02de44fc9458743c42f187d0`。本回单仅后续 docs，不改变实现或构建来源。

## 实现范围

412a→d2c 只有安全证据所列11个测试/接线文件。新增独立 schema3 FC3 合同，沿用报告 schema2、原 workflow、标准 Windows Runner/API Job、监督、前态、所有权、恢复和实际安装验收链。实际 workflow/trigger、旧账本/失败报告、旧 FC2 source fence、04dd 生产修复及安全模块原文均未改。

完整链已覆盖 input→dispatch→bootstrap→真实 Git source/blob/指纹→P0 proof/Master Review→API history/Job→context CLI→QA immutable archive→原最终报告入口。trigger generator 只返回 JSON，没有写实际触发文件。历史 IC1/FC1/FC2 必须逐项存在并保持 failure/attempt1；任何额外 Run、重跑、旧新 QA、缺失历史或已消耗额度均拒绝。旧 FC2 合同仍拒绝当前修复 HEAD，新槽位不使用旧例外。

Master Review 不能由 marker 字符串代替。bootstrap 从 `reviewedSource` 的 Git 对象读取白名单 `FC3-MASTER-REVIEW.json`；context CLI/收尾再次核验该 Review 与 P0 proof。缺失、错 source/fingerprint/digest、非 PASS、未知 checks 或额外字段均拒绝。**Execution 没有创建该真实 Review 文件，由原 Master 完成实际 Review 后生成。**

## F06 一致性

F06 原始 TargetPath 字符串比较与已审 F02 强身份存在潜在语义冲突；历史实际表达仍 UNKNOWN，不追认历史根因。只把 F06 原块替换为调用既有 `verifyShortcutIdentities()`，继续使用完整 F02 后建立的原始可信 FileID/卷/父目录/hash 基线及原参数、工作目录条件；没有重建验证基线，也未删除 `loginStartupWiring` 验收。

04dd 修复 blob 保持；Go 模板唯一 F06 差异被精确固定为 Git blob `3dfb16a8b517e958ae3066bcfe80d219014f9277`。真实 Windows 受控 fixture 7例：PS5/PS7 SUBST 期望表达→物理目标同文件通过，同字节异对象、未准入 alias、参数/工作目录错误及替换后沿用原基线均拒绝。测试末尾观测新 ID 仅用于反例前提，未作为验证权限或替换原基线。没有真实 Startup 或产品执行。

## 门禁与完整构建

- Execution 全 Fresh CJS **266/266**；FC3 合同/全 bootstrap 15例包括坏 Review 执行前拒绝、QA 异 EXE/恢复 UNKNOWN 拒绝、实际最终报告入口保留 F01 首错。
- Go overlay 真实编译、7父/32子及 vet 通过；真实 Supervisor Entry 64断言、Core 28断言通过。Master 独立 CJS **96/96**、Root **134/134**，全部 fail0/skip0。
- Core 故意 `sink-foreign` 负例恰输出一次固定 `FRESH_SUPERVISOR_REPORT_WRITE_FAILED` 加 CRLF。原 direct scope 的 `stderrEmpty=false/status=FAIL` 保留；私有测试外壳精确验证该唯一预期输出、全部28断言及对应拒绝，再通过外层协议。inner 实际 FAIL 与回收字段照实保存，外层协议 PASS 不升级生产 stderr 规则；没有改监督代码或任何生产/单场景 timeout。
- 上述真实 fixture 映射、环境、已观察世界及内外 Job/句柄/管道收尾通过，未强制终止产品；故障注入集合内部的预期强制终止反例保持原始记录。

唯一完整 Runtime/Helper/Launcher/ISCC P0 已通过，未重跑：

| 项目 | 固定身份 |
|---|---|
| EXE bytes | 33,560,427 |
| EXE SHA256 | `c36f4f8a8cd56f4c4a9a4cacadf50616912ed54c02ccc7c9b56fab68b7054177` |
| P0 原报告 SHA256 | `679beade8467ad3f49446978590e784ae7af03de16fb76e25eb586dee66087ac` |
| payload | 1049文件 / 147,923,786 bytes / 20依赖 |

T2 与 Master 独立逐字节核验 payload=manifest、source/tree、侧车、许可和 generated ISS；04dd 新 include 原字节保持。原报告见 [FC3-LOCAL-BUILD.json](FC3-LOCAL-BUILD.json)，原始安全字段、源码文件列表及各门禁见 [FC3-LOCAL-EVIDENCE.json](FC3-LOCAL-EVIDENCE.json)。资格仅 `BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE`，没有日常电脑产品安装或产品 EXE 执行。

## Master 后续最小接线

真实 `FC3-MASTER-REVIEW.json` 须由 Master 生成，严格字段为：`schema=1`、`kind=FC3_MASTER_REVIEW`、`status=PASS`、`qualification=LOCAL_REVIEW_ONLY_NOT_HOSTED`、`authorizationCommit=412a...`、`repairSource=04dd...`、`sourceCommit=buildSource=d2c...`、本页 code fingerprint、P0 原报告 SHA 与本地 EXE SHA；`checks` 仅有 `localGatesPassed/repairBlobsVerified/runnerContractPreserved/resourceSafetyPreserved/sameExeQaPreserved` 五项且必须为 true，`hostedTriggered=false`。

允许同 code fingerprint 的 docs-only 后继提交存放 proof/实际 Review，避免自引用：Candidate 输入 schema3、slot `FC3`、mode `CANDIDATE`，`reviewedSource=testedSource` 为最终受审提交，`localBuildSource=d2c...`。marker 为 `FINAL_FRESH_FC3_MASTER_REVIEWED_FC3_<reviewedSource>`；旧 firstCandidate 三字段及 Candidate reference 三字段均为空。最后仅 Master 写原实际 trigger、创建单父且只改 trigger 的控制提交，title `FinalInstallLAN FC3 <testedSource>`，source/control/实际 Run 由合同交叉绑定。

只有唯一 FC3 完整 PASS、所有当前恢复及 Artifact 合格，才沿用原唯一 FQ1：schema3/slot `FQ1`/mode `QA`，`testedSource` 为 Candidate 实际源码、Candidate Run/Artifact/EXE SHA 精确绑定；下载原 Candidate Artifact，不构建 Runtime/Helper/Launcher/Setup。新的 docs-only `reviewedSource` 须保留相同代码指纹及真实 Review/P0 proof；QA marker 改为 `FINAL_FRESH_FC3_MASTER_REVIEWED_FQ1_<reviewedSource>`。任何旧新 QA 历史、异 EXE、缺失恢复或额外尝试均拒绝。

## 停止与限定

本轮 Hosted0，FC3 Candidate **0/1**，原唯一 QA **0/1 条件冻结**；额度预留、真实 Review、非 force 同步及最后中央 trigger 均由 Master 处理。原 FC1/FC2 FAIL/CLEANUP_UNPROVEN/UNKNOWN 和旧额度不改；新早期 native 五类完整恢复、历史六类及 GlobalRegistry 来源未知不回填。真实 distinct 8.3 alias 仍 NOT VERIFIED。

本轮未实际运行 Fresh Setup/F01—F09/安装后业务26-742/QA/物理 LAN；后续必需 FAIL/UNKNOWN 或 FC3/QA FAIL 即停止，不重试/FC4/借 QA。自动化全部通过后也仅可为 `FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING`，实体 Win10/物理网卡/UAC/第二设备/登录及 GUI 项目不假 PASS。

原 FRESH-T2 在本地回单提交后冻结，保留原树、未跟踪与失败现场；不 push、不 trigger/Actions/QA、不 main/tag/Release、不访问内部业务或清理未知资源。
