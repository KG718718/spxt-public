# Batch 4.5 — M00—M02本机止损｜2026-09-27

**BLOCKED — UTILITY SERIALIZATION PATH STDERR; ROOT CAUSE NOT UNIQUE。** 用户只批准的一次真实Win10 M00→条件M01→条件M02链已完成。原B45-T5 thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`、原worktree/branch保持并再次冻结；唯一Master `01a0db0e-c950-79e0-8e11-07155e0742f2`，旧Master只读历史。

## 已确认事实与证据限度

历史S01七字段`STARTUP`原样保留；因旧S01用`ConvertTo-Json`，正式解释为`PRE_NETWORK_UTILITY_SERIALIZATION_STAGE`，不称纯shell启动失败。当前真实Win10 Pro x64 build19045，生产`public-lan-network.js` Git blob `4e13e944472f845675fe73d176f063c4fe97f6ed`未改。原T5合成提交`a9abd822ad94ad756d23680a64484451d0e793e5`/`69cd3d1861523bc84881aa90b50333a2e5a29c06`经Master独立41/41及执行器、payload、六字段白名单Review PASS。唯一真实链local提交`2a36277003060e132032831bdf8a312cabec8f1e`，Master核验安全JSON、唯一调用、生产blob及diff；未重跑。

真实固定JSON：`{"schema":1,"status":"FAIL","layer":"UTILITY_SERIALIZATION","M00":"PASS","M01":"PASS","M02":"FAIL"}`。M00纯语言/.NET固定stdout正常，M01独立进程显式加载`Microsoft.PowerShell.Utility`后固定stdout正常；M02独立进程运行与旧S01精确等价的`ConvertTo-Json`最小序列化，固定输出满足校验但stderr非空。由此排除“当前安全调用环境下纯.NET常量输出必然报错”和“显式Utility导入本身必然报错”。**没有证据把M02的stderr唯一归于ConvertTo-Json内部实现**：M02独立进程仍可能在自动加载、管道/对象序列化或相关宿主路径发生差异。生产完整脚本还包含网络cmdlet与`ConvertTo-Json -InputObject @($result) -Compress -Depth 3`；其stderr是否全部来自同一原因未证。生产P02仍FAIL，P03—P08 NOT_REACHED。

安全证据仅`evidence/pre-network-layer-live.json`六字段；无原始stdout/stderr/异常、路径、环境值、网络或用户身份及其hash/长度。未改Windows/Firewall/Registry/Service/Network/Profile/Route/DNS/Policy，未运行Hosted/Actions/Final Full/QA。

## 额度、Git与停止

历史H1/H2 2/2，不新增Hosted诊断；Final Full0/1、Final QA0/1冻结。唯一M00—M02链已用，禁止重跑或补阶段，不忽略stderr，不擅自改生产序列化/输出契约。额外8.3历史110PASS/1SKIP不改写，核心26/742本轮未运行；无beta.3最终Artifact或真实双设备LAN验收。

本轮公开主控仓库本地HEAD仍`73952c1f9b9ac85e7eb3051cec157a187e1ad77e`；主控`.git/index.lock`写入被当前工作区权限拒绝，Git HTTPS缺凭据，GitHub API写入401。更正审批/任务卡/Review/止损文档在公共根工作区**尚未commit/push**；T5上述结果仅在原worktree本地提交。公开远端未同步，不能视为GitHub验收版本。文件与local commits均保留，等待权限/认证恢复后再整合；不得绕过沙箱或让Execution代替Master push。按正式批准第12—15节停止并交网页版决策。
