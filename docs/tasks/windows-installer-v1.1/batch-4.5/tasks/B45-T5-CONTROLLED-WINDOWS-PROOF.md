# B45-T5 — Controlled Windows Production Discovery Proof

你是执行任务，不是项目主控。TASK ID：B45-T5-CONTROLLED-WINDOWS-PROOF；ROLE：原B45-T5 Execution续行；PARENT：Batch 4.5。唯一Master与准确回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`。公开仓库`KG718718/spxt-public`；原工作树`E:\CodexWorkspace\CodexWorktrees\b4-qa\public-source`；原本地分支`codex/b45-t5-integration`；冻结基线`b8e3440358af1ca5f2d46455d052d77c211a4a46`，公开集成基线以派单时Master给的SHA为准。不要新建线程、分支、工作树。先读原工作树AGENTS.md/PROJECT.md、本Batch SPEC/PLAN/ACCEPTANCE、Master给的最新 `FINAL-COST-CONTROLLED-VALIDATION-APPROVAL.md` 和本卡；旧止损被本次有限授权取代，但H3/H4永久不授权。

本阶段单一目标：在已核实的当前 Windows 10 Pro x64 19045 开发机上，对**当前未放宽的生产 `public-lan-network.js`** 实际执行 `resolveSystemPowerShell()`、`runWindowsDiscovery()` 和 `discoverWindowsLan()` 的只读验证，形成固定、隐私安全 JSON，证明P01—P08。不得mock这三个真实调用来冒充本机proof；合成夹具可用于P05/P06安全筛选反例。不得执行或改动Firewall/网卡/路由/DNS/网络Profile/Registry/系统配置、不得创建持久listener、不得读取内部SPXT或真实业务数据。绝不向终端、报告、提交、回单输出实际IP、网卡名、GUID、MAC、hostname、gateway、DNS、route原文、stdout/stderr、用户路径，亦不得记录它们的hash/长度。

允许只新增/修改 `tools/tests/lan-host/` 下的窄proof工具、合成测试与本任务RESULT，及批次安全证据JSON；**禁止改 `public-lan-network.js`、其他生产/升级/Firewall/Launcher/业务代码、既有历史测试语义**。Proof JSON只含固定schema/status/platform=`WINDOWS_10`/P01—P08布尔或固定安全枚举、sourceCommit与productionNetworkBlob SHA等非敏感Git身份，`privateCandidatePresent`单布尔可记录；不得含任何网络身份及原始错误。如生产调用失败，仅记录固定已知错误码分类，不记录异常正文。`NETWORK_DISCOVERY_FAILED`即停止本阶段并主动回报Master，不得继续Hosted策略或Full。

P01系统PowerShell安全路径确认；P02实际系统discovery命令正常执行；P03生产JSON解析通过；P04`discoverWindowsLan`结果符合生产闭合schema；P05合成虚拟/VPN/tunnel仍拒绝；P06 RFC1918/private边界仍有效，实际候选只以布尔记载；P07未调用`0.0.0.0`或创建listener；P08确认此proof未改Windows网络配置。请用测试代码/调用清单和前后只读状态判定，不以肉眼观察填PASS。若实际没有可用private候选或系统不是Win10，报告事实并停止供Master判断，不得造PASS。报告中的PASS不得代表第二设备/企业LAN或Firewall通过。

先本地反例与隐私审查，再真实只读proof，保存单份固定JSON及RESULT；运行适用LAN合成、兼容/事务及Firewall安全本地测试，注明每项测试来源与fail/skip。local commit冻结，不push/Actions/Hosted、不动main/tag/Release。完成前主动 `send_message_to_thread` 准确Master ID并核验返回目标，结构化字段：【TASK ID】【状态 PASS/FAIL/BLOCKED】【完成内容】【修改文件】【测试结果】【local commit】【已知风险】【需要主控处理】。若发送失败按AGENTS记录DELIVERY FAILED，保留现场。**本卡只授权阶段A；Master独立Review安全proof后，才会另发阶段B Hosted合成策略任务。**
