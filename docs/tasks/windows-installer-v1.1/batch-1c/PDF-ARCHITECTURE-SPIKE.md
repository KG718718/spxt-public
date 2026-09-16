# Batch 1C-R3 — PDF Text Extraction Architecture Spike

## 结论

**Batch 1C-R3 PASS — viable text-only PDF alternative found。**

实际找到的无原生候选是 **pdfjs-dist 4.8.69 的官方 generic 入口 `build/pdf.mjs`**，不是自制精简包。Node 24.21.0 x64 上，未安装 optional canvas/path2d、启用 `--no-addons` 和文件读取白名单，8 类合成 PDF 连续 3 轮全部通过；DOMMatrix、ImageData、Path2D 均未定义，没有 polyfill 警告，没有 canvas/Skia 加载，安装目录原生二进制为 0。

**这里只确认技术可行，不批准正式降级，也不解除 Batch 1C 的 Runtime/G1 门禁。** 4.8.69 是 2024-11-02 的历史版本；当前官方最新 6.3.289。未发现已核对官方高危公告覆盖 4.8.69，不等于无漏洞或获得长期安全维护承诺。迁移须上级另外批准，并处理完整依赖图、业务回归及长期维护选择。

## 1. R2 checkpoint

- 审查原 R2 8 份 MD，无业务源码、node_modules、缓存、临时 Runtime、日志、实例、真实业务数据或凭据。提交前 diff/check 和暂存范围核验通过。
- 分支：`codex/windows-installer-v1.1`。
- checkpoint / 本轮 source / 当前 HEAD：`8b177a0026f34067fb66a9ad5fa715a577ff56bc`。
- 提交：`docs(runtime): checkpoint Batch 1C-R2 dependency audit`，8 files，+303/-56。
- 初次 GitHub 连接重置/超时；最终使用本次命令级 HTTP/1.1 普通 push 成功，没有永久改 Git 配置。
- `git ls-remote` 已确认开发分支同 SHA；main / v1.0.0 仍为 `84cbb324a4f63bef094d2c21d70eba841205a7a7`。
- 本轮新增 R3 报告没有额外提交或推送。无 PR、Release、main 合并、部署、tag 修改或 force push。

## 2. 实验隔离及有效性

仅使用已授权公开源码副本；所有安装、合成 PDF、脚本和原始 JSON 位于项目 E 盘源码外：
`output/windows-installer-v1.1/batch-1c/pdf-spike-r3-01/`。

正式 package.json、package-lock.json、server.js、业务 JS、HTML/CSS、Install/Start 和构建许可门禁不变。不是构建 Runtime，不生成 Launcher/Setup/ZIP，不实施 OCR。实验所用 Node 复用先前已校验的官方 24.21.0 x64 工具链，npm 11.19.0；本机 Windows 10 Pro 19045，不冒充干净 Windows 11 G1。

### 必须披露的首轮失效与修正

1. 首次字体子集遗漏数字，pypdf 独立断言失败；失败样本保留于 `fixtures/`，不进入比较。重新生成的 `fixtures-v2/` 为唯一有效测试集。
2. 首轮 Node 向父目录解析缺失 optional 包，自动读取了实验目录外的第三方 canvas JS，并尝试加载 addon（被 `--no-addons` 拒绝）。没有读取内部业务源码、配置、数据或真实附件，但不能宣称首轮完全隔离。该轮 `runs/` 作废。
3. 修正为 Node `--permission`，仅放行当前候选目录、同一 fixtures 和探针文件；纯 JS 候选始终 `--no-addons`。验证越界 fs 读取抛 ERR_ACCESS_DENIED、原生加载抛 ERR_DLOPEN_DISABLED。A 基线单独允许其已安装 addon，所以不能视为强沙箱。
4. 同时修正测试工具的 Windows 资源路径尾斜线、6.x cleanup API 用法。它们是探针错误，不能归咎于 PDF 功能。
5. pdf2json 4.1.0 的 parseBuffer 忽略池化 Buffer.byteOffset；`runs-v2/` 仅 1/8。用 Node 公共 API 复制成独立完整 Buffer 后复测 8/8。没有改第三方源码。
6. 最终采用 `runs-v3/matrix.json`。此前全部证据保留，不删除，不冒充最终通过。

