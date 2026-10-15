# Fresh Firewall R2 — Master 独立 Review

2026-10-15。结论：**LOCAL TEST/DIAGNOSTIC REVIEW PASS；历史 Hosted 首因 UNKNOWN，整体恢复仍 BLOCKED。** 本轮不是 Smoke/Candidate/QA PASS，也未达到用户列出的全部真实产物构建完成条件。

## 正式回单与来源

原唯一 FRESH-T2 thread 01a13948-7433-7571-8330-a09bfd12a0dc 向准确 Master 01a0db0e-c950-79e0-8e11-07155e0742f2 主动正式 RETURN，目标已核对。原 bea7 工作树/分支保留，tracked clean。安全 merge 锚 e1943299 不重复整合；local fbb6e9eb21deaf9524bf88c635659c9bdad7ffdf 经独立实际复验后，仅 cherry-pick 自有9文件提交，集成为 73f79d8e59760ab45719fc5420747acc07bdcebf。两者 tools/.github 字节和模式完全一致。

## 已确认与不能推断

原测试在当前 Win10 初次12/12 PASS，未复现 R1 Smoke。旧非exact接受23或25且无模拟变更的判定，能把 adapter 读取中止、route记录后中止、unknown-virtual读取中止等异常当作合格拒绝；这由实际系统 PowerShell + 完整mock + 原生产脚本受控反例证明。它是测试 oracle 缺口，可能掩盖错误，**不能解释历史顶层 FAIL，也不证明产品缺陷**。

保持原成功/拒绝集合及模拟变更断言；另加固定生产协议/拒绝码与预期退出类别的 PathProven、完整inline mock覆盖、严格整行读取token。实际目标脚本、systemPowerShell验证、20秒timeout及窄子环境未放宽。成功只有exact-binding产生模拟规则，其余11场景没有模拟规则变更。原13共享harness最终零diff，不增加继承环境观察副作用。

诊断仍是原4字段；新增有限 scene_phase_exitClass，只能固定12名称/阶段/退出类别。已知child无observation保留UNKNOWN_UNKNOWN；未知/重复child、缺失成功观察、敏感extra、矛盾COMPLETE、非法Go JSON均不能PASS。实际CLI以及实际build.ps1的无安装stub验证接线，不只是静态字符串检查；raw stdout/stderr/异常/路径/网络正文没有上传。

## Master 实际独立门禁

- 冻结fbb6e9eb，固定Node24.21.0 EXE SHA核验、Go1.27.1、CGO0/local/offline；Master独立owned物理缓存/fixture。
- 原Firewall13/13；精确Fresh2/2及12/12固定观察；独立4个异常反例；Go vet 全PASS，fail0skip0。
- 全Fresh/R1 Node141/141 + 原beta4兼容/Go报告20/20，合计161/161，fail0skip0；不是核心26/742。
- 7个变更CJS实际syntax PASS；实际生成overlay/Go测试编译执行、T2额外test-c/gofmt PASS；嵌入PS由系统PowerShell实际执行，独立PS文件零修改。
- 测试环境恢复、fixture为空、源码未变化均true；Go/PS子命令同步等待退出，没有启动产品、真实安装或真实Firewall操作。保留owned缓存与旧证据，不清理历史。
- 固定摘要字段、12场景/4反例标识、纯布尔及来源严格检查后才复制到evidence/fresh-firewall-r2-{local,master}.json；私有原始日志未入Git。

## 安全范围与停止

只8个测试/诊断文件和T2结果文档。生产Helper/Launcher/Node、网络发现、安全/身份/binding/Private、Setup/Runtime/事务/rollback、业务schema及全部workflow/trigger零diff。没有访问内部SPXT或真实业务数据，不改Windows配置/main/tag/Release，不push执行分支。

没有查明 Hosted 与本地差异的因果关系。按用户“原因UNKNOWN时不重复完整流水线碰运气”规则，本轮真实Helper/Launcher及完整payload **NOT_RERUN**；R1真实构建只能作为历史事实，不能补作R2通过。R1 Run38674907559仍FAIL/Smoke1/1；本轮Hosted0，Candidate0/2及QA0/1冻结。只完成定点验收补强，不能声称生产修复完成。

建议仅交网页版决定是否另批一次独立Helper原13/Fresh2/12场景Hosted，携带固定子阶段及退出类别、可信来源和环境恢复；不重跑旧Smoke，不动Candidate/QA，不在本轮建立或触发任何新Run。新专项若批准，只解决Hosted定位，不能替代完整payload/Setup/候选/最终QA。
