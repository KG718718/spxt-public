# Batch 1C-R4 — Latest Safe 4.x Selection

核验日期：2026-09-16。范围仅 `KG718718/spxt-public`；仍属 Batch 1C，未迁移正式依赖。

## 结论

**Batch 1C-R4 PASS，推荐精确版本 `pdfjs-dist@4.10.38` 的 `build/pdf.mjs`，提交正式迁移评审。**

三候选均以 R3 原始八类 PDF 连续运行三轮，72/72 样本通过；文字、全部六项 transform、x/y 和页数与 R3 的 5.4.296 legacy 原生基线及 4.8.69 generic 结果一致。4.10.38 是官方 npm 当前最后一个正式 4.x，因此不继续选择较老的 4.8.69。

限定：纯 Node 文本 API，不含渲染、viewer、OCR。实验通过 `--omit=optional` 安装，实际磁盘没有原生链；**上游仍声明 optional canvas，默认安装或沿用当前 include-optional 构建会重新带入它。** 正式 Runtime 没有改变、没有重新生成，不能报告整个产品已无 native。

4.10.38 每个新进程有一条 Node generic 兼容提示，完整保留。历史 major 的维护及 generic Node 支持风险见下文；PASS 不等于无漏洞保证或迁移授权。

## 1. R3 检查点与范围

- R3 7 份文档/JSON 经范围、原始矩阵 SHA、合成样本 SHA、正式文件字节及敏感模式审查，提交 `51a014b8c2bae2ab03ebd82deb4991d80459f77b`。
- 首次暂存 diff-check 报两份新 MD 的末尾空行；命令链未因非零退出终止，已如实记录此流程瑕疵。没有 amend/force；追加仅去除两行空白的提交 `a760f0544dc5b966bad33c91b38204f504f97bb2`，复核 diff-check 通过。此 SHA 为最终 checkpoint / R4 source / HEAD。
- 两次普通 push 都只到 `codex/windows-installer-v1.1`，远端回查一致。main、v1.0.0 仍 `84cbb324a4f63bef094d2c21d70eba841205a7a7`；未改 Release。
- 无 node_modules、实验脚本、样本、日志、缓存、凭据或真实数据入 Git。R4 实验位于源码外 E 盘 `output/windows-installer-v1.1/batch-1c/pdf-4x-r4-01/`，不创建工作树、不使用子 Agent。
- R4 的三份新报告和四份状态 MD 留待验收，未额外提交或推送。

## 2. 官方版本确认及实际安装

