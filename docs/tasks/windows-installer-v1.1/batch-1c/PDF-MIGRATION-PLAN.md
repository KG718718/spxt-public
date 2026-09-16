# Batch 1C-R4 — PDF Migration Readiness（未执行）

## 决策与授权边界

推荐 `pdfjs-dist@4.10.38/build/pdf.mjs`，依据 PDF-4X-SELECTION.md 与三轮矩阵。**本文件是精确修改计划，不是已应用的 patch。** 正式 package/lock/server、测试、构建器均未改；不批准下一 Batch、Launcher、Setup、OCR 或发行。

当前 source/HEAD：`a760f0544dc5b966bad33c91b38204f504f97bb2`。正式业务为 `server.js:3399` 的 loadPdfjs → `3457` 的 extractPdfTextVariants → getDocument/getPage/getTextContent → 普通文本和坐标文本 → 现有字段提取/校验/失败与 OCR 兜底。业务未用 pdf-parse；`host-smoke.cjs:60` 真正调用它，不能直接删除测试而不补覆盖。

## 1. 必需联合动作

1. 只删除根 dependencies.pdf-parse，根 pdfjs-dist 从精确 5.4.296 改为精确 4.10.38；不顺手更新其他依赖。
2. 用已锁 Node24.21.0/npm11.19.0 重算锁文件，逐项解释差异；不能手删 lock 内 optional 元数据、造空包或覆盖第三方文件。
3. 正式文本入口切 generic，明确关闭 eval、配置包内 CMap/字体资源，保留文本/坐标/字段和业务接口契约。
4. 对完整生产图实施经批准的 omit-optional 策略，并核实其他必需功能不依赖被省略的 optional；不能把本轮“仅 PDF.js 一个包”当成整个应用图已经证明无 native。
5. 同步库探针、host-smoke、Runtime 构建/manifest/验证/许可断言。不能只改包名或把 nativeReview 改成 complete 以绕过许可门禁。
6. 重跑合成 PDF 及业务上传/字段/失败回收/Excel/备份等影响回归，重建全新 Runtime 并验证；下一步授权另行取得。

### 为什么不能保留 pdf-parse

当前正式 lock 证明：`pdf-parse@2.4.5` 的 **非 optional 直接 dependencies** 同时含 `@napi-rs/canvas:0.1.80` 与 `pdfjs-dist:5.4.296`。后者另有 optional canvas；canvas 再带 Windows x64 Skia 包。

所以单改根 PDF.js 会使 pdf-parse 保留/嵌套旧 5.4.296，且 omit-optional 也不能消除其必需 canvas JS 包。必须联合删除未被业务使用的 pdf-parse，避免“磁盘没有 addon、但仍需要 canvas 包或旧引擎”的不完整迁移。R4 未安装正式新图、未删除依赖。

## 2. server.js 最小静态 diff 计划

以下仅文档展示，尚未执行。path/fs 已由当前 server 使用，不新增 PDF 包装框架或 HTML 修改。

```diff
 async function loadPdfjs() {
     if (!pdfjsLoader) {
-        pdfjsLoader = import('pdfjs-dist/legacy/build/pdf.mjs');
+        pdfjsLoader = import('pdfjs-dist/build/pdf.mjs');
     }
     return pdfjsLoader;
 }

 async function extractPdfTextVariants(filePath) {
     const pdfjs = await loadPdfjs();
     const bytes = new Uint8Array(fs.readFileSync(filePath));
-    const doc = await pdfjs.getDocument({
+    const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
+    const resourceDir = name => path.join(pdfjsRoot, name).replace(/\\/g, '/') + '/';
+    const loadingTask = pdfjs.getDocument({
         data: bytes,
-        disableWorker: true,
-        useSystemFonts: true
-    }).promise;
+        useSystemFonts: true,
+        isEvalSupported: false,
+        cMapUrl: resourceDir('cmaps'),
+        cMapPacked: true,
+        standardFontDataUrl: resourceDir('standard_fonts'),
+        useWorkerFetch: false
+    });
+    const doc = await loadingTask.promise;
```

