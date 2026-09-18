# Batch 3 — Setup Beta 实施范围提案

日期：2026-09-18。状态：**PROPOSED / 待再次审批，未实施**。
仅 KG718718/spxt-public / codex/windows-installer-v1.1。Batch 2B 已获用户正式批准；本文件不是安装器测试报告或技术选型批准记录。

## 证据基线与事实、建议的区分

- 已确认：受测源码 cfc329fb405b1c5e4881e96eb8f2b4f78e8af552；Portable Actions 35294691905 attempt2，Artifact 10527372359。原始内层 ZIP SHA256 35bda7ac54150622be6673570f065f753d2a6b3665ecd8619678abd771c6db44。
- 已确认：用户对本次 Actions 整包重新完成 1–8 步，全部正常；既有 26 套 742 项 fail0 skip0、Launcher 和 Portable PASS。本次未重建、未复测。
- 已确认：tools/windows-launcher/core.go 的 verifyRuntime 严格校验根目录，只允许既定目录及 K-SESSION.exe/build-info.json。实例默认位于 LOCALAPPDATA/K-SESSION/Beta/instance；启动不依赖系统 Node/npm。
- 基于代码的风险判断：常见安装器若把卸载程序直接写进受校验的程序根目录，将触发额外文件拒绝；必须在打包布局上隔离，不能放宽 Launcher 检查。
- 下列 Inno Setup、安装目录、快捷方式、拒绝覆盖和最小卸载均为本次建议，等待上级随范围批准；尚未编写 .iss 或修改构建代码。

## 一、目标

生成供验收的单一离线核心安装候选，例如 K-SESSION-Setup-1.1.0-beta.1.exe，**仅 Actions Artifact，不创建 Release**。

下载 → 双击安装 → 当前用户桌面/开始菜单快捷方式 → 双击启动 → 自动启动包内 Node → 默认浏览器 → 新实例首次创建 Admin；已有 Beta 实例保留原账号与数据。

用户无需安装 Node/npm/Git/Python、执行命令、配置环境变量、手工启动后台或保留 CMD。安装后核心运行不得在线下载依赖。OCR、发邮件等外部能力不据此宣称离线可用。

## 二、修改范围（批准后才执行）

### 安装器及布局建议

使用 Inno Setup 候选，实施前固定具体版本、官方来源、下载 hash 与许可；不得自动使用浮动 latest。按当前用户安装、不请求管理员提权，不注册系统服务/开机启动，不修改防火墙。

建议布局（不是 Batch 4 最终生产目录契约）：

```text
%LOCALAPPDATA%/Programs/K-SESSION-Beta/
  program/              # 完整、受 Launcher 校验的 Portable 程序
    K-SESSION.exe
    build-info.json
    app/ runtime/ manifest/ licenses/ hashes/
  [安装器拥有的卸载文件]  # 在 program 外，不污染清单

%LOCALAPPDATA%/K-SESSION/Beta/instance/
  [用户数据及 launcher-logs]  # 沿用 2B，不属于卸载删除范围
```

快捷方式指向 program/K-SESSION.exe。使用 Windows 用户目录接口/安装器常量，不写死 C 盘、用户名或桌面路径。不新增 Admin、不预置业务数据；已存在实例绝不重新初始化。

