# FRESH-T1 RESULT

日期：2026-10-14。TASK ID：FRESH-T1。PARENT：Fresh LAN Trial。准确 RETURN target：`01a0db0e-c950-79e0-8e11-07155e0742f2`。

状态：**RETURNED — LOCAL GATES PASS / MASTER REVIEW REQUIRED / T2 INSTALL WIRING PENDING**。不是 Hosted、物理 LAN、Windows 登录或最终 Trial PASS。

## 当前文件组织修正：Fresh 测试原字节迁移

Master 已确认旧 compatibility 静态门禁按源码 glob 所有 `*_test.go`，不处理 build tag，导致新 helper 两项仍进入旧固定13比较。按本次明确范围，仅把本轮四份新测试精确迁移至 `tools/tests/fresh-lan-trial/` 并改后缀 `.go.in`；生产零改，旧名单/断言/失败条件零改。Git 四项均 100% rename、numstat 0/0；迁移前后 SHA256 逐一相同：

| 原相对路径 | 新文件名（均在 tools/tests/fresh-lan-trial/） | 原始字节 SHA256（前后相同） |
| --- | --- | --- |
| tools/windows-launcher/fresh_core_test.go | fresh_core_test.go.in | 14d29d991270a6be7417ba9fe03dae39beffd6f0b6812659ff8c422b0e5d3cb1 |
| tools/windows-launcher/fresh_order_windows_test.go | fresh_order_windows_test.go.in | 722b0780a11f982f7393662b78332b07be0152be08a7db72a6350d224c42d6b0 |
| tools/windows-firewall/fresh_policy_test.go | fresh_policy_test.go.in | 1343779211237a016ba2d9db4ffbc4a11139641e9f8f4be4b6376d54466cb3d2 |
| tools/windows-firewall/fresh_behavior_windows_test.go | fresh_behavior_windows_test.go.in | 2200558b27e5bb02d9845fb06098513b6fa78615385a013d8c05bc47b18da188 |

当前验证：原 beta4 compatibility 的 `fixed Go policies cover the exact Launcher build group and every firewall top-level test` 目标门禁 **1/1 PASS、fail0skip0**，未修改测试源码。额外核查 beta3 同名目标为 **1/1 FAIL**，在 `compatibility.test.cjs:264 assert.ok(group)` 的旧 Launcher build 正则匹配处失败，尚未到达名单比较；该失败如实保留，不改旧断言，不宣称 beta3 全 PASS。

四份测试此前执行/编译证据及历史提交保留；新 Fresh pipeline 必须由 T2 用 Go overlay + `fresh_trial_tests` 映射为各原包内 `*_test.go` 并实际执行 Launcher新2/Helper新2。本次 T1 不修改 overlay 生成器/build 接线，不把移出默认 glob 冒充新测试已经经 overlay 重跑。上文所述 snapshot 仍仅连续性快照、可读可构造，非授权或真实登录证明；所有 HUMAN_PENDING 边界不变。

## 当前复审返工：必要授权必须先于 LAN bind

Master 独立复验首轮测试后，明确将 `e91b41e` 的生产实现判为 **REWORK**：原 transition 先 startExact 绑定 LAN，随后才 status/UAC。这是已证安全顺序缺口，首轮本地 PASS 不构成其生产准入；该 Review 结论保留。

增量实现提交：`cfaf95cc9fc5930745bb36e35ad21838f17da0bc`。仍待 Master 独立复审，未 push、未安装、未 Hosted。

Master 随后独立复验该增量 Node83、Go8 顶层及 11 顺序子场景 PASS；最后环境块一致性收尾已完成：Fresh 环境始终复制后按 key 排序，拒绝 Windows 不区分大小写的重复 key（包括预置同名快照），不修改或共享调用者切片底层数组。原 tagged 顶层名内补了顺序、预留容量 sentinel、返回切片隔离、大小写重复 key 和预置快照拒绝断言；tagged Fresh 4 顶层/含子场景15 PASS，tagged vet/fresh linker仅编译与diff-check PASS。标准路径不变。

**快照边界明确**：`KSESSION_FRESH_LAN_APPROVED_CONFIG` 是可读、可构造的普通 JSON，仅用于配置连续性比较；它不是授权凭据、不是 Windows 信任证明，也不是真实 Windows 登录或开机自启证据。实际授权仍由 Launcher 的真实网络/helper/UAC 门禁执行，实际登录自启仍 HUMAN_PENDING。

