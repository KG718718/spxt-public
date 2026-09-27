# B45-T5-HOSTED-LAN-DIAGNOSTIC 结果

## 结论

**PASS（本地/合成工程门禁完成，待 Master 独立 Review；未运行 H1 或任何 Hosted）**。

`hosted-gate.cjs` 已从单一 `HOSTED_LAN_GATE` 改为固定 stage/reason、固定字段报告。实现不从异常正文推断绑定位置：双绑定 reservation 包装器按实际进入 loopback 或 LAN listener 创建阶段记录失败，controller 健康失败按生产 controller 的固定状态和布尔值分类。每个失败端口均先关闭 controller 后才尝试下一端口；关闭失败立即成为 `CONTROLLER_CLOSE/CLOSE_FAILED`，不能写 PASS。

## 身份与范围

- TASK：`B45-T5-HOSTED-LAN-DIAGNOSTIC`（原 B45-T5 有界续行）
- local baseline：`8e99b4d9895c05fe6454d3bb20b32378c7516685`
- 网页版批准/任务卡来源：`0fdab5c8b08fc963063ca1a76dc651802f0e7527`
- 实现 commit：`526f2150cdd97527915a89921719d629f6add37a`
- 分支：`codex/b45-t5-integration`
- 新预算：HOSTED_LAN H1/H2 `0/2`；新增 Full `0/1`；QA `0/2`

## 完成内容

1. 固定区分 `HOSTED_CONTEXT`、`OUTPUT_PRECHECK`、`PRODUCTION_DISCOVERY_REJECT`、`SYNTHETIC_DISCOVERY`、`RUNNER_ADDRESS_ENUMERATION`、`RUNNER_ADDRESS_CARDINALITY`、`SUBNET_DERIVATION`、`CONTROLLER_CREATE`、`LOOPBACK_BIND`、`LAN_BIND`、`PORT_SELECTION`、`LAN_HTTP_PROBE`、`CONTROLLER_HEALTH`、`CONTROLLER_CLOSE`、`REPORT_WRITE`、`INTERNAL` 与成功 `COMPLETE`。
2. 报告严格允许 18 个固定字段，仅含 schema/status/stage/reason/sourceCommit、固定布尔与计数；stage/reason 组合有逐阶段白名单。禁止额外字段，成功必须同时证明双监听、controller health、LAN HTTP probe、cleanup 完成、未改 Firewall、未声称真实 LAN。
3. runner private IPv4 候选先枚举并去重：0 个与多于 1 个分别固定失败；当前没有 Hosted 证据支持多地址选择，因此未预先加入确定性选择或放宽策略。
4. 8080—8099 逐端口真实 controller 路径；部分绑定失败完整 close 后继续。报告以临时文件写入并原子 rename，避免失败时上传半写 JSON。
5. `setup-v3.yml` 新增独立手动 `lan-hosted-diagnostic`，仅限 LAN 分支、`contents: read`、Node 24.21.0，只运行 Hosted gate，始终上传唯一 JSON，并在输出摘要前执行严格 verifier；不会调用 Full reusable workflow。
6. beta.3 最终 Artifact verifier 改为复用同一严格报告校验，否则新固定 schema 会使后续 Full 必然在旧 `deepEqual` 失败。未改候选构建、升级或生产逻辑。

## 14 项规定反例

