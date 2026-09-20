# Batch 3 规格（已获任务书授权）

## 来源及边界

2026-09-20 正式任务书批准 Inno Setup、当前用户、PrivilegesRequired=lowest、单EXE、离线核心、桌面/开始菜单、Windows卸载入口。PROPOSAL.md 保留历史，不覆盖。仅公开仓库 codex/windows-installer-v1.1；业务/Launcher源逻辑及 package/lock 不改。

## 安装契约

- installerVersion=1.1.0-beta.1；appVersion 读取实际 package，当前1.0.0，不篡改。
- 默认 {localappdata}/Programs/K-SESSION-Beta；普通UI无目录选择，自动化 /DIR 可指定隔离中文空格路径。
- program 为原完整Portable；uninstall独立于program，包含Inno自有卸载文件及安装层许可/身份。不放宽Launcher校验。
- 数据沿用 LOCALAPPDATA/K-SESSION/Beta/instance；Setup 不写业务data、不创建预置Admin、不初始化/清空instance。卸载日志记录的自有文件，不用目录通配递归删除，不设删除数据选项。
- 安装前检查原生x64、Win10+、登记、目标空/不存在、目录合法无重解析、空间、可写、同产品活动进程/实例锁。卸载前同样查运行并锁定自身EXE防止卸载过程中重启。不杀进程。
- 未知非空目录/已有安装/运行中：写前拒绝，指导先保存并停止再卸载。其他Node进程不影响安装。
- 用户快捷方式指向program/K-SESSION.exe，不经CMD/PowerShell。
- 冻结payload逐文件hash；安装后核验；安装器资料留在uninstall，程序清单不变。

## 构建身份与安全

固定官方Inno6.7.3，下载hash/签名/许可验证；同一commit fresh Runtime+Launcher+Portable验证后构建，不用2B旧ZIP。安装层记录版本、source/tree、所有关键hash、编译器版本和unsigned。产物只进Artifact，不进Git。

测试使用合成数据和E盘隔离路径；CI当前用户登记与快捷方式测试仅在一次性runner。开发机不改已有Beta数据/快捷方式/登记。权限不足/空间不足/取消必须失败安全。编译期独立故障夹具仅可阻止安装，不能绕过门禁；最终Setup无测试后门。

## 状态

Win10人工向导验收必须本次原始Actions产物；Win11未实测不是阻塞。任何未做测试标PENDING，不把纯静态检查冒充真实安装；I01–I32以及26/742和Portable全部满足才可最终PASS。
