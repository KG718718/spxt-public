# B45-QA Early Security Review

## 结论

**EARLY QA FAIL（baseline `582569083fe9773ddd11115ba9ba698f7f2c8d29`）**。T1/T2/T4 的定向测试可运行通过，但独立反例确认两个 P2：Node LAN 配置接受重复 JSON key，而提权 helper 拒绝同一配置；Firewall helper 对既有精确启用规则验证 ActiveStore 时的异常路径未禁用自有规则。两项均已主动送达唯一 Master；本结论不是 Batch 4.5 整体 QA，也不覆盖尚未完成的 T3/T5、真实 Win10 LAN/UAC/Firewall 或第二设备。

## 已确认 finding

### P2 — Node 与提权 helper 对重复 LAN 配置 key 的接受规则不一致

- 位置：`public-lan-config.js:60-66`；对照 `tools/windows-firewall/policy.go:257-319`。
- 触发：`lan-deployment.json` 包含 `"port":8080,"port":8099`，其余 schema/GUID 合法。
- 实际结果：Node 的 `JSON.parse` 静默采用最后一个 `port` 并启动普通层；helper 的 `strictConfig` 因重复 key 拒绝。
- 影响：损坏/歧义配置未按规格 fail closed，普通进程和提权边界对相同字节得出不同结论，造成 LAN listener 状态与 Firewall 授权永久不一致。未发现借此绕过 helper、放宽 Firewall 或提权的证据。
- 最小证据：`.test-work/b45-qa/repro.cjs` 输出 `DUPLICATE_CONFIG_ACCEPTED ... "port":8099`。
- 要求：Node 侧在产生对象前拒绝重复 key/尾随 JSON，并证明原配置字节不被覆盖；与 helper 严格语义一致。

返工状态：T1 R2 `ff1f6fdaa947c69d1b844ceb912640f51f5b0c30` 已只读审查，递归重复 decoded key、未知字段、尾随 JSON 和 4096-byte/depth 限制本身闭合。但进一步双端 corpus 发现完整解析一致性尚未闭合：`port:8080.0`、`port:8.08e3`、`schema:1e0` 为 Node ACCEPT / Go REJECT；`Schema`、`PORT` 为 Node REJECT / Go ACCEPT。前三项仍会造成普通 listener 层接受而 helper 拒绝；Master 已派 T1 R3 固定 canonical integer 词法，并要求 T4 精确 canonical key。当前基线仍 FAIL，待整合后复验。

### P2 — 既有精确启用规则的 ActiveStore 查询异常未 fail closed

- 位置：`tools/windows-firewall/firewall_windows.go:88-115`。
- 触发：`enable`、PersistentStore 中已有 owned/exact/Enabled 规则；`Test-ActiveEffective` 内 `Get-NetFirewallProfile` 或 ActiveStore rule query 抛异常。
- 实际结果：异常发生在 `$managedRuleMutationStarted=$true` 之前；catch 不调用 `Set-NetFirewallRule -Enabled False`，返回 exit 25，但既有规则仍为 Enabled。
- 影响：helper 对调用者报告授权失败时，自有入站规则仍可能有效，违反本任务固定的 enable 异常关闭自有规则语义。规则范围本身仍为 Private/精确 subnet/port/program/interface；未发现 Public/Any 或未知规则被修改。
- 最小证据：`.test-work/b45-qa/repro-t4.cjs` 执行未改写生产 `firewallScript` 和仓库隔离 cmdlet harness，输出 `status:25`、`FIREWALL_OPERATION_FAILED`、`events:""`，即没有禁用事件。
- 要求：`enable` 确认规则 owned 后、进入 ActiveStore 验证前建立异常清理责任；异常必须尝试禁用并补两个 ActiveStore 查询 throw 反例。`status` 保持只读，unknown rule 保持不写。

返工状态：T4 R2 `ba399b88419765605e04cba3f336fae164f8b0fe` 已只读审查；两行生产顺序调整在确认 owned/CIM object 后为 `enable` 预先建立 cleanup 责任，并新增 Profile/ActiveStore query throw 两项隔离反例。该提交尚未进入本 QA baseline；Master 整合后仍须由本 QA 以精确新 baseline 重跑，不提前写闭合 PASS。

## 已撤回线索

曾用孤立 API 复现 `controller.healthFailed()` 不直接关闭 listener。继续核对生产调用链后，**撤回其 P1/P2 finding**：生产只有 `server.js` monitor catch 调用该方法；discovery timeout 会先转成 `selected:null` 再 reconcile，而 reconcile 在首个可能 reject 的 await 之前已同步撤销 `selected/lanListening`，因此未证明生产可达状态会继续放行远端请求。该导出方法可做防御性收紧，但当前不能据孤立调用判定生产漏洞或阻断 QA。

## 独立执行证据

- `node .test-work/b45-qa/repro.cjs`：确认重复 key 接受；其中 healthFailed 孤立输出仅保留为被撤回线索证据，不作生产缺陷结论。
- `node .test-work/b45-qa/repro-t4.cjs`：确认既有精确启用规则的 ActiveStore 查询异常无禁用事件；仅隔离 mock，不触碰真实 Firewall/NIC。
- `node .test-work/b45-qa/corpus.cjs` 与指定 Go 1.27.1 `go run .test-work/b45-qa/corpus.go`：确认 canonical 双方接受，以及三项数字词法、两项字段大小写的双向解析分歧。
- `node --test tools/tests/lan-host/config.test.cjs tools/tests/lan-host/network.test.cjs tools/tests/lan-host/server.test.cjs tools/tests/lan-host/server-runtime.test.cjs tools/tests/lan-host/server-startup.test.cjs`：28/28 PASS。运行时依赖只读复用原工作树 `node_modules`；本机 Node `24.14.0`，不冒充目标 `24.21.0`。
- Go 1.27.1（派单指定只读工具链），独立 `GOCACHE/GOTMPDIR/TEMP`：`go test ./...` PASS（约 8.7 秒）。未执行真实 UAC、注册表、NIC 或 Firewall。
- 首次 Node 定向运行因本工作树无 `node_modules` 导致 runtime 两项 `Cannot find module 'multer'`；切换只读依赖目录后一次冷启动在测试固定 2.5 秒等待窗内未出端口，单项复跑及整组复跑均 PASS。该过程不作为生产 PASS 或上述 finding 的证据。

## 审查范围与未覆盖项

- 已读：当前 AGENTS/PROJECT、Batch 4.5 SPEC/PLAN/COMPATIBILITY-APPROVAL/ACCEPTANCE，T1/T2/T4 生产 diff、测试和结果记录。
- 已审：RFC1918/adapter/profile/route、多 NIC 不猜、持久端口不换号、config 原子/链接保护、双 listener entry guard、Host-only bootstrap、selected subnet、network reconcile/accepted socket、只读本机 status、helper 固定 CLI/安装与 registration/INI/config 信任、Private/精确规则、unknown/status/ActiveStore/GPO/异常清理。
- 未覆盖：T3 Launcher 最终接线及 helper hash、T5 beta.3 integration、目标 Node 24.21、真实 Win10 UAC/Firewall/Private NIC、真实第二设备/双浏览器、Hosted/Full/QA budget、Artifact privacy、完整 26/742。上述均不得写 PASS。

## 后续

原 T1/T4 最小返工后在同一 QA thread 独立复验；正式 LAN Candidate 出现后更新 baseline 并执行完整 B45-QA。本报告不授权 Hosted、main、tag 或 Release。
