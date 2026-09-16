===== CHATGPT HANDOFF BEGIN =====

项目：
K⁺-SESSION 公开版 Windows 一键安装重构
仓库：KG718718/spxt-public

当前 Batch：
Batch 1C-R3 — PDF Text Extraction Architecture Spike

结论：
PASS — viable text-only PDF alternative found

一句话结论：
PDF.js 4.8.69官方generic入口在Node24通过同一组8类合成PDF，未加载canvas/Skia，无native文件或polyfill警告。仅证明替代技术可行，不批准正式降级；仍停在Batch1C。

【本轮实际完成】
- 审查R2八份文档并提交、推送指定开发分支检查点；没有夹带依赖、日志、实例或凭据。
- 比较3个PDF.js版本的官方入口及pdf2json、unpdf，共9个配置，各3轮。
- 生成8个合成PDF/10页，独立文本核验并完整渲染检查；没有使用客户发票。
- 核对Mozilla/GitHub官方安全公告，保留失败和隔离修正证据。

【关键数字 / 技术事实】
- source commit / HEAD:
  8b177a0026f34067fb66a9ad5fa715a577ff56bc
- Node: 24.21.0 x64；npm: 11.19.0。
- Runtime大小 / Artifact / ZIP SHA256: N/A，未重建或打包。
- 可行候选：pdfjs-dist4.8.69/build/pdf.mjs。
- 候选目录：36,909,255字节，351文件；1个生产包，必需传递包0，native文件0。
- 正式生产依赖仍23；未改package/lock。
- 原始矩阵SHA256:
  d41a87e0f289ecd4d7ac73c851d78bca09253f2ed22fc5305cc44370f813219f

【实际测试结果】
- 可行候选三轮均8/8：英文、中文、多页、嵌入字体、非嵌入CMap、数字金额、旋转、扫描空文本；与基线文字及坐标一致。
- 全矩阵实际168次样本执行：141通过/27失败；另48槽位因import失败未执行，并非全矩阵通过。
- 当前5.4.296无canvas时两个入口均DOMMatrix失败。
- 最新6.3.289 legacy文本8/8，但canvas/DOM警告未消除；generic缺toHex失败。
- pdf2json4.1.0独立Buffer后8/8，但旧引擎安全谱系不足；unpdf1.8.1仅7/8，且内嵌受影响6.1.200和不完整DOMMatrix，不采用。
- 有效矩阵启用文件读取白名单、纯JS禁addon；提取网络尝试0，目录hash不变。不是系统级离线验收。
- 2024高危修复于4.2.67；2026高危影响>=5.6.83且<6.2.108。官方查询未命中4.8.69，不等于保证无漏洞。
- 最终核验：32应用文件对HEAD/冻结main零差异，diff检查和敏感模式扫描通过。

【未完成 / 未验证】
- 未迁移正式依赖，未做整应用发票字段/上传/Excel/备份回归。
- 未做干净Win11 G1、Launcher、Setup、OCR或发行包。
- 未取得4.8.x长期安全维护承诺；当前机器是Win10开发机。

【当前阻塞】
1. 无Spike完成阻塞；正式迁移须上级单独批准。
2. 4.8.69是历史版本，需接受维护成本，或继续最新官方路线研究。
3. 只替换根PDF.js不能消除pdf-parse带回的原生链；后续需联合审查删除、host-smoke适配及完整依赖图。
4. 当前正式Runtime的原生许可、ZIP和G1门禁仍未解除。

【本轮修改范围】
- 新增：PDF-ARCHITECTURE-SPIKE.md、PDF-SPIKE-RESULTS.json、SECURITY-COMPARISON.md。
- 修改：本卡、RESULT.md、公开PROJECT.md、MASTER-PLAN.md。
- 源码外保存实验脚本/样本/原始证据，不进Git。
- 明确未修改：业务代码、package/lock、HTML/CSS、Install/Start、构建门禁、旧Runtime。

【Git状态】
- branch: codex/windows-installer-v1.1。
- HEAD / commit: 上述R2检查点，8文件+303/-56。
- working tree: R3共4份tracked MD修改、3份新增报告/JSON；暂存区空。
- push: R2检查点成功，远端回查一致；R3报告未提交/未推。
- PR / Release: 本轮均无。
- main是否修改: 否；v1.0.0是否修改: 否，二者仍84cbb324a4f63bef094d2c21d70eba841205a7a7。

【安全与边界】
- 首轮自动解析读到父级第三方canvas代码并尝试addon，已作废；未读取内部业务源码/配置/数据。修正后以白名单重跑，不隐瞒该事件。
- 真实业务数据、账号/Token/密码：未读取或写入交付物。
- 业务逻辑：未修改；未自制polyfill、未改node_modules内部文件。

【下一阶段判断】
- 是否允许进入下一Batch：否。
- 原因：Spike PASS不是迁移授权或Runtime验收；不进入Batch2。

【需要 ChatGPT 网页版决定】
1. 验收上述“存在可行替代”证据。
2. 决定是否批准4.8.69迁移专项，或优先继续6.3.289纯文本边界调查/回R1许可路线；不得直接合并或降级。

【详细报告文件】
docs/tasks/windows-installer-v1.1/batch-1c/：
PDF-ARCHITECTURE-SPIKE.md、PDF-SPIKE-RESULTS.json、
SECURITY-COMPARISON.md、RESULT.md、CHATGPT-HANDOFF.md。
原始证据：E盘源码外output/windows-installer-v1.1/batch-1c/pdf-spike-r3-01/。

===== CHATGPT HANDOFF END =====
