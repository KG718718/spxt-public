# 2026-10-17 Fresh Install Candidate / FRESH-T2 RETURN

本地接线、来源门禁与唯一一次同源完整 P0 构建 PASS。仅达到测试接线与构建资格；实际 Runner 前态、安装、F01—F09、26/742 与 QA 均未执行。Execution 正式 RETURN 后冻结，由 Master 独立 Review、整合并决定是否唯一触发。

## 来源与提交

- 原公开 origin：`https://github.com/KG718718/spxt-public.git`；原 bea7 / `codex/fresh-t2-installer-ci`。核验 tracked clean 后从 `b748b359` ff-only 到 `627d871a4afedbd4b8403df78a7c79ad498c3a08`，旧未跟踪现场保留。
- 授权：`INSTALL-CANDIDATE-20261017-AUTHORIZATION.md`；授权提交 `627d871a4afedbd4b8403df78a7c79ad498c3a08`。
- 实现与本次真实构建来源：`849131c20282afcdc4d27fa5237fdf9b38865e8d`。
- 实现树：`ed6d7a1b675200b4b5f0e6b3f44bd2d42570911d`。
- 完整代码指纹（沿用既有排除 docs/AGENTS/PROJECT 算法）：`43091f6233c1ca6ed093432591108fb9ac325e01d10c21c05630f4f7189d8f0a`。
- 本报告提交仅新增本轮文档，不能将其 SHA 冒充实构建 source；准入合同要求本地构建/受审/受测代码指纹一致及真实祖先关系。

## 实现范围

新增 `.github/workflows/fresh-install-candidate.yml` 与独立 install-candidate contract/bootstrap/context/早期安全报告和反例。仅允许开发分支 push、唯一 trigger 路径、attempt1、固定仓库、同一 `fresh-lan-trial-exclusive` 并发组，Job 上限45分钟。实际 trigger 文件未创建。

新槽位仅 `IC1` Candidate 一次与 `IQ1` 条件 QA 一次。QA 使用原有未用额度，不增加第二份 QA；旧 Smoke/R1/FAST V1 的失败与预算不重新解释。bootstrap 查询新 workflow 与两条旧 Fresh workflow 的完整历史：要求分页稳定、total_count 完整、无重复；未知/非法历史、重复槽位或 attempt、已用旧 QA 一律拒绝。Candidate 任何失败/取消/未知均不能成为 IQ1 前提。

精确输入字段、批准 marker、授权提交、单 parent、trigger-only diff、完整源码指纹与本地 P0 proof 摘要均强制核验。QA 还要求唯一 IC1 已 completed/success，严格 schema2 的全部九门禁、全部安装诊断与逐资源恢复/cleanup PASS；绑定同一 run/artifact/source/Setup SHA，核对 Candidate 控制提交、唯一 trigger diff 与祖先关系。下载只接受固定七文件 ZIP 白名单及报告边界，复用既有不可变解包、实际 artifact 身份/隐私核验；QA 不重建 Runtime/Helper/Launcher/Setup。

新身份为 `context.installCandidate`，没有伪造旧 `r1.fastDelivery` 授权。supervisor/ci 同时按新 workflow_ref 或新属性强制验证新身份，缺属性不能降入旧监督分支；仍必须真实 Job assignment gate 与 scope proof。finalizer 必须先验证新 context，再沿用原 schema2 和恢复成功谓词。源码审查发现的新 QA 初始失败报告一致性问题，仅在新路径绑定已声明的 Candidate SHA；该报告保持 FAIL，不证明实际 EXE 已通过。

复用 R2 的实际 prestate collectors：规则两存储、ProductKey、Binding、快捷方式、程序文件、编译器文件/设置、全局注册表均须 KNOWN；未知在产品安装前停止。新早期回退报告固定 SOURCE/分类、隔离状态与十项 NOT_OBSERVED 资源，不保存异常详情或 raw stdout/stderr，不将未观测当恢复通过。

原生产、业务、安全、Setup/Launcher/Node/Firewall、身份/事务/rollback、原构建入口、旧 workflow/旧合同和运行账本均零 diff；本轮仅12个测试接线/反例文件。没有新增 Thread、worktree、sub-agent、push 或 Hosted。

## 实际本地结果

