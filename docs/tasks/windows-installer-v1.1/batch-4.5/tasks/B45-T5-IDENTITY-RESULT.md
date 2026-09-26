# B45-T5-IDENTITY 结果

## 结论

**状态：HOSTED_READY。**

已完成受验 F3 beta.2 身份取证工具、合成安全反例和 `setup-v3.yml` 专用 `lan-identity` 单作业入口。本地没有下载、安装或保存发行包，没有运行 Hosted；因此本结论只表示工程入口已准备好，不表示 F3安装后精确锚已取得或 C01 已通过。

## 固定来源

- repository：`KG718718/spxt-public`
- source：`c8886e6b6d413c2fd73d6716621d07a80b337e58`
- source tree：`0f298af80c1cbdf3835f39aca265cbcdb859bea6`
- Run / attempt：`36246132535` / `1`
- Artifact：`10907910968`
- Artifact name：`K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58`
- ZIP：`32538249` bytes；SHA-256 `e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6`
- Setup：`K-SESSION-Setup-1.1.0-beta.2.exe`；`33018840` bytes；SHA-256 `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6`

公开 GitHub API只读复核得到：run completed/success、attempt 1、Artifact名称/大小/digest一致，查询时 `expired=false`。过期状态会变化，真正取证仍须在Hosted运行时重新验证；本轮未下载Artifact。

## 实现

### 独立身份契约

新增 `tools/windows-installer/beta2-identity/`，没有修改或重解释旧 beta.1 profile/evidence。新 profile ID固定为 `accepted-f3-run-36246132535`，唯一允许：

- `fromInstallerVersion=1.1.0-beta.2`
- `targetInstallerVersion=1.1.0-beta.3`
- `appVersion=1.0.0`
- `dataContractVersion=1`
- Runtime identity schema `1`
- instance binding schema `1`
- 原 AppId、DisplayName、卸载登记键和 binding键
- 固定F3 source commit/tree
- 安装后 program manifest、program inventory、build-info、Runtime manifest、Launcher五个SHA-256锚

manifest和build-info采用封闭字段集合；登记/binding必须唯一、同view、同安装根/instance，并与磁盘 UTF-16 binding一致。不能用同版本号、同commit/tree、fresh rebuild或未知字段替代精确F3身份。

### Hosted失败优先与隐私

- 先由纯PowerShell建立 `BLOCKED_STATIC_GATE` 固定报告及输出路径；静态步骤失败也有安全证据，不再出现空phase。
- 取证脚本只接受输出目录中该唯一预置报告，验证后才覆盖；成功只新增 evidence。
- 固定阶段：`STATIC_GATE`、`HOSTED_PREFLIGHT`、`API_METADATA`、`ARTIFACT_DOWNLOAD`、`ARCHIVE_IDENTITY`、`EXTRACT`、`SETUP_IDENTITY`、`INSTALL`、`INSTALL_LOG`、`OWNED_PROCESS_QUIESCE`、`INSTALLED_FOOTPRINT`、`REGISTRY_READ`、`REGISTRY_NORMALIZE`、`COLLECT`、`RETENTION_PROBE`、`UNINSTALL`、`CLEANUP_VERIFY`、`FINALIZE`。
- 报告 reason仅为 `BLOCKED_<STAGE>` 或 `CAPTURED`，不包含异常文本、路径、账号、instance正文、日志、token/cookie/password或业务文件名。
- `PASS/CAPTURED` 仅允许出现在 `FINALIZE`；evidence复核入口与finalize共用严格cleanup校验，未知字段、卸载残留、instance/probe保留失败或附加正文均拒绝。
- API和下载需要的Token只保存在runner进程内；Setup身份验证完成后、启动任何产品进程前，清除 `GITHUB_TOKEN/GH_TOKEN/GITHUB_PAT/ACTIONS_RUNTIME_TOKEN/ACTIONS_ID_TOKEN_REQUEST_TOKEN/SYSTEM_ACCESSTOKEN` 可继承环境。
- 静默安装按精确路径启动。若存在本任务安装根下的Launcher/Node，只按两个精确ExecutablePath停止；不使用taskkill、进程名通配或任意PID文件。
- 卸载前写入合成 retention probe；卸载后必须证明program/登记/快捷方式移除，而binding、instance及probe原字节保留。随后harness只清理自己精确拥有的binding、instance和临时下载/日志。

