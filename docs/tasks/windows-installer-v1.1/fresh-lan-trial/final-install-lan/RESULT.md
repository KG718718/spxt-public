> 最终结果：FC1 Run39011056474为SOURCE/CLEANUP_UNPROVEN FAIL，触发强制STOP；剩余Candidate及QA冻结。见FC1-HOSTED-RESULT.md。下方保留原Execution本地RETURN历史，不是Hosted安装PASS。

# FINAL INSTALL & LAN ACCEPTANCE / FRESH-T2 RETURN

2026-10-17。本地新额度接线、正反例、源绑定门禁和最终完整 P0 PASS，已具备交 Master 核验并中央触发 FC1 的本地条件。Execution 正式 RETURN 后冻结；本轮没有 push、Hosted、真实产品安装或独立 QA，不把构建通过当安装/LAN交付通过。

## 来源与固定证据

授权 `1e44df2a7a8a73a404b9a6ae5e17afdeceef541b` 已批准，不是待批方案。原公开 origin、原 bea7、原 `codex/fresh-t2-installer-ci` 与 tracked clean 已核验；原 `51b9d351` 为 ancestor 后 ff-only 到授权提交，所有未跟踪现场保留。

- 实现：`468c1d8bde8c37f303fb0ca7e6478f3b7c2d6ae8`、`862e347e258674b3f402d88bda222613449a7142`、最终 `1a01f8d51722d634431fdc330f5a084432be4d1e`。
- 最终实构建 source：`1a01f8d51722d634431fdc330f5a084432be4d1e`。
- sourceTree：`79cee779f2d138fcb1d82bce1d97a9af46d70556`。
- 完整代码指纹：`de2b2778f0ddda661cf6238473e27ccdaaa4828ef56674d3178f4a32a0ec924f`。
- 原始安全构建证明：根目录 `FINAL-INSTALL-LAN-LOCAL-BUILD.json`，与实际 `p0-result.json` 字节一致，SHA256 `3349313d4f49ffc3f359b93eab511dcd2d1e0e5e4d8cbf4966127a626cebc739`。
- 本目录 `BUILD-IDENTITY.json`、`LOCAL-GATES.json`、`PAYLOAD-PROOF.json`、`SUPERSEDED-BUILD.json`。报告提交仅文档，不能当作实构建 source。

## 最小接线

复用单一 `fresh-install-candidate.yml`、原 trigger 路径、ci/supervisor、physical binding、F01—F09、安装诊断、installed browser、26/742、严格 finalizer 与原七文件 ZIP/EXE 校验。workflow 仅三处 Artifact 名称增加由已验证 bootstrap 输出的新 profile 名称；旧 fallback、45分钟上限、独占并发组、repo/branch/attempt1 与所有真实成功谓词保留。

新 input schema2 / `installCandidate.schema2`、独立 AUTH、批准 marker 与 `FinalInstallLAN <slot> <testedSHA>` 标题不伪装成旧 IC1/R1。旧 schema1 仅增加版本分派，原请求/额度语义与历史读取不重写；原 trigger 内容、旧 ledger/FAIL 不改。

| 槽位 | 强制条件 |
| --- | --- |
| FC1 | 新阶段无已用 Candidate/QA；精确授权/parent/trigger-only diff、来源与真实同源 P0 证明 |
| FC2 | 唯一 FC1 completed/failure；严格来源/Artifact/原始报告字节摘要；全部 cleanup=true、全部 recovery 已恢复；具体可核验首因；真实新 source/不同代码指纹/祖先/本地 P0；首个 PASS 或任何安全/恢复未知立即拒绝 |
| FQ1 | 唯一完整成功 FC1 或 FC2；同 run/artifact/source/EXE SHA 与实际字节；全 schema2 门禁/诊断/恢复 PASS；不重建；全局仅原未用一次 QA |

FC2 不以 generic GATE_FAILED、泛化 marker、普通 Go testName 或未知异常充作充分原因。允许的本轮窄门禁为精确 ISCC 脚本/行/错误类别，或 F01 实际 fatal 与经过原严格 validator 验证的具体 Startup firstFailure trace。普通安装失败的 outcome/copy UNKNOWN 不自动等于恢复未知；即使 INI_WRITE_FAILED 已明确，也仍须所有安全/隔离/资源恢复证据全真。VERIFY_EXCEPTION、cleanup未知、缺报告/占位报告、旧 schema、敏感额外字段均拒绝。没有修改原 report/outcome 或成功谓词。

新 bootstrap 对当前 workflow 与两个 legacy 做完整分页、total_count稳定、去重与未知拒绝。除固定旧 IC1 source/control/id/FAIL 外，增加 Master 实际 API 核实的六条旧 Run 精确锚：三个旧 Candidate 与 R1 Smoke/FAST C1/C2，按 id 集合校验 control/title/branch/path/event/attempt/completed/failure，顺序无关；空页、缺失、替换或额外旧 QA 都不能恢复额度。此强约束仅作用新 profile，旧函数不重写。

