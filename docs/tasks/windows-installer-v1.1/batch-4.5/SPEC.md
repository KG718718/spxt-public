# Batch 4.5 — LAN Host Deployment / 批准规格

来源：2026-09-27用户正式任务书第1—12节及续篇第13—38节，已完整读取。前12节按原意登记如下，后26节保留用户原文。全部条款共同生效；旧Batch的停止语句不撤销本次明确授权。

## 1. Batch 4 收尾
Batch 4 PASS — Windows 10 x64 Beta Upgrade Track；用户人工1—10全部PASS。受验Run36246132535 / Artifact10907910968 / source c8886e6b6d413c2fd73d6716621d07a80b337e58，不修改或覆盖。治理文档已提交9eaad01f5e5d36e614d52fee8694d6ec4e44b530并核验远端，不运行Full CI。

## 2. 唯一集成分支
从已确认公开开发HEAD建立codex/lan-host-v1.1；Primary public-source。禁止修改main/v1.0.0、覆盖beta.2、Tag/Release/force push。唯一Master 01a0db0e-c950-79e0-8e11-07155e0742f2；旧019fa7e9-f46b-7192-9052-cd0aac7c2cc5永久RETIRED — READ ONLY HISTORY。只用指定公开材料，禁止访问其他用途源码、真实业务、内部配置或凭据。

## 3. 产品目标
Windows安装机成为LAN Host；同一可信LAN其他电脑、手机、平板无需安装，只用浏览器访问并登录。安装→Host本机创建首Admin→检测LAN→选适配器/IP→安全选端口并保存→Launcher显示LAN地址→第二设备访问。

## 4. 不假设公司固定网络
不得写死盘符、网段、网关、网卡、IP或8080可用；运行时发现。

## 5. Host / Server身份展示
Launcher显示Windows Computer Name、选中适配器、当前private IPv4、Subnet、Port、Local URL、LAN URL、Listener/Firewall/LAN Health状态；提供“复制局域网地址”。

## 6. LAN IPv4发现
仅10/8、172.16/12、192.168/16。排除127/8、169.254/16、公网、loopback/APIPA、断线、VPN/Tunnel/Docker/WSL/Hyper-V及明显虚拟网卡；优先真实Ethernet/Wi-Fi，结合状态、route、私网地址和subnet。

## 7. 多网卡
只有一个安全LAN则自动选择；多个合法LAN不得猜测，显示Adapter Name/IPv4/Subnet让用户选。持久化adapter identity/preference，不能永久保存IP；每次启动重新读当前地址。

## 8. IP变化
DHCP后自动更新LAN URL，不要求改配置；本版不做mDNS/Bonjour/.local/DDNS。

## 9. 初次端口
顺序尝试8080—8099，必须实际exclusive bind成功，不能仅用netstat/进程/文本扫描。

## 10. 端口持久化
首次确定后保存，后续启动继续使用，不每次重新挑选。

## 11. 已保存端口冲突
显示LAN PORT OCCUPIED / PORT OCCUPIED，保留原port，不能偷偷换号；只有用户LAN设置中主动“重新寻找可用端口”确认后才能改变。

## 12. 独立LAN配置
不改业务data.json或业务schema。独立配置示例 {"schema":1,"port":8083,"adapterPreference":"..."}；IP不持久化。存储及安全工程细节由Execution提出，并服从第26节卸载/重装保留要求。

# 13. Listener策略

禁止默认：

`0.0.0.0`

优先实现：

两个明确Listener：

Local：

`127.0.0.1:<port>`

LAN：

`selected-private-ip:<port>`

例如：

127.0.0.1:8083

192.168.10.23:8083

不得自动监听：

VPN
Public
其他NIC

如果当前Node/server架构无法安全实现该方式：

停止并提交架构决策卡。

不得自行改成0.0.0.0。

---

# 14. First Admin安全门禁

这是强制要求。

当instance还没有首个Admin时：

只有Host本机：

`127.0.0.1`

可以：

首次初始化
创建Admin

LAN客户端不能：

创建首Admin
抢占初始化
访问bootstrap接口

LAN请求只能得到固定状态：

`HOST_INITIALIZATION_REQUIRED`

完成Host本机Admin初始化以后：

远程LAN登录才开放。

---

# 15. Remote peer范围保护

应用层不能只依赖Windows Firewall。

Server还必须确认：

remote peer属于：

当前selected LAN adapter对应的可信subnet

例如Host：

192.168.10.23/24

允许：

192.168.10.x

拒绝：

公网
VPN
其他NIC
非selected subnet

不得通过修改现有业务权限模型实现。

这是网络入口保护层。

---

# 16. Windows Firewall策略

现有Setup继续保持：

- per-user
- lowest privilege
- 安装无UAC

不得为了LAN把整个Setup改成管理员安装。

如果启用Windows Firewall入站规则需要管理员权限：

Launcher提供：

`启用局域网访问`

用户主动点击以后：

启动一个最小用途elevated helper。

Windows可以显示一次UAC。

---

# 17. Firewall授权失败

如果用户拒绝UAC：

不得影响本机使用。

