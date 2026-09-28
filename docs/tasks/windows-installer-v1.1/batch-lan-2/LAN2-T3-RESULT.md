# LAN2-T3 执行回单（2026-09-28）

> 当前追加状态：`RETURNED — VOLATILE LOCK INVENTORY CORRECTION LOCAL PASS; MASTER REVIEW PENDING`。Full #3 `36383900353` 在 `OFFLINE_LIFECYCLE` 的持久清单读取 `.launcher.lock` 时失败；本轮按 Master 有界授权只改 beta.4 测试 harness 与回单，未运行新的 Hosted/QA。下方较早状态均为历史。

## 状态

`RETURNED — LOCAL SYNTHETIC PASS; PARENT INTEGRATION AND HOSTED PENDING`。本回单仅覆盖独立工作树中的 beta.4 信任、事务、Setup、CI 静态与合成验证；未运行 Hosted/Actions、真实 Setup、真实升级或用户 LAN 验收，不能记 Batch LAN-2 自动验收 PASS。

## 基线与范围

- 基线：`43914744c0b74031fb2d20c849c7500408e0a85a`；任务分支：`codex/lan2-t3-beta4-upgrade`。
- 仅新增 `tools/windows-installer/beta4-upgrade/**`、`tools/tests/windows-installer/beta4-upgrade/**`、`.github/workflows/lan2-beta4-v1.1.yml` 和本 RESULT。来源为主控 checkout 的未提交草稿，经本任务独立检查和修正；原草稿本身不作为验收。
- 受信任 F3 beta.2 固定来源：source `c8886e6b6d413c2fd73d6716621d07a80b337e58`、Run `36246132535`、Artifact `10907910968`。runtime 信任依赖仓库中固定的五项身份锚，不在线查询 Artifact。workflow 在 Hosted 实际升级验收时下载并校验受验 Setup 的 archive 大小、SHA256、Setup 大小、SHA256；历史 Artifact 不保证永久可下载，因此这是后续 Full/QA 的可用性风险，不是运行时信任前提。

## 已确认的本地结果

- `node --test --test-concurrency=1` 执行兼容与事务两个套件：45 tests、45 pass、0 fail、0 skipped。`compatibility-report.cjs` 输出 C01—C15 全部 PASS，且 fail/skipped 为 0。
- 10 个 beta.4 CJS 文件 `node --check` 全 PASS；beta.4 PowerShell 文件用 PowerShell Parser 检查通过；暂存 diff-check 见提交核对。
- 固定策略仅允许 F3 beta.2→beta.4；合成覆盖未知 beta.2、beta.1、beta.3、beta.4 same-version、降级拒绝。事务测试覆盖旧状态精确锚、故障回滚、metadata、快捷方式，以及 instance、账号、附件、schema 2 `lan-deployment.json` 中 interfaceName/port 保持。
- workflow 静态核对：仅 `full`/`qa`，仓库 `KG718718/spxt-public` 与分支 `codex/lan2-manual-host-v1.1` 固定，隔离 checkout 精确 SHA，最终 Artifact 隐私 allowlist，未增加诊断入口。beta.4 构建强制 Portable Node 44/44。

## 主控整合前必须核对

- 当前冻结基线中的 T2 `tools/windows-portable/ci-lan.ps1` 仍要求 37/37；主控 checkout 的 T2 未提交草稿已改为 44/44。T3 的本地测试允许前后两个接口阶段，beta.4 构建和 Artifact 核验始终只接受 44/44。主控须在整合 T2 后复测并确认最终为 44/44；不能把此任务的 45/45 当作 Portable 44/44。
- T1 Node 与 T2 Launcher/Firewall/Portable 的正式提交、Full（最多 2）及独立 QA（最多 1）均待主控调度；本任务未消费 Hosted 预算。
- 完整 workflow 仍依赖历史受验 beta.2 Setup 下载进行真实升级验证。若 Artifact 不可取得，不得换成未经精确取证的 fresh rebuild，也不能宣称升级验收完成；应交主控处理可信测试输入。

## 未改变的边界

未改 beta.2 或旧 beta.3 文件/证据，未改 Batch 4/4.5 文档、业务 schema、AppId、实例数据。未 push、合并、建 tag/Release，未执行真实网络探针或 Firewall UAC。

## 追加返工：集成名单反例（2026-09-28）

