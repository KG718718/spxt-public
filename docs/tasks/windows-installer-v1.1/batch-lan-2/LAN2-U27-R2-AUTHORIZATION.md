# LAN2-U27-R2 — 条件专项授权 / 2026-10-13

用户批准先本地等价性与安全准备；并非直接恢复 LAN-2、Full 或 QA。

- 唯一 Master：01a0db0e-c950-79e0-8e11-07155e0742f2。
- 原 LC01 Thread：01a11f35-5133-7ab0-9101-d9d01a69ccea。
- 原 worktree：E:\CodexWorkspace\CodexWorktrees\lan2-lc01\public-source；原任务分支保持。
- Master 只读核验 local/origin/GitHub 开发 HEAD：db4ee2cedaf17573181cab025320097df6f0cff9；Execution 基线40f046c9260b9c2c712a761095be317d1edcdfc6，clean/idle。
- 历史受测 Run38402818839 / source27de942346b511c17a651d20e8e766173bc241f0 / FAIL不改写。已证 U26后runSetup(targetBeta4,true)结果不成功；真实exit/拒绝marker仍未知。

## 等价性先行

先对照历史完整 TestUpgradeLifecycle 至U26：F3安装、全部fault/rollback链、beta2→beta4真实升级、受控退出、登记/Binding、program/uninstaller/快捷方式、业务instance与附件/LAN配置、锁和句柄。现有sequence/diagnostic模式删减前缀，不能直接视为等价。

优先审查保留历史完整前缀、仅在U27停止的独立入口；不执行TestSetup、U28—U30、外围Full/core742/QA。任何删减必须有状态不变量证明，无法证明就STOP。不得借专项擅自扩为Full。

## 工程与隐私

只允许专项测试入口、必要接线、固定报告/对应反例与治理。生产Launcher/Setup/Node、身份信任、安装接受条件、数据安全/事务/rollback/schema不改。复用已审查U27_PRE_INSTALL严格13字段报告。

fresh前只读观察：卸载收尾、ProductKey与保留BindingKey、install dir/uninstaller/快捷方式、受控进程退出、锁exclusive probe及handle关闭、instance与卸载前一致。未知必须UNKNOWN，不删除残留、不修改状态冒充符合、不固定sleep或放宽错误。fresh后原exitCode==0判定保持，报告固定退出枚举、既有白名单marker及有证据阶段。

不得保存raw日志/stdout/stderr/exception、路径/PID/凭据/业务/相关hash或长度。不得运行本机真实安装/解包/VM/probe，内部SPXT不访问。Execution仅local commit与RETURN，不push/Actions；14旧F3研究文件保留，不整合旧删除/未审研究。

## 门槛、预算、停点

等价性、隔离、安全失败诊断、生成器/合成反例/Go只编译/PS语法/privacy/diff-check全部fail0skip0及Master独立Review后，才允许独立LAN2-U27-R2 Hosted最多1次。目前0/1，Full0、QA0、LC010。触发必须与既有Full/QA/LC01路径及marker互斥，不retry或借预算。

任何PASS/FAIL都STOP交网页版；PASS仅专项U27，不代表Full、产品交付或LAN认证。无main/tag/Release/Batch5/OCR，禁止普通sub-agent及后代Thread，不清理工作树/失败历史。
