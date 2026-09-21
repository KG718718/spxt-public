# Batch 3-R2 — Business Data / Attachment Location Selection

状态：**Batch 3 PASS — Windows 10 x64 Beta Track**。2026-09-21用户本次任务书确认新包人工1—10全部正常；结合下列既有自动化正式归档。仅公开仓库 KG718718/spxt-public；分支 codex/windows-installer-v1.1；R2 起点 a9104f8b233d56846b2eee8cf31cd078dea5d4d7。本次不重新测试/构建，不修改原Artifact历史字段。

## 已实现范围

- 程序仍固定当前用户 LocalAppData/Programs/K-SESSION-Beta；不恢复程序目录、程序组或 Ready 页面。
- 官方 Inno 数据位置选择页，显示原默认或记忆位置；中文/空格本地固定盘路径可选。整个 instance 不拆分，选择新位置不迁移旧数据。
- 安装绑定在 uninstall/instance-binding.ini，程序完整性保护目录之外；HKCU 仅保存上次程序/数据路径。桌面、开始菜单、完成页三入口传入所选 instance；直接 EXE 读取同一绑定，异常拒绝而非回退空目录。
- 路径交叠、系统目录、重解析点、未知非空、损坏实例或不可写位置拒绝；不删除用户文件。空实例只有非业务身份标记，不预置 Admin 或业务数据。
- 卸载删除 Inno 自有程序/快捷方式/卸载登记，保留所选全部数据和上次位置偏好。再次安装仍须显式确认数据位置，不做迁移或覆盖升级。

## 测试与历史

完整失败与修复证据见 INSTALLER-TEST-REPORT.md。两项安装器错误（数据页时序、静默拒绝弹窗）及后续 D10 向导测试驱动问题已逐项修复，失败历史保留，不以重跑冒充修复。

## 最终构建身份与结果

- 受测源码/构建 HEAD：e9417f036d0cdf736ff84682556a994040f0de0b；source tree：5da66cb9b73dfa307948634634bfab2cfaaead12。
- Setup [35514357007](https://github.com/KG718718/spxt-public/actions/runs/35514357007)，attempt 1 SUCCESS；同提交 Runtime 35514356958、Launcher 35514356976、Portable 35514356966 均 SUCCESS。
- 原始 [Artifact 10606870944](https://github.com/KG718718/spxt-public/actions/runs/35514357007/artifacts/10606870944)，名称 K-SESSION-setup-win-x64-e9417f036d0cdf736ff84682556a994040f0de0b，保留30天。ZIP 32,506,311 bytes，GitHub digest：4d88dd071fb9c14e85c2f2b0c5aab26f425ae25765c564ea275bc21483043f7f。
- 普通测试者使用内层 K-SESSION-Setup-1.1.0-beta.1.exe；32,988,254 bytes；SHA256：49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8。与旧同名文件不同，旧 hash 不覆盖。
- Node 24.21.0 / Go 1.27.1 / Inno Setup 6.7.3；20个生产依赖；installed program 1,042文件 / 143,784,221 bytes；业务 appVersion 1.0.0 未改。
- D01—D13 13/13 PASS；I01—I32 29 PASS、I01/I02/I09 3项人工 PENDING；同提交完整26/26套、742 checks、fail0、skip0。
- 真实断外网安装/核心功能/卸载/重装及网络恢复通过；Artifact身份和隐私白名单通过。D10已实际由可见完成页 Run 启动所选实例，不是静态断言。
- 哈希依据：本次 Actions build-info、上传日志及GitHub Artifact元数据一致。另尝试下载到内存独立复算，网络长时间无完成后停止了本次专属下载进程；未完成本机二次 ZIP/EXE 哈希复算，不声称完成。未将EXE保存本地。

## Git 与交付

代码已仅推开发分支。本报告及交接卡作为后续独立文档提交归档；该提交的实际 SHA 以 git log/file history 与交付回执为准，不替代上面的受测源码身份，不代表再编译。交付要求 git status 干净、远端开发分支一致；没有 PR/main/tag/Release 操作。

## 边界与未验证

业务 server.js、HTML/CSS、package.json/package-lock、Node/PDF、Runtime 布局及业务模型未改；Launcher 仅增加获批的安装数据路径契约。无其他用途版本读取，无真实数据、凭据导出，无 main/tag/Release、OCR、签名、Win11认证、Batch4。

本次新原始Artifact的Windows10人工十步已由用户确认全部正常，I01/I02/I09人工门禁因此补齐；上文自动化报告的PENDING保持生成时事实，不改成自动化32/32。无新增独立截图或日志，不把用户反馈写成Agent亲自操作证据。Win11、干净机、签名仍未认证；本机二次下载哈希复算未完成的事实不变。新目录不是迁移；unsigned安全提示不要求绕过。

完整自动化与HUMAN-ACCEPTANCE.md十步现已共同满足本批Beta门禁，用户批准PASS。本次文档归档SHA与受测构建SHA分开，不冒充重建。停止，不进入Batch4/main/tag/Release。
