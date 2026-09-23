# B4-T4 Result — Upgrade Lifecycle / CI / Fault Injection

状态：**BLOCKED — 第四次 GitHub hosted Windows 运行已通过 exact beta.1 重建与 fresh identity，但 beta.2 Portable 重启探针失败。** 尚未生成 beta.2 Setup 或 U01—U30 的真实 PASS 证据。本执行任务无 push 权限；下述 `NOT RUN` 不得改写成 PASS，主控整合并 push 后应以修正后的下一次运行结果为准。

## Preflight

- worktree：`E:/CodexWorkspace/CodexWorktrees/f8bd/public-source`
- origin：`https://github.com/KG718718/spxt-public.git`
- baseline：`a3c206c48ef0bb95e054ab9a4784043a58f0ee56`
- local branch：`codex/b4-t4-upgrade-lifecycle`
- 进入时 `git status --short` 无输出；目标分支此前不存在，从 detached baseline 创建。未 fetch、push、merge、操作 main/tag/Release。

## 已完成实现

1. `setup-v3.yml` 在独立 checkout 精确检出 `e9417f036d0cdf736ff84682556a994040f0de0b` / tree `5da66cb9b73dfa307948634634bfab2cfaaead12`。首次 hosted run 证明该提交原完整 `ci.ps1` 的可见向导 `TestSetup` 存在已知 COM timeout，因此现改由 `rebuild-beta1.ps1` 只调用该固定提交自身的 Runtime→Launcher→Portable、Inno toolchain、installer contract 与 candidate `build.cjs`；不运行历史 `offline-ci.ps1/TestSetup`，也不使用 beta.2 构建逻辑生成 beta.1。
2. 新增 `fresh-identity.cjs`：从同次 fresh beta.1 build 的 generated manifest/build-info 与 program inventory 生成 `fresh-ci-baseline`，与仓库已审查 historical evidence 组合；完整 fingerprint 相同时才显式合并 sources，否则保留两个 profile；最终必须通过 T1 `validateBundle`。
3. 修正既有真实 Setup 测试仍硬编码 beta.1 文件名的问题，使 `TestSetup` 保留 beta.2 fresh install 回归；新增独立 `TestUpgradeLifecycle` 执行 beta.1 安装、合成 Admin/附件/备份、运行中拒绝、停止、beta.2 原位升级、首次新版启动前完整 instance hash 对比、原账号与附件下载、卸载保留、fresh beta.2 重绑与再次登录/附件验证。
4. 新增真实故障 fixture：磁盘不足、真实 ACL 权限不足、复制中取消、受控 copy 异常、target payload manifest hash 冲突、post-copy verify 异常。生命周期测试对每次失败前后的完整 program/uninstall 文件、registration、binding、快捷方式和完整 instance 文件 hash 做精确比较。
5. hosted CI 设置 `KSESSION_REQUIRE_FILE_SYMLINK=1`，T2 file symlink 无权限时由 SKIP 改为失败；junction/深层 reparse 原断言保留。
6. offline gate 串行运行 beta.2 fresh 测试和 beta.1→beta.2 lifecycle；Artifact allowlist 新增封闭的 `UPGRADE-TEST-REPORT.json`，要求 U01—U30 恰好 30 项。raw Setup logs、实例、密码、附件正文、缓存及旧 Setup 不上传。
7. `core-client.cjs` 在合成身份文件中保留合成附件名；existing 模式确认未关联业务记录的临时附件 owner 不跨重启（员工 403），再由 Admin 认证下载旧附件并逐字节比较，而不是仅检查磁盘存在或再上传新文件。
8. `verify-beta1-build.cjs` 对 build-only 的 program inventory、generated/artifact manifest、build-info、固定 Node/Go/Inno/lock 身份、candidate Setup bytes/hash、portable staging/extracted PASS 和封闭 artifact 清单做独立校验。该结论仅为“fresh beta.1 受信任升级源重建完成”，明确记录 historical GUI regression `NOT_RUN_BUILD_ONLY`；最终 U01—U30 仍由当前 `TestUpgradeLifecycle` 真实执行。

## Hosted 失败证据

