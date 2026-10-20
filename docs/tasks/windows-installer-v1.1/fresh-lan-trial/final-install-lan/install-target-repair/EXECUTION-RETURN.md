# INSTALL TARGET REPAIR — LOCAL RETURN / FROZEN

2026-10-20。**本地修复、完整构建及 Master 独立 Review 通过；真实安装与完整失败恢复仍未验证，无合格用户安装包。**

生产受测源码固定为 `04dd974c41063c5067cadd55d53071068ef9ba96`，tree `81eafbdace9cd3b62dd816114bc5038bd772dab9`，代码指纹 `35263c9484a79eb39144aa739a2cb4a3c34766e84900475f24e19ef192d20ab6`。本回单为后续治理，不改变构建来源。范围依据[本地授权](../INSTALL-TARGET-REPAIR-AUTHORIZATION.md)；[历史 FC2 FAIL](../FC2-HOSTED-RESULT.md)及全部旧失败、额度和现场保留。

## 1. 实际 TargetPath 差异类别

受控 Windows 观察中，物理路径和 SUBST 输入创建、移动后均保持 EXACT；带点段输入经 COM 形成物理规范表达，128 位 FileID、卷身份和可信 Launcher 字节一致，移动不改变链接字节及目标。实际参数与工作目录仍采用原精确条件。

E 盘正确按 API 返回字符数截取后，两种短名请求均没有形成不同拼写，**真正 distinct 8.3 alias 仍 NOT VERIFIED**。早期 `shortDistinct=true` 来自含 NUL 的错误截取，该资格已撤回；C 盘另一个受控根在创建前失败，不证明该盘是否支持短名，未继续试验或改权限。

历史 FC2 未保存实际 TargetPath，故其实际差异类别和底层首因仍 **UNKNOWN**；本地现象不能追认为历史唯一根因。

## 2. 同一受信任 Launcher 是否已证

**仅受控 fixture 已证。** 最终驱动抽取未修改的生产函数，仅映射测试常量及已验证的可信 Launcher SHA 定义；真实 Inno 原矩阵 15 例、目标及 producer 20 例通过。覆盖同字节不同文件、同文件错误名称/父目录、空值、NUL、不可达/不可读、真实目录 junction、当前坏链接 hash 匹配后的目标拒绝、绑定期间禁止写入、释放后同 ID 改字节，以及原引用仍在时同字节新 ID 替换等反例。

身份条件共同要求可信 SHA、128 位 FileID 与卷、固定名称及父目录、物理路径和映射、无 reparse、句柄关闭成功；未知即拒绝，不退回弱身份比较。只接受当前期望驱动器表达或已证明的物理驱动器表达，其他别名即使同文件也拒绝。参数、工作目录条件没有放宽。

测试侧 C# 策略 14 例、3 个基线生命周期检查及 Windows PowerShell 5/7 完整入口正反例通过。Go 只在完整 F02 可信安装证明后建立自己的 RAM 基线，后续复核不重新采样；这不是安装器原 producer ID 的跨进程证明。Go overlay 7 父/32 子及 vet 通过，其受测模板与最终源码逐字节一致。

关闭失败反例明确为**返回值注入**：真实 native close 成功，包装仅报告失败。匹配正路径不会提前发 MATCHED；已有拒绝时保留原首错，附加关闭问题只保留既有 cleanup-unproven 标记。不能把该反例称为真实系统 CloseHandle 故障。

## 3. 生产修改文件

- `tools/windows-installer/beta4-upgrade/setup-beta4.iss`：Fresh 目标验证、producer 所有权、失败回收与引用生命周期；固定 TARGET_DETAIL 分类，不输出路径、ID 或实际值。
- `tools/windows-installer/beta4-upgrade/fresh-startup-identity.iss`：上述强身份、目录/映射固定、按精确对象句柄移动及删除。
- `tools/windows-installer/beta4-upgrade/build-beta4.cjs`：仅 Fresh 构建复制 include，其 hash 纳入 generated 清单。

