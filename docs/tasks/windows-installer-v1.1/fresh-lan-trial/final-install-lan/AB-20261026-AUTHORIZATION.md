# 2026-10-26 A/B Candidate 用户授权

唯一 Master 01a0db0e-c950-79e0-8e11-07155e0742f2。新增一次完整 A/B Workflow Run、两个独立标准 Windows Job、attempt 1；仅完整 A/B、聚合、产物与必需恢复 PASS 后使用原未用独立 QA 一次并核验同一 EXE。其他 Hosted、重跑与替代运行均为 0。

受测 Source 固定 `d1c6756327a25974604d904ddb317b8f86a64b61`；治理基线 `255297604776737a076a2df77b14b86fb70efb59`。引用已受审 AB-NEXT-PREFLIGHT-MASTER-REVIEW.md 与其完整构建/字节证据。本地参考 EXE SHA `3030b06a1403bd088810625db4040d93b5ca6cde628d34d5a3fcc59e84f9fd38`、33557974 字节；Hosted 实际构建 SHA 单独记录，A/B/QA 必须同一实际候选字节。当前仅更新现有授权/证明指针，不修改产品、验收代码或工作流。

原生 Environment 保护不变，唯一真实 Run 精确审批；独立审批截止 600 秒，标准取消确认 120 秒。重复 Run/身份不明即拒绝并取消，不选择其中一条。任何必需 FAIL/UNKNOWN 停后续产品测试与 QA，仅受控收尾；首错与清理分别记录。历史三个取消 Run、全部 FAIL/UNKNOWN 和额度永久保留；取消不返还预算。

A 首个 Setup 为 FRESH_ACCEPT，安装后业务、F01—F09、26/742 与收尾；B 下载 A 不可变 Artifact，五拒绝及受审原生失败恢复。无第三个 Windows 聚合作业。实际 Runner 前态、安装、业务、恢复尚未观察；本地证据不冒充 Hosted。真实 Win10/物理 LAN/UAC/双设备/登录自启 HUMAN_PENDING。

不日常机安装、不内部 SPXT/main/tag/Release、不清未知资源、不普通 sub-agent。
