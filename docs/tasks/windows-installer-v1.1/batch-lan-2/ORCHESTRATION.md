# Batch LAN-2 Orchestration

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