未修改任何 node_modules 文件。所有候选安装前就按独立清单使用 npm `--omit=optional`（A 除外），不是手工删包后假称正式受支持。正式 Runtime 的 include-optional / 原生许可门禁没有被改动。

## 3. 同一测试集与判据

| 合成文件 | 验证内容 |
| --- | --- |
| 01-english.pdf | 英文普通文本 |
| 02-chinese.pdf | 中文名称/金额，嵌入 Noto Sans SC 子集 |
| 03-multipage.pdf | 3 页、逐页标识/金额/顺序 |
| 04-embedded-font.pdf | 嵌入 Vera TTF、字母数字 |
| 05-cmap-nonembedded.pdf | STSong-Light 非嵌入 CID 字体、UniGB-UCS2-H、中文与数字 |
| 06-numbers.pdf | 合成发票编号、合成税号标识、前导零、金额/税额/合计 |
| 07-rotation.pdf | 页面旋转 90 度、金额及坐标 |
| 08-scanned.pdf | 仅图片，无文本层；预期空文本，不要求 OCR |

8 PDF / 10 页，全部由脚本生成，无真实客户发票。pypdf 先独立核对页数与预期字符串；按 PDF 技能用 Poppler 渲染全部 10 页并目视检查，排除无效样本。原始字体许可证和下载来源保留；测试字体/Python/Poppler 不进入产品依赖。

判定同时检查：加载成功、页数、每页必需字符串（仅归一空白，不改数字/汉字）、扫描样本为空、文本坐标是有限值。C4 generic 与 A 的所有样本文字和 x/y 坐标逐项一致。不是仅判断“没有抛异常”。

每个候选运行 3 个新 Node 进程。每轮使用相同 PDF SHA256。所有候选安装目录测试前后文件/哈希不变。安装与资料收集联网；提取阶段用测试级 fetch/http/https/net 拒绝守卫，尝试数均 0。**不是系统级断网证据，不替代 G1。**

共 9 个入口配置、27 次新进程：计划 216 个样本槽位；48 槽位因两种入口导入失败未执行，实际 168 次样本执行，141 通过/27 失败。不可把整个矩阵称为全通过。单个可行候选为 24/24。

## 4. A / B / C / D 实测比较

大小仅指候选 node_modules，**不含 Node、应用、测试集、缓存，不是完整 Runtime 大小**。native 指额外 .node/.dll/.exe/.so/.dylib，不把必需的 Node.exe 冒充已消失。

| 配置 | 包数/文件数 | 字节/MiB | native文件 | 首轮加载/通过 | canvas/Skia实际加载 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| A 5.4.296 legacy + canvas0.1.80 | 3/400 | 73,454,401 / 70.05 | 1 | 8/8；8/8 | 是/是 | 正常基线；许可问题不变 |
| B 5.4.296 legacy，无optional | 1/388 | 36,625,349 / 34.93 | 0 | 导入失败 | 否/否 | DOMMatrix未定义 |
| B 5.4.296 generic，无optional | 1/388 | 同上 | 0 | 导入失败 | 否/否 | DOMMatrix未定义；Node入口警告 |
| C 4.8.69 legacy，无optional | 1/351 | 36,909,255 / 35.20 | 0 | 8/8；8/8 | 否/否 | DOMMatrix/Path2D警告保留，未选 |
| C 4.8.69 generic，无optional | 1/351 | 同上 | 0 | 8/8；8/8 | 否/否 | **本轮可行候选**，无警告/无polyfill |
| C 6.3.289 legacy，无optional | 1/555 | 34,781,645 / 33.17 | 0 | 8/8；8/8 | 否/否 | 功能通过，但3类初始化警告，待界定 |
| C 6.3.289 generic，无optional | 1/555 | 同上 | 0 | 0/8；0/8 | 否/否 | Node24下 hashOriginal.toHex 缺失 |
| D pdf2json4.1.0（独立Buffer） | 1/16 | 11,929,963 / 11.38 | 0 | 8/8；8/8 | 否/否 | 有API陷阱，内嵌旧PDF.js安全谱系未证实 |
| D unpdf1.8.1 | 1/158 | 2,142,037 / 2.04 | 0 | 8/8；7/8 | 否/否 | CMap中文丢失；6.1.200/部分polyfill拒绝准入 |

