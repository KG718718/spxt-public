# B4-T4 Result — Upgrade Lifecycle / CI / Fault Injection

状态：**BLOCKED — 第十七次 GitHub hosted Windows 已真实完成 U01、U02、U15—U18；U20 fault-cancel 随后在复制/取消前被 `KSESSION_UPGRADE_PREFLIGHT_REJECTED` 截断。** 根因是内部升级 request 的路径表示不一致：identity helper 返回去尾分隔符的 install root，而 request preflight 仍携带 Inno 自动登记的尾反斜杠，cross-helper 精确一致性检查必然失败。已只规范化内部 preflight request 与 transaction plan 的已登记根目录；真实登记快照、升级 preflight、跨 helper 检查、取消/rollback 预期和业务逻辑均未放宽。U20 修正后 hosted 复验仍是硬门禁。

## Preflight

- worktree：`E:/CodexWorkspace/CodexWorktrees/f8bd/public-source`
- origin：`https://github.com/KG718718/spxt-public.git`
- baseline：`a3c206c48ef0bb95e054ab9a4784043a58f0ee56`
- local branch：`codex/b4-t4-upgrade-lifecycle`
- 进入时 `git status --short` 无输出；目标分支此前不存在，从 detached baseline 创建。未 fetch、push、merge、操作 main/tag/Release。
- 第五次失败恢复轮从本任务既有 local commit `51294c5ba579f36d1b7ebd8904c482237786b314` 继续；对应主控候选 commit 为 `0254bdd90fd8f93c2813da1d57c640f50a14c49d`。恢复轮开始时仅有未跟踪 `.test-work/`、`node_modules/`，均不纳入提交。
- 第七次失败恢复轮核对指定主控 baseline `ed449ea08a2e4b0f8714a1a405a98f1be484fb6b` 已包含前两轮等价修复；它与本任务上一 local commit 的代码相同，仅增加主控编排记录。tracked 状态 clean 后使用 `reset --keep` 安全同步，未跟踪缓存保持原样。
- 第八次失败恢复轮同样核对指定主控 baseline `8913b1ca900288c8cc229e5afd4be100720167aa` 已包含上轮等价修复 `6cb7769`，与本任务上一 local commit 仅有主控编排记录差异；tracked 状态 clean 后安全同步，未跟踪缓存保持原样。
- 第九次失败恢复轮核对指定主控 baseline `add27a49fd15c2711151c787a58fdc3d3fcff5c0` 已包含上一轮等价修复 `61de717`；它与本任务上一 local commit 的产品、测试和结果文档内容相同，仅增加主控编排记录。tracked 状态 clean 后安全同步，未跟踪缓存保持原样。
- 第十次失败恢复轮核对指定主控 baseline `ca579e42ce97e38e825cefcaaa6c7b1ad2bcabd1` 已包含上一轮等价修复 `2a03c20`；它与本任务上一 local commit 的产品、测试和结果文档内容相同，仅增加主控编排记录。tracked 状态 clean 后安全同步，未跟踪缓存保持原样。
- 第十一次失败恢复轮核对指定主控 baseline `f18b1fc5135b52e28ed95a9da49a14b3a8dd5b4c` 已包含上一轮等价诊断增强 `6c62882`；它与本任务上一 local commit 的产品、测试和结果文档内容相同，仅增加主控编排记录。tracked 状态 clean 后安全同步，未跟踪缓存保持原样。
- 第十二次失败恢复轮核对指定主控 baseline `4e1c3adfaf5e301bde62d48fadff3083ed1a2eca` 已包含上一轮等价诊断增强 `400319e`；它与本任务上一 local commit 的产品、测试和结果文档内容相同，仅增加主控编排记录。tracked 状态 clean 后安全同步，未跟踪缓存保持原样。
- 第十三次失败恢复轮核对指定主控 baseline `124d19273bf50795fce403952d61ad6fc9889959` 已包含上一轮等价路径修正；与本任务上一 local commit 相比仅增加主控编排记录。tracked 状态 clean 后安全 rebase 到该精确公开 commit，未跟踪 `.test-work/`、`node_modules/` 保持原样且不纳入提交。
- 第十四次失败恢复轮核对指定主控 baseline `f8d51b736da2dcd95ccf0ceb391934ee7c389d6f` 已等价包含上一轮安全 marker 诊断，与本任务上一 local commit 相比仅增加主控编排记录；`git rebase` 安全跳过已应用提交并精确同步到该 baseline。未跟踪 `.test-work/`、`node_modules/` 保持原样且不纳入提交。
- 第十五次失败恢复轮核对 worktree `E:/CodexWorkspace/CodexWorktrees/f8bd/public-source`、origin `https://github.com/KG718718/spxt-public.git` 正确；GitHub API 返回远端开发分支 HEAD 精确为 `9f90a8b99c533b3d7e9bdb72bd1edcec142cc313`。本地与该 commit 仅有主控编排差异，rebase 安全跳过已等价应用提交并同步到精确 baseline；未跟踪缓存保持原样。
- 第十六次失败恢复轮复核同一 worktree/origin；GitHub API 返回远端开发分支 HEAD 精确为 `16c87d5e086a805520cea6a14c852a5aa2f66ff5`，与用户指定 main/dev HEAD 一致。本地安全 rebase 到该 baseline，上一轮等价提交被跳过，未跟踪 `.test-work/`、`node_modules/` 未修改。
- 第十七次失败恢复轮复核同一 worktree/origin；GitHub API 返回远端开发分支 HEAD 精确为 `88fa2f5d269d1906953588fb296f9fd7d4b7e21a`，与用户指定 main/dev HEAD 一致。本地安全 rebase 到该 baseline，上一轮等价提交被跳过，未跟踪缓存未修改。

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
- 第五次候选 commit `0254bdd90fd8f93c2813da1d57c640f50a14c49d` 的 Runtime run `35807722187` 与 Portable run `35807722105` 均 success；Setup run `35807722197` / job `107012151593` failure，failure Artifact `10728312842`。公开日志证明 exact beta.1 source/build-only/fresh identity 以及 beta.2 Portable 已完成，随后 `ci.ps1` 在 compiler/Setup build 前运行 upgrade-preflight；所有预期分支均先收到 `status:14, code:'INSTALL_ROOT_INVALID'`，因此不是 U01—U30 的执行结果。
- 根因为 hosted runner 将 `E:` 设为 `subst` 别名：`assertExistingPathSafe` 取得物理 `realpath` 后，旧 `samePath` 仍做原始字符串比较，把同一 volume root 的别名路径误判为 reparse。修正仅解析卷根并保留其余相对路径，供 same-path 与 overlap 判断使用；不会解析或放行路径内部 junction/reparse。新增合成 `subst` 回归同时证明：同一安装根别名可通过，真实错误根、跨别名重叠 instance 与 junction 安装根仍拒绝。
- 第六次候选 commit `96d26f3fc0eaf00aeea4c172c47c27e79d5b64a0` 的 Runtime run `35810440373` success；Setup run `35810440453` / job `107020593126` failure，failure Artifact `10729513518`，digest `sha256:2a902b5b6d4af22407be9c45f4e5d7551496c069c7589b1b34e06207f0c4d114`。本次已证明上一轮 `subst` 修正生效，并完成 exact beta.1 重建/fresh identity、beta.2 Runtime/Launcher/Portable、Setup 编译及部分真实 Setup 回归；`INSTALLER-TEST-REPORT.json` 只记录 D01—D06、D08—D09、I04—I06、I16—I17、I21—I24 的局部 PASS，不能写成完整 Setup 或 U01—U30 PASS。
- 精确失败在 `setup_windows_test.go:401`：第一次 beta.2 安装后再次运行同一 Setup，日志进入升级页并由 Inno 抛出 `EAbort`，但没有 `KSESSION_REJECT_REGISTERED`，测试正确拒绝把无原因的失败当作通过。根因不是夹具残留或路径别名：登记与 binding 是刚完成安装的预期状态，且本轮已越过 preflight；实际回归是 Batch 4 引入 `UpgradeMode` 时删除了原 `InitializeSetup` 的已有登记拒绝分支，却未补回“当前 beta.2 已安装”的显式拒绝。修正仅在登记读取完整且 `PriorDisplayVersion = 1.1.0-beta.2` 时记录该原因码并停止；beta.1 仍进入 exact upgrade gate，运行中拒绝、路径/数据安全和事务回滚均未放宽。
- 第七次候选 commit `ed449ea08a2e4b0f8714a1a405a98f1be484fb6b` 的 Setup run `35812914595` / job `107028173471` failure；failure Artifact `10730302530`，digest `sha256:2f88eaf1b0131e7b72a380109d7e3f936615ea9d33ac3ea4574d484b74044fb8`。本次已通过 fresh beta.2 安装、真实 Launcher/私有 Node、合成 Admin 与数据/附件、运行中 Setup/卸载拒绝、停止后卸载以及 data/附件/备份字节保留；报告中的 D01—D06、D08—D09、D11—D12、I04—I12（I09 为 PENDING）、I16—I17、I19、I21—I24、I26—I29 只是局部状态，后续重装及 U01—U30 未完成。
- 精确失败在 `setup_windows_test.go:504`，Setup 记录 `KSESSION_REJECT_NONEMPTY` 并以 7 退出。该 token 来自程序安装根的非空门禁，不是 instance 身份校验：测试为证明卸载不误删，先在安装根放入合成未知文件；Inno 因其存在保留了程序目录结构。第七轮先假设剩余结构只是空壳并增加严格检查，没有删除任何未知内容；第八轮真实结果继续验证该假设。
- 第八次候选 commit `8913b1ca900288c8cc229e5afd4be100720167aa` 的 Runtime run `35814718986`、Launcher run `35814718974`、Portable run `35814718987` 均 success；Setup run `35814718991` / job `107033683886` failure，failure Artifact `10731770877`，digest `sha256:9d4d3c043b82c19ba475453964efef1ab198cf651eb138f453e8ac2a2b86e138`。首次安装、Launcher、合成 Admin/数据/附件、运行中拒绝、卸载及 instance 字节保留再次通过；随后严格夹具检查在 `setup_windows_test.go:531` 发现 `uninstall` 目录非空并主动失败，尚未进入重装或 U01—U30。
- 源码与真实失败位置共同确认剩余内容是 `install-state.json`：fresh Setup 在运行时用 `SaveStringToFile` 创建该精确安装器元数据，它不属于 Inno `[Files]`，因此不进入自动卸载日志；同目录其他 metadata 均由 `[Files]` 跟踪。修正由产品卸载器在 `usUninstall` 只处理这一精确路径：缺失则兼容退出，目录、reparse 或属性读取异常均拒绝，普通文件删除失败则中止卸载，成功记录固定无路径事件；不使用 `[UninstallDelete]`、枚举、通配符或递归删除。测试继续只删除它明确创建并已验证保留的合成外来文件，且在夹具清理前断言产品已删除自有状态文件；未知内容仍失败，业务 instance 从不清理。同步修正 I12 报告文案，使其不在实际重装完成前声称重装通过。
- 主控 Review 进一步发现，仅检查最终文件属性不能阻止父目录 junction 将删除重定向到安装根外。修正现先校验 `{app}\uninstall` 到卷根的完整既有目录链，任何 reparse 或非目录组件均固定拒绝，再检查并删除精确普通文件；该父链校验不读取 instance 绑定。hosted 生命周期测试新增真实 junction 反例：临时把 `uninstall` 目录移到合成目标并在原位置建立 junction，卸载必须以 `KSESSION_UNINSTALL_STATE_REJECTED` 失败，目标 `install-state.json` 保持逐字节不变，程序、登记和卸载器仍存在；测试随后只移除该精确 junction 并恢复目录，不使用递归删除。
- 第九次候选 commit `add27a49fd15c2711151c787a58fdc3d3fcff5c0` 的 Runtime run `35818266817`、Launcher run `35818267029`、Portable run `35818266814` 均 success；Setup run `35818266796` / job `107044402164` failure，failure Artifact `10732089023`，digest `sha256:51ab60711af11e70614b4d1ba378b88fa424eaf0fd71923e59d42d5108bc76cc`。本次已实际证明 Inno 6.7.3 编译、父目录 junction 以 `KSESSION_UNINSTALL_STATE_REJECTED` 拒绝、正常卸载以 `KSESSION_UNINSTALL_STATE_REMOVED` 精确删除状态文件、正常重装以及 D07、I18、I30、I31、D13、I25、I20、I03 等后续检查通过；失败发生在最后的可见 GUI 向导自动化，尚未进入 U01—U30。
- 可见向导日志依次到达 page1/page4/page100/page11；harness 通过跨进程 `SendMessageTimeoutW(WM_COMMAND)` 同步触发 Install 后，`PrepareToInstall` 中未修改的 `RunningProduct` 调用 WMI，COM 明确返回 `An outgoing call cannot be made since the application is dispatching an input-synchronous call`。产品正确记录 `KSESSION_PROCESS_INSPECTION_UNAVAILABLE`、保持 fail-closed 并停留 page11。修正只把同一真实、可见、启用按钮及其实际 parent/control ID 的标准通知改为 `PostMessageW` 异步排队，使向导从正常 UI 消息泵处理；每个预期按钮标签最多排队一次，避免轮询重复点击跨页。未改 WMI、`RunningProduct`、向导页、完成页 `[Run]`、timeout 或验收断言。
- 第十次候选 commit `ca579e42ce97e38e825cefcaaa6c7b1ad2bcabd1` 的 Runtime run `35820908796`、Portable run `35820908704`、Launcher run `35820908664` 均 success；Setup run `35820908729` / job `107052341541` failure，failure Artifact `10733961699`，digest `sha256:f4b65ce960f7720c19d4b11e1414e27624f441e05d62ae548cec2b238cfdb0ae`。本次可见向导真实记录 Next、Install、Finish 均 queued，D10 PASS，`TestSetup` 104.34 秒 PASS；父目录 junction 拒绝、正常状态文件删除、卸载保留、重装恢复及 D07/I18/I30/I31/D13/I25/I20/I03 继续通过。随后 `TestUpgradeLifecycle` 完成 fresh rebuilt beta.1 安装及真实 registration/binding，U01 PASS。
- 唯一新失败发生在 beta.1 Launcher 已 READY 后，以 beta.1 私有 Node 执行当前 `core-client.cjs` 的 initial probe；旧 `cmdOut` 只报告 `tool node.exe failed`，丢弃了 CombinedOutput，机器报告因此只有 U01 PASS，U02—U30 未执行。静态比较 exact beta.1 与当前 probe：原有 setup/login/PDF/XLSX/upload/backup 断言和 `pdf-probe.cjs` 相同；当前新增代码只影响 existing 模式及 initial 上传成功后的附件名保存，无法从现有证据推出具体失败断言。本轮不猜测改变期望，只为每个 probe 阶段输出固定 `CORE_PROBE_FAILED`、白名单 stage/kind；Go harness 仅从 CombinedOutput 接受该严格、短小的 JSON 行，日志另记 output 字节数和 SHA256，其他原始内容一律不输出。若 marker 缺失则只报 `CORE_PROBE_NO_SAFE_DIAGNOSTIC`、字节数和哈希。
- 第十一次候选 commit `f18b1fc5135b52e28ed95a9da49a14b3a8dd5b4c` 的 Setup run `35823498989` / job `107060182123` failure；failure Artifact `10734241975`，digest `sha256:61402bee9ef7a9230e10c642b4ac1806832044da88bb8d6e75ae56ef6396666e`。固定日志为 `phase=BETA1_INITIAL`、`code=CORE_PROBE_NO_SAFE_DIAGNOSTIC`、`outputBytes=787`、`outputSHA256=4307854f907ee5703aee7fc83e3daddcbf4e94ec2f23a95f5ea670c49449dda9`；升级报告仍只有 U01 PASS，U02—U30 未执行。该结果只把失败范围收窄到上一版 marker 安装之前，不能从字节数或哈希推断具体异常；第十轮已通过的可见向导和完整 `TestSetup` 结论未倒退。
- 诊断现移到加载 Node 内建模块后的最早位置，在任何本地模块、参数派生和 `createRequire` 之前安装单次 `uncaughtException` / `unhandledRejection` handler，并分别设置 `COMMON_MODULE`、`ARGUMENTS`、`APP_REQUIRE` 等固定白名单 stage。marker 使用同步 stderr 写入、只含固定 code/stage/kind，重复异常不会产生第二条，写入自身失败也不递归。Go harness 在每次 probe 前先用同一私有 Node 对同一脚本执行 `--check`；语法失败只报告固定 `CORE_PROBE_SYNTAX_FAILED`、字节数和哈希，不伪装为可捕获顶层异常。专项测试把脚本复制到缺少本地 common 模块的隔离目录，实际证明只产生一条 `COMMON_MODULE/MISSING_MODULE` marker，且不包含原始 message、stack 或路径。
- 第十二次候选 commit `4e1c3adfaf5e301bde62d48fadff3083ed1a2eca` 的 Setup run `35826316453` / job `107068715241` failure；failure Artifact `10735128742`，digest `sha256:66e38a09eeda2d825f752803f7179723616d10eed9dde6975abecea594c05e6d`。fresh rebuilt beta.1 安装、registration/binding 及 U01 再次 PASS；随后同一 beta.1 私有 Node 的 `--check` 返回 `CORE_PROBE_SYNTAX_FAILED`、313 字节、SHA256 `51ec6854f2de44cfdb110625c54f0746dff25459bdc72fe9df89348409b20474`，U02—U30 未执行。
- beta.1 build-info 与实际固定工具均为 Node `v24.21.0`；该 Node 对当前 `core-client.cjs` 的正确仓库路径执行 `--check` 本地通过。使用升级测试原错误相对路径 `tools/windows-portable/core-client.cjs` 复现时，CombinedOutput 恰为相同 313 字节及同一 SHA256；exact beta.1 tree 与当前仓库中的文件实际都位于 `tools/tests/windows-portable/core-client.cjs`。因此失败是测试 harness 路径错误，不是历史 Node 语法能力或产品/API失败。修正仅补回三处 probe 路径中的 `tests` 段；静态契约要求正确路径恰好三处并禁止旧路径，保留同 Node `--check` 及全部业务断言。
- 第十三次候选 commit `124d19273bf50795fce403952d61ad6fc9889959` 的 Runtime run `35828307756`、Launcher run `35828307745`、Portable run `35828307748` 均 success；Setup run `35828307741` / job `107074848326` failure，failure Artifact `10736682800`，digest `sha256:eb3f2330a88505353cd8c896cc5a555f96053d34e777bb7a6d36765e1d1c99d0`。`TestSetup` 完整 PASS，升级生命周期真实记录 U01、U02、U15、U16、U17 PASS；随后 U18 在 `upgrade_windows_test.go:342` 因缺少固定标识 `KSESSION_REJECT_SPACE` 停止，其余 U 项未执行。
- 对比确认 fresh I23 使用同一 `setup-build/fault-space/artifact` 并已命中 `KSESSION_REJECT_SPACE`；Launcher 停止逻辑只关闭锁句柄，不删除 `.launcher.lock`，故“停止时删除锁文件”假设不成立。现有 failure Artifact 按既定 allowlist 不含 raw Setup logs，不能从证据判断是 process inspection、existing lock、space query、upgrade registration/preflight 或其他更早门禁。未猜测修改产品行为或降低断言；仅让 marker 缺失时输出源码内固定白名单标识、解码后日志字节数和 SHA256，未知 token、原文、路径、实例内容及秘密均不输出，并以专项测试验证过滤。
- 第十四次 Setup run `35831228916` / job `107084053271` failure；failure Artifact `10738100665`，digest `sha256:1a92df013e620858fe444877dd55b42492040ecbf79a67b11bca04d974801401`。U01/U02/U15/U16/U17 再次 PASS；U18 摘要为 `observedFixedMarkers=NONE logBytes=3267 logSHA256=e8a0283ae5c89e71b0837ed9dd065fa08d34c835e19911828f6fd273df8b3a8a`。因此没有证据支持 process inspection、lock、space query、registration 或 preflight 中任一产品门禁已执行，不能再从 marker 缺失猜测产品原因。
- 脚本未配置 `SetupMutex`，相同 `AppId` 只用于安装/卸载身份，现阶段也没有证据证明 mutex 冲突；`exec.Cmd.Run` 会等待其启动的进程退出，但尚不知道该次实际退出码及耗时。下一层诊断只记录进程是否启动、Inno 6.7.3 官方 0—8 退出码的固定白名单分类、整数退出码及耗时；未知非零码统一归类，启动失败不输出原始错误。raw log、路径、命令行、环境、实例内容与秘密仍不进入输出或 Artifact。
- 第十五次 Setup run `35833689471` / job `107092001596` failure；failure Artifact `10738927441`，digest `sha256:d47bde04e5dca95e682ab50de8657c6bb87631d21ed40fa6617f3346b5760088`。U01/U02/U15/U16/U17 再次 PASS；U18 安全摘要为 `innoExitCode=7 innoExitStatus=INNO_EXIT_PREPARE_REJECTED elapsedMilliseconds=359 observedFixedMarkers=NONE logBytes=3267 logSHA256=27e5288388d1b9bcda4ed5f7c9d476c6512db4d60ddd385d1cbad5cd72527a20`。
- 按 Inno 6.7.3 官方语义，exit 7 只表示 `PrepareToInstall` 返回非空结果。逐行审计当前升级分支后，所有空间、路径、preflight、transaction 拒绝均已有 marker；只有安装根比较失败，以及 `RunningProduct or not AcquireExistingInstanceLock` 没有 marker。359ms 不能可靠区分这些条件。本轮不猜测更改 fixture 或安全门禁，仅给三个拒绝原因补固定且不含路径的 `KSESSION_UPGRADE_ROOT_MISMATCH`、`KSESSION_REJECT_RUNNING`、`KSESSION_REJECT_INSTANCE_LOCK`；原检查顺序、拒绝结果、U18 预期与状态保护断言保持不变。
- 第十六次 Setup run `35837361953` / job `107103915266` failure；failure Artifact `10739829655`，digest `sha256:ace48d0320140dee5d7c3ae42216a526b37390442c89ee57e950c33e27591166`。U01/U02/U15/U16/U17 再次 PASS；U18 为 `observedFixedMarkers=KSESSION_UPGRADE_ROOT_MISMATCH innoExitCode=7 innoExitStatus=INNO_EXIT_PREPARE_REJECTED elapsedMilliseconds=363 logBytes=3325 logSHA256=6911acc1bd6a37401f1ef68000208ded16fcba7b97b2ede4db2e9080defaa118`。
- Inno Setup 6.7.3 固定 tag `is-6_7_3` 的 `Setup.Install.pas` 明确以 `AddBackslash(WizardDirValue)` 写自动卸载登记 `InstallLocation`；harness 的 `target` 来自 `filepath.Join` 且每次以同一 `/DIR=target` 安装/升级，`{app}` 为无尾分隔符形式。现用 `SameInstallRoot` 对两侧仅执行 `RemoveBackslashUnlessRoot` 后再做原有不区分大小写比较；`SafePath` 及 reparse/overlap 检查保持在前，不做 `ExpandFileName`、subst 或文件系统别名折叠。相同规范化同步用于成功升级后的最终登记核验，避免同一 Inno 自动登记再次被误拒绝。
- harness 将登记校验泛化为期望版本参数，并在 U01 记录前新增 beta.1 `InstallLocation`、binding install root、instance 的 `os.SameFile` 身份断言；这能证明历史登记与 `/DIR` 指向同一实际目录而不输出路径。beta.2 的既有登记核验继续保留。
- 第十七次 Setup run `35841262430` / job `107116614557` failure；failure Artifact `10742285228`，digest `sha256:101e3c8910f8b2ee9972330cd1118f166cdc3595dbf7e2579076d67c8b7f65d0`。U18 首次真实 PASS，证明 fault-space 命中真实 Inno 空间不足并恢复 program、metadata、registration、binding、shortcuts 与 byte-identical instance。下一项是 fixtures 列表中的 U20 fault-cancel，不是稍后独立执行的 U19 permission；其安全摘要为 `observedFixedMarkers=KSESSION_UPGRADE_PREFLIGHT_REJECTED innoExitCode=7 innoExitStatus=INNO_EXIT_PREPARE_REJECTED elapsedMilliseconds=4478 logBytes=5346 logSHA256=8d238ced25b017f6fa8b6757b9d46ed78d0a8b77af9af1bb43fca6b36eaf79b4`。
- 根因由代码契约闭合：`upgrade-detection.normalizeLocal` 去除尾分隔符并返回 `identity.installRoot`；`WriteUpgradeRequest` 原样把带尾分隔符的 `PriorInstallRoot` 写入 `preflight.installRoot`；两个 helper 后的 `upgrade-gate` 保留严格 `identity.installRoot !== request.preflight.installRoot` 检查，因此即使各自门禁通过也会固定产生 contract mismatch，外层只记录统一 preflight rejection。本轮在写 request 和 transaction plan 时用 `RemoveBackslashUnlessRoot(PriorInstallRoot)` 生成内部 install root；snapshot 中实际登记值保持原样，gate/preflight 未改，binding/instance、reparse 与数据校验未改。

