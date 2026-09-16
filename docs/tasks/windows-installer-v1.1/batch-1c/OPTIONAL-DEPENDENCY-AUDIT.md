# Batch 1C-R5 — Optional Dependency Audit

## 审计结论（安装策略的先决检查）

2026-09-16，公开应用仅 PDF 文本提取，不渲染、不截屏、不引入 viewer。删除无业务调用的 pdf-parse 并精确锁定 pdfjs-dist4.10.38 后，**20个必需生产包中，仅 pdfjs-dist 声明 optional 依赖**；其余19个均无 optionalDependencies。允许对此精确图使用 `npm ci --omit=dev --omit=optional`；不是对未来任意依赖图的永久授权。

| 声明者 | 可选项 | Windows x64 / 核心用途 | 结论 |
| --- | --- | --- | --- |
| pdfjs-dist4.10.38 | @napi-rs/canvas ^0.1.65（锁定0.1.80） | generic 文本路径不调用 NodeCanvasFactory._createCanvas；渲染才 require canvas。R4同字节8样本三轮已验证，无polyfill/native | 本次文本功能可省略；未来渲染不在该结论内 |
| @napi-rs/canvas0.1.80（自身已成 optional-only） | win32-x64-msvc0.1.80 | canvas渲染的Skia实现；父包本轮不需要 | 随整个 optional 链省略；禁止只删文件 |
| 同上 | android-arm64、darwin-arm64/x64、linux-arm-gnueabihf、linux-arm64-gnu/musl、linux-riscv64-gnu、linux-x64-gnu/musl（均0.1.80） | 非Windows x64 | 平台不适用且父包不需要 |

其余生产包（均无 optionalDependencies）：append-field1.0.0、buffer-from1.1.2、busboy1.6.0、concat-stream2.0.0、fflate0.8.3、inherits2.0.4、media-typer0.3.0、mime-db1.52.0、mime-types2.1.35、multer2.3.0、nodemailer9.1.1、readable-stream3.6.2、safe-buffer5.2.1、streamsearch1.1.0、string_decoder1.3.0、type-is1.6.18、typedarray0.0.6、util-deprecate1.0.2、write-excel-file4.1.1。

## 可复核依据与失败门禁

- npm 标准 package-lock-only 更新仅变更根、删除 pdf-parse、canvas变optional-only、PDF.js精确版本；其他包版本/来源/integrity不变。完整差异 `migration-r5-01/lock-diff.json`。
- 检查原 fresh 生产包 package.json 与 R4官方4.10.38 package.json，及4.10.38 generic `build/pdf.mjs:6453` 的工厂调用点；没有修改上游文件。
- optional 声明与未安装包仍保留在标准锁中；不要把锁文件出现 canvas 误称为已进入 Runtime，也不能把“未加载”冒充“未安装”。
- 后续构建必须重新验证锁 SHA、所有 optional 声明、必需依赖图可达性、实际安装清单及每包元数据；出现新增 optional、必需 canvas、额外 native 或未知平台包即失败，重新审计。
- 整个应用的 fresh 安装、原测试、上传/PDF/Excel/备份和运行时追踪仍是后续独立门禁。本页只授权安装策略，不先报整应用通过。
- Node.exe 是私有运行时，不能省略；本页“无 native”指额外 npm addon/DLL/EXE，非“不需要Node/Windows系统DLL”。