- Run `35800072543` / job `106988166109`：failure；failure Artifact `10725736587` 已由主控保留。
- 失败约发生于日志 `00:06:11`：exact e9417f0 原 `ci.ps1` 自带可见向导 `TestSetup` 在 READY/输入同步阶段发生 COM timeout。此前 beta.1 Runtime、Launcher、Portable、candidate Setup 已实际生成，I01—I31/D01—D13 中大量门禁已执行；但整个历史 GUI 回归没有通过，不能写成 PASS。
- 该 run 未进入 `fresh-identity.cjs`、beta.2 build 或 U01—U30。当前 build-only 路径是对此已保存阻塞的最小工程绕行，不删除、不重跑或隐藏首次失败；真实 beta.1→beta.2 生命周期仍由新版测试承担。
- Build-only 修正后的第一次 run `35802015923` / job `106994266165` 在约 1 秒内失败，没有 failure Artifact，尚未开始任何构建。精确公开错误为 `rebuild-beta1.ps1:16 Exact clean beta.1 checkout required`；原合并条件无法区分 top-level、HEAD、tree 或 clean。当前修正把四项及关键 blob 分开为固定错误码，所有 Git 读取均显式使用 `-c core.autocrlf=false`，不删除 tracked-clean 门禁。
- source-check 修正后的 run `35803383243` / job `106998595821` 仍在任何构建前失败，无 Artifact；固定错误码为 `BETA1_SOURCE_TOPLEVEL_MISMATCH`。hosted runner 使用 `subst` 将 `E:` 映射到 `RUNNER_TEMP`，Git 返回底层物理 top-level，而 Node 保留 `E:` 别名；纯路径字符串比较误报。当前修正使用最终物理路径解析比较同一文件系统对象，仍拒绝真正不同的仓库根。
- Run `35804632918` / job `107002547301` 已通过 exact beta.1 source、build-only、fresh identity 及 beta.2 Runtime/Launcher 构建，在 beta.2 Portable 移动路径重启后的 core probe 失败；failure Artifact `10727636644` 仅保存可用的非敏感中间证据，不是成功发行 Artifact。精确失败为 `portable_windows_test.go:249` 的 `403 !== 200`。源码核对确认请求是员工下载重启前仅上传、但未关联业务记录的临时附件：临时 owner map 不跨重启，403 是既有最小权限规则；测试现明确断言员工 403，再由 Admin 认证下载同一持久文件并逐字节比较。未改服务端权限。
- 同 commit Runtime run `35804632969` / job `107002547427` 的公开回归为 25 suites PASS、1 FAIL、0 SKIP；唯一失败是本报告引用其他环境的措辞触发 `public-product-docs.test.js` 既有隐私正则，不是业务断言失败。报告现改为仅陈述本任务未连接任何真实业务环境，不删除或放宽隐私门禁。

## U01—U30 状态

以下均为 **NOT RUN — 等待主控整合后 GitHub hosted Windows 执行**；括号内是已经落地的真实测试路径，不是通过结论。

