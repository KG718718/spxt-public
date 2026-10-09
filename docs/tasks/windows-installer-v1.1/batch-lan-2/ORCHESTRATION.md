# Batch LAN-2 Orchestration

## 2026-10-09 — Master Review 已闭合，等待 GitHub 认证

| 原任务 | Execution local | Master 集成 | 当前 |
| --- | --- | --- | --- |
| LC01 原修复 | f52f9ca | b76ef4e | REVIEWED |
| LC01 统一30秒/专项/CRLF | 7190535 / b226d98 / f879eac | 3b14c70 / d28e8cd / ef51b16 | REVIEWED，原线程冻结 |
| LAN2-T3 会话/CI/源码身份 | b024c31 / 5627bc8 | fdc830f / f1e0415 | REVIEWED，原线程冻结 |

受审代码HEAD `ef51b16a3c293da624cada8a3e2268b0a2a34c64`，生产零diff。两处LC01治理追加冲突仅保留主线原历史并追加本次Hosted回单，没有带入本地解包工具/资源历史代码。主控相关复验与精确新预算见 `GITHUB-FIRST-MASTER-REVIEW-20261009.md`。Git/gh失效、连接器403；远端/跟踪 `5121d819`，未push/触发，三新预算0/1。等待认证后先推已审代码/治理，再单独写专项trigger并reserve唯一运行；Candidate/QA trigger保持未启用且不得与专项同commit。历史失败均不改写。

## 2026-10-09 — GitHub 优先验收有限授权

用户批准先专项、后 Full、最后独立 QA，各最多 1 次，当前均 0/1；失败不得自动追加或挪 QA 调试。唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`、唯一集成 `codex/lan2-manual-host-v1.1`。历史冻结 HEAD `5121d8195c1986c83dca9ad0f681463868084f04` 和 Full #1—#4 FAIL 保留。LC01 `f52f9ca` 仅测试修复整合 `b76ef4e`，相关77/77 fail0skip0、生产安全契约未改。

原 LC01 Thread `01a11f35-5133-7ab0-9101-d9d01a69ccea` 在原隔离工作树准备独立 Launcher 专项 workflow/harness；禁止本地 F3 解包、安装、VM/沙盒、真实业务或网络操作，Execution 不 push、不触发 Actions。Master Review 后才单次运行。原 LAN2-T3 Thread `01a0e644-b6de-74a1-8fc7-ce454eadce57` 当前仅只读核对 Full 客户流程覆盖，原530d工作树保留；未授权恢复生产开发。独立 QA 在专项和 Full 全部通过后安排，不能用于调试。详细预算和判定见 `GITHUB-FIRST-ACCEPTANCE-20261009.md`。

## 2026-09-28 — 已授权 / 基线核对

唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；旧 Master 只读。集成 `codex/lan2-manual-host-v1.1` 已从 Batch 4.5 冻结 HEAD `43914744c0b74031fb2d20c849c7500408e0a85a` 建立；Batch 4.5 仍冻结，原 worktree/任务/证据不清理。当前阶段正在独立 Review 可复用的 T1—T5 代码及 beta.4 最小改造。Full 0/2、Final QA 0/1；不把过去 Batch 的 Hosted 次数混入本 Batch。

顺序：基线和接受矩阵→manual network/config→双监听/guard/Firewall/Launcher→beta.4 精确信任/事务/Setup→本地合成和 Win10 允许的受控验证→Master Review→Full 最多 2 次→独立 QA 最多 1 次→最终 Artifact 与交接。纯工程失败先本地定位修复；第二次 Full 或唯一 QA 仍无法闭合时止损。需要产品/安全新决定时停，不自行放宽门禁。

## 2026-09-28 — 编排更正与草稿隔离

用户重申 AGENTS.md 的 THREAD ORCHESTRATION：本 Batch 不授权普通 sub-agent，生产任务须由独立长期 Execution Thread / worktree 完成。更正前已有三项 child-agent 草稿，均已到安全停点；它们的完成状态不记作正式 RETURNED/REVIEWED，也不据此启动 Hosted。主控 checkout 中的未提交实现仅作只读草稿来源。主控已审查草稿边界并运行 Node LAN 44/44、beta.4 兼容事务 45/45、Firewall build-driver 5/5；当前 Win10 的 Node RFC1918 候选存在且同端口 loopback+候选 IP 临时 bind 成功。这些只是草稿预检，不是正式任务回单、Full 或最终验收。

| Task | 范围 | baseline | Thread / worktree / local branch | 状态 |
| --- | --- | --- | --- | --- |
| LAN2-T1 | Node 候选、配置、双监听、guard | `43914744c0b74031fb2d20c849c7500408e0a85a` | thread `01a0e643-b5ec-7d33-b9ec-1aafc7cd9d2b` / `E:/CodexWorkspace/CodexWorktrees/d568/public-source` / `codex/lan2-t1-manual-network` / local `10d1a61` / integrated `8577ea0` | INTEGRATED；Master 独立 44/44 PASS |
| LAN2-T2 | Launcher、Firewall、Portable 接线 | 同上 | thread `01a0e644-676d-7f83-b0c1-0eff19e06ff7` / `E:/CodexWorkspace/CodexWorktrees/3dd7/public-source` / `codex/lan2-t2-launcher-firewall` / local `bb4b68c` + `ff65f50` / integrated `f295df3` + `4cc6044` | INTEGRATED；Go 固定名单/Firewall build 独立复验 PASS |
| LAN2-T3 | beta.4 精确信任、事务、Setup、Full/QA workflow | 同上 | thread `01a0e644-b6de-74a1-8fc7-ce454eadce57` / `E:/CodexWorkspace/CodexWorktrees/530d/public-source` / `codex/lan2-t3-beta4-upgrade` / local `1dfce53` + `5c06da8` + `69590f7` + `0d40652` / integrated `61c8652` + `2bd885a` + `56aed68` + `002c122` | INTEGRATED；联合 45/45、C01—C15 PASS |

三个任务均以唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2` 为回单目标；Execution 不得 push 或创建下级任务。主控取得实际 thread ID/worktree/local branch 后更新本表；仅正式 RETURNED 或经核实 DELIVERY_RECOVERED，再独立 Review/整合。QA 在 Full PASS 后创建，预算仍 Full 0/2、QA 0/1。

