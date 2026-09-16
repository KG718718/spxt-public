# Batch 1C-R2 — Dead Dependency Audit

日期：2026-09-16。审计对象仅为公开仓库 `KG718718/spxt-public`，分支 `codex/windows-installer-v1.1`，source/HEAD `2aeaa4089520a99829f1b9981b7b5ea2bfa9e295`。

## 结论与条件门禁

**Batch 1C-R2 BLOCKED — independent pdfjs-dist → canvas dependency remains.**

在当前公开应用业务源码中未发现 `pdf-parse` 调用；实际 PDF 文本业务直接使用 `pdfjs-dist`。但这不等于“删除 pdf-parse 会删除 Canvas/Skia”，也不等于“整个源码树没有使用 pdf-parse”：既有 host-smoke 实际调用 PDFParse API，旧在线安装器也动态加载根 dependencies 中全部包。

| 条件 | 结论 | 可复核依据 |
| --- | --- | --- |
| A 生产应用无 pdf-parse 调用 | 当前审计范围满足 | 32个应用文件、全部业务JS/内联脚本/动态加载点；唯一PDF模块入口为server.js:3401 |
| B 测试/构建不需其功能或只有声明检查 | **不满足当前原样测试条件** | host-smoke.cjs:60–61执行new PDFParse、getText、destroy；不是只检查包名。不得将测试调用说成业务调用 |
| C 实际PDF业务用pdfjs-dist | 满足 | server.js:3666 → 3457 → 3399 → 3401；getDocument/getPage/getTextContent |
| D 删除pdf-parse使canvas不再进入生产图 | **不满足，独立路径已证实** | 根直接pdfjs-dist → optional canvas → Windows x64 binding；fresh npm explain与只导入pdfjs的native加载跟踪一致 |
| E 无需改业务逻辑 | 本轮未修改；单删根依赖不触及业务源码 | 为消除仍存在的canvas而跳过optional、改pdfjs/补polyfill等不在本轮授权中 |

任务书要求任一条件失败即停止，已停止删除、重建和出包。但模板中的“pdf-parse仍为实际运行依赖”不足以准确描述本案，因此不用它冒充业务事实；真正阻塞是D失败，B也未满足。**没有执行删除后的安装、回归或Runtime构建。**

## 1. 审计方法与完整范围

- 以该commit的 `git ls-files` 为边界，从Git blobs逐文件取件：135个已跟踪文件，135个文本文件，保存文件路径、字节数、SHA256及命中行。没有递归读取所在父项目或其他用途版本。
- 覆盖 `tools/package-manifest.json` 中全部32个应用文件（其中package/lock归D，其余30个归A）、36个测试目录文件、18个构建/辅助文件及49份文档。分类是文件用途，不代表36个测试均已执行。
- 大小写不敏感搜索 `pdf-parse/PDFParse/pdfParse/@napi-rs/canvas/canvas/pdfjs-dist`；另审查require/import、createRequire、require.resolve、pathToFileURL、eval/new Function、spawn/execFile及路径拼接。
- 人工沿调用链检查：Node业务模块均为本地模块/内置模块/明确包名；PDF惰性加载是固定字符串。前端唯一外部script源为本地 `/vendor/fflate.js`，其他为内联JS，没有发现通过脚本加载器隐藏引入pdf-parse。
- 动态命中逐项追踪：旧installer遍历package.dependencies；Runtime modules/host-smoke用createRequire定位包；build归档仅动态取fflate；startup-filesystem测试的argv路径明确指向public-startup.js。不存在把这些动态调用直接当作“没有使用”的漏检。
- OCR脚本运行时import为PaddleOCR/pypdfium2，Node通过配置路径execFile Python；SMTP的PowerShell子进程做既有安全存储。本轮只读源码，不运行OCR/SMTP，不读取配置或凭据。
- 在源码外全新目录，使用未改的两个Git包文件，fresh npm ci，再以实际包目录、版本、npm ls、npm explain、第三方模块源码及动态加载探针交叉核对。没有只用grep或只读lock下结论。

原始命中与loader清单见外置 `static-audit.json`；它包含所有文档命中，但文档文字不作为执行依赖。

## 2. A — Production runtime reference

| 路径 | 实际用途与结论 |
| --- | --- |
| server.js:3399–3403 | loadPdfjs()缓存动态import `pdfjs-dist/legacy/build/pdf.mjs`，无pdf-parse |
| server.js:3457–3482 | getDocument({data,disableWorker:true,useSystemFonts:true})、逐页getTextContent、坐标重排与destroy |
| server.js:3659–3694 | parseInvoiceAttachment优先PDF文本，两种文本不足/失败再到可选OCR；无第二条pdf-parse业务分支 |
| server.js:3722及其队列调用点 | 上传识别队列调用附件解析，不是由测试直接绕过而证明业务使用pdf-parse |
| export-service.js:3–4 | Excel调用write-excel-file/node、ZIP调用fflate；无PDFParse或canvas |
| tools/ocr/ocr_invoice.py:183、199 | 可选Python PDF渲染与OCR；不通过npm canvas/pdf-parse；本轮不安装/运行 |
| 其他业务JS、HTML/CSS、启动业务入口 | 未发现pdf-parse/PDFParse/pdfParse或直接npm canvas调用；不把依赖内部的canvas调用当成业务根文件直接调用 |

