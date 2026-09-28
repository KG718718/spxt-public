# Batch 4.5 — Native Discovery 有界可行性门槛：网页版决策卡

## 【结论及适用范围】

**FAIL — NATIVE ROUTE NOT ACCEPTABLE（限本轮零新依赖、CGO=0、小型 PoC 的准入条件）**。这不是“Windows 原生 API 不能实现 LAN 发现”的结论。实际情况是：本轮未完成任何真实 IP Helper 数据读取，也未完成 NLM COM 的 adapter→Private profile 关联，因此 PASS 和“IP Helper 已证、NLM 未证”的 PARTIAL 均不成立。唯一真实 Win10 research PoC 额度 **0/1 未用**，没有理由用它只检查函数入口。

生产 P02 仍 FAIL / `DISCOVERY_COMMAND_FAILED`，P03—P08 NOT_REACHED；Batch 4.5 继续 `BLOCKED — PRODUCTION DISCOVERY P02 FAILED`，Final Full0/1、Final QA0/1 均未用，无 beta.3 最终 Artifact。

## 【已确认事实】

唯一 Execution `B45-T6-NATIVE-FEASIBILITY` / thread `01a0e33e-7152-7d92-bbc2-cbf06efaed94`，原任务 worktree `E:\CodexWorkspace\CodexWorktrees\1ed3\public-source`，baseline `b00749acee445d0a81b90748df851f1190a33cf0`，local `b993dc60e8e1141426984e72db243a1349db1125` 已主动回单。Master 独立审查七文件 research/报告范围，production `public-lan-network.js` blob 仍 `c3208b47cd93cf92989622b633a98cf994ce8712`；以固定 Go 1.27.1 Windows amd64、CGO=0、离线、零外部模块复验 F01—F15 15/15、`go vet`、build 均通过。研究 `main` 固定输出 REJECT 并退出 71，未执行 EXE、未运行真实网络 API、未保存实机网络身份。Master 将来源整合为 `cd9b75a`。

## 【技术约束与证据边界】

研究代码只给出了 System32 限定 DLL 加载和 `GetAdaptersAddresses`/`GetIpForwardTable2` 入口实验函数；函数未运行，且没有解码 adapter/unicast/route 结构，`GetIfEntry2`/`GetIpInterfaceEntry` 与 NLM COM 均未实现。合成筛选输出明确为 `SYNTHETIC_ONLY`，不能当真实 Private 候选或生产规则等价。普通用户调用权限、Win10 真实返回、NLM 同 GUID 多连接/失败路径及 Win11 实机均未证。官方 API 的存在只给文档级兼容，不是可用性验收。

小 PoC 若继续走无外部依赖手写 ABI/COM，需要逐字段结构布局、vtable/HRESULT/引用释放和网络快照一致性审查；执行与 Master 均判断这超出本轮已批准的低成本、可审查范围。这个成本判断是工程评估，**不是已实测证明 cgo、管理员或第三方库必需**。不能写成“原生路线必需管理员”或“x/sys/windows 已证明可解决”。

## 【可选后续及影响】

**A｜转回 PowerShell 封闭成功协议。** 需要另批协议设计与测试预算；若改变“stderr 非空即失败”，必须明确批准安全语义，并证明非终止错误、provider 异常、混合输出和部分结果不会被忽略。不能直接把旧 P02 视为已修。

**B｜重新定义原生路线的依赖和预算。** 先选可审查的 Windows 绑定/COM 方案及精确锁定版本、许可证、离线构建、供应链和 EXE 体积影响，再设真正能读取 IP Helper + NLM 且在普通用户 Win10 下验证的一次性范围。这是**新授权**，本轮剩余 0/1 实机额度不能自动带入扩大范围，更不能直接创建生产 helper。

**C｜继续冻结 LAN Host。** 保留单机 beta 历史验收，不交付 P02 FAIL 的 LAN 候选；没有新增工程或 Hosted 消耗。

## 【需要网页版决定】

请在 A、重新定义后的 B、C 中选择下一步。无论选择何项，当前均不授权生产实现、继续 T6、额外本机/Hosted 探针、Final Full、Final QA、Batch5、OCR、main、tag 或 Release。详尽接口/成本证据见 `NATIVE-DISCOVERY-FEASIBILITY.md`、`NATIVE-DISCOVERY-FEASIBILITY-RESULT.md`。