后半段保留原有 `content.items` 的 str、transform 和 buildPdfCoordinateText（y 阈值 3、排序、中文空白归一）算法；不调整金额/税号/日期提取或任何审批规则。资源根通过包自身位置解析，不写死开发盘符、不用 CDN；Windows 路径统一 `/` 且末尾 `/`，与实验一致。正式迁移须在中文、空格安装路径复测。

上面展示选型所需 diff，不是完整可应用函数 patch：实施时还需把 `loadingTask.promise` 和循环放进 try/finally，最终由 loadingTask.destroy 清理；每页 getTextContent 在 page.cleanup 的 finally 内。解析错误保持抛给原有上游，不把它吞成成功空文本；如果清理同时失败，保留原解析异常，清理错误只做不含附件正文/凭据的诊断，不能覆盖原原因。没有原异常时不能静默忽略清理失败。

当前 `doc.destroy()` 在 4.10.38 仍存在（三轮类型检查已记录），不是不兼容必须删除；改成 loadingTask.destroy 是为覆盖 promise 失败时的回收，也与 R3/R4测试清理方式一致。这项入口适配须随专项批准，不能自行扩大到队列重写。

## 3. 参数逐项考古与未来要求

| 项目 | 当前事实 | 候选事实及计划 |
| --- | --- | --- |
| import | legacy 5.4.296 | generic 4.10.38；不 import viewer/legacy，不补 DOM API |
| data | Uint8Array、本地上传字节 | 保持；不改 URL/CDN 获取 |
| disableWorker | 当前传 true | 4.10.38 getDocument 不读取此参数。Node PDFWorker 自行禁真实 worker，并动态 import 同版 pdf.worker.mjs；删除无效配置，**worker 文件仍必须打包** |
| isEvalSupported | 未明确设置 | 明确 false，R3/R4 已按此测试；是纵深防护，不把配置代替版本安全核验 |
| enableScripting | 业务不使用 viewer/脚本管理器 | 不是 getDocument 的有效选项，不塞一个 false 冒充完成防护。继续不引入 viewer/PDFScriptingManager/注释脚本；将来若有 viewer，必须独立禁脚本并审 CSP |
| useSystemFonts | true | 保持，避免本轮偷偷改变字体选择策略；非嵌入中文通过包内 CMap 解析 |
| CMap | 当前正式未显式设置 | 使用同包 cmaps/ + cMapPacked:true；本轮实际读取两个 bcmap，禁止网络回退 |
| standard fonts | 当前正式未显式设置 | 包内 standard_fonts/；本轮无该目录的实际读事件，不宣称全字体覆盖，但必须保留资源与字体许可 |
| useWorkerFetch | 当前未设置 | Node 默认 false；正式计划显式 false，锁定本地 factory；新显式参数组合需迁移专项再测 |
| wasmUrl | 当前业务未设置 | 4.x 包无 wasm 资源且 getDocument 不读取此项。R3/R4 为统一探针传入该未知项，但未加载，不进入正式参数 |
| render/CanvasFactory | 当前只 getTextContent | 不调用 render/createCanvas/截图。若新增这些功能，本次无 native 结论失效 |
| errors/cleanup | 现有提取上层已有错误/兜底 | 保留错误语义，finally 清理；不修改 OCR 实现，不把扫描空文本当错误成功票据 |

静态依据：实际 4.10.38 `build/pdf.mjs` 的 getDocument:11341、node_utils:6436、PDFWorker:12229、fake worker import:12430 附近；API 中不读取 src.disableWorker/src.enableScripting/src.wasmUrl。legacy 构建及 Node 工厂行为见官方 tag node_utils 来源和矩阵。

注意：R4 的对比基线是 R3 统一参数的 PDF 库测试，不是原 server 的完整业务行为。上述显式本地资源和安全参数仍须重新验证字段选择、报错和现有兜底，不把“同样本同文本”扩大成“所有发票都无变化”。

## 4. 预计文件范围