三个正式 Execution 均主动回单且已由 Master 核对来源提交、文件范围、diff-check 与局部证据，按 T1→T2→T3 整合为 `8577ea0`→`f295df3`→`61c8652`。T1 主控独立复跑 Node 44/44；T3 主控独立复跑兼容事务 45/45 与 PS parse 2/2。T2 的 Go 固定名单/Firewall build driver 将在同源联合门禁复跑；目前尚未 Full、QA、Artifact，不能宣称 Batch PASS。

集成后 T3 兼容/事务联合门禁发现 T3 静态测试仍固定旧 Launcher 名单，未同步 T2 的实际 28 项名单；合成测试失败，已退原 T3 Thread 返工，不改产品接受条件。T3 在独立旧基线的 45/45 仅为历史局部结果，不能覆盖这次集成失败。Full 0/2、QA 0/1 不变。

T3 返工又发现 T2 `tools/windows-launcher/build.ps1` 的 `-run` 正则保留不存在的旧 UAC 测试，漏跑两个实际存在的安全测试。已派原 T2 仅修构建门禁与 beta.4 元数据，先整合 T2 再整合 T3 精确断言。主控在当前集成源码独立跑 Node 44/44、Launcher 固定 Go 28/28 + vet、Firewall build 13/13 + compile；beta.4 联合测试仍 FAIL，不得宣称 45/45 已闭合。

随后原 T2/T3 各自追加 local commit 与主动回单，Master Review 后整合；T3 又补双锚正则反例。当前 `002c122d4df0f713bd432ef46cc898d2fdc7834b` 同源联合门禁 Node 44/44、beta.4 兼容事务 45/45、C01—C15 PASS，Launcher 固定 Go 28/28 + vet、Firewall build 13/13 + compile。先前 44/45 FAIL 和原任务独立 45/45 均保留历史，最终以本次集成复测为准。受验 F3 Artifact 10907910968 当前通过 GitHub API 核验未过期、大小 32538249；这只证明当前可获取，不承诺永久保存。Full 0/2、QA 0/1，Setup/26/742/Artifact/QA 尚未运行。

## 2026-09-28 — Full #1 已派发

