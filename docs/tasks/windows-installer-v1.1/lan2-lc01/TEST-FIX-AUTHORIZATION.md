# LAN2-LC01 — 测试修复及唯一实机验证授权

2026-10-09，用户正式批准有限续行；本文件记录新授权，取代SPEC中仅静态诊断及禁止修改现有测试的限制。历史RESULT及Full #4 FAIL/具体根因UNKNOWN保留。唯一Master/return target：01a0db0e-c950-79e0-8e11-07155e0742f2；唯一Execution：01a11f35-5133-7ab0-9101-d9d01a69ccea。原工作树E:/CodexWorkspace/CodexWorktrees/lan2-lc01/public-source，分支codex/lan2-lc01-launcher-lifecycle；续行基线d07b0bf558f5463c81bff7fa6fe982f761fb06fe，冻结LAN-2仍5121d8195c1986c83dca9ad0f681463868084f04。

## 范围

只修第二Launcher测试：成功派发、明确INSTANCE_BUSY拒绝、启动失败、超时须区分。只有第二进程PID、窗口身份及完整预期错误均精确匹配时，才能受控关闭其INSTANCE_BUSY模态弹窗；随后等待进程自行退出。禁止点击未知窗口、将任意非零退出当拒绝或强杀冒充PASS。第一Launcher、private Node、独占锁及没有第二后台须同时验收。

可修改beta4-upgrade第二Launcher测试生成器、其针对性合成测试及新增research-only Go测试overlay/辅助文件；任务治理/固定证据独立存放。禁止修改任何生产Launcher、Setup、身份、事务、rollback、schema、历史证据或冻结分支。零普通sub-agent/后代Thread。

## 顺序及预算

1. 原Execution先实现测试修复与本地反例，包括窗口未准备、派发超时、弹窗未出现/不匹配、其他PID、异常退出、启动失败、强杀不可PASS、第一进程/Node/锁/第二后台断言失效等；fail0skip0、syntax、diff-check及Go overlay离线编译。
2. local commit并主动回单Master，附唯一实机计划/源码/资源/清理和精确受测EXE来源。此时不得启动生产或研究EXE，不消耗实机额度。
3. Master独立Review通过后，在同一原Execution发出明确阶段授权；仅一次真实Win10隔离合成instance专项，0/1。不借用业务instance，不安装/升级、不改网络/防火墙/注册表，不下载或安装工具链；先证明测试资源安全、来源及隔离。所有自建进程/句柄有界收尾；失败后为安全清理终止自己的进程须标注CLEANUP，不能把该终止当成功退出。
4. 记录固定安全结果和退出类别，不记录真实路径、业务正文、网络身份或凭据；不把本机结果追认为历史Hosted根因。完成即停止。

GitHub Actions/Hosted=0，Full=0，QA=0，无Full #5。修复仅留独立任务local commit，Execution不push；不恢复LAN-2、不发布、不清理任何旧worktree。

## PASS与交付

PASS须同时证明具体第二实例路径被识别，成功派发或明确拒绝正确验证，模态关闭只发生在精确身份匹配时，第二进程自行退出，第一Launcher/Node继续运行，锁未抢占，无第二后台。任何未证明条件不得记PASS。

最终只回单：修改文件/local commit、本地测试、唯一实测结果、第二实例实际退出路径、历史根因是否定位、风险、下一步最小建议。方案变化涉及产品/安全立即停；普通测试工程问题在本范围自主返工。当前唯一真实额度未用，必须先Master Review才能运行。