其余为测试、Go 观察 oracle、事件校验和历史测试输入纠正；没有新增产品 helper EXE/身份 schema。旧卸载 TargetPath 条件和三个卸载入口原文保留，非 Fresh 有效源码行投影一致。升级事务、rollback、业务、LAN、防火墙模块、实际 workflow/trigger、合同及额度未改。

历史测试读取不可变 FC1 控制提交及实际已受测 FC2 source，而非当前 HEAD 冒充历史。旧 FC2 FIX_FILES fence 未改；新修复 HEAD 仍被该旧门禁拒绝，已有明确拒绝反例。

## 4. 可安全恢复及仍 UNKNOWN 的资源

本次快捷方式具有创建前缺席、固定父目录、本次 producer 原对象 ID/卷/hash 和连续只读引用证明时，失败回收按精确对象句柄执行。实际“完整创建后目标失效”反例中，runtime TARGET_MISMATCH 首错保留，但原 owned 链接可清除；不会伪造 TARGET_MATCH/MATCHED。未知、变更或锁冲突对象拒绝删除。

受控映射恢复、已观察 Startup/Desktop/Programs 与指定登记世界不变、进程环境恢复、Job empty、句柄及管道关闭均已证，未强制终止。各 owned fixture 与历史失败输出保留；这些不是整机恢复证明。

**真实 Setup 没有在日常电脑运行。** 新早期 native 的 ProductRegistration、Binding、Desktop、Programs、ProgramFiles 五类 producer/完整恢复仍 NOT VERIFIED；历史 FC2 六类 OWNERSHIP_UNKNOWN（含 Startup）及 GlobalRegistry STATE_CHANGED 来源 UNKNOWN 不回填，也不等同已证实际残留。未盲卸载或清理真实 Startup/未知登记/文件。

源码核查已更正：FRESH_ACCEPT 进程成功启动后 `installationStarted` 已为 true；早期失败时完整安装清理 callback 尚未建立，不能把它误写为启动标志为 false。完整 F02 后的观察基线不会为早期未知资源补造所有权。

## 5. 完整同源 EXE

- 大小：**33,558,213 bytes**。
- SHA256：`e9c285c6c50b3ca784b1490229cacfddfdbae2c3fe42cb722ab6318c511c2a84`。
- 完整 Runtime、Helper、Launcher、ISCC 构建通过；1049 个 payload 文件、147,923,786 bytes、20 个依赖经 T2 与 Master 独立逐字节核验。
- source/tree、manifest、侧车、许可与全部 generated ISS hash 一致；新 include 原字节复制核验通过。内外 Job 与环境收尾通过。
- T2 Fresh CJS 251/251、Master 独立 CJS 81/81 与 Root 134/134，均 fail0/skip0；Master 另完成真实矩阵和报告篡改反例核验。

资格仅 **BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE**。未运行本次产品 Setup/产品 EXE，真实 F01—F09、安装后业务 26/742、QA 和物理 LAN 未由本轮验证；本地 EXE 不作为用户安装包交付。

## 6. 再次真实 Fresh 验收的准入条件及停止

本轮 **Hosted0**；原 Final Candidate **2/2 已耗尽**、QA **0/1 冻结**，不 retry、追加、借额度或复用旧 FC2 source 例外。构建及 Review 通过不会自动解冻。

后续真实验收须有新的明确用户授权及预算、受审来源/门禁和同 EXE 身份、安全隔离 Windows，以及该轮可证明的所有权与失败恢复条件；必需项 FAIL/UNKNOWN 仍停止。F01—F09、业务 26/742、完整通过后同 EXE 独立 QA 及物理人工项目不降低。当前证据不证明已具备上述全部条件。

原 FRESH-T2 在本地回单提交后冻结，保留原树、未跟踪现场和历史证据；不 push、不触发 Hosted/QA、不 main/tag/Release、不访问内部业务或改变网络/安全权限。

固定安全结果见 [LOCAL-RESULT.json](LOCAL-RESULT.json)，对应矩阵、来源、构建及 Master 字节复核见 [SAFE-EVIDENCE.json](SAFE-EVIDENCE.json)。不包含实际返回路径、原始日志或 OS 文件身份值。
