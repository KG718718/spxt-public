# FAST DELIVERY AUTONOMOUS LOOP V1

2026-10-15 用户直接批准连续交付。基线 c3c7d0fbd885e19fff8ba1003deb2d16585f175e，local/origin/GitHub同SHA；公开分支 codex/lan-fresh-trial-v1.1。历史C1-C3、R1 Smoke、R3及LC01/U27全部FAIL保留；本授权取代“停止本地工程”和Candidate冻结的限制，不增加旧Smoke/R3/诊断额度。

唯一Master 01a0db0e-c950-79e0-8e11-07155e0742f2；原FRESH-T2 Thread 01a13948-7433-7571-8330-a09bfd12a0dc、bea7工作树、codex/fresh-t2-installer-ci优先复用。Execution实施/local commit/主动回Master，Master独立Review/集成/非force同步/中央触发。独立QA长期Thread在Candidate PASS后参与。禁止普通sub-agent/后代，不恢复缺失T1。

顺序：P0真实Runtime/Helper/Launcher/完整fresh-only Setup EXE及来源身份 → P1真实隔离fresh安装/后台/loopback Admin/拒绝旧数据 → P2自动可信物理Private LAN/首次明确授权/双监听/固定端口/子网/最小Firewall/异常fail closed → P3安装后Runtime浏览器双账号/权限/保存附件/重启持久化/核心26-742 → P4独立QA同一EXE、用户物理Win10双设备验收。

本地普通实现/测试/构建问题自主闭环，不为局部失败新建研究Batch。R3十二TIMEOUT共同阻塞及MISSING_MOCK oracle缺口、raw临时落盘需处理；可做等价确定性测试重构，但不删场景、不降低真实安全证明、不只加超时、不冒称已证明历史唯一根因。raw stdout/stderr仅内存处理，不持久化或上传。未知不能计PASS。每次修改本地反例+Master独立Review。

预算：恢复原Build-First Candidate 0/2，独立QA 0/1；新Smoke/R3/Full/U27/LC01/额外微诊断0。真实本地构建/门禁/Review后才Candidate，建议45分钟硬超时。首PASS即独立QA同一EXE。首FAIL须新证据、实际修改、本地复测/Review且资源恢复可信才第二次；第二FAIL或唯一QA FAIL即STOP Hosted。每次attempt计数，历史预算不清零。

必须STOP：架构/安全权限模型改变、真实数据/越权/泄露风险、需覆盖未知数据、需放宽公网/防火墙/授权、Runner隔离/系统恢复无法可信证明、核心安全无等价验证、额度耗尽、main/tag/Release或内部SPXT需求。其余普通工程持续推进。

仅自动+QA通过后交付 K-SESSION-Fresh-Trial-1.1.0-beta.4.exe、source/run/artifact/EXE SHA256/说明；状态 FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING。物理网卡、UAC、Firewall授权、第二设备、实际双启动、Windows登录自启保留人工，不以合成或手动重启冒充。不访问内部SPXT，不清未知文件/历史工作树。

## 当前编排

FRESH-T2 / P0：RETURNED → REVIEWED → INTEGRATED（实构建source2f40a30d，33,553,023-byte完整EXE；整合3086264c，见FAST-P0-MASTER-REVIEW.md）。原local基线2d694f24已安全合入Master授权757f7399。原Thread/worktree继续Candidate准备RUNNING；本地131项5FAIL、准入/无raw/Job与安装后验收仍须闭合，Candidate0/2、QA0/1未触发。不把P0构建PASS当安装/产品PASS，不交用户包。Hosted仅Master触发；Execution不得push/创建trigger/后代。不要求每轮长报告。