## 3. B — Test-only reference

- `tools/tests/windows-runtime/host-smoke.cjs:55–62`：先用pdfjs提取合成PDF文本，再 `load('pdf-parse')`、`new PDFParse({data})`、`await parser.getText()`并断言文本、finally destroy。**真实API测试使用**，不是业务必需性证据。
- `tools/tests/windows-runtime/modules.cjs:8–15`：解析/加载pdf-parse并检查PDFParse是function；另对canvas执行PNG编码/解码，对pdfjs做动态import。前者属于可声明性调整的测试，但不覆盖上一条getText功能测试。
- guards中的canvas路径仅测试安全路径；native-evidence测试只核原生证据。原公开业务测试文件无pdf-parse调用；run-public-tests按文件名遍历，实际启动server的测试继承server已有pdfjs路径。
- 本轮没有改这些测试来解除条件B，没有将既有结果冒充删除后回归。

## 4. C — Build-only / installation reference

- `tools/installer/installer.js:39`（冻结v1.0.0在线安装路径）：读取package.dependencies并逐个require，write-excel-file有路径特判，其余直接包名。因此虽然没有pdf-parse字面量，该检查**确实加载它**。这是安装期检查，非PDF业务API调用；Install.cmd/Start.cmd/launcher.js均未修改/执行。
- `tools/windows-runtime/build.cjs:25`锁定23包，`:89–94`检查Canvas native及PDF资源并调用modules.cjs。新方案若要改图，还需要另行核对这些既有构建断言；本轮不改断言绕过门禁。
- `tools/dependency-license-sources.json`及collect-native-evidence.cjs是许可映射/调查，不是生产PDF路径。package-core、build-online-package使用fflate及32应用文件清单，不提供另一个PDF业务实现。

## 5. D — Package/lock declaration

- `package.json:17–18`：根直接生产依赖pdf-parse 2.4.5及pdfjs-dist 5.4.296。
- `package-lock.json:318–347`：pdf-parse.dependencies含canvas 0.1.80与pdfjs-dist 5.4.296；pdfjs-dist.optionalDependencies独立含canvas ^0.1.80。
- `package-lock.json:26–47、194`：canvas的平台optional表包含canvas-win32-x64-msvc 0.1.80。
- `pdfjs-dist/package.json:15–16`安装实物声明同样存在optional canvas；browser字段canvas:false是浏览器打包映射，不能推导Node入口不会加载canvas。
- Git blob SHA256：package.json `ed2b5d3bf20450c301ae531395fe5bb95c8de07df7f181f254d47843fe928bde`；lock `c4050d95db6d40702a222ee9da9e43d74c5d36a8e5be73583e1dc2f08d9a5bf5`。fresh ci后两者字节不变；没有生成新lock。

## 6. E — 实际传递依赖图

```text
公开应用根
├─ pdf-parse@2.4.5
│  ├─ @napi-rs/canvas@0.1.80
│  └─ pdfjs-dist@5.4.296 ──────────┐
└─ pdfjs-dist@5.4.296（根直接依赖） ┤
                                 └─ optional @napi-rs/canvas@^0.1.80
                                      （本次实际解析0.1.80，与上方去重）
                                       └─ optional @napi-rs/canvas-win32-x64-msvc@0.1.80
                                            └─ skia.win32-x64-msvc.node
```

不经过pdf-parse的根路径确实存在。optional表示npm可选依赖语义，不等于本应用在Node环境中没有用它；既定构建显式include=optional。仅删除pdf-parse不能切断另一个根路径。**未执行删除试验，也没有把理论剩余数量当实测。**

### fresh安装实测

使用原官方toolchain的Node 24.21.0 x64、npm 11.19.0，node.exe SHA256 `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`；只复用已核实工具链，不复用任何旧生产node_modules。

在新建E盘源码外fresh-input执行：

```text
npm ci --omit=dev --include=optional --ignore-scripts --bin-links=false
       --audit=false --fund=false --strict-ssl=true
       --registry=https://registry.npmjs.org/
       --userconfig=<独立空文件> --globalconfig=<独立空文件> --cache=<全新E盘目录>
npm ls --omit=dev --all --json
npm explain @napi-rs/canvas --json
```

三项命令均exit0；ci记录added23packages。环境白名单清除父进程NODE/npm/凭据变量，禁止生命周期脚本，未执行npm提示的升级。磁盘包集合及版本与Win32 x64非dev锁定图完全一致：**23包，1,131个node_modules文件，98,604,168字节（约94.04MiB）**。这不是Runtime总大小，不包括Node、应用或其他输出。

