# Supervisor Entry Closure — 正式 RETURN / LOCAL PASS / INSTALL NOT VERIFIED

最终实现为 `cb2042de92cf4b578de73ee62863c62fbc04b26a`，代码指纹 `10788f0915a8dd798e0817010afd0210c75df9c593bf0a2764dbe95677aecedc`。Master 独立接口 Review、唯一同源真实完整 P0、Execution 与 Master 的独立字节核验均 PASS。原 FRESH-T2 正式 RETURN 并冻结；Hosted0，实际安装 NOT VERIFIED，FC2/QA 继续冻结。

## 已确认与仍未知

- 已确认原 `E:/fresh-trial` 与物理绑定要求的 `E:\fresh-trial` 存在词法不一致；仅归一化原固定根，不接纳其他盘符、别名或子路径。
- 已实际重放原 CI context 入口，观察到 Node 可在 Job 分配前执行。原 Process.Start→Assign 封装也存在这一顺序窗口。
- 开发反例实际暴露 Resume 失败后的异步管道释放竞态，已增加有界 drain 和各 reader/SafeHandle 独立关闭；没有把强制终止改记为自然 PASS。
- 本轮中间实现 c708 的新增诊断校验曾接纳 PASS 分类与 FAIL scope 的矛盾组合；不是历史 FC1 原报告已存在该字段。最终 cb2042de 的 JS/PS 均已拒绝，PASS 必须具备 PASS scope 和实际已观察、匹配的工作目录证明。
- 上述事实不能反推历史 FC1 Run39011056474 的唯一首因。历史 SOURCE/CLEANUP_UNPROVEN、全部 NOT_OBSERVED/其余收尾 null 仍原样保留，恢复未证。

## 修复边界

原 FRESH-T2/bea7、基线 `85817e6b56f3c2bc0c38a2cb25149f58fc56fbfa`；实现提交 `c708cf1567817cbc3cfd6c1d5dd1f5eefb015908`，一致性修复提交 `cb2042de92cf4b578de73ee62863c62fbc04b26a`。

新增进程封装使用 CREATE_SUSPENDED、显式 stdio 句柄白名单、Assign、原生 IsProcessInJob 核验、独占握手、Resume。CI 在 context Node/ENV 之前等待已分配握手。保留原 scope 默认 JSON 字段与含义；失败细分仅通过可选内部 Detail 和固定分类传递。

监督器保留 CreateNew/ShareNone 诊断句柄，拒绝收养既有文件；只读入口拒绝重解析、超界、陈旧来源及额外字段。FileID 仅写入独立、来源/控制/run 绑定的私有所有权收据，不写入诊断或上传报告。绑定失效使 workMatched=false、compilerOwnedFiles=OBSERVATION_FAILED、ownedToolchainAbsent=false。

入口固定分类进入原失败报告链。深层 BUILD/F01 的既有分类、Setup/Startup 和多场景诊断保留，只附固定 supervisor 分类；报告写入失败不转 PASS。产品、LAN 授权、安全身份、安装接受条件、历史 PASS 标准、实际 trigger、workflow、账本及 firstFailure 准入契约均未修改。

## 实际验证

| 验证 | 已确认结果与适用范围 |
| --- | --- |
| 最终源码 Node | 目标68/68、root134/134，fail0/skip0；root sourceBound=true |
| 实际 Windows/PS7 | 入口64、共享核心28断言 PASS；后者 context/CI 是明确受控 fixture，不冒充 Hosted main |
| Job/资源 | 实际 no-op/无效 Assign、gate 竞争、Resume 失败均拒绝执行子进程体；后代超时后 Job empty；强制终止保持 FAIL |
| 句柄/环境 | 20轮增长门禁、无关可继承父 Event 未传入、Unicode/复杂 argv/cwd/环境、父环境恢复 PASS；证据仅固定布尔与计数 |
| 路径/恢复兼容 | c708 实际 path26、恢复22、实际 CI finally7 PASS；cb仅改变诊断/反例四文件，相关路径/恢复实现无 diff |
| 既有 Go/链接 | c708 Go7父/32子、vet、受控 Inno link15 PASS；world/env/Job恢复已证；非产品安装 |
| 报告落地/保留 | 实际 FINAL CLI 生成原 schema2 单一 failure/fresh-report.json；F01 Setup 与12场景原诊断逐字段保留反例2项 PASS |
| Master 独立 | 最终源码68/root134、实际64/28及真实 CI 非法入口拒绝 PASS；scope FAIL为预期负例，无 Hosted 身份伪造 |
| 完整构建 | 最终源码 Runtime/Helper/Launcher/ISCC 完整构建 PASS；Helper13/Fresh2（含12场景）、Launcher28/Fresh2、Node44均fail0/skip0；内外Job自然退出/空Job/句柄/管道/环境恢复通过，无force |

## 构建身份与固定证据

源码树 `8abede3a2e1cb1709ca385e7916599d7ce89bda4`。EXE **33553062 bytes**，SHA256 `74e79060e2fdfbcffa1a748f73874fb8329593d496f0d93e22e18b63d162bdd0`。仅构建证据，不交付用户。

Execution 与 Master 分别核验 EXE/sidecar、build-info/sourceTree、installer-manifest、1049个实际载荷文件的全部bytes/hash、20依赖、生成ISS、原Setup源码hash、license及原package verifier。这里的载荷核验不是安装后文件验收。原始 P0 结果仅以新前缀保存，不覆盖历史构建证明。

- [原始本轮 P0 结果](SUPERVISOR-ENTRY-LOCAL-BUILD.json)，SHA256 `4765dca086e8a828b1c21052d1a0ea965d374a6de16055e963ba684dae109e84`。
- [构建字节身份](SUPERVISOR-ENTRY-BUILD-IDENTITY.json)。
- [本地门禁与保留的开发反例](SUPERVISOR-ENTRY-EVIDENCE.json)。其中 c708 兼容证据明确保留原source；最终增量仅四个诊断/反例文件，不重标旧证据来源。
- [19个实现文件及保护范围](SUPERVISOR-ENTRY-FILES.json)。

开发证据缺口已保留披露：入口测试曾把实际 cwd 写入本轮精确 owned args-result.json。该文件已受控脱敏为固定布尔并保留 developmentPrivacyCorrection；代码改为子进程在 RAM 比较，仅写布尔。未上传旧 raw。Master 另保留两次自身 harness FAIL：预期 sink-foreign 固定拒绝 stderr 尚未接纳、过长嵌套根被 native 文件读取拒绝；均经实际固定反例定位。最终独立测试使用短的自有输出根，不扩大一般长路径支持。Windows PowerShell5、Hosted 主入口和真实安装均未冒充已验。

## 最后 Candidate 的前置条件

本轮仅本地闭合，不授权 FC2。当前最终 Candidate1/2、唯一独立 QA0/1，剩余额度 UNUSED—FROZEN；旧预算与失败不变。必须用户明确解除 Hosted 冻结，并由 Master 满足既有来源、独立 Review、隔离、所有权、可信完整收尾及 firstFailure 契约；历史 FC1 恢复 UNKNOWN 仍不能通过该准入，不能由本地 PASS 回填。不能仅凭剩余额度触发。

实际 Setup、F01—F09、安装后浏览器业务、26/742、同 EXE 独立 QA、物理 LAN 与登录/UAC/第二设备仍 NOT VERIFIED/HUMAN_PENDING。本地 EXE 仅构建证据，不交付用户。本轮不 push、Actions、真实产品安装、真实 Firewall/登记修改、内部 SPXT、main/tag/Release 或未知清理。原现场与全部历史证据保留。