- **Fresh 显式 enable**：先只读验证真实网络绑定，再只读 helper status；仅明确 enable 且现有规则未有效时允许原 UAC。UAC 返回成功仍须再次验证真实网络和有效 helper status，然后才调用 startExact。任何拒绝/未知/授权后网络改变都不进入 enabled start，沿原事务恢复原 disabled 受信配置及 Local。
- **保存配置启动与 --logon**：`c.start()` 在任何端口 bind/Node spawn 前执行相同门禁，但始终 `allowElevation=false`。规则缺失/无效或网络未知直接拒绝启动，不自动 UAC、不先开放再显示 blocked，也不改配置或静默换端口。启动拒绝可保持无后端；不冒称所有拒绝都能继续 Local。
- **预检至 Node 的配置连续性**：只有已通过上述门禁的 enabled 配置才由 Launcher 的显式私有环境加入 `KSESSION_FRESH_LAN_APPROVED_CONFIG` 完整快照。Fresh Node 在双监听前必须把该快照与当前严格配置逐字段比较；缺失、非法或配置/GUID/端口/enable 不一致仅允许 Local。快照只保证已有 Launcher 门禁与本次配置相同，不替代真实物理/Private 发现或 helper 身份/status，也不是新增客户 CLI/权限。继承环境不会被传入此私有环境；没有新客户模块/manifest 项。
- **失败残留**：Fresh startExact 的部分启动失败会先停止并清除受控 child/ready，再进入原配置回滚。已授权后的启动失败恢复原受信 disabled/Local；回滚失败则无受控 child/ready 残留。标准路径和原 INSTANCE_BUSY/Firewall 范围/权限不变。
- **测试名字保持**：新增 11 个顺序子场景放入原 `TestFreshEnvironmentAndNetworkBindingFailClosed`，该顶层测试移至新 `fresh_order_windows_test.go`（windows && fresh_trial_tests）；仍只有原先两个新增 tagged 顶层名。T2 不需改变 expected 顶层数量或构建 flags。

| 返工最终门禁 | 结果 |
| --- | --- |
| 原六文件 Node 组合（新快照拒绝反例合入现有测试名） | 83/83 fail0skip0 |
| Launcher tagged Fresh 四个顶层（含两个历史 Fresh 名） | 4 顶层、含 11 新子场景共 15 PASS |
| 上述四项加既有标准 enable/rollback/fallback 四项 | 8 顶层、含子场景 19 PASS |
| Launcher 纯文件集合 | 12 顶层、含子测试 24 PASS；第二个新顶层已移 Windows 文件，数量变化不是删除检查 |
| Launcher tagged fresh linker `go test -c`、tagged vet、JS syntax、diff-check | PASS，仅编译 EXE 未执行 |
| Firewall 首轮 15/57 | 本增量未修改 helper，沿用已完成且 Master 独立复验的结果，无不必要重跑 |

新顺序反例覆盖：授权拒绝、网络未知、UAC 后有效规则仍未证明、UAC 后网络改变、授权完成后才 bind、原有效授权不再 UAC、授权后 start 失败恢复 Local、start 与 rollback 双失败无残留、saved start status 拒绝、logon status 未知、saved start 网络未知。Node 原 server 专项另包含缺失/非法/变端口/disabled/变 GUID 的快照拒绝，计数维持 83。所有网络/helper/启动边界为合成替身，未调用实际 UAC/真实网卡/Firewall 或启动真实 Node 服务。

## 身份与 local commit

- 工具创建的独立工作树：`E:/CodexWorkspace/CodexWorktrees/7b54/public-source`；origin 为公开 `https://github.com/KG718718/spxt-public.git`。
- 起点 clean detached HEAD `d293f0aadb142b7bbc20124ebb1f3bae55d9a528`；仅此工作树建立 `codex/fresh-t1-deployment`。
- 实现提交：`e91b41e1442c255181f86483c5b2e163b190878f`，19 个源码/测试文件。本文为后续独立回单提交；未 push。
- 未创建后代、普通 sub-agent 或其他 worktree；未读取内部 SPXT；无 main/tag/Release/Hosted/安装/真实网卡探针或 Startup/Registry/Firewall/TaskScheduler 写入。

## 已确认完成