### CI入口

精确dispatch：

```text
workflow: .github/workflows/setup-v3.yml
ref: codex/lan-host-v1.1
mode: lan-identity
```

预期仅运行 job：`lan-identity`。原 `setup`、`identity`、`sequence`、`qa-static`、`historical-identity` 条件和语义未改变，均应skip。

唯一上传Artifact：

```text
b45-beta2-identity-<tested-commit>-<run-attempt>
```

文件allowlist：

1. `BETA2-IDENTITY-REPORT.json`（always，固定状态/阶段/reason）
2. `beta2-identity-evidence.json`（仅取证、清理和最终schema全部通过时存在）

不上传setup log/stdout/stderr、ZIP/EXE、registry snapshot、instance、原始API响应或临时路径。

## 本地测试

- 新 beta2 identity Node测试：9/9 PASS。覆盖错误repo/run/commit/artifact/ZIP大小与hash/Setup bytes与hash、缺字段/未知字段、登记路径冲突、输出隐私、cleanup复核反例、早期stage伪造PASS、固定report schema，以及 `Get-Command node` 最早失败仍写 `BLOCKED_HOSTED_PREFLIGHT`。
- PowerShell AST/原生进程测试：PASS。实际验证受约束参数、等待、原生exit 7传播、非法路径拒绝、INSTALL固定失败阶段、精确owned process范围和认证环境清除顺序。
- 旧 beta.1 historical identity：71/71 PASS，证明新增job位置未改变旧历史job边界及语义。
- installer contract：PASS；R2 data location contract：PASS。
- upgrade lifecycle contract：15/15 PASS。
- `actionlint`：本机 N/A；workflow实际解析仍需Hosted确认。
- Full/Hosted/真实安装/注册表/Artifact下载：NOT RUN。

## Hosted必须验证

1. workflow实际只调度 `lan-identity` 一个job，其余五job skip。
2. API运行时元数据及Artifact未过期；下载ZIP bytes/hash和唯一Setup bytes/hash匹配。
3. 受验Setup在干净Windows runner按per-user/lowest privilege静默安装成功，未继承Actions认证环境。
4. 实际安装后的manifest/build-info字段与封闭schema一致，source/tree、Runtime/Launcher和program inventory精确匹配。
5. HKCU shared view标准化得到唯一登记/binding；HKLM无对应登记。
6. 卸载保持合成instance与probe，harness清理后无owned登记、binding、快捷方式、程序或临时payload残留。
7. 成功Artifact只含报告+evidence；失败Artifact只含固定报告；summary只显示status/stage/reason。

## 风险与主控下一步

- Artifact会过期；若Hosted运行时已过期，必须固定 `BLOCKED_ARTIFACT_DOWNLOAD/API_METADATA`，不得改用fresh rebuild。
- 实际F3 build-info若与仓库当前构建器推导的封闭字段集合不一致，将在 `INSTALLED_FOOTPRINT` fail closed；先审查实际非敏感差异，再最小修复，不无修改retry。
- Windows runner对 `Win32_Process.ExecutablePath` 的可见性、uninstaller自删除时序和HKCU shared view仍需真实Hosted验证。
- 主控Review本commit后，若无问题，整合并仅在 `codex/lan-host-v1.1` dispatch `mode=lan-identity`，计入专项Hosted 1/4。取得并审查evidence之前，不应进入beta.3运行时信任bundle/升级生产路径。
