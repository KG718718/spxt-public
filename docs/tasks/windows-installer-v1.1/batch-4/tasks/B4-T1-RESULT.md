# B4-T1 Result — Existing Install / Version / Upgrade Detection

状态：**PASS（仅 B4-T1 独立组件范围）**。未接入 Setup，未执行真实安装/升级，不能据此报告 Batch 4 PASS。

## 已确认事实

- 工作树 `E:/CodexWorkspace/CodexWorktrees/a536/public-source`，origin `KG718718/spxt-public`，任务基线 `b96543ddde2888513be2f2cc1f8e39a4831f1571`；本地任务分支 `codex/b4-t1-upgrade-detection`。
- 批准的真实旧版源码 commit 为 `e9417f036d0cdf736ff84682556a994040f0de0b`，tree 为 `5da66cb9b73dfa307948634634bfab2cfaaead12`。历史 Setup Run 35514357007 / Artifact 10606870944 / EXE SHA256 `49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8` 仅来自既有报告；本任务未下载旧包、未声称本机复算。
- beta.1 的安装目录内 `installer-manifest.json` 不能单独作为可信锚。单 profile 核心要求完整 exact hashes，并硬编码限制上述 commit/tree、AppId、beta.1→beta.2、appVersion 1.0.0、DC1；commit/tree 本身不构成信任。旧 manifest 与被改程序一同重写仍被拒绝。
- 主控 Review 确认历史 Run 35514357007 / Artifact 10606870944 当前 `expired=false`、`expiresAt=2026-10-20`。由于旧构建含动态 `buildTimestamp`/环境身份，fresh e9417f0 不保证与真实用户已安装历史包字节一致。返工已新增 beta.2 固定 SHA256 的封闭 identity bundle，同时精确支持 `historical-run-35514357007` 与 `fresh-ci-baseline`，不再把任意 fresh build 自动当作历史身份。
- helper 使用现有 Node 技术；T3 必须从 beta.2 payload 提取固定 Node 24.21.0，不能执行旧安装中的 Node。T1 未修改 `setup.iss`、`build.cjs`、Launcher、Runtime、workflow、业务源码或 package/lock。

## 实现及接口

- `tools/windows-installer/upgrade-detection/index.cjs`：保留单 policy 全部只读验证；新增 approved bundle 校验及一次性匹配。bundle 只允许两个固定非敏感来源 ID、最多两个 profile、字段闭合、ID/source/fingerprint 唯一且完整覆盖 historical+fresh。不同锚分别验证；完整 fingerprint 相同只能去重为一个显式双 source identity。成功必须恰有一个不同 identity 匹配；无匹配只返回统一拒绝，不泄露逐 profile 细节。
- `tools/windows-installer/upgrade-detection/cli.cjs`：要求 `--bundle`、beta.2 Inno 固定的 `--bundle-sha256` 和 `--snapshot`；成功返回 0、最小 JSON及非敏感 profile ID，失败返回稳定分组退出码。失败输出不含路径、登记值、文件内容、内部 profile 失败或哈希。
- `tools/windows-installer/upgrade-detection/README.md`：T3 调用、封闭字段、退出码、可信边界、临时登记快照保护、TOCTOU 及未签名限制。
- T3/Inno 负责只读查询 HKCU 32/64 两个明确键并生成私有临时最小快照；必须拒绝重复 view、读取/类型错误，helper 后立即删除且不得记录快照。snapshot 不是可信锚，必须与 beta.2 固定策略及磁盘全文件身份同时一致。
- T2/T3 仍负责 fixed-drive/系统路径、实例内容、运行进程/锁和事务；T3 应持锁并在首次 program 改写前立即重跑身份验证，不能把本 helper 当作 TOCTOU 或事务恢复保证。

## 合成测试

命令：

```text
node --check tools/windows-installer/upgrade-detection/index.cjs
node --check tools/windows-installer/upgrade-detection/cli.cjs
node --check tools/tests/windows-installer/upgrade-detection/upgrade-detection.test.cjs
node --test tools/tests/windows-installer/upgrade-detection/upgrade-detection.test.cjs
```

结果：Node v24.14.0；43 tests，43 pass，0 fail，0 skipped。除原 U01/U03/U04/U05/U06/U07/U16/U17、路径/manifest/DC/CLI 反例外，新增 historical 与 fresh 两个不同 exact anchors 分别通过、相同 fingerprint 显式去重、任意第三同 commit/tree 身份拒绝、未列出的动态 build-info 拒绝、共同伪造拒绝、重复 ID/fingerprint、超额、额外字段、未知 profile、仅 fresh 不完整集合、被改 bundle hash、无匹配统一输出及内部失败脱敏。CLI 成功前后实例目录内容不变。fixture 只在本工作树忽略目录短暂创建并清理，不读写真实注册表或业务实例。