三轮通过数对每个配置均相同。D2 缺少的正是非嵌入 CJK/CMap 样本，不能因为其余 7 项通过就忽略警告。

新进程整批墙钟中位数（ms，含启动+全部样本/失败处理）按表顺序：468、383、6354、7931、1800、2364、6859、2934、5440。导入中位数：135、N/A、N/A、245、76、269、308、470、9。主机调度/缓存噪声明显，原始三次值在 JSON；这不是 OS 冷缓存测试，不据此选性能冠军。

### 实际依赖、引擎与许可证

- A：pdfjs-dist5.4.296（Apache-2.0；Node >=20.16.0 || >=22.3.0）→ optional @napi-rs/canvas0.1.80 → win32-x64-msvc0.1.80。后两包外层 MIT 不等于嵌入 Skia/Rust 全部许可完成。
- B：直接包同 A，磁盘仅 PDF.js；声明 optional ^0.1.80 仍存在于包元数据，不把“未安装”说成“声明已删除”。
- C4：pdfjs-dist4.8.69，Apache-2.0，Node >=18；声明 optional canvas ^3.0.0-rc2 / path2d ^0.2.1，本实验不装。必需传递 npm 包 0；磁盘仅1包，无 WASM/原生二进制。
- C6：pdfjs-dist6.3.289，Apache-2.0，Node >=22.13.0 || >=24；声明 optional canvas ^1.0.0；本实验磁盘仅1包。其 WASM资源不等于Skia addon，文本测试未证明全部图像解码资源均可分发。
- D1：pdf2json4.1.0，Apache-2.0，Node >=22.23.2，直接/传递 npm依赖0，内部打包旧PDF.js仍是供应链组成，不因npm图为零就不审。
- D2：unpdf1.8.1，MIT，Node >=22，直接/传递 npm依赖0，canvas为optional peer；实际内嵌PDF.js6.1.200，仍受PDF.js自身许可/安全审查约束。

完整 direct / optional / installed-transitive 列表、engine范围、native文件hash、资源/许可hash见 JSON。网页主分支 README可能滞后：unpdf README写5.6.205，发布包实测返回6.1.200；本报告以**实际1.8.1包**为准。

## 5. A为何即使只提取文本也加载原生

公开 server.js:3399/3401 的 loadPdfjs 导入 legacy/build/pdf.mjs；3457 附近 extractPdfTextVariants 调 getDocument → getPage → getTextContent，保留 str/transform 坐标，最后 doc.destroy。它未调用 canvas绘图/render。

5.4.296 legacy 分发文件在14341尝试 require('@napi-rs/canvas')，填 DOMMatrix/ImageData/Path2D；15620模块顶层 `const SCALE_MATRIX = new DOMMatrix()`。因此即使未绘图，import也已触发原生；getDocument参数在import之后，不能解除顶层初始化。A实际加载 skia.win32-x64-msvc.node，B失败复现证实此链。

实验基线为**相同引擎/入口/原生版本**；为公平测CMap加入本地 cMapUrl、standardFontDataUrl，并统一 isEvalSupported:false，清理用loadingTask.destroy。正式业务现在没有这些附加参数。不能把实验8/8冒充当前应用完整发票回归。

## 6. 官方text-only路线与polyfill处理

