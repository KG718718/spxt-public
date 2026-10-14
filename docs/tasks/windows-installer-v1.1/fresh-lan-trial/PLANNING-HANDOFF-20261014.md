===== CHATGPT HANDOFF BEGIN =====

项目：K⁺-SESSION公开版
当前阶段：第一阶段Fresh LAN Trial / 最小方案
结论：PROPOSED — WEB APPROVAL REQUIRED

一句话结论：
建议交付独立fresh-only局域网试用包，历史升级/卸载重装/LC01失败保留FAIL、后续工作DEFERRED。先批准安装器限定模式、验收分工及最多2次GitHub预算，再实施。

【本轮实际完成】
- 只读核验公共仓库、9d1d8da基线与现有Setup/LAN/验收接线，提交最小矩阵F01—F09和预算。
- 已确认当前Setup接受可信F3 beta.2升级；现有双会话测试使用repo/server.js、fetch和合成发现，不等于安装后浏览器完整验证。

【关键数字 / 技术事实】
- repo：KG718718/spxt-public；方案source基线：9d1d8da21a1127b430b992b9681a46307134f5ec。
- 沿用Node固定24.21.0；npm、Runtime大小/文件数/生产依赖数、新Artifact/EXE SHA256：N/A，本轮没有构建。
- 提议包：K-SESSION-Fresh-Trial-1.1.0-beta.4.exe；appVersion1.0.0、dataContractVersion1、Runtime identity/schema/AppId不变。

【最小交付与自动验收】
- 新Win10 x64 Host安装→本机创建Admin→明确选择可信LAN/授权Firewall→第二设备浏览器登录，使用测试数据。
- 新试用构建必须在写入前拒绝旧登记/Binding、同名快捷方式、已有业务instance、非空/不安全目标及运行冲突。不删旧环境、不迁移、不提供绕过开关；旧标准模式/升级信任/事务/rollback不变。这一更严格安装器模式须明确批准，不能只改文件名。
- 独立fresh入口只构建一份candidate，验证实际Setup、安装身份/零种子、真实单实例锁、Host-only Admin、双监听/selected subnet/端口安全、实际安装payload的无头浏览器登录/保存/附件/双会话、正常退出再启动后的数据和LAN配置保持、核心26 suites/742 checks fail0skip0及Artifact隐私/SHA。
- 不搬入旧TestSetup整体卸载重装链，不下载F3、不构建六个upgrade fault包，不降低旧verifier或历史PASS条件。

【自动与人工边界】
- Hosted虚拟网卡必须继续被生产helper拒绝；合成/隔离LAN服务及Private最小规则证据显式TEST_ONLY，不进入用户包。
- 真实网卡选择、UAC、可见向导/Launcher启用、实体双设备连通及第二Launcher弹窗/自然退出，由最后一轮Win10人工闭合，不能静态检查冒充实测。
- QA通过后交同一EXE字节、source/run/Artifact/SHA；仅标FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING，不称企业LAN认证。

【实际测试结果 / 未完成】
- 本轮测试/Actions均0，新矩阵全部NOT RUN。
- 旧Full、U27及LC01继续FAIL；工作DEFERRED，不改成PASS或skip。U27网络恢复FAILED也未修复，新路径不调用其断网链。
- 无最终试用包，未创建分支/Execution/QA或worktree。

【预算建议】
1. Fresh Trial Candidate最多1次，本地门禁及Master Review后运行。
2. 独立QA最多1次，仅Candidate PASS后；下载并复核同一待交付EXE，重新fresh验证，不能用不同rebuild冒充。
3. Diagnostic/旧Full/U27/LC01均0次，不借预算、不无修改retry；任一FAIL/UNKNOWN/收尾未证即STOP。
合计2次；建议每次45分钟硬超时，正常工程估计总25—55个job分钟，不是计费承诺。

【修改范围 / Git状态 / 安全】
- 仅方案及治理Markdown；当前治理分支codex/lan2-manual-host-v1.1，基线HEAD9d1d8da；计划批准后另建codex/lan-fresh-trial-v1.1。
- commit/push仅本轮方案治理，最终同步HEAD由Master另报；保留已有.test-work/node_modules和旧worktree，未清理。
- PR/Release：无；main/v1.0.0未改；未访问内部SPXT、未含真实业务数据/账号/Token/密码、未改生产功能或测试。
- 唯一Master及长期Execution+独立QA模式不变；禁止普通sub-agent及后代Thread。

【下一阶段判断 / 需要网页版决定】
目前不允许工程执行。请批准或调整：fresh-only构建/拒绝旧环境门禁、beta.4 Fresh Trial标识、上述自动/人工矩阵、Candidate1+QA1预算。批准后按原长期Thread治理实施；人工FAIL停止，人工PASS仅为fresh限定试用，不承诺迁移、升级/卸载重装认证或其他平台。

【详细报告文件】
docs/tasks/windows-installer-v1.1/fresh-lan-trial/MINIMAL-ACCEPTANCE-PLAN.md
旧证据：batch-lan-2/LAN2-U27-R2-HOSTED-RESULT.md及原Full/LC01记录。

===== CHATGPT HANDOFF END =====