| 文件 | 未来必要动作 | 本轮 |
| --- | --- | --- |
| package.json | 删除 pdf-parse；精确锁定 4.10.38 | 未改 |
| package-lock.json | 官方 npm 重算、解释传递图差异 | 未改 |
| server.js | 上述有限 import/参数/资源/cleanup 适配 | 未改 |
| tools/tests/windows-runtime/modules.cjs | 删除旧 canvas 绘图/pdf-parse 正向断言；改为 generic、无 addon/无外部解析/同版 worker/资源完整性断言，覆盖不能减少 | 未改 |
| tools/tests/windows-runtime/host-smoke.cjs | 改 V07 为业务实际 PDF.js 路径和同组合成样本；去掉无业务意义的 PDFParse.getText，保留上传/Excel/备份等其他验证 | 未改 |
| tools/tests/windows-runtime/ 下新 PDF 文本回归 | 固定八类样本 SHA、字段/transform/扫描空值、错误回收、网络/native拒绝、精确 warning 边界；新增具体文件名待专项计划固定 | 未创建 |
| tools/windows-runtime/build.cjs | include-optional→经审批 omit-optional；重新核验闭包（不沿用23硬编码）；不得要求不存在的 canvas/wasm/legacy worker；明确同版 generic worker、CMap、字体和零非Node原生文件门禁 | 未改 |
| tools/windows-runtime/common.cjs | productionEntries 必须与批准的 optional 策略一致；重设可追溯的 no-native 许可证据分支，不假标原生许可已完成 | 未改 |
| tools/windows-runtime/verify.cjs | 分开完整性、实际原生库存和许可状态；仍 fail-closed、不自动批准发行 | 未改 |
| tools/dependency-license-sources.json | 审核是否还需旧 canvas 映射；旧 R1 证据继续存档，不靠历史映射冒充新包 SBOM | 未改 |
| THIRD_PARTY_NOTICES.md / 相关 Batch 文档 | 新闭包的原始 LICENSE/CMap/字体归属、构建说明与新证据；历史 v1.0.0叙述不被覆盖成新包 | 未改 |

`tools/package-manifest.json` 当前32项应用允许清单原则上不需改：资源在依赖包内，不把实验报告/样本塞进 Runtime；如将来新增业务 helper 才须重新审批清单。Install.cmd、Start.cmd、HTML/CSS/业务 JS、正式历史在线安装 ZIP均不在此候选迁移必需改动范围。

## 5. 迁移后必须通过的门禁（本轮未运行）

1. 新锁在空目录执行 npm ci，用同版私有 Node 和空配置；核对实际 Windows x64 生产图和全文件清单。所有其他直接依赖保持原版本，额外依赖变化逐项解释。
2. 磁盘、manifest、module load 三层不含 pdf-parse、5.4.296、canvas、Skia 及其他非 Node 必需原生二进制；optional 声明/锁元数据即便保留也须标明未安装，不手工删包。
3. 同字节八样本三轮；对旧业务原始参数和拟迁移参数分别验证字段/坐标，不只比库输出。恶意/损坏、加密、超大页数、失败后连续下一份和并发队列要专项覆盖；八个正常合成 PDF不等于安全模糊测试。
4. warning 仅允许 4.10.38 已核实的 generic Node 兼容提示，一进程一次；不压日志、不造 polyfill。任何 DOM、CMap、字体或未知警告/错误均应阻断并调查。
5. 真实服务边界使用合成实例：上传/识别状态、扫描缺文本与 OCR 未配置提示、导出、备份恢复、零数据首次 Admin、权限及原测试套件；仍不访问其他用途版本。
6. 包含整个所需 PDF.js JS/CMap/font 资源及原许可，不为体积小静默剪裁资源；证明本地离线、不回退父级模块或 CDN。
7. Native gate改造需独立审阅“无需非Node native”的新证据，Node.exe 自带许可仍保留。当前原 R1 许可问题只对旧 Runtime继续有效，不宣布它被本次选型自动消除。
8. 重建 Runtime 后才可补 manifest/SBOM/hash、无开发环境/系统断网 Win11 G1；G1不足时不进入 Batch2，不生成正式 Release。

## 6. 当前未决

请上级验收并决定是否批准上述联合迁移、接受历史4.x无维护承诺及 generic Node 提示风险。若不接受，返回 native license closure 或另立现代 PDF 方案研究；不能因本轮 PASS 自动降级。当前正式包与业务没有任何改动。