第一失败证明使用实际 ZIP reader 的 UTF8 报告字节，在 gate 内重新计算 SHA256；不是调用方声称“恢复=true”或提供伪 reportSha。新控制提交与 prior control/source 的唯一 trigger diff、父子/祖先关系均复核。纯 `trigger.cjs.serialize` 只返回通过门禁的 JSON，不写实际 trigger；本轮该文件没有变化。

生产 Setup/Launcher/Firewall/Runtime/业务、信任/事务/rollback、原安装及资源恢复实现均零 diff。没有放宽虚拟网卡、真实授权、权限、数据安全或物理人工条件。

## 本地结果与来源范围

- 最终 `1a01`：新18 + 旧 wiring17 + R2 28 = **63/63**、root **134/134**，fail0/skip0、sourceBound=true；实际 Windows Go overlay **仅编译与 vet PASS**。
- 独立 Job：assigned/naturalExit/stderrEmpty/pipesClosed/handlesClosed/jobEmpty=true，forcedTermination=false；不执行产品或真实规则/登记动作。
- 本轮兼容实测在前源 `862e`：physical binding **26 PASS**（实际 rename 身份拒绝、真实 sharing拒读、权限仅 Unauthorized 注入、精确 SUBST移除）、PS恢复 **22 PASS**、实际 CI finally **7 PASS**，Job/环境恢复 PASS。相关七份输入 blob 与最终 `1a01` 完全相同，详见 LOCAL-GATES；没有把它们改称最终 source 的另一次实测。
- 本轮未重新执行 closure 的链接15、Go恢复7父/32子、LAN50/权限47；原 `98f99aa1` 的这些结果及全部历史 P0 继续保留，不冒充本轮重跑。
- Master 独立反馈最终 `1a01` 的63/root134与实际Job PASS，精确历史锚及新 profile Review 无返工；最终 P0 另经实际三方清单/1049文件逐字节/20依赖/EXE 核验 PASS。

开发阶段 fixture 少一个闭合括号造成两份测试容器解析失败，已修正并保留固定失败结果，无产品或 Hosted 执行。随后实际反例确认前源 `862e` 会接受已知六条 legacy 缺失；Master批准并提供API锚后修复。前源 P0 自然完成 PASS（33550391字节/SHA bfbd094a0c4a4879ddcd2d7368b14c52830f82c02a126bd924bb18c810a14919），原证明只存 SUPERSEDED-BUILD 历史，不用于最终准入。没有为省构建放宽完整代码指纹。

## 最终真实 P0

- 文件：`K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`；未安装、未执行产品。
- source：`1a01f8d51722d634431fdc330f5a084432be4d1e`。
- bytes：`33555275`。
- SHA256：`3413db4a2cc2e34ce6e7eab761ea2e94ab0d5131fe21e8700c9761d71ec1881a`。
- programManifestHash：`64f2d6dc6e7dbd5768cc3698df99eda43441c698732f411b210be00e43d268be`。
- Runtime、Helper13/Fresh2（含目标12场景断言）、Launcher28/Fresh2、Node44、1049文件/20依赖、ISCC 实际构建及身份检查 PASS；naturalExit/stderrEmpty/jobEmpty/environmentRestored=true，forcedTermination=false。
- 资格仍为 `BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE`。本地 EXE 位置通过原 Master 回单提供，固定安全 JSON 不嵌物理路径、PID、网络/账户或 raw 日志。

## 中央触发与剩余边界

新阶段 Candidate0/2、唯一 QA0/1；其余 Hosted0。Master 使用 input schema2、AUTH `1e44df2a7a8a73a404b9a6ae5e17afdeceef541b`、FC1、`FINAL_INSTALL_LAN_MASTER_REVIEWED_FC1_<reviewedSource>`、上述 localBuildSource/proof SHA/Setup SHA/codeFingerprint；FC1 的 candidate与firstCandidate三个引用字段均为空字符串。reviewedSource/testedSource 是 Master 核验的同代码指纹新源，不把报告提交当成本地已构建 SHA。三方HEAD/独立Review后仅 Master 创建 trigger-only 控制提交并中央触发。

本轮 Hosted/Actions/push/真实trigger变更0；QA尚未运行，Execution不是独立QA。真实 fresh 安装、F01—F09、安装后浏览器业务、原26/742及完整早期失败恢复等待获准 Runner 实测；本机不 spoof Hosted、不实际Setup、不建VM/研究解包。历史F01首因 UNKNOWN、旧 ENV/CLEANUP_UNPROVEN 和 rules未证不改；未知所有权资源不得采纳或删除，任何收尾未知必须STOP，即使剩预算。

自动化最终通过仍仅 `FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING`；物理网卡/UAC/Firewall授权/第二设备/Win10登录自启/实际双启动留人工。无 main/tag/Release/内部 SPXT 操作，无未知清理。原树、代码、受控输出和全部失败证据保留；此回单后 FROZEN，交原 Master 整合、非force同步及中央 FC1。
