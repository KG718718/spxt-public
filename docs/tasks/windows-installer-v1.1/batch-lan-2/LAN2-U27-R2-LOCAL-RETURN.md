# LAN2-U27-R2 本地回单

日期：2026-10-14

状态：`LOCAL IMPLEMENTATION PASS — MASTER REVIEW REQUIRED / HOSTED NOT RUN / OUTER UNKNOWN IS NON-SUCCESS`

唯一回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`

## 结论

已按 Master 接受的条件等价方案完成本地实现和门禁：保留完整 `TestSetup`，在同一离线网络区间以第二个独立 Go 进程执行完整正常 U01—U27 前缀，U27 后立即 return，不执行 U28—U30、PRIVATE_SESSION、FIREWALL、26/742、Full candidate 或 QA。

实现只增加专项生成器、固定报告、PowerShell driver、互斥 workflow 和合成门禁；生产 Launcher/Setup/Node、Setup 成功条件、F3 身份、事务、rollback、业务 schema 未改。没有真实安装、registry 探针、解包、VM、网络或 Hosted 操作。

正常 U27 实际 `exitCode == 0` 且 R1 13 字段诊断 PASS 时，嵌套 `u27PreInstall` 如实保留 PASS；外层固定为 `UNKNOWN/SETUP_SUCCEEDED_CLONE_UNKNOWN`，因为卸载 clone 完成及历史复现等价仍未被证明。driver 会在报告验证和安全 JSON 上传条件完成后以固定非成功退出，不能形成绿色专项 PASS。

## 已确认事实

- Master 基线为 `db4ee2cedaf17573181cab025320097df6f0cff9`，已正常 merge；14 个旧 F3 研究路径保留原 blob/mode，未读取、执行或测试。
- 受验 F3 固定为 Run `36246132535`、source `c8886e6b6d413c2fd73d6716621d07a80b337e58`、Artifact `10907910968`、Setup SHA256 `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6`。workflow 只接受这些固定身份。
- `prepare-u27-specialty.cjs` 从正常 Full overlay 派生专项；保留完整 `TestSetup` 与 U01—U26 正常前缀，仅在 U27 采样后 return。两个 diagnostic 环境变量存在时专项直接 fail closed。
- U26 后只做固定只读采样：controlled Launcher/Node、根锁独占打开/关闭、ProductKey、保留 BindingKey、install root/program/uninstaller/shortcuts、instance inventory。卸载完成固定为 `UNKNOWN`；不等待 clone、不删除残留、不 force kill。
- adapter 恢复要求原始 Up adapter 的 GUID 集合数量一致、全部恢复为 Up，并以固定 socket 复核外网恢复。watchdog 必须 `WaitForExit`、`HasExited`、`ExitCode == 0`，随后 `Dispose()`；失败进入固定驱动失败分类。
- 驱动异常在导出后仍保留固定 `ISOLATION_INVALID` 或 `EXECUTION_FAILURE`；真实 U27 非零的嵌套 13 字段诊断不会被 generic driver 分类清除。
- workflow 仅 push 到唯一开发分支、唯一 trigger path、`attempt == 1`、`[lan2-u27-r2]` marker，并排除 candidate、final QA、LC01 marker；只上传已 `verify-final` 的单个 JSON。

## 静态等价性不变量

| 状态 | 历史来源 | 专项保持方式 |
|---|---|---|
| TestSetup 与第二进程边界 | `offline-ci-beta4.ps1:74-77` | 完整 `TestSetup` 后独立 `go test` 进程运行专项 |
| 七个 beta4 fixture 与 rollback 前缀 | `ci-beta4.ps1:64-70`、U15—U23 | 复用正常 overlay，不删 fault/permission/rollback 构建 |
| 网络 | `offline-ci-beta4.ps1:50-76` | 同一 adapter-disabled 区间、外网 socket false、loopback 保留、环境标记固定 |
| ProductKey/BindingKey/快捷方式 | `setup_windows_test.go`、`setup-beta4.iss` | 保留原检查；BindingKey 不预删，预期保留不当作错误 |
| Launcher/Node/锁/instance | 正常 `TestUpgradeLifecycle` U01—U26 | 原时序、句柄和 inventory 门禁不改，只插入无副作用采样 |
| U26→U27 | 正常 overlay U26 后立即 `runSetupRaw` | 不增加等待或清理；clone 完成保持 UNKNOWN |
| U28—U30/Full 外围 | 历史生命周期尾部 | 专项在 U27 后 return，不执行 |

## 本地验证

- compatibility/事务/锁/验收/U27/专项：99/99 PASS，fail0、skip0；C01—C15、LCK01—LCK14 全 PASS。
- 专项合成测试：7/7 PASS；覆盖完整前缀 diff、报告状态机、隐私/额外字段、网络恢复、watchdog 退出证据、隔离异常、driver 分类及嵌套 U27 诊断保留。
- LC01 历史契约与第二 Launcher 合成：26/26 PASS。
- 固定 Go `go1.27.1 windows/amd64`、CGO0、offline：专项 overlay 编译 PASS；生成 EXE 未运行。
- PowerShell Parser：`u27-specialty-ci.ps1`、`u27-specialty-offline.ps1` PASS。
- workflow 专用结构/触发互斥/上传范围静态门禁 PASS。当前环境未提供通用 YAML parser 包，因此不将该结构门禁描述为通用 YAML parser 结果。
- 未运行本地真实安装、真实 registry/network 操作、Hosted、Actions、Full、QA；未上传任何 artifact。

## SHA256

- `prepare-u27-specialty.cjs`：`e201960abed65960300b57bf61ce1a52988be6d2ff23c98c9ff8e492eb9cd615`
- `u27-specialty-report.cjs`：`24dd021fa18e31dc1cbf3cb9355a39166e09e028f0a8c04cdc4f18c505f1cc41`
- `u27-specialty-ci.ps1`：`017359156af4837b449bc1e02a17e111baedc5866239261532e55083fc98c2cd`
- `u27-specialty-offline.ps1`：`531cf09f85dc7d275629a2d5b4f8268732f458f9c44cf4363b2cf2238b69c9e7`
- `u27-specialty.test.cjs`：`6cdda9d34118852d72cdb92f2a080e3a16382dc1fddbf78a7caff471a0fe2a9a`
- `lan2-u27-specialty.yml`：`59d0e6199f75715fd45ada9eee652049babd517f7b898ae171aacbb6bdd6862a`
- 最终生成 `upgrade_windows_test.go`：`ccd49d04ab72ec106f2cbf9ca7aaad4202bfe0a15bf67b177f92de7812ccd081`
- 最终兼容报告 `.test-work/u27-r2-compatibility-9b4af1b.json`：`ff3351035e0bb54ba081a73e9fe8cda6cfddfd1b6668af485b6add9f43b8778e`

## 未验证与停止条件

- 历史 Run 的具体真实 exit/marker 仍未保存，clone 是否在 U26 继续收尾仍 UNKNOWN；专项不能把一次 UNKNOWN 解释为产品缺陷或唯一根因。
- 本地 PASS 只证明实现、隔离契约和静态/合成门禁，不能替代 Hosted 真实结果。
- 依授权本线程不触发专项；由 Master 独立 Review 后决定是否使用唯一 R2 Hosted 预算。任何专项结果都停止并回网页，LAN-2、Full、QA 继续冻结。