## U01—U30 状态

U01、U02、U15—U18 已在第十七次 hosted 真实 PASS；U20 为 **FAIL**；U03—U14、U19、U21—U30 为 **NOT RUN — 等待主控整合后 GitHub hosted Windows 执行**。括号内是已经落地的真实测试路径，不是通过结论。

| ID | 状态 / 预期证据 |
| --- | --- |
| U01 | PASS；第十三次 hosted 再次完成 fresh e9417f0 Setup 实装、真实登记与 binding |
| U02 | PASS；第十三次 hosted 真实拒绝运行中的 beta.1，Launcher 与私有 Node 均保持存活 |
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
| U15 | PASS；第十三次 hosted 的损坏 data 被拒绝，夹具恢复原字节后 instance/owned state 精确相等 |
| U16 | PASS；第十三次 hosted 的 binding 暂时缺失被拒绝，夹具恢复后 instance/owned state 精确相等 |
| U17 | PASS；第十三次 hosted 的 program tamper 被拒绝，夹具恢复原字节后 instance/owned state 精确相等 |
| U18 | PASS；第十七次 hosted 真实空间不足夹具完成，program/metadata/registration/binding/shortcuts 与完整 instance 均恢复相等 |
| U19 | NOT RUN；真实 `icacls` deny-write，旧版完整状态相等 |
| U20 | FAIL；第十七次 fault-cancel 在复制/取消前被内部 request 根目录表示差异导致的 upgrade preflight contract mismatch 截断 |
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
- T4 lifecycle/fresh identity + T3 transaction：25 PASS / 0 FAIL / 0 SKIP；第十七次 hosted 真实证明 U01/U02/U15—U18。静态契约要求 request/plan 内部 install root 均由已登记根目录仅去尾分隔符生成，snapshot 仍保留原登记值，并禁止 preflight 继续直接使用未规范化值；升级 gate、preflight 与 transaction 专项保持 PASS。
- upgrade-preflight 直接复跑：21 tests，20 PASS / 0 FAIL / 1 SKIP；唯一 SKIP 是本机 file-symlink privilege。新增 `subst` 正例及错误根、overlap、junction 负例均 PASS。
- T1/T1A/T2 联合复跑：136 tests，135 PASS / 0 FAIL / 1 SKIP；唯一 SKIP 是本机 file-symlink privilege。workflow 已把该情况提升为硬失败，但修正后尚未 hosted 实跑。
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
- beta.2 build identity：第十三次 Runtime、Launcher 与 Portable job 均通过，Setup 已真实编译且 `TestSetup` 完整 PASS；升级生命周期完成 U01/U02/U15/U16/U17 后在 U18 停止，完整身份结论仍为 N/A。
- Actions：run `35800072543` / job `106988166109` = 历史 GUI failure，Artifact `10725736587`；run `35802015923` / job `106994266165` = source clean 合并门禁在构建前 failure、无 Artifact；run `35803383243` / job `106998595821` = subst 路径别名触发 top-level 固定门禁、构建前 failure、无 Artifact；run `35804632918` / job `107002547301` = beta.2 Portable core probe failure，failure Artifact `10727636644`；Runtime run `35804632969` / job `107002547427` = 文档隐私门禁 25/26 suites；第五次 Runtime run `35807722187` 与 Portable run `35807722105` = success，Setup run `35807722197` / job `107012151593` = preflight failure，failure Artifact `10728312842`；第六次 Runtime run `35810440373` = success，Setup run `35810440453` / job `107020593126` = same-version registration reason failure，failure Artifact `10729513518`；第七次 Setup run `35812914595` / job `107028173471` = reinstall fixture contamination failure，failure Artifact `10730302530`；第八次 Runtime/Launcher/Portable = success，Setup run `35814718991` / job `107033683886` = installer-owned state cleanup failure，failure Artifact `10731770877`；第九次 Runtime/Launcher/Portable = success，Setup run `35818266796` / job `107044402164` = 可见向导同步消息导致 COM input-synchronous fail-closed，failure Artifact `10732089023`；第十次 Runtime/Launcher/Portable = success，Setup run `35820908729` / job `107052341541` = fresh Setup PASS、升级 U01 PASS 后 beta.1 core probe 无安全明细失败，failure Artifact `10733961699`；第十一次 Setup run `35823498989` / job `107060182123` = U01 PASS 后 `CORE_PROBE_NO_SAFE_DIAGNOSTIC`，failure Artifact `10734241975`；第十二次 Setup run `35826316453` / job `107068715241` = U01 PASS 后 probe 路径不存在，failure Artifact `10735128742`；第十三次 Runtime `35828307756`、Launcher `35828307745`、Portable `35828307748` = success，Setup run `35828307741` / job `107074848326` = U01/U02/U15/U16/U17 PASS 后 U18 缺少空间标识，failure Artifact `10736682800`、digest `sha256:eb3f2330a88505353cd8c896cc5a555f96053d34e777bb7a6d36765e1d1c99d0`；第十四次 Setup run `35831228916` / job `107084053271` = 同五项 PASS 后 U18 `observedFixedMarkers=NONE`，failure Artifact `10738100665`、digest `sha256:1a92df013e620858fe444877dd55b42492040ecbf79a67b11bca04d974801401`；第十五次 Setup run `35833689471` / job `107092001596` = 同五项 PASS 后 U18 exit 7/Prepare rejected 且 markers NONE，failure Artifact `10738927441`、digest `sha256:d47bde04e5dca95e682ab50de8657c6bb87631d21ed40fa6617f3346b5760088`；第十六次 Setup run `35837361953` / job `107103915266` = 同五项 PASS 后 U18 固定 root mismatch，failure Artifact `10739829655`、digest `sha256:ace48d0320140dee5d7c3ae42216a526b37390442c89ee57e950c33e27591166`。尾分隔符比较修正后的复跑 pending，执行任务禁止 push。
- 本任务测试工具 ZIP 仅用于本地编译；未加入 Git。清理命令被本机安全策略拒绝，缓存仍在未跟踪 `.test-work`；主控整合时不得加入提交。
- 第十七次补充 Actions：Setup run `35841262430` / job `107116614557` = U18 PASS 后 U20 在 copy/cancel 前被 upgrade preflight rejection 截断；failure Artifact `10742285228`，digest `sha256:101e3c8910f8b2ee9972330cd1118f166cdc3595dbf7e2579076d67c8b7f65d0`。内部 request/plan 根目录表示修正后的复跑 pending，执行任务禁止 push。

