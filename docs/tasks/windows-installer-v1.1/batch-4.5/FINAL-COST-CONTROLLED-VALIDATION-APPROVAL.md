# Batch 4.5 — Final Cost-Controlled Validation Decision

## 网页版决定

不批准新的 HOSTED_LAN H3/H4 诊断预算。

H1/H2 历史FAIL保留：

- H1: PRODUCTION_DISCOVERY_INVALID
- H2: DISCOVERY_COMMAND_FAILED

这不能证明产品LAN设计失败。

当前失败发生在 GitHub Hosted Windows 的生产网络发现系统命令阶段，
尚未进入：

- runner address enumeration
- subnet
- dual bind
- health
- HTTP probe

继续利用 Hosted runner 调试真实Windows网卡发现的收益已经过低。

从现在改为：

# Controlled Windows Proof + Synthetic Hosted Gate + One Final Full

---

## 1. 不再增加Hosted Network Discovery诊断

禁止新增：

H3
H4
或任何等价Hosted网络发现专项。

现有：

新增Full 0/1

继续保留。

QA：

最多先使用1次。

第二次QA不预授权；
只有QA1发现明确、可本地复现且修复后的真实问题时再返回网页版决定。

---

## 2. 使用真实Win10开发机做Production Discovery Proof

允许唯一Master / 原T5在当前真实Windows 10开发机执行：

**只读网络发现验证。**

使用当前生产代码：

`public-lan-network.js`

不得使用修改后的宽松版本。

必须实际调用当前：

`runWindowsDiscovery()`
/
`discoverWindowsLan()`

验证Windows系统网络命令可以正常执行。

这是只读测试。

禁止：

- 修改Firewall
- 修改网卡
- 修改路由
- 修改DNS
- 修改网络Profile
- 修改Registry
- 创建永久listener
- 修改系统设置

---

## 3. 本地证据必须隐私安全

生成固定JSON，只允许类似：

{
  "schema": 1,
  "status": "PASS",
  "platform": "WINDOWS_10",
  "systemRuntime": true,
  "discoveryCommand": true,
  "resultShapeValid": true,
  "privateCandidatePresent": true,
  "productionSecurityRulesUnchanged": true
}

不得保存：

- IP地址
- 网卡名称
- GUID
- MAC
- hostname
- 用户路径
- gateway
- DNS
- route正文
- stdout
- stderr
- registry正文

不得对这些敏感字段做hash后保存。

---

## 4. 本地Production Discovery验收

至少证明：

P01 系统PowerShell安全路径验证PASS  
P02 discovery命令成功执行  
P03 JSON解析PASS  
P04 返回结构符合生产schema  
P05 virtual/VPN/tunnel规则仍有效  
P06 private IPv4判断仍有效  
P07 没有0.0.0.0行为  
P08 未修改Windows网络配置  

如果真实Win10也得到：

NETWORK_DISCOVERY_FAILED

则停止。

这时说明不是单纯Hosted环境问题，
必须重新诊断生产实现。

不得进入Full。

---

## 5. 如果真实Win10 Production Discovery PASS

则把GitHub Hosted中的：

生产Windows网卡命令实际执行

重新定义为：

**环境能力探针，不作为真实LAN产品通过证明。**

这是测试策略调整，
不是生产安全策略放宽。

---

## 6. Hosted gate允许固定ENVIRONMENT_UNAVAILABLE

仅在：

GitHub官方Hosted Windows runner

且生产discovery返回：

`NETWORK_DISCOVERY_FAILED`

时，

Hosted测试允许记录：

`HOSTED_PRODUCTION_DISCOVERY_ENVIRONMENT_UNAVAILABLE`

注意：

这不是PASS。

不得写：

production discovery PASS。

但它不再阻塞后续Hosted合成安全测试，
前提是第2—4节真实Win10 Production Discovery Proof已经PASS并提交安全证据。

---

## 7. Production代码禁止修改

为实现第6节：

原则上只修改：

`tools/tests/lan-host/hosted-gate.cjs`

以及相关：

