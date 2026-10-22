# 最终前检同源完整构建 — Execution RETURN

**本地完整构建、逐字节身份与 Master 独立 Review PASS；未实际安装或触发 Hosted。** 本次仅按用户最新续行澄清执行构建，不重复申请已批准且尚未使用的唯一新 A/B Candidate 预算；旧两 Run、原账本、全部历史 FAIL/UNKNOWN 原样保留，原 QA 一次仍以完整 Candidate PASS 后同 EXE 为条件。

1. **固定来源。** 原 bea7 tracked clean 后 ff-only 到 `3d256a019f99126ac25298955a7ef9bb229eeb07`，tree `1bddd0a7f1f89d8ac783bae81e9913e97a3d8a37`；code fingerprint `7f6ee2332152b20b7163c6b0c74d002eb26af37540ec68812a9716a2477b8b97`，与受审修复一致。没有修改生产、workflow、trigger、contract，也未重跑已通过的 314/13-49 全量集合。

2. **唯一完整新构建。** 复用现成 `local-p0.ps1`、受控 Job、固定 Node/Go/Inno 与 Runtime/Helper/Launcher/ISCC 构建链。EXE **33,560,012 bytes**，SHA256 `86e88c250ea9a63b9d8ba6a520d1945417aefcbed7784a80a01659ff65783ecd`。1049 个 Payload 文件 / 147,923,786 bytes / 20 个生产依赖逐字节通过；Manifest SHA256 `2cfe20938848843472930aef61e1737755db768b579a4e66a072bced009e0d8c`，inventory SHA256 `af770e6354e15273ecf9667e7335500ed3d2b2cefc7c6dda0bc71b4ed9eedc39`。Source/tree、生成 ISS、身份 include、许可证、sidecar 与包验证通过。此产物属于本 Source，不用旧 `d822` EXE 冒充。

3. **实际必要检查。** Helper 构建内标准 13 + 独立标准 13、Launcher 独立标准 28、Helper Fresh 2、Launcher Fresh 2、Node 44，均 fail0/skip0；Launcher 原构建入口标准检查及实际编译按原脚本成功返回，完整 ISCC 成功。完整记录见 `AB-FINAL-PREFLIGHT-LOCAL-EVIDENCE.json`。这些是构建链检查，不代表 F01—F09、安装后 26/742、物理 LAN 或 QA 已执行。

4. **恢复与工具链。** 内外 Job 自然退出、stderr 空、pipes/handles 关闭、Job empty，无强制终止；worker 与构建/Node 子环境恢复通过。ISCC 使用前、LAUNCHER_STANDARD_TESTS 阶段取得的 119 个固定 Compiler 文件快照与构建后完全一致，原编译器 archive SHA 仍为固定值。没有执行产品 Setup/产品 EXE/Compiler GUI，也没有触碰真实 Startup、业务、网卡或产品 Registry。未读取真实登记做全局快照，不把文件身份或进程环境恢复冒充产品安装恢复。

5. **独立 Review。** Master 对实际 T2 checkout 源码字节、全部 1049 Payload、20 依赖、Manifest、sidecar、EXE 与完整新 EXE 本地 A→transfer→B 逐字节核验 PASS；wrongSource/AJob/Manifest/extra/changedExe 五反例均拒绝。两组 Master owned Job 自然/empty/noforce、句柄/管道及环境恢复通过，actualHostedTransfer=false。首份 Master 私有旧 harness 使用另一个工作树的行尾形态而 FAIL；该失败保留。后续严格比对实际编译 checkout 及 Git blob 身份，仅处理明确源码文本的 CRLF/LF 差异，没有修改源码或 EXE，也没有放宽 Payload 字节核验。

6. **证据与停点。** 原始 P0 报告按精确 bytes 保存为 `AB-EXACT-RUN-LOCAL-BUILD.json`，SHA256 `93b505e18865a5d3fe7897f26ed27f25ca1d11b710efa0432580b4447953f417`。私有构建根 basename `fresh-final-preflight-p0-ba801b0a03024b4891cf26c3544e7e45`，原工作树指针 `.test-work/final-preflight-p0-current.txt`；Manifest / build-info / EXE / sidecar 在该根 `setup/artifact/`，全量 Payload 及检查报告在 `portable/`，Job/worker/P0 报告在根目录。保存新本地 BUILD 证据不等于发出真实授权、审批或 trigger。本次 Hosted 0、未 push、未创建/修改 Environment；唯一新 Candidate 预算尚未使用。本地实现与产物冻结，真实保护环境配置及后续独立来源/中央前检由 Master 处理，不自行触发或挪用 QA。