## 修改文件

- `.github/workflows/setup-v3.yml`
- `tools/windows-installer/{build.cjs,ci.ps1,offline-ci.ps1,setup.iss,verify-artifact.cjs,fresh-identity.cjs,rebuild-beta1.ps1,verify-beta1-source.cjs,verify-beta1-build.cjs}`
- `tools/tests/windows-installer/{fresh-identity.test.cjs,upgrade-lifecycle/contract.test.cjs,upgrade-preflight/preflight.test.cjs}`
- `tools/tests/windows-installer/upgrade-transaction/contract.test.cjs`
- `tools/windows-launcher/{setup_windows_test.go,setup_wizard_windows_test.go,upgrade_windows_test.go}`
- `tools/tests/windows-portable/core-client.cjs`
- `docs/tasks/windows-installer-v1.1/batch-4/tasks/B4-T4-RESULT.md`

## 风险与主控处理

1. 内部 request/plan 规范化后的真实 U20 仍是本任务结论的硬阻塞。主控应 Review/整合本 commit，仅 push `codex/windows-installer-v1.1` 并重新执行 setup workflow；必须实际到达真实 Inno copy progress 取消 marker，并通过 rollback 后完整状态相等，不能仅凭根因明确宣称 U20 PASS。
2. 下一次真实运行仍可能暴露 build-only 闭包、Inno 生命周期次序、完整 registry values 恢复、ACL 继承或取消时机问题。任何新失败应保留首次 failure Artifact 并退回本任务修复。
3. `U03/U04` 成功升级链不会使用伪造 registry；负例由既有 exact T1 gate 与真实 Portable-running Setup gate组成。若 QA 要求 v1.0.0 实物安装负例，需要新的受信任旧发行身份，不能在本任务伪造。
4. 当前工作树因本任务生成的未跟踪 `.test-work/` 与 `node_modules/` 不 clean；它们不得提交。tracked 变更只限上列文件。

未改变产品、UX、业务规则、data schema、instance 生命周期决定或 Windows 支持范围。仅使用合成测试数据，未连接任何真实业务环境，未读取或修改真实数据、附件、备份或凭据；未创建子 Thread/Agent/worktree；未 push/PR/merge/main/tag/Release。