| ID | 状态 / 预期证据 |
| --- | --- |
| U01 | NOT RUN；fresh e9417f0 Setup 实装、唯一登记与 binding |
| U02 | NOT RUN；beta.1 Launcher/私有 Node 运行时真实拒绝且进程仍存活 |
| U03 | NOT RUN；beta.2 fresh 测试中的未登记 Portable 运行拒绝 + T1 exact gate |
| U04 | NOT RUN；T1 legacy v1.0.0 exact-version 拒绝，不能作为成功升级来源 |
| U05 | NOT RUN；真实 beta.2 已装后再次运行 beta.2 Setup，完整 owned/instance hash 不变 |
| U06 | NOT RUN；真实 beta.2 已装后运行 fresh beta.1 Setup，完整状态不变 |
| U07 | NOT RUN；升级前后 registry/binding/shortcut instance 参数及 install-state |
| U08 | NOT RUN；upgrade silent 路径不接受新数据选择，沿用登记 instance |
| U09 | NOT RUN；`lowest` Setup 在 hosted 当前用户上下文运行，无提权开关 |
| U10 | NOT RUN；真实 fresh beta.1→beta.2 原位升级 |
| U11 | NOT RUN；Setup post-copy payload + portable verifier |
| U12 | NOT RUN；合成 Admin 原密码登录 upgraded program |
| U13 | NOT RUN；原合成附件认证下载逐字节比较 |
| U14 | NOT RUN；升级完成、首次 beta.2 启动前完整 instance inventory/hash 相等 |
| U15 | NOT RUN；真实 beta.1 instance 的损坏 data 在 persistent write 前拒绝，原字节恢复后 owned state 相等 |
| U16 | NOT RUN；真实 beta.1 binding 暂时缺失时拒绝，原字节恢复后 owned state 相等 |
| U17 | NOT RUN；真实 beta.1 program tamper 时拒绝，原字节恢复后 owned state 相等 |
| U18 | NOT RUN；compile-time required-space fixture，旧版完整状态相等 |
| U19 | NOT RUN；真实 `icacls` deny-write，旧版完整状态相等 |
| U20 | NOT RUN；真实 Inno copy progress 取消，事务 rollback 后完整状态相等 |
| U21 | NOT RUN；upgrade staging 文件项实际调用 `BeforeUpgradeCopy`，真实 Inno copy 前受控异常后完整状态相等 |
| U22 | NOT RUN；target manifest hash 冲突在事务 prepare 阶段、program 改写前拒绝，旧状态保持 |
| U23 | NOT RUN；program swap 后 post-copy verify failure，rollback 后完整状态相等 |
| U24 | NOT RUN；成功升级后真实读取两个 `.lnk`，断言 target 为升级后 Launcher、arguments 精确绑定原 instance |
| U25 | NOT RUN；成功升级后核验 beta.2 DisplayVersion/InstallLocation/binding/HKLM 空；HKCU 32/64 仅字段完全一致时折叠为唯一登记 |
| U26 | NOT RUN；真实 beta.2 uninstaller 后完整 instance hash 相等 |
| U27 | NOT RUN；fresh beta.2 显式选择保留 instance，首次启动前 hash 相等 |
| U28 | NOT RUN；重装后原合成 Admin 登录及原附件下载 |
| U29 | NOT RUN；两个真实生命周期均位于已有全网卡禁用 offline gate 内 |
| U30 | NOT RUN；封闭 30 项 machine report + Artifact allowlist/privacy verification |

## 本地测试与首次失败

- 首次 `npm test`：26 suites 中 1 FAIL，原因是本工作树未安装锁文件依赖 `write-excel-file/node`；不是产品断言失败。执行 `npm ci --omit=optional --ignore-scripts --no-audit --no-fund` 后完整重跑：`Public test files: 26; failed: 0`。本机 hosted-only suites 仍按原策略 SKIP，因此不得写成 Actions 的 742/fail0/skip0。
- T4 lifecycle/fresh identity + T3 transaction：第四次修正后 23 PASS / 0 FAIL / 0 SKIP；新增 Portable 重启后临时附件最小权限与 Admin 持久字节验证契约。
- T1/T1A/T2 联合复跑：135 tests，134 PASS / 0 FAIL / 1 SKIP；唯一 SKIP 是本机 file-symlink privilege。workflow 已把该情况提升为硬失败，但尚未实跑。
- installer contract：`INSTALLER CONTRACT PASS`；`R2 DATA LOCATION CONTRACT PASS`。
- 本轮本机公开测试入口：26 test files / failed 0（hosted-only 项仍按原策略 SKIP）；`public-product-docs.test.js` 单独复跑 8 PASS，既有隐私断言未修改。另以 `GITHUB_ACTIONS=true` 独立运行真实 server HTTP 专项 25 PASS；上传/同进程读取已合并进原员工权限 check，重启后员工 403、Admin 下载 200 及字节不变已合并进原 restart check，reportedChecks 净变化为 0。两个 workflow 继续硬锁 26 suites / 742 tests，不修改门禁。
- PowerShell AST：PASS；修改/新增 CJS `node --check`：PASS。
- 仓库固定 Go 1.27.1 ZIP SHA256 `a3911b5e0e1b1053f25ed0675f4c1c6aad1e2bfcf253df2b9be4caabd2edd95d` 核对通过；`gofmt` 完成；`go test -run '^$' .` 编译整个 `windows-launcher` 测试包 PASS（无真实测试执行）。首次 `Invoke-WebRequest` 因 EOF 未产生 ZIP；固定 hash 门禁停止，随后 `curl` 受限重试成功。
- `git diff --check`：PASS（仅现有 LF→CRLF checkout warning）。
- 本轮本地完整 Portable 脚本未进入实际 Portable 测试：首次输出误置源码树内，被 `Unsafe source/output` 门禁拒绝；改用源码树外隔离输出后，Runtime 闭包因本地 checkout 的 `archive.cjs` 原始 CRLF 字节不等于 commit blob 而正确失败关闭。未修改或绕过 source-byte 门禁；实际 Portable 仍须由 `core.autocrlf=false` 的 hosted checkout 复验。
- 本机未运行 Inno 6.7.3 编译、真实注册表/快捷方式/安装/卸载或全网卡隔离。首次 Actions 的历史 GUI 失败见上，不冒充修正后 hosted 已完成。