参考官方 [PrivilegesRequired](https://jrsoftware.org/ishelp/topic_setup_privilegesrequired.htm)：lowest 为非管理员模式。使用该模式仍须实际验证标准用户目录/快捷方式/卸载权限，不能仅凭设置宣称无需权限风险。

### 构建与文件范围

预计新增 tools/windows-installer/ 下 .iss、构建与验证脚本；相关隔离测试、独立 Actions workflow、batch-3 的 L2 规格/计划/验收及结果。现有 Runtime/Launcher 打包接口只在确需接入时最小改动并列清单；如需改运行逻辑须另报，不能默认为授权。

同一明确源码 commit fresh 生成 Runtime 和配对 Launcher，再封装 Setup；保留 payload manifest、依赖许可、各层 hash、工具版本、安装器身份及测试证据。不把文档提交冒充重编译，不拼接来源不明二进制。安装 EXE 不提交 Git。

### 最小卸载与防覆盖

安装器仅管理本次自己的程序、快捷方式、当前用户卸载登记。卸载保留外置数据，不提供“删除业务数据”选项。

发现已有安装、目标目录不明/非空、同一 Beta 实例正在运行时，写入前明确拒绝并提示先保存/停止或按指引处理。不强杀进程、不覆盖升级、不默默换端口启动第二个同实例后台。不用 Windows 自动关闭应用机制强关在途请求。

中断/取消首次安装，只清理本次已创建且归属明确的安装文件；绝不递归删除用户数据或未知目录。覆盖升级、降级与自动修复留 Batch 4。

## 三、明确不修改范围

- server.js、业务页面、金额/税费/审批/权限/冻结/数据模型不改；package.json/lock 不因安装而改。
- 不改变 Launcher 数据目录契约/完整性规则/Job 停止行为，不引入 Electron/WebView2。
- 不做正式数据迁移、覆盖升级、自动更新、删除数据式卸载、进程事务排空。
- 不做 OCR 自动安装、签名、正式兼容性认证或 Release；后续 Batch 分别处理。
- 不访问其他用途版本、真实部署或业务数据；不读取/输出凭据。
- 不改 main/v1.0.0，不创建 PR、不合并；仅按 GitHub-first 上传开发分支与 Actions 候选。
- 不修 TEST-FLAKE，本轮只登记独立待办；不自动进入 Batch 4。

## 四、验收标准

1. 构建身份：一个 commit 的源码/锁文件/Runtime/Launcher/安装 EXE 可追溯；包中零预置业务数据和凭据，许可证完整。
2. 一次安装：Windows 10 x64 Beta 实机标准用户，安装、桌面/开始菜单快捷方式、启动/自动开页/无 CMD 均成功；不要求额外开发组件或用户命令。
3. 离线核心：隔离网络后，安装并使用包内 Node；合成实例首次 Admin、PDF 文本、上传、Excel 导出、备份恢复通过。备份恢复只对合成实例操作。
4. 用户状态：仅关浏览器、停止、再次启动符合 2B；原测试账号/数据保留。卸载仅删本安装程序和快捷方式；外置数据不变；再次全新安装后仍可登录，不冒充覆盖升级测试。
5. 安装边界：中文/空格路径；Windows 架构判定；无权限/空间不足/取消/已有非空目录/运行中实例，均可诊断且不写坏原目录和数据。拒绝 x86/ARM 未支持候选，不静默借模拟运行宣称支持。
6. 完整性：安装后的 program 与受测 payload 清单/hash一致；卸载文件不导致 Launcher 校验失败；缺失或篡改 payload 必须拒绝。
7. 回归：保留现有 Launcher/Portable 与完整公共回归门禁，记录准确套数及 fail/skip，不把历史 742 项当成本次结果。新增安装专项与最终原始 Actions Setup 人工验收均提供证据。
8. 状态限制：Windows 11、真正无开发环境的干净机未验证就明确标注；沿用 R5A 的 Windows 10 Beta 优先，不把 Hosted Windows Server 当作消费版认证。完整干净机器验收保留 Batch 6，正式发布仍需后续批准。

TEST-FLAKE 已独立立项，不阻塞 Batch 3 开发准入，但不等于允许忽略 CI 失败、删断言或反复静默重跑。若再现须公开记录原失败、分析归因及重跑身份；新功能错误不能归入既有 flake。

## 五、风险点

| 风险 | 本批约束 / 处理 |
| --- | --- |
| 卸载文件进入校验根目录导致不能启动 | program 独立；不放宽清单 |
| 提权后安装/启动进入另一个用户资料夹 | 当前用户非提权；验证快捷方式与数据上下文一致 |
| 安装器覆盖活跃程序或同一实例 | 写前拒绝；先保存再手动停止，不强关 |
| 卸载误删外置账号/数据 | 明确所有权边界，卸载不触碰 instance |
| 未签名触发 SmartScreen/安全软件提示 | 如实标注 unsigned Beta；不关闭杀毒或绕过组织策略 |
| Windows 10 生命周期及 Win11 未测 | 仅报告实测版本/补丁；不宣称所有 Windows 支持 |
| Job 停止不是事务排空 | 无在途写入时验收；未来 Batch 4 单独处理 |
| Artifact 30天失效 | 记录截止时间/hash，不当作永久下载渠道；不擅自发 Release |
| 权限/磁盘/取消留下部分文件 | 只回收本次拥有文件；失败不初始化或擦除数据 |

## 六、回滚方案

- 保留 Batch 2B 原始已验收 Artifact/内层 ZIP，不改名覆盖原发行物；新 Setup 使用独立身份/hash。
- 实施测试仅合成实例，测试前生成可核验快照；不接入真实用户数据来验证卸载/恢复。
- 若 Setup 失败：停止本候选、撤销其拥有的程序/快捷方式/安装登记；不递归清空实例。未知文件不自动删除。
- 本批不改 schema/业务/实例路径。验证可回到已验收 2B 配对程序继续使用原 Beta 实例；若出现不能复用的迹象立即停工，不自动迁移或覆盖恢复。
- 源码回滚仅开发分支正常 revert；不 force push、不重写 main/tag。是否保留或撤回 Actions 候选按验收记录办理。

## 请求上级审批

请批准或调整：Inno Setup 候选方向、当前用户安装、program 与卸载文件分离、沿用 Beta 外置数据、基本卸载保留数据、拒绝覆盖升级、本批仅 Artifact。

批准后补齐对应 L2 规格与执行顺序，在已批准边界内实施；出现工具许可、需要提权、需要业务入口适配等实质扩范围问题先回报。此时点没有 Setup 实现、构建或新测试结论。
