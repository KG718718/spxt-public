# Batch 4.5 — 唯一 M03 进程级非对称对照批准

网页版批准方案 A，取代此前 M03 的同进程内部阶段归因目标；不批准方案 B。原 B45-T5、原工作树和 `codex/lan-host-v1.1` 继续，唯一 Master 为 `01a0db0e-c950-79e0-8e11-07155e0742f2`。M00 PASS、M01 PASS、M02 FAIL 及原合成歧义证据保持历史原貌。公共分支本地、origin 跟踪与 GitHub 远端在本次派单前均核对为 `47e1acf03c2e76d2f04025051836033814828254`。

先由原 T5 修订 M03-T01—T08 合成语义，Master Review 后才准一次真实 Win10 M03。合成结果：T01 clean aggregate → `EXPLICIT_IMPORT_SERIALIZATION_PASS`；T02/T03 任一内部阶段 stderr → `UNRESOLVED`；T04—T07 任一进程或固定输出异常 → `UNRESOLVED`；T08 额外报告字段拒绝。原 T5 local `9810f29`/`d1da5ad` 已经 Master 检查并整合为 `51e2509`/`bdc7c8c`：新增 10/10、相关 31/31 独立复验，fail 0、skip 0，语法和 diff-check PASS；生产 blob `4e13e944472f845675fe73d176f063c4fe97f6ed` 未变。真实 M03 尚未运行。

唯一真实 M03 只在同一个系统 PowerShell 进程中显式 `Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`，然后执行 `[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress`。沿用生产安全 PowerShell 解析、参数、cwd、env、timeout、maxBuffer；只观察整进程 exit、signal、固定 stdout 和聚合 stderr。整个进程干净才报 `EXPLICIT_IMPORT_SERIALIZATION_PASS`；任何其他情形报 `UNRESOLVED`，不得归因模块/序列化内部阶段。最终证据只允许 `schema/status/result/stderrEmpty` 四字段；`stderrEmpty=false` 的语义为“未证明为空”，不能单独声称观察到了字节。不得存 stdout/stderr/异常/路径/环境/网络身份及其 hash 或长度。

这是最后一次 PowerShell stderr 微诊断，额度 `0/1`。完成后，无论结果均不追加 M04/M05、新 S 探针或 Hosted Network Discovery；不运行 Final Full 0/1、Final QA 0/1，也不改生产。若 PASS，只形成最小生产修复提案，明确内置模块来源与信任、Win10/Win11、PSModulePath、管理员权限和 stderr fail-closed；不能推断完整 production discovery 只有这一故障。若 `UNRESOLVED`，形成生产发现实现方案决策卡，至少比较 PowerShell 成功协议重设、只读 Windows 系统接口和维持冻结。任何生产实施仍待网页版决定；后续需先受控 Win10 P01—P08 全 PASS 且 privateCandidatePresent=true，才可恢复 Final Full。

H1/H2 历史 2/2，P02 仍 FAIL、P03—P08 未到达。禁止 Get-Net*、网络查询和网络/系统配置修改、模块安装、监听或端口绑定；不进入 LAN HUMAN、Batch5、OCR、main、tag、Release。Master/T5 为 GPT-6 Sol/Medium；此轮不用 Astra。完成证据、RESULT、Review、仅开发分支 commit/push 后冻结 T5 并交网页版决定。
