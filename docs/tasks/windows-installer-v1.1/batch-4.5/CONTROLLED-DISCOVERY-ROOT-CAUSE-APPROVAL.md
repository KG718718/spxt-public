# Batch 4.5 — Controlled Win10 Discovery Root-Cause & Final Cost-Controlled Completion

## 0. 网页版正式决定

批准继续 Batch 4.5。

但从现在开始改变验证策略：

**不再新增任何 GitHub Hosted Network Discovery 诊断额度。**

当前真实 Windows 10 已证明：

- P01：系统 PowerShell 安全路径确认 PASS
- P02：当前生产 `runWindowsDiscovery()` FAIL
- 固定生产错误：
  `NETWORK_DISCOVERY_FAILED`

因此下一步只允许：

**在当前真实 Windows 10 开发机上，对当前生产网络发现命令做一次只读、闭合、低成本的根因诊断。**

不得重新开始 Hosted H3/H4。

只有真实 Windows 10 的 Production Discovery Proof 最终 P01—P08 全部 PASS，
才能恢复：

Final Full
→ QA
→ LAN HUMAN PENDING

---

# 1. 当前项目身份

项目：

`K⁺-SESSION / KG718718/spxt-public`

当前 Batch：

`Batch 4.5 — LAN Host Deployment`

唯一 ACTIVE ENGINEERING MASTER：

`01a0db0e-c950-79e0-8e11-07155e0742f2`

旧 Master：

`019fa7e9-f46b-7192-9052-cd0aac7c2cc5`

永久：

`RETIRED — READ ONLY HISTORY`

当前集成分支：

`codex/lan-host-v1.1`

Primary：

`public-source`

禁止：

- main
- tag
- Release
- force push
- Batch5
- OCR

---

# 2. 当前冻结事实

真实 Windows 10：

- Windows 10 Pro x64
- build 19045

当前未修改生产文件：

`public-lan-network.js`

当前 Git blob：

`4e13e944472f845675fe73d176f063c4fe97f6ed`

当前公开生产源码 SHA256：

`7f2ac479b3bf2f06bf90b34257aeed59db94c3b00ddf81dabd8b997b8c1e241e`

受控 Windows Proof 已确认：

P01：
PASS

`resolveSystemPowerShell()` 成功。

P02：
FAIL

`runWindowsDiscovery()` 返回：

`NETWORK_DISCOVERY_FAILED`

因此：

P03—P08：

NOT REACHED

不得把未到达项解释为FAIL或PASS。

---

# 3. Hosted历史事实

历史 Hosted H1：

Run：
`36301442048`

结果：

`PRODUCTION_DISCOVERY_REJECT`
/
`PRODUCTION_DISCOVERY_INVALID`

历史 Hosted H2：

Run：
`36301876304`

结果：

`PRODUCTION_DISCOVERY_REJECT`
/
`DISCOVERY_COMMAND_FAILED`

H1/H2：

`2 / 2`

已耗尽。

禁止新增：

- H3
- H4
- 等价 GitHub Hosted Network Discovery diagnostic

Hosted和真实Win10都出现生产 discovery failure，

因此不得继续假设：

“只是 GitHub runner 网络问题”。

但也不能假设：

二者底层根因相同。

---

# 4. 当前剩余预算

保持：

Final Full：

`0 / 1`

Final QA Hosted：

`0 / 1`

不得提前使用。

不得把：

Final Full
或
QA

挪作 discovery debugging。

只有本任务真实 Win10 proof PASS 后，
才能使用 Final Full。

---

# 5. 模型成本控制

从本任务开始：

Master：

`GPT-6 Sol / Medium`

原 B45-T5 Execution：

`GPT-6 Sol / Medium`

普通：

- 测试
- CI
- 文档
- diff review
- evidence

统一：

`GPT-6 Sol / Medium`

最终独立QA：

`GPT-6 Sol / High`

不得默认使用 Astra。

只有出现：

- 新架构冲突
- 安全边界无法解释
- 生产规则必须重新设计

才允许临时使用 Astra。

不得整条线程长期使用 Astra。

---

# 6. 继续使用原任务现场

继续使用原：

B45-T5 thread：

`01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`

继续使用原 worktree。

不得：

- 新建重复T5
- 新建重复worktree
- 清理历史 `.test-work`
- 清理历史 evidence
- 删除旧失败 Artifact
- 改写旧失败结论

先解除原T5冻结，

仅授权本任务规定的：

**Controlled Win10 Discovery Root-Cause**

完成后再次冻结等待Master Review。