| 门禁 | 结果 |
| --- | --- |
| 新预算/来源/QA/归档/接线反例 | 17/17 PASS，fail0 / skip0；包括实际 ZIP reader 的6种文件集/边界场景 |
| 原 R2 CJS | 28/28 PASS，fail0 / skip0；Master 又独立 source-bound 复核新17+R2 28=45/45 |
| 同源 Root | 134/134 PASS，fail0 / skip0，sourceBound=true；Master 独立复核同样通过 |
| 实际 Windows Go overlay | `go test -c` 与 `go vet` PASS，未执行生成的 test EXE 或 installed core |
| workflow 与 PowerShell | 固定结构断言 PASS；4段 workflow inline PS 与3个必要 PS 文件 AST 解析错误0；无通用 YAML parser，不声称完整机器 YAML parse |
| 完整 P0 | 唯一一次，原已审 local-p0.ps1、固定工具链，同源 Runtime/Helper/Launcher/payload/ISCC 实际构建 PASS |

P0 包含原 Helper13/Fresh2（含目标12场景断言）、Launcher28/Fresh2、Node44 与1049文件/20依赖身份检查；详情见 `PAYLOAD-PROOF.json`。本次只读复核实际 EXE 字节/hash/build-info/sourceTree，未运行生成的 Setup 或产品。

本地门禁 Job 与 P0 均自然退出，stderr 空、Job empty、无强制终止；门禁 Job 的管道/句柄关闭已证，P0 环境恢复 true。stdout/stderr raw 仅 RAM，固定安全 JSON 落盘。Master 反馈独立新17/R2 28/root134 及相关 Job 复核 PASS，并只读核查两条旧 workflow 各3条历史、QA未使用；本报告不把该反馈当成新 Hosted 执行。

## 实际构建身份与准入资料

- EXE：`E:\CodexWorkspace\outputs\fresh-install-candidate-p0-a3e084ebc9d044a69a2bc32aebdda7b7\setup\artifact\K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`。
- 字节数：`33557167`。
- SHA256：`d2f01a824b62e0f00a60026a2d1b01b7000d582e6b9d6031e2cb2b0643ce18eb`。
- programManifestHash：`ae815f69e059f0ead8769cda8f868245f1a7bf29cd11403430fb66594d845afe`。
- 固定原始安全构建证明：`../INSTALL-CANDIDATE-20261017-LOCAL-BUILD.json`，与实际 `p0-result.json` 字节相同。
- 构建证明 SHA256：`58baf6635905b24d17fd891a539136a567743616ff1ad5a9b0f92c401c1c6b0e`。
- `localBuildSource=849131c20282afcdc4d27fa5237fdf9b38865e8d`；`localBuildSetupSha256=d2f01a824b62e0f00a60026a2d1b01b7000d582e6b9d6031e2cb2b0643ce18eb`。新合同还要求 `authorizationCommit`、上述 proof 摘要、精确 `codeFingerprint` 和 reviewedSource/testedSource 的来源关系。
- 资格仅 `BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE`。不能把4e7旧构建记作8491新构建；也不要求后续带独立来源/时间戳的 Hosted 构建与本地构建同字节，条件 QA 则必须与其成功 Candidate 的实际 EXE 同字节。

## 保留的不确定性与停止边界

历史 R1C2 F01 FAIL/首因 UNKNOWN 原样保留。没有进行本机原生规则探测或真实安装，旧 Win10 QUERY_CIM_FAILED 仍 NOT_PROVEN，不能作为新 Runner 前检 PASS；Runner 必须重新得到全部实际 KNOWN 前态。早期部分资源没有生产者 receipt 时仍 OWNERSHIP_UNKNOWN/PRESERVED，不宣称完整失败安装已恢复。

本轮 Hosted/Actions/trigger/push 均0；新增 Candidate 0/1，原 QA 0/1仅在 IC1 全部 PASS 后可用。旧 Candidate2/2 FAIL、旧 Smoke/R3/Full/U27/LC01 记录与预算不变。实际 Runner 前检、安装与完整恢复、F01—F09、26/742、QA、物理 Win10/LAN/UAC/登录自启均未由本轮证明。任何必需前检/执行/恢复 FAIL 或 UNKNOWN 立即 STOP，不重试、不追加、不挪 QA。

最终自动化通过也只允许 `FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING`。没有可交付用户安装资格，不改 main/tag/Release、不访问内部 SPXT、不清理未知文件/规则；原现场与所有证据保留。Execution 本回单后 FROZEN，仅等待原 Master Review。