| # | 门禁 | 本地结果 |
|---|---|---|
|1|生产发现拒绝虚拟 adapter|PASS；生产选择器对虚拟夹具返回无合法 LAN，若 Hosted 发现接受候选则固定 `PRODUCTION_DISCOVERY_REJECT`|
|2|合成物理 LAN 选择|PASS；严格物理/Private/route 夹具为单一 SELECTED|
|3|0 runner candidate|PASS；`RUNNER_ADDRESS_CARDINALITY/ZERO_RUNNER_CANDIDATES`|
|4|1 candidate|PASS；进入隔离双绑定路径|
|5|2+ candidate|PASS；`RUNNER_ADDRESS_CARDINALITY/MULTIPLE_RUNNER_CANDIDATES`，未猜测选择|
|6|无效 subnet|PASS；`SUBNET_DERIVATION/SUBNET_INVALID`|
|7|loopback bind 失败清理|PASS；固定 `LOOPBACK_BIND`，cleanup=true|
|8|LAN bind 失败清理|PASS；固定 `LAN_BIND`，local fallback 随 controller 完整关闭|
|9|health 失败清理|PASS；固定 `CONTROLLER_HEALTH/LAN_HEALTH_FAILED`，cleanup=true|
|10|HTTP probe 失败清理|PASS；固定 `LAN_HTTP_PROBE/HTTP_PROBE_FAILED`，cleanup=true|
|11|close 失败不得 PASS|PASS；`CONTROLLER_CLOSE/CLOSE_FAILED` 覆盖成功状态|
|12|仅全成功写 PASS|PASS；双绑定、health、HTTP、close 全部通过后才 `COMPLETE/PASS`|
|13|未知异常|PASS；只映射 `INTERNAL/INTERNAL`，不含原始异常|
|14|隐私|PASS；严格 key allowlist 拒绝额外 address、错误 sourceCommit 和伪成功；报告不含 IP、路径、网卡名、GUID 或错误正文|

另验证：首个 LAN bind 失败清理后第二端口成功；Hosted context/output precheck 分离；枚举、controller create、混合端口耗尽和 report write 均有固定阶段。

## 测试证据

- 专项：18 tests / 18 pass / fail 0 / skip 0。
- 原 LAN 37 项 + 专项 18 项：55/55，fail 0，skip 0。
- compatibility + transaction：45/45，fail 0，skip 0；C01—C15 未削弱。
- Node syntax：`hosted-gate.cjs`、专项测试、beta.3 Artifact verifier 全部 PASS。
- workflow：新增 3 个 PowerShell `run` block 均通过 PowerShell AST；专项静态测试验证手动入口、只读权限、唯一 JSON allowlist、严格 verifier 且不调用 Full。
- `git diff --check` PASS。
- 生产冻结：`public-lan-network.js`、`public-lan-server.js`、LAN config/Launcher、Firewall、Launcher、升级 transaction、beta.2 identity、业务源码与 package/lock 相对 baseline 零差异。
- 本地 Node 为 24.14.0；手动 H1 明确固定 Node 24.21.0。当前环境未安装第三方 YAML parser，未为此新增依赖；workflow 缩进由小范围 diff、静态断言及内嵌 PowerShell AST 覆盖，仍需 Master 独立 Review。

## 已确认事实、推测与风险

- 已确认：本地合成 14 项及附加阶段反例闭合；测试 harness 和报告隐私边界可验证；生产安全逻辑零修改。
- 未确认：Full2 的实际失败原因。runner 地址数量、bind、health、HTTP 或 cleanup 中哪一项在 GitHub Hosted 失败，必须由 H1 固定报告取证，不能从旧粗粒度日志倒推。
- 风险：GitHub Hosted 可能返回 0 或多个 private IPv4；当前会安全失败并给出基数阶段。只有 H1 证明确需多候选策略后，才可按批准边界做测试内确定性、实际可 bind 选择。
- 风险：本地 mock 不能替代 Windows Hosted 的真实双明确 listener；也不构成真实公司 LAN、第二设备或 Firewall PASS。

## 需要 Master 处理

1. 独立 Review `526f2150cdd97527915a89921719d629f6add37a`，重点核验 reservation 阶段观察、controller 回退/health/close、报告 schema/privacy、workflow YAML 和最终 Artifact verifier 联动。
2. Review 通过后由 Master 唯一整合、push，并按预算启动 H1；Execution 不自行 Hosted。
3. H1 PASS 则无需 H2，按批准流程进入新增 Full；H1 FAIL 须以唯一固定 stage/reason 先做本地反例和最小修复，不能无修改 retry。