已登记 Setup workflow ID `362562346` 的 LAN-2 caller 经原 T3 返工、Master Review 整合为 `9ba5a337cc7c6d24a39d8ac21cec49280af8b7b4`，并核对本地 HEAD、origin 跟踪和 GitHub 远端一致。仅在该公开开发分支 dispatch `mode=lan2-full`：Run `36379556816`，受测 SHA `9ba5a337cc7c6d24a39d8ac21cec49280af8b7b4`。当前结果 PENDING，Full 1/2、Final QA 0/1；不得把派发成功写为自动验收 PASS。若 Full #1 失败，依固定阶段证据→本地反例→原 Execution 返工→Master Review 后才可决定是否使用最后 Full #2，禁止无修改重试。

## 2026-09-28 — Full #1 固定失败与原 T3 返工

Full #1 Run `36379556816` 结果 FAIL，固定失败 Artifact `10951969499`。`beta4-ci-stage.json` 为 `FROZEN_REGRESSION` FAIL；`lan-node-test-environment.json` 证 Node LAN 44/44、fail0skip0 PASS，受验 F3 Setup 精确下载/校验步骤 PASS。Setup 构建、实际升级、26/742、Artifact 隐私均未到达；不能冒称通过。主控按 CI 原六文件在集成源码本地复现：111 项中仅历史 sequence 静态测试 1 FAIL。该测试把 `sequence:` 到更后方 `historical-identity:` 之间的多个无关 YAML job 误包含在 sequence 检查范围，读到后续 job 的 `hosted-gate.cjs` 后假报；未见生产/升级逻辑失败证据。原 LAN2-T3 已获准仅修此历史测试的顶层 job 边界、保持原安全断言，并加正反例。Full 1/2、QA 0/1；不得无修改重跑，也不得跳过旧回归测试。

## 2026-09-28 — 原 T3 正式回单与 Master Review

原长期 LAN2-T3 thread `01a0e644-b6de-74a1-8fc7-ce454eadce57` 在原 `530d` 工作树主动回单 local `e517c2266b89d68fcaa6cd98aad08786e4062baa`，仅改历史 `upgrade-lifecycle/contract.test.cjs` 和 T3 RESULT。Master 审查两文件 diff：按 `jobs:` 下两空格顶层 job header 精确截取 `sequence`，保留原 forbidden 断言；正反例分别验证后续 job 不污染、sequence 内违规仍拒绝。整合为 `502c81db0f0f35170b44618c973cb40b6740af6f`。主控独立六文件回归 112 tests/110 pass/0 fail/2 skip：本机缺 8.3 alias 与文件 symlink 权限，不能报告 skip0；beta.4 兼容事务 45/45、C01—C15 PASS。Full #1 Hosted 日志同样显示 8.3 alias 不可用，此项按历史环境能力缺口单列；核心 26/742 fail0skip0 要求不变。此修复改变了 Full #1 受测源码，满足禁止无修改 retry 条件；仅余 Full #2 1 次，必须在公开分支新 HEAD 三方一致后派发。Full #2 若 FAIL 则依预算止损，不启动 QA。

## 2026-09-28 — Full #2 固定失败与预算止损

Master 将原 T3 修复与治理记录非 force 推唯一开发分支，核验本地 HEAD、origin 跟踪及 GitHub 远端同为 `f15170389a915dcf245c8ae721ef46d0d9201c38` 后，通过已登记 workflow ID `362562346` 仅派发 `mode=lan2-full`。Run `36380488652` 结果 FAIL，失败 Artifact `10952926928`，固定 `beta4-ci-stage.json` 为 `OFFLINE_LIFECYCLE FAIL`。受验 F3 Setup 精确下载/校验、Node LAN 44/44、兼容事务 45/45、真实 beta.4 Setup 构建与安装、多个 beta.2→beta.4 实际升级检查通过；升级总报告 FAIL。日志指向 instance `.launcher.lock` 被其他进程占用时的读取失败，不能据此确认锁的唯一根因、也不能判定整个升级安全验收通过。固定 offline 报告显示 externalDuring=false、restored=true、firewallChanged=false；状态 FAIL 与流水线失败并存，不能误记网络隔离门禁 PASS。核心 26/742、最终 Artifact privacy、独立 QA 未到达；无最终 beta.4 Artifact。Full 2/2 已耗尽，QA 0/1 不挪用；依授权冻结 LAN2-T1/T2/T3 与原工作树，禁止追加工程/Hosted/QA，只完成治理收尾并返回网页版决定。详见 `LAN2-FULL2-STOP-20260928.md`。