1. **Fresh 身份不可由继承环境降级。** 唯一客户源码字面量位于 `public-lan-network.js:10`：`const FRESH_TRIAL_BUILD = false;`。T2 仅在 fresh 派生 payload 精确一次改为 true 后生成 manifest。`freshTrialEnabled()` 为固化 marker OR 更严格环境开关；缺失、0、false 或任意继承值不能撤销固化 true。server 的 LAN_MODE、CLI、worker、配置和发现均走该判定。Launcher 专用链接变量 `main.freshTrial=1` 强制其私有 CLI/Node 环境，并在 helper hash 缺失时拒绝启动。没有新客户模块；旧 38-entry manifest 和旧测试名单零改。
2. **自动合格候选。** Fresh 使用独立固定脚本，不重新启用历史 `WINDOWS_DISCOVERY_SCRIPT`。复用 helper 的绝对系统 NetAdapter/NetConnection/NetTCPIP 模块路径，Utility 也绝对导入；UTF-8 使用纯 .NET `UTF8Encoding::new`，不在导入前调用 New-Object。系统 PowerShell 路径、realpath、模块环境、隐藏非交互调用和时间/输出上限保留；任何 stderr 字节（含空白）、异常/非零/signal、重复 JSON key、替换字符、非数组/非法字段和重复网卡地址身份拒绝。物理 HardwareInterface=true、Virtual=false、Hidden=false、Ethernet/Wi-Fi 类型、Preferred/非 SkipAsSource、Private、RFC1918/合法非网络广播地址、明确 Alive on-link route 才能入选。未知 boolean 不作 false。
3. **预选不是授权。** 唯一候选自动预选；零候选不选；多网卡或同一物理网卡多个合法 IPv4 都不猜测，Fresh UI 不默认选择多候选第一项。接口选择仍须明确可信 checkbox，保存 disabled；开启仍须明确可信 checkbox 和原必要 UAC。Fresh CLI 缺少 `--trusted-network true` 拒绝保存/开启；客户 UI 没有替代物理/Private 证明的开关。`options.freshTrial` 仅供既有依赖注入式合成测试强制更严格分支，false/undefined 无法关闭 marker，未暴露为 CLI 参数。
4. **完整受信绑定。** Fresh schema2 配置强制第五字段 `binding={adapterId,address,prefixLength,subnet}`；缺失、损坏、非规范 GUID/IP/子网或 extra key 拒绝，旧四字段不迁移。标准模式仍严格四字段，拒绝 binding。实际 GUID 贯穿 Fresh discovery view、server selected、CLI、Go candidate/exact keys；Node 与 Go 均比较真实 GUID/IP/prefix/subnet，不只比较 GUID 格式。恢复不静默换接口/地址/端口；端口冲突不搜索。配置损坏时 Fresh Launcher 不启动或隐式换端口；运行期 fresh server 每次原定 poll 只读重载配置，消失/损坏或任何受信设置变化走原 reconcile，先撤销 guard、销毁旧 LAN 连接再关闭 listener。显式重新选择可保存新绑定但保持 disabled，仍须后续明确开启。
5. **Firewall helper 闭合。** 经 Master 追加范围，仅 fresh helper `main.buildFreshTrial=1` 接受且强制五字段/精确四字段 binding；标准 helper 保持原四字段。helper 从原已验证的注册/安装 Binding 读取配置，CLI 没有新增可注入 expected-binding 参数。内部请求携带该 binding，固定私有 cmd.Env 传入；在任何规则读取/变更前，以实际物理 Private adapter GUID、IPv4、prefix、subnet 和 Alive on-link route 比较。未知/变化/缺失拒绝。原程序/hash/注册身份、权限、Private+精确程序/端口/子网/网卡、规则所有权与失败禁用语义未放宽；没有改用 Firewall 旧 stderr 长度协议替代发现的严格 stderr 拒绝。
6. **当前用户登录入口。** 新 `--logon --instance <固定绝对路径>` 仅 fresh Launcher 接受；必须匹配当前 HKCU InstallRoot 与原 installedInstance/INI Binding、本地安全路径与 noReparse；原 verifyRuntime、独占锁、Node Job/所有权和安全恢复照常。未知/便携路径、不匹配实例、--stop 冲突拒绝；不增加服务/全局任务/提权。登录启动抑制自动浏览器，保留可到达控制窗和隐藏 Node；失败由 run 的 owned-child defer 清理后 exit1，不在无人登录流程遗留无限模态框。手动入口及 INSTANCE_BUSY 判断/第二 Launcher 原判据不变。

