# Batch 4.5 — Corrected Pre-Network STDERR Isolation Decision

## 0. 网页版结论

上一轮S01结果有效，但其分类需要修正。

上一轮证明的是：

**stderr在任何网络cmdlet执行前已经出现。**

但不能严格证明：

**stderr来自PowerShell进程启动本身。**

原因：

S01使用：

`ConvertTo-Json`

该命令属于：

`Microsoft.PowerShell.Utility`

因此S01可能已经触发PowerShell模块自动加载。

当前状态修正为：

`BLOCKED — PRE-NETWORK STDERR SOURCE UNRESOLVED`

不得改写历史证据；
只修正对证据的解释精度。

---

# 1. 不增加任何Hosted或CI额度

继续：

Hosted Network Diagnostic：
禁止新增

Final Full：
0 / 1，冻结

Final QA：
0 / 1，冻结

本次只允许：

**一次当前Win10上的本地只读M00→M02诊断链。**

不运行Actions。

---

# 2. 模型保持低成本

Master：

GPT-6 Sol / Medium

原B45-T5：

GPT-6 Sol / Medium

不得使用Astra。

继续：

原thread
原worktree

不得新建任务树。

---

# 3. 生产代码继续冻结

不得修改：

`public-lan-network.js`

当前生产blob保持：

`4e13e944472f845675fe73d176f063c4fe97f6ed`

继续使用同一个经过验证的：

- system powershell.exe
- cwd
- env
- timeout
- maxBuffer
- NoLogo
- NoProfile
- NonInteractive
- ExecutionPolicy Bypass
- WindowStyle Hidden
- EncodedCommand

只替换诊断payload。

---

# 4. 先修正测试语义

历史S01：

不删除
不重写
不重新运行

其正式解释改为：

`PRE_NETWORK_UTILITY_SERIALIZATION_STAGE`

已证明：

- 没有Get-Net*
- 没有网络查询
- stderr非空

但由于存在ConvertTo-Json，
不能称为纯STARTUP。

---

# 5. M00 — 真正的纯PowerShell/.NET基线

M00不得使用：

- ConvertTo-Json
- Write-Output
- Out-*
- Get-*
- Import-Module
- 任何网络cmdlet
- 任何需要模块自动加载的命令

只允许PowerShell语言基础
+
.NET直接写stdout。

payload语义例如：

```powershell
$ErrorActionPreference='Stop'
[Console]::Out.Write('{"ok":true}')
```

只能判断：

- process存在
- spawn error
- timeout
- exit0
- signal
- stderr empty
- stdout present
- stdout是否精确等于固定JSON

如果M00：

stderr非空

分类：

`SHELL_OR_ENVIRONMENT`

立即停止。

不得运行M01/M02。

---

# 6. M01 — Utility Module Load

只有M00完全干净才允许。

M01目的：

确认加载：

`Microsoft.PowerShell.Utility`

本身是否产生stderr。

允许：

```powershell
$ErrorActionPreference='Stop'
Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop
[Console]::Out.Write('{"ok":true}')
```

不得：

- 网络查询
- ConvertTo-Json
- 输出模块信息
- 输出路径

如果M01 stderr非空：

分类：

`UTILITY_MODULE_LOAD`

立即停止。

---

# 7. M02 — ConvertTo-Json执行层

只有：

M00 PASS
M01 PASS

才允许运行。

M02使用上一轮S01等价的最小序列化：

```powershell
$ErrorActionPreference='Stop'
[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress
```

如果：

M02 stderr非空

分类：

`UTILITY_SERIALIZATION`

如果stderr为空：

分类：

`PRE_NETWORK_PASS`

---

# 8. 本次最终分类只有四种

最终layer只能是：

- `SHELL_OR_ENVIRONMENT`
- `UTILITY_MODULE_LOAD`
- `UTILITY_SERIALIZATION`
- `PRE_NETWORK_PASS`
- `UNRESOLVED`