本机没有仓库锁定的 Go 1.27.1，因此未采用无法本机验证的 Go 实现。最终 Node 24.21.0、真实 HKCU/Inno 调用、真实 beta.1 payload、Windows Setup 生命周期均未运行，属于 T3/T4/QA 门禁。

## T4 fresh beta.1 重建准备清单

必须从独立的 e9417f0 checkout 执行原 Runtime→Launcher→Portable→Setup 链，固定 Node 24.21.0、Go 1.27.1、Inno 6.7.3、原 package-lock，并记录同一次重建的 Runtime/Launcher/Portable/Setup 身份。基线文件 SHA256：

| 文件 | SHA256 |
| --- | --- |
| `package-lock.json` | `7e650d8d4141d888ab7cc81da25fa094f0e36ffaa0f2152d5066346633e8b2b5` |
| `tools/installer/distribution.json` | `b13fcc7e800b88c7ef16a4ebdf22bd25e22710447de23d0828ac4be38356ceb4` |
| `tools/windows-runtime/build.cjs` | `c31f1510af26f0e07d14ac6bc0c25b8962f41ae1c4ad3483a4b42f9b73fc6397` |
| `tools/windows-launcher/go.mod` | `01548a67ac73b92696bf10a98c137fee8072be6cfd52cb4704453d157b7a616e` |
| `tools/windows-launcher/toolchain.json` | `f7eb1a2550515c76c4a499e72f2b5a38facb96f846227ce604d5f20e6678a8d1` |
| `tools/windows-launcher/build.ps1` | `9bd5b2beb51aaafab8d0be2d5df04ec192f7e111b8f5f2d000a1bf53dee9535a` |
| `tools/windows-installer/toolchain.json` | `facaee5140da67a2b341c744600fdc10005467c3e1cf2b29918b12a7a8abb639` |
| `tools/windows-installer/build.cjs` | `9d7fc38db460da073341bbf77325bd41e26bb62c862053c86ec389b257e10b99` |
| `tools/windows-installer/setup.iss` | `a662ff6c5ce506c0bc30fea8ecf1fde708917dfb8e6f3afb937ea5ad4f4d3395` |

重建完成后从同一输出生成 fresh profile：精确 `installer-manifest.json` SHA256、`payloadInventorySha256`、uninstall `build-info.json` SHA256、Runtime manifest SHA256、Launcher SHA256、commit/tree/version/DC。先以 helper 验证该 fresh beta.1，再允许 T3 集成测试。

另一个前置门禁是在 Artifact 10606870944 过期前，由受控 GitHub Windows CI 实际安装历史包并提取同样的 post-install exact anchors，形成 `historical-run-35514357007` profile。不得在开发机下载或保存发行包；长期仅保存经审查的非敏感 hashes/evidence，beta.2 离线使用嵌入 bundle，不在升级时下载历史 Artifact。若 CI 无法取得安装后精确锚，必须 `BLOCKED / NEED PARENT DECISION`，不得退化为 commit/tree、忽略动态字段或任意 fresh 身份。

动态性限制：旧 `build.cjs` 将 `new Date().toISOString()` 写入 uninstall `build-info.json`，Inno EXE 也可能包含编译时间，因此两次 fresh 重建的 build-info/Setup 哈希不应假定相同。Runtime manifest 还记录 npm/host 构建身份。program manifest 只有在 Runtime、Launcher、Portable 根文件逐字节一致时才可能重复。T4 应将本次 fresh 输出作为新的、精确配对的升级测试 fixture，并说明它与历史 e9417f0 Artifact 是同源码身份而非已证明字节相同；不能用历史 Setup EXE 哈希代替本次 program manifest/policy 哈希。若固定工具链下仍不能可靠生成和验证一套自洽身份，按 SPEC 返回 BLOCKED。

## 已知风险及后续

- 两代 Setup 均为 unsigned development artifact；该 helper 证明相对 beta.2 内置锚的一致性，不提供发布者签名真实性。若攻击者可同时替换运行中的 beta.2 Setup 及全部嵌入锚，不在本组件保证内。
- 普通路径名无法消除同用户替换临时 snapshot 的竞态；T3 必须使用 Setup 私有临时目录、限制共享、立即调用/删除，并在事务前重验。
- 本任务不验证运行状态、实例 data/config、附件/backups、写权限/磁盘空间、copy/rollback、快捷方式、唯一最终登记或真实升级；这些不得从 43 项单测外推。
- 历史身份提取和永久非敏感锚固是 T3/T4 集成前置门禁；fresh 重建仍是 U10 必经测试，但不能替代历史真实身份。T3 还需新增 Inno 双 view 登记采集、固定盘门禁、私有 snapshot 生命周期、beta.2 bundle 生成/固定及锁内重验。T4/QA 必须用真实历史安装与 fresh beta.1 验证，不能以合成登记替代 U01/U10。
