# Batch 4.5 — Final Local STDERR Layer Diagnostic Approval

## 0. 网页版决定

批准：

**方案 A — 一次真实 Win10 本机 S01—S03 有界只读分层诊断。**

只批准本地诊断。

不批准：

- 忽略 stderr
- 放宽 production discovery
- 修改 network security policy
- 新增 Hosted H3/H4
- 提前运行 Final Full
- 提前运行 Final QA

当前 Batch 4.5 继续保持：

`BLOCKED — PRODUCTION DISCOVERY STDERR SOURCE UNRESOLVED`

直到本次诊断完成并明确 stderr 来源层级。

---

# 1. 成本控制

继续使用：

Master：
`01a0db0e-c950-79e0-8e11-07155e0742f2`

原 B45-T5：
`01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`

原 worktree。

禁止新建：

- 新T5
- 新worktree
- 新Hosted diagnostic

模型：

- Master：GPT-6 Sol / Medium
- T5：GPT-6 Sol / Medium

本轮不得使用 Astra。

---

# 2. 当前已确认事实

真实 Windows 10：

- Windows 10 Pro x64
- build 19045

当前 production network blob：

`4e13e944472f845675fe73d176f063c4fe97f6ed`

production代码未修改。

已经确认：

- `resolveSystemPowerShell()` PASS
- `runWindowsDiscovery()` FAIL
- 固定错误：`NETWORK_DISCOVERY_FAILED`

真实完整命令两次均：

- processResultPresent = true
- spawnError = false
- timedOut = false
- exitZero = true
- signalPresent = false
- stderrEmpty = false
- stdoutPresent = true
- jsonParseable = true

N01—N05也均：

`FAIL / STDERR_NONEMPTY`

因此：

现在唯一问题是：

**stderr究竟在哪一层首次出现。**

---

# 3. 生产代码先保持冻结

本次诊断前和诊断过程中：

禁止修改：

`public-lan-network.js`

必须继续使用已经验证的：

- system PowerShell executable
- `-NoLogo`
- `-NoProfile`
- `-NonInteractive`
- `-ExecutionPolicy Bypass`
- `-WindowStyle Hidden`
- 当前安全cwd
- 当前安全env
- 当前timeout
- 当前maxBuffer

诊断只能替换 PowerShell payload 内容，
不能改变执行器安全模型。

---

# 4. 先补合成反例

真实本机执行前，

原T5必须为S01—S03 harness补合成测试。

至少验证：

D01 S01 stderr空 → STARTUP PASS
D02 S01 stderr非空 → STARTUP
D03 S01 PASS、S02 stderr非空 → MODULE
D04 S01/S02 PASS、S03 stderr非空 → QUERY
D05 三层都无stderr → PASS
D06 exit nonzero不能误判成stderr-only
D07 timeout不能误判
D08 spawn failure不能误判
D09 invalid JSON不能误判
D10 unknown failure → UNRESOLVED
D11 报告出现额外字段必须拒绝
D12 不允许保存stdout/stderr正文

要求：

- fail0
- skip0
- Node syntax PASS
- diff-check PASS

Master Review后才运行真实S01。

---

# 5. S01 — PowerShell Startup Layer

S01：

**不得加载或调用任何网络cmdlet。**

只运行固定常量逻辑。

例如语义上：

```powershell
$ErrorActionPreference='Stop'
[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress
```

不得：

- Get-Net*
- Import-Module Net*
- Get-Command Net*
- WMI
- CIM
- Registry
- 网络访问

只判断：

- process存在
- spawn error
- timeout
- exit0
- signal
- stderr是否为空
- stdout是否存在
- JSON是否可解析

如果：

`stderr非空`

立即分类：

`STARTUP`

停止。

**不得继续S02/S03。**

这意味着：

问题已经证明发生在网络模块之外。

---

# 6. S02 — Module / Cmdlet Availability Layer

只有S01完全干净才允许S02。

S02：

只确认生产依赖的网络cmdlet能够解析/找到，

但不执行网络查询。

目标cmdlet：

- Get-NetConnectionProfile
- Get-NetRoute
- Get-NetAdapter
- Get-NetIPAddress

可以使用等价只读方式确认命令存在，例如：

`Get-Command`

或经Master Review的更窄方法。

不得读取：

- 当前IP
- 网卡
- route
- profile内容

最终只输出固定JSON：

```json
{"ok":true}
```

如果：

stderr非空

分类：

`MODULE`

停止。

不得进入S03。

---

# 7. S03 — Query Layer

只有：

S01 PASS
+
S02 PASS

才允许运行S03。

S03只执行：

**一个最小只读网络查询。**

优先使用生产脚本中最早执行的：

`Get-NetConnectionProfile`

但：

- 不保存查询内容
- 不输出profile名称
- 不输出InterfaceIndex
- 不输出NetworkCategory
- 不输出任何网络身份

查询结果只在PowerShell进程内部消费。

成功后最终只输出：

```json
{"ok":true}
```

如果：

stderr非空

分类：

`QUERY`

停止。

---

# 8. 固定结果模型

本次真实诊断只允许产生一个最终安全JSON。

例如：

