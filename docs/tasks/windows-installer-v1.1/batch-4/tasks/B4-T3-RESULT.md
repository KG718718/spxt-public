# B4-T3 Result — Transactional Upgrade Core / Failure Recovery

状态：**PASS（仅 B4-T3 本地可证明范围）**。已实现 beta.2 安装元数据、T1/T2 双门禁接入、program/installer metadata/shortcut 的可恢复事务核心和失败恢复专项；未执行真实 Inno 编译、真实 beta.1→beta.2 安装、registry/shortcut/取消/磁盘/权限故障注入或完整生命周期，不能据此报告 U10、U18—U25 或 Batch 4 PASS。真实构建和 Windows 生命周期仍由 B4-T4/Actions 独占。

## 工作树与基线

- worktree：`E:/CodexWorkspace/CodexWorktrees/e98f/public-source`
- origin：`https://github.com/KG718718/spxt-public.git`
- baseline：`3de4b7665b1529f92c9e7b42512b42722fe7e299`
- local branch：`codex/b4-t3-transaction-upgrade`
- 首次进入时为 detached HEAD、工作树 clean；完成硬门禁读取后才创建上述本地分支。未 fetch、未读取或复制其他用途版本、未连接真实实例、未 push。

## 实现事实

### beta.2 固定身份及构建契约

- `installerVersion=1.1.0-beta.2`、`appVersion=1.0.0`、`dataContractVersion=1`；同 `AppId=KSESSION-Beta-Installer-v1`、Inno 6.7.3、`lowest`、per-user、固定程序根、program/uninstall 分离、无 Restart Manager/taskkill/UAC/CMD。
- build 必须接收并通过 T1 `validateBundle` 的完整 historical+fresh approved identity bundle；bundle 原始字节 SHA256 编入 Setup。T3 没有伪造 `fresh-ci-baseline`，该输入必须由 T4 真实重建后提供。
- build-info 新增并固定 `dataContractVersion`、`instanceBindingSchema`、`programManifestHash`；fresh 和 upgrade 均生成包含批准 12 个字段的 `install-state.json`。
- beta.2 payload 在 upgrade 模式只写 `{tmp}/ksession-upgrade-v1` staging，不直接覆盖 `{app}/program`；fresh 仍沿用 Batch3-R2 数据位置选择和原程序布局。

### T1/T2 只读门禁接入

- Setup 从 beta.2 payload 提取固定 Node，不执行旧安装 Node；一次 gate 同时调用 T1 exact approved identity 和 T2 DC1 read-only instance preflight。
- 只允许精确 beta.1；Portable/未登记、legacy v1.0.0、同版/高版、登记或 binding 缺失/冲突、program/manifest/runtime/Launcher 篡改、未知 DC 均在事务前拒绝。
- Upgrade 跳过数据位置选择页，显示原 instance 及“升级不会移动或删除业务数据与附件”；所有入口仍使用原 binding。
- 进程检查后必须打开既有 `.launcher.lock` 并在事务关键区持续持有；upgrade 缺失 lock 时拒绝，绝不创建 lock、杀进程或强制 Restart Manager。

### 可恢复事务

- `upgrade-transaction` 只处理安装器拥有的 program、完整 uninstall/installer metadata 与两个快捷方式；plan 明确拒绝 install/staging 与 instance 交叠，代码不读取、复制或写入业务 instance。
- `prepare` 在任何 program 改写前保存旧 uninstall metadata/快捷方式并建立封闭 journal；`commit` 再次验证 staged manifest、完整 inventory、Runtime 和 Launcher hash，然后同卷 rename 旧 program 到 recovery、新 program 到正式位置。
- 新 program 交换后再次验证；metadata 或 post-copy 失败自动恢复旧 program、旧 uninstall metadata 和旧快捷方式。Inno `DeinitializeSetup` 对取消/复制失败/后续异常调用 rollback，并恢复旧登记/binding 的批准字段。
- `finalize` 前验证 payload、快捷方式、唯一同 AppId 登记、beta.2 DisplayVersion 及原 binding；成功后才删除 recovery。没有 Repair 或成功升级后的产品级回退入口。

