# LAN2-U27-R2 静态等价性停止回单

日期：2026-10-13

状态：`STOP — STATIC EQUIVALENCE NOT PROVEN / NO SPECIALTY IMPLEMENTATION`

唯一回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`

## 结论

不能静态证明“省略历史 `TestSetup`、只运行专用 U27 测试入口”与 Run `38402818839@27de942346b511c17a651d20e8e766173bc241f0` 的完整 U27 前置状态等价。阻断点是历史 `TestSetup` 结束时未闭合 Launcher、Inno 卸载 clone 与保留 `BindingKey` 的完整状态，而后续 `TestUpgradeLifecycle` 起点只拒绝 ProductKey/快捷方式残留，没有检查这些状态。

因此依授权立即停止：不实施专用生成器、测试入口、报告、PowerShell 驱动或 workflow；不运行本地真实安装、探针、解包、网络、registry、Go overlay、Hosted、Full、QA 或 LC01。不能把仅保留 `TestUpgradeLifecycle` Go 主体前缀称为历史场景等价。

## 基线与范围

- 原 HEAD `40f046c9260b9c2c712a761095be317d1edcdfc6` 以普通 merge 同步公开/GitHub 基线 `db4ee2cedaf17573181cab025320097df6f0cff9`；merge commit 为 `51a7589ea9a0e6a1d10fa2adab1be40aa69a8dc2`。未 reset、clean 或 rebase。
- 14 个旧 F3 研究路径仅用 Git object ID 核验，14/14 blob 未改变；未读取、执行、删除或测试研究内容。
- 本轮只读审查 `setup_windows_test.go`、`upgrade_windows_test.go`、beta4 overlay 生成结果、`setup-beta4.iss`、`offline-ci-beta4.ps1` 与 LAN2 workflow。没有修改生产或测试实现。

## 历史执行链

历史 Full 的 `offline-ci-beta4.ps1` 在同一离线区间依次执行：

1. 禁用所有初始 Up adapter，确认外网 socket 不可达并设置 `KSESSION_EXTERNAL_NETWORK_DISABLED=1`（`offline-ci-beta4.ps1:50-76`）。
2. 执行完整 `TestSetup`（`offline-ci-beta4.ps1:74-75`）。
3. 随后执行完整 `TestUpgradeLifecycle`（`offline-ci-beta4.ps1:76-77`）。

专用入口若只复制第二步之后的 Go 生命周期，必须先证明第一项 TestSetup 的所有跨测试外部状态均不影响后续；现有源码不能完成该证明。

## 静态状态表

| 状态/不变量 | 历史源码锚 | 已确认事实 | 等价结论 |
|---|---|---|---|
| 外部网络 | `offline-ci-beta4.ps1:50-76` | 历史 TestSetup 与生命周期均在所有初始 Up adapter 禁用、外网不可达、loopback 保留的区间内 | 专项只有保留同一隔离前提才可比较；有网简化场景不等价 |
| TestSetup 环境 | `setup_windows_test.go:90-95` | TestSetup 设置自己的 `LOCALAPPDATA/TEMP/TMP`；生命周期随后设置另一个 E 盘 profile（`upgrade_windows_test.go:394-401`） | 路径变量可隔离，但不能消除 registry/process 跨测试状态 |
| TestSetup finish 进程 | `setup_windows_test.go:664-705`; `setup.iss:286-309` | Finish 启动 Launcher 后只取得 private Node PID；停止时只等待该 Node PID 消失（`:699-703`），没有受控 Launcher handle/PID 的退出证明。F3 `RunningProduct` 通过全局 WMI 检查所有 `K-SESSION.exe`/`node.exe` 的 manifest/app 结构，并不限定新 lifecycle target/instance | `UNKNOWN`；不能以 instance 不同忽略遗留 Launcher，且不能证明进入生命周期前 Launcher handle 已关闭 |
| TestSetup 卸载调用 | `setup_windows_test.go:201-220,704-705` | helper 只执行 `cmd.Run()`、读取日志并等待原 `unins000.exe` 不存在 | `UNKNOWN`；Inno 原进程返回和原 EXE 消失不能证明 clone 已结束 |
| ProductKey/快捷方式 | `setup_windows_test.go:512-534,644-647`; `upgrade_windows_test.go:381-392` | TestSetup 多处检查删除；生命周期起点再次要求 ProductKey 和两个快捷方式不存在 | 对这三项可证明历史生命周期已通过起点门禁 |
| BindingKey | `setup-beta4.iss:157-174,767-768`; `setup_windows_test.go:704-705` | fresh Setup 会写 BindingKey；TestSetup 最后卸载后未见等价的 BindingKey 删除/验证门禁；生命周期起点也不检查 BindingKey | `UNKNOWN`，且可能保留 TestSetup 的旧 install root/instance |
| 显式 `/DIR`、`/INSTANCE` | `upgrade_windows_test.go:409-429`; `setup-beta4.iss:157-174` | 生命周期显式传入目录与 instance，参数会覆盖 DataPage 值 | 不能抹平控制流差异：已有 BindingKey 会设置 `PriorInstance` |
| 数据切换确认 | `setup-beta4.iss:189-223,676-685` | 若历史 BindingKey 存在，fresh F3 Setup 会走 PriorInstance 比较与 `CONFIRMDATACHANGE=1` 分支；无 TestSetup 的新 runner 可能不走该分支 | 前缀并非逐路径等价；虽可推测最终选择同一 instance，但不能称完整静态等价 |
| U01 后登记/绑定 | 生成 overlay `upgrade_windows_test.go:570-571` | F3 安装后断言 beta2 ProductKey/BindingKey 精确指向生命周期 target/instance | 证明 U01 已观察状态收敛，不证明旧 clone/Launcher 等未观察进程状态收敛 |
| 原 Launcher/Node/根锁 | 生成 overlay `:624-637,826-848`; helpers `:1078-1097` | 生命周期内受控 Launcher/Node 均等待退出；根锁独占打开并关闭；随后才取 instance/owned snapshot | 对生命周期自身受控资源可证明，不覆盖 TestSetup 遗留进程 |
| instance/accounts/attachments/LAN config | 生成 overlay `:634-638,711-755,802-838,847-858` | LAN config 写入后完整 persistent inventory；U15—U23 恢复检查、真实升级、core、U05/U06 都以实际字节/受控状态核验 | 若完整正常分支执行，可证明生命周期内部状态保持；不能反推其入口外部状态等价 |
| program/uninstaller/shortcuts/登记 | 生成 overlay `:802-824,847-871` | U24/U25 与 owned snapshot 覆盖程序、uninstaller、快捷方式、ProductKey/BindingKey；U26 后只检查原 uninstaller 消失及 instance 不变 | U26 之前产品状态有强证据；卸载是否仍由 clone 收尾仍为 `UNKNOWN` |
| U26→U27 | 生成 overlay `:861-890` | `c.Run()`、原 `unins000.exe` 消失、persistent inventory 后立即 fresh Setup；历史失败发生在这里 | 现有测试没有可信只读信号证明 clone 完成，不能把等待或残留清理加入专项后仍称历史时序等价 |

## 可证明与不可证明的边界

已确认：若使用正常 Full 分支且拒绝 `KSESSION_UPGRADE_SEQUENCE_DIAGNOSTIC` 与 `KSESSION_BETA4_DIAGNOSTIC`，U01—U26 的 fault/rollback、升级、受控 Launcher/Node、锁、业务 instance、LAN config、快捷方式和 registry 检查可以原样保留。现有 sequence diagnostic 会在 U22 return，beta4 diagnostic 会删减 fixtures/permission，两者均不等价，不能复用。

未确认：省略 TestSetup 后的 runner 是否具有与历史相同的 BindingKey、旧 Launcher/Node、卸载 clone 和其他未观察系统状态。也未确认在 U26 后增加等待、清理或新进程控制不会改变历史失败窗口。因而不能继续实现并把结果解释为对历史 U27 的最小等价复现。

## 曾评估的文件范围

若未来获得能够闭合上述前置状态的新设计与授权，最小实现预计只涉及：

- 新的 U27 specialty overlay 生成器及纯合成测试；
- 新的固定 specialty 报告/verifier，内部嵌套复用 R1 严格 13 字段 `U27_PRE_INSTALL`；
- 独立 PowerShell 驱动与独立手动 workflow，保持 exact F3 身份、attempt 1、唯一分支及原离线前提；
- 必要治理文档。

未来驱动还必须吞掉原 Go `t.Fatal`、raw error 和 `safeCoreProbe` 的 outputBytes/SHA 输出，只允许固定安全报告进入 Actions 输出/Artifact；历史摘要默认 FAIL 不得冒充实际观察。本轮没有创建或修改以上文件。生产 Launcher、Setup、Node、F3 身份、事务、rollback、schema、Full/QA/LC01 均未改变。

## 建议

不建议以复杂 clone 观察工具强行补齐本轮。下一步只能由网页版选择：允许专用测试继续执行历史 `TestSetup` 作为同一前置链，或明确接受“从 U01 后已观察状态收敛”而非“完整历史前置状态等价”的较弱结论，并重新定义专项解释边界。未经新决定不得实施或触发。