生产包：fflate0.8.3、multer2.3.0、nodemailer9.1.1、pdf-parse2.4.5、pdfjs-dist5.4.296、write-excel-file4.1.1、@napi-rs/canvas0.1.80、@napi-rs/canvas-win32-x64-msvc0.1.80、append-field1.0.0、buffer-from1.1.2、busboy1.6.0、concat-stream2.0.0、inherits2.0.4、media-typer0.3.0、mime-db1.52.0、mime-types2.1.35、readable-stream3.6.2、safe-buffer5.2.1、streamsearch1.1.0、string_decoder1.3.0、type-is1.6.18、typedarray0.0.6、util-deprecate1.0.2。不存在playwright-core生产安装。

### 不是只看声明：实际加载证据

安装的 `pdfjs-dist/legacy/build/pdf.mjs:14336–14369` 在isNodeJS分支通过createRequire(import.meta.url)加载canvas并提供DOMMatrix/ImageData/Path2D；`:14383–14387`的NodeCanvasFactory也会加载它，`:15620`顶层初始化DOMMatrix。该文件SHA256 `5d408104b55dfa88bd542df8520798dd449504157933efeb638c30664902419d`。

独立新进程只导入与server相同的pdfjs入口，记录Module._load与process.dlopen，得到：

1. 父模块pdfjs-dist/legacy/build/pdf.mjs请求@napi-rs/canvas；
2. canvas/js-binding.js请求Windows x64平台包；
3. 实际加载skia.win32-x64-msvc.node；
4. require.cache中没有pdf-parse模块。

native26,272,256字节，SHA256 `30646342fc284109aa9542155287d37147c97132d5168cf621f851a9c69e0c99`，与R1同一字节身份。因此原R1许可缺项仍适用，不能标NOT APPLICABLE。

这证明**当前Node入口独立加载canvas**，不是所有可能浏览器/改写后的纯文本实现都绝无去除机会；其他方案需要新的架构决策和完整PDF验证，不能本轮改业务或第三方代码实现。没有进行缺包注入/隐藏文件测试，也没有声称完成普通/中文/多页PDF回归。

## 7. 删除前后与停止点

| 项目 | 删除前/本次fresh审计 | 删除后 |
| --- | --- | --- |
| package/lock | 原文件，hash不变 | N/A，未删除 |
| 实际生产包数 | 23 | N/A，不填写理论22 |
| pdf-parse | 2.4.5存在 | N/A |
| Canvas及Windows native | 0.1.80存在且实测加载 | N/A |
| Skia | 存在，原hash一致 | N/A |
| 业务PDF、上传、Excel、初始化、登录、备份、host-smoke全回归 | 本轮未跑 | N/A |
| fresh Runtime/ZIP/解包 | 未执行 | N/A |
| Win11 G1 | 未执行，环境待提供 | N/A |

未执行npm uninstall/update/prune、未省略optional、未改测试或license gate、未改业务源码、未创建Launcher/Setup/Release。新审计安装目录只有公开包与证据，不含业务实例。

## 8. 证据、复现与后续选择

公开源码外证据根：项目 `output/windows-installer-v1.1/batch-1c/dependency-audit-r2-01/`。

- static-audit.json：commit、135文件hash、32应用清单、分类命中与动态加载命中。
- audit-summary.json、dependency-graph.json、npm-ls.json、npm-explain-canvas.json。
- npm-ci/npm-ls/npm-explain-canvas各自stdout/stderr，独立空npmrc及独立cache。
- installed-file-inventory.json、pdfjs-import-trace.json、白名单环境重验pdfjs-import-trace-02.json、verification.json及未改fresh-input。两次trace内容hash一致；加载后1,131个依赖文件hash逐一不变，32应用文件相对HEAD及冻结main零差异。
- 同级外置审计助手dependency-audit-r2.cjs（SHA256 `914e6194dd5174aed3e6c60b5f5e98231ed3cd6ef50bba7dff9cb0f2ad65f971`）、pdfjs-import-probe-r2.cjs（`8f6e3adbbe7a04cd4e66effde99b07ee701a59d15e900e7c7a5adcf85b7be305`）。它们只写新的外置审计目录，不修改公开源码，不进入Runtime或Git。
- 同级外置verify-dependency-audit-r2.cjs（SHA256 `84170a9db4ea792166b2d09f4257d24a725d3ebe5560893b8e8917a49580e5d9`）用于白名单环境trace、应用零差异/依赖文件零写入及助手语法校验；3个外置助手均语法通过。
- dependency-graph.json SHA256 `432125f330e9d5dcdbe3a6e2c6ae1a498e66ddeeec8f9e9188a3c4caba525f26`。
- pdfjs-import-trace.json SHA256 `45c57e06d12fe91aeb1a66765d9312197b75e745824e79ca83e22ffbd8298a9c`。

复现应以记录的完整commit和Node SHA、同样npm flags、全新E盘目录执行外置助手；不要覆盖本轮证据，结果必须重新生成hash。npm registry为公开官方来源，未使用私有配置或账户认证。

上级可选择继续R1原生分发证据闭合；或者另立PDF依赖架构决策，先评估当前pdfjs Node入口的Canvas/DOMMatrix需求、兼容性与完整PDF回归，再决定是否允许调整。**本轮不替上级选择或实施**；单独删除pdf-parse即使另获准，也不能宣称解决Canvas许可阻塞。Batch2仍不放行。
