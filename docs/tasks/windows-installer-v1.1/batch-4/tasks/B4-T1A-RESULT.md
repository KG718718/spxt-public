# B4-T1A Result — Historical beta.1 identity evidence capability

状态：**BLOCKED — 云端真实 anchors 仍未取得，uninstaller 自清理终态等待已在本地完成**。主控尚未整合、push 或重跑本轮修复；不能据此放行 T3 或报告 Batch 4 PASS。

## 已完成

- 复用默认分支已登记的 `setup-v3.yml` 作为 `workflow_dispatch` 入口，并新增独立 `historical-identity` job。该 job 仅允许 `workflow_dispatch`、公开仓库和开发分支 ref 同时成立时运行；push 事件绝不会进入历史 Artifact 下载/安装路径。job 权限仅 `contents: read`、`actions: read`。
- 下载、解包和安装只在 GitHub 托管 Windows runner 的任务专用本地固定卷工作目录；hosted 入口先以只读检查拒绝已存在、非固定、平台映射、祖先重解析或 realpath 不一致的根目录。严格定位唯一 `K-SESSION-Setup-1.1.0-beta.1.exe`，固定 32,988,254 bytes 和 SHA256 `49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8`。
- 使用 beta.1 已有静默参数安装到隔离 program/instance 路径；不启动业务服务、不创建账号/业务/附件、不发邮件。安装前拒绝既有登记、binding 或同名快捷方式。
- 从真实安装根的 `uninstall/installer-manifest.json`、`uninstall/build-info.json`、`program/manifest/runtime-manifest.json` 和 `program/K-SESSION.exe` 提取五个精确锚；不会读取 Artifact 外层 `build-info.json` 代替安装内身份。
- PowerShell 显式查询 HKCU 64/32 两视图，生成仅供私有临时调用的最小 snapshot；仅当两视图观测逐字段完全相同时折叠共享 HKCU 别名，再要求唯一登记和唯一 binding 且同 view，并调用现有 T1 `validate(snapshot, historical policy)`。缺失、差异、额外记录或 HKLM 污染均停止。
- 输出 profile 直接兼容后续 beta.2 identity bundle 的 `{id,sources,policy}` 输入。最终 evidence 为封闭 schema，仅含公开 ID、版本、固定键名、hash、计数和 PASS 结论；不含本地路径、用户名、环境变量、token、密码、registry 值或业务/附件正文。
- 卸载后验证 program、卸载登记和两个快捷方式清除，同时验证 beta.1 按产品契约保留 binding/instance；随后测试夹具仅删除自身精确 binding/instance 和下载/Setup/安装临时内容。预检发现的既有目录、输出或快捷方式不归任务所有，finally 不删除。
- workflow 只在成功时上传小型 `historical-identity-evidence.json`，保留 30 天；不上传 Artifact ZIP、Setup、安装目录、日志或 snapshot。Job Summary 仅写非敏感 ID/hash/结论。

## 调度入口返工

主控首次整合后实际调用 `gh workflow run setup-b4-historical-identity.yml --ref codex/windows-installer-v1.1` 返回 HTTP 404。原因是该独立 workflow 仅存在开发分支，尚未在默认分支登记，GitHub `workflow_dispatch` API 无法按文件名发现它；这不是取证脚本执行失败，历史 Artifact 未被下载或安装。

返工删除不可调度的独立 workflow，将同一 historical job 接入默认分支已有的 `setup-v3.yml`。静态测试固定以下门禁：push 触发存在但 historical job 条件必为 false；只有开发分支 manual dispatch 可以运行；historical job 仅有一次 upload-artifact，路径只能是 evidence JSON。现有 Setup job 的 push/manual 行为不改。

## 首次真实取证与诊断返工

开发分支最终源码 `4516203` 的 manual Setup run 35738365701 已实际启动；`historical-identity` job 106783536357 的静态与合成门禁通过，但真实取证步骤约 4 秒内只输出 `HISTORICAL_IDENTITY_BLOCKED` 后退出 1，未生成 evidence。该事实只能证明真实取证未通过，现有日志无法区分 hosted preflight、API metadata、下载、archive hash、解包、Setup 身份、安装、registry、锚收集、卸载、清理或最终输出中的哪一阶段，失败原因仍未知。