- 主控集成 HEAD `61c86522eacbe3688ad7ca09ca6eebd2ec825f3e` 的只读快照显示：T2 固定名单为 Launcher 精确 28 项、Firewall 精确 13 项；原 T3 测试只把固定名单与构建命令相比，未独立钉住新名单。现已在本任务测试中逐项硬编码新 28/13 名单，并分别与固定名单、Launcher 构建命令、Firewall Go 顶层测试集合做深度相等断言；不接受旧/新两套名单。
- 集成反例：T2 `tools/windows-launcher/build.ps1:22` 仍调用旧的 27 项 Launcher 名单，含已删除的 `TestUACRejectionDoesNotStopLocalChildOrRetry`，缺少 `TestFirewallInterfaceNameArgumentIsQuoted`、`TestEnableRejectionRestoresDisabledPreferenceAndLocalChild`。本任务不修改该 T2 文件。
- 在 `61c8652` 的 Git archive 只读源码快照中覆盖本任务修正后的 T3 测试运行完整 compatibility+transaction：45 tests、44 pass、1 fail、0 skipped；唯一失败正是上述精确名单断言。C01—C15 报告据 fail-closed 规则为 FAIL（全部检查标 FAIL），不得称 45/45 或 C01—C15 PASS。该测试快照不是 Git worktree，未修改集成 checkout。
- 已将 T2 接口问题主动报送唯一 Master。待 T2/主控修正 `build.ps1` 后须在新集成 SHA 上重跑 45/45 与 C01—C15；旧基线的 45/45 结果不能代替此次集成验证。

## 第二次返工：双锚提取反例（2026-09-28）

- 主控已将 T2 构建名单修复整合为 `4cc6044`，T3 精确名单断言整合为 `2bd885a`/`56aed68`。`56aed68` 的 Launcher 构建命令采用 `-run '^Test(...)$'`；原 T3 提取正则只接受缺少 `^` 的旧文本，因此 `assert.ok(group)` 失败。此为 T3 静态测试缺陷，不是 T2 名单再次不一致。
- 仅在 T3 `compatibility.test.cjs` 将提取正则改为同时精确要求 `^` 与 `$`；加入缺起始锚、缺结束锚各一条反例，均要求无法匹配。原 Launcher 28 项、Firewall 13 项逐项深度相等断言保留。
- 从集成 `56aed68d08d8bd635f8b381d313a2f40889b9563` 创建无 `.git` 的只读源码快照，仅覆盖本任务修正后的 T3 测试文件，运行完整 `compatibility-report.cjs`：45 tests、45 pass、0 fail、0 skipped，C01—C15 报告 `PASS`。未运行 Hosted/Actions；本地源码快照测试不替代 Master 在新集成 SHA 的独立复验。

## 已登记 workflow 手动入口返工（2026-09-28）

- 远端预检由 Master 确认：新建的 `lan2-beta4-v1.1.yml` 尚未登记在 GitHub workflow 列表，无法直接以 `gh workflow run` 调度。本轮授权在已登记的 `.github/workflows/setup-v3.yml` 最小增加 `lan2-full`/`lan2-qa` 两个手动 mode 与独立 caller job；仅在仓库 `KG718718/spxt-public`、分支 `codex/lan2-manual-host-v1.1`、`workflow_dispatch`、对应 mode 下调用 `./.github/workflows/lan2-beta4-v1.1.yml`，分别映射为 `full`/`qa`。原 Batch 4/4.5 modes/jobs 条件及调用语义未改。
- T3 静态测试精确断言 caller job 全部文本、两个 option 恰各一次、callee `workflow_call` 输入与 candidate 的仓库/分支/mode 限制。PyYAML `BaseLoader` 对 caller/callee 两份 YAML 解析通过；T3 CJS 语法通过。
- 在集成 `56aed68d08d8bd635f8b381d313a2f40889b9563` 的无 `.git` 源码快照中仅覆盖本轮 caller 与 T3 测试文件，完整 `compatibility-report.cjs` 为 45 tests、45 pass、0 fail、0 skipped，C01—C15 报告 `PASS`。这是本地静态/合成验证；Master Review、整合、push 后才可按预算调度 Full 0/2，本任务未运行 Hosted。

## Full #1 frozen regression 静态边界返工（2026-09-28）

