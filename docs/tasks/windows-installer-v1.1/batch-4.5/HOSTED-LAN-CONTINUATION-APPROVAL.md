# Batch 4.5 — Full2 HOSTED_LAN Stop-Loss Continuation

## 网页版决定

**批准方案 A：继续原线程、原安全边界不变的有界工程诊断。**

当前不是产品设计阻塞。

当前唯一问题是：

Full2 已推进至：

`HOSTED_LAN`

但现有 Hosted gate 只返回：

`HOSTED_LAN_GATE / PIPELINE_FAILED`

无法区分真实失败阶段。

因此批准：

- HOSTED_LAN 专项诊断：最多 2 次
- 通过后新增 Full：最多 1 次
- 原 QA Hosted：继续保留 2 次
- QA 不得挪作诊断
- 无修改不得 retry

---

# 1. 当前已确认事实

Full2：

Run:
`36294405341`

source:
`ac2b47de85aaac9545cf6f2a534603d7071ed5db`

失败阶段：

`HOSTED_LAN`

已经确认此前通过：

- Portable 自动门禁
- LAN Node 37/37
- fail 0
- skip 0
- compatibility 45/45
- candidate + fault builds完成

尚未进入：

- actual Setup lifecycle
- U22/U23
- Registry恢复
- NetSecurity
- production sessions
- 26/742
- final Artifact privacy
- final QA

---

# 2. 当前 Artifact 事实

Full2 failure Artifact中的测试环境证据：

CI environment：

- status = FAIL
- stage = HOSTED_LAN
- reason = PIPELINE_FAILED
- selectedRootClass = CANONICAL
- environmentRestored = true

LAN Node environment：

- status = PASS
- stage = COMPLETE
- tests = 37
- pass = 37
- fail = 0
- skipped = 0
- environmentRestored = true

所以不要重新调查之前已经闭合的TEMP/Firewall fixture问题。

当前范围只限：

HOSTED_LAN gate。

---

# 3. HOSTED_LAN必须拆成固定阶段

当前：

`tools/tests/lan-host/hosted-gate.cjs`

不得继续用单一：

`HOSTED_LAN_GATE`

覆盖所有异常。

必须形成固定、安全、不泄露环境信息的阶段码。

至少区分：

- HOSTED_CONTEXT
- OUTPUT_PRECHECK
- PRODUCTION_DISCOVERY_REJECT
- SYNTHETIC_DISCOVERY
- RUNNER_ADDRESS_ENUMERATION
- RUNNER_ADDRESS_CARDINALITY
- SUBNET_DERIVATION
- CONTROLLER_CREATE
- LOOPBACK_BIND
- LAN_BIND
- PORT_SELECTION
- LAN_HTTP_PROBE
- CONTROLLER_HEALTH
- CONTROLLER_CLOSE
- REPORT_WRITE
- INTERNAL

具体名称允许工程调整，
但每个码必须只有一个明确含义。

---

# 4. 只允许固定安全结果

Hosted失败输出只能包括：

- schema
- status
- stage
- reason
- sourceCommit
- 固定布尔/计数类安全状态

禁止：

- 实际IP
- 实际网卡名
- GUID
- 本机路径
- runner路径
- route正文
- subnet正文
- raw exception
- stack
- stdout/stderr原文
- secret

不要通过hash/长度重新编码原始错误内容。

---

# 5. 必须重点验证 runner private IPv4 假设

当前 harness 存在：

`runnerOwnedPrivateAddress()`

并要求：

`candidates.length === 1`

这个条件必须作为独立诊断阶段验证。

不得预先认定它就是根因。

如果Hosted runner实际：

- 0个 private address
- 多于1个 private address

则报告固定：

`RUNNER_ADDRESS_CARDINALITY`

而不是笼统 INTERNAL。

---

# 6. 如果确认是Hosted harness地址数量假设

如果证据最终确认：

生产 discovery 正确拒绝Hosted虚拟网卡，

但测试 harness 因“runner必须恰好一个private IPv4”而不稳定，

允许修改：

**测试 harness 地址选择逻辑。**

可以从 runner-owned、实际可bind的候选中：

确定性选择一个测试地址，

用于：

双明确listener的隔离Hosted bind测试。

但必须满足：

1. 这只是Hosted测试地址；
2. 不进入production discovery；
3. 不把runner虚拟adapter当生产合法网卡；
4. 不修改LAN产品筛选规则；
5. 不放宽VPN/virtual/tunnel排除；
6. 不改成0.0.0.0；
7. 不把Hosted runner网络冒充真实企业LAN。

---

# 7. Dual-bind测试保持原安全语义

Hosted专项仍必须验证：

Local listener：

`127.0.0.1:<port>`

LAN test listener：

`selected test-owned private IPv4:<same port>`

不得为了让CI变绿改为：

`0.0.0.0`

也不得只测试单listener。

测试成功仍只能说明：

`HOSTED ISOLATED DUAL-BIND PASS`

不能称：

真实公司LAN PASS。

