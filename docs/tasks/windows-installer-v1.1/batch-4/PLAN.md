# Batch 4 工程执行计划
L2；产品 Intent/Spec 由正式任务书及启动指令批准。主控批准下述范围内工程拆分；未定行为不得由执行线程自行扩展。

1. Preflight 核对公开 repo、dev branch、干净、远端同 HEAD。已完成，详 ORCHESTRATION。
2. 主控建立任务索引和 L2 文档 checkpoint（文档提交不冒充测试构建）。Codex managed worktree 从明确 checkpoint 创建，不 fetch，不 clone。
3. T1 识别 helper/版本门禁、T2 只读数据预检 helper 文件隔离并行。先失败测试，再实现；只本地合成测试、无实际安装写入。新 helper 输出集成契约及来源证据，不改核心入口。
4. 主控 Review/local commit 整合。若 helper 语言/接口不适合集成则退原任务，不由主控重写。创建 T3，串行负责安装事务核心以及固定 beta.2 元数据；不改业务模型、package/lock/PDF/Node/OCR。
5. T4 在集成身份上实现真实旧版重建和 U 系列、保留 I/D/Runtime/Launcher/Portable 门禁，固定 CI 构建身份。新旧两个源码 checkout 严格独立，不把新源码作为旧版。
6. 独立 B4-QA 对最终整合候选只读审查实现及运行验证；问题退回原执行任务，同任务修复，必要时重做 QA。
7. 主控完整回归、commit/push 仅 dev 分支、GitHub Actions 输出 beta.2 EXE（仅 Artifact），保存首次失败和完整哈希/身份链。
8. 自动化通过后 Win10 十步人工升级验收。此前最多 BLOCKED — AUTOMATION PASS / HUMAN PENDING；全部完成才 Batch4 PASS。
9. 完成后停止，不进入下一 Batch/main/tag/Release。主控统一 Handoff；未整合 worktree 不清理。

## 风险与恢复
旧来源伪造/manifest自证不足、TOCTOU/重解析、文件锁、Inno取消时机/卸载日志与登记恢复、半升级、测试伪造 fresh upgrade、意外 default instance、重建时戳与哈希身份混淆均需证据。
发生安装事务失败按 SPEC 恢复完整安装拥有状态，不动 instance。工程候选失败则保留当前已验 beta.1，不部署，不删除证据。不能证明旧版恢复就 BLOCKED。
archive.updatedAt second-boundary stability 与 R1 READY timeout 保持独立 backlog；实际阻塞保存首个失败，再报告，不用 sleep/删断言/无限 retry。
