# INSTALL TARGET REPAIR — MASTER REVIEW

2026-10-20。**本地实现、受控 Windows 反例及完整同源构建 Review PASS；真实 Fresh 安装与完整失败恢复 NOT VERIFIED，Hosted 冻结。**

受审/构建 source：`04dd974c41063c5067cadd55d53071068ef9ba96`；正式 Execution RETURN：`4b4debcec6d2864d06fe25865a1c6e65bd88e7ff`。Master 已 ff-only 整合，原长期 FRESH-T2 冻结，旧工作树与失败证据保留。

## 实现判断

生产仅改 `setup-beta4.iss`、新增 Fresh-only `fresh-startup-identity.iss` 及构建复制接线。目标须同时满足可信 Manifest SHA、128 位 FileID/卷、原始引用、父目录/文件名、物理路径和稳定映射，无 reparse；相同字节的另一文件仍拒绝。持续数据读引用阻止普通写入，验证时重新核验 SHA；不以 metadata-only 句柄冒充内容保护。

启动项创建前检查缺席并保存 producer 身份。移动与删除针对已核验对象句柄，不在检查后按可能替换的路径盲删；未知、变更或锁冲突保留。运行验证与回收所有权分离，回收成功不伪造 TARGET_MATCH/MATCHED。移动成功立即记录事实；异常退出前释放 Launcher 引用，Startup 原引用留给 DeinitializeSetup。MATCHED 只在验证和关闭成功后发出，已有拒绝首错不被附加关闭问题覆盖。

原参数、工作目录、升级身份/事务/rollback、业务/LAN/Firewall/Launcher 模块、实际 workflow/trigger/额度未放宽或改动。旧卸载目标条件和三个入口原文保留；非 Fresh 源码投影一致，仅为源码证据，不冒充卸载运行验收。

Windows PowerShell 5 数组接收兼容修正和历史测试数据锚修正属测试问题。FC1 历史正例读取原控制提交，FC2 正例固定实际历史受测 source；旧 FC2 blob fence 不改，当前新修复 HEAD 仍拒绝，不取得旧运行槽位。

## 独立验证

| 门禁 | 结果/资格 |
|---|---|
| Master CJS / 根回归 | 81/81 + 134/134，fail0 skip0 |
| Execution 全 Fresh | 251/251，fail0 skip0 |
| 原生产函数真实 Windows 提取 | 15/15，仅受控常量/可信测试 SHA 映射 |
| 目标/producer 实际矩阵 | 20/20，含同字节新 ID、错误名称/父目录、reparse、NUL、损坏链接、受控 alias、精确 owned 回收 |
| 独立 C# oracle | 14 策略例 + 3 基线生命周期；PS5/PS7 完整入口、参数/工作目录/损坏拒绝 |
| 关闭失败注入 | 2；真实 native close 成功，仅返回值注入，不冒充 OS 故障 |
| 报告篡改反例 | Master 独立拒绝 12 项 |
| Go overlay / vet | 7 父/32 子；实际受测 0eb79c50，与最终 Go 输入逐字节相同 |
| 最终 P0 | 04dd 同源 Runtime/Helper/Launcher/ISCC；Firewall13+Fresh2、Launcher28+Fresh2、Node44 保持通过 |
| 环境与资源 | 内外 Job、进程/句柄/管道、受控映射、进程环境及已观察世界恢复；无强制终止 |

EXE **33,558,213 bytes**，SHA256 `e9c285c6c50b3ca784b1490229cacfddfdbae2c3fe42cb722ab6318c511c2a84`。Master 独立核验 1049 文件 / 147,923,786 bytes / 20 依赖，payload、Manifest、source/tree、侧车、许可及 generated ISS 全字节一致，新 include 与受审原文件一致。P0 报告 SHA `3beefa7ab396248cf27c52aa4fc87e4964bdfcca676355991cd72ff27275580a`。资格仅 BUILD_ONLY。

## 限定与停止

历史 Run39215154383 首因/实际 TargetPath 类别仍 UNKNOWN、六类 OWNERSHIP_UNKNOWN 和 GlobalRegistry STATE_CHANGED 历史不回填。真正 distinct 8.3 alias 未在本机安全取得；早期含 NUL 的 prototype 资格已撤回。真实早期 ProductRegistration/Binding/Desktop/Programs/ProgramFiles producer 和完整安装恢复未证，仅新 owned Startup 在 receipt 完整时可安全回收。

未运行真实产品 Setup、F01—F09、安装后浏览器/26-742 或 QA；本地 EXE 不是用户可交付包。Candidate2/2 及所有历史 FAIL 保留、QA0/1 冻结、本轮 Hosted0。下一次真实验收需新的明确预算与当前源码准入、安全独立 Windows Runner 及完整安全/恢复门禁；任何必需 FAIL/UNKNOWN 停止。只开发分支非 force 同步后 STOP；不 main/tag/Release/内部 SPXT/未知清理。

固定独立证据见 [MASTER-EVIDENCE.json](MASTER-EVIDENCE.json)，执行六项回单见 [EXECUTION-RETURN.md](EXECUTION-RETURN.md)。
