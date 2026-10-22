# Duplicate Run & Source Gate Closure

状态：LOCAL REVIEW PASS / HOSTED FROZEN。修复源码 4aaf0d1be81d9735abce62abc099660c03974829；Execution RETURN c70ac99a92287ae6fa1488a0585846a9df1eae9c。

- 两条历史 Run39732016119、39732017789 具有不同 Run ID、check suite 和 run number，均 attempt1、event=push、同控制提交482144f2；不是列表或分页重复。只发现一条匹配公开 PushEvent，无法据此证明完整推送历史；GitHub 内部重复触发原因保持 UNKNOWN。482144f2 是控制提交，计划受测源码是 d8222780。
- 旧合同 history.length===1 是已确认的准入缺陷；两条真实历史使该条件不成立。历史只记录 CURRENT_API_REJECTED，不能追认具体首个断言。旧 FAIL、UNKNOWN、账本、trigger 和原授权逐 blob 保留。
- 新准入精确保留两条历史，绑定独立 Master 原生审批凭证、control、Source、唯一 Run ID、attempt 和实际 Job ID/状态；入口、必要安装前阶段、最终聚合复核。重复、重放、缺页或额外历史拒绝，缺失观察为 UNKNOWN。concurrency 仍只是排队机制。
- API 查询、历史异常、授权不匹配、Job 验证和超时各有固定分类；分类贯穿 early/split/outer/aggregate。安装子进程不携 GitHub 凭据，报告仅允许固定字段与必要来源摘要。Review 发现的缺失字段分类及 JobID 未比较问题均以反例闭合，失败证据保留。
- Master 独立绑定反例 22/22、缺失观察 8/8；目标集 127/127、根集 146/146，全部 fail0skip0，Job/环境恢复 PASS。执行侧详细源绑定 CJS、Go、PS 证据见本次 EXECUTION RETURN 和 MASTER-REVIEW.json。生产安装器、Launcher、Firewall、业务和安全规则未修改。
- 本轮 Hosted0、未配置真实 Environment、未发真实审批、未创建新 trigger/Hosted 授权。QA 继续冻结；没有新源码完整 EXE 或真实安装/LAN/业务验收证明，旧 d822 EXE 仅保留历史 BUILD 身份。

下一次真实 Candidate 的最小条件：先取得新的完整 A/B Candidate 明确预算；配置并只读核验受保护 Environment 和唯一 Master reviewer（当前 Environment0）；明确原生待审批队列的等待上限及超时取消方式，不能把 Job timeout 当成排队期限；完成新受审源码的同源完整 EXE 构建和独立 Review；通过外部凭证批准唯一 Run ID，API/Runner/隔离/所有权/恢复前检全部通过后才实际安装。原 QA 仍只能在完整 Candidate 与合格同一 EXE 通过后按新授权解冻。不能保证 GitHub 不再创建重复记录；若再出现，必须拒绝而非择一忽略。本轮不申请或消耗新预算。

只读取证参考：[历史 Run 1](https://github.com/KG718718/spxt-public/actions/runs/39732016119)、[历史 Run 2](https://github.com/KG718718/spxt-public/actions/runs/39732017789)。GitHub 官方说明：[concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)、[Events API 的完整性限制](https://docs.github.com/en/rest/activity/events)、[原生审批历史 API](https://docs.github.com/en/rest/actions/workflow-runs#get-the-review-history-for-a-workflow-run)。