Local：

继续正常。

LAN：

显示：

`FIREWALL BLOCKED`

不得：

- 循环弹UAC
- 自动关闭Firewall
- 降低Firewall安全
- 自动换公网方式

---

# 18. Firewall Rule安全范围

只能创建：

Inbound TCP

Port：
persisted LAN port

Profile：
Private

Remote：
LocalSubnet / 当前可信LAN范围

Program：
K⁺-SESSION自己的Host/private Node executable

禁止：

- Public profile
- Any Remote
- Any Port
- Any Program
- 关闭Windows Firewall
- 修改全局Firewall策略

Firewall Rule名称必须固定、可审计。

不得每次启动创建新规则。

---

# 19. Elevated Firewall Helper

如果实现Helper：

必须：

- 单一功能
- 参数白名单
- 固定port范围
- 固定program来源
- 校验安装路径
- 校验调用者输入
- 无CMD黑框
- 不接受任意shell
- 不接受任意exe路径
- 不接受任意remote address
- 不接受任意PowerShell命令

禁止：

`cmd /c <user input>`

或等价shell拼接。

必须有独立安全反例测试。

---

# 20. LAN READY定义

只有全部满足：

1. K⁺-SESSION Server运行
2. 首个Admin已创建
3. selected adapter合法
4. private IPv4合法
5. persisted port合法
6. port bind成功
7. LAN listener成功
8. Local health PASS
9. LAN URL Host self-test PASS
10. Firewall状态允许LAN
11. remote bootstrap关闭

才允许Launcher显示：

`LAN READY`

---

# 21. Launcher固定状态码

至少包括：

LAN READY

HOST INITIALIZATION REQUIRED

NO PRIVATE LAN

MULTIPLE LAN ADAPTERS

PORT OCCUPIED

FIREWALL BLOCKED

LAN START FAILED

LAN HEALTH FAILED

NETWORK CHANGED

不得只显示：

“失败”

必须告诉用户失败在哪一层。

---

# 22. 公司网络自身限制

系统不能绕过公司的：

- VLAN
- ACL
- Guest Wi-Fi Isolation
- AP Client Isolation
- Switch Isolation
- 企业防火墙策略

如果：

Host自身LAN URL正常
Firewall正常
Listener正常

但第二设备仍无法访问：

Launcher/诊断必须明确：

`HOST READY — EXTERNAL LAN ACCESS NOT CONFIRMED`

提示可能存在：

公司网络隔离策略。

不得自动：

修改路由器
修改交换机
关闭安全策略
UPnP开端口

---

# 23. 多客户端

至少支持：

两个独立浏览器Session同时连接。

测试：

Client A
Client B

要求：

- Session不串号
- 登录身份独立
- 权限模型不变
- Host只有一个instance
- 附件仍在Host
- Client不创建本地数据副本

---

# 24. Host生命周期

以下情况LAN服务自然不可用：

- Host关机
- Host睡眠
- Launcher停止
- 网络断开

不得：

自动改Windows电源计划
自动禁止睡眠
修改路由器

Host重新启动Launcher以后：

- 重新识别adapter
- 重新识别当前IPv4
- 使用原persisted port
- 自动恢复LAN
- 更新LAN URL

---

# 25. HTTP边界

Batch 4.5 Beta允许：

HTTP on trusted Private LAN

必须明确：

适用：

公司可信内网
家庭可信Wi-Fi

不适用：

Public Wi-Fi
Guest Wi-Fi
公网
Internet直接暴露

本Batch不做：

- HTTPS证书体系
- 公网TLS
- DDNS
- reverse proxy
- mDNS

---

# 26. 升级与数据保护

Batch 4.5不能破坏Batch 4已经通过的数据保护。

必须验证：

已有beta.2
→ LAN候选升级

保持：

- instance
- 原账号
- 原附件
- 数据位置
- port
- adapter preference
- LAN配置

卸载程序：

业务instance继续保留。

重装：

重新选择原instance后：

业务数据和LAN deployment配置继续恢复。

不得增加业务schema migration。

---

# 27. Version

现有beta.2：

`1.1.0-beta.2`

永久保持历史身份。

Batch 4.5新候选：

建议 Installer Version：

`1.1.0-beta.3`

不得覆盖beta.2。

如果仅改变installerVersion即可：

appVersion可以保持现有版本体系。

如果工程发现必须修改：

package/appVersion
data contract
Runtime identity
upgrade compatibility

停止并提交网页版决策卡。

---

# 28. Acceptance L01—L28

至少建立：

L01 private IPv4发现  
L02 排除loopback/APIPA/public  
L03 排除VPN/virtual/tunnel  
L04 单一adapter自动选择  
L05 多adapter要求用户选择  
L06 DHCP变化重新计算IP  
L07 首选8080  
L08 8080—8099真实bind寻找  
L09 port持久化  
L10 persisted port冲突时fail  
L11 不静默换port  
L12 Hostname正确显示  
L13 Adapter/IP/Subnet正确显示  
L14 Local URL正确  
L15 LAN URL正确  
L16 Copy LAN URL正确  
L17 Host-only Admin bootstrap  
L18 Remote无法抢首Admin  
L19 Admin后LAN登录正常  
L20 selected subnet guard有效  
L21 非LAN来源拒绝  
L22 Firewall Private/LocalSubnet正确  
L23 用户拒绝Firewall授权时Local正常  
L24 Host LAN self-health PASS  
L25 第二设备LAN访问  
L26 双客户端Session隔离  
L27 Host重启/IP变化/LAN恢复  
L28 Upgrade/卸载/重装保持instance与LAN配置

