# LAN2-LC01 — Launcher Lifecycle 独立诊断

日期：2026-10-09。来源及唯一回单 Master：`01a0db0e-c950-79e0-8e11-07155e0742f2`。

## 授权与身份

- 你是执行任务，不是项目主控。TASK ID：LAN2-LC01；ROLE：长期 Execution Thread；父背景：冻结的 LAN-2，独立任务不解冻 Batch。
- 仓库仅 `KG718718/spxt-public`。冻结代码基线 `5121d8195c1986c83dca9ad0f681463868084f04`；历史 Full #4 `36388264496` 受测 `2e9294d9a61426dac428f7c8ff8a12d36a4bbbb8`，FAIL / Artifact `10955343405`，历史不改。
- 唯一工作树 `E:/CodexWorkspace/CodexWorktrees/lan2-lc01/public-source`；任务分支 `codex/lan2-lc01-launcher-lifecycle`。只读取公共 AGENTS.md、PROJECT.md、Launcher 与 beta.4 测试/历史公开证据；不得读取原 SPXT 内部版。
- 配置模型继承本任务默认设置；单线程有界审查，不使用 Dot、普通 sub-agent、collaboration.spawn_agent 或任何后代 Thread。

## 唯一目标

定位 `second Launcher did not exit`：对照单实例锁、dispatchExisting()、Windows 消息循环/窗口/派发、退出机制，与 Full #4 第二 Launcher 测试门禁；判别测试预期、第二实例交互、进程等待或实际产品缺陷。证据不足写 UNKNOWN。

## 可修改及禁止范围

- 仅本任务目录的报告/固定证据；如确有必要，可新增明确 research-only 的小型诊断 harness/测试 overlay 于 `tools/research/lan2-lc01/`。不得修改现有生产、现有测试/门禁、manifest、Setup、Runtime、identity、transaction、rollback、业务 schema 或旧证据。
- 不 push、不合并、不触碰冻结分支/main/tag/Release；允许在任务分支 local commit。零 GitHub Actions/Full/QA。
- 禁止修改防火墙、网络配置、注册表、服务、实际部署或真实业务数据；不访问实际 LAN、19 主机或内部版，不使用真实身份/凭据/邮件。
- 已有公共证据目录可只读：主控公共 checkout 下 `.test-work/lan2-full4-fixed-evidence-20260928/`（六个固定 JSON）；`.test-work/lan2-full4-master-review-003cdb3/harness/`（生成的 Full #4 Go 测试）。禁止改这些历史文件或读取无关测试/其他用途资料。

## 顺序与预算

1. 先静态审查及既有证据，给出源码行号、实际调用链、时间边界、锁成功/失败分支和消息接收条件。
2. 静态证据足够则结束；不足时先向 Master 发一个精简 milestone：候选最小故障集合、拟用专项脚本、断言、共享资源及清理方案。此 milestone 不是最终 RETURNED。
3. 真实 Win10 独立合成 instance 专项最多一次（0/1）。须先 Master Review harness/计划，才能启动；不得循环、重跑或增加另一个探针。可以先做不会启动生产 EXE/网络的纯合成函数测试及离线编译。仅复用已存在工具链，不安装依赖或下载发行包。
4. 若运行专项：生产源码保持原样；研究 EXE 只留任务 .test-work，明确不打包/不发布；instance 与用户身份完全合成，LAN 关闭，至多 loopback临时资源且先确认隔离；窗口/进程只记录固定类别/布尔。限定总时长，关闭自己的 PID/句柄，清理不等于删除工作树或历史证据。不得强杀无关进程。
5. 得到结论即停止。零 Full #5、零 QA；普通不确定性可以 UNKNOWN 收尾，不增加诊断轮次。

## 唯一交付

RESULT.md 中给出：(1)已证实故障位置；(2)产品/测试/UNKNOWN 及证据；(3)最小修复建议，明确测试或生产范围；(4)低成本专项验收方案；(5)是否需要产品/安全决定。区分源码可证明事实、真实历史事实及推测，不把本地测试追认为 Hosted PASS。

详细证据保持精简并排除真实路径、网络身份、账号、Token、Cookie、密码、业务正文；公开源码路径/提交/固定合成 ID 可用。记录实机预算是否使用及为何；生产和冻结分支 diff 必须零。

完成前 local commit，向 Master `01a0db0e-c950-79e0-8e11-07155e0742f2` 用 send_message_to_thread 主动结构化回单并核对目标；失败写 RESULT / DELIVERY FAILED，Master watchdog恢复读取。回单字段：TASK ID、PASS/FAIL/BLOCKED、五项结论、修改文件、实际测试、local commit、风险/待主控处理。不要生成长网页版 Handoff；Master负责Review与最后五项返回。