## 身份 / Actions / Artifact

- historical beta.1：沿用已审查 run `35781214911` / job `106927326670` / evidence Artifact `10718411569`；profile exact anchors 由 checked-in evidence 提供。本任务未重新下载历史发行包。
- fresh beta.1 rebuild identity：run `35804632918` 已通过 build-only verifier 并生成通过 T1 `validateBundle` 的 fresh identity；该局部证据不等于 beta.2 生命周期通过。
- beta.2 build identity：Runtime/Launcher 已构建；Portable 首轮真实测试失败，Setup 未生成，因此仍为 N/A。
- Actions：run `35800072543` / job `106988166109` = 历史 GUI failure，Artifact `10725736587`；run `35802015923` / job `106994266165` = source clean 合并门禁在构建前 failure、无 Artifact；run `35803383243` / job `106998595821` = subst 路径别名触发 top-level 固定门禁、构建前 failure、无 Artifact；run `35804632918` / job `107002547301` = beta.2 Portable core probe failure，failure Artifact `10727636644`；Runtime run `35804632969` / job `107002547427` = 文档隐私门禁 25/26 suites。第四次修正后复跑仍 pending，执行任务禁止 push。
- 本任务测试工具 ZIP 仅用于本地编译；未加入 Git。清理命令被本机安全策略拒绝，缓存仍在未跟踪 `.test-work`；主控整合时不得加入提交。

## 修改文件

- `.github/workflows/setup-v3.yml`
- `tools/windows-installer/{build.cjs,ci.ps1,offline-ci.ps1,setup.iss,verify-artifact.cjs,fresh-identity.cjs,rebuild-beta1.ps1,verify-beta1-source.cjs,verify-beta1-build.cjs}`
- `tools/tests/windows-installer/{fresh-identity.test.cjs,upgrade-lifecycle/contract.test.cjs,upgrade-preflight/preflight.test.cjs}`
- `tools/windows-launcher/{setup_windows_test.go,upgrade_windows_test.go}`
- `tools/tests/windows-portable/core-client.cjs`
- `docs/tasks/windows-installer-v1.1/batch-4/tasks/B4-T4-RESULT.md`

## 风险与主控处理

1. 修正后的真实 Actions 是本任务结论的硬阻塞。主控应先 Review/整合本 commit，仅 push `codex/windows-installer-v1.1`，观察 build-only 修正后的首次 setup workflow；不得隐藏既有失败、自动重跑或把局部 job 成功写成完整成功。
2. 下一次真实运行仍可能暴露 build-only 闭包、Inno 生命周期次序、完整 registry values 恢复、ACL 继承或取消时机问题。任何新失败应保留首次 failure Artifact 并退回本任务修复。
3. `U03/U04` 成功升级链不会使用伪造 registry；负例由既有 exact T1 gate 与真实 Portable-running Setup gate组成。若 QA 要求 v1.0.0 实物安装负例，需要新的受信任旧发行身份，不能在本任务伪造。
4. 当前工作树因本任务生成的未跟踪 `.test-work/` 与 `node_modules/` 不 clean；它们不得提交。tracked 变更只限上列文件。

未改变产品、UX、业务规则、data schema、instance 生命周期决定或 Windows 支持范围。仅使用合成测试数据，未连接任何真实业务环境，未读取或修改真实数据、附件、备份或凭据；未创建子 Thread/Agent/worktree；未 push/PR/merge/main/tag/Release。