---

# 7. 第一阶段：不修改生产代码

开始诊断时：

禁止修改：

`public-lan-network.js`

必须继续使用当前生产：

- `WINDOWS_DISCOVERY_SCRIPT`
- `resolveSystemPowerShell()`
- `runWindowsDiscovery()`

使用相同：

- system PowerShell
- executable
- args
- cwd
- env
- timeout
- maxBuffer

建立独立：

**只读 diagnostic harness**

第一轮只观察执行类别。

---

# 8. Spawn层固定分类

当前生产逻辑把很多失败统一为：

`NETWORK_DISCOVERY_FAILED`

本地 diagnostic 必须安全细分。

只允许记录：

```json
{
  "processResultPresent": true,
  "spawnError": false,
  "timedOut": false,
  "exitZero": true,
  "signalPresent": false,
  "stderrEmpty": true,
  "stdoutPresent": true,
  "jsonParseable": true
}
```

允许固定原因枚举：

- `SPAWN_FAILED`
- `TIMEOUT`
- `EXIT_NONZERO`
- `SIGNAL`
- `STDERR_NONEMPTY`
- `STDOUT_EMPTY`
- `JSON_INVALID`
- `COMMAND_PASS`
- `INTERNAL`

禁止记录：

- stdout正文
- stderr正文
- exception正文
- stack
- IP
- 网卡名称
- GUID
- MAC
- hostname
- gateway
- DNS
- route正文
- 用户路径
- 实际PowerShell路径
- 上述内容的hash
- 上述内容的长度

---

# 9. 本地合成反例必须先完成

在真实系统命令定点测试前，

原T5先补合成反例。

至少覆盖：

R01 正常spawn + exit0 + stderr空 + valid JSON
R02 spawn error
R03 timeout
R04 exit nonzero
R05 signal
R06 stderr nonempty
R07 stdout empty
R08 invalid JSON
R09 null process result
R10 unknown exception → INTERNAL

要求：

- fail0
- skip0
- Node syntax PASS
- diff-check PASS

之后Master Review。

---

# 10. 第二阶段：PowerShell只读能力分段

如果真实完整命令仍为：

- EXIT_NONZERO
- STDERR_NONEMPTY
- JSON_INVALID
- 或其他非唯一结果

允许在同一 Win10 上做分段只读探针。

使用相同：

- 系统PowerShell
- NoProfile
- NonInteractive
- 安全environment

分别验证：

### N01

`Get-NetConnectionProfile`

### N02

`Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0'`

### N03

`Get-NetRoute -AddressFamily IPv4`

### N04

`Get-NetAdapter -IncludeHidden`

### N05

`Get-NetIPAddress -AddressFamily IPv4`

每项只记录：

- PASS
- FAIL

以及固定原因：

- `CMDLET_UNAVAILABLE`
- `COMMAND_FAILED`
- `TIMEOUT`
- `STDERR_NONEMPTY`
- `JSON_INVALID`
- `RESULT_OK`
- `INTERNAL`

不得记录命令实际返回内容。

---

# 11. 不得改变Windows系统

所有本地诊断必须严格只读。

禁止：

- 修改Firewall
- 修改网卡
- Disable/Enable Adapter
- 修改Network Profile
- 修改Route
- 修改Gateway
- 修改DNS
- 修改Registry
- 修改Windows Service
- 修改PowerShell Policy
- 安装新模块
- 安装第三方网络工具
- 创建永久listener
- 修改电源策略

---

# 12. 完整生产脚本复核

分段诊断完成后，

重新运行一次完整当前：

`WINDOWS_DISCOVERY_SCRIPT`

只判断：

- PowerShell可启动
- 未超时
- exit=0
- 无signal
- stderr为空
- stdout存在
- JSON可解析

如果全部成立：

继续新的 Controlled Windows Proof。

如果失败：

必须能给出：

唯一原因
或
最小故障集合。

不得继续猜。

---

# 13. 允许普通工程修复的范围

只有真实Win10证据明确根因后，

允许进行最小生产修复。

可以作为普通工程修复的情况包括：

### A

某个只读 PowerShell cmdlet 在 Win10 build19045 上存在兼容写法问题。

### B

组合脚本本身存在 PowerShell 语法/对象处理兼容问题。

### C

PowerShell JSON输出在：

单对象 / 数组 / 空结果

之间存在格式兼容问题。

### D

某个只读查询产生非致命stderr，

且能够证明：

- exit=0
- 查询成功
- 数据结构可信
- stderr不是权限失败
- stderr不是安全错误

