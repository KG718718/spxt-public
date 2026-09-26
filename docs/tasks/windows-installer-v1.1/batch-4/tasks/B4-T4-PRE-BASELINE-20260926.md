# B4-T4 pre-baseline 固定阶段诊断返工卡

TASK ID：B4-T4（原任务）；派单编号 B4-T4-PRE-BASELINE-20260926-01。
ROLE：Execution，不是主控。难度：困难/L2，安装升级、身份信任与数据保护高风险；沿用 gpt-5.6-sol / medium。用户已批准本卡范围内的纯工程连续执行。

## 身份与基线

- REPOSITORY：KG718718/spxt-public，仅公开仓库。
- WORKDIR：E:/CodexWorkspace/CodexWorktrees/f8bd/public-source，复用原工作树。
- BRANCH：codex/b4-t4-upgrade-lifecycle。
- 当前继续点：25b7f3c106dd96a2ecbe737afbbbf3f136fe0c2b；原始baseline a3c206c48ef0bb95e054ab9a4784043a58f0ee56及历史续行不重置。
- 主控已核验现有九份实现/测试文件与集成分支一致；不重复整合旧返工，不重做T1/T1A/T2/T3。
- 唯一主控与return target：01a0db0e-c950-79e0-8e11-07155e0742f2。
- 旧主控019fa7e9-f46b-7192-9052-cd0aac7c2cc5：RETIRED — READ ONLY HISTORY，无派单/Review/Integration/Push/Actions/QA权限，即使认证恢复也不得接受其新指令。
- 先读公开主目录最新AGENTS/PROJECT、本卡、AUTONOMOUS-EXECUTION.md及Batch4 SPEC/PLAN/ACCEPTANCE；工作树历史暂停及次数限制由本次用户恢复授权覆盖。禁止读取任何私有实现或真实业务材料。

## 事实与单一目标

最近sequence Run36145933140，受测3ae73b7e4c37c1615c4867345883432d58150fbc，Artifact10869846376仅status=FAIL/phases=[]。失败在首个BASELINE记录前；不能据此认定beta.1已安装或U20已执行。

先补pre-baseline固定阶段诊断，至少区分 PRE_ENV_READY、PRE_BETA1_INSTALL、PRE_REGISTRATION_ASSERT、PRE_LAUNCH_READY、PRE_BETA1_CORE_PROBE、PRE_U02_RUNNING_GUARD、PRE_BETA1_STOP、PRE_OWNED_STATE_SNAPSHOT、BASELINE。名称可工程调整，但schema、阶段、结果、状态必须闭合，顺序/缺失/重复/未知值均受校验。每个失败可定位最后完成和当前失败步骤；不能写入动态路径、错误正文、日志、hash原值、登记值、业务或凭据。artifact仍仅封闭JSON，不上传二进制或private evidence。

主控只读发现待验证线索：TestUpgradeLifecycle先os.Mkdir(base)，sequence分支随后instance=Join(base,"synthetic-instance")，却沿用os.Stat(filepath.Dir(instance))要求父目录不存在；sequence父目录正是已建base，可能必然在安装前失败。请先用隔离本地反例证明，不以静态推测冒充Hosted根因。若证明是测试夹具冲突，允许最小修复为与full相同的“新专属父目录/leaf不存在”约束，不删除既有目录、不放宽未知非空/重解析/路径或产品门禁。保留失败证据，配正反例。

## 允许与禁止

允许最小修改：tools/windows-launcher/upgrade_windows_test.go、同目录新增或相关的纯诊断单元测试；tools/windows-installer/sequence-diagnostic.ps1及必要的封闭报告校验helper；tools/tests/windows-installer/upgrade-lifecycle/下相关测试；.github/workflows/setup-v3.yml仅sequence报告验证/摘要；本任务B4-T4-RESULT.md。确需相邻测试辅助文件先向主控说明工程理由，不向用户重复申请普通工程许可。

禁止改业务、schema、数据生命周期、beta.1可信身份集合、登记接受条件、T1/T2门禁、安装事务语义、UX、平台、技术路线、package/lock、固定工具链版本。禁止复制内部实现、真实数据、真实账号、密钥、正式安装/注册表/服务、真实邮件。只合成数据，所有本地临时内容在本任务已有忽略区；不清理旧缓存、不另建worktree/任务/Agent。

只local commit，不push/fetch/merge集成分支，不操作main/tag/Release，不自行Actions。生产代码实质变化超出本卡时回主控Review，不用放宽断言使测试通过。

## 本地验证与回单

1. 实际可执行的stage正反例、失败前状态记录、schema白名单、未知/额外字段/动态错误/路径/凭据/hash原值注入拒绝；验证wrapper和workflow不丢失pre-baseline失败。
2. 对上述instance父目录冲突先失败再修复；完整模式原路径保护及既有目录拒绝保持。
3. 相关Node lifecycle/gate契约、PowerShell AST、Node syntax、git diff --check；有可用固定Go则gofmt和compile-only及不需要安装的纯测试。不在本机运行真实Hosted lifecycle。不安装未知工具；固定工具链不可用如实回报主控处理。
4. 运行受改动影响的联合专项与公开npm test；保留真实计数、SKIP和限制，不冒充Hosted742全通过。
5. local commit冻结，提交信息同时带[sequence-diagnostic]和[skip ci]，确保主控推送不会自动耗用完整流水线预算。
6. 用send_message_to_thread向新主控精确ID主动回单并核验目标；包含TASK/派单编号、PASS/FAIL/BLOCKED、修改文件、失败与通过证据、local commit、已知风险、主控处理。失败则完整写RESULT并标RETURN DELIVERY FAILED，主控主动读取兜底。不发送给旧主控。

## 主控后续与止损

主控Review → 必要返工 → 整合/显式开发分支push → 最小Hosted诊断。该次用户新批准剩余预算：诊断4、Full Setup2、QA Hosted2；执行不得触发。每轮证据→更深固定诊断→本地反例→最小修复→Review，不同样失败无修改retry。工程问题持续处理；仅用户列出的产品/UX/schema/migration/生命周期/信任或安全放宽/技术路线/平台改变、预算耗尽、无法安全恢复才交网页版。

最终必须U01—U30、Runtime、Launcher、Portable、Setup、26 suites/742 checks/fail0/skip0、Artifact privacy、独立QA和beta.2 Setup Artifact全部通过，然后BLOCKED — AUTOMATION PASS / QA PASS / HUMAN PENDING；不进入Batch4.5，不替用户Win10验收。