不得增加自由文本原因。

---

# 9. 隐私规则

只允许最终安全JSON，例如：

```json
{
  "schema": 1,
  "status": "FAIL",
  "layer": "UTILITY_MODULE_LOAD",
  "M00": "PASS",
  "M01": "FAIL",
  "M02": "NOT_RUN"
}
```

阶段值只允许：

PASS
FAIL
NOT_RUN

禁止记录：

- stdout正文
- stderr正文
- PowerShell错误正文
- exception
- stack
- 路径
- 环境变量值
- IP
- hostname
- 用户信息
- 网络信息
- 上述数据hash
- 上述数据长度

M00固定stdout只允许与程序内固定字符串比较，
不得保存运行时stdout。

---

# 10. 不修改系统

本次仍严格只读。

禁止：

Firewall
Registry
Service
Network Profile
网卡
Route
DNS
模块安装
ExecutionPolicy持久修改
listener
port bind

---

# 11. 一次执行规则

先M00。

M00 FAIL：
STOP。

M00 PASS：
执行M01。

M01 FAIL：
STOP。

M01 PASS：
执行M02。

M02完成：
STOP。

不得重复live chain。

---

# 12. 结果后的处理

## A. SHELL_OR_ENVIRONMENT

如果M00已经stderr非空：

说明：

ConvertTo-Json和Utility模块都不是必要触发因素。

问题缩小到：

- PowerShell宿主
- 调用参数
- 当前受限env
- 基础Windows环境

不要改network代码。

返回Master分析。

---

## B. UTILITY_MODULE_LOAD

如果：

M00 PASS
M01 FAIL

说明：

纯shell正常，
Utility模块加载阶段触发stderr。

这时重点Review：

- PSModulePath安全白名单
- PowerShell模块加载环境
- 当前最小environment是否缺少基础系统变量

不得直接扩大到用户模块路径。

---

## C. UTILITY_SERIALIZATION

如果：

M00 PASS
M01 PASS
M02 FAIL

说明：

模块加载本身正常，
问题进一步缩小到：

ConvertTo-Json / 序列化行为。

此时不得假定网络cmdlet存在同样问题。

Master决定是否可以用不依赖ConvertTo-Json的固定生产序列化方案。

如涉及生产输出协议改变，
先Review。

---

## D. PRE_NETWORK_PASS

如果M00/M01/M02全部stderr空：

说明上一轮结果与当前结果发生环境差异。

不得直接继续。

先检查：

- exact source identity
- exact PowerShell invocation identity
- test harness差异

不得进入Final Full。

---

# 13. 一个重要安全原则

当前production仍保持：

stderr非空 → fail closed。

本授权：

**不批准删除stderr检查。**

只有根因明确，
才能考虑最小修复。

---

# 14. 如果根因指向env

如果最终是：

SHELL_OR_ENVIRONMENT

且进一步源码分析认为当前production env过度裁剪，

不得直接使用：

`process.env`

整体传入PowerShell。

只能考虑：

**明确白名单的可信系统变量。**

任何拟新增变量都必须逐项Review其：

- 来源
- 是否用户可控
- 是否影响PATH搜索
- 是否影响模块搜索
- 是否影响脚本执行
- Win10/Win11兼容性

不得扩大可执行文件或模块信任范围。

---

# 15. Final Full仍冻结

本次M00—M02结束后：

冻结T5。

Master记录结果。

不要运行：

Final Full
Final QA
Hosted
LAN HUMAN

只有明确根因
→ 最小修复
→ P01—P08真实Win10全部PASS

后，

才恢复Final Full 0/1。

---

# 16. 最终目标保持

仍然是：

真实Win10 P01—P08 PASS
+
Final Full PASS
+
Final QA PASS
+
beta.3 Candidate Artifact

然后：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

等待真实双设备LAN验收。

不进入：

Batch5
OCR
main
tag
Release