- test verifier
- CI report
- acceptance evidence

不得为了Hosted runner修改：

`public-lan-network.js`

中的生产安全判定。

尤其不得放宽：

- PowerShell安全路径
- private IPv4
- physical adapter
- VPN排除
- virtual adapter排除
- Public profile
- selected subnet

---

## 8. Hosted仍必须完成的安全测试

即使production discovery被记录为：

HOSTED_PRODUCTION_DISCOVERY_ENVIRONMENT_UNAVAILABLE

以下仍必须PASS：

- synthetic physical adapter selection
- virtual adapter rejection
- VPN/tunnel rejection
- RFC1918判断
- subnet calculation
- port reservation
- dual explicit listener
- 127.0.0.1 listener
- isolated runner-owned LAN listener
- no 0.0.0.0
- health probe
- HTTP probe
- controller cleanup

GitHub Hosted不得冒充真实企业LAN。

---

## 9. 8.3 alias最终决定

旧额外回归：

110 PASS
0 FAIL
1 SKIP

SKIP为：

真实8.3 alias环境不可用。

网页版决定：

如果当前受控Windows和Hosted环境均无法提供真实8.3 alias，
允许正式记录：

`ENVIRONMENT_CAPABILITY_NOT_AVAILABLE`

而不是：

PASS
SKIP-as-PASS

该额外测试不再阻塞Batch 4.5。

前提：

- 原测试不得删除
- 历史SKIP不得改写
- lexical alias synthetic tests仍PASS
- canonical/reparse/path安全测试仍PASS

核心公开回归仍必须：

26/26 suites
742 checks
fail 0
skip 0

本决定只适用于额外8.3环境能力测试，
不适用于核心742。

---

## 10. 模型成本控制

从现在开始：

Master：
GPT-6 Sol / Medium

原T5：
GPT-6 Sol / Medium

普通测试、CI、文档：
GPT-6 Sol / Medium

最终独立QA：
GPT-6 Sol / High

不再默认使用Astra。

只有出现：

- 新架构决策
- 无法解释的安全冲突
- 连续本地反例无法定位

才允许临时使用Astra，
并且不得整条线程长期保持Astra。

---

## 11. Local Proof后Master Review

真实Win10 proof PASS后，

Master必须确认：

1. production network代码未放宽；
2. 修改只发生在Hosted test strategy；
3. local proof使用当前生产代码；
4. 安全JSON无网络身份泄露；
5. synthetic LAN tests全部PASS；
6. compatibility tests全部PASS；
7. Firewall安全测试全部PASS。

完成后不再跑Hosted诊断。

---

## 12. 最后一次Full

批准使用现有：

**Final Full 0/1**

只有一次。

该Full应继续完成：

- Runtime
- Launcher
- Portable
- Setup
- beta.2→beta.3
- U22/U23
- Registry
- binding
- Firewall
- LAN synthetic/isolated gate
- 26/742
- Artifact privacy

如果Final Full FAIL：

立即停止。

不得再追加自动Hosted额度。

回网页版，
优先考虑真实Win10定点测试，
而不是继续CI循环。

---

## 13. QA成本控制

如果Final Full PASS：

运行：

**独立QA Hosted最多1次。**

QA1 PASS：

进入LAN HUMAN PENDING。

QA1 FAIL：

停止。

不得自动运行QA2或新Full。

返回网页版决定。

---

## 14. 最终人工LAN验收保持

最终仍必须由用户实际验证：

Host：
真实Windows 10

Client：
同一可信LAN第二设备

验证：

- Launcher显示Host
- IP
- port
- LAN URL
- Firewall授权
- 第二设备打开
- 登录
- 原账号
- 原附件
- 双客户端
- Host重启恢复
- DHCP变化URL更新

这才是真实LAN证明。

---

## 15. 最终目标

如果：

真实Win10 Production Discovery Proof PASS
+
Final Full PASS
+
QA1 PASS

则生成beta.3 Candidate Artifact，

状态：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

然后停止。

禁止：

Batch5
OCR
main
tag
Release

等待用户真实双设备验收。