## 修改文件

- `public-lan-network.js`、`public-lan-config.js`、`public-lan-server.js`、`server.js`（仅 LAN 模式固化和配置监测接线）。
- `tools/lan-host/config-cli.cjs`、`launcher-cli.cjs`、`network-cli.cjs`。
- `tools/windows-launcher/core.go`、`lan_core.go`、`lan_windows.go`、`main_windows.go`、新增 `logon_core.go`、`fresh_core_test.go`；复审新增 `fresh_order_windows_test.go`。
- `tools/windows-firewall/policy.go`、`main_windows.go`、`firewall_windows.go`、新增 `fresh_policy_test.go`、`fresh_behavior_windows_test.go`。
- 新增 `tools/tests/lan-host/fresh-deployment.test.cjs`。
- 未修改 Setup/build/driver/manifest 生成器、业务 schema/账号/交易、历史身份/upgrade/rollback、旧 workflow/旧资料/旧测试期望。

## 首轮本地验证（历史；当前复审结果见上）

最终门禁均 fail0/skip0；没有把初轮缺口当成 PASS。首轮 Fresh 反例发现 null adapterId 未拒绝，已改为必须规范字符串；Master 指出的标准 schema、GUID贯通、New-Object 顺序和 helper 五字段问题均已修复后复测。

| 门禁 | 结果 | 边界 |
| --- | --- | --- |
| Node Fresh 专项 + config/launcher-cli/server/lan2-network/server-startup | 83/83 PASS | 新 Fresh 50，既有 33；含固定脚本替身执行，无真实网卡读取 |
| Launcher 纯文件集合 core/lan_core/logon_core 及对应测试 | 13 顶层、含子测试 25 PASS | 仅合成值/隔离 fixture，无实际登录/安装 |
| Launcher tagged `-run '^TestFresh'` | 4/4 PASS | 新增 2 + 原名带 Fresh 的 2；不运行 GUI/integration |
| Firewall `go test -tags fresh_trial_tests -count=1 -v .` | 15 顶层、含子测试 57 PASS | 旧 13 + 新 2；规则命令全部被隔离 cmdlet harness 替身覆盖 |
| Launcher / Firewall tagged 整包 `go test -c` + 各自 fresh linker flag | PASS | 仅编译 test EXE，未执行该 EXE，非候选安装包 |
| Go pure vet / Firewall tagged package vet、JS syntax、git diff --check | PASS | 无网络/安装/Hosted |

Go 固定 `1.27.1`，仅引用 Master 公共 `.test-work/lan2-go-toolchain/go/bin`；CGO=0、GOTOOLCHAIN=local、GOPROXY/GOSUMDB/GOENV/GOWORK=off，cache/modcache 均为本任务 `.test-work/fresh-t1-*`。编译输出与测试现场未纳入提交且保留。开发机 Node 为 24.14.0，未冒称受验 payload 的 24.21.0；后者留 T2/Hosted 验证。

复现核心命令：

```text
node --test tools/tests/lan-host/fresh-deployment.test.cjs tools/tests/lan-host/config.test.cjs tools/tests/lan-host/launcher-cli.test.cjs tools/tests/lan-host/server.test.cjs tools/tests/lan-host/lan2-network.test.cjs tools/tests/lan-host/server-startup.test.cjs
# tools/windows-launcher 内，使用上述固定工具链与任务专用 cache：
go test -count=1 -v core.go lan_core.go logon_core.go core_test.go lan_core_test.go fresh_core_test.go
go test -tags fresh_trial_tests -count=1 -run '^TestFresh' -v .
go test -tags fresh_trial_tests -c -ldflags '-X main.freshTrial=1' -o <task-owned-output> .
# tools/windows-firewall 内，另设本任务带合法marker的隔离 KSESSION_FIREWALL_TEST_ROOT：
go test -tags fresh_trial_tests -count=1 -v .
go test -tags fresh_trial_tests -c -ldflags '-X main.buildFreshTrial=1' -o <task-owned-output> .
```