- Full #1 Run `36379556816` / source `9ba5a337cc7c6d24a39d8ac21cec49280af8b7b4` / 失败 Artifact `10951969499`：固定阶段 `FROZEN_REGRESSION FAIL`；LAN Node 44/44 与 F3 Setup 下载精确校验已通过，实际 Setup/26 suites/742 checks/最终 Artifact 未到达。预算 Full 1/2、QA 0/1。
- 在原任务工作树本地复现：历史 `upgrade-lifecycle/contract.test.cjs` 的 sequence 静态测试用从 `sequence:` 到 `historical-identity:` 的长切片，将中间后续 job 中的 `hosted-gate.cjs` 误算为 sequence 内容而失败。这不能证明 beta.1→beta.2 历史行为改变。
- 只在该测试文件新增按 YAML `jobs:` 下两空格顶层 job header 截取单一 job 的辅助函数，并让 sequence 检查使用它；后续无关 job 含 `hosted-gate.cjs` 时不污染，sequence 自身含该字符串时必须被拒绝。未删除/跳过原检查，历史接受语义不变。
- 在 `9ba5a337` 的无 `.git` 源码快照仅覆盖此测试文件后，原六个 frozen regression 文件：112 tests、110 pass、0 fail、2 skipped。两个 skip 分别为本机无可用 8.3 alias、无创建文件符号链接权限；不能记 fail0skip0。beta.4 compatibility+transaction：45/45、0 fail、0 skipped，C01—C15 报告 PASS。本地环境不足以证明 frozen skip0，须由 Master 在具备条件的环境独立复验；不得无修改重试 Full。

## Full #2 `.launcher.lock` 持有进程归因止点（2026-09-28）

- Master 固定 Full #2 Run `36380488652` / Artifact `10952926928` 为 `OFFLINE_LIFECYCLE FAIL`；实际 Setup 及部分 U 项已到达，`TestUpgradeLifecycle` 对 synthetic instance 的 `.launcher.lock` 读取发生 sharing violation。固定证据只提供阶段、固定检查和失败结论；没有失效瞬间的句柄所有者与 Launcher、Node 子进程、Setup 控制进程三者的完整退出状态。不能由报错文件名或最后已记录 U 项唯一推断持有人。
- 受控 synthetic fixture 只使用临时 `.launcher.lock`，由本任务启动的 PowerShell 子进程以 `FileShare.None` 独占打开。8 项本地测试全部 PASS、fail0、skip0：确认受控持有进程、stop 请求未完成时仍不可读、graceful/abnormal 退出后释放、持锁超时 fail-closed、cleanup 后完整读回、重复启停无残留，以及另一个控制进程退出时锁仍可由存活进程持有。fixture 不接触真实业务路径/数据，不记录 PID 或路径正文。
- 观察边界：该 fixture 证明“控制进程退出”与“锁已释放”不能等同，且可验证受控持有者的正常/异常释放；它**不**确定 Full #2 当时锁由 Launcher、Node 子进程、Setup 控制进程还是其他进程持有。已撤回未证实的 beta.4 harness 等待逻辑，未改生产、manifest/inventory、事务、身份或 rollback；未排除 `.launcher.lock`，未忽略 sharing violation、固定 sleep 或捕获后继续。
- 结论：`UNRESOLVED — ACTUAL LOCK HOLDER NOT PROVEN`。依本轮 Master 补充门槛停止实现并回单。下一步须先取得安全且固定的进程/句柄归属及退出顺序证据，再决定最小生命周期修复；不能把有界等待当成唯一根因证明或据本轮派 Full #3。

## 后续有界授权：beta.4 锁释放测试门禁（2026-09-28）

- Master 更正门槛：历史 Full #2 日志没有失败瞬间句柄归属，不能回补唯一持有人；允许基于受控 fixture 增加**仅 beta.4 `TestUpgradeLifecycle` harness** 的条件式锁释放门禁。对 Full #2 根因仍不作唯一归因。
- 源码路径核对：Launcher `main_windows.go` 以 share mode 0 `CreateFile` 打开 `.launcher.lock`，在 `controller.cleanup` 中 `CloseHandle`，且进程退出有 defer cleanup；Setup `setup-beta4.iss` 的 `AcquireExistingInstanceLock` 也以 share mode 0 打开现有锁对象，由 `ReleaseLocks` 关闭。Node 子进程的本仓库生产源码未见直接打开该锁的路径。上述只界定受控代码中的可能持有者，不能排除失败现场其他进程，也不能确定 Full #2 的实际持有者。
- harness 三处停机均维持现有 Node/Launcher PID 退出检查，随后要求 `app.Wait()` 正常完成，再对**现有** `.launcher.lock` 使用 `OPEN_EXISTING`、share mode 0 作条件式独占探测。仅 sharing/lock violation（Windows 32/33）进入现有有界 `until` 轮询；其他错误、句柄关闭失败、超时均 fail closed。探测通过后才按原逻辑完整 `walkHash`/inventory/readback，不从清单排除锁文件，不修改数据、身份、事务、rollback 或产品运行代码。
- 本地受控 fixture 现为 10/10、fail0skip0，覆盖持锁者、控制进程提前退出、graceful/abnormal 退出、sharing timeout、缺少锁对象时非 sharing 错误立即拒绝、cleanup 后完整读回、重复运行无残留，以及生成 Go 文件三处停止顺序、独占探测与非 sharing fail-closed 的静态反例。将 fixture 纳入 beta.4 compatibility report 后，在 Full #2 受测源码 `f15170389a915dcf245c8ae721ef46d0d9201c38` 的无 `.git` 快照覆盖本任务文件：55 tests、55 pass、0 fail、0 skipped，C01—C15 报告 PASS；真实 harness 生成成功，目标文件含三处调用和一个探测函数。
- 本机无项目 pin 的 Go 工具链，未编译生成的 Go 测试，也未运行真实 Setup/Full #3/Final QA。Master 必须先 Review/整合，并在工具链/Hosted 受控门禁中复验；这些本地结果不把 Full #2 历史 FAIL 改称 PASS。

