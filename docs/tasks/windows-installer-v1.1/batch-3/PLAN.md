# Batch 3 执行计划

等级 L2；依据用户已批准正式任务书、intent.md、SPEC.md。本任务串行，无新任务/Agent/worktree。
1. 只读复核公开HEAD3733d99、branch、干净状态和2B契约；固定Inno来源/hash/许可。
2. 建立失败优先静态测试（缺安装器应失败），实现 tools/windows-installer 下脚本和Inno入口，生成精确文件/校验include，不改受校验程序。
3. 新setup-v3.yml从同commit fresh执行Portable既有ci，再冻结payload构建Setup。
4. 安装专项在独立runner/E盘安装目录、隔离合成实例中运行；目标路径、权限、空间、取消、运行锁、不覆盖和卸载数据保留为重点。不扫描真实数据、不启用真实邮件。
5. 同commit重新26套742项；已登记flake只有匹配证据时允许一次正常重跑，保留首次日志，其他失败不归入flake。另dispatch原Portable workflow验证独立性。
6. Artifact仅白名单发布EXE/hash/身份/许可/无敏感证据。下载原始候选核hash后交用户10步向导验收；未完不可PASS。
7. RESULT/测试报告/交接卡如实记录已测、未测、风险；只push开发分支，不改main/tag/Release。

## 文件允许范围

tools/windows-installer/**、tools/tests/windows-installer/**、新增 tools/windows-launcher/setup_windows_test.go（复用既有Win32测试辅助；不进入生产EXE）、.github/workflows/setup-v3.yml、batch-3文档及PROJECT/MASTER-PLAN/ACCEPTANCE/DECISIONS状态。既有生产业务、package/lock、Launcher完整性/实例逻辑、公共测试断言不改。现有Portable原始workflow/契约不改。

## 回滚

## 整机离线验证实现

仅在本公开仓库的 GitHub-hosted 一次性 Windows runner 内运行 offline-ci.ps1；
固定 Runtime/Go/Inno 和三个 Setup 文件均在断网前完成构建。按原始 InterfaceGuid 精确记录所有已启用网卡，
先启动隐藏的180秒恢复监护进程，再临时禁用这些网卡。测试前/后要求没有Up网卡且已固定的外网TCP探针失败，
实际安装/核心API/卸载/重装均在此窗口内完成；finally 恢复原网卡并复核外网恢复。
超时监护恢复会令本次证据无效，不能算通过。证据仅保留计数、时间、状态和commit，不导出网卡地址、账号或实例。
不修改防火墙、不在本机执行、不触碰其他主机；不把CI管理员token下的测试当成标准用户免提权人工验收。
依据微软 Disable-NetAdapter / Enable-NetAdapter 官方文档；其远程连接风险由一次性runner范围及独立恢复监护约束，
不得把该脚本用于长期或生产主机。

## 回滚实施边界

仅撤销本轮安装器拥有且记录的文件/快捷方式/登记；不清空外置数据或未知文件。源码正常revert不forcepush；保存原2B证据。测试前明确安装目标，新安装器先在隔离runner测试，不先对本机真实默认目录试卸载。