此时才可讨论更精确处理。

### E

环境构造导致系统PowerShell模块无法正常加载，
且可以在不放宽系统可执行文件信任的前提下修正。

---

# 14. 禁止的生产修复

不得因为当前失败：

- 删除 PowerShell 安全路径校验
- 调用任意PATH里的 powershell
- 使用用户自定义 powershell.exe
- 接受 arbitrary executable
- bind 0.0.0.0
- 接受 Public profile
- 接受 VPN
- 接受 virtual adapter
- 接受 tunnel
- 放宽 RFC1918
- 删除 selected subnet guard
- 删除 First Admin loopback要求
- 关闭Windows Firewall
- 要求整个Setup管理员运行
- 使用第三方网络扫描工具

---

# 15. 必须返回网页版的新决策点

如果根因最终要求：

- 管理员权限才能完成网络发现
- Windows Service
- WMI/COM重大架构替换
- 第三方网络库
- Registry作为主要发现来源
- 修改Windows Network Profile
- 放宽virtual/VPN规则
- 放宽Public
- bind 0.0.0.0
- 新主要技术栈

立即：

`BLOCKED — NEED PRODUCT / ARCHITECTURE DECISION`

不得自行继续。

---

# 16. 修复后的唯一真实Win10 Proof

如果属于普通工程兼容问题：

原T5最小修复。

Master Review后，

重新在当前真实Win10执行：

Controlled Windows Production Discovery Proof。

必须得到：

P01 PASS
P02 PASS
P03 PASS
P04 PASS
P05 PASS
P06 PASS
P07 PASS
P08 PASS

并且：

`privateCandidatePresent = true`

才算：

`CONTROLLED WINDOWS PRODUCTION DISCOVERY PASS`

---

# 17. P01—P08语义

必须明确：

P01：
系统PowerShell安全确认

P02：
实际production discovery命令执行成功

P03：
production返回records可安全解析

P04：
`discoverWindowsLan()`返回结构合法

P05：
virtual / VPN / tunnel拒绝规则PASS

P06：
RFC1918 private边界PASS

P07：
整个proof未创建任何listener

P08：
前后只读发现结果未发现proof导致的系统网络状态变化

此外：

privateCandidatePresent=true

不得通过伪造synthetic candidate实现。

---

# 18. Proof证据隐私要求

最终本地 proof JSON 只能包含：

- schema
- status
- platform
- reason
- sourceCommit
- productionNetworkBlobSha256
- P01—P08
- privateCandidatePresent

不得包含：

- IP
- adapter name
- GUID
- MAC
- hostname
- route
- DNS
- gateway
- 系统路径
- 用户路径
- stdout
- stderr
- exception
- 这些内容的hash/长度

---

# 19. Proof PASS后的Hosted策略

一旦真实 Win10：

P01—P08 PASS

则：

**不再运行任何 Hosted Production Network Discovery diagnostic。**

GitHub Hosted只负责：

- synthetic adapter selection
- virtual/VPN rejection
- private subnet math
- port reservation
- dual explicit listener
- health
- HTTP probe
- cleanup
- Setup / upgrade
- regression
- Artifact

Hosted不能冒充：

真实企业LAN。

---

# 20. Hosted虚拟网卡环境

如果GitHub Hosted的真实production discovery继续因为Hosted虚拟网络失败，

允许测试层固定记录：

`HOSTED_PRODUCTION_DISCOVERY_ENVIRONMENT_UNAVAILABLE`

前提：

当前真实Win10 P01—P08已经PASS。

这不是：

PASS。

只是：

Hosted环境能力不可用。

不得修改：

`public-lan-network.js`

来迎合GitHub虚拟网卡。

---

# 21. Synthetic/isolated Hosted gate仍必须PASS

Hosted中仍必须验证：

- synthetic physical adapter → SELECTED
- virtual adapter → rejected
- VPN/tunnel → rejected
- RFC1918 rules
- subnet math
- 127.0.0.1 listener
- runner-owned isolated private listener
- same port dual bind
- no 0.0.0.0
- HTTP probe
- controller health
- complete cleanup

只允许声明：

`HOSTED ISOLATED LAN PASS`

不得声明：

`REAL COMPANY LAN PASS`

---

# 22. 8.3 alias最终规则

历史额外测试：

110 PASS
0 FAIL
1 SKIP

SKIP：

真实8.3 alias环境不可用。

网页版现正式确认：

如果当前真实Win10以及GitHub Hosted环境确实都无法提供可用真实8.3 alias，