新 Go 测试使用 `fresh_trial_tests` build tag，旧默认 FIREWALL13/LAUNCHER28 名单不增加。测试过程不在运行命令设置 fresh linker；测试内部隔离/恢复 profile。新 helper 测试为 `TestFreshStrictBindingAndStandardSchemaIsolation`、`TestFreshFirewallBindingBeforeAnyMutation`（12 子场景）。新 Launcher 测试为 `TestFreshLogonPlanIsCurrentUserInstalledOnly`、`TestFreshEnvironmentAndNetworkBindingFailClosed`。

此前另执行一次既有 network/config/CLI/server 五文件组合 39/39 PASS，其中旧 network.test 含受控 127.0.0.1 绑定反例；它不是物理网络 probe，也不是物理 LAN 认证。

## T2 精确接线要求

1. 仅独立 fresh payload：`app/public-lan-network.js` 内唯一 `const FRESH_TRIAL_BUILD = false;` 精确一次替换为 `const FRESH_TRIAL_BUILD = true;`；随后计算现有 38-entry program/runtime manifest 与全部身份 hash。标准 payload 保留 false。禁止新 module 或修改旧 38 期望。检查缺失/重复 marker 拒绝构建。
2. Fresh Launcher 增链接 `-X main.freshTrial=1`；fresh Firewall helper 增 `-X main.buildFreshTrial=1`；所有原 source/runtime/installer/helper digest anchor 保留。按原依赖顺序先生成固化 app manifest，再 helper，再 Launcher。缺一身份/flag不得自动转标准模式。生成器/driver 由 T2 独占修改。
3. 仅 `{userstartup}` 当前用户快捷方式，独立固定名字（建议 `K-SESSION Fresh Trial`），目标固定绝对 `{app}\program\K-SESSION.exe`，参数 `--logon --instance "{SelectedInstance}"`，WorkingDir=`{app}\program`，默认当前用户 token，无 runas/Service/TaskScheduler/HKLM/公共 Startup。它是 Windows 登录时接线，不能改称未登录前系统服务；实际开机后需用户登录。
4. 保持 `PrivilegesRequired=lowest`。安装前任何同名 Startup 已存在/未知所有权/不安全路径必须拒绝；不能覆盖、清理或接管。新增 shortcut 与现有 fresh 安装事务/失败回滚一并跟踪，仅操作本次已证明由自身创建的对象；失败/卸载不删除未知对象。先做合成拒绝/失败回滚/字段核对；本机不写 Startup。
5. Fresh 流程配置五字段，CLI configure/select/reselect/enable 必须传 `--trusted-network true`，disable 不传；此为已由 Launcher checkbox/明确动作闭合后的内部参数。config-cli save 的 fresh rollback 另需 `--binding '<精确JSON>'`。不能给客户绕过物理/Private 检查的选项。
6. F04/F06 增 Fresh test 文件/tag tests；旧核心26/742、旧workflow/测试名单不改，Hosted虚拟网卡照常拒绝。实际 payload/manifest/flag/GUI/自启接线的集成验收留 T2/Master，不将本任务本地结果替代。

## 风险、未知与需 Master 处理

- **已确认事实**：本地合成安全路径及仅编译通过；没有实机物理网络或登录证据。历史 Win10 P02/Utility 一行实验/全部 LAN-2、U27、LC01 FAIL 仍原样；旧完整脚本具体根因未唯一证明，本任务未宣称修复该历史根因。
- **证据支持的工程判断**：采用相同 Windows/System PowerShell/Node/Go 和原权限边界可实现只读严格发现与当前用户登录接线，无需 Native ABI/COM、系统服务或新增权限。显式系统模块与严格流检查构成可审查候选路径，不等于已证明真实 Win10 非管理员模块行为。
- **明确 HUMAN_PENDING**：物理 Private adapter/真实普通用户模块与编码、UAC/实际 Firewall 授权、Windows 登录/开机后实际自启与失败恢复、双物理设备及第二 Launcher GUI。实际登录执行、Startup shortcut 创建/回滚/卸载尚待 T2 接线，不能称本任务单独完成终端自启交付。
- 持续网络/配置重验沿用现有 5 秒 poll 与有界 worker，不声称零延迟网络撤销。读取失败/异常不自动换接口/端口，也不要求用户运行开发工具。
- 需 Master 独立 Review 后整合本地实现与回单；T2 完成上述最小安装/build/CI 接线。Master 才能按新预算决定 Candidate；T1 无 Hosted 触发权限或最终 PASS 声明。
