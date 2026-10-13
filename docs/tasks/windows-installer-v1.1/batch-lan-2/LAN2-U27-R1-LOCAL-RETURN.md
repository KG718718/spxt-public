# LAN2-U27-R1 本地回单

日期：2026-10-13

状态：`LOCAL DIAGNOSTIC IMPLEMENTATION PASS — MASTER REVIEW REQUIRED / ROOT CAUSE UNKNOWN / NO HOSTED`

唯一回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`

## 结论

已按授权为 U26 后的 fresh beta.4 Setup 增加固定 `U27_PRE_INSTALL` 诊断和严格 Artifact 验证。本地合成门禁、生成 Go helper 等价性及 Windows overlay 离线编译通过；没有运行生成的 EXE、真实 Setup、安装、Launcher、网络、Hosted、Full 或 QA。

历史 Run `38402818839@27de942346b511c17a651d20e8e766173bc241f0` / Artifact `11816921345` 的根因仍为 `UNKNOWN`。现有证据只能确认 U26 PASS 后 `runSetup(targetBeta4,true)` 返回非成功，U27 未记录，后续 persistent inventory 未执行；不能据此认定安装前拒绝、卸载 clone 未退出、目录残留或产品缺陷。没有实施或建议直接实施生产修复。

## 已确认事实

- 原分支从 `3cc99ff0d481634073a0e6dc9412da34e2906668` 以普通 merge 同步 Master 基线 `1c6015aaeb3329dd6b8493694c0695f5ce2cbaa4`；merge commit 为 `13eeb7a591ae9f15e8828e53a5ae02800dc7049a`，未 reset、clean 或 rebase。
- merge 带回的 14 个已退役 F3 解包研究文件已按 Master 基线删除，单独提交 `bd4110d`，未把旧未审研究交回 Master。
- 诊断实现提交 `78e25ff9a0566ea98985fecb5800f1a42afd59e1`；阶段证据收窄提交 `d5bb808bedffcab396b53d1cfb2f5323018d776c`。两笔提交均含 `[skip ci]`。
- 只修改 Full 测试 overlay 生成器、纯合成测试、固定报告模块、Artifact verifier 和验收接线；未修改生产 Launcher、Setup、Node、版本/卸载规则、可信身份、安全条件、事务、rollback 或业务 schema，未修改 workflow。
- `runSetupRaw` 对进程启动失败、日志缺失和日志读取失败返回固定状态，不再由 `mustRead` 提前中断诊断。通用 `runSetup` 对这些状态仍 fail closed。
- U27 原成功条件保持为 Setup `exitCode == 0` 且 `want=true`；固定诊断 PASS 是额外门禁，不能替代原成功条件。
- 新报告只允许固定 13 个字段：schema、phase、status、classification、sourceCommit、processState、logState、exitStatus、markerState、observedMarkers、preInstallState、copyState、postInstallVerificationState。报告禁止原始日志/错误消息、路径、PID、账号、业务正文及 hash/长度。
- Inno exit 0—8 映射为固定枚举；其他非零值为 `INNO_EXIT_UNEXPECTED_NONZERO`。marker 仅接受生成 Go helper 已有完整白名单，CJS 与 Go 白名单由测试精确比对。
- 缺 marker 固定为 `UNKNOWN/NOT_OBSERVED`。冲突 marker、升级遗留 marker、合法但 U27 非预期 marker均保持 FAIL/UNKNOWN。`KSESSION_DATA_REJECT_` 可出现在不同 Inno 阶段，因此单独出现或与 `KSESSION_PREINSTALL_READY` 同时出现都不证明已复制或已进入 post-install；只有独立 `KSESSION_UPGRADE_POSTINSTALL_FAILED` 才提供复制已开始和 post-install 失败的正证据。

## 基于源码与官方文档的推测

- Inno 官方说明卸载程序可能先启动 clone，再由 clone 完成实际卸载并退出；因此“原 uninstaller 进程已返回”不等同于所有卸载活动已完成。来源：<https://jrsoftware.org/ishelp/topic_uninstexitcodes.htm>。
- 现有 U26 证明 uninstaller 调用返回、`unins000.exe` 消失以及 persistent business inventory 保持，但没有单独证明程序根目录、卸载登记、快捷方式或潜在 clone 的全部清理已完成。clone 清理竞态是候选解释，不是已证根因。
- beta.4 fresh 文件写入 `{app}\program`，升级路径使用临时目录并事务替换 program。静态源码不能单独证明 Inno 卸载所有权覆盖升级后每个文件；残留触发 `KSESSION_REJECT_NONEMPTY` 是候选解释，不是已证事实。
- `BindingKey` 是 fresh 初始化所需的保留实例绑定；产品登记 `ProductKey` 与其不同。不能把保留 BindingKey 本身当作卸载错误。
- Inno 官方列出的 Setup exit 0—8 中只有 0 表示成功完成；未来未知非零值也必须视为失败。来源：<https://jrsoftware.org/ishelp/topic_setupexitcodes.htm>。

## 本地验证

- 最终实现 SHA `d5bb808bedffcab396b53d1cfb2f5323018d776c` 绑定的兼容/事务/锁/验收/U27 报告：90/90 PASS，fail0、skip0；C01—C15 与 LCK01—LCK14 全 PASS。
- U27 与 final acceptance 聚焦门禁：18/18 PASS，覆盖成功、固定安装前拒绝、进程启动失败、异常退出、日志缺失/读取失败、无 marker、非法 marker、矛盾阶段、来源/额外字段篡改和失败不得转 PASS。
- 生成 Go helper 与 CJS 对 12 组输入语义等价 PASS。
- 历史 LC01 与第二 Launcher 测试：26/26 PASS，fail0、skip0；测试使用显式本地 no-install PowerShell 执行器，仅验证测试契约，不证明 Runner 正式信任路径。
- 固定 Go `go1.27.1 windows/amd64`、`CGO_ENABLED=0`、offline：全新生成 overlay 编译 PASS；生成 EXE 未运行。
- 相关 CJS `node --check` 与 `git diff --check` PASS。
- 未运行公开核心 26 suites/742 checks；该真实 Full 门禁原样保留，本回单不声称复测或通过。

## SHA256

- `prepare-hosted-harness.cjs`：`f9cc85eff2a19966d86f64d95527f7dfbfec1a027bd8c6d7ecec4a83b69ced79`
- `u27-pre-install.test.cjs`：`4f4ba2d080981e7f09acd6daa8be46f58b60d463cf03a0e0da2e4d9f8fb56880`
- `compatibility-report.cjs`：`8a5fb44e81b0044e8c5531586208baed13603ad412c81fe043dddd941f991470`
- `final-acceptance.test.cjs`：`c5028b5a6ac3b100b8730194a63d993862fefc1fd23406df6e4a1e3dcc6f056c`
- `u27-pre-install-report.cjs`：`e585e32a38d90ad825f2a2d3a67e5d294501b3947e744a4fa807bb2c88f905ad`
- `verify-artifact-beta4.cjs`：`9ad3ecda80ab1c2530eeebcecde6abb567417215cabaf8752ded1d6bc619ce1d`
- `acceptance-report.cjs`：`1d2c0b7c8aabddced628b31d7d1d475a5985a63d50b24094934e4287df4b7fec`
- 最终生成 `upgrade_windows_test.go`：`82f3cc93376009738f91b3dc0f1cc8c043a1cb56bae4d0b81f93a27bb9331b7f`
- 最终兼容报告 `.test-work/u27-r1-compatibility-d5bb808.json`：`537b1cb687083de783c0c1cacbbe5fc8592382780529d7fea976d8d217b29af0`

## 未验证与建议

- 未取得历史失败 Run 的 U27 固定报告，不能回推其 marker、Inno exit 枚举或具体阶段；所有具体根因解释保持候选。
- 目前不能证明需要生产修复，现有证据不足。先改卸载等待、目录清理或产品规则会把未证假设写入生产，并可能掩盖真实安全拒绝。
- 下一次最小真实验证建议：另行批准且只运行一次包含当前 `u27PreInstall` 固定报告的真实 U27 生命周期验证；优先复用既有 Full 生命周期，或在新治理明确后使用最小 Hosted U27 专项。只根据固定 exit/marker/阶段状态决定后续是否需要产品改动。在取得该证据前，不改变等待、清理或所有权规则。
- 本线程未 push、未触发 Actions/Hosted/Full/QA。下一真实验证预算需网页版重新批准。
