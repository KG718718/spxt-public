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

## R1｜Hosted测试harness路径修复

- 专项1 Run `36280286553` / job `108510690830` / tested source `bb497a8f7ddbbd9e581db25b3f7c503270a9279f` 在静态门禁阻断；安全报告为 `STATIC_GATE/BLOCKED_STATIC_GATE`，产品安装未运行，其余job均skip。
- Artifact `10918207525`，SHA-256 `21b1c2d82eaa974d96d5a6fb0d105c86394957711d957f1831a59fcaa97c2964`。该失败已由主控核验，本任务未自行下载Artifact或重跑Hosted。
- 已确认根因是 `setup-process.test.ps1` 直接使用系统 `TEMP`，同时要求最终路径满足比Windows合法临时路径更窄的ASCII白名单，导致测试harness环境假设不兼容。Hosted日志只确认第16行抛出 `TEMP_PATH_UNSAFE`，没有记录实际TEMP值；“runner TEMP含8.3短名 `~`”是基于runner环境的高可能解释，不冒充已观测事实。这不是F3身份或安装失败。
- 本地先以合成 `TEMP/TMP=C:\RUNNER~1\Temp` 复现旧测试失败；另确认空格和非ASCII候选也不满足旧白名单。修复后harness只优先采用存在、规范化且满足原ASCII安全字符集的 `RUNNER_TEMP`；否则仅从仓库所在盘符根派生GUID命名的owned隔离目录。`SHORT_NAME`、`SPACE`、`NON_ASCII` 三类临时根以及含空格/中文的合成工作区反例均验证会回退到受限目录，失败诊断只暴露固定类别、不输出原路径。
- 兼容审查实际发现 Windows PowerShell 5 的 .NET Framework不提供 `Path.IsPathFullyQualified`；harness改用pwsh 7与Windows PowerShell 5均支持的盘符绝对路径检查，避免同类第二次Hosted失败。
- R1本地复测：合成短名TEMP下 pwsh 7 PASS、Windows PowerShell 5 PASS；受限且存在的 `RUNNER_TEMP` 分支在pwsh 7 PASS；新beta2 identity Node测试9/9 PASS；`git diff --check` PASS。
- 没有修改生产取证脚本、Setup参数、真实取证路径验证、新beta.2 identity schema、旧beta.1语义或workflow调度条件；禁止自行Hosted保持不变。

## R2｜Hosted cleanup诊断与StrictMode计数修复

- 专项2 Run `36280914931` / job `108512416383` / tested source `a55395d7e06430be186705f09bf688ea89c75c20`：静态Node 9/9与PowerShell gate通过，实际capture随后固定阻断为 `CLEANUP_VERIFY/BLOCKED_CLEANUP_VERIFY`。Artifact `10918108433` 只有report，ZIP SHA-256 `db40c63678b6219eb49bb6614fb80c2c528f10413eba097dca080a152b69a174`；没有evidence，不能称身份或cleanup通过。
- 已确认旧脚本在StrictMode下使用 `(... | Where-Object {...}).Count`：0项和1项都会抛 `PropertyNotFoundException`，只有多项返回Count。专项2发生在同一个粗粒度阶段且成功路径预期正是0项，因此这是与现象一致的强证据；但旧Hosted报告没有子阶段，不能追溯断言它是唯一实际失败原因。
- 修复复用既有历史取证的 `@(...).Count` 封闭计数方式，新增0/1/多项本地实际反例；不放宽任何删除或清理成功条件。
- cleanup改为固定细阶段：uninstaller exit/self-cleanup/timeout、program/登记/快捷方式/binding/instance/probe逐项读取与契约失败、harness binding/instance/payload移除及复读、final state/evidence write。报告仍只含固定阶段/reason，不含路径、原始异常或业务正文。
- 共享HKCU 32/64观测以逻辑存在计数折叠为0/1，合成反例覆盖两视图同时观察同一共享键仍为1；不会把共享视图误判成两份登记。binding/instance/probe必须在产品卸载后保留，任一缺失分别固定阻断，harness随后才删除自己精确拥有的binding与合成instance。
- 异步uninstaller反例实际等待精确 `uninstall\unins000.exe` 自删除并覆盖固定超时；不枚举或等待无关进程。主catch在finally前写原始失败阶段，finally不调用 `Set-TaskPhase` 或重写report，清理失败不会覆盖更早主故障证据。
- R2本地复测：新beta2 identity Node 9/9 PASS；pwsh 7实际进程/计数/保留反例PASS；Windows PowerShell 5同组反例PASS；旧historical identity 71/71 PASS；`git diff --check` PASS。Node测试还逐一验证取证脚本实际调用的固定阶段均被report schema接受。
- R2只修改beta2 identity取证器、对应测试/schema及本结果记录；没有更改F3可信来源、Setup、beta.2产品、旧historical identity、workflow条件或beta.3生产兼容路由。禁止自行Hosted保持不变。