## 失败优先与本地证据

- 首轮故障 `after-old-program` 暴露真实缺陷：旧 program 已移入 recovery、journal 尚为 PREPARED，rollback 未恢复 program；专项结果 5 PASS / 1 FAIL。修复为同时以 journal phase 和 recovery/old program 实际存在性判断后，三个故障点全部恢复。
- T3 transaction/gate/contract：14 PASS / 0 FAIL / 0 SKIP。覆盖旧 program 移走后故障、新 program 就位后故障、metadata 后故障、payload 篡改、未知 uninstall entry 拒绝、instance scope、完整 install-state、bundle hash、T1/T2 任一失败、helper 结果不一致、升级页/最低权限/事务生命周期静态契约。
- T1 upgrade-detection：45 PASS / 0 FAIL / 0 SKIP。
- T2 upgrade-preflight：19 PASS / 0 FAIL / 1 SKIP；SKIP 仍是本机无 Windows file-symlink 创建权限，junction/深层 reparse 反例通过，必须由 T4 hosted Windows 补实测。
- T1A historical identity：70 PASS / 0 FAIL / 0 SKIP。
- public startup：80 checks PASS；filesystem 文件按既有策略报告 cloud-only real filesystem checks SKIP，未创建本地 fixture。
- installer contract：`INSTALLER CONTRACT PASS`、`R2 DATA LOCATION CONTRACT PASS`。
- 新增/修改 CJS 全部 `node --check` PASS；`git diff --check` PASS（仅现有 Git LF→CRLF 提示）。

## U 系列映射

- 本地直接覆盖：U01/U03/U04/U05/U06/U07/U08/U09/U11，以及 U14/U15/U16/U17 的 helper/contract/字节不变部分；U18/U19 的提交前空间/写权限顺序契约；U20/U21/U22/U23 的事务 helper 与 Deinitialize rollback 契约；U24/U25 的静态与终态验证契约。
- 未宣称真实通过：U10；真实 Windows U14；真实磁盘不足、ACL、用户取消、Inno copy、registry、shortcut、唯一登记、卸载/重装、离线及日志/Artifact 的 U18—U30。它们必须在 T4 的真实旧版重建、故障注入和 Actions 生命周期中验证。

## 已知风险与 T4 必做

1. 本机无 Inno 6.7.3 编译器，且完整 bundle 必须等待 T4 的真实 `fresh-ci-baseline`，所以本轮没有编译 EXE；Setup Pascal、Inno 回滚次序、HKCU shared view、uninstaller 文件锁与 shortcut 创建时机必须由 T4 实装验证。
2. Inno 自身可能在 `ssPostInstall` 前更新卸载登记/uninstaller。T3 已在 `PrepareToInstall` 前保存旧 installer metadata，并在失败路径恢复固定登记字段；T4 必须以真实 registry 全值、唯一登记及完整卸载目录比较证明没有半升级或双登记。
3. 真实 copy/cancel/ACL/space/post-copy 故障必须证明旧 Launcher 可启动、原登记/binding/shortcuts 完整、recovery 无残留、instance 指定夹具逐字节不变；不能只引用 Node helper 单测。
4. `setup_windows_test.go` 和 workflow 仍是 T4 独占的真实生命周期入口，当前仍含 beta.1 历史构建假设；T4 应在 fresh e9417f0 独立 checkout 生成 profile 后接入 beta.2 build 参数和 U01—U30，不把合成登记替代真实安装。

本任务没有改 `server.js`、业务页面、package/lock、Node/PDF/OCR、workflow、ORCHESTRATION、真实数据或其他用途版本；未创建子任务/Agent/worktree，未 push/merge/main/tag/Release。