---

# 8. 端口测试

允许在8080—8099寻找Hosted测试可用端口。

每个候选必须真实bind。

如果：

loopback成功
LAN bind失败

必须：

完整close/cleanup

再尝试下一port。

不得留下：

半启动controller
后台listener
端口泄露

需要固定阶段证明cleanup执行。

---

# 9. 本地/合成反例先行

使用第1次新增Hosted前，

原T5必须先完成本地/合成测试：

1. production discovery拒绝虚拟adapter；
2. synthetic physical LAN选择通过；
3. 0 runner candidate固定分类；
4. 1 candidate通过；
5. 2+ candidate固定分类或确定性harness策略；
6. subnet无效固定失败；
7. loopback bind失败安全关闭；
8. LAN bind失败安全关闭；
9. health失败安全关闭；
10. HTTP probe失败安全关闭；
11. close失败不得写PASS；
12. 成功时才写最终PASS报告；
13. 未知异常映射INTERNAL；
14. 报告不泄露地址/路径/网卡身份。

Master Review后才能Hosted。

---

# 10. 新增HOSTED_LAN专项预算

新增：

## H1
最多 1 次

目标：

取得唯一固定stage/reason。

如果H1已经PASS：

无需H2，
直接进入新增Full。

如果H1失败且已唯一定位：

本地反例
→ 最小修复
→ Master Review
→ H2。

---

## H2
最多 1 次

这是HOSTED_LAN最后专项。

H2必须：

PASS

或者再次停止。

如果H2仍FAIL：

`BLOCKED — HOSTED_LAN DIAGNOSTIC BUDGET EXHAUSTED`

不得偷用Full或QA继续诊断。

返回网页版。

---

# 11. 新增Full预算

只有HOSTED_LAN专项PASS后，

批准：

**新增 Full 最多 1 次。**

这是本轮唯一新增Full。

该Full必须从正式入口验证后续真实链路。

---

# 12. Full成功后的流程

如果新增Full完整PASS：

进入最终独立B4.5-QA。

QA预算仍：

`0 / 2`

最多2次。

QA发现纯测试/报告问题：

按现有规则返原Execution。

如果QA发现产品行为问题且需要再次Full，
但本轮Full额度已用：

停止并交网页版。

---

# 13. 8.3 alias缺口单独处理

当前冻结旧回归：

110 PASS
0 FAIL
1 SKIP

SKIP原因：

Hosted环境没有可用真实8.3 alias。

不得：

- 将SKIP改PASS
- 删除用例
- 把“环境不支持”冒充功能通过

同时：

不要让这个8.3环境能力缺口混入HOSTED_LAN根因诊断。

先把HOSTED_LAN闭合。

在最终QA前必须形成独立证据结论：

A. 在受控Windows环境取得真实8.3 alias并执行原语义测试；

或

B. 如果当前GitHub Hosted客观无法提供真实8.3 alias，
提交网页版决定是否允许该额外历史反例以
`ENVIRONMENT NOT AVAILABLE`
单独记录，而最终核心26/742仍必须fail0/skip0。

未经网页版批准，
不得自行降低该要求。

---

# 14. 原核心回归要求保持

最终候选必须仍证明：

- 26/26 suites
- 742 checks
- fail 0
- skip 0

不得用上述额外111项的环境SKIP
掩盖核心742门禁。

---

# 15. 产品安全边界完全不变

本轮不得改变：

- production adapter discovery
- 不bind 0.0.0.0
- 不开放Public
- 不公网暴露
- 不UPnP
- selected subnet guard
- First Admin only loopback
- Firewall Private / LocalSubnet
- Firewall最小helper
- 精确F3 beta.2 trust
- beta.1不得直接beta.3
- appVersion1.0.0
- DC1
- Runtime identity schema
- 业务schema
- 业务权限模型

---

# 16. 自动继续授权

如果：

H1/H2闭合HOSTED_LAN
+
新增Full PASS

则Master自动继续：

B4.5-QA
→ Artifact review
→ privacy
→ final LAN candidate

直到：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

无需再次询问用户。

---

# 17. 再次返回网页版条件

仅当：

1. H1+H2耗尽仍FAIL；
2. 新增Full仍FAIL；
3. QA要求新Full但无预算；
4. 8.3真实证据无法取得，需要验收语义决定；
5. 必须放宽任何生产网络/身份/Firewall安全边界；
6. 出现产品/架构/schema/权限变化；
7. 无法安全恢复。

否则继续。

---

# 18. 最终停点

目标仍为：

- L01—L28自动适用项PASS
- C01—C15 PASS
- Runtime PASS
- Launcher PASS
- Portable PASS
- Setup PASS
- Firewall / Registry / binding PASS
- beta.2→beta.3 upgrade / rollback PASS
- 26/742 fail0 skip0
- Artifact privacy PASS
- 独立B4.5-QA PASS
- beta.3 LAN candidate Artifact

然后停止：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

不得进入：

Batch5
OCR
main
tag
Release