优先核对[Mozilla 5.4.296 Node文字示例](https://github.com/mozilla/pdf.js/blob/v5.4.296/examples/node/getinfo.mjs)：同样使用legacy入口。没有找到可在5.4.296 import之前关闭canvas初始化的公开参数；未自行修改其构建文件。

[4.8.69官方node_utils](https://github.com/mozilla/pdf.js/blob/v4.8.69/src/display/node_utils.js)的SKIP_BABEL分支跳过canvas/path2d加载及DOM补丁，因此该版本generic入口不只是“删optional凑巧没崩”。Node内置fs/http/url支持仍在；文本API/本地CMap实际验证通过。官方当前[兼容表](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions)推荐Node用legacy，没有找到针对历史4.8 generic的长期Node24支持承诺；此项是维护风险，不伪造官方背书。

[6.3.289官方node_utils](https://github.com/mozilla/pdf.js/blob/v6.3.289/src/display/node_utils.js)仍在legacy入口尝试canvas；实际构建已将SCALE_MATRIX改成类静态null并延迟创建，所以无canvas也能完成本次text API。**DOMMatrix/Path2D警告没有消除、没有过滤**，尚未将其判定为可忽略。generic在Node24缺toHex；本轮未自制ECMAScript补丁来过测。

没有编写DOMMatrix/ImageData/Path2D实现。unpdf使用其上游[DOMMatrix实现](https://github.com/unjs/unpdf/blob/v1.8.1/src/_internal/dommatrix-polyfill.ts)，源码明确不完整，仅constructor/translateSelf/scaleSelf。本轮未验证全部PDF调用兼容，不准迁入正式项目；即使来自发布包也不自动满足用户polyfill门禁。

## 7. 安全、业务接入和维护判断

详细依据见 SECURITY-COMPARISON.md。核对Mozilla仓库全部公开GHSA、GitHub reviewed package查询以及Mozilla官方安全记录；未用“npm audit=0”代替。

- <=4.1.392属于已知高危CVE-2024-4367，4.2.67修复；只静态否决，不试图把危险旧版作为候选。
- 2026新公告CVE-2026-16633影响>=5.6.83且<6.2.108。5.4.296和4.8.69不在该公告范围；6.3.289超过修复版。
- unpdf内嵌6.1.200落在公告版本段。纯Node文本不等于已证明viewer脚本漏洞在该调用链可利用，但按本轮严格门禁不准采用，不能靠缺少自己的GHSA说安全。
- pdf2json官方仓库无公开GHSA不代表其内嵌旧引擎已继承修复。旧动态Function路径仍存在；本轮未证明可利用，也未证明安全回补完整，不批准正式使用。

未来若批准C4迁移，至少需改正式入口及依赖/锁文件、明确本地CMap/字体路径和isEvalSupported:false，并重新验证中文发票字段/坐标/上传/识别失败/OCR边界。不必重写HTML或财务规则。维护成本中高：旧版需持续检查上游安全变更和解析修复；版本升级后generic行为不可假设稳定。

**只替换根pdfjs-dist还不够。** pdf-parse2.4.5仍可传递带回5.4.296/canvas；需另获批准后联合清理未用pdf-parse、调整原host-smoke真实API调用、重建完整生产依赖图。现有构建器固定23包/include-optional/native license条件需基于新证据另审，不能把本次Spike当作跳过门禁的理由。

本轮不宣称C4是长期最佳方案。可行性证据使其具备“提交迁移评审”的资格；上级也可选择优先继续C6官方路线警告边界研究或回R1完成原生许可。

## 8. 证据与交付

- 源码外脚本：prepare.cjs、sources.cjs、fixtures.py、render.py、extract.mjs、run.cjs、summarize.cjs。
- 有效样本：fixtures-v2/manifest.json，8个PDF SHA256；rendered/10页PNG及contact-sheet。
- 最终原始证据：runs-v3/matrix.json，SHA256 `d41a87e0f289ecd4d7ac73c851d78bca09253f2ed22fc5305cc44370f813219f`。
- 安装锁、registry元数据、完整node_modules前后hash、官方来源原文位于各候选及sources/；均不进入Git。
- Git交付：本报告、PDF-SPIKE-RESULTS.json、SECURITY-COMPARISON.md、更新CHATGPT-HANDOFF/RESULT/PROJECT/MASTER-PLAN。
- Git blob与Windows工作副本CRLF字节hash分别列于JSON；不能把EOL差异说成依赖改动。
- 实际功能/失败/未验证分开。未运行整应用、初始化/登录/Excel/备份回归、Windows干净环境、系统断网、真实发票、OCR、安装器或发布测试。

**停止在Batch 1C-R3。等待架构验收和迁移授权，不进入Batch 2。**