## Full #3 后续返工：volatile Launcher lock 清单语义（2026-09-28）

- Master 固定 Full #3 Run `36383900353` / source `e84e494` 为 `OFFLINE_LIFECYCLE FAIL`：U05/U06 已到达，完整 instance inventory 读取根目录 `.launcher.lock` 时遇 sharing violation。此证据不唯一确定当时持锁进程。Full #4 仅可在 Master Review 后另行调度；本任务未消费 Hosted/QA。
- 生成的 beta.4 `TestUpgradeLifecycle` 只把**根目录** `.launcher.lock` 当作 volatile runtime control file，从 persistent inventory 中排除。嵌套同名文件、未知普通文件、`data.json`、附件、`lan-deployment.json`、日志及临时文件均继续读取并哈希；未知文件读取失败、非普通文件和 lock 探测异常均 fail closed。未修改生产 Launcher、Setup、身份、schema、事务或 rollback。
- 所有 persistent inventory 调用先检查已记录的受控 Launcher 和私有 Node PID 均已退出，再独占打开并关闭根锁。三处明确停机继续 `app.Wait()` 加有界独占探测。U05 same-version 与 U06 downgrade **每次拒绝后**分别执行持久清单比对，因此各自再次经过进程退出与 lock exclusive 门禁；运行期不调用该停机门禁。
- 运行期新增真实第二 Launcher 调用的测试 overlay：有界等待其退出，确认原 Launcher/Node 仍在、根锁仍被占用、READY 事件数未增加。生产 Launcher 对第二次调用可返回 busy 或成功 dispatch，两种退出形式都不视作取得第二把锁。该真实路径仍待 Hosted 运行确认，本地 LCK03 仅静态核对生成逻辑与受控持锁 fixture。
- LCK01—LCK14 编号按正式清单逐项映射，另有嵌套锁名、日志、临时文件等 `EXTRA` 反例。本地受控 lock suite `27/27 PASS`、fail0skip0。在 Master 集成基线 `2a63c6aad4980df29f78f624fc740df68d7b8764` 的无 `.git` 源码快照覆盖本任务三份修改文件，`prepare-hosted-harness.cjs` 成功生成 Go overlay；compatibility report `72/72 PASS`、fail0skip0、C01—C15 与 LCK01—LCK14 均 PASS。快照内生成文件含 U05/U06 各自清单检查、运行期第二 Launcher 检查及唯一根锁排除函数。
- 本机没有可调用的 Go 工具链，生成的 Go overlay 尚未本地编译，真实第二 Launcher、Setup、rollback/uninstall/reinstall 行为未在本轮实机复测。Master Review 应先编译生成文件，再决定是否按现有预算运行 Full #4；这些本地 PASS 不能改写 Full #3 FAIL。

### Master Review 后最小修正

Master 发现 U05/U06 的 `owned() || persistentInventory()` 比较存在 Go 短路：若 owned 已改变，后面的 quiescence 门禁不会运行。现两次 `runSetup` 各自返回后，先独立求值 `persistentInventory()`，完成受控进程退出和根锁独占探测，再比较 owned 与持久清单。LCK04/LCK05 精确断言此顺序，并排斥把门禁放在 `||` 右侧的形式。其余范围不变；仍待 Master 独立 Review、Go 编译和真实 Hosted 验证。
