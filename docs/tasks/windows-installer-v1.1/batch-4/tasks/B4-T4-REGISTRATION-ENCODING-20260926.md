# B4-T4 登记编码返工卡

TASK ID：B4-T4；派单编号 B4-T4-REGISTRATION-ENCODING-20260926-02。你是执行任务，不是项目主控。ROLE Execution，PARENT Batch4，困难/L2，gpt-5.6-sol / medium。

## 身份与唯一目标

仓库 KG718718/spxt-public；原 WORKDIR E:/CodexWorkspace/CodexWorktrees/f8bd/public-source；原分支 codex/b4-t4-upgrade-lifecycle；当前继续点867cc752af00246c92a1f96b1916c576df7de0d5，原baseline不变，不fetch/rebase或切换工作树。该提交已Review并整合为4319e08694b6660477397102af20d95eb25062b4。唯一主控及主动return target：01a0db0e-c950-79e0-8e11-07155e0742f2。旧主控永久RETIRED — READ ONLY HISTORY。

先读主控公开目录最新AGENTS/PROJECT、Batch4 SPEC/PLAN/ACCEPTANCE和AUTONOMOUS-EXECUTION.md；旧任务历史暂停/额度限制被本次用户恢复授权覆盖。继续同一T4，不重做T1/T1A/T2/T3，不创建任务/worktree/Agent，不读私有仓库。

## 已确认事实

D1 run36208733404 / job108310693870，source4319e08694b6660477397102af20d95eb25062b4；Artifact10895175510，upgrade-sequence-diagnostic-36208733404-1，SHA256 f91d0d0f8b9f5cb06281fc48511f704158f6128ead1b4c1bfcc9c2956509e881。只有sequence运行，其他job skipped。
报告：PRE_ENV_READY、PRE_BETA1_INSTALL、PRE_REGISTRATION_ASSERT、PRE_LAUNCH_READY、PRE_BETA1_CORE_PROBE、PRE_U02_RUNNING_GUARD、PRE_BETA1_STOP、PRE_OWNED_STATE_SNAPSHOT全部STAGE_COMPLETE/COMPLETE；BASELINE=IDENTITY_REGISTRATION_VERSION/UNCHANGED；status FAIL。主控已验证封闭schema。原空phases断点已越过，但U15及以后本轮未运行。
安全JSON在主控公开目录.test-work/sequence-review-36208733404/SEQUENCE-DIAGNOSTIC.json，可只读；不下载或输出原始私有运行材料。

## 待验证根因及工作范围

detection/index.cjs的VERSION_UNSUPPORTED同时覆盖displayName不等于K⁺-SESSION Beta或displayVersion不等于受信beta.1。Go真实登记断言及Inno ReadUpgradeIdentity先前已检查对应字段；WriteUpgradeRequest随后以String S传给SaveStringToFile，WriteUpgradePlan和安装元数据同样。官方Pascal函数签名接收AnsiString，Utf8Encode明确把Unicode转换为UTF8：
https://jrsoftware.org/ishelp/topic_isxfunc_savestringtofile.htm
https://jrsoftware.org/ishelp/topic_isxfunc_utf8encode.htm
这提示窄字符写出可能使⁺或Unicode路径损坏；目前是证据支持的待证假设，不可直接宣称Hosted根因。

先建立可执行本地合成反例证明旧字节序列与消费者UTF8读取的差异，区分产品名/版本；若有既有固定Inno工具可做纯合成编译验证，不下载未知工具、不真实安装。最小修复应仅保持既定Unicode字符串的UTF8序列化，不放宽任何身份、版本、路径、metadata或事务断言。必要时修复同源三处JSON写入，以防plan的Unicode快捷方式路径同样损坏；禁止改schema或数据迁移。
按用户每轮规则补更深固定诊断：在sequence-only原因映射中将该组拆成固定的name/version/both等安全枚举，不能输出实际值、路径、hash、错误正文。保持生产detection/gate接受条件完全不变，wrapper/workflow的闭合enum与可执行反例同步。实现选择由执行在本卡边界内判断，若证据指向其他纯工程原因，先回主控证据，不能猜改产品。

允许最小修改：tools/windows-installer/setup.iss的上述内部JSON序列化与sequence诊断marker；sequence-identity.cjs、sequence-diagnostic-report.ps1、相关wrapper；tools/windows-launcher/upgrade_windows_test.go仅固定原因识别；tools/tests/windows-installer/下相关合成测试及本任务RESULT。workflow只在报告校验确需时修改，不触发/新增job。不改生产detection/gate政策、信任bundle、package/lock/toolchain版本、app业务或DC1、数据生命周期、UX、平台、安装路线。

## 验证、回单及停止条件

先旧行为失败反例，再最小修复正反例；覆盖Unicode产品名/合成路径、ASCII、真实非法版本仍拒绝、报告name/version/both分支与注入拒绝。必要Node联合专项、npm test、PS AST、Node syntax、git diff --check；若改Go则固定Go的gofmt、纯测试、compile-only。不在开发机运行真实生命周期/注册表/快捷方式/网络隔离，无真实数据或凭据。
只local commit，信息含[sequence-diagnostic] [skip ci]；禁止push/Actions/main/tag/Release。已用最小诊断1/4，剩3；Full0/2、QA0/2，只有主控可扣预算显式dispatch；不得同失败无修改retry。
完成主动send_message_to_thread到上述新主控，核验目标ID；回单字段TASK/派单编号、PASS/FAIL/BLOCKED、已证实与推测、文件、失败→通过测试、local commit、风险、主控后续。送达失败写RESULT，由主控watchdog接管，不停在未回单。
产品/UX/schema/migration/生命周期/信任或安全放宽/路线/平台改变、预算耗尽或无法安全恢复才上报决策；普通工程问题本卡自动处理。最终门禁仍U01—U30、Runtime/Launcher/Portable/Setup、26/742 fail0 skip0、privacy/QA/最终beta2 Artifact；然后HUMAN PENDING，不进入Batch4.5。