```json
{
  "schema": 1,
  "status": "FAIL",
  "layer": "STARTUP",
  "S01": "FAIL",
  "S02": "NOT_RUN",
  "S03": "NOT_RUN",
  "stderrEmpty": false
}
```

layer只允许：

- `STARTUP`
- `MODULE`
- `QUERY`
- `PASS`
- `UNRESOLVED`

阶段值只允许：

- `PASS`
- `FAIL`
- `NOT_RUN`

---

# 9. 严格隐私边界

禁止保存、打印或提交：

- stderr正文
- stdout正文
- exception正文
- error message正文
- stack
- IP
- subnet
- gateway
- DNS
- route
- adapter name
- GUID
- MAC
- hostname
- InterfaceIndex
- NetworkCategory
- 用户路径
- PowerShell真实路径
- 上述内容的hash
- 上述内容的长度

只保存：

固定枚举
+
布尔值。

---

# 10. 本次不修改Windows

S01—S03全部必须只读。

禁止：

- Firewall修改
- Registry修改
- Route修改
- DNS修改
- Adapter enable/disable
- Network Profile修改
- Service修改
- ExecutionPolicy持久修改
- 模块安装
- 第三方工具安装
- listener
- port bind

---

# 11. 本轮只允许一次真实诊断链

真实执行规则：

先S01。

如果S01 FAIL：
立即停止。

如果S01 PASS：
运行S02。

如果S02 FAIL：
立即停止。

如果S02 PASS：
运行S03。

如果S03 FAIL：
立即停止。

如果S03 PASS：
记录：

`PASS`

整个真实链只运行一次。

不得为了确认结果重复执行。

---

# 12. 诊断后的自动处理规则

## 情况A：STARTUP

如果结果：

`STARTUP`

说明网络cmdlet不是当前根因。

不得修改network discovery查询逻辑。

Master只整理：

【当前事实】
【PowerShell启动环境约束】
【可能的最小环境修复】
【是否影响安全模型】

然后返回网页版。

不得自行修生产代码。

---

## 情况B：MODULE

如果结果：

`MODULE`

说明问题出现在：

网络cmdlet解析/模块层。

允许原T5进一步只读源码分析，

但不得增加真实诊断次数。

如果能从公开Windows兼容性事实和本地已有证据确定：

只是普通模块加载兼容问题，

提交最小修复方案给Master Review。

如果需要：

- 新模块
- 管理员权限
- WMI架构替换
- 第三方工具

返回网页版。

---

## 情况C：QUERY

如果结果：

`QUERY`

说明启动和模块层正常，

具体只读网络查询产生stderr。

不得直接：

“exit0所以忽略stderr”。

必须先由Master判断：

stderr是否可能表示：

- 权限问题
- 环境问题
- cmdlet warning
- partial failure
- provider异常

如果无法从不读取正文的证据安全判断：

返回网页版。

---

## 情况D：PASS

如果：

S01 PASS
S02 PASS
S03 PASS

则证明：

PowerShell启动
+
cmdlet解析
+
最小网络query

都可以无stderr执行。

此时问题位于：

**完整组合 production discovery script**

而不是基础运行环境。

允许原T5仅做源码级组合脚本分析，

但仍不得增加真实诊断次数。

---

# 13. 不批准忽略stderr

无论结果是哪一层，

本次授权都不允许直接修改：

```js
String(result.stderr || '').trim()
```

相关生产拒绝逻辑。

只有以后能够证明：

某一类stderr是确定、无害、跨目标Windows稳定且不会掩盖partial network discovery failure，

才可以另行讨论更精细策略。

当前：

**stderr非空继续fail closed。**

---

# 14. Final Full / QA保持冻结

本轮结束后：

Final Full：

`0 / 1`

Final QA：

`0 / 1`

继续保持未使用。

只有重新完成：

P01—P08
全部PASS

且：

`privateCandidatePresent = true`

才恢复 Final Full。

---

# 15. Hosted额度保持关闭

禁止：

- H3
- H4
- 新Hosted discovery diagnostic
- 使用Full做diagnostic
- 使用QA做diagnostic

真实Windows问题继续在真实Windows解决。

---

# 16. 当前8.3规则不变

额外8.3：

110 PASS
0 FAIL
1 SKIP

保持历史事实。

如果真实Win10和Hosted都无法提供真实8.3 alias：

可以记录：

`ENVIRONMENT_CAPABILITY_NOT_AVAILABLE`

但不能改成PASS。

核心：

26/742

最终仍必须：

fail0
skip0。

---

# 17. 模型与额度原则

本轮目标是：

**一次定位，不再层层烧额度。**

所以：

- 不增加Hosted
- 不增加Full
- 不增加QA
- 不增加线程
- 不增加worktree
- 不用Astra

只做：

合成测试
→ Master Review
→ 一次S01—S03真实链
→ 固定结论

---

# 18. 本轮最终停点

S01—S03完成后：

立即冻结原T5。

Master写：

- RESULT
- evidence
- decision summary

如果不是已经具备充分证据的普通工程兼容问题：

返回网页版。

不得自行进入：

Final Full
QA
LAN HUMAN
Batch5
OCR
main
tag
Release
