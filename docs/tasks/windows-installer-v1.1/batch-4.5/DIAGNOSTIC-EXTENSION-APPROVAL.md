# Batch 4.5 — Hosted Stop-Loss Continuation Decision

## 网页版决定

**批准方案 A：有界工程续行。**

当前结论保持：

`BLOCKED — HOSTED BUDGET EXHAUSTED`

但授权新增一个严格有界的工程诊断预算，用于解决当前：

`PORTABLE / Firewall Go fixture validation`

阻塞。

这不是新的产品方案批准。

既有 Batch 4.5：

- 产品目标
- LAN安全边界
- 方案A beta.2→beta.3精确信任路径
- Firewall最小权限策略
- 不bind 0.0.0.0
- 不开放Public
- First Admin仅Host本机
- selected subnet guard
- appVersion 1.0.0
- DC1
- Runtime identity schema
- 业务schema / 权限模型

全部保持不变。

---

# 1. 允许续行的唯一当前目标

当前失败：

Run:
`36288039798`

source:
`4f52e8759d8ddd20b2a9883fd267a98ced27fba1`

stage:
`PORTABLE`

失败发生于：

`tools/windows-firewall/build.ps1`

中的：

`go test ./...`

且早于：

Firewall helper实际编译。

当前三个合法fixture分别被：

- `HELPER_PATH_INVALID`
- `INSTANCE_BINDING_INVALID`
- `REGISTRATION_INVALID`

拒绝。

当前唯一目标：

**确认这是Hosted测试路径/路径身份表示问题，还是测试fixture真实违反生产契约。**

在唯一原因确定前：

不得修改生产接受条件。

---

# 2. 已确认的重点调查方向

当前仓库测试存在：

`t.TempDir()`

用于构造：

- synthetic install root
- instance
- registration fixture
- binding fixture

而Hosted workflow / build.ps1目前没有显式规定：

Go test使用的TEMP/TMP安全根。

本地主控曾在规范路径下通过对应专项。

因此允许优先调查：

- Hosted TEMP/TMP实际表示
- subst/physical path差异
- short path / lexical alias
- realpath identity
- volume root差异
- reparse判断
- install / instance synthetic fixture是否真实满足生产契约

但这些只是候选原因。

不得预先认定：

“t.TempDir就是根因”。

必须用固定诊断证明。

---

# 3. 先做本地 / 合成反例

原 T5 主责。

必要时原 T4 仅协作 Firewall helper测试环境问题。

不得新建重复主任务或重复worktree。

在运行任何新Hosted之前：

必须增加或完善本地反例，至少覆盖：

1. 规范本地绝对路径合法fixture接受；
2. synthetic install root符合真实目录层级时接受；
3. instance与install root独立且合法时接受；
4. registration / binding完全一致时接受；
5. lexical alias拒绝；
6. short-path/等价别名按现有安全策略处理；
7. reparse/junction异常拒绝；
8. install/instance重叠拒绝；
9. registry / INI不一致拒绝；
10. helper不在受信program位置拒绝；
11. TEMP位于非预期表示时能够得到固定诊断，而不是模糊失败。

不得删现有安全反例。

不得把skip当PASS。

---

# 4. 增加固定分类诊断

允许增加：

**只用于测试/Hosted定位的固定白名单路径分类码。**

例如可以区分：

- TEMP_ROOT_UNSAFE
- FIXTURE_INSTALL_PATH
- FIXTURE_INSTANCE_PATH
- FIXTURE_REPARSE
- FIXTURE_PATH_ALIAS
- FIXTURE_REGISTRATION
- FIXTURE_BINDING
- HELPER_IDENTITY
- INTERNAL

具体命名由工程实现决定。

禁止输出：

- 实际路径
- 用户目录
- runner绝对路径
- registry正文
- INI正文
- hash原值
- raw error
- stack
- stdout/stderr原文
- secret

只允许：

固定stage / reason code。

---

# 5. 可以修改测试环境，不得放宽生产环境

如果证据确认：

生产规则正确，

只是Go测试夹具因为Hosted默认TEMP/TMP或路径表示不满足真实安装契约，

允许修改：

- test fixture root
- Go test环境
- build.ps1测试TEMP/TMP
- synthetic install/instance目录布局
- CI测试驱动器/规范化路径

例如：

使用明确创建的安全测试根，
而不是任由GitHub runner默认TEMP决定fixture身份。

但必须保证：

测试使用的“合法fixture”仍模拟真实安装结构，
不能为了过测试制造生产中不可能存在的特例。

---

# 6. 明确禁止的修复

不得修改生产校验以接受：

- 任意helper路径
- 任意instance路径
- 任意registration
- 任意binding
- lexical alias
- reparse/junction
- install/instance重叠
- 未知registry来源

不得：

- 删除 `HELPER_PATH_INVALID`
- 删除 `INSTANCE_BINDING_INVALID`
- 删除 `REGISTRATION_INVALID`
- 将错误改warning
- 捕获错误后继续
- 将失败测试改skip
- 仅在GitHub Actions中特判放宽生产逻辑

