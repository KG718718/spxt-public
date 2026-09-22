# Batch 4 批准规格
来源：用户《Batch 4 — Safe Upgrade / Rollback / Data Lifecycle》及正式启动指令。本文件归纳已批准规则，不授予新产品决定权。

## 身份与来源
installerVersion=1.1.0-beta.2；appVersion=1.0.0（不改 package.json）；dataContractVersion=1（只存安装元数据，不改 data.json）。
Inno Setup 6.7.3；同 AppId KSESSION-Beta-Installer-v1；lowest、per-user、无 UAC/无 CMD；默认程序根 %LOCALAPPDATA%/Programs/K-SESSION-Beta，program/uninstall 分离。
只自动升级可验证 beta.1：AppId、登记、root、uninstall metadata、instance binding、安装版本、program manifest/hash、runtime manifest、source/build identity 全部核对。
拒绝在线 v1.0.0、Portable、未登记 EXE、未知/损坏登记、缺失非法 binding、篡改程序、未知数据契约、同版本及 downgrade。不猜测。旧 beta.1 Setup 对已装 beta.2 也必须拒绝，不能修改旧发行物实现此项。

## 数据及运行状态
Fresh install 保留 Batch3-R2 数据位置选择。Upgrade 不再选择位置，展示原 instance 和“升级不会移动或删除业务数据与附件。”所有启动入口沿用原 binding，包括直接 EXE。
升级前只读验证 instance 存在、binding/登记一致，存在的 data/config 可读取解析并满足现行 public startup contract，附件/backups 路径结构安全无危险 reparse/symlink，新版本支持 DC1。
不得初始化、创建 Admin、保存 data/config、改附件、轮换 backups、自动迁移或回退默认空实例。
正在运行的 Launcher/相应私有 Node/占用 instance lock 拒绝升级，提示保存并“停止服务并退出”；禁止 taskkill、杀全部 node、强制 Restart Manager、绕过锁。
未知非空/不可写/系统/相交/危险重解析路径仍保持原门禁，不删除目录内容。

## 安装事务
仅修改安装器拥有的 program、uninstall/installer metadata、shortcuts、registration。先全量只读 preflight，再进入可恢复事务，payload/post-copy 完整校验与安装状态验证成功才提交。
提交前取消、copy、payload hash、post-copy verify、磁盘/权限等失败必须恢复旧 program、可启动 Launcher、原登记、binding、shortcuts；无混合版本、半升级、双登记。
临时恢复副本只能包含 program/installer metadata，不复制业务 instance 为长期备份。已成功升级后不提供产品级回退/Repair。
安装状态至少记录 installerVersion/appVersion/dataContractVersion/sourceCommit/runtimeManifestHash/launcherHash/programManifestHash/instanceBindingSchema/installRoot/instancePath/upgradeFrom/upgradeTo；不记录业务、账号、凭据正文。
升级结束且首次新版启动之前 instance 业务文件逐字节一致：data/config/attachments/backups/mail config fixture/DPAPI fixture。secret 仅存在性、大小/hash；禁止正文。正常首次启动允许原有 launcher-logs/temp/runtime 控制文件变化，账号/业务/附件/配置不变。
结构化 backup-service 仅 data.json 备份，不等于整个 instance 完整备份。

## 固定边界
必须用真实 e9417f0 源码 fresh 重建 beta.1，固定 commit/Node/Go/Inno/lock/runtime hash/launcher identity，记录重建身份及其与历史发行物关系，不以 beta.2 假冒、不长期依赖过期 artifact。若无法可靠重复重建立即 BLOCKED。
产品/UX/业务保存语义/schema/migration/重大架构冲突整理事实、约束、方案、影响、网页版决策点并停止；主控不代决。
