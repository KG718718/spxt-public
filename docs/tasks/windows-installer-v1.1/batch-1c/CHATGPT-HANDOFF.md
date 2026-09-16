===== CHATGPT HANDOFF BEGIN =====

项目：
K⁺-SESSION 公开版 Windows 一键安装重构
仓库：KG718718/spxt-public

当前 Batch：
Batch 1C-R4 — Latest Safe 4.x Selection + Migration Readiness

结论：
PASS

一句话结论：
推荐精确pdfjs-dist@4.10.38的build/pdf.mjs，它是核验时最新正式4.x。三候选同样本三轮全部通过；本轮仅选型和静态迁移计划，未正式降级，仍停在Batch1C。

【本轮实际完成】
- R3七份报告审查、提交并仅推送开发分支；两处末尾空行用追加提交修正，未改写历史。
- 官方npm版本列表、Mozilla/GitHub安全公告、release/tag、维护信息核查。
- 三版全新隔离安装；复用R3八份PDF字节，各三轮，共72/72通过。
- 输出选型矩阵、逐文件迁移计划及本交接卡。

【关键数字 / 技术事实】
- source commit / HEAD / 最终checkpoint:
  a760f0544dc5b966bad33c91b38204f504f97bb2
- Node:24.21.0 x64；npm:11.19.0。
- Runtime大小、Artifact、安装包SHA256:N/A，未生成。
- 4.10.38隔离node_modules:37,350,576字节/35.62MiB，356文件，1个生产包；必需传递包0。
- 正式生产图未修改；不能把实验单包说成整应用已无原生依赖。
- 原始矩阵SHA256:
  150b10d4dde157da22365b0d5bcedb83c42b62d601b54059ec9b630d21403113

【实际测试结果】
- 4.8.69:8/8×3；0警告；canvas/Skia/native加载均0。
- 4.9.155:8/8×3；0警告；canvas/Skia/native加载均0。
- 4.10.38:8/8×3；每轮1条上游generic Node兼容提醒，错误0；canvas/Skia/native加载均0。
- 三版文字、六项transform、坐标、页数与R3两条基线完全一致；扫描PDF正确为空文本。
- 文件白名单与禁addon下执行；读文件/模块追踪均在许可范围，网络尝试0，包目录前后hash相同，未自制polyfill或改node_modules。
- 实际安装均省略optional；.node/.dll/.exe/WASM均0。4.10.38仍声明optional canvas^0.1.65，默认安装不保证无native。
- 官方公告核验：2024 GHSA-wgrm、2026 GHSA-hq66，以及2018 GHSA-7jg2均未命中三候选。仅截至核验日期已查范围，不等于绝对安全。

【未完成 / 未验证】
- 未正式迁移，未跑完整发票字段/上传/业务UI回归，未重建Runtime。
- 未做系统级断网、干净Win11 G1、Launcher/Setup/OCR。
- 4.x为历史major；未找到持续维护承诺，也未找到明确官方EOL日期。generic Node支持不能扩大到渲染。

【当前阻塞】
1. R4无完成阻塞；正式迁移仍需上级批准。
2. 保留pdf-parse2.4.5会直接带回canvas0.1.80和PDF.js5.4.296；必须联合处理。
3. 现有构建器仍要求23包、include-optional、canvas/wasm及旧许可门禁，需随迁移重审，不能绕过。
4. 原Runtime许可与G1门禁尚未解除。

【本轮修改范围】
- 新增:PDF-4X-SELECTION.md、PDF-4X-MATRIX.json、PDF-MIGRATION-PLAN.md。
- 修改:RESULT、本卡、公开PROJECT、MASTER-PLAN。
- 明确未修改:正式package/lock/server、业务JS/HTML/CSS、Install/Start、构建器、旧Runtime/发行物。
- 实验脚本、依赖、原始记录在E盘源码外，不进Git。

【Git状态】
- branch:codex/windows-installer-v1.1。
- HEAD:上述a760f05；working tree:R4四份tracked MD修改、三份新报告，暂存区空。
- commit:R3报告51a014b及空白修正a760f05；R4未提交。
- push:仅R3最终checkpoint已推指定分支并回查；R4未推。
- PR/Release:本轮均无；main是否修改:否；v1.0.0是否修改:否。
- main/tag仍84cbb324a4f63bef094d2c21d70eba841205a7a7。

【安全与边界】
- 是否访问内部版/公司版:否。
- 是否包含真实业务数据或账号/Token/密码:否。
- 是否修改业务逻辑:否；本轮没有启动应用服务或发邮件。

【下一阶段判断】
- 是否允许进入下一Batch:否，不进入Batch2。
- 建议另行批准Batch1C迁移专项；预计修改package/lock/server、modules/host-smoke、build/common/verify、必要许可索引与回归测试。
- 计划明确disableWorker无效、worker文件仍需保留；enableScripting不是getDocument参数，不用无效配置冒充安全措施。

【需要 ChatGPT 网页版决定】
1. 验收R4并确认4.10.38精确选型，接受历史major及固定generic Node提醒风险。
2. 是否批准联合迁移、生产图与测试/许可门禁适配；未批准前保持正式代码原样。

【详细报告文件】
docs/tasks/windows-installer-v1.1/batch-1c/：
PDF-4X-SELECTION.md、PDF-4X-MATRIX.json、PDF-MIGRATION-PLAN.md、RESULT.md、CHATGPT-HANDOFF.md。
原始证据:output/windows-installer-v1.1/batch-1c/pdf-4x-r4-01/，仅E盘源码外。

===== CHATGPT HANDOFF END =====
