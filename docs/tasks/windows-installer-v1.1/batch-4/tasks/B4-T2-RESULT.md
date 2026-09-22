# B4-T2 RESULT — Read-only Data Contract / Instance Preflight

## 结论

**PASS（仅 B4-T2 独立 helper 与合成测试）**。已在基线 `b96543ddde2888513be2f2cc1f8e39a4831f1571`、本地分支 `codex/b4-t2-instance-preflight` 实现 DC1 实例只读预检；未接入 Setup/Launcher，未操作真实注册表、默认 Beta 实例或现有安装，不能据此宣称 U14/U15 或 Batch 4 通过。

## 实现与边界

- `tools/windows-installer/upgrade-preflight/index.cjs` 是 CommonJS CLI/模块，仅使用 Node 内置模块，并复用受信任应用资源中的 `public-startup.js#loadStartupState` 及其现行验证链。
- 调用方必须显式提供绝对 `installRoot`、`instancePath`、`bindingFile`、登记读取所得 `registeredInstallRoot` / `registeredInstance`、`dataContractVersion` 和已校验的 beta.2 暂存 `appRoot`。没有默认 instance 回退。
- 校验登记预期、UTF-16LE/UTF-8 binding 的 Schema/InstallRoot/Instance、DC1、实例存在且与程序/系统保护路径不交叠、应用资源与 binding 来源位置、data/config 解析及 public startup contract。
- 对实例、应用资源和 binding 的祖先逐级检查链接/重解析；递归遍历完整 instance 的目录项与属性，未知普通文件/目录继续允许，但任意名称、任意深度的 symlink/reparse/特殊文件均失败关闭；已有 data/config/mail/DPAPI/lock 还必须为普通文件。遍历不读取未知文件正文。
- 无 data/config 时沿用现行首次实例语义：空实例或仅含 `.ksession-instance-v1`、`.launcher.lock`、`launcher-logs`、`temp` 的受控状态可判定未初始化；配置、邮件/secret、非空附件/备份或未知文件残留均拒绝，不创建 data/config/Admin/目录/marker。
- stdout 仅一行稳定 JSON：成功为 `{"ok":true,"code":"PREFLIGHT_OK","state":"initialized|uninitialized"}`；失败只含 `ok/code`，stderr 为空，不含路径、账号、业务正文或 secret。

## T3 调用契约

```text
<trusted-beta2-node> index.cjs \
  --install-root <verified-beta1-install-root> \
  --instance <verified-bound-instance> \
  --binding-file <install-root>/uninstall/instance-binding.ini \
  --registered-install-root <T1/T3-read-registration-root> \
  --registered-instance <T1/T3-read-registration-instance> \
  --data-contract 1 \
  --app-root <verified-staged-beta2-app-root>
```

退出码：`0` PASS；`10` 参数；`11` 未支持数据契约；`12` 应用资源；`13` 实例路径/存在性；`14` 登记或 binding；`15` data/config/startup contract；`16` 目录结构/链接；`17` 未分类内部失败。T3 必须同时要求进程退出码为 0 且 JSON 为 `PREFLIGHT_OK`，其他结果一律在 program 改写前失败关闭。

打包/暂存依赖：本 helper、beta.2 固定 Node，以及同一已校验 beta.2 app 资源中的 `public-startup.js`、`public-config-store.js`、`tax-config.js`、`invoice-access-policy.js`、`service-fee-config.js`、`bonus-config.js`。`appRoot` 可以在安装根外的事务暂存区，但不得位于 instance 内或包住 instance；T1/T3 必须先完成 payload/program 来源与哈希验证，helper 不替代 T1 身份检查。

预检本身不创建或占用 `.launcher.lock`，也不读取注册表。T3 必须先拒绝运行中的 Launcher/私有 Node，使用不创建新文件的方式取得并在事务关键区持续持有既有实例锁；在任何 program/登记写入前最后调用本 helper，并在锁保护下保持 binding/登记/实例不变。若无法消除预检后到写入前的竞态，必须 BLOCKED，不得仅依赖一次早期预检。

## 测试证据

- `node --test tools/tests/windows-installer/upgrade-preflight/preflight.test.cjs`：返工后 **19 PASS / 1 SKIP / 0 FAIL**。每次调用前后均深比较完整实例目录项、文件大小与 SHA-256；覆盖有数据、受控未初始化、实例缺失、data/config 坏 JSON、非法配置审计、非法 public state、孤立配置、binding/登记冲突、未知 DC、缺应用契约、attachments/backups 链接、未知未初始化残留、实例祖先 reparse、未知顶层 junction、未知普通目录深层 junction、诊断脱敏。
- Windows reparse 反例使用本机实际 directory junction 创建并通过；不是 Linux 或纯静态替代。未知顶层 file symlink 因本机 Windows 权限 `EPERM/EACCES` 明确 SKIP，不把 junction 结果冒充 file symlink 实测。
- secret fixture 运行时随机生成；证据只断言存在、47 bytes、64 位 SHA-256，不输出或提交正文。
- 首次专项运行：13/14，唯一失败为测试快照函数不能表示“目录本来不存在”；保留在任务对话输出。修复测试工具后 17/17。主控 Review 返工先新增未知链接失败优先反例，结果为 17 PASS / 2 FAIL / 1 SKIP，两个 junction 漏检均返回错误的 `PREFLIGHT_OK`；完整 instance 元数据遍历修复后为 19 PASS / 1 SKIP / 0 FAIL。未删除或放宽原有断言。
- `node --test tools/tests/public-startup.test.js tools/tests/public-startup-filesystem.test.js`：现行 startup **80 项 PASS**；filesystem 文件按其既有本地策略明确 SKIP cloud-only 实装检查。
- `node tools/tests/windows-installer/contract.cjs`：`INSTALLER CONTRACT PASS`、`R2 DATA LOCATION CONTRACT PASS`。
- `node --check` 两个新增文件：PASS；`git diff --check`：PASS。
- `npm test`：运行 26 个既有测试文件后 **FAIL 2**，不归因于本任务：`public-export-privacy.test.js` 因工作树未安装 `write-excel-file/node`；`public-product-docs.test.js` 因基线 Batch 4 intent 中已有受禁止的其他用途版本表述。按任务边界未安装 node_modules、未修改越权文档或断言来消除失败。

## 未覆盖与已知风险

- 未进行真实 Setup、registry、进程占用、安装事务、U14/U15、Actions 或 Artifact 验收。
- helper 验证的是调用时文件状态，不提供跨进程原子快照；T3 的锁持有、最终重验与事务恢复仍是必要条件。
- 完整 instance 元数据遍历成本随目录项数量线性增长；这是发现未知名称深层 reparse 的安全代价，不读取未知普通文件内容，也不改变未知普通文件/目录的产品接受规则。
- 完整公开回归目前有上述两个基线/环境失败；主控整合后应在依赖完整且文档门禁修复的受控环境复跑。
- 新专项尚未加入既有 `run-public-tests.js` 或 workflow；该文件不在 T2 授权修改范围，T3/T4 需把精确命令加入集成/CI 门禁。