来源：[官方 npm registry](https://registry.npmjs.org/pdfjs-dist)。正式 4.x 列表共 14 个：4.0.189、4.0.269、4.0.379、4.1.392、4.2.67、4.3.136、4.4.168、4.5.136、4.6.82、4.7.76、4.8.69、4.9.124、4.9.155、4.10.38。没有更晚正式 4.x，没有采用预发布版本。当前 latest 是 6.3.289，不把最后 4.x 写成全系列最新版。

| 版本 | npm 发布日 UTC | GitHub Release 日 UTC | engines | 必需 npm 传递依赖 | optional 声明 |
| --- | --- | --- | --- | --- | --- |
| 4.8.69 | 2024-11-02 | 2024-11-02 | >=18 | 0 | canvas ^3.0.0-rc2；path2d ^0.2.1 |
| 4.9.155 | 2024-12-05 | 2024-12-05 | >=20 | 0 | @napi-rs/canvas ^0.1.64 |
| 4.10.38 | 2025-01-01 | 2025-01-01 | >=20 | 0 | @napi-rs/canvas ^0.1.65 |

官方 tag/Release：[4.8.69](https://github.com/mozilla/pdf.js/releases/tag/v4.8.69)、[4.9.155](https://github.com/mozilla/pdf.js/releases/tag/v4.9.155)、[4.10.38](https://github.com/mozilla/pdf.js/releases/tag/v4.10.38)。完整时间、tag object、npm tarball URL/integrity、依赖图在 JSON。

每版独立空目录，从官方 registry 安装：`npm install --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund --bin-links=false`。没有手删依赖、修改 node_modules、改上游包或写 DOM polyfill。安装阶段联网，提取阶段没有网络请求尝试。

锁文件含未安装的 optional 分支是 npm 的正常锁定信息，不等于它们进入 Runtime。JSON 完整区分 declared、locked、installed、loaded；三版磁盘各只有 pdfjs-dist 一个包，实际必需传递图为空。不是只查看顶层 package.json。

## 3. 同样本、三轮实测

Node 24.21.0 x64 / npm 11.19.0；本机 Windows 10 Pro 19045 开发环境，**不是 Win11 干净机 G1**。复用 R3 `fixtures-v2/` 的八个 PDF，未复制重造或改字节；每次解析前验 SHA256。

样本：英文、嵌入中文、三页、嵌入 Vera 字体、非嵌入中文/CMap、数字金额合成税号、90° 旋转、无文本层扫描；共八 PDF / 十页。扫描预期为空，不做 OCR。所有原始 SHA、预期、实际字符串和坐标保留在 JSON。

| generic 版本 | 第一/二/三轮 | import/API | canvas/Skia/addon 加载 | .node/.dll/.exe/WASM | 错误 | 每轮 warning |
| --- | --- | --- | --- | --- | --- | --- |
| 4.8.69 | 8/8、8/8、8/8 | 均正常 | 均 0 | 均 0 | 0 | 0 |
| 4.9.155 | 8/8、8/8、8/8 | 均正常 | 均 0 | 均 0 | 0 | 0 |
| 4.10.38 | 8/8、8/8、8/8 | 均正常 | 均 0 | 均 0 | 0 | 1 条 generic Node 提示 |

三轮均新 Node 进程；getDocument/getPage/getTextContent 可调用，清理成功，stdout 结构完整、stderr 空，无偶发失败。DOMMatrix/ImageData/Path2D 在 import 前后均 undefined；结果不依靠“恰好由其他包补了 polyfill”。

所有轮次启用 `--permission` 文件读取白名单，仅候选目录、R3 合成样本及提取探针；`--no-addons` 禁止 addon。ESM registerHooks、CJS require 和 process.dlopen 观察加载；Node fs 同步/异步读 API 原样转发观察；网络 fetch/http/https/net 尝试即拒绝。它们是测试工具，不修改 PDF.js。

每轮观察到 24 个读 API 事件（含 readFile/open 的重复），实际涉及：两个 mjs、样本 manifest、八个 PDF、`UniGB-UCS2-H.bcmap`、`Adobe-GB1-UCS2.bcmap`。没有 standard_fonts 的实际读取：此次文字样本不证明所有字体渲染路径可用，迁移仍保留其资源。ESM 加载两文件均在候选包内。无网络尝试、无原生加载。

边界：此为 JS API/模块级追踪，不是全部 OS I/O、系统 DLL 或防火墙抓包；不声称整机断网或 Node.exe 不再需要。无真实发票及整应用回归。

## 4. 4.10.38 提示及 legacy 静态差异

实际提示：`Warning: Please use the legacy build in Node.js environments.`（原日志含 legacy 两侧反引号，JSON 保留原文）。

官方 [PR #19191](https://github.com/mozilla/pdf.js/pull/19191) 和 [v4.10.38 node_utils.js](https://github.com/mozilla/pdf.js/blob/v4.10.38/src/display/node_utils.js) 表明：generic 的 Node 分支直接提醒不载入相应 polyfill；legacy 分支才 require canvas 并补 DOM API。分发文件 `build/pdf.mjs:6444` 附近的提示不检查样本或失败；`NodeCanvasFactory._createCanvas` 才实际 require canvas，本次 getTextContent 没有进入它。

因此本轮允许“固定的上游兼容提示 + 全部文本及隔离检查通过”，而不允许缺 DOM、解析失败、native 加载或新增未知 warning。这是有范围的工程判断，不是 Mozilla 对 generic Node24 全功能的官方支持声明。不得过滤这条提示来伪造零警告。

legacy 仅静态记录：4.8.69 非 SKIP_BABEL 分支加载 canvas/path2d，填 DOMMatrix/Path2D；4.9.155 和 4.10.38 legacy 加载 @napi-rs/canvas，填 DOMMatrix/ImageData/Path2D。此次未运行 legacy，不把 R3 的 legacy 结果冒充 R4 重测。

## 5. 大小、hash、许可证

| 版本 | node_modules 文件数/字节 | MiB | import 中位 ms | 新进程整批中位 ms |
| --- | --- | --- | --- | --- |
| 4.8.69 | 351 / 36,909,256 | 35.20 | 17.48 | 348.66 |
| 4.9.155 | 355 / 37,212,151 | 35.49 | 17.90 | 389.19 |
| 4.10.38 | 356 / 37,350,576 | 35.62 | 20.33 | 407.28 |

文件数包括 npm 的一个隐藏 lock 文件；不是整套 Runtime。4.8.69 比 R3 多一字节来自实验项目名称在隐藏 lock 内的长度变化，PDF.js 包未被改造。时间受缓存/调度/追踪影响，是新进程采样，不是真正冷缓存基准，不据此选择旧版。

三个安装目录全部文件测试前后 hash 相同；PDF.js 包自身清单 SHA256 分别为：

- 4.8.69：`b1c786a9207aa4ae7cf43d37508a0e8c442445181707befc5b00b02237d40c7a`
- 4.9.155：`56919257c599c7b96cd3ca10e5afc3711cd2842500480a458cf7c825b8a828ee`
- 4.10.38：`6aaed893788395210fc4707438c3d29b82120d337b6149bcd5ee3ac23f7710ed`

清单 hash 定义为 common.cjs inventory 输出对象按顺序 JSON.stringify 后 SHA256，含每项相对路径/字节/文件 SHA，不是 tarball hash。package 及整个 node_modules 前后 hash 均记录。

三包 Apache-2.0；必须保留原始 LICENSE、cmaps/LICENSE（Adobe 条款）、standard_fonts/LICENSE_FOXIT、LICENSE_LIBERATION（字体原始许可）。实际文件 hash 在 JSON；没有生成最终 SBOM 或做发行法律批准。

## 6. 安全及维护状态

已重新查询 Mozilla 仓库全部公开公告（2 条）、GitHub npm/pdfjs-dist 包公告（3 条）及三版本精确查询（各 0 条）。不只依赖 npm audit。

| 官方公告 | 已检查 affected range | 4.8.69 / 4.9.155 / 4.10.38 |
| --- | --- | --- |
| [GHSA-wgrm-67xf-hhpq / CVE-2024-4367](https://github.com/advisories/GHSA-wgrm-67xf-hhpq) | <=4.1.392；修复 4.2.67 | 均不命中 |
| [GHSA-hq66-cqwq-w95j / CVE-2026-16633](https://github.com/advisories/GHSA-hq66-cqwq-w95j) | >=5.6.83 且 <6.2.108；修复 6.2.108 | 均不命中 |
| [GHSA-7jg2-jgv3-fmr4 / CVE-2018-5158](https://github.com/advisories/GHSA-7jg2-jgv3-fmr4) | <1.10.100，或 >=2.0.0 且 <2.0.550 | 均不命中 |

**截至核验日期，没有在已检查官方公告中命中这三个候选；不等于绝对安全。** 4.10.38 自 2025-01-01 后未有 4.x 正式新包；当前上游最新 6.3.289，branches API 仅 master。[官方安全政策](https://github.com/mozilla/pdf.js/security/policy)只说明漏洞报告渠道，未列 4.x LTS/回补承诺或明确 EOL 日期。因此事实是“未取得仍受维护证据”，不能写成“官方已公告某日停止维护”。工程上按历史、无维护保证 major 管控，持续监测上游并设置后续替换出口。

[官方 FAQ](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions)将 Node 支持列在 legacy 且标记有限测试；没有为此历史 generic+Node24 承诺完整兼容。推荐依据是本轮限定文本功能的实测，不是绕过上游支持风险。当前正式 5.4.296 也未命中上述两条较新公告，本轮不是因已证明漏洞而紧急降级。

部分 raw.githubusercontent 下载失败，已用 GitHub 官方 contents API 成功取得三 tag 的 node_utils、安全政策和原文 SHA；失败记录保留。API 原文、查询时间、来源 URL、hash 存在源码外 sources/。

## 7. 迁移判断与停止点

建议批准单独的 **Batch 1C 迁移专项**：4.10.38 generic + 删除业务未用 pdf-parse + 安装时排除不需要的 optional 链 + 相应测试/构建/许可门禁适配，详见 PDF-MIGRATION-PLAN.md。本轮均未实施。

不能进入 Batch2：正式迁移未获批、完整生产图/发票回归/重建 Runtime/G1 尚未验证。若未来要求 PDF 渲染、viewer 或截图，必须重新选架构，不能在本次 text-only 结论上追加能力。

原始矩阵 SHA256：`150b10d4dde157da22365b0d5bcedb83c42b62d601b54059ec9b630d21403113`。详见 PDF-4X-MATRIX.json、PDF-MIGRATION-PLAN.md、RESULT.md、CHATGPT-HANDOFF.md。完成后停止，等待上级验收。