## 2026-09-28 — 网页版批准有界锁生命周期续行

下方 Full #2 止损结论保留历史；用户现仅授权原 LAN2-T3 长期 Thread `01a0e644-b6de-74a1-8fc7-ce454eadce57` / 原 `530d` 工作树、本地任务分支定位 `.launcher.lock occupied`，不重开 T1/T2、不创建普通 sub-agent。Master 已向原 T3 派发完整返工卡：先构造本地锁占用反例，查受控持锁进程、shutdown/exit、锁释放、正常/异常 cleanup、inventory/readback 顺序；只允许确定性生命周期修复，禁止排除锁文件、忽略 sharing violation、固定 sleep 或放宽安全/数据保护。正常释放、占用 fail-closed、graceful/abnormal/timeout、cleanup 后读取与重复无残留均须 fail0skip0。T3 local commit/主动回单后由 Master 独立 Review；Review PASS 才可使用新增 Final Full #3 最多 1 次，无新增 diagnostic Hosted。原 Final QA 0/1 保留，只有 Full #3 PASS 才运行；Full #3 或 QA FAIL 即停交网页版，不申请 Full #4。最终仍须 LAN HUMAN PENDING，不进 main/tag/Release/Batch5/OCR。

原 T3 两次主动回单：local `ef66b5f` 的合成 fixture 证明单凭控制进程退出不能推断锁已释放；原历史 Full #2 日志缺句柄归属，实际持有者仍未知。Master 更正过严的历史唯一归因要求，按用户允许的“明确等待锁释放”继续；原 T3 local `b3e9c78` 仅对 beta.4 生成的升级测试加入三处 Node/Launcher 退出→现有锁可独占重开→完整 inventory/readback 门禁，32/33 共享冲突有界轮询、其他错误/超时/句柄关闭失败均 fail closed；未改生产/身份/事务/rollback。Master 独立 Review 五文件 diff、来源身份和安全边界，整合为 `6b688ca`、`b81bb3c`；同源兼容报告 55/55 fail0skip0、C01—C15 PASS。Master 从仓库 pin 下载 Go 1.27.1，SHA256 精确匹配 `toolchain.json`，实际生成 Go overlay 后用离线 `go test -overlay ... -run '^$'` 编译 PASS。无 Setup/真实升级新结果；Full #3 仍 0/1，QA 0/1。仅在公开分支新 HEAD 本地/跟踪/GitHub 三方一致后可派发 Full #3。

## 2026-09-28 — 唯一 Final Full #3 已派发

Master 将 Review 记录与测试专用修复非 force 推唯一开发分支，并核对本地 HEAD、origin 跟踪及 GitHub 远端同为 `e84e4948b202b7e084edfb05e6753c5e91fd07e6`。通过已登记 workflow ID `362562346` 仅派发 `mode=lan2-full`：Run `36383900353`，受测 SHA `e84e4948b202b7e084edfb05e6753c5e91fd07e6`。当前 PENDING，新增 Full #3 1/1，QA 0/1；不能把派发记作验收 PASS。若 Full #3 FAIL，立即停止，不申请 Full #4、不启动 QA；若 PASS，核验 Artifact/隐私后才进入唯一独立 QA。

## 2026-09-28 — Full #3 同阶段 FAIL，立即止损

Run `36383900353` 结论 FAIL，失败 Artifact `10953579335`；固定阶段 `OFFLINE_LIFECYCLE FAIL`，升级总报告 FAIL。日志在 U05/U06 PASS 后再次报告 synthetic instance `.launcher.lock` sharing violation，`TestUpgradeLifecycle` 失败；新增的三处停止后锁释放门禁未覆盖后续占用窗口，失败瞬间实际持锁者仍未证。安装局部报告 `AUTOMATED_PASS_HUMAN_PENDING`、Node LAN 44/44 等不能代替整个候选通过；offline 报告 externalDuring=false、restored=true、firewallChanged=false 但总状态 FAIL。26/742、最终 Artifact privacy、独立 QA 未到达，无 beta.4 最终 Artifact。依用户明确止损，Final Full #3 1/1 耗尽后立即冻结 T1/T2/T3 和原工作树，不申请 Full #4、不运行 QA 0/1、不派生产返工；仅治理收尾、非 force push 开发分支并返回网页版。历史 Full #1/#2 结果保留，见 `LAN2-FULL3-STOP-20260928.md`。

