# LAN2-LC01-HOSTED 本地回单｜2026-10-09

状态：LOCAL RETURNED / MASTER REVIEW PENDING。GitHub Runner 尚未运行；专项、Full Candidate、Final QA 各 0/1，额度独立。历史 Full #4 FAIL 和 F3 本机提取失败均不改写。

## 范围

新增窄专项 workflow、独立 Go 测试包生成器、Runner-only PowerShell 接线及固定白名单报告。复用既有 beta2-identity 的 F3 Run 36246132535 / Artifact 10907910968 API、archive/Setup 校验、安装、五锚和 1042 文件 inventory、注册绑定、卸载与清理门禁。复用已审纯策略及 Windows adapter 原文。

共同 adapter 相对本轮基线只增加测试常量 `lcSecondBudget = 30 * time.Second`，替换五个内部 deadline 和一次 lcRun 参数；没有修改 ShowWindow 或其他 adapter 行为。30 秒覆盖受验 beta.2 源码约 10 秒查窗加 15 秒 dispatch 的可能路径；不据此认定历史超时根因。纯时钟反例覆盖约 25 秒自然成功、超过 30 秒失败与超时不确认窗口。生产 Launcher、Node、身份、事务、rollback、schema 均未改。

专项实际运行顺序为原 F3 安装身份核验、首 Launcher/私有 Node 固定句柄、第二 Launcher 自然返回或精确 busy modal 确认、锁/事件计数/保守父进程快照、首 Launcher 正常停止、Node 退出、锁独占打开并关闭、卸载清理。未知窗口不关闭，失败或强制 cleanup 不计 PASS。父进程快照不证明所有瞬时子进程；DISPATCH_SUCCESS 的 modalProof 为 NOT_EXERCISED，不能冒充 busy 窗口证明。

## 本地证据

- 联合 Node 61/61，fail0skip0；最后触发隔离和失败报告补丁仅复验专项 8/8，fail0skip0。
- 纯 Go 65 PASS（含子测试），fail0skip0。
- 固定 Go 1.27.1 离线专项 test -c PASS；共同模板的 Full 两文件 overlay test -c PASS。两个 EXE 均未运行。
- Runner、生成的 identity wrapper、workflow 内嵌 PowerShell 语法 PASS；YAML 2.8.1 结构解析 PASS，最终 marker 补丁再次解析 PASS。
- git diff --check PASS。输出与编译物仅在忽略的 .test-work 中。

Runner 失败时汇总报告不能升级为 PASS；上传前再次校验严格 keys、枚举、固定来源/hash/布尔。只上传 LC01-HOSTED-REPORT.json，未包含 PID、路径、窗口原文、stdout/stderr、环境或凭据。无可用校验器时只生成固定 FAIL。physicalWin10Certified 与 dualDeviceLanCertified 始终 false。

## 唯一触发边界

专项 push 精确分支 codex/lan2-manual-host-v1.1、唯一路径 docs/tasks/windows-installer-v1.1/lan2-lc01/HOSTED-TRIGGER.json、唯一 marker [lc01-hosted]、run_attempt=1，并排斥 [lan2-candidate] 与 [lan2-final-qa]。已知 lan2-final-acceptance.yml 可同分支，但仅允许 batch-lan-2/LAN2-FINAL-TRIGGER.md 与 Candidate/QA marker；未知同分支 push 入口 fail closed。不得把两类 trigger 或 marker 放入同一提交。

Execution 未创建 trigger、未 push、未派 Hosted/Full/QA、未再提取或运行本机产品。由唯一 Master 独立 Review、整合、核实 Git 一致及认证后，创建独立 trigger 提交并触发唯一专项。专项 FAIL 即停；本回单不认证真实 Win10 或双设备 LAN。