---

# 7. Master Review门禁

Execution local commit返回后，

Master必须独立Review：

1. production path validation是否逐字节未放宽；
2. registration/binding契约是否未放宽；
3. Firewall helper参数白名单是否未放宽；
4. 修改是否只作用于测试环境/诊断，或有充分证据支持的等价路径规范化；
5. 正反例是否同时存在；
6. `go test`本地/可用Windows环境全部PASS；
7. `go vet` PASS；
8. diff-check PASS；
9. 无内部数据、路径、secret泄露。

通过后才能使用新增Hosted。

---

# 8. 新增专项Hosted预算

正式新增：

## Diagnostic Extension

最多：

**2次**

记为：

D5
D6

与历史专项1—4分开记录。

每一次都必须有：

代码/诊断有效变化。

禁止：

相同commit
+
相同测试
+
相同失败

直接retry。

---

# 9. D5目标

D5只用于：

越过或精确定位当前：

`PORTABLE / Firewall Go fixture`

失败。

D5必须至少证明：

- 实际build.ps1入口被执行
- Go test使用的测试环境满足明确契约
- 合法fixture通过
- 非法fixture仍拒绝
- Firewall helper能够进入实际compile阶段

如果D5仍失败：

必须取得比当前更深的固定reason。

然后：

本地反例
→ 最小修复
→ Master Review

才允许D6。

---

# 10. D6目标

D6是当前问题最后一次新增专项预算。

它应证明：

当前 PORTABLE / Firewall测试环境问题已闭合，

并且流程至少能够继续进入后续真实阶段。

如果D6仍在相同区域失败或仍不能唯一定位：

立即：

`BLOCKED — EXTENDED DIAGNOSTIC BUDGET EXHAUSTED`

停止。

不得使用Full预算继续调试该问题。

返回网页版。

---

# 11. 原Full预算保持

历史：

Full:
`0 / 2`

继续保留。

只有：

新增专项已经越过当前测试/构建阻塞，

并且Master确认：

LAN候选已达到完整候选运行条件，

才允许运行：

Full #1。

---

# 12. Full #1 后自动规则

如果Full #1全部PASS：

进入独立B4.5-QA。

如果Full #1在此前未到达的：

- Setup
- Registry
- Firewall
- U22/U23
- L/C gate
- regression

等阶段出现新的纯工程失败：

原Execution自行：

证据
→ 本地反例
→ 最小修复
→ Review

如无需额外专项Hosted即可有充分证据，

可直接进入Full #2。

如果新失败无法在本地安全定位，

不得偷用QA预算。

返回网页版决定是否需要新诊断预算。

---

# 13. Full #2

Full总预算仍然：

**2次**

不得增加。

Full #2仍失败：

停止并返回网页版。

---

# 14. QA预算保持

QA Hosted：

`0 / 2`

保持原预算。

不能挪作：

- diagnostic
- build debugging
- Full retry

只有完整LAN候选Full PASS后：

才建立最终独立B4.5-QA。

---

# 15. 当前可信身份策略不变

继续只允许：

已验F3 beta.2精确身份
→
beta.3

F3：

source:
`c8886e6b6d413c2fd73d6716621d07a80b337e58`

不得接受：

任意beta.2
fresh rebuild beta.2
仅version相同
仅commit相同

beta.1仍不得直接beta.3。

已固化五锚继续离线验证。

---

# 16. LAN产品安全边界不变

本续行不得改变：

- 不bind 0.0.0.0
- 不开放Public profile
- 不公网暴露
- 不UPnP
- 不路由器映射
- First Admin仅Host loopback
- Remote selected-subnet guard
- Firewall Private / LocalSubnet
- Setup继续per-user / lowest privilege
- Firewall elevation仅用户主动启用
- 不修改业务权限
- 不修改业务schema

---

# 17. 自动继续授权

本次D5/D6专项通过后，

Master无需重新询问用户。

自动继续：

D PASS
→ Full #1
→ 必要工程修复
→ Full #2（如需要）
→ B4.5-QA
→ Artifact

直到：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

---

# 18. 必须再次返回网页版的情况

仅以下情况：

A. D5+D6耗尽仍未解决当前阻塞；  
B. Full #2仍失败；  
C. 新失败需要额外Diagnostic Hosted而无预算；  
D. QA发现必须重跑Full但Full预算已尽；  
E. 需要放宽生产路径/Firewall/身份/网络安全规则；  
F. 需要改变产品/架构/schema/权限/平台；  
G. 无法安全恢复。

否则自动继续。

---

# 19. 最终目标不变

最终必须具备：

- L01—L28适用自动项PASS
- C01—C15 PASS
- Runtime PASS
- Launcher PASS
- Portable PASS
- Setup PASS
- Firewall安全专项PASS
- Registry / binding PASS
- beta.2→beta.3升级/rollback PASS
- 原26/742 fail0 skip0
- Artifact privacy PASS
- 独立B4.5-QA PASS
- beta.3 LAN Candidate Artifact

然后停止：

`BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`

不得进入：

Batch5
OCR
main
tag
Release