诊断返工把所有可能失败的执行边界划分为封闭 allowlist：`HOSTED_PREFLIGHT`、`API_METADATA`、`ARTIFACT_DOWNLOAD`、`ARCHIVE_HASH`、`EXTRACT`、`SETUP_IDENTITY`、`INSTALL`、`REGISTRY`、`COLLECT`、`UNINSTALL`、`CLEANUP`、`FINALIZE`。catch 只允许输出 `HISTORICAL_IDENTITY_BLOCKED_<PHASE>`，不读取或输出异常消息、URL、路径、用户名、registry 值、token 或业务内容；所有原有 fail-closed 门禁保持不变。需由主控整合后诊断重跑才能定位阶段。

诊断版随后由主控整合并运行：manual run 35741131048 / `historical-identity` job 106792140018 在越过安装后返回 `HISTORICAL_IDENTITY_BLOCKED_REGISTRY`。GitHub run API记录该次受测 head SHA 为 `7a87e13442ea797d172f9ca31e16b1619fbcd2c3`，必须与其他 run 或 commit 区分。

根因是 HKCU 共享视图与原脚本计数假设冲突。beta.1 使用 `PrivilegesRequired=lowest`，[Inno 非管理员安装规则](https://jrsoftware.org/ishelp/topic_admininstallmode.htm)将卸载信息放在 HKCU；`ArchitecturesInstallIn64BitMode=x64os` 及 binding 的显式 `HKCU64` 表示名义 64 位视图。但 Microsoft WOW64 规则明确 `HKEY_CURRENT_USER\SOFTWARE` 在新系统为共享键，[Inno Same Application 文档](https://jrsoftware.org/ishelp/topic_sameappnotes.htm)也明确非管理员安装的 HKCU 在32/64位间共享。原脚本分别打开 Registry64/Registry32 后把同一物理登记追加两次，再因数量为2拒绝。

最小修复只将 32/64 两份字段逐项完全相同的 HKCU observation 识别为一个共享别名，并固定选择安装器名义上的64位 view；任一字段不同、缺失、额外记录、registration/binding view不一致，或 HKLM 32/64 任一视图出现同名登记，仍 fail closed。原始与规范化 snapshot 都只在 runner 私有临时目录存在并于清理阶段删除，不输出或上传路径及 registry 值。

主控整合上述修复为 `3c303dce64366ba55012d553e31e2d65ff14e760` 后触发 manual run 35744708122 / `historical-identity` job 106803581714；静态与合成门禁继续通过，真实步骤仍返回 `HISTORICAL_IDENTITY_BLOCKED_REGISTRY`。该结果不能证明是哪一个 registry 操作失败。本轮继续将这一阶段封闭细分为 `REGISTRY_HKLM`、`REGISTRY_HKCU_READ`、`REGISTRY_SNAPSHOT_WRITE`、`REGISTRY_NORMALIZE`、`REGISTRY_RESULT_READ`、`REGISTRY_UNIQUENESS`；catch 仍只输出固定 allowlist 中的阶段名，不输出异常正文或观测值。

主控再整合子阶段诊断为 `1fe9cea39b0c3b6040f8f7dbb771ba639a8fdd1b`，manual run 35746102758 / `historical-identity` job 106808628998 精确返回 `HISTORICAL_IDENTITY_BLOCKED_REGISTRY_NORMALIZE`；因此已确认 HKLM 检查、HKCU snapshot 读取和私有 raw snapshot 写入均已越过。该 job 完成后，从公开日志按固定 allowlist 还可安全提取到先行的 `HISTORICAL_IDENTITY_REGISTRY_MISSING`；该受测版本 CLI 只在严格 normalize 抛出稳定 `REGISTRY_MISSING` code 时输出它，故已确认 registration/binding 至少一类观测记录为空，但现有证据不能区分具体缺少哪一类。为继续安全定位，normalize CLI 现以静默固定退出码区分 input JSON/schema、记录缺失、view/字段冲突、usage、输出已存在/写入和其他错误；PowerShell 只把该退出码映射到固定 `REGISTRY_NORMALIZE_*` allowlist 阶段，未知退出码一律映射 `REGISTRY_NORMALIZE_OTHER`，不传递异常 message、路径或值。

“PowerShell 子键字面量含双反斜杠”的候选解释经原始字节和 AST 值核对后不成立：本地源码、公开整合提交 `1fe9cea39b0c3b6040f8f7dbb771ba639a8fdd1b` 与 beta.1 源提交 `e9417f036d0cdf736ff84682556a994040f0de0b` 都使用单路径分隔符，工具 JSON 中的 `\\` 只是单反斜杠的转义展示。新增静态回归同时固定两条已批准键、拒绝重复分隔符，并校验其与 `setup.iss` 一致；未制造无效生产改动。为定位真实缺失来源，稳定缺失类别进一步细分为 registration、binding 与 both，仅按数组计数选择固定退出码及 `REGISTRY_NORMALIZE_MISSING_*` 阶段，不读取或输出任何值。

主控整合上述两次返工为公开提交 `f1b105a9fe4d120fbb37869848f4deee03ae61d7`（tree `16aec82122d22fbbdd0425c46fabab7108673ea4`）后，manual run 35750803309 / `historical-identity` job 106824103307 的唯一固定结果为 `HISTORICAL_IDENTITY_BLOCKED_REGISTRY_NORMALIZE_MISSING_BOTH`。已确认安装进程返回0、HKLM 污染检查通过，但 HKCU snapshot 的 registration 与 binding 均为空。公开 job 没有输出或上传私有 Setup log，因此现有 run 无更多安全标记可提取。

[Inno AppId 文档](https://jrsoftware.org/ishelp/topic_setup_appid.htm)明确卸载键名由 `AppId` 加 `_is1` 组成；[非管理员安装模式文档](https://jrsoftware.org/ishelp/topic_admininstallmode.htm)明确卸载信息写入 HKCU；[64位安装模式文档](https://jrsoftware.org/ishelp/topic_32vs64bitinstalls.htm)明确卸载键使用64位视图。[Uninstallable](https://jrsoftware.org/ishelp/topic_setup_uninstallable.htm) 与 [CreateUninstallRegKey](https://jrsoftware.org/ishelp/topic_setup_createuninstallregkey.htm) 默认均为 `yes`，beta.1 未覆盖这两个默认值。结合 beta.1 的 `AppId=KSESSION-Beta-Installer-v1`、`PrivilegesRequired=lowest`、`ArchitecturesInstallIn64BitMode=x64os` 和显式 `RegWriteStringValue(HKCU64, BindingKey, ...)`，现有批准键与 hive/view 规则一致，无证据支持改变 identity 契约。

下一轮诊断在 Setup 返回0后、读取 registry 前增加两道静默门禁。`installed-footprint` 对安装目录内 installer manifest、build info、instance binding、runtime manifest、launcher 及 payload/hash 关系做固定验证，只以 `INSTALL_FOOTPRINT_*` 阶段分类；`install-log` 私下只检查批准的 preinstall、postinstall 与失败标记存在性，只以 `INSTALL_LOG_*` 阶段分类，不输出日志正文。若两道门禁通过后仍进入 `REGISTRY_NORMALIZE_MISSING_BOTH`，即可证明安装落盘及 `ssPostInstall` 完成标记存在而 registry 仍不可见；否则固定阶段会区分落盘不完整、未到 preinstall、未到 postinstall或批准失败标记。

主控整合该诊断为公开提交 `7257dd14587f730280236fbc79ce89736d72f658` 后，manual run 35753184857 / `historical-identity` job 106832725056 的唯一固定结果为 `HISTORICAL_IDENTITY_BLOCKED_INSTALL_FOOTPRINT_MANIFEST`。已确认旧实现通过 `& $setup` 返回控制权并读取到 `$LASTEXITCODE=0` 时，批准的 installer manifest 尚不存在或不可读；结合 Windows GUI Setup 调用方式与约34秒的整个真实步骤耗时，证据强烈支持“PowerShell 未等待安装完成”，但该阶段本身不能单独排除其他落盘失败。此前 registry 缺失与该过早检查解释一致，而没有证据指向 identity 键规则变化。

安装调用改用 `System.Diagnostics.ProcessStartInfo`：`UseShellExecute=false`、`CreateNoWindow=true`，每个批准参数通过 `ArgumentList.Add()` 独立传递，stdout/stderr 在内存中排空后丢弃；调用无超时的 `WaitForExit()` 后才读取真实 `ExitCode`。[Microsoft ArgumentList 文档](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist)说明列表项无需预先转义，[WaitForExit 文档](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexit)明确无参重载会等待关联进程退出。未增加超时或强杀逻辑，由 workflow 既有30分钟 job timeout 处理平台级卡死，避免在未知安装状态下中止进程。合成测试用延迟写入且返回非0的 Windows GUI helper 验证显式等待、逐项参数保真和真实退出码传递；静态测试禁止恢复 `& $setup`，并确认非0退出码仍 fail closed。

主控整合该修复为公开提交 `b1a4d751c88b3320632f805498b3d0012b27eb48` 后，manual run 35755307372 / `historical-identity` job 106840157246 的唯一固定结果前进到 `HISTORICAL_IDENTITY_BLOCKED_INSTALL_FOOTPRINT_ANCHORS`：单文件门禁全部越过，但实际 program inventory 与 manifest payload 或固定 hash 关系尚不一致。约32秒的总步骤耗时说明只等待 bootstrapper 仍不足，结果与其派生安装进程继续写入高度一致。

[Microsoft Start-Process 文档](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)明确 `-Wait` 会等待指定进程及其全部 descendants，并明确 `-ArgumentList` 数组会先拼成单个命令行字符串。最终调用因此改为 `Start-Process -Wait -PassThru -WindowStyle Hidden`；函数只接受 Setup 文件、安装根、instance、log 和私有 stdout/stderr 六条绝对路径，逐条要求规范化值不变且完全匹配无空格、引号或命令元字符的 ASCII allowlist，再内部构造固定8个 Setup 参数。没有通用命令字符串入口；stdout/stderr 只重定向到任务私有目录并随 payload 清理。无脚本级 timeout、Kill 或 `Stop-Process`，仍由 Actions job timeout 兜底。合成 Windows GUI 父进程立即启动延迟写 marker 的子进程并以7退出；测试证明函数只在子进程完成后返回、返回父 bootstrapper 的真实7、固定参数逐项保真，并拒绝含空格的路径。

主控在含中文的正式主项目路径复测时发现专项47/48：测试夹具曾把 GUI helper 放在 `$PSScriptRoot` 下，因而被生产 ASCII 路径门禁正确拒绝；这不是生产缺陷。夹具现依次检查 `RUNNER_TEMP`、`TEMP`、`TMP` 与系统临时目录，只在现有、可写、规范化且匹配同一 ASCII allowlist 的根下创建唯一子目录，无法找到合格候选即明确失败，`finally` 删除全部合成产物。Node 测试另外构造带空格和中文的 `RepositoryRoot` 副本入口，证明仓库路径可以不安全而实际传给生产 helper 的所有执行路径仍安全；测试结束后删除该副本，不在仓库留下产物。生产 `Assert-SetupLaunchPath` 未改动或放宽。

主控整合该测试修复并精确同步公开开发分支到 `80792bd156d1df78340dc8637c8ad339e674a9c6` 后，manual run 35760381250 / `historical-identity` job 106856997239 的静态与合成门禁通过，真实步骤唯一固定结果仍为 `HISTORICAL_IDENTITY_BLOCKED_INSTALL_FOOTPRINT_ANCHORS`，且未上传 evidence。公开 job 元数据确认受测 head SHA 为上述精确提交；现有阶段码只能证明 manifest、build info、binding、runtime manifest、Launcher 五个单文件门禁均已越过，不能区分程序目录枚举、两个固定文件 hash 或 payload 清单的具体冲突。14 秒真实步骤耗时也不足以单独证明仍是进程时序问题，因此没有依据继续修改等待机制、identity 契约或历史 hash。

本轮只把原 `ANCHORS` 汇总类别拆成固定、无观测值的 allowlist：`INVENTORY`、`RUNTIME_HASH`、`LAUNCHER_HASH`、`PAYLOAD_COUNT`、`PAYLOAD_PATH`、`PAYLOAD_BYTES`、`PAYLOAD_HASH`、`PAYLOAD_SCHEMA`。比较顺序保持 fail closed：先安全枚举实际 program，再分别核对 build-info 的 runtime/Launcher hash，最后按清单数组、长度及逐项精确字段、路径、字节数、hash 核对；任何额外字段立即归入 schema 冲突，未知异常仍归 `INSTALL_FOOTPRINT_OTHER`。CLI 继续静默，仅以固定退出码向 PowerShell 映射阶段，不输出路径、文件名、数量、hash 或异常正文，也未放宽 manifest、payload、历史身份或 Setup hash。

主控整合上述分类为 `eaeb1d204fafe703b39c7e1933ac1fba511c2d57` 后，manual run 35762731985 / `historical-identity` job 106864928926 在该精确 HEAD 上返回 `HISTORICAL_IDENTITY_BLOCKED_INSTALL_FOOTPRINT_PAYLOAD_PATH`。因此已确认 program 枚举成功、runtime/Launcher 固定 hash 一致、实际与 manifest 文件数量相同；冲突发生在对应位置的路径字符串。构建期 `windows-runtime/common.cjs` 是“收集后按完整 path 全局排序”，取证/T1 的 `upgrade-detection/index.cjs` 是“各目录排序后深度优先收集”；两实现确有契约结构差异，但本地代表性路径集仍得到相同顺序，尚不能据此直接修改 T1 或接受排序后的集合。

本轮继续把 `PAYLOAD_PATH` 只读诊断细分为 `PATH_ORDER`、`PATH_SEPARATOR`、`PATH_CASE`、`PATH_UNICODE`、`PATH_SET`。`PATH_ORDER` 仅用排序后的副本判断两边是否为完全相同的精确字符串多重集，仍返回失败，不将排序结果用于身份通过；其余类别只比较固定规范化后的序列以定位分隔符、大小写或 Unicode 规范化边界，均不改变原值或接受结果。数量相同但无法归入上述等价关系时固定为 `PATH_SET`，代表至少一项遗漏/新增替换或其他路径契约差异。所有类别仍不输出文件名、路径列表、数量或 hash。

主控整合该细分诊断为 `d2db1ffa944b6da0bb7a92d59f544fe32dce8a1d` 后，manual run 35764961697 / `historical-identity` job 106872262499 在精确 HEAD 上返回 `HISTORICAL_IDENTITY_BLOCKED_INSTALL_FOOTPRINT_PAYLOAD_PATH_ORDER`。该固定阶段的已验证语义是：actual 与 manifest 的路径数量和精确字符串多重集完全一致，仅序列不同；分隔符、大小写、Unicode 规范化、遗漏/新增以及 bytes/hash 尚未成为失败原因。至此已有证据确认 beta.1 构建期全局排序与 T1 深度优先收集的顺序契约不一致，主控明确扩展本任务范围，授权修复 T1 inventory 排序工程实现。

修复只在 `upgrade-detection` 的实际 program inventory 完成安全递归枚举后，使用与 beta.1 构建期 `common.cjs` 完全相同的 `a.path.localeCompare(b.path, 'en')` 对完整相对路径做一次全局排序。manifest 不排序、不规范化，`verifyProgram` 仍按原顺序逐项精确比较 path/bytes/hash；因此未知或重排后的 manifest 仍拒绝。回归样本使用目录 `a/a` 与同前缀根文件 `a-`，可稳定证明旧 DFS 会先返回目录内容、而构建期全局排序先返回根文件；另将相同精确集合反向重排并重新固定 manifest/policy，仍必须返回 `PROGRAM_TAMPERED`。未修改历史 manifest、固定 hash、identity policy、Schema 或产品行为。

主控整合排序修复为 `400822f1f4826abd43cf7adc17a2de47247d038f` 后，manual run 35766795264 / `historical-identity` job 106878964446 在精确 HEAD 上已越过 payload/anchors，随后固定输出 `HISTORICAL_IDENTITY_BLOCKED_COLLECT` 与 CLI 的 `HISTORICAL_IDENTITY_T1_PATH_REPARSE`。这证明排序修复对真实 beta.1 生效，但现有 T1 稳定码无法区分 install root、instance、uninstall、各自祖先或 hosted 工作盘映射。

本轮在 historical 私有诊断层新增严格只读 `path-safety` 预检，沿用 T1 的 `lstat` 祖先遍历和 native realpath 等价判断，不删除、不跳过或接受任何重解析点。固定类别按 install root / instance / uninstall 分别区分对象自身、祖先和 realpath 不一致，并单列 `PLATFORM_VOLUME`、`INSPECTION`、`USAGE`、`OTHER`；卷类别仅在盘符根的 native realpath 自身已发生映射时返回，不输出盘符、路径、用户名、目标或错误正文。该预检在真实 `collect` 前运行，非零分类直接阻断；未知情况仍由原 T1 `PATH_REPARSE` fail closed。合成测试覆盖普通目录、三类对象自身、install root/instance 祖先 junction、usage 及完整固定映射。

主控整合该诊断后的 manual run 35769940343 / `historical-identity` job 106889229232 在精确 HEAD `903de4e665da90d5c30eca9cd721c50f19568e3f` 返回 `HISTORICAL_IDENTITY_BLOCKED_T1_PATH_REPARSE_PLATFORM_VOLUME`。这已确认失败来自历史 job 主动用 `subst E:` 构造的平台映射卷，而不是 beta.1 安装目录内部的新重解析对象；原 T1 对卷根 native realpath 的拒绝符合既有安全契约，不能跳过或放宽。

最小修复只调整 historical hosted harness：移除 historical job 的 `subst E:`，将任务工作根与唯一 evidence 输出移到 runner 的本地 `C:` 固定卷。执行任何下载、安装或清理前，新增静默 `host-root` 预检，要求候选为未存在的受限 ASCII 绝对路径、盘符类型为 `Fixed`、从父目录到卷根不存在重解析点且 native realpath 完全一致；已存在、非固定、平台映射、祖先重解析、realpath 差异、检查异常和未知退出码分别映射到封闭 `HOSTED_ROOT_*` 阶段并一律停止。该变化不修改 T1、Setup、安装/升级、业务、数据生命周期或清理契约，也不把映射卷当作安全路径接受。

主控整合固定卷修复及不依赖仓库字符集的测试夹具后，manual run 35773904968 / `historical-identity` job 106902667022 在精确 HEAD `9e9a525957e888904c31c7f79a5050965a5e952f` 已越过 hosted root、Artifact、安装、footprint、registry 与 T1 collect，唯一固定结果为 `HISTORICAL_IDENTITY_BLOCKED_CLEANUP`。该 token 只能证明卸载或夹具清理总阶段未完成，不能区分卸载程序退出、产品残留、产品应保留数据缺失、夹具精确删除或 cleanup evidence 写入中的哪一项；没有证据支持把任何残留视为成功或改变卸载/数据保留契约。

本轮只细分清理诊断。卸载程序非零退出、program root、卸载登记、桌面/开始菜单快捷方式残留、binding/instance 未按产品契约保留、owned binding 精确移除、instance 精确移除、固定临时 payload 精确移除、最终 cleanup 状态及 cleanup evidence 写入分别使用封闭 `CLEANUP_*` 阶段；状态读取异常统一进入 `CLEANUP_INSPECTION`，其他未知清理边界保留 `CLEANUP_OTHER`。所有检查仍 fail closed，删除仍只用既有 `-LiteralPath`、`Assert-TaskPath` 和 owned binding 比对，没有新增通配删除、跳过清理或产品卸载行为修改。

主控整合 cleanup 分类后，manual run 35776206098 / `historical-identity` job 106910326823 在精确 HEAD `4f0f0330d69806b8ea42076bb000ab6bc0e8b224` 的唯一固定结果为 `HISTORICAL_IDENTITY_BLOCKED_CLEANUP_PROGRAM_ROOT`。这证明卸载入口已返回0，而 harness 立即采样时安装根仍存在；该 token 本身不等于真实产品文件残留，也不能把残留改判为成功。

公开源码提供了可复核的返回时机证据。beta.1 精确来源提交 `e9417f036d0cdf736ff84682556a994040f0de0b` 的 `setup_windows_test.go` 在 `cmd.Run()` 返回后仍以100ms间隔、最多25秒等待同一安装根内 `unins000.exe` 消失，之后才验证卸载结果；同一提交的 `setup.iss` 把 `UninstallFilesDir` 固定在 `{app}\uninstall` 且禁用自动重启。Inno 官方[源码调试说明](https://github.com/jrsoftware/issrc/blob/main/README.md)明确卸载器存在 `/SECONDPHASE`，其[安装函数源码](https://github.com/jrsoftware/issrc/blob/main/Projects/Src/SetupLdrAndSetup.InstFunc.pas)包含卸载共用的延迟删除机制。historical harness 的 Node/PowerShell 文件读取均为同步短句柄，Setup 重定向进程已结束，没有持有安装根的长期流；现有证据因此支持“首阶段返回后卸载器仍在完成自身删除”，而不支持任意 sleep、跳过根目录验证或修改产品卸载行为。

最小修复复用既有公开自动化的终态模型：卸载入口返回0后，只轮询已经过 T1/路径门禁的精确 `<taskInstall>\uninstall\unins000.exe`，固定100ms间隔和25秒上限；路径必须与任务安装根推导值完全相等，不枚举、等待或终止任何进程。超时固定为 `CLEANUP_UNINSTALLER_SELF_CLEANUP_TIMEOUT`，读取或其他异常停在 `CLEANUP_UNINSTALLER_SELF_CLEANUP`。只有该明确终态出现后才继续原 cleanup 检查；此时 program root、登记、快捷方式任一残留仍按原类别失败，因此延迟删除、重启后删除、被占用或真实残留都不会被伪造成 PASS。

## 本地验证

首次专项运行：12 项中 11 PASS、1 FAIL。失败为 evidence 严格 schema 反例向外透出 T1 `Rejection` 类型；已仅在新模块边界转换为稳定 `HistoricalIdentityError`，未修改 T1 或测试断言。

最终本地结果：

- historical-identity 专项：69 PASS，0 FAIL，0 SKIP；cleanup 回归新增精确 uninstaller 终态等待、延迟删除成功和固定超时反例，并继续覆盖每项残留、精确删除边界、最终状态及 evidence 写入的封闭阶段；hosted 根目录测试保持通过。
- T1 upgrade-detection：45 PASS，0 FAIL，0 SKIP；新增构建期全局路径排序契约及“同集合重排 manifest 仍拒绝”回归。
- 既有 T2 upgrade-preflight：19 PASS，0 FAIL，1 SKIP；SKIP 为当前开发机无 Windows file-symlink 创建权限，junction/深层链接反例仍通过，必须由 hosted Windows workflow 补实测。
- installer contract：`INSTALLER CONTRACT PASS`、`R2 DATA LOCATION CONTRACT PASS`。
- Node `index.cjs`、`cli.cjs` 语法检查、PowerShell AST parse、workflow 静态权限/上传范围检查及 `git diff --check`：PASS。

## 未验证与风险

- 本任务未在开发机下载 Artifact 或保存发行包。云端首次真实 workflow 已失败且没有 evidence，历史 profile 中五个 hash 仍未知；只有诊断返工整合、重跑并得到成功 JSON 后才能固化这些锚。
- [Microsoft WOW64 registry 文档](https://learn.microsoft.com/en-us/windows/win32/winprog64/shared-registry-keys)说明共享键可把同一物理副本映射到两个逻辑视图；本修复在进入已批准 T1 契约前，仅折叠字段完全相同的 HKCU 共享别名，仍向 T1 提供唯一 view。若 hosted runner 返回任何差异或额外记录，workflow 仍将 `BLOCKED`，不能放宽为 commit/tree。
- GitHub Artifact API 若 digest/大小/attempt/expiry 等任一固定元数据变化、Artifact 已过期、下载 ZIP digest 或 Setup hash 不符、真实安装参数失败、安装内锚冲突、T1 单 policy 不通过或清理不完整，均 fail closed；不产出成功 evidence。
- 两代 Setup 仍为 unsigned development artifact。本任务只证明相对固定公开 Artifact 和 beta.2 未来内置锚的一致性，不提供发布者签名保证。

## 主控后续

Review 本任务追加 local commit 后重新整合到开发分支，通过默认分支已登记的 `setup-v3.yml` 对开发分支 ref 发起 manual dispatch。必须确认 historical job 不再创建 `subst E:`，hosted 根目录预检通过，并审查实际 Actions JSON、Run ID、Artifact ID、五个安装后 anchors、T1 PASS 和 cleanup PASS；云端失败则按稳定 BLOCKED 结论处理。本任务不接续 T3/T4。
