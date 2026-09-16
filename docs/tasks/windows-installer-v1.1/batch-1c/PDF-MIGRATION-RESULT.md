# Batch 1C-R5 — 受控 PDF 迁移结果

## 当前结论

**BLOCKED — 完整回归被当前 Windows 测试环境阻断，停止在 R5；未认定发生 PDF 业务回归。** 当前 Windows 文件符号链接创建返回 EPERM，现有 startup-filesystem 套件在14项通过后中止。测试进程退出非零，不代表已证 PDF 迁移失败；后续安全反例仍未验证。没有改变 Windows 安全配置、削弱反例或修改业务规则。没有 R5 commit/push、fresh Runtime、ZIP；不能写“only G1 environment pending”。

R4 检查点 `f7dc4745b16e30b39d6e5401390d11098e84f555` 已仅推开发分支；R5变更尚在工作区。完整开发机测试通过才授权R5提交，构建必须使用新源码提交，所以本次不伪造提交身份或拿旧commit套用新文件来构建。

## 已完成的迁移

- package 删除 pdf-parse2.4.5，精确锁定 pdfjs-dist4.10.38。npm11.19.0 标准 package-lock-only 只变更根、PDF.js、删除pdf-parse和canvas的optional-only标记；Playwright及根字段重排由npm产生，版本/来源/integrity未变。完整语义差异在 lock-diff.json。
- server.js +43/-20行，仅loadPdfjs和extractPdfTextVariants：generic入口、isEvalSupported:false、包内CMap/standard_fonts、useWorkerFetch:false、page/task finally清理并保留主异常。原文本拼接、坐标重排、字段/金额规则及OCR兜底未改。disableWorker无效项移除，未添加无效enableScripting或wasm参数。
- 新鲜生产目录实际20包/977文件/41,243,947字节；测试副本另含Playwright开发依赖，不能混算成生产图。无pdf-parse、5.4.296、canvas包/平台包/Skia、.node/.dll/.exe/WASM；锁中可选元数据保留。before/after目录hash不变。
- 其余19生产包及依赖版本未变，optional审计见独立报告。构建策略锁定新lock SHA256 `111d06d74430c218ee90eb7fcc26ecb8c76888f3395f465c46f7fa1b9c7721ee`；未来锁变化必须重新审计。

## PDF证据

tools/tests/windows-runtime/pdf-business.cjs 读取并编译server原文提取函数段，不重写解析器、不启动正式实例、不改PDF.js。真实函数输出与同库页内容对照；另核对R4矩阵文字、六项transform及页数。8份PDF是R3 fixtures-v2原字节，24/24通过；每轮权限白名单+禁addon，Canvas/Skia/native和外网请求尝试0。记录固定generic提醒；故意损坏PDF产生Indexing提示单列，随后连续/并发提取正常，不把故意失败算正常PDF零警告。

迁移前函数对7类输出一致；非嵌入中文样本因未配置CMap返回空串并有loadFont警告。迁移后本地CMap正确输出中文/金额，与R4完全一致。这是本轮明确发现的兼容改善，不虚称“所有旧函数输出完全相同”。扫描PDF仍为空，不要求OCR。

## 完整公开版回归

原run-public-tests.js的26套全部执行。为启用既有hosted-only套件，在全新E盘公开代码副本中显式设置测试开关；这是Windows10开发机，不是GitHub CI。环境白名单、独立合成数据、邮件关闭；未复制任何真实数据/凭据。

首轮23套成功、3失败：

1. full-browser：Edge启动超时，未进入页面。补充Windows系统盘/测试HOME环境后在新浏览器profile复验，21项成功，含Admin/员工/审批者、页面与对比度。第一次证据保留为full-ui-evidence-first-failure，未删除。
2. product-docs：既有R4交接卡和历史RESULT边界措辞触发“部署来源描述”禁词。对迁移前f7dc474原Git文件也复现同一失败；更新本轮交接卡并把旧RESULT一句边界描述改为同义“其他用途版本”，保留历史事实及所有原生调查，未放宽测试。复验8项通过。
3. startup-filesystem：14项通过后，创建测试文件符号链接发生EPERM，测试未到达应用对链接的拒绝断言；后续反例未执行。当前25/26套完成，不能声明全回归PASS。

其余覆盖首次Admin/登录/权限/发票访问政策、普通与中文上传、Excel导出、结构化备份、停止后完整实例恢复、重启数据保留等。OCR仅原有纯文本解析测试，没有安装引擎或修改OCR实现。Runtime守卫40项、合成完整性14项、server/工具语法检查通过。

## 构建与许可状态

构建工具已适配20包、精确lock/optional策略、资源库存、额外native为0、原始许可引用及新图的NOT APPLICABLE TO NEW RUNTIME GRAPH分支；不把R1旧许可标成approved。测试模块去掉PDFParse/Canvas绘图断言，host-smoke改为调用实际server提取函数。上述为工作区实现草稿，**未在新commit上实际构建验收**。

生产依赖原始许可初步收集20包23条文件记录，含PDF.js Apache及CMap/字体原文；Node官方原许可仍待新Runtime一起纳入。最终Runtime unresolved distribution items=N/A（尚未生成最终许可集合），不是0。ZIP打包步骤暂不执行；不能用旧build-02的manifest或Node+依赖目录冒充新Runtime。

初次新文件扫描把PDF.js内部canvas.d.ts误当成Canvas包，已修正为按包目录和二进制扩展识别并复跑；没有删除任何第三方文件来通过。旧build-01/02及R1/R2调查原件保留。

## 安全核验与限制

2026-09-16重新取得[Mozilla官方公告](https://github.com/mozilla/pdf.js/security/advisories)2条、GitHub包级3条及4.10.38精确查询0命中。2024 GHSA-wgrm-67xf-hhpq影响<=4.1.392；2026 GHSA-hq66-cqwq-w95j影响>=5.6.83且<6.2.108；2018 GHSA-7jg2-jgv3-fmr4也不命中。仅截至查询日期已检查公开公告，不保证无漏洞；4.x为历史major，无已证持续维护承诺。

尚未完整恶意PDF模糊测试、加密/超大页数专项、OS级断网或Win11 G1；不承诺PDF渲染。未实施Launcher/Setup/OCR、PR/Release/main/tag操作。下一步需具备创建文件符号链接权限的隔离Windows环境补跑原套件；全部通过后才能按既定顺序提交R5、新commit构建、完整许可/Smoke/ZIP和解包验证。

## 证据目录

源码外 `output/windows-installer-v1.1/batch-1c/migration-r5-01/`：baseline.json、lock-diff.json、production-audit.json（含完整库存和许可hash）、pdf-round-1/2/3.json、pdf-business-before.json、pdf-comparison.json、public-tests.log/json、public-ui-retry.log/json、baseline-product-docs.log/json、security-evidence.json及原始公告、integrity-tests/report.json。测试实例、cache、依赖、日志、PDF样本均不进入Git。