## 2026-09-28 — 网页版批准 volatile lock 最终有界修正

Full #3 止损与失败证据保持历史；用户新增批准原 LAN2-T3 长期 Thread `01a0e644-b6de-74a1-8fc7-ce454eadce57` / 原 `530d` 工作树仅修 beta.4 验收语义：`.launcher.lock` 精确从 persistent business inventory 排除，另以运行期占用、第二 Launcher 拒绝及 quiescent 独占打开/关闭门禁验证。U05/U06 各自拒绝后、任何业务 inventory 前重查 Launcher/私有 Node 退出与锁释放。其余 instance 普通文件、data.json、附件、lan-deployment.json 仍严格 hash；未知文件 sharing violation 必须失败。不改生产 Launcher、可信身份、事务、rollback、schema，不扩大排除路径或通用捕获异常。T3 已获正式返工卡；先 LCK01—LCK14 本地 fail0skip0、local commit/主动回单，Master 独立 Review PASS 后才可非 force 整合并使用唯一 Final Full #4 0/1；无新 diagnostic Hosted。Full #4 任意 FAIL 立即停止，不申请 Full #5；Full 完整 PASS 后才运行原 Final QA 0/1，QA FAIL 即停，PASS 才到 LAN HUMAN PENDING。禁止普通 sub-agent/main/tag/Release/Batch5/OCR。

原 T3 在原 Thread/工作树主动回单 local `197932d`，经 Master 指出 U05/U06 的 `||` 短路可绕开 quiescence 后追加 local `bfa84d3`；Master 独立 Review 两笔提交并整合为 `d135f64`/`003cdb3`。仅改变 beta.4 测试 overlay、反例和报告，生产 Launcher、Setup、identity、transaction、rollback、schema 未改。U05/U06 拒绝后先分别独立执行 persistent inventory（先查已受控 Launcher/Node PID，再独占 open/close 根锁），再比对 owned/instance；运行期第二个真实 Launcher 被测试为不得取得同一锁或产生第二个 READY。只排除根目录 `.launcher.lock`，其余普通文件包括未知文件严格读取/hash，未知 sharing violation 与探测失败 fail closed。Master 在整合分支复跑 lock suite 27/27、兼容报告 72/72、C01—C15 和 LCK01—LCK14 全 PASS、fail0skip0；生成真实 Go overlay 后用仓库固定 Go 1.27.1 离线 `go test -overlay ... -run '^$'` 编译 PASS。`git diff --check` PASS。无真实 Setup、Hosted 或 QA 新结果；Full #4 仍 0/1、QA 0/1，仅待非 force push 与本地/跟踪/GitHub 三方 SHA 一致才可派发。

## 2026-09-28 — 唯一 Final Full #4 失败并止损

Master 将本轮最小测试修正和治理 Review 非 force 推 `codex/lan2-manual-host-v1.1`，核对本地 HEAD、origin 跟踪及 GitHub 远端同为 `2e9294d9a61426dac428f7c8ff8a12d36a4bbbb8`；无重叠运行后通过已登记 workflow `362562346` 仅派发 `mode=lan2-full`，Run `36388264496`。GitHub conclusion failure，失败 Artifact `10955343405`。固定阶段 `OFFLINE_LIFECYCLE FAIL`，`ci-test-environment.json` 为 `PIPELINE_FAILED` 且 environmentRestored=true；`BETA4-UPGRADE-TEST-REPORT.json` FAIL，局部安装报告 `AUTOMATED_PASS_HUMAN_PENDING`。日志 U01 PASS 后在新运行期第二 Launcher 门禁报 `second Launcher did not exit`，`TestUpgradeLifecycle` FAIL；U05/U06 和后续持久数据比对未到达。不能据此判定第二 Launcher 实际取得锁或确定唯一原因。offline 报告总状态 FAIL，固定 externalDuring=false、restored=true、firewallChanged=false。核心 26/742、最终 Artifact privacy、独立 QA 均未到达，无 beta.4 最终 Artifact。Final Full #4 1/1 已用，QA 0/1 未用；按用户“Full #4 任意 FAIL 立即停止”规则冻结 LAN-2，不申请 Full #5、不派工程返工、不运行 QA。原任务 Thread/工作树和 Full #1—#4 证据保留；仅治理收尾并返回网页版，见 `LAN2-FULL4-STOP-20260928.md`。