Master可以增加，不得减少核心语义。

---

# 29. 自动化测试

CI必须尽可能验证：

- IP选择算法
- adapter选择
- subnet计算
- port bind
- port persistence
- collision
- config persistence
- Listener绑定范围
- bootstrap guard
- remote subnet guard
- Firewall helper参数安全
- Launcher状态
- upgrade preservation
- privacy
- regression

并保持：

原26/742

fail0
skip0

Batch4升级保护回归继续通过。

---

# 30. 真实LAN人工测试

GitHub Hosted不能替代真实局域网。

最终必须人工：

Host：
Windows 10 x64

Client：
同一LAN第二设备

第二设备可以：

Windows
Mac
手机
平板

人工至少：

1. Host安装/升级
2. Host创建Admin
3. Launcher显示Host/IP/Port
4. Launcher显示LAN URL
5. 如需要点击启用LAN并完成一次Firewall授权
6. Host浏览器LAN URL正常
7. 第二设备同LAN打开URL
8. 第二设备登录
9. 原账号/附件正常
10. 双客户端同时在线
11. Host重启后LAN恢复
12. DHCP/IP变化后URL更新
13. Persisted port保持
14. 不允许Guest/Public网络暴露

---

# 31. Batch目录

建立：

`docs/tasks/windows-installer-v1.1/batch-4.5/`

至少：

INTENT.md  
SPEC.md  
PLAN.md  
ACCEPTANCE.md  
ORCHESTRATION.md  
LAN-TEST-REPORT.md  
RESULT.md  
HUMAN-ACCEPTANCE.md  
CHATGPT-HANDOFF.md

---

# 32. Thread Orchestration

继续使用：

Master
→ Execution
→ QA

Master不得亲自实现重大生产代码。

建议拆为：

B45-T1：
Network Discovery / Adapter / Subnet / Port

B45-T2：
Server LAN Listener / Bootstrap / Remote Guard

B45-T3：
Launcher LAN UX / Host Status

B45-T4：
Firewall Helper

B45-T5：
Integration / Upgrade / Lifecycle / CI

具体依赖和串并行由Master决定。

共享核心文件不能并发修改。

---

# 33. Execution Return Handshake

继续使用已建立的双保险。

Execution主动：

send_message_to_thread(
`01a0db0e-c950-79e0-8e11-07155e0742f2`
)

Master同时主动：

wait
read
RESULT
worktree
local commit

不得再次出现：

Execution完成但Master不知道。

---

# 34. 自动工程授权

本Batch批准范围内的纯工程问题：

自动：

Execution
→ Return
→ Review
→ Rework
→ Integration
→ CI
→ QA

无需用户逐次确认。

---

# 35. 必须返回网页版的情况

出现以下任一项：

- 必须bind 0.0.0.0
- 必须开放Public网络
- 必须公网暴露
- 必须UPnP
- 必须路由器端口映射
- 必须修改业务权限
- 必须修改业务schema
- 必须数据migration
- 必须把整个Setup改管理员
- 必须Windows Service
- 必须HTTPS证书体系
- 必须mDNS新依赖
- 必须主要技术栈变化
- 必须平台范围变化
- 必须降低安全门禁

立即：

BLOCKED / NEED PRODUCT DECISION

并提交：

【当前事实】  
【技术约束】  
【可选方案】  
【各方案影响】  
【需要网页版决定的问题】

---

# 36. Hosted预算

本Batch独立预算：

专项 Hosted：
最多4次

Full LAN Candidate：
最多2次

QA Hosted：
最多2次

相同失败不得无修改retry。

每轮：

证据
→ 本地反例
→ 最小修复
→ Master Review
→ Hosted

预算耗尽：

返回网页版。

---

# 37. 最终自动停点

持续自动执行直到：

- L01—L28适用自动项PASS
- 原26/742 PASS
- Runtime PASS
- Launcher PASS
- Portable PASS
- Setup PASS
- Batch4升级/数据保护回归PASS
- LAN Network Security PASS
- Firewall安全专项PASS
- Artifact privacy PASS
- B4.5-QA PASS
- beta.3 LAN Candidate Artifact生成

最终状态：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

停止。

不得自动进入：

OCR
Batch5
main
tag
Release

等待用户双设备真实LAN验收。

---

# 38. 立即开始

执行：

1. 完成Batch4最终PASS文档
2. Push治理收尾
3. 创建codex/lan-host-v1.1
4. 建立batch-4.5规格与编排
5. 派Execution Threads
6. 自动推进至LAN HUMAN PENDING

除真正产品/架构/安全决策外，
不要中途要求用户确认。