允许将该项记录为：

`ENVIRONMENT_CAPABILITY_NOT_AVAILABLE`

它：

不是PASS。

也不能把历史SKIP改成PASS。

要求：

- 原测试保留
- 历史结果保留
- synthetic lexical alias测试继续PASS
- canonical path测试继续PASS
- reparse测试继续PASS

该额外8.3环境能力项：

**不再单独阻塞 Batch 4.5。**

但是核心公开回归仍必须：

26/26 suites
742 checks
fail 0
skip 0

该豁免不适用于核心742。

---

# 23. Final Full唯一额度

真实Win10 P01—P08 PASS后，

允许使用：

Final Full：

`0 / 1`

只有一次。

不得增加。

Final Full必须尽可能完成：

- Runtime
- Launcher
- Portable
- Setup
- beta.2 → beta.3
- C01—C15
- U22/U23
- Registry
- binding
- Firewall
- LAN synthetic gate
- Hosted isolated dual-bind
- lifecycle
- 26/742
- Artifact privacy

---

# 24. Final Full失败处理

如果 Final Full FAIL：

立即停止。

不得新增：

- Hosted diagnostic
- Full retry
- 隐式QA调试

返回网页版。

优先：

使用当前真实Win10做定点问题验证。

不再进入无限CI重试循环。

---

# 25. Final QA唯一额度

只有 Final Full PASS 后：

允许独立 B4.5-QA。

预算：

`0 / 1`

QA模型：

`GPT-6 Sol / High`

QA必须独立验证：

- 产品安全边界
- identity
- upgrade
- rollback
- LAN配置
- Firewall
- privacy
- Artifact
- regression证据

---

# 26. QA失败处理

QA1 PASS：

进入：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

QA1 FAIL：

停止。

不得自动：

QA2
或
新Full。

返回网页版。

---

# 27. 最终beta.3 Artifact条件

只有：

Controlled Win10 Proof PASS
+
Final Full PASS
+
QA PASS

才允许称：

beta.3 LAN Candidate Artifact

不得把：

历史Full2临时Setup
历史fault build
诊断Artifact

当作最终用户安装包。

---

# 28. 最终真实LAN人工验收

最终仍由用户在真实环境验证。

Host：

当前 Windows 10 PC

Client：

同一可信LAN第二设备，例如：

- 手机
- 笔记本
- 平板
- Mac
- Windows电脑

至少验证：

1. Host安装/升级beta.3
2. Host原账号/附件保持
3. Launcher显示Host名称
4. Launcher显示正确LAN IP
5. Launcher显示固定Port
6. LAN URL正确
7. 必要时完成一次Firewall UAC授权
8. Host浏览器通过LAN URL访问
9. 第二设备打开LAN URL
10. 第二设备登录
11. 双客户端同时在线
12. Session不串号
13. Host重启LAN恢复
14. DHCP/IP变化后URL更新
15. persisted port保持
16. Public/Guest网络不自动开放

---

# 29. Windows 11状态

本Batch不要求现在拥有物理Win11机器。

当前平台结论保持：

Windows 10 x64：

真实设备验证轨道。

Windows 11 x64：

尚未完成物理设备认证。

未来可：

Win11 VM兼容验证
+
后续真实Win11设备验证。

不得把：

GitHub `windows-2025`

写成：

真实Windows 11 x64认证。

---

# 30. 最终停止点

如果：

Controlled Win10 P01—P08 PASS
+
Final Full PASS
+
Final QA PASS
+
beta.3 Candidate Artifact生成

则：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

立即停止。

等待用户真实双设备LAN人工验收。

不得自动进入：

- Batch5
- OCR
- main
- tag
- Release

---

# 31. 立即执行顺序

现在严格按以下顺序执行：

1. 解除原B45-T5有限冻结
2. 使用GPT-6 Sol / Medium
3. 先补spawn固定分类合成反例
4. Master Review
5. 当前Win10执行只读spawn分类
6. 必要时执行N01—N05分段PowerShell只读探针
7. 唯一确认production discovery根因
8. 如属普通兼容问题，原T5最小修复
9. Master Review
10. 重新执行一次P01—P08 Controlled Windows Proof
11. Proof PASS后停止所有network diagnostic
12. 运行唯一Final Full
13. Full PASS后运行唯一Final QA
14. QA PASS后生成最终Handoff
15. 停在LAN HUMAN PENDING

除第15节列出的真正产品/架构/安全变化外，
不要中途再次询问用户。

不得新增Hosted Network Discovery额度。
