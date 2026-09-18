===== CHATGPT HANDOFF BEGIN =====

项目：K⁺-SESSION 公开版 Windows 一键安装重构
当前 Batch：2B 验收归档 + Batch 3 实施范围提案
结论：PASS WITH CONDITIONS（方案已整理，待审批；不是 Batch 3 实现通过）
一句话结论：Batch 2B 已按用户完整人工验收正式记录为 PASS。本轮仅整理文档和独立测试待办，没有实现或构建 Setup。

【本轮实际完成】
- 更新 2B 验收和项目执行入口；保留原失败、重跑及 Artifact 历史。
- 独立登记 TEST-FLAKE — archive.updatedAt second-boundary stability，不阻塞 Batch 3，不删断言、不加简单 sleep。

【Batch 3 目标】
- 单个离线核心 Setup Beta：双击安装→桌面快捷方式→启动后台和浏览器→首次创建 Admin；无需用户安装 Node/npm/Git/Python、执行命令或保留 CMD。

【修改范围（待批准）】
- 建议 Inno Setup、当前用户免提权安装；新增安装脚本、构建/验证、Actions 及文档。
- 安装根目录下 program 放完整受校验程序，卸载文件放其外；快捷方式指向 program/K-SESSION.exe。
- 沿用外置 Beta instance。基本卸载只移除本次安装的程序/快捷方式/登记，保留数据；已有安装或运行中实例写前拒绝，不做覆盖升级。

【明确不修改】
- 业务源码、页面、依赖锁、审批/财务/权限/数据模型；Launcher 校验和实例路径。
- 不做数据迁移、自动更新、OCR、签名、Release、main/v1.0.0；不进入 Batch 4。

【验收标准】
- 同 commit 配对构建；Setup/payload/manifest/hash/许可可追溯，零预置业务数据。
- Win10 x64 Beta 标准用户实际安装、快捷方式、无 CMD、离线核心通过；包内 Node，不依赖开发工具。
- 中文/空格路径、取消/权限不足/磁盘不足/已占用目录安全失败；安装后完整性、停止重启、卸载保留数据与重装登录通过。
- 新安装专项、既有完整回归及最终原始 Actions Setup 人工验收；未测 Win11/干净机不得宣称认证。

【风险与回滚】
- 代码确认 Launcher 拒绝根目录额外文件：卸载文件须隔离，不能放宽校验。
- 当前用户安装避免提权后数据归属错位；不强杀运行程序。Job 停止不是事务排空，先保存。
- unsigned 可能触发安全提示，不关闭安全软件；Artifact 有保留期限。
- 保留原 2B 整包；失败仅撤销本安装拥有的文件/快捷方式，保留外置实例。验证能回到 2B；源码正常 revert，不改 main/tag。

【关键数字 / 技术事实】
- source commit（2B受测）：cfc329fb405b1c5e4881e96eb8f2b4f78e8af552
- HEAD（归档前基线）：31fb819f87f2052dbbd756526bb50b5d86ae9689；归档后 SHA 见本文件 Git 提交及交付回执，不自引用。
- Node 24.21.0；npm 11.19.0（构建）；程序143,766,301 bytes / 1042文件 / 20生产依赖。
- Artifact：K-SESSION-portable-win-x64-cfc329fb405b1c5e4881e96eb8f2b4f78e8af552，ID10527372359。
- 内层 ZIP SHA256：35bda7ac54150622be6673570f065f753d2a6b3665ecd8619678abd771c6db44。
- Batch 3 Setup/大小/hash：N/A，未生成。

【实际测试结果】
- 引用既有 Portable 35294691905 attempt2、Launcher 35294691939 PASS；同 commit 26/26套742项，fail0 skip0。
- 用户重新完成1–8步全部正常，账号和数据保留。
- 本轮仅文档检查，没有重编译或复测；不修改原 Artifact 的历史 PENDING。

【未完成 / 当前阻塞】
- Batch 3 尚无实现、测试或安装包；等待方案审批。跨秒测试未修复，但非本批准入阻塞。

【本轮修改范围】
- 新增：Batch 3 PROPOSAL/本卡、独立 TEST-FLAKE 任务文档。
- 修改：2B结果/测试报告/交接卡及 PROJECT、Master Plan、验收、决策入口。
- 明确未修改：全部业务、构建、测试源码。

【Git状态】
- branch：codex/windows-installer-v1.1
- HEAD/commit：归档文档提交单列回执，与2B受测SHA分开。
- working tree/push：以交付回执实际核验为准；只允许开发分支文档提交。
- PR/Release：未创建；main/v1.0.0：未修改，核验均为84cbb324a4f63bef094d2c21d70eba841205a7a7。

【安全与边界】
- 未访问其他用途版本或真实业务数据；未引入账号/Token/密码；未修改业务逻辑。

【下一阶段判断】
- 允许提交 Batch 3 方案；不自动开始实现或后续 Batch。
【需要 ChatGPT 网页版决定】
- 审批安装器方向、当前用户目录、最小卸载保留数据、拒绝覆盖升级及仅 Artifact 范围。
【详细报告文件】
- batch-3/PROPOSAL.md；batch-2b/RESULT.md、PORTABLE-TEST-REPORT.md；test-flake-archive-updated-at/TASK.md（均在 docs/tasks/windows-installer-v1.1/）。

===== CHATGPT HANDOFF